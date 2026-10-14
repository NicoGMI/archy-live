import * as THREE from 'three'
import {tx,texMat} from './textures.js'
import {M,label,bubble,trainer} from './props.js'
import {ORD,LB,SC} from './shared.jsx'
import {groupedRooms} from './rooms.js'
import {BIOMES} from './city.js'
import {logoBoard,youtubeBadge} from './branding.js'
// Maison « en coupe » façon Sims : une salle par tâche de l'univers, rangées par étages. Façade ouverte vers la place.
export const RW=3.4,RH=2.6,RD=3.2,SLAB=.22
const THEME={
  active:   {w:['#f8dcae','#ea9f6c'],glow:.3,lamp:'#ffe0a0',floor:'#b8814a'},
  blocked:  {w:['#f3b0a6','#cf5a52'],glow:.26,lamp:'#ff8a7a',floor:'#6b4630'},
  waiting:  {w:['#f7e5b4','#dcb455'],glow:.34,lamp:'#ffd38a',floor:'#c09060'},
  scheduled:{w:['#c6dcf4','#7aaee6'],glow:.34,lamp:'#cfe6ff',floor:'#b89a78'},
  queued:   {w:['#d6d6d9','#a4a4aa'],glow:.08,lamp:'#8a8a90',floor:'#8f7a66'},
  done:     {w:['#d2ecd2','#86c486'],glow:.3,lamp:'#e6ffd8',floor:'#c4a070'},
}
const lit=(map,color,k)=>new THREE.MeshLambertMaterial({map,color,emissive:color,emissiveMap:map,emissiveIntensity:k})
const basic=c=>new THREE.MeshBasicMaterial({color:c})
function wrap(ctx,text,maxW,maxLines){const words=String(text||'').split(/\s+/),lines=[];let cur=''
  for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;if(lines.length===maxLines-1)break}else cur=t}
  const used=lines.join(' ').split(/\s+/).length;if(lines.length<maxLines){lines.push(cur)}
  let out=lines.slice(0,maxLines);const total=words.length;if(out.join(' ').split(/\s+/).length<total)out[out.length-1]=out[out.length-1].replace(/\s*\S*$/,'')+'…';return out}
function plane(w,h,draw,cw=256,ch=128,basicMat=true){const c=document.createElement('canvas');c.width=cw;c.height=ch;draw(c.getContext('2d'),cw,ch)
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true}))}
function clockFace(){return plane(.5,.5,(x,w,h)=>{x.fillStyle='#fff8e6';x.beginPath();x.arc(w/2,h/2,w/2-6,0,7);x.fill();x.lineWidth=8;x.strokeStyle='#6b4630';x.stroke();x.strokeStyle='#2b1d14';x.lineWidth=6;x.beginPath();x.moveTo(w/2,h/2);x.lineTo(w/2,h*.2);x.moveTo(w/2,h/2);x.lineTo(w*.7,h*.58);x.stroke()},128,128)}
export function disposeInterior(g){g.traverse(o=>{o.geometry?.dispose();[].concat(o.material??[]).forEach(m=>{if(m.map&&!m.map.userData.keep)m.map.dispose();m.dispose()})})}

