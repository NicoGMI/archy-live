// Assemble le monde statique : relief, mer, ciel, décor et bâtiments. Tout est cuit au démarrage,
// par petites étapes pour que l'écran de chargement reste vivant.
import {ADDRESS_CLAMP_TO_EDGE, BLEND_ADDITIVE, Color, Entity, FILTER_LINEAR, FILTER_LINEAR_MIPMAP_LINEAR, FOG_LINEAR, PIXELFORMAT_RGBA8, SHADOWUPDATE_THISFRAME, StandardMaterial, Texture, LIGHTFALLOFF_INVERSESQUARED} from 'playcanvas'
import {addMesh, aimLight, canvasTexture, createSea, createSky, createSun, bulbMaterial, glassMaterial, litMaterial, meshFrom, sunDirection, windMaterial} from './render.js'
import {OFFICE, buildPlan} from './plan.js'
import {makeTerrain} from './terrain.js'
import {paintGround, shoreTexturePixels, terrainArrays} from './ground.js'
import {buildScenery, catKit, fountainKit, fountainWaterKit, gullKit, sailboatKit} from './scenery.js'
import {archetypeSpec, townHall} from './buildings.js'
import {Kit, linear} from './meshkit.js'

const tick = () => new Promise((r) => setTimeout(r, 0))

export const STATUS_GLOW = {
  active: '#ffc55c', waiting: '#ff9f2e', blocked: '#ff4436', scheduled: '#5aa7ff', queued: '#7c7566', done: '#9fd98a', off: '#0e1418',
}

export async function buildWorld(app, quality, onProgress = () => {}) {
  const device = app.graphicsDevice
  const root = new Entity('world')
  app.root.addChild(root)

  const plan = buildPlan()
  onProgress(0.08, 'On trace les rues')
  await tick()
  const terrain = makeTerrain(plan, {size: 260, cell: 1})
  onProgress(0.2, 'On sculpte la colline')
  await tick()

  // Spécifications de bâtiments connues d'avance : le sol et le décor en ont besoin pour s'écarter.
  const lotsWithSpec = {}
  for (const [id, lot] of Object.entries(plan.lots)) lotsWithSpec[id] = {...lot, spec: archetypeSpec(lot.type, id)}
  const officeSpec = townHall()
  lotsWithSpec.__office = {...OFFICE, spec: officeSpec}
  onProgress(0.3, 'On pose les charpentes')
  await tick()

  const groundCanvas = paintGround(plan, terrain, lotsWithSpec, {size: quality.ground, detail: quality.tier === 'high' ? 1 : 0.6})
  const groundTex = canvasTexture(device, groundCanvas, {anisotropy: quality.tier === 'high' ? 8 : 4})
  onProgress(0.5, 'On peint les chemins')
  await tick()

  const groundMat = new StandardMaterial()
  groundMat.diffuse = new Color(1, 1, 1)
  groundMat.diffuseMap = groundTex
  groundMat.diffuseVertexColor = true
  groundMat.diffuseVertexColorChannel = 'rgb'
  groundMat.specular = new Color(0.02, 0.02, 0.02)
  groundMat.gloss = 0.2
  groundMat.useSkybox = false
  groundMat.update()
  const ta = terrainArrays(terrain)
  const groundMesh = meshFrom(device, ta, {indices: ta.indices})
  addMesh(root, groundMesh, groundMat, {name: 'terrain', shadows: true})

  const shorePixels = shoreTexturePixels(terrain, 256)
  const sea = createSea(app, shorePixels, 256, terrain.size)
  const sky = createSky(app)
  onProgress(0.58, 'On remplit la mer')
  await tick()

  const lit = litMaterial()
  const wind = windMaterial()
  const glass = glassMaterial()
  const bulbs = bulbMaterial()

  const scenery = buildScenery(plan, terrain, {lots: lotsWithSpec, density: quality.density})
  for (const kit of scenery.wind.values()) if (kit.vertexCount) addMesh(root, meshFrom(device, kit.arrays()), wind, {name: 'foliage'})
  for (const kit of scenery.still.values()) if (kit.vertexCount) addMesh(root, meshFrom(device, kit.arrays()), lit, {name: 'props'})
  addMesh(root, meshFrom(device, fountainKit().arrays()), lit, {name: 'fountain'})
  const waterMat = litMaterial({gloss: 0.8, specular: new Color(0.5, 0.6, 0.6), emissive: new Color(0.12, 0.36, 0.4)})
  addMesh(root, meshFrom(device, fountainWaterKit().arrays()), waterMat, {name: 'fountain-water', shadows: false})
  onProgress(0.74, 'On plante les arbres')
  await tick()

  const cat = addMesh(root, meshFrom(device, catKit().arrays()), lit, {name: 'cat', shadows: false})
  cat.setPosition(5.6, 0, 4.6)
  const sailboat = addMesh(root, meshFrom(device, sailboatKit().arrays()), lit, {name: 'sailboat'})
  const gullMesh = meshFrom(device, gullKit().arrays())
  const gulls = Array.from({length: quality.tier === 'high' ? 7 : 4}, (_, i) => addMesh(root, gullMesh, lit, {name: 'gull' + i, shadows: false}))

  const allBulbs = new Kit({ao: false, jitter: 0})
  allBulbs.merge(scenery.bulbs)

  // Bureau du boss
  const office = new Entity('office')
  office.setPosition(OFFICE.x, 0, OFFICE.z)
  root.addChild(office)
  const officeMesh = addMesh(office, meshFrom(device, officeSpec.kit.arrays()), lit, {name: 'townhall'})
  allBulbs.at({at: [OFFICE.x, 0, OFFICE.z]}, () => allBulbs.merge(officeSpec.bulbs))
  const officeParts = {}
  for (const part of officeSpec.parts) {
    const e = addMesh(office, meshFrom(device, part.kit.arrays()), lit, {name: part.name, shadows: false})
    e.setLocalPosition(part.pivot[0], part.pivot[1], part.pivot[2])
    officeParts[part.name] = e
  }
  const officeGlass = addGlass(device, office, officeSpec.slots, glass)
  onProgress(0.86, 'On allume les lanternes')
  await tick()

  // Halos au sol : tous les lampadaires du village pour un seul draw call, sans calcul de lumière.
  const pools = createLightPools(device, root, scenery.lights)

  const lampLights = []
  const lightPoints = [...scenery.lights].filter((p) => Math.hypot(p[0], p[2]) < 16).slice(0, quality.lights)
  for (const p of lightPoints) {
    const e = new Entity('lamp-light')
    e.addComponent('light', {type: 'omni', color: new Color(1, 0.74, 0.42), intensity: 0, range: 8, falloffMode: LIGHTFALLOFF_INVERSESQUARED, castShadows: false})
    e.setPosition(p[0], p[1], p[2])
    root.addChild(e)
    lampLights.push(e)
  }
  const sun = createSun(app, quality)
  onProgress(0.94, 'On réveille le village')
  await tick()

  const world = {
    app, root, plan, terrain, sea, sky, sun, lit, wind, glass, bulbs, office, officeSpec, officeMesh, officeParts, officeGlass,
    scenery, allBulbs, lampLights, buildings: new Map(), quality, device, waterMat, pools, cat, sailboat, gulls,
  }
  world.bulbEntity = null
  return world
}

