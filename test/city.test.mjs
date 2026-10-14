import {test} from 'node:test'
import assert from 'node:assert/strict'
import {cityRoutes,pointAlong,distanceToRoad} from '../src/city.js'
test('one main route per district then house branches',()=>{const {roads,paths}=cityRoutes({a:[-20,-22],b:[-10,-25]},{formation:{c:[-15,-22],ids:['a','b']}});assert.deepEqual(paths.a.slice(0,5),paths.b.slice(0,5));assert.equal(roads.filter(r=>r.width===2.5).length,3);assert.ok(roads.some(r=>r.width===1.3));assert.equal(pointAlong(paths.a,0).x,0);assert.ok(Number.isFinite(pointAlong(paths.a,.5).z));assert.ok(distanceToRoad(-15,-22,roads)<0)})
