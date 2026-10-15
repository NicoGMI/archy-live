import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'

import {logoBoard} from './branding.js'
const cache=new Map()
export const mat=(color,roughness=.72)=>{const k=color+roughness;if(!cache.has(k))cache.set(k,new THREE.MeshLambertMaterial({color}));return cache.get(k)}
function bevelBox(w,h,d,r){w-=r*2;d-=r*2;const shape=new THREE.Shape();shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.005,h-r*2),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1,curveSegments:2});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+r,0);return geo}
export function block(g,w,h,d,c,x,y,z,r=.045){const o=new THREE.Mesh((w*h*d>5&&Math.min(w,h,d)>.18?bevelBox(w,h,d,Math.min(r,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d)),mat(c));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
const ball=(g,r,c,x,y,z)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat(c));o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
export function tree(g,x,z,s=1){const t=new THREE.Group(),v=Math.abs(Math.round(x*13+z*7))%3;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.075,.13,1.15,7),mat('#d2c5a8'));trunk.position.y=.57;trunk.castShadow=true;t.add(trunk);
 const palettes=[['#478b70','#6ca37a','#97b88b'],['#537f69','#739d78','#a0b793'],['#568e78','#7aac90','#aed0a0']],c=palettes[v];
 if(v===0){ball(t,.53,c[0],-.18,1.35,0).scale.set(1,1.15,.95);ball(t,.43,c[1],.25,1.54,.04);ball(t,.29,c[2],.17,1.82,.07)}
 else if(v===1){ball(t,.58,c[0],0,1.55,0).scale.set(.92,1.22,.88);ball(t,.35,c[1],-.23,1.57,.06);ball(t,.29,c[2],.17,1.88,.06)}
 else{ball(t,.56,c[0],0,1.35,0).scale.set(1.08,.92,1.02);ball(t,.38,c[1],.27,1.53,0);ball(t,.27,c[2],-.13,1.7,.13)}
 const branch=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.5,5),mat('#d2c5a8'));branch.position.set(.1,.97,0);branch.rotation.z=-.55;t.add(branch);t.position.set(x,.06,z);t.scale.setScalar(s);g.add(t)}
