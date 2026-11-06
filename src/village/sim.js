// La simulation : traduit les vraies tâches en comportements. Règle d'or du village :
// chaque personnage est une tâche réelle, chaque déplacement dit quelque chose de son statut.
//   active    → fait la navette entre sa maison et le bureau du boss, un colis à la main
//   waiting   → fait la queue devant le bureau du boss, un papier à la main
//   blocked   → reste planté devant sa porte, derrière une barrière
//   scheduled → attend assis sur le banc de sa maison (se lève dans la dernière heure)
//   queued    → pas de personnage : des caisses s'empilent devant la maison
//   done      → rentre à la maison, fête ça, puis un fanion s'ajoute au mât
// Module pur, sans moteur, testé sous Node.
import {lotPoint, queueSlot} from './plan.js'
import {hashString} from './meshkit.js'

const HOUR = 3600e3
const DROP = [0, -8.9]
const MAX_QUEUE = 16

const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k

export const lastActivity = (task, log = []) => {
  const entry = log.filter((l) => l.task === task.id).map((l) => Date.parse(l.at)).filter(Boolean)
  const stamps = [...entry, Date.parse(task.startedAt || 0)].filter(Boolean)
  return stamps.length ? Math.max(...stamps) : 0
}

/** Rythme de marche selon la fraîcheur de la dernière nouvelle : le village ralentit quand rien ne bouge. */
export function paceFor(task, log, now) {
  const last = lastActivity(task, log)
  if (!last) return 0.85
  const age = now - last
  if (age < HOUR / 2) return 1.25
  if (age < 4 * HOUR) return 1
  if (age < 24 * HOUR) return 0.82
  return 0.68
}

export function pathLength(path) {
  let len = 0
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
  return len
}

/** Point à la distance `d` le long du chemin, avec son orientation. */
export function along(path, d) {
  let rest = Math.max(0, d)
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (rest <= l || i === path.length - 1) {
      const t = l ? Math.min(1, rest / l) : 0
      return {x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / (l || 1), dz: (b[1] - a[1]) / (l || 1)}
    }
    rest -= l
  }
  const p = path[path.length - 1]
  return {x: p[0], z: p[1], dx: 0, dz: 1}
}

export class Sim {
  constructor({graph, onEvent = () => {}}) {
    this.graph = graph
    this.onEvent = onEvent
    this.agents = new Map()
    this.lots = {}
    this.seats = {}
    this.initialized = false
    this.seenLog = new Set()
    this.statuses = new Map()
    this.archy = {id: '__archy', kind: 'archy', x: 3, z: 5, y: 0, yaw: 0, path: null, s: 0, mode: 'idle', speed: 3.2, seed: 7, visible: true, gait: 0, universe: null, target: null}
  }

  setLots(lots, seats = {}) { this.lots = lots; this.seats = seats }

  doorOf(universe) {
    const lot = this.lots[universe]
    if (!lot) return null
    return lotPoint(lot, 0, lot.depth + 0.8)
  }

  queueIds(tasks) {
    return tasks.filter((t) => t.status === 'waiting').slice(0, MAX_QUEUE).map((t) => t.id)
  }

  /** Synchronise les agents avec les données. Les changements de statut déclenchent une action visible. */
  sync(data, now = Date.now()) {
    const tasks = (data?.tasks || []).filter((t) => this.lots[t.universe])
    const log = data?.log || []
    const events = []
    const live = new Set()
    const queue = this.queueIds(tasks)

    for (const t of tasks) {
      const previous = this.statuses.get(t.id)
      if (this.initialized && previous !== t.status) {
        const type = !previous ? 'new' : t.status
        events.push({type, task: t, from: previous})
      }
      this.statuses.set(t.id, t.status)
      if (t.status === 'queued' || t.status === 'done') {
        const a = this.agents.get(t.id)
        if (a && a.mode !== 'leaving' && a.mode !== 'inside') this.send(a, t.status === 'done' ? 'celebrate' : 'home')
        else if (a && a.mode === 'inside') this.agents.delete(t.id)
        if (a) { a.task = t; a.status = t.status; live.add(t.id) }
        continue
      }
      live.add(t.id)
      let a = this.agents.get(t.id)
      if (!a) {
        a = this.spawn(t, tasks)
        this.agents.set(t.id, a)
      } else if (a.universe !== t.universe) { a.universe = t.universe }
      a.task = t
      a.pace = paceFor(t, log, now)
      const queueIndex = queue.indexOf(t.id)
      if (a.status !== t.status || a.queueIndex !== queueIndex) {
        a.status = t.status
        a.queueIndex = queueIndex
        this.assign(a, now, !this.initialized)
      } else if (t.status === 'scheduled') this.assign(a, now, false)
    }
    for (const [id, a] of this.agents) {
      if (live.has(id)) continue
      if (a.mode === 'inside') this.agents.delete(id)
      else if (a.mode !== 'leaving') this.send(a, 'home')
    }
    // Archy se rend là où il a agi en dernier.
    const fresh = [...log].sort((x, y) => Date.parse(y.at) - Date.parse(x.at))[0]
    const lastTask = fresh && (data.tasks || []).find((t) => t.id === fresh.task)
    if (lastTask && this.lots[lastTask.universe]) this.moveArchy(lastTask.universe, !this.initialized)
    for (const entry of log) {
      const key = entry.at + '|' + entry.task + '|' + entry.text
      if (!this.seenLog.has(key)) {
        this.seenLog.add(key)
        if (this.initialized) events.push({type: 'log', entry, task: (data.tasks || []).find((t) => t.id === entry.task)})
      }
    }
    this.initialized = true
    for (const e of events) this.onEvent(e)
    return events
  }

