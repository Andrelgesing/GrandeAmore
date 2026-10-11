// Elo is the underlying score. Stars are rounded to the nearest half star.
const rawStars = elo => Math.max(1, Math.min(5, (elo - 400) / 200));
const starsFromElo = elo => Math.round(rawStars(elo) * 2) / 2;
// Add a photo path to a player when photos are available.
const roster = [
  ['AlexG', 'GK', 1200], ['Andre', 'GK', 1200, 'players/andre.jpg'], ['Darius', 'CB', 1000],
  ['fabian', 'CM', 1000, 'players/fabian.jpg'], ['Enil', 'CM', 1200, 'players/enil.jpg'], ['gabi', 'CM', 1000, 'players/gabi.jpg'],
  ['Daniel', 'CM/ST', 1200], ['Levi', 'CM', 1000, 'players/levi.jpg'], ['Samu', 'ST/CM', 1000, 'players/samu.jpg'],
  ['Dejan', 'CB', 1000], ['Jack', 'CB', 1000, 'players/jack.jpg'], ['Ali', 'ST/CB', 1000],
  ['Omar', 'CM', 1000, 'players/omar.jpg'], ['Baraa', 'CB', 1000], ['Takunda', 'CB', 1000],
  ['Danilo', 'CB', 1000], ['Andreeas', 'CM', 1000], ['davideb', 'CM', 1000, 'players/davideb.jpg'],
  ['Nikita', 'CB', 1000], ['Iacob', 'CM', 1000], ['Damien', 'CB', 1000],
  ['Valentin', 'CM', 1000], ['Milan', 'CM', 1000, 'players/Milan.jpeg'], ['Mohamed', 'CB', 1000],
  ['Paolo (pac)', 'CB', 1000, 'players/paolo.jpg'], ['@Fabien Vjaceslavs', 'CM', 1000, 'players/fabien_v.jpg'],
  ['Lucas', 'ST/CM', 1200, 'players/lucas.jpg'], ['@~❄️', 'ST', 1000, 'players/snow.jpg'],
  ['Shahrom', 'ST', 1000, 'players/shahrom.jpg', 'Legendary'],
  ['Loay', 'CM/ST', 1100]
];
let ratingState = {};
try { if (!RATINGS_API) ratingState = JSON.parse(localStorage.getItem('grande-amore-ratings') || '{}') || {}; } catch (_) {}
const jokes = ['Post-match pizza instinct', 'Celebration choreography', 'VAR negotiation skills', 'Excuse creativity', 'Dressing-room DJ skills', 'Monday morning soreness', 'Nutmeg ambition', 'Touchline banter'];
const players = roster.map(([name, position, elo, photo = null, status = null], index) => ({
  name, position, primaryPosition: position.split('/')[0], secondaryPosition: position.split('/')[1] || null,
  elo: Number.isFinite(ratingState[name]?.elo) ? ratingState[name].elo : elo, rating: starsFromElo(Number.isFinite(ratingState[name]?.elo) ? ratingState[name].elo : elo), photo,
  status: ratingState[name]?.legendary || starsFromElo(Number.isFinite(ratingState[name]?.elo) ? ratingState[name].elo : elo) === 5 ? 'Legendary' : status, rosterOrder: index,
  // Stable playful scores, chosen randomly once per page load.
  stats: [0, 1].map(offset => ({ label: jokes[(index * 2 + offset) % jokes.length], rating: 1 + Math.floor(Math.random() * 5) }))
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
  const badge = document.createElement('span');
  badge.className = 'tier';
  badge.textContent = 'Grande Amore';
  fragment.append(position, portrait, name, stars(player.rating), badge);
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
function renderPlayerGrid() {
 grid.replaceChildren();
for (const player of players) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `player-card ${cardStyle(player)}`;
  button.setAttribute('aria-label', `View ${player.name}, ${player.position}, ${player.rating} out of 5 stars${player.status ? ', ' + player.status : ''}`);
  button.setAttribute('aria-haspopup', 'dialog');
  button.append(cardContent(player));
  button.addEventListener('click', () => {
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
  });
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
  name.textContent = player.name;
  if (player.status) {
    const badge = document.createElement('span');
    badge.className = 'legendary-badge';
    badge.textContent = `✦ ${player.status}`;
    name.append(badge);
  }
  const position = document.createElement('td');
  position.textContent = player.position;
  position.setAttribute('aria-label', player.secondaryPosition ? `Preferred: ${player.primaryPosition}; secondary: ${player.secondaryPosition}` : player.primaryPosition);
  position.title = position.getAttribute('aria-label');
  const rating = document.createElement('td');
  rating.append(stars(player.rating));
  const elo = document.createElement('td');
  elo.textContent = player.elo;
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
  const showMemories = location.hash === '#memory-lane';
  document.querySelector('#home-view').hidden = showPlayers || showStats || showMatches || showMemories;
  document.querySelector('#memory-lane-view').hidden = !showMemories;
  document.querySelector('#matches-view').hidden = !showMatches;
  document.querySelector('#stats-view').hidden = !showStats;
  document.querySelector('#players-view').hidden = !showPlayers;
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === (location.hash || '#home')) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (dialog.open) dialog.close();
  if (showPlayers || showStats || showMatches || showMemories || location.hash === '#home' || !location.hash) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', showView);
showView();