function softBlock(g,w,h,d,c,x,y,z,r=.07){const o=new THREE.Mesh(bevelBox(w,h,d,Math.min(r,h*.28)),mat(c));o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
function garden(g,x,z,w,d){const ring=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.07,24),mat('#b7c4a3'));ring.scale.set(w/2,1,d/2);ring.position.set(x,.085,z);g.add(ring);const soil=new THREE.Mesh(new THREE.CircleGeometry(1,24),mat('#86ac80'));soil.rotation.x=-Math.PI/2;soil.scale.set((w-.13)/2,(d-.13)/2,1);soil.position.set(x,.125,z);g.add(soil)}
export function planter(g,x,z,w=1.1){block(g,w,.34,.65,'#dedbd3',x,.23,z,.075);block(g,w-.12,.08,.52,'#6f8056',x,.41,z);for(let i=0;i<3;i++)ball(g,.19,'#71a585',x-w*.3+i*w*.3,.53,z)}
export function bench(g,x,z,ry=0){const b=new THREE.Group();for(let i=0;i<3;i++)block(b,1.3,.065,.12,'#b99b79',0,.46,i*.13-.13);block(b,1.3,.25,.07,'#b99b79',0,.69,-.24);for(const s of[-1,1]){block(b,.06,.44,.06,'#66777d',s*.48,.23,0);block(b,.06,.65,.06,'#66777d',s*.48,.35,-.21)}b.position.set(x,0,z);b.rotation.y=ry;g.add(b)}
export function lamp(g,x,z){const t=new THREE.Group();block(t,.07,2,.07,'#70848b',0,1,0);block(t,.45,.055,.22,'#eaf0e9',.16,2.02,0);block(t,.34,.025,.16,'#ffffe5',.16,1.99,0);t.position.set(x,0,z);g.add(t)}
export function campusBuilding(u,index){const g=new THREE.Group(),w=4.4,d=3.3,floors=[3,4,3,4,3][index],fh=1.02,accent=['#4e8578','#c28c57','#8a9c73','#4f8b91','#789c8d'][index],glass=['#437b89','#608694','#677f7b','#3c718b','#54868b'][index]
 block(g,5.35,.2,4.5,'#c6ceca',0,.12,0,.08);block(g,5.15,.1,4.3,'#eeeee6',0,.26,0)
 block(g,w,.8,d,'#e9e7dc',0,.68,0)
 for(let row=0;row<floors;row++){const start=g.children.length,y=1.1+row*fh;block(g,w,.91,d,['#dddcd1','#e2d6c6','#d1dbd6','#cbd7d7','#dbdfce'][index],0,y+.42,0)
  softBlock(g,w+.17,.12,d+.18,accent,0,y+.94,0);softBlock(g,w+.29,.08,d+.30,'#e4e8de',0,y+1.005,0)
  // Windows recessed behind continuous frames. Side elevations have the same level of detail.
  for(let k=0;k<4;k++){const x=-1.55+k*1.035;block(g,.78,.64,.025,glass,x,y+.43,d/2+.019,.006);block(g,.81,.055,.13,'#a9bbb7',x,y+.1,d/2+.055);block(g,.035,.68,.045,'#c5d2c9',x,y+.43,d/2+.04,.009);if(index===0||index===3)block(g,.8,.035,.04,'#c5d2c9',x,y+.43,d/2+.04,.009)}
  // Rear elevations remain finished when the campus is rotated.
  for(let k=0;k<4;k++){const x=-1.55+k*1.035;block(g,.78,.64,.025,glass,x,y+.43,-d/2-.019,.006);block(g,.81,.055,.13,'#a9bbb7',x,y+.1,-d/2-.055);block(g,.035,.68,.045,'#c5d2c9',x,y+.43,-d/2-.04,.009);if(index===0||index===3)block(g,.8,.035,.04,'#c5d2c9',x,y+.43,-d/2-.04,.009)}
  for(const s of[-1,1])for(let k=0;k<3;k++){const z=-1.05+k*1.05;block(g,.028,.63,.74,glass,s*(w/2+.015),y+.43,z);block(g,.08,.04,.8,'#c5d2c9',s*(w/2+.04),y+.1,z);block(g,.04,.65,.035,'#c5d2c9',s*(w/2+.04),y+.43,z)}
  // Coloured recessed strips, not a progress indicator.
  block(g,.13,.86,.12,accent,-w/2+.13,y+.43,d/2+.04)
  if(row===floors-1&&(index===1||index===3)){const tier=new THREE.Group();for(const child of g.children.slice(start))tier.add(child);tier.scale.set(.86,1,.86);g.add(tier)}
 }
 // Different roof profiles retain a coherent campus family.
 const roof=1.1+floors*fh,roofStart=g.children.length;softBlock(g,w+.30,.16,d+.30,'#587878',0,roof,0)
 for(let k=0;k<3;k++)block(g,w+.1,.018,.022,'#76928c',0,roof+.065,-.9+k*.8)
 // Open roof terraces give the campus a softer, inhabited silhouette.
 const terrace=new THREE.Group();
 for(const side of[-1,1]){block(terrace,w+.12,.045,.055,'#e5e7da',0,roof+.43,side*(d/2+.03));for(let k=0;k<7;k++)block(terrace,.035,.28,.035,'#b7c9c1',-w/2+.18+k*(w-.36)/6,roof+.29,side*(d/2+.03))}
 for(const side of[-1,1]){block(terrace,.055,.045,d+.05,'#e5e7da',side*(w/2+.03),roof+.43,0);for(let k=0;k<5;k++)block(terrace,.035,.28,.035,'#b7c9c1',side*(w/2+.03),roof+.29,-d/2+.18+k*(d-.36)/4)}
 g.add(terrace);
 // Copper drainpipes and railings.
 for(const sd of[-1,1]){block(g,.045,roof-.5,.045,'#a98065',sd*(w/2-.05),(roof+.5)/2,d/2+.09);for(let h=0;h<3;h++)block(g,.11,.035,.075,'#b49b87',sd*(w/2-.05),1+h*1.3,d/2+.09)}
 for(const s of[-1,1]){block(g,w+.3,.22,.08,'#b7c9c1',0,roof+.15,s*(d/2+.1));block(g,.08,.22,d+.3,'#b7c9c1',s*(w/2+.1),roof+.15,0)}
 if(index===1){block(g,2.3,.42,1.1,'#c6d0c8',0,roof+.3,-.2);block(g,2.5,.08,1.3,accent,0,roof+.56,-.2)}
 if(index===3){const vent=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,.5,24),mat('#9baca8'));vent.position.set(.6,roof+.3,-.65);vent.castShadow=true;g.add(vent)}
 block(g,.9,.45,.7,'#c1ceca',.75,roof+.27,-.55);for(let i=0;i<5;i++)block(g,.73,.025,.035,'#849995',.75,roof+.2+i*.067,-.195)
 block(g,1.55,.1,.85,'#648491',-.85,roof+.14,-.3).rotation.x=-.13
 for(let i=0;i<3;i++)ball(g,.24,'#79ad85',-1.3+i*.42,roof+.33,1.08)
 if(index===1||index===3){const cap=new THREE.Group();for(const child of g.children.slice(roofStart))cap.add(child);cap.scale.set(.86,1,.86);g.add(cap)}
 // Distinct secondary volumes create silhouettes, while keeping the campus palette.
 if(index===0){block(g,1.35,2.25,2.65,'#9db5ab',-2.7,1.37,-.15);block(g,1.5,.13,2.8,'#587878',-2.7,2.55,-.15);for(let k=0;k<2;k++){block(g,.43,.7,.03,glass,-3+k*.6,1.5,1.19);block(g,.03,.8,.05,'#c5d2c9',-3+k*.6,1.5,1.22)}for(let k=0;k<3;k++)block(g,.03,.85,.66,glass,-3.39,1.52,-.95+k*.8);}
 if(index===2){block(g,2.55,1.0,1.55,'#c2c5b5',.25,.75,-2.2);block(g,2.75,.1,1.7,'#718b83',.25,1.3,-2.2);for(let k=0;k<3;k++)block(g,.63,.61,.025,glass,-.55+k*.8,.8,-3.0);}
 if(index===4){for(let k=0;k<3;k++){block(g,.15,roof-.3,.2,'#c2c3b4',-1.4+k*1.35,(roof+.3)/2,d/2+.23);block(g,.35,.08,.5,'#d5d4bf',-1.4+k*1.35,1.1,d/2+.25)}}

 // Projecting reading balconies: rounded slabs, a light rail and shallow recesses.
 if(index!==1){const balconyY=1.1+(floors-2)*fh;
 softBlock(g,w+.72,.14,.85,'#e1e5d8',0,balconyY+.06,d/2+.35,.055);
 block(g,w+.62,.05,.055,'#a9c2b8',0,balconyY+.57,d/2+.74);
 for(let k=0;k<9;k++)block(g,.03,.42,.035,'#b5c9be',-w/2-.16+k*(w+.32)/8,balconyY+.34,d/2+.74);
 for(const side of[-1,1]){block(g,.055,.05,.74,'#a9c2b8',side*(w/2+.3),balconyY+.57,d/2+.35);block(g,.04,.42,.035,'#b5c9be',side*(w/2+.3),balconyY+.34,d/2+.02)}
 }
 // Each school has an architectural signature, never a simulated work status.
 if(index===1){const annex=new THREE.Group();block(annex,1.3,1.7,2.7,'#ccb195',0,1.1,0);block(annex,1.5,.13,2.95,'#b88464',0,2.02,0);for(let k=0;k<3;k++)block(annex,.028,.85,.63,glass,-.668,1.18,-.85+k*.82);annex.position.set(-2.8,0,-.15);g.add(annex)}
 if(index===3){block(g,1.7,.9,1.2,'#b5cbbd',-.8,roof+.56,.1);block(g,1.85,.12,1.35,'#587878',-.8,roof+1.04,.1);for(let k=0;k<3;k++)block(g,.4,.5,.025,glass,-1.35+k*.5,roof+.56,.72)}
 if(index===4){block(g,1.65,.45,1.25,'#aac6c4',.15,roof+.4,-.15);block(g,1.8,.12,1.4,'#64878b',.15,roof+.69,-.15);for(let k=0;k<3;k++)block(g,.08,.45,1.25,'#dde5df',-.55+k*.7,roof+.4,-.15)}
 if(index===2){for(const sd of[-1,1]){block(g,.25,1.2,.3,'#d8d6c4',sd*1.17,.83,d/2+.4);block(g,.4,.13,.5,'#f0ead7',sd*1.17,1.47,d/2+.4)}block(g,2.9,.16,.68,'#a6b8a6',0,1.58,d/2+.4)}
 // Copper fins, limestone columns and a blue-green corner give each school a readable signature.
 if(index===1){for(let k=0;k<6;k++)block(g,.075,roof-1.15,.20,'#c49a70',-.78+k*.28,(roof+1.15)/2,d/2+.18);softBlock(g,1.72,.08,.32,'#d7b389',-.08,roof+.05,d/2+.18)}
 if(index===4){for(const x of[-1.97,1.97]){softBlock(g,.25,roof-.28,.28,'#e2dfbd',x,(roof+.28)/2,d/2+.10);block(g,.045,roof-.4,.04,'#adc09d',x,roof/2,d/2+.26)}}
 if(index===0){softBlock(g,.64,roof-.5,.42,'#548e83',-2.0,(roof+.5)/2,1.50);for(let k=0;k<4;k++)block(g,.58,.055,.48,'#d6dec5',-2.0,1.15+k*1.02,1.50)}
 // Ground-floor lobby, canopy, layered steps, framed door and railings.
 block(g,1.35,.65,.07,glass,0,.68,d/2+.03);block(g,.065,.69,.09,'#c5d3ce',0,.68,d/2+.08)
 softBlock(g,1.85,.16,1.12,accent,0,1.04,d/2+.4);for(const s of[-1,1])block(g,.055,.77,.055,'#bcc9c3',s*.74,.65,d/2+.73)
 block(g,2.1,.09,.85,'#e1e4da',0,.2,d/2+.65);block(g,2.3,.07,.5,'#cdd6cf',0,.085,d/2+1.03)
 const brand=logoBoard(u.id,1.35,.39);if(brand){brand.position.set(0,1.33,d/2+.10);g.add(brand)}
 planter(g,-1.72,d/2+.4,.65);planter(g,1.72,d/2+.4,.65)
 // Side bicycle stand and three bikes. Small structures make scale legible.
 for(let k=0;k<3;k++){const x=2.75,z=-.9+k*.72;for(const dz of[-.22,.22]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,5,16),mat('#6a7877'));wheel.rotation.y=Math.PI/2;wheel.position.set(x,.24,z+dz);g.add(wheel)}block(g,.035,.24,.38,accent,x,.38,z).rotation.x=.25;block(g,.08,.04,.16,'#5a6567',x,.52,z)}
 // A distinct side stair landing gives each campus block a human scale.
 if(index===0||index===2){block(g,1.0,.12,1.4,'#c6cebf',-2.65,.3,0);for(let i=0;i<5;i++)block(g,.7,.075,.12,'#c5d7d0',-2.65,.7+i*.06,-.7);for(const z of[-.7,.7]){block(g,.06,.7,.06,'#7c9996',-3.06,.61,z);block(g,.055,.055,1.4,'#7c9996',-3.06,.96,0)}}
 // A low-poly depth shell keeps pedestrians behind the building without redrawing window detail.
 g.updateMatrixWorld(true);const shells=[];g.traverse(o=>{if(!o.isMesh||!o.material?.isMeshLambertMaterial)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,size=new THREE.Vector3();b.getSize(size);if(size.x<.3||size.y<.08||size.z<.3)return;const geo=new THREE.BoxGeometry(size.x,size.y,size.z),center=new THREE.Vector3();b.getCenter(center);geo.translate(center.x,center.y,center.z);geo.applyMatrix4(o.matrixWorld);shells.push(geo)});g.userData.depthGeometry=mergeGeometries(shells);shells.forEach(geo=>geo.dispose());g.userData.uni=u.id;return g}
