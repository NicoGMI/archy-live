import * as THREE from 'three'
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
  const legs=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.1,.4,0);add(new THREE.CapsuleGeometry(.07,.2,3,8),M('#3d4a63'),0,-.2,0,p);add(new THREE.SphereGeometry(.095,10,8),M('#5b3a29'),0,-.36,.03,p).scale.set(1,.7,1.3);g.add(p);return p})
  const body=add(new THREE.CapsuleGeometry(.2,.22,4,10),M(shirt),0,.66,0);body.scale.set(1,1,.85)
  add(new THREE.CylinderGeometry(.205,.205,.05,12),M('#fff7e6'),0,.5,0).scale.set(1,1,.85)
  const arms=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.26,.82,0);add(new THREE.CapsuleGeometry(.06,.2,3,8),M(shirt),0,-.17,0,p);add(new THREE.SphereGeometry(.065,8,6),sk,0,-.34,0,p);g.add(p);return p})
  const head=add(new THREE.SphereGeometry(.28,18,14),sk,0,1.15,0);head.scale.set(1,.92,.95)
  for(const s of[-1,1]){const e=add(new THREE.SphereGeometry(.036,8,6),dk,s*.1,1.14,.25);e.scale.set(1,1.4,.5);add(new THREE.SphereGeometry(.012,6,5),M('#fff'),s*.1+.01,1.155,.272);const c=add(new THREE.CircleGeometry(.04,10),new THREE.MeshBasicMaterial({color:'#ff9a8a',transparent:true,opacity:.65}),s*.17,1.08,.24);c.lookAt(s*.3,1.08,.8)}
  const mo=add(new THREE.TorusGeometry(.03,.007,5,10,Math.PI),dk,0,1.07,.265);mo.rotation.z=Math.PI
  add(new THREE.SphereGeometry(.295,16,10,0,Math.PI*2,0,Math.PI*.46),M(hat),0,1.17,-.01)
  add(new THREE.SphereGeometry(.05,8,6),M('#fff7e6'),0,1.46,0)
  const br=add(new THREE.CylinderGeometry(.2,.22,.03,12,1,false,-Math.PI/2,Math.PI),M(hat),0,1.2,.22);br.scale.set(1,1,1.1)
  add(new THREE.SphereGeometry(.07,8,6),M('#5b3a29'),0,1.12,-.27).scale.set(1.3,1,.8)
  const blob=new THREE.Mesh(new THREE.CircleGeometry(.32,14),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.28,depthWrite:false}));blob.rotation.x=-Math.PI/2;blob.position.y=.04;g.add(blob)
  g.userData={legs,arms};return g}
