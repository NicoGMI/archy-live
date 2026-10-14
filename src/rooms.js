export const ROOM_DEFS={
 phil:[['publication','Publication'],['commentaires','Commentaires'],['analytics','Analytics']],
 cts:[['strategie','Stratégie marketing'],['app','Application']],
 isme:[['prep-cours','Préparation cours'],['archives','Archives mails']],
 excelia:[['prep-cours','Préparation cours'],['archives','Archives mails']],
 iae:[['prep-cours','Préparation cours'],['archives','Archives mails']],
 efrei:[['prep-cours','Préparation cours'],['archives','Archives mails']],
 ece:[['prep-cours','Préparation cours'],['archives','Archives mails']]
}
export const roomOf=(t,u)=>t.room||(['isme','excelia','iae','efrei','ece'].includes(u)?(/mail|brouillon|réponse/i.test(t.title)?'archives':'prep-cours'):u==='phil'?(/comment/i.test(t.title)?'commentaires':/stat|analyt/i.test(t.title)?'analytics':'publication'):u==='cts'?(/app/i.test(t.title)?'app':'strategie'):'activite')
export function groupedRooms(u,tasks){
 if(!ROOM_DEFS[u.id])return tasks.length?tasks.map(t=>({id:t.id,title:t.title,tasks:[t]})):[{id:'activite',title:'Activité',tasks:[]}]
 const defs=ROOM_DEFS[u.id]
 const extra=[...new Set(tasks.map(t=>roomOf(t,u.id)))].filter(id=>!defs.some(d=>d[0]===id))
 return [...defs,...extra.map(id=>[id,id])].map(([id,title])=>({id,title,tasks:tasks.filter(t=>roomOf(t,u.id)===id)}))
}
export const LOGOS={isme:'/logos/isme.svg',excelia:'/logos/excelia.svg',efrei:'/logos/efrei.png',ece:'/logos/ece.svg'}
