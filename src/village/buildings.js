// Les bâtiments du village. Chaque univers connu a sa silhouette, reconnaissable sans lire le nom :
// la chouette de Nowl, la grange de la Coop, le dôme qui tourne de NGMI, le marquee du studio Phil…
// Un bâtiment = un seul maillage (kit) + des emplacements de fenêtres que les tâches viendront éclairer.
import {Kit, hashString, shade, mixColor} from './meshkit.js'

export const PAL = {
  plaster: '#f2e4c8', cream: '#f7ecd6', sand: '#e6cfa3', ochre: '#e3b878', rose: '#eec6b4',
  stone: '#b7aa94', stoneLight: '#cfc4ae', stoneDark: '#8c8270', cobble: '#a59a88',
  timber: '#70492e', timberDark: '#4d3321', timberLight: '#a0764c', plank: '#b98a58',
  terracotta: '#c9633f', tile2: '#b5522f', slate: '#57677c', slateDark: '#465569', thatch: '#c8a35a', copper: '#6cab96', copperDark: '#4f8a78',
  brick: '#b35e45', brickDark: '#8e4634', iron: '#3a3a40', brass: '#d4a24a', white: '#fbf6ea', leaf: '#5e8f43', leafDark: '#3f6e36',
  red: '#c93f36', blue: '#3f79a8', navy: '#2c3f63', violet: '#6d4d94', lilac: '#b39ad1', pink: '#e8a4b4', teal: '#3d8a7d',
}
const FLOWERS = ['#ef6f8e', '#ffd257', '#ff9a57', '#f6f0e2', '#c98de0']

/** Atelier d'un bâtiment : primitives d'architecture réutilisées par tous les archétypes. */
let dryRun = false
class Builder {
  constructor(seed, accent) {
    this.k = new Kit({seed, dry: dryRun})
    this.bulbs = new Kit({seed, ao: false, jitter: 0, dry: dryRun})
    this.accent = accent
    this.slots = []
    this.spots = {}
    this.parts = []
  }

  wall(w, h, d, col, x, y, z, {base = PAL.stone, baseH = 0.5, quoins = null, ch = 0.04} = {}) {
    const k = this.k
    k.box(w, h, d, col, x, y + h / 2, z, {ch})
    if (base) k.box(w + 0.14, baseH, d + 0.14, base, x, y + baseH / 2, z, {ch: 0.05})
    if (quoins) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        for (let yy = baseH + 0.18; yy < h - 0.15; yy += 0.55) {
          const long = (Math.round(yy * 10) % 2) === 0
          k.box(long ? 0.5 : 0.34, 0.26, long ? 0.34 : 0.5, quoins, x + sx * (w / 2 - (long ? 0.2 : 0.13)), y + yy, z + sz * (d / 2 - (long ? 0.13 : 0.2)))
        }
      }
    }
    return this
  }

  /** Toit à deux pans, faîtage selon X. Les tuiles sont de vraies pièces : le relief accroche le soleil. */
  gable(w, d, rise, x, y, z, {col = PAL.terracotta, wallCol = PAL.plaster, over = 0.42, style = 'tile', trim = PAL.timberDark, ry = 0} = {}) {
    const k = this.k
    k.at({at: [x, y, z], ry}, () => {
      const hd = d / 2 + over, slope = Math.hypot(hd, rise), angle = (Math.atan2(rise, hd) * 180) / Math.PI
      const W = w + over * 2
      // Pignons
      const eave = (rise * over) / hd
      for (const s of [-1, 1]) k.poly([[s * w / 2, 0, -d / 2], [s * w / 2, 0, d / 2], [s * w / 2, eave, d / 2], [s * w / 2, rise, 0], [s * w / 2, eave, -d / 2]], wallCol, [0, 0.4, 0])
      for (const side of [-1, 1]) {
        k.at({at: [0, rise, 0], rx: side * angle, ry: side < 0 ? 0 : 0}, () => {
          // Le repère local : z le long de la pente, de 0 (faîtage) vers ±slope.
          k.box(W, 0.1, slope, shade(col, 0.72), 0, -0.1, (side * slope) / 2, {bottom: true})
          if (style === 'copper') {
            k.box(W, 0.05, slope, col, 0, -0.03, (side * slope) / 2)
            const n = Math.round(W / 0.55)
            for (let i = 0; i <= n; i++) k.box(0.06, 0.07, slope, shade(col, 1.2), -W / 2 + (i * W) / n, 0.02, (side * slope) / 2)
          } else if (style === 'thatch') {
            const rows = Math.round(slope / 0.34)
            for (let r = 0; r < rows; r++) {
              const zz = side * ((r + 0.5) * (slope / rows))
              k.box(W + (k.random() - 0.5) * 0.12, 0.2, (slope / rows) * 1.25, mixColor(col, '#8f7238', k.random() * 0.45), 0, 0.04 + r * 0.004, zz, {ch: 0.05})
            }
          } else {
            const rows = Math.max(3, Math.round(slope / (style === 'slate' ? 0.34 : 0.42)))
            const rowLen = slope / rows
            const tile = style === 'slate' ? 0.52 : 0.62
            for (let r = 0; r < rows; r++) {
              const n = Math.round(W / tile)
              const tw = W / n
              const off = r % 2 ? tw / 2 : 0
              const zz = side * ((r + 0.5) * rowLen)
              for (let i = 0; i < n + (r % 2 ? 1 : 0); i++) {
                const xx = -W / 2 + (i + 0.5) * tw - off
                const clip = Math.max(-W / 2, xx - tw / 2), clip2 = Math.min(W / 2, xx + tw / 2)
                const roll = k.random()
                const c = roll < 0.12 ? shade(col, 0.82) : roll > 0.9 ? shade(col, 1.14) : col
                k.tile((clip2 - clip) * 0.96, 0.05, rowLen * 1.2, c, (clip + clip2) / 2, 0.03, zz, side)
              }
            }
          }
        })
      }
      // Faîtage et rives
      k.box(W + 0.04, 0.13, 0.2, trim, 0, rise + 0.03, 0, {ch: 0.03})
      if (style !== 'thatch') {
        for (const s of [-1, 1]) for (const side of [-1, 1]) {
          k.at({at: [s * W / 2, rise, 0], rx: side * angle}, () => k.box(0.1, 0.16, slope, trim, 0, -0.07, (side * slope) / 2))
        }
      }
    })
    return this
  }

  /** Fenêtre posée sur une façade (repère local : +z vers l'extérieur). */
  win(x, y, z, {w = 0.92, h = 1.2, ry = 0, frame = PAL.white, shutter = null, box = false, arch = false, tall = false, priority = 1} = {}) {
    const k = this.k
    const H = tall ? h * 1.5 : h
    k.at({at: [x, y, z], ry}, () => {
      k.box(w + 0.18, H + 0.18, 0.1, frame, 0, 0, 0.02)
      k.box(w + 0.32, 0.08, 0.2, PAL.stoneLight, 0, -H / 2 - 0.1, 0.07)
      if (arch) {
        const seg = 8
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * Math.PI, a1 = ((i + 1) / seg) * Math.PI, r = w / 2 + 0.09
          k.poly([[0, H / 2 + 0.09, 0.07], [Math.cos(a0) * r, H / 2 + 0.09 + Math.sin(a0) * r, 0.07], [Math.cos(a1) * r, H / 2 + 0.09 + Math.sin(a1) * r, 0.07]], frame)
        }
      } else k.box(w + 0.34, 0.11, 0.16, shade(frame, 0.9), 0, H / 2 + 0.13, 0.05)
      k.box(0.05, H, 0.03, frame, 0, 0, 0.095)
      k.box(w, 0.05, 0.03, frame, 0, H * 0.08, 0.095)
      if (shutter) for (const s of [-1, 1]) {
        k.box(w * 0.42, H + 0.1, 0.05, shutter, s * (w / 2 + w * 0.21 + 0.12), 0, 0.03)
        for (let i = 0; i < 4; i++) k.box(w * 0.34, 0.03, 0.02, shade(shutter, 0.75), s * (w / 2 + w * 0.21 + 0.12), -H * 0.33 + (i * H) / 4.5, 0.06)
      }
      if (box) {
        k.box(w + 0.16, 0.17, 0.24, PAL.plank, 0, -H / 2 - 0.26, 0.16)
        const n = Math.round(w * 6)
        for (let i = 0; i < n; i++) {
          const fx = -w / 2 + (i + 0.5) * (w / n)
          k.blob(0.1, PAL.leaf, fx, -H / 2 - 0.13, 0.17, {detail: 0, flat: true, bump: 0})
          k.blob(0.065, FLOWERS[Math.floor(k.random() * FLOWERS.length)], fx + (k.random() - 0.5) * 0.08, -H / 2 - 0.05 + k.random() * 0.06, 0.2, {detail: 0, flat: true, bump: 0, low: shade('#ffffff', 1)})
        }
      }
      const c = [[-w / 2, -H / 2, 0.075], [w / 2, -H / 2, 0.075], [w / 2, H / 2, 0.075], [-w / 2, H / 2, 0.075]].map((p) => k.xf(p))
      this.slots.push({corners: c, priority})
    })
    return this
  }

  door(x, y, z, {w = 1.25, h = 2.15, col = this.accent, ry = 0, arch = true, steps = 2, lamp = true} = {}) {
    const k = this.k
    k.at({at: [x, y, z], ry}, () => {
      k.box(w + 0.3, h + 0.12, 0.14, PAL.stoneLight, 0, h / 2, 0.02)
      if (arch) {
        const seg = 10, r = w / 2 + 0.15
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * Math.PI, a1 = ((i + 1) / seg) * Math.PI
          k.poly([[0, h, 0.09], [Math.cos(a0) * r, h + Math.sin(a0) * r, 0.09], [Math.cos(a1) * r, h + Math.sin(a1) * r, 0.09]], PAL.stoneLight)
        }
      }
      k.box(w, h, 0.08, col, 0, h / 2, 0.08)
      for (let i = -1; i <= 1; i += 2) k.box(0.04, h - 0.12, 0.02, shade(col, 0.72), (i * w) / 6, h / 2, 0.125)
      k.box(w - 0.14, 0.05, 0.02, shade(col, 0.72), 0, h * 0.34, 0.125)
      k.box(w - 0.14, 0.05, 0.02, shade(col, 0.72), 0, h * 0.72, 0.125)
      k.blob(0.05, PAL.brass, w * 0.36, h * 0.46, 0.15, {detail: 0, flat: true, bump: 0})
      for (let s = 0; s < steps; s++) k.box(w + 0.8 - s * 0.26, 0.17, 0.62 - s * 0.14 + (steps - s - 1) * 0.3, PAL.stoneLight, 0, 0.085 + s * 0.17, 0.42 - s * 0.14 + (steps - s - 1) * 0.15, {ch: 0.03})
      if (lamp) this.lantern(w / 2 + 0.34, h * 0.86, 0.22)
      this.spots.door = k.xf([0, 0, 0.8])
    })
    return this
  }

  lantern(x, y, z) {
    const k = this.k
    k.box(0.05, 0.05, 0.22, PAL.iron, x, y + 0.2, z - 0.1)
    k.box(0.22, 0.05, 0.22, PAL.iron, x, y + 0.16, z)
    k.box(0.2, 0.04, 0.2, PAL.iron, x, y - 0.16, z)
    for (const a of [-1, 1]) for (const b of [-1, 1]) k.box(0.025, 0.3, 0.025, PAL.iron, x + a * 0.09, y, z + b * 0.09)
    const p = k.xf([x, y, z])
    this.bulbs.box(0.14, 0.26, 0.14, '#ffd27a', p[0], p[1], p[2])
    ;(this.spots.lights ||= []).push(p)
    return this
  }

  chimney(x, y, z, h = 1.6, col = PAL.brick) {
    const k = this.k
    k.box(0.62, h, 0.62, col, x, y + h / 2, z, {ch: 0.04})
    k.box(0.8, 0.13, 0.8, PAL.stoneLight, x, y + h, z, {ch: 0.03})
    k.cyl(0.13, 0.15, 0.3, 7, PAL.iron, x - 0.12, y + h + 0.05, z, {smooth: true})
    this.spots.chimney = k.xf([x - 0.12, y + h + 0.4, z])
    return this
  }

  /** Enseigne pendue en potence, à la couleur de l'univers : le repère le plus lisible de loin. */
  sign(x, y, z, {side = 1, w = 0.95, h = 0.62, col = this.accent} = {}) {
    const k = this.k
    k.box(0.9, 0.06, 0.06, PAL.iron, x + (side * 0.45), y + h / 2 + 0.2, z + 0.12)
    k.box(0.05, 0.3, 0.05, PAL.iron, x + side * 0.08, y + h / 2 + 0.05, z + 0.12)
    k.box(0.03, 0.2, 0.03, PAL.iron, x + side * 0.72, y + h / 2 + 0.1, z + 0.12)
    k.box(w, h, 0.08, col, x + side * 0.72, y, z + 0.12, {ch: 0.02})
    k.box(w * 0.74, h * 0.56, 0.1, shade(col, 1.3), x + side * 0.72, y, z + 0.12)
    return this
  }

  awning(x, y, z, w, {col = this.accent, stripe = PAL.white, depth = 1, ry = 0} = {}) {
    const k = this.k
    const n = Math.round(w / 0.42)
    k.at({at: [x, y, z], ry}, () => {
      for (let i = 0; i < n; i++) {
        const c = i % 2 ? col : stripe
        const xx = -w / 2 + ((i + 0.5) * w) / n
        k.box(w / n, 0.05, depth, c, xx, -depth * 0.28, depth / 2, {rx: 26})
        k.at({at: [xx, -depth * 0.56, depth * 0.9]}, () => {
          k.tri([-w / n / 2, 0, 0], [0, -0.17, 0], [w / n / 2, 0, 0], c)
          k.tri([w / n / 2, 0, 0], [0, -0.17, 0], [-w / n / 2, 0, 0], c)
        })
      }
      k.box(w, 0.05, 0.05, PAL.iron, 0, -depth * 0.56, depth * 0.9)
    })
    return this
  }

  ivy(x, y, z, w, h, {ry = 0} = {}) {
    const k = this.k
    k.at({at: [x, y, z], ry}, () => {
      const n = Math.round(w * h * 11)
      for (let i = 0; i < n; i++) {
        const py = k.random() ** 1.5 * h, px = (k.random() - 0.5) * w * (1 - (py / h) * 0.55)
        k.blob(0.13 + k.random() * 0.09, k.random() < 0.3 ? '#7ba54b' : PAL.leaf, px, py, 0.05, {detail: 0, flat: true, sz: 0.5, bump: 0})
      }
    })
    return this
  }

  bush(x, y, z, r = 0.55, col = PAL.leaf) { this.k.blob(r, col, x, y + r * 0.72, z, {detail: 1, bump: 0.14, sy: 0.82}); return this }

  flowerBed(x, z, w, d) {
    const k = this.k
    k.box(w, 0.14, d, '#6b4a33', x, 0.07, z, {ch: 0.03})
    const n = Math.round(w * d * 9)
    for (let i = 0; i < n; i++) {
      const fx = x + (k.random() - 0.5) * w * 0.9, fz = z + (k.random() - 0.5) * d * 0.9
      k.blob(0.12, PAL.leaf, fx, 0.22, fz, {detail: 0, flat: true, bump: 0})
      k.blob(0.08, FLOWERS[Math.floor(k.random() * FLOWERS.length)], fx, 0.34, fz, {detail: 0, flat: true, bump: 0, low: FLOWERS[0]})
    }
    return this
  }

  crate(x, y, z, s = 0.6, col = PAL.plank) {
    const k = this.k
    k.box(s, s, s, col, x, y + s / 2, z, {ch: 0.03, ry: k.random() * 24 - 12})
    k.box(s * 1.02, 0.06, s * 1.02, shade(col, 0.72), x, y + s * 0.82, z)
    k.box(s * 1.02, 0.06, s * 1.02, shade(col, 0.72), x, y + s * 0.18, z)
    return this
  }

  barrel(x, y, z, r = 0.3, h = 0.72) {
    const k = this.k
    k.lathe([[r * 0.82, 0], [r, h * 0.3], [r, h * 0.7], [r * 0.82, h], [0, h]], 10, PAL.plank, x, y, z)
    for (const f of [0.2, 0.8]) k.cyl(r * 1.0, r * 1.0, 0.04, 10, PAL.iron, x, y + h * f, z, {cap: false, smooth: true})
    return this
  }

  fence(x0, z0, x1, z1, {col = PAL.plank, h = 0.75, every = 1.15} = {}) {
    const k = this.k
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / every)), ry = (Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI
    for (let i = 0; i <= n; i++) {
      const t = i / n
      k.box(0.11, h, 0.11, col, x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t, {ry})
    }
    k.at({at: [(x0 + x1) / 2, 0, (z0 + z1) / 2], ry}, () => {
      k.box(0.05, 0.08, len, col, 0, h * 0.78, 0)
      k.box(0.05, 0.08, len, col, 0, h * 0.42, 0)
    })
    return this
  }

  /** Pièce animée à part (dôme, aiguilles) : un maillage séparé, avec son pivot. */
  part(name, pivot, fn) {
    const kit = new Kit({seed: this.parts.length + 3, ao: false, dry: dryRun})
    fn(kit)
    this.parts.push({name, pivot: this.k.xf(pivot), kit})
    return this
  }

  finish(size) { return {kit: this.k, bulbs: this.bulbs, slots: this.slots, spots: this.spots, parts: this.parts, ...size} }
}

