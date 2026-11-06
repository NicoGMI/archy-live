import test from 'node:test'
import assert from 'node:assert/strict'
import {LOTS, OFFICE, SPARE_LOTS, assignLots, buildPlan, bridgeHeight, lotPoint, queueSlot} from '../src/village/plan.js'
import {makeTerrain, shoreDistance} from '../src/village/terrain.js'
import {Kit} from '../src/village/meshkit.js'
import {ARCHETYPE_IDS, buildArchetype, townHall} from '../src/village/buildings.js'
import {Sim, along, paceFor, pathLength} from '../src/village/sim.js'
import {ambience, localHour} from '../src/village/daylight.js'
import {archyDialogue, counts, dialogueFor, eventLine, markSeen, tourStops, urgency} from '../src/village/story.js'

const plan = buildPlan()
const hasPath = (a, b) => { const p = plan.graph.route(a, b); return pathLength(p) < 400 && p.length > 1 }

test('toutes les portes sont reliées au bureau du boss par les rues', () => {
  for (const [id, door] of Object.entries(plan.doors)) assert.ok(hasPath(door, OFFICE.door), id)
})

test('le trajet passe par le graphe, pas en ligne droite à travers les bâtiments', () => {
  const p = plan.graph.route(plan.doors.excelia, OFFICE.door)
  assert.ok(pathLength(p) > Math.hypot(plan.doors.excelia[0] - OFFICE.door[0], plan.doors.excelia[1] - OFFICE.door[1]))
})

test('la rivière a un pont sur chaque rue qui la franchit', () => {
  assert.ok(plan.bridges.length >= 2)
  for (const b of plan.bridges) assert.ok(bridgeHeight(b.x, b.z, plan.bridges) > 0.5)
})

test('toutes les parcelles sont sur terre, loin du rivage', () => {
  for (const [id, lot] of [...Object.entries(LOTS), ...SPARE_LOTS.map((l, i) => ['spare' + i, l])]) assert.ok(shoreDistance(lot.x, lot.z) > 4, id)
})

test('le relief reste plat dans le village', () => {
  const terrain = makeTerrain(plan)
  for (const lot of Object.values(LOTS)) assert.ok(Math.abs(terrain.groundY(lot.x, lot.z)) < 0.5)
  assert.ok(Math.abs(terrain.groundY(0, 0)) < 0.2)
  assert.equal(terrain.walkable(0, 8), true)
  assert.equal(terrain.walkable(0, 200), false)
})

test('les bâtiments ne se chevauchent pas', () => {
  const list = Object.entries(LOTS).map(([id, l]) => ({id, ...l, spec: buildArchetype(l.type, '#336699', id)}))
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]
    const min = (Math.min(a.spec.w, a.spec.d) + Math.min(b.spec.w, b.spec.d)) / 2
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > min, `${a.id} / ${b.id}`)
  }
})

test('chaque archétype a des fenêtres pour accueillir les tâches et reste raisonnable en géométrie', () => {
  for (const type of ARCHETYPE_IDS) {
    const spec = buildArchetype(type, '#336699', type)
    assert.ok(spec.slots.length >= 2, type)
    assert.ok(spec.kit.vertexCount < 80000, `${type}: ${spec.kit.vertexCount}`)
    for (const n of spec.kit.n) assert.ok(Number.isFinite(n), type)
  }
  assert.ok(townHall().slots.length >= 4)
})

test('un nouvel univers trouve une parcelle libre, le surplus est signalé', () => {
  const many = Array.from({length: SPARE_LOTS.length + 2}, (_, i) => ({id: 'u' + i}))
  const {placed, overflow} = assignLots([{id: 'phil'}, ...many])
  assert.equal(placed.phil.type, LOTS.phil.type)
  assert.equal(Object.keys(placed).length, SPARE_LOTS.length + 1)
  assert.equal(overflow.length, 2)
})

