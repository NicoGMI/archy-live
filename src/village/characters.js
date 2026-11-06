// Les habitants : personnages chibi articulés. Chaque membre est une entité, mais tous sont regroupés
// en un seul draw call par le BatchManager. Le costume indique le quartier, la couleur indique l'univers.
import {Entity, MeshInstance} from 'playcanvas'
import {Kit, hashString, shade, mixColor} from './meshkit.js'
import {meshFrom} from './render.js'

const SKINS = ['#f6d2ae', '#eebd93', '#d99f72', '#b47d52', '#8e5d3c']
const HAIRS = ['#2e2018', '#4b2f1c', '#7a4a26', '#b98547', '#27242a', '#8a8a8a']

/** Costume d'une tâche : le quartier donne la coupe, l'univers donne la couleur. */
export function styleFor(universe, district) {
  const h = hashString(universe.id + (universe.seedExtra || ''))
  const shirt = universe.color || '#c9633f'
  const skin = SKINS[h % SKINS.length], hair = HAIRS[(h >>> 4) % HAIRS.length]
  const base = {skin, hair, shirt, trim: '#fff4dc', pants: '#3f4a5c', shoes: '#54392a', hat: null, hatCol: null, hairCut: (h >>> 8) % 3}
  switch (district) {
    case 'formation': return {...base, pants: '#5f4a33', hat: 'beanie', hatCol: mixColor(shirt, '#6b4a2e', 0.4), trim: '#efe0c0'}
    case 'etudiant': return {...base, pants: '#2f3a50', hat: 'mortar', hatCol: '#26304a', trim: shirt}
    case 'ngmi': return {...base, pants: '#352b4d', hat: 'hood', hatCol: shade(shirt, 0.82), trim: '#e7dcf7'}
    case 'media': return {...base, pants: '#3b2e2a', hat: 'beret', hatCol: shirt, trim: '#fff0d8', shirt: mixColor(shirt, '#fff4dc', 0.12)}
    case 'admin': return {...base, pants: '#24395a', hat: 'post', hatCol: '#26477a', trim: '#f4d36a'}
    case 'forum': return {...base, pants: '#2c2d33', trim: '#ffffff', hairCut: 1}
    case 'perso': return {...base, pants: '#7c6a58', hairCut: 2, trim: '#fff'}
    default: return base
  }
}

export const NICO = {skin: '#f2c9a0', hair: '#3a281b', shirt: '#8b795e', trim: '#9d2e32', pants: '#5c625e', shoes: '#4b3528', hat: 'flat', hatCol: '#6e5a42', hairCut: 0, tie: '#3e8bdb'}

// Maillages partagés par costume, rattachés au périphérique graphique : quitter le village
// pour le dashboard détruit le moteur, ces maillages ne doivent pas lui survivre.
const deviceCaches = new WeakMap()
const cachesFor = (device) => {
  if (!deviceCaches.has(device)) deviceCaches.set(device, {styles: new Map(), props: new Map()})
  return deviceCaches.get(device)
}

