// Deploy to the existing bound Apps Script, not GitHub Pages.
// Set DISCORD_WEBHOOK_URL in Script Properties. Never put its value in this file.
const LEAD_COLUMNS = ['submitted_at','track','name','phone','channel','role','org','region','orgtype','kids','demo','ask','age','center','news','utm_source','utm_content','email','discord_status','discord_notified_at','discord_message_id'];

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
    } catch (_) {
      sh.getRange(row,headers.indexOf('discord_status')+1).setValue('failed');
      console.warn('Discord notification failed; lead remains saved at row ' + row);
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
  const url = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
  if (!url || !/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url)) throw new Error('Discord webhook not configured');
  let response;
  try {
    response = UrlFetchApp.fetch(url + '?wait=true', { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  } catch (error) { throw new Error('Discord connection failed: ' + String(error.message).replace(/https?:\/\/\S+/g, '[URL]')); }
  if (response.getResponseCode() !== 200) throw new Error('Discord request failed');
  const message = JSON.parse(response.getContentText());
  if (!message.id) throw new Error('Discord receipt missing');
  return String(message.id);
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