function room(t,u,tpl,idx){
  const g=new THREE.Group(),th=THEME[t.status]||THEME.queued,status=t.status
  const box=(w,h,d,mat,x,y,z,o={})=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof mat==='string'?M(mat):mat);m.position.set(x,y,z);if(o.ry)m.rotation.y=o.ry;g.add(m);return m}
  const wp=tx('wallpaper',th.w[0],th.w[1],[3,2])
  // fond + murs latéraux + sol + plafond
  box(RW,RH,.1,lit(wp,'#ffffff',th.glow),0,RH/2,-RD/2,{})
  box(.08,RH,RD,lit(wp,'#f4e8d8',th.glow*.7),-RW/2,RH/2,0);box(.08,RH,RD,lit(wp,'#f4e8d8',th.glow*.7),RW/2,RH/2,0)
  const fl=box(RW,.06,RD,lit(tx('wood',[2,2],th.floor),'#ffffff',th.glow*.55),0,.03,0)
  box(RW,.14,.05,'#fff4e0',0,.12,-RD/2+.08);box(RW,.1,.06,'#fff4e0',0,RH-.05,-RD/2+.06)
  // tapis
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.2),new THREE.MeshLambertMaterial({map:tx('rug',status==='blocked'?'#9a3b3b':status==='done'?'#4a8a58':status==='scheduled'?'#3b5f9a':'#9a3b3b')}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.075,.35);g.add(rug)
  // fenêtre au fond (ciel du soir)
  const win=plane(.95,.75,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#6a5a9a');gr.addColorStop(.6,'#f08a6a');gr.addColorStop(1,'#fbc183');x.fillStyle=gr;x.fillRect(0,0,w,h);x.fillStyle='#fff6e6';x.fillRect(w/2-3,0,6,h);x.fillRect(0,h/2-3,w,6);x.lineWidth=10;x.strokeStyle='#fff6e6';x.strokeRect(0,0,w,h)},128,100)
  win.position.set(status==='scheduled'?.85:-.85,1.62,-RD/2+.07);g.add(win)
  // lampe suspendue
  const lampOn=status!=='queued'
  box(.02,.45,.02,'#3a2c26',0,RH-.25,-.1);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),basic(th.lamp));bulb.position.set(0,RH-.52,-.1);g.add(bulb)
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.22,.16,10,1,true),new THREE.MeshLambertMaterial({color:'#d9a05a',side:THREE.DoubleSide}));cone.position.set(0,RH-.4,-.1);g.add(cone)
  if(lampOn){const halo=new THREE.Mesh(new THREE.CircleGeometry(.9,24),new THREE.MeshBasicMaterial({color:th.lamp,transparent:true,opacity:.14,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.set(0,.09,-.1);g.add(halo)}
  // titre + puce statut + note
  const title=label((t.title.length>20?t.title.slice(0,19)+'…':t.title),SC[status]||'#888',44);title.scale.multiplyScalar(.5);title.position.set(0,RH-.3,-RD/2+.2);g.add(title)
  const chip=label(LB[status]||status,SC[status]||'#888',34,SC[status]||'#999','#111');chip.scale.multiplyScalar(.45);chip.position.set(0,RH-.62,-RD/2+.2);g.add(chip)
  if(t.note){const note=plane(1.1,.68,(x,w,h)=>{x.fillStyle='#fff6bf';x.fillRect(0,0,w,h);x.fillStyle='#e0b94a';x.fillRect(0,0,w,14);x.fillStyle='#3a2a0a';x.font='700 21px system-ui';wrap(x,t.note,w-20,5).forEach((l,i)=>x.fillText(l,10,40+i*26))},256,160)
    note.position.set(status==='scheduled'?-.9:.85,1.3,-RD/2+.07);note.rotation.z=.04;g.add(note)}
  // meubles par statut
  const desk=(x,z,screen)=>{box(1.2,.07,.6,'#7a4a2a',x,.78,z);box(.07,.74,.55,'#5a3520',x-.55,.4,z);box(.07,.74,.55,'#5a3520',x+.55,.4,z)
    box(.5,.02,.34,'#e9eef5',x-.2,.835,z+.02);const sc=box(.46,.3,.03,basic(screen),x+.1,1.0,z-.18);box(.06,.14,.06,'#333',x+.1,.88,z-.18)
    box(.28,.015,.2,'#fef3c7',x+.4,.82,z+.12)}
  const chair=(x,z)=>{box(.46,.07,.42,'#7f1d1d',x,.46,z);box(.46,.55,.07,'#7f1d1d',x,.74,z-.2);box(.05,.4,.05,'#333',x,.24,z)}
  const shelf=(x)=>{box(.14,1.5,.7,'#6b4630',x,.78,-.8);for(let k=0;k<4;k++){box(.15,.04,.68,'#4a2f1c',x,.3+k*.4,-.8);for(let j=0;j<5;j++)box(.1,.26,.08,['#c0392b','#2e86c1','#d4ac0d','#27ae60','#8e44ad'][(j+k)%5],x,.46+k*.4,-1.0+j*.12+.05)}}
  const plant=(x,z)=>{box(.24,.26,.24,'#a0522d',x,.16,z);const l=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,0),M('#4e9b53'));l.position.set(x,.5,z);g.add(l);const l2=new THREE.Mesh(new THREE.IcosahedronGeometry(.18,0),M('#6bbf6e'));l2.position.set(x+.1,.74,z);g.add(l2)}
  const person=(x,z,ry,shirt,bubbleCh,bubbleCol,s=.95)=>{const w=trainer(shirt,'#ef4444');w.scale.setScalar(s);w.position.set(x,.06,z);w.rotation.y=ry;w.userData.kind=status;w.userData.ry=ry;tpl.walkers.push(w);const b=bubble(bubbleCh,bubbleCol);b.position.set(0,1.75,0);b.scale.set(.5,.5,1);w.add(b);g.add(w);return w}
  const crate=(x,y,z,s=.5)=>box(s,s,s,'#b48a5a',x,y+s/2,z,{ry:Math.random()*.4})
  if(status==='active'){desk(-.15,-.55,'#7dffb0');chair(-.15,-.1);shelf(RW/2-.12);plant(-RW/2+.28,.9);person(-.15,-.82,0,u.color,'!','#16a34a')}
  else if(status==='blocked'){desk(-.2,-.6,'#ff5a4a');chair(-.2,-.15);person(.55,.2,Math.PI*.9,'#fca5a5','✕','#dc2626')
    const lk=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.3,.26,.1),M('#d4a017'));lk.add(body);const sh=new THREE.Mesh(new THREE.TorusGeometry(.1,.025,6,12,Math.PI),M('#9aa0a6'));sh.position.y=.15;lk.add(sh);lk.position.set(RW/2-.4,1.55,-RD/2+.12);g.add(lk)
    crate(-RW/2+.35,.06,.8);crate(-RW/2+.35,.56,.8,.4)}
  else if(status==='waiting'){const cl=clockFace();cl.position.set(-.1,1.85,-RD/2+.07);g.add(cl)
    box(1.1,.34,.5,'#6b8ab8',.2,.25,-.8);box(1.1,.4,.12,'#5a7aa8',.2,.5,-1.06);box(.12,.3,.5,'#5a7aa8',-.4,.35,-.8);box(.12,.3,.5,'#5a7aa8',.8,.35,-.8)
    box(.5,.06,.34,'#7a4a2a',.2,.3,.5);person(.2,-.1,0,'#cbd5e1','…','#d97706');plant(RW/2-.28,.9)}
  else if(status==='scheduled'){const cal=plane(.62,.7,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#2563eb';x.fillRect(0,0,w,34);x.fillStyle='#fff';x.font='700 22px system-ui';x.fillText('PROG.',10,25)
      x.fillStyle='#1f2937';x.font='800 60px system-ui';const d=t.scheduledAt?new Date(t.scheduledAt):null;x.fillText(d?String(d.getDate()):'⏱',18,100);x.font='600 18px system-ui';x.fillText(d?d.toLocaleDateString('fr-FR',{month:'short',timeZone:'Europe/Paris'})+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}):'',8,128)},128,140)
    cal.position.set(-.1,1.55,-RD/2+.07);g.add(cal);desk(.15,-.6,'#9cc3ff');chair(.15,-.15);person(-.7,.2,Math.PI*.15,'#cbd5e1','⏱','#2563eb');const cl=clockFace();cl.position.set(RW/2-.4,2.05,-RD/2+.07);g.add(cl)}
  else if(status==='queued'){crate(-.9,.06,-.8);crate(-.3,.06,-.9,.6);crate(.3,.06,-.8);crate(-.55,.6,-.85,.45);crate(.9,.06,.2,.55)
    const cover=box(1.0,.5,.7,'#c9c9cf',.4,.31,.5);cover.rotation.y=.2}
  else{desk(-.3,-.6,'#a9d8b0');chair(-.3,-.15);shelf(RW/2-.12);plant(-RW/2+.28,.9)
    const tr=new THREE.Group();const cup=new THREE.Mesh(new THREE.CylinderGeometry(.12,.07,.2,10),new THREE.MeshLambertMaterial({color:'#f5c542',emissive:'#a07a10',emissiveIntensity:.5}));cup.position.y=.1;tr.add(cup);const st=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.12,6),M('#f5c542'));st.position.y=.26;tr.add(st);const bs=new THREE.Mesh(new THREE.BoxGeometry(.2,.06,.14),M('#5a3520'));tr.add(bs);tr.position.set(.1,.855,-.65);g.add(tr)
    const tk=bubble('✓','#16a34a');tk.position.set(.45,1.35,-.4);tk.scale.set(.55,.55,1);g.add(tk)}
  g.userData.taskId=t.id
  if(t.roomId==='analytics'){const bars=[.35,.6,.9,.7];bars.forEach((h,i)=>box(.18,h,.12,['#ff3355','#ff6677','#ff99aa','#ffc2c9'][i],-.45+i*.3,.85+h/2,-1.3))}
  if(t.roomId==='archives'){shelf(-RW/2+.12)}
  if(t.roomId==='prep-cours'){const board=plane(1.1,.65,(x,w,h)=>{x.fillStyle='#234a39';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.font='700 28px system-ui';x.fillText('COURS',20,38);x.fillRect(20,65,w-50,4);x.fillRect(20,90,w-90,4)});board.position.set(0,1.65,-RD/2+.1);g.add(board)}
  return g}

