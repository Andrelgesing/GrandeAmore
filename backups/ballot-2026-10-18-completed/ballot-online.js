const ballotTeams = currentMatch.teams;
// 18:30 Vienna time (UTC+2) on tournament day.
const ballotOpening = Date.parse('2026-10-18T18:30:00+02:00');
const ballotKey = 'grande-amore-mvp-online-2026-10-18-official';
const voterKey = 'grande-amore-mvp-voter';
let voterId;
try {
 voterId = localStorage.getItem(voterKey) || crypto.randomUUID();
 localStorage.setItem(voterKey, voterId);
} catch (_) { voterId = crypto.randomUUID(); }
let pollTotals = {};
let pollReady = false;
let pollBusy = false;
let pollError = '';
let pollTotal = -1;
const previewDialog = document.querySelector('#ballot-preview');
for (const id of ['ballot-open', 'ballot-preview-open']) document.getElementById(id).addEventListener('click', () => previewDialog.showModal());
document.querySelector('#ballot-preview-close').addEventListener('click', () => previewDialog.close());
const ballotContainer = document.querySelector('#ballot-teams');
const ballotSubmit = document.querySelector('#ballot-submit');
const ballotSelection = document.querySelector('#ballot-selection');
const ballotDialog = document.querySelector('#ballot-confirm-dialog');
const ballotConfirmName = document.querySelector('#ballot-confirm-name');
document.querySelector('#ballot-cancel').addEventListener('click', () => ballotDialog.close());
let chosenMvp = null;
let submittedMvp = null;
try { submittedMvp = displayPlayerName(localStorage.getItem(ballotKey)); } catch (_) {}
const ballotButtons = [];
ballotTeams.forEach((team, index) => {
 const section = document.createElement('section');
 section.className = 'ballot-team';
 section.style.setProperty('--ballot-color', ['#f5d478', '#a3d7ff', '#f5aaa7', '#d0b6ff'][index]);
 const title = document.createElement('h3'); title.textContent = `Team ${index + 1}`;
 const candidates = document.createElement('div'); candidates.className = 'ballot-candidates';
 team.forEach(name => {
  const player = players.find(p => p.name === name);
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'ballot-candidate'; button.dataset.player = name;
  button.setAttribute('aria-pressed', 'false');
  const portrait = document.createElement('span'); portrait.className = 'ballot-avatar';
  if (player?.photo) {
   const img = document.createElement('img'); img.src = player.photo; img.alt = ''; img.loading = 'lazy'; portrait.append(img);
  } else {
   portrait.textContent = Array.from(name.replace(/^@/, ''))[0].toUpperCase();
   portrait.title = 'Photo coming soon';
  }
  const label = document.createElement('span'); label.textContent = name;
  button.append(portrait, label);
  button.addEventListener('click', () => {
   if (Date.now() < ballotOpening || submittedMvp || pollBusy || !pollReady) return;
   chosenMvp = name;
   ballotButtons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
   ballotSelection.textContent = `${name} selected.`;
   ballotConfirmName.textContent = `Vote for ${name} as tournament MVP?`;
   updateBallotClock();
   ballotDialog.showModal();
  });
  ballotButtons.push(button); candidates.append(button);
 });
 section.append(title, candidates); ballotContainer.append(section);
});
function updateBallotClock() {
 const remaining = Math.max(0, ballotOpening - Date.now());
 const seconds = Math.ceil(remaining / 1000);
 const hours = Math.floor(seconds / 3600);
 const minutes = Math.floor(seconds % 3600 / 60);
 const countdown = document.querySelector('#ballot-countdown');
 if (countdown) countdown.textContent = remaining > 0
  ? `Opens in ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  : 'Voting is open';
 document.querySelector('#ballot-preview-status').textContent = remaining > 0 ? 'Preview today’s squads. Voting opens at 18:30 Vienna time.' : 'Voting is open. Choose your tournament MVP.';
 document.querySelector('#ballot-preview-open').textContent = remaining > 0 ? 'Preview today’s candidates' : 'Vote for your MVP';
 ballotButtons.forEach(button => {
  button.disabled = remaining > 0 || Boolean(submittedMvp) || pollBusy || !pollReady;
  if (submittedMvp) button.setAttribute('aria-pressed', String(button.dataset.player === submittedMvp));
 });
 ballotSubmit.disabled = remaining > 0 || !chosenMvp || Boolean(submittedMvp) || pollBusy || !pollReady;
 if (submittedMvp) ballotSelection.textContent = `Thank you! You voted for ${submittedMvp}. Please vote only once.`;
}
ballotSubmit.addEventListener('click', async () => {
 if (!chosenMvp || submittedMvp || pollBusy || !pollReady || Date.now() < ballotOpening) return;
 pollBusy = true; updateBallotClock();
 try {
  const response = await fetch(RATINGS_API + '/mvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voter: voterId, player: servicePlayerName(chosenMvp) }) });
  if (!response.ok) throw new Error();
  applyPoll(await response.json());
  ballotDialog.close();
  showBallotResults(true);
 } catch (_) { ballotSelection.textContent = 'Your vote could not be confirmed. Please try again.'; }
 finally { pollBusy = false; updateBallotClock(); }
});
updateBallotClock();
setInterval(updateBallotClock, 1000);

const resultsPanel = document.querySelector('#ballot-results');
const resultsToggle = document.querySelector('#ballot-results-toggle');
let viewingResults = false;
function showBallotResults(show, focus = true) {
 viewingResults = show;
 ballotContainer.hidden = show;
 resultsPanel.hidden = !show;

 resultsToggle.hidden = Boolean(submittedMvp);
 resultsToggle.textContent = show ? 'Back to voting' : 'View preliminary results';
 if (!show) return;
 const list = document.querySelector('#ballot-results-list');
 list.replaceChildren();
 const candidates = ballotTeams.flat().map((name, index) => ({ name, index, votes: pollTotals[name] || 0 }));
 candidates.sort((a, b) => b.votes - a.votes || a.index - b.index);
 const total = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
 document.querySelector('#ballot-results-summary').textContent = pollError || (!pollReady ? 'Loading results…' : total ? `${total} ${total === 1 ? 'vote' : 'votes'} so far. Please vote only once.` : 'No votes yet. Be the first to choose an MVP.');
 for (const candidate of candidates.filter(candidate => candidate.votes > 0)) {
  const row = document.createElement('div'); row.className = 'ballot-result-row';
  const portrait = document.createElement('span'); portrait.className = 'ballot-avatar';
  const player = players.find(p => p.name === candidate.name);
  if (player?.photo) {
   const image = document.createElement('img'); image.src = player.photo; image.alt = ''; image.loading = 'lazy'; portrait.append(image);
  } else portrait.textContent = Array.from(candidate.name.replace(/^@/, ''))[0].toUpperCase();
  const label = document.createElement('div'); label.textContent = candidate.name;
  const track = document.createElement('span'); track.className = 'ballot-result-bar';
  const fill = document.createElement('span'); fill.className = 'ballot-result-fill';
  fill.style.width = `${total ? candidate.votes / total * 100 : 0}%`; track.append(fill); label.append(track);
  const score = document.createElement('span'); score.textContent = `${candidate.votes} ${candidate.votes === 1 ? 'vote' : 'votes'} · ${total ? (candidate.votes / total * 100).toFixed(1) : 0}%`;
  row.append(portrait, label, score); list.append(row);
 }
 if (focus) resultsPanel.focus({ preventScroll: true });
}
resultsToggle.addEventListener('click', () => showBallotResults(!viewingResults));
if (submittedMvp) showBallotResults(true, false);

function applyPoll(data) {
 const total = Object.values(data.totals).reduce((sum, votes) => sum + votes, 0);
 if (data.poll !== '2026-10-18-official' || total < pollTotal) return;
 pollTotal = total; pollTotals = displayPlayerRecords(data.totals); pollReady = true; pollError = '';
 if (data.choice) {
  submittedMvp = displayPlayerName(data.choice.player);
  try { localStorage.setItem(ballotKey, submittedMvp); } catch (_) {}
 }
 updateBallotClock();
 if (viewingResults || submittedMvp) showBallotResults(true, false);
}
let fetchingPoll = false;
async function refreshPoll() {
 if (fetchingPoll || pollBusy) return;
 fetchingPoll = true;
 try {
  const response = await fetch(RATINGS_API + '/mvp?voter=' + encodeURIComponent(voterId), { cache: 'no-store' });
  if (!response.ok) throw new Error();
  applyPoll(await response.json());
 } catch (_) {
  pollError = 'Results are temporarily unavailable. Please try again shortly.';
  if (viewingResults) showBallotResults(true, false);
  if (!pollReady) ballotSelection.textContent = 'Connecting to voting. Please try again shortly.';
 } finally { fetchingPoll = false; }
}
refreshPoll();
setInterval(() => { if (!document.hidden) refreshPoll(); }, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPoll(); });
