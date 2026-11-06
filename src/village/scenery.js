// La nature et le mobilier urbain. Tout est cuit dans quelques maillages par secteur de la carte :
// des centaines d'arbres pour une poignée de draw calls, avec le vent porté par le vertex shader.
import {Kit, rng, shade, mixColor} from './meshkit.js'
import {DISTRICTS, PLAZA, OFFICE, lotPoint} from './plan.js'
import {fbm, shoreDistance} from './terrain.js'
import {PAL} from './buildings.js'

const TREE = {
  pine: {low: '#2f5a3c', high: '#5d8f4e'},
  round: {low: '#3f7339', high: '#8db04f'},
  cypress: {low: '#2f5c43', high: '#6d9a55'},
  violet: {low: '#553f86', high: '#bd9fe0'},
  autumn: {low: '#a24f24', high: '#f0a948'},
  blossom: {low: '#d07f96', high: '#fbd3dc'},
  willow: {low: '#4a7a56', high: '#a2c273'},
}

function tree(k, kind, x, y, z, s = 1) {
  const c = TREE[kind] || TREE.round
  const tint = 0.9 + k.random() * 0.22
  const low = shade(c.low, tint), high = shade(c.high, tint)
  const bark = '#6a4a31'
  k.at({at: [x, y, z], s, ry: k.random() * 360}, () => {
    if (kind === 'pine') {
      k.cyl(0.13, 0.26, 1.5, 6, bark, 0, 0, 0)
      for (let i = 0; i < 4; i++) {
        const r = 1.55 - i * 0.33, base = 1 + i * 0.95
        const seg = 8
        for (let j = 0; j < seg; j++) {
          const a0 = (j / seg) * Math.PI * 2, a1 = ((j + 1) / seg) * Math.PI * 2, wob = 1 + ((j % 2) ? 0.08 : -0.06)
          const P0 = [Math.sin(a0) * r * wob, base - 0.1, Math.cos(a0) * r * wob], P1 = [Math.sin(a1) * r, base, Math.cos(a1) * r]
          const T = [0, base + 1.45, 0]
          k.poly([P0, P1, T], mixColor(low, high, 0.25 + i * 0.22))
          k.poly([[0, base - 0.05, 0], P1, P0], low)
        }
      }
    } else if (kind === 'cypress') {
      k.cyl(0.12, 0.18, 0.7, 6, bark, 0, 0, 0)
      k.blob(0.86, high, 0, 2.5, 0, {sx: 0.78, sy: 2.25, sz: 0.78, detail: 1, bump: 0.1, low, high})
    } else if (kind === 'willow') {
      k.cyl(0.18, 0.3, 2, 7, bark, 0, 0, 0)
      k.blob(1.7, high, 0, 3, 0, {sy: 0.72, detail: 2, bump: 0.13, low, high})
      for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; k.blob(0.62, mixColor(low, high, 0.5), Math.cos(a) * 1.5, 2, Math.sin(a) * 1.5, {sy: 1.7, sx: 0.55, sz: 0.55, detail: 1, bump: 0.06, low, high}) }
    } else {
      const big = kind === 'round' ? 1.45 : 1.35
      k.cyl(0.15, 0.26, 1.7, 7, bark, 0, 0, 0)
      k.at({at: [0, 1.5, 0], rz: 35}, () => k.cyl(0.06, 0.1, 0.8, 5, bark, 0, 0, 0))
      k.blob(big, high, 0, 2.75, 0, {sy: 0.88, detail: 2, bump: 0.13, low, high})
      k.blob(big * 0.65, high, -0.95, 2.25, 0.3, {detail: 1, bump: 0.12, low, high})
      k.blob(big * 0.68, high, 0.9, 2.35, -0.35, {detail: 1, bump: 0.12, low, high})
      k.blob(big * 0.56, high, 0.1, 3.55, 0.25, {detail: 1, bump: 0.12, low, high})
    }
  })
}

function rock(k, x, y, z, s) {
  k.blob(s, '#a79d8f', x, y + s * 0.3, z, {sy: 0.66, detail: 1, flat: true, bump: 0.28, low: '#7c7468', high: '#b7ad9e'})
}

