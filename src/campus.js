import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'

import {logoBoard} from './branding.js'
const cache=new Map()
export const mat=(color,roughness=.72)=>{const k=color+roughness;if(!cache.has(k))cache.set(k,new THREE.MeshLambertMaterial({color}));return cache.get(k)}
function bevelBox(w,h,d,r){w-=r*2;d-=r*2;const shape=new THREE.Shape();shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.005,h-r*2),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:2});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+r,0);return geo}
export function block(g,w,h,d,c,x,y,z,r=.045){const o=new THREE.Mesh((w*h*d>5&&Math.min(w,h,d)>.18?bevelBox(w,h,d,Math.min(r,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d)),mat(c));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
const ball=(g,r,c,x,y,z)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,10,6),mat(c));o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
export function tree(g,x,z,s=1){const t=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.085,.13,1.1,8),mat('#ddd9c9'));trunk.position.y=.55;trunk.castShadow=true;t.add(trunk);for(let k=0;k<4;k++){const bark=block(t,.025,.06,.13,'#657b74',.078,.3+k*.22,0,.005);bark.rotation.z=.18}
 const crown=ball(t,.48,'#3f896e',0,1.35,0);crown.scale.set(.85,1.3,.85);ball(t,.29,'#8cbaa0',.18,1.62,.07);t.position.set(x,.06,z);t.scale.setScalar(s);g.add(t)}
