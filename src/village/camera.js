// Caméra de jeu : un doigt ou le clic déplace le village, deux doigts ou le clic droit le font pivoter,
// la molette et le pincement zooment vers le point visé. Plus on s'approche, plus la vue s'abaisse.
// Reste exprimée en états simples (cible, angle, distance) : aucun getEulerAngles relu.
import {Vec3} from 'playcanvas'
import {smoothstep} from './terrain.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t
const ease = (t) => t * t * (3 - 2 * t)

export class GameCamera {
  constructor(entity, {portrait, reduced}) {
    this.entity = entity
    this.portrait = portrait
    this.reduced = reduced
    this.home = portrait ? {x: -1, z: 4, dist: 118, yaw: 0, y: 0, tilt: 0} : {x: -5, z: -3, dist: 118, yaw: 0, y: 0, tilt: 0}
    this.state = {...this.home}
    this.goal = {...this.state}
    this.min = 9; this.max = portrait ? 235 : 210
    this.flight = null
    this.lookTarget = new Vec3()
    this.pos = new Vec3()
    this.insets = {right: 0, bottom: 0, top: 0}
    this.follow = null
    this.lastInput = performance.now()
    this.drift = 0
    this.walk = false
  }

  /** Inclinaison selon la distance : presque carte vue de haut, puis vue de rue en s'approchant. */
  pitchFor(dist) {
    const t = smoothstep(9, 140, dist)
    return 15 + t * (this.portrait ? 41 : 33)
  }

  touch() { this.lastInput = performance.now() }

  setInsets(insets) { this.insets = {...this.insets, ...insets} }

  pan(dxPx, dyPx, viewportH) {
    const k = (this.goal.dist * 2 * Math.tan(((this.entity.camera.fov / 2) * Math.PI) / 180)) / viewportH
    const c = Math.cos(this.goal.yaw), s = Math.sin(this.goal.yaw)
    const pitch = (this.pitchFor(this.goal.dist) * Math.PI) / 180
    const ix = -dxPx * k, iz = -dyPx * k / Math.max(0.42, Math.sin(pitch))
    this.goal.x += ix * c + iz * s
    this.goal.z += -ix * s + iz * c
    this.goal.y = 0
    this.goal.tilt = 0
    this.clampGoal()
    this.cancelFlight()
    this.touch()
  }

  rotate(dxPx) { this.goal.yaw -= dxPx * 0.0065; this.cancelFlight(); this.touch() }

  zoom(factor, anchor) {
    const before = this.goal.dist
    this.goal.dist = clamp(before * factor, this.min, this.max)
    if (anchor) {
      const k = 1 - this.goal.dist / before
      this.goal.x += (anchor.x - this.goal.x) * k
      this.goal.z += (anchor.z - this.goal.z) * k
      this.clampGoal()
    }
    this.cancelFlight()
    this.touch()
  }

  clampGoal() {
    const rx = 66, rz = 56
    const dx = (this.goal.x + 6) / rx, dz = (this.goal.z + 4) / rz, r = Math.hypot(dx, dz)
    if (r > 1) { this.goal.x = -6 + (dx / r) * rx; this.goal.z = -4 + (dz / r) * rz }
  }

  cancelFlight() { this.flight = null; this.follow = null }

  /** Vol doux vers une vue. Les utilisateurs qui demandent moins de mouvement y vont directement. */
  flyTo(view, {ms = 1200, follow = null} = {}) {
    this.follow = follow
    const to = {...this.goal, ...view}
    if (this.reduced || ms === 0) { this.goal = to; this.state = {...to}; this.flight = null; return }
    this.flight = {from: {...this.state}, to, start: performance.now(), ms}
  }

  update(dt) {
    const now = performance.now()
    const s = this.state
    if (this.flight) {
      const k = Math.min(1, (now - this.flight.start) / this.flight.ms), e = ease(k)
      const {from, to} = this.flight
      s.x = from.x + (to.x - from.x) * e; s.z = from.z + (to.z - from.z) * e
      // Courbe légèrement relevée : on prend de la hauteur pendant le vol, comme un oiseau.
      const hop = Math.sin(e * Math.PI) * Math.min(26, Math.hypot(to.x - from.x, to.z - from.z) * 0.5)
      s.dist = from.dist + (to.dist - from.dist) * e + hop
      s.yaw = lerpAngle(from.yaw, to.yaw, e)
      s.y = from.y + (to.y - from.y) * e
      s.tilt = from.tilt + (to.tilt - from.tilt) * e
      if (k >= 1) { this.flight = null; this.goal = {...to}; s.dist = to.dist }
    } else {
      const f = 1 - Math.exp(-dt * 9)
      if (this.follow) { const p = this.follow(); if (p) { this.goal.x = p.x; this.goal.z = p.z } }
      s.x += (this.goal.x - s.x) * f
      s.z += (this.goal.z - s.z) * f
      s.dist += (this.goal.dist - s.dist) * f
      s.yaw = lerpAngle(s.yaw, this.goal.yaw, f)
      s.y += (this.goal.y - s.y) * f
      s.tilt += (this.goal.tilt - s.tilt) * f
    }
    this.applyTransform(now)
  }

  applyTransform(now) {
    const s = this.state, cam = this.entity
    const idle = now - this.lastInput > 45000 && !this.flight && !this.walk && !this.reduced
    this.drift += ((idle ? 1 : 0) - this.drift) * 0.01
    const sway = this.drift * Math.sin(now * 0.00007) * 0.14
    const yaw = s.yaw + sway
    const pitch = ((this.pitchFor(s.dist) + s.tilt) * Math.PI) / 180
    const cp = Math.cos(pitch), sp = Math.sin(pitch)
    const dx = Math.sin(yaw) * cp, dz = Math.cos(yaw) * cp, dy = sp
    // Décalage pour rester centré dans la zone libre quand un panneau occupe une partie de l'écran.
    const device = cam.camera.system.app.graphicsDevice
    const w = device.clientRect?.width || 1, h = device.clientRect?.height || 1
    const span = s.dist * 2 * Math.tan(((cam.camera.fov / 2) * Math.PI) / 180)
    const offX = ((this.insets.right / 2) / h) * span, offZ = (((this.insets.bottom - this.insets.top) / 2) / h) * span / Math.max(0.5, sp)
    const c = Math.cos(yaw), sn = Math.sin(yaw)
    const tx = s.x + offX * c + offZ * sn, tz = s.z - offX * sn + offZ * c
    const ty = this.walk ? this.groundY ?? 1 : s.y + (s.dist < 30 ? (1 - s.dist / 30) * 1.4 : 0)
    this.pos.set(tx + dx * s.dist, ty + dy * s.dist, tz + dz * s.dist)
    cam.setPosition(this.pos)
    this.lookTarget.set(tx, ty, tz)
    cam.lookAt(this.lookTarget)
  }
}