function tuft(k, x, y, z, col) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 + k.random(), lean = 0.14 + k.random() * 0.1, h = 0.32 + k.random() * 0.26
    const c = [Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09], t = [Math.cos(a) * lean, h, Math.sin(a) * lean], side = [Math.sin(a) * 0.06, 0, -Math.cos(a) * 0.06]
    const A = [x + c[0] - side[0], y, z + c[2] - side[2]], B = [x + c[0] + side[0], y, z + c[2] + side[2]], T = [x + t[0], y + t[1], z + t[2]]
    k.tri(A, B, T, col); k.tri(B, A, T, col)
  }
}

function lamp(k, bulbs, x, y, z, lights) {
  k.lathe([[0.24, 0], [0.2, 0.16], [0.08, 0.26], [0.055, 2.5], [0.1, 2.56]], 7, PAL.iron, x, y, z)
  k.at({at: [x, y + 2.52, z]}, () => {
    k.lathe([[0.1, 0.02], [0.2, 0.08]], 6, PAL.iron)
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28 + 0.78; k.box(0.025, 0.42, 0.025, PAL.iron, Math.cos(a) * 0.17, 0.3, Math.sin(a) * 0.17) }
    k.lathe([[0.27, 0.5], [0.07, 0.72], [0, 0.82]], 6, PAL.iron)
  })
  bulbs.blob(0.15, '#ffd98a', x, y + 2.84, z, {sy: 1.25, detail: 1, bump: 0, low: '#ffcf70'})
  lights.push([x, y + 2.9, z])
}

function bench(k, x, y, z, ry) {
  k.at({at: [x, y, z], ry}, () => {
    k.box(1.5, 0.08, 0.46, PAL.timberLight, 0, 0.48, 0, {ch: 0.02})
    k.box(1.5, 0.09, 0.05, PAL.timberLight, 0, 0.78, -0.22, {rx: -8})
    k.box(1.5, 0.09, 0.05, PAL.timberLight, 0, 0.94, -0.24, {rx: -8})
    for (const s of [-1, 1]) { k.box(0.08, 0.5, 0.44, PAL.iron, s * 0.62, 0.25, 0); k.box(0.07, 0.6, 0.07, PAL.iron, s * 0.62, 0.72, -0.21) }
  })
}

/** Fontaine centrale à trois vasques : le cœur de la place. */
export function fountainKit() {
  const k = new Kit({seed: 77})
  k.lathe([[2.75, 0], [2.75, 0.5], [2.55, 0.58], [2.32, 0.58], [2.32, 0.2]], 28, PAL.stoneLight)
  k.lathe([[0.55, 0.2], [0.42, 1.2], [0.28, 1.7], [1.3, 1.92], [1.34, 2.08], [1.16, 2.04], [0.3, 1.9]], 22, PAL.stoneLight)
  k.lathe([[0.26, 2], [0.18, 2.6], [0.68, 2.86], [0.7, 2.98], [0.56, 2.94], [0.14, 2.88]], 18, PAL.stone)
  k.lathe([[0.14, 2.9], [0.09, 3.26], [0.2, 3.36], [0, 3.58]], 12, PAL.brass)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.28
    k.box(0.26, 0.1, 0.5, PAL.brass, Math.sin(a) * 2.58, 0.56, Math.cos(a) * 2.58, {ry: (a * 180) / Math.PI})
  }
  return k
}

/** Eau de la fontaine : disque séparé, éclaircie par les paillettes du shader de la mer. */
export function fountainWaterKit() {
  const k = new Kit({seed: 78, ao: false, jitter: 0})
  k.cyl(2.34, 2.34, 0.01, 28, '#56c4c8', 0, 0.42, 0, {smooth: false})
  k.cyl(1.17, 1.17, 0.01, 20, '#7cd8d4', 0, 2, 0)
  k.cyl(0.56, 0.56, 0.01, 14, '#9fe6dc', 0, 2.9, 0)
  return k
}

/** Le chat du village : pas une tâche, juste un voisin. Il dort sur la place, on peut le saluer en balade. */
export function catKit() {
  const k = new Kit({seed: 90, ao: false, jitter: 0})
  const fur = '#d98a3f', dark = '#a9622a'
  k.blob(0.34, fur, 0, 0.24, 0, {sx: 1.22, sy: 0.72, detail: 2, bump: 0.02, low: dark, high: '#eba95e'})
  k.blob(0.2, fur, 0.32, 0.26, 0.17, {detail: 1, bump: 0, low: dark, high: '#eba95e'})
  for (const s of [-1, 1]) {
    const x = 0.32 + s * 0.11
    k.tri([x - 0.06, 0.4, 0.17], [x + 0.06, 0.4, 0.17], [x, 0.54, 0.17], dark)
    k.tri([x + 0.06, 0.4, 0.17], [x - 0.06, 0.4, 0.17], [x, 0.54, 0.17], dark)
    k.box(0.05, 0.012, 0.01, '#3a2412', 0.32 + s * 0.07, 0.28, 0.35)
  }
  for (let i = 0; i < 7; i++) { const a = -0.3 + i * 0.42; k.blob(0.075, i % 2 ? dark : fur, Math.cos(a) * 0.42, 0.1, Math.sin(a) * 0.3 + 0.08, {detail: 1, bump: 0}) }
  return k
}

