import React,{useEffect,useRef,useState} from 'react'
import * as THREE from 'three'
import {Toggle,useData,SC,LB,ORD,fmt,ActionBar} from './shared.jsx'
import {groupedRooms,roomOf,LOGOS} from './rooms.js'
import {logoBoard,youtubeBadge} from './branding.js'
import YoutubeStats from './YoutubeStats.jsx'
import {CONFIG} from './config.js'
import {tx,texMat} from './textures.js'
import {M,label,bubble,trainer} from './props.js'
import {buildInterior,disposeInterior} from './interior.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
// Carte : une maison par univers (place fixe), fenêtres = tâches, personnage qui marche = tâche active, PNJ = attente / programmé / bloqué / en file.
const SLOTS=8,RING=13.5
const rngf=(s)=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const R=rngf(11)
const noise=(x,z)=>Math.sin(x*.21)*Math.cos(z*.17)+.5*Math.sin(x*.47+z*.31)+.25*Math.sin(z*.9-x*.6)
const hill=(x,z)=>{const r=Math.hypot(x,z);const k=Math.min(1,Math.max(0,(r-44)/22));return k*k*(2.5+2.2*noise(x,z)+ (r-44)*.05)}
// plan libre du village : place centrale + quartiers (angle en degrés, distance au bureau)
const PLAN={nowl:[-18,-19],megaschool:[-9,-26],coop:[-21,-29],ngmi:[7,-26],phil:[21,-19],cts:[29,-6],mails:[27,8],
  isme:[-28,-8],excelia:[-37,-3],iae:[-29,3.5],efrei:[-37,-12],ece:[-30,-17],
  'perso-bebe':[8,25],'perso-famille':[-1,27],'perso-admin':[-10,25]}
const QUARTERS={formation:{n:'Quartier Formation',c:[-16,-24],ids:['nowl','megaschool','coop']},etudiant:{n:'Quartier étudiant',c:[-32,-7],ids:['isme','excelia','iae','efrei','ece']},ngmi:{n:'Quartier NGMI',c:[7,-26],ids:['ngmi']},media:{n:'Médias & commerce',c:[25,-12],ids:['phil','cts']},perso:{n:'Quartier personnel',c:[-1,26],ids:['perso-bebe','perso-famille','perso-admin']},admin:{n:'Archives',c:[27,8],ids:['mails']}}
const slotPos=(i,id)=>{const q=PLAN[id];let x,z;if(q){x=q[0];z=q[1]}else{const a=-Math.PI/2+i*Math.PI*2/SLOTS+Math.PI/SLOTS;x=Math.cos(a)*(RING+3);z=Math.sin(a)*(RING+3)}const r=Math.hypot(x,z);return{a:Math.atan2(z,x),r,x,z}}
const disposeTree=(root)=>root.traverse(o=>{o.geometry?.dispose();[].concat(o.material??[]).forEach(m=>{if(m.map&&!m.map.userData.keep)m.map.dispose();m.dispose()})})

// Position horizontale des fenêtres selon leur nombre.
const winX=(k,n,W)=>n<=1?-1.5:-W/2+.75+k*(W-1.5-(n>3?0:1.0))/(n-1)
function house(u,tasks){
  const g=new THREE.Group(),W=4.6,D=3.6,H=2.3,dk=M('#5a3a22'),wm=new THREE.MeshBasicMaterial({color:'#ffd27a'})
  const add=(geo,mat,x,y,z,o={})=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(o.cast)m.castShadow=true;if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;g.add(m);return m}
  const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d)
  const wall=add(B(W,H,D),texMat(tx('plaster','#f4dcb8',[2,1])),0,H/2+.15,0,{cast:true});wall.receiveShadow=true
  add(B(W+.12,.35,D+.12),texMat(tx('stone',[3,1])),0,.17,0)
  const sh=new THREE.Shape();sh.moveTo(-D/2-.45,0);sh.lineTo(D/2+.45,0);sh.lineTo(.18,1.5);sh.lineTo(-.18,1.5);sh.closePath()
  const rg=new THREE.ExtrudeGeometry(sh,{depth:W+.9,bevelEnabled:false});rg.translate(0,0,-(W+.9)/2);rg.rotateY(Math.PI/2)
  add(rg,texMat(tx('roof','#ffffff',[2,1]),{color:new THREE.Color(u.color).lerp(new THREE.Color('#c98a6a'),.3)}),0,H+.15,0,{cast:true})
  add(B(W+.5,.14,D+.5),M('#ffffff'),0,H+.18,0)
  // porte, poignée, imposte, auvent, perron
  add(B(.9,1.5,.12),texMat(tx('wood',[1,1],'#8a5a2c')),0,.9,D/2+.05)
  add(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial({color:'#f5c542'}),.28,.9,D/2+.12)
  add(B(.3,.4,.03),wm,0,1.35,D/2+.1)
  add(B(1.6,.1,.7),M(u.color),0,1.95,D/2+.38,{cast:true,rx:.25})
  add(B(1.5,.15,.7),M('#cbbf9f'),0,.22,D/2+.3)
  ;[-1,1].forEach(sd=>{
    add(B(.08,1.5,.08),dk,sd*.75,1.0,D/2+.6)
    for(let k=0;k<2;k++){add(B(.6,.6,.02),M('#fff6e6'),sd*(W/2+.005),1.7,(k?1:-1)*.9,{ry:Math.PI/2});add(B(.5,.5,.03),wm,sd*(W/2+.02),1.7,(k?1:-1)*.9,{ry:Math.PI/2})}})
  // cheminée + chapeau, enseigne
  add(B(.5,1.1,.5),texMat(tx('brick','#b9674a',[1,2])),W*.25,H+1.3,-D*.1,{cast:true})
  add(B(.65,.14,.65),M('#6b3f2e'),W*.25,H+1.9,-D*.1)
  add(B(1.5,.38,.08),M(u.color),-1.55,2.65,D/2+.28)
  // fenêtres = tâches (les actives d'abord, puis les plus récentes)
  const sorted=[...tasks].sort((a,b)=>ORD[a.status]-ORD[b.status]||(Date.parse(b.doneAt||0)-Date.parse(a.doneAt||0)))
  const shown=sorted.slice(0,6),n=shown.length
  shown.forEach((t,k)=>{const px=winX(k,n,W)
    add(B(.62,.62,.1),M('#fff6e6'),px,1.85,D/2+.03)
    ;[-1,1].forEach(sd=>add(B(.18,.62,.06),dk,px+sd*.42,1.85,D/2+.05))
    add(B(.66,.14,.2),M('#8a5a33'),px,1.48,D/2+.12)
    for(let q=0;q<3;q++)add(new THREE.SphereGeometry(.07,6,5),M(['#ff7b9c','#ffd24a','#ffa05c'][q]),px-.2+q*.2,1.58,D/2+.14)
    const gl=add(B(.46,.46,.12),new THREE.MeshBasicMaterial({color:t.status==='done'?'#8fb0c8':SC[t.status]||'#999'}),px,1.85,D/2+.06);gl.userData.act=t.status==='active'
    if(t.status==='done'){const tick=bubble('✓','#16a34a');tick.scale.set(.32,.32,1);tick.position.set(px,2.5,D/2+.1);g.add(tick)}})
  if(sorted.length>6){const more=label('+'+(sorted.length-6),'#9ca3af',44);more.scale.multiplyScalar(.6);more.position.set(W/2-.2,3.1,D/2+.3);g.add(more)}
  const brand=logoBoard(u.id,2,.8)||(u.id==='phil'?youtubeBadge():null);if(brand){brand.position.set(0,H+1.0,D/2+.18);g.add(brand)}
  if(['isme','excelia','iae','efrei','ece'].includes(u.id)){
    for(const side of[-1,1]){add(B(.26,2.4,.26),M('#fff5db'),side*1.0,1.3,D/2+.45);add(B(.4,.14,.4),M('#dfd3b3'),side*1.0,2.5,D/2+.45)}
    add(B(2.7,.18,.75),M('#fff4dd'),0,2.66,D/2+.5)
    const flag=new THREE.Group();flag.add(new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.5,6),M('#eee')));const f=new THREE.Mesh(B(.7,.42,.025),M(u.color));f.position.set(.35,.5,0);flag.add(f);flag.position.set(-2.65,.75,D/2+.4);g.add(flag)
  }
  return g}

