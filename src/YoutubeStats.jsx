import React from 'react'
import {fmt} from './shared.jsx'
export default function YoutubeStats({stats,compact=false}){
 if(!stats)return null
 const s=stats
 const cells=[['Abonnés',s.subscribers??s.abonnes],['Vues · 28 jours',s.views28d??s.vues28j],['Dernière vidéo · vues',s.latest?.views??s.latestViews],['Dernière vidéo · likes',s.latest?.likes??s.latestLikes]]
 return <section className={'yt'+(compact?' compact':'')}>
  <header><b>▶ Chaîne Phil</b><time>Relevé {fmt(s.at)}</time></header>
  <div className="yt-cells">{cells.map(([l,v])=><div key={l}><b>{v??'Non relevé'}</b><span>{l}</span></div>)}</div>
  <dl><dt>Dernière publiée</dt><dd>{s.latest?.title??s.latestTitle??'Non relevée'}</dd><dt>Top du relevé</dt><dd>{s.top?.title??s.topTitle??'Non relevé'}{s.top?.views!=null?' · '+s.top.views+' vues':''}</dd></dl>
  <small>Relevés horaires, pas un compteur seconde par seconde.</small>
 </section>
}
