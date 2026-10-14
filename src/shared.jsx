import React,{useEffect,useState} from 'react'
import {CONFIG} from './config.js'
const BASE=import.meta.env.BASE_URL
export const DATA_URL=BASE+'data/archy-status.json'
export const API_URL=BASE+'api/status'
export const SC={active:'#4ade80',waiting:'#fbbf24',scheduled:'#60a5fa',blocked:'#f87171',queued:'#9ca3af',done:'#6b7280'}
export const LB={active:'En cours',waiting:'Attend '+CONFIG.boss,scheduled:'Programmé',blocked:'Bloqué',queued:'En file',done:'Terminé'}
export const ORD={active:0,blocked:1,waiting:2,scheduled:3,queued:4,done:5}
const TZ=CONFIG.timeZone,LOC=CONFIG.locale
export const fmt=(iso)=>iso?new Date(iso).toLocaleString(LOC,{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:TZ}):''
export const hm=(iso)=>iso?new Date(iso).toLocaleTimeString(LOC,{hour:'2-digit',minute:'2-digit',timeZone:TZ}):''
export const dayKey=(iso)=>new Date(iso).toLocaleDateString('fr-CA',{timeZone:TZ})
export const ago=(iso,now)=>{if(!iso)return '';const m=Math.max(0,Math.round((now-new Date(iso))/60000));return m<1?"à l'instant":m<60?`${m} min`:m<1440?`${Math.floor(m/60)} h${m%60?' '+String(m%60).padStart(2,'0'):''}`:`${Math.floor(m/1440)} j`}
// Source des données : endpoint /api/status s'il existe, sinon fichier statique.
let staticOnly=false
async function fetchStatus(){
  const get=async(u)=>{const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return r.json()}
  if(!staticOnly){try{const x=await get(API_URL);if(x&&Array.isArray(x.tasks))return x}catch{}}
  return get(DATA_URL)}
export function useData(){
  const [d,setD]=useState(null),[err,setErr]=useState(false),[now,setNow]=useState(Date.now()),[okAt,setOk]=useState(null)
  useEffect(()=>{let alive=true,last='',a=null
    const load=()=>fetchStatus().then(x=>{if(!alive)return;const s=JSON.stringify(x);if(s!==last){last=s;setD(x)};setErr(false);setOk(Date.now())}).catch(()=>alive&&setErr(true))
    const start=()=>{if(a==null){load();a=setInterval(load,CONFIG.refreshSeconds*1000)}}
    const stop=()=>{clearInterval(a);a=null}
    const vis=()=>{document.hidden?stop():start()}
    const b=setInterval(()=>setNow(Date.now()),15000)
    document.addEventListener('visibilitychange',vis);load();if(!document.hidden)a=setInterval(load,CONFIG.refreshSeconds*1000)
    return()=>{alive=false;stop();clearInterval(b);document.removeEventListener('visibilitychange',vis)}},[])
  return {d,err,now,okAt}
}
export function Toggle({view}){
  const go=v=>{location.hash=v==='map'?'':'#dash'}
  const b=(v,t)=><button onClick={()=>go(v)} aria-pressed={view===v} className={view===v?'on':''} style={{border:0,padding:'6px 14px',borderRadius:99,font:'600 13px system-ui',cursor:'pointer',background:view===v?'#111827':'transparent',color:view===v?'#fff':'#6b7280'}}>{t}</button>
  return <div role="group" aria-label="Vue" style={{display:'inline-flex',background:'#e5e7ebee',borderRadius:99,padding:3,pointerEvents:'auto'}}>{b('map','Map')}{b('dash','Dashboard')}</div>
}

// ---- Actions de pilotage (annuler / important) : stockées via /api/actions, lues par Archy ----
const ACT_URL=BASE+'api/actions'
let actList=[];const actSubs=new Set();let actTimer=null
const actPush=l=>{actList=l;actSubs.forEach(f=>f(l))}
export const actLoad=()=>fetch(ACT_URL+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>x&&Array.isArray(x.actions)&&actPush(x.actions)).catch(()=>{})
export function useActions(){
  const [l,setL]=useState(actList)
  useEffect(()=>{actSubs.add(setL);if(!actTimer){actLoad();actTimer=setInterval(()=>{if(!document.hidden)actLoad()},CONFIG.refreshSeconds*1000)}
    return()=>{actSubs.delete(setL);if(!actSubs.size){clearInterval(actTimer);actTimer=null}}},[])
  return l
}
// état courant d'une tâche d'après la dernière action
export function taskAct(list,id){
  const mine=list.filter(a=>a.task===id);if(!mine.length)return {}
  const last=mine[mine.length-1];const imp=[...mine].reverse().find(a=>a.action!=='cancel')
  return {cancel:last.action==='cancel'?last:null,important:imp&&imp.action==='important'?imp:null}
}
export function ActionBar({t,compact}){
  const list=useActions(),[arm,setArm]=useState(false),[busy,setBusy]=useState(false),[err,setErr]=useState('')
  if(t.status==='done')return null
  const st=taskAct(list,t.id)
  const send=async action=>{setBusy(true);setErr('');try{const r=await fetch(ACT_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task:t.id,action})});if(!r.ok)throw new Error();await actLoad()}catch{setErr("Échec de l'envoi")}setBusy(false);setArm(false)}
  const b={border:0,borderRadius:99,padding:compact?'4px 11px':'6px 13px',fontWeight:700,cursor:'pointer',font:'inherit',fontSize:12}
  const stop=e=>e.stopPropagation()
  return <div onClick={stop} onPointerDown={stop} onKeyDown={stop} style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginTop:6}}>
    <button disabled={busy} onClick={()=>send(st.important?'unimportant':'important')} aria-pressed={!!st.important} style={{...b,background:st.important?'#f59e0b':'#fde9b8',color:'#4a2f00'}}>{st.important?'★ Important':'☆ Important'}</button>
    {st.cancel?<span style={{...b,background:st.cancel.ack?'#d1d5db':'#fecaca',color:'#7f1d1d',cursor:'default'}}>{st.cancel.ack?'✕ Annulation prise en compte':'✕ Annulation demandée'}</span>
      :arm?<><button disabled={busy} onClick={()=>send('cancel')} style={{...b,background:'#dc2626',color:'#fff'}}>Confirmer l'annulation</button><button onClick={()=>setArm(false)} style={{...b,background:'#e5e7eb',color:'#374151'}}>Non</button></>
      :<button disabled={busy} onClick={()=>setArm(true)} style={{...b,background:'#fee2e2',color:'#991b1b'}}>✕ Annuler</button>}
    {st.important&&!st.important.ack&&<span style={{fontSize:11,opacity:.7}}>transmis à Archy</span>}
    {err&&<span style={{fontSize:11,color:'#b91c1c'}}>{err}</span>}
  </div>}