export function buildInterior(u,tasks){
  const root=new THREE.Group(),tpl={walkers:[]}
  const groups=groupedRooms(u,tasks.filter(t=>t.id!=='_vide'))
  const sorted=groups.map(q=>{const list=[...q.tasks].sort((a,b)=>ORD[a.status]-ORD[b.status]);const t=list[0];return {id:'room:'+q.id,title:q.title,status:t?.status||'queued',note:list.length?list.length+' tâche'+(list.length>1?'s':'')+' · '+list.filter(t=>t.status!=='done').length+' non terminée'+(list.filter(t=>t.status!=='done').length>1?'s':''):'Aucune tâche en cours',scheduledAt:t?.scheduledAt,roomId:q.id}})
  const n=sorted.length,cols=n<=3?n:n===4?2:3,rows=Math.ceil(n/cols),W=cols*RW,Hh=rows*(RH+SLAB)
  // fondation + enseigne
  const base=new THREE.Mesh(new THREE.BoxGeometry(W+.5,.3,RD+.6),texMat(tx('stone',[4,1])));base.position.set(0,-.15,.1);root.add(base)
  for(let r=0;r<=rows;r++){const y=r*(RH+SLAB)-SLAB/2;const sl=new THREE.Mesh(new THREE.BoxGeometry(W+.3,SLAB,RD+.15),texMat(tx('plaster','#e9d3ad',[4,1])));sl.position.set(0,y+(r===0?.0:0),0.02);if(r>0&&r<rows)root.add(sl)}
  // cadre extérieur (montants)
  for(let c=0;c<=cols;c++){const p=new THREE.Mesh(new THREE.BoxGeometry(.14,Hh,RD+.2),M('#8a6a46'));p.position.set(-W/2+c*RW,Hh/2,0);root.add(p)}
  const b=BIOMES[u.district]||BIOMES.formation;const rc=texMat(tx('roof','#ffffff',[3,1]),{color:new THREE.Color(b.roof)})
  const roof=new THREE.Mesh(new THREE.BoxGeometry(W+.8,.16,1.5),rc);roof.position.set(0,Hh+.55,-RD/2-.35);roof.rotation.x=u.district==='etudiant'?0:.75;root.add(roof)
  const back=new THREE.Mesh(new THREE.BoxGeometry(W+.3,.5,.1),texMat(tx('plaster','#e9d3ad',[4,1])));back.position.set(0,Hh+.2,-RD/2);root.add(back)
  const sign=label(`${u.emoji||''} ${u.name}`,u.color,50);sign.position.set(0,Hh+1.1,-.6);sign.scale.multiplyScalar(1.15);root.add(sign)
  const brand=logoBoard(u.id,1.7,.65)||(u.id==='phil'?youtubeBadge():null);if(brand){brand.position.set(0,Hh+1.9,-.6);root.add(brand)}
  sorted.forEach((t,i)=>{const r=Math.floor(i/cols),c=i%cols,g=room(t,u,tpl,i);g.position.set(-W/2+RW/2+c*RW,r*(RH+SLAB),0);g.userData.room=true;root.add(g)})
  const fr=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(RW+.02,RH+.02,RD+.02)),new THREE.LineBasicMaterial({color:'#facc15',depthTest:false}));fr.position.y=RH/2;fr.renderOrder=12;fr.visible=false;root.add(fr)
  root.userData={frame:fr,W,H:Hh,walkers:tpl.walkers,rooms:n,total:tasks.length}
  return root}
