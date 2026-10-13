import React,{useMemo,useState} from 'react'
import {useData,Toggle,SC,LB,ORD,fmt,hm,dayKey,ago} from './shared.jsx'
function Task({t,d,now,u,open,toggle}){
  const lg=d.log.filter(l=>l.task===t.id)
  const when=t.status==='done'?`terminé ${fmt(t.doneAt)}`:t.status==='scheduled'?`prévu ${fmt(t.scheduledAt)}`:t.status==='active'&&t.startedAt?`depuis ${ago(t.startedAt,now)}`:''
  return <div className={'trow '+t.status} onClick={toggle}>
    <span className="bar" style={{background:SC[t.status]}}/>
    <div className="tmain">
      <div className="ttl"><span className="uni" style={{color:u?.color}}>{u?.name}</span>{t.status==='active'&&<i className="pulse"/>}<b>{t.title}</b></div>
      <div className="meta"><span className="chip" style={{'--c':SC[t.status]}}>{LB[t.status]}</span>{when&&<span>{when}</span>}</div>
      {t.note&&<div className="note">{t.note}</div>}
      {open&&<div className="hist">{lg.length?lg.map((l,i)=><div key={i}><time>{fmt(l.at)}</time>{l.text}</div>):<div className="muted">Pas d'historique enregistré</div>}</div>}
    </div></div>}
export default function Dashboard(){
  const {d,err,now,okAt}=useData(),[uf,setUf]=useState(null),[open,setOpen]=useState({}),[showAll,setAll]=useState(false)
  const U=useMemo(()=>Object.fromEntries((d?.universes||[]).map(u=>[u.id,u])),[d])
  if(!d)return <div className="boot">{err?'Données indisponibles':'Chargement…'}</div>
  const tasks=d.tasks.filter(t=>!uf||t.universe===uf),by=s=>tasks.filter(t=>t.status===s)
  const today=dayKey(new Date(now).toISOString())
  const doneToday=d.tasks.filter(t=>t.status==='done'&&t.doneAt&&dayKey(t.doneAt)===today).length
  const k=s=>d.tasks.filter(t=>t.status===s).length
  const stale=now-new Date(d.updatedAt)>3*3600e3
  const row=t=><Task key={t.id} t={t} d={d} now={now} u={U[t.universe]} open={!!open[t.id]} toggle={()=>setOpen(o=>({...o,[t.id]:!o[t.id]}))}/>
  const need=[...by('blocked'),...by('waiting')]
  const sched=by('scheduled').sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt))
  const done=by('done').sort((a,b)=>new Date(b.doneAt)-new Date(a.doneAt))
  const feed=d.log.filter(l=>!uf||d.tasks.find(t=>t.id===l.task)?.universe===uf)
  const groups=[];feed.slice(0,showAll?200:25).forEach(l=>{const k=dayKey(l.at);let g=groups.find(x=>x.k===k);if(!g)groups.push(g={k,items:[]});g.items.push(l)})
  const dl=k=>k===today?"Aujourd'hui":new Date(k+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
  const Sec=({title,n,children,accent})=>n===0?null:<section className="sec"><h3 style={accent?{color:accent}:null}>{title}<span>{n}</span></h3>{children}</section>
  return <div className="dash">
    <header><div><h1>Archy</h1><div className="sub"><span className={'live '+(err?'off':'')}><i className={err?'':'pulse'}/>{err?'connexion perdue':'live'}</span>
      <span>mis à jour {ago(d.updatedAt,now)}</span></div></div><Toggle view="dash"/></header>
    {(err||stale)&&<div className="warn">{err?`Impossible de rafraîchir (dernières données reçues il y a ${okAt?ago(new Date(okAt).toISOString(),now):'?'}).`:`Aucune mise à jour depuis plus de 3 h : les statuts peuvent être périmés.`}</div>}
    <div className="kpis">
      {[['En cours',k('active'),SC.active],['Attendent le boss',k('waiting')+k('blocked'),SC.waiting],['Programmés',k('scheduled'),SC.scheduled],["Terminés aujourd'hui",doneToday,'#a3a3a3']].map(([l,n,c])=><div key={l} className="kpi"><b style={{color:c}}>{n}</b><span>{l}</span></div>)}</div>
    <div className="unis">{d.universes.map(u=>{const ts=d.tasks.filter(t=>t.universe===u.id);if(!ts.length)return null;const n=s=>ts.filter(t=>t.status===s).length
      return <button key={u.id} className={'ucard '+(uf===u.id?'sel':'')} style={{'--c':u.color}} onClick={()=>setUf(uf===u.id?null:u.id)}>
        <div className="un"><i style={{background:u.color}}/>{u.name}{n('active')>0&&<em className="pulse"/>}</div>
        <div className="seg">{['active','waiting','blocked','scheduled','queued','done'].map(s=>n(s)?<span key={s} style={{flex:n(s),background:SC[s]}}/>:null)}</div>
        <div className="uc">{n('active')} en cours · {n('waiting')+n('blocked')} attente · {n('done')} finis</div></button>})}</div>
    {uf&&<div className="filter">Filtre : <b>{U[uf].name}</b> <button onClick={()=>setUf(null)}>Tout afficher</button></div>}
    <div className="cols"><div className="colmain">
      <Sec title="À décider / en attente du boss" n={need.length} accent={SC.waiting}>{need.map(row)}</Sec>
      <Sec title="En cours" n={by('active').length} accent={SC.active}>{by('active').map(row)}</Sec>
      <Sec title="Programmé" n={sched.length} accent={SC.scheduled}>{sched.map(row)}</Sec>
      <Sec title="En file" n={by('queued').length}>{by('queued').map(row)}</Sec>
      <Sec title="Terminé" n={done.length}>{done.slice(0,12).map(row)}</Sec>
      {tasks.length===0&&<div className="muted pad">Rien dans cet univers.</div>}
    </div>
    <aside className="colside"><section className="sec"><h3>Journal<span>{feed.length}</span></h3>
      {groups.map(g=><div key={g.k} className="day"><h4>{dl(g.k)}</h4>{g.items.map((l,i)=>{const t=d.tasks.find(x=>x.id===l.task),u=U[t?.universe];return <div key={i} className="ev"><time>{hm(l.at)}</time><i style={{background:u?.color||'#555'}}/><div><b>{t?.title||l.task}</b><div>{l.text}</div></div></div>})}</div>)}
      {feed.length>25&&<button className="more" onClick={()=>setAll(!showAll)}>{showAll?'Réduire':'Voir tout le journal'}</button>}
    </section></aside></div>
  </div>}
