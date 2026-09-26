// Checks what the dashboard does when the hub cannot be reached.
//
//     node test-offline-cache.js
//
// The hub is one service on one NAS, and when it is down the app used to
// replace the whole screen with an error panel — which took the forecast down
// with it, even though the forecast comes straight from Open-Meteo and was
// never affected. These checks pin the three things that has to mean: the last
// good reading is stored, it comes back with its age advanced rather than
// frozen, and the forecast panel is rendered either way.
//
// No network, no DOM, no dependencies.

const fs = require('fs'), vm = require('vm');

// A clock the test can move, so "the reading got older while the hub was down"
// is an assertion rather than a sleep.
let nowMs = Date.parse('2026-09-26T10:00:00Z');
class FakeDate extends Date {
  constructor(...args) { if (args.length === 0) super(nowMs); else super(...args); }
  static now() { return nowMs; }
}

const store = {};
const panel = { innerHTML: '' };
const lastEl = { textContent: '', style: {} };

const ctx = {
  console: { log(){}, warn(){}, error(){} },
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  },
  document: {
    getElementById: id => {
      if (id === 'forecast-panel') return null;        // skip the Open-Meteo fetch
      if (id === 'dashboard-container') return panel;
      if (id === 'last-updated') return lastEl;
      return { textContent: '', style: {} };
    },
  },
  setInterval: () => 1,
  requestAnimationFrame: () => 0,
  setTimeout: () => 0,
  Date: FakeDate, JSON, Math, isFinite, parseFloat, String, Number, Promise,
};
ctx.window = ctx;
ctx.APP_CONFIG = { hub: { baseUrl: 'http://192.168.18.250:5000/', readToken: 'abc' } };

const payload = { age_seconds: 30.0, aqi: 1, humidity_pct: 57.6, pm1: 1.0, pm10: 3.0,
  pm25: 2.0, pressure_hpa: 987.7, recorded_at: '2026-09-26T11:59:30',
  stale: false, temperature_c: 22.5 };
ctx.fetch = async () => ({ ok: true, status: 200, json: async () => payload });

vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dashboard.js', 'utf8'), ctx);

(async () => {
  const fail = [];
  const eq = (name, got, want) => { if (got !== want) fail.push(`${name}: got ${got}, want ${want}`); };
  const has = (h, t) => h.indexOf(t) !== -1;

  // --- a good fetch stores the reading ---------------------------------------
  await ctx.fetchAndRenderDashboard();
  if (!store.lastReading) fail.push('healthy: nothing was stored');
  const htmlFresh = panel.innerHTML;
  if (has(htmlFresh, 'stale-data')) fail.push('healthy: panels dimmed while the hub is up');
  if (!has(htmlFresh, 'id="forecast-panel"')) fail.push('healthy: no forecast panel');
  eq('healthy: timestamp line not marked offline', has(lastEl.textContent, 'HUB UNREACHABLE'), false);

  // --- the hub goes away: the stored reading comes back, older ---------------
  nowMs += 3 * 3600 * 1000;   // three hours later
  const found = ctx.renderOfflineDashboard();
  eq('offline: a stored reading was found', found, true);

  const htmlOffline = panel.innerHTML;
  if (!has(htmlOffline, '22.5°C')) fail.push('offline: stored temperature not shown');
  if (!has(htmlOffline, 'id="forecast-panel"')) fail.push('offline: forecast panel dropped');
  if (!has(htmlOffline, 'stale-data')) fail.push('offline: sensor panels not dimmed');

  // The forecast is live even when the hub is not, so it must NOT be dimmed.
  const forecastSection = htmlOffline.slice(htmlOffline.indexOf('forecast-panel') - 60);
  if (has(forecastSection.slice(0, 120), 'stale-data')) fail.push('offline: forecast panel dimmed too');

  // Age advanced by the elapsed time rather than replaying what the hub said.
  // 30s when it was fetched, plus three hours, reads as "3 h".
  if (!has(lastEl.textContent, 'HUB UNREACHABLE')) fail.push('offline: timestamp line does not say the hub is gone');
  if (!has(lastEl.textContent, '3 h old')) {
    fail.push('offline: age not advanced - line reads "' + lastEl.textContent + '"');
  }

  // --- a fresh television with nothing stored --------------------------------
  delete store.lastReading;
  const foundNone = ctx.renderOfflineDashboard();
  eq('cold: reports nothing stored', foundNone, false);
  const htmlCold = panel.innerHTML;
  if (!has(htmlCold, 'id="forecast-panel"')) fail.push('cold: no forecast panel - this is the bug being fixed');
  if (!has(htmlCold, 'N/A')) fail.push('cold: sensor values not shown as N/A');
  if (has(htmlCold, '0.0 µg/m³')) fail.push('cold: a missing PM rendered as 0.0');
  if (!has(lastEl.textContent, 'no stored reading')) fail.push('cold: timestamp line misleading');

  // --- the layout does not move between any of the three states -------------
  const count = (h, re) => (h.match(re) || []).length;
  const boxes = h => [
    'section=' + count(h, /<section/g),
    'panel=' + count(h, /class="dashboard-panel/g),
    'metric-display=' + count(h, /class="metric-display/g),
    'metric-row=' + count(h, /class="metric-row"/g),
    'pm-row=' + count(h, /class="pm-row"/g),
    'temp-display=' + count(h, /class="temp-display"/g),
  ].join(' ');
  for (const [name, h] of [['offline', htmlOffline], ['cold', htmlCold]]) {
    if (boxes(h) !== boxes(htmlFresh)) {
      fail.push('layout: ' + name + ' differs from healthy\n    healthy: ' + boxes(htmlFresh) +
                '\n    ' + name + ': ' + boxes(h));
    }
  }

  // --- unreadable storage must not take the dashboard down -------------------
  ctx.localStorage.getItem = () => { throw new Error('storage disabled'); };
  let threw = false;
  try { ctx.renderOfflineDashboard(); } catch (e) { threw = true; }
  eq('storage unavailable: still renders', threw, false);

  if (fail.length) { console.log('FAIL\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log('all checks passed — reading cached, age advances, forecast survives a hub outage');
})();
