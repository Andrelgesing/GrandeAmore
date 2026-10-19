// Goals scored in the 11 October 2026 tournament. Names match the player roster.
const tournamentGoals = [
 ['Enil', 6], ['Daniel', 3],
 ['Andreeas', 2], ['Loay', 2], ['Mohamed', 2], ['Iacob', 2],
 ['gabi', 2], ['Nikita', 2], ['Ali', 2], ['Takunda', 2],
 ['Jack', 1], ['davideb', 1], ['fabian', 1]
];
const tournamentAssists = [
 ['Enil', 2], ['Nikita', 2], ['gabi', 2], ['Ali', 1], ['Daniel', 1],
 ['fabian', 3], ['Andreeas', 4], ['Loay', 5]
];
// Contributions from 18 October 2026.
const currentTournamentGoals = [
    ['Shahrom', 1], ['Nikita', 1], ['davideb', 1], ['Ali', 1],
    ['fabian', 1], ['Jack', 1], ['Chris', 1],
    ['Iacob', 3], ['Raul', 3], ['Andreeas', 3], ['David', 3],
    ['Ronaldo', 4], ['Loay', 4], ['gabi', 4], ['Mostafa', 2], ['Yahya', 5]
  ];
const currentTournamentAssists = [
    ['Mostafa', 1], ['Iacob', 1], ['davideb', 1], ['Chris', 1],
    ['Raul', 1], ['Andreeas', 1],
    ['Ronaldo', 2], ['Levi', 2], ['gabi', 2], ['Jack', 2], ['Shahrom', 2],
    ['Loay', 3], ['Nikita', 3], ['Yahya', 3]
  ];
function combinedContributions(...fixtures) {
 const totals = new Map();
 for (const entries of fixtures) for (const [name, count] of entries) totals.set(name, (totals.get(name) || 0) + count);
 return [...totals];
}
function renderContributions(selector, contributions, unit) {
 const list = document.querySelector(selector);
 list.replaceChildren();
 for (const [name, count] of [...contributions].sort((a, b) => b[1] - a[1])) {
  const player = players.find(player => player.name === name);
  const row = document.createElement('div');
  row.className = `goal-row player-card ${cardStyle(player)}`;
  const portrait = document.createElement('span'); portrait.className = 'goal-photo';
  if (player.photo) {
   const image = document.createElement('img'); image.src = player.photo; image.alt = ''; image.loading = 'lazy'; portrait.append(image);
  } else portrait.textContent = name.slice(0, 1).toUpperCase();
  const label = document.createElement('span'); label.className = 'goal-name'; label.textContent = name;
  const score = document.createElement('span'); score.className = 'goal-count'; score.textContent = `${count} ${unit}${count === 1 ? '' : 's'}`;
  row.append(portrait, label, score); list.append(row);
 }
}
function renderGoals() {
 renderContributions('#goals-list', combinedContributions(tournamentGoals, currentTournamentGoals), 'goal');
 renderContributions('#assists-list', combinedContributions(tournamentAssists, currentTournamentAssists), 'assist');
}
renderGoals();
document.addEventListener('ratings-updated', renderGoals);
