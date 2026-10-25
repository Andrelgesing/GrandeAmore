import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
const { Rankings, calculateTournamentElo, tournamentEloDelta, tournament25Input } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
for (const [difference, delta] of [[0,0],[.499,0],[.5,10],[.999,10],[1,20],[2.999,20],[3,40],[-.499,0],[-.5,-10],[-1,-20],[-2.999,-20],[-3,-40]]) assert.equal(tournamentEloDelta(difference), delta);
assert.equal(tournamentEloDelta(-4,true),10);
assert.equal(tournamentEloDelta(2,true),20);
assert.throws(()=>tournamentEloDelta(NaN));
const inputBefore=structuredClone(tournament25Input);
const calc=calculateTournamentElo(tournament25Input);
assert.deepEqual(tournament25Input,inputBefore);
assert.deepEqual(calc.teams.map(t=>t.delta),[20,-40,0,20]);
for(const [i,expected] of [5.021635579553923,3.262770858274778,4.129281307067189,4.129281307067189].entries()) assert(Math.abs(calc.teams[i].expectedPoints-expected)<1e-10);
const fixtureContext=vm.createContext({});vm.runInContext(readFileSync(new URL('../matches.js',import.meta.url),'utf8').split('function positionCost')[0],fixtureContext);
const serviceName=n=>({Paolo:'Paolo (pac)',Alexandre:'Alexander'}[n]||n);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(currentMatch.teams)',fixtureContext)).map(t=>t.map(serviceName)),tournament25Input.teams.map(t=>t.players));
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(currentMatchStandings)',fixtureContext)).map(t=>[t.team,t.points]),[[1,7],[4,6],[3,4],[2,0]]);
for(const divisor of [0,-1,Infinity]) assert.throws(()=>calculateTournamentElo({...tournament25Input,divisor}));
const missing=structuredClone(tournament25Input);delete missing.ratings.Andre;assert.throws(()=>calculateTournamentElo(missing),/Missing or duplicate/);
const duplicate=structuredClone(tournament25Input);duplicate.teams[0].players.push('Andre');assert.throws(()=>calculateTournamentElo(duplicate),/Missing or duplicate/);
let data=new Map();
const storage={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),async transaction(fn){const before=structuredClone(data);try{return await fn(storage);}catch(e){data=before;throw e;}}};
async function start(enabled,Class=Rankings){let ready;const service=new Class({storage,blockConcurrencyWhile(fn){ready=fn();}},{APPLY_TOURNAMENT_20261025:String(enabled)});await ready;return service;}
await start(false);
for(const [i,rating] of Object.values(data.get('ratings')).entries()){rating.elo+=i+23;rating.calibrationDuels=i%11;}
data.set('revision',1900);data.set('vote:old',{winner:'Andre',loser:'Hay'});data.set('mvp:old',{votes:9});data.set('tournament:2026-10-18:placement',{adjustments:{Hay:40}});
const before=structuredClone(data.get('ratings'));
let service=await start(true);
const expected=structuredClone(before);
for(const [name,delta] of Object.entries(calc.adjustments)){expected[name].elo+=delta;expected[name].legendary ||= expected[name].elo>=1350;}
assert.deepEqual(data.get('ratings'),expected,'Apply frozen deltas to current scores, preserving counters and nonparticipants');
assert.equal(data.get('revision'),1901);
const saved=structuredClone(data.get('tournament:2026-10-25:placement'));
assert.deepEqual(saved.beforeRatings,before);assert.deepEqual(saved.afterRatings,expected);assert.deepEqual(saved.input,tournament25Input);
assert.deepEqual(saved.adjustments,calc.adjustments);assert.equal(Object.keys(saved.adjustments).length,28);assert.equal(saved.adjustments.AlexG,0);
assert.deepEqual(data.get('vote:old'),{winner:'Andre',loser:'Hay'});assert.deepEqual(data.get('mvp:old'),{votes:9});
assert.deepEqual((await (await service.fetch(new Request('https://test/ratings'))).json()).tournamentAdjustments,calc.adjustments);
assert.deepEqual(await (await service.fetch(new Request('https://test/tournament-placement?date=2026-10-25'))).json(),saved);
data.get('ratings').Andre.elo+=8;service=await start(true);assert.equal(data.get('ratings').Andre.elo,expected.Andre.elo+8);assert.equal(data.get('revision'),1901);assert.deepEqual(data.get('tournament:2026-10-25:placement'),saved);
// Missing live participant must roll back all preceding writes in the transaction.
data=new Map([['ratings',before],['revision',2000]]);
const invalid=source.replace('const calculation = calculateTournamentElo(tournament25Input);',"const calculation = calculateTournamentElo(tournament25Input); calculation.adjustments.MissingParticipant = 20;");
const invalidModule=await import('data:text/javascript;base64,'+Buffer.from(invalid).toString('base64'));
await assert.rejects(start(true,invalidModule.Rankings),/Missing tournament player/);
assert.deepEqual(data.get('ratings'),before);assert.equal(data.get('revision'),2000);assert.equal(data.has('tournament:2026-10-25:placement'),false);
console.log('Passed: expected points, exact band boundaries, champion minimum, frozen lineup alignment, input validation, current-score application, zero entries, atomic audit, latest endpoint, retries, preserved duels and rollback.');
