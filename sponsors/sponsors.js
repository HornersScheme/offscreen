const modal = document.querySelector('.pilot-modal');
const form = document.querySelector('#pilot-form');
const success = document.querySelector('.pilot-success');

document.querySelectorAll('[data-open-pilot]').forEach((button) => {
  button.addEventListener('click', () => modal.showModal());
});

document.querySelector('[data-close-pilot]').addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.close();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  form.hidden = true;
  success.hidden = false;
});

const sponsorDemoButton = document.querySelector('[data-sponsor-demo]');
const flowTimer = document.querySelector('[data-flow-timer]');
const beforeCard = sponsorDemoButton?.closest('.flow-card');
const afterCard = document.querySelector('.flow-card.after');

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

sponsorDemoButton?.addEventListener('click', () => {
  if (sponsorDemoButton.disabled) return;
  const totalSeconds = 25 * 60;
  const animationDuration = 7200;
  const startedAt = performance.now();
  sponsorDemoButton.disabled = true;
  sponsorDemoButton.textContent = 'Focusing…';
  beforeCard?.classList.add('is-running');

  const tick = (now) => {
    const progress = Math.min((now - startedAt) / animationDuration, 1);
    flowTimer.textContent = formatTime(Math.max(0, Math.ceil(totalSeconds * (1 - progress))));
    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }
    beforeCard?.classList.remove('is-running');
    afterCard?.classList.add('is-complete');
    sponsorDemoButton.textContent = 'Reward unlocked';
  };
  requestAnimationFrame(tick);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
  observer.observe(element);
});
