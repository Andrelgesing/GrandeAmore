(() => {
  const onPages = location.origin === 'https://andrelgesing.github.io';
  const accountHost = onPages ? 'https://grande-amore-pilot.andrelgesing.workers.dev' : '';
  const entry = document.querySelector('#account-entry');
  const dialog = document.querySelector('#account-dialog');
  let state, message;
  const rosterPhotos = new Map([...players.map(player => [player.name, player.photo]),
    ['pilot-player-dad61ee5-4951-4ca4-b7dd-faf4e557f6d5', 'players/dash.jpg']]);
  const params = new URLSearchParams(location.search);

  function element(tag, content = '') {
    const node = document.createElement(tag);
    node.textContent = content;
    return node;
  }
  async function api(action, data) {
    const headers = {};
    const token = onPages && sessionStorage.getItem('ga-session');
    if (token) headers.Authorization = 'Bearer ' + token;
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(accountHost + '/account-api/' + action, {
      method: data === undefined ? 'GET' : 'POST', headers,
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    if (onPages && action === 'logout' && response.ok) sessionStorage.removeItem('ga-session');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function refresh() {
    if (onPages && location.hash.startsWith('#ga-code=')) {
      const code = location.hash.slice(9);
      const verifier = sessionStorage.getItem('ga-verifier');
      history.replaceState(null, '', location.pathname + location.search + (sessionStorage.getItem('ga-return') || ''));
      sessionStorage.removeItem('ga-verifier');
      sessionStorage.removeItem('ga-return');
      try {
        const { token } = await api('exchange', { code, verifier });
        sessionStorage.setItem('ga-session', token);
      } catch {
        params.set('sign-in', 'failed');
      }
    }
    state = await api('state');
    entry.textContent = state.user ? "My Profile" : 'Sign in';
    entry.hidden = false;
    window.localCardProfile = player => {
      const profile = Object.hasOwn(state.profiles, player.name) ? state.profiles[player.name] : null;
      if (!profile) return player;
      return {
        ...player, ...profile,
        primaryPosition: profile.position || player.primaryPosition,
        secondaryPosition: profile.position ? null : player.secondaryPosition
      };
    };
    for (const [key, profile] of Object.entries(state.profiles)) {
      if (!profile.created || players.some(player => player.name === key)) continue;
      const elo = ratingState[key]?.elo ?? 400 + 200 * profile.initialRating;
      const player = {
        name: key, position: '', primaryPosition: '', secondaryPosition: null,
        elo, rating: starsFromElo(elo), photo: 'player-placeholder.svg',
        stats: profile.stats, calibrationDuels: ratingState[key]?.calibrationDuels ?? 0, rosterOrder: players.length
      };
      players.push(player);
      if ((!RATINGS_API || Object.hasOwn(ratingState, key)) && typeof duelPlayers !== 'undefined') duelPlayers.push(player);
    }
    applyPlayerPhotos();
    renderPlayerGrid();
    if (RATINGS_API) await refreshRatings();
  }
  function applyPlayerPhotos() {
    const changed = new Map();
    for (const player of players) {
      const photo = state.profiles[player.name]?.photo || rosterPhotos.get(player.name) ||
        (state.profiles[player.name]?.created ? 'player-placeholder.svg' : '');
      if (photo === (player.photo || '')) continue;
      player.photo = photo;
      changed.set(player.name, player);
    }
    if (!changed.size) return;

    for (const image of document.querySelectorAll('#home-player-photos img')) {
      const player = changed.get(image.alt);
      if (player) image.src = player.photo;
    }
    const portraits = document.querySelectorAll('#fight-options .portrait');
    pair.forEach((player, index) => {
      const portrait = portraits[index];
      if (!portrait || !changed.has(player.name)) return;
      const display = window.localCardProfile(player);
      if (!player.photo) {
        portrait.textContent = Array.from(display.name.replace(/^@/, ''))[0].toUpperCase();
        return;
      }
      const image = element('img');
      image.src = player.photo;
      image.alt = display.name;
      portrait.replaceChildren(image);
    });
    renderMvp();
    renderSeason();
    renderGoals();
    renderMatches();
  }
  function report(error) { message.textContent = error.message; }
  function button(label, action) {
    const node = element('button', label);
    node.type = 'button';
    node.onclick = async () => {
      node.disabled = true;
      try { await action(); } catch (error) { report(error); }
      finally { node.disabled = false; }
    };
    return node;
  }
  function screen(title) {
    dialog.classList.remove('profile-season-dialog');
    const heading = element('h2', title);
    heading.id = 'account-title';
    message = element('p');
    message.setAttribute('role', 'status');
    dialog.replaceChildren(button('Close', () => dialog.close()), heading, message);
    if (!dialog.open) dialog.showModal();
  }
  function input(form, label, name, type = 'text', value = '') {
    const wrapper = element('label', label);
    const field = element('input');
    Object.assign(field, {name, type, value, required: true});
    wrapper.append(field);
    form.append(wrapper);
    return field;
  }
  function form(label, submit) {
    const node = element('form');
    const save = element('button', label);
    node.onsubmit = async event => {
      event.preventDefault();
      save.disabled = true;
      try { await submit(Object.fromEntries(new FormData(node))); }
      catch (error) { report(error); }
      finally { save.disabled = false; }
    };
    dialog.append(node);
    return {node, save};
  }
  async function change(action, data, next = home) {
    await api(action, data);
    await refresh();
    next();
  }
  function auth() {
    screen('Sign in');
    if (state.googleReady) {
      const link = element('a', 'Continue with Google');
      link.href = accountHost + '/account-api/google';
      if (onPages) link.onclick = async event => {
        event.preventDefault();
        const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
        const proof = btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
        sessionStorage.setItem('ga-verifier', verifier);
        sessionStorage.setItem('ga-return', location.hash);
        location.assign(link.href + '?proof=' + proof);
      };
      link.className = 'google-sign-in';
      const logo = element('img');
      logo.src = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';
      logo.alt = '';
      link.prepend(logo);
      dialog.append(link);
    } else {
      dialog.append(element('p', 'Google sign-in is temporarily unavailable.'));
    }
    if (state.testMode) {
      dialog.append(
        button('Use test player', () => change('test-sign-in', {role: 'player'})),
        button('Use test admin', () => change('test-sign-in', {role: 'admin'}))
      );
    }
  }
  function home() {
    const user = state.user;
    if (!user) return auth();
    screen(user.player ? 'My card' : 'My account');
    if (!user.player) {
      dialog.append(element('p', 'Regular Grande Amore player?'),
        button('Find yourself in our squad', claim),
        element('p', 'Couldn’t find yourself?'), button('Create new player', createPlayer));
    }
    else {
      const player = players.find(item => item.name === user.player);
      const card = playerCard(player);
      const summary = button('View match and season stats', () => profileSeason(player));
      summary.className = 'profile-season-open';
      card.append(summary, textAction('Edit card', () => edit(player)));
      dialog.append(card);
      if (state.rename) dialog.append(element('p', 'Name request for ' + state.rename.name + ' · ' + state.rename.status));
      dialog.append(element('p', 'Wrong card? Contact andrelgesing@gmail.com.'));
    }
    const footer = element('div');
    footer.append(textAction('Sign out', () => change('logout', {})));
    dialog.append(footer);
  }
  function normalize(text) {
    return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
  }
  function distance(left, right) {
    let row = Array.from({length: right.length + 1}, (_, i) => i);
    for (const char of left) {
      const next = [row[0] + 1];
      for (let i = 0; i < right.length; i++) next.push(Math.min(next[i] + 1, row[i + 1] + 1, row[i] + Number(char !== right[i])));
      row = next;
    }
    return row.at(-1);
  }
  function claim() {
    screen('Find yourself in our players');
    const search = input(dialog, 'Search by name', 'search', 'search');
    const results = element('div');
    dialog.append(results, element('p', 'Couldn’t find yourself?'), textAction('Create new player', createPlayer), button('Back', home));
    const unclaimed = players.filter(player => !state.claimed.includes(player.name));
    const suggestions = [];
    while (suggestions.length < 5 && unclaimed.length) {
      const index = Math.floor(Math.random() * unclaimed.length);
      suggestions.push({player: unclaimed.splice(index, 1)[0]});
    }
    function renderMatches() {
      results.replaceChildren();
      const query = normalize(search.value);
      const matches = query ? players.map(player => {
        const name = normalize(window.localCardProfile(player).name);
        const score = name === query ? -3 : name.startsWith(query) ? -2 : name.includes(query) ? -1 : distance(query, name);
        return {player, score};
      }).sort((a, b) => a.score - b.score).slice(0, 5) : suggestions;
      for (const {player} of matches) {
        const display = window.localCardProfile(player);
        const taken = state.claimed.includes(player.name);
        const result = button(display.name + ' · ' + display.position + (taken ? ' · Claimed' : ''), () => {
          screen('Claim ' + display.name + '?');
          dialog.append(element('p', 'You can choose only once. For corrections, contact andrelgesing@gmail.com.'));
          dialog.append(button('Confirm claim', () => change('claim', {player: player.name})), button('Back to search', claim));
        });
        result.disabled = taken;
        result.className = 'claim-match';
        if (display.photo) {
          const img = element('img');
          img.src = display.photo;
          img.alt = '';
          result.prepend(img);
        }
        results.append(result);
      }
    }
    search.oninput = renderMatches;
    renderMatches();
    search.focus();
  }
  function crop(formNode) {
    const upload = input(formNode, 'Upload photo', 'upload', 'file');
    upload.required = false;
    upload.parentElement.hidden = true;
    upload.accept = 'image/jpeg,image/png,image/webp';
    const canvas = element('canvas');
    canvas.width = canvas.height = 384;
    canvas.className = 'crop-preview';
    canvas.setAttribute('aria-label', 'Drag to center your photo');
    const controls = element('div');
    controls.hidden = true;
    controls.append(canvas);
    const zoom = input(controls, 'Zoom', 'zoom', 'range', '1');
    Object.assign(zoom, {min: 1, max: 4, step: 0.01});
    formNode.append(controls);
    const context = canvas.getContext('2d');
    let image, x = 0, y = 0, pointer;
    function draw() {
      const scale = 384 / Math.min(image.width, image.height) * Number(zoom.value);
      const w = image.width * scale;
      const h = image.height * scale;
      x = Math.max((384 - w) / 2, Math.min((w - 384) / 2, x));
      y = Math.max((384 - h) / 2, Math.min((h - 384) / 2, y));
      context.fillStyle = '#233b34';
      context.fillRect(0, 0, 384, 384);
      context.drawImage(image, (384 - w) / 2 + x, (384 - h) / 2 + y, w, h);
    }
    upload.onchange = async () => {
      image = null;
      controls.hidden = true;
      const file = upload.files[0];
      if (!file) return;
      if (file.size > 12 * 1024 * 1024) {
        upload.value = '';
        return report(new Error('Choose an image under 12 MB.'));
      }
      try {
        const bitmap = await createImageBitmap(file);
        if (upload.files[0] !== file) return bitmap.close();
        image = bitmap;
        x = y = 0;
        zoom.value = 1;
        controls.hidden = false;
        draw();
      } catch { report(new Error('Could not open that image.')); }
    };
    zoom.oninput = draw;
    canvas.onpointerdown = event => {
      pointer = event;
      canvas.setPointerCapture(event.pointerId);
    };
    canvas.onpointermove = event => {
      if (!pointer || pointer.pointerId !== event.pointerId) return;
      const scale = canvas.width / canvas.clientWidth;
      x += (event.clientX - pointer.clientX) * scale;
      y += (event.clientY - pointer.clientY) * scale;
      pointer = event;
      draw();
    };
    canvas.onlostpointercapture = () => { pointer = null; };
    return {
      open: () => upload.click(),
      photo: () => image ? canvas.toDataURL('image/jpeg', 0.85) : ''
    };
  }
  function textAction(label, action) {
    const control = button(label, action);
    control.className = 'card-action';
    return control;
  }
  function playerCard(player) {
    const card = element('div');
    card.className = 'player-card ' + cardStyle(player);
    card.append(cardContent(player, true));
    card.querySelector('.player-name').removeAttribute('id');
    return card;
  }
  function profileSeason(player) {
    const display = window.localCardProfile(player);
    screen(display.name + ' · Season summary');
    dialog.classList.add('profile-season-dialog');
    const card = element('section');
    card.className = 'player-card profile-season ' + cardStyle(player);
    const standings = buildSeasonStandings(seasonFixtures, players);
    const index = standings.findIndex(entry => entry.player.name === player.name);
    const entry = standings[index];
    const totals = element('div');
    totals.className = 'profile-season-totals';
    totals.append(element('strong', (entry?.goals ?? 0) + ' Goals'),
      element('strong', (entry?.assists ?? 0) + ' Assists'));
    card.append(totals, element('h3', 'Season standings'));
    if (!entry) {
      card.append(element('p', 'Unranked · no season matches recorded.'));
    } else {
      const rank = item => standings.findIndex(other => other.points === item.points &&
        other.goals === item.goals && other.assists === item.assists) + 1;
      card.append(element('p', 'Current position: #' + rank(entry)));
      const table = element('table');
      table.className = 'profile-season-table';
      const header = table.createTHead().insertRow();
      for (const label of ['Rank', 'Player', 'Pts']) {
        const cell = element('th', label);
        cell.scope = 'col';
        header.append(cell);
      }
      const body = table.createTBody();
      for (const item of standings.slice(Math.max(0, index - 3), index + 4)) {
        const row = body.insertRow();
        if (item === entry) row.className = 'profile-season-current';
        row.insertCell().textContent = '#' + rank(item);
        row.insertCell().textContent = window.localCardProfile(item.player).name;
        row.insertCell().textContent = item.points;
      }
      card.append(table);
    }
    dialog.append(card, textAction('Back to my card', home));
  }
  function createPlayer() {
    screen('Create new player');
    const name = state.user.nickname.trim().slice(0, 48) || 'New player';
    const labels = [...jokes];
    const stats = Array.from({length: 2}, () => ({
      label: labels.splice(Math.floor(Math.random() * labels.length), 1)[0],
      rating: 1 + Math.floor(Math.random() * 5)
    }));
    const player = {name, position: '', cardPositions: [], rating: 3, elo: 1000,
      photo: 'player-placeholder.svg', stats};
    dialog.append(playerCard(player));
    edit(player, true);
  }
  function edit(original, creating = false) {
    const card = dialog.querySelector('.player-card');
    const player = creating ? original : window.localCardProfile(original);
    card.querySelector('.card-action')?.remove();
    card.querySelector('.profile-season-open')?.remove();
    card.classList.add('editing-card');
    const positions = new Set(player.cardPositions || player.position.split('/'));
    const picker = element('div');
    picker.className = 'position-picker';
    picker.hidden = !creating;
    const position = textAction([...positions].join(' · ') || 'Choose positions', () => {
      picker.hidden = !picker.hidden;
      position.setAttribute('aria-expanded', String(!picker.hidden));
    });
    position.setAttribute('aria-expanded', 'false');
    for (const role of ['GK', 'CB', 'CM', 'ST']) {
      const circle = button(role, () => {
        if (positions.has(role)) positions.delete(role);
        else positions.add(role);
        circle.setAttribute('aria-pressed', String(positions.has(role)));
        position.textContent = [...positions].join(' · ') || 'Choose positions';
      });
      circle.setAttribute('aria-pressed', String(positions.has(role)));
      picker.append(circle);
    }
    card.querySelector('.position').replaceWith(...(creating ? [picker] : [position, picker]));
    const portrait = card.querySelector('.portrait');
    const photoEditor = element('div');
    const photo = crop(photoEditor);
    const photoAction = textAction('', photo.open);
    photoAction.setAttribute('aria-label', 'Change photo');
    photoAction.title = 'Change photo';
    portrait.replaceWith(photoAction, photoEditor);
    photoAction.classList.add('photo-action');
    photoAction.append(portrait);
    const stats = player.stats.map(stat => ({...stat}));
    card.querySelectorAll('.stat').forEach((row, i) => {
      const stat = stats[i];
      const label = textAction(stat.label, () => {
        const field = element('input');
        Object.assign(field, {value: stat.label, maxLength: 70});
        field.setAttribute('aria-label', 'Joke ' + (i + 1));
        field.oninput = () => { stat.label = field.value; };
        field.onkeydown = event => { if (event.key === 'Enter') field.blur(); };
        field.onblur = () => {
          label.textContent = stat.label || 'Add a joke';
          field.replaceWith(label);
        };
        label.replaceWith(field);
        field.focus();
        field.select();
      });
      const scores = element('span');
      scores.className = 'joke-stars';
      const starButtons = Array.from({length: 5}, (_, index) => {
        const score = index + 1;
        const star = textAction('', () => {
          stat.rating = stat.rating === score ? 0 : score;
          updateStars();
        });
        star.setAttribute('aria-label', score + ' joke stars');
        scores.append(star);
        return star;
      });
      function updateStars() {
        starButtons.forEach((star, index) => {
          star.textContent = index < stat.rating ? '★' : '☆';
          star.setAttribute('aria-pressed', String(index < stat.rating));
        });
      }
      updateStars();
      row.replaceChildren(label, scores);
    });
    const name = card.querySelector('.player-name');
    let startingRating = 3;
    let newName;
    if (creating) {
      name.textContent = '';
      newName = input(name, 'Player name', 'name', 'text', player.name);
      newName.maxLength = 48;
      const ratingOptions = element('span');
      ratingOptions.className = 'joke-stars';
      const options = [2, 3, 4].map(score => {
        const option = textAction('★'.repeat(score), () => {
          startingRating = score;
          card.className = 'player-card editing-card ' + cardStyle({elo: 400 + 200 * score});
          options.forEach((node, i) => node.setAttribute('aria-pressed', String(i + 2 === score)));
        });
        option.setAttribute('aria-label', score + ' starting stars');
        option.setAttribute('aria-pressed', String(score === 3));
        return option;
      });
      ratingOptions.append(...options);
      name.nextElementSibling.replaceWith(ratingOptions);
    } else {
      const renameBox = element('div');
      renameBox.hidden = true;
      const proposedName = input(renameBox, 'New name (admin approval required)', 'name');
      proposedName.maxLength = 48;
      const request = textAction('Send name request', async () => {
        await api('rename', {name: proposedName.value});
        renameBox.hidden = true;
        message.textContent = 'Name request sent for approval.';
      });
      renameBox.append(request);
      name.replaceChildren(textAction(player.name, () => {
        renameBox.hidden = !renameBox.hidden;
        if (!renameBox.hidden) proposedName.focus();
      }));
      name.after(renameBox);
    }
    const actions = element('div');
    actions.append(textAction(creating ? 'Create player' : 'Save changes', () => change(creating ? 'create-player' : 'edit', {
      ...(creating ? {name: newName.value, rating: startingRating} : {}),
      positions: [...positions], photo: photo.photo(), stats
    })), textAction('Cancel', home));
    card.append(actions);
  }
  function review() {
    screen('Review name requests');
    dialog.append(element('p', 'Release an existing squad card if it was claimed by mistake.'));
    const select = element('select');
    select.setAttribute('aria-label', 'Claimed squad card');
    select.append(new Option('Choose a claimed card', ''));
    for (const key of state.claimed.filter(key => !state.profiles[key]?.created)) {
      select.append(new Option(state.profiles[key]?.name || key, key));
    }
    dialog.append(button('Send test email', async () => {
      await api('test-sign-in-alert', {});
      message.textContent = 'Google accepted the test email. Check your Gmail inbox.';
    }));
    dialog.append(select, button('Release claim', async () => {
      if (select.value && confirm('Release this card so it can be claimed again?')) {
        await change('unclaim', {player: select.value}, review);
      }
    }));
    if (!state.requests.length) dialog.append(element('p', 'No pending requests.'));
    for (const request of state.requests) {
      const old = state.profiles[request.player]?.name || request.player;
      const row = element('div');
      row.append(element('p', old + ' → ' + request.name));
      for (const [label, decision] of [['Approve', 'approved'], ['Decline', 'declined']]) {
        row.append(button(label, () => change('review', {id: request.id, decision}, review)));
      }
      dialog.append(row);
    }
    dialog.append(button('Back', home));
  }
  entry.onclick = home;
  refresh().then(() => {
    if (params.has('sign-in')) {
      home();
      if (params.get('sign-in') === 'restricted') message.textContent = 'This Google account could not sign in. Check that your email is verified and the site is open to your account.';
      if (params.get('sign-in') === 'failed') message.textContent = 'Google sign-in did not complete. Please try again.';
      history.replaceState(null, '', location.pathname + location.hash);
    } else if (params.has('admin')) state.user?.admin ? review() : auth();
  }).catch(error => console.warn('Local account preview unavailable', error));
})();
