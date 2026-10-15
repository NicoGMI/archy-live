import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'

import {logoBoard} from './branding.js'
const cache=new Map()
export const mat=(color,roughness=.72)=>{const k=color+roughness;if(!cache.has(k))cache.set(k,new THREE.MeshLambertMaterial({color}));return cache.get(k)}
function bevelBox(w,h,d,r){w-=r*2;d-=r*2;const shape=new THREE.Shape();shape.moveTo(-w/2+r,-d/2);shape.lineTo(w/2-r,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);shape.lineTo(w/2,d/2-r);shape.quadraticCurveTo(w/2,d/2,w/2-r,d/2);shape.lineTo(-w/2+r,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);shape.lineTo(-w/2,-d/2+r);shape.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.005,h-r*2),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1,curveSegments:2});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+r,0);return geo}
export function block(g,w,h,d,c,x,y,z,r=.045){const o=new THREE.Mesh((w*h*d>5&&Math.min(w,h,d)>.18?bevelBox(w,h,d,Math.min(r,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d)),mat(c));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
const ball=(g,r,c,x,y,z)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat(c));o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
export function tree(g,x,z,s=1){const t=new THREE.Group(),v=Math.abs(Math.round(x*13+z*7))%3;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.075,.13,1.15,7),mat('#b89a70'));trunk.position.y=.57;trunk.castShadow=true;t.add(trunk);
 const palettes=[['#448958','#71a95d','#a2c46d'],['#4d8c5c','#80b269','#b1cb7c'],['#518e58','#78aa61','#acd17b']],c=palettes[v];
 // One sculpted crown with a baked vertical colour wash, not intersecting colour balls.
 const geo=new THREE.SphereGeometry(1,16,12),pos=geo.attributes.position,colors=new Float32Array(pos.count*3),dark=new THREE.Color(c[0]),light=new THREE.Color(c[1]);
 for(let i=0;i<pos.count;i++){const y=pos.getY(i),x=pos.getX(i),z=pos.getZ(i),wave=1+.045*Math.sin(x*7+z*4)*Math.sin(y*6);pos.setXYZ(i,x*wave,y,z*wave);const color=dark.clone().lerp(light,Math.max(0,Math.min(1,(y+.8)*.38+x*.10+z*.06)));colors.set([color.r,color.g,color.b],i*3)}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.computeVertexNormals();const crownMat=mat('#ffffff').clone();crownMat.vertexColors=true;const crown=new THREE.Mesh(geo,crownMat);crown.position.y=1.6;crown.scale.set(v===1?.68:.78,v===1?.94:.78,v===2?.67:.72);crown.castShadow=true;t.add(crown);
 const branch=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.5,5),mat('#b89a70'));branch.position.set(.1,.97,0);branch.rotation.z=-.55;t.add(branch);t.position.set(x,.06,z);t.scale.setScalar(s);g.add(t)}
