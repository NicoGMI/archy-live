// Relief de l'île : champ de hauteur cuit une fois, lu ensuite en O(1) par les personnages et le décor.
// Le cœur du village reste plat (y = 0), les collines n'apparaissent qu'à distance des rues.
import {ISLAND, LOTS, SPARE_LOTS, OFFICE, PLAZA, bridgeHeight} from './plan.js'

const fract = (x) => x - Math.floor(x)
const hash2 = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export {smooth as smoothstep}

export function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, f = 1
  for (let i = 0; i < oct; i++) { s += a * valueNoise(x * f, z * f); a *= 0.5; f *= 2.03 }
  return s
}

/** Distance approximative au rivage : positive dans les terres, négative en mer. */
export function shoreDistance(x, z) {
  const dx = (x - ISLAND.cx) / ISLAND.rx, dz = (z - ISLAND.cz) / ISLAND.rz
  const a = Math.atan2(dz, dx)
  const wobble = 1 + 0.055 * Math.sin(a * 3 + 0.7) + 0.04 * Math.sin(a * 5 - 1.1) + 0.022 * Math.sin(a * 11 + 2.2) + 0.09 * (fbm(x * 0.045 + 7, z * 0.045 + 3, 3) - 0.45)
  const r = Math.hypot(dx, dz) / wobble
  return (1 - r) * Math.min(ISLAND.rx, ISLAND.rz)
}

const footprints = () => [
  ...Object.values(LOTS).map((l) => [l.x, l.z, 8.5]),
  ...SPARE_LOTS.map((l) => [l.x, l.z, 5]),
  [OFFICE.x, OFFICE.z, 11],
  [PLAZA.x, PLAZA.z, PLAZA.r + 2],
]

/** Bande de sable du sud-ouest au sud-est ; falaises au nord et à l'est. */
const cliffMask = (x, z) => {
  const a = Math.atan2(z - ISLAND.cz, x - ISLAND.cx)
  const north = smooth(0.2, 0.9, Math.cos(a + Math.PI / 2)), east = smooth(0.82, 1, Math.cos(a + 0.35)) * 0.8
  return Math.max(north, east)
}

export function makeTerrain(plan, {size = 260, cell = 1} = {}) {
  const n = Math.round(size / cell) + 1
  const half = size / 2
  const data = new Float32Array(n * n)
  const clearanceField = new Float32Array(n * n)
  const riverField = new Float32Array(n * n)
  const lots = footprints()
  // Segments simplifiés (les routes secondaires par pas de 2) pour garder la cuisson rapide.
  const segs = []
  for (const r of plan.roads) for (let i = 1; i < r.path.length; i++) segs.push([r.path[i - 1], r.path[i], r.w / 2])
  const riverPath = plan.river.path

  const distRoad = (x, z) => {
    let best = Infinity
    for (const [a, b] of segs) {
      const dx = b[0] - a[0], dz = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)))
      const ex = x - a[0] - t * dx, ez = z - a[1] - t * dz
      const d = ex * ex + ez * ez
      if (d < best) best = d
    }
    return Math.sqrt(best)
  }
  const distRiver = (x, z) => {
    let best = Infinity
    for (let i = 1; i < riverPath.length; i++) {
      const a = riverPath[i - 1], b = riverPath[i], dx = b[0] - a[0], dz = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)))
      const d = Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)
      if (d < best) best = d
    }
    return best
  }
  const clearance = (x, z) => {
    let c = distRoad(x, z)
    for (const [lx, lz, r] of lots) { const d = Math.hypot(x - lx, z - lz) - r; if (d < c) c = d }
    return c
  }

  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * cell, z = -half + j * cell
    const d = shoreDistance(x, z)
    let h
    let c = 40
    if (d < -6) h = Math.max(-5, -1.6 + (d + 6) * 0.18)
    else {
      c = d > 0 ? clearance(x, z) : 20
      const cliff = cliffMask(x, z) * smooth(6, 12, c)
      const beach = -1.6 + 1.6 * smooth(-6, 5, d)
      const rock = -1.6 + (2.8 + 2.6 * fbm(x * 0.09, z * 0.09, 3)) * smooth(-2.6, 0.4, d)
      h = beach + (rock - beach) * cliff
      // Collines en retrait des rues : douces, elles encadrent le village sans le cacher.
      const hills = (fbm(x * 0.035 + 11, z * 0.035 + 5, 4) - 0.32) * 13
      const inland = smooth(3, 13, d)
      const north = smooth(-8, -34, z) * 0.9 + smooth(-40, -62, x) * 0.5 + 0.12
      h += Math.max(0, hills) * smooth(6, 19, c) * inland * Math.min(1, north)
      h += (fbm(x * 0.21, z * 0.21, 2) - 0.45) * 0.28 * smooth(1, 7, c) * smooth(0, 5, d)
    }
    const rd = distRiver(x, z)
    const w = plan.river.width
    const carve = smooth(w + 1.9, w + 0.2, rd)
    if (carve > 0) h = h + (Math.min(h, -1.15) - h) * carve
    data[j * n + i] = h
    clearanceField[j * n + i] = c
    riverField[j * n + i] = rd
  }

  const sample = (field, x, z) => {
    const fx = Math.min(n - 1.001, Math.max(0, (x + half) / cell)), fz = Math.min(n - 1.001, Math.max(0, (z + half) / cell))
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz
    const a = field[iz * n + ix], b = field[iz * n + ix + 1], c = field[(iz + 1) * n + ix], e = field[(iz + 1) * n + ix + 1]
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + e * u * v
  }
  const groundY = (x, z) => sample(data, x, z)
  const surfaceY = (x, z) => {
    const b = bridgeHeight(x, z, plan.bridges)
    return b !== null ? b : Math.max(groundY(x, z), ISLAND.sea + 0.05)
  }
  return {
    n, cell, half, size, data,
    groundY, surfaceY,
    clearance: (x, z) => sample(clearanceField, x, z),
    riverDistance: (x, z) => sample(riverField, x, z),
    roadDistance: distRoad,
    /** Marchable : sur la terre, hors rivière (sauf sur un pont). */
    walkable: (x, z) => bridgeHeight(x, z, plan.bridges) !== null || groundY(x, z) > ISLAND.sea + 0.32,
  }
}