/** Voilier au large et goélands : la vie de la mer, sans rapport avec les tâches. */
export function sailboatKit() {
  const k = new Kit({seed: 91, ao: false, jitter: 0.02})
  k.lathe([[0.1, -0.1], [1.05, 0.25], [1.25, 0.72]], 10, '#f3ead6', 0, 0, 0)
  k.box(1.7, 0.05, 4, '#a0764c', 0, 0.68, 0)
  k.lathe([[0.4, 0.6], [0.75, 0.72]], 8, '#c9633f', 0, 0, 1.2)
  k.cyl(0.05, 0.08, 5.2, 6, '#6a4a31', 0, 0.7, 0)
  k.tri([0, 1.2, -0.1], [0, 1.2, 2.6], [0, 5.6, -0.1], '#fff8ea')
  k.tri([0, 5.6, -0.1], [0, 1.2, 2.6], [0, 1.2, -0.1], '#f3e4c4')
  k.tri([0, 1.5, 0.1], [0, 5, 0.1], [0, 1.5, -1.8], '#e9774f')
  k.tri([0, 1.5, -1.8], [0, 5, 0.1], [0, 1.5, 0.1], '#c9633f')
  return k
}
export function gullKit() {
  const k = new Kit({seed: 92, ao: false, jitter: 0})
  k.blob(0.13, '#ffffff', 0, 0, 0, {sz: 1.9, detail: 1, bump: 0, low: '#c9cdd2'})
  for (const s of [-1, 1]) {
    k.tri([0, 0.03, -0.1], [0, 0.03, 0.12], [s * 0.62, 0.2, -0.08], '#f4f6f7')
    k.tri([s * 0.62, 0.2, -0.08], [0, 0.03, 0.12], [0, 0.03, -0.1], '#d9dde0')
    k.tri([s * 0.62, 0.2, -0.08], [s * 0.62, 0.2, 0.02], [s * 0.82, 0.16, -0.14], '#4a4f55')
    k.tri([s * 0.82, 0.16, -0.14], [s * 0.62, 0.2, 0.02], [s * 0.62, 0.2, -0.08], '#4a4f55')
  }
  return k
}

/** Pont de pierre à dos d'âne au-dessus de la rivière. */
function bridge(k, b) {
  const ry = (Math.atan2(b.dx, b.dz) * 180) / Math.PI
  k.at({at: [b.x, 0, b.z], ry}, () => {
    const seg = 10, L = b.len, W = b.w
    const arch = (t) => 0.95 * (1 - t * t)
    for (let i = 0; i < seg; i++) {
      const t0 = -1 + (2 * i) / seg, t1 = -1 + (2 * (i + 1)) / seg
      const z0 = (t0 * L) / 2, z1 = (t1 * L) / 2
      const y0 = arch(t0), y1 = arch(t1)
      // tablier pavé
      const c = i % 2 ? '#cbbfa8' : '#c0b49c'
      k.poly([[-W / 2, y0, z0], [-W / 2, y1, z1], [W / 2, y1, z1], [W / 2, y0, z0]], c)
      // tympans et parapets
      for (const s of [-1, 1]) {
        k.poly([[s * W / 2, -1.2, z0], [s * W / 2, y0, z0], [s * W / 2, y1, z1], [s * W / 2, -1.2, z1]], PAL.stone, [0, 0, (z0 + z1) / 2])
        const zm = (z0 + z1) / 2, ym = (y0 + y1) / 2
        k.at({at: [s * (W / 2 + 0.12), ym + 0.28, zm], rx: (Math.atan2(y0 - y1, z1 - z0) * 180) / Math.PI}, () => k.box(0.26, 0.72, (L / seg) * 1.06, i % 2 ? PAL.stoneLight : PAL.stone, 0, 0, 0, {ch: 0.02}))
      }
    }
    // Arche : un trou sombre lisible sous le pont
    for (const s of [-1, 1]) k.cyl(1.05, 1.05, 0.02, 12, '#3f4b4c', s * (W / 2 + 0.02), -0.7, 0, {rz: 90, base: true})
  })
}