function softBlock(g,w,h,d,c,x,y,z,r=.07){const o=new THREE.Mesh(bevelBox(w,h,d,Math.min(r,h*.28)),mat(c));o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
function garden(g,x,z,w,d){const ring=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.07,24),mat('#b7c4a3'));ring.scale.set(w/2,1,d/2);ring.position.set(x,.085,z);g.add(ring);const soil=new THREE.Mesh(new THREE.CircleGeometry(1,24),mat('#86ac80'));soil.rotation.x=-Math.PI/2;soil.scale.set((w-.13)/2,(d-.13)/2,1);soil.position.set(x,.125,z);g.add(soil)}
export function planter(g,x,z,w=1.1){block(g,w,.34,.65,'#dedbd3',x,.23,z,.075);block(g,w-.12,.08,.52,'#6f8056',x,.41,z);for(let i=0;i<3;i++)ball(g,.19,'#71a585',x-w*.3+i*w*.3,.53,z)}
export function bench(g,x,z,ry=0){const b=new THREE.Group();for(let i=0;i<3;i++)block(b,1.3,.065,.12,'#b99b79',0,.46,i*.13-.13);block(b,1.3,.25,.07,'#b99b79',0,.69,-.24);for(const s of[-1,1]){block(b,.06,.44,.06,'#66777d',s*.48,.23,0);block(b,.06,.65,.06,'#66777d',s*.48,.35,-.21)}b.position.set(x,0,z);b.rotation.y=ry;g.add(b)}
export function lamp(g,x,z){const t=new THREE.Group();block(t,.07,2,.07,'#70848b',0,1,0);block(t,.45,.055,.22,'#eaf0e9',.16,2.02,0);block(t,.34,.025,.16,'#ffffe5',.16,1.99,0);t.position.set(x,0,z);g.add(t)}
// A round learning pavilion anchors the north-east campus without copying the other blocks.
function roundCampus(u){const g=new THREE.Group(),cream='#e6d8b6',green='#638e7d',glass='#568b91';
 const drum=(r,h,y,c)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),mat(c));o.position.y=y;o.castShadow=true;o.receiveShadow=true;g.add(o);return o};
 drum(2.6,.18,.15,'#c5cbb7');drum(2.49,.10,.29,'#eee4c9');drum(2.15,.62,.64,cream);
 for(let row=0;row<3;row++){const y=1.0+row*1.1;drum(2.12,.96,y+.48,cream);drum(2.25,.12,y+1.0,green);drum(2.33,.07,y+1.08,'#f2e6c8');
 for(let k=0;k<20;k++){const a=k*Math.PI/10,x=Math.sin(a),z=Math.cos(a);const pane=block(g,.50,.72,.055,glass,x*2.135,y+.48,z*2.135);pane.rotation.y=a;const post=block(g,.075,.88,.085,'#ede2c2',Math.sin(a+.157)*2.16,y+.48,Math.cos(a+.157)*2.16);post.rotation.y=a+.157;const sill=block(g,.52,.05,.12,'#a6bfae',x*2.16,y+.10,z*2.16);sill.rotation.y=a;}}
 drum(2.32,.15,4.39,green);drum(2.17,.07,4.5,'#9eaf8a');
 for(let k=0;k<24;k++){const a=k*Math.PI/12,x=Math.sin(a),z=Math.cos(a);block(g,.035,.35,.035,'#d5ddc2',x*2.22,4.72,z*2.22);const rail=block(g,.59,.045,.045,'#e9e5cb',x*2.23,4.91,z*2.23);rail.rotation.y=a;}
 const roof=new THREE.Mesh(new THREE.SphereGeometry(1,24,10,0,Math.PI*2,0,Math.PI/2),mat('#81a598'));roof.scale.set(1.0,.38,1.0);roof.position.set(0,4.58,0);roof.castShadow=true;g.add(roof);
 for(const a of[-1.1,0,1.1]){const x=Math.sin(a)*1.72,z=Math.cos(a)*1.72;planter(g,x,z,.70);const pl=g.children.slice(-5);for(const o of pl)o.position.y+=4.31;}
 // Low studio wing and sheltered lobby keep the tower connected to its garden.
 block(g,1.9,1.25,2.5,'#d7cdab',-2.35,.92,-.2);softBlock(g,2.1,.14,2.7,'#729583',-2.35,1.63,-.2);for(let k=0;k<3;k++)block(g,.47,.84,.035,glass,-3.0+k*.60,.99,1.07);
 block(g,1.30,.77,.08,glass,0,.75,2.10);block(g,.06,.80,.12,'#e4dec0',0,.75,2.17);softBlock(g,2,.15,1.2,green,0,1.25,2.4);for(const x of[-.82,.82])block(g,.07,.94,.07,'#c6cbaa',x,.72,2.8);
 block(g,2.1,.13,1.05,'#ddd7bb',0,.24,2.55);block(g,2.4,.10,.65,'#c8cfb7',0,.12,3.0);const brand=logoBoard(u.id,1.35,.39);if(brand){brand.position.set(0,1.61,2.20);g.add(brand)}planter(g,-1.65,2.0,.75);planter(g,1.65,2.0,.75);
 return finishCampus(g,u.id)}
