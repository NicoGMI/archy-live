import test from 'node:test'
import assert from 'node:assert/strict'
import {turnToward,gaitPose} from '../src/motion.js'
test('steering takes shortest route across angle seam',()=>{const a=turnToward(3.1,-3.1,.016);assert.ok(a>3.1&&a<3.19)})
test('opposite limbs and knees bend during swing',()=>{const p=gaitPose(Math.PI/2);assert.equal(p.hips[0],-p.hips[1]);assert.equal(p.arms[0],-p.arms[1]);assert.equal(p.knees[0],0);assert.ok(p.knees[1]>0)})
test('stopped character keeps feet and torso still',()=>{const p=gaitPose(1,0);assert.equal(Math.abs(p.hips[0])+Math.abs(p.hips[1])+p.bob,0)})
