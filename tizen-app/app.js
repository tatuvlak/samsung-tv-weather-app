/* MVP: SmartThings Personal Access Token (PAT) approach
 - Simpler than OAuth2 PKCE for quick development
 - Discovers devices and filters for weather stations
 - Renders dashboard with real device data
*/

const cfg = window.APP_CONFIG || {};
const status = document.getElementById('status');

let currentWeatherDevices = [];
let selectedDeviceId = null;

// Make lastRawResponse accessible for debugging
window.lastRawResponse = null;

// OAuth Flow Initialization
async function initiateOAuthFlow() {
  try {
    status.textContent = 'Starting authorization...';
    const authUrl = await window.OAuth.startAuthorizationFlow();
    window.OAuth.displayAuthorizationPrompt(authUrl);
  } catch (err) {
    status.textContent = 'Authorization failed: ' + err.message;
    console.error('OAuth initialization error:', err);
    
    // Show retry button on initialization failure
    showRetryAuthorizationButton();
  }
}

function showRetryAuthorizationButton() {
  const container = document.getElementById('dashboard-container');
  if (!container) return;
  
  const retryHtml = `
    <div style="margin-top: 20px; text-align: center;">
      <button id="retry-auth-init-btn" class="focusable" 
              style="padding: 15px 30px; font-size: 18px; background: #0066aa; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        🔄 Retry Authorization
      </button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', retryHtml);
  
  const retryBtn = document.getElementById('retry-auth-init-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      await window.OAuth.clearAndRetryAuthorization();
    });
  }
}

async function listWeatherDevices(){
  try{
    // Get valid OAuth access token (with automatic refresh)
    const accessToken = await window.OAuth.getValidAccessToken();
    
    status.textContent = 'Discovering devices...';
    const resp = await fetch('https://api.smartthings.com/v1/devices', {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    if(!resp.ok) {
      let errBody = '';
      try { errBody = await resp.text(); } catch (e) { /* ignore */ }
      throw new Error(`HTTP ${resp.status} ${resp.statusText}${errBody ? `\n${errBody}` : ''}`);
    }
    const data = await resp.json();
    
    // Filter for weather-related devices (look for temperature/humidity capabilities)
    currentWeatherDevices = (data.items||[]).filter(d => {
      const capStr = JSON.stringify(d.components || []);
      return capStr.includes('temperatureMeasurement') || 
             capStr.includes('relativeHumidityMeasurement') ||
             capStr.includes('pm25Measurement') ||
             capStr.includes('airQuality');
    });
    
    status.textContent = `Found ${currentWeatherDevices.length} weather device(s)`;

    // Auto-populate device ID if only one device found
    if (currentWeatherDevices.length === 1) {
      selectedDeviceId = currentWeatherDevices[0].deviceId;
      refreshDashboard();
    } else if (currentWeatherDevices.length > 0) {
      // Show list and let user select
      console.log('Weather devices found:', currentWeatherDevices.map(d => ({ id: d.deviceId, label: d.label })));
      // Auto-select first device
      selectedDeviceId = currentWeatherDevices[0].deviceId;
      refreshDashboard();
    }
  } catch(err){
    status.textContent = 'Discovery failed: ' + err.message;
    console.error('Discovery error:', err);
  }
}

async function refreshDashboard(){
  if(!selectedDeviceId){
    status.textContent = 'Error: No device selected';
    return;
  }

  try{
    const accessToken = await window.OAuth.getValidAccessToken();
    status.textContent = 'Refreshing...';
    await fetchAndRenderDashboard(accessToken, selectedDeviceId);
    status.textContent = 'Dashboard ready';
  } catch(err) {
    if(err.message === 'NOT_AUTHORIZED'){
      await initiateOAuthFlow();
    } else {
      status.textContent = 'Error: ' + err.message;
    }
  }
}

// Wire UI - no buttons to wire, app is fully automated

// Flag to disable auto-focus during OAuth
let disableAutoFocus = false;

function getFocusableControls() {
  // Get all focusable elements (including OAuth screen controls)
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

// On load, check OAuth status and auto-discover devices
(async () => {
  status.textContent = 'Initializing...';
  
  // Prevent TV from going to sleep
  try {
    if (window.tizen && tizen.power) {
      tizen.power.request('SCREEN', 'SCREEN_NORMAL');
      console.log('Screen wake lock enabled');
    }
  } catch (e) {
    console.warn('Could not enable screen wake lock:', e);
  }
  
  // Check if user is authorized with OAuth
  if (!window.OAuth.isAuthorized()) {
    status.textContent = 'Not authorized';
    await initiateOAuthFlow();
    return; // Wait for user to complete authorization
  }
  
  // Auto-discover devices on startup
  try {
    console.log('Starting device discovery...');
    await listWeatherDevices();
    console.log('Device discovery completed');
  } catch (err) {
    console.error('Device discovery error:', err);
    if (err.message === 'NOT_AUTHORIZED') {
      await initiateOAuthFlow();
    } else {
      status.textContent = 'Error: ' + err.message;
    }
  }
  
  // Auto-refresh dashboard every 60 seconds
  setInterval(() => {
    if (selectedDeviceId) {
      console.log('Auto-refreshing dashboard...');
      refreshDashboard();
    }
  }, 60000); // 60000ms = 1 minute
  
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