function headKit(s) {
  const k = new Kit({seed: 3, ao: false, jitter: 0})
  const skinLow = shade(s.skin, 0.84)
  k.blob(0.37, s.skin, 0, 0.3, 0, {sy: 0.95, detail: 2, bump: 0, low: skinLow, high: s.skin})
  for (const side of [-1, 1]) {
    k.blob(0.058, '#21170f', side * 0.14, 0.31, 0.325, {sy: 1.35, sz: 0.5, detail: 1, bump: 0, low: '#21170f'})
    k.blob(0.019, '#ffffff', side * 0.14 + 0.018, 0.345, 0.352, {detail: 0, flat: true, bump: 0, low: '#ffffff'})
    k.blob(0.075, '#ff9f8c', side * 0.22, 0.2, 0.28, {sz: 0.26, sy: 0.7, detail: 1, bump: 0, low: '#ff9f8c'})
    k.blob(0.075, s.skin, side * 0.365, 0.28, 0, {sx: 0.5, detail: 1, bump: 0, low: skinLow})
  }
  k.box(0.09, 0.02, 0.02, '#7a3b2a', 0, 0.17, 0.355)
  const hairTop = (o = {}) => k.blob(0.395, s.hair, 0, 0.36, -0.03, {sy: 0.9, sz: 0.98, detail: 2, bump: 0.02, low: shade(s.hair, 0.72), high: shade(s.hair, 1.25), ...o})
  if (s.hat !== 'hood') {
    // Chevelure : on découpe le visage en plaçant la calotte en arrière et au-dessus.
    k.at({at: [0, 0.075, -0.08]}, () => hairTop())
    if (s.hairCut === 1) { k.blob(0.15, s.hair, 0.12, 0.54, 0.21, {detail: 1, bump: 0.02, sy: 0.6}); k.blob(0.14, s.hair, -0.08, 0.56, 0.2, {detail: 1, bump: 0.02, sy: 0.6}) }
    if (s.hairCut === 2) { k.blob(0.15, s.hair, 0, 0.74, -0.14, {detail: 1, bump: 0.02}); k.blob(0.2, s.hair, 0.29, 0.2, -0.13, {sy: 1.1, detail: 1}); k.blob(0.2, s.hair, -0.29, 0.2, -0.13, {sy: 1.1, detail: 1}) }
    else if (s.hairCut === 0) k.blob(0.26, s.hair, 0, 0.3, -0.25, {detail: 1, bump: 0.02})
  }
  const col = s.hatCol
  switch (s.hat) {
    case 'beanie':
      k.lathe([[0.385, 0.42], [0.385, 0.5], [0.34, 0.66], [0.2, 0.74], [0, 0.76]], 12, col)
      k.cyl(0.395, 0.395, 0.1, 12, shade(col, 1.25), 0, 0.4, 0, {smooth: true})
      k.blob(0.075, '#fff4dc', 0, 0.8, 0, {detail: 1, bump: 0})
      break
    case 'mortar':
      k.cyl(0.32, 0.34, 0.14, 10, col, 0, 0.53, -0.01, {smooth: true})
      k.box(0.84, 0.035, 0.84, col, 0, 0.68, -0.01, {ry: 45})
      k.box(0.02, 0.02, 0.42, '#f4d36a', 0.14, 0.7, 0.13, {ry: 45})
      k.box(0.02, 0.2, 0.02, '#f4d36a', 0.29, 0.6, 0.28)
      break
    case 'hood':
      k.blob(0.44, col, 0, 0.32, -0.08, {sy: 1, detail: 2, bump: 0.01, low: shade(col, 0.68)})
      k.blob(0.24, s.hair, 0, 0.55, 0.22, {sy: 0.42, detail: 1, bump: 0.02})
      k.blob(0.36, s.skin, 0, 0.27, 0.13, {sy: 0.88, detail: 2, bump: 0, low: skinLow})
      for (const side of [-1, 1]) {
        k.blob(0.058, '#21170f', side * 0.14, 0.31, 0.43, {sy: 1.35, sz: 0.5, detail: 1, bump: 0, low: '#21170f'})
        k.blob(0.075, '#ff9f8c', side * 0.2, 0.2, 0.4, {sz: 0.26, sy: 0.7, detail: 1, bump: 0, low: '#ff9f8c'})
      }
      break
    case 'beret':
      k.blob(0.41, col, 0.04, 0.62, -0.02, {sy: 0.3, detail: 2, bump: 0.02})
      k.box(0.02, 0.09, 0.02, shade(col, 0.7), 0.04, 0.76, -0.02)
      break
    case 'post':
      k.cyl(0.4, 0.34, 0.2, 12, col, 0, 0.5, -0.02, {smooth: true})
      k.box(0.54, 0.035, 0.26, '#22222a', 0, 0.5, 0.31, {rx: 8})
      k.box(0.13, 0.09, 0.02, '#f4d36a', 0, 0.61, 0.36)
      break
    case 'flat':
      k.blob(0.415, col, 0, 0.54, -0.01, {sy: 0.42, detail: 2, bump: 0.02, low: shade(col, 0.7), high: shade(col, 1.25)})
      k.box(0.5, 0.04, 0.26, shade(col, 0.82), 0, 0.5, 0.33, {rx: 10})
      break
    default: break
  }
  return k
}

