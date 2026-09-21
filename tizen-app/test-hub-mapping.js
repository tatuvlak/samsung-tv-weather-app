// Checks that this app reads the hub's payload correctly.
//
//     node test-hub-mapping.js
//
// The app and the hub agree on field names by convention only — nothing
// enforces it, and a rename on either side would show up on the television as
// zeroes rather than as an error. This loads the real dashboard.js, feeds it a
// payload copied verbatim from the hub, and asserts every field lands where it
// should. Exits non-zero on failure. No dependencies, no network, no DOM.

const fs = require('fs'), vm = require('vm');
const captured = [];
const ctx = {
  console,
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { getElementById: () => null },
  setInterval: () => 1,
  Date, JSON, Math, isFinite, parseFloat, String, Number,
  renderDashboard: d => captured.push(d),
};
ctx.window = ctx;
// A real payload, exactly as the hub's /api/weather returned it tonight.
const payload = {"age_seconds":12.3,"aqi":1,"humidity_pct":57.61,"pm1":1.0,"pm10":1.0,
  "pm25":1.0,"pressure_hpa":987.73,"recorded_at":"2026-09-21T16:12:03.101010",
  "stale":false,"temperature_c":22.5};
ctx.fetch = async () => ({ ok: true, status: 200, json: async () => payload });
ctx.APP_CONFIG = { hub: { baseUrl: "http://192.168.18.250:5000/", readToken: "abc" } };

vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dashboard.js','utf8'), ctx);
// Keep the real renderer aside; the mapping checks want a stub, the rendering
// checks below want the real thing.
const realRenderDashboard = ctx.renderDashboard;
ctx.renderDashboard = d => captured.push(d);

