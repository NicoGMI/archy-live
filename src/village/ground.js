// Le sol est peint comme une carte de livre d'images : une seule grande texture contient l'herbe,
// les chemins, les pavés et les ombres de contact. Les chemins sont donc toujours raccordés.
import {DISTRICTS, OFFICE, PLAZA, ISLAND} from './plan.js'
import {fbm, shoreDistance, smoothstep} from './terrain.js'

const parse = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const GRASS_A = parse('#7ba24e'), GRASS_B = parse('#9ab45a'), GRASS_C = parse('#5f8c49'), HILL = parse('#6f9550')
const SAND = parse('#ecd8a6'), WET_SAND = parse('#c4ad7e'), ROCK = parse('#a3968a'), BANK = parse('#857c58')

function seededRandom(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function paintGround(plan, terrain, lots, {size = 2048, detail = 1} = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const world = terrain.size, half = terrain.half
  const toPx = (v) => ((v + half) / world) * size
  const pxPerM = size / world
  const R = seededRandom(19)

  // 1. Fond calculé pixel par pixel en basse résolution : teintes de quartiers, sable, roche.
  const low = Math.round(720 * Math.max(0.7, detail))
  const lowCanvas = document.createElement('canvas')
  lowCanvas.width = lowCanvas.height = low
  const lowCtx = lowCanvas.getContext('2d')
  const img = lowCtx.createImageData(low, low)
  const districts = Object.values(DISTRICTS).map((d) => ({...d, col: parse(d.ground)}))
  for (let j = 0; j < low; j++) for (let i = 0; i < low; i++) {
    const x = -half + ((i + 0.5) / low) * world, z = -half + ((j + 0.5) / low) * world
    const n = fbm(x * 0.07 + 3, z * 0.07 + 9, 4), n2 = fbm(x * 0.4, z * 0.4, 2)
    let c = n < 0.5 ? mix3(GRASS_C, GRASS_A, smoothstep(0.28, 0.5, n)) : mix3(GRASS_A, GRASS_B, smoothstep(0.5, 0.72, n))
    for (const d of districts) {
      const dist = Math.hypot(x - d.c[0], z - d.c[1]) + (n - 0.5) * 14
      const k = smoothstep(d.radius + 8, d.radius - 3, dist)
      if (k > 0) c = mix3(c, d.col, k * 0.72)
    }
    const h = terrain.groundY(x, z)
    if (h > 1.2) c = mix3(c, HILL, smoothstep(1.2, 5, h) * 0.8)
    const sd = shoreDistance(x, z)
    if (sd < 7) c = mix3(c, SAND, smoothstep(7, 2.2, sd + (n - 0.5) * 7))
    if (h < -0.25) c = mix3(c, WET_SAND, smoothstep(-0.25, -0.55, h))
    if (h > 1.5 && sd < 8) c = mix3(c, ROCK, smoothstep(8, 3, sd) * smoothstep(1.5, 2.5, h))
    const rd = terrain.riverDistance(x, z)
    if (rd < 4.2) c = mix3(c, BANK, smoothstep(4.2, 2.1, rd) * 0.75)
    const v = 0.97 + (n2 - 0.5) * 0.14
    const o = (j * low + i) * 4
    img.data[o] = c[0] * v; img.data[o + 1] = c[1] * v; img.data[o + 2] = c[2] * v; img.data[o + 3] = 255
  }
  lowCtx.putImageData(img, 0, 0)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(lowCanvas, 0, 0, size, size)

  // 2. Touches d'herbe : c'est ce grain qui donne le rendu gouache.
  const dabs = Math.round(size * size * 0.016 * detail)
  const dabColors = ['rgba(186,207,108,.28)', 'rgba(64,108,58,.2)', 'rgba(226,226,132,.16)', 'rgba(92,140,70,.24)']
  for (let i = 0; i < dabs; i++) {
    const x = R() * size, y = R() * size, s = (0.6 + R() * 2.2) * (pxPerM / 7)
    ctx.fillStyle = dabColors[i & 3]
    ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s * 0.7, R() * 3, 0, 6.3); ctx.fill()
  }

  const strokePath = (path, width, style, closed) => {
    ctx.beginPath()
    path.forEach((p, i) => (i ? ctx.lineTo(toPx(p[0]), toPx(p[1])) : ctx.moveTo(toPx(p[0]), toPx(p[1]))))
    if (closed) ctx.closePath()
    ctx.lineWidth = width * pxPerM
    ctx.lineCap = ctx.lineJoin = 'round'
    ctx.strokeStyle = style
    ctx.stroke()
  }

  // 3. Lignes de tonte de la pelouse du campus, enclos fleuris des jardins.
  ctx.save()
  const quad = plan.roads.find((r) => r.id === 'quad')
  if (quad) {
    ctx.beginPath()
    quad.path.forEach((p, i) => (i ? ctx.lineTo(toPx(p[0]), toPx(p[1])) : ctx.moveTo(toPx(p[0]), toPx(p[1]))))
    ctx.closePath()
    ctx.fillStyle = '#8fb25a'
    ctx.fill()
    ctx.clip()
    for (let i = -60; i < 60; i += 2.4) {
      ctx.fillStyle = i % 4.8 === 0 ? 'rgba(255,255,190,.13)' : 'rgba(40,90,40,.08)'
      ctx.save(); ctx.translate(toPx(-41), toPx(-2)); ctx.rotate(0.3); ctx.fillRect(-size, i * pxPerM, size * 2, 1.2 * pxPerM); ctx.restore()
    }
  }
  ctx.restore()

  // 4. Ombres de contact sous les bâtiments.
  for (const lot of Object.values(lots)) {
    const rx = (lot.spec?.w ?? 8) * 0.68, rz = (lot.spec?.d ?? 6) * 0.68
    ctx.save()
    ctx.translate(toPx(lot.x), toPx(lot.z)); ctx.rotate(-(lot.ry * Math.PI) / 180)
    const scale = Math.max(rx, rz) * pxPerM
    const g = ctx.createRadialGradient(0, 0, scale * 0.45, 0, 0, scale)
    g.addColorStop(0, 'rgba(52,44,28,.55)'); g.addColorStop(0.7, 'rgba(52,44,28,.28)'); g.addColorStop(1, 'rgba(52,44,28,0)')
    ctx.scale(rx / Math.max(rx, rz), rz / Math.max(rx, rz))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(0, 0, scale, 0, 6.3); ctx.fill()
    ctx.restore()
  }

  // 5. Chemins : bord piétiné, terre battue, ornière claire, cailloux.
  const dirt = {path: ['#ba9a68', '#d9bf8e', '#e4cfa3'], lane: ['#b29364', '#d4b888', '#e2cc9e'], street: ['#ad8d60', '#d0b284', '#dfc899'], cobble: ['#9b9182', '#c5baa5', '#d2c8b4']}
  const order = {path: 0, lane: 1, cobble: 2, street: 3}
  const roads = [...plan.roads].sort((a, b) => order[a.kind] - order[b.kind])
  for (const r of roads) strokePath(r.path, r.w + 1.05, 'rgba(92,92,48,.22)', r.closed)
  for (const r of roads) strokePath(r.path, r.w + 0.42, dirt[r.kind][0], r.closed)
  for (const r of roads) strokePath(r.path, r.w, dirt[r.kind][1], r.closed)
  for (const r of roads) strokePath(r.path, r.w * 0.5, dirt[r.kind][2] + '88', r.closed)
  for (const r of plan.roads) {
    const pebble = (r.kind === 'street' || r.kind === 'cobble')
    const stones = pebble ? 5 : 2
    for (let i = 1; i < r.path.length; i++) {
      const a = r.path[i - 1], b = r.path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1])
      const nx = -(b[1] - a[1]) / (l || 1), nz = (b[0] - a[0]) / (l || 1)
      const count = Math.round(l * stones * (pebble ? 1.3 : 1))
      for (let j = 0; j < count; j++) {
        const t = R(), off = (R() - 0.5) * r.w * 0.98
        const x = a[0] + (b[0] - a[0]) * t + nx * off, z = a[1] + (b[1] - a[1]) * t + nz * off
        const s = (pebble ? 0.14 + R() * 0.15 : 0.05 + R() * 0.07) * pxPerM
        const light = 48 + R() * 28
        ctx.fillStyle = r.kind === 'cobble' ? `hsl(36,${10 + R() * 8}%,${light + 12}%)` : `hsl(34,${18 + R() * 16}%,${light + 8}%)`
        ctx.beginPath(); ctx.ellipse(toPx(x), toPx(z), s * 1.3, s * 0.85, R() * 3, 0, 6.3); ctx.fill()
        if (pebble && R() < 0.5) { ctx.strokeStyle = 'rgba(90,70,48,.4)'; ctx.lineWidth = Math.max(0.5, pxPerM * 0.02); ctx.stroke() }
      }
    }
  }

  // 6. La place : anneaux de pavés rayonnants et rose des vents au centre.
  const cx = toPx(PLAZA.x), cy = toPx(PLAZA.z), rp = PLAZA.r * pxPerM
  const shadow = ctx.createRadialGradient(cx, cy, rp * 0.9, cx, cy, rp * 1.18)
  shadow.addColorStop(0, 'rgba(70,60,36,.4)'); shadow.addColorStop(1, 'rgba(70,60,36,0)')
  ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(cx, cy, rp * 1.18, 0, 6.3); ctx.fill()
  ctx.fillStyle = '#cdbfa4'; ctx.beginPath(); ctx.arc(cx, cy, rp, 0, 6.3); ctx.fill()
  const stoneW = 0.56 * pxPerM
  for (let ring = 0; ring * stoneW < rp - stoneW * 0.6; ring++) {
    const r0 = rp - ring * stoneW - stoneW / 2
    const n = Math.max(6, Math.round((r0 * 6.283) / (stoneW * 1.5)))
    for (let i = 0; i < n; i++) {
      const a = ((i + (ring % 2) * 0.5) / n) * Math.PI * 2 + R() * 0.012
      const hue = 33 + R() * 9, sat = 14 + R() * 12, li = 62 + R() * 15 + (ring % 4 === 0 ? -9 : 0)
      ctx.save(); ctx.translate(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.rotate(a + Math.PI / 2)
      ctx.fillStyle = `hsl(${hue},${sat}%,${li}%)`
      ctx.beginPath(); ctx.roundRect(-stoneW * 0.72, -stoneW * 0.42, stoneW * 1.44, stoneW * 0.84, stoneW * 0.14); ctx.fill()
      ctx.restore()
    }
  }
  // Rose des vents en pierres sombres, visible depuis la vue d'ensemble.
  ctx.save(); ctx.translate(cx, cy)
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.rotate((i * Math.PI) / 4)
    const big = i % 2 === 0, L = (big ? 6.3 : 4.6) * pxPerM, W = (big ? 0.9 : 0.6) * pxPerM
    ctx.fillStyle = big ? 'rgba(135,74,50,.86)' : 'rgba(158,122,76,.82)'
    ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(W, 0); ctx.lineTo(0, W * 0.4); ctx.closePath(); ctx.fill()
    ctx.fillStyle = big ? 'rgba(196,128,88,.9)' : 'rgba(205,172,116,.86)'
    ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(-W, 0); ctx.lineTo(0, W * 0.4); ctx.closePath(); ctx.fill()
    ctx.restore()
  }
  ctx.restore()
  ctx.strokeStyle = 'rgba(115,82,54,.65)'; ctx.lineWidth = 0.22 * pxPerM
  ctx.beginPath(); ctx.arc(cx, cy, rp - 0.1 * pxPerM, 0, 6.3); ctx.stroke()

  // 7. Parvis du bureau du boss, tapis rouge vers la file d'attente.
  const ox = toPx(OFFICE.x), oz = toPx(OFFICE.z)
  ctx.fillStyle = '#d1c4a9'
  ctx.beginPath(); ctx.roundRect(ox - 6 * pxPerM, oz + 5 * pxPerM, 12 * pxPerM, 4.8 * pxPerM, 1.2 * pxPerM); ctx.fill()
  ctx.fillStyle = '#a93f33'
  ctx.fillRect(ox - 0.9 * pxPerM, oz + 7.1 * pxPerM, 1.8 * pxPerM, 3.4 * pxPerM)
  ctx.fillStyle = '#d9b463'
  ctx.fillRect(ox - 0.9 * pxPerM, oz + 7.1 * pxPerM, 0.13 * pxPerM, 3.4 * pxPerM)
  ctx.fillRect(ox + 0.77 * pxPerM, oz + 7.1 * pxPerM, 0.13 * pxPerM, 3.4 * pxPerM)

  // 8. Fleurs des champs : dans les jardins surtout, quelques touches ailleurs.
  const FLOWERS = ['#f4f0dc', '#f6d765', '#ef8ea4', '#c7a4e6', '#f3a35e']
  const patch = (x, z, r, count, palette = FLOWERS) => {
    for (let i = 0; i < count; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * r
      const fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d
      if (terrain.clearance(fx, fz) < 0.8) continue
      ctx.fillStyle = palette[Math.floor(R() * palette.length)]
      ctx.beginPath(); ctx.arc(toPx(fx), toPx(fz), (0.06 + R() * 0.06) * pxPerM, 0, 6.3); ctx.fill()
    }
  }
  patch(-1, 36, 12, 340); patch(-22, 26, 7, 120); patch(14, 34, 7, 120); patch(-10, 12, 3.4, 40); patch(13, 7, 3, 40)
  patch(-41, -2, 5, 60, ['#f4f0dc', '#f6d765']); patch(20, -3, 4, 30); patch(-19, -14, 4, 24, ['#f4f0dc', '#c7a4e6'])
  patch(14, -28, 5, 60, ['#c7a4e6', '#a78bd1', '#f4f0dc']); patch(30, -7, 5, 60, ['#f3a35e', '#f6d765'])
  patch(32, 15, 5, 40); patch(-24, -40, 7, 40, ['#f4f0dc', '#f6d765'])

  return canvas
}