function torsoKit(s) {
  const k = new Kit({seed: 4, ao: false, jitter: 0})
  k.lathe([[0.3, 0], [0.33, 0.1], [0.29, 0.34], [0.2, 0.52], [0.08, 0.57]], 12, s.shirt)
  k.cyl(0.31, 0.31, 0.05, 12, s.trim, 0, 0.03, 0, {cap: false, smooth: true})
  k.box(0.04, 0.42, 0.02, shade(s.trim, 0.95), 0, 0.28, 0.285, {rx: -3})
  if (s.tie) { k.box(0.22, 0.32, 0.03, s.trim, 0, 0.31, 0.26, {rx: -5}); k.box(0.07, 0.3, 0.02, s.tie, 0, 0.32, 0.28, {rx: -5}) }
  return k
}

function armKit(s, side) {
  const k = new Kit({seed: 5, ao: false, jitter: 0})
  k.lathe([[0.075, -0.26], [0.09, -0.08], [0.095, 0], [0.05, 0.06]], 8, s.shirt, 0, 0, 0)
  k.blob(0.082, s.skin, 0, -0.32, 0, {detail: 1, bump: 0, low: shade(s.skin, 0.86)})
  return k
}

function legKit(s) {
  const k = new Kit({seed: 6, ao: false, jitter: 0})
  k.lathe([[0.09, -0.26], [0.115, -0.05], [0.12, 0]], 8, s.pants)
  k.blob(0.12, s.shoes, 0, -0.28, 0.06, {sz: 1.5, sy: 0.64, detail: 1, bump: 0, low: shade(s.shoes, 0.8)})
  return k
}

function propKit(kind) {
  const k = new Kit({seed: 8, ao: false, jitter: 0})
  if (kind === 'parcel') {
    k.box(0.44, 0.32, 0.34, '#c9a06a', 0, 0, 0, {ch: 0.02})
    k.box(0.46, 0.05, 0.08, '#8c2f2a', 0, 0.01, 0)
    k.box(0.08, 0.34, 0.36, '#8c2f2a', 0, 0, 0)
  } else if (kind === 'paper') {
    k.box(0.3, 0.4, 0.02, '#fff8e6', 0, 0, 0)
    for (let i = 0; i < 4; i++) k.box(0.2, 0.018, 0.01, '#a79a84', 0, 0.12 - i * 0.07, 0.014)
  }
  return k
}

const STYLE_KEY = (s) => JSON.stringify(s)

function meshes(device, style) {
  const cache = cachesFor(device).styles
  const key = STYLE_KEY(style)
  if (cache.has(key)) return cache.get(key)
  const m = {
    head: meshFrom(device, headKit(style).arrays()), torso: meshFrom(device, torsoKit(style).arrays()),
    arm: meshFrom(device, armKit(style).arrays()), leg: meshFrom(device, legKit(style).arrays()),
  }
  // Le cache garde sa propre référence : sans elle, le départ du dernier habitant d'un costume détruirait le maillage.
  Object.values(m).forEach((mesh) => mesh.incRefCount())
  cache.set(key, m)
  return m
}
function propMesh(device, kind) {
  const props = cachesFor(device).props
  if (!props.has(kind)) { const mesh = meshFrom(device, propKit(kind).arrays()); mesh.incRefCount(); props.set(kind, mesh) }
  return props.get(kind)
}

const part = (parent, mesh, material, groupId, name) => {
  const e = new Entity(name)
  e.addComponent('render', {meshInstances: [new MeshInstance(mesh, material)], castShadows: false, receiveShadows: false, batchGroupId: groupId})
  parent.addChild(e)
  return e
}

