// Atelier de géométrie procédurale : tout le village est modelé ici, sans fichier externe.
// Le kit empile des primitives facettées dans un seul tableau de sommets, donc un bâtiment
// complet ne coûte qu'un draw call. Ce module ne dépend pas du moteur (testable sous Node).

const cache = new Map()
const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

/** Convertit '#rrggbb' en [r, g, b] linéaire (les couleurs de sommet ne sont pas décodées par le moteur). */
export function linear(hex) {
  if (Array.isArray(hex)) return hex
  let c = cache.get(hex)
  if (!c) {
    const n = parseInt(hex.slice(1), 16)
    c = [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)]
    cache.set(hex, c)
  }
  return c
}

export const mixColor = (a, b, t) => {
  const x = linear(a), y = linear(b)
  return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]
}
export const shade = (c, k) => { const x = linear(c); return [x[0] * k, x[1] * k, x[2] * k] }

export function rng(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const hashString = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const mul = (a, b) => {
  const o = new Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3]
  return o
}
const translation = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1] }
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1] }
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }
const scaling = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]
const DEG = Math.PI / 180

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }

// Icosphère partagée pour les feuillages et les têtes, générée une seule fois par niveau.
const icoCache = new Map()
function icosphere(detail) {
  if (icoCache.has(detail)) return icoCache.get(detail)
  const t = (1 + Math.sqrt(5)) / 2
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm)
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
  for (let d = 0; d < detail; d++) {
    const mid = new Map(), next = []
    const m = (a, b) => {
      const k = a < b ? a + '_' + b : b + '_' + a
      if (!mid.has(k)) { v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2])); mid.set(k, v.length - 1) }
      return mid.get(k)
    }
    for (const [a, b, c] of f) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]) }
    f = next
  }
  const out = {v, f}
  icoCache.set(detail, out)
  return out
}

export class Kit {
  constructor({seed = 1, jitter = 0.035, ao = true, dry = false} = {}) {
    this.p = []; this.n = []; this.c = []
    this.m = IDENTITY
    this.stack = []
    this.random = rng(seed)
    this.jitter = jitter
    this.ao = ao
    this.dry = dry // à blanc : le bâtiment donne ses dimensions sans coûter de géométrie
  }

  /** Exécute `fn` dans un repère local : {at:[x,y,z], ry, rx, rz (degrés), s}. */
  at(t, fn) {
    this.stack.push(this.m)
    let m = this.m
    if (t.at) m = mul(m, translation(t.at[0], t.at[1], t.at[2]))
    if (t.ry) m = mul(m, rotY(t.ry * DEG))
    if (t.rx) m = mul(m, rotX(t.rx * DEG))
    if (t.rz) m = mul(m, rotZ(t.rz * DEG))
    if (t.s) m = mul(m, typeof t.s === 'number' ? scaling(t.s, t.s, t.s) : scaling(t.s[0], t.s[1], t.s[2]))
    this.m = m
    fn(this)
    this.m = this.stack.pop()
    return this
  }

