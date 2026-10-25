const arenas = ['neon-city', 'sunset-rooftop', 'mountain-temple', 'moonlit-docks'];
const duelPlayers = players.filter(player => player.name !== '@~❄️' && !substituteNames.has(player.name));
const arena = document.querySelector('#fight-arena');
const options = document.querySelector('#fight-options');
const skipFight = document.querySelector('#fight-skip');
const selection = document.querySelector('#fight-selection');
const fightConfirmDialog = document.querySelector('#fight-confirm-dialog');
const fightConfirmText = document.querySelector('#fight-confirm-text');
let voteAttempted = false;
// File previews keep votes local; the published site uses the shared ratings service.
const fightApi = location.protocol === 'file:' ? '' : RATINGS_API;
let pair = [];
let selected = null;
let submitted = false;
let voteId;
let saving = false;
let sharedReady = !fightApi;
let previousPair = '';
let previousArena = -1;
function chooseDuel(pool, previous = '', random = Math.random) {
  if (pool.length < 2) throw new Error('A duel needs at least two players.');
  // Choose the mode once, so rejecting an immediate repeat preserves 70/30.
  const previousPlayers = new Set(previous ? previous.split(':').map(Number) : []);
  let eligible = pool.map((_, index) => index).filter(index => !previousPlayers.has(index) || (pool[index].calibrationDuels ?? 10) >= 10);
  // With fewer than two available players, consecutive appearances are unavoidable.
  if (eligible.length < 2) eligible = pool.map((_, index) => index);
  const newcomers = eligible.filter(index => (pool[index].calibrationDuels ?? 10) < 10);
  const featureNewcomer = newcomers.length > 0 && random() < 0.60;
  const preferSimilar = random() < 0.7;
  let first, second, key;
  do {
    first = featureNewcomer ? newcomers[Math.floor(random() * newcomers.length)] : eligible[Math.floor(random() * eligible.length)];
    if (preferSimilar) {
      const candidates = eligible.flatMap(index => index === first ? [] : [{
        index, weight: 1 / (1 + Math.abs(pool[index].elo - pool[first].elo) / 200) ** 2
      }]);
      let draw = random() * candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
      second = candidates[candidates.length - 1].index;
      for (const candidate of candidates) {
        draw -= candidate.weight;
        if (draw < 0) { second = candidate.index; break; }
      }
    } else {
      const opponents = eligible.filter(index => index !== first);
      second = opponents[Math.floor(random() * opponents.length)];
    }
    key = [first, second].sort((a, b) => a - b).join(':');
  } while (pool.length > 2 && key === previous);
  return [first, second];
}
function nextFight() {
  voteId = crypto.randomUUID();
  selected = null;
  voteAttempted = false;
  submitted = false;
  skipFight.disabled = false;
  selection.textContent = 'Choose your fighter.';
  const [first, second] = chooseDuel(duelPlayers, previousPair);
  pair = [duelPlayers[first], duelPlayers[second]];
  previousPair = [first, second].sort((a, b) => a - b).join(':');
  const arenaIndex = (previousArena + 1 + Math.floor(Math.random() * 3)) % arenas.length;
  previousArena = arenaIndex;
  arena.style.backgroundImage = `url('arenas/${arenas[arenaIndex]}.svg')`;
  options.replaceChildren();
  pair.forEach((player, index) => {
    if (index) {
      const vs = document.createElement('span');
      vs.className = 'versus';
      vs.textContent = 'VS';
      options.append(vs);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fighter';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Vote for ${player.name}`);
    button.disabled = !sharedReady;
    const portrait = document.createElement('div');
    portrait.className = 'portrait';
    if (player.photo) {
      const image = document.createElement('img');
      image.src = player.photo;
      image.alt = player.name;
      portrait.append(image);
    } else {
      portrait.textContent = Array.from(player.name.replace(/^@/, ''))[0].toUpperCase();
    }
    const name = document.createElement('span');
    name.className = 'fighter-name';
    name.textContent = player.name;
    const reveal = document.createElement('div');
    reveal.className = 'fighter-reveal';
    reveal.append(portrait, name);
    button.append(reveal);
    button.addEventListener('click', () => submitFight(index));
    options.append(button);
  });
}
function calibrationK(player) {
  const count = player.calibrationDuels ?? 10;
  return count < 3 ? 64 : count < 10 ? 32 : 16;
}
function eloPoints(winner, loser, k = 16) {
  const expected = 1 / (1 + 10 ** ((loser - winner) / 400));
  return Math.round(k * (1 - expected));
}
let sharedRevision = -1;
function applyShared(data) {
 if (data.revision < sharedRevision) return;
 sharedRevision = data.revision;
 if (data.tournamentAdjustments) tournamentEloAdjustments = displayPlayerRecords(data.tournamentAdjustments);
 applyRatings(data.ratings);
}
function applyRatings(updates) {
 updates = displayPlayerRecords(updates);
 ratingState = updates;
 for (const player of players) {
  if (!updates[player.name]) continue;
  player.elo = updates[player.name].elo;
  player.calibrationDuels = updates[player.name].calibrationDuels ?? 10;
  player.rating = starsFromElo(player.elo);
  player.status = updates[player.name].legendary ? 'Legendary' : null;
 }
 renderPlayerGrid(); renderMvp();
}
let syncing = false;
async function refreshRatings() {
 if (!fightApi || syncing || saving) return;
 syncing = true;
 try {
  const response = await fetch(fightApi + '/ratings', { cache: 'no-store' });
  if (!response.ok) throw new Error();
  const firstLoad = !sharedReady;
  applyShared(await response.json());
  sharedReady = true;
  if (firstLoad && selected === null && !submitted) nextFight();

 } catch (_) { if (!sharedReady) selection.textContent = 'Connecting to ratings. Please try again shortly.'; }
 finally { syncing = false; }
}
fightConfirmDialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
async function submitFight(index) {
 if (index !== 0 && index !== 1) return;
 if (submitted || saving || !sharedReady || (voteAttempted && selected !== index)) return;
 selected = index;
 voteAttempted = true;
 const savingStartedAt = performance.now();
 saving = true; skipFight.disabled = true;
 fightConfirmText.textContent = 'Saving your vote…';
 if (!fightConfirmDialog.open) fightConfirmDialog.showModal();
 options.querySelectorAll('button').forEach((button, i) => { button.disabled = true; button.setAttribute('aria-pressed', String(i === index)); });
 selection.textContent = 'Saving your vote…';
 const winner = pair[selected], loser = pair[1 - selected];
 try {
  if (fightApi) {
   const response = await fetch(fightApi + '/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: voteId, winner: servicePlayerName(winner.name), loser: servicePlayerName(loser.name) }) });
   if (!response.ok) throw new Error();
   applyShared(await response.json());
  } else {
   const winnerPoints = eloPoints(winner.elo, loser.elo, calibrationK(winner));
   const loserPoints = eloPoints(winner.elo, loser.elo, calibrationK(loser));
   const updates = { ...ratingState };
   for (const [player, delta] of [[winner, winnerPoints], [loser, -loserPoints]]) {
    const elo = player.elo + delta;
    updates[player.name] = { elo, legendary: player.status === 'Legendary' || starsFromElo(elo) === 5, calibrationDuels: Math.min(10, (player.calibrationDuels ?? 10) + 1) };
   }
   localStorage.setItem('grande-amore-ratings', JSON.stringify(updates));
   applyRatings(updates);
  }
  submitted = true;
  const remaining = 200 - (performance.now() - savingStartedAt);
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  fightConfirmDialog.close();

 } catch (_) {
  fightConfirmDialog.close();
  selection.textContent = 'Your vote could not be saved. Retry your choice, or Next to skip.';
  options.querySelectorAll('button').forEach((button, i) => { button.disabled = i !== selected; });
 } finally {
  saving = false; skipFight.disabled = false;
  if (submitted) nextFight();
 }
}
skipFight.addEventListener('click', () => {
  if (saving || submitted) return;
  nextFight();
});
refreshRatings();
setInterval(() => { if (!document.hidden) refreshRatings(); }, 30000);
window.addEventListener('hashchange', refreshRatings);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRatings(); });
if (!fightApi && !(typeof placementPreview !== 'undefined' && placementPreview)) {
 try { applyRatings(JSON.parse(localStorage.getItem('grande-amore-ratings') || '{}')); } catch (_) {}
}
nextFight();
