// Private diagnostic snapshots. GET is protected by the site's password middleware.
// No provider credentials or participant data are bundled into static assets.
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}})
const safeEq=(a,b)=>{if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
export async function onRequestGet({env}){if(!env.ARCHY)return json({error:'Stockage indisponible'},503);const d=await env.ARCHY.get('diagnostics');return d?json(JSON.parse(d)):json({error:'Résultats non synchronisés'},404)}
export async function onRequestPost({request,env}){
 const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');if(!env.ARCHY_WRITE_TOKEN||!safeEq(token,env.ARCHY_WRITE_TOKEN))return json({error:'forbidden'},403)
 if(!env.ARCHY)return json({error:'Stockage indisponible'},503);const body=await request.text();if(body.length>500000)return json({error:'Trop volumineux'},413)
 let d;try{d=JSON.parse(body)}catch{return json({error:'JSON invalide'},400)}
 if(!d?.updatedAt||!Array.isArray(d.records)||d.records.some(r=>typeof r.email!=='string'||typeof r.report!=='string'||typeof r.type!=='string'))return json({error:'Format invalide'},400)
 await env.ARCHY.put('diagnostics',JSON.stringify(d));return json({ok:true,records:d.records.length})
}