// ---------------------------------------------------------------- Le bureau du boss

export function townHall() {
  const b = new Builder(101, '#8c2f2a'), k = b.k
  // Corps central, ailes basses, colonnes et grand perron : le seul bâtiment symétrique du village.
  b.wall(13, 3.6, 6.6, PAL.cream, 0, 0, -0.8, {quoins: PAL.stoneLight, baseH: 0.7})
  k.box(13.3, 0.26, 6.9, PAL.stoneLight, 0, 3.72, -0.8, {ch: 0.05})
  b.gable(13, 6.6, 2.1, 0, 3.8, -0.8, {col: PAL.slate, wallCol: PAL.cream, style: 'slate', over: 0.5, trim: PAL.slateDark})
  // Avant-corps à fronton
  b.wall(5.4, 4.2, 1.5, PAL.white, 0, 0, 2.9, {base: PAL.stone, baseH: 0.7})
  k.at({at: [0, 4.2, 2.95]}, () => {
    k.box(6, 0.24, 1.9, PAL.stoneLight, 0, 0.1, 0, {ch: 0.05})
    k.poly([[-3, 0.22, 0.96], [3, 0.22, 0.96], [0, 1.5, 0.96]], PAL.white)
    k.poly([[-2.5, 0.42, 0.98], [2.5, 0.42, 0.98], [0, 1.28, 0.98]], '#e3b878')
    k.poly([[3.05, 0.22, 0.96], [3.05, 0.22, -0.96], [0, 1.55, -0.96], [0, 1.55, 0.96]], PAL.slate)
    k.poly([[0, 1.55, 0.96], [0, 1.55, -0.96], [-3.05, 0.22, -0.96], [-3.05, 0.22, 0.96]], PAL.slate)
    k.box(0.24, 1.0, 0.24, PAL.brass, 0, 0.85, 1.0, {ry: 45})
  })
  for (const x of [-2.3, -0.9, 0.9, 2.3]) {
    k.cyl(0.2, 0.25, 3.5, 12, PAL.white, x, 0.7, 3.78, {smooth: true})
    k.box(0.56, 0.16, 0.56, PAL.stoneLight, x, 4.14, 3.78)
    k.box(0.6, 0.2, 0.6, PAL.stoneLight, x, 0.82, 3.78)
  }
  // Perron monumental
  for (let i = 0; i < 4; i++) k.box(8 - i * 0.7, 0.2, 2.6 - i * 0.5, PAL.stoneLight, 0, 0.1 + i * 0.2, 4.0 - i * 0.25, {ch: 0.03})
  b.door(0, 0.8, 3.68, {w: 1.7, h: 2.6, col: '#8c2f2a', steps: 0, lamp: false})
  k.box(2.1, 0.5, 0.08, PAL.brass, 0, 3.72, 3.8)
  // Fenêtres : le bureau de Nico au balcon, éclairé tant que des décisions l'attendent.
  for (const x of [-5.3, -3.6, 3.6, 5.3]) {
    b.win(x, 1.9, 2.55, {w: 1, h: 1.5, tall: false, shutter: PAL.navy, box: true, priority: 1})
    b.win(x, 1.9, -4.15, {w: 1, h: 1.3, ry: 180, priority: 3})
  }
  // Campanile et horloge
  b.wall(2.9, 7.2, 2.9, PAL.cream, 0, 5.2, -2, {base: PAL.stoneLight, baseH: 0.3, ch: 0.06})
  k.box(3.2, 0.2, 3.2, PAL.stoneLight, 0, 12.4, -2, {ch: 0.04})
  for (const [x, z] of [[-1.2, -3.2], [1.2, -3.2], [-1.2, -0.8], [1.2, -0.8]]) k.box(0.36, 2, 0.36, PAL.white, x, 13.5, z)
  k.box(1.2, 1.1, 1.2, '#7a5a2e', 0, 13.1, -2)
  k.lathe([[0.16, 0], [0.4, 0.5], [0.46, 0.8]], 10, PAL.brass, 0, 12.6, -2)
  k.at({at: [0, 14.5, -2]}, () => {
    k.box(3.2, 0.2, 3.2, PAL.stoneLight, 0, 0, 0)
    k.lathe([[2, 0.1], [1.9, 0.5], [1.15, 1.5], [0.42, 2.4], [0.1, 3], [0, 3.2]], 16, PAL.slate, 0, 0, 0)
    k.box(0.05, 1.4, 0.05, PAL.iron, 0, 3.8, 0)
  })
  b.spots.flag = k.xf([0, 18.6, -2])
  for (const s of [1]) {
    k.cyl(1.02, 1.02, 0.12, 24, PAL.brass, 0, 11, -0.5, {rx: 90})
    k.cyl(0.9, 0.9, 0.04, 24, PAL.white, 0, 11, -0.42, {rx: 90})
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.box(0.05, i % 3 ? 0.11 : 0.2, 0.02, PAL.iron, Math.sin(a) * 0.76, 11 + Math.cos(a) * 0.76, -0.4, {rz: -(a * 180) / Math.PI}) }
  }
  b.part('clockHour', [0, 11, -0.34], (p) => p.box(0.1, 0.56, 0.03, PAL.iron, 0, 0.24, 0))
  b.part('clockMinute', [0, 11, -0.31], (p) => p.box(0.07, 0.78, 0.03, PAL.iron, 0, 0.36, 0))
  for (const x of [-3.4, 3.4]) { b.bush(x + (x > 0 ? 1.6 : -1.6), 0, 3.4, 0.7); b.flowerBed(x * 1.5, 4.1, 2.4, 0.9) }
  b.lantern(-3.4, 2.6, 3.8).lantern(3.4, 2.6, 3.8)
  b.ivy(-6.45, 0.4, 0.2, 2, 2.6, {ry: -90})
  b.spots.door = [0, 0, 6]
  return b.finish({w: 13.6, d: 9.6, h: 19, labelY: 13.5, centerZ: 0.2})
}

