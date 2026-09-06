import { createClient } from '@supabase/supabase-js';

const modal = document.querySelector('.join-modal');
const form = document.querySelector('#early-access-form');
const signupState = document.querySelector('[data-signup-state]');
const successState = document.querySelector('[data-success-state]');
const successTitle = document.querySelector('[data-success-title]');
const emailInput = document.querySelector('#email');
const categoryInputs = [...document.querySelectorAll('input[name="focus_category"]')];
const submitButton = document.querySelector('.signup-submit');
const emailError = document.querySelector('[data-email-error]');
const categoryError = document.querySelector('[data-category-error]');
const submitError = document.querySelector('[data-submit-error]');
const alphaButton = document.querySelector('[data-alpha-interest]');
const alphaLaterButton = document.querySelector('[data-alpha-later]');
const alphaInvite = document.querySelector('[data-alpha-invite]');
const alphaError = document.querySelector('[data-alpha-error]');
const alphaConfirmation = document.querySelector('[data-alpha-confirmation]');
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

let activeTrigger = null;
let submittedEmail = '';
let isSubmitting = false;
let isSubmittingAlpha = false;

function trackEvent(name, properties = {}) {
  window.dispatchEvent(new CustomEvent('offscreen:analytics', { detail: { name, properties } }));
  console.debug(`[Offscreen event] ${name}`, properties);
}

function normalizeAttributionValue(value) {
  return value?.trim().toLowerCase().slice(0, 100) || null;
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  let source = normalizeAttributionValue(params.get('utm_source'));

  if (!source && document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      source = referrer.hostname === window.location.hostname
        ? 'direct'
        : referrer.hostname.replace(/^www\./, '').slice(0, 100);
    } catch {
      source = 'direct';
    }
  }

  return {
    source: source || 'direct',
    utm_medium: normalizeAttributionValue(params.get('utm_medium')),
    utm_campaign: normalizeAttributionValue(params.get('utm_campaign')),
  };
}

function selectedCategory() {
  return categoryInputs.find((input) => input.checked)?.value || '';
}

function emailIsValid() {
  return emailInput.value.trim() !== '' && emailInput.validity.valid;
}

function updateSubmitState() {
  submitButton.disabled = isSubmitting || !emailIsValid() || !selectedCategory();
}

function showEmailError() {
  emailError.textContent = emailIsValid() ? '' : 'Enter a valid email address.';
  emailInput.setAttribute('aria-invalid', String(!emailIsValid()));
}

function showCategoryError() {
  const valid = Boolean(selectedCategory());
  categoryError.textContent = valid ? '' : 'Choose one focus category.';
  document.querySelector('.focus-fieldset').setAttribute('aria-invalid', String(!valid));
}

function showSuccess(isDuplicate = false) {
  signupState.hidden = true;
  successState.hidden = false;
  successTitle.textContent = isDuplicate ? 'Looks like you’re already on the list.' : 'You’re in.';
  modal.setAttribute('aria-labelledby', 'success-title');
  requestAnimationFrame(() => alphaButton.focus());
}

document.querySelectorAll('[data-open-modal]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    activeTrigger = button;
    trackEvent('early_access_modal_opened', { source: getAttribution().source });
    modal.showModal();
    requestAnimationFrame(() => emailInput.focus());
  });
});

document.querySelector('[data-close-modal]').addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => {
  if (event.target !== modal) return;
  const bounds = modal.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (outside) modal.close();
});
modal.addEventListener('close', () => activeTrigger?.focus());

emailInput.addEventListener('input', () => {
  if (emailError.textContent) showEmailError();
  submitError.textContent = '';
  updateSubmitState();
});
emailInput.addEventListener('blur', showEmailError);
categoryInputs.forEach((input) => input.addEventListener('change', () => {
  categoryError.textContent = '';
  document.querySelector('.focus-fieldset').setAttribute('aria-invalid', 'false');
  submitError.textContent = '';
  updateSubmitState();
}));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  showEmailError();
  showCategoryError();
  if (!emailIsValid() || !selectedCategory()) return;

  isSubmitting = true;
  updateSubmitState();
  submitButton.querySelector('span').textContent = 'Joining…';
  submitError.textContent = '';
  submittedEmail = emailInput.value.trim().toLowerCase();
  const attribution = getAttribution();
  trackEvent('early_access_submitted', { source: attribution.source, focus_category: selectedCategory() });

  try {
    if (!supabase) throw new Error('Supabase public environment variables are not configured.');
    const { error } = await supabase.from('early_access').insert({
      email: submittedEmail,
      focus_category: selectedCategory(),
      ...attribution,
    });

    if (error?.code === '23505') {
      trackEvent('early_access_duplicate', { source: attribution.source });
      showSuccess(true);
      return;
    }
    if (error) throw error;

    trackEvent('early_access_success', { source: attribution.source, focus_category: selectedCategory() });
    showSuccess();
  } catch (error) {
    console.error('Offscreen early-access submission failed.', { code: error?.code, message: error?.message });
    submitError.textContent = 'Couldn’t join right now. Please try again.';
  } finally {
    isSubmitting = false;
    submitButton.querySelector('span').textContent = 'Join early access';
    updateSubmitState();
  }
});

alphaButton.addEventListener('click', async () => {
  if (isSubmittingAlpha || !submittedEmail) return;
  isSubmittingAlpha = true;
  alphaButton.disabled = true;
  alphaButton.textContent = 'Saving…';
  alphaError.textContent = '';
  const { source } = getAttribution();
  trackEvent('alpha_interest_clicked', { source });

  try {
    if (!supabase) throw new Error('Supabase public environment variables are not configured.');
    const { error } = await supabase.from('alpha_interest').insert({ email: submittedEmail, source });
    if (error && error.code !== '23505') throw error;
    trackEvent('alpha_interest_success', { source });
    alphaInvite.hidden = true;
    alphaConfirmation.hidden = false;
    alphaConfirmation.focus();
  } catch (error) {
    console.error('Offscreen alpha-interest submission failed.', { code: error?.code, message: error?.message });
    alphaError.textContent = 'Couldn’t save that right now. Please try again.';
    alphaButton.disabled = false;
    alphaButton.textContent = 'I’d test it';
  } finally {
    isSubmittingAlpha = false;
  }
});

alphaLaterButton.addEventListener('click', () => modal.close());

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
