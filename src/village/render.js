// Tout ce qui touche au moteur PlayCanvas côté rendu : matériaux, shaders stylisés, ciel, mer.
import {
  Application, CULLFACE_FRONT, CameraFrame, Color, DEVICETYPE_WEBGL2, Entity,
  Mesh, MeshInstance, PIXELFORMAT_RGBA8, PIXELFORMAT_SRGBA8, PRIMITIVE_TRIANGLES, PlaneGeometry, Quat, SHADERLANGUAGE_GLSL, SHADOWUPDATE_THISFRAME,
  SHADOW_PCF3_32F, SSAOTYPE_COMBINE, ShaderChunks, SphereGeometry, StandardMaterial, TONEMAP_NEUTRAL, Texture, Vec2, Vec3, ADDRESS_CLAMP_TO_EDGE, FILTER_LINEAR, FILTER_LINEAR_MIPMAP_LINEAR, SEMANTIC_COLOR, TYPE_FLOAT32,
} from 'playcanvas'

const CHUNK_VERSION = '2.23'

/** Détermine le niveau de qualité une seule fois, au démarrage. `?quality=low|high` force le choix. */
export function detectQuality() {
  const params = new URLSearchParams(location.search)
  const forced = params.get('quality')
  const coarse = matchMedia('(pointer: coarse)').matches
  const small = Math.min(innerWidth, innerHeight) < 700
  const cores = navigator.hardwareConcurrency || 4
  const low = forced ? forced === 'low' : (coarse && small) || cores <= 4
  return low
    ? {tier: 'low', dpr: Math.min(devicePixelRatio, 1.6), shadow: 2048, ground: 2048, density: 0.6, samples: 1, ssao: false, particles: 0.55, lights: 5}
    : {tier: 'high', dpr: Math.min(devicePixelRatio, 2), shadow: 4096, ground: 2048, density: 1, samples: 4, ssao: true, particles: 1, lights: 14}
}

export function createApp(canvas) {
  const app = new Application(canvas, {
    graphicsDeviceOptions: {deviceTypes: [DEVICETYPE_WEBGL2], antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false},
  })
  // Éclairage d'ambiance à deux couleurs (ciel / sol) : c'est lui qui donne le modelé doux de la miniature.
  ShaderChunks.get(app.graphicsDevice, SHADERLANGUAGE_GLSL).set('ambientPS', `
    uniform vec3 uAmbientSky;
    uniform vec3 uAmbientGround;
    void addAmbient(vec3 worldNormal) {
      float k = worldNormal.y * 0.5 + 0.5;
      dDiffuseLight += mix(uAmbientGround, uAmbientSky, k * k * (3.0 - 2.0 * k));
    }
  `)
  ShaderChunks.get(app.graphicsDevice, SHADERLANGUAGE_GLSL).version = CHUNK_VERSION
  return app
}

export const uniforms = (device) => {
  const scope = device.scope
  const cache = new Map()
  return (name, value) => { if (!cache.has(name)) cache.set(name, scope.resolve(name)); cache.get(name).setValue(value) }
}

export function meshFrom(device, a, {indices} = {}) {
  const mesh = new Mesh(device)
  mesh.setPositions(a.positions)
  mesh.setNormals(a.normals)
  mesh.setVertexStream(SEMANTIC_COLOR, a.colors, 4, undefined, TYPE_FLOAT32)
  if (a.uvs) mesh.setUvs(0, a.uvs)
  if (indices) mesh.setIndices(indices)
  mesh.update(PRIMITIVE_TRIANGLES)
  return mesh
}

export function addMesh(parent, mesh, material, {shadows = true, receive = true, name = 'mesh', layers} = {}) {
  const entity = new Entity(name)
  entity.addComponent('render', {meshInstances: [new MeshInstance(mesh, material)], castShadows: shadows, receiveShadows: receive, ...(layers ? {layers} : {})})
  parent.addChild(entity)
  return entity
}

