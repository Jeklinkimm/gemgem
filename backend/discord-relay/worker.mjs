const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }
});

export function createHandler(upstreamFetch = fetch) {
  return async function handle(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/health') return json({ ok: true });
    if (request.method !== 'POST' || path !== '/send') return json({ error: 'not_found' }, 404);
    if (!env.DISCORD_RELAY_TOKEN || !env.DISCORD_WEBHOOK_URL) return json({ error: 'not_configured' }, 503);
    if (request.headers.get('authorization') !== `Bearer ${env.DISCORD_RELAY_TOKEN}`) return json({ error: 'unauthorized' }, 401);
    if (!/^https:\/\/discord\.com\/api\/(?:v10\/)?webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(env.DISCORD_WEBHOOK_URL)) return json({ error: 'not_configured' }, 503);
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: 'payload_too_large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400); }
    if (!body || typeof body.thread_name !== 'string' || !body.thread_name.trim() || body.thread_name.length > 100 || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 2000) return json({ error: 'invalid_payload' }, 400);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await upstreamFetch(env.DISCORD_WEBHOOK_URL + '?wait=true', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ username: 'GemGem Leads', thread_name: body.thread_name, content: body.content, allowed_mentions: { parse: [] } })
      });
    } catch { return json({ error: 'delivery_unknown' }, 502); }
    finally { clearTimeout(timeout); }
    let receipt = {};
    try { receipt = await response.json(); } catch {}
    if (response.status === 200 && typeof receipt.id === 'string' && /^\d+$/.test(receipt.id)) return json({ id: receipt.id });
    if (response.status === 429) {
      const header = response.headers.get('retry-after');
      const headerDelay = Number(header) || Math.max(0, (Date.parse(header) - Date.now()) / 1000) || 0;
      const hintedDelay = Math.max(Number(receipt.retry_after) || 0, headerDelay);
      const seconds = Math.ceil(hintedDelay > 0 ? hintedDelay : 60);
      return json({ error: 'rate_limited', retry_after: seconds }, 429, { 'Retry-After': String(seconds) });
    }
    // Never include an upstream response body or webhook token in logs/responses.
    return json({ error: 'delivery_unknown', upstream_status: response.status }, 502);
  };
}
export default { fetch: createHandler() };
