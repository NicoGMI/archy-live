import React from 'react'
import {fmt} from './shared.jsx'
export default function YoutubeStats({stats,compact=false}){
 if(!stats)return null
 const s=stats
 return <section style={{background:'#fff9f1',border:'1px solid #f3dfc8',borderRadius:14,padding:compact?12:18,margin:'10px 0',color:'#302820'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><b style={{fontSize:compact?15:19}}>▶ Chaîne Phil</b><span style={{fontSize:11,color:'#7b7064'}}>Relevé {fmt(s.at)}</span></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,margin:'12px 0'}}>{[['Abonnés',s.subscribers??s.abonnes],['Vues · 28 jours',s.views28d??s.vues28j],['Dernière vidéo · vues',s.latest?.views??s.latestViews],['Dernière vidéo · likes',s.latest?.likes??s.latestLikes]].map(([l,v])=><div key={l} style={{background:'#f3ece2',borderRadius:9,padding:9}}><b style={{fontSize:22,display:'block'}}>{v??'Non relevé'}</b><span style={{fontSize:11}}>{l}</span></div>)}</div>
  <div style={{fontSize:12}}><b>Dernière publiée</b><div>{s.latest?.title??s.latestTitle??'Non relevée'}</div><div style={{marginTop:7}}><b>Top du relevé</b><div>{s.top?.title??s.topTitle??'Non relevé'}{s.top?.views!=null?' · '+s.top.views+' vues':''}</div></div></div>
  <div style={{fontSize:11,color:'#8c7c6c',marginTop:9}}>Relevés horaires, pas un compteur seconde par seconde.</div>
 </section>
}