export function campusGround(g){
 block(g,26,.55,34,'#748f8c',0,-.3,0,.22);block(g,25.8,.10,33.8,'#b6d39b',0,.0,0,.2)
 // Layout and roads are the original V21 geometry. A pocket garden fills the vacant west side.
 block(g,4,.12,6,'#8faba0',10,.09,8);block(g,3.7,.04,5.7,'#b3c9ad',10,.17,8)
 const f=new THREE.Group();const basin=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.13,.25,40),mat('#e9eae1'));basin.position.y=.25;basin.receiveShadow=true;f.add(basin);const water=new THREE.Mesh(new THREE.CircleGeometry(.92,40),mat('#84c7d5',.24));water.rotation.x=-Math.PI/2;water.position.y=.38;f.add(water);const center=new THREE.Mesh(new THREE.CylinderGeometry(.18,.27,.5,16),mat('#e3e9df'));center.position.y=.6;f.add(center);ball(f,.25,'#c7e2d3',0,.89,0);f.position.set(10,0,8);g.add(f)
 bench(g,8.7,7.3,Math.PI/2);bench(g,11.3,7.3,-Math.PI/2);bench(g,10,10.1)
 for(const [x,z] of [[-11,14],[-8,14],[-4,14],[0,14],[5,15],[10,14],[-11,-14],[-8,-14],[-2,-14],[6,-14],[10,-10],[-11,-8],[-11,7],[-8,7]])tree(g,x,z,.85)
 for(const [x,z] of [[-10,11],[-9,10],[-8,12],[-11,-11],[-9,-12],[-7,-13],[6,13],[8,13],[10,12],[11,11],[-11,5],[-11,3]])tree(g,x,z,.6);
 for(let x=-11;x<=11;x+=4)lamp(g,x,13)
 for(let k=0;k<5;k++){ball(g,.18,'#e7c481',-11.4+k*.65,.41,2.5);ball(g,.12,'#b9a0b7',-11.4+k*.65,.53,2.5)}
 for(const z of[-2.2,2.2])planter(g,10,8+z,1.3)
 for(const x of[-10.8,-8.7])for(const z of[1,3])block(g,.1,1.45,.1,'#9a795b',x,.75,z);for(let k=0;k<8;k++)block(g,2.6,.08,.075,'#9a795b',-9.75,1.51,1+k*.29);bench(g,-9.75,2.6);



 // Limestone and copper entrance: a campus landmark rather than a work-status marker.
 const gate=new THREE.Group();for(const sd of[-1,1]){block(gate,.26,2.3,.28,'#dae3d4',sd*1.6,1.15,0);block(gate,.4,.18,.42,'#b6c9b7',sd*1.6,.13,0);block(gate,.34,.12,.38,'#b79275',sd*1.6,2.35,0)}block(gate,3.6,.5,.18,'#517e73',0,2.32,0);block(gate,3.8,.08,.3,'#bfa082',0,2.6,0);
 const cv=document.createElement('canvas');cv.width=512;cv.height=96;const cc=cv.getContext('2d');cc.fillStyle='#517e73';cc.fillRect(0,0,512,96);cc.fillStyle='#f5f1df';cc.font='700 48px sans-serif';cc.textAlign='center';cc.textBaseline='middle';cc.fillText('LE CAMPUS',256,50);const signTex=new THREE.CanvasTexture(cv);signTex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.9,.42),new THREE.MeshBasicMaterial({map:signTex}));sign.position.set(0,2.32,.105);gate.add(sign);const reverse=sign.clone();reverse.position.z=-.105;reverse.rotation.y=Math.PI;gate.add(reverse);gate.rotation.y=Math.PI/2;gate.position.set(11,.2,.5);g.add(gate);
 // Botanical edging and warm stone details form the campus identity.
 for(const [x,z]of[[-10.8,14.5],[-7.8,14.5],[-3.8,14.5],[.2,14.5],[5.2,15.5],[10.2,14.5],[-10.8,-13.5],[-7.8,-13.5],[6.2,-13.5],[10.2,-9.5]]){for(let i=0;i<3;i++)ball(g,.09,['#d9c7a3','#d3a9a6','#bacba4'][i],x+.18*i,.16,z+.14*i)}
 
 // A quiet reading courtyard and cycle parking animate the campus without invented data.
 block(g,3.5,.045,3.1,'#c2cbb8',-1.6,.1,-6.2);for(let i=0;i<5;i++)block(g,3.4,.008,.018,'#abb8a5',-1.6,.13,-7.5+i*.6);
 bench(g,-2.8,-6.1,Math.PI/2);bench(g,-.4,-6.1,-Math.PI/2);planter(g,-1.6,-7.7,1.7);
 for(const [x,z]of[[-7,3.4],[7,-5.5]]){block(g,.3,.5,.3,'#628b7e',x,.28,z);block(g,.35,.07,.35,'#9aafa1',x,.57,z)}
 for(let k=0;k<3;k++){tree(g,-11, -3+k*1.5,.75);ball(g,.15,'#d7b98c',-10.2,.29,-3+k*1.5)}
 // Campus marker and public noticeboard are place identity, not live-task signals.
 block(g,.8,1.25,.38,'#bcc7ba',6,.72,12.4);block(g,.88,.11,.43,'#849f98',6,1.4,12.4);block(g,.58,.46,.045,'#365e61',6,.95,12.61);
 for(const x of[-1.5,-.2,1.1]){block(g,1,.13,1.3,'#92a88c',x,.16,13);block(g,.85,.04,1.15,'#a2bb96',x,.255,13);for(let k=0;k<3;k++)ball(g,.11,['#d9b488','#b8a3ae','#d6c5a0'][k],x-.2+k*.2,.39,13)}
 // Connected planting beds frame the pedestrian campus, with distinct quiet spaces.
 for(const [x,z,w,d]of[[-9,-10,4,7],[-9,11,4,6],[9,-10,4,5],[-4,-14,4,2],[3,14,4,2]]){garden(g,x,z,w,d);for(let i=0;i<5;i++){const xx=x+(i%3-1)*w*.28,zz=z+(Math.floor(i/3)-.5)*d*.55;ball(g,.26,['#6b9273','#8aaa80','#a0b68b'][i%3],xx,.31,zz)}}
 for(const [x,z,s]of[[-10,-9,1.3],[-8,-11,1.2],[-10,12,1.2],[-8,10,1.15],[9,-12,1.25],[10,-8,1.3],[-3,-15,1.1],[2,15,1.15]])tree(g,x,z,s);
 for(const [x,z,ry]of[[-8.5,-8,.4],[-7,11,-.2],[8.5,-9,Math.PI/2]])bench(g,x,z,ry);

 for(const [x,z]of[[-10,10],[-8,-10],[9,-8],[-2,14],[5,14]]){for(let k=0;k<5;k++){const xx=x+(k-2)*.25;block(g,.025,.18,.025,'#789267',xx,.23,z);const flower=ball(g,.075,['#efc886','#d4a0aa','#f0ddac'][k%3],xx,.34,z);flower.scale.y=.6;}}
 // A garden-only limestone walk connects the reading grove without changing V21 streets.
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-11,.14,12),new THREE.Vector3(-8.5,.14,8),new THREE.Vector3(-10,.14,4),new THREE.Vector3(-9.5,.14,0),new THREE.Vector3(-10,.14,-5),new THREE.Vector3(-8.5,.14,-10),new THREE.Vector3(-9,.14,-14)]);
 const pts=curve.getPoints(72),vertices=[],indices=[];pts.forEach((p,i)=>{const tangent=curve.getTangent(i/72),side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(.4);vertices.push(p.x+side.x,p.y,p.z+side.z,p.x-side.x,p.y,p.z-side.z);if(i<72){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}});const walkGeo=new THREE.BufferGeometry();walkGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));walkGeo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));walkGeo.setIndex(indices);walkGeo.computeVertexNormals();g.add(new THREE.Mesh(walkGeo,mat('#c9cfb8')));
 // Granite paving has subtle joints instead of noisy procedural textures.
 for(let k=0;k<6;k++)block(g,.014,.009,1.7,'#7e9591',7.5+k*.3,.195,10);
 return {water}
}

