// Le plan du village : quartiers, parcelles, rues, rivière et graphe de marche.
// Les façades regardent la caméra de départ (au sud) pour qu'on lise le village d'un coup d'œil.
// Module pur, sans moteur, testé sous Node.

export const DISTRICTS = {
  etudiant: {name: 'Le Campus', short: 'Campus', tagline: 'Les écoles autour de leur pelouse', c: [-41, -3], radius: 21, ground: '#a3b56a', accent: '#4a6c86', tree: 'cypress'},
  formation: {name: 'La Pinède', short: 'Formation', tagline: 'Les ateliers de formation sous les pins', c: [-21, -33], radius: 18, ground: '#8da457', accent: '#7a5a33', tree: 'pine'},
  ngmi: {name: 'Le Belvédère', short: 'NGMI', tagline: "L'observatoire et son bosquet violet", c: [10, -36], radius: 13, ground: '#8d9c6e', accent: '#6d4d94', tree: 'violet'},
  media: {name: 'Les Ateliers', short: 'Médias', tagline: 'Le studio et le marché couvert', c: [32, -21], radius: 16, ground: '#b3a65c', accent: '#b5502f', tree: 'autumn'},
  admin: {name: 'Le Port', short: 'Archives', tagline: 'La poste, ses sacs et son phare', c: [38, 8], radius: 11, ground: '#9fb56f', accent: '#3a7f9c', tree: 'round'},
  forum: {name: 'Le Forum', short: 'Forum', tagline: 'Le grand chapiteau des conférences', c: [29, 24], radius: 10, ground: '#a8b263', accent: '#a98530', tree: 'round'},
  perso: {name: 'Les Jardins', short: 'Jardins', tagline: 'La vie de famille, à la lisière du village', c: [-1, 27], radius: 21, ground: '#99bb68', accent: '#c26c7c', tree: 'blossom'},
}

// x, z, ry (degrés, 0 = façade au sud), archétype, profondeur jusqu'à la porte.
export const LOTS = {
  nowl: {x: -32, z: -34, ry: 14, type: 'owlTower', depth: 3.8, district: 'formation'},
  megaschool: {x: -20.5, z: -37.5, ry: 2, type: 'schoolHall', depth: 4.6, district: 'formation'},
  coop: {x: -9.5, z: -35, ry: -10, type: 'barn', depth: 4.0, district: 'formation'},
  ngmi: {x: 10, z: -36, ry: -5, type: 'observatory', depth: 4.5, district: 'ngmi'},
  phil: {x: 25, z: -28, ry: -6, type: 'studio', depth: 3.9, district: 'media'},
  cts: {x: 39, z: -15, ry: -38, type: 'market', depth: 4.0, district: 'media'},
  mails: {x: 37.5, z: 7, ry: -52, type: 'postOffice', depth: 3.6, district: 'admin'},
  conferences: {x: 29.5, z: 22, ry: -38, type: 'pavilion', depth: 5, district: 'forum'},
  ece: {x: -29, z: -18, ry: -4, type: 'roundHall', depth: 4.1, district: 'etudiant'},
  efrei: {x: -42, z: -20, ry: 8, type: 'sawtoothLab', depth: 3.8, district: 'etudiant'},
  isme: {x: -54, z: -11, ry: 38, type: 'domeCollege', depth: 3.8, district: 'etudiant'},
  excelia: {x: -57, z: 4, ry: 62, type: 'copperHall', depth: 3.8, district: 'etudiant'},
  iae: {x: -45, z: 15, ry: 68, type: 'twinTowers', depth: 3.6, district: 'etudiant'},
  'perso-admin': {x: -15.5, z: 22.5, ry: 8, type: 'notary', depth: 3.2, district: 'perso'},
  'perso-famille': {x: 0, z: 22, ry: -2, type: 'familyHome', depth: 3.6, district: 'perso'},
  'perso-bebe': {x: 13.5, z: 23, ry: -9, type: 'nursery', depth: 3.2, district: 'perso'},
}

