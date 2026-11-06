// Maison de poupée : à la sélection, le bâtiment s'ouvre comme un livre pop-up et montre ses pièces.
// Une pièce par type de travail (ou par tâche), meublée selon le statut. Une pièce vide existe déjà
// avant de recevoir sa première tâche : on voit la place qui l'attend.
import {Kit, shade, mixColor} from './meshkit.js'
import {PAL} from './buildings.js'
import {ORD} from '../shared.jsx'
import {groupedRooms} from '../rooms.js'

export const RW = 3.6, RH = 2.7, RD = 3.1, SLAB = 0.2

const WALLS = {
  active: ['#f7d9a6', '#efc384'], blocked: ['#e7a79a', '#d98a7c'], waiting: ['#f6e3ae', '#ecd08a'],
  scheduled: ['#c8dcf1', '#a9c7e6'], queued: ['#d9d6cf', '#c9c5bb'], done: ['#cfe7c4', '#b5d8a8'], empty: ['#e8dfd0', '#dcd2c0'],
}

function desk(k, x, z, screen, bulbs) {
  k.box(1.5, 0.08, 0.72, PAL.timberLight, x, 0.78, z, {ch: 0.02})
  for (const s of [-1, 1]) k.box(0.08, 0.76, 0.66, PAL.timber, x + s * 0.68, 0.39, z)
  k.box(0.56, 0.36, 0.04, PAL.iron, x + 0.18, 1.12, z - 0.2)
  k.box(0.06, 0.16, 0.06, PAL.iron, x + 0.18, 0.88, z - 0.2)
  k.box(0.46, 0.02, 0.2, '#d9d4c5', x + 0.18, 0.83, z + 0.08)
  k.box(0.34, 0.03, 0.26, PAL.white, x - 0.42, 0.835, z + 0.02, {ry: 9})
  k.box(0.3, 0.03, 0.24, '#f4dcae', x - 0.44, 0.86, z + 0.04, {ry: -6})
  k.cyl(0.05, 0.04, 0.1, 8, PAL.red, x + 0.6, 0.82, z + 0.12, {smooth: true})
  bulbs.box(0.48, 0.28, 0.02, screen, x + 0.18, 1.12, z - 0.17)
}

function chair(k, x, z, col = PAL.red) {
  k.box(0.5, 0.08, 0.46, col, x, 0.5, z, {ch: 0.02})
  k.box(0.5, 0.56, 0.08, col, x, 0.8, z + 0.2, {ch: 0.02})
  k.box(0.06, 0.46, 0.06, PAL.iron, x, 0.24, z)
  k.box(0.46, 0.04, 0.06, PAL.iron, x, 0.04, z); k.box(0.06, 0.04, 0.46, PAL.iron, x, 0.04, z)
}

function shelf(k, x, z, ry = 0) {
  k.at({at: [x, 0, z], ry}, () => {
    k.box(1.3, 1.9, 0.34, PAL.timber, 0, 0.95, 0)
    k.box(1.18, 1.76, 0.1, PAL.timberDark, 0, 0.95, 0.13)
    const cols = ['#c0392b', '#2e86c1', '#d4ac0d', '#27ae60', '#8e44ad', '#e67e22']
    for (let r = 0; r < 4; r++) {
      k.box(1.2, 0.04, 0.3, PAL.timberLight, 0, 0.14 + r * 0.44, 0.03)
      let px = -0.52
      while (px < 0.5) {
        const w = 0.07 + k.random() * 0.07, h = 0.24 + k.random() * 0.1
        k.box(w, h, 0.2, cols[Math.floor(k.random() * cols.length)], px + w / 2, 0.16 + r * 0.44 + h / 2, 0.05, {rz: (k.random() - 0.5) * 6})
        px += w + 0.018
      }
    }
  })
}

function plant(k, x, z, s = 1) {
  k.at({at: [x, 0, z], s}, () => {
    k.lathe([[0.15, 0], [0.21, 0.34], [0.23, 0.38]], 10, PAL.terracotta)
    k.blob(0.34, '#6a9c4f', 0, 0.68, 0, {detail: 1, bump: 0.2, low: '#3f6c3c', high: '#90b860'})
    k.blob(0.22, '#7dac58', 0.16, 0.92, 0.05, {detail: 1, bump: 0.2, low: '#3f6c3c', high: '#a5c76a'})
  })
}