export function planter(g,x,z,w=1.1){block(g,w,.34,.65,'#dedbd3',x,.23,z,.075);block(g,w-.12,.08,.52,'#6f8056',x,.41,z);for(let i=0;i<3;i++)ball(g,.19,'#71a585',x-w*.3+i*w*.3,.53,z)}
export function bench(g,x,z,ry=0){const b=new THREE.Group();for(let i=0;i<3;i++)block(b,1.3,.065,.12,'#b99b79',0,.46,i*.13-.13);block(b,1.3,.25,.07,'#b99b79',0,.69,-.24);for(const s of[-1,1]){block(b,.06,.44,.06,'#66777d',s*.48,.23,0);block(b,.06,.65,.06,'#66777d',s*.48,.35,-.21)}b.position.set(x,0,z);b.rotation.y=ry;g.add(b)}
export function lamp(g,x,z){const t=new THREE.Group();block(t,.07,2,.07,'#70848b',0,1,0);block(t,.45,.055,.22,'#eaf0e9',.16,2.02,0);block(t,.34,.025,.16,'#ffffe5',.16,1.99,0);t.position.set(x,0,z);g.add(t)}
export function campusBuilding(u,index){const g=new THREE.Group(),w=4.4,d=3.3,floors=[3,4,3,4,3][index],fh=1.02,accent=['#738f8a','#b88464','#839895','#64878b','#87a29b'][index],glass=['#527b85','#61848b','#607a82','#476e7b','#4f7982'][index]
 block(g,5.35,.2,4.5,'#c6ceca',0,.12,0,.08);block(g,5.15,.1,4.3,'#eeeee6',0,.26,0)
 block(g,w,.8,d,'#e9e7dc',0,.68,0)
 for(let row=0;row<floors;row++){const y=1.1+row*fh;block(g,w,.91,d,['#dddcd1','#e2d6c6','#d1dbd6','#cbd7d7','#dbdfce'][index],0,y+.42,0)
  block(g,w+.17,.1,d+.18,accent,0,y+.94,0);block(g,w+.26,.06,d+.27,'#dce4df',0,y+.995,0)
  // Windows recessed behind continuous frames. Side elevations have the same level of detail.
  for(let k=0;k<4;k++){const x=-1.55+k*1.035;block(g,.78,.64,.025,glass,x,y+.43,d/2+.019,.006);block(g,.81,.055,.13,'#a9bbb7',x,y+.1,d/2+.055);block(g,.035,.68,.045,'#c5d2c9',x,y+.43,d/2+.04,.009);block(g,.8,.035,.04,'#c5d2c9',x,y+.43,d/2+.04,.009)}
  for(const s of[-1,1])for(let k=0;k<3;k++){const z=-1.05+k*1.05;block(g,.028,.63,.74,glass,s*(w/2+.015),y+.43,z);block(g,.08,.04,.8,'#c5d2c9',s*(w/2+.04),y+.1,z);block(g,.04,.65,.035,'#c5d2c9',s*(w/2+.04),y+.43,z)}
  // Coloured recessed strips, not a progress indicator.
  block(g,.13,.86,.12,accent,-w/2+.13,y+.43,d/2+.04)
 }
 // Different roof profiles retain a coherent campus family.
 const roof=1.1+floors*fh;block(g,w+.28,.12,d+.28,'#587878',0,roof,0)
 for(let k=0;k<3;k++)block(g,w+.1,.018,.022,'#76928c',0,roof+.065,-.9+k*.8)
 // Copper drainpipes and railings.
 for(const sd of[-1,1]){block(g,.045,roof-.5,.045,'#a98065',sd*(w/2-.05),(roof+.5)/2,d/2+.09);for(let h=0;h<3;h++)block(g,.11,.035,.075,'#b49b87',sd*(w/2-.05),1+h*1.3,d/2+.09)}
 for(const s of[-1,1]){block(g,w+.3,.22,.08,'#b7c9c1',0,roof+.15,s*(d/2+.1));block(g,.08,.22,d+.3,'#b7c9c1',s*(w/2+.1),roof+.15,0)}
 if(index===1){block(g,2.3,.42,1.1,'#c6d0c8',0,roof+.3,-.2);block(g,2.5,.08,1.3,accent,0,roof+.56,-.2)}
 if(index===3){const vent=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,.5,24),mat('#9baca8'));vent.position.set(.6,roof+.3,-.65);vent.castShadow=true;g.add(vent)}
 block(g,.9,.45,.7,'#c1ceca',.75,roof+.27,-.55);for(let i=0;i<5;i++)block(g,.73,.025,.035,'#849995',.75,roof+.2+i*.067,-.195)
 block(g,1.55,.1,.85,'#648491',-.85,roof+.14,-.3).rotation.x=-.13
 for(let i=0;i<3;i++)ball(g,.24,'#79ad85',-1.3+i*.42,roof+.33,1.08)
 // Distinct secondary volumes create silhouettes, while keeping the campus palette.
 if(index===0){block(g,1.35,2.25,2.65,'#9db5ab',-2.7,1.37,-.15);block(g,1.5,.13,2.8,'#587878',-2.7,2.55,-.15);for(let k=0;k<2;k++){block(g,.43,.7,.03,glass,-3+k*.6,1.5,1.19);block(g,.03,.8,.05,'#c5d2c9',-3+k*.6,1.5,1.22)}for(let k=0;k<3;k++)block(g,.03,.85,.66,glass,-3.39,1.52,-.95+k*.8);}
 if(index===2){block(g,2.55,1.0,1.55,'#c2c5b5',.25,.75,-2.2);block(g,2.75,.1,1.7,'#718b83',.25,1.3,-2.2);for(let k=0;k<3;k++)block(g,.63,.61,.025,glass,-.55+k*.8,.8,-3.0);}
 if(index===4){for(let k=0;k<3;k++){block(g,.15,roof-.3,.2,'#c2c3b4',-1.4+k*1.35,(roof+.3)/2,d/2+.23);block(g,.35,.08,.5,'#d5d4bf',-1.4+k*1.35,1.1,d/2+.25)}}

 // Each school has an architectural signature, never a simulated work status.
 if(index===1){const annex=new THREE.Group();block(annex,1.3,1.7,2.7,'#ccb195',0,1.1,0);block(annex,1.5,.13,2.95,'#b88464',0,2.02,0);for(let k=0;k<3;k++)block(annex,.028,.85,.63,glass,-.668,1.18,-.85+k*.82);annex.position.set(-2.8,0,-.15);g.add(annex)}
 if(index===3){block(g,1.7,.9,1.2,'#b5cbbd',-.8,roof+.56,.1);block(g,1.85,.12,1.35,'#587878',-.8,roof+1.04,.1);for(let k=0;k<3;k++)block(g,.4,.5,.025,glass,-1.35+k*.5,roof+.56,.72)}
 if(index===4){block(g,1.65,.45,1.25,'#aac6c4',.15,roof+.4,-.15);block(g,1.8,.12,1.4,'#64878b',.15,roof+.69,-.15);for(let k=0;k<3;k++)block(g,.08,.45,1.25,'#dde5df',-.55+k*.7,roof+.4,-.15)}
 if(index===2){for(const sd of[-1,1]){block(g,.25,1.2,.3,'#d8d6c4',sd*1.17,.83,d/2+.4);block(g,.4,.13,.5,'#f0ead7',sd*1.17,1.47,d/2+.4)}block(g,2.9,.16,.68,'#a6b8a6',0,1.58,d/2+.4)}
 // Ground-floor lobby, canopy, layered steps, framed door and railings.
 block(g,1.35,.65,.07,glass,0,.68,d/2+.03);block(g,.065,.69,.09,'#c5d3ce',0,.68,d/2+.08)
 block(g,1.65,.12,1.0,accent,0,1.04,d/2+.4);for(const s of[-1,1])block(g,.055,.77,.055,'#bcc9c3',s*.74,.65,d/2+.73)
 block(g,2.1,.09,.85,'#e1e4da',0,.2,d/2+.65);block(g,2.3,.07,.5,'#cdd6cf',0,.085,d/2+1.03)
 const brand=logoBoard(u.id,1.35,.39);if(brand){brand.position.set(0,1.33,d/2+.10);g.add(brand)}
 planter(g,-1.72,d/2+.4,.65);planter(g,1.72,d/2+.4,.65)
 // Side bicycle stand and three bikes. Small structures make scale legible.
 for(let k=0;k<3;k++){const x=2.75,z=-.9+k*.72;for(const dz of[-.22,.22]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,5,16),mat('#6a7877'));wheel.rotation.y=Math.PI/2;wheel.position.set(x,.24,z+dz);g.add(wheel)}block(g,.035,.24,.38,accent,x,.38,z).rotation.x=.25;block(g,.08,.04,.16,'#5a6567',x,.52,z)}
 // A distinct side stair landing gives each campus block a human scale.
 if(index===0||index===2){block(g,1.0,.12,1.4,'#c6cebf',-2.65,.3,0);for(let i=0;i<5;i++)block(g,.7,.075,.12,'#c5d7d0',-2.65,.7+i*.06,-.7);for(const z of[-.7,.7]){block(g,.06,.7,.06,'#7c9996',-3.06,.61,z);block(g,.055,.055,1.4,'#7c9996',-3.06,.96,0)}}
 g.userData.uni=u.id;return g}