  xf(p) {
    const m = this.m
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]
  }
  xn(n) {
    const m = this.m
    return norm([m[0] * n[0] + m[4] * n[1] + m[8] * n[2], m[1] * n[0] + m[5] * n[1] + m[9] * n[2], m[2] * n[0] + m[6] * n[1] + m[10] * n[2]])
  }

  aoAt(y) {
    if (!this.ao) return 1
    const t = Math.min(1, Math.max(0, y / 1.3))
    return 0.66 + 0.34 * t * t * (3 - 2 * t)
  }

  push(p, n, c, k = 1) {
    if (this.dry) return
    const a = this.aoAt(p[1]) * k
    this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.c.push(c[0] * a, c[1] * a, c[2] * a, 1)
  }

  /** Tuile de toit : seules la face du dessus et la tranche basse se voient, on économise le reste. */
  tile(w, thick, len, col, x, y, z, side) {
    if (this.dry) return this
    const hw = w / 2, hl = (len / 2) * side, lip = thick * 0.5
    const a = [x - hw, y + lip, z - hl], b = [x + hw, y + lip, z - hl], c = [x + hw, y - lip * 0.2, z + hl], d = [x - hw, y - lip * 0.2, z + hl]
    const e = [x + hw, y - thick, z + hl], f = [x - hw, y - thick, z + hl]
    if (side > 0) { this.poly([d, c, b, a], col); this.poly([f, e, c, d], shade(col, 0.68)) }
    else { this.poly([a, b, c, d], col); this.poly([d, c, e, f], shade(col, 0.68)) }
    return this
  }

  /** Triangle plat, déjà orienté dans le sens antihoraire vu de l'extérieur. */
  tri(a, b, c, col, k = 1) {
    const A = this.xf(a), B = this.xf(b), C = this.xf(c)
    const n = norm(cross(sub(B, A), sub(C, A)))
    const color = linear(col)
    this.push(A, n, color, k); this.push(B, n, color, k); this.push(C, n, color, k)
  }

  /** Polygone convexe plat. La couleur varie légèrement par face : effet « peint à la main ». */
  poly(pts, col, center) {
    let list = pts
    if (center) {
      const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]))
      if (dot(n, sub(pts[0], center)) < 0) list = [...pts].reverse()
    }
    const k = 1 + (this.random() - 0.5) * 2 * this.jitter
    for (let i = 1; i < list.length - 1; i++) this.tri(list[0], list[i], list[i + 1], col, k)
  }

  /**
   * Boîte centrée en (x, y, z), avec chanfrein optionnel qui accroche la lumière sur les arêtes.
   * opts : ch (chanfrein), ry/rx/rz (degrés), top (couleur du dessus), bottom:false pour omettre le dessous.
   */
  box(w, h, d, col, x = 0, y = 0, z = 0, o = {}) {
    const draw = () => {
      const hx = w / 2, hy = h / 2, hz = d / 2, ch = Math.min(o.ch || 0, hx, hy, hz)
      const C = [0, 0, 0]
      const size = [hx, hy, hz]
      const cols = (axis, sign) => (axis === 1 && sign > 0 && o.top) ? o.top : col
      const corner = (s, axis) => s.map((v, i) => v * (size[i] - (i === axis ? 0 : ch)))
      for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
        if (axis === 1 && sign < 0 && o.bottom === false) continue
        const b = (axis + 1) % 3, c = (axis + 2) % 3
        const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const s = [0, 0, 0]; s[axis] = sign; s[b] = u; s[c] = v; return corner(s, axis) })
        this.poly(pts, cols(axis, sign), C)
      }
      if (ch > 0) {
        for (let axis = 0; axis < 3; axis++) {
          const b = (axis + 1) % 3, c = (axis + 2) % 3
          for (const sb of [-1, 1]) for (const sc of [-1, 1]) {
            const s0 = [0, 0, 0], s1 = [0, 0, 0]
            s0[axis] = -1; s1[axis] = 1; s0[b] = s1[b] = sb; s0[c] = s1[c] = sc
            this.poly([corner(s0, b), corner(s1, b), corner(s1, c), corner(s0, c)], col, C)
          }
        }
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const s = [sx, sy, sz]
          this.poly([corner(s, 0), corner(s, 1), corner(s, 2)], col, C)
        }
      }
    }
    if (x || y || z || o.ry || o.rx || o.rz) this.at({at: [x, y, z], ry: o.ry, rx: o.rx, rz: o.rz}, draw)
    else draw()
    return this
  }

  /** Cylindre ou tronc de cône à base posée en y. smooth : normales radiales pour un volume arrondi. */
  cyl(rt, rb, h, seg, col, x = 0, y = 0, z = 0, o = {}) {
    const draw = () => {
      const color = linear(col)
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
        const b0 = [Math.sin(a0) * rb, 0, Math.cos(a0) * rb], b1 = [Math.sin(a1) * rb, 0, Math.cos(a1) * rb]
        const t0 = [Math.sin(a0) * rt, h, Math.cos(a0) * rt], t1 = [Math.sin(a1) * rt, h, Math.cos(a1) * rt]
        if (o.smooth) {
          const slope = (rb - rt) / (h || 1)
          const n0 = this.xn(norm([Math.sin(a0), slope, Math.cos(a0)])), n1 = this.xn(norm([Math.sin(a1), slope, Math.cos(a1)]))
          const B0 = this.xf(b0), B1 = this.xf(b1), T0 = this.xf(t0), T1 = this.xf(t1)
          this.push(B0, n0, color); this.push(B1, n1, color); this.push(T1, n1, color)
          if (rt > 0) { this.push(B0, n0, color); this.push(T1, n1, color); this.push(T0, n0, color) }
        } else {
          if (rt > 0) this.poly([b0, b1, t1, t0], col)
          else this.poly([b0, b1, t0], col)
        }
        if (rt > 0 && o.cap !== false) this.poly([[0, h, 0], t0, t1], o.top || col)
        if (o.base) this.poly([[0, 0, 0], b1, b0], col)
      }
    }
    this.at({at: [x, y, z], ry: o.ry, rx: o.rx, rz: o.rz}, draw)
    return this
  }

  /** Tour de révolution : profil [[rayon, y], ...] du bas vers le haut, normales lissées. */
  lathe(profile, seg, col, x = 0, y = 0, z = 0, o = {}) {
    this.at({at: [x, y, z], ry: o.ry}, () => {
      const color = (i) => (typeof col === 'function' ? linear(col(i, profile.length)) : linear(col))
      const slope = (i) => {
        const a = profile[Math.max(0, i - 1)], b = profile[Math.min(profile.length - 1, i + 1)]
        return [b[1] - a[1], a[0] - b[0]] // normale (r, y) du profil
      }
      for (let i = 0; i < profile.length - 1; i++) {
        const [r0, y0] = profile[i], [r1, y1] = profile[i + 1]
        const s0 = slope(i), s1 = slope(i + 1)
        for (let j = 0; j < seg; j++) {
          const a0 = (j / seg) * Math.PI * 2, a1 = ((j + 1) / seg) * Math.PI * 2
          const P = (r, h, a) => this.xf([Math.sin(a) * r, h, Math.cos(a) * r])
          const N = (s, a) => this.xn(norm([Math.sin(a) * s[0], s[1], Math.cos(a) * s[0]]))
          const c = color(i)
          const k = 1 + (this.random() - 0.5) * this.jitter
          const A = P(r0, y0, a0), B = P(r0, y0, a1), C = P(r1, y1, a1), D = P(r1, y1, a0)
          const nA = N(s0, a0), nB = N(s0, a1), nC = N(s1, a1), nD = N(s1, a0)
          if (r0 > 0.001) { this.push(A, nA, c, k); this.push(B, nB, c, k); this.push(C, nC, c, k) }
          if (r1 > 0.001) { this.push(A, nA, c, k); this.push(C, nC, c, k); this.push(D, nD, c, k) }
        }
      }
    })
    return this
  }

  /**
   * Volume organique : icosphère déformée, dégradé sombre en bas et clair en haut, normales
   * sphériques pour une lumière douce. Sert aux feuillages, rochers, têtes.
   * o : sx/sy/sz, detail, bump (déformation), low/high (couleurs bas et haut), flat.
   */
  blob(r, col, x = 0, y = 0, z = 0, o = {}) {
    const {v, f} = icosphere(o.detail ?? 1)
    const sx = o.sx ?? 1, sy = o.sy ?? 1, sz = o.sz ?? 1, bump = o.bump ?? 0.08
    const low = linear(o.low ?? shade(col, 0.62)), high = linear(o.high ?? col)
    const seedA = this.random() * 10, seedB = this.random() * 10
    const P = (q) => {
      const d = 1 + bump * (Math.sin(q[0] * 3.1 + seedA) * Math.cos(q[2] * 2.7 + seedB) + 0.5 * Math.sin(q[1] * 4.3 + seedA))
      return [x + q[0] * r * sx * d, y + q[1] * r * sy * d, z + q[2] * r * sz * d]
    }
    for (const [a, b, c] of f) {
      const pts = [v[a], v[b], v[c]]
      const world = pts.map((q) => this.xf(P(q)))
      const flat = o.flat ? this.xn(norm(cross(sub(P(pts[1]), P(pts[0])), sub(P(pts[2]), P(pts[0]))))) : null
      pts.forEach((q, i) => {
        const t = (q[1] + 1) / 2
        const col2 = [low[0] + (high[0] - low[0]) * t, low[1] + (high[1] - low[1]) * t, low[2] + (high[2] - low[2]) * t]
        this.push(world[i], flat || this.xn(q), col2)
      })
    }
    return this
  }

  /** Plaque plate au sol, ou décor collé à une façade (quad CCW déjà orienté). */
  quad(a, b, c, d, col) { this.poly([a, b, c, d], col); return this }

  get vertexCount() { return this.p.length / 3 }

  /** Fusionne un autre kit dans celui-ci en appliquant le repère courant. */
  merge(other) {
    for (let i = 0; i < other.p.length / 3; i++) {
      const P = this.xf([other.p[i * 3], other.p[i * 3 + 1], other.p[i * 3 + 2]])
      const N = this.xn([other.n[i * 3], other.n[i * 3 + 1], other.n[i * 3 + 2]])
      this.p.push(P[0], P[1], P[2]); this.n.push(N[0], N[1], N[2])
      this.c.push(other.c[i * 4], other.c[i * 4 + 1], other.c[i * 4 + 2], other.c[i * 4 + 3])
    }
    return this
  }

  arrays() {
    return {positions: new Float32Array(this.p), normals: new Float32Array(this.n), colors: new Float32Array(this.c), count: this.p.length / 3}
  }
}