export class Character {
  constructor(world, style, {scale = 1, groupId = -1, shadowMesh = null, shadowMat = null, shadowGroup = -1} = {}) {
    const device = world.device, mat = world.charMat
    this.root = new Entity('character')
    const m = meshes(device, style)
    this.body = new Entity('body'); this.root.addChild(this.body)
    this.body.setLocalPosition(0, 0.56, 0)
    this.torso = part(this.body, m.torso, mat, groupId, 'torso')
    this.head = part(this.body, m.head, mat, groupId, 'head')
    this.head.setLocalPosition(0, 0.54, 0)
    this.armL = part(this.body, m.arm, mat, groupId, 'armL'); this.armL.setLocalPosition(-0.3, 0.42, 0)
    this.armR = part(this.body, m.arm, mat, groupId, 'armR'); this.armR.setLocalPosition(0.3, 0.42, 0)
    this.legL = part(this.body, m.leg, mat, groupId, 'legL'); this.legL.setLocalPosition(-0.14, -0.02, 0)
    this.legR = part(this.body, m.leg, mat, groupId, 'legR'); this.legR.setLocalPosition(0.14, -0.02, 0)
    this.parcel = part(this.body, propMesh(device, 'parcel'), mat, groupId, 'parcel'); this.parcel.setLocalPosition(0, 0.22, 0.42); this.parcel.setLocalScale(0, 0, 0)
    this.paper = part(this.body, propMesh(device, 'paper'), mat, groupId, 'paper'); this.paper.setLocalPosition(0.22, 0.14, 0.42); this.paper.setLocalScale(0, 0, 0)
    if (shadowMesh) {
      this.shadow = new Entity('shadow')
      this.shadow.addComponent('render', {meshInstances: [new MeshInstance(shadowMesh, shadowMat)], castShadows: false, receiveShadows: false, batchGroupId: shadowGroup})
      this.root.addChild(this.shadow)
      this.shadow.setLocalPosition(0, 0.03, 0)
    }
    this.scale = scale
    this.root.setLocalScale(scale, scale, scale)
    this.carry = null
  }

  setCarry(kind) {
    if (this.carry === kind) return
    this.carry = kind
    this.parcel.setLocalScale(kind === 'parcel' ? 1 : 0, kind === 'parcel' ? 1 : 0, kind === 'parcel' ? 1 : 0)
    this.paper.setLocalScale(kind === 'paper' ? 1 : 0, kind === 'paper' ? 1 : 0, kind === 'paper' ? 1 : 0)
  }

  /** Pose une attitude : chacune correspond à un statut, pas à une animation décorative. */
  pose(name, t, gait = 0, strength = 1) {
    let hip = 0, armL = 0, armR = 0, armLz = 6, armRz = -6, bob = 0, lean = 0, roll = 0, nod = 0, turn = 0, sitting = false
    const breathe = Math.sin(t * 1.7) * 0.012
    switch (name) {
      case 'walk': {
        const s = Math.sin(gait)
        hip = s * 38 * strength; armL = -s * 34 * strength; armR = s * 34 * strength
        bob = Math.abs(Math.cos(gait)) * 0.06 * strength; lean = 4 * strength; roll = Math.sin(gait) * 2.2 * strength
        if (this.carry === 'parcel') { armL = -68; armR = -68; armLz = 18; armRz = -18; lean = 2 }
        if (this.carry === 'paper') { armR = -56; armRz = -8 }
        break
      }
      case 'wait': {
        // Impatience douce : on tape du pied, on change d'appui, on jette un œil à son papier.
        const beat = Math.sin(t * 5.2)
        hip = 0; bob = breathe + Math.max(0, beat) * 0.006; roll = Math.sin(t * 0.7) * 1.8
        armR = -56; armRz = -8
        nod = Math.sin(t * 0.45) > 0.4 ? 13 : -2
        turn = Math.sin(t * 0.31) * 12
        this.legR.setLocalEulerAngles(Math.max(0, beat) * -14, 0, 0)
        this.legL.setLocalEulerAngles(0, 0, 0)
        this.apply({armL, armR, armLz, armRz, bob, lean, roll, nod, turn, skipLegs: true})
        return
      }
      case 'blocked': {
        // Mains sur les hanches, le regard qui va de la porte au sol : ça n'avance pas.
        armL = -14; armR = -14; armLz = 42; armRz = -42
        nod = 10 + Math.sin(t * 0.9) * 5; turn = Math.sin(t * 0.55) * 26; bob = breathe; roll = Math.sin(t * 0.55) * 2
        break
      }
      case 'sit': {
        sitting = true; hip = -82; armL = -28; armR = -28; armLz = 12; armRz = -12
        bob = -0.22 + breathe; nod = Math.sin(t * 0.3) * 6 + 5; turn = Math.sin(t * 0.21) * 10
        break
      }
      case 'watch': {
        // Bientôt l'heure : debout, on regarde sa montre.
        armL = -70; armLz = 34; nod = 16; bob = breathe
        turn = Math.sin(t * 0.8) * 4
        break
      }
      case 'deliver': {
        armL = -80 + Math.sin(t * 4) * 6; armR = -80 + Math.sin(t * 4) * 6; lean = 12; nod = 8; bob = breathe
        break
      }
      case 'cheer': {
        const jump = Math.abs(Math.sin(t * 5.5))
        bob = jump * 0.28; armL = -170 + Math.sin(t * 11) * 12; armR = -170 - Math.sin(t * 11) * 12; armLz = 14; armRz = -14
        hip = jump * 14; nod = -8
        break
      }
      case 'type': {
        sitting = true; hip = -84; bob = -0.2 + breathe; lean = 8; nod = 6
        armL = -72 + Math.sin(t * 14) * 7; armR = -72 - Math.sin(t * 14) * 7; armLz = 10; armRz = -10
        break
      }
      default: bob = breathe; nod = Math.sin(t * 0.4) * 4; turn = Math.sin(t * 0.27) * 9
    }
    if (sitting) {
      this.legL.setLocalEulerAngles(hip, 0, 0); this.legR.setLocalEulerAngles(hip, 0, 0)
      this.apply({armL, armR, armLz, armRz, bob, lean, roll, nod, turn, skipLegs: true})
      return
    }
    this.legL.setLocalEulerAngles(hip, 0, 0)
    this.legR.setLocalEulerAngles(-hip, 0, 0)
    this.apply({armL, armR, armLz, armRz, bob, lean, roll, nod, turn, skipLegs: true})
  }