// ---------------------------------------------------------------- Quartier Formation

function owlTower(accent) {
  const b = new Builder(11, accent), k = b.k
  // Bibliothèque en tour octogonale, chouette perchée au sommet, yeux éclairés la nuit.
  k.lathe([[3.05, 0], [3.05, 0.55]], 8, PAL.stone)
  k.lathe([[2.75, 0.5], [2.65, 5.6], [2.95, 5.75]], 8, PAL.sand)
  for (let i = 0; i < 8; i++) { const a = ((i + 0.5) / 8) * Math.PI * 2; k.box(0.2, 5.1, 0.2, PAL.timber, Math.sin(a) * 2.68, 3.05, Math.cos(a) * 2.68) }
  k.lathe([[3.2, 5.7], [2.9, 6.1], [1.25, 8.8], [0.5, 9.5], [0.12, 10]], 8, PAL.slateDark)
  for (let r = 0; r < 7; r++) {
    const t = r / 7, y = 5.95 + t * 3.1, ra = 3.08 - t * 2.3
    k.lathe([[ra + 0.05, y], [ra - 0.18, y + 0.42]], 8, r % 2 ? PAL.slate : shade(PAL.slate, 0.85))
  }
  b.door(0, 0.2, 2.55, {col: accent})
  b.win(-1.45, 2.4, 2.25, {ry: -32, h: 1.2, w: 0.8, arch: true, priority: 1})
  b.win(1.45, 2.4, 2.25, {ry: 32, h: 1.2, w: 0.8, arch: true, priority: 1})
  b.win(0, 4.25, 2.56, {w: 0.8, h: 1.1, arch: true, priority: 1})
  b.win(-1.9, 4.25, 1.9, {ry: -45, w: 0.8, h: 1.1, priority: 2})
  b.win(1.9, 4.25, 1.9, {ry: 45, w: 0.8, h: 1.1, priority: 2})
  // Chouette
  k.at({at: [0, 10, 0], s: 1.2}, () => {
    k.box(0.08, 0.3, 0.08, PAL.iron, 0, 0.1, 0)
    k.blob(0.55, '#8c6236', 0, 0.75, 0, {sy: 1.15, detail: 2, bump: 0.02, low: '#6b4628', high: '#b98a58'})
    k.blob(0.42, '#a87a48', 0, 1.3, 0.03, {detail: 2, bump: 0.02, low: '#7c5833', high: '#c7a06d'})
    for (const s of [-1, 1]) {
      k.tri([s * 0.2, 1.62, 0], [s * 0.4, 1.95, -0.02], [s * 0.38, 1.55, -0.02], '#6b4628')
      k.tri([s * 0.38, 1.55, -0.02], [s * 0.4, 1.95, -0.02], [s * 0.2, 1.62, 0], '#6b4628')
      k.blob(0.15, PAL.white, s * 0.16, 1.33, 0.34, {detail: 1, sz: 0.5, bump: 0, low: PAL.white})
      k.blob(0.33, '#6b4628', s * 0.5, 0.78, -0.02, {sx: 0.42, sy: 1.1, detail: 1, bump: 0.02})
    }
    k.tri([0, 1.28, 0.42], [-0.05, 1.18, 0.38], [0.05, 1.18, 0.38], PAL.brass)
  })
  for (const s of [-1, 1]) b.bulbs.at({}, (q) => q.blob(0.085, '#ffcc5a', s * 0.2, 10 + 1.58, 0.47, {detail: 1, bump: 0, low: '#ffcc5a'}))
  // Aile basse : salle de lecture
  b.wall(4.4, 2.5, 3.4, PAL.plaster, -3.8, 0, 0.1, {quoins: PAL.timber})
  b.gable(4.4, 3.4, 1.5, -3.8, 2.5, 0.1, {col: PAL.slate, style: 'slate', wallCol: PAL.plaster})
  b.win(-3.8, 1.45, 1.82, {w: 1.1, h: 1.1, shutter: accent, box: true, priority: 1})
  b.chimney(-4.9, 3, -0.5, 1.8, PAL.stone)
  b.sign(1.9, 2.5, 2.1, {side: 1})
  b.ivy(2.4, 0.4, 1.1, 1.5, 2.6, {ry: 70})
  for (const x of [-1, -.2]) b.crate(x * 3.2, 0, 2.9, 0.5, '#8d6a43')
  return b.finish({w: 10, d: 7, h: 12, labelY: 13.2, spot: {bench: [3.7, 2.6], crates: [-3.8, 2.6], block: [2.6, 3.4]}})
}

