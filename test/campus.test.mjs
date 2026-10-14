import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {block,compactStatic} from '../src/campus.js'
import {PLAN,QUARTERS} from '../src/layout.js'
test('pilot preserves the five original campus coordinates',()=>{assert.deepEqual(QUARTERS.etudiant.ids,['isme','excelia','iae','efrei','ece']);assert.deepEqual(PLAN.isme,[-28,-8]);assert.deepEqual(PLAN.ece,[-30,-17])})
test('static compaction preserves positions and vertex colors with one draw',()=>{const root=new THREE.Group();block(root,1,1,1,'#ff0000',-2,1,0);block(root,1,1,1,'#00ff00',2,1,0);compactStatic(root);const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});assert.equal(meshes.length,1);const m=meshes[0];assert.equal(m.material.vertexColors,true);m.geometry.computeBoundingBox();assert.ok(m.geometry.boundingBox.min.x<=-2.5);assert.ok(m.geometry.boundingBox.max.x>=2.5);const c=m.geometry.attributes.color;assert.equal(c.getX(0),1);assert.equal(c.getY(c.count-1),1)})
test('animated descendants and textures are excluded from compaction',()=>{const root=new THREE.Group(),limb=new THREE.Group();root.add(limb);const retained=block(limb,1,1,1,'#123456',0,1,0);block(root,1,1,1,'#654321',0,2,0);const logo=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());root.add(logo);compactStatic(root,[limb]);assert.equal(retained.parent,limb);assert.equal(logo.parent,root)})