/** Maillage indexé du relief, teinté en altitude pour les falaises, découpé sous la mer. */
export function terrainArrays(terrain) {
  const {n, cell, half, data} = terrain
  const positions = new Float32Array(n * n * 3), normals = new Float32Array(n * n * 3), uvs = new Float32Array(n * n * 2), colors = new Float32Array(n * n * 4)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const o = j * n + i, x = -half + i * cell, z = -half + j * cell, h = data[o]
    positions[o * 3] = x; positions[o * 3 + 1] = h; positions[o * 3 + 2] = z
    const hL = data[j * n + Math.max(0, i - 1)], hR = data[j * n + Math.min(n - 1, i + 1)], hD = data[Math.max(0, j - 1) * n + i], hU = data[Math.min(n - 1, j + 1) * n + i]
    const nx = hL - hR, nz = hD - hU, ny = 2 * cell, l = Math.hypot(nx, ny, nz)
    normals[o * 3] = nx / l; normals[o * 3 + 1] = ny / l; normals[o * 3 + 2] = nz / l
    uvs[o * 2] = (x + half) / terrain.size; uvs[o * 2 + 1] = (z + half) / terrain.size
    // Strates de roche sur les pentes raides, le reste vient de la texture peinte.
    const steep = 1 - ny / l
    const rock = Math.min(1, Math.max(0, (steep - 0.2) / 0.24))
    const band = 0.84 + 0.16 * Math.sin(h * 5.5 + Math.sin(x * 0.2) * 1.6)
    const R0 = 1 + (0.42 * band - 1) * rock, G0 = 1 + (0.37 * band - 1) * rock, B0 = 1 + (0.32 * band - 1) * rock
    colors[o * 4] = R0; colors[o * 4 + 1] = G0; colors[o * 4 + 2] = B0; colors[o * 4 + 3] = 1
  }
  const indices = []
  const sea = ISLAND.sea - 1.2
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1
    if (data[a] < sea && data[b] < sea && data[c] < sea && data[d] < sea) continue
    indices.push(a, c, b, b, c, d)
  }
  return {positions, normals, uvs, colors, indices: new Uint32Array(indices)}
}

/** Texture de hauteur du fond marin : le shader de la mer en déduit bancs de sable et écume. */
export function shoreTexturePixels(terrain, size = 256) {
  const pixels = new Uint8Array(size * size * 4)
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = -terrain.half + ((i + 0.5) / size) * terrain.size, z = -terrain.half + ((j + 0.5) / size) * terrain.size
    const h = terrain.groundY(x, z)
    const v = Math.max(0, Math.min(255, ((h + 6) / 8) * 255))
    const o = (j * size + i) * 4
    pixels[o] = v; pixels[o + 1] = v; pixels[o + 2] = v; pixels[o + 3] = 255
  }
  return pixels
}