export function campusGround(g){
 block(g,26,.55,34,'#748f8c',0,-.3,0,.22);block(g,25.8,.10,33.8,'#a5c995',0,.0,0,.2)
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
 for(const [x,z,w,d]of[[-9,-10,4,7],[-9,11,4,6],[9,-10,4,5]]){block(g,w+.15,.1,.09,'#c2c9b3',x,.12,z-d/2);block(g,.09,.1,d,'#c2c9b3',x-w/2,.12,z)}
 // A quiet reading courtyard and cycle parking animate the campus without invented data.
 block(g,3.5,.045,3.1,'#c2cbb8',-1.6,.1,-6.2);for(let i=0;i<5;i++)block(g,3.4,.008,.018,'#abb8a5',-1.6,.13,-7.5+i*.6);
 bench(g,-2.8,-6.1,Math.PI/2);bench(g,-.4,-6.1,-Math.PI/2);planter(g,-1.6,-7.7,1.7);
 for(const [x,z]of[[-7,3.4],[7,-5.5]]){block(g,.3,.5,.3,'#628b7e',x,.28,z);block(g,.35,.07,.35,'#9aafa1',x,.57,z)}
 for(let k=0;k<3;k++){tree(g,-11, -3+k*1.5,.75);ball(g,.15,'#d7b98c',-10.2,.29,-3+k*1.5)}
 // Campus marker and public noticeboard are place identity, not live-task signals.
 block(g,.8,1.25,.38,'#bcc7ba',6,.72,12.4);block(g,.88,.11,.43,'#849f98',6,1.4,12.4);block(g,.58,.46,.045,'#365e61',6,.95,12.61);
 for(const x of[-1.5,-.2,1.1]){block(g,1,.13,1.3,'#92a88c',x,.16,13);block(g,.85,.04,1.15,'#a2bb96',x,.255,13);for(let k=0;k<3;k++)ball(g,.11,['#d9b488','#b8a3ae','#d6c5a0'][k],x-.2+k*.2,.39,13)}
 // Connected planting beds frame the pedestrian campus, with distinct quiet spaces.
 for(const [x,z,w,d]of[[-9,-10,4,7],[-9,11,4,6],[9,-10,4,5],[-4,-14,4,2],[3,14,4,2]]){block(g,w,.04,d,'#84ad83',x,.07,z,.09);for(let i=0;i<5;i++){const xx=x+(i%3-1)*w*.28,zz=z+(Math.floor(i/3)-.5)*d*.55;ball(g,.26,['#6b9273','#8aaa80','#a0b68b'][i%3],xx,.31,zz)}}
 for(const [x,z,s]of[[-10,-9,1.3],[-8,-11,1.2],[-10,12,1.2],[-8,10,1.15],[9,-12,1.25],[10,-8,1.3],[-3,-15,1.1],[2,15,1.15]])tree(g,x,z,s);
 for(const [x,z,ry]of[[-8.5,-8,.4],[-7,11,-.2],[8.5,-9,Math.PI/2]])bench(g,x,z,ry);

 for(const [x,z]of[[-10,10],[-8,-10],[9,-8],[-2,14],[5,14]]){for(let k=0;k<5;k++){const xx=x+(k-2)*.25;block(g,.025,.18,.025,'#789267',xx,.23,z);const flower=ball(g,.075,['#efc886','#d4a0aa','#f0ddac'][k%3],xx,.34,z);flower.scale.y=.6;}}
 // Granite paving has subtle joints instead of noisy procedural textures.
 for(let k=0;k<6;k++)block(g,.014,.009,1.7,'#7e9591',7.5+k*.3,.195,10);
 return {water}
}

