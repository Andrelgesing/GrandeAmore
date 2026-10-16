const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  class Element extends EventTarget {
    constructor() {
      super(); this.hidden = false; this.open = false; this.paused = true;
      this.currentTime = 0; this.attrs = {}; this.classList = { toggle() {} };
    }
    setAttribute(name, value) { this.attrs[name] = value; }
    getAttribute(name) { return this.attrs[name]; }
    set src(value) { this.attrs.src = value; }
    querySelector(selector) { return element(`${this.id} ${selector}`); }
    pause() { this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
    load() { this.currentTime = 0; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
    click() { this.dispatchEvent(new Event('click')); }
  }
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) { const el = new Element(); el.id = id; elements.set(id, el); }
    return elements.get(id);
  };
  const document = new EventTarget(); document.hidden = false; document.querySelector = element;
  const mobile = new EventTarget(); mobile.matches = false;
  const window = new EventTarget(); window.matchMedia = () => mobile;
  let timer, intersect;
  vm.runInNewContext(fs.readFileSync(__dirname + '/home-highlights.js', 'utf8'), {
    document, window,
    setTimeout: (callback, ms) => { timer = { callback, ms }; return 1; },
    clearTimeout: () => { timer = null; },
    IntersectionObserver: class { constructor(callback) { intersect = callback; } observe() {} }
  });
  intersect([{ isIntersecting: true }]);
  return { element, mobile, document, timer: () => timer };
}

test('cycles award (6s), pack one, award (6s), pack two, then award', () => {
  const s = setup(); const el = s.element;
  const src = () => el('#reveal-preview source').getAttribute('src');
  assert.equal(s.timer().ms, 6000);
  s.timer().callback();
  assert.equal(el('#award-results-open').hidden, true);
  assert.equal(src(), 'assets/videos/new-players-reveal.mp4');
  assert.equal(el('#reveal-preview').muted, true);
  el('#reveal-preview').dispatchEvent(new Event('ended'));
  assert.equal(el('#award-results-open').hidden, false);
  assert.equal(s.timer().ms, 6000);
  s.timer().callback();
  assert.equal(src(), 'assets/videos/new-players-reveal-02.mp4');
  el('#reveal-preview').dispatchEvent(new Event('ended'));
  assert.equal(el('#award-results-open').hidden, false);
  s.timer().callback();
  assert.equal(src(), 'assets/videos/new-players-reveal.mp4');
});

test('Next follows the cycle; mobile format and audible modal follow the active pack', () => {
  const s = setup(); const el = s.element;
  el('#feature-next').click(); el('#feature-next').click(); el('#feature-next').click();
  s.mobile.matches = true; s.mobile.dispatchEvent(new Event('change'));
  for (const id of ['#reveal-preview', '#reveal-large']) {
    assert.equal(el(`${id} source`).getAttribute('src'), 'assets/videos/new-players-reveal-02-mobile.mp4');
    assert.match(el(id).poster, /poster-02-mobile\.jpg$/);
  }
  el('#reveal-open').click();
  assert.equal(el('#reveal-dialog').open, true);
  assert.equal(el('#reveal-preview').paused, true);
  assert.equal(el('#reveal-large').muted, false);
  assert.equal(el('#reveal-large').paused, false);
  el('#reveal-close').click();
  assert.equal(el('#reveal-large').paused, true);
  assert.equal(el('#award-results-open').hidden, false);
  assert.equal(s.timer().ms, 6000);
});

test('hidden pages suspend playback and timers', () => {
  const s = setup(); const el = s.element;
  el('#feature-next').click();
  s.document.hidden = true; s.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(el('#reveal-preview').paused, true);
  assert.equal(s.timer(), null);
});