function sofa(k, x, z) {
  k.box(1.5, 0.3, 0.7, '#6e87ad', x, 0.3, z, {ch: 0.06})
  k.box(1.5, 0.56, 0.18, '#5d7498', x, 0.66, z - 0.3, {ch: 0.06})
  for (const s of [-1, 1]) k.box(0.2, 0.42, 0.72, '#5d7498', x + s * 0.75, 0.42, z, {ch: 0.06})
}

function crate(k, x, y, z, s = 0.56) {
  k.box(s, s, s, PAL.plank, x, y + s / 2, z, {ch: 0.02, ry: k.random() * 22 - 11})
  k.box(s + 0.01, 0.05, s + 0.01, shade(PAL.plank, 0.74), x, y + s * 0.8, z)
  k.box(s + 0.01, 0.05, s + 0.01, shade(PAL.plank, 0.74), x, y + s * 0.2, z)
}

/** Une pièce, ouverte vers l'avant. */
export function roomKits(room, accent, kind) {
  const k = new Kit({seed: room.seed || 9, ao: false})
  const bulbs = new Kit({seed: 2, ao: false, jitter: 0})
  const status = room.empty ? 'empty' : room.status
  const [w0, w1] = WALLS[status] || WALLS.empty
  const hw = RW / 2, hd = RD / 2
  // Murs à rayures de papier peint
  k.box(RW, RH, 0.12, w0, 0, RH / 2, -hd, {})
  for (let x = -hw + 0.3; x < hw; x += 0.6) k.box(0.3, RH - 0.25, 0.02, w1, x, RH / 2 + 0.05, -hd + 0.07)
  for (const s of [-1, 1]) {
    k.box(0.12, RH, RD, shade(w0, 0.92), s * hw, RH / 2, 0)
    k.box(0.04, RH - 0.25, RD - 0.15, shade(w1, 0.9), s * (hw - 0.07), RH / 2 + 0.05, 0)
  }
  // Parquet à lames et plinthes
  k.box(RW, 0.08, RD, '#a87a4d', 0, 0.04, 0)
  for (let z = -hd + 0.17; z < hd; z += 0.34) k.box(RW - 0.1, 0.012, 0.32, (Math.round(z * 10) % 2) ? '#b58758' : '#a0744a', 0, 0.086, z)
  k.box(RW, 0.14, 0.03, PAL.white, 0, 0.16, -hd + 0.08)
  for (const s of [-1, 1]) k.box(0.03, 0.14, RD, PAL.white, s * (hw - 0.09), 0.16, 0)
  // Tapis
  const rug = status === 'blocked' ? '#8e3a33' : status === 'done' ? '#4a7f55' : status === 'scheduled' ? '#3b5f9a' : accent
  k.box(2, 0.018, 1.2, shade(rug, 0.9), 0, 0.1, 0.42)
  k.box(1.7, 0.02, 0.96, rug, 0, 0.103, 0.42)
  k.box(1.46, 0.022, 0.76, '#f1d9a0', 0, 0.104, 0.42)
  k.box(1.38, 0.024, 0.68, rug, 0, 0.105, 0.42)
  // Suspension
  k.box(0.02, 0.5, 0.02, PAL.iron, 0, RH - 0.25, -0.1)
  k.lathe([[0.3, RH - 0.62], [0.1, RH - 0.46], [0, RH - 0.44]], 10, PAL.timberDark, 0, 0, -0.1)
  const lamp = {active: '#ffe0a0', blocked: '#ff8a7a', waiting: '#ffd38a', scheduled: '#cfe6ff', queued: '#6d6b64', done: '#e6ffd8', empty: '#7e7b73'}[status]
  bulbs.blob(0.12, lamp, 0, RH - 0.66, -0.1, {detail: 1, bump: 0, low: lamp})
  // Fenêtre du fond
  k.box(1.02, 0.82, 0.05, PAL.white, -0.95, 1.62, -hd + 0.08)
  bulbs.box(0.86, 0.66, 0.02, mixColor('#ffd9a0', '#7fb8e8', 0.55), -0.95, 1.62, -hd + 0.11)
  k.box(0.04, 0.68, 0.02, PAL.white, -0.95, 1.62, -hd + 0.13)
  k.box(0.88, 0.04, 0.02, PAL.white, -0.95, 1.62, -hd + 0.13)
  k.box(0.2, 0.86, 0.04, accent, -1.56, 1.62, -hd + 0.09); k.box(0.2, 0.86, 0.04, accent, -0.34, 1.62, -hd + 0.09)

  const workerSpot = {x: 0, z: -0.6, yaw: Math.PI, pose: 'type', show: false}
  switch (status) {
    case 'active':
      desk(k, 0.2, -0.75, '#7dffb0', bulbs); chair(k, 0.2, -0.2)
      shelf(k, hw - 0.3, -0.6, -90); plant(k, -hw + 0.4, 0.95)
      Object.assign(workerSpot, {x: 0.2, z: -0.22, yaw: Math.PI, pose: 'type', show: true})
      break
    case 'blocked':
      desk(k, -0.25, -0.8, '#ff5a4a', bulbs)
      crate(k, hw - 0.55, 0.08, 0.9); crate(k, hw - 0.6, 0.64, 0.9, 0.44); crate(k, hw - 0.5, 0.08, 0.2, 0.46)
      // Cadenas sur le mur : la pièce ne peut pas avancer.
      k.box(0.34, 0.3, 0.08, PAL.brass, 0.95, 1.65, -hd + 0.12, {ch: 0.02})
      k.cyl(0.11, 0.11, 0.16, 8, '#9aa0a6', 0.95, 1.8, -hd + 0.12, {cap: false})
      k.box(0.05, 0.1, 0.02, PAL.iron, 0.95, 1.65, -hd + 0.17)
      Object.assign(workerSpot, {x: 0.5, z: 0.25, yaw: Math.PI, pose: 'blocked', show: true})
      break
    case 'waiting':
      sofa(k, 0.25, -0.85); plant(k, hw - 0.42, 0.95)
      k.box(0.8, 0.06, 0.44, PAL.timberLight, 0.2, 0.32, 0.42); k.box(0.06, 0.28, 0.06, PAL.timber, -0.08, 0.16, 0.42); k.box(0.06, 0.28, 0.06, PAL.timber, 0.48, 0.16, 0.42)
      // Pendule
      k.cyl(0.32, 0.32, 0.05, 16, '#6b4630', 0.95, 1.9, -hd + 0.09, {rx: 90}); k.cyl(0.27, 0.27, 0.06, 16, '#fff8e6', 0.95, 1.9, -hd + 0.1, {rx: 90})
      k.box(0.03, 0.2, 0.02, PAL.iron, 0.95, 2, -hd + 0.15); k.box(0.14, 0.03, 0.02, PAL.iron, 1, 1.9, -hd + 0.15)
      Object.assign(workerSpot, {x: 0.2, z: -0.45, yaw: 0, pose: 'wait', show: true})
      break
    case 'scheduled':
      desk(k, 0.3, -0.8, '#9cc3ff', bulbs); chair(k, 0.3, -0.25, PAL.navy)
      // Calendrier mural
      k.box(0.66, 0.74, 0.03, PAL.white, 0.95, 1.7, -hd + 0.09); k.box(0.66, 0.2, 0.035, PAL.blue, 0.95, 1.97, -hd + 0.09)
      for (let i = 0; i < 12; i++) k.box(0.1, 0.07, 0.01, i === 7 ? PAL.red : '#c0bdb2', 0.72 + (i % 4) * 0.15, 1.78 - Math.floor(i / 4) * 0.13, -hd + 0.11)
      plant(k, -hw + 0.4, 0.9)
      Object.assign(workerSpot, {x: -0.8, z: 0.15, yaw: 0.4, pose: 'watch', show: true})
      break
    case 'queued':
      crate(k, -1.05, 0.08, -0.85); crate(k, -0.4, 0.08, -0.95, 0.62); crate(k, 0.3, 0.08, -0.85); crate(k, -0.7, 0.64, -0.9, 0.46); crate(k, 1.05, 0.08, 0.3, 0.56)
      k.box(1.1, 0.5, 0.74, '#c9c6bc', 0.2, 0.36, 0.45, {ch: 0.1, ry: 12}) // bâche sur un meuble
      break
    case 'done':
      desk(k, -0.3, -0.8, '#a9d8b0', bulbs); chair(k, -0.3, -0.25, '#4a7f55'); shelf(k, hw - 0.3, -0.6, -90); plant(k, -hw + 0.4, 0.95)
      k.at({at: [0.2, 0.83, -0.68]}, () => {
        k.box(0.2, 0.05, 0.16, PAL.timberDark, 0, 0.03, 0)
        k.cyl(0.03, 0.03, 0.12, 6, PAL.brass, 0, 0.05, 0)
        k.lathe([[0.04, 0.17], [0.14, 0.26], [0.14, 0.38]], 10, PAL.brass)
      })
      break
    default: // Pièce vide : mobilier sous les housses, la place est prête.
      desk(k, -0.15, -0.8, '#2b3338', bulbs); chair(k, -0.15, -0.3, '#a59d8e'); shelf(k, -hw + 0.3, -0.6, 90); plant(k, hw - 0.42, 0.95)
  }
  if (kind === 'analytics') {
    [0.35, 0.6, 0.95, 0.72].forEach((h, i) => k.box(0.2, h, 0.14, ['#ff3355', '#ff6677', '#ff99aa', '#ffc2c9'][i], -0.5 + i * 0.32, 1.1 + h / 2, -hd + 0.16))
  }
  if (kind === 'archives' && status !== 'queued') shelf(k, -hw + 0.3, 0.2, 90)
  if (kind === 'prep-cours') {
    k.box(1.3, 0.76, 0.05, '#234a39', 0.5, 1.75, -hd + 0.09)
    k.box(1.36, 0.82, 0.03, PAL.timberLight, 0.5, 1.75, -hd + 0.07)
    for (let i = 0; i < 3; i++) k.box(0.8 - i * 0.2, 0.02, 0.01, PAL.white, 0.4, 1.95 - i * 0.17, -hd + 0.125)
  }
  return {k, bulbs, workerSpot}
}

