// Elo is the underlying score. Stars are rounded to the nearest half star.
const rawStars = elo => Math.max(1, Math.min(5, (elo - 400) / 200));
const starsFromElo = elo => Math.round(rawStars(elo) * 2) / 2;
// Add a photo path to a player when photos are available.
const roster = [
  ['AlexG', 'GK', 1200, 'players/alexg.jpg'], ['Andre', 'GK', 1200, 'players/andre.jpg'], ['Darius', 'CB', 1000],
  ['fabian', 'CM', 1000, 'players/fabian.jpg'], ['Enil', 'CM', 1200, 'players/enil.jpg'], ['gabi', 'CM', 1000, 'players/gabi.jpg'],
  ['Daniel', 'CM/ST', 1200, 'players/daniel.jpg'], ['Levi', 'CM', 1000, 'players/levi.jpg'], ['Samu', 'ST/CM', 1000, 'players/samu.jpg'],
  ['Dejan', 'CB', 1000], ['Jack', 'CB', 1000, 'players/jack.jpg'], ['Ali', 'ST/CB', 1000, 'players/ali.jpg'],
  ['Omar', 'CM', 1000, 'players/omar.jpg'], ['Baraa', 'CB', 1000, 'players/baraa.jpg'], ['Takunda', 'CB', 1000],
  ['Danilo', 'CB', 1000, 'players/danilo.jpg'], ['Andreeas', 'CM', 1000], ['davideb', 'CM', 1000, 'players/davideb.jpg'],
  ['Nikita', 'CB', 1000, 'players/nikita.jpg'], ['Iacob', 'CM', 1000], ['Damien', 'CB', 1000, 'players/damien.jpg'],
  ['Valentin', 'CM', 1000], ['Milan', 'CM', 1000, 'players/Milan.jpeg'], ['Mohamed', 'CB', 1000, 'players/mohamed.jpg'],
  ['Paolo', 'CB', 1000, 'players/paolo.jpg'], ['Fabien', 'CM', 1000, 'players/fabien_v.jpg'],
  ['Lucas', 'ST/CM', 1200, 'players/lucas.jpg'], ['@~❄️', 'ST', 1000, 'players/snow.jpg'],
  ['Shahrom', 'ST', 1000, 'players/shahrom.jpg', 'Legendary'],
  ['Loay', 'CM/ST', 1100, 'players/loay.jpg'], ['Hay', 'ST/CM', 1000, 'players/hay.jpg'],
  ['Giorgios', 'CB', 1100, 'players/giorgios.jpg', 'Legendary'],
  ['Manuel', 'CM', 1100, 'players/manuel.jpg'],
  ['Momo', 'CM', 1000, 'players/momo.jpg'],
  ['Alexandre', 'CB/CM', 1100, 'players/alexander.jpg'],
  ['Mostafa', 'CB', 1100, 'players/mostafa.jpg'],
  ['Johny', 'CB', 1000, 'players/johny.jpg'],
  ['Ronaldo', 'ST', 900, 'players/ronaldo_2.jpg'],
  ['Leandro', 'CM', 1000, 'players/leandro-cropped.jpg'],
  ['Chris', 'CB', 1000], ['Marco', 'CB', 1000], ['Martin', 'CB', 1000],
  ['David', 'CM', 1000], ['Yahya', 'CM', 1000], ['Vasilis', 'ST', 1000],
  ['Raul', 'CM/ST', 1200],
  ['Inca', 'CM', 1200, 'players/inca.jpg', 'Legendary', 'The last dance'],
  ['Carlo', 'CM', 1000, 'players/carlo.jpg'],
  ['Leo', 'CB', 1000, 'players/leo.jpg'],
  ['Obaida', 'ST', 1000], ['Ahmad', 'ST', 1000], ['Mauro', 'CM', 1000],
  ['3rd GK', 'GK', 1100],
  ['Steve Alex', 'CM/CB', 800]
];
let ratingState = {};
try { if (!RATINGS_API) ratingState = JSON.parse(localStorage.getItem('grande-amore-ratings') || '{}') || {}; } catch (_) {}
if (typeof placementPreview !== 'undefined' && placementPreview) ratingState = placementPreview.ratings;
// Keep the existing service identity so the shorter name preserves ratings and votes.
const servicePlayerName = name => name === 'Fabien' ? '@Fabien Vjaceslavs' : name === 'Paolo' ? 'Paolo (pac)' : name === 'Alexandre' ? 'Alexander' : name;
const displayPlayerName = name => name === '@Fabien Vjaceslavs' ? 'Fabien' : name === 'Paolo (pac)' ? 'Paolo' : name === 'Alexander' ? 'Alexandre' : name;
const displayPlayerRecords = records => Object.fromEntries(Object.entries(records).map(([name, value]) => [displayPlayerName(name), value]));
ratingState = displayPlayerRecords(ratingState);
const jokes = ['Post-match pizza instinct', 'Celebration choreography', 'VAR negotiation skills', 'Excuse creativity', 'Dressing-room DJ skills', 'Monday morning soreness', 'Nutmeg ambition', 'Touchline banter', 'Last-minute boot search', 'Offside appeal volume', 'Striker pocket capacity', 'Sliding tackle laundry bill'];
const customJokeStats = {
  Inca: [
    { label: 'Tango', rating: 3 },
    { label: 'Salsa', rating: 2 },
    { label: 'Wiener Walzer', rating: 5 }
  ],
  Leandro: [
    { label: 'Chasing sticks', rating: 4 },
    { label: 'Who is a good boy?', rating: 5 }
  ],
  Ronaldo: [
    { label: 'Shooting', rating: 5 },
    { label: 'Shooting', rating: 5 },
    { label: 'Shooting', rating: 5 }
  ],
  Alexandre: [
    { label: 'Uphill', rating: 2 },
    { label: 'Downhill', rating: 4 }
  ],
  Manuel: [
    { label: 'Form with Shahrom', rating: 2 },
    { label: 'Against Shahrom', rating: 5 }
  ],
  Momo: [
    { label: 'Laser hunting', rating: 5 },
    { label: 'Midnight Zoomies', rating: 5 }
  ],
  AlexG: [
    { label: 'Lifting trophy', rating: 2 },
    { label: "Lifting G'mischtes", rating: 5 }
  ],
  Danilo: [
    { label: 'Juji Gatame', rating: 4 },
    { label: 'Hadaka Jime', rating: 5 },
    { label: 'Yoko Shiho Gatame', rating: 2 }
  ],
  Giorgios: [
    { label: 'Ball control', rating: 5 },
    { label: 'Running', rating: 0.5 },
    { label: 'Walking', rating: 5 }
  ],
  Enil: [
    { label: 'Left foot', rating: 5 },
    { label: 'Right foot', rating: 0.5 },
    { label: 'Form when drunk', rating: 5 },
    { label: 'Form when hangover', rating: 2 }
  ],
  Shahrom: [
    { label: 'Why always me?', rating: 5 },
    { label: '85 minutes form', rating: 2 },
    { label: 'Last 5 minutes form', rating: 5 }
  ]
};
const players = roster.map(([name, position, elo, photo = null, status = null, title = null], index) => ({
  calibrationDuels: ratingState[name]?.calibrationDuels ?? 10,
  name, title, position, primaryPosition: position.split('/')[0], secondaryPosition: position.split('/')[1] || null,
  elo: Number.isFinite(ratingState[name]?.elo) ? ratingState[name].elo : elo, rating: starsFromElo(Number.isFinite(ratingState[name]?.elo) ? ratingState[name].elo : elo), photo,
  status: ratingState[name]?.legendary || starsFromElo(Number.isFinite(ratingState[name]?.elo) ? ratingState[name].elo : elo) === 5 ? 'Legendary' : status, rosterOrder: index,
  // Stable playful scores, chosen randomly once per page load.
  stats: customJokeStats[name] || [0, 1].map(offset => ({ label: jokes[(index * 2 + offset) % jokes.length], rating: 1 + Math.floor(Math.random() * 5) }))
})).sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)));
const grid = document.querySelector('#player-grid');
const photoPlayers = players.filter(player => player.photo);
for (let i = photoPlayers.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [photoPlayers[i], photoPlayers[j]] = [photoPlayers[j], photoPlayers[i]];
}
for (const player of photoPlayers.slice(0, 2)) {
  const image = document.createElement('img');
  image.src = player.photo;
  image.alt = player.name;
  document.querySelector('#home-player-photos').append(image);
}
const dialog = document.querySelector('#player-dialog');
const detail = document.querySelector('#player-detail');
document.querySelector('#squad-summary').textContent = `${players.length} players. One team.`;
const tier = rating => rating >= 3.75 ? 'gold' : rating >= 2.5 ? 'silver' : 'bronze';
const cardStyle = player => player.status === 'Legendary' ? 'legendary' : tier(rawStars(player.elo));
function stars(rating) {
  const span = document.createElement('span');
  span.className = 'stars';
  span.setAttribute('aria-label', `${rating} out of 5 stars`);
  for (let i = 0; i < 5; i++) {
    const star = document.createElement('span');
    star.className = rating >= i + 1 ? 'star full' : rating >= i + 0.5 ? 'star half' : 'star';
    star.textContent = '☆';
    star.setAttribute('aria-hidden', 'true');
    span.append(star);
  }
  return span;
}
function cardContent(player, full = false) {
  const fragment = document.createDocumentFragment();
  const position = document.createElement('span');
  position.className = 'position';
  position.textContent = player.secondaryPosition ? `${player.primaryPosition} · preferred` : player.primaryPosition;
  if (player.secondaryPosition) {
    const secondary = document.createElement('span');
    secondary.className = 'secondary-position';
    secondary.textContent = `${player.secondaryPosition} · secondary`;
    position.append(secondary);
  }
  const portrait = document.createElement('div');
  portrait.className = 'portrait';
  if (player.photo) {
    const image = document.createElement('img');
    image.src = player.photo;
    image.alt = player.name;
    image.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
    portrait.append(image);
  } else {
    portrait.textContent = player.name.replace(/^@/, '').split(/\s+/).map(word => Array.from(word)[0]).slice(0, 2).join('').toUpperCase();
    portrait.setAttribute('aria-label', 'Photo coming soon');
  }
  const name = document.createElement(full ? 'h2' : 'span');
  name.className = 'player-name';
  name.textContent = player.name;
  if (full) name.id = 'detail-name';
  fragment.append(position, portrait, name);
  if (player.title) {
    const title = document.createElement('span');
    title.className = 'player-title';
    title.textContent = player.title;
    fragment.append(title);
  }
  fragment.append(stars(player.rating));
  if (player.status) {
    const status = document.createElement('span');
    status.className = 'legendary-badge';
    status.textContent = `✦ ${player.status}`;
    fragment.append(status);
  }
  if (full) {
    const stats = document.createElement('div');
    stats.className = 'fun-stats';
    for (const stat of player.stats) {
      const row = document.createElement('div');
      row.className = 'stat';
      const label = document.createElement('span');
      label.textContent = stat.label;
      row.append(label, stars(stat.rating));
      stats.append(row);
    }
    const note = document.createElement('p');
    note.className = 'small-note';
    note.textContent = 'These stats do not affect the player rating.';
    fragment.append(stats, note);
  }
  return fragment;
}
function openPlayerCard(player) {
    const full = document.createElement('div');
    full.className = `player-card ${cardStyle(player)}`;
    const close = document.createElement('button');
    close.className = 'close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close player card');
    close.addEventListener('click', () => dialog.close());
    full.append(close, cardContent(player, true));
    detail.replaceChildren(full);
    document.body.classList.add('modal-open');
    dialog.showModal();
}
function renderPlayerGrid() {
 grid.replaceChildren();
for (const player of players) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `player-card ${cardStyle(player)}`;
  button.setAttribute('aria-label', `View ${player.name}, ${player.position}, ${player.rating} out of 5 stars${player.status ? ', ' + player.status : ''}`);
  button.setAttribute('aria-haspopup', 'dialog');
  button.append(cardContent(player));
  button.addEventListener('click', () => openPlayerCard(player));
  grid.append(button);
}
}
renderPlayerGrid();
dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});
// Until match results are available, MVP standings use the current ratings.
let rankedPlayers;
const mvpList = document.querySelector('#mvp-list');
const showingPlacementPreview = typeof placementPreview !== 'undefined' && Boolean(placementPreview);
let tournamentEloAdjustments = showingPlacementPreview ? placementPreview.adjustments : {};
let mvpLimit = 10;
const mvpToggle = document.querySelector('#mvp-toggle');
function renderMvp() {
  rankedPlayers = [...players].sort((a, b) => b.elo - a.elo || a.rosterOrder - b.rosterOrder);
  mvpList.replaceChildren();
  document.querySelector('#mvp-title').textContent = `Grande Amore top ${mvpLimit}`;
  mvpToggle.textContent = mvpLimit === 10 ? 'Show top 20' : 'Show top 10';
  mvpToggle.setAttribute('aria-expanded', String(mvpLimit === 20));
  rankedPlayers.slice(0, mvpLimit).forEach(player => {
  const row = document.createElement('tr');
  const rank = document.createElement('td');
  rank.textContent = rankedPlayers.findIndex(candidate => candidate.elo === player.elo) + 1;
  const name = document.createElement('td');
  name.className = 'mvp-name';
  const identity = document.createElement('div');
  identity.className = 'mvp-identity';
  const portrait = document.createElement('span');
  portrait.className = 'mvp-photo';
  portrait.setAttribute('aria-hidden', 'true');
  if (player.photo) {
    const image = document.createElement('img');
    image.src = player.photo;
    image.alt = '';
    image.loading = 'lazy';
    portrait.append(image);
  } else portrait.textContent = Array.from(player.name.replace(/^@/, ''))[0].toUpperCase();
  const label = document.createElement('span');
  label.textContent = player.name;
  identity.append(portrait, label);
  name.append(identity);
  if (player.status) {
    const badge = document.createElement('span');
    badge.className = 'legendary-badge';
    badge.textContent = `✦ ${player.status}`;
    label.append(badge);
  }
  const position = document.createElement('td');
  position.textContent = player.position;
  position.setAttribute('aria-label', player.secondaryPosition ? `Preferred: ${player.primaryPosition}; secondary: ${player.secondaryPosition}` : player.primaryPosition);
  position.title = position.getAttribute('aria-label');
  const rating = document.createElement('td');
  rating.append(stars(player.rating));
  const elo = document.createElement('td');
  elo.textContent = player.elo;
  if (tournamentEloAdjustments[player.name]) {
    const delta = tournamentEloAdjustments[player.name];
    const change = document.createElement('span');
    change.className = `elo-adjustment ${delta > 0 ? 'elo-gain' : 'elo-loss'}`;
    change.textContent = ` (${delta > 0 ? '+' : ''}${delta})`;
    elo.append(change);
  }
  row.append(rank, name, position, rating, elo);
  mvpList.append(row);
  });
  document.dispatchEvent(new Event('ratings-updated'));
}
mvpToggle.addEventListener('click', () => {
  mvpLimit = mvpLimit === 10 ? 20 : 10;
  renderMvp();
});
renderMvp();
function showView() {
  const showPlayers = location.hash === '#players';
  const showStats = location.hash === '#stats';
  const showMatches = location.hash === '#matches';
  const showSeason = location.hash === '#season-2026-2027';
  document.querySelector('#season-view').hidden = !showSeason;
  const showMemories = location.hash === '#memory-lane';
  document.querySelector('#home-view').hidden = showPlayers || showStats || showMatches || showMemories || showSeason;
  document.querySelector('#memory-lane-view').hidden = !showMemories;
  document.querySelector('#matches-view').hidden = !showMatches;
  document.querySelector('#stats-view').hidden = !showStats;
  document.querySelector('#players-view').hidden = !showPlayers;
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === (location.hash || '#home')) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (dialog.open) dialog.close();
  if (showPlayers || showStats || showMatches || showMemories || showSeason || location.hash === '#home' || !location.hash) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', showView);
showView();