// Short-range ambient occlusion is baked into vertex colors, with no per-frame cost.
export function bakeContact(root){root.updateMatrixWorld(true);const objects=[];root.traverse(o=>{if(!o.isMesh||!o.material?.isMeshLambertMaterial)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);objects.push({o,box})});const ray=new THREE.Ray(),normalMatrix=new THREE.Matrix3(),p=new THREE.Vector3(),n=new THREE.Vector3(),hit=new THREE.Vector3();for(const {o,box}of objects){const pos=o.geometry.attributes.position,norm=o.geometry.attributes.normal,colors=new Float32Array(pos.count*3),near=objects.filter(v=>v.o!==o&&v.box.clone().expandByScalar(.42).intersectsBox(box));normalMatrix.getNormalMatrix(o.matrixWorld);for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);n.fromBufferAttribute(norm,i).applyMatrix3(normalMatrix).normalize();ray.origin.copy(p).addScaledVector(n,.025);let occlusion=0;for(const delta of[[0,0,0],[.4,.25,0],[-.4,.25,0],[0,.25,.4],[0,.25,-.4]]){ray.direction.copy(n).add(new THREE.Vector3(...delta)).normalize();let distance=.42;for(const v of near){if(v.box.containsPoint(ray.origin))continue;if(ray.intersectBox(v.box,hit)){distance=Math.min(distance,hit.distanceTo(ray.origin))}}occlusion+=1-distance/.42}const shade=1-occlusion/5*.28;colors.fill(shade,i*3,i*3+3)}o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))}}