export function litMaterial(extra = {}) {
  const m = new StandardMaterial()
  m.diffuse = new Color(1, 1, 1)
  m.diffuseVertexColor = true
  m.diffuseVertexColorChannel = 'rgb'
  m.useMetalness = false
  m.specular = new Color(0.03, 0.03, 0.03)
  m.gloss = 0.28
  m.useSkybox = false
  m.useFog = true
  Object.assign(m, extra)
  m.update()
  return m
}

const setChunk = (material, name, source) => {
  material.shaderChunksVersion = CHUNK_VERSION
  material.getShaderChunks(SHADERLANGUAGE_GLSL).set(name, source)
}

/** Feuillage : même matériau, plus une ondulation dans le vertex shader, proportionnelle à la hauteur. */
export function windMaterial() {
  const m = litMaterial()
  setChunk(m, 'transformCoreVS', TRANSFORM_CORE_WIND)
  m.update()
  return m
}

const TRANSFORM_CORE_WIND = `
attribute vec4 vertex_position;
uniform mat4 matrix_viewProjection;
uniform mat4 matrix_model;
uniform float uWindTime;
mat4 getModelMatrix() { return matrix_model; }
vec3 getLocalPosition(vec3 vertexPosition) {
  vec3 p = vertexPosition;
  float h = max(p.y, 0.0);
  float bend = h * h * 0.0052;
  float phase = p.x * 0.34 + p.z * 0.27;
  p.x += bend * (sin(uWindTime * 1.05 + phase) + 0.45 * sin(uWindTime * 2.4 + phase * 2.3));
  p.z += bend * 0.7 * cos(uWindTime * 0.86 + phase * 1.2);
  return p;
}
`

export function glassMaterial() {
  const m = new StandardMaterial()
  m.diffuse = new Color(0.12, 0.2, 0.28)
  m.useMetalness = false
  m.specular = new Color(0.5, 0.55, 0.6)
  m.gloss = 0.82
  m.useSkybox = false
  m.emissive = new Color(1, 1, 1)
  m.emissiveVertexColor = true
  m.emissiveVertexColorChannel = 'rgb'
  m.emissiveIntensity = 1
  m.update()
  return m
}

export function bulbMaterial() {
  const m = new StandardMaterial()
  m.diffuse = new Color(0, 0, 0)
  m.specular = new Color(0, 0, 0)
  m.useSkybox = false
  m.useLighting = false
  m.emissive = new Color(1, 1, 1)
  m.emissiveVertexColor = true
  m.emissiveVertexColorChannel = 'rgb'
  m.emissiveIntensity = 0.4
  m.update()
  return m
}

/** Ciel en dégradé avec halo solaire et étoiles : une sphère retournée, sans texture. */
export function createSky(app) {
  const m = new StandardMaterial()
  m.diffuse = new Color(0, 0, 0); m.specular = new Color(0, 0, 0)
  m.useSkybox = false; m.useFog = false; m.useLighting = false
  m.emissive = new Color(1, 1, 1)
  m.depthWrite = false
  m.cull = CULLFACE_FRONT
  setChunk(m, 'emissivePS', `
    uniform vec3 uSkyTop;
    uniform vec3 uSkyHorizon;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform float uStars;
    uniform float uWindTime;
    float starHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    void getEmission() {
      vec3 d = normalize(vPositionW - view_position);
      float t = clamp(d.y * 1.5, 0.0, 1.0);
      vec3 c = mix(uSkyHorizon, uSkyTop, pow(t, 0.62));
      float s = max(dot(d, uSunDir), 0.0);
      c += uSunColor * (pow(s, 900.0) * 7.0 + pow(s, 60.0) * 0.5 + pow(s, 7.0) * 0.16);
      if (uStars > 0.01 && d.y > 0.0) {
        vec3 cell = floor(d * 170.0);
        float h = starHash(cell);
        float star = step(0.9965, h) * smoothstep(0.6, 0.0, length(fract(d * 170.0) - 0.5));
        c += vec3(1.0, 0.95, 0.82) * star * uStars * (0.6 + 0.4 * sin(h * 900.0 + uWindTime * 2.0));
      }
      dEmission = c;
    }
  `)
  m.update()
  const mesh = Mesh.fromGeometry(app.graphicsDevice, new SphereGeometry({radius: 1, latitudeBands: 24, longitudeBands: 32}))
  const entity = new Entity('sky')
  entity.addComponent('render', {meshInstances: [new MeshInstance(mesh, m)], castShadows: false, receiveShadows: false})
  entity.setLocalScale(620, 620, 620)
  app.root.addChild(entity)
  return entity
}

