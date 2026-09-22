/* Reads the weather station from the local hub on the NAS.
 *
 * This used to authorise against SmartThings with OAuth, list every device on
 * the account, filter for one that looked like a weather station, and poll its
 * component status. All of that went through api.smartthings.com, which becomes
 * a paid subscription in October 2026.
 *
 * Now there is one GET against a service on the LAN. No authorisation dance, no
 * device discovery, no token refresh, and nothing to re-authorise when a
 * refresh token expires while nobody is watching the television.
 */

const cfg = window.APP_CONFIG || {};
const status = document.getElementById('status');

// Kept for debugging from the TV's remote inspector.
window.lastRawResponse = null;

function describeError(err) {
  switch (err && err.message) {
    case 'NO_READINGS':
      return 'The hub has no readings yet - is the weather station posting?';
    case 'NOT_AUTHORIZED':
      return 'The hub rejected the read token - check readToken in config.js';
    default:
      // A failed fetch to a LAN address is almost always the address itself or
      // the content-security-policy in config.xml blocking it, and those look
      // identical from here. Say both.
      return 'Cannot reach the hub at ' + ((cfg.hub && cfg.hub.baseUrl) || '(not configured)') +
             ' - check the address in config.js and the connect-src list in config.xml' +
             (err && err.message ? ' (' + err.message + ')' : '');
  }
}

async function refreshDashboard() {
  try {
    status.textContent = 'Refreshing...';
    await fetchAndRenderDashboard();
    status.textContent = '';
    return true;
  } catch (err) {
    console.error('[APP] refresh failed:', err);
    status.textContent = describeError(err);
    return false;
  }
}

// Put the failure where someone looking at the television will see it.
//
// A failed first fetch left the dashboard container empty, so the screen
// showed the app icon and index.html's `Last updated: --:--:--` placeholder
// and nothing else. That looks like a hang. The status line did say what had
// happened, but it is small text above an otherwise blank panel and is easy
// to miss entirely.
function showStartupFailure(message) {
  const container = document.getElementById('dashboard-container');
  if (!container) return;
  container.innerHTML =
    '<div class="dashboard"><section class="dashboard-panel" style="border-color:#ff9800;">' +
    '<h2>No data</h2>' +
    '<div class="alert-message" style="color:#ff9800; background:#ff980022;">' +
    message +
    '</div>' +
    '<div class="pm-details"><div class="pm-row"><label>Retrying</label>' +
    '<span class="pm-value">every ' + (((cfg.hub && cfg.hub.refreshSeconds) || 60)) + 's</span>' +
    '</div></div></section></div>';
}

