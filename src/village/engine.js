// Le village côté moteur. L'interface React parle à ce module par une petite API d'intentions
// (select, flyTo, startWalk…) et reçoit des événements : aucun n'a besoin de connaître l'autre.
import {BLEND_NORMAL, Color, Entity, FILLMODE_NONE, MeshInstance, PIXELFORMAT_SRGBA8, PlaneGeometry, RESOLUTION_AUTO, StandardMaterial, Vec2, Vec3, Mesh, SHADOWUPDATE_THISFRAME, Texture, FILTER_LINEAR, ADDRESS_CLAMP_TO_EDGE} from 'playcanvas'
import {addMesh, createApp, createCameraFrame, detectQuality, litMaterial, meshFrom, uniforms} from './render.js'
import {addGlass, applyAmbience, buildWorld, setDoorPools, setGlass, windowStatuses} from './world.js'
import {ambience, localHour, TIME_MODES} from './daylight.js'
import {DISTRICTS, OFFICE, assignLots, lotPoint} from './plan.js'
import {PAL, buildArchetype} from './buildings.js'
import {Kit, hashString, linear} from './meshkit.js'
import {Sim, along, pathLength} from './sim.js'
import {Character, NICO, archyBulbKit, archyKit, styleFor} from './characters.js'
import {Effects} from './fx.js'
import {GameCamera} from './camera.js'
import {describeRooms, interiorLayout, roomKits, shellKit, RH} from './interior.js'
import {LOGOS} from '../rooms.js'
import {ORD} from '../shared.jsx'

const DAY = 864e5
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const outBack = (t) => { const c = 1.70158; const x = t - 1; return 1 + (c + 1) * x * x * x + c * x * x }

function discMesh(device, radius = 0.55) {
  const k = new Kit({ao: false, jitter: 0})
  const seg = 14
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * 6.283, a1 = ((i + 1) / seg) * 6.283
    k.tri([0, 0, 0], [Math.sin(a0) * radius, 0, Math.cos(a0) * radius], [Math.sin(a1) * radius, 0, Math.cos(a1) * radius], [0.1, 0.07, 0.05])
  }
  return meshFrom(device, k.arrays())
}

/** Caisses en file, mât à fanions pour les tâches finies, barrière rouge pour les tâches bloquées. */
function statusKit(lot, tasks, now) {
  const k = new Kit({seed: hashString(lot.id || 'x'), jitter: 0.04})
  const spot = lot.spec?.spot || {}
  const queued = tasks.filter((t) => t.status === 'queued').length
  const done = tasks.filter((t) => t.status === 'done')
  const blocked = tasks.some((t) => t.status === 'blocked')
  if (queued) {
    const [cx, cz] = spot.crates || [-3, lot.depth + 1]
    for (let i = 0; i < Math.min(queued, 9); i++) {
      const col = i % 3, lvl = Math.floor(i / 3), s = 0.62
      k.box(s, s, s, PAL.plank, cx + (col - 1) * (s + 0.06) + (lvl ? 0.14 : 0), lvl * s + s / 2, cz + (lvl % 2) * 0.05, {ch: 0.03, ry: k.random() * 16 - 8})
      k.box(s + 0.01, 0.05, s + 0.01, '#8a6238', cx + (col - 1) * (s + 0.06) + (lvl ? 0.14 : 0), lvl * s + s * 0.2, cz + (lvl % 2) * 0.05)
      k.box(s + 0.01, 0.05, s + 0.01, '#8a6238', cx + (col - 1) * (s + 0.06) + (lvl ? 0.14 : 0), lvl * s + s * 0.8, cz + (lvl % 2) * 0.05)
    }
  }
  if (done.length) {
    // Un fanion par tâche terminée ; ceux des dernières 24 h sont dorés.
    const [fx, fz] = spot.bench ? [spot.bench[0] + 1.3, spot.bench[1] - 1.2] : [3, lot.depth]
    const n = Math.min(done.length, 7), h = 2.2 + n * 0.32
    k.cyl(0.05, 0.08, h, 6, PAL.iron, fx, 0, fz)
    k.blob(0.09, PAL.brass, fx, h + 0.04, fz, {detail: 0, flat: true, bump: 0})
    done.slice(0, n).forEach((t, i) => {
      const y = h - 0.14 - i * 0.32
      const col = now - Date.parse(t.doneAt || 0) < DAY ? '#f2c14e' : '#6fa86a'
      k.tri([fx, y, fz], [fx, y - 0.26, fz], [fx + 0.5, y - 0.13, fz], col)
      k.tri([fx + 0.5, y - 0.13, fz], [fx, y - 0.26, fz], [fx, y, fz], col)
    })
  }
  if (blocked) {
    const [bx, bz] = spot.block || [1.5, lot.depth + 1.4]
    const by = bz - 0.9
    for (const s of [-1, 1]) { k.box(0.1, 0.92, 0.1, PAL.white, bx + s * 0.9, 0.46, by); k.box(0.5, 0.05, 0.3, PAL.iron, bx + s * 0.9, 0.03, by) }
    for (let i = 0; i < 2; i++) {
      const y = 0.6 + i * 0.27
      k.box(2.1, 0.18, 0.05, PAL.white, bx, y, by)
      for (let j = 0; j < 4; j++) k.box(0.42, 0.181, 0.052, PAL.red, bx - 0.78 + j * 0.52, y, by, {})
    }
  }
  return k
}

function emptyLotKit(lot, seed) {
  const k = new Kit({seed})
  // Parcelle à bâtir : piquets et pancarte. Le prochain univers s'y installera.
  for (const [x, z] of [[-3, -2.4], [3, -2.4], [-3, 2.2], [3, 2.2]]) k.box(0.1, 0.72, 0.1, PAL.plank, x, 0.36, z)
  k.box(6, 0.04, 0.03, '#d3c49a', 0, 0.62, 2.2); k.box(6, 0.04, 0.03, '#d3c49a', 0, 0.62, -2.4); k.box(0.03, 0.04, 4.6, '#d3c49a', -3, 0.62, -0.1); k.box(0.03, 0.04, 4.6, '#d3c49a', 3, 0.62, -0.1)
  k.box(0.1, 1.2, 0.1, PAL.timberDark, -1.8, 0.6, 2.3)
  k.box(1.1, 0.56, 0.06, PAL.plank, -1.8, 1.26, 2.34, {ch: 0.02})
  k.box(0.7, 0.05, 0.02, PAL.timberDark, -1.8, 1.34, 2.38); k.box(0.5, 0.05, 0.02, PAL.timberDark, -1.8, 1.2, 2.38)
  return k
}