function poolQuads(points) {
  const positions = [], uvs = [], colors = [], indices = []
  points.forEach(({x, z, y = 0.1, r, color}, i) => {
    const base = i * 4
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) {
      positions.push(x + sx * r, y, z + sz * r)
      uvs.push((sx + 1) / 2, (sz + 1) / 2)
      colors.push(color[0], color[1], color[2], 1)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  })
  return {positions: new Float32Array(positions), uvs: new Float32Array(uvs), colors: new Float32Array(colors), indices: new Uint16Array(indices), normals: new Float32Array(positions.length).map((_, i) => (i % 3 === 1 ? 1 : 0))}
}

function poolTexture(device) {
  const size = 64, px = new Uint8Array(size * size * 4)
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.min(1, Math.hypot(i - 31.5, j - 31.5) / 31.5), v = (1 - d) * (1 - d)
    const o = (j * size + i) * 4
    px[o] = px[o + 1] = px[o + 2] = Math.round(255 * v); px[o + 3] = 255
  }
  const t = new Texture(device, {width: size, height: size, format: PIXELFORMAT_RGBA8, mipmaps: true, minFilter: FILTER_LINEAR_MIPMAP_LINEAR, magFilter: FILTER_LINEAR, addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE})
  t.lock().set(px); t.unlock()
  return t
}

function poolMaterial(device) {
  const m = new StandardMaterial()
  m.diffuse = new Color(0, 0, 0); m.specular = new Color(0, 0, 0); m.useSkybox = false; m.useLighting = false; m.useFog = false
  m.emissive = new Color(1, 1, 1); m.emissiveMap = poolTexture(device); m.emissiveVertexColor = true; m.emissiveVertexColorChannel = 'rgb'
  m.blendType = BLEND_ADDITIVE; m.depthWrite = false
  m.update()
  return m
}

function createLightPools(device, root, lights) {
  const warm = linear('#b5763a')
  const a = poolQuads(lights.filter((p) => p[1] < 5).map((p) => ({x: p[0], z: p[2], r: 5.2, color: warm})))
  const material = poolMaterial(device)
  const entity = addMesh(root, meshFrom(device, a, {indices: a.indices}), material, {name: 'light-pools', shadows: false, receive: false})
  entity.render.meshInstances[0].drawOrder = 5
  return {entity, material}
}