export function compactStatic(root,exclude=[]){root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),buckets=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh||(!o.material?.isMeshStandardMaterial&&!o.material?.isMeshLambertMaterial)||(()=>{let a=o;while(a){if(exclude.includes(a))return true;a=a.parent}return false})())return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));const colors=new Float32Array(geo.attributes.position.count*3),old=geo.attributes.color;for(let i=0;i<geo.attributes.position.count;i++){colors[i*3]=o.material.color.r*(old?old.getX(i):1);colors[i*3+1]=o.material.color.g*(old?old.getY(i):1);colors[i*3+2]=o.material.color.b*(old?old.getZ(i):1)}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const k=o.material.type+(o.material.roughness??'')+(o.material.metalness??'');if(!buckets.has(k)){const m=o.material.clone();m.color.set('#ffffff');m.vertexColors=true;buckets.set(k,{mat:m,geos:[]})}buckets.get(k).geos.push(geo);remove.push(o)});remove.forEach(o=>{o.removeFromParent();o.geometry.dispose()});for(const {mat,geos} of buckets.values()){const merged=mergeGeometries(geos);const geo=merged&&mergeVertices(merged);merged?.dispose();if(!geo)throw Error('Static merge failed');const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;root.add(m);geos.forEach(g=>g.dispose())}}