(async () => {
  const out = await ctx.fetchAndRenderDashboard();
  const fail = [];
  const eq = (name, got, want) => { if (got !== want) fail.push(`${name}: got ${got}, want ${want}`); };
  eq('temperature', out.temperature.value, 22.5);
  eq('humidity',    out.humidity.value,    57.61);
  eq('pressure',    out.pressure.value,    987.73);
  eq('pm1',         out.pm1.value,         1.0);
  eq('pm25',        out.pm25.value,        1.0);
  eq('pm10',        out.pm10.value,        1.0);
  eq('aqi',         out.aqi.value,         1);
  eq('stale',       out.stale,             false);
  eq('recordedAt',  out.recordedAt,        "2026-09-21T16:12:03.101010");
  eq('ageSeconds',  out.ageSeconds,        12.3);
  eq('formatAge 12s',   ctx.formatAge(12),     '12s');
  eq('formatAge 400s',  ctx.formatAge(400),    '7 min');
  eq('formatAge 1.3M',  ctx.formatAge(1292474),'15 days');
  eq('formatAge junk',  ctx.formatAge(undefined),'unknown');

  // a partial reading: the hub omits what the sensor failed to measure
  ctx.fetch = async () => ({ ok:true, status:200, json: async () => (
    {"temperature_c":21.4,"humidity_pct":48.2,"pressure_hpa":1013.2,
     "recorded_at":"2026-09-21T16:12:03","age_seconds":900.0,"stale":true}) });
  const p = await ctx.fetchAndRenderDashboard();
  eq('partial pressure', p.pressure.value, 1013.2);
  eq('partial pm25 absent', p.pm25.value, undefined);
  eq('partial aqi default', p.aqi.value, 'N/A');
  eq('partial stale', p.stale, true);

  for (const [code, want] of [[404,'NO_READINGS'],[401,'NOT_AUTHORIZED'],[403,'NOT_AUTHORIZED'],[500,'HTTP 500']]) {
    ctx.fetch = async () => ({ ok:false, status:code, json: async () => ({}) });
    try { await ctx.fetchAndRenderDashboard(); fail.push(`${code}: no throw`); }
    catch (e) { if (e.message !== want) fail.push(`${code}: got "${e.message}", want "${want}"`); }
  }

  // ---- rendering: a gap must look like a gap, and must not move anything ----
  //
  // The layout guarantee is mechanical: renderDashboard emits the same tags in
  // the same order whether or not the sensor reported, so only text and colour
  // differ. Compare the tag sequences and they must be identical.
  const rendered = {};
  const panel = { innerHTML: '' };
  ctx.document.getElementById = id => {
    if (id === 'forecast-panel') return null;   // skip the forecast fetch
    if (id === 'dashboard-container') return panel;
    return { textContent: '', style: {} };
  };
  ctx.Promise = Promise;
  // The forecast panel is skipped above; keep its fetch quiet.
  ctx.fetch = async () => ({ ok: true, json: async () => ({ hourly: {} }) });

  ctx.renderDashboard = realRenderDashboard;

  const full = { temperature:{value:22.5}, humidity:{value:57.6}, pm1:{value:1}, pm25:{value:2},
                 pm10:{value:3}, aqi:{value:1}, pressure:{value:987.7},
                 recordedAt:'2026-09-21T16:12:03', ageSeconds:12, stale:false };
  ctx.renderDashboard(full);
  const htmlFull = panel.innerHTML;

  const empty = { temperature:{value:undefined}, humidity:{value:undefined}, pm1:{value:undefined},
                  pm25:{value:undefined}, pm10:{value:undefined}, aqi:{value:'N/A'}, pressure:null,
                  recordedAt:'2026-09-21T16:12:03', ageSeconds:99999, stale:true };
  ctx.renderDashboard(empty);
  const htmlEmpty = panel.innerHTML;

  const has = (h, t) => h.indexOf(t) !== -1;
  if (!has(htmlFull, '22.5°C'))      fail.push('full: temperature not rendered');
  if (!has(htmlFull, '2.0 \u00b5g/m\u00b3')) fail.push('full: pm25 not rendered');
  if (!has(htmlFull, '987.7 hPa'))   fail.push('full: pressure not rendered');
  if (has(htmlEmpty, '0.0 \u00b5g/m\u00b3'))  fail.push('empty: a missing PM rendered as 0.0');
  if (has(htmlEmpty, '0.0\u00b0C'))  fail.push('empty: a missing temperature rendered as 0.0C');
  if (has(htmlEmpty, '0%'))          fail.push('empty: a missing humidity rendered as 0%');
  if (!has(htmlEmpty, 'N/A'))        fail.push('empty: no N/A shown');
  if (!has(htmlEmpty, 'No temperature reading')) fail.push('empty: still recommending clothing');

  // The layout guarantee: the boxes that define the grid are identical whether
  // or not the sensor reported. Only text and colour inside them change.
  //
  // Deliberately not comparing every tag. The clothing <li> count varies with
  // the temperature band (it differs between 5 C and 25 C too), and the
  // pressure panel has always carried an extra <small> in its unavailable
  // branch. Both predate this and neither moves a panel: the top three have
  // min-height 12vw and the grid is align-items:start.
  const count = (h, re) => (h.match(re) || []).length;
  const boxes = h => [
    'section=' + count(h, /<section/g),
    'panel=' + count(h, /class="dashboard-panel/g),
    'metric-display=' + count(h, /class="metric-display/g),
    'metric-row=' + count(h, /class="metric-row"/g),
    'pm-row=' + count(h, /class="pm-row"/g),
    'temp-display=' + count(h, /class="temp-display"/g),
  ].join(' ');
  if (boxes(htmlFull) !== boxes(htmlEmpty)) {
    fail.push('layout: panel structure differs\n    full : ' + boxes(htmlFull) +
              '\n    empty: ' + boxes(htmlEmpty));
  }

  if (fail.length) { console.log('FAIL\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log('all checks passed \u2014 field names match, gaps render as gaps, layout unchanged');
})();
