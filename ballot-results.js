// Final results snapshot for the completed tournament. Voting template remains in templates/mvp-voting.html and ballot.js.
const finalMvpPoll = {
  "poll": "2026-10-18-official",
  "totals": {
    "Loay": 8,
    "gabi": 1,
    "Ronaldo": 1,
    "Giorgios": 1,
    "Hay": 2,
    "Raul": 1
  },
  "choice": null
};
const awardDialog = document.querySelector('#award-results-dialog');
const finalCandidates = Object.entries(finalMvpPoll.totals).filter(([, votes]) => votes > 0).sort((a, b) => b[1] - a[1]);
const finalVoteTotal = finalCandidates.reduce((sum, [, votes]) => sum + votes, 0);
document.querySelector('#award-results-summary').textContent = `Loay wins the 2nd GrandeAmore Ballon d’Or! ${finalVoteTotal} votes cast.`;
const finalResultsList = document.querySelector('#award-results-list');
let previousVotes = null, rank = 0;
finalCandidates.forEach(([name, votes], index) => {
 if (votes !== previousVotes) rank = index + 1;
 previousVotes = votes;
 const row = document.createElement('div'); row.className = 'ballot-result-row';
 const portrait = document.createElement('span'); portrait.className = 'ballot-avatar';
 const player = players.find(player => player.name === name);
 if (player && player.photo) {
  const img = document.createElement('img'); img.src = player.photo; img.alt = ''; portrait.append(img);
 } else portrait.textContent = name[0].toUpperCase();
 const label = document.createElement('div'); label.textContent = `${rank}. ${name}`;
 const track = document.createElement('span'); track.className = 'ballot-result-bar';
 const fill = document.createElement('span'); fill.className = 'ballot-result-fill'; fill.style.width = `${votes / finalVoteTotal * 100}%`;
 track.append(fill); label.append(track);
 const score = document.createElement('span'); score.textContent = `${votes} ${votes === 1 ? 'vote' : 'votes'} · ${(votes / finalVoteTotal * 100).toFixed(1)}%`;
 row.append(portrait, label, score); finalResultsList.append(row);
});
document.querySelector('#award-results-open').addEventListener('click', () => awardDialog.showModal());
document.querySelector('#award-results-close').addEventListener('click', () => awardDialog.close());
awardDialog.addEventListener('click', event => {
 const bounds = awardDialog.getBoundingClientRect();
 if (event.target === awardDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) awardDialog.close();
});

document.querySelector('#winner-results-open').addEventListener('click', () => awardDialog.showModal());