export default function MapView(){
  const ref=useRef(),{d}=useData(),[sel,setSel]=useState(null),[task,setTask]=useState(null),api=useRef({}),dataRef=useRef(null)
  dataRef.current=d
  useEffect(()=>{api.current.build?.(d)},[d])
  useEffect(()=>{
    const el=ref.current,W=()=>el.clientWidth,H=()=>el.clientHeight,W_=W,H_=H,mobile=innerWidth<600
    const r=new THREE.WebGLRenderer({antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,innerWidth<900?1.5:2));r.setSize(W(),H());r.shadowMap.enabled=true;el.appendChild(r.domElement)
    r.domElement.setAttribute('role','img');r.domElement.setAttribute('aria-label','Carte du village : une maison par projet, les personnages représentent les tâches. Utilise le bouton Dashboard pour la version texte.')
    const scene=new THREE.Scene()
    const sky=document.createElement('canvas');sky.width=2;sky.height=256;const sx=sky.getContext('2d'),gr=sx.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#5a4a7e');gr.addColorStop(.3,'#b0587f');gr.addColorStop(.55,'#f08a6a');gr.addColorStop(.8,'#fbc183');gr.addColorStop(1,'#ffe1a8');sx.fillStyle=gr;sx.fillRect(0,0,2,256)
    const st=new THREE.CanvasTexture(sky);st.colorSpace=THREE.SRGBColorSpace;scene.background=st;scene.fog=new THREE.Fog('#f2ae86',95,230)
    const cam=new THREE.PerspectiveCamera(mobile?64:42,W()/H(),.1,300);cam.position.set(-4,mobile?80:48,mobile?80:62)
    const ctl=new OrbitControls(cam,r.domElement);ctl.target.set(-4,0,2);ctl.enableDamping=true;ctl.minPolarAngle=.45;ctl.maxPolarAngle=1.2;ctl.minDistance=9;ctl.maxDistance=110;ctl.enablePan=true;ctl.screenSpacePanning=false
    scene.add(new THREE.HemisphereLight('#ffcfb0','#9a8a60',1.3))
    const sun=new THREE.DirectionalLight('#ff9a52',2.6);sun.position.set(-46,15,24);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048)
    Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:140});sun.shadow.bias=-.0005;scene.add(sun)
    // terrain
    const gg=new THREE.PlaneGeometry(260,260,130,130);gg.rotateX(-Math.PI/2);const pa=gg.attributes.position,cols=[]
    const c1=new THREE.Color('#b3ae62'),c2=new THREE.Color('#9aa456'),c3=new THREE.Color('#6f8548'),tmp=new THREE.Color()
    for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),h=hill(x,z);pa.setY(i,h);const n=noise(x*1.7,z*1.7)*.5+.5;tmp.copy(c1).lerp(c2,n);if(h>1)tmp.lerp(c3,Math.min(1,h/5));cols.push(tmp.r,tmp.g,tmp.b)}
    gg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));gg.computeVertexNormals()
    const ground=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({vertexColors:true,map:tx('grass',60)}));ground.receiveShadow=true;scene.add(ground)
    const lawn=new THREE.Mesh(new THREE.CircleGeometry(45,72),texMat(tx('grass',12),{color:'#d4d27c'}));lawn.rotation.x=-Math.PI/2;lawn.position.y=.02;lawn.receiveShadow=true;scene.add(lawn)
    const plaza=new THREE.Mesh(new THREE.CircleGeometry(4.2,48),texMat(tx('plaza',2)));plaza.rotation.x=-Math.PI/2;plaza.position.y=.05;plaza.receiveShadow=true;scene.add(plaza)
    const ringp=new THREE.Mesh(new THREE.RingGeometry(8.3,9.5,64),texMat(tx('path',1,1)));ringp.rotation.x=-Math.PI/2;ringp.position.y=.045;scene.add(ringp)
    const d=new THREE.Object3D()
    // quartiers : dallage + panneau
    Object.entries(QUARTERS).forEach(([k,q])=>{const pts=q.ids.map(id=>PLAN[id]),rad=Math.max(6.5,...pts.map(p=>Math.hypot(p[0]-q.c[0],p[1]-q.c[1])+5))
      const pa=new THREE.Mesh(new THREE.CircleGeometry(rad,40),texMat(tx('grass',3),{color:{formation:'#e3c98a',etudiant:'#bcd9a0',ngmi:'#cdb4e8',media:'#f0b99a',perso:'#f2c4cf',admin:'#a9d4e6'}[k]||'#ddd'}));pa.rotation.x=-Math.PI/2;pa.position.set(q.c[0],.032,q.c[1]);pa.receiveShadow=true;scene.add(pa)
      const L=Math.hypot(q.c[0],q.c[1]),sx=q.c[0]-q.c[0]/L*(rad*.85),sz=q.c[1]-q.c[1]/L*(rad*.85)
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,2,6),M('#5b3a29'));pole.position.set(sx,1,sz);scene.add(pole)
      const lb2=label(q.n,'#fff',44);lb2.scale.multiplyScalar(.85);lb2.position.set(sx,2.5,sz);scene.add(lb2)})
    // exclusion zones
    const slots=Object.keys(PLAN).map((id,i)=>slotPos(i,id))
    // bureau d'Archy
    const dsk=new THREE.Group()
    const bx=(w,h,d,c,x,y,z,sh=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'?M(c):c);m.position.set(x,y,z);m.castShadow=sh;dsk.add(m);return m}
    bx(3.2,.95,1.3,'#7a4a2a',0,.48,.2);bx(3.5,.12,1.55,'#5a3520',0,1.0,.2)
    bx(1.0,.5,.02,'#3a2312',0,.55,.862) // plaque fond
    const pc=document.createElement('canvas');pc.width=512;pc.height=128;const px2=pc.getContext('2d');px2.fillStyle='#e2b659';px2.fillRect(0,0,512,128);px2.strokeStyle='#8a6a1e';px2.lineWidth=8;px2.strokeRect(6,6,500,116);px2.fillStyle='#3a2a0a';px2.font='800 86px Georgia,serif';px2.textAlign='center';px2.textBaseline='middle';px2.fillText(CONFIG.title.toUpperCase(),256,70)
    const pt=new THREE.CanvasTexture(pc);pt.colorSpace=THREE.SRGBColorSpace
    const plq=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.38),new THREE.MeshBasicMaterial({map:pt}));plq.position.set(0,.62,.865);dsk.add(plq)
    // fauteuil
    bx(1.0,.14,.9,'#7f1d1d',0,.55,-.95);bx(1.0,1.1,.14,'#7f1d1d',0,1.2,-1.4)
    // Archy : costume
    bx(.62,.7,.36,'#1e293b',0,1.2,-.9);bx(.14,.5,.04,'#f8fafc',0,1.25,-.71);bx(.07,.4,.04,'#d4a017',0,1.2,-.69)
    const hd=new THREE.Mesh(new THREE.SphereGeometry(.27,16,14),M('#f2c9a0'));hd.position.set(0,1.78,-.88);hd.castShadow=true;dsk.add(hd)
    const hr=new THREE.Mesh(new THREE.SphereGeometry(.285,16,10,0,Math.PI*2,0,Math.PI/2.2),M('#2b1d14'));hr.position.set(0,1.82,-.9);dsk.add(hr)
    ;[-1,1].forEach(sd=>{const ey=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:'#111'}));ey.position.set(sd*.09,1.8,-.62);dsk.add(ey)
      bx(.14,.14,.6,'#1e293b',sd*.4,1.18,-.5);bx(.12,.08,.14,'#f2c9a0',sd*.4,1.1,-.17)
      const gl=new THREE.Mesh(new THREE.TorusGeometry(.07,.012,6,12),new THREE.MeshBasicMaterial({color:'#222'}));gl.position.set(sd*.09,1.8,-.61);dsk.add(gl)})
    // objets sur le bureau
    bx(.7,.04,.5,'#f8fafc',-.9,1.08,.35);bx(.5,.04,.4,'#fef3c7',-.75,1.12,.3);bx(.55,.03,.38,'#cbd5e1',.85,1.08,.3);bx(.5,.34,.03,'#111827',.9,1.28,.05)
    bx(.1,.5,.1,'#334155',1.45,1.3,-.1);const lp=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),new THREE.MeshBasicMaterial({color:'#ffd27a'}));lp.position.set(1.45,1.62,-.1);dsk.add(lp)
    dsk.scale.setScalar(1.25);scene.add(dsk)
    const dl=new THREE.PointLight('#ffb866',14,14,1.6);dl.position.set(1.8,2.6,0);scene.add(dl)
    // lampadaires
    const gc=document.createElement('canvas');gc.width=gc.height=64;const gx=gc.getContext('2d'),gg2=gx.createRadialGradient(32,32,2,32,32,32);gg2.addColorStop(0,'rgba(255,214,130,.95)');gg2.addColorStop(.4,'rgba(255,170,80,.35)');gg2.addColorStop(1,'rgba(255,150,60,0)');gx.fillStyle=gg2;gx.fillRect(0,0,64,64)
    const gtex=new THREE.CanvasTexture(gc)
    const lamp=(x,z)=>{const y=hill(x,z),g=new THREE.Group();g.position.set(x,y,z)
      const po=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,2.3,6),M('#3a2c26'));po.position.y=1.15;po.castShadow=true;g.add(po)
      const bs=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.2,8),M('#3a2c26'));bs.position.y=.1;g.add(bs)
      const bl=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),new THREE.MeshBasicMaterial({color:'#ffe2a0'}));bl.position.y=2.4;g.add(bl)
      const hl=new THREE.Sprite(new THREE.SpriteMaterial({map:gtex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.55}));hl.scale.set(1.9,1.9,1);hl.position.y=2.4;g.add(hl);scene.add(g);return g}
    for(let i=0;i<SLOTS;i++){const a=i*Math.PI*2/SLOTS;lamp(Math.cos(a)*10.6,Math.sin(a)*10.6);const lx=Math.cos(a)*(slots.some(q=>Math.hypot(Math.cos(a)*17.2-q.x,Math.sin(a)*17.2-q.z)<5)?12.5:17.2),lz=Math.sin(a)*(slots.some(q=>Math.hypot(Math.cos(a)*17.2-q.x,Math.sin(a)*17.2-q.z)<5)?12.5:17.2);lamp(lx,lz)}
    // bancs, panneau et tonneaux (cozy)
    {const wd=M('#8a5a34'),dk2=M('#5b3a29');const bench=(x,z,ry)=>{const g=new THREE.Group();g.position.set(x,hill(x,z),z);g.rotation.y=ry
      const seat=new THREE.Mesh(new THREE.BoxGeometry(1.1,.08,.38),wd);seat.position.y=.42;seat.castShadow=true;g.add(seat)
      const back=new THREE.Mesh(new THREE.BoxGeometry(1.1,.3,.06),wd);back.position.set(0,.68,-.18);g.add(back)
      for(const s of[-1,1]){const l=new THREE.Mesh(new THREE.BoxGeometry(.07,.42,.34),dk2);l.position.set(s*.48,.21,0);g.add(l)}scene.add(g)}
      for(let i=0;i<SLOTS;i++){const a=(i+.5)*Math.PI*2/SLOTS,r=8.2;bench(Math.cos(a)*r,Math.sin(a)*r,-a+Math.PI/2)}
      const barrel=(x,z)=>{const b=new THREE.Mesh(new THREE.CylinderGeometry(.28,.24,.5,10),wd);b.position.set(x,hill(x,z)+.25,z);b.castShadow=true;scene.add(b)}
      barrel(2.6,-3.4);barrel(2.95,-3.1);barrel(-3.1,3.3)}
    // buissons + cailloux
    const bushG=new THREE.IcosahedronGeometry(.55,0),rockG=new THREE.DodecahedronGeometry(.35,0)
    const NB=mobile?90:170,bu=new THREE.InstancedMesh(bushG,M('#fff'),NB),NR=mobile?50:100,rk=new THREE.InstancedMesh(rockG,M('#fff'),NR);let bi=0,ri=0
    for(let k=0;k<2500&&(bi<NB||ri<NR);k++){const a=R()*6.28,rr=11+R()*42,x=Math.cos(a)*rr,z=Math.sin(a)*rr
      if(rr<48&&(slots.some(s=>Math.hypot(x-s.x,z-s.z)<6)||(rr>8&&rr<10.5)||Math.hypot((x+26)/1.4,z-14)<6.4))continue
      if(R()<.6&&bi<NB){const sc=.5+R()*.55;d.position.set(x,hill(x,z)+.3*sc,z);d.scale.set(sc,sc*.8,sc);d.rotation.set(0,R()*6,0);d.updateMatrix();bu.setMatrixAt(bi,d.matrix);bu.setColorAt(bi,new THREE.Color().setHSL(.2+R()*.12,.4,.28+R()*.1));bi++}
      else if(ri<NR){const sc=.4+R()*.6;d.position.set(x,hill(x,z)+.1*sc,z);d.scale.set(sc,sc*.7,sc);d.rotation.set(R(),R()*6,R());d.updateMatrix();rk.setMatrixAt(ri,d.matrix);rk.setColorAt(ri,new THREE.Color().setHSL(.07,.15,.38+R()*.2));ri++}}
    bu.count=bi;rk.count=ri;[bu,rk].forEach(m=>{m.castShadow=true;m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;scene.add(m)})
    // étang
    const pondTex=tx('water');const pond=new THREE.Mesh(new THREE.CircleGeometry(5,40),new THREE.MeshBasicMaterial({map:tx('water')}));pond.rotation.x=-Math.PI/2;pond.position.set(-26,.06,14);pond.scale.set(1.4,1,1);scene.add(pond)
    const bank=new THREE.Mesh(new THREE.CircleGeometry(5.6,40),M('#e7dcae'));bank.rotation.x=-Math.PI/2;bank.position.set(-26,.04,14);bank.scale.set(1.4,1,1);scene.add(bank)
    const free=(x,z,m=0)=>{const rr=Math.hypot(x,z);if(rr<17+m)return false;for(const s of slots){const L2=s.x*s.x+s.z*s.z,u=Math.max(0,Math.min(1,(x*s.x+z*s.z)/L2)),dx=x-s.x*u,dz=z-s.z*u;if(dx*dx+dz*dz<(5.5+m)**2||Math.hypot(x-s.x,z-s.z)<8+m)return false}if(Math.hypot((x+26)/1.4,z-14)<6.4+m)return false;return true}
    // arbres (instanciés)
    const trunkG=new THREE.CylinderGeometry(.2,.3,1.3,6),canopyG=new THREE.IcosahedronGeometry(1.25,0),pineG=new THREE.ConeGeometry(1.1,1.7,7)
    const NT=mobile?170:300,tr=new THREE.InstancedMesh(trunkG,M('#7a4b26'),NT),cn=new THREE.InstancedMesh(canopyG,M('#ffffff'),NT),pn=new THREE.InstancedMesh(pineG,M('#ffffff'),NT*2)
    let ti=0,pi=0
    for(let k=0;ti<NT&&k<4000;k++){const a=R()*7,rr=17+R()*R()*70+R()*6,x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(!free(x,z,.5))continue
      if(rr<26&&R()<.6)continue
      const y=hill(x,z),s=.8+R()*.8,pine=R()<.4
      d.position.set(x,y+.65*s,z);d.scale.setScalar(s);d.rotation.set(0,R()*6,0);d.updateMatrix();tr.setMatrixAt(ti,d.matrix)
      if(pine){for(let j=0;j<2;j++){d.position.set(x,y+(1.5+j*.9)*s,z);d.scale.setScalar(s*(1-j*.3));d.updateMatrix();pn.setMatrixAt(pi,d.matrix);pn.setColorAt(pi,new THREE.Color().setHSL(.3+R()*.06,.35,.2+R()*.07));pi++}
        cn.setMatrixAt(ti,new THREE.Matrix4().makeScale(0,0,0))}
      else{d.position.set(x,y+(1.9)*s,z);d.scale.setScalar(s);d.updateMatrix();cn.setMatrixAt(ti,d.matrix);cn.setColorAt(ti,new THREE.Color().setHSL(...((q=>q<.07?[.05+R()*.02,.5,.5]:q<.15?[.96,.3,.64]:q<.22?[.11,.45,.52]:[.2+R()*.07,.4,.3+R()*.1])(R()))))}
      ti++}
    ;[tr,cn,pn].forEach(m=>{m.castShadow=true;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true});tr.count=ti;cn.count=ti;pn.count=pi;scene.add(tr,cn,pn)
    // herbes hautes (touffes) + fleurs
    const tuftG=new THREE.ConeGeometry(.2,.6,5),NG=mobile?700:1400,tg=new THREE.InstancedMesh(tuftG,M('#2f8f3a'),NG);let gi=0
    for(let p=0;p<9;p++){const a=R()*6.28,rr=20+R()*14,cx=Math.cos(a)*rr,cz=Math.sin(a)*rr;for(let k=0;k<NG/9&&gi<NG;k++){const x=cx+(R()-.5)*7,z=cz+(R()-.5)*5;if(!free(x,z))continue;d.position.set(x,hill(x,z)+.3,z);d.scale.set(1,.7+R()*.7,1);d.rotation.set((R()-.5)*.3,R()*6,(R()-.5)*.3);d.updateMatrix();tg.setMatrixAt(gi,d.matrix);tg.setColorAt(gi,new THREE.Color().setHSL(.2+R()*.06,.45,.32+R()*.1));gi++}}
    tg.count=gi;scene.add(tg)
    const fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,5),M('#fff'),160);let fi=0;const fc=['#e58a9a','#e8c26a','#f3e6d0','#b89ad0']
    for(let k=0;k<900&&fi<160;k++){const a=R()*6.28,rr=4.8+R()*13,x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(rr>8&&rr<9.8)continue
      let near=false;slots.forEach(s=>{if(Math.hypot(x-s.x,z-s.z)<3.4)near=true;const ang=Math.atan2(z,x);let da=Math.abs(((ang-s.a+Math.PI*3)%(Math.PI*2))-Math.PI);da=Math.PI-da;if(da<.13&&rr<RING)near=true});if(near)continue
      d.position.set(x,.1,z);d.scale.setScalar(1);d.rotation.set(0,0,0);d.updateMatrix();fl.setMatrixAt(fi,d.matrix);fl.setColorAt(fi,new THREE.Color(fc[fi%4]));fi++}
    fl.count=fi;scene.add(fl)
    // montagnes lointaines + nuages
    for(let i=0;i<16;i++){const a=i/16*6.28+R()*.2,rr=105+R()*20,s=16+R()*18;const m=new THREE.Mesh(new THREE.ConeGeometry(s,s*1.1,6),new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(.78+R()*.08,.25,.42+R()*.08)}));m.position.set(Math.cos(a)*rr,s*.4,Math.sin(a)*rr);scene.add(m)}
    const clouds=[];for(let i=0;i<9;i++){const c=new THREE.Group();for(let j=0;j<4;j++){const b=new THREE.Mesh(new THREE.SphereGeometry(2+R()*1.4,10,8),new THREE.MeshBasicMaterial({color:'#ffd0b0',transparent:true,opacity:.8}));b.position.set(j*2.3-3,R(),R()*1.5);b.scale.y=.6;c.add(b)}
      c.position.set(-90+R()*180,58+R()*12,-90+R()*60);scene.add(c);clouds.push(c)}
    // étoiles + soleil couchant (fog off)
    {const NS=260,sp=new Float32Array(NS*3);for(let i=0;i<NS;i++){const a=R()*6.28,e=.25+R()*1.1,rr=230;sp[i*3]=Math.cos(a)*Math.cos(e)*rr;sp[i*3+1]=Math.sin(e)*rr;sp[i*3+2]=Math.sin(a)*Math.cos(e)*rr}
      const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:'#fff4dc',size:2,sizeAttenuation:false,transparent:true,opacity:.65,fog:false,depthWrite:false})))
      const sc=document.createElement('canvas');sc.width=sc.height=128;const x=sc.getContext('2d'),g3=x.createRadialGradient(64,64,0,64,64,64);g3.addColorStop(0,'rgba(255,236,190,1)');g3.addColorStop(.18,'rgba(255,190,110,.85)');g3.addColorStop(1,'rgba(255,120,80,0)');x.fillStyle=g3;x.fillRect(0,0,128,128)
      const sun2=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));sun2.scale.set(90,90,1);sun2.position.set(-150,22,70);scene.add(sun2)}
    // lucioles
    const NF=mobile?40:90,ffb=new Float32Array(NF*3);for(let i=0;i<NF;i++){const a=R()*6.28,rr=6+R()*30;ffb[i*3]=Math.cos(a)*rr;ffb[i*3+1]=.6+R()*2.2;ffb[i*3+2]=Math.sin(a)*rr}
    const ffg=new THREE.BufferGeometry();ffg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(ffb),3))
    const fc2=document.createElement('canvas');fc2.width=fc2.height=32;{const x=fc2.getContext('2d'),g2=x.createRadialGradient(16,16,0,16,16,16);g2.addColorStop(0,'rgba(255,240,170,1)');g2.addColorStop(1,'rgba(255,200,90,0)');x.fillStyle=g2;x.fillRect(0,0,32,32)}
    const ff=new THREE.Points(ffg,new THREE.PointsMaterial({size:.5,map:new THREE.CanvasTexture(fc2),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(ff)
    // --- dynamique (reconstruit à chaque changement de données)
    const smc=document.createElement('canvas');smc.width=smc.height=64;{const x=smc.getContext('2d'),g4=x.createRadialGradient(32,32,0,32,32,32);g4.addColorStop(0,'rgba(255,240,225,.9)');g4.addColorStop(1,'rgba(255,230,210,0)');x.fillStyle=g4;x.fillRect(0,0,64,64)}
    const smokeTex=new THREE.CanvasTexture(smc)
    const dyn=new THREE.Group();scene.add(dyn);let alertBubbles=[],smokes=[],actors=[],glow=[],slotOf={},selId=null,houses={},signs={},inter=null,camGoal=null,saved=null,flight=0
    const selRing=new THREE.Mesh(new THREE.RingGeometry(3.4,3.9,40),new THREE.MeshBasicMaterial({color:'#facc15',side:THREE.DoubleSide,transparent:true,opacity:.9}));selRing.rotation.x=-Math.PI/2;selRing.visible=false;scene.add(selRing)
    let focus=0;const tgt=new THREE.Vector3(0,0,1)
    const vo=()=>{const wide=innerWidth>900;cam.setViewOffset(W_(),H_(),wide?W_()*.13:0,wide?0:H_()*(mobile?.2:.12),W_(),H_())}
    const fly=()=>{camGoal.p0=cam.position.clone();camGoal.t0=ctl.target.clone();camGoal.s=performance.now();flight=1}
    const closeInterior=()=>{if(inter){dyn.remove(inter);disposeInterior(inter);inter=null}dyn.children.forEach(o=>{if(o.userData.hid){o.visible=true;o.userData.hid=false}});Object.values(houses).forEach(h=>h.visible=true);Object.values(signs).forEach(h=>h.visible=true);cam.clearViewOffset()}
    const openInterior=(id,move)=>{const dd=dataRef.current,u=dd&&dd.universes.find(x=>x.id===id),sp=slotOf[id];if(!u||!sp)return
      closeInterior();const ts=dd.tasks.filter(t=>t.universe===id);inter=buildInterior(u,ts.length?ts:[{id:'_vide',universe:id,status:'queued',title:'Rien en cours',note:'Aucune tâche pour le moment'}]);const S=.85,y=hill(sp.x,sp.z)
      inter.scale.setScalar(S);inter.position.set(sp.x,y,sp.z);inter.rotation.y=Math.atan2(-sp.x,-sp.z);inter.userData.uni=id;dyn.add(inter)
      dyn.children.forEach(o=>{if(o!==inter&&o.userData.uni===id&&o.userData.hid!==false)o.userData.hid=true,o.visible=false})
      if(houses[id])houses[id].visible=false;if(signs[id])signs[id].visible=false
      const {W,H}=inter.userData,asp=W_()/H_(),vt=Math.tan(cam.fov*Math.PI/360),dist=Math.min(48,Math.max(((W*S)/2+1.2)/(vt*asp),((H*S)/2+1.5)/vt*1.15,9.5))
      const c=new THREE.Vector3(sp.x,y+H*S/2,sp.z),f=new THREE.Vector3(-sp.x,0,-sp.z).normalize(),pol=.98
      if(move){if(!saved)saved={p:cam.position.clone(),t:ctl.target.clone()};camGoal={p:c.clone().addScaledVector(f,dist*Math.sin(pol)).add(new THREE.Vector3(0,dist*Math.cos(pol),0)),t:c};fly()}
      vo()}
    const select=(id,refresh)=>{const prev=selId;selId=id;setSel(id);if(!refresh)setTask(null)
      if(id&&slotOf[id]){const sp=slotOf[id];selRing.visible=false;openInterior(id,!refresh&&prev!==id);if(!refresh&&prev&&prev!==id&&saved)saved.t=saved.t}
      else{selRing.visible=false;closeInterior();if(saved){camGoal={p:saved.p,t:saved.t};fly();saved=null}}}
    const npc=(u,tasks,t,k,door,px,pz,ux,uz,i)=>{
      const style={waiting:['#cbd5e1','#94a3b8','…','#d97706'],scheduled:['#cbd5e1','#94a3b8','⏱','#2563eb'],blocked:['#fca5a5','#b91c1c','✕','#dc2626'],queued:['#d1d5db','#9ca3af','…','#6b7280']}[t.status]
      const w=trainer(style[0],style[1]);w.scale.setScalar(1.45);w.userData.uni=u.id
      const off=(k%2?-1:1)*(2.1+Math.floor(k/2)*.9),wx=door.x+px*off,wz=door.z+pz*off
      w.position.set(wx,hill(wx,wz),wz);w.rotation.y=Math.atan2(ux,uz)+Math.PI*.9
      const b=bubble(style[2],style[3]);b.position.set(0,1.6,0);w.add(b);dyn.add(w);actors.push({w,type:'idle'})}
    function build(dd){
      closeInterior();disposeTree(dyn);dyn.clear();actors=[];glow=[];smokes=[];alertBubbles=[];slotOf={};houses={};signs={}
      if(!dd)return
      dd.universes.slice(0,24).forEach((u,i)=>{
        const ts=dd.tasks.filter(t=>t.universe===u.id);if(!ts.length&&!PLAN[u.id])return
        const sp=slotPos(i,u.id),th=Math.atan2(-sp.x,-sp.z),ux=-sp.x/sp.r,uz=-sp.z/sp.r,px=-uz,pz=ux,len=sp.r-3-4.2
        const h=house(u,ts);h.userData.uni=u.id;h.scale.setScalar(.85);h.position.set(sp.x,hill(sp.x,sp.z),sp.z);h.rotation.y=th;houses[u.id]=h;dyn.add(h);if(ts.some(t=>t.status==='active')){h.updateMatrixWorld(true);const cp=h.localToWorld(new THREE.Vector3(1.15,4.4,-.36));for(let k=0;k<5;k++){const sm=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex,transparent:true,depthWrite:false,opacity:.5}));sm.userData.sm={x:cp.x,y:cp.y,z:cp.z,ph:k/5,u:u.id};dyn.add(sm);smokes.push(sm)}};h.traverse(o=>{if(o.userData.act)glow.push(o)})
        // chemin vers le bureau central
        const path=new THREE.Mesh(new THREE.PlaneGeometry(1.5,len),texMat(tx('path',1,Math.round(len/1.5))));path.rotation.x=-Math.PI/2;path.position.set(0,0,0)
        const pg=new THREE.Group();pg.position.set(sp.x+ux*(3+len/2),.05,sp.z+uz*(3+len/2));pg.rotation.y=Math.atan2(ux,uz);pg.add(path);dyn.add(pg)
        const sg=label(`${u.name}${ts.some(t=>t.status==='active')?' ●':''}`,u.color,52);sg.position.set(sp.x,hill(sp.x,sp.z)+6.3,sp.z);sg.userData.uni=u.id;signs[u.id]=sg;dyn.add(sg);slotOf[u.id]=sp
        const notices=(dd.alerts||[]).filter(a=>a.universe===u.id);if(notices.length){const last=notices[notices.length-1];const al=label((last.icon||"✉")+" "+(notices.length>1?notices.length+" · ":"")+last.text.slice(0,36),"#f59e0b",42,"#fff7df","#7a3d00");al.position.set(sp.x,hill(sp.x,sp.z)+8.7,sp.z);al.userData.uni=u.id;al.userData.baseY=al.position.y;dyn.add(al);alertBubbles.push(al)}
        const door={x:sp.x+ux*2.9,z:sp.z+uz*2.9}
        ts.filter(t=>t.status==='active').forEach((t,k)=>{const w=trainer(u.color);w.scale.setScalar(1.45);w.userData.uni=u.id;dyn.add(w)
          const lb=label(t.title.length>24?t.title.slice(0,23)+'…':t.title,'#16a34a',40);lb.scale.multiplyScalar(.55);lb.position.set(0,1.95,0);w.add(lb)
          const b=bubble('!','#16a34a');b.position.set(0,1.55,0);w.add(b)
          actors.push({w,type:'walk',sp,px,pz,off:(k-.3)*.7,ph:i*1.3+k*2.1,spd:.5+.1*k})})
        ts.filter(t=>t.status!=='active'&&t.status!=='done').sort((a,b)=>ORD[a.status]-ORD[b.status]).slice(0,8).forEach((t,k)=>npc(u,ts,t,k,door,px,pz,ux,uz,i))
      })
      r.shadowMap.needsUpdate=true
      if(selId)select(slotOf[selId]?selId:null,true)
    }
    api.current={build,select,room:(tid)=>{if(!inter)return;const fr=inter.userData.frame;const g=inter.children.find(c=>c.userData.taskId===tid);if(fr&&g){fr.position.set(g.position.x,g.position.y+1.3,g.position.z);fr.visible=true}else if(fr)fr.visible=false}}
    const ray=new THREE.Raycaster(),mp=new THREE.Vector2();let dn=null
    const cv=r.domElement
    const pd=e=>{dn={x:e.clientX,y:e.clientY,t:performance.now()}}
    const pu=e=>{if(!dn)return;const mv=Math.hypot(e.clientX-dn.x,e.clientY-dn.y),dt=performance.now()-dn.t;dn=null;if(mv>8||dt>500)return
      const b=cv.getBoundingClientRect();mp.set(((e.clientX-b.left)/b.width)*2-1,-((e.clientY-b.top)/b.height)*2+1);ray.setFromCamera(mp,cam)
      const hit=ray.intersectObjects(dyn.children,true).find(h=>{let o=h.object;while(o){if(o.userData&&o.userData.uni)return true;o=o.parent}return false})
      if(!hit){select(null);return};let o=hit.object;while(o&&!(o.userData&&o.userData.uni))o=o.parent;const uid=o.userData.uni;let q=hit.object,tid=null;while(q){if(q.userData&&q.userData.taskId){tid=q.userData.taskId;break}q=q.parent}
      if(uid===selId&&tid){setTask(tid);return};select(uid)}
    cv.addEventListener('pointerdown',pd);cv.addEventListener('pointerup',pu)
    const onKey=e=>{if(e.key==='Escape')select(null)};addEventListener('keydown',onKey)
    if(new URLSearchParams(location.search).has('debug')){window.__cam=cam;window.__r=r;window.__ctl=ctl;window.__pick=select}
    build(dataRef.current);r.shadowMap.needsUpdate=true
    let stop=false;const clock=new THREE.Clock()
    const loop=()=>{if(stop)return;requestAnimationFrame(loop);const t=clock.getElapsedTime()
      actors.forEach(o=>{if(o.type!=='walk')return;const w=o.w
        const raw=Math.sin(t*o.spd+o.ph)*1.5,mov=Math.abs(raw)<1,s=(Math.max(-1,Math.min(1,raw))+1)/2,dist=3.9+(o.sp.r-3.2-3.9)*s
        const dv=mov?(Math.cos(t*o.spd+o.ph)>=0?1:-1):(raw<0?-1:1)
        const X=(o.sp.x/o.sp.r)*dist+o.px*o.off,Z=(o.sp.z/o.sp.r)*dist+o.pz*o.off;w.position.set(X,hill(X,Z),Z);w.rotation.y=Math.atan2(o.sp.x*dv,o.sp.z*dv)
        const sw=mov?Math.sin(t*9+o.ph)*.7:0;w.userData.legs[0].rotation.x=sw;w.userData.legs[1].rotation.x=-sw;w.userData.arms[0].rotation.x=-sw*.8;w.userData.arms[1].rotation.x=sw*.8})
      if(flight&&camGoal){const k=Math.min(1,(performance.now()-camGoal.s)/1100),e=k*k*(3-2*k);cam.position.lerpVectors(camGoal.p0,camGoal.p,e);ctl.target.lerpVectors(camGoal.t0,camGoal.t,e);if(k>=1){flight=0;camGoal=null}}
      if(inter)inter.userData.walkers.forEach((w,i)=>{const k=w.userData.kind,b=w.userData.ry;if(k==="waiting"||k==="scheduled"||k==="blocked"){if(w.userData.bx===undefined)w.userData.bx=w.position.x;w.position.x=w.userData.bx+Math.sin(t*.6+i)*.4;w.position.y=.06+Math.abs(Math.sin(t*4+i))*.02}if(k==='active'){w.position.y=.06+Math.abs(Math.sin(t*2.4+i))*.025;w.userData.arms[0].rotation.x=-.5+Math.sin(t*6+i)*.25;w.userData.arms[1].rotation.x=-.5-Math.sin(t*6+i)*.25}
        else if(k==='blocked'){w.rotation.y=b+Math.sin(t*2.2+i)*.7;w.position.x+=Math.sin(t*2.2+i)*.0015}
        else if(k==='waiting'){w.rotation.z=Math.sin(t*1.3+i)*.05;w.position.y=.06+Math.abs(Math.sin(t*1.1+i))*.03}
        else{w.rotation.y=b+Math.sin(t*.9+i)*.25}})
      if(selRing.visible)selRing.material.opacity=.6+.4*Math.sin(t*5)
      glow.forEach(g=>{g.scale.setScalar(1+.08*Math.sin(t*4))})
      alertBubbles.forEach((a,i)=>{a.position.y=a.userData.baseY+Math.sin(t*2+i)*.18})
      smokes.forEach(m=>{const d=m.userData.sm,k=((t*.18+d.ph)%1);m.position.set(d.x+k*1.2+Math.sin(k*6+d.ph*9)*.15,d.y+k*3.2,d.z+k*.3);m.scale.setScalar(.5+k*1.7);m.material.opacity=(1-k)*.55;m.visible=!(inter&&selId===d.u)})
      pondTex.offset.x=t*.01;pondTex.offset.y=Math.sin(t*.3)*.02
      {const a=ff.geometry.attributes.position;for(let i=0;i<a.count;i++){a.setXYZ(i,ffb[i*3]+Math.sin(t*.5+i)*1.2,ffb[i*3+1]+Math.sin(t*.8+i*2)*.4,ffb[i*3+2]+Math.cos(t*.4+i)*1.2)}a.needsUpdate=true;ff.material.opacity=.55+.35*Math.sin(t*2)}
      clouds.forEach((c,i)=>{c.position.x+=.01+i*.001;if(c.position.x>80)c.position.x=-80})
      ctl.update();r.render(scene,cam)}
    loop()
    const rs=()=>{r.setSize(W(),H());cam.aspect=W()/H();if(inter)vo();cam.updateProjectionMatrix()};addEventListener('resize',rs)
    return()=>{stop=true;api.current={};removeEventListener('resize',rs);removeEventListener('keydown',onKey);cv.removeEventListener('pointerdown',pd);cv.removeEventListener('pointerup',pu)
      delete window.__cam;delete window.__ctl;delete window.__pick
      disposeTree(scene);scene.clear();ctl.dispose();r.dispose();r.forceContextLoss();el.removeChild(r.domElement)}
  },[])
  useEffect(()=>{api.current.room?.(task)},[task,sel])
  const cnt=s=>d?d.tasks.filter(t=>t.status===s).length:0
  const hidden=0
  const info=d?`${cnt('active')} au travail · ${cnt('waiting')+cnt('blocked')} en attente ${CONFIG.bossOf}${hidden?` · +${hidden} univers non affiché${hidden>1?'s':''}`:''}`:'Chargement…'
  return <div style={{position:'fixed',inset:0}}><div ref={ref} style={{position:'absolute',inset:0}}/>
    {d&&sel&&<Sheet d={d} id={sel} task={task} close={()=>api.current.select?.(null)}/>}
    <div style={{position:'absolute',top:10,left:10,right:10,display:'flex',justifyContent:'space-between',font:'600 13px system-ui',color:'#0f2a1a',pointerEvents:'none'}}>
      <Toggle view="map"/><span role="status" style={{background:'#ffffffcc',padding:'3px 9px',borderRadius:99}}>{info}</span></div>
    {!sel&&<div style={{position:'absolute',bottom:10,left:10,font:'11px system-ui',color:'#0f2a1a',background:'#ffffffb0',padding:'3px 8px',borderRadius:8}}>dresseur qui marche = chantier actif · PNJ « … » = attend {CONFIG.boss} · ✕ = bloqué · ⏱ = programmé · coche = terminé · touche une maison</div>}</div>
}