// Parcelles libres : un nouvel univers s'y installe sans casser le plan (dans l'ordre de la liste).
export const SPARE_LOTS = [
  {x: 45, z: -3, ry: -70, depth: 3.2, district: 'admin'},
  {x: -33, z: 31, ry: 30, depth: 3.2, district: 'perso'},
  {x: -8, z: 40, ry: 4, depth: 3.2, district: 'perso'},
  {x: 16, z: 40, ry: -8, depth: 3.2, district: 'perso'},
  {x: 44, z: -30, ry: -30, depth: 3.2, district: 'media'},
  {x: -5, z: -44, ry: 0, depth: 3.2, district: 'formation'},
  {x: -35, z: -44, ry: 12, depth: 3.2, district: 'formation'},
  {x: 24, z: -41, ry: -14, depth: 3.2, district: 'ngmi'},
]
const SPARE_ROADS = [
  {id: 'spare-e', w: 1.7, kind: 'path', pts: [[34, 3], [39, 0], [42.5, -1.5]]},
  {id: 'spare-sw', w: 1.7, kind: 'path', pts: [[-20, 31], [-27, 34], [-31, 34]]},
  {id: 'spare-s', w: 1.7, kind: 'path', pts: [[-7.5, 31], [-8, 36], [-8, 39]]},
  {id: 'spare-s2', w: 1.7, kind: 'path', pts: [[13, 31.5], [15, 36], [16, 39]]},
  {id: 'spare-ne', w: 1.7, kind: 'path', pts: [[30, -19.5], [38, -23], [43, -27]]},
]

export const OFFICE = {x: 0, z: -16.5, ry: 0, type: 'townHall', depth: 6.1, door: [0, -10]}
export const PLAZA = {x: 0, z: 0, r: 9.6, ring: 7}

export const STREETS = [
  {id: 'nw', kind: 'street', w: 2.9, district: 'formation', pts: [[-6.6, -6.9], [-10, -13], [-13.2, -20], [-16.5, -27.5]]},
  {id: 'lane-f', kind: 'lane', w: 2.1, district: 'formation', pts: [[-37, -27.4], [-28, -28.2], [-16.5, -27.5], [-9, -28.6]]},
  {id: 'n', kind: 'street', w: 2.7, district: 'ngmi', pts: [[6.4, -7.2], [9.6, -13], [10.6, -21], [10, -30.5]]},
  {id: 'ne', kind: 'street', w: 2.9, district: 'media', pts: [[9, -3.5], [16, -8], [23, -13.5], [25, -21.6]]},
  {id: 'lane-m', kind: 'lane', w: 2.1, district: 'media', pts: [[23, -13.5], [30, -13], [35.6, -11.2]]},
  {id: 'e', kind: 'street', w: 2.9, district: 'admin', pts: [[9.5, 1.6], [18, 3], [26, 5.5], [33.5, 9.2]]},
  {id: 'se', kind: 'street', w: 2.5, district: 'forum', pts: [[7, 6.6], [13, 12.4], [20, 19], [25.7, 25.6]]},
  {id: 's', kind: 'street', w: 2.9, district: 'perso', pts: [[-3.2, 9], [-6, 14], [-7.4, 20], [-7.6, 30.2]]},
  {id: 'lane-p', kind: 'lane', w: 2.1, district: 'perso', pts: [[-20, 31], [-7.6, 30.2], [2, 30.4], [13, 31.5]]},
  {id: 'w', kind: 'street', w: 3.1, district: 'etudiant', pts: [[-9.5, 0.8], [-16, 0], [-23, -1], [-30, -2]]},
  {id: 'quad', kind: 'cobble', w: 2.2, district: 'etudiant', closed: true, pts: [[-30, -2], [-33, -9], [-41, -11.5], [-48.5, -8], [-50.5, 1], [-46, 7.5], [-37, 7], [-31.5, 3]]},
  ...SPARE_ROADS,
]

export const RIVER = {
  pts: [[-1, -60], [-2, -46], [-4.4, -36], [-5, -27], [-15, -17.5], [-20.5, -8], [-19.5, 4], [-22.5, 16], [-27, 30], [-31, 44], [-34, 58]],
  width: 1.7,
}

export const ISLAND = {cx: -6, cz: -4, rx: 69, rz: 56, sea: -0.5}

const hypot = Math.hypot

/** Lissage Catmull-Rom d'une polyligne (conserve les extrémités). */
export function smoothPath(pts, {closed = false, step = 1.2} = {}) {
  const n = pts.length
  const at = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  const out = []
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const len = hypot(p2[0] - p1[0], p2[1] - p1[1])
    const k = Math.max(1, Math.round(len / step))
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t
      out.push([0, 1].map((a) => 0.5 * (2 * p1[a] + (p2[a] - p0[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (3 * p1[a] - p0[a] - 3 * p2[a] + p3[a]) * t3)))
    }
  }
  out.push(closed ? [...out[0]] : [...pts[n - 1]])
  return out
}

