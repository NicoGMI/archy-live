// Protection par mot de passe de tout le site (pages + /data/*). Secret : variable ARCHY_PASSWORD (secret Pages).
const COOKIE = 'archy_auth'
const enc = new TextEncoder()
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', enc.encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('') }
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0 }
const page = (msg = '') => new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Archy</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1013;color:#e6e8ee;font:16px system-ui,sans-serif}form{width:min(320px,86vw)}h1{font-size:22px;margin:0 0 14px}input,button{width:100%;padding:12px;border-radius:10px;border:1px solid #2a303a;background:#161a20;color:#fff;font:inherit;margin-bottom:10px}button{background:#e6e8ee;color:#0e1013;font-weight:700;cursor:pointer}p{color:#f87171;font-size:14px;min-height:18px}</style></head>
<body><form method="post"><h1>Archy</h1><input type="password" name="pw" placeholder="Mot de passe" autofocus autocomplete="current-password"><button>Entrer</button><p>${msg}</p></form></body></html>`,
  { status: msg ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } })
export async function onRequest({ request, env, next }) {
  // L'écriture des données passe par le jeton Bearer vérifié dans functions/api/status.js (pas de cookie pour la CLI).
  if (request.method === 'POST' && new URL(request.url).pathname === '/api/status') return next()
  // /api/actions avec en-tête Authorization : le jeton est vérifié dans la fonction (CLI d'Archy).
  if (['/api/actions','/api/status'].includes(new URL(request.url).pathname) && request.headers.get('authorization')) return next()
  const pw = env.ARCHY_PASSWORD
  if (!pw) return new Response('Configuration manquante', { status: 503, headers: { 'cache-control': 'no-store' } })
  const token = await sha('archy-live-v1|' + pw)
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + COOKIE + '=([0-9a-f]+)'))
  if (m && safeEq(m[1], token)) {
    // An already-open password form can be submitted after another tab signed in.
    // Never forward its POST to Pages static assets, which answer 405.
    if (request.method === 'POST' && new URL(request.url).pathname === '/') {
      const u = new URL(request.url)
      return new Response(null, { status: 303, headers: { location: '/' + u.search, 'cache-control': 'no-store' } })
    }
    const r = await next(); const h = new Response(r.body, r); h.headers.set('cache-control', 'no-store'); h.headers.set('x-robots-tag', 'noindex'); return h }
  if (request.method === 'POST') {
    const f = await request.formData().catch(() => null)
    await new Promise((r) => setTimeout(r, 800))
    if (f && safeEq(await sha('archy-live-v1|' + String(f.get('pw') || '')), token)) {
      const u = new URL(request.url)
      return new Response(null, { status: 303, headers: { location: '/' + u.pathname.replace(/^\/+/, '') + u.search, 'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`, 'cache-control': 'no-store' } })
    }
    return page('Mot de passe incorrect')
  }
  return page()
}
