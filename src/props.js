import * as THREE from 'three'
import {gaitPose} from './motion.js'
export const M=(c,o={})=>new THREE.MeshLambertMaterial({color:c,...o})
export function label(text,color='#fff',size=56,bg='rgba(255,255,255,.92)',fg='#1f2937'){
  const c=document.createElement('canvas'),x=c.getContext('2d');x.font=`700 ${size}px system-ui,sans-serif`
  const w=Math.ceil(x.measureText(text).width)+56,h=size+36;c.width=w;c.height=h;x.font=`700 ${size}px system-ui,sans-serif`
  x.fillStyle=bg;x.beginPath();x.roundRect(4,4,w-8,h-8,h/2.4);x.fill();x.lineWidth=8;x.strokeStyle=color;x.stroke()
  x.fillStyle=fg;x.textBaseline='middle';x.fillText(text,28,h/2+3)
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(w/h*.8,.8,1);s.renderOrder=10;return s}
export function bubble(ch,col){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')
  x.fillStyle='#fff';x.beginPath();x.arc(64,60,50,0,7);x.fill();x.lineWidth=10;x.strokeStyle=col;x.stroke()
  x.fillStyle=col;x.font='bold 74px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(ch,64,64)
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(.7,.7,1);s.renderOrder=11;return s}
export function trainer(shirt,hat='#ef4444'){
  const g=new THREE.Group(),sk=M('#f8d3ad'),dk=M('#2b1d14')
  const add=(geo,m,x,y,z,par=g)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);par.add(o);return o}
  const knees=[],elbows=[],feet=[],torso=new THREE.Group();g.add(torso)
  const trouser=M('#34465b'),shoe=M('#654733'),cloth=M(shirt),trim=M('#fff1d6')
  const legs=[-1,1].map(s=>{const hip=new THREE.Group();hip.position.set(s*.105,.55,0)
    add(new THREE.CapsuleGeometry(.085,.12,5,12),trouser,0,-.12,0,hip)
    const knee=new THREE.Group();knee.position.y=-.25;hip.add(knee);knees.push(knee)
    add(new THREE.CapsuleGeometry(.065,.1,5,12),trouser,0,-.09,0,knee)
    const foot=add(new THREE.SphereGeometry(.09,12,10),shoe,0,-.205,.045,knee);foot.scale.set(1,.65,1.55);feet.push(foot)
    add(new THREE.BoxGeometry(.17,.035,.235),trim,0,-.258,.04,knee);torso.add(hip);return hip})
  const body=add(new THREE.CapsuleGeometry(.19,.22,6,16),cloth,0,.79,0,torso);body.scale.set(1,1,.82)
  add(new THREE.CylinderGeometry(.195,.195,.05,16),trim,0,.61,0,torso).scale.set(1,1,.82)
  // Jacket opening, two buttons and a small collar make the torso readable at close range.
  add(new THREE.BoxGeometry(.016,.23,.016),trim,0,.79,.169,torso)
  for(const y of [.75,.85])add(new THREE.SphereGeometry(.017,8,6),M('#5c4a38'),.038,y,.166,torso)
  const arms=[-1,1].map(s=>{const shoulder=new THREE.Group();shoulder.position.set(s*.225,.93,0);shoulder.rotation.z=s*.12
    add(new THREE.CapsuleGeometry(.07,.1,5,12),cloth,0,-.105,0,shoulder)
    const elbow=new THREE.Group();elbow.position.y=-.21;elbow.rotation.x=-.12;shoulder.add(elbow);elbows.push(elbow)
    add(new THREE.CapsuleGeometry(.055,.09,5,12),sk,0,-.08,0,elbow)
    add(new THREE.SphereGeometry(.068,12,10),sk,0,-.19,0,elbow);torso.add(shoulder);return shoulder})
  const head=add(new THREE.SphereGeometry(.28,18,14),sk,0,1.29,0);head.scale.set(1,.92,.95)
  for(const s of[-1,1]){const e=add(new THREE.SphereGeometry(.036,8,6),dk,s*.1,1.28,.265);e.scale.set(1,1.4,.5);add(new THREE.SphereGeometry(.012,6,5),M('#fff'),s*.1+.01,1.295,.29);const c=add(new THREE.CircleGeometry(.04,10),new THREE.MeshBasicMaterial({color:'#ff9a8a',transparent:true,opacity:.65}),s*.17,1.22,.24);c.lookAt(s*.3,1.22,.8)}
  const mo=add(new THREE.TorusGeometry(.03,.007,5,10,Math.PI),dk,0,1.21,.265);mo.rotation.z=Math.PI
  add(new THREE.SphereGeometry(.295,16,10,0,Math.PI*2,0,Math.PI*.46),M(hat),0,1.31,-.01)
  add(new THREE.SphereGeometry(.05,8,6),M('#fff7e6'),0,1.60,0)
  const br=add(new THREE.CylinderGeometry(.2,.22,.03,12,1,false,-Math.PI/2,Math.PI),M(hat),0,1.34,.22);br.scale.set(1,1,1.1)
  add(new THREE.SphereGeometry(.07,8,6),M('#5b3a29'),0,1.26,-.27).scale.set(1.3,1,.8)
  const blob=new THREE.Mesh(new THREE.CircleGeometry(.32,14),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.28,depthWrite:false}));blob.rotation.x=-Math.PI/2;blob.position.y=.04;g.add(blob)
  g.traverse(o=>{if(o.isMesh&&o!==blob)o.castShadow=true});g.userData={legs,arms,knees,elbows,feet,torso,head};return g}

export function animateTrainer(w,phase,strength=1){const u=w.userData,p=gaitPose(phase,strength)
  u.legs.forEach((leg,i)=>{leg.rotation.x=p.hips[i];u.knees[i].rotation.x=p.knees[i];u.arms[i].rotation.x=p.arms[i];u.elbows[i].rotation.x=-.15-Math.max(0,-p.arms[i])*.55})
  u.torso.position.y=p.bob;u.torso.rotation.z=p.sway
}
