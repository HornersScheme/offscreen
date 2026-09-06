const websiteId = import.meta.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const scriptUrl = import.meta.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const domains = import.meta.env.NEXT_PUBLIC_UMAMI_DOMAINS;
const analyticsEnabled = import.meta.env.PROD && Boolean(websiteId && scriptUrl);

const allowedProperties = {
  cta_clicked: ['cta', 'location'],
  early_access_modal_opened: ['source'],
  early_access_focus_selected: ['focus_category'],
  early_access_submitted: ['focus_category', 'source', 'utm_medium', 'utm_campaign'],
  early_access_success: ['focus_category', 'source'],
  early_access_duplicate: ['source'],
  alpha_interest_clicked: ['source'],
  alpha_interest_success: ['source'],
  sponsor_page_viewed: ['source', 'utm_medium', 'utm_campaign'],
  sponsor_primary_cta_clicked: ['location', 'source'],
  sponsor_secondary_cta_clicked: ['location', 'source'],
  sponsor_contact_started: ['location', 'source'],
  sponsor_form_started: ['focus_type', 'source'],
  sponsor_form_submitted: ['focus_type', 'source', 'utm_medium', 'utm_campaign'],
  sponsor_form_success: ['focus_type', 'source', 'duplicate'],
  sponsor_form_error: ['focus_type', 'source'],
};

const pendingEvents = [];

function safeProperties(name, properties) {
  const permittedKeys = allowedProperties[name] || [];

  return Object.fromEntries(
    permittedKeys
      .filter((key) => properties[key] !== null && properties[key] !== undefined && properties[key] !== '')
      .map((key) => [key, properties[key]]),
  );
}

function sendEvent(name, properties) {
  if (typeof window.umami?.track !== 'function') return false;
  window.umami.track(name, properties);
  return true;
}

function flushPendingEvents() {
  while (pendingEvents.length) {
    const event = pendingEvents.shift();
    sendEvent(event.name, event.properties);
  }
}

function loadUmami() {
  if (!analyticsEnabled || document.querySelector('script[data-offscreen-analytics]')) return;

  const script = document.createElement('script');
  script.src = scriptUrl;
  script.defer = true;
  script.dataset.websiteId = websiteId;
  script.dataset.offscreenAnalytics = 'true';
  script.dataset.doNotTrack = 'true';
  if (domains) script.dataset.domains = domains;
  script.addEventListener('load', flushPendingEvents, { once: true });
  script.addEventListener('error', () => pendingEvents.splice(0), { once: true });
  document.head.append(script);
}

export function trackEvent(name, properties = {}) {
  const filteredProperties = safeProperties(name, properties);
  window.dispatchEvent(new CustomEvent('offscreen:analytics', {
    detail: { name, properties: filteredProperties },
  }));

  if (!analyticsEnabled) return;
  if (!sendEvent(name, filteredProperties)) pendingEvents.push({ name, properties: filteredProperties });
}

function normalizeAttributionValue(value) {
  return value?.trim().toLowerCase().slice(0, 100) || null;
}

export function getAttribution() {
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

loadUmami();
