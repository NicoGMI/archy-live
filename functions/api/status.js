// Données en direct, stockées dans un KV Cloudflare (binding "ARCHY").
// GET  /api/status  -> JSON (protégé par le middleware : cookie de connexion)
// POST /api/status  -> remplace le JSON ; exige l'en-tête Authorization: Bearer <ARCHY_WRITE_TOKEN>
const STATUS = ['active', 'waiting', 'scheduled', 'blocked', 'queued', 'done']
const MAX_BYTES = 400 * 1024
const json = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0 }

function validate(d) {
  if (!d || !Array.isArray(d.universes) || !Array.isArray(d.tasks) || !Array.isArray(d.log)) return 'universes, tasks et log requis'
  const ids = new Set()
  for (const t of d.tasks) {
    if (ids.has(t.id)) return 'id en double: ' + t.id
    ids.add(t.id)
    if (!STATUS.includes(t.status)) return 'statut invalide: ' + t.id
    if (!d.universes.some((u) => u.id === t.universe)) return 'univers invalide: ' + t.id
  }
  return null
}

export async function onRequestGet({ env }) {
  if (!env.ARCHY) return json('{"error":"KV non configuré"}', 404)
  const v = await env.ARCHY.get('status')
  return v ? json(v) : json('{"error":"aucune donnée"}', 404)
}

export async function onRequestPost({ request, env }) {
  const expected = env.ARCHY_WRITE_TOKEN
  const given = (request.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!expected || !given || !safeEq(given, expected)) return json('{"error":"forbidden"}', 403)
  if (!env.ARCHY) return json('{"error":"KV non configuré"}', 503)
  const body = await request.text()
  if (body.length > MAX_BYTES) return json('{"error":"trop volumineux"}', 413)
  let d
  try { d = JSON.parse(body) } catch { return json('{"error":"JSON invalide"}', 400) }
  const err = validate(d)
  if (err) return json(JSON.stringify({ error: err }), 400)
  await env.ARCHY.put('status', JSON.stringify(d))
  return json('{"ok":true}')
}