function finishCampus(g,id){g.updateMatrixWorld(true);const shells=[];g.traverse(o=>{if(!o.isMesh||!o.material?.isMeshLambertMaterial)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,size=new THREE.Vector3();b.getSize(size);if(size.x<.3||size.y<.08||size.z<.3)return;const geo=new THREE.BoxGeometry(size.x,size.y,size.z),center=new THREE.Vector3();b.getCenter(center);geo.translate(center.x,center.y,center.z);geo.applyMatrix4(o.matrixWorld);shells.push(geo)});g.userData.depthGeometry=mergeGeometries(shells);shells.forEach(geo=>geo.dispose());g.userData.uni=id;return g}
export function campusBuilding(u,index){if(index===4)return roundCampus(u);const g=new THREE.Group(),w=[4.4,4.4,5.1,3.8,4.4][index],d=3.3,floors=[3,4,2,5,3][index],fh=1.02,accent=['#4e8578','#c28c57','#8a9c73','#4f8b91','#789c8d'][index],glass=['#437b89','#608694','#677f7b','#3c718b','#54868b'][index]
 block(g,w+.95,.2,4.5,'#c6ceca',0,.12,0,.08);block(g,w+.75,.1,4.3,'#eeeee6',0,.26,0)
 block(g,w,.8,d,'#efe0bd',0,.68,0)
 for(let row=0;row<floors;row++){const start=g.children.length,y=1.1+row*fh;block(g,w,.91,d,['#e9d5ad','#e5c29a','#e2d8ae','#d6d9b4','#e8d6a8'][index],0,y+.42,0)
  softBlock(g,w+.17,.12,d+.18,accent,0,y+.94,0);softBlock(g,w+.29,.08,d+.30,'#f2e5c9',0,y+1.005,0)
  // Windows recessed behind continuous frames. Side elevations have the same level of detail.
  for(let k=0;k<4;k++){const x=(k-1.5)*(w-.98)/3;block(g,.78,.64,.025,glass,x,y+.43,d/2+.019,.006);block(g,.81,.055,.13,'#a9bbb7',x,y+.1,d/2+.055);block(g,.035,.68,.045,'#c5d2c9',x,y+.43,d/2+.04,.009);if(index===0||index===3)block(g,.8,.035,.04,'#c5d2c9',x,y+.43,d/2+.04,.009)}
  // Pale reflected sky sits inside selected panes, not room-occupancy lights.
  for(let k=0;k<4;k++)if((k+row+index)%3===0){const x=(k-1.5)*(w-.98)/3,verts=[-.35,-.27,0,.10,.27,0,-.35,.27,0];
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,0,1,1,1],2));geo.computeVertexNormals();
   for(const sd of[-1,1]){const reflection=new THREE.Mesh(geo.clone(),mat('#82a6ac'));reflection.position.set(x,y+.43,sd*(d/2+.035));if(sd<0)reflection.rotation.y=Math.PI;g.add(reflection)}geo.dispose();
  }
  // Rear elevations remain finished when the campus is rotated.
  for(let k=0;k<4;k++){const x=(k-1.5)*(w-.98)/3;block(g,.78,.64,.025,glass,x,y+.43,-d/2-.019,.006);block(g,.81,.055,.13,'#a9bbb7',x,y+.1,-d/2-.055);block(g,.035,.68,.045,'#c5d2c9',x,y+.43,-d/2-.04,.009);if(index===0||index===3)block(g,.8,.035,.04,'#c5d2c9',x,y+.43,-d/2-.04,.009)}
  for(const s of[-1,1])for(let k=0;k<3;k++){const z=-1.05+k*1.05;block(g,.028,.63,.74,glass,s*(w/2+.015),y+.43,z);block(g,.08,.04,.8,'#c5d2c9',s*(w/2+.04),y+.1,z);block(g,.04,.65,.035,'#c5d2c9',s*(w/2+.04),y+.43,z)}
  // Coloured recessed strips, not a progress indicator.
  block(g,.13,.86,.12,accent,-w/2+.13,y+.43,d/2+.04)
  if((row===floors-1&&(index===1||index===3))||(index===2&&row>=floors-2)){const tier=new THREE.Group();for(const child of g.children.slice(start))tier.add(child);const inset=index===2?(row===floors-1?.76:.9):.86;tier.scale.set(inset,1,inset);g.add(tier)}
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
 if(index===1||index===2||index===3){const cap=new THREE.Group();for(const child of g.children.slice(roofStart))cap.add(child);const inset=index===2?.76:.86;cap.scale.set(inset,1,inset);g.add(cap)}
 // Excelia has a warm copper hipped roof, instead of another identical flat terrace.
 if(index===1){for(const child of g.children.slice(roofStart)){child.removeFromParent();child.traverse(o=>{if(o.isMesh)o.geometry.dispose()})}
 const y=roof+.11,rx=2.17,rz=1.67,ridge=.68,verts=[-rx,y,-rz,rx,y,-rz,ridge,y+.72,0,-ridge,y+.72,0, -rx,y,rz,-ridge,y+.72,0,ridge,y+.72,0,rx,y,rz, -rx,y,-rz,-ridge,y+.72,0,-rx,y,rz, rx,y,-rz,rx,y,rz,ridge,y+.72,0],idx=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,11,12,13];
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(28),2));geo.setIndex(idx.flatMap((v,i)=>i%3===0?[idx[i],idx[i+2],idx[i+1]]:[]));geo.computeVertexNormals();const m=mat('#b98152');const hip=new THREE.Mesh(geo,m);hip.castShadow=true;g.add(hip);softBlock(g,4.48,.13,3.47,'#dec69a',0,y-.03,0);block(g,1.45,.10,.13,'#d8ad7c',0,y+.76,0);
 for(const side of[-1,1]){const dormer=new THREE.Group();block(dormer,.9,.42,.6,'#d9c296',0,0,0);block(dormer,.64,.28,.035,glass,0,0,.32);softBlock(dormer,1.03,.08,.71,'#78907d',0,.25,0);dormer.position.set(side*.95,y+.35,.82);g.add(dormer)}
 }
 // Distinct secondary volumes create silhouettes, while keeping the campus palette.

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
 // Rounded lecture pavilion and glazed study wing make the schools distinct at map scale.
 if(index===4){const pavilion=new THREE.Group();for(const [r,h,y,c]of[[1.03,1.4,.98,'#d9d3ad'],[1.1,.14,1.74,'#567f78'],[1.18,.10,1.85,'#e7dfbd']]){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),mat(c));o.position.y=y;o.castShadow=true;pavilion.add(o)}for(let k=0;k<12;k++){const a=k*Math.PI/6,x=Math.sin(a)*1.04,z=Math.cos(a)*1.04;const pane=block(pavilion,.38,.88,.045,glass,x,1.03,z);pane.rotation.y=a;const mullion=block(pavilion,.045,1.24,.07,'#eee2be',Math.sin(a+.25)*1.065,1.04,Math.cos(a+.25)*1.065);mullion.rotation.y=a+.25}pavilion.position.set(-2.6,0,.2);g.add(pavilion)}
 if(index===0){const wing=new THREE.Group();block(wing,2.45,1.15,2.7,'#65998c',0,.85,0);block(wing,2.65,.14,2.9,'#e6dfbc',0,1.48,0);for(let k=0;k<4;k++){block(wing,.48,.82,.035,'#6c969b',-.88+k*.58,.94,1.37);block(wing,.045,1.04,.075,'#e6dfbc',-.88+k*.58,1.0,1.40)}const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI/2),mat('#86aaa0'));canopy.scale.set(1.22,.78,1.32);canopy.position.y=1.56;canopy.castShadow=true;wing.add(canopy);for(const side of[-1,1]){const arch=new THREE.Mesh(new THREE.TorusGeometry(1,.035,4,24,Math.PI),mat('#d5dfc3'));arch.scale.set(1.23,.78,1);arch.position.set(0,1.56,side*.70);wing.add(arch)}wing.position.set(-2.7,0,-.15);g.add(wing)}
 // IAE is a low terraced teaching hall with a sheltered garden arcade.
 if(index===2){const hall=new THREE.Group();block(hall,2.25,1.2,2.8,'#d9d3b0',0,.88,0);softBlock(hall,2.5,.16,3.05,'#8da37f',0,1.54,0);for(let k=0;k<3;k++){block(hall,.54,.74,.035,glass,-.70+k*.7,.95,1.42);block(hall,.06,.90,.08,'#e8e1bf',-.98+k*.7,.96,1.46)}for(const z of[-1.3,1.3]){block(hall,2.45,.045,.05,'#d8dec0',0,1.98,z);for(const x of[-1.1,0,1.1])block(hall,.035,.34,.035,'#b9c7a9',x,1.8,z)}planter(hall,0,0,1.4);for(const o of hall.children.slice(-5))o.position.y+=1.28;hall.position.set(2.8,0,-.2);g.add(hall);}
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
 return finishCampus(g,u.id)}