/** Décrit les pièces d'un univers. Mêmes règles que le dashboard : voir src/rooms.js. */
export function describeRooms(universe, tasks) {
  const groups = groupedRooms(universe, tasks)
  return groups.map((g, i) => {
    const list = [...g.tasks].sort((a, b) => (ORD[a.status] ?? 9) - (ORD[b.status] ?? 9))
    const open = list.filter((t) => t.status !== 'done').length
    return {id: g.id, title: g.title, status: list[0]?.status || 'queued', empty: !list.length, count: list.length, open, tasks: list, seed: i + 3}
  })
}

export function interiorLayout(rooms) {
  const n = rooms.length
  const cols = n <= 3 ? n : n === 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const W = cols * RW, H = rows * (RH + SLAB)
  return {cols, rows, W, H, at: (i) => {
    const r = Math.floor(i / cols), c = i % cols
    return {x: -W / 2 + RW / 2 + c * RW, y: r * (RH + SLAB), r, c}
  }}
}

export function shellKit(layout, roofCol) {
  const k = new Kit({seed: 21, ao: false})
  const {W, H, rows, cols} = layout
  k.box(W + 0.6, 0.32, RD + 0.7, PAL.stone, 0, -0.16, 0.1, {ch: 0.04})
  for (let c = 0; c <= cols; c++) k.box(0.16, H, RD + 0.1, PAL.timber, -W / 2 + c * RW, H / 2, 0)
  for (let r = 1; r < rows; r++) k.box(W + 0.16, SLAB, RD + 0.1, PAL.plaster, 0, r * (RH + SLAB) - SLAB / 2, 0)
  // Toit retiré, posé en l'air : on comprend qu'il vient d'être soulevé.
  const roofY = H + 0.9
  k.at({at: [0, roofY, -0.3], rx: -20}, () => {
    k.box(W + 0.9, 0.16, RD * 0.8, roofCol, 0, 0, 0, {ch: 0.04})
    for (let z = -RD * 0.36; z < RD * 0.4; z += 0.32) k.box(W + 0.94, 0.05, 0.26, shade(roofCol, 0.86 + ((Math.round(z * 10) % 3) * 0.12)), 0, 0.1, z)
  })
  k.box(W, 0.14, RD, PAL.plaster, 0, H, 0)
  return k
}