test('kit : une boîte chanfreinée reste fermée et orientée vers l\'extérieur', () => {
  const k = new Kit({ao: false, jitter: 0})
  k.box(2, 2, 2, '#ffffff', 0, 0, 0, {ch: 0.2})
  const {positions, normals} = k.arrays()
  for (let i = 0; i < positions.length; i += 9) {
    const cx = (positions[i] + positions[i + 3] + positions[i + 6]) / 3, cy = (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3, cz = (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3
    assert.ok(cx * normals[i] + cy * normals[i + 1] + cz * normals[i + 2] > 0)
  }
})

// --- La simulation dit la vérité

const lots = Object.fromEntries(['phil', 'mails', 'nowl'].map((id) => [id, {...LOTS[id], id, spec: buildArchetype(LOTS[id].type, '#336699', id)}]))
function world(tasks, log = []) {
  const events = []
  const sim = new Sim({graph: plan.graph, onEvent: (e) => events.push(e)})
  sim.setLots(lots, {})
  sim.sync({tasks, log, universes: []}, 0)
  return {sim, events}
}
const run = (sim, seconds, now = 0) => { for (let t = 0; t < seconds; t += 0.05) sim.update(0.05, t, now) }

test('un personnage par tâche vivante, aucun pour les tâches en file ou finies', () => {
  const {sim} = world([
    {id: 'a', universe: 'phil', status: 'active'}, {id: 'b', universe: 'phil', status: 'waiting'}, {id: 'c', universe: 'mails', status: 'blocked'},
    {id: 'd', universe: 'mails', status: 'scheduled'}, {id: 'e', universe: 'nowl', status: 'queued'}, {id: 'f', universe: 'nowl', status: 'done'},
  ])
  assert.deepEqual([...sim.agents.keys()].sort(), ['a', 'b', 'c', 'd'])
})

test('les tâches en attente font la queue dans l\'ordre, devant le bureau du boss', () => {
  const {sim} = world([{id: 'x', universe: 'phil', status: 'waiting'}, {id: 'y', universe: 'nowl', status: 'waiting'}])
  const [x, y] = [sim.agents.get('x'), sim.agents.get('y')]
  assert.equal(x.mode, 'waiting')
  assert.deepEqual([x.x, x.z], queueSlot(0))
  assert.deepEqual([y.x, y.z], queueSlot(1))
})

test('un tâche active fait des allers-retours réels, colis à l\'aller', () => {
  const {sim} = world([{id: 'x', universe: 'phil', status: 'active'}])
  const a = sim.agents.get('x')
  let sawDelivery = false, carriedOut = false, wentHome = false
  for (let t = 0; t < 300 && !(sawDelivery && wentHome); t += 0.05) {
    sim.update(0.05, t)
    if (a.mode === 'toOffice' && a.carrying) carriedOut = true
    if (a.mode === 'delivering') sawDelivery = true
    if (a.mode === 'toHome') { assert.equal(a.carrying, false); wentHome = true }
  }
  assert.ok(carriedOut && sawDelivery && wentHome)
})

test('une tâche qui se termine rentre fêter ça puis disparaît, et l\'événement est émis', () => {
  const task = {id: 'x', universe: 'phil', status: 'active'}
  const {sim, events} = world([task])
  run(sim, 2)
  sim.sync({tasks: [{...task, status: 'done', doneAt: new Date().toISOString()}], log: [], universes: []}, 1)
  assert.ok(events.some((e) => e.type === 'done' && e.task.id === 'x'))
  assert.equal(sim.agents.get('x').mode, 'leaving')
  run(sim, 200)
  assert.ok(events.some((e) => e.type === 'cheer'))
  assert.equal(sim.agents.has('x'), false)
})

test('passer en attente envoie le personnage à la file, depuis là où il se trouve', () => {
  const task = {id: 'x', universe: 'phil', status: 'blocked'}
  const {sim} = world([task])
  sim.sync({tasks: [{...task, status: 'waiting'}], log: [], universes: []}, 1)
  const a = sim.agents.get('x')
  assert.equal(a.mode, 'toQueue')
  run(sim, 120)
  assert.equal(a.mode, 'waiting')
  assert.ok(Math.hypot(a.x - queueSlot(0)[0], a.z - queueSlot(0)[1]) < 0.1)
})

test('aucun événement au premier chargement', () => {
  const {events} = world([{id: 'x', universe: 'phil', status: 'blocked'}], [{at: '2026-01-01T10:00:00Z', task: 'x', text: 'Bloqué'}])
  assert.equal(events.filter((e) => e.type !== 'archyArrived').length, 0)
})

test('Archy va là où il a agi en dernier', () => {
  const log = [{at: '2026-01-01T10:00:00Z', task: 'p', text: 'ancien'}, {at: '2026-01-02T10:00:00Z', task: 'm', text: 'récent'}]
  const {sim} = world([{id: 'p', universe: 'phil', status: 'done'}, {id: 'm', universe: 'mails', status: 'done'}], log)
  assert.equal(sim.archy.universe, 'mails')
  const target = lotPoint(lots.mails, -1.6, lots.mails.depth + 1.6)
  assert.ok(Math.hypot(sim.archy.x - target[0], sim.archy.z - target[1]) < 0.01)
})

test('la marche ralentit quand la tâche n\'a pas de nouvelles', () => {
  const now = Date.parse('2026-01-02T12:00:00Z')
  const fresh = paceFor({id: 'a', startedAt: '2026-01-02T11:55:00Z'}, [], now)
  const stale = paceFor({id: 'a', startedAt: '2026-01-01T01:00:00Z'}, [], now)
  assert.ok(fresh > stale)
})

test('along suit le chemin', () => {
  const p = along([[0, 0], [10, 0], [10, 10]], 15)
  assert.deepEqual([p.x, p.z], [10, 5])
})

// --- Ce que l'on raconte n'invente rien

test('les dialogues ne contiennent que ce que dit la tâche', () => {
  const lines = dialogueFor({id: 'a', title: 'Devis', status: 'waiting', note: 'Deux options'}, [], {})
  assert.ok(lines[0].includes('Devis'))
  assert.equal(lines[1], 'Deux options')
  assert.ok(dialogueFor({id: 'a', title: 'Devis', status: 'blocked'}, [], {})[1].includes("n'a pas été notée"))
  assert.equal(archyDialogue({log: [], tasks: []}).length, 1)
})

test('la tournée vise bloqué puis attente, et une tâche revient si son statut change', () => {
  const blocked = {id: 'b', status: 'blocked'}, waiting = {id: 'w', status: 'waiting'}
  let tour = tourStops([waiting, blocked, {id: 'a', status: 'active'}], {})
  assert.deepEqual(tour.remaining.map((t) => t.id), ['b', 'w'])
  const seen = markSeen({}, blocked)
  tour = tourStops([waiting, blocked], seen)
  assert.deepEqual(tour.remaining.map((t) => t.id), ['w'])
  assert.equal(tour.done, 1)
  assert.deepEqual(tourStops([{...blocked, status: 'waiting'}], seen).remaining.map((t) => t.id), ['b'])
})

test('compteurs, urgence et lignes d\'événement', () => {
  const tasks = [{status: 'active'}, {status: 'waiting'}, {status: 'done', doneAt: '2026-01-01T10:00:00Z'}]
  const c = counts(tasks, Date.parse('2026-01-01T12:00:00Z'), (iso) => iso.slice(0, 10))
  assert.equal(c.doneToday, 1)
  assert.equal(urgency(tasks), 'waiting')
  assert.equal(urgency([]), 'none')
  assert.equal(eventLine({type: 'done', task: {title: 'X', universe: 'u'}}, () => 'U').tone, 'done')
})

// --- L'heure

test('l\'ambiance suit l\'heure : lampes et étoiles la nuit seulement', () => {
  assert.ok(ambience(23).lamps > 0.9 && ambience(23).stars > 0.5)
  assert.equal(ambience(13).lamps, 0)
  assert.equal(ambience(13).stars, 0)
  assert.equal(ambience(24.5).hour, 0.5)
  const hour = localHour(Date.parse('2026-01-15T11:30:00Z'), 'Europe/Paris')
  assert.equal(hour, 12.5)
})
