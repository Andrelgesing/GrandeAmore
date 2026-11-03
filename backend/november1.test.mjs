import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
const {Rankings}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const fixture=vm.createContext({});vm.runInContext(readFileSync(new URL('../matches.js',import.meta.url),'utf8').split('function positionCost')[0],fixture);
const teams=JSON.parse(vm.runInContext('JSON.stringify(currentMatch.teams)',fixture));
const data=new Map();const storage={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),transaction:async fn=>fn(storage)};
async function start(enabled){let ready;const service=new Rankings({storage,blockConcurrencyWhile(fn){ready=fn();}},{APPLY_MATCH_20261101:String(enabled)});await ready;return service;}
await start(false);
const original=data.get('ratings');
for(const [i,rating] of Object.values(original).entries()){rating.elo+=i;rating.calibrationDuels=7;}
data.set('ratings',original);data.set('revision',1683);data.set('vote:history',{points:9});
const before=structuredClone(original);
let service=await start(true);
const saved=data.get('tournament:2026-11-01:placement');
assert.equal(Object.keys(saved.adjustments).length,16);
assert.equal(Object.values(saved.adjustments).reduce((a,b)=>a+b),0);
for(const [i,team] of teams.entries()) for(const displayName of team){const name=displayName==='Paolo'?'Paolo (pac)':displayName;assert.equal(saved.adjustments[name],i===1?20:-20);}
for(const [name,r] of Object.entries(before)){
 assert.equal(data.get('ratings')[name].elo,r.elo+(saved.adjustments[name]||0));
 assert.equal(data.get('ratings')[name].calibrationDuels,7);
 if(r.legendary) assert(data.get('ratings')[name].legendary);
}
assert.deepEqual(saved.beforeRatings,before);assert.deepEqual(saved.afterRatings,data.get('ratings'));assert.equal(data.get('revision'),1684);
service=await start(true);assert.equal(data.get('revision'),1684);assert.deepEqual(data.get('ratings'),saved.afterRatings);
const live=await(await service.fetch(new Request('https://test/ratings'))).json();assert.deepEqual(live.tournamentAdjustments,saved.adjustments);
assert.deepEqual(data.get('vote:history'),{points:9});
console.log('Passed: exact 16-player ±20 adjustments, backup, latest annotation, no repeat on restart, nonparticipants/calibration/history/honors preserved.');
