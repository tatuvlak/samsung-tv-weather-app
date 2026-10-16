// Checks that a failed first fetch is retried rather than leaving the screen
// blank until the next scheduled refresh.
//
//     node test-startup-retry.js
//
// The reported symptom was the app showing its icon and index.html's
// `Last updated: --:--:--` placeholder and nothing else. That is what a single
// failed attempt looks like when the next one is a full minute away. These
// checks pin the retry count, the eventual success, and what is put on screen
// when every attempt fails. No network, no DOM, no dependencies.

const fs = require('fs'), vm = require('vm');

function run({ failures, attempts = 4, reading = {} }) {
  const calls = { fetches: 0, intervals: 0, offlineRenders: 0 };
  const el = () => ({ textContent: '', innerHTML: '', style: {}, addEventListener() {}, focus() {}, classList: { add(){}, remove(){}, contains(){ return false; } } });
  const statusEl = el(), containerEl = el(), alertEl = el();

  const ctx = {
    console: { log(){}, warn(){}, error(){} },
    Promise, Date, JSON, Math, String, Number,
    // Fire timers immediately so the retry delays do not make the test slow.
    setTimeout: fn => { fn(); return 0; },
    setInterval: () => { calls.intervals++; return 0; },
    document: {
      getElementById: id => {
        if (id === 'status') return statusEl;
        if (id === 'alert') return alertEl;
        if (id === 'dashboard-container') return containerEl;
        return el();
      },
      addEventListener() {}, querySelectorAll: () => [], body: el(), activeElement: null,
    },
    APP_CONFIG: { hub: { baseUrl: 'http://hub:5000', readToken: 'x', refreshSeconds: 60 } },
    // Lives in dashboard.js, which this test does not load. Record the call and
    // report that a stored reading was found, as it would be on a television
    // that has been running.
    renderOfflineDashboard: () => { calls.offlineRenders++; containerEl.innerHTML = '<div class="dashboard">stored</div>'; return true; },
    // Stand in for the real fetch+render: fail the first `failures` times.
    fetchAndRenderDashboard: async () => {
      calls.fetches++;
      if (calls.fetches <= failures) throw new Error('boom');
      return reading;
    },
  };
  ctx.window = ctx;
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), ctx);
  return { ctx, calls, statusEl, containerEl, alertEl };
}

(async () => {
  const fail = [];
  const eq = (name, got, want) => { if (got !== want) fail.push(`${name}: got ${got}, want ${want}`); };

  // Healthy hub: one attempt, nothing retried.
  {
    const { calls } = run({ failures: 0 });
    await new Promise(r => setImmediate(r));
    eq('healthy: fetch count', calls.fetches, 1);
    eq('healthy: periodic refresh scheduled', calls.intervals, 1);
  }

  // Network up late: the first two attempts fail, the third works. This is the
  // reported bug — before the retry it stayed blank for a full interval.
  {
    const { calls, containerEl } = run({ failures: 2 });
    await new Promise(r => setImmediate(r));
    eq('slow start: fetch count', calls.fetches, 3);
    eq('slow start: no failure panel', containerEl.innerHTML, '');
    eq('slow start: periodic refresh scheduled', calls.intervals, 1);
  }

  // Hub genuinely unreachable: it gives up after four and draws the dashboard
  // from the stored reading, rather than replacing the screen with an error
  // panel. The whole point is that the forecast still gets rendered, and the
  // forecast only runs as part of a real dashboard render.
  {
    const { calls, containerEl, alertEl } = run({ failures: 99 });
    await new Promise(r => setImmediate(r));
    eq('unreachable: stops after 4', calls.fetches, 4);
    eq('unreachable: fell back to the stored reading', calls.offlineRenders, 1);
    if (containerEl.innerHTML.indexOf('dashboard') === -1) fail.push('unreachable: no dashboard rendered');
    if (!alertEl.textContent) fail.push('unreachable: nothing in the visible alert');
    if (alertEl.textContent.indexOf('last stored reading') === -1) {
      fail.push('unreachable: the alert does not say the numbers are stored ones');
    }
    // Still scheduled, so it recovers on its own once the hub comes back.
    eq('unreachable: keeps trying periodically', calls.intervals, 1);
  }

  // A refresh failing after a good start must re-render too, not just change
  // the status line. Leaving the old panel alone froze the reading's age at
  // whatever it was when the hub went down.
  {
    const { ctx, calls } = run({ failures: 0 });
    await new Promise(r => setImmediate(r));
    eq('recovery: no offline render while healthy', calls.offlineRenders, 0);
    ctx.fetchAndRenderDashboard = async () => { throw new Error('boom'); };
    await ctx.refreshDashboard();
    eq('recovery: a later failure falls back', calls.offlineRenders, 1);
  }

  // A fault the readings cannot show: the station says its PMS reset line did
  // not hold. Nothing reads that sensor's serial console, so the dashboard is
  // the only place it can surface.
  //
  // Asserted on #alert, not #status. #status is display:none in style.css, so
  // a message that only reaches it is not reported at all - which is exactly
  // what happened: the warning fired correctly on the sensor, travelled
  // through the hub, arrived in the app, and was written to a hidden element.
  {
    const { alertEl } = run({ failures: 0, reading: { pmsHoldOk: false } });
    await new Promise(r => setImmediate(r));
    if (alertEl.textContent.indexOf('reset line') === -1) {
      fail.push('health: a failed PMS hold is not in the visible alert - it reads "' + alertEl.textContent + '"');
    }
  }

  // ...and a healthy station, or one that has not checked yet, says nothing.
  for (const [label, reading] of [
    ['healthy', { pmsHoldOk: true }],
    ['not yet checked', {}],
  ]) {
    const { alertEl } = run({ failures: 0, reading });
    await new Promise(r => setImmediate(r));
    // Empty matters structurally, not just cosmetically: #alert:empty is not
    // rendered, so an empty string is what keeps a healthy dashboard's layout
    // identical to before this element existed.
    if (alertEl.textContent !== '') {
      fail.push('health: ' + label + ' should leave the alert empty, got "' + alertEl.textContent + '"');
    }
  }

  if (fail.length) { console.log('FAIL\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log('all checks passed — startup retries, succeeds late, and falls back to the stored reading');
})();