export function compactStatic(root,exclude=[]){root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),buckets=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh||(!o.material?.isMeshStandardMaterial&&!o.material?.isMeshLambertMaterial)||(()=>{let a=o;while(a){if(exclude.includes(a))return true;a=a.parent}return false})())return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));const colors=new Float32Array(geo.attributes.position.count*3),old=geo.attributes.color;for(let i=0;i<geo.attributes.position.count;i++){colors[i*3]=o.material.color.r*(old?old.getX(i):1);colors[i*3+1]=o.material.color.g*(old?old.getY(i):1);colors[i*3+2]=o.material.color.b*(old?old.getZ(i):1)}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const k=o.material.type+(o.material.roughness??'')+(o.material.metalness??'');if(!buckets.has(k)){const m=o.material.clone();m.color.set('#ffffff');m.vertexColors=true;buckets.set(k,{mat:m,geos:[]})}buckets.get(k).geos.push(geo);remove.push(o)});remove.forEach(o=>{o.removeFromParent();o.geometry.dispose()});for(const {mat,geos} of buckets.values()){const merged=mergeGeometries(geos);const geo=merged&&mergeVertices(merged);merged?.dispose();if(!geo)throw Error('Static merge failed');const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;root.add(m);geos.forEach(g=>g.dispose())}}