export const distToSegment = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)))
  return hypot(x - a[0] - t * dx, z - a[1] - t * dz)
}
export const distToPolyline = (x, z, pts) => {
  let best = Infinity
  for (let i = 1; i < pts.length; i++) { const d = distToSegment(x, z, pts[i - 1], pts[i]); if (d < best) best = d }
  return best
}

/** Point local d'une parcelle (lx à droite de la façade, lz vers l'avant) en coordonnées monde. */
export function lotPoint(lot, lx, lz) {
  const a = (lot.ry * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [lot.x + lx * c + lz * s, lot.z - lx * s + lz * c]
}

function segmentCrossing(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]]
  const den = r[0] * s[1] - r[1] * s[0]
  if (Math.abs(den) < 1e-6) return null
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return [a[0] + r[0] * t, a[1] + r[1] * t]
}

/** Graphe de marche : nœuds {x, z}, arêtes pondérées, recherche du plus court chemin. */
export class WalkGraph {
  constructor() { this.nodes = []; this.edges = []; this.index = new Map() }
  node(x, z) {
    const k = Math.round(x * 4) + '_' + Math.round(z * 4)
    if (this.index.has(k)) return this.index.get(k)
    this.nodes.push({x, z}); this.edges.push([])
    const id = this.nodes.length - 1
    this.index.set(k, id)
    return id
  }
  link(a, b) {
    if (a === b || this.edges[a].some((e) => e.to === b)) return
    const w = hypot(this.nodes[a].x - this.nodes[b].x, this.nodes[a].z - this.nodes[b].z)
    this.edges[a].push({to: b, w}); this.edges[b].push({to: a, w})
  }
  addPath(pts) {
    let prev = null
    const ids = []
    for (const p of pts) { const id = this.node(p[0], p[1]); if (prev !== null) this.link(prev, id); prev = id; ids.push(id) }
    return ids
  }
  nearest(x, z, except) {
    let best = -1, bd = Infinity
    this.nodes.forEach((n, i) => { if (except && except.has(i)) return; const d = hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = i } })
    return best
  }
  /** Chemin [[x,z],...] entre deux points quelconques, en passant par les rues. */
  route(from, to) {
    const start = this.nearest(from[0], from[1]), goal = this.nearest(to[0], to[1])
    const dist = new Map([[start, 0]]), prev = new Map(), open = [start], done = new Set()
    while (open.length) {
      let bi = 0
      for (let i = 1; i < open.length; i++) if (dist.get(open[i]) < dist.get(open[bi])) bi = i
      const u = open.splice(bi, 1)[0]
      if (u === goal) break
      if (done.has(u)) continue
      done.add(u)
      for (const e of this.edges[u]) {
        const nd = dist.get(u) + e.w
        if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, u); open.push(e.to) }
      }
    }
    const path = []
    let c = goal
    while (c !== undefined) { path.unshift([this.nodes[c].x, this.nodes[c].z]); c = prev.get(c) }
    path.unshift([from[0], from[1]]); path.push([to[0], to[1]])
    return path.filter((p, i) => i === 0 || hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) > 0.05)
  }
}

/** Attribue une parcelle à chaque univers : place dédiée si connue, sinon parcelle libre. */
export function assignLots(universes = []) {
  const placed = {}, overflow = []
  let spare = 0
  for (const u of universes) {
    if (LOTS[u.id]) placed[u.id] = {...LOTS[u.id], id: u.id}
    else if (spare < SPARE_LOTS.length) placed[u.id] = {...SPARE_LOTS[spare++], id: u.id, type: 'cottage', spare: true}
    else overflow.push(u.id)
  }
  return {placed, overflow}
}