  apply({armL, armR, armLz, armRz, bob, lean, roll, nod, turn}) {
    this.armL.setLocalEulerAngles(armL, 0, armLz)
    this.armR.setLocalEulerAngles(armR, 0, armRz)
    this.body.setLocalPosition(0, 0.56 + bob, 0)
    this.body.setLocalEulerAngles(lean, 0, roll)
    this.head.setLocalEulerAngles(nod, turn, -roll * 0.6)
  }

  place(x, y, z, yawRadians) {
    this.root.setLocalPosition(x, y, z)
    this.root.setLocalEulerAngles(0, (yawRadians * 180) / Math.PI, 0)
  }

  destroy() { this.root.destroy() }
}

/** Archy : petit robot-lanterne en laiton, le seul habitant qui flotte. Il va là où il vient d'agir. */
export function archyKit() {
  const k = new Kit({seed: 12, ao: false, jitter: 0})
  k.blob(0.42, '#d9a64a', 0, 0.42, 0, {sy: 0.84, detail: 2, bump: 0, low: '#a26f2e', high: '#efc674'})
  k.blob(0.31, '#fff4d8', 0, 0.55, 0.18, {sy: 0.72, sz: 0.74, detail: 2, bump: 0, low: '#e8d2a4'})
  for (const s of [-1, 1]) k.blob(0.065, '#23304a', s * 0.12, 0.58, 0.39, {sy: 1.25, sz: 0.4, detail: 1, bump: 0, low: '#23304a'})
  k.cyl(0.42, 0.42, 0.05, 14, '#7c5526', 0, 0.28, 0, {cap: false, smooth: true})
  k.cyl(0.03, 0.03, 0.24, 6, '#7c5526', 0, 0.74, 0)
  for (const s of [-1, 1]) k.blob(0.13, '#c28f3e', s * 0.44, 0.38, 0, {sx: 0.5, sy: 1.1, detail: 1, bump: 0, low: '#8a6128'})
  k.lathe([[0.04, 0.02], [0.2, 0.15], [0.32, 0.28]], 10, '#8a6128')
  return k
}
export function archyBulbKit() {
  const k = new Kit({ao: false, jitter: 0})
  k.blob(0.1, '#ffe08a', 0, 1.02, 0, {detail: 1, bump: 0, low: '#ffd16a'})
  return k
}