function schoolHall(accent) {
  const b = new Builder(12, accent), k = b.k
  // Longue halle à colombages, grande cloche, porche en bois : l'école de formation.
  b.wall(10.4, 3.2, 6, PAL.plaster, 0, 0, 0, {baseH: 0.6})
  for (let x = -5; x <= 5; x += 2.5) k.box(0.2, 2.6, 0.1, PAL.timber, x, 1.9, 3.03)
  k.box(10.4, 0.18, 0.1, PAL.timber, 0, 0.72, 3.03); k.box(10.4, 0.2, 0.1, PAL.timber, 0, 3.1, 3.03)
  for (const s of [-1, 1]) for (const x of [-3.75, 3.75]) k.box(0.13, 2.5, 0.08, PAL.timber, x + s * 0.62, 1.9, 3.04, {rz: s * 30})
  b.gable(10.4, 6, 2.5, 0, 3.2, 0, {col: accent, wallCol: PAL.plaster, over: 0.55})
  b.win(-3.75, 1.9, 2.98, {w: 1.2, h: 1.25, shutter: PAL.timberDark, box: true, priority: 1})
  b.win(3.75, 1.9, 2.98, {w: 1.2, h: 1.25, shutter: PAL.timberDark, box: true, priority: 1})
  b.win(-1.6, 1.95, 2.98, {w: 0.8, h: 1.1, priority: 1})
  b.win(1.6, 1.95, 2.98, {w: 0.8, h: 1.1, priority: 1})
  // Lucarnes
  for (const x of [-3, 3]) {
    k.at({at: [x, 4.2, 1.6]}, () => {
      k.box(1.5, 1.2, 1.2, PAL.plaster, 0, 0.3, 0)
      b.gable(1.5, 1.3, 0.75, 0, 0.9, 0, {col: accent, over: 0.15, wallCol: PAL.plaster, ry: 90})
    })
    b.win(x, 4.55, 2.2, {w: 0.72, h: 0.72, priority: 2})
  }
  // Porche et clocher
  k.box(2.9, 0.16, 2, PAL.timber, 0, 2.86, 3.8, {rx: 7})
  for (const x of [-1.25, 1.25]) k.box(0.2, 2.7, 0.2, PAL.timberDark, x, 1.35, 4.55)
  b.door(0, 0, 2.98, {w: 1.5, col: PAL.timberDark, lamp: false, steps: 2})
  k.box(1.6, 1.8, 1.6, PAL.plaster, 0, 5.9, 0, {ch: 0.04})
  k.box(1.85, 0.12, 1.85, PAL.timberDark, 0, 6.85, 0)
  k.lathe([[1.15, 6.85], [0.25, 8.2], [0.05, 8.5]], 4, accent, 0, 0, 0, {ry: 45})
  k.cyl(0.24, 0.4, 0.5, 10, PAL.brass, 0, 5.6, 0.84, {cap: false})
  b.lantern(-1.25, 2.3, 4.7)
  b.chimney(3.6, 4.1, -1, 1.8)
  b.sign(5.2, 2.5, 2.8, {side: 1})
  b.bush(-5.8, 0, 3.2, 0.7); b.flowerBed(-3.7, 3.7, 2.2, 0.7); b.flowerBed(3.7, 3.7, 2.2, 0.7)
  return b.finish({w: 11.4, d: 7.2, h: 9, labelY: 9.6, spot: {bench: [4.5, 4.6], crates: [-5.4, 4.5], block: [-2.4, 4.8]}})
}

function barn(accent) {
  const b = new Builder(13, accent), k = b.k
  // Grange de coopérative : toit à la Mansart, double porte, silo et bottes de foin.
  const red = mixColor(accent, '#a0522d', 0.35)
  b.wall(7.4, 3, 6, PAL.timberLight, 0, 0, 0, {base: PAL.stoneDark, baseH: 0.45})
  for (let x = -3.6; x <= 3.6; x += 0.6) k.box(0.05, 2.6, 0.04, shade(PAL.timberLight, 0.72), x, 1.75, 3.02)
  k.at({at: [0, 3, 0]}, () => {
    const W = 8.2
    const profile = [[3.25, 0], [2.3, 1.45], [0, 2.5]]
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
      const [z0, y0] = profile[i], [z1, y1] = profile[i + 1]
      k.poly([[-W / 2, y0, s * z0], [W / 2, y0, s * z0], [W / 2, y1, s * z1], [-W / 2, y1, s * z1]], i ? shade(PAL.thatch, 1) : shade(PAL.thatch, 0.88), [0, 0, 0])
      const rows = 5
      for (let r = 0; r < rows; r++) {
        const t = r / rows, z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t
        k.box(W + 0.05, 0.1, 0.1, mixColor(PAL.thatch, '#8f7238', 0.4 + (r % 2) * 0.3), 0, y + 0.03, s * z)
      }
    }
    for (const s of [-1, 1]) k.poly([[s * 3.7, 0, -3], [s * 3.7, 0, 3], [s * 3.7, 1.45, 2.1], [s * 3.7, 2.45, 0], [s * 3.7, 1.45, -2.1]], PAL.timberLight, [0, 1, 0])
    k.box(W, 0.16, 0.24, PAL.timberDark, 0, 2.5, 0)
    k.box(1.2, 0.9, 0.2, PAL.timberDark, 0, 1.2, 2.44)
  })
  b.win(0, 4.2, 2.5, {w: 0.8, h: 0.75, frame: PAL.plank, priority: 1})
  // Portes de grange en X
  k.box(3, 2.7, 0.1, red, 0, 1.35, 3.04)
  for (const s of [-1, 1]) {
    k.box(1.45, 2.6, 0.06, red, s * 0.75, 1.35, 3.1)
    k.box(1.7, 0.08, 0.05, PAL.white, s * 0.75, 1.35, 3.14, {rz: 61 * s})
    k.box(1.7, 0.08, 0.05, PAL.white, s * 0.75, 1.35, 3.14, {rz: -61 * s})
    k.box(1.4, 0.08, 0.05, PAL.white, s * 0.75, 2.62, 3.14); k.box(1.4, 0.08, 0.05, PAL.white, s * 0.75, 0.1, 3.14)
  }
  b.spots.door = k.xf([0, 0, 3.8])
  b.win(-2.75, 1.7, 3, {w: 0.8, h: 0.8, frame: PAL.plank, priority: 1})
  b.win(2.75, 1.7, 3, {w: 0.8, h: 0.8, frame: PAL.plank, priority: 1})
  b.win(3.72, 1.7, 0.8, {ry: 90, w: 0.8, h: 0.8, frame: PAL.plank, priority: 2})
  b.win(3.72, 1.7, -1.2, {ry: 90, w: 0.8, h: 0.8, frame: PAL.plank, priority: 2})
  // Silo
  k.lathe([[1.15, 0], [1.15, 5.2], [1.05, 5.7], [0.55, 6.4], [0, 6.6]], 14, (i) => (i < 1 ? '#bfbfb8' : PAL.copper), -5, 0, -1)
  for (let y = 0.8; y < 5.2; y += 0.9) k.cyl(1.18, 1.18, 0.06, 14, PAL.iron, -5, y, -1, {cap: false, smooth: true})
  // Foin et sacs
  for (const [x, z, ry] of [[4.6, 3, 10], [5.2, 1.4, 70]]) k.cyl(0.62, 0.62, 1.1, 12, '#d9b65c', x, 0.62, z, {rz: 90, ry, base: true})
  b.chimney(2.5, 4.5, -1.5, 1.3, PAL.stone)
  b.barrel(-3, 0, 3.8); b.barrel(-3.7, 0, 3.4)
  b.sign(3.7, 2.45, 2.85, {side: 1})
  return b.finish({w: 11, d: 7, h: 7, labelY: 7.4, spot: {bench: [3.4, 4.6], crates: [-4.4, 3.6], block: [-1.9, 4.8]}})
}

// ---------------------------------------------------------------- NGMI

function observatory(accent) {
  const b = new Builder(14, accent), k = b.k
  // Tour ronde et coupole qui tourne quand NGMI est au travail : le point haut du village.
  k.lathe([[3.7, 0], [3.7, 0.7], [3.35, 0.8]], 18, PAL.stone)
  k.lathe([[3.3, 0.8], [3.15, 4.8], [3.5, 5], [3.55, 5.35]], 18, (i) => (i > 0 ? PAL.lilac : '#ddd0ec'))
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.box(0.14, 0.26, 0.14, PAL.stoneLight, Math.sin(a) * 3.45, 5.5, Math.cos(a) * 3.45) }
  k.cyl(3.52, 3.52, 0.06, 18, PAL.stoneLight, 0, 5.62, 0)
  b.door(0, 0.2, 3.2, {col: accent, w: 1.3})
  for (const [a, lvl] of [[-52, 2.4], [52, 2.4], [-22, 4], [22, 4]]) {
    const r = (a * Math.PI) / 180
    b.win(Math.sin(r) * 3.22, lvl, Math.cos(r) * 3.22, {ry: a, w: 0.75, h: 1.2, arch: true, frame: '#e6daf2', priority: Math.abs(a) > 30 ? 1 : 1})
  }
  // Studio bas et moderne
  b.wall(4.8, 2.6, 3.8, '#ddd0ec', 4.4, 0, 0.8, {base: PAL.stoneDark, baseH: 0.4})
  k.box(5.3, 0.22, 4.3, accent, 4.4, 2.7, 0.8, {ch: 0.05})
  b.win(4.4, 1.5, 2.72, {w: 2.4, h: 1.4, frame: accent, priority: 1})
  b.win(6.82, 1.5, 0.8, {ry: 90, w: 1.2, h: 1.2, frame: accent, priority: 2})
  b.part('dome', [0, 5.65, 0], (p) => {
    p.lathe([[3.1, 0], [3, 0.75], [2.45, 1.85], [1.4, 2.75], [0, 3.1]], 18, accent)
    for (let i = 0; i < 18; i += 2) { const a = (i / 18) * 360; p.at({ry: a}, () => { p.lathe([[3.14, 0.02], [3.14, 0.1]], 3, PAL.brass) }) }
    p.cyl(3.15, 3.15, 0.14, 18, PAL.brass, 0, 0, 0, {cap: false, smooth: true})
    // Fente et lunette
    p.at({rx: -44, at: [0, 0.55, 0]}, () => {
      p.box(0.95, 0.2, 3.4, '#2a1d3f', 0, 2.42, 0.1)
      p.cyl(0.26, 0.34, 3.2, 10, PAL.brass, 0, 0.75, 0, {smooth: true})
      p.cyl(0.36, 0.36, 0.3, 10, PAL.iron, 0, 3.8, 0, {smooth: true})
    })
  })
  b.spots.chimney = k.xf([5.8, 3.3, 0])
  k.cyl(0.14, 0.18, 0.5, 7, PAL.iron, 5.8, 2.8, 0, {smooth: true})
  // Bosquet : lanternes violettes
  b.lantern(-2.1, 2, 2.9)
  b.sign(-3.2, 2.5, 1.2, {side: -1})
  b.flowerBed(-2.5, 3.9, 2, 0.8); b.flowerBed(4.4, 3.5, 3.6, 0.7)
  return b.finish({w: 11.5, d: 8, h: 10, labelY: 10.6, spot: {bench: [3.4, 4.8], crates: [-4.2, 3.6], block: [-2, 5]}, centerX: 1.7})
}

// ---------------------------------------------------------------- Médias & commerce