const SECTOR = 42
const sectorKey = (x, z) => Math.floor((x + 140) / SECTOR) + '_' + Math.floor((z + 140) / SECTOR)

/**
 * Cuit tout le décor. Renvoie les maillages par secteur (feuillages avec vent / mobilier sans vent),
 * les ampoules, les points de lumière, les obstacles pour le joueur.
 */
export function buildScenery(plan, terrain, {lots, density = 1}) {
  const R = rng(4242)
  const wind = new Map(), still = new Map()
  const sectorOf = (map, x, z) => {
    const key = sectorKey(x, z)
    if (!map.has(key)) map.set(key, new Kit({seed: map.size + 5, jitter: 0.03}))
    return map.get(key)
  }
  const bulbs = new Kit({seed: 9, ao: false, jitter: 0})
  const lights = []
  const obstacles = []
  const occupied = []
  const isFree = (x, z, r) => occupied.every((o) => Math.hypot(o[0] - x, o[1] - z) > o[2] + r)
  const lotList = Object.values(lots)
  const inLot = (x, z, m) => lotList.some((l) => {
    const dx = x - l.x, dz = z - l.z, a = (l.ry * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
    const lx = dx * c - dz * s, lz = dx * s + dz * c
    return Math.abs(lx) < (l.spec?.w ?? 8) / 2 + m && Math.abs(lz) < (l.spec?.d ?? 6) / 2 + m + 1
  }) || (Math.abs(x - OFFICE.x) < 8 + m && z > OFFICE.z - 6 - m && z < -8)
  const onStreet = (x, z, m) => terrain.roadDistance(x, z) < m || Math.hypot(x, z) < PLAZA.r + m

  const place = (kind, x, z, s = 1, clearance = 1.9, opt = {}) => {
    if (inLot(x, z, clearance * 0.6) || onStreet(x, z, clearance) || !isFree(x, z, clearance * 0.8)) return false
    const y = terrain.groundY(x, z)
    if (y < terrain.size * 0 - 0.1 || terrain.riverDistance(x, z) < 2.6) return false
    tree(sectorOf(wind, x, z), kind, x, y - 0.08, z, s)
    occupied.push([x, z, clearance * 0.8 * s])
    if (s > 0.7 && !opt.noCollide) obstacles.push({x, z, r: 0.55 * s})
    return true
  }

  // Arbres de caractère, quartier par quartier : ce sont eux qui signent chaque ambiance.
  const clusters = [
    ['pine', -40, -38, 7, 14], ['pine', -27, -45, 7, 16], ['pine', -14, -46, 6, 14], ['pine', -46, -33, 5, 8], ['pine', -3, -43, 3, 3],
    ['violet', 2, -34, 3, 5], ['violet', 19, -38, 4, 8], ['violet', 10, -45, 5, 10], ['violet', 17, -27, 2, 2],
    ['autumn', 17, -22, 3, 5], ['autumn', 34, -30, 4, 7], ['autumn', 45, -22, 4, 6], ['autumn', 30, -6, 3, 3], ['autumn', 17, -41, 4, 4],
    ['round', 44, 10, 4, 6], ['round', 28, 12, 3, 3], ['round', 39, 26, 4, 7], ['round', 20, 8, 2, 2],
    ['cypress', -36, -26, 2, 3], ['cypress', -51, -18, 3, 3], ['cypress', -48, 10, 2, 3], ['cypress', -36, 13, 3, 3], ['cypress', -62, -3, 3, 4], ['cypress', -33, 19, 3, 3],
    ['blossom', -22, 27, 3, 4], ['blossom', -9, 19, 1.3, 2], ['blossom', 6.8, 19, 1.5, 2], ['blossom', 8, 37, 5, 6], ['blossom', -14, 36, 6, 8], ['blossom', 22, 33, 3, 3],
    ['willow', -16, 6, 2, 1], ['willow', -25, 22, 2, 2], ['willow', -12, -11, 1, 1],
  ]
  for (const [kind, cx, cz, r, count] of clusters) {
    for (let i = 0, placed = 0; i < count * 8 && placed < count * density; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * r
      if (place(kind, cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0.82 + R() * 0.5, kind === 'pine' ? 1.8 : 2.1)) placed++
    }
  }

  // Le verger du campus : alignement régulier autour de la pelouse.
  const quad = plan.roads.find((r) => r.id === 'quad')
  if (quad) {
    for (const [x, z] of [[-36, -4], [-46, -4], [-36, 2.5], [-46, 2.5]]) place('round', x, z, 0.72, 1.2)
  }
  // Forêt périphérique sur les collines, plus dense à mesure qu'on s'éloigne.
  const budget = Math.round(240 * density)
  for (let i = 0, placed = 0; i < budget * 8 && placed < budget; i++) {
    const x = -75 + R() * 145, z = -68 + R() * 125
    const sd = shoreDistance(x, z)
    if (sd < 3.5) continue
    const c = terrain.clearance(x, z)
    if (c < 3.5) continue
    const f = fbm(x * 0.06 + 40, z * 0.06 + 20, 3)
    if (f < 0.42) continue
    const y = terrain.groundY(x, z)
    let kind = 'round'
    if (z < -28 && x < 4) kind = 'pine'
    else if (z < -28 && x < 22) kind = 'violet'
    else if (x > 18 && z < -5) kind = 'autumn'
    else if (x < -28) kind = R() < 0.6 ? 'cypress' : 'round'
    else if (z > 14) kind = R() < 0.5 ? 'blossom' : 'round'
    else kind = R() < 0.2 ? 'pine' : 'round'
    if (place(kind, x, z, 0.8 + R() * 0.65 + Math.min(0.3, y * 0.06), 1.9)) placed++
  }

  // Buissons, rochers, touffes : le petit décor qu'on découvre en zoomant.
  const clutter = Math.round(520 * density)
  for (let i = 0; i < clutter; i++) {
    const x = -72 + R() * 140, z = -66 + R() * 122
    const sd = shoreDistance(x, z)
    if (sd < 1) continue
    if (onStreet(x, z, 1) || inLot(x, z, 0.3) || terrain.riverDistance(x, z) < 2.2) continue
    const y = terrain.groundY(x, z)
    const roll = R()
    const near = sd < 5
    if (near || roll < 0.08) rock(sectorOf(still, x, z), x, y, z, 0.26 + R() * 0.55)
    else if (roll < 0.34) sectorOf(wind, x, z).blob(0.34 + R() * 0.36, '#6f9a4b', x, y + 0.26, z, {sy: 0.75, detail: 1, bump: 0.14, low: '#3f6c3c', high: '#8cb257'})
    else tuft(sectorOf(wind, x, z), x, y, z, R() < 0.5 ? '#6a9c48' : '#90b357')
  }

  // Rochers en bord de rivière
  for (let i = 4; i < plan.river.path.length - 2; i += 3) {
    const p = plan.river.path[i], side = i % 2 ? 1 : -1
    const x = p[0] + side * (2.3 + R() * 0.5), z = p[1] + (R() - 0.5) * 2
    if (onStreet(x, z, 1)) continue
    rock(sectorOf(still, x, z), x, terrain.groundY(x, z) - 0.1, z, 0.36 + R() * 0.3)
  }

  // Lampadaires le long des rues (à intervalles réguliers, du bon côté du trottoir)
  for (const r of plan.roads) {
    if (r.kind === 'path') continue
    let acc = r.kind === 'street' ? 4 : 7, side = 1
    for (let i = 1; i < r.path.length; i++) {
      const a = r.path[i - 1], b = r.path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1])
      acc += l
      if (acc >= 11) {
        acc = 0
        const nx = -(b[1] - a[1]) / (l || 1), nz = (b[0] - a[0]) / (l || 1), off = r.w / 2 + 0.6
        const x = b[0] + nx * off * side, z = b[1] + nz * off * side
        side = -side
        if (!inLot(x, z, 0) && terrain.riverDistance(x, z) > 2.1 && Math.hypot(x, z) > PLAZA.r + 1) {
          const k = sectorOf(still, x, z)
          lamp(k, bulbs, x, terrain.groundY(x, z), z, lights)
          obstacles.push({x, z, r: 0.3})
          occupied.push([x, z, 0.7])
        }
      }
    }
  }

  // Place : lampadaires et bancs en couronne, parterres entre les rues
  const plazaKit = sectorOf(still, 0.5, 0.5)
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2
    const x = Math.cos(a) * (PLAZA.r - 0.5), z = Math.sin(a) * (PLAZA.r - 0.5)
    const blocked = plan.roads.some((r) => r.kind === 'street' && Math.hypot(r.path[0][0] - x, r.path[0][1] - z) < 2.4) || (z < -7 && Math.abs(x) < 4)
    if (blocked) continue
    if (i % 2 === 0) { lamp(plazaKit, bulbs, x, 0, z, lights); obstacles.push({x, z, r: 0.3}) }
    else {
      bench(plazaKit, x, 0, z, (Math.atan2(-x, -z) * 180) / Math.PI)
      obstacles.push({x, z, r: 0.8})
    }
  }
  obstacles.push({x: 0, z: 0, r: 3})

  // Bancs des parcelles : c'est là que s'assoient les tâches programmées.
  const seats = {}
  for (const [id, lot] of Object.entries(lots)) {
    const b = lot.spec?.spot?.bench
    if (!b) continue
    const [x, z] = lotPoint(lot, b[0], b[1])
    const k = sectorOf(still, x, z)
    bench(k, x, terrain.groundY(x, z), z, lot.ry)
    seats[id] = {x, z, ry: lot.ry}
  }

  // Ponts
  const bridgeKit = sectorOf(still, plan.bridges[0]?.x ?? 0, plan.bridges[0]?.z ?? 0)
  plan.bridges.forEach((b) => bridge(bridgeKit, b))

  // Le port : ponton, barque et phare, tout au bout de la rue de l'est.
  const harbor = sectorOf(still, 42, 18)
  const lhx = 47.5, lhz = 20
  const ground = terrain.groundY(lhx, lhz)
  harbor.lathe([[2.1, -1.5], [2.1, 0.4], [1.8, 0.65]], 12, PAL.stoneDark, lhx, ground, lhz)
  harbor.lathe([[1.45, 0.65], [1.05, 7.4], [1.3, 7.7], [1.34, 7.95]], 14, (i) => (i === 0 ? PAL.white : PAL.red), lhx, ground, lhz)
  for (const y of [2.1, 4.8]) harbor.cyl(1.32 - y * 0.05, 1.36 - y * 0.05, 1.05, 14, PAL.red, lhx, ground + y, lhz, {cap: false, smooth: true})
  harbor.lathe([[0.72, 8.9], [0.82, 9.2], [0.2, 9.9], [0, 10.1]], 12, PAL.red, lhx, ground, lhz)
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; harbor.box(0.05, 1, 0.05, PAL.iron, lhx + Math.cos(a) * 0.68, ground + 8.45, lhz + Math.sin(a) * 0.68) }
  harbor.cyl(1.36, 1.36, 0.05, 12, PAL.iron, lhx, ground + 8.72, lhz, {cap: false, smooth: true})
  bulbs.blob(0.48, '#fff0b0', lhx, ground + 8.45, lhz, {detail: 1, bump: 0, low: '#ffd27a'})
  lights.push([lhx, ground + 8.45, lhz])
  obstacles.push({x: lhx, z: lhz, r: 2.2})

  // Ponton au sud, avec barque amarrée
  const jetty = sectorOf(still, 4, 50)
  const jx = 4, jz0 = 42.5, jz1 = 56
  for (let z = jz0; z < jz1; z += 0.72) jetty.box(2.2 + (Math.round(z * 3) % 2) * 0.12, 0.1, 0.62, PAL.timberLight, jx, 0.1, z, {ry: (Math.round(z * 7) % 3) - 1})
  for (let z = jz0 + 1; z < jz1 + 0.4; z += 3.6) for (const s of [-1, 1]) jetty.cyl(0.13, 0.15, 2.4, 7, PAL.timber, jx + s * 1.1, -1.5, z)
  const boat = (k, x, z, ry, col) => k.at({at: [x, -0.46, z], ry}, () => {
    k.lathe([[0.1, 0], [1, 0.25], [1.05, 0.6]], 12, col, 0, 0, 0)
    k.box(1.5, 0.05, 0.4, PAL.plank, 0, 0.35, 0)
    k.box(0.08, 3, 0.08, PAL.timberDark, 0, 1.6, 0)
  })
  boat(jetty, jx + 3, 51, 40, '#4c7e93')

  return {wind, still, bulbs, lights, obstacles, seats}
}
