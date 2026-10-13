const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'fight.js'), 'utf8');
const choose = vm.runInNewContext('function chooseDuel' + source.split('function chooseDuel')[1].split('function nextFight')[0] + '\nchooseDuel;');
const pool = [{ name: 'A', elo: 1000 }, { name: 'B', elo: 1000 }, { name: 'C', elo: 1200 }, { name: 'Shahrom', elo: 1600 }];
const original = JSON.stringify(pool);
const sequence = values => { let index = 0; return () => { assert(index < values.length, 'Unexpected random draw'); return values[index++]; }; };

// The 30% branch is uniform, including distant opponents.
assert.deepEqual(Array.from(choose(pool, '', sequence([0.7, 0, 0.99]))), [0, 3]);
// The 70% branch favors the equal-rated opponent but allows distant players.
assert.deepEqual(Array.from(choose(pool, '', sequence([0.69, 0, 0.6]))), [0, 1]);
assert.deepEqual(Array.from(choose(pool, '', sequence([0, 0, 0.999]))), [0, 3]);
// Reject both orders of the previous pair, keeping the initially chosen mode.
assert.deepEqual(Array.from(choose(pool, '0:1', sequence([0.9, 0.3, 0, 0, 0.5]))), [0, 2]);
assert.deepEqual(Array.from(choose(pool, '0:1', sequence([0, 0, 0, 0, 0.99]))), [0, 3]);
assert.equal(choose(pool.slice(0, 2), '0:1', sequence([0.9, 0, 0])).length, 2);
assert.throws(() => choose(pool.slice(0, 1)));

let seed = 20261010;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const counts = [0, 0, 0, 0];
let last = '', randomGap = 0, weightedGap = 0, mixedGap = 0, weightedModes = 0;
const samples = 30000;
for (let index = 0; index < samples; index++) {
  const [a, b] = choose(pool, last, random);
  assert.notEqual(a, b);
  const key = [a, b].sort((x, y) => x - y).join(':');
  assert.notEqual(key, last); last = key;
  counts[a]++; counts[b]++;
  // Force each mode to compare the Elo distance of its selected opponents.
  const runMode = mode => {
    let firstDraw = true;
    return choose(pool, '', () => { if (firstDraw) { firstDraw = false; return mode; } return random(); });
  };
  const [r1, r2] = runMode(0.9), [w1, w2] = runMode(0);
  randomGap += Math.abs(pool[r1].elo - pool[r2].elo);
  weightedGap += Math.abs(pool[w1].elo - pool[w2].elo);
  let modeDraw = true;
  const [m1, m2] = choose(pool, '', () => {
    const value = random();
    if (modeDraw) { weightedModes += Number(value < 0.7); modeDraw = false; }
    return value;
  });
  mixedGap += Math.abs(pool[m1].elo - pool[m2].elo);
}
assert(counts.every(count => count > 0), 'Every player, including Shahrom, must remain eligible');
assert(weightedGap < mixedGap && mixedGap < randomGap);
assert(Math.abs(weightedModes / samples - 0.7) < 0.01);
assert.equal(JSON.stringify(pool), original, 'Pairing must not mutate Elo');
console.log('Passed: 70/30 mix, closer Elo bias, distant opponents, no self-pairings or immediate repeats, Shahrom eligibility, and unchanged ratings.');
console.log(`Average Elo gaps: random ${(randomGap / samples).toFixed(1)}, weighted ${(weightedGap / samples).toFixed(1)}, mixed ${(mixedGap / samples).toFixed(1)}.`);

// The dedicated newcomer branch shares a 20% chance across all newcomers.
const newcomers = [{name:'NewA',elo:1000,calibrationDuels:0}, {name:'NewB',elo:1100,calibrationDuels:9}, {name:'OldA',elo:1200}, {name:'OldB',elo:1000,calibrationDuels:10}];
let featured = 0; const newCounts = [0,0]; last = '';
for (let i=0; i<samples; i++) {
 let initial = true, dedicated = false;
 const [a,b] = choose(newcomers,last,() => {const value=random(); if(initial) {initial=false; dedicated=value<.2;} return value;});
 if(dedicated) {featured++; assert(a<2); newCounts[a]++;}
 assert.notEqual(a,b); const key=[a,b].sort((x,y)=>x-y).join(':'); assert.notEqual(key,last); last=key;
}
assert(Math.abs(featured/samples-.2)<.01);
assert(Math.abs(newCounts[0]/featured-.5)<.02);
const graduated = newcomers.map(p=>({...p,calibrationDuels:10}));
assert.deepEqual(Array.from(choose(graduated,'',sequence([.9,0,.99]))),[0,3], 'Graduates use original selection without extra newcomer draw');
console.log('Passed: 20% shared newcomer allocation, uniform newcomer selection, no immediate repeats and graduation.');