function studio(accent) {
  const b = new Builder(15, accent), k = b.k
  // Petit cinéma Art déco : façade à gradins, marquise à ampoules, grand bouton lecture.
  b.wall(8, 4.7, 6.2, PAL.ochre, 0, 0, -0.6, {base: PAL.brickDark, baseH: 0.6})
  k.box(8.3, 0.2, 6.5, PAL.brick, 0, 4.8, -0.6)
  // Façade à redans
  k.box(8.5, 5.3, 0.6, PAL.cream, 0, 2.65, 2.5, {ch: 0.04})
  k.box(6, 1.2, 0.6, PAL.cream, 0, 5.8, 2.5, {ch: 0.04})
  k.box(3.2, 1, 0.6, PAL.cream, 0, 6.9, 2.5, {ch: 0.04})
  k.box(8.6, 0.16, 0.7, accent, 0, 5.2, 2.5); k.box(6.1, 0.16, 0.7, accent, 0, 6.35, 2.5); k.box(3.3, 0.16, 0.7, accent, 0, 7.4, 2.5)
  // Bouton lecture géant
  k.at({at: [0, 5.75, 2.85]}, () => {
    k.box(2.5, 1.6, 0.14, accent, 0, 0, 0, {ch: 0.18})
    k.tri([-0.42, -0.5, 0.09], [0.6, 0, 0.09], [-0.42, 0.5, 0.09], PAL.white)
  })
  // Marquise
  k.box(5.2, 0.5, 1.9, PAL.iron, 0, 3.15, 3.5, {ch: 0.05})
  k.box(5.3, 0.1, 2, accent, 0, 3.42, 3.5)
  for (let i = 0; i < 12; i++) {
    const x = -2.4 + (i * 4.8) / 11
    b.bulbs.blob(0.07, '#ffe8a8', x, 2.98, 4.46, {detail: 0, flat: true, bump: 0, low: '#ffe8a8'})
    if (i % 2 === 0) b.bulbs.blob(0.07, '#ffe8a8', x, 3.3, 4.47, {detail: 0, flat: true, bump: 0, low: '#ffe8a8'})
  }
  ;(b.spots.lights ||= []).push(k.xf([0, 3, 4.5]))
  b.door(0, 0, 2.82, {col: accent, w: 1.7, h: 2.4, arch: false, lamp: false})
  for (const s of [-1, 1]) {
    k.box(1.1, 1.6, 0.1, PAL.iron, s * 2.6, 1.6, 2.84)
    k.box(0.95, 1.44, 0.08, s < 0 ? '#e9c46a' : '#f28d6b', s * 2.6, 1.6, 2.88)
    k.box(0.55, 0.6, 0.04, shade(accent, 1.1), s * 2.6, 1.75, 2.93)
  }
  b.win(-2.9, 4.4, 2.82, {w: 1, h: 0.9, frame: accent, priority: 1})
  b.win(2.9, 4.4, 2.82, {w: 1, h: 0.9, frame: accent, priority: 1})
  b.win(-1.1, 4.4, 2.82, {w: 0.7, h: 0.7, frame: accent, priority: 1})
  b.win(1.1, 4.4, 2.82, {w: 0.7, h: 0.7, frame: accent, priority: 1})
  // Antenne : son voyant clignote quand on tourne
  k.box(0.1, 3.4, 0.1, PAL.iron, 3, 6.5, -2.2)
  for (let i = 0; i < 4; i++) k.box(1.2 - i * 0.24, 0.05, 0.05, PAL.iron, 3, 6.3 + i * 0.7, -2.2, {ry: 25})
  k.cyl(0.8, 0.14, 0.42, 12, '#d5d5d0', -2.6, 5, -2.4, {rx: -35, base: true})
  b.spots.beacon = k.xf([3, 8.3, -2.2])
  b.spots.chimney = k.xf([1, 5.6, -2])
  k.cyl(0.24, 0.3, 0.7, 8, PAL.iron, 1, 4.9, -2, {smooth: true})
  // Projecteur et caisse
  b.crate(-3.8, 0, 3.6); b.crate(-4.2, 0, 3.2, 0.42, '#8d6a43')
  k.cyl(0.04, 0.05, 1.1, 5, PAL.iron, 3.8, 0, 3.5); k.box(0.42, 0.34, 0.6, PAL.iron, 3.8, 1.3, 3.5, {rx: -14})
  return b.finish({w: 8.8, d: 8, h: 8.5, labelY: 9, spot: {bench: [3, 5], crates: [-4.6, 4], block: [-1.6, 5]}})
}

function market(accent) {
  const b = new Builder(16, accent), k = b.k
  // Marché couvert : halle ouverte sur poteaux, étals colorés, cageots de fruits.
  b.wall(8.6, 0.4, 6.6, PAL.stoneLight, 0, 0, 0, {base: null})
  for (let x = -3.9; x <= 3.9; x += 2.6) for (const z of [-2.9, 2.9]) {
    k.box(0.32, 3.1, 0.32, PAL.timber, x, 1.95, z, {ch: 0.03})
    k.at({at: [x, 3.2, z]}, () => { k.box(0.1, 0.9, 0.1, PAL.timber, 0.34, 0, 0, {rz: 45}); k.box(0.1, 0.9, 0.1, PAL.timber, -0.34, 0, 0, {rz: -45}) })
  }
  k.box(9, 0.26, 7, PAL.timberDark, 0, 3.6, 0)
  b.gable(9, 7, 2.5, 0, 3.72, 0, {col: PAL.terracotta, wallCol: PAL.plaster, over: 0.65})
  // Petit lanterneau
  k.box(2.4, 1, 2.2, PAL.plaster, 0, 6.3, 0)
  b.gable(2.4, 2.2, 0.8, 0, 6.8, 0, {col: PAL.terracotta, over: 0.25})
  b.win(0, 6.3, 1.1, {w: 1.1, h: 0.56, priority: 2})
  // Mur du fond avec fenêtres et atelier
  b.wall(8.2, 3, 0.4, PAL.plaster, 0, 0.3, -2.7, {base: null})
  b.win(-2.6, 2, -2.48, {w: 1.1, h: 1, priority: 1})
  b.win(2.6, 2, -2.48, {w: 1.1, h: 1, priority: 1})
  b.win(0, 2, -2.48, {w: 1.1, h: 1, priority: 1})
  // Étals
  const stalls = [[-2.7, 0.6, '#e4572e'], [0, 1.6, '#e9b949'], [2.7, 0.6, '#6ea644']]
  for (const [x, z, col] of stalls) {
    k.box(2.1, 0.86, 1.2, PAL.plank, x, 0.83, z, {ch: 0.03})
    k.box(2.2, 0.08, 1.3, PAL.timberLight, x, 1.28, z)
    for (let i = 0; i < 10; i++) k.blob(0.13, i % 3 ? col : shade(col, 1.2), x - 0.8 + (i % 5) * 0.4, 1.42, z - 0.25 + Math.floor(i / 5) * 0.5, {detail: 0, flat: true, bump: 0, low: shade(col, 0.8)})
    b.awning(x, 3.2, z - 0.1, 2.1, {col: accent, depth: 1.1})
  }
  for (const [x, z] of [[-5, 2.8], [-5.2, 1.6], [5, 3.2]]) b.crate(x, 0, z, 0.62, '#b48a5a')
  for (const [x, z, col] of [[-5, 2.8, '#e4572e'], [-5.2, 1.6, '#6ea644'], [5, 3.2, '#e9b949']]) for (let i = 0; i < 5; i++) k.blob(0.12, col, x - 0.15 + (i % 2) * 0.3, 0.68, z - 0.16 + i * 0.08, {detail: 0, flat: true, bump: 0})
  b.spots.door = k.xf([0, 0, 4.2])
  b.spots.chimney = k.xf([3.4, 6.8, -1])
  k.cyl(0.2, 0.26, 1.2, 8, PAL.iron, 3.4, 5.7, -1, {smooth: true})
  b.sign(4.3, 2.5, 3.1, {side: 1})
  b.lantern(-1.3, 2.85, 2.95); b.lantern(1.3, 2.85, 2.95)
  return b.finish({w: 9.6, d: 7.4, h: 8, labelY: 8.8, spot: {bench: [3.8, 5], crates: [-3.6, 4.6], block: [-1.2, 5]}})
}

// ---------------------------------------------------------------- Le Port

function postOffice(accent) {
  const b = new Builder(17, accent), k = b.k
  // Poste du bord de mer : bois peint en bleu, pigeonnier, boîte aux lettres, sacs devant la porte.
  b.wall(7.6, 3.1, 5.2, PAL.white, 0, 0, 0, {base: PAL.stone, baseH: 0.55})
  for (let y = 0.9; y < 3; y += 0.3) { k.box(7.64, 0.03, 0.02, shade(PAL.white, 0.82), 0, y, 2.61); k.box(0.02, 0.03, 5.24, shade(PAL.white, 0.82), 3.81, y, 0); k.box(0.02, 0.03, 5.24, shade(PAL.white, 0.82), -3.81, y, 0) }
  k.box(8, 0.5, 0.2, accent, 0, 3.05, 2.68, {ch: 0.03})
  b.gable(7.6, 5.2, 2.1, 0, 3.15, 0, {col: PAL.blue, wallCol: PAL.white, style: 'slate', trim: PAL.navy})
  b.door(0, 0, 2.58, {col: accent, w: 1.3})
  b.win(-2.4, 1.85, 2.58, {w: 1.1, h: 1.2, shutter: accent, box: true, priority: 1})
  b.win(2.4, 1.85, 2.58, {w: 1.1, h: 1.2, shutter: accent, box: true, priority: 1})
  b.win(-3.82, 1.85, 0.8, {ry: -90, w: 1, h: 1.1, shutter: accent, priority: 1})
  b.win(-3.82, 1.85, -1.2, {ry: -90, w: 1, h: 1.1, shutter: accent, priority: 2})
  b.win(0, 4.3, 2.52, {w: 0.72, h: 0.72, arch: true, priority: 2})
  // Pigeonnier sur le toit
  k.at({at: [2.4, 4, -0.4]}, () => {
    k.box(1.5, 1.4, 1.5, PAL.cream, 0, 0.7, 0, {ch: 0.03})
    for (const x of [-0.4, 0, 0.4]) for (const y of [0.5, 0.95]) k.box(0.22, 0.26, 0.04, PAL.timberDark, x, y, 0.76)
    k.lathe([[1.15, 1.4], [0.1, 2.2]], 4, PAL.blue, 0, 0, 0, {ry: 45})
  })
  b.spots.chimney = k.xf([-2.4, 5.8, -0.8])
  b.chimney(-2.4, 4, -0.8, 1.5, PAL.stone)
  // Boîte aux lettres géante
  k.at({at: [2.9, 0, 3.6]}, () => {
    k.box(0.14, 0.9, 0.14, PAL.iron, 0, 0.45, 0)
    k.box(0.75, 0.68, 0.6, '#e6b81f', 0, 1.2, 0, {ch: 0.06})
    k.cyl(0.3, 0.3, 0.75, 10, '#e6b81f', 0, 1.54, 0, {rz: 90, base: true})
    k.box(0.5, 0.05, 0.03, PAL.iron, 0, 1.3, 0.31)
  })
  for (const [x, z, r] of [[-1.5, 3.4, 0.36], [-2, 3.1, 0.3], [-1.75, 3.05, 0.26]]) k.blob(r, '#b8a27a', x, r * 0.78, z, {sy: 0.9, detail: 1, bump: 0.05})
  b.sign(3.8, 2.4, 2.45, {side: 1})
  return b.finish({w: 8.8, d: 6.6, h: 8, labelY: 8, spot: {bench: [3.8, 4.4], crates: [-3.4, 3.6], block: [1.2, 4.8]}})
}

