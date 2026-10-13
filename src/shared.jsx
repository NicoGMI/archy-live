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
  if(!staticOnly){try{const x=await get(API_URL);if(x&&Array.isArray(x.tasks))return x}catch{} staticOnly=true}
  return get(DATA_URL)}
export function useData(){
  const [d,setD]=useState(null),[err,setErr]=useState(false),[now,setNow]=useState(Date.now()),[okAt,setOk]=useState(null)
  useEffect(()=>{let alive=true,last='',a=null
    const load=()=>fetchStatus().then(x=>{if(!alive)return;const s=JSON.stringify(x);if(s!==last){last=s;setD(x)};setErr(false);setOk(Date.now())}).catch(()=>alive&&setErr(true))
    const start=()=>{if(a==null){load();a=setInterval(load,CONFIG.refreshSeconds*1000)}}
    const stop=()=>{clearInterval(a);a=null}
    const vis=()=>{document.hidden?stop():start()}
    const b=setInterval(()=>setNow(Date.now()),15000)
    document.addEventListener('visibilitychange',vis);vis()
    return()=>{alive=false;stop();clearInterval(b);document.removeEventListener('visibilitychange',vis)}},[])
  return {d,err,now,okAt}
}
export function Toggle({view}){
  const go=v=>{location.hash=v==='map'?'':'#dash'}
  const b=(v,t)=><button onClick={()=>go(v)} aria-pressed={view===v} className={view===v?'on':''} style={{border:0,padding:'6px 14px',borderRadius:99,font:'600 13px system-ui',cursor:'pointer',background:view===v?'#111827':'transparent',color:view===v?'#fff':'#6b7280'}}>{t}</button>
  return <div role="group" aria-label="Vue" style={{display:'inline-flex',background:'#e5e7ebee',borderRadius:99,padding:3,pointerEvents:'auto'}}>{b('map','Map')}{b('dash','Dashboard')}</div>
}