export async function createVillage({canvas, container, onProgress = () => {}, emit = () => {}}) {
  const quality = detectQuality()
  const params = new URLSearchParams(location.search)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const app = createApp(canvas)
  app.setCanvasFillMode(FILLMODE_NONE)
  app.setCanvasResolution(RESOLUTION_AUTO)
  const device = app.graphicsDevice
  device.maxPixelRatio = quality.dpr
  const resize = () => app.resizeCanvas(canvas.clientWidth, canvas.clientHeight)
  addEventListener('resize', resize)
  resize()
  const set = uniforms(device)
  set('uWindTime', 0)
  const world = await buildWorld(app, quality, onProgress)
  world.charMat = litMaterial({gloss: 0.38})
  world.lit.emissive = new Color(0.00001, 0.00001, 0.00001); world.lit.update()

  const batchChars = app.batcher.addGroup('characters', true, 400).id
  const shadowMat = new StandardMaterial()
  shadowMat.diffuse = new Color(0, 0, 0); shadowMat.specular = new Color(0, 0, 0); shadowMat.useSkybox = false; shadowMat.useLighting = false
  shadowMat.opacity = 0.3; shadowMat.blendType = BLEND_NORMAL; shadowMat.depthWrite = false; shadowMat.update()
  const batchShadows = app.batcher.addGroup('blobs', true, 400).id
  const shadowMesh = discMesh(device)
  shadowMesh.incRefCount()

  const portrait = innerHeight > innerWidth * 1.15
  const camera = new Entity('camera')
  camera.addComponent('camera', {clearColor: new Color(0.6, 0.7, 0.8), farClip: 1500, nearClip: 0.6, fov: portrait ? 46 : 34})
  app.root.addChild(camera)
  const game = new GameCamera(camera, {portrait, reduced})
  const frame = createCameraFrame(app, camera, quality)
  const fx = new Effects(app, quality)

  // ----------------------------------------------------------------- État
  const plan = world.plan
  let data = null
  let time = 0
  let selected = null, selectedAgent = null, lens = null, viewBeforeSelect = null, walking = false, interior = null
  const views = new Map() // bâtiments par univers
  const empties = new Map()
  const placedLots = {}
  const characters = new Map()
  const pins = new Map()
  const tmp = new Vec3(), tmp2 = new Vec3()
  const sim = new Sim({graph: plan.graph, onEvent: onSimEvent})

  // ----------------------------------------------------------------- Bâtiments
  function makeBuilding(universe, lot) {
    const spec = buildArchetype(lot.type, universe.color, universe.id)
    const fullLot = {...lot, id: universe.id, spec}
    const entity = new Entity(universe.id)
    entity.setPosition(lot.x, 0, lot.z)
    entity.setEulerAngles(0, lot.ry, 0)
    world.root.addChild(entity)
    const body = addMesh(entity, meshFrom(device, spec.kit.arrays()), world.lit, {name: 'body'})
    const parts = {}
    for (const part of spec.parts) {
      const e = addMesh(entity, meshFrom(device, part.kit.arrays()), world.lit, {name: part.name, shadows: false})
      e.setLocalPosition(part.pivot[0], part.pivot[1], part.pivot[2])
      parts[part.name] = e
    }
    const glass = addGlass(device, entity, spec.slots, world.glass, [])
    const view = {id: universe.id, universe, lot: fullLot, spec, entity, body, glass, parts, statusEntity: null, colorKey: universe.color, chimney: null, mi: body.render.meshInstances[0], logo: null}
    if (spec.spots.chimney) { tmp.set(...spec.spots.chimney); view.chimney = localToWorld(fullLot, tmp.clone()) }
    if (spec.spots.beacon) { tmp.set(...spec.spots.beacon); view.beacon = localToWorld(fullLot, tmp.clone()) }
    view.door = lotPoint(fullLot, 0, fullLot.depth + 0.8)
    addLogo(view)
    return view
  }

  function localToWorld(lot, p) {
    const a = (lot.ry * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
    return new Vec3(lot.x + p.x * c + p.z * s, p.y, lot.z - p.x * s + p.z * c)
  }

  function addLogo(view) {
    const url = LOGOS[view.id], at = view.spec.logoAt
    if (!url || !at) return
    const img = new Image()
    img.onload = () => {
      if (!views.has(view.id)) return
      const c = document.createElement('canvas'); c.width = 320; c.height = 128
      const x = c.getContext('2d')
      x.fillStyle = view.id === 'isme' ? '#12244a' : '#fffaf0'; x.fillRect(0, 0, 320, 128)
      const r = Math.min(280 / (img.width || 280), 100 / (img.height || 100))
      const w = (img.width || 280) * r, h = (img.height || 100) * r
      x.drawImage(img, 160 - w / 2, 64 - h / 2, w, h)
      const t = new Texture(device, {width: 320, height: 128, format: PIXELFORMAT_SRGBA8, mipmaps: true, minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR, addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE, flipY: false})
      t.setSource(c)
      const m = new StandardMaterial(); m.diffuse = new Color(0, 0, 0); m.emissiveMap = t; m.emissive = new Color(0.95, 0.95, 0.95); m.useSkybox = false; m.specular = new Color(0, 0, 0); m.update()
      const plane = Mesh.fromGeometry(device, new PlaneGeometry({halfExtents: new Vec2(0.5, 0.5)}))
      const e = new Entity('logo')
      e.addComponent('render', {meshInstances: [new MeshInstance(plane, m)], castShadows: false, receiveShadows: false})
      e.setLocalPosition(at[0], at[1], at[2] + 0.06); e.setLocalEulerAngles(90, 0, 0); e.setLocalScale(1.9, 1, 0.76)
      view.entity.addChild(e)
      view.logo = e
    }
    img.src = url
  }

  function rebuildBulbs() {
    const merged = new Kit({ao: false, jitter: 0})
    merged.merge(world.allBulbs)
    for (const v of views.values()) merged.at({at: [v.lot.x, 0, v.lot.z], ry: v.lot.ry}, () => merged.merge(v.spec.bulbs))
    if (world.bulbEntity) world.bulbEntity.destroy()
    world.bulbEntity = addMesh(world.root, meshFrom(device, merged.arrays()), world.bulbs, {name: 'bulbs', shadows: false, receive: false})
  }

  function syncBuildings(d, now) {
    const universes = d?.universes || []
    const {placed, overflow} = assignLots(universes.filter((u) => (d.tasks || []).some((t) => t.universe === u.id) || (u.id in placeable)))
    let changed = false
    const lots = {}
    for (const u of universes) {
      const lot = placed[u.id]
      if (!lot) continue
      let v = views.get(u.id)
      if (v && v.colorKey !== u.color) { v.entity.destroy(); views.delete(u.id); v = null; changed = true }
      if (!v) { v = makeBuilding(u, lot); views.set(u.id, v); changed = true }
      v.universe = u
      lots[u.id] = v.lot
      const tasks = (d.tasks || []).filter((t) => t.universe === u.id)
      setGlass(device, v.glass, v.spec.slots, world.glass, windowStatuses(v.spec.slots, tasks, ORD))
      if (v.statusEntity) { v.statusEntity.destroy(); v.statusEntity = null }
      const sk = statusKit(v.lot, tasks, now)
      if (sk.vertexCount) { v.statusEntity = addMesh(v.entity, meshFrom(device, sk.arrays()), world.lit, {name: 'status'}) }
      v.active = tasks.filter((t) => t.status === 'active').length
      v.blocked = tasks.filter((t) => t.status === 'blocked').length
    }
    for (const [id, v] of views) if (!lots[id]) { v.entity.destroy(); views.delete(id); changed = true }
    // Parcelles vides
    const occupied = new Set(Object.values(lots).map((l) => l.x + '_' + l.z))
    for (const [key, lot] of Object.entries(plan.lots)) {
      const k = lot.x + '_' + lot.z
      const has = occupied.has(k)
      if (has && empties.has(key)) { empties.get(key).destroy(); empties.delete(key) }
      if (!has && !empties.has(key)) {
        const e = new Entity('empty')
        e.setPosition(lot.x, world.terrain.groundY(lot.x, lot.z), lot.z); e.setEulerAngles(0, lot.ry, 0)
        addMesh(e, meshFrom(device, emptyLotKit(lot, hashString(key)).arrays()), world.lit, {name: 'stakes'})
        world.root.addChild(e)
        empties.set(key, e)
      }
    }
    setDoorPools(world, Object.values(lots).flatMap((lot) => {
      const v = views.get(lot.id)
      if (!v || !(v.active || v.blocked)) return []
      const [x, z] = lotPoint(lot, 0, lot.depth + 1.4)
      return [{x, z, r: 5.5, y: 0.12, color: linear(v.blocked ? '#a8352a' : '#b98a40')}]
    }))
    Object.assign(placedLots, lots)
    for (const k of Object.keys(placedLots)) if (!lots[k]) delete placedLots[k]
    if (changed) rebuildBulbs()
    sim.setLots(lots, seatsFromLots(lots))
    // Fenêtres du bureau : allumées d'autant de « à décider » que de tâches qui l'attendent.
    const need = (d.tasks || []).filter((t) => t.status === 'waiting' || t.status === 'blocked')
    setGlass(device, world.officeGlass, world.officeSpec.slots, world.glass, world.officeSpec.slots.map((_, i) => (i < need.length ? (need[i].status === 'blocked' ? 'blocked' : 'waiting') : 'active')))
    return overflow
  }
  const placeable = Object.fromEntries(Object.keys(plan.lots).filter((k) => !k.startsWith('__')).map((k) => [k, true]))
  const seatsFromLots = (lots) => {
    const seats = {}
    for (const [id, lot] of Object.entries(lots)) {
      const b = lot.spec?.spot?.bench
      if (!b) continue
      const [x, z] = lotPoint(lot, b[0], b[1])
      seats[id] = {x, z, ry: lot.ry}
    }
    return seats
  }

  // ----------------------------------------------------------------- Personnages
  function characterFor(agent) {
    let c = characters.get(agent.id)
    if (c) return c
    const universe = views.get(agent.universe)?.universe
    if (!universe) return null
    const style = styleFor(universe, views.get(agent.universe).lot.district)
    c = new Character(world, style, {scale: 1.32, groupId: batchChars, shadowMesh, shadowMat, shadowGroup: batchShadows})
    world.root.addChild(c.root)
    characters.set(agent.id, c)
    return c
  }

  const player = new Character(world, NICO, {scale: 1.42, shadowMesh, shadowMat, groupId: batchChars, shadowGroup: batchShadows})
  player.root.enabled = false
  world.root.addChild(player.root)

  // Archy flotte au-dessus du sol, son ombre reste posée.
  const archy = {entity: new Entity('archy'), bob: 0}
  archy.entity.addComponent('render', {meshInstances: [new MeshInstance(meshFrom(device, archyKit().arrays()), world.charMat)], castShadows: false, receiveShadows: false})
  const archyLamp = new Entity('archy-lamp')
  archyLamp.addComponent('render', {meshInstances: [new MeshInstance(meshFrom(device, archyBulbKit().arrays()), world.bulbs)], castShadows: false, receiveShadows: false})
  archy.entity.addChild(archyLamp)
  const archyShadow = new Entity('archy-shadow')
  archyShadow.addComponent('render', {meshInstances: [new MeshInstance(shadowMesh, shadowMat)], castShadows: false, receiveShadows: false, batchGroupId: batchShadows})
  world.root.addChild(archy.entity); world.root.addChild(archyShadow)
  archy.entity.setLocalScale(1.25, 1.25, 1.25)

  function onSimEvent(e) {
    if (e.type === 'delivered' || e.type === 'archyArrived') return
    if (e.type === 'cheer') {
      const a = e.agent
      fx.confetti(a.x, 2, a.z, ['#f2c14e', '#ef6f8e', '#7bd88f', '#6cb4ff', '#fff4dc'])
      return
    }
    if (e.task || e.entry) emit('event', e)
    const t = e.task
    if (!t) return
    const view = views.get(t.universe)
    if (!view) return
    const {x, z} = view.lot
    // Personne aux commandes : la caméra va voir ce qui vient de se passer.
    if (!walking && !selected && !selectedAgent && performance.now() - game.lastInput > 45000 && (e.type === 'done' || e.type === 'blocked')) {
      game.flyTo({x, z, dist: 52, y: 0, tilt: 0}, {ms: 1600})
    }
    if (e.type === 'done') {
      celebrate(x, view.spec.h ?? 6, z, view.universe.color)
    } else if (e.type === 'blocked') {
      for (let i = 0; i < 12; i++) fx.ember(view.door[0], 1 + i * 0.1, view.door[1])
    } else if (e.type === 'active' || e.type === 'new') {
      fx.dust(view.door[0], 0, view.door[1], 8)
    }
  }

  const rockets = []
  function celebrate(x, h, z, hex) {
    const colors = [hex, '#f2c14e', '#ef6f8e']
    colors.forEach((c, i) => rockets.push({at: time + i * 0.42, x: x + (i - 1) * 2.4, y: h + 1, z, c}))
  }

  // ----------------------------------------------------------------- Maison de poupée
  function closeInterior() {
    if (!interior) return
    interior.closing = true
    interior.t = 0
    const v = views.get(interior.id)
    if (v) { v.entity.enabled = true; v.popIn = 0 }
    interior.root.destroy()
    interior.workers.forEach((w) => w.c.destroy())
    interior = null
    emit('rooms', [])
  }

  function openInterior(id) {
    closeInterior()
    const v = views.get(id)
    if (!v || !data) return
    const tasks = data.tasks.filter((t) => t.universe === id)
    const rooms = describeRooms(v.universe, tasks)
    const layout = interiorLayout(rooms)
    const root = new Entity('interior')
    root.setPosition(v.lot.x, 0, v.lot.z); root.setEulerAngles(0, v.lot.ry, 0)
    const S = Math.min(1, 12 / layout.W)
    root.setLocalScale(S, S, S)
    world.root.addChild(root)
    const shell = addMesh(root, meshFrom(device, shellKit(layout, DISTRICT_ROOF(v.lot.district)).arrays()), world.lit, {name: 'shell'})
    shell.setLocalScale(1, 0.001, 1)
    const items = []
    const workers = []
    rooms.forEach((room, i) => {
      const at = layout.at(i)
      const {k, bulbs, workerSpot} = roomKits(room, v.universe.color, room.id)
      const e = new Entity('room')
      e.setLocalPosition(at.x, at.y, 0)
      root.addChild(e)
      addMesh(e, meshFrom(device, k.arrays()), world.lit, {name: 'walls', shadows: false})
      addMesh(e, meshFrom(device, bulbs.arrays()), world.bulbs, {name: 'lamp', shadows: false, receive: false})
      if (workerSpot.show) {
        const c = new Character(world, styleFor(v.universe, v.lot.district), {scale: 1, groupId: batchChars})
        c.root.setLocalPosition(workerSpot.x, 0.09, workerSpot.z)
        c.root.setLocalEulerAngles(0, (workerSpot.yaw * 180) / Math.PI, 0)
        if (workerSpot.pose === 'wait') c.setCarry('paper')
        e.addChild(c.root)
        workers.push({c, pose: workerSpot.pose, seed: i})
      }
      e.setLocalScale(1, 0.001, 1)
      items.push({entity: e, delay: 0.12 + at.r * 0.13 + at.c * 0.05, at, room})
    })
    interior = {id, root, shell, items, workers, layout, S, t: 0, rooms}
    v.entity.enabled = true
    v.popOut = 0
    for (let i = 0; i < 14; i++) fx.dust(v.lot.x + (Math.random() - 0.5) * 6, 0.2, v.lot.z + (Math.random() - 0.5) * 5, 1)
    emit('rooms', rooms.map((r) => ({id: r.id, title: r.title, status: r.status, empty: r.empty, open: r.open, count: r.count})))
  }
  const DISTRICT_ROOF = (district) => ({formation: '#57677c', etudiant: '#3f5f79', ngmi: '#6d4d94', media: '#c9633f', admin: '#3f79a8', forum: '#a98530', perso: '#c9633f'}[district] || '#c9633f')

  // ----------------------------------------------------------------- Sélection
  const viewOfCamera = () => ({x: game.goal.x, z: game.goal.z, dist: game.goal.dist, yaw: game.goal.yaw, y: 0, tilt: 0})

  function selectBuilding(id, {fly = true} = {}) {
    if (id === selected && interior) return
    if (selectedAgent) selectAgent(null, {restore: false})
    if (!id) {
      const had = selected
      selected = null
      closeInterior()
      emit('select', null)
      if (had && viewBeforeSelect && !walking) { game.flyTo(viewBeforeSelect, {ms: 950}); viewBeforeSelect = null }
      return
    }
    if (!views.has(id)) return
    if (!selected && !viewBeforeSelect) viewBeforeSelect = viewOfCamera()
    selected = id
    const v = views.get(id)
    openInterior(id)
    emit('select', id)
    if (fly) {
      const H = interior ? interior.layout.H * interior.S + 1.4 : 6, W = interior ? interior.layout.W * interior.S : 8
      const dist = clamp(Math.max(H * (portrait ? 3.9 : 3.5), W * (portrait ? 3.9 : 2.25)), 15, 58)
      game.flyTo({x: v.lot.x, z: v.lot.z, dist, yaw: (v.lot.ry * Math.PI) / 180, y: H * 0.42, tilt: 7}, {ms: 1050})
    }
  }

  function selectAgent(id, {restore = true} = {}) {
    if (!id) {
      selectedAgent = null
      emit('selectAgent', null)
      if (restore && viewBeforeSelect && !walking) { game.flyTo(viewBeforeSelect, {ms: 800}); viewBeforeSelect = null } else if (restore) game.follow = null
      return
    }
    const a = id === '__archy' ? sim.archy : sim.agents.get(id)
    if (!a) return
    if (selected) selectBuilding(null)
    if (!viewBeforeSelect) viewBeforeSelect = viewOfCamera()
    selectedAgent = id
    emit('selectAgent', id)
    if (!walking) game.flyTo({x: a.x, z: a.z, dist: 19, yaw: game.goal.yaw, y: 0.6, tilt: 4}, {ms: 950, follow: () => (selectedAgent ? (selectedAgent === '__archy' ? sim.archy : sim.agents.get(selectedAgent)) : null)})
  }

  function flyToDistrict(key) {
    if (selected) selectBuilding(null)
    if (selectedAgent) selectAgent(null, {restore: false})
    viewBeforeSelect = null
    if (!key) { game.flyTo({...game.home}, {ms: 1200}); return }
    if (key === 'office') { game.flyTo({x: 0, z: -9, dist: 42, yaw: 0, y: 0, tilt: 0}, {ms: 1100}); return }
    const d = DISTRICTS[key]
    if (!d) return
    const yaw = Math.atan2(d.c[0] * 0.25, 40 + Math.abs(d.c[1]) * 0.2) * 0.35
    game.flyTo({x: d.c[0], z: d.c[1], dist: clamp(d.radius * (portrait ? 3.4 : 2.9), 30, 88), yaw, y: 0, tilt: 0}, {ms: 1150})
  }

  // Une maison survolée ou concernée par le filtre s'éclaire légèrement.
  let hoverView = null
  const glowOf = (v) => {
    const matched = lens && data && data.tasks.some((t) => t.universe === v.id && (lens === 'decide' ? (t.status === 'waiting' || t.status === 'blocked') : t.status === lens))
    const g = v === hoverView ? 0.1 : matched ? 0.07 : 0
    v.mi.setParameter('material_emissive', [g, g * 0.82, g * 0.5])
  }
  const refreshGlow = () => { for (const v of views.values()) glowOf(v) }

  // ----------------------------------------------------------------- Heure
  let timeMode = (() => { try { return localStorage.getItem('archy-time') || 'auto' } catch { return 'auto' } })()
  const forcedHour = params.has('hour') ? Number(params.get('hour')) : null
  const hourForMode = () => {
    if (forcedHour !== null) return forcedHour
    const m = TIME_MODES.find((x) => x.id === timeMode)
    return m?.hour ?? localHour()
  }
  let shownHour = hourForMode(), hourGoal = shownHour, lastShadowHour = -99, lastAmbientRefresh = 0
  let amb = ambience(shownHour)
  function refreshAmbience(forceShadow) {
    amb = ambience(shownHour)
    applyAmbience(world, amb, set, camera, {updateShadows: false})
    if (forceShadow || Math.abs(shownHour - lastShadowHour) > 0.06) {
      world.sun.light.shadowUpdateMode = SHADOWUPDATE_THISFRAME
      lastShadowHour = shownHour
    }
    emit('ambience', {name: amb.name, hour: shownHour, mode: timeMode, night: amb.isNight})
  }

  // ----------------------------------------------------------------- Marche (mode jeu)
  const walk = {x: 0, z: 6, yaw: Math.PI, axis: {x: 0, y: 0}, keys: new Set(), path: null, s: 0, gait: 0, near: null, moved: 0, objective: null, moveTimer: 0}
  const obstacles = world.scenery.obstacles
  const buildingBlocks = (x, z) => {
    const test = (lot, spec, m = 0.25) => {
      const dx = x - lot.x, dz = z - lot.z, a = (lot.ry * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
      const lx = dx * c - dz * s - (spec.centerX || 0), lz = dx * s + dz * c - (spec.centerZ || 0)
      return Math.abs(lx) < spec.w / 2 + m && Math.abs(lz) < spec.d / 2 + m
    }
    for (const v of views.values()) if (test(v.lot, v.spec)) return true
    return test(OFFICE, {w: 13.4, d: 8, centerZ: -0.5})
  }
  const blocked = (x, z) => !world.terrain.walkable(x, z) || buildingBlocks(x, z) || obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.26)

  function updateWalk(dt) {
    let ix = walk.axis.x, iy = walk.axis.y
    if (walk.keys.has('ArrowRight') || walk.keys.has('d') || walk.keys.has('D')) ix += 1
    if (walk.keys.has('ArrowLeft') || walk.keys.has('a') || walk.keys.has('q') || walk.keys.has('A') || walk.keys.has('Q')) ix -= 1
    if (walk.keys.has('ArrowUp') || walk.keys.has('w') || walk.keys.has('z') || walk.keys.has('W') || walk.keys.has('Z')) iy += 1
    if (walk.keys.has('ArrowDown') || walk.keys.has('s') || walk.keys.has('S')) iy -= 1
    const len = Math.hypot(ix, iy)
    if (len > 1) { ix /= len; iy /= len }
    const strength = Math.min(1, len)
    let dx = 0, dz = 0
    if (strength > 0.05) {
      walk.path = null
      const yaw = game.goal.yaw
      const fx_ = -Math.sin(yaw), fz_ = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw)
      dx = (fx_ * iy + rx * ix); dz = (fz_ * iy + rz * ix)
    } else if (walk.path) {
      walk.s += dt * 5.2
      const p = along(walk.path, walk.s)
      dx = p.x - walk.x; dz = p.z - walk.z
      const l = Math.hypot(dx, dz) || 1
      dx /= l; dz /= l
      if (walk.s >= walk.len) walk.path = null
    }
    const speed = 5.2 * (strength > 0.05 ? strength : 1)
    let moved = 0
    if (dx || dz) {
      const ox = walk.x, oz = walk.z
      const nx = ox + dx * speed * dt, nz = oz + dz * speed * dt
      if (!blocked(nx, oz)) walk.x = nx
      if (!blocked(walk.x, nz)) walk.z = nz
      moved = Math.hypot(walk.x - ox, walk.z - oz)
      if (moved > 0) walk.yaw = walk.yaw + Math.atan2(Math.sin(Math.atan2(dx, dz) - walk.yaw), Math.cos(Math.atan2(dx, dz) - walk.yaw)) * (1 - Math.exp(-dt * 11))
    }
    walk.gait += moved * 3.2
    walk.moved = moved / Math.max(dt, 0.001)
    const y = world.terrain.surfaceY(walk.x, walk.z)
    player.place(walk.x, y, walk.z, walk.yaw)
    player.pose(moved > 0.002 ? 'walk' : 'idle', time, walk.gait, clamp(walk.moved / 5, 0.25, 1))
    walk.moveTimer += moved
    if (walk.moveTimer > 1.6) { walk.moveTimer = 0; fx.dust(walk.x, y, walk.z, 1) }
    game.goal.x = walk.x; game.goal.z = walk.z
    game.groundY = y + 1.5

    // Qu'y a-t-il à portée de main ?
    let near = null, best = 3.3
    for (const a of sim.agents.values()) {
      if (!a.visible) continue
      const d = Math.hypot(a.x - walk.x, a.z - walk.z)
      if (d < best) { best = d; near = {kind: 'agent', id: a.id, name: a.task?.title, status: a.status, universe: a.universe} }
    }
    const ad = Math.hypot(sim.archy.x - walk.x, sim.archy.z - walk.z)
    if (ad < best) { best = ad; near = {kind: 'agent', id: '__archy', name: 'Archy'} }
    if (!near) {
      let bb = 4.2
      for (const v of views.values()) {
        const d = Math.hypot(v.door[0] - walk.x, v.door[1] - walk.z)
        if (d < bb) { bb = d; near = {kind: 'building', id: v.id, name: v.universe.name} }
      }
      if (Math.hypot(OFFICE.door[0] - walk.x, OFFICE.door[1] - walk.z) < 4.2) near = {kind: 'office', id: '__office', name: 'Bureau du boss'}
    }
    if (!near && Math.hypot(world.cat.getPosition().x - walk.x, world.cat.getPosition().z - walk.z) < 2.6) near = {kind: 'cat', id: 'cat', name: 'le chat'}
    const key = near ? near.kind + near.id : ''
    if (key !== (walk.near ? walk.near.kind + walk.near.id : '')) { walk.near = near; emit('near', near) }
  }

  function startWalk() {
    if (walking) return
    if (selected) selectBuilding(null)
    if (selectedAgent) selectAgent(null, {restore: false})
    viewBeforeSelect = viewOfCamera()
    walking = true
    walk.x = 0; walk.z = 5.4; walk.yaw = Math.PI; walk.path = null
    player.root.enabled = true
    game.walk = true
    game.follow = null
    game.flyTo({x: walk.x, z: walk.z, dist: 18, yaw: 0, y: 0, tilt: 9}, {ms: 1100})
    game.min = 10; game.max = 34
    emit('walk', true)
  }
  function stopWalk() {
    if (!walking) return
    walking = false
    player.root.enabled = false
    game.walk = false
    game.min = 9; game.max = portrait ? 235 : 210
    walk.axis = {x: 0, y: 0}; walk.keys.clear(); walk.near = null
    emit('near', null); emit('walk', false)
    if (viewBeforeSelect) { game.flyTo(viewBeforeSelect, {ms: 1050}); viewBeforeSelect = null }
  }

  function screenRay(x, y) {
    camera.camera.screenToWorld(x, y, camera.camera.nearClip, tmp)
    camera.camera.screenToWorld(x, y, camera.camera.farClip, tmp2)
    return {o: tmp.clone(), d: tmp2.clone().sub(tmp).normalize()}
  }
  function groundAt(x, y) {
    const {o, d} = screenRay(x, y)
    if (d.y >= -0.001) return null
    const t = -o.y / d.y
    return {x: o.x + d.x * t, z: o.z + d.z * t}
  }
  /** Bâtiment sous le pointeur, testé contre une boîte orientée : large, facile à viser au doigt. */
  function pickBuilding(x, y) {
    const {o, d} = screenRay(x, y)
    let best = null, bt = Infinity
    const test = (lot, spec, id) => {
      const a = (lot.ry * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
      const ox = o.x - lot.x, oz = o.z - lot.z
      const lo = [ox * c - oz * s - (spec.centerX || 0), o.y, ox * s + oz * c - (spec.centerZ || 0)]
      const ld = [d.x * c - d.z * s, d.y, d.x * s + d.z * c]
      const min = [-spec.w / 2, 0, -spec.d / 2], max = [spec.w / 2, spec.h * 0.86, spec.d / 2]
      let t0 = 0, t1 = 1e6
      for (let i = 0; i < 3; i++) {
        const inv = 1 / (ld[i] || 1e-6), a0 = (min[i] - lo[i]) * inv, a1 = (max[i] - lo[i]) * inv
        t0 = Math.max(t0, Math.min(a0, a1)); t1 = Math.min(t1, Math.max(a0, a1))
      }
      if (t0 < t1 && t0 < bt) { bt = t0; best = id }
    }
    for (const v of views.values()) test(v.lot, v.spec, v.id)
    test(OFFICE, world.officeSpec, '__office')
    return best
  }
  function pickAgent(x, y) {
    let best = null, bd = 34
    const v = new Vec3()
    const consider = (a) => {
      if (!a.visible) return
      tmp2.set(a.x, 1.2, a.z)
      camera.camera.worldToScreen(tmp2, v)
      const d = Math.hypot(v.x - x, v.y - y)
      if (d < bd && v.z > 0) { bd = d; best = a.id }
    }
    sim.agents.forEach(consider); consider(sim.archy)
    return best
  }

  // ----------------------------------------------------------------- Entrées
  const pointers = new Map()
  let gesture = null, dragged = false, hoverAt = 0, hovered = null
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top} }
  const isHud = (t) => t.closest?.('[data-hud]')
  const onDown = (e) => {
    if (isHud(e.target)) return
    const p = pos(e)
    pointers.set(e.pointerId, p)
    dragged = false
    if (pointers.size === 1) gesture = {type: e.button === 2 || e.shiftKey ? 'rotate' : 'pan', x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), target: e.target}
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      gesture = {type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2}
      dragged = true
    }
    game.touch()
  }
  const onMove = (e) => {
    const p = pos(e)
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse' && performance.now() - hoverAt > 90 && !walking) {
        hoverAt = performance.now()
        const id = isHud(e.target) ? null : pickBuilding(p.x, p.y)
        const agent = isHud(e.target) ? null : pickAgent(p.x, p.y)
        if (id !== hovered) { hovered = id; hoverView = views.get(id) || null; refreshGlow(); emit('hover', id) }
        canvas.style.cursor = id || agent ? 'pointer' : 'grab'
      }
      return
    }
    pointers.set(e.pointerId, p)
    if (!gesture) return
    if (gesture.type === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
      game.zoom(gesture.dist / Math.max(1, d), groundAt(mx, my))
      let dA = ang - gesture.angle
      dA = Math.atan2(Math.sin(dA), Math.cos(dA))
      game.goal.yaw -= dA
      if (!walking) game.pan(mx - gesture.mx, my - gesture.my, canvas.clientHeight)
      gesture.dist = d; gesture.angle = ang; gesture.mx = mx; gesture.my = my
      return
    }
    const dx = p.x - gesture.x, dy = p.y - gesture.y
    if (!dragged && Math.hypot(p.x - gesture.sx, p.y - gesture.sy) > 7) { dragged = true; if (selectedAgent && !walking) game.follow = null }
    if (!dragged) return
    gesture.x = p.x; gesture.y = p.y
    if (walking) { game.goal.yaw -= dx * 0.008; game.touch(); return }
    if (gesture.type === 'rotate') game.rotate(dx)
    else game.pan(dx, dy, canvas.clientHeight)
  }
  const onUp = (e) => {
    const had = pointers.delete(e.pointerId)
    if (!had) return
    if (pointers.size === 0) {
      const g = gesture
      gesture = null
      if (g && !dragged && g.type !== 'pinch' && !isHud(e.target)) tap(pos(e))
    } else if (pointers.size === 1) {
      const [only] = [...pointers.values()]
      gesture = {type: 'pan', x: only.x, y: only.y, sx: only.x, sy: only.y, t: performance.now()}
      dragged = true
    }
  }
  function tap(p) {
    const agent = pickAgent(p.x, p.y)
    if (walking) {
      if (agent) { const a = agent === '__archy' ? sim.archy : sim.agents.get(agent); emit('talk', {id: agent, near: Math.hypot(a.x - walk.x, a.z - walk.z) < 5}); if (Math.hypot(a.x - walk.x, a.z - walk.z) >= 5) moveTo(a.x, a.z); return }
      const g = groundAt(p.x, p.y)
      if (g) moveTo(g.x, g.z)
      return
    }
    if (agent) { selectAgent(agent); return }
    const id = pickBuilding(p.x, p.y)
    if (id === '__office') { emit('office'); return }
    if (id) { selectBuilding(id); return }
    if (selected) selectBuilding(null)
    else if (selectedAgent) selectAgent(null)
  }
  function moveTo(x, z) {
    const far = Math.hypot(x - walk.x, z - walk.z) > 7
    walk.path = far ? plan.graph.route([walk.x, walk.z], [x, z]) : [[walk.x, walk.z], [x, z]]
    walk.len = pathLength(walk.path); walk.s = 0
  }
  const onWheel = (e) => {
    if (isHud(e.target)) return
    e.preventDefault()
    const p = pos(e)
    game.zoom(Math.exp(e.deltaY * 0.0014), walking ? null : groundAt(p.x, p.y))
  }
  const onKey = (e) => {
    const typing = e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA'
    if (typing) return
    if (e.type === 'keydown') {
      if (e.key === 'Escape') { if (walking && !selected && !selectedAgent) emit('escape'); else if (selected) selectBuilding(null); else if (selectedAgent) selectAgent(null); else emit('escape') }
      if (walking && (e.key === 'e' || e.key === 'E' || e.key === 'Enter') && e.target === document.body) emit('interact', walk.near)
      if (!walking && e.target === document.body) {
        if (e.key === 'ArrowLeft') game.pan(70, 0, canvas.clientHeight)
        if (e.key === 'ArrowRight') game.pan(-70, 0, canvas.clientHeight)
        if (e.key === 'ArrowUp') game.pan(0, 70, canvas.clientHeight)
        if (e.key === 'ArrowDown') game.pan(0, -70, canvas.clientHeight)
        if (e.key === '+' || e.key === '=') game.zoom(0.82)
        if (e.key === '-') game.zoom(1.22)
      }
    }
    if (walking && e.key.length < 12) {
      if (e.type === 'keydown') walk.keys.add(e.key); else walk.keys.delete(e.key)
      if (e.key.startsWith('Arrow')) e.preventDefault()
    }
  }
  const onBlur = () => { walk.keys.clear(); pointers.clear(); gesture = null }
  const ctx = (e) => { if (!isHud(e.target)) e.preventDefault() }
  container.addEventListener('pointerdown', onDown)
  addEventListener('pointermove', onMove)
  addEventListener('pointerup', onUp)
  addEventListener('pointercancel', onUp)
  container.addEventListener('wheel', onWheel, {passive: false})
  container.addEventListener('contextmenu', ctx)
  addEventListener('keydown', onKey)
  addEventListener('keyup', onKey)
  addEventListener('blur', onBlur)

  // ----------------------------------------------------------------- Boucle
  let catMeow = 0
  let smokeClock = 0, nature = 0, sparkleClock = 0, frameCount = 0
  const pinPos = new Vec3(), screen = new Vec3()

  function placePins() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight
    const lod = game.state.dist > (portrait ? 160 : 150) ? 'far' : game.state.dist > 62 ? 'mid' : 'near'
    if (lod !== placePins.lod) { placePins.lod = lod; container.dataset.lod = lod }
    for (const [key, el] of pins) {
      let wx, wy, wz, visible = true
      const kind = key[0]
      const id = key.slice(2)
      if (kind === 'b') {
        const v = views.get(id)
        if (!v) { el.style.display = 'none'; continue }
        wx = v.lot.x; wy = v.spec.labelY ?? (v.spec.h ?? 7) + 0.6; wz = v.lot.z
        if (selected === id) visible = false
      } else if (kind === 'a') {
        const a = id === '__archy' ? sim.archy : sim.agents.get(id)
        if (!a || !a.visible) { el.style.display = 'none'; continue }
        wx = a.x; wy = (id === '__archy' ? 2.9 : a.mode === 'seated' ? 2 : 2.75) + a.y; wz = a.z
        if (selected) visible = false
      } else if (kind === 'd') {
        const d = DISTRICTS[id]
        if (!d) continue
        wx = d.c[0]; wy = 8; wz = d.c[1]
      } else if (kind === 'o') {
        wx = 0; wy = 14.6; wz = -18.5
        if (selected) visible = false
      } else if (kind === 'r') {
        if (!interior) { el.style.display = 'none'; continue }
        const item = interior.items.find((i) => i.room.id === id)
        if (!item) { el.style.display = 'none'; continue }
        pinPos.set(item.at.x, item.at.y + RH - 0.18, 1.5)
        interior.root.getWorldTransform().transformPoint(pinPos, tmp)
        wx = tmp.x; wy = tmp.y; wz = tmp.z
      } else if (kind === 'p') {
        wx = walk.x; wy = 3; wz = walk.z
        visible = walking
      }
      pinPos.set(wx, wy, wz)
      camera.camera.worldToScreen(pinPos, screen)
      if (!visible || screen.z <= 0 || screen.x < -60 || screen.x > cw + 60 || screen.y < -30 || screen.y > ch + 60) { el.style.display = 'none'; continue }
      el.style.display = ''
      el.style.transform = `translate3d(${screen.x.toFixed(1)}px,${screen.y.toFixed(1)}px,0) translate(-50%,-100%)`
    }
  }

  app.on('update', (dt) => {
    time += dt
    frameCount++
    set('uWindTime', time)
    // Heure
    if (hourGoal !== shownHour) {
      const diff = ((hourGoal - shownHour + 36) % 24) - 12
      const stepH = Math.sign(diff) * Math.min(Math.abs(diff), dt * 8)
      shownHour = (shownHour + stepH + 24) % 24
      if (Math.abs(diff) < 0.01) shownHour = hourGoal
      refreshAmbience(false)
    } else if (time - lastAmbientRefresh > 30) {
      lastAmbientRefresh = time
      hourGoal = hourForMode()
      if (Math.abs(hourGoal - shownHour) < 0.2) { shownHour = hourGoal; refreshAmbience(false) }
    }

    // Personnages
    sim.update(dt, time)
    for (const [id, c] of characters) {
      const a = sim.agents.get(id)
      if (!a) { c.destroy(); characters.delete(id); continue }
      if (c.root.enabled !== a.visible) c.root.enabled = a.visible
    }
    for (const a of sim.agents.values()) {
      if (!a.visible) continue
      const c = characterFor(a)
      if (!c) continue
      a.y = world.terrain.surfaceY(a.x, a.z)
      const pose = Sim.poseOf(a)
      c.setCarry(a.carrying ? 'parcel' : a.status === 'waiting' && a.mode !== 'toHome' ? 'paper' : null)
      const hideForInterior = selected === a.universe && Math.hypot(a.x - views.get(a.universe).lot.x, a.z - views.get(a.universe).lot.z) < 14
      if (c.root.enabled === hideForInterior) c.root.enabled = !hideForInterior
      c.place(a.x, a.y, a.z, a.yaw)
      c.pose(pose, time + a.phase * 10, a.gait, Math.min(1, a.pace * 0.9))
      if (pose === 'sit') c.root.setLocalPosition(a.x, a.y + 0.2, a.z)
    }
    // Archy flotte et laisse une traînée d'étincelles.
    const ar = sim.archy
    ar.y = world.terrain.surfaceY(ar.x, ar.z) + 0.75 + Math.sin(time * 2.1) * 0.13
    archy.entity.setLocalPosition(ar.x, ar.y, ar.z)
    archy.entity.setLocalEulerAngles(Math.min(14, ar.path ? 14 : 0), (ar.yaw * 180) / Math.PI, Math.sin(time * 1.3) * 4)
    archyShadow.setLocalPosition(ar.x, world.terrain.surfaceY(ar.x, ar.z) + 0.03, ar.z)
    sparkleClock += dt
    if (sparkleClock > (ar.path ? 0.08 : 0.5)) { sparkleClock = 0; fx.sparkle(ar.x, ar.y + 0.8, ar.z) }

    if (interior) {
      interior.t += dt
      const v = views.get(interior.id)
      if (v) {
        const out = clamp(interior.t / 0.26, 0, 1)
        v.entity.setLocalScale(1 - out * 0.08, Math.max(0.0001, 1 - out), 1 - out * 0.08)
        if (out >= 1) v.entity.enabled = false
      }
      for (const it of interior.items) {
        const k = clamp((interior.t - it.delay) / 0.5, 0, 1)
        it.entity.setLocalScale(1, Math.max(0.001, outBack(k)), 1)
      }
      const ks = clamp((interior.t - 0.1) / 0.6, 0, 1)
      interior.shell.setLocalScale(1, Math.max(0.001, outBack(ks)), 1)
      interior.workers.forEach((w) => w.c.pose(w.pose, time + w.seed, 0, 1))
    }
    for (const v of views.values()) {
      if (selected !== v.id && v.entity.enabled && v.entity.getLocalScale().y !== 1) {
        const y = v.entity.getLocalScale().y
        const ny = Math.min(1, y + dt * 3.4)
        v.entity.setLocalScale(1, ny, 1)
      } else if (selected !== v.id && !v.entity.enabled) { v.entity.enabled = true; v.entity.setLocalScale(1, 0.02, 1) }
      if (v.parts.dome && v.active) v.parts.dome.setLocalEulerAngles(0, time * 7, 0)
    }

    // Le large : le voilier fait le tour de l'île, les goélands tournent autour du phare.
    const sail = time * 0.012 + 1
    world.sailboat.setPosition(-6 + Math.cos(sail) * 92, -0.5 + Math.sin(time * 0.9) * 0.05, -4 + Math.sin(sail) * 78)
    world.sailboat.setEulerAngles(Math.sin(time * 0.7) * 2.2, (-sail * 180) / Math.PI, Math.sin(time * 0.5) * 3)
    world.gulls.forEach((g, i) => {
      const a = time * (0.22 + i * 0.015) + i * 0.9, r = 9 + (i % 3) * 3.4
      g.setPosition(47.5 + Math.cos(a) * r, 13 + i * 0.7 + Math.sin(time * 0.6 + i) * 0.7, 20 + Math.sin(a) * r)
      g.setEulerAngles(0, (-a * 180) / Math.PI, 22)
    })
    if (catMeow > 0) {
      catMeow -= dt
      world.cat.setLocalScale(1, 1 + Math.abs(Math.sin(catMeow * 9)) * 0.14, 1)
      if (catMeow <= 0) world.cat.setLocalScale(1, 1, 1)
    } else world.cat.setLocalScale(1, 1 + Math.sin(time * 1.2) * 0.022, 1)

    // Sur batterie, une image sur deux quand rien ne bouge : on peut laisser le village ouvert.
    const idle = performance.now() - game.lastInput > 25000 && !walking && quality.tier === 'low' && !game.flight
    app.autoRender = !idle
    if (idle) app.renderNextFrame = frameCount % 2 === 0

    // Fumée : elle ne sort que des cheminées où une tâche avance vraiment.
    smokeClock += dt
    if (smokeClock > 0.58 / quality.particles) {
      smokeClock = 0
      for (const v of views.values()) {
        if (v.chimney && v.active && selected !== v.id) fx.smoke(v.chimney.x, v.chimney.y, v.chimney.z, {night: amb.isNight})
        if (v.blocked) fx.ember(v.door[0], 2.3, v.door[1])
        if (v.beacon && v.active && Math.sin(time * 3) > 0.2) fx.sparkle(v.beacon.x, v.beacon.y, v.beacon.z, '#ff3b30')
      }
    }
    nature += dt
    if (nature > 0.16 / quality.particles) {
      nature = 0
      // Fontaine, lucioles près de l'eau la nuit
      const a = Math.random() * 6.283
      fx.alpha.emit({x: 0, y: 3.55, z: 0, vx: Math.cos(a) * 0.75, vy: 1.05, vz: Math.sin(a) * 0.75, ttl: 0.95, size: 0.06, grow: 0, alpha: 0.75, r: 0.82, g: 0.95, b: 1, gravity: 4.2})
      if (amb.lamps > 0.5 && Math.random() < 0.3) {
        const pts = plan.river.path, p = pts[Math.floor(Math.random() * pts.length)]
        fx.firefly(p[0] + (Math.random() - 0.5) * 8, 0.6 + Math.random() * 1.5, p[1] + (Math.random() - 0.5) * 8)
      }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]
      if (time >= r.at) {
        if (!r.fired) { fx.rocket(r.x, r.y, r.z, r.c); r.fired = time + 0.68 }
        if (time >= r.fired) { fx.firework(r.x, r.y + 7, r.z, r.c); rockets.splice(i, 1) }
      }
    }

    // Horloge de la mairie : à l'heure réelle.
    const hRad = hourForMode() % 12
    const parts = world.officeParts
    if (parts.clockHour) parts.clockHour.setLocalEulerAngles(0, 0, -(hRad / 12) * 360)
    if (parts.clockMinute) parts.clockMinute.setLocalEulerAngles(0, 0, -((hRad % 1) * 360))

    if (walking) updateWalk(dt)
    game.update(dt)
    fx.update(dt, camera)
    placePins()
    if (frameCount === 3) emit('ready')
    if (frameCount % 30 === 0) emit('stats', {fps: app.stats.frame.fps, draw: app.stats.drawCalls?.total, tris: app.stats.frame.triangles})
  })

  refreshAmbience(true)
  app.start()
  onProgress(1, 'Bienvenue')

  const api = {
    app, world, sim, game, camera, frame, fx, views,
    setData(d, now = Date.now()) {
      data = d
      syncBuildings(d, now)
      sim.sync(d, now)
      refreshGlow()
      if (selected) {
        if (!views.has(selected)) selectBuilding(null)
        else {
          // Les pièces reflètent les nouveaux statuts sans refaire voler la caméra.
          openInterior(selected)
          if (interior) { interior.t = 10 }
        }
      }
      world.sun.light.shadowUpdateMode = SHADOWUPDATE_THISFRAME
    },
    select: selectBuilding,
    selectAgent,
    flyToDistrict,
    setLens(status) { lens = status; refreshGlow() },
    setInsets: (i) => game.setInsets(i),
    startWalk, stopWalk,
    setAxis(x, y) { walk.axis = {x, y} },
    walkTo: moveTo,
    petCat() {
      catMeow = 1.3
      const p = world.cat.getPosition()
      for (let i = 0; i < 6; i++) fx.sparkle(p.x, p.y + 0.8, p.z, '#ff9fb0')
    },
    setObjective(id) { walk.objective = id },
    agentPosition(id) { const a = id === '__archy' ? sim.archy : sim.agents.get(id); return a ? {x: a.x, z: a.z} : null },
    playerPosition() { return {x: walk.x, z: walk.z, yaw: walk.yaw} },
    groundPoint: groundAt,
    setTimeMode(mode) {
      timeMode = mode
      try { localStorage.setItem('archy-time', mode) } catch {}
      hourGoal = hourForMode()
      if (reduced) { shownHour = hourGoal; refreshAmbience(true) } else emit('ambience', {name: amb.name, hour: shownHour, mode, night: amb.isNight})
    },
    trackPin(key, el) { if (el) pins.set(key, el); else pins.delete(key) },
    zoom(f) { game.zoom(f) },
    home() { flyToDistrict(null) },
    rotate(dAngle) { game.goal.yaw += dAngle; game.touch() },
    destroy() {
      removeEventListener('resize', resize)
      container.removeEventListener('pointerdown', onDown)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onUp)
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('contextmenu', ctx)
      removeEventListener('keydown', onKey)
      removeEventListener('keyup', onKey)
      removeEventListener('blur', onBlur)
      frame.destroy()
      app.destroy()
    },
  }
  if (params.has('debug')) window.__village = api
  return api
}
