// Deploy to the existing bound Apps Script, not GitHub Pages.
// Set DISCORD_WEBHOOK_URL in Script Properties. Never put its value in this file.
const LEAD_COLUMNS = ['submitted_at','track','name','phone','channel','role','org','region','orgtype','kids','demo','ask','age','center','news','utm_source','utm_content','email','discord_status','discord_notified_at','discord_message_id','discord_retry_at'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (!d || typeof d !== 'object' || !String(d.name || '').trim()) throw new Error('Name required');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName('리드') || ss.insertSheet('리드');
    const headers = sh.getLastRow() ? sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0] : [];
    LEAD_COLUMNS.forEach(k => { if (headers.indexOf(k) < 0) headers.push(k); });
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    d.name = String(d.name).trim().slice(0,120);
    d.email = String(d.email || (String(d.phone || '').includes('@') ? d.phone : '')).trim().slice(0,254);
    d.submitted_at = new Date().toISOString();
    d.discord_status = 'pending';
    d.discord_notified_at = '';
    d.discord_message_id = '';
    sh.appendRow(headers.map(k => safeCell_(d[k])));
    const row = sh.getLastRow();
    SpreadsheetApp.flush(); // Save contact before attempting the notification.
    const link = ss.getUrl().split('#')[0] + '#gid=' + sh.getSheetId() + '&range=A' + row;
    try {
      const messageId = sendDiscord_({
        username: 'GemGem Leads',
        thread_name: ('새 문의 - ' + d.name).slice(0,100),
        content: '**새 GemGem400 문의**\n이름: ' + discordText_(d.name) + '\n이메일: ' + discordText_(d.email || '미입력') + '\n신청 시간: ' + Utilities.formatDate(new Date(d.submitted_at), 'Asia/Seoul', 'yyyy-MM-dd HH:mm') + ' KST\n[리드 시트에서 보기](' + link + ')',
        allowed_mentions: { parse: [] }
      });
      sh.getRange(row,headers.indexOf('discord_status')+1).setValue('sent');
      sh.getRange(row,headers.indexOf('discord_notified_at')+1).setValue(new Date().toISOString());
      sh.getRange(row,headers.indexOf('discord_message_id')+1).setValue("'" + messageId);
    } catch (error) {
      sh.getRange(row,headers.indexOf('discord_status')+1).setValue(error.retrySeconds ? 'rate_limited' : 'failed');
      if (error.retrySeconds) sh.getRange(row,headers.indexOf('discord_retry_at')+1).setValue(new Date(Date.now() + error.retrySeconds * 1000).toISOString());
      console.warn('Discord notification failed; lead remains saved at row ' + row + ': ' + error.message);
    }
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function safeCell_(value) {
  const text = value == null ? '' : String(value).slice(0,2000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function discordText_(value) {
  return String(value).replace(/[\\`*_~|<>]/g, ' ').replace(/[\r\n]/g, ' ').slice(0,254);
}

function sendDiscord_(payload) {
  const properties = PropertiesService.getScriptProperties();
  const remaining = Math.ceil((Number(properties.getProperty('DISCORD_BLOCKED_UNTIL')) - Date.now()) / 1000);
  if (remaining > 0) { const error = new Error('Discord cooldown active'); error.retrySeconds = remaining; throw error; }
  const relay = properties.getProperty('DISCORD_RELAY_URL');
  const token = properties.getProperty('DISCORD_RELAY_TOKEN');
  const webhook = properties.getProperty('DISCORD_WEBHOOK_URL');
  if ((relay || token) && (!relay || !token || !/^https:\/\/[a-z0-9.-]+\.workers\.dev\/send$/.test(relay))) throw new Error('Discord relay not configured');
  if (!relay && (!webhook || !/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(webhook))) throw new Error('Discord webhook not configured');
  const url = relay || webhook + '?wait=true';
  const requestHeaders = relay ? {Authorization: 'Bearer ' + token} : {};

  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = UrlFetchApp.fetch(url, { method: 'post', headers: requestHeaders, contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    } catch (_) { throw new Error('Discord connection failed'); }
    const status = response.getResponseCode();
    let body = {};
    try { body = JSON.parse(response.getContentText()); } catch (_) {}
    if (status === 200) {
      if (!body.id) throw new Error('Discord receipt missing');
      properties.deleteProperty('DISCORD_BLOCKED_UNTIL');
      return String(body.id);
    }
    // Only retry explicit rate limits; ambiguous failures could already have posted.
    if (status === 429 && attempt < 2) {
      const headers = response.getAllHeaders();
      const key = Object.keys(headers).find(k => k.toLowerCase() === 'retry-after');
      const retrySeconds = Math.max(Number(body.retry_after) || 0, Number(key ? headers[key] : 0) || 0, 2 * (attempt + 1));
      properties.setProperty('DISCORD_BLOCKED_UNTIL', String(Date.now() + retrySeconds * 1000));
      if (retrySeconds <= 10) {
        Utilities.sleep(Math.ceil(retrySeconds * 1000) + 250);
        continue;
      }
      const error = new Error('Discord rate limited');
      error.retrySeconds = Math.max(300, retrySeconds);
      properties.setProperty('DISCORD_BLOCKED_UNTIL', String(Date.now() + error.retrySeconds * 1000));
      throw error;
    }
    if (status === 429) {
      const error = new Error('Discord rate limited');
      const headers = response.getAllHeaders();
      const key = Object.keys(headers).find(k => k.toLowerCase() === 'retry-after');
      error.retrySeconds = Math.max(300, Number(body.retry_after) || 0, Number(key ? headers[key] : 0) || 0);
      properties.setProperty('DISCORD_BLOCKED_UNTIL', String(Date.now() + error.retrySeconds * 1000));
      throw error;
    }
    throw new Error('Discord request failed: HTTP ' + status + ' code ' + String(body.code || ''));
  }
}

function testDiscordConnection() {
  const auth = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (auth.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    console.log(auth.getAuthorizationUrl());
    return;
  }
  const id = sendDiscord_({ username: 'GemGem Leads', thread_name: '[TEST] GemGem400 알림 연결 확인', content: '[TEST] GemGem400 신규 문의 알림 연결 테스트입니다. 실제 고객 문의가 아닙니다.', allowed_mentions: { parse: [] } });
  console.log('Discord test delivered: ' + id);
}

function testLeadDelivery() {
  doPost({postData:{contents:JSON.stringify({name:'[TEST] Discord delivery diagnosis',email:'qa-discord@example.org'})}});
}

// Install a time-driven trigger every 5 minutes. Only explicit rate limits are retried.
function retryDiscordNotifications() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName('리드');
    if (!sh || sh.getLastRow() < 2) return;
    const rows = sh.getDataRange().getValues();
    const headers = rows[0];
    const statusCol = headers.indexOf('discord_status');
    const retryCol = headers.indexOf('discord_retry_at');
    if (statusCol < 0 || retryCol < 0) return;
    let attempted = 0;
    for (let i = 1; i < rows.length && attempted < 3; i++) {
      if (rows[i][statusCol] !== 'rate_limited' || new Date(rows[i][retryCol]).getTime() > Date.now()) continue;
      attempted++;
      const d = Object.fromEntries(headers.map((key,index) => [key,rows[i][index]]));
      const link = ss.getUrl().split('#')[0] + '#gid=' + sh.getSheetId() + '&range=A' + (i+1);
      try {
        const id = sendDiscord_({username:'GemGem Leads',thread_name:('새 문의 - ' + d.name).slice(0,100),content:'**새 GemGem400 문의**\n이름: ' + discordText_(d.name) + '\n이메일: ' + discordText_(d.email) + '\n신청 시간: ' + Utilities.formatDate(new Date(d.submitted_at),'Asia/Seoul','yyyy-MM-dd HH:mm') + ' KST\n[리드 시트에서 보기](' + link + ')',allowed_mentions:{parse:[]}});
        sh.getRange(i+1,statusCol+1).setValue('sent');
        sh.getRange(i+1,headers.indexOf('discord_notified_at')+1).setValue(new Date().toISOString());
        sh.getRange(i+1,headers.indexOf('discord_message_id')+1).setValue("'" + id);
        sh.getRange(i+1,retryCol+1).setValue('');
      } catch (error) {
        sh.getRange(i+1,statusCol+1).setValue(error.retrySeconds ? 'rate_limited' : 'failed');
        if (error.retrySeconds) sh.getRange(i+1,retryCol+1).setValue(new Date(Date.now()+error.retrySeconds*1000).toISOString());
        break; // Respect shared limits before attempting more leads.
      }
    }
  } finally { lock.releaseLock(); }
}
