const arenas = ['neon-city', 'sunset-rooftop', 'mountain-temple', 'moonlit-docks'];
const arena = document.querySelector('#fight-arena');
const options = document.querySelector('#fight-options');
const confirmFight = document.querySelector('#fight-confirm');
const skipFight = document.querySelector('#fight-skip');
const selection = document.querySelector('#fight-selection');
const resultDialog = document.querySelector('#fight-result');
let pair = [];
let selected = null;
let submitted = false;
let voteId;
let saving = false;
let sharedReady = !RATINGS_API;
let previousPair = '';
let previousArena = -1;
function chooseDuel(pool, previous = '', random = Math.random) {
  if (pool.length < 2) throw new Error('A duel needs at least two players.');
  // Choose the mode once, so rejecting an immediate repeat preserves 70/30.
  const preferSimilar = random() < 0.7;
  let first, second, key;
  do {
    first = Math.floor(random() * pool.length);
    if (preferSimilar) {
      const candidates = pool.flatMap((player, index) => index === first ? [] : [{
        index, weight: 1 / (1 + Math.abs(player.elo - pool[first].elo) / 200) ** 2
      }]);
      let draw = random() * candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
      second = candidates[candidates.length - 1].index;
      for (const candidate of candidates) {
        draw -= candidate.weight;
        if (draw < 0) { second = candidate.index; break; }
      }
    } else {
      second = Math.floor(random() * (pool.length - 1));
      if (second >= first) second++;
    }
    key = [first, second].sort((a, b) => a - b).join(':');
  } while (pool.length > 2 && key === previous);
  return [first, second];
}
function nextFight() {
  voteId = crypto.randomUUID();
  selected = null;
  submitted = false;
  confirmFight.disabled = true;
  skipFight.disabled = false;
  selection.textContent = 'Choose your fighter.';
  const [first, second] = chooseDuel(players, previousPair);
  pair = [players[first], players[second]];
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
    button.setAttribute('aria-label', `Select ${player.name}`);
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
    button.append(portrait, name);
    button.addEventListener('click', () => {
      if (submitted || saving) return;
      selected = index;
      options.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      selection.textContent = `${player.name} selected. Confirm your choice below.`;
      confirmFight.disabled = !sharedReady;
    });
    options.append(button);
  });
}
function eloPoints(winner, loser) {
  const expected = 1 / (1 + 10 ** ((loser - winner) / 400));
  return Math.round(32 * (1 - expected));
}
let sharedRevision = -1;
function applyShared(data) {
 if (data.revision < sharedRevision) return;
 sharedRevision = data.revision;
 applyRatings(data.ratings);
}
function applyRatings(updates) {
 ratingState = updates;
 for (const player of players) {
  if (!updates[player.name]) continue;
  player.elo = updates[player.name].elo;
  player.rating = starsFromElo(player.elo);
  player.status = updates[player.name].legendary ? 'Legendary' : null;
 }
 renderPlayerGrid(); renderMvp();
}
let syncing = false;
async function refreshRatings() {
 if (!RATINGS_API || syncing || saving) return;
 syncing = true;
 try {
  const response = await fetch(RATINGS_API + '/ratings', { cache: 'no-store' });
  if (!response.ok) throw new Error();
  const firstLoad = !sharedReady;
  applyShared(await response.json());
  sharedReady = true;
  if (firstLoad && selected === null && !submitted) nextFight();
  if (selected !== null && !submitted) confirmFight.disabled = false;
 } catch (_) { if (!sharedReady) selection.textContent = 'Connecting to ratings. Please try again shortly.'; }
 finally { syncing = false; }
}
confirmFight.addEventListener('click', async () => {
 if (selected === null || submitted || saving || !sharedReady) return;
 saving = true; confirmFight.disabled = true; skipFight.disabled = true;
 const winner = pair[selected], loser = pair[1 - selected];
 try {
  if (RATINGS_API) {
   const response = await fetch(RATINGS_API + '/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: voteId, winner: winner.name, loser: loser.name }) });
   if (!response.ok) throw new Error();
   applyShared(await response.json());
  } else {
   const points = eloPoints(winner.elo, loser.elo);
   const updates = { ...ratingState };
   for (const [player, delta] of [[winner, points], [loser, -points]]) {
    const elo = player.elo + delta;
    updates[player.name] = { elo, legendary: player.status === 'Legendary' || starsFromElo(elo) === 5 };
   }
   localStorage.setItem('grande-amore-ratings', JSON.stringify(updates));
   applyRatings(updates);
  }
  submitted = true;
  document.querySelector('#fight-result-text').textContent = `You picked ${winner.name}. Your choice has been submitted!`;
  resultDialog.showModal();
 } catch (_) {
  selection.textContent = 'Your choice could not be saved. Please try again.';
  confirmFight.disabled = false;
 } finally { saving = false; skipFight.disabled = submitted; }
});
skipFight.addEventListener('click', () => {
  if (saving || submitted) return;
  nextFight();
});
refreshRatings();
setInterval(() => { if (!document.hidden) refreshRatings(); }, 30000);
window.addEventListener('hashchange', refreshRatings);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRatings(); });
document.querySelector('#fight-next').addEventListener('click', () => resultDialog.close());
resultDialog.addEventListener('close', () => {
  nextFight();
  options.querySelector('button').focus();
});
window.addEventListener('hashchange', () => { if (resultDialog.open) resultDialog.close(); });
nextFight();