export function campusGround(g){
 // A gently irregular park edge, while the original building and street coordinates stay intact.
 const softenEdge=(x,z)=>{const ex=Math.max(0,(Math.abs(x)-8.5)/4.4),ez=Math.max(0,(Math.abs(z)-12)/4.9);return [x+ex*(.34*Math.sin(z*.56)+.16*Math.cos(z*1.1)),z+ez*(.34*Math.sin(x*.61)+.13*Math.cos(x*1.25))]};
 const island=(w,d,h,y,color)=>{const radius=2.2,shape=new THREE.Shape(),x=w/2,z=d/2;shape.moveTo(-x+radius,-z);shape.lineTo(x-radius,-z);shape.quadraticCurveTo(x,-z,x,-z+radius);shape.lineTo(x,z-radius);shape.quadraticCurveTo(x,z,x-radius,z);shape.lineTo(-x+radius,z);shape.quadraticCurveTo(-x,z,-x,z-radius);shape.lineTo(-x,-z+radius);shape.quadraticCurveTo(-x,-z,-x+radius,-z);const outline=new THREE.Shape(shape.getPoints(120).map(p=>{const [xx,zz]=softenEdge(p.x,p.y);return new THREE.Vector2(xx,zz)}));const geo=new THREE.ExtrudeGeometry(outline,{depth:h,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:2,curveSegments:10,steps:1});geo.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(geo,mat(color));mesh.position.y=y;mesh.receiveShadow=true;g.add(mesh)};island(25.9,33.9,.43,-.54,'#8ba078');island(25.65,33.65,.08,-.045,'#b1d48b');
 // Soft meadow colour and shallow planted rises break the flat model-board surface.
 const meadowGeo=new THREE.PlaneGeometry(25.35,33.35,40,52);meadowGeo.rotateX(-Math.PI/2);
 const meadowPos=meadowGeo.attributes.position,meadowColors=new Float32Array(meadowPos.count*3);
 const low=new THREE.Color('#9cc985'),high=new THREE.Color('#c7dfa2');
 for(let i=0;i<meadowPos.count;i++){let x=meadowPos.getX(i),z=meadowPos.getZ(i);const cx=Math.max(0,Math.abs(x)-10.4),cz=Math.max(0,Math.abs(z)-14.4),distance=Math.hypot(cx,cz);if(distance>2.25){x=Math.sign(x)*(10.4+cx/distance*2.25);z=Math.sign(z)*(14.4+cz/distance*2.25);meadowPos.setXYZ(i,x,0,z)}const [xx,zz]=softenEdge(x,z);meadowPos.setXYZ(i,xx,0,zz);const blend=.46+.19*Math.sin(x*.31+z*.16)+.15*Math.cos(z*.35-x*.1),c=low.clone().lerp(high,blend);meadowColors.set([c.r,c.g,c.b],i*3)}
 meadowGeo.setAttribute('color',new THREE.BufferAttribute(meadowColors,3));const meadowMat=mat('#ffffff').clone();meadowMat.vertexColors=true;const meadow=new THREE.Mesh(meadowGeo,meadowMat);meadow.position.y=.056;meadow.receiveShadow=true;g.add(meadow);
 for(const [x,z,w,d]of[[-10,11,2.1,2.8],[-10,-11,2.1,2.4],[10,-11,1.7,2.8],[-3,-15,1.8,1.2],[3,15,1.9,1.2]]){const rise=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),mat('#b4c99b'));rise.scale.set(w,.32,d);rise.position.set(x,-.11,z);rise.receiveShadow=true;g.add(rise)}
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
 // Shared reading tables and canvas shade are decorative, never work counters.
 const reading=new THREE.Group();
 const table=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.10,24),mat('#cfb695'));table.position.y=.76;table.castShadow=true;reading.add(table);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.065,.09,.65,8),mat('#6b8580'));stem.position.y=.4;reading.add(stem);
 for(const sd of[-1,1]){softBlock(reading,.48,.09,.48,'#b79a77',sd*.84,.46,0,.025);softBlock(reading,.48,.40,.07,'#c4ab8c',sd*.84,.66,-.24,.02);for(const dz of[-.16,.16])block(reading,.045,.44,.045,'#718780',sd*.84,.22,dz)}
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.25,8),mat('#b79a78'));pole.position.set(0,1.14,.1);reading.add(pole);
 const canopyGeo=new THREE.ConeGeometry(1.17,.43,12,1,true);canopyGeo.clearGroups();for(let k=0;k<12;k++)canopyGeo.addGroup(k*3,3,k%2);const canopy=new THREE.Mesh(canopyGeo,[new THREE.MeshLambertMaterial({color:'#d9cba9',side:THREE.DoubleSide}),new THREE.MeshLambertMaterial({color:'#e7dfc8',side:THREE.DoubleSide})]);canopy.position.set(0,2.18,.1);canopy.castShadow=true;reading.add(canopy);
 const rib=new THREE.Mesh(new THREE.TorusGeometry(1.17,.028,4,24),mat('#bba989'));rib.rotation.x=Math.PI/2;rib.position.set(0,1.965,.1);reading.add(rib);
 reading.position.set(-1.6,.14,-6.2);g.add(reading);
 // Campus marker and public noticeboard are place identity, not live-task signals.
 block(g,.8,1.25,.38,'#bcc7ba',6,.72,12.4);block(g,.88,.11,.43,'#849f98',6,1.4,12.4);block(g,.58,.46,.045,'#365e61',6,.95,12.61);
 for(const x of[-1.5,-.2,1.1]){block(g,1,.13,1.3,'#92a88c',x,.16,13);block(g,.85,.04,1.15,'#a2bb96',x,.255,13);for(let k=0;k<3;k++)ball(g,.11,['#d9b488','#b8a3ae','#d6c5a0'][k],x-.2+k*.2,.39,13)}
 // Connected planting beds frame the pedestrian campus, with distinct quiet spaces.
 for(const [x,z,w,d]of[[-9,-10,4,7],[-9,11,4,6],[-4,-14,4,2],[3,14,4,2]]){garden(g,x,z,w,d);for(let i=0;i<5;i++){const xx=x+(i%3-1)*w*.28,zz=z+(Math.floor(i/3)-.5)*d*.55;ball(g,.26,['#6b9273','#8aaa80','#a0b68b'][i%3],xx,.31,zz)}}
 for(const [x,z,s]of[[-10,-9,1.3],[-8,-11,1.2],[-10,12,1.2],[-8,10,1.15],[7.7,-14.4,1.1],[11,-5,1.15],[-3,-15,1.1],[2,15,1.15]])tree(g,x,z,s);
 for(const [x,z,ry]of[[-8.5,-8,.4],[-7,11,-.2],[6.8,-11,Math.PI/2]])bench(g,x,z,ry);

 for(const [x,z]of[[-10,10],[-8,-10],[11,-6],[-2,14],[5,14]]){for(let k=0;k<5;k++){const xx=x+(k-2)*.25;block(g,.025,.18,.025,'#789267',xx,.23,z);const flower=ball(g,.075,['#efc886','#d4a0aa','#f0ddac'][k%3],xx,.34,z);flower.scale.y=.6;}}
 // A garden-only limestone walk connects the reading grove without changing V21 streets.
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-11,.14,12),new THREE.Vector3(-8.5,.14,8),new THREE.Vector3(-10,.14,4),new THREE.Vector3(-9.5,.14,0),new THREE.Vector3(-10,.14,-5),new THREE.Vector3(-8.5,.14,-10),new THREE.Vector3(-9,.14,-14)]);
 const pts=curve.getPoints(72),vertices=[],indices=[];pts.forEach((p,i)=>{const tangent=curve.getTangent(i/72),side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(.4);vertices.push(p.x+side.x,p.y,p.z+side.z,p.x-side.x,p.y,p.z-side.z);if(i<72){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}});const walkGeo=new THREE.BufferGeometry();walkGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));walkGeo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));walkGeo.setIndex(indices);walkGeo.computeVertexNormals();g.add(new THREE.Mesh(walkGeo,mat('#c9cfb8')));
 // A timber reading deck and low curved seats make the garden spaces legible at village scale.
 softBlock(g,3.1,.13,3.2,'#c5b699',-9.75,.14,2,.08);
 for(let k=0;k<13;k++)block(g,3.0,.012,.018,'#a89e86',-9.75,.214,.56+k*.24);
 for(const [cx,cz,start]of[[10,8,.12],[-9,11,.28]]){const geo=new THREE.TorusGeometry(1.42,.16,6,24,Math.PI*.62),seat=new THREE.Mesh(geo,mat('#d6d8c2'));seat.rotation.x=Math.PI/2;seat.rotation.z=start;seat.position.set(cx,.37,cz);seat.castShadow=true;g.add(seat);
 for(const a of[start+.12,start+1.8]){const x=cx+Math.cos(a)*1.42,z=cz-Math.sin(a)*1.42;block(g,.18,.32,.18,'#8ca296',x,.18,z)} }
 // A shallow ring catches the fountain light without simulating a work signal.
 const ripple=new THREE.Mesh(new THREE.TorusGeometry(.65,.014,4,32),mat('#b7d6d0'));ripple.rotation.x=Math.PI/2;ripple.position.set(10,.385,8);g.add(ripple);
 // Slender cypresses and clipped meadow borders frame the entrances as a garden campus.
 for(const [x,z]of[[12,-3.4],[12,4.0],[-5.8,-13.8],[-5.8,13.8]]){
 const cypress=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,1.1,7),mat('#b9ad91'));trunk.position.y=.55;cypress.add(trunk);
 for(let j=0;j<3;j++){const crown=ball(cypress,.44-j*.09,['#467c66','#68977a','#89ad8b'][j],0,1.1+j*.55,0);crown.scale.set(.76,1.65,.76)}cypress.position.set(x,.08,z);g.add(cypress);
 garden(g,x,z,1.25,1.25);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ball(g,.11,'#b4c8a0',x+Math.cos(a)*.45,.22,z+Math.sin(a)*.45)}
 }
 // Low limestone edging, grasses and stepping stones add depth to the west reading grove.
 for(const [x,z,ry]of[[-10.8,7.8,-.2],[-8.2,-6.7,.3],[-9.8,-12.3,-.3]]){
 const bed=new THREE.Group();softBlock(bed,1.8,.16,.65,'#d4d7c3',0,.14,0,.05);softBlock(bed,1.65,.06,.5,'#8d9c72',0,.25,0,.02);
 for(let j=0;j<5;j++){const xx=-.62+j*.31;for(const side of[-1,1]){const leaf=block(bed,.045,.36,.035,['#819c71','#9eb183'][j%2],xx+side*.05,.43,0);leaf.rotation.z=side*.34}ball(bed,.09,['#dfc995','#c9a9b1','#e3d7b5'][j%3],xx,.61,0)}
 bed.position.set(x,0,z);bed.rotation.y=ry;g.add(bed);
 }
 for(const [x,z,ry]of[[-8.9,5.5,.2],[-8.55,6.2,.1],[-8.3,6.9,-.1],[-9.3,-7.8,-.2],[-9.05,-8.5,.1]]){const stone=softBlock(g,.58,.045,.4,'#d5d8c5',x,.17,z,.04);stone.rotation.y=ry;}
 // A botanical pond gives the quiet east garden a softer silhouette and a warm blue counterpoint.
 const pond=new THREE.Group(),edge=[];for(let k=0;k<48;k++){const a=k*Math.PI/24,r=1+.09*Math.sin(a*3)+.045*Math.cos(a*5);edge.push(new THREE.Vector2(Math.cos(a)*2.05*r,Math.sin(a)*2.85*r));}
 const pondShape=new THREE.Shape(edge),rimGeo=new THREE.ExtrudeGeometry(pondShape,{depth:.10,bevelEnabled:true,bevelThickness:.04,bevelSize:.13,bevelSegments:2,steps:1,curveSegments:3});rimGeo.rotateX(-Math.PI/2);const rim=new THREE.Mesh(rimGeo,mat('#c9c6a1'));rim.position.y=.19;rim.receiveShadow=true;pond.add(rim);
 const waterGeo=new THREE.ShapeGeometry(pondShape,3);waterGeo.rotateX(-Math.PI/2);const pondWater=new THREE.Mesh(waterGeo,mat('#6cb6b3'));pondWater.scale.set(.91,1,.94);pondWater.position.y=.36;pond.add(pondWater);
 for(const [x,z,w]of[[-.7,-1.5,.9],[.55,.25,1.1],[-.2,1.6,.8]]){const shine=new THREE.Mesh(new THREE.TorusGeometry(w,.012,4,32,Math.PI*.72),mat('#afdad0'));shine.rotation.x=Math.PI/2;shine.rotation.z=.3;shine.scale.z=.45;shine.position.set(x,.368,z);pond.add(shine)}
 for(const [x,z]of[[1.1,1.3],[.65,1.6],[-1.2,-.8]]){const lily=new THREE.Mesh(new THREE.CircleGeometry(.20,14,0,Math.PI*1.86),mat('#81a975'));lily.rotation.x=-Math.PI/2;lily.rotation.z=.3;lily.position.set(x,.375,z);pond.add(lily)}
 for(const [x,z]of[[-1.8,.8],[1.6,-1.45],[1.35,2.0]]){for(let k=0;k<4;k++){const xx=x+(k%2)*.15,zz=z+Math.floor(k/2)*.13;const stalk=block(pond,.027,.55+k*.05,.025,'#779768',xx,.47,zz);stalk.rotation.z=(k-1.5)*.07;const seed=ball(pond,.06,'#a78d62',xx,.77+k*.05,zz);seed.scale.y=2.2;}}
 for(let k=0;k<9;k++){const a=k*Math.PI/4.5,stone=ball(pond,.18,'#b9baa1',Math.cos(a)*2.1,.23,Math.sin(a)*2.9);stone.scale.set(1.25,.52,.85);}
 // A short timber viewing deck stops at the bank, not on a task route.
 softBlock(pond,1.35,.16,1.9,'#c6aa7e',-2.0,.30,.2,.04);for(let k=0;k<8;k++)block(pond,1.30,.012,.018,'#a58d6c',-2.0,.39,-.60+k*.23);for(const z of[-.62,1.03]){block(pond,.07,.72,.07,'#9a8667',-2.58,.68,z);block(pond,.055,.06,1.68,'#c5ad85',-2.58,1.02,.20)}
 pond.position.set(9,.03,-9.2);g.add(pond);
 // Meadow tufts, soft flowering shrubs and weathered stones break the park's planted-grid edges.
 for(const [x,z,s]of[[-11.7,-6.2,.9],[-10.9,-1.1,.7],[-11.7,9.1,.8],[-6.3,15.2,.8],[2.8,-15.5,.9],[7.3,-14.7,.7],[11.7,-.8,.7],[11.8,12.4,.8]]){
 const clump=new THREE.Group();for(let k=0;k<6;k++){const a=k*2.4,r=.18+(k%3)*.15,xx=Math.cos(a)*r,zz=Math.sin(a)*r;const shrub=ball(clump,.30+(k%2)*.08,['#7d9d62','#91b16c','#a9be7b'][k%3],xx,.23,zz);shrub.scale.set(1,.72,1);for(let j=0;j<2;j++){const blossom=ball(clump,.065,['#e8bb85','#e6d4a2','#d4a8a0'][(k+j)%3],xx+(j-.5)*.15,.40,zz+.10);blossom.scale.y=.6}}clump.position.set(x,.1,z);clump.scale.setScalar(s);g.add(clump);
 }
 for(const [x,z,s]of[[-11.5,-12.0,.45],[-10.6,6.1,.36],[-5.2,15.7,.32],[4.6,-15.8,.42],[11.7,-5.1,.40],[11.3,14.1,.34]]){
 for(let k=0;k<3;k++){const rock=ball(g,s*(1-k*.20),['#b5b69b','#c7c2a5','#a6ad93'][k],x+k*.35,.19,z+(k%2)*.32);rock.scale.set(1.1,.61,.82);rock.rotation.y=k*.7;}
 }
 for(let k=0;k<75;k++){const side=k%4,t=((k*0.61803398875)%1)*2-1;let x=side<2?(side===0?-11.7:11.8):t*10.8,z=side<2?t*14.8:(side===2?-15.5:15.5);x+=.22*Math.sin(k*2.1);z+=.22*Math.cos(k*1.7);for(let j=0;j<3;j++){const leaf=block(g,.026,.14+(j%2)*.08,.024,['#8aa265','#9caf73','#749762'][j],x+(j-1)*.07,.19,z);leaf.rotation.z=(j-1)*.32;}}
 // A small oval commons gives the centre a recognisable gathering place, not a task marker.
 const commons=new THREE.Group();const disc=(r,h,y,c,sx=1,sz=1)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),mat(c));m.scale.set(sx,1,sz);m.position.y=y;m.receiveShadow=true;commons.add(m);return m};
 disc(1.8,.08,.11,'#d9cfad',1,1.15);disc(1.62,.04,.17,'#e9ddbe',1,1.15);disc(.94,.18,.26,'#c5c6a0',1,1.1);disc(.84,.06,.38,'#8d9f6a',1,1.1);
 for(let k=0;k<9;k++){const a=k*Math.PI*2/9,r=.46+(k%2)*.13;const shrub=ball(commons,.28,['#769e6b','#94b07b','#abc38a'][k%3],Math.cos(a)*r,.49,Math.sin(a)*r);shrub.scale.y=.72;for(let j=0;j<2;j++)ball(commons,.065,['#e6ca8a','#d9b6a2','#efe1b1'][(k+j)%3],Math.cos(a)*r+(j-.5)*.12,.68,Math.sin(a)*r)}
 for(const side of[-1,1]){const seat=new THREE.Mesh(new THREE.TorusGeometry(1.28,.13,6,24,Math.PI*.6),mat('#b99b73'));seat.rotation.x=Math.PI/2;seat.rotation.z=side<0?Math.PI+.63:.63;seat.scale.set(1,1.15,1);seat.position.y=.45;seat.castShadow=true;commons.add(seat);for(const a of[.75,2.3]){block(commons,.12,.29,.12,'#8a9480',Math.cos(a)*(side<0?-1:1)*1.28,.27,Math.sin(a)*(side<0?-1:1)*1.47)}}
 commons.position.set(-.7,0,3.8);g.add(commons);
 // Low, rounded hedge islands give the north garden a stronger foreground/background layering.
 for(const [x,z,ry]of[[6.7,-13.2,.5],[-7.8,14.2,-.2],[-11.2,-6.5,.3]]){const bed=new THREE.Group();for(let k=0;k<6;k++){const shrub=ball(bed,.32+(k%2)*.07,['#6d996a','#8bad76','#9fba7e'][k%3],-.9+k*.35,.32,Math.sin(k)*.10);shrub.scale.set(1,.83,1);if(k%2===0)ball(bed,.08,'#e6c491',-.9+k*.35,.58,.05)}bed.position.set(x,.08,z);bed.rotation.y=ry;g.add(bed)}
 // A small open-air teaching shelter gives the pond garden a clear architectural focal point.
 const shelter=new THREE.Group();const sy=1.8;for(const x of[-.86,.86])for(const z of[-.70,.70]){block(shelter,.085,sy,.085,'#b5966d',x,sy/2+.12,z);softBlock(shelter,.20,.10,.20,'#d6d2b0',x,.14,z,.02)}
 softBlock(shelter,2.35,.12,2.05,'#dfd3ab',0,sy+.17,0,.05);const roofGeo=new THREE.ConeGeometry(1.55,.70,4);roofGeo.rotateY(Math.PI/4);const canopyRoof=new THREE.Mesh(roofGeo,mat('#78977b'));canopyRoof.scale.z=.88;canopyRoof.position.y=sy+.56;canopyRoof.castShadow=true;shelter.add(canopyRoof);softBlock(shelter,2.6,.10,2.23,'#d5c59f',0,sy+.23,0,.03);softBlock(shelter,2.15,.10,1.85,'#cfc8a5',0,.11,0,.05);
 bench(shelter,0,.48);shelter.position.set(9.7,.04,-13.5);shelter.rotation.y=-.18;g.add(shelter);
 // A restrained warm border highlights the layered park foundation, without changing the biome.
 const edging=new THREE.Group();for(const [x,z,w,d]of[[-9.1,16.25,3.4,.16],[-4.5,16.25,3.4,.16],[.1,16.25,3.4,.16],[4.7,16.25,3.4,.16]])softBlock(edging,w,.10,d,'#b8bb8b',x,-.08,z,.025);g.add(edging);
 // Granite paving has subtle joints instead of noisy procedural textures.
 for(let k=0;k<6;k++)block(g,.014,.009,1.7,'#7e9591',7.5+k*.3,.195,10);
 return {water}
}

