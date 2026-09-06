import { createClient } from '@supabase/supabase-js';
import { getAttribution, trackEvent } from '../analytics.js';

const modal = document.querySelector('.pilot-modal');
const form = document.querySelector('#pilot-form');
const success = document.querySelector('.pilot-success');
const successTitle = success.querySelector('h3');
const submitButton = form.querySelector('button[type="submit"]');
const submitError = document.querySelector('[data-pilot-error]');
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

let activeTrigger = null;
let isSubmitting = false;
let contactStarted = false;
let formStarted = false;

trackEvent('sponsor_page_viewed', getAttribution());

document.querySelectorAll('[data-open-pilot]').forEach((button) => {
  button.addEventListener('click', () => {
    activeTrigger = button;
    const location = button.dataset.ctaLocation;
    const { source } = getAttribution();
    const eventName = button.dataset.ctaPriority === 'primary'
      ? 'sponsor_primary_cta_clicked'
      : 'sponsor_secondary_cta_clicked';
    trackEvent(eventName, { location, source });
    if (!contactStarted) {
      contactStarted = true;
      trackEvent('sponsor_contact_started', { location, source });
    }
    modal.showModal();
    requestAnimationFrame(() => form.elements.email.focus());
  });
});

document.querySelector('[data-close-pilot]').addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.close();
});
modal.addEventListener('close', () => activeTrigger?.focus());

form.addEventListener('input', () => {
  submitError.textContent = '';
  if (!formStarted) {
    formStarted = true;
    trackEvent('sponsor_form_started', {
      focus_type: form.elements.focus.value,
      source: getAttribution().source,
    });
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting || !form.reportValidity()) return;

  isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  submitError.textContent = '';

  const workEmail = form.elements.email.value.trim().toLowerCase();
  const company = form.elements.company.value.trim();
  const focusType = form.elements.focus.value;
  const attribution = getAttribution();
  trackEvent('sponsor_form_submitted', { focus_type: focusType, ...attribution });

  try {
    if (!supabase) throw new Error('Supabase public environment variables are not configured.');
    const { error } = await supabase.from('sponsor_interest').insert({
      work_email: workEmail,
      company,
      focus_type: focusType,
      ...attribution,
    });

    const isDuplicate = error?.code === '23505';
    if (error && !isDuplicate) throw error;

    trackEvent('sponsor_form_success', {
      source: attribution.source,
      focus_type: focusType,
      duplicate: isDuplicate,
    });
    successTitle.textContent = isDuplicate ? 'Request already received.' : 'Request received.';
    form.hidden = true;
    success.hidden = false;
    requestAnimationFrame(() => success.focus());
  } catch (error) {
    console.error('Offscreen sponsor-pilot submission failed.', { code: error?.code, message: error?.message });
    trackEvent('sponsor_form_error', { source: attribution.source, focus_type: focusType });
    submitError.textContent = 'Couldn’t send your request right now. Please try again.';
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Request a founding pilot';
  }
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
