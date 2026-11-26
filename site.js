const gallery = document.querySelector('.gallery');
const video = gallery.querySelector('video');
const buttons = gallery.querySelectorAll('button');
buttons.forEach(button => button.addEventListener('click', () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  const id = button.dataset.id;
  const base = gallery.dataset.assets + id;
  video.pause();
  video.poster = base + '.webp';
  video.src = base + '.mp4';
  document.getElementById('scene-title').textContent = button.dataset.label + ' · ' + id;
  buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  video.play().catch(() => {});
}));
document.querySelectorAll('[data-lang]').forEach(link => {
  link.addEventListener('click', () => { link.hash = location.hash; });
});
const copy = document.getElementById('copy');
const feedback = document.getElementById('copy-feedback');
let feedbackTimer;
copy.addEventListener('click', async () => {
  const bib = document.getElementById('bib');
  try {
    await navigator.clipboard.writeText(bib.textContent);
    feedback.textContent = copy.dataset.ok;
  } catch {
    const range = document.createRange();
    range.selectNodeContents(bib);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    feedback.textContent = copy.dataset.fail;
  }
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => { feedback.textContent = ''; }, 2500);
});