// Short-range ambient occlusion is baked into vertex colors, with no per-frame cost.
export function bakeContact(root){root.updateMatrixWorld(true);const objects=[];root.traverse(o=>{if(!o.isMesh||!o.material?.isMeshLambertMaterial)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);objects.push({o,box})});const ray=new THREE.Ray(),normalMatrix=new THREE.Matrix3(),p=new THREE.Vector3(),n=new THREE.Vector3(),hit=new THREE.Vector3();for(const {o,box}of objects){const pos=o.geometry.attributes.position,norm=o.geometry.attributes.normal,colors=new Float32Array(pos.count*3),near=objects.filter(v=>v.o!==o&&v.box.clone().expandByScalar(.42).intersectsBox(box));normalMatrix.getNormalMatrix(o.matrixWorld);for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);n.fromBufferAttribute(norm,i).applyMatrix3(normalMatrix).normalize();ray.origin.copy(p).addScaledVector(n,.025);let occlusion=0;for(const delta of[[0,0,0],[.4,.25,0],[-.4,.25,0],[0,.25,.4],[0,.25,-.4]]){ray.direction.copy(n).add(new THREE.Vector3(...delta)).normalize();let distance=.42;for(const v of near){if(v.box.containsPoint(ray.origin))continue;if(ray.intersectBox(v.box,hit)){distance=Math.min(distance,hit.distanceTo(ray.origin))}}occlusion+=1-distance/.42}const shade=1-occlusion/5*.28;colors.fill(shade,i*3,i*3+3)}o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))}}