// ---------------------------------------------------------------- Forum

function pavilion(accent) {
  const b = new Builder(18, accent), k = b.k
  // Grand chapiteau de conférences, bandes de toile, scène et bancs : deux salles, BNI et Sainte-Hélène.
  const R = 5.4
  k.lathe([[R + 0.5, 0], [R + 0.5, 0.22], [R, 0.3]], 20, PAL.stoneLight)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    k.cyl(0.11, 0.14, 3, 8, PAL.timberLight, Math.sin(a) * R, 0.25, Math.cos(a) * R, {smooth: true})
  }
  // Toile rayée
  const seg = 24
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
    const c = i % 2 ? accent : PAL.white
    const P = (r, y, a) => [Math.sin(a) * r, y, Math.cos(a) * r]
    const am = (a0 + a1) / 2
    k.poly([P(R + 0.55, 3.1, a0), P(R + 0.55, 3.1, a1), P(2.5, 4.9, a1), P(2.5, 4.9, a0)], c)
    k.poly([P(2.5, 4.9, a0), P(2.5, 4.9, a1), P(0, 6.8, am)], c)
    k.tri(P(R + 0.55, 3.1, a0), P(R + 0.62, 2.7, am), P(R + 0.55, 3.1, a1), c)
    k.tri(P(R + 0.55, 3.1, a1), P(R + 0.62, 2.7, am), P(R + 0.55, 3.1, a0), c)
  }
  k.box(0.1, 1.6, 0.1, PAL.iron, 0, 7.4, 0)
  b.spots.flag = k.xf([0, 8.3, 0])
  // Scène au fond
  k.box(6.4, 0.6, 2.6, PAL.timber, 0, 0.55, -3.2, {ch: 0.04})
  k.box(5, 2.5, 0.16, PAL.navy, 0, 2.1, -4.2)
  k.box(4.4, 1.5, 0.08, PAL.cream, 0, 2.25, -4.1)
  for (const s of [-1, 1]) k.box(0.2, 1.4, 0.2, PAL.iron, s * 2.9, 1.4, -3.5)
  k.cyl(0.08, 0.12, 0.9, 6, PAL.iron, 0.8, 0.85, -2.6); k.box(0.42, 0.3, 0.34, PAL.timberDark, 0.8, 1.86, -2.6)
  // Rangées de bancs
  for (let r = 0; r < 3; r++) for (const s of [-1, 1]) {
    k.box(2.4, 0.1, 0.5, PAL.plank, s * 1.7, 0.72, -0.9 + r * 1.25)
    k.box(2.3, 0.45, 0.1, PAL.timber, s * 1.7, 1.0, -0.65 + r * 1.25)
    for (const e of [-1, 1]) k.box(0.1, 0.42, 0.42, PAL.timberDark, s * 1.7 + e, 0.48, -0.9 + r * 1.25)
  }
  // Écrans : un par salle (les fenêtres-tâches du chapiteau)
  b.win(-1.6, 2.3, -4.08, {w: 1.6, h: 1, frame: PAL.iron, priority: 1})
  b.win(1.6, 2.3, -4.08, {w: 1.6, h: 1, frame: PAL.iron, priority: 1})
  for (const a of [40, -40, 75, -75]) {
    const r = (a * Math.PI) / 180
    k.at({at: [Math.sin(r) * (R + 0.15), 0, Math.cos(r) * (R + 0.15)], ry: a}, () => { b.lantern(0, 2.3, 0.1) })
  }
  b.spots.door = k.xf([0, 0, 6.4])
  b.spots.chimney = null
  for (const [a, col] of [[-30, accent], [30, PAL.white]]) {
    const r = (a * Math.PI) / 180
    k.at({at: [Math.sin(r) * 7, 0, Math.cos(r) * 7], ry: a}, () => {
      k.box(0.1, 3.2, 0.1, PAL.iron, 0, 1.6, 0)
      k.box(0.76, 1.3, 0.04, col, 0.42, 2.5, 0)
    })
  }
  return b.finish({w: 11.4, d: 11.4, h: 8, labelY: 8.6, spot: {bench: [3.8, 7.4], crates: [-4.2, 7], block: [-1.6, 7.4]}})
}

// ---------------------------------------------------------------- Le Campus

function campusBase(b, w, d, h, wallCol, accent, opts = {}) {
  b.wall(w, h, d, wallCol, 0, 0, 0, {base: opts.base || PAL.stone, baseH: 0.55, quoins: opts.quoins})
  const k = b.k
  k.box(w + 0.22, 0.2, d + 0.22, opts.band || PAL.stoneLight, 0, h / 2, 0, {ch: 0.03})
  b.bush(-w / 2 - 0.4, 0, d / 2 - 0.2, 0.55, '#5f8f4a')
  b.bush(w / 2 + 0.4, 0, d / 2 - 0.2, 0.55, '#5f8f4a')
}

function domeCollege(accent) {
  const b = new Builder(19, accent), k = b.k
  // ISME : collège néoclassique, coupole vitrée dans une aile.
  campusBase(b, 8.2, 5.6, 5, PAL.cream, accent, {quoins: PAL.stoneLight})
  k.box(8.5, 0.28, 5.9, accent, 0, 5.1, 0, {ch: 0.04})
  b.gable(8.2, 5.6, 1.5, 0, 5.2, 0, {col: PAL.navy, wallCol: PAL.cream, style: 'slate', trim: PAL.navy})
  // Portique
  for (const x of [-1.5, -0.5, 0.5, 1.5]) k.cyl(0.13, 0.17, 3.1, 10, PAL.white, x, 0.5, 3.3, {smooth: true})
  k.box(3.8, 0.3, 1.1, PAL.white, 0, 3.7, 3.25, {ch: 0.03})
  k.poly([[-1.95, 3.85, 3.8], [1.95, 3.85, 3.8], [0, 4.7, 3.8]], PAL.white)
  for (let i = 0; i < 3; i++) k.box(5 - i * 0.5, 0.17, 2 - i * 0.4, PAL.stoneLight, 0, 0.085 + i * 0.17, 3.3 - i * 0.1)
  b.door(0, 0.5, 2.82, {col: accent, steps: 0, w: 1.2, lamp: false})
  for (const x of [-3, 3]) {
    b.win(x, 1.75, 2.8, {w: 1, h: 1.45, arch: true, priority: 1})
    b.win(x, 3.85, 2.8, {w: 1, h: 1.15, priority: 1})
  }
  // Aile à coupole vitrée
  k.lathe([[2.5, 0], [2.4, 3.5], [2.55, 3.65]], 16, PAL.stoneLight, 5.8, 0, -0.5)
  k.lathe([[2.25, 3.65], [2.05, 4.75], [1.3, 5.7], [0, 6.2]], 16, (i) => '#9ec4d9', 5.8, 0, -0.5)
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 360; k.at({at: [5.8, 0, -0.5], ry: a}, () => { k.at({at: [0, 3.65, 2.28], rx: 22}, () => k.box(0.06, 1.2, 0.06, PAL.navy, 0, 0.55, 0)); k.at({at: [0, 4.78, 1.68], rx: 56}, () => k.box(0.06, 1.1, 0.06, PAL.navy, 0, 0.5, 0)) }) }
  k.cyl(2.3, 2.3, 0.06, 16, PAL.navy, 5.8, 4.75, -0.5, {cap: false, smooth: true})
  b.win(4.6, 1.8, 1.72, {ry: 25, w: 0.9, h: 1.4, arch: true, priority: 2})
  b.win(7, 1.8, 1.45, {ry: 40, w: 0.9, h: 1.4, arch: true, priority: 2})
  b.chimney(-2.6, 5.6, -1, 1.5, PAL.brick)
  return b.finish({w: 13, d: 7.2, h: 8, labelY: 8.6, logoAt: [0, 5.15, 3.84], spot: {bench: [-3.4, 4.8], crates: [3.6, 4], block: [-1.7, 5.2]}, centerX: 1.4})
}

