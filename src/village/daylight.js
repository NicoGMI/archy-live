// La lumière suit l'heure réelle : le village dort quand on dort, et seules les maisons
// où quelque chose avance restent éclairées la nuit. Chaque clé est une ambiance peinte à la main.
import {CONFIG} from '../config.js'

const KEYS = [
  {h: 0, name: 'Nuit', top: '#0f1a3a', hor: '#2a3460', sun: '#a9bdec', sunI: 1.15, elev: 42, sky: '#7286c8', gnd: '#3a4470', amb: 1, glow: 1.5, lamps: 1, stars: 1, sea: ['#10304f', '#1d6275'], exp: 1.0},
  {h: 5, name: 'Nuit', top: '#16224a', hor: '#3d3f6c', sun: '#a9bdec', sunI: 1.15, elev: 34, sky: '#7286c8', gnd: '#3a4470', amb: 1, glow: 1.5, lamps: 1, stars: 0.9, sea: ['#143a5a', '#21677b'], exp: 1.0},
  {h: 6.6, name: 'Aube', top: '#5d7fb8', hor: '#ffc39a', sun: '#ffb47c', sunI: 1.7, elev: 12, sky: '#a9b5d4', gnd: '#7f6f5e', amb: 0.8, glow: 1.0, lamps: 0.7, stars: 0.15, sea: ['#3a7f9a', '#5fb6b0'], exp: 1.0},
  {h: 9, name: 'Matin', top: '#6fb0dc', hor: '#fbe7c6', sun: '#ffe2b4', sunI: 2.5, elev: 38, sky: '#bcd3e6', gnd: '#94896a', amb: 0.92, glow: 0.5, lamps: 0, stars: 0, sea: ['#2f8fa6', '#6fd0c0'], exp: 1.0},
  {h: 13, name: 'Plein jour', top: '#6aaedf', hor: '#f7ecd2', sun: '#fff0d0', sunI: 2.7, elev: 60, sky: '#c4d9e8', gnd: '#9a8f6e', amb: 0.95, glow: 0.45, lamps: 0, stars: 0, sea: ['#2c8da8', '#73d6c4'], exp: 1.0},
  {h: 17, name: 'Après-midi', top: '#74a4d6', hor: '#fbdfae', sun: '#ffd79a', sunI: 2.7, elev: 34, sky: '#c2cfdc', gnd: '#a08a62', amb: 0.9, glow: 0.55, lamps: 0, stars: 0, sea: ['#2f87a0', '#6ccaba'], exp: 1.0},
  {h: 19.2, name: 'Heure dorée', top: '#7a78b4', hor: '#ffb070', sun: '#ffa95e', sunI: 3.0, elev: 15, sky: '#c6a9b4', gnd: '#a4764e', amb: 0.86, glow: 0.95, lamps: 0.75, stars: 0, sea: ['#37708f', '#8bbcb2'], exp: 1.02},
  {h: 20.6, name: 'Crépuscule', top: '#343f7c', hor: '#e8796a', sun: '#ff8a6e', sunI: 1.7, elev: 10, sky: '#8a80b0', gnd: '#6a5262', amb: 0.92, glow: 1.3, lamps: 1, stars: 0.35, sea: ['#27496f', '#6b879c'], exp: 1.0},
  {h: 22, name: 'Nuit', top: '#121d40', hor: '#37386a', sun: '#a9bdec', sunI: 1.15, elev: 36, sky: '#7286c8', gnd: '#3a4470', amb: 1, glow: 1.5, lamps: 1, stars: 1, sea: ['#112f4e', '#1e5f73'], exp: 1.0},
  {h: 24, name: 'Nuit', top: '#0f1a3a', hor: '#2a3460', sun: '#a9bdec', sunI: 1.15, elev: 42, sky: '#7286c8', gnd: '#3a4470', amb: 1, glow: 1.5, lamps: 1, stars: 1, sea: ['#10304f', '#1d6275'], exp: 1.0},
]

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) }
const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const mixHex = (a, b, t) => { const x = rgb(a), y = rgb(b); return x.map((v, i) => toLinear(v + (y[i] - v) * t)) }
const lerp = (a, b, t) => a + (b - a) * t

/** Heure décimale dans le fuseau du village (Europe/Paris par défaut). */
export function localHour(now = Date.now(), timeZone = CONFIG.timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone}).formatToParts(new Date(now))
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  return get('hour') + get('minute') / 60
}

/** Ambiance interpolée pour une heure donnée. Toutes les couleurs sortent en linéaire. */
export function ambience(hour) {
  const h = ((hour % 24) + 24) % 24
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++
  const a = KEYS[i], b = KEYS[i + 1], t = (h - a.h) / (b.h - a.h || 1)
  // Le soleil se lève à l'est, se couche à l'ouest ; la nuit, la lune garde des ombres du même côté de la scène.
  const day = h >= 6 && h <= 21
  const azimuth = day ? lerp(115, -115, (h - 6) / 15) : lerp(-70, 70, ((h + 3) % 24) / 9)
  return {
    hour: h,
    name: t < 0.5 ? a.name : b.name,
    skyTop: mixHex(a.top, b.top, t),
    skyHorizon: mixHex(a.hor, b.hor, t),
    sunColor: mixHex(a.sun, b.sun, t),
    sunIntensity: lerp(a.sunI, b.sunI, t),
    elevation: lerp(a.elev, b.elev, t),
    azimuth,
    ambientSky: mixHex(a.sky, b.sky, t).map((v) => v * lerp(a.amb, b.amb, t)),
    ambientGround: mixHex(a.gnd, b.gnd, t).map((v) => v * lerp(a.amb, b.amb, t)),
    glow: lerp(a.glow, b.glow, t),
    lamps: lerp(a.lamps, b.lamps, t),
    stars: lerp(a.stars, b.stars, t),
    seaDeep: mixHex(a.sea[0], b.sea[0], t),
    seaShallow: mixHex(a.sea[1], b.sea[1], t),
    exposure: lerp(a.exp, b.exp, t),
    isNight: lerp(a.lamps, b.lamps, t) > 0.5,
  }
}

export const TIME_MODES = [
  {id: 'auto', label: 'Heure réelle'},
  {id: 'morning', label: 'Matin', hour: 9},
  {id: 'day', label: 'Plein jour', hour: 13},
  {id: 'golden', label: 'Heure dorée', hour: 19.2},
  {id: 'night', label: 'Nuit', hour: 23},
]