/** Halo devant chaque porte la nuit : chaud si on y travaille, rouge si c'est bloqué. Une maison au repos reste sombre. */
export function setDoorPools(world, doors) {
  const a = poolQuads(doors.length ? doors : [{x: 0, z: 0, r: 0.01, color: [0, 0, 0]}])
  const mesh = meshFrom(world.device, a, {indices: a.indices})
  if (!world.doorPools) {
    const material = poolMaterial(world.device)
    const entity = addMesh(world.root, mesh, material, {name: 'door-pools', shadows: false, receive: false})
    world.doorPools = {entity, material}
  } else {
    world.doorPools.entity.render.meshInstances[0].mesh = mesh
  }
}

/** Maillage des vitres : une couleur par fenêtre, donc reconstruit seulement quand les tâches changent. */
export function glassKit(slots, statuses) {
  const k = new Kit({ao: false, jitter: 0})
  slots.forEach((s, i) => {
    const color = linear(STATUS_GLOW[statuses[i] || 'off'])
    const [a, b, c, d] = s.corners
    k.tri(a, b, c, color); k.tri(a, c, d, color)
  })
  return k
}

export function addGlass(device, parent, slots, material, statuses = []) {
  if (!slots.length) return null
  const entity = addMesh(parent, meshFrom(device, glassKit(slots, statuses).arrays()), material, {name: 'glass', shadows: false, receive: false})
  return entity
}

export function setGlass(device, entity, slots, material, statuses) {
  if (!entity) return
  const mesh = meshFrom(device, glassKit(slots, statuses).arrays())
  // Le setter gère le compteur de références de l'ancien maillage, qui se libère tout seul.
  entity.render.meshInstances[0].mesh = mesh
}

/** Tâches → fenêtres : les plus urgentes d'abord, sur les fenêtres de façade d'abord. */
export function windowStatuses(slots, tasks, ORD) {
  const order = slots.map((s, i) => ({i, p: s.priority ?? 1})).sort((a, b) => a.p - b.p || a.i - b.i)
  const sorted = [...tasks].sort((a, b) => (ORD[a.status] ?? 9) - (ORD[b.status] ?? 9))
  const out = new Array(slots.length).fill('off')
  sorted.slice(0, slots.length).forEach((t, k) => { out[order[k].i] = t.status })
  return out
}

/** Met le monde à l'heure : soleil, ambiance, mer, lampes, vitres. */
export function applyAmbience(world, amb, set, cameraEntity, {updateShadows}) {
  const {sun, app, glass, bulbs, lampLights} = world
  const dir = sunDirection(amb)
  aimLight(sun, dir)
  sun.light.color = new Color(amb.sunColor[0] ** (1 / 2.2), amb.sunColor[1] ** (1 / 2.2), amb.sunColor[2] ** (1 / 2.2))
  sun.light.intensity = amb.sunIntensity * 0.62
  set('uAmbientSky', amb.ambientSky.map((v) => v * 0.78))
  set('uAmbientGround', amb.ambientGround.map((v) => v * 0.78))
  set('uSkyTop', amb.skyTop)
  set('uSkyHorizon', amb.skyHorizon)
  set('uSkyHorizonSea', amb.skyHorizon)
  set('uSunDir', [dir.x, dir.y, dir.z])
  set('uSunColor', amb.sunColor)
  set('uStars', amb.stars)
  set('uSeaDeep', amb.seaDeep)
  set('uSeaShallow', amb.seaShallow)
  const scene = app.scene
  scene.fog.type = FOG_LINEAR
  scene.fog.color = new Color(amb.skyHorizon[0] ** (1 / 2.2), amb.skyHorizon[1] ** (1 / 2.2), amb.skyHorizon[2] ** (1 / 2.2))
  scene.fog.start = 210
  scene.fog.end = 560
  scene.exposure = amb.exposure
  glass.emissiveIntensity = amb.glow * 1.25
  glass.update()
  bulbs.emissiveIntensity = 0.3 + amb.lamps * 3.6
  bulbs.update()
  for (const l of lampLights) { l.light.intensity = amb.lamps * 1.6; l.enabled = amb.lamps > 0.02 }
  world.pools.material.emissiveIntensity = amb.lamps
  world.pools.material.update()
  world.pools.entity.enabled = amb.lamps > 0.02
  if (world.doorPools) { world.doorPools.material.emissiveIntensity = Math.max(amb.lamps, 0.02); world.doorPools.material.update(); world.doorPools.entity.enabled = amb.lamps > 0.02 }
  if (updateShadows) sun.light.shadowUpdateMode = SHADOWUPDATE_THISFRAME
}

