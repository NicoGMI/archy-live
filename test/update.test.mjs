import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { apply, validate } from '../scripts/update.mjs'

const base = () => ({ universes: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], tasks: [], log: [] })
const T0 = '2026-01-01T10:00:00.000Z'

test('start crée une tâche active et une entrée de journal', () => {
  const d = apply(base(), 'start', ['t1', 'a', 'Titre', 'note'], T0)
  assert.equal(d.tasks[0].status, 'active')
  assert.equal(d.tasks[0].note, 'note')
  assert.match(d.log[0].text, /Démarré/)
})
test('start sans note conserve la note existante', () => {
  const d = apply(base(), 'start', ['t1', 'a', 'Titre', 'ancienne'], T0)
  apply(d, 'queue', ['t1', 'a', 'Titre'], T0)
  assert.equal(d.tasks[0].note, 'ancienne')
})
test('wait sans note sur tâche existante ne produit pas "undefined"', () => {
  const d = apply(base(), 'start', ['t1', 'a', 'Titre', 'n'], T0)
  apply(d, 'wait', ['t1'], T0)
  assert.equal(d.tasks[0].status, 'waiting')
  assert.equal(d.tasks[0].note, 'n')
  assert.ok(!d.log[0].text.includes('undefined'))
})
test('wait sur nouvelle tâche vérifie l\'univers', () => {
  assert.throws(() => apply(base(), 'wait', ['t9', 'zzz', 'Titre', 'x'], T0), /univers inconnu: zzz/)
})
test('le journal reste trié du plus récent au plus ancien', () => {
  const d = base()
  d.log = [{ at: '2026-01-01T08:00:00Z', task: 'x', text: 'ancien' }]
  d.tasks.push({ id: 'x', universe: 'a', title: 'X', status: 'active' })
  apply(d, 'note', ['x', 'récent'], T0)
  assert.equal(d.log[0].text, 'récent')
  assert.equal(d.log[1].text, 'ancien')
})
test('le journal est tronqué en gardant les plus récents', () => {
  const d = base()
  d.tasks.push({ id: 'x', universe: 'a', title: 'X', status: 'active' })
  d.log = Array.from({ length: 400 }, (_, i) => ({ at: new Date(Date.parse(T0) - (i + 1) * 1000).toISOString(), task: 'x', text: 'e' + i }))
  apply(d, 'note', ['x', 'tout neuf'], T0)
  assert.equal(d.log.length, 300)
  assert.equal(d.log[0].text, 'tout neuf')
})
test('archive retire les tâches terminées anciennes seulement', () => {
  const d = base()
  d.tasks.push({ id: 'old', universe: 'a', title: 'O', status: 'done', doneAt: '2025-12-01T00:00:00Z' }, { id: 'new', universe: 'a', title: 'N', status: 'done', doneAt: '2025-12-31T00:00:00Z' }, { id: 'act', universe: 'a', title: 'A', status: 'active' })
  apply(d, 'archive', ['7'], T0)
  assert.deepEqual(d.tasks.map((t) => t.id), ['new', 'act'])
})
test('commande inconnue, statut et univers invalides', () => {
  assert.throws(() => apply(base(), 'foo', ['t'], T0), /tâche inconnue|commande inconnue/)
  assert.throws(() => validate({ universes: [], tasks: [{ id: 'x', universe: 'a', status: 'active' }], log: [] }), /univers invalide/)
  assert.throws(() => validate({ universes: [{ id: 'a' }], tasks: [{ id: 'x', universe: 'a', status: 'nope' }], log: [] }), /statut invalide/)
})
test('CLI : aide sans argument, écriture atomique, chemin avec espaces', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archy test '))
  const data = path.join(dir, 'status.json')
  fs.writeFileSync(data, JSON.stringify(base()))
  const env = { ...process.env, ARCHY_DATA: data, ARCHY_PUBLISH: '0' }
  const script = new URL('../scripts/update.mjs', import.meta.url).pathname
  const help = spawnSync('node', [script], { env, encoding: 'utf8' })
  assert.equal(help.status, 1)
  assert.match(help.stdout, /Usage/)
  execFileSync('node', [script, 'start', 't1', 'a', 'Titre'], { env })
  assert.equal(JSON.parse(fs.readFileSync(data, 'utf8')).tasks[0].id, 't1')
  assert.ok(!fs.existsSync(path.join(dir, '.update.lock')))
})