// The first fetch can land before the TV's network stack is up. With a single
// attempt the screen then stayed blank until the next scheduled refresh a full
// minute later, which read as a hang rather than as a retry. Try a few times,
// a few seconds apart, before settling into the normal interval.
async function startupRefresh(attempts, delayMs) {
  for (let i = 1; i <= attempts; i++) {
    status.textContent = i === 1 ? 'Loading...' : 'Loading... (attempt ' + i + ' of ' + attempts + ')';
    try {
      await fetchAndRenderDashboard();
      status.textContent = '';
      return true;
    } catch (err) {
      console.error('[APP] startup attempt ' + i + ' of ' + attempts + ' failed:', err);
      if (i === attempts) {
        const message = describeError(err);
        status.textContent = message;
        showStartupFailure(message);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

// Wire UI - no buttons to wire, app is fully automated

function getFocusableControls() {
  // Every element the remote can land on.
  return Array.from(document.querySelectorAll('.focusable'));
}

function applyVirtualFocus(el) {
  const controls = getFocusableControls();
  controls.forEach(node => node.classList.remove('tv-focused'));
  if (el) {
    el.classList.add('tv-focused');
  }
}

function focusByIndex(nextIndex) {
  const controls = getFocusableControls();
  if (!controls.length) return;
  const safeIndex = ((nextIndex % controls.length) + controls.length) % controls.length;
  controls[safeIndex].focus();
  applyVirtualFocus(controls[safeIndex]);
}

function handleRemoteNavigation(e) {
  const controls = getFocusableControls();
  if (!controls.length) return;

  const active = document.activeElement;
  const currentIndex = controls.indexOf(active);
  const hasFocus = currentIndex >= 0;

  const key = e.key || '';
  const keyCode = e.keyCode || e.which || 0;

  const handled = () => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

  switch (key) {
    case 'ArrowRight':
    case 'Right':
      if (isInput) active.blur();
      handled();
      focusByIndex(hasFocus ? currentIndex + 1 : 0);
      break;
    case 'ArrowLeft':
    case 'Left':
      if (isInput) active.blur();
      handled();
      focusByIndex(hasFocus ? currentIndex - 1 : 0);
      break;
    case 'ArrowDown':
    case 'Down':
      if (isInput) active.blur();
      handled();
      focusByIndex(hasFocus ? currentIndex + 1 : 0);
      break;
    case 'ArrowUp':
    case 'Up':
      if (isInput) active.blur();
      handled();
      focusByIndex(hasFocus ? currentIndex - 1 : 0);
      break;
    case 'Enter':
    case 'OK':
      if (active && active.tagName === 'BUTTON') {
        handled();
        active.click();
      }
      break;
    default:
      // keyCode fallbacks for TV remotes
      if (keyCode === 37 || keyCode === 65361) {
        if (isInput) active.blur();
        handled();
        focusByIndex(hasFocus ? currentIndex - 1 : 0);
      } else if (keyCode === 39 || keyCode === 65363) {
        if (isInput) active.blur();
        handled();
        focusByIndex(hasFocus ? currentIndex + 1 : 0);
      } else if (keyCode === 38 || keyCode === 65362) {
        if (isInput) active.blur();
        handled();
        focusByIndex(hasFocus ? currentIndex - 1 : 0);
      } else if (keyCode === 40 || keyCode === 65364) {
        if (isInput) active.blur();
        handled();
        focusByIndex(hasFocus ? currentIndex + 1 : 0);
      } else if (keyCode === 13 || keyCode === 10) {
        if (active && active.tagName === 'BUTTON') {
          handled();
          active.click();
        }
      }
      break;
  }
}

document.addEventListener('keydown', handleRemoteNavigation, true);
document.body && document.body.addEventListener('keydown', handleRemoteNavigation, true);
window.addEventListener('keydown', handleRemoteNavigation, true);
window.addEventListener('keyup', handleRemoteNavigation, true);
document.addEventListener('focusin', (e) => {
  const target = e.target;
  if (target && target.classList && target.classList.contains('focusable')) {
    applyVirtualFocus(target);
  }
});

// On load: show something, then keep it fresh.
(async () => {
  status.textContent = 'Loading...';

  // Stop the TV blanking the screen - this app exists to be looked at.
  try {
    if (window.tizen && tizen.power) {
      tizen.power.request('SCREEN', 'SCREEN_NORMAL');
      console.log('Screen wake lock enabled');
    }
  } catch (e) {
    console.warn('Could not enable screen wake lock:', e);
  }

  // Four tries three seconds apart: enough to cover the network coming up,
  // short enough that a genuinely unreachable hub is reported quickly rather
  // than leaving the screen ambiguous.
  await startupRefresh(4, 3000);

  // The periodic refresh keeps its single attempt on purpose. By then there is
  // already a dashboard on screen, a miss just leaves the previous reading
  // showing, and its timestamp visibly ages — which is the honest thing for it
  // to do. Only the empty screen at startup needed rescuing.
  const seconds = (cfg.hub && cfg.hub.refreshSeconds) || 60;
  setInterval(refreshDashboard, seconds * 1000);

  // Ensure first control is focused for TV remote navigation
  setTimeout(() => focusByIndex(0), 100);
  if (document.body) {
    document.body.tabIndex = 0;
  }
})();

// Register TV remote keys if available (Samsung/Tizen)
try {
  if (window.tizen && tizen.tvinputdevice) {
    if (tizen.tvinputdevice.registerKeyBatch) {
      try {
        tizen.tvinputdevice.registerKeyBatch(['KEY_LEFT', 'KEY_RIGHT', 'KEY_UP', 'KEY_DOWN', 'KEY_ENTER']);
      } catch (e) {
        // fallback to individual registration
        ['KEY_LEFT', 'KEY_RIGHT', 'KEY_UP', 'KEY_DOWN', 'KEY_ENTER'].forEach(k => {
          try { tizen.tvinputdevice.registerKey(k); } catch (err) { /* ignore */ }
        });
      }
    } else {
      ['KEY_LEFT', 'KEY_RIGHT', 'KEY_UP', 'KEY_DOWN', 'KEY_ENTER'].forEach(k => {
        try { tizen.tvinputdevice.registerKey(k); } catch (err) { /* ignore */ }
      });
    }
  }
} catch (e) {
  // ignore registration errors on non-TV environments
}

