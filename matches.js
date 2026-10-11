// Sunday recommendations use the current ratings and a repeatable tie-break.
const sundayMatch = { date: '2026-10-11', unavailable: ['Shahrom'], squadOnly: ['Loay', 'Hay'] };
const matchRoles = ['ST', 'CM', 'CM', 'CB', 'CB', 'CB', 'GK'];

function positionCost(player, role) {
  const positions = player.position.split('/');
  if (positions[0] === role) return 0;
  if (positions[1] === role) return 1;
  // Keep every specialist goalkeeper in goal, on a separate team.
  if (positions.includes('GK')) return Infinity;
  if (positions.includes('CM')) return role === 'GK' ? (positions.includes('ST') ? 4 : 3) : 2;
  return role === 'GK' ? 6 : 4;
}

function recommendTeams(available) {
  if (available.length !== 28) throw new Error('Sunday requires 28 available players.');
  const slots = Array.from({ length: 4 }, (_, team) => matchRoles.map(role => ({ team, role }))).flat();
  const priority = { GK: 0, ST: 1, CB: 2, CM: 3 };
  const fillingOrder = slots.map((slot, index) => index).sort((a, b) => priority[slots[a].role] - priority[slots[b].role] || (a % 7) - (b % 7) || a - b);
  const compositionFits = assignment => [0, 1, 2, 3].every(team => {
    const members = assignment.slice(team * 7, team * 7 + 7);
    return members.filter(player => player.position.split('/').includes('CB')).length >= 2
      && members.filter(player => player.position.split('/')[0] === 'ST').length <= 1;
  });
  const strength = assignment => {
    const totals = [0, 0, 0, 0];
    assignment.forEach((player, index) => { totals[slots[index].team] += player.elo; });
    const mean = totals.reduce((sum, total) => sum + total, 0) / 4;
    return totals.reduce((sum, total) => sum + (total - mean) ** 2, 0);
  };
  let best;
  for (let attempt = 1; attempt <= 16; attempt++) {
    let seed = attempt * 11026;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const pool = [...available].sort((a, b) => a.rosterOrder - b.rosterOrder);
    const assignment = Array(28);
    for (const index of fillingOrder) {
      const candidates = pool.map(player => ({ player, cost: positionCost(player, slots[index].role), tie: random() }))
        .sort((a, b) => a.cost - b.cost || a.tie - b.tie);
      assignment[index] = candidates[0].player;
      pool.splice(pool.indexOf(assignment[index]), 1);
    }
    let cost = assignment.reduce((sum, player, index) => sum + positionCost(player, slots[index].role), 0);
    let balance = strength(assignment);
    // Improve position fit first, then minimize the spread of team Elo totals.
    for (let pass = 0; pass < 40; pass++) {
      let move = null;
      let nextCost = cost, nextBalance = balance;
      for (let a = 0; a < 28; a++) for (let b = a + 1; b < 28; b++) {
        const swappedCost = cost - positionCost(assignment[a], slots[a].role) - positionCost(assignment[b], slots[b].role)
          + positionCost(assignment[a], slots[b].role) + positionCost(assignment[b], slots[a].role);
        if (!Number.isFinite(swappedCost) || swappedCost > nextCost) continue;
        [assignment[a], assignment[b]] = [assignment[b], assignment[a]];
        const swappedBalance = compositionFits(assignment) ? strength(assignment) : Infinity;
        [assignment[a], assignment[b]] = [assignment[b], assignment[a]];
        if (!Number.isFinite(swappedBalance)) continue;
        if (swappedCost < nextCost || (swappedCost === nextCost && swappedBalance < nextBalance - 0.001)) {
          move = [a, b]; nextCost = swappedCost; nextBalance = swappedBalance;
        }
      }
      if (!move) break;
      const [a, b] = move;
      [assignment[a], assignment[b]] = [assignment[b], assignment[a]];
      cost = nextCost; balance = nextBalance;
    }
    if (!best || cost < best.cost || (cost === best.cost && balance < best.balance)) best = { assignment, cost, balance };
  }
  return Array.from({ length: 4 }, (_, team) => slots.flatMap((slot, index) => slot.team === team ? [{ player: best.assignment[index], role: slot.role }] : []));
}

function matchPlayer({ player, role }) {
  const item = document.createElement('div');
  item.className = 'pitch-player';
  const portrait = document.createElement('div');
  portrait.className = 'match-portrait';
  if (player.photo) {
    const image = document.createElement('img');
    image.src = player.photo; image.alt = player.name; image.loading = 'lazy';
    portrait.append(image);
  } else {
    portrait.textContent = Array.from(player.name.replace(/^@/, ''))[0].toUpperCase();
    portrait.setAttribute('aria-label', `${player.name}: photo coming soon`);
  }
  const name = document.createElement('span');
  name.className = 'match-player-name'; name.textContent = player.name;
  const position = document.createElement('span');
  position.className = 'match-position';
  const covering = !player.position.split('/').includes(role);
  position.textContent = covering ? `${role} · covering (${player.position})` : role;
  item.append(portrait, name, stars(player.rating), position);
  return item;
}

let matchFingerprint = '';
function renderMatches() {
  const available = players.filter(player => !sundayMatch.unavailable.includes(player.name) && !sundayMatch.squadOnly.includes(player.name));
  const fingerprint = JSON.stringify(available.map(player => [player.name, player.elo, player.rating, player.photo]));
  if (fingerprint === matchFingerprint) return;
  matchFingerprint = fingerprint;
  const teams = recommendTeams(available);
  const grid = document.querySelector('#match-teams');
  grid.replaceChildren();
  teams.forEach((team, index) => {
    const averageStars = team.reduce((sum, entry) => sum + entry.player.rating, 0) / team.length;
    const averageElo = team.reduce((sum, entry) => sum + entry.player.elo, 0) / team.length;
    const card = document.createElement('article');
    card.className = `match-team match-team-${index + 1}`;
    const heading = document.createElement('div'); heading.className = 'match-team-heading';
    const name = document.createElement('h2'); name.id = `match-team-${index + 1}`; name.textContent = `Team ${index + 1}`;
    const average = document.createElement('div'); average.className = 'match-average';
    const value = document.createElement('strong'); value.textContent = `${averageStars.toFixed(2)} / 5`;
    const label = document.createElement('span'); label.textContent = `Average stars · ${averageElo.toFixed(1)} Elo`;
    average.append(stars(Math.round(averageStars * 2) / 2), value, label);
    heading.append(name, average);
    const pitch = document.createElement('div'); pitch.className = 'match-pitch';
    pitch.setAttribute('aria-labelledby', name.id);
    const center = document.createElement('div'); center.className = 'pitch-center'; center.setAttribute('aria-hidden', 'true');
    pitch.append(center);
    for (const role of ['ST', 'CM', 'CB', 'GK']) {
      const row = document.createElement('div'); row.className = `pitch-row pitch-row-${role.toLowerCase()}`;
      team.filter(entry => entry.role === role).forEach(entry => row.append(matchPlayer(entry)));
      pitch.append(row);
    }
    card.append(heading, pitch); grid.append(card);
  });
}
document.addEventListener('ratings-updated', renderMatches);
renderMatches();
