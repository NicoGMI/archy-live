import {test} from 'node:test'
import assert from 'node:assert/strict'
import {apply} from '../scripts/update.mjs'
const fresh=()=>({universes:[{id:'isme'}],tasks:[{id:'t1',universe:'isme',title:'Mail',status:'waiting'}],log:[]})
test('v17 categories, move, room and alert are independent of task status',()=>{const d=fresh();apply(d,'universe',['phil','Phil','▶','#f00','media']);apply(d,'move',['t1','phil']);apply(d,'room',['t1','commentaires']);apply(d,'alert',['isme','Mail important','✉']);assert.equal(d.tasks[0].universe,'phil');assert.equal(d.tasks[0].room,'commentaires');assert.equal(d.tasks[0].status,'waiting');assert.equal(d.alerts[0].text,'Mail important');apply(d,'alert-clear',['isme']);assert.equal(d.alerts.length,0)})
test('stats preserve actual observation time',()=>{const d=fresh();apply(d,'stats',['youtube',JSON.stringify({at:'2026-10-14T14:55:00Z',subscribers:4})],'2026-10-14T15:00:00Z');assert.equal(d.stats.youtube.at,'2026-10-14T14:55:00Z')})
