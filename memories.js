const memories = [
  {
    "src": "memory/00006834-PHOTO-2025-08-24-20-01-17.jpg",
    "date": "2025-08-24"
  },
  {
    "src": "memory/00006848-PHOTO-2025-08-24-20-02-48.jpg",
    "date": "2025-08-24"
  },
  {
    "src": "memory/00008056-PHOTO-2025-11-09-19-39-56.jpg",
    "date": "2025-11-09"
  },
  {
    "src": "memory/00008195-PHOTO-2025-11-15-22-43-20.jpg",
    "date": "2025-11-15"
  },
  {
    "src": "memory/00009593-PHOTO-2026-03-01-19-25-32.jpg",
    "date": "2026-03-01"
  },
  {
    "src": "memory/00010076-PHOTO-2026-03-15-19-30-19.jpg",
    "date": "2026-03-15"
  },
  {
    "src": "memory/00012049-PHOTO-2026-07-19-19-41-58.jpg",
    "date": "2026-07-19"
  }
];
const memoryImage = document.querySelector('#memory-image');
const memoryDate = document.querySelector('#memory-date');
const memoryCount = document.querySelector('#memory-count');
const pauseButton = document.querySelector('#memory-pause');
let order = [...memories];
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}
let memoryIndex = 0;
let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function renderMemory() {
  const memory = order[memoryIndex];
  memoryImage.src = memory.src;
  memoryImage.alt = `Grande Amore memory ${memoryIndex + 1} of ${order.length}`;
  memoryDate.dateTime = memory.date || '';
  memoryDate.textContent = memory.date
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(memory.date + 'T12:00:00Z'))
    : 'Date unavailable';
  memoryCount.textContent = `${memoryIndex + 1} / ${order.length}`;
}
function moveMemory(step) {
  memoryIndex = (memoryIndex + step + order.length) % order.length;
  renderMemory();
}
function renderPause() {
  pauseButton.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
  pauseButton.setAttribute('aria-pressed', String(paused));
}
let memoryTimer;
function restartTimer() {
  clearInterval(memoryTimer);
  memoryTimer = setInterval(() => {
    if (!paused && !document.hidden && location.hash === '#memory-lane') moveMemory(1);
  }, 6000);
}
document.querySelector('#memory-prev').addEventListener('click', () => { moveMemory(-1); restartTimer(); });
document.querySelector('#memory-next').addEventListener('click', () => { moveMemory(1); restartTimer(); });
pauseButton.addEventListener('click', () => { paused = !paused; renderPause(); restartTimer(); });
window.addEventListener('hashchange', restartTimer);
renderMemory();
renderPause();
restartTimer();