  spawn(t) {
    const seed = hashString(t.id)
    const door = this.doorOf(t.universe) || [0, 0]
    return {
      id: t.id, kind: 'task', universe: t.universe, task: t, status: null, seed,
      x: door[0], z: door[1], y: 0, yaw: 0, s: 0, path: null, len: 0, mode: 'inside', visible: false, gait: 0, wait: 0, carrying: false,
      lane: 0.34 + ((seed >>> 3) % 7) * 0.075, pace: 1, base: 1.65 + ((seed >>> 5) % 5) * 0.1, queueIndex: -1, phase: (seed % 100) / 100, cheer: 0, face: null,
    }
  }

  /** Choisit le comportement selon le statut. `instant` place l'agent sans animation (premier affichage). */
  assign(a, now, instant) {
    const lot = this.lots[a.universe]
    if (!lot) return
    if (a.status === 'active') {
      if (instant) {
        a.mode = 'inside'; a.wait = 0
        // Démarre ailleurs le long de la navette pour que tout le monde ne sorte pas d'un coup.
        this.go(a, this.commute(a), 'toOffice')
        a.s = a.phase * a.len
        a.visible = true
      } else if (a.mode === 'inside' || a.mode === 'working') {
        a.wait = 0.2
        a.mode = 'inside'
      } else {
        this.go(a, this.route(a, this.doorOf(a.universe)), 'toHome')
      }
      return
    }
    if (a.status === 'waiting') {
      const slot = queueSlot(Math.max(0, a.queueIndex))
      a.face = [0, -13]
      if (instant) { this.place(a, slot); a.mode = 'waiting'; return }
      this.go(a, this.route(a, slot), 'toQueue')
      return
    }
    if (a.status === 'blocked') {
      const spot = lot.spec?.spot?.block || [1.5, lot.depth + 1.4]
      const p = lotPoint(lot, spot[0], spot[1])
      const door = lotPoint(lot, spot[0], spot[1] - 2)
      a.face = door
      if (instant) { this.place(a, p); a.mode = 'blocked'; return }
      this.go(a, this.route(a, p), 'toBlocked')
      return
    }
    if (a.status === 'scheduled') {
      const seat = this.seats[a.universe]
      const soon = a.task?.scheduledAt && Date.parse(a.task.scheduledAt) - now < HOUR
      const p = seat ? [seat.x, seat.z] : lotPoint(lot, 3, lot.depth + 1.6)
      a.seatYaw = seat ? (seat.ry * Math.PI) / 180 : 0
      a.face = null
      a.soon = !!soon
      if (a.mode === 'seated' || a.mode === 'standby') { a.mode = soon ? 'standby' : 'seated'; return }
      if (instant) { this.place(a, p); a.yaw = a.seatYaw; a.mode = soon ? 'standby' : 'seated'; return }
      this.go(a, this.route(a, p), 'toSeat')
    }
  }

  /** Chemin de la navette : porte → pied de l'escalier du bureau, en passant par les rues. */
  commute(a) { return this.graph.route(this.doorOf(a.universe), DROP) }
  route(a, to) { return this.graph.route([a.x, a.z], to) }

  place(a, p) { a.x = p[0]; a.z = p[1]; a.visible = true; a.path = null }

  go(a, path, next) {
    a.path = path; a.len = pathLength(path); a.s = 0; a.mode = next; a.visible = true
    a.carrying = next === 'toOffice'
  }

  send(a, how) {
    const door = this.doorOf(a.universe)
    if (!door) { this.agents.delete(a.id); return }
    a.leaving = how
    a.carrying = false
    this.go(a, this.route(a, door), 'leaving')
  }

