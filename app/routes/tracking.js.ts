/**
 * GET /tracking.js
 * Serves the storefront tracking script.
 * Public — no auth. Injected via Shopify ScriptTag API.
 */

import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const appUrl = new URL(request.url).origin;

  const script = `
(function() {
  var SESSION_KEY = 'aisa_v1';
  var APP_URL = '${appUrl}';

  // Get or create anonymous session token
  function getToken() {
    try {
      var t = sessionStorage.getItem(SESSION_KEY);
      if (!t) {
        t = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(SESSION_KEY, t);
      }
      return t;
    } catch(e) { return 'ns_' + Date.now(); }
  }

  // Parse UTM params from URL
  function getUtm() {
    try {
      var p = new URLSearchParams(window.location.search);
      return {
        utmSource: p.get('utm_source'),
        utmMedium: p.get('utm_medium'),
        utmCampaign: p.get('utm_campaign')
      };
    } catch(e) { return {}; }
  }

  function post(path, data) {
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon(APP_URL + path, new Blob([JSON.stringify(data)], {type:'application/json'}))
        : fetch(APP_URL + path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), keepalive:true});
    } catch(e) {}
  }

  var token = getToken();
  var utm = getUtm();
  var shop = (window.Shopify && window.Shopify.shop) ? window.Shopify.shop : location.hostname;

  // Register session on first load
  post('/api/session', {
    shopDomain: shop,
    token: token,
    referrer: document.referrer || null,
    utmSource: utm.utmSource || null,
    utmMedium: utm.utmMedium || null,
    utmCampaign: utm.utmCampaign || null,
    landingPage: location.pathname
  });

  // Track add-to-cart clicks
  document.addEventListener('click', function(e) {
    var btn = e.target && (e.target.closest('[data-add-to-cart]') || e.target.closest('[name="add"]') || e.target.closest('.add-to-cart'));
    if (btn) {
      post('/api/event', { token: token, eventType: 'add_to_cart', page: location.pathname });
    }
  }, true);

  // Track checkout start
  document.addEventListener('click', function(e) {
    var btn = e.target && (e.target.closest('[name="checkout"]') || e.target.closest('[href*="/checkout"]'));
    if (btn) {
      post('/api/event', { token: token, eventType: 'checkout_started', page: location.pathname });
    }
  }, true);
})();
`.trim();

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