function copperHall(accent) {
  const b = new Builder(20, accent), k = b.k
  // Excelia : grande halle au toit de cuivre vert-de-gris.
  campusBase(b, 9, 6, 4.4, '#e3c9a2', accent, {base: PAL.brickDark, band: PAL.brick})
  for (let x = -4.5; x <= 4.5; x += 1.5) k.box(0.32, 4.2, 0.2, PAL.brick, x, 2.25, 3.02)
  b.gable(9, 6, 3, 0, 4.4, 0, {col: PAL.copper, wallCol: '#e3c9a2', style: 'copper', trim: PAL.copperDark, over: 0.5})
  for (const x of [-3, -1.5, 1.5, 3]) {
    b.win(x * 1, 1.7, 2.98, {w: 0.92, h: 1.5, arch: true, priority: 1})
    b.win(x * 1, 3.5, 2.98, {w: 0.92, h: 0.8, priority: 2})
  }
  b.door(0, 0, 2.98, {col: PAL.copperDark, w: 1.3})
  k.at({at: [0, 7.3, 0]}, () => {
    k.box(1.4, 1.1, 1.4, PAL.copperDark, 0, 0.3, 0)
    k.lathe([[1, 0.85], [0.15, 2]], 4, PAL.copper, 0, 0, 0, {ry: 45})
  })
  b.chimney(3, 5.8, -1, 1.4, PAL.brick)
  return b.finish({w: 10, d: 7, h: 9.5, labelY: 9.6, logoAt: [0, 4.65, 2.85], spot: {bench: [3.4, 4.6], crates: [-4, 4], block: [-1.7, 5]}})
}

function twinTowers(accent) {
  const b = new Builder(21, accent), k = b.k
  // IAE : façade de pierre encadrée de deux tourelles aux toits pointus.
  campusBase(b, 7.2, 5.2, 4.6, PAL.stoneLight, accent, {base: PAL.stoneDark})
  b.gable(7.2, 5.2, 1.9, 0, 4.6, 0, {col: PAL.slate, wallCol: PAL.stoneLight, style: 'slate', trim: accent})
  k.box(7.4, 0.2, 0.1, accent, 0, 4.55, 2.66)
  for (const x of [-4.1, 4.1]) {
    k.lathe([[1.5, 0], [1.4, 0.55], [1.28, 0.65], [1.25, 6.2], [1.5, 6.4], [1.55, 6.8]], 12, PAL.stoneLight, x, 0, 1.5)
    k.lathe([[1.68, 6.8], [0.2, 10]], 12, accent, x, 0, 1.5)
    k.box(0.06, 0.8, 0.06, PAL.brass, x, 10.2, 1.5)
    const fx = x > 0 ? 0.5 : -0.5
    b.win(x - fx * 1.2, 2, 2.65, {w: 0.65, h: 1.15, arch: true, priority: 2})
    b.win(x - fx * 1.2, 4.3, 2.65, {w: 0.65, h: 1.15, arch: true, priority: 2})
  }
  b.door(0, 0, 2.58, {col: accent, w: 1.4})
  b.win(-1.6, 1.8, 2.58, {w: 0.9, h: 1.4, arch: true, priority: 1})
  b.win(1.6, 1.8, 2.58, {w: 0.9, h: 1.4, arch: true, priority: 1})
  b.win(0, 3.65, 2.58, {w: 1.8, h: 0.9, arch: true, priority: 1})
  b.chimney(1.4, 5.4, -1, 1.4, PAL.stoneDark)
  return b.finish({w: 11.6, d: 6.8, h: 10.5, labelY: 11, logoAt: [0, 5.2, 2.62], spot: {bench: [3, 4.6], crates: [-3.2, 4.6], block: [-1.6, 5]}})
}

function sawtoothLab(accent) {
  const b = new Builder(22, accent), k = b.k
  // Efrei : laboratoire en brique au toit en dents de scie, grande verrière d'ingénieurs.
  campusBase(b, 8.8, 5.6, 3.7, PAL.brick, accent, {base: PAL.brickDark, band: PAL.white})
  const teeth = 4, tw = 8.8 / teeth
  for (let i = 0; i < teeth; i++) {
    const x = -4.4 + i * tw
    k.poly([[x, 3.7, 2.8], [x + tw, 3.7, 2.8], [x + tw, 5.2, 2.8]], PAL.brick)
    k.poly([[x, 3.7, -2.8], [x + tw, 5.2, -2.8], [x + tw, 3.7, -2.8]], PAL.brick)
    k.poly([[x, 3.7, 2.8], [x + tw, 5.2, 2.8], [x + tw, 5.2, -2.8], [x, 3.7, -2.8]], PAL.slateDark)
    k.poly([[x + tw, 5.2, -2.8], [x + tw, 5.2, 2.8], [x + tw, 3.7, 2.8], [x + tw, 3.7, -2.8]], '#9ec4d9')
    k.box(0.08, 1.5, 5.6, PAL.iron, x + tw, 4.45, 0)
  }
  // Verrière et béton
  k.box(4.6, 2.7, 0.12, PAL.iron, -1.4, 2.05, 2.84)
  for (const x of [-2.9, -1.4, 0.1]) b.win(x, 2.05, 2.82, {w: 1.32, h: 2.4, frame: PAL.iron, priority: 1})
  b.door(2.9, 0, 2.8, {col: accent, arch: false, w: 1.3})
  k.box(2.6, 0.14, 1.3, PAL.iron, 2.9, 2.7, 3.45)
  b.win(-4.42, 2.1, 0.9, {ry: -90, w: 1.2, h: 1.3, frame: PAL.iron, priority: 2})
  b.win(-4.42, 2.1, -1, {ry: -90, w: 1.2, h: 1.3, frame: PAL.iron, priority: 2})
  k.cyl(0.42, 0.5, 4, 12, PAL.brickDark, 3.6, 3.7, -1.8, {smooth: true})
  b.spots.chimney = k.xf([3.6, 7.8, -1.8])
  return b.finish({w: 10, d: 7, h: 7.5, labelY: 7.8, logoAt: [-1.4, 3.8, 2.85], spot: {bench: [3.6, 4.8], crates: [-3.8, 4.2], block: [1, 5]}})
}

function roundHall(accent) {
  const b = new Builder(23, accent), k = b.k
  // ECE : rotonde pour un pavillon d'apprentissage, anneau de colonnes et toit conique bleu.
  const R = 4.1
  k.lathe([[R + 1.1, 0], [R + 1.1, 0.3], [R + 0.3, 0.42]], 24, PAL.stoneLight)
  k.lathe([[R, 0.4], [R, 4]], 24, PAL.cream)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    k.cyl(0.13, 0.16, 3.55, 8, PAL.white, Math.sin(a) * (R + 0.75), 0.4, Math.cos(a) * (R + 0.75), {smooth: true})
  }
  k.lathe([[R + 1.1, 3.95], [R + 1.1, 4.2], [R, 4.32]], 24, PAL.white)
  k.lathe([[R + 1.25, 4.2], [R * 0.72, 5.8], [1, 7.2], [0, 7.6]], 24, accent)
  for (let i = 0; i < 16; i += 1) { const a = (i / 16) * 360; k.at({ry: a}, () => k.at({at: [0, 4.3, R + 1.05], rx: -41}, () => k.box(0.05, 0.05, 4.8, shade(accent, 1.22), 0, 0, -2.3))) }
  k.lathe([[0.5, 6.8], [0.5, 7.4], [0.62, 7.5], [0, 8.1]], 10, PAL.white)
  b.door(0, 0.4, R - 0.02, {col: accent, lamp: false, steps: 0})
  for (const a of [-55, -30, 30, 55]) {
    const r = (a * Math.PI) / 180
    b.win(Math.sin(r) * (R + 0.02), 2.1, Math.cos(r) * (R + 0.02), {ry: a, w: 0.85, h: 1.7, arch: true, priority: Math.abs(a) < 40 ? 1 : 2})
  }
  b.spots.chimney = k.xf([1.5, 6.6, 0])
  k.cyl(0.16, 0.2, 0.9, 7, PAL.iron, 1.5, 5.8, 0, {smooth: true})
  return b.finish({w: 10.6, d: 10.6, h: 8.2, labelY: 8.8, logoAt: [0, 3.62, R + 1.1], spot: {bench: [3.4, 5.5], crates: [-4, 5], block: [-1.7, 5.6]}})
}

// ---------------------------------------------------------------- Les Jardins

function cottageBody(b, accent, w, d, wallCol, roof) {
  b.wall(w, 2.7, d, wallCol, 0, 0, 0, {baseH: 0.45})
  b.gable(w, d, 2, 0, 2.7, 0, roof)
}

