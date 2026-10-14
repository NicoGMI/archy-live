// Actions de pilotage depuis le dashboard (annuler / important), stockées dans le KV sous la clé "actions".
// Navigateur (cookie, via le middleware) : GET liste, POST {task, action} avec action = cancel | important | unimportant.
// Archy (en-tête Authorization: Bearer <ARCHY_WRITE_TOKEN>) : GET liste, POST {ack:[ids]} pour marquer comme traité.
const ACTIONS = ['cancel', 'important', 'unimportant']
const MAX = 200
const json = (b, s = 200) => new Response(typeof b === 'string' ? b : JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0 }
const load = async (env) => { try { const v = await env.ARCHY.get('actions'); const a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a : [] } catch { return [] } }

function gate(request, env) {
  const h = request.headers.get('authorization')
  if (!h) return 'user'
  const given = h.replace(/^Bearer /, '')
  return env.ARCHY_WRITE_TOKEN && given && safeEq(given, env.ARCHY_WRITE_TOKEN) ? 'admin' : null
}

export async function onRequestGet({ request, env }) {
  if (!gate(request, env)) return json({ error: 'forbidden' }, 403)
  if (!env.ARCHY) return json({ error: 'KV non configuré' }, 503)
  return json({ actions: await load(env) })
}

export async function onRequestPost({ request, env }) {
  const who = gate(request, env)
  if (!who) return json({ error: 'forbidden' }, 403)
  if (!env.ARCHY) return json({ error: 'KV non configuré' }, 503)
  let b
  try { b = JSON.parse(await request.text()) } catch { return json({ error: 'JSON invalide' }, 400) }
  const list = await load(env)
  if (who === 'admin') {
    const ids = new Set(Array.isArray(b.ack) ? b.ack.map(String) : [])
    const at = new Date().toISOString()
    let n = 0
    for (const a of list) if (ids.has(a.id) && !a.ack) { a.ack = at; n++ }
    await env.ARCHY.put('actions', JSON.stringify(list))
    return json({ ok: true, acked: n })
  }
  if (!b || typeof b.task !== 'string' || !ACTIONS.includes(b.action)) return json({ error: 'action invalide' }, 400)
  const st = await env.ARCHY.get('status')
  let d; try { d = JSON.parse(st) } catch { d = null }
  if (!d || !d.tasks.some((t) => t.id === b.task)) return json({ error: 'tâche inconnue' }, 404)
  const a = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), task: b.task, action: b.action, at: new Date().toISOString() }
  list.push(a)
  await env.ARCHY.put('actions', JSON.stringify(list.slice(-MAX)))
  return json({ ok: true, action: a })
}
