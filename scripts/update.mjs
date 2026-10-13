#!/usr/bin/env node
// Usage:
//  node scripts/update.mjs start <task-id> <universe> "Titre" ["note"]
//  node scripts/update.mjs note  <task-id> "note"          (met à jour la note + journal)
//  node scripts/update.mjs done  <task-id> ["note"]
//  node scripts/update.mjs block <task-id> "raison"
//  node scripts/update.mjs wait  <task-id> [<universe> "Titre"] "ce qu'on attend"
//  node scripts/update.mjs sched <task-id> <universe> "Titre" <ISO-date> ["note"]
//  node scripts/update.mjs queue <task-id> <universe> "Titre" ["note"]
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const LOCK = new URL('../.update.lock', import.meta.url)
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
let got = false
for (let i = 0; i < 100 && !got; i++) { try { fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' }); got = true } catch { try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 10000) fs.unlinkSync(LOCK) } catch {} ; sleep(100) } }
if (!got) throw new Error('verrou indisponible')
process.on('exit', () => { try { fs.unlinkSync(LOCK) } catch {} })
const F = new URL('../public/data/archy-status.json', import.meta.url)
const d = JSON.parse(fs.readFileSync(F, 'utf8'))
const [cmd, id, ...r] = process.argv.slice(2)
const now = new Date().toISOString()
const log = (text) => d.log.unshift({ at: now, task: id, text })
let t = d.tasks.find((x) => x.id === id)
if (cmd === 'sched') {
  const [universe, title, when, note = ''] = r
  if (!d.universes.some((u) => u.id === universe)) throw new Error('univers inconnu: ' + universe)
  if (!t) { t = { id, universe }; d.tasks.push(t) }
  Object.assign(t, { title, note, status: 'scheduled', scheduledAt: new Date(when).toISOString(), startedAt: null }); log('Programmé : ' + title)
} else if (cmd === 'wait' && !t) {
  const [universe, title, note = ''] = r
  t = { id, universe, title, note, status: 'waiting', startedAt: null }; d.tasks.push(t); log('En attente : ' + title)
} else if (cmd === 'start' || cmd === 'queue') {
  const [universe, title, note = ''] = r
  if (!d.universes.some((u) => u.id === universe)) throw new Error('univers inconnu: ' + universe)
  if (!t) { t = { id, universe, title, note }; d.tasks.push(t) }
  Object.assign(t, { title, note, status: cmd === 'start' ? 'active' : 'queued', startedAt: cmd === 'start' ? now : null })
  delete t.doneAt; log(cmd === 'start' ? 'Démarré : ' + title : 'En file : ' + title)
} else {
  if (!t) throw new Error('tâche inconnue: ' + id)
  if (cmd === 'note') { t.note = r[0]; log(r[0]) }
  else if (cmd === 'done') { t.status = 'done'; t.doneAt = now; if (r[0]) t.note = r[0]; log('Terminé' + (r[0] ? ' : ' + r[0] : '')) }
  else if (cmd === 'wait') { t.status = 'waiting'; t.note = r[r.length-1]; log('En attente : ' + t.note) }
  else if (cmd === 'block') { t.status = 'blocked'; t.note = r[0]; log('Bloqué : ' + r[0]) }
  else throw new Error('commande inconnue')
}
d.updatedAt = now
d.log = d.log.slice(0, 300)
const STATUS = ['active','waiting','scheduled','blocked','queued','done']
for (const t of d.tasks) { if (!STATUS.includes(t.status)) throw new Error('statut invalide: ' + t.id) ; if (!d.universes.some((u) => u.id === t.universe)) throw new Error('univers invalide: ' + t.id) }
const tmp = new URL('../public/data/.archy-status.tmp', import.meta.url)
fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, F)
console.log('ok', cmd, id)
if (process.env.ARCHY_PUBLISH === '1' || fs.existsSync(new URL('../.publish-enabled', import.meta.url))) {
  try { execFileSync(new URL('../bin/publish', import.meta.url).pathname, { stdio: 'inherit' }) } catch { console.error('ATTENTION : mise à jour locale OK mais publication échouée (relancer bin/publish)'); process.exitCode = 2 }
}
