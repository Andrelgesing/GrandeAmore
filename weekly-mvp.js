(async () => {
  const mount = document.querySelector('#weekly-mvp');
  const account = window.grandeAmoreAccount;
  if (!mount || !account) return;

  let config;
  try {
    config = await account.api('mvp-config');
    if (!config.showOnHome) return;
    const response = await fetch('templates/weekly-mvp.html');
    if (!response.ok) return;
    mount.innerHTML = await response.text();
  } catch {
    return;
  }
  const stage = mount.querySelector('.weekly-mvp-stage');
  if (!stage) return;
  const { poll, date, type, teams } = config;
  stage.style.setProperty('--mvp-team-columns', Math.min(teams.length, 4));
  const intentKey = `ga-mvp-intent:${poll}`;
  const label = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', timeZone: 'Europe/Vienna'
  }).format(new Date(date)) + ` · ${type} MVP`;
  for (const node of stage.querySelectorAll('[data-mvp-label]')) node.textContent = label;
  stage.setAttribute('aria-label', label);

  const banner = stage.querySelector('.weekly-mvp-banner');
  const bannerStatus = stage.querySelector('#weekly-mvp-banner-status');
  const bannerAction = stage.querySelector('#weekly-mvp-banner-action');
  const ballot = stage.querySelector('#weekly-mvp-ballot');
  const heading = ballot.querySelector('h2');
  const back = stage.querySelector('#weekly-mvp-back');
  const grid = stage.querySelector('.weekly-mvp-grid');
  const results = stage.querySelector('.weekly-mvp-results');
  const toggle = stage.querySelector('#weekly-mvp-view-results');
  const status = stage.querySelector('#weekly-mvp-status');
  const confirm = stage.querySelector('#weekly-mvp-confirm');
  const question = stage.querySelector('#weekly-mvp-question');
  const candidates = [];
  let selected, vote, totals = {};
  let ready = false, closed = false, busy = false, viewingResults = false, error = '';
  let requestVersion = 0;

  function avatar(name) {
    const node = document.createElement('span');
    node.className = 'ballot-avatar';
    node.setAttribute('aria-hidden', 'true');
    const initial = (Array.from(name.replace(/^@/, ''))[0] || '?').toUpperCase();
    const photo = players.find(player => player.name === name)?.photo;
    node.textContent = initial;
    if (photo) {
      const image = document.createElement('img');
      image.src = photo;
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => { node.textContent = initial; }, { once: true });
      node.replaceChildren(image);
    }
    return node;
  }

  function showResults() {
    const entries = Object.entries(totals);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const summary = document.createElement('p');
    summary.textContent = total + (total === 1 ? ' vote cast' : ' votes cast');
    results.replaceChildren(summary);
    for (const [name, count] of entries.sort((a, b) => b[1] - a[1])) {
      const row = document.createElement('p');
      const displayName = displayPlayerName(name);
      const share = total ? (count / total * 100).toFixed(1) : 0;
      row.append(avatar(displayName),
        `${displayName} — ${count} ${count === 1 ? 'vote' : 'votes'} · ${share}%`);
      results.append(row);
    }
  }

  function update() {
    const signedIn = Boolean(account.currentUser());
    for (const button of candidates) {
      button.disabled = !signedIn || !ready || closed || busy || Boolean(vote);
      button.setAttribute('aria-pressed', String(button.dataset.name === (vote || selected)));
    }
    const showingResults = closed || Boolean(vote) || viewingResults;
    grid.hidden = showingResults;
    results.hidden = !showingResults;
    heading.textContent = showingResults ? 'Results' : 'Choose your MVP';
    if (showingResults) showResults();
    toggle.hidden = closed || Boolean(vote);
    toggle.textContent = viewingResults ? 'Back to voting' : 'View results';
    bannerStatus.textContent = !signedIn ? 'Sign in to cast your vote' :
      closed ? 'Voting is closed' : ready ? 'Voting is open' : '';
    bannerAction.textContent = vote || closed ? 'View results' : 'Open ballot';
    status.textContent = error || (busy ? 'Saving vote…' : vote ? `Vote saved for ${vote}.` :
      closed ? 'Voting is closed.' : ready ? 'Select one player.' : 'Loading ballot…');
  }

  function applyPoll(data) {
    if (data.poll !== poll) throw new Error('Unexpected poll');
    totals = data.totals || {};
    vote = data.choice ? displayPlayerName(data.choice.player) : null;
    closed = data.closed;
    ready = true;
  }

  async function refresh() {
    if (busy || !account.currentUser()) return;
    const version = ++requestVersion;
    try {
      const data = await account.api('mvp');
      if (version !== requestVersion) return;
      applyPoll(data);
      error = '';
    } catch {
      if (version !== requestVersion) return;
      ready = false;
      error = 'The ballot is unavailable. Please try again.';
    }
    update();
  }

  function showBallot(open) {
    stage.classList.toggle('is-open', open);
    banner.hidden = open;
    banner.setAttribute('aria-expanded', String(open));
    ballot.hidden = !open;
  }

  function resumeBallot() {
    if (!account.currentUser() || sessionStorage.getItem(intentKey) !== '1') return;
    sessionStorage.removeItem(intentKey);
    viewingResults = closed;
    showBallot(true);
    back.focus();
    update();
    refresh();
  }

  for (const team of teams) {
    const group = document.createElement('section');
    group.className = 'weekly-mvp-team';
    const title = document.createElement('h3');
    title.textContent = team.name;
    group.append(title);
    for (const name of team.names) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'weekly-mvp-candidate';
      button.dataset.name = name;
      button.append(avatar(name), name);
      button.addEventListener('click', () => {
        if (button.disabled) return;
        selected = name;
        confirm.returnValue = '';
        question.textContent = `Confirm vote for ${name}?`;
        confirm.showModal();
      });
      candidates.push(button);
      group.append(button);
    }
    grid.append(group);
  }

  banner.addEventListener('click', async () => {
    sessionStorage.setItem(intentKey, '1');
    try {
      if (await account.requireSignIn()) resumeBallot();
    } catch {
      sessionStorage.removeItem(intentKey);
      bannerStatus.textContent = 'Sign-in is unavailable. Please try again.';
    }
  });
  back.addEventListener('click', () => {
    showBallot(false);
    banner.focus();
  });
  toggle.addEventListener('click', () => {
    viewingResults = !viewingResults;
    update();
  });
  confirm.addEventListener('close', async () => {
    const name = selected;
    selected = null;
    if (confirm.returnValue !== 'yes' || !name || vote || !ready || closed || busy || !account.currentUser()) return;
    const version = ++requestVersion;
    busy = true;
    error = '';
    update();
    try {
      const data = await account.api('mvp', { poll, player: name });
      if (version !== requestVersion) return;
      applyPoll(data);
    } catch {
      if (version === requestVersion) error = 'Could not confirm your vote. Please try again.';
    } finally {
      if (version === requestVersion) {
        busy = false;
        update();
      }
    }
  });
  window.addEventListener('account-state-changed', () => {
    for (const button of candidates) button.firstChild.replaceWith(avatar(button.dataset.name));
    if (account.currentUser()) {
      if (sessionStorage.getItem(intentKey) === '1') {
        if (document.querySelector('#account-dialog')?.open) document.querySelector('#account-dialog').close();
        resumeBallot();
      } else {
        refresh();
      }
      return;
    }
    requestVersion++;
    vote = null;
    totals = {};
    ready = closed = busy = viewingResults = false;
    error = '';
    if (confirm.open) confirm.close();
    showBallot(false);
    update();
  });
  update();
  if (sessionStorage.getItem(intentKey) === '1') stage.scrollIntoView({ block: 'start' });
  if (account.currentUser()) {
    if (sessionStorage.getItem(intentKey) === '1') resumeBallot();
    else refresh();
  }
  setInterval(refresh, 15000);
})();
