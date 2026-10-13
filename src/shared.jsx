import React,{useEffect,useState} from 'react'
export const DATA_URL=import.meta.env.BASE_URL+'data/archy-status.json'
export const SC={active:'#4ade80',waiting:'#fbbf24',scheduled:'#60a5fa',blocked:'#f87171',queued:'#9ca3af',done:'#6b7280'}
export const LB={active:'En cours',waiting:'Attend le boss',scheduled:'Programmé',blocked:'Bloqué',queued:'En file',done:'Terminé'}
export const ORD={active:0,blocked:1,waiting:2,scheduled:3,queued:4,done:5}
export const fmt=(iso)=>iso?new Date(iso).toLocaleString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}):''
export const hm=(iso)=>iso?new Date(iso).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}):''
export const dayKey=(iso)=>new Date(iso).toLocaleDateString('fr-CA',{timeZone:'Europe/Paris'})
export const ago=(iso,now)=>{if(!iso)return '';const m=Math.max(0,Math.round((now-new Date(iso))/60000));return m<1?"à l'instant":m<60?`${m} min`:m<1440?`${Math.floor(m/60)} h${m%60?' '+String(m%60).padStart(2,'0'):''}`:`${Math.floor(m/1440)} j`}
export function useData(){
  const [d,setD]=useState(null),[err,setErr]=useState(false),[now,setNow]=useState(Date.now()),[okAt,setOk]=useState(null)
  useEffect(()=>{let alive=true,last=''
    const load=()=>fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()}).then(x=>{if(!alive)return;const s=JSON.stringify(x);if(s!==last){last=s;setD(x)};setErr(false);setOk(Date.now())}).catch(()=>alive&&setErr(true))
    load();const a=setInterval(load,5000),b=setInterval(()=>setNow(Date.now()),15000);return()=>{alive=false;clearInterval(a);clearInterval(b)}},[])
  return {d,err,now,okAt}
}
export function Toggle({view}){
  const go=v=>{location.hash=v==='map'?'':'#dash'}
  const b=(v,t)=><button onClick={()=>go(v)} className={view===v?'on':''} style={{border:0,padding:'6px 14px',borderRadius:99,font:'600 13px system-ui',cursor:'pointer',background:view===v?'#111827':'transparent',color:view===v?'#fff':'#6b7280'}}>{t}</button>
  return <div style={{display:'inline-flex',background:'#e5e7ebee',borderRadius:99,padding:3,pointerEvents:'auto'}}>{b('map','Map')}{b('dash','Dashboard')}</div>
}
