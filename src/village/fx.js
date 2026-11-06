// Fumée, poussière, confettis, feux d'artifice, lucioles : un seul maillage réécrit à chaque image,
// donc deux draw calls au total quel que soit le nombre de particules.
import {BLEND_ADDITIVEALPHA, BLEND_NORMAL, BUFFER_DYNAMIC, Color, Entity, Mesh, MeshInstance, PIXELFORMAT_RGBA8, PRIMITIVE_TRIANGLES, SEMANTIC_COLOR, SEMANTIC_POSITION, SEMANTIC_TEXCOORD0, StandardMaterial, TYPE_FLOAT32, Texture, VertexBuffer, VertexFormat, IndexBuffer, INDEXFORMAT_UINT16, Vec3, FILTER_LINEAR} from 'playcanvas'

function softTexture(device) {
  const size = 64
  const pixels = new Uint8Array(size * size * 4)
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot(i - 31.5, j - 31.5) / 31.5
    const v = Math.max(0, 1 - d)
    const o = (j * size + i) * 4
    pixels[o] = pixels[o + 1] = pixels[o + 2] = 255
    pixels[o + 3] = Math.round(255 * v * v * (3 - 2 * v))
  }
  const t = new Texture(device, {width: size, height: size, format: PIXELFORMAT_RGBA8, mipmaps: true, minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR, name: 'soft'})
  t.lock().set(pixels); t.unlock()
  return t
}

class Pool {
  constructor(app, capacity, blend, texture, name) {
    const device = app.graphicsDevice
    this.capacity = capacity
    this.items = []
    this.format = new VertexFormat(device, [
      {semantic: SEMANTIC_POSITION, components: 3, type: TYPE_FLOAT32},
      {semantic: SEMANTIC_TEXCOORD0, components: 2, type: TYPE_FLOAT32},
      {semantic: SEMANTIC_COLOR, components: 4, type: TYPE_FLOAT32},
    ])
    this.stride = 9
    this.data = new Float32Array(capacity * 4 * this.stride)
    this.vb = new VertexBuffer(device, this.format, capacity * 4, {usage: BUFFER_DYNAMIC, data: this.data.buffer.slice(0)})
    const indices = new Uint16Array(capacity * 6)
    for (let i = 0; i < capacity; i++) indices.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6)
    this.ib = new IndexBuffer(device, INDEXFORMAT_UINT16, capacity * 6, undefined, indices.buffer)
    this.mesh = new Mesh(device)
    this.mesh.vertexBuffer = this.vb
    this.mesh.indexBuffer[0] = this.ib
    this.mesh.primitive[0] = {type: PRIMITIVE_TRIANGLES, base: 0, baseVertex: 0, count: 0, indexed: true}
    this.mesh.aabb.center.set(0, 0, 0)
    this.mesh.aabb.halfExtents.set(1000, 1000, 1000)
    const m = new StandardMaterial()
    m.useLighting = false
    m.useSkybox = false
    m.useFog = blend === BLEND_NORMAL
    m.diffuse = new Color(0, 0, 0)
    m.specular = new Color(0, 0, 0)
    m.emissive = new Color(1, 1, 1)
    m.emissiveVertexColor = true
    m.emissiveVertexColorChannel = 'rgb'
    m.opacityMap = texture
    m.opacityMapChannel = 'a'
    m.opacityVertexColor = true
    m.opacityVertexColorChannel = 'a'
    m.blendType = blend
    m.depthWrite = false
    m.update()
    this.material = m
    this.entity = new Entity(name)
    const mi = new MeshInstance(this.mesh, m)
    mi.cull = false
    mi.drawOrder = 10
    this.entity.addComponent('render', {meshInstances: [mi], castShadows: false, receiveShadows: false})
    app.root.addChild(this.entity)
  }

  emit(p) {
    if (this.items.length >= this.capacity) this.items.shift()
    this.items.push({life: 0, drag: 0, gravity: 0, grow: 0, ...p})
  }

  update(dt, right, up) {
    const {items, data, stride} = this
    let n = 0
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i]
      p.life += dt
      if (p.life >= p.ttl) { items.splice(i, 1); continue }
      p.vy += -p.gravity * dt
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
      const dragK = Math.exp(-p.drag * dt)
      p.vx *= dragK; p.vy *= dragK; p.vz *= dragK
      if (p.wobble) { p.x += Math.sin(p.life * 2.7 + p.seed) * p.wobble * dt; p.z += Math.cos(p.life * 2.1 + p.seed) * p.wobble * dt }
      const k = p.life / p.ttl
      const size = p.size + p.grow * k
      const alpha = (p.fadeIn ? Math.min(1, k / p.fadeIn) : 1) * (1 - k * k) * p.alpha
      const rx = right.x * size, ry = right.y * size, rz = right.z * size
      const ux = up.x * size, uy = up.y * size, uz = up.z * size
      const o = n * 4 * stride
      const corner = (c, sx, sy, u, v) => {
        const q = o + c * stride
        data[q] = p.x + rx * sx + ux * sy; data[q + 1] = p.y + ry * sx + uy * sy; data[q + 2] = p.z + rz * sx + uz * sy
        data[q + 3] = u; data[q + 4] = v
        data[q + 5] = p.r; data[q + 6] = p.g; data[q + 7] = p.b; data[q + 8] = alpha
      }
      corner(0, -1, -1, 0, 0); corner(1, 1, -1, 1, 0); corner(2, 1, 1, 1, 1); corner(3, -1, 1, 0, 1)
      n++
    }
    if (n) {
      const lock = new Float32Array(this.vb.lock())
      lock.set(data.subarray(0, n * 4 * stride))
      this.vb.unlock()
    }
    this.mesh.primitive[0].count = n * 6
    this.entity.enabled = n > 0
  }
}

