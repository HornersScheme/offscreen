const modal = document.querySelector('.join-modal');
const form = document.querySelector('#early-access-form');
const success = document.querySelector('.form-success');

document.querySelectorAll('[data-open-modal]').forEach((button) => {
  button.addEventListener('click', () => modal.showModal());
});

document.querySelector('[data-close-modal]').addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.close();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  form.hidden = true;
  success.hidden = false;
});

const focusButton = document.querySelector('[data-focus-demo]');
const timer = document.querySelector('[data-session-timer]');
const status = document.querySelector('[data-session-status]');
const ring = document.querySelector('[data-timer-ring]');
const sessionCard = document.querySelector('.session-card');
const rewardLabel = document.querySelector('[data-reward-label]');
const rewardValue = document.querySelector('[data-reward-value]');
const completionLink = document.querySelector('.completion-link');

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

focusButton.addEventListener('click', () => {
  if (focusButton.disabled) return;
  const totalSeconds = 25 * 60;
  const animationDuration = 9000;
  const startedAt = performance.now();
  focusButton.disabled = true;
  focusButton.textContent = 'Focusing…';
  status.textContent = 'focus mode';
  sessionCard.classList.add('is-running');

  const tick = (now) => {
    const elapsed = now - startedAt;
    const progress = Math.min(elapsed / animationDuration, 1);
    const secondsLeft = Math.max(0, Math.ceil(totalSeconds * (1 - progress)));
    timer.textContent = formatTime(secondsLeft);
    ring.style.setProperty('--timer-progress', `${Math.max(0, 86 * (1 - progress))}%`);

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    sessionCard.classList.remove('is-running');
    sessionCard.classList.add('is-complete');
    status.textContent = 'complete';
    rewardLabel.textContent = 'Focus complete — reward unlocked';
    rewardValue.textContent = '+€0.10';
    focusButton.textContent = 'Reward unlocked';
    completionLink.hidden = false;
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
  element.style.transitionDelay = `${Math.min(index % 5, 4) * 70}ms`;
  observer.observe(element);
});