export function compactStatic(root,exclude=[]){root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),buckets=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh||(!o.material?.isMeshStandardMaterial&&!o.material?.isMeshLambertMaterial)||(()=>{let a=o;while(a){if(exclude.includes(a))return true;a=a.parent}return false})())return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));const colors=new Float32Array(geo.attributes.position.count*3),old=geo.attributes.color;for(let i=0;i<geo.attributes.position.count;i++){colors[i*3]=o.material.color.r*(old?old.getX(i):1);colors[i*3+1]=o.material.color.g*(old?old.getY(i):1);colors[i*3+2]=o.material.color.b*(old?old.getZ(i):1)}geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const k=o.material.type+(o.material.roughness??'')+(o.material.metalness??'');if(!buckets.has(k)){const m=o.material.clone();m.color.set('#ffffff');m.vertexColors=true;buckets.set(k,{mat:m,geos:[]})}buckets.get(k).geos.push(geo);remove.push(o)});remove.forEach(o=>{o.removeFromParent();o.geometry.dispose()});for(const {mat,geos} of buckets.values()){const merged=mergeGeometries(geos);const geo=merged&&mergeVertices(merged);merged?.dispose();if(!geo)throw Error('Static merge failed');const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;root.add(m);geos.forEach(g=>g.dispose())}}
