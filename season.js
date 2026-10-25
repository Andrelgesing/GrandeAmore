// Season entries reuse the approved lineups, team points and Stats contributions.
const seasonFixtures = [{
  date: sundayMatch.date,
  teams: sundayMatch.teams,
  standings: matchStandings,
  goals: tournamentGoals,
  assists: tournamentAssists,
  matchesPlayed: 3
}, {
  date: october18Match.date,
  teams: october18Match.teams,
  standings: october18Standings,
  goals: currentTournamentGoals,
  assists: currentTournamentAssists,
  matchesPlayed: 3
}];

function buildSeasonStandings(fixtures, rosterPlayers) {
  const totals = new Map();
  const byName = new Map(rosterPlayers.map(player => [player.name, player]));
  for (const fixture of fixtures) {
    const goals = new Map(fixture.goals);
    const assists = new Map(fixture.assists);
    for (const standing of fixture.standings) {
      for (const name of fixture.teams[standing.team - 1]) {
        const player = byName.get(name);
        if (!player) throw new Error(`Missing season player: ${name}`);
        if (!totals.has(name)) totals.set(name, { player, points: 0, goals: 0, assists: 0, mp: 0 });
        const total = totals.get(name);
        total.points += standing.points;
        total.goals += goals.get(name) || 0;
        total.assists += assists.get(name) || 0;
        total.mp += fixture.matchesPlayed;
      }
    }
  }
  return [...totals.values()].sort((a, b) => b.points - a.points || b.goals - a.goals || b.assists - a.assists || a.player.rosterOrder - b.player.rosterOrder);
}

function renderSeason() {
  const standings = buildSeasonStandings(seasonFixtures, players);
  const list = document.querySelector('#season-list');
  list.replaceChildren();
  let previous;
  let rank = 0;
  standings.forEach((entry, index) => {
    if (!previous || entry.points !== previous.points || entry.goals !== previous.goals || entry.assists !== previous.assists) rank = index + 1;
    previous = entry;
    const row = document.createElement('tr');
    const rankCell = document.createElement('td'); rankCell.textContent = rank;
    const nameCell = document.createElement('td');
    const identity = document.createElement('button'); identity.type = 'button'; identity.className = 'season-player';
    identity.setAttribute('aria-label', `Open ${entry.player.name}'s player card`);
    identity.addEventListener('click', () => openPlayerCard(entry.player));
    const portrait = document.createElement('span'); portrait.className = 'mvp-photo'; portrait.setAttribute('aria-hidden', 'true');
    if (entry.player.photo) {
      const image = document.createElement('img'); image.src = entry.player.photo; image.alt = ''; image.loading = 'lazy'; portrait.append(image);
    } else portrait.textContent = Array.from(entry.player.name.replace(/^@/, ''))[0].toUpperCase();
    const label = document.createElement('span'); label.textContent = entry.player.name;
    identity.append(portrait, label); nameCell.append(identity);
    row.append(rankCell, nameCell);
    for (const value of [entry.points, entry.goals, entry.assists, entry.mp]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    list.append(row);
  });
}
renderSeason();