function Sheet({d,id,task,close}){
  const wide=innerWidth>900
  const u=d.universes.find(x=>x.id===id);if(!u)return null
  const all=d.tasks.filter(t=>t.universe===id).sort((a,b)=>ORD[a.status]-ORD[b.status]);const roomId=task?.startsWith('room:')?task.slice(5):null;const ts=roomId?all.filter(t=>roomOf(t,id)===roomId||t.id===roomId):all
  const rooms=groupedRooms(u,all)
  const when=t=>t.status==='done'?'terminé '+fmt(t.doneAt):t.status==='scheduled'?fmt(t.scheduledAt):t.status==='active'&&t.startedAt?'depuis '+fmt(t.startedAt):''
  return <div role="dialog" aria-label={u.name} onPointerDown={e=>e.stopPropagation()} style={{position:'absolute',...(wide?{right:0,top:58,bottom:0,width:350,borderRadius:'18px 0 0 0',borderLeft:`6px solid ${u.color}`}:{left:0,right:0,bottom:0,maxHeight:'36%',borderRadius:'18px 18px 0 0',borderTop:`6px solid ${u.color}`,maxWidth:560,margin:'0 auto'}),overflowY:'auto',background:'#fffdf6f2',padding:'12px 14px 22px',font:'14px/1.35 system-ui,sans-serif',color:'#1f2937',boxShadow:'0 -8px 30px #0003'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><b style={{fontSize:18}}>{LOGOS[id]&&<img src={LOGOS[id]} alt={u.name} style={{width:80,height:34,objectFit:'contain',background:id==='isme'?'#12244a':'transparent',padding:4,verticalAlign:'middle',marginRight:8,borderRadius:6}}/>}{u.emoji} {u.name}</b><button onClick={close} aria-label="Fermer" style={{border:0,background:'#e5e7eb',borderRadius:99,width:32,height:32,fontSize:16}}>✕</button></div>
    <div style={{display:'flex',flexWrap:'wrap',gap:5,margin:'12px 0'}}>{rooms.map(q=><span key={q.id} style={{background:'#efe8d8',borderRadius:9,padding:'5px 8px',fontSize:12}}>{q.title} · {q.tasks.length}</span>)}</div>
    {(d.alerts||[]).filter(a=>a.universe===id).map(a=><div key={a.id} style={{background:"#fff0bd",padding:10,borderRadius:10,marginBottom:8,fontSize:12}}>{a.icon||"✉"} {a.text}<div style={{fontSize:11,opacity:.7}}>{fmt(a.at)}</div></div>)}
    {id==='phil'&&<YoutubeStats stats={d.stats?.youtube} compact/>}
    {roomId&&<h3 style={{margin:'8px 0'}}>{rooms.find(q=>q.id===roomId)?.title}</h3>}
    {!ts.length&&<div style={{padding:'14px 6px',color:'#6b7280'}}>Aucune tâche en cours dans ce bâtiment.</div>}
    {ts.map(t=>{const lg=d.log.filter(l=>l.task===t.id).slice(0,4);return <div key={t.id} style={{padding:'9px 6px',borderTop:'1px solid #e5e7eb',background:task===t.id?'#fff0c2':'transparent',borderRadius:8}}>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><span style={{background:SC[t.status],color:t.status==='done'?'#fff':'#111',borderRadius:99,padding:'1px 9px',fontSize:12,fontWeight:700}}>{LB[t.status]}</span><b>{t.title}</b></div>
      {when(t)&&<div style={{color:'#6b7280',fontSize:12}}>{when(t)}</div>}
      {t.note&&<div style={{marginTop:2}}>{t.note}</div>}
      <ActionBar t={t} compact/>{lg.length>0&&<ul style={{margin:'4px 0 0',padding:0,listStyle:'none',fontSize:12,color:'#4b5563'}}>{lg.map((l,i)=><li key={i}><span style={{color:'#9ca3af'}}>{fmt(l.at)}</span> {l.text}</li>)}</ul>}</div>})}
  </div>}
