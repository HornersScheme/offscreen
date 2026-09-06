import { createClient } from '@supabase/supabase-js';

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

function trackEvent(name, properties = {}) {
  window.dispatchEvent(new CustomEvent('offscreen:analytics', { detail: { name, properties } }));
  console.debug(`[Offscreen event] ${name}`, properties);
}

document.querySelectorAll('[data-open-pilot]').forEach((button) => {
  button.addEventListener('click', () => {
    activeTrigger = button;
    trackEvent('sponsor_pilot_modal_opened', { source: getAttribution().source });
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
  trackEvent('sponsor_pilot_submitted', { source: attribution.source, focus_type: focusType });

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

    trackEvent(isDuplicate ? 'sponsor_pilot_duplicate' : 'sponsor_pilot_success', {
      source: attribution.source,
      focus_type: focusType,
    });
    successTitle.textContent = isDuplicate ? 'Request already received.' : 'Request received.';
    form.hidden = true;
    success.hidden = false;
    requestAnimationFrame(() => success.focus());
  } catch (error) {
    console.error('Offscreen sponsor-pilot submission failed.', { code: error?.code, message: error?.message });
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