function nursery(accent) {
  const b = new Builder(24, accent), k = b.k
  // Bébé : maisonnette arrondie, toit en coquille rose, étoiles sur les volets, poussette et fil à linge.
  cottageBody(b, accent, 5.8, 4.6, '#fbeee0', {col: PAL.pink, wallCol: '#fbeee0', trim: '#c97e91'})
  k.at({at: [0, 0, 2.3]}, () => { k.lathe([[1.28, 0], [1.26, 2.6], [1.12, 3.2], [0.6, 3.75], [0, 3.95]], 12, '#fbeee0', 0, 0, -0.2) })
  b.door(0, 0, 2.95, {col: accent, w: 1.1})
  b.win(-2, 1.55, 2.3, {w: 0.85, h: 0.95, shutter: '#cfe6f2', box: true, arch: true, priority: 1})
  b.win(2, 1.55, 2.3, {w: 0.85, h: 0.95, shutter: '#cfe6f2', box: true, arch: true, priority: 1})
  b.win(0, 3.1, 3.06, {w: 0.6, h: 0.6, arch: true, priority: 2})
  b.win(2.92, 1.55, 0, {ry: 90, w: 0.85, h: 0.95, priority: 2})
  b.chimney(-1.6, 3.2, -0.8, 1.5, '#d98f7d')
  // Fil à linge
  k.box(0.08, 1.8, 0.08, PAL.timberLight, -4.1, 0.9, 2.2); k.box(0.08, 1.8, 0.08, PAL.timberLight, -4.1, 0.9, -1.8)
  k.box(0.02, 0.02, 4, PAL.white, -4.1, 1.74, 0.2)
  for (const [z, col] of [[1.5, '#a9d7e8'], [0.6, '#f7c6d0'], [-0.3, '#fff0b8'], [-1.1, '#c9e8bd']]) { k.box(0.04, 0.42, 0.46, col, -4.1, 1.5, z); k.box(0.04, 0.12, 0.72, col, -4.1, 1.66, z) }
  // Poussette
  k.at({at: [3.2, 0, 3.7], ry: -24, s: 0.82}, () => {
    k.blob(0.48, accent, 0, 0.82, 0, {sx: 1.05, sy: 0.72, detail: 1, bump: 0})
    k.lathe([[0.46, 0], [0.42, 0.22], [0, 0.46]], 10, PAL.white, 0, 0.92, -0.08)
    for (const [x, z] of [[-0.34, -0.3], [0.34, -0.3], [-0.34, 0.3], [0.34, 0.3]]) { k.cyl(0.11, 0.11, 0.04, 8, PAL.iron, x, 0.11, z, {rz: 90, base: true}); k.box(0.03, 0.5, 0.03, PAL.iron, x * 0.7, 0.34, z * 0.8) }
    k.box(0.5, 0.04, 0.04, PAL.iron, 0, 1.18, 0.66); k.box(0.03, 0.03, 0.42, PAL.iron, 0.24, 1.04, 0.48, {rx: 30}); k.box(0.03, 0.03, 0.42, PAL.iron, -0.24, 1.04, 0.48, {rx: 30})
  })
  b.flowerBed(-2.2, 3.5, 1.8, 0.7)
  b.fence(-4.5, 4.2, -1.1, 4.2, {col: PAL.white}); b.fence(1.1, 4.2, 2.2, 4.2, {col: PAL.white})
  return b.finish({w: 8.8, d: 6.4, h: 6, labelY: 7.4, spot: {bench: [4, 2.8], crates: [-2.2, 5], block: [-1.2, 5.2]}, centerX: -0.8})
}

function familyHome(accent) {
  const b = new Builder(25, accent), k = b.k
  // Famille : grande maison à véranda, deux pignons, balançoire dans le jardin.
  cottageBody(b, accent, 7.4, 5, PAL.plaster, {col: PAL.terracotta, wallCol: PAL.plaster})
  k.at({at: [2, 0, 1]}, () => {
    b.wall(3.4, 2.7, 4, PAL.plaster, 0, 0, 0, {baseH: 0.45})
    b.gable(3.4, 4, 1.8, 0, 2.7, 0, {col: PAL.terracotta, wallCol: PAL.plaster, ry: 90, over: 0.32})
  })
  b.win(2, 1.6, 3.02, {w: 1.25, h: 1.2, shutter: '#4e7c5a', box: true, priority: 1})
  b.win(2, 3.4, 3, {w: 0.7, h: 0.72, arch: true, priority: 2})
  b.win(-3, 1.65, 2.52, {w: 0.95, h: 1.15, shutter: '#4e7c5a', box: true, priority: 1})
  b.win(-3.72, 1.65, 0, {ry: -90, w: 0.95, h: 1.15, shutter: '#4e7c5a', priority: 2})
  b.door(-0.8, 0.2, 2.52, {col: accent, w: 1.15, steps: 1, lamp: false})
  // Véranda
  k.box(4.4, 0.2, 1.8, PAL.plank, -1.7, 0.1, 3.4)
  k.box(4.5, 0.12, 1.9, PAL.timberDark, -1.7, 2.6, 3.4, {rx: 6})
  for (const x of [-3.8, -2.4, -0.1]) k.box(0.13, 2.4, 0.13, PAL.white, x, 1.35, 4.2)
  for (let x = -3.7; x <= -2.5; x += 0.2) k.box(0.05, 0.6, 0.05, PAL.white, x, 0.5, 4.2)
  k.box(1.45, 0.06, 0.08, PAL.white, -3.1, 0.8, 4.2)
  // Banc suspendu et lanterne
  k.box(1, 0.08, 0.4, PAL.timberLight, -3.1, 0.75, 3)
  b.lantern(-2.4, 2.1, 4.1)
  b.chimney(-2.2, 3.4, -1, 1.9)
  // Balançoire
  k.at({at: [-5.6, 0, 3.4], ry: 15}, () => {
    for (const s of [-1, 1]) { k.box(0.12, 2.5, 0.12, PAL.timber, s * 0.92, 1.2, -0.4, {rx: 14}); k.box(0.12, 2.5, 0.12, PAL.timber, s * 0.92, 1.2, 0.4, {rx: -14}) }
    k.box(2, 0.12, 0.12, PAL.timber, 0, 2.42, 0)
    k.box(0.03, 1.7, 0.03, PAL.iron, -0.24, 1.56, 0); k.box(0.03, 1.7, 0.03, PAL.iron, 0.24, 1.56, 0)
    k.box(0.6, 0.05, 0.22, PAL.red, 0, 0.72, 0)
  })
  b.bush(3.9, 0, 3.4, 0.7); b.flowerBed(1.9, 3.5, 3, 0.7)
  return b.finish({w: 10, d: 7, h: 6.5, labelY: 6.7, spot: {bench: [3.8, 5], crates: [-3.8, 5], block: [-0.8, 5.2]}})
}

function notary(accent) {
  const b = new Builder(26, accent), k = b.k
  // Papiers : maison étroite et tenue, briques et volets verts, boîte de classement sous l'auvent.
  b.wall(5.2, 3.8, 4.4, PAL.brick, 0, 0, 0, {base: PAL.stoneDark, baseH: 0.42, quoins: PAL.cream})
  b.gable(5.2, 4.4, 2.3, 0, 3.8, 0, {col: PAL.slate, style: 'slate', wallCol: PAL.brick})
  b.door(0, 0, 2.18, {col: accent, w: 1.1})
  for (const x of [-1.6, 1.6]) {
    b.win(x, 1.6, 2.18, {w: 0.82, h: 1.1, shutter: '#4e7c5a', priority: 1})
    b.win(x, 3.1, 2.18, {w: 0.82, h: 0.9, shutter: '#4e7c5a', priority: 2})
  }
  b.win(0, 3.1, 2.18, {w: 0.82, h: 0.9, box: true, priority: 1})
  b.win(0, 4.7, 2.18, {w: 0.6, h: 0.6, arch: true, priority: 2})
  b.chimney(1.6, 4.5, -1, 1.5, PAL.brickDark)
  b.awning(-3.4, 2.3, 1, 1.4, {col: '#4e7c5a', ry: -90, depth: 0.7})
  for (let i = 0; i < 3; i++) k.box(0.7, 0.4, 0.5, ['#ddd0ec', '#c9dde8', '#f4dcae'][i], -3.1, 0.22 + i * 0.42, 0.9, {ch: 0.02})
  b.fence(-3.4, 3.3, -1.1, 3.3, {col: PAL.iron, h: 0.7, every: 0.5}); b.fence(1.1, 3.3, 3.4, 3.3, {col: PAL.iron, h: 0.7, every: 0.5})
  b.bush(2.8, 0, 2.6, 0.45); b.bush(-2.2, 0, 2.7, 0.4)
  return b.finish({w: 7, d: 5.8, h: 7, labelY: 7.2, spot: {bench: [3.6, 3.6], crates: [-3.2, 4], block: [-1, 4.4]}})
}

// ---------------------------------------------------------------- Parcelles libres : un cottage teinté par l'univers

function cottage(accent, seed = 27) {
  const b = new Builder(seed, accent), k = b.k
  const variant = seed % 3
  const roofCol = mixColor(accent, PAL.terracotta, 0.24)
  cottageBody(b, accent, 5.4, 4.2, [PAL.plaster, PAL.sand, PAL.cream][variant], {col: roofCol, wallCol: [PAL.plaster, PAL.sand, PAL.cream][variant], style: variant === 2 ? 'slate' : 'tile'})
  b.door(0, 0, 2.08, {col: accent, w: 1.1})
  b.win(-1.75, 1.6, 2.08, {w: 0.95, h: 1.05, shutter: accent, box: true, priority: 1})
  b.win(1.75, 1.6, 2.08, {w: 0.95, h: 1.05, shutter: accent, box: true, priority: 1})
  b.win(0, 3.5, 2.08, {w: 0.6, h: 0.6, arch: true, priority: 2})
  b.win(2.72, 1.6, 0, {ry: 90, w: 0.95, h: 1.05, priority: 2})
  b.win(-2.72, 1.6, 0, {ry: -90, w: 0.95, h: 1.05, priority: 2})
  b.chimney(1.5, 3.2, -0.8, 1.5)
  b.sign(2.7, 2.4, 1.9, {side: 1})
  b.bush(-3.1, 0, 1.8, 0.6)
  if (variant === 1) { b.barrel(3.2, 0, 2.6); b.crate(3.4, 0, 1.6, 0.5) } else b.flowerBed(2.1, 2.9, 1.4, 0.6)
  return b.finish({w: 6.6, d: 5, h: 6.4, labelY: 6.8, spot: {bench: [3.4, 3.4], crates: [-3, 3.4], block: [-1, 4.2]}})
}

const ARCHETYPES = {owlTower, schoolHall, barn, observatory, studio, market, postOffice, pavilion, domeCollege, copperHall, twinTowers, sawtoothLab, roundHall, nursery, familyHome, notary}

export function buildArchetype(type, accent = '#c9633f', id = '') {
  const make = ARCHETYPES[type]
  if (make) return make(accent)
  return cottage(accent, 27 + (hashString(id) % 9))
}

/** Dimensions et emplacements seuls : le décor doit s'écarter des parcelles avant même que les maisons existent. */
export function archetypeSpec(type, id = '') {
  dryRun = true
  try { return buildArchetype(type, '#c9633f', id) } finally { dryRun = false }
}

export const ARCHETYPE_IDS = [...Object.keys(ARCHETYPES), 'cottage']