  moveArchy(universe, instant) {
    const door = this.doorOf(universe)
    const archy = this.archy
    if (!door || archy.universe === universe) return
    archy.universe = universe
    const lot = this.lots[universe]
    const target = lotPoint(lot, -1.6, lot.depth + 1.6)
    if (instant) { archy.x = target[0]; archy.z = target[1]; archy.path = null; archy.mode = 'idle'; return }
    archy.path = this.graph.route([archy.x, archy.z], target)
    archy.len = pathLength(archy.path)
    archy.s = 0
    archy.mode = 'walk'
  }

  /** Une étape de simulation. Toute la marche est pilotée par la distance, jamais par le hasard. */
  update(dt, t, now = Date.now()) {
    for (const a of this.agents.values()) this.step(a, dt, t, now)
    const ar = this.archy
    if (ar.path) {
      ar.s += dt * ar.speed
      const p = along(ar.path, ar.s)
      const moved = Math.hypot(p.x - ar.x, p.z - ar.z)
      ar.gait += moved * 2.6
      ar.x = p.x; ar.z = p.z
      ar.yaw = turn(ar.yaw, Math.atan2(p.dx, p.dz), 1 - Math.exp(-dt * 9))
      if (ar.s >= ar.len) { ar.path = null; ar.mode = 'idle'; this.onEvent({type: 'archyArrived', universe: ar.universe}) }
    }
  }

  step(a, dt, t) {
    if (a.mode === 'inside') {
      if (a.status === 'active') {
        a.wait -= dt
        a.visible = false
        if (a.wait <= 0) this.go(a, this.commute(a), 'toOffice')
      }
      return
    }
    if (a.path) {
      const speed = a.base * a.pace
      a.s += dt * speed
      const p = along(a.path, a.s)
      // On tient sa droite : deux personnages qui se croisent ne se traversent pas.
      const wantLane = Math.min(a.s, Math.max(0, a.len - a.s), 1.2) / 1.2 * a.lane
      const X = p.x + p.dz * wantLane, Z = p.z - p.dx * wantLane
      const moved = Math.hypot(X - a.x, Z - a.z)
      a.gait += moved * 3.4
      a.x = X; a.z = Z
      a.yaw = turn(a.yaw, Math.atan2(p.dx, p.dz), 1 - Math.exp(-dt * 8))
      a.moving = moved > 0
      if (a.s >= a.len) this.arrive(a)
      return
    }
    a.moving = false
    if (a.face) a.yaw = turn(a.yaw, Math.atan2(a.face[0] - a.x, a.face[1] - a.z), 1 - Math.exp(-dt * 5))
    if (a.mode === 'seated' || a.mode === 'standby') a.yaw = turn(a.yaw, a.seatYaw || 0, 1 - Math.exp(-dt * 5))
    if (a.mode === 'delivering') {
      a.wait -= dt
      if (a.wait <= 0) {
        a.carrying = false
        this.go(a, this.route(a, this.doorOf(a.universe)), 'toHome')
      }
    }
    if (a.mode === 'cheering') {
      a.wait -= dt
      if (a.wait <= 0) this.agents.delete(a.id)
    }
  }

  arrive(a) {
    const end = a.path[a.path.length - 1]
    a.path = null
    a.x = end[0]; a.z = end[1]
    switch (a.mode) {
      case 'toOffice': a.mode = 'delivering'; a.wait = 1.4 + a.phase; a.face = [0, -13]; a.carrying = true; this.onEvent({type: 'delivered', agent: a}); break
      case 'toHome': a.mode = 'inside'; a.visible = false; a.wait = 3.5 + a.phase * 7; a.face = null; break
      case 'toQueue': a.mode = 'waiting'; a.face = [0, -13]; break
      case 'toBlocked': a.mode = 'blocked'; break
      case 'toSeat': a.yaw = a.seatYaw || 0; a.mode = a.soon ? 'standby' : 'seated'; break
      case 'leaving':
        if (a.leaving === 'celebrate') { a.mode = 'cheering'; a.wait = 2.6; this.onEvent({type: 'cheer', agent: a}) }
        else this.agents.delete(a.id)
        break
      default: break
    }
  }

  /** Nom d'action lisible (pour l'animation). */
  static poseOf(a) {
    if (a.path) return 'walk'
    if (a.mode === 'seated') return 'sit'
    if (a.mode === 'standby') return 'watch'
    if (a.mode === 'blocked') return 'blocked'
    if (a.mode === 'waiting') return 'wait'
    if (a.mode === 'delivering') return 'deliver'
    if (a.mode === 'cheering') return 'cheer'
    return 'idle'
  }
}