/** Mer stylisée : bancs de sable clairs, rubans d'écume qui battent la côte, reflet du soleil. */
export function createSea(app, shorePixels, shoreSize, worldSize) {
  const device = app.graphicsDevice
  const tex = new Texture(device, {width: shoreSize, height: shoreSize, format: PIXELFORMAT_RGBA8, mipmaps: false, minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR, addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE, flipY: false, name: 'shore'})
  tex.lock().set(shorePixels); tex.unlock()
  const m = new StandardMaterial()
  m.diffuse = new Color(0, 0, 0); m.specular = new Color(0, 0, 0)
  m.useSkybox = false; m.useLighting = true; m.useFog = true
  m.emissive = new Color(1, 1, 1)
  setChunk(m, 'emissivePS', `
    uniform sampler2D uShore;
    uniform vec3 uSeaDeep;
    uniform vec3 uSeaShallow;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform float uWindTime;
    uniform float uWorldSize;
    uniform vec3 uSkyHorizonSea;
    float seaNoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
      float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
      float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    void getEmission() {
      vec2 p = vPositionW.xz;
      float t = uWindTime;
      float seabed = texture2D(uShore, (p + uWorldSize * 0.5) / uWorldSize).r * 8.0 - 6.0;
      float depth = clamp((-0.5 - seabed) / 3.4, 0.0, 1.0);
      float n1 = seaNoise(p * 0.28 + vec2(t * 0.12, t * 0.07));
      float n2 = seaNoise(p * 0.73 - vec2(t * 0.16, -t * 0.1));
      float ripple = n1 * 0.6 + n2 * 0.4;
      vec3 c = mix(uSeaShallow, uSeaDeep, smoothstep(0.0, 0.85, depth + (ripple - 0.5) * 0.14));
      // Crêtes de vagues peintes
      float crest = smoothstep(0.66, 0.74, n1 * 0.55 + n2 * 0.5) * (0.35 + depth * 0.25);
      c += vec3(0.11, 0.14, 0.13) * crest;
      // Écume qui avance et recule le long du rivage
      float pulse = sin(t * 0.8 + p.x * 0.05 + p.y * 0.07);
      float edge = 1.0 - smoothstep(0.0, 0.05 + 0.025 * pulse + 0.04 * ripple, depth);
      float band = sin(depth * 34.0 - t * 1.05 + (ripple - 0.5) * 3.0);
      float lines = smoothstep(0.78, 0.97, band) * (1.0 - smoothstep(0.05, 0.3, depth)) * smoothstep(0.32, 0.6, ripple);
      float foam = clamp(edge + lines, 0.0, 1.0);
      c = mix(c, vec3(0.95, 0.93, 0.84), foam * 0.92);
      // Reflet du soleil
      vec3 v = normalize(view_position - vPositionW);
      vec3 n = normalize(vec3((n1 - 0.5) * 0.14 + (n2 - 0.5) * 0.08, 1.0, (n2 - 0.5) * 0.14));
      vec3 h = normalize(v + uSunDir);
      float spec = pow(max(dot(n, h), 0.0), 170.0);
      float fres = pow(1.0 - max(v.y, 0.0), 3.0);
      c += uSunColor * spec * 2.3;
      c = mix(c, uSkyHorizonSea, fres * 0.28);
      dEmission = c;
    }
  `)
  m.update()
  m.setParameter('uShore', tex)
  m.setParameter('uWorldSize', worldSize)
  const mesh = Mesh.fromGeometry(device, new PlaneGeometry({halfExtents: new Vec2(0.5, 0.5), widthSegments: 1, lengthSegments: 1}))
  const entity = new Entity('sea')
  entity.addComponent('render', {meshInstances: [new MeshInstance(mesh, m)], castShadows: false, receiveShadows: false})
  entity.setPosition(0, -0.5, 0)
  entity.setLocalScale(1500, 1, 1500)
  app.root.addChild(entity)
  return {entity, material: m, texture: tex}
}

