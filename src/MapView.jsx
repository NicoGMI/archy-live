import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import './village.css'
import {createVillage} from './village/engine.js'
import {buildPlan, DISTRICTS, LOTS, assignLots} from './village/plan.js'
import {shoreDistance} from './village/terrain.js'
import {TIME_MODES} from './village/daylight.js'
import {archyDialogue, counts, dialogueFor, eventLine, markSeen, tourStops, urgency} from './village/story.js'
import {ActionBar, LB, ORD, Toggle, ago, dayKey, fmt, hm, useData} from './shared.jsx'
import {LOGOS, groupedRooms, roomOf} from './rooms.js'
import {CONFIG} from './config.js'
import YoutubeStats from './YoutubeStats.jsx'

// ------------------------------------------------------------------ Petits éléments communs

const ICONS = {
  active: 'M7 4.5v15l12-7.5z',
  waiting: 'M7 3h10v3.6L13.4 12l3.6 5.4V21H7v-3.6l3.6-5.4L7 6.6z',
  blocked: 'M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3zM8 8l8 8M16 8l-8 8',
  scheduled: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5.4l3.4 2',
  queued: 'M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9',
  done: 'M4.5 12.5l5 5 10-11',
  map: 'M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6zM9 4v14M15 6v14',
  walk: 'M13 4.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0zM10.5 8 8 15.5M10.5 8l4 2 3 3M10 12l3.5 2.5.5 6M8.8 13 7 20.5',
  log: 'M6 3h9l4 4v14H6zM9 9h6M9 13h6M9 17h4',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  home: 'M4 11.5 12 4l8 7.5M6.5 10v10h11V10',
  sun: 'M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  back: 'M15 5l-7 7 7 7',
  quest: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  talk: 'M4 5h16v11H9l-5 4z',
  door: 'M6 21V4h12v17M3 21h18M14.5 12.5v.5',
  arrow: 'M12 4l6 8h-4v8h-4v-8H6z',
  rotate: 'M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5',
}
export function Icon({name, size = 18}) {
  const filled = name === 'active' || name === 'quest' || name === 'arrow'
  return <svg className="ico" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[name]}/></svg>
}

const Chip = ({status}) => <span className={`chip-s s-${status}`}><Icon name={status} size={12}/>{LB[status]}</span>

function whenOf(t) {
  if (t.status === 'done') return t.doneAt ? 'terminé ' + fmt(t.doneAt) : ''
  if (t.status === 'scheduled') return t.scheduledAt ? fmt(t.scheduledAt) : ''
  if (t.status === 'active') return t.startedAt ? 'depuis ' + fmt(t.startedAt) : ''
  return ''
}

const STATUS_ORDER = ['blocked', 'waiting', 'active', 'scheduled', 'queued']
const COUNTER_LABEL = {blocked: 'Bloqué', waiting: `Attend ${CONFIG.boss}`, active: 'En cours', scheduled: 'Programmé', queued: 'En file', done: "Fini aujourd'hui"}

