// This preview never submits votes to the live site.
(() => {
  const demo = ['127.0.0.1', 'localhost'].includes(location.hostname);
  const opening = Date.parse('2026-11-08T18:30:00+01:00');
  const key = 'grande-amore-mvp-demo-2026-11-08';
  const root = document.querySelector('#november-mvp-preview');
  const endpoint = 'https://grande-amore-ratings.andrelgesing.workers.dev/mvp';
  const voterKey = 'grande-amore-mvp-voter';
  const voter = localStorage.getItem(voterKey) || crypto.randomUUID();
  localStorage.setItem(voterKey, voter);
  let vote = demo ? localStorage.getItem(key) : null;
  let ready = demo, closed = false, busy = false, error = '';
  const locked = () => !demo && (Date.now() < opening || !ready || closed);
  const style = document.createElement('style');
  style.textContent = `
    .mvp-preview-stage { position:relative; height:clamp(350px,48vw,540px); margin-bottom:28px; overflow:hidden; border:2px solid #c79d51; border-radius:16px; background:#091a25; color:#f8ead0 }
    .mvp-preview-stage [hidden] { display:none!important }
    .mvp-preview-banner,.mvp-preview-ballot { position:absolute; inset:0; width:100%; height:100%; box-sizing:border-box }
    .mvp-preview-banner { border:0; padding:0; background:#091a25; color:inherit; cursor:pointer }
    .mvp-preview-banner img { width:100%; height:100%; object-fit:contain; opacity:1 }
    .mvp-preview-caption { position:absolute; inset:auto 0 0; padding:28px 12px 15px; display:grid; gap:5px; background:linear-gradient(transparent,#091a25 48%); font-size:clamp(15px,2vw,21px) }
    .mvp-preview-stage.is-open { height:auto }
    .mvp-preview-ballot { position:relative; height:auto; display:flex; flex-direction:column; padding:12px; gap:8px }
    .mvp-preview-header { display:flex; justify-content:space-between; align-items:center; gap:8px }
    .mvp-preview-header h2,.mvp-preview-stage p { margin:0 }
    .mvp-preview-grid { min-height:0; display:grid; align-content:start; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px }
    .mvp-preview-team h3 { font-size:.86rem; margin:0 0 4px; border-bottom:2px solid #c79d51 }
    .mvp-preview-candidate { display:flex; width:100%; align-items:center; text-align:left; gap:8px; padding:2px 4px; margin:2px 0; border:1px solid transparent; border-radius:6px; background:#ffffff0c; color:inherit; font-size:.9rem; cursor:pointer }
    .mvp-preview-candidate:hover,.mvp-preview-candidate[aria-pressed=true] { border-color:#f3cd81 }
    .mvp-preview-candidate .ballot-avatar { width:48px; height:48px }
    .mvp-preview-stage button:focus-visible { outline:2px solid #f3cd81; outline-offset:-2px }
    .mvp-preview-footer { display:flex; align-items:center; flex-wrap:wrap; gap:6px }
    .mvp-preview-ballot .button { padding:5px 9px }
    #november-mvp-confirm { box-sizing:border-box; padding:24px; background:#091a25; color:#fff7e8; border:1px solid #f3cd81; border-radius:14px }
    #november-mvp-confirm::backdrop { background:#050c14b8; backdrop-filter:blur(3px) }
    #november-mvp-question { margin:0; color:inherit; font-size:clamp(1.2rem,4vw,1.55rem); line-height:1.3 }
    #november-mvp-confirm form { display:flex; gap:12px; margin-top:20px }
    #november-mvp-confirm .button { flex:1; min-height:44px; margin:0; padding:8px 16px; border:1px solid #aabdc9; font:inherit; font-weight:700; cursor:pointer }
    #november-mvp-confirm [value=yes] { background:#f3cd81; color:#091a25; border-color:#f3cd81 }
    #november-mvp-confirm [value=no] { background:#203747; color:#fff7e8 }
    #november-mvp-confirm .button:focus-visible { outline:2px solid #fff7e8; outline-offset:3px }
    @media(max-width:650px) { .mvp-preview-grid { grid-template-columns:repeat(2,minmax(0,1fr)) } }
  `;
  document.head.append(style);
  root.innerHTML = `<section class="mvp-preview-stage" aria-label="8 November MVP poll">
    <button class="mvp-preview-banner" type="button" aria-controls="november-mvp-ballot" aria-expanded="false">
      <img src="assets/grandeamore-ballon-dor.svg" alt="">
      <span class="mvp-preview-caption"><strong>8 November · Tournament MVP</strong><span id="november-mvp-clock"></span><span>${demo ? 'Open ballot · Local test' : 'Open ballot'}</span></span>
    </button>
    <div class="mvp-preview-ballot" id="november-mvp-ballot" hidden>
      <header class="mvp-preview-header"><h2>Choose your MVP</h2><button type="button" class="button" id="november-mvp-back">Back to banner</button></header>
      <p>${demo ? 'Local test · ' : ''}Voting opens Sunday at 18:30 Vienna time</p>
      <div class="mvp-preview-grid" aria-label="Candidates by team"></div>
      <div class="mvp-preview-footer"><p role="status" id="november-mvp-status"></p><button type="button" class="button" id="november-mvp-reset" hidden>Reset test vote</button></div>
    </div>
    <dialog id="november-mvp-confirm" aria-labelledby="november-mvp-question">
      <h2 id="november-mvp-question"></h2>
      <form method="dialog"><button class="button" value="yes">Yes</button> <button class="button" value="no" autofocus>No</button></form>
    </dialog>
  </section>`;
  const banner = root.querySelector('.mvp-preview-banner');
  const ballot = root.querySelector('#november-mvp-ballot');
  const back = root.querySelector('#november-mvp-back');
  const grid = root.querySelector('.mvp-preview-grid');
  const stage = root.querySelector('.mvp-preview-stage');
  const confirm = root.querySelector('#november-mvp-confirm');
  const reset = root.querySelector('#november-mvp-reset');
  let selected = null;
  const candidates = [];
  function update() {
    candidates.forEach(button => {
      button.disabled = Boolean(vote) || locked() || busy;
      button.setAttribute('aria-pressed', String(button.dataset.name === (vote || selected)));
    });
    reset.hidden = !demo || !vote;
    root.querySelector('#november-mvp-status').textContent = error || (vote ? `${demo ? 'Test vote' : 'Vote'} saved for ${vote}.` : closed ? 'Voting is closed.' : locked() ? 'Voting opens Sunday at 18:30 Vienna time.' : busy ? 'Saving vote…' : 'Select one player.');
  }
  november8Match.teams.forEach((team, index) => {
    const group = document.createElement('section');
    group.className = 'mvp-preview-team';
    const heading = document.createElement('h3');
    heading.textContent = `Team ${index + 1}`;
    group.append(heading);
    team.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mvp-preview-candidate';
      button.dataset.name = name;
      const photo = players.find(player => player.name === name)?.photo;
      const avatar = document.createElement('span');
      avatar.className = 'ballot-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = name[0];
      if (photo) {
        const img = document.createElement('img');
        img.src = photo;
        img.alt = '';
        img.addEventListener('error', () => img.remove(), { once:true });
        avatar.replaceChildren(img);
        img.addEventListener('error', () => { avatar.textContent = name[0]; }, { once:true });
      }
      button.append(avatar, document.createTextNode(name));
      button.addEventListener('click', () => {
        if (vote || locked() || busy) return;
        selected = name;
        confirm.returnValue = '';
        root.querySelector('#november-mvp-question').textContent = `Confirm vote for ${name}?`;
        confirm.showModal();
      });
      candidates.push(button);
      group.append(button);
    });
    grid.append(group);
  });
  banner.addEventListener('click', () => {
    banner.hidden = true;
    banner.setAttribute('aria-expanded','true');
    stage.classList.add('is-open');
    ballot.hidden = false;
    back.focus();
  });
  back.addEventListener('click', () => {
    ballot.hidden = true;
    stage.classList.remove('is-open');
    banner.hidden = false;
    banner.setAttribute('aria-expanded','false');
    banner.focus();
  });
  confirm.addEventListener('close', async () => {
    if (confirm.returnValue !== 'yes' || !selected || vote) { selected = null; return; }
    if (locked() || busy) return;
    if (demo) {
      vote = selected;
      localStorage.setItem(key, vote);
      update();
      reset.focus();
      return;
    }
    busy = true;
    error = '';
    update();
    try {
      const response = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({voter, player:servicePlayerName(selected)}) });
      if (!response.ok) throw Error('Vote rejected');
      const data = await response.json();
      if (data.poll !== '2026-11-08-official' || !data.choice) throw Error('Unexpected poll response');
      vote = displayPlayerName(data.choice.player);
    } catch (_) { error = 'Could not confirm your vote. Please try again.'; }
    finally { busy = false; selected = null; update(); }
  });
  reset.addEventListener('click', () => {
    localStorage.removeItem(key);
    selected = vote = null;
    update();
    candidates[0].focus();
  });
  function tick() {
    const seconds = Math.max(0, Math.ceil((opening - Date.now()) / 1000));
    const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
    root.querySelector('#november-mvp-clock').textContent = seconds ? `Opens Sunday at 18:30 Vienna time · ${time}` : 'Official opening time reached';
  }
  async function refresh() {
    if (demo || busy) return;
    try {
      const response = await fetch(endpoint + '?voter=' + encodeURIComponent(voter), {cache:'no-store'});
      if (!response.ok) throw Error('Poll unavailable');
      const data = await response.json();
      if (data.poll !== '2026-11-08-official') throw Error('Unexpected poll');
      if (data.choice) vote = displayPlayerName(data.choice.player);
      closed = data.closed;
      ready = true;
    } catch (_) { ready = false; }
    update();
  }
  update();
  tick();
  refresh();
  setInterval(() => { tick(); update(); }, 1000);
  if (!demo) setInterval(refresh, 15000);
})();