const toLin = (hex) => { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => (c / 255) ** 2.2) }

export class Effects {
  constructor(app, quality) {
    const tex = softTexture(app.graphicsDevice)
    const budget = Math.round(420 * quality.particles)
    this.alpha = new Pool(app, budget, BLEND_NORMAL, tex, 'fx-alpha')
    this.add = new Pool(app, budget, BLEND_ADDITIVEALPHA, tex, 'fx-add')
    this.right = new Vec3(); this.up = new Vec3()
    this.seed = 1
    this.rate = quality.particles
  }
  random() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647 }

  smoke(x, y, z, {night = false, blocked = false} = {}) {
    const R = () => this.random()
    const c = blocked ? 0.3 : night ? 0.42 : 0.95
    this.alpha.emit({x: x + (R() - 0.5) * 0.12, y, z: z + (R() - 0.5) * 0.12, vx: 0.18 + R() * 0.12, vy: 0.62 + R() * 0.25, vz: 0.05, ttl: 3.4 + R() * 1.4, size: 0.16, grow: 0.8, alpha: blocked ? 0.5 : 0.42, r: c, g: c * 0.97, b: c * 0.93, drag: 0.15, wobble: 0.25, seed: R() * 9, fadeIn: 0.12})
  }
  dust(x, y, z, n = 3) {
    const R = () => this.random()
    for (let i = 0; i < n; i++) this.alpha.emit({x, y: y + 0.1, z, vx: (R() - 0.5) * 1.1, vy: 0.3 + R() * 0.5, vz: (R() - 0.5) * 1.1, ttl: 0.7 + R() * 0.5, size: 0.14, grow: 0.5, alpha: 0.3, r: 0.72, g: 0.6, b: 0.42, drag: 3, fadeIn: 0.1})
  }
  firework(x, y, z, hex) {
    const R = () => this.random()
    const [r, g, b] = toLin(hex)
    const n = Math.round(46 * this.rate)
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, e = (R() - 0.5) * 3.14, s = 4 + R() * 3.2
      const mix = R() < 0.3
      this.add.emit({x, y, z, vx: Math.cos(a) * Math.cos(e) * s, vy: Math.sin(e) * s + 1, vz: Math.sin(a) * Math.cos(e) * s, ttl: 1.1 + R() * 0.7, size: 0.2, grow: -0.1, alpha: 1, r: (mix ? 1 : r) * 3.4, g: (mix ? 0.85 : g) * 3.4, b: (mix ? 0.5 : b) * 3.4, gravity: 3.6, drag: 1.2})
    }
    this.add.emit({x, y, z, vx: 0, vy: 0, vz: 0, ttl: 0.5, size: 1.2, grow: 3.5, alpha: 0.8, r: r * 3, g: g * 3, b: b * 3})
  }
  rocket(x, y, z, hex) {
    const [r, g, b] = toLin(hex)
    this.add.emit({x, y, z, vx: 0, vy: 14, vz: 0, ttl: 0.75, size: 0.2, grow: -0.1, alpha: 1, r: r * 4, g: g * 4, b: b * 4, gravity: 6})
  }
  confetti(x, y, z, colors) {
    const R = () => this.random()
    const n = Math.round(26 * this.rate)
    for (let i = 0; i < n; i++) {
      const [r, g, b] = toLin(colors[i % colors.length])
      this.alpha.emit({x, y, z, vx: (R() - 0.5) * 3.8, vy: 2.6 + R() * 3, vz: (R() - 0.5) * 3.8, ttl: 1.6 + R() * 0.8, size: 0.09, grow: 0, alpha: 1, r, g, b, gravity: 5, drag: 0.9, wobble: 0.9, seed: R() * 9})
    }
  }
  sparkle(x, y, z, hex = '#ffe08a') {
    const R = () => this.random()
    const [r, g, b] = toLin(hex)
    this.add.emit({x: x + (R() - 0.5) * 0.6, y: y + (R() - 0.5) * 0.4, z: z + (R() - 0.5) * 0.6, vx: 0, vy: 0.35 + R() * 0.3, vz: 0, ttl: 0.8 + R() * 0.6, size: 0.1, grow: -0.05, alpha: 0.9, r: r * 3, g: g * 3, b: b * 3})
  }
  firefly(x, y, z) {
    const R = () => this.random()
    this.add.emit({x, y, z, vx: 0, vy: (R() - 0.5) * 0.15, vz: 0, ttl: 3 + R() * 2.5, size: 0.1, grow: 0, alpha: 0.95, r: 1.9, g: 2.1, b: 0.6, wobble: 1.3, seed: R() * 9, fadeIn: 0.3})
  }
  ember(x, y, z) { // Fumerolle rouge : la maison bloquée se voit de loin.
    const R = () => this.random()
    this.add.emit({x: x + (R() - 0.5) * 0.1, y, z: z + (R() - 0.5) * 0.1, vx: 0.05, vy: 0.55 + R() * 0.3, vz: 0, ttl: 1.2, size: 0.1, grow: -0.04, alpha: 0.9, r: 3.2, g: 0.6, b: 0.3, wobble: 0.6, seed: R() * 9})
  }
  update(dt, cameraEntity) {
    this.right.copy(cameraEntity.right)
    this.up.copy(cameraEntity.up)
    this.alpha.update(dt, this.right, this.up)
    this.add.update(dt, this.right, this.up)
  }
}
