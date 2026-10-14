import * as THREE from 'three'
import {LOGOS} from './rooms.js'
export function logoBoard(id,width=2,height=.9){
 const url=LOGOS[id];if(!url)return null
 const g=new THREE.Group(),bg=new THREE.Mesh(new THREE.BoxGeometry(width+.18,height+.18,.12),new THREE.MeshLambertMaterial({color:id==='isme'?'#12244a':'#fffaf3'}));g.add(bg)
 const tex=new THREE.TextureLoader().load(url);tex.colorSpace=THREE.SRGBColorSpace;tex.userData.keep=true
 const p=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,transparent:true}));p.position.z=.07;g.add(p);return g
}
export function youtubeBadge(){
 const g=new THREE.Group(),shape=new THREE.Shape();shape.moveTo(-.65,-.4);shape.lineTo(.65,-.4);shape.quadraticCurveTo(.8,-.4,.8,-.25);shape.lineTo(.8,.25);shape.quadraticCurveTo(.8,.4,.65,.4);shape.lineTo(-.65,.4);shape.quadraticCurveTo(-.8,.4,-.8,.25);shape.lineTo(-.8,-.25);shape.quadraticCurveTo(-.8,-.4,-.65,-.4)
 g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.03,bevelThickness:.03}),new THREE.MeshLambertMaterial({color:'#ff0033'})))
 const tri=new THREE.Shape();tri.moveTo(-.18,-.23);tri.lineTo(.28,0);tri.lineTo(-.18,.23);tri.closePath();const play=new THREE.Mesh(new THREE.ShapeGeometry(tri),new THREE.MeshBasicMaterial({color:'#fff'}));play.position.z=.19;g.add(play);return g
}
