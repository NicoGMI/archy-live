export function parseReport(report=''){
 const get=re=>report.match(re)?.[1]||''
 return{profile:get(/Profil : (.+)/),total:get(/Indice global : (\d+)\/100/),level:get(/Indice global : \d+\/100 · (.+)/),message:get(/Message : ([\s\S]*?)\n\n---/),strong:get(/Point fort : (.+?) ·/),next:get(/Prochain levier : (.+)/),dimensions:[...report.matchAll(/^- (.+?) : (\d+) %/gm)].map(m=>({name:m[1],score:Number(m[2])})),answers:[...report.matchAll(/^(\d+)\. \[(.+?)\] (.+?) : niveau (\d)\/4 · « (.+) »$/gm)].map(m=>({n:Number(m[1]),dimension:m[2],label:m[3],level:Number(m[4]),answer:m[5]})),test:/Test technique production/.test(report),declaredTest:/ceci est un test/i.test(report)}
}
export function participants(records=[]){
 const grouped=new Map();for(const record of records){const key=record.email.trim().toLowerCase();if(!grouped.has(key))grouped.set(key,{email:record.email,events:[],reports:[]});const p=grouped.get(key);p.events.push(record);if(record.report)p.reports.push({...record,result:parseReport(record.report)})}
 return [...grouped.values()].reverse()
}
