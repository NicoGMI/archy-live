#!/usr/bin/env node
// Mise à jour du fichier de données. Aide : node scripts/update.mjs help
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DATA = process.env.ARCHY_DATA || path.join(ROOT, 'public/data/archy-status.json')
const EXAMPLE = path.join(ROOT, 'public/data/archy-status.example.json')
const LOCK = path.join(path.dirname(DATA), '.update.lock')
const STATUS = ['active', 'waiting', 'scheduled', 'blocked', 'queued', 'done']
const LOG_MAX = 300
const HELP = `Usage : bin/archy <commande> <id> ...
  start <id> <univers> "Titre" ["note"]      chantier actif
  note  <id> "note"                          met à jour la note
  done  <id> ["note"]                        terminé
  wait  <id> [<univers> "Titre"] "attente"   en attente de quelqu'un
  block <id> "raison"                        bloqué
  sched <id> <univers> "Titre" <date ISO> ["note"]   programmé
  queue <id> <univers> "Titre" ["note"]      en file
  archive [jours]                            retire les tâches terminées depuis plus de N jours (défaut 7)
  help                                       cette aide`

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
const fail = (msg) => { console.error('Erreur : ' + msg); process.exit(1) }

export function validate(d) {
  if (!d || !Array.isArray(d.universes) || !Array.isArray(d.tasks) || !Array.isArray(d.log)) throw new Error('JSON invalide (universes, tasks, log requis)')
  const ids = new Set()
  for (const t of d.tasks) {
    if (ids.has(t.id)) throw new Error('id en double: ' + t.id)
    ids.add(t.id)
    if (!STATUS.includes(t.status)) throw new Error('statut invalide: ' + t.id)
    if (!d.universes.some((u) => u.id === t.universe)) throw new Error('univers invalide: ' + t.id)
  }
}

// Applique une commande sur l'objet de données (pur, testable). Retourne l'objet modifié.
export function apply(d, cmd, args, now = new Date().toISOString()) {
  const [id, ...r] = args
  const log = (text) => d.log.push({ at: now, task: id, text })
  const needUniverse = (u) => { if (!d.universes.some((x) => x.id === u)) throw new Error('univers inconnu: ' + u) }
  let t = d.tasks.find((x) => x.id === id)
  if (cmd === 'archive') {
    const days = Number(id ?? 7)
    if (!(days >= 0)) throw new Error('nombre de jours invalide')
    const cut = Date.parse(now) - days * 86400e3
    const gone = d.tasks.filter((x) => x.status === 'done' && x.doneAt && Date.parse(x.doneAt) < cut)
    d.tasks = d.tasks.filter((x) => !gone.includes(x))
    console.log(`archivé ${gone.length} tâche(s)`)
  } else {
    if (!id) throw new Error('identifiant de tâche manquant')
    if (cmd === 'sched') {
      const [universe, title, when, note] = r
      if (!universe || !title || !when) throw new Error('sched <id> <univers> "Titre" <date ISO> ["note"]')
      needUniverse(universe)
      const date = new Date(when)
      if (isNaN(date)) throw new Error('date invalide: ' + when)
      if (!t) { t = { id, universe }; d.tasks.push(t) }
      Object.assign(t, { title, status: 'scheduled', scheduledAt: date.toISOString(), startedAt: null })
      if (note !== undefined) t.note = note
      log('Programmé : ' + title)
    } else if (cmd === 'start' || cmd === 'queue') {
      const [universe, title, note] = r
      if (!universe || !title) throw new Error(`${cmd} <id> <univers> "Titre" ["note"]`)
      needUniverse(universe)
      if (!t) { t = { id, universe }; d.tasks.push(t) }
      Object.assign(t, { title, universe, status: cmd === 'start' ? 'active' : 'queued', startedAt: cmd === 'start' ? now : null })
      if (note !== undefined) t.note = note
      else if (t.note === undefined) t.note = ''
      delete t.doneAt
      log((cmd === 'start' ? 'Démarré : ' : 'En file : ') + title)
    } else if (cmd === 'wait') {
      if (!t) {
        const [universe, title, note] = r
        if (!universe || !title) throw new Error('tâche inconnue: ' + id + ' (wait <id> <univers> "Titre" "attente")')
        needUniverse(universe)
        t = { id, universe, title, note: note ?? '', status: 'waiting', startedAt: null }
        d.tasks.push(t)
        log('En attente : ' + title)
      } else {
        const note = r[r.length - 1]
        t.status = 'waiting'
        if (note !== undefined) t.note = note
        log('En attente : ' + (note ?? t.title))
      }
    } else {
      if (!t) throw new Error('tâche inconnue: ' + id)
      if (cmd === 'note') { if (r[0] === undefined) throw new Error('note manquante'); t.note = r[0]; log(r[0]) }
      else if (cmd === 'done') { t.status = 'done'; t.doneAt = now; if (r[0]) t.note = r[0]; log('Terminé' + (r[0] ? ' : ' + r[0] : '')) }
      else if (cmd === 'block') { if (!r[0]) throw new Error('raison manquante'); t.status = 'blocked'; t.note = r[0]; log('Bloqué : ' + r[0]) }
      else throw new Error('commande inconnue: ' + cmd)
    }
  }
  d.updatedAt = now
  d.log.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  d.log = d.log.slice(0, LOG_MAX)
  validate(d)
  return d
}

function main() {
  const [cmd, ...args] = process.argv.slice(2)
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { console.log(HELP); process.exit(cmd ? 0 : 1) }
  if (!fs.existsSync(DATA) && fs.existsSync(EXAMPLE)) fs.copyFileSync(EXAMPLE, DATA)
  // verrou : on ne supprime que le sien, libéré avant toute publication
  let got = false
  for (let i = 0; i < 150 && !got; i++) {
    try { fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' }); got = true }
    catch {
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 30000) fs.unlinkSync(LOCK) } catch {}
      sleep(100)
    }
  }
  if (!got) fail('verrou indisponible')
  const release = () => { try { if (fs.readFileSync(LOCK, 'utf8') === String(process.pid)) fs.unlinkSync(LOCK) } catch {} }
  process.on('exit', release)
  try {
    const d = apply(JSON.parse(fs.readFileSync(DATA, 'utf8')), cmd, args)
    const tmp = DATA + '.' + process.pid + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA)
    console.log('ok', cmd, args[0] ?? '')
  } catch (e) { release(); fail(e.message) }
  release()
  if (process.env.ARCHY_PUBLISH === '1' || (process.env.ARCHY_PUBLISH !== '0' && fs.existsSync(path.join(ROOT, '.publish-enabled')))) {
    try { execFileSync('sh', [path.join(ROOT, 'bin/publish-data')], { stdio: 'inherit' }) }
    catch { console.error('ATTENTION : mise à jour locale OK mais publication échouée (relancer bin/publish-data ou bin/publish)'); process.exitCode = 2 }
  }
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) main()
