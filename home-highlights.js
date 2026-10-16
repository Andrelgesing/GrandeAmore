// Keep the award and player reveal in the same home-page feature space.
(() => {
  const section = document.querySelector('#ballon-dor');
  const award = document.querySelector('#award-results-open');
  const reveal = document.querySelector('#reveal-open');
  const preview = document.querySelector('#reveal-preview');
  const modal = document.querySelector('#reveal-dialog');
  const large = document.querySelector('#reveal-large');
  const next = document.querySelector('#feature-next');
  const results = document.querySelector('#award-results-dialog');
  const stage = section.querySelector('.home-feature-stage');
  const mobile = window.matchMedia('(max-width: 650px)');
  // Award → first pack → award → second pack, then repeat.
  const packs = [
    { suffix: '', label: 'Alexander, Momo, Manuel and legendary Giorgios card reveal' },
    { suffix: '-02', label: 'Mostafa, Johny, Leandro and Ronaldo card reveal' }
  ];
  let selected = 0;
  const isAward = () => selected % 2 === 0;
  const advance = () => select((selected + 1) % 4);
  let inView = false;
  let timer;
  let playbackAttempt = 0;

  const active = () => inView && !document.hidden &&
    !document.querySelector('#home-view').hidden && !modal.open && !results.open;
  function stop() {
    clearTimeout(timer);
    playbackAttempt++;
    preview.pause();
  }
  function update() {
    stop();
    if (!active()) return;
    if (isAward()) {
      timer = setTimeout(advance, 6000);
    } else {
      preview.muted = true;
      const attempt = playbackAttempt;
      preview.play().catch(error => {
        // A newer selection or a pause can cancel an outstanding play request.
        if (attempt === playbackAttempt && error.name !== 'AbortError') advance();
      });
    }
  }
  function select(which) {
    stop();
    selected = which;
    award.hidden = !isAward();
    reveal.hidden = isAward();
    stage.classList.toggle('showing-players', !isAward());
    setVideoFormat();
    if (!isAward()) preview.currentTime = 0;
  }
  next.addEventListener('click', advance);
  function setVideoFormat() {
    stop();
    const suffix = mobile.matches ? '-mobile' : '';
    const pack = packs[Math.floor(selected / 2)];
    preview.setAttribute('aria-label', pack.label);
    large.setAttribute('aria-label', pack.label);
    for (const video of [preview, large]) {
      const playing = video === large && modal.open && !video.paused;
      video.pause();
      video.poster = `assets/videos/new-players-poster${pack.suffix}${suffix}.jpg`;
      const source = video.querySelector('source');
      const url = `assets/videos/new-players-reveal${pack.suffix}${suffix}.mp4`;
      if (source.getAttribute('src') !== url) {
        source.src = url;
        video.load();
      }
      if (playing) video.play().catch(() => {});
    }
    update();
  }
  mobile.addEventListener('change', setVideoFormat);
  setVideoFormat();
  preview.addEventListener('ended', () => { if (!isAward()) advance(); });
  preview.addEventListener('error', () => { if (!isAward()) advance(); });
  reveal.addEventListener('click', () => {
    stop();
    modal.showModal();
    large.currentTime = 0;
    large.muted = false;
    // Called directly from a user gesture so browsers can allow sound.
    large.play().catch(() => { /* Native controls remain available. */ });
  });
  document.querySelector('#reveal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    const box = modal.getBoundingClientRect();
    if (event.target === modal && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) modal.close();
  });
  modal.addEventListener('close', () => {
    large.pause();
    large.currentTime = 0;
    advance();
  });
  award.addEventListener('click', stop);
  results.addEventListener('close', update);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) large.pause();
    update();
  });
  window.addEventListener('hashchange', () => {
    if (modal.open) modal.close();
    update();
  });
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    update();
  }, { threshold: 0.15 }).observe(section);
})();