const useIsWide = () => {
  const q = '(min-width: 900px)'
  const [wide, setWide] = useState(() => matchMedia(q).matches)
  useEffect(() => { const m = matchMedia(q); const f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return wide
}

// ------------------------------------------------------------------ Panneau latéral / feuille mobile

function Panel({title, sub, accent, onClose, onBack, children, wide, onHeight, compact}) {
  const ref = useRef()
  const [snap, setSnap] = useState(compact ? 'peek' : 'half')
  const drag = useRef(null)
  const [dragH, setDragH] = useState(null)
  const heights = () => ({peek: Math.min(innerHeight * 0.4, 340), half: innerHeight * 0.58, full: innerHeight * 0.88})
  const current = dragH ?? heights()[snap]
  useLayoutEffect(() => { if (!wide) onHeight?.(Math.min(current, innerHeight * 0.56)) }, [current, wide, onHeight])
  useEffect(() => () => onHeight?.(0), [onHeight])
  const down = (e) => { drag.current = {y: e.clientY, h: current}; e.currentTarget.setPointerCapture(e.pointerId) }
  const move = (e) => { if (drag.current) setDragH(Math.max(120, Math.min(innerHeight * 0.92, drag.current.h - (e.clientY - drag.current.y)))) }
  const up = () => {
    if (!drag.current) return
    const h = dragH ?? drag.current.h
    drag.current = null
    if (h < 150) { setDragH(null); onClose?.(); return }
    const hs = heights()
    const nearest = Object.entries(hs).sort((a, b) => Math.abs(a[1] - h) - Math.abs(b[1] - h))[0][0]
    setSnap(nearest); setDragH(null)
  }
  return <aside ref={ref} data-hud className={`panel ${wide ? 'is-wide' : 'is-sheet'}`} role="dialog" aria-label={typeof title === 'string' ? title : undefined} style={wide ? {'--accent': accent} : {'--accent': accent, height: current, transition: dragH == null ? undefined : 'none'}}>
    {!wide && <div className="grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="separator" aria-label="Agrandir ou réduire"><i/></div>}
    <header className="panel-head">
      {onBack && <button className="ibtn" onClick={onBack} aria-label="Retour"><Icon name="back"/></button>}
      <div className="panel-title"><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
      {onClose && <button className="ibtn" onClick={onClose} aria-label="Fermer"><Icon name="close"/></button>}
    </header>
    <div className="panel-body">{children}</div>
  </aside>
}

function TaskCard({t, d, highlighted, onFocus, showWhere, universe}) {
  const lg = d.log.filter((l) => l.task === t.id).slice(0, 4)
  return <article className={`tcard s-${t.status} ${highlighted ? 'hl' : ''}`}>
    <div className="tcard-top"><Chip status={t.status}/>{showWhere && universe && <span className="where" style={{color: universe.color}}>{universe.name}</span>}{whenOf(t) && <time>{whenOf(t)}</time>}</div>
    <h3>{onFocus ? <button className="linklike" onClick={onFocus}>{t.title}</button> : t.title}</h3>
    {t.note && <p className="note">{t.note}</p>}
    {t.url && <a className="task-link" href={t.url} target="_blank" rel="noopener noreferrer">Ouvrir le document ↗</a>}
    <ActionBar t={t} compact/>
    {lg.length > 0 && <ul className="tlog">{lg.map((l, i) => <li key={i}><time>{fmt(l.at)}</time>{l.text}</li>)}</ul>}
  </article>
}

function HouseSheet({d, id, room, setRoom, close, wide, onHeight}) {
  const u = d.universes.find((x) => x.id === id)
  if (!u) return null
  const all = d.tasks.filter((t) => t.universe === id).sort((a, b) => ORD[a.status] - ORD[b.status])
  const rooms = groupedRooms(u, all)
  const roomId = room?.startsWith('room:') ? room.slice(5) : null
  const shown = roomId ? all.filter((t) => roomOf(t, id) === roomId || t.id === roomId) : all
  const alerts = (d.alerts || []).filter((a) => a.universe === id)
  const c = counts(all, Date.now(), dayKey)
  const summary = [c.active && `${c.active} en cours`, (c.waiting + c.blocked) && `${c.waiting + c.blocked} en attente`, c.scheduled && `${c.scheduled} programmé${c.scheduled > 1 ? 's' : ''}`, c.queued && `${c.queued} en file`, c.done && `${c.done} fini${c.done > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'Aucune tâche pour le moment'
  return <Panel wide={wide} onHeight={onHeight} compact accent={u.color} onClose={close} title={<>{LOGOS[id] && <img src={LOGOS[id]} alt="" className={`plogo ${id === 'isme' ? 'dark' : ''}`}/>}{u.name}</>} sub={summary}>
    <div className="rooms" role="tablist" aria-label="Pièces">
      <button role="tab" aria-selected={!roomId} className={!roomId ? 'on' : ''} onClick={() => setRoom(null)}>Toute la maison <b>{all.length}</b></button>
      {rooms.filter((q) => q.tasks.length || ['conferences', 'phil', 'cts', 'isme', 'excelia', 'iae', 'efrei', 'ece'].includes(id)).map((q) => <button role="tab" aria-selected={roomId === q.id} key={q.id} className={roomId === q.id ? 'on' : ''} onClick={() => setRoom('room:' + q.id)}>{q.title} <b>{q.tasks.length}</b></button>)}
    </div>
    {alerts.map((a) => <div key={a.id} className="alert"><span>{a.icon || '✉'}</span><div>{a.text}<time>{fmt(a.at)}</time></div></div>)}
    {id === 'phil' && <div className="yt-wrap"><YoutubeStats stats={d.stats?.youtube} compact/></div>}
    {!shown.length && <p className="empty">{roomId ? "Cette pièce est prête, mais aucune tâche n'y est encore arrivée." : 'Aucune tâche en cours dans ce bâtiment.'}</p>}
    {shown.map((t) => <TaskCard key={t.id} t={t} d={d}/>)}
  </Panel>
}

function AgentSheet({d, id, close, onHouse, wide, onHeight, now}) {
  if (id === '__archy') {
    return <Panel wide={wide} onHeight={onHeight} compact accent="#d9a64a" title="Archy" sub="Ton assistant. Il se tient là où il a agi en dernier." onClose={close}>
      <ul className="tlog big">{[...d.log].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 12).map((l, i) => { const t = d.tasks.find((x) => x.id === l.task); return <li key={i}><time>{fmt(l.at)}</time>{t && <b>{t.title}</b>}{l.text}</li> })}</ul>
    </Panel>
  }
  const t = d.tasks.find((x) => x.id === id)
  if (!t) return null
  const u = d.universes.find((x) => x.id === t.universe)
  return <Panel wide={wide} onHeight={onHeight} compact accent={u?.color} title={t.title} sub={u?.name} onClose={close}>
    <TaskCard t={t} d={d}/>
    <button className="wide-btn" onClick={() => onHouse(t.universe)}><Icon name="door"/> Ouvrir {u?.name}</button>
  </Panel>
}

function ListSheet({d, status, close, onPick, wide, onHeight}) {
  const U = useMemo(() => Object.fromEntries(d.universes.map((u) => [u.id, u])), [d])
  const needs = status === 'decide'
  const list = (needs ? d.tasks.filter((t) => t.status === 'blocked' || t.status === 'waiting') : d.tasks.filter((t) => t.status === status))
    .sort((a, b) => ORD[a.status] - ORD[b.status] || (status === 'done' ? Date.parse(b.doneAt || 0) - Date.parse(a.doneAt || 0) : 0))
  const title = needs ? `À décider, ${CONFIG.boss}` : status === 'done' ? 'Terminé' : LB[status]
  return <Panel wide={wide} onHeight={onHeight} title={title} sub={list.length ? `${list.length} tâche${list.length > 1 ? 's' : ''}` : undefined} onClose={close}>
    {!list.length && <p className="empty">{needs ? 'Rien ne t\'attend. Le perron est désert.' : 'Rien dans cette catégorie.'}</p>}
    {list.map((t) => <TaskCard key={t.id} t={t} d={d} showWhere universe={U[t.universe]} onFocus={() => onPick(t)}/>)}
  </Panel>
}

function JournalSheet({d, close, onPick, wide, onHeight}) {
  const feed = [...d.log].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 80)
  const groups = []
  feed.forEach((l) => { const k = dayKey(l.at); let g = groups.find((x) => x.k === k); if (!g) groups.push(g = {k, items: []}); g.items.push(l) })
  const today = dayKey(new Date().toISOString())
  const dl = (k) => (k === today ? "Aujourd'hui" : new Date(k + 'T12:00:00').toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}))
  return <Panel wide={wide} onHeight={onHeight} title="Journal du village" sub={`${feed.length} dernières entrées`} onClose={close}>
    {!groups.length && <p className="empty">Le journal est encore vide.</p>}
    {groups.map((g) => <section key={g.k} className="jday"><h4>{dl(g.k)}</h4>{g.items.map((l, i) => { const t = d.tasks.find((x) => x.id === l.task), u = d.universes.find((x) => x.id === t?.universe); return <button key={i} className="jline" onClick={() => t && onPick(t)}><time>{hm(l.at)}</time><i style={{background: u?.color || '#887'}}/><span><b>{t?.title || l.task}</b>{l.text}</span></button> })}</section>)}
  </Panel>
}

// ------------------------------------------------------------------ Mini-carte

function islandPath() {
  const pts = []
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2
    let r = 20
    while (r < 110 && shoreDistance(-6 + Math.cos(a) * r, -4 + Math.sin(a) * r) > 0) r += 1
    pts.push([-6 + Math.cos(a) * r, -4 + Math.sin(a) * r])
  }
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z'
}

const Minimap = React.memo(function Minimap({d, lots, apiRef, walking, onDistrict, compact}) {
  const plan = useMemo(() => buildPlan(), [])
  const outline = useMemo(() => islandPath(), [])
  const eye = useRef()
  useEffect(() => {
    let raf
    const loop = () => {
      const api = apiRef.current
      if (api && eye.current) {
        const p = walking ? api.playerPosition() : api.game.state
        eye.current.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.z.toFixed(1)})`)
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [apiRef, walking])
  const click = (e) => {
    const svg = e.currentTarget, pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const w = pt.matrixTransform(svg.getScreenCTM().inverse())
    let best = null, bd = 18
    for (const [k, q] of Object.entries(DISTRICTS)) { const dd = Math.hypot(q.c[0] - w.x, q.c[1] - w.y); if (dd < bd) { bd = dd; best = k } }
    if (Math.hypot(w.x, w.y) < 13) best = 'office'
    onDistrict(best)
  }
  return <svg className={`minimap ${compact ? 'compact' : ''}`} viewBox="-82 -66 150 126" role="img" aria-label="Carte du village. Touche un quartier pour t'y rendre." onClick={click}>
    <path d={outline} className="mm-land"/>
    <polyline points={plan.river.path.map((p) => p.join(',')).join(' ')} className="mm-river"/>
    {plan.roads.filter((r) => r.kind !== 'path').map((r) => <polyline key={r.id} points={r.path.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')} className="mm-road"/>)}
    <circle r="9.5" className="mm-plaza"/>
    <rect x="-6" y="-21" width="12" height="9" rx="1.5" className="mm-office"/>
    {Object.entries(lots).map(([id, lot]) => {
      const ts = d?.tasks.filter((t) => t.universe === id) || []
      return <circle key={id} cx={lot.x} cy={lot.z} r="3.3" className={`mm-house u-${urgency(ts)}`}/>
    })}
    <g ref={eye}><circle r="4.4" className="mm-eye"/><circle r="1.6" className="mm-eye-dot"/></g>
  </svg>
})

// ------------------------------------------------------------------ Dialogue RPG

function Dialogue({speaker, accent, lines, footer, onClose}) {
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(0)
  const line = lines[i] || ''
  useEffect(() => {
    setShown(0)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(line.length); return }
    const timer = setInterval(() => setShown((s) => { if (s >= line.length) { clearInterval(timer); return s } return s + 1 }), 16)
    return () => clearInterval(timer)
  }, [line])
  const next = () => { if (shown < line.length) setShown(line.length); else if (i < lines.length - 1) setI(i + 1) }
  const last = i === lines.length - 1 && shown >= line.length
  return <div data-hud className="dialogue" role="dialog" aria-label={speaker} style={{'--accent': accent}}>
    <div className="dlg-name">{speaker}</div>
    <button className="dlg-close ibtn" onClick={onClose} aria-label="Fermer"><Icon name="close"/></button>
    <button className="dlg-text" onClick={next} aria-label="Suite">
      <span aria-live="polite">{line.slice(0, shown)}</span>
      {!last && <em aria-hidden="true">▾</em>}
    </button>
    {last && footer && <div className="dlg-actions">{footer}</div>}
  </div>
}

// ------------------------------------------------------------------ Joystick

function Joystick({apiRef}) {
  const pad = useRef(), knob = useRef()
  const active = useRef(null)
  const apply = (e) => {
    const r = pad.current.getBoundingClientRect()
    const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2
    const R = r.width * 0.34, l = Math.hypot(x, y), k = l > R ? R / l : 1
    knob.current.style.transform = `translate(${x * k}px, ${y * k}px)`
    apiRef.current?.setAxis((x * k) / R, -(y * k) / R)
  }
  const release = () => { active.current = null; if (knob.current) knob.current.style.transform = ''; apiRef.current?.setAxis(0, 0) }
  useEffect(() => { const h = () => release(); addEventListener('blur', h); document.addEventListener('visibilitychange', h); return () => { removeEventListener('blur', h); document.removeEventListener('visibilitychange', h) } })
  return <div data-hud ref={pad} className="stick" role="application" aria-label="Déplacer Nico"
    onPointerDown={(e) => { active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); apply(e) }}
    onPointerMove={(e) => { if (active.current === e.pointerId) apply(e) }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
    <span ref={knob}/>
  </div>
}

// ------------------------------------------------------------------ Vue principale

const SEEN_KEY = 'archy-tour-seen'
const loadSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') } catch { return {} } }

export default function MapView() {
  const {d, err, now, okAt} = useData()
  const wide = useIsWide()
  const canvasRef = useRef(), wrapRef = useRef()
  const apiRef = useRef(null)
  const pinRefs = useRef(new Map()), pinCallbacks = useRef(new Map())
  const dataRef = useRef(null)
  dataRef.current = d

  const [progress, setProgress] = useState({p: 0, label: 'On ouvre les volets'})
  const [ready, setReady] = useState(false)
  const [fatal, setFatal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [agent, setAgent] = useState(null)
  const [room, setRoom] = useState(null)
  const [rooms, setRooms] = useState([])
  const [list, setList] = useState(null)
  const [journal, setJournal] = useState(false)
  const [nav, setNav] = useState(false)
  const [walking, setWalking] = useState(false)
  const [near, setNear] = useState(null)
  const [hover, setHover] = useState(null)
  const [talk, setTalk] = useState(null)
  const [ambience, setAmbience] = useState({name: '', mode: 'auto', night: false})
  const [timeMenu, setTimeMenu] = useState(false)
  const [ticker, setTicker] = useState([])
  const [seen, setSeen] = useState(loadSeen)
  const [objective, setObjective] = useState(null)
  const [tourDone, setTourDone] = useState(false)
  const compass = useRef()

  const clearPanels = useCallback(() => { setList(null); setJournal(false); setNav(false) }, [])

  // Démarrage du moteur, une seule fois.
  useEffect(() => {
    let dead = false, api = null
    createVillage({
      canvas: canvasRef.current,
      container: wrapRef.current,
      onProgress: (p, label) => { if (!dead) setProgress({p, label}) },
      emit: (type, payload) => {
        if (dead) return
        switch (type) {
          case 'ready': setReady(true); break
          case 'select': setSelected(payload); setRoom(null); if (payload) { setAgent(null); clearPanels() } break
          case 'selectAgent': setAgent(payload); if (payload) { setSelected(null); clearPanels() } break
          case 'rooms': setRooms(payload); break
          case 'walk': setWalking(payload); if (payload) clearPanels(); else setTalk(null); break
          case 'near': setNear(payload); break
          case 'hover': setHover(payload); break
          case 'office': setList('decide'); break
          case 'talk': if (payload.near) openTalk(payload.id); break
          case 'interact': if (payload) interactWith(payload); break
          case 'escape': apiRef.current?.stopWalk(); setTalk(null); clearPanels(); break
          case 'ambience': setAmbience(payload); break
          case 'event': addTicker(payload); break
          default: break
        }
      },
    }).then((a) => {
      if (dead) { a.destroy(); return }
      api = a; apiRef.current = a
      for (const [k, el] of pinRefs.current) a.trackPin(k, el)
      if (dataRef.current) a.setData(dataRef.current)
    }).catch((e) => { console.error(e); if (!dead) setFatal(String(e?.message || e)) })
    return () => { dead = true; api?.destroy(); apiRef.current = null }
  }, [])

  useEffect(() => { if (d) apiRef.current?.setData(d) }, [d])

  // Lien direct depuis le dashboard : #u=<univers> ouvre la maison, #t=<tâche> va voir l'habitant.
  useEffect(() => {
    if (!ready || !d) return
    const m = location.hash.match(/^#(u|t)=(.+)$/)
    if (!m) return
    const id = decodeURIComponent(m[2])
    if (m[1] === 'u') apiRef.current?.select(id)
    else focusTask(d.tasks.find((t) => t.id === id))
    history.replaceState(null, '', location.pathname + location.search)
  }, [ready, d])

  const pin = useCallback((key) => {
    if (!pinCallbacks.current.has(key)) {
      pinCallbacks.current.set(key, (el) => {
        if (el) pinRefs.current.set(key, el); else pinRefs.current.delete(key)
        apiRef.current?.trackPin(key, el)
      })
    }
    return pinCallbacks.current.get(key)
  }, [])

  function addTicker(e) {
    const data = dataRef.current
    const line = eventLine(e, (id) => data?.universes.find((u) => u.id === id)?.name || id)
    if (!line) return
    const item = {...line, key: Date.now() + Math.random(), at: Date.now()}
    setTicker((old) => [item, ...old].slice(0, 3))
    setTimeout(() => setTicker((old) => old.filter((x) => x.key !== item.key)), 9000)
  }

  function focusTask(t) {
    const api = apiRef.current
    if (!t || !api) return
    clearPanels()
    if (api.sim.agents.get(t.id)?.visible !== undefined && t.status !== 'queued' && t.status !== 'done') api.selectAgent(t.id)
    else api.select(t.universe)
  }

  function openTalk(id) {
    const data = dataRef.current
    if (!data) return
    setTalk(id)
    const t = data.tasks.find((x) => x.id === id)
    if (t && (t.status === 'blocked' || t.status === 'waiting')) {
      setSeen((old) => { const next = markSeen(old, t); try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)) } catch {} return next })
    }
  }
  function interactWith(n) {
    if (!n) return
    if (n.kind === 'cat') { apiRef.current?.petCat(); return }
    if (n.kind === 'agent') openTalk(n.id)
    else if (n.kind === 'office') setList('decide')
    else if (n.kind === 'building') apiRef.current?.select(n.id, {fly: false})
  }

  const lots = useMemo(() => (d ? assignLots(d.universes.filter((u) => d.tasks.some((t) => t.universe === u.id) || LOTS[u.id])).placed : {}), [d])
  const overflow = useMemo(() => (d ? assignLots(d.universes.filter((u) => d.tasks.some((t) => t.universe === u.id) || LOTS[u.id])).overflow.length : 0), [d])
  const tasks = d?.tasks || []
  const c = useMemo(() => counts(tasks, now, dayKey), [tasks, now])
  const stale = d && now - new Date(d.updatedAt) > 3 * 3600e3

  const movers = useMemo(() => tasks.filter((t) => ['active', 'waiting', 'blocked', 'scheduled'].includes(t.status) && lots[t.universe]), [tasks, lots])
  const tour = useMemo(() => tourStops(tasks, seen), [tasks, seen])
  const nextStop = tour.remaining.find((t) => t.id === objective) || tour.remaining[0]

  useEffect(() => { apiRef.current?.setObjective(nextStop?.id || null) }, [nextStop?.id])
  useEffect(() => { apiRef.current?.setLens(list) }, [list, ready])
  useEffect(() => {
    if (!walking) { setTourDone(false); return }
    if (tour.total && !tour.remaining.length && !tourDone) { setTourDone(true); apiRef.current?.fx?.confetti(apiRef.current.playerPosition().x, 3, apiRef.current.playerPosition().z, ['#f2c14e', '#ef6f8e', '#7bd88f', '#fff4dc']) }
  }, [walking, tour.total, tour.remaining.length])

  // Boussole de quête : pointe vers le prochain habitant à voir, en tenant compte de la caméra.
  useEffect(() => {
    if (!walking) return
    let raf
    const loop = () => {
      const api = apiRef.current
      if (api && compass.current && nextStop) {
        const a = api.agentPosition(nextStop.id), p = api.playerPosition()
        if (a) {
          const world = Math.atan2(a.x - p.x, a.z - p.z)
          const yaw = api.game.state.yaw
          const deg = ((world - yaw) * 180) / Math.PI + 180
          compass.current.style.transform = `rotate(${(-deg + 360).toFixed(1)}deg)`
          compass.current.dataset.near = Math.hypot(a.x - p.x, a.z - p.z) < 5 ? '1' : '0'
        }
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [walking, nextStop?.id])

  // Insets : le village reste centré dans la zone libre, à côté du panneau.
  const [sheetH, setSheetH] = useState(0)
  const hasPanel = !!(selected || agent || list || journal)
  useEffect(() => {
    apiRef.current?.setInsets(wide ? {right: hasPanel ? 400 : 0, bottom: 0} : {right: 0, bottom: hasPanel ? sheetH : 0})
  }, [wide, hasPanel, sheetH, ready])
  const onSheet = useCallback((h) => setSheetH(h), [])

  const closeAll = () => { apiRef.current?.select(null); apiRef.current?.selectAgent(null); clearPanels() }
  const flyTo = (k) => { apiRef.current?.flyToDistrict(k); setNav(false) }
  const openCounter = (s) => { apiRef.current?.select(null); apiRef.current?.selectAgent(null); setJournal(false); setList((old) => (old === s ? null : s)); setNav(false) }

  const talkTask = talk && talk !== '__archy' ? tasks.find((t) => t.id === talk) : null
  const talkUniverse = talkTask && d?.universes.find((u) => u.id === talkTask.universe)
  const talkLines = talk === '__archy' ? archyDialogue(d, {when: fmt}) : talkTask ? dialogueFor(talkTask, d?.log, {when: fmt}) : []

  const uName = (id) => d?.universes.find((u) => u.id === id)?.name || id
  const hint = !walking && !hasPanel && !nav

  return <div ref={wrapRef} className={`village ${ready ? 'is-ready' : ''} ${walking ? 'is-walking' : ''} ${ambience.night ? 'is-night' : ''} ${hasPanel ? 'has-panel' : ''}`}>
    <canvas ref={canvasRef} className="scene" role="img" aria-label={`Village d'${CONFIG.title} : ${c.active} tâches en cours, ${c.waiting + c.blocked} en attente, ${c.scheduled} programmées. Le dashboard propose la même information en texte.`}/>

    {/* Étiquettes accrochées au monde : ce sont de vrais boutons, donc au clavier et au doigt aussi. */}
    <div className="pins" aria-label="Lieux et habitants du village">
      {ready && d?.universes.map((u) => {
        const ts = tasks.filter((t) => t.universe === u.id)
        if (!lots[u.id]) return null
        const level = urgency(ts)
        const alert = (d.alerts || []).some((a) => a.universe === u.id)
        const dim = list && list !== 'decide' ? !ts.some((t) => t.status === list) : list === 'decide' ? !ts.some((t) => t.status === 'waiting' || t.status === 'blocked') : false
        const n = {waiting: ts.filter((t) => t.status === 'waiting').length, blocked: ts.filter((t) => t.status === 'blocked').length, active: ts.filter((t) => t.status === 'active').length}
        return <button key={u.id} ref={pin('b:' + u.id)} data-hud className={`pin house u-${level} ${hover === u.id ? 'hot' : ''} ${dim ? 'dim' : ''} ${alert ? 'alerted' : ''}`} style={{'--c': u.color}} onClick={() => apiRef.current?.select(u.id)} aria-label={`${u.name} : ${ts.length} tâches`}>
          <i className="dot"/>
          <span className="name">{u.name}</span>
          {n.blocked > 0 && <em className="s-blocked"><Icon name="blocked" size={11}/>{n.blocked}</em>}
          {n.waiting > 0 && <em className="s-waiting"><Icon name="waiting" size={11}/>{n.waiting}</em>}
          {n.active > 0 && <em className="s-active"><Icon name="active" size={10}/>{n.active}</em>}
          {alert && <span className="flash" aria-hidden="true">✉</span>}
        </button>
      })}
      {ready && movers.map((t) => <button key={t.id} ref={pin('a:' + t.id)} data-hud className={`pin agent s-${t.status}`} onClick={() => { if (walking) { apiRef.current?.walkTo(apiRef.current.agentPosition(t.id).x, apiRef.current.agentPosition(t.id).z); const pos = apiRef.current.playerPosition(), a = apiRef.current.agentPosition(t.id); if (Math.hypot(pos.x - a.x, pos.z - a.z) < 5) openTalk(t.id) } else apiRef.current?.selectAgent(t.id) }} aria-label={`${t.title}, ${LB[t.status]}`}><Icon name={t.status} size={11}/></button>)}
      {ready && d && <button ref={pin('a:__archy')} data-hud className="pin agent archy" onClick={() => (walking ? openTalk('__archy') : apiRef.current?.selectAgent('__archy'))} aria-label="Archy, ton assistant">A</button>}
      {ready && d && <button ref={pin('o:office')} data-hud className={`pin office ${c.waiting + c.blocked ? 'busy' : ''}`} onClick={() => setList('decide')}>
        <span className="name">Bureau de {CONFIG.boss}</span>
        <em className="s-waiting"><Icon name="waiting" size={11}/>{c.waiting + c.blocked} à décider</em>
      </button>}
      {ready && Object.entries(DISTRICTS).map(([k, q]) => <button key={k} ref={pin('d:' + k)} data-hud className="pin district" onClick={() => flyTo(k)}>{q.name}</button>)}
      {ready && rooms.map((r) => <button key={r.id} ref={pin('r:' + r.id)} data-hud className={`pin room s-${r.empty ? 'none' : r.status} ${room === 'room:' + r.id ? 'on' : ''}`} onClick={() => setRoom(room === 'room:' + r.id ? null : 'room:' + r.id)}>
        {!r.empty && <Icon name={r.status} size={11}/>}<span>{r.title.length > 26 ? r.title.slice(0, 25) + '…' : r.title}</span>{r.count > 1 && <b>{r.count}</b>}
      </button>)}
    </div>

    {/* Haut gauche : le blason et l'état du direct */}
    <header data-hud className="hud-crest">
      <div className="crest-mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 2 27 7v10c0 7-5 11-11 13C10 28 5 24 5 17V7z" fill="#c9a25c"/><path d="M16 5l8 3.6V17c0 5.2-3.5 8.3-8 10-4.5-1.7-8-4.8-8-10V8.6z" fill="#2c1e14"/><path d="M9.5 19.5 16 12l6.5 7.5v3h-13z" fill="#e9774f"/><rect x="14" y="17" width="4" height="5.5" fill="#fbe7b6"/></svg></div>
      <div className="crest-text">
        <h1>{CONFIG.title}</h1>
        <p className={err ? 'off' : ''}>{err ? <>Connexion perdue{okAt ? ` · ${ago(new Date(okAt).toISOString(), now)}` : ''}</> : <><i className="live"/>{d ? `Mis à jour ${ago(d.updatedAt, now)}` : 'Chargement…'}</>}</p>
      </div>
    </header>

    {/* Haut droit : les compteurs, qui sont aussi des filtres */}
    {!walking && <nav data-hud className="hud-counters" aria-label="Tâches par statut">
      {STATUS_ORDER.map((s) => <button key={s} className={`counter s-${s} ${list === s ? 'on' : ''} ${c[s] ? '' : 'zero'}`} onClick={() => openCounter(s)} aria-pressed={list === s} aria-label={`${COUNTER_LABEL[s]} : ${c[s]}`}>
        <span className="cicon"><Icon name={s} size={15}/></span><b>{c[s]}</b><small>{COUNTER_LABEL[s]}</small>
      </button>)}
      <button className={`counter s-done ${list === 'done' ? 'on' : ''}`} onClick={() => openCounter('done')} aria-pressed={list === 'done'} aria-label={`${COUNTER_LABEL.done} : ${c.doneToday}`}>
        <span className="cicon"><Icon name="done" size={15}/></span><b>{c.doneToday}</b><small>{COUNTER_LABEL.done}</small>
      </button>
    </nav>}

    <div data-hud className="hud-view"><Toggle view="map"/></div>

    {stale && !err && <div data-hud className="banner">Aucune mise à jour depuis plus de 3 h : les statuts peuvent être périmés.</div>}
    {overflow > 0 && <div data-hud className="banner soft">+{overflow} univers sans parcelle : ils restent visibles dans le dashboard.</div>}

    {/* Événements en direct */}
    <div className="ticker" aria-live="polite">{ticker.map((t) => <div key={t.key} className={`tick s-${t.tone}`}><Icon name={t.tone === 'log' ? 'log' : t.tone} size={15}/><span><b>{t.title}</b>{t.text}</span></div>)}</div>

    {/* Mini-carte et outils de vue (desktop) */}
    {wide && !walking && <div data-hud className="hud-map">
      <Minimap d={d} lots={lots} apiRef={apiRef} onDistrict={(k) => k && flyTo(k)}/>
      <div className="mm-actions">
        <button className="ibtn" onClick={() => apiRef.current?.home()} aria-label="Vue d'ensemble"><Icon name="home"/></button>
        <button className="ibtn" onClick={() => apiRef.current?.zoom(0.74)} aria-label="Zoomer"><Icon name="plus"/></button>
        <button className="ibtn" onClick={() => apiRef.current?.zoom(1.34)} aria-label="Dézoomer"><Icon name="minus"/></button>
        <button className="ibtn" onClick={() => apiRef.current?.rotate(Math.PI / 4)} aria-label="Pivoter la vue"><Icon name="rotate"/></button>
      </div>
    </div>}

    {/* Actions principales */}
    {!walking && <div data-hud className={`hud-actions ${hasPanel && !wide ? 'hidden' : ''}`}>
      {!wide && <button className={`tab ${nav ? 'on' : ''}`} onClick={() => { setList(null); setJournal(false); setNav((v) => !v) }}><Icon name="map"/><span>Quartiers</span></button>}
      <button className={`tab decide ${list === 'decide' ? 'on' : ''} ${c.waiting + c.blocked ? 'alert' : ''}`} onClick={() => openCounter('decide')}><Icon name="waiting"/><span>À décider</span>{c.waiting + c.blocked > 0 && <b className="badge">{c.waiting + c.blocked}</b>}</button>
      <button className={`tab ${journal ? 'on' : ''}`} onClick={() => { apiRef.current?.select(null); apiRef.current?.selectAgent(null); setList(null); setNav(false); setJournal((v) => !v) }}><Icon name="log"/><span>Journal</span></button>
      <div className="time-wrap">
        <button className={`tab ${timeMenu ? 'on' : ''}`} onClick={() => setTimeMenu((v) => !v)} aria-expanded={timeMenu} aria-label={`Heure : ${ambience.name}`}><Icon name={ambience.night ? 'moon' : 'sun'}/><span>{ambience.name || 'Heure'}</span></button>
        {timeMenu && <div className="time-menu" role="menu">{TIME_MODES.map((m) => <button key={m.id} role="menuitemradio" aria-checked={ambience.mode === m.id} className={ambience.mode === m.id ? 'on' : ''} onClick={() => { apiRef.current?.setTimeMode(m.id); setTimeMenu(false) }}>{m.label}</button>)}</div>}
      </div>
      <button className="tab primary" onClick={() => apiRef.current?.startWalk()}><Icon name="walk"/><span>Se balader</span></button>
    </div>}

    {/* Panneau Quartiers (mobile) */}
    {nav && !wide && <Panel wide={false} onHeight={onSheet} title="Quartiers" onClose={() => setNav(false)}>
      <Minimap d={d} lots={lots} apiRef={apiRef} onDistrict={(k) => k && flyTo(k)} compact/>
      <div className="dlist">
        <button onClick={() => flyTo(null)}><i style={{background: '#c9a25c'}}/><span><b>Tout le village</b><small>Vue d'ensemble</small></span></button>
        <button onClick={() => flyTo('office')}><i style={{background: '#8c2f2a'}}/><span><b>Bureau de {CONFIG.boss}</b><small>{c.waiting + c.blocked} à décider</small></span></button>
        {Object.entries(DISTRICTS).filter(([k]) => Object.values(lots).some((l) => l.district === k)).map(([k, q]) => {
          const ids = Object.keys(lots).filter((id) => lots[id].district === k), ts = tasks.filter((t) => ids.includes(t.universe))
          return <button key={k} onClick={() => flyTo(k)}><i style={{background: q.accent}}/><span><b>{q.name}</b><small>{ids.map(uName).join(' · ')}</small></span>{ts.some((t) => t.status === 'active') && <em className="s-active"><Icon name="active" size={10}/>{ts.filter((t) => t.status === 'active').length}</em>}</button>
        })}
      </div>
    </Panel>}

    {/* Panneaux de détail */}
    {d && selected && <HouseSheet d={d} id={selected} room={room} setRoom={setRoom} close={() => apiRef.current?.select(null)} wide={wide} onHeight={onSheet}/>}
    {d && agent && <AgentSheet d={d} id={agent} now={now} close={() => apiRef.current?.selectAgent(null)} onHouse={(u) => apiRef.current?.select(u)} wide={wide} onHeight={onSheet}/>}
    {d && list && <ListSheet d={d} status={list} close={() => setList(null)} onPick={focusTask} wide={wide} onHeight={onSheet}/>}
    {d && journal && <JournalSheet d={d} close={() => setJournal(false)} onPick={focusTask} wide={wide} onHeight={onSheet}/>}

    {/* Mode balade */}
    {walking && <>
      <div data-hud className="quest">
        <div className="quest-head"><Icon name="quest" size={15}/><b>Tournée du boss</b><span>{tour.done}/{tour.total}</span></div>
        {tour.total > 0 && <div className="quest-bar"><i style={{width: `${(tour.done / Math.max(1, tour.total)) * 100}%`}}/></div>}
        {nextStop ? <button className="quest-next" onClick={() => { const a = apiRef.current?.agentPosition(nextStop.id); if (a) apiRef.current.walkTo(a.x, a.z) }}>
          <span ref={compass} className="compass" aria-hidden="true"><Icon name="arrow" size={18}/></span>
          <span><small>{nextStop.status === 'blocked' ? 'Bloqué' : 'Attend ta décision'} · {uName(nextStop.universe)}</small><b>{nextStop.title}</b></span>
        </button> : <p className="quest-empty">{tour.total ? 'Tu as vu tout le monde. Bien joué.' : 'Personne ne t\'attend aujourd\'hui. Promène-toi.'}</p>}
      </div>
      <button data-hud className="walk-exit" onClick={() => apiRef.current?.stopWalk()}><Icon name="close" size={16}/><span>Quitter la balade</span></button>
      <Joystick apiRef={apiRef}/>
      {wide && <div className="walk-keys" aria-hidden="true"><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches pour marcher · <kbd>E</kbd> pour parler · clic au sol pour y aller</div>}
      {near && !talk && !selected && <button data-hud className="act-btn" onClick={() => interactWith(near)}>
        <Icon name={near.kind === 'agent' || near.kind === 'cat' ? 'talk' : 'door'} size={22}/>
        <span><small>{near.kind === 'cat' ? 'Dire bonjour' : near.kind === 'agent' ? 'Parler à' : near.kind === 'office' ? 'Voir' : 'Entrer dans'}</small><b>{near.kind === 'agent' && near.id !== '__archy' ? uName(near.universe) : near.name}</b></span>
      </button>}
    </>}
    {talk && (talkTask || talk === '__archy') && <Dialogue key={talk} speaker={talk === '__archy' ? 'Archy' : `${talkUniverse?.name || ''} · ${LB[talkTask.status]}`} accent={talk === '__archy' ? '#d9a64a' : talkUniverse?.color} lines={talkLines} onClose={() => setTalk(null)}
      footer={talkTask && <>
        <ActionBar t={talkTask} compact/>
        <button className="wide-btn slim" onClick={() => { const u = talkTask.universe; setTalk(null); apiRef.current?.select(u, {fly: false}) }}><Icon name="door" size={15}/> Voir la maison</button>
      </>}/>}

    {/* Écran de chargement */}
    {!ready && !fatal && <div className="loader" role="status"><div className="loader-box">
      <svg viewBox="0 0 32 32" width="62" height="62" aria-hidden="true"><path d="M16 2 27 7v10c0 7-5 11-11 13C10 28 5 24 5 17V7z" fill="#c9a25c"/><path d="M16 5l8 3.6V17c0 5.2-3.5 8.3-8 10-4.5-1.7-8-4.8-8-10V8.6z" fill="#2c1e14"/><path d="M9.5 19.5 16 12l6.5 7.5v3h-13z" fill="#e9774f"/><rect x="14" y="17" width="4" height="5.5" fill="#fbe7b6"/></svg>
      <h2>{CONFIG.title}</h2>
      <div className="bar"><i style={{width: `${Math.round(progress.p * 100)}%`}}/></div>
      <p>{progress.label}…</p>
    </div></div>}
    {fatal && <div className="loader" role="alert"><div className="loader-box"><h2>Le village n'a pas pu s'ouvrir</h2><p>Ce navigateur ne permet pas l'affichage 3D (WebGL 2). Toutes tes tâches restent accessibles dans le dashboard.</p><a className="wide-btn" href="#dash">Ouvrir le dashboard</a></div></div>}
  </div>
}