/** Assemble tout ce qui dépend du plan : routes lissées, ponts, graphe, portes. */
export function buildPlan() {
  const lots = {...LOTS}
  SPARE_LOTS.forEach((l, i) => { lots['__spare' + i] = {...l, type: 'cottage'} })
  const roads = STREETS.map((r) => ({...r, path: smoothPath(r.pts, {closed: r.closed})}))
  const river = {...RIVER, path: smoothPath(RIVER.pts, {step: 1.6})}

  const graph = new WalkGraph()
  roads.forEach((r) => graph.addPath(r.path))
  // Anneau de la place : on contourne la fontaine, jamais de traversée en ligne droite.
  const ring = []
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ring.push([Math.cos(a) * PLAZA.ring, Math.sin(a) * PLAZA.ring]) }
  ring.push([...ring[0]])
  const ringIds = graph.addPath(ring)
  const ringSet = new Set(ringIds)
  const nearestRing = (x, z) => { let b = ringIds[0], d = Infinity; for (const id of ringIds) { const n = graph.nodes[id]; const k = hypot(n.x - x, n.z - z); if (k < d) { d = k; b = id } } return b }
  // Rues ⇄ place
  roads.filter((r) => r.kind === 'street').forEach((r) => { const s = r.path[0]; graph.link(graph.node(s[0], s[1]), nearestRing(s[0], s[1])) })
  const doorNode = graph.node(OFFICE.door[0], OFFICE.door[1])
  graph.link(doorNode, nearestRing(OFFICE.door[0], OFFICE.door[1]))
  // Rues ⇄ rues : chaque extrémité isolée s'accroche au nœud voisin le plus proche.
  roads.forEach((r) => {
    for (const p of [r.path[0], r.path[r.path.length - 1]]) {
      const id = graph.node(p[0], p[1])
      const own = new Set(r.path.map((q) => graph.node(q[0], q[1])))
      const near = graph.nearest(p[0], p[1], own)
      if (near >= 0 && hypot(graph.nodes[near].x - p[0], graph.nodes[near].z - p[1]) < 2.5) graph.link(id, near)
    }
  })
  // Portes ⇄ rue la plus proche : ces sentiers sont peints au sol comme les autres.
  const stubs = []
  const doors = {}
  for (const [id, lot] of Object.entries(lots)) {
    const door = lotPoint(lot, 0, lot.depth + 0.8)
    const near = graph.nearest(door[0], door[1], ringSet)
    const n = graph.nodes[near]
    const elbow = lotPoint(lot, 0, lot.depth + 2)
    const pts = hypot(n.x - door[0], n.z - door[1]) > 3 ? [door, elbow, [n.x, n.z]] : [door, [n.x, n.z]]
    doors[id] = door
    const path = pts.length > 2 ? smoothPath(pts, {step: 0.9}) : pts
    graph.addPath(path)
    if (hypot(n.x - door[0], n.z - door[1]) > 0.4) stubs.push({id: 'stub-' + id, kind: 'path', w: 1.5, district: lot.district, path})
  }
  const allRoads = [...roads, ...stubs]

  // Ponts : là où une rue franchit la rivière.
  const bridges = []
  for (const r of allRoads) {
    if (r.kind === 'path') continue
    for (let i = 1; i < r.path.length; i++) {
      for (let j = 1; j < river.path.length; j++) {
        const hit = segmentCrossing(r.path[i - 1], r.path[i], river.path[j - 1], river.path[j])
        if (!hit) continue
        const dx = r.path[i][0] - r.path[i - 1][0], dz = r.path[i][1] - r.path[i - 1][1], l = hypot(dx, dz) || 1
        bridges.push({x: hit[0], z: hit[1], dx: dx / l, dz: dz / l, len: 8.4, w: r.w + 0.6, road: r.id})
      }
    }
  }

  return {lots, roads: allRoads, river, graph, doors, bridges, ring}
}

export function bridgeHeight(x, z, bridges) {
  for (const b of bridges) {
    const px = x - b.x, pz = z - b.z
    const along = px * b.dx + pz * b.dz, across = Math.abs(-px * b.dz + pz * b.dx)
    if (Math.abs(along) <= b.len / 2 && across <= b.w / 2 + 0.05) {
      const t = along / (b.len / 2)
      return 0.95 * (1 - t * t)
    }
  }
  return null
}

/** Emplacements de la file d'attente devant le bureau du boss : elle s'enroule autour de la place. */
export function queueSlot(i) {
  if (i < 3) return [-0.6 + (i % 2) * 1.2 * 0, -8.6 + i * 1.25]
  const t = (i - 3) * 1.25
  const a = -Math.PI / 2 - 0.34 - t / 5.1
  const r = 5.1 + 0.018 * t * t
  return [Math.cos(a) * r, Math.sin(a) * r]
}
