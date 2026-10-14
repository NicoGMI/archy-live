import * as THREE from 'three'
import {M} from './props.js'
import {tx,texMat} from './textures.js'
export const BIOMES={
 formation:{ground:'#c9b080',leaf:'#497c54',wood:'#88522f',roof:'#44372c',kind:'pine',name:'La pinède des savoirs'},
 etudiant:{ground:'#c0d1d5',leaf:'#7fbb8c',wood:'#e1e6df',roof:'#49687a',kind:'column',name:'Le campus'},
 ngmi:{ground:'#baa7d3',leaf:'#b587c1',wood:'#d5c3ec',roof:'#63467a',kind:'violet',name:'Le bosquet NGMI'},
 media:{ground:'#e4ba85',leaf:'#d88748',wood:'#dfb67e',roof:'#a74533',kind:'round',name:'Les ateliers'},
 perso:{ground:'#e8cbd1',leaf:'#e3a2b7',wood:'#fff1db',roof:'#c27c86',kind:'blossom',name:'Le jardin familial'},
 admin:{ground:'#b6cbb9',leaf:'#75a28d',wood:'#c8d6cc',roof:'#567569',kind:'willow',name:'Les archives'}
}
export const districtFor=(id,quarters)=>Object.keys(quarters).find(k=>quarters[k].ids.includes(id))||'formation'
export function cityRoutes(plan,quarters){
 const roads=[],paths={}
 for(const [k,q] of Object.entries(quarters)){
  const [x,z]=q.c,L=Math.hypot(x,z),gate=[x*.66,z*.66],start=[x/L*9,z/L*9]
  const trunk=[start,[gate[0]*.7,gate[1]*.7],gate,q.c]
  for(let i=1;i<trunk.length;i++)roads.push({a:trunk[i-1],b:trunk[i],width:2.5,district:k})
  // A short local street feeds the front doors. Only the quarter trunk reaches the square.
  for(const id of q.ids){const p=plan[id],l=Math.hypot(...p),door=[p[0]-p[0]/l*2.9,p[1]-p[1]/l*2.9],junction=[door[0],z]
   const hub=[x*.79,z*.79],junction2=[door[0],hub[1]],branch=[q.c,hub,junction2,door];for(let i=1;i<branch.length;i++)if(Math.hypot(branch[i][0]-branch[i-1][0],branch[i][1]-branch[i-1][1])>.05)roads.push({a:branch[i-1],b:branch[i],width:1.3,district:k})
   paths[id]=[[0,0],...trunk,...branch.slice(1)]
  }
 }
 return {roads,paths}
}
export const distanceToRoad=(x,z,roads)=>Math.min(...roads.map(({a,b,width})=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)-width/2}))
export function drawRoads(scene,roads){
 roads.forEach(({a,b,width,district})=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),g=new THREE.Group();g.position.set((a[0]+b[0])/2,.085,(a[1]+b[1])/2);g.rotation.y=Math.atan2(dx,dz)
  const edge=new THREE.Mesh(new THREE.PlaneGeometry(width+.35,len+.2),M(district==='etudiant'?'#e4e8e5':'#b7a483'));edge.rotation.x=-Math.PI/2;g.add(edge)
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,len+.15),texMat(tx(district==='etudiant'?'plaza':'path',1,Math.max(1,Math.round(len/2)))));m.rotation.x=-Math.PI/2;m.position.y=.006;m.receiveShadow=true;g.add(m);scene.add(g)
 })
}
export function biomeTree(kind,color,x,z,scale=1){
 const g=new THREE.Group(),tr=new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,1.6,7),M('#765335'));tr.position.y=.8;g.add(tr)
 const add=(geo,px,py,pz)=>{const o=new THREE.Mesh(geo,M(color));o.position.set(px,py,pz);o.castShadow=true;g.add(o);return o}
 if(kind==='pine'){for(let i=0;i<3;i++)add(new THREE.ConeGeometry(1.05-i*.22,1.25,8),0,1.5+i*.7,0)}
 else if(kind==='column'){const o=add(new THREE.SphereGeometry(.8,10,8),0,2.2,0);o.scale.set(.7,1.55,.7)}
 else if(kind==='willow'){add(new THREE.SphereGeometry(1.1,10,8),0,1.9,0);for(let i=0;i<6;i++){const a=i/6*6.28;const o=add(new THREE.ConeGeometry(.33,1.25,6),Math.cos(a)*.8,1.35,Math.sin(a)*.8);o.rotation.z=Math.PI}}
 else{add(new THREE.SphereGeometry(.95,10,8),0,2,0);add(new THREE.SphereGeometry(.65,8,6),-.6,1.8,0);add(new THREE.SphereGeometry(.65,8,6),.6,1.9,.2)}
 g.position.set(x,.05,z);g.scale.setScalar(scale);return g
}
export function pointAlong(points,t){const lens=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lens.reduce((a,b)=>a+b,0);let d=t*total;for(let i=0;i<lens.length;i++){if(d<=lens[i]||i===lens.length-1){const a=points[i],b=points[i+1],f=Math.min(1,d/(lens[i]||1));return {x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,dx:b[0]-a[0],dz:b[1]-a[1]}}d-=lens[i]}return{x:0,z:0,dx:0,dz:1}}