export function createSun(app, quality) {
  const sun = new Entity('sun')
  sun.addComponent('light', {
    type: 'directional',
    color: new Color(1, 0.9, 0.75),
    intensity: 2.5,
    castShadows: true,
    shadowType: SHADOW_PCF3_32F,
    shadowResolution: quality.shadow,
    shadowDistance: 240,
    shadowBias: 0.14,
    normalOffsetBias: 0.06,
    shadowIntensity: 0.82,
    numCascades: 1,
    shadowUpdateMode: SHADOWUPDATE_THISFRAME,
    affectDynamic: true,
    affectLightmapped: false,
  })
  app.root.addChild(sun)
  return sun
}

const UP = new Vec3(0, 1, 0)
const tmp = new Vec3()
const tmpQuat = new Quat()
export function sunDirection(amb, out = new Vec3()) {
  const el = (amb.elevation * Math.PI) / 180, az = (amb.azimuth * Math.PI) / 180
  return out.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize()
}
/** Oriente la lumière pour qu'elle brille depuis `dir` : l'axe local -Y regarde vers le sol. */
export function aimLight(light, dir) {
  tmp.copy(dir)
  tmpQuat.setFromDirections(UP, tmp)
  light.setRotation(tmpQuat)
}

export function createCameraFrame(app, cameraEntity, quality) {
  const frame = new CameraFrame(app, cameraEntity.camera)
  frame.rendering.toneMapping = TONEMAP_NEUTRAL
  frame.rendering.samples = quality.samples
  frame.rendering.sharpness = quality.tier === 'high' ? 0.25 : 0
  frame.bloom.intensity = quality.tier === 'high' ? 0.028 : 0.018
  frame.bloom.blurLevel = quality.tier === 'high' ? 14 : 9
  frame.bloom.threshold = 1.0
  frame.vignette.intensity = 0.3
  frame.vignette.inner = 0.72
  frame.vignette.outer = 1.4
  frame.vignette.curvature = 0.6
  frame.vignette.color = new Color(0.17, 0.08, 0.1)
  frame.grading.enabled = true
  frame.grading.saturation = 1.1
  frame.grading.contrast = 1.05
  frame.grading.brightness = 1.03
  frame.grading.tint = new Color(1, 0.985, 0.95)
  if (quality.ssao) {
    frame.ssao.type = SSAOTYPE_COMBINE
    frame.ssao.intensity = 0.42
    frame.ssao.radius = 2.6
    frame.ssao.samples = 10
    frame.ssao.power = 2.2
    frame.ssao.minAngle = 16
    frame.ssao.scale = 0.75
    frame.ssao.blurEnabled = true
  }
  frame.update()
  return frame
}

export function canvasTexture(device, canvas, {mipmaps = true, anisotropy = 8, srgb = true} = {}) {
  const t = new Texture(device, {name: 'canvas', width: canvas.width, height: canvas.height, format: srgb ? PIXELFORMAT_SRGBA8 : PIXELFORMAT_RGBA8, mipmaps, minFilter: mipmaps ? FILTER_LINEAR_MIPMAP_LINEAR : FILTER_LINEAR, magFilter: FILTER_LINEAR, addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE, anisotropy, flipY: false})
  t.setSource(canvas)
  return t
}
