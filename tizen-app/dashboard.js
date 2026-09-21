/* Dashboard Renderer
 - Maps SmartThings device status to the weather display layout
 - Implements color-coded numeric display + icons + seasonal clothing recommendations
 - MVP: calendar-based seasons, consistent temperature bands
*/

// Temperature bands for clothing recommendations (Celsius)
// MVP approach: same bands year-round, calendar-based season awareness
const TEMP_BANDS = {
  freezing: { max: 0, clothing: ['❄️ Heavy Coat', '🧤 Gloves', '🧣 Scarf', '🎿 Warm Boots'], color: '#0066ff' },
  cold: { max: 10, clothing: ['🧥 Jacket', '👖 Long Pants', '👢 Shoes'], color: '#0099ff' },
  cool: { max: 15, clothing: ['🧥 Light Jacket', '👖 Long Pants', '👟 Sneakers'], color: '#00ccff' },
  mild: { max: 20, clothing: ['👕 Long Sleeve Shirt', '👖 Long Pants'], color: '#00ff99' },
  warm: { max: 25, clothing: ['👕 T-Shirt', '👖 Shorts or Light Pants'], color: '#ffff00' },
  hot: { max: 30, clothing: ['👕 T-Shirt', '🩳 Shorts'], color: '#ff9900' },
  veryhot: { max: 999, clothing: ['👕 Light T-Shirt', '🩳 Shorts', '🕶️ Sunglasses'], color: '#ff3300' }
};

// Air Quality Index categories - Matter specification enum mapping
// Enum values: 0=unknown, 1=good, 2=fair, 3=moderate, 4=poor, 5=very poor, 6=extremely poor
const AQI_CATEGORIES = {
  // Numeric enum values (from Matter specification)
  0: { color: '#cccccc', icon: '❓', message: 'Unknown', label: 'Unknown' },
  1: { color: '#28a745', icon: '�', message: 'Air quality is good', label: 'Good' },
  2: { color: '#ffc107', icon: '🙂', message: 'Acceptable air quality', label: 'Moderate' },
  3: { color: '#fd7e14', icon: '😕', message: 'Sensitive groups should limit outdoor activity', label: 'Slightly Unhealthy' },
  4: { color: '#dc3545', icon: '☹️', message: 'WEAR MASK - Unhealthy air', label: 'Unhealthy' },
  5: { color: '#6f42c1', icon: '🤢', message: 'STAY INDOORS - Very unhealthy', label: 'Very Unhealthy' },
  6: { color: '#721c24', icon: '☠️', message: 'HAZARDOUS - DO NOT GO OUTSIDE', label: 'Hazardous' },
  
  // String aliases (case-insensitive keys normalized to lowercase)
  'unknown': 0,
  'good': 1,
  'moderate': 2,
  'fair': 2,  // alias for moderate
  'slightly unhealthy': 3,
  'slightlyunhealthy': 3,
  'unhealthy': 4,
  'poor': 4,  // alias for unhealthy
  'very unhealthy': 5,
  'veryunhealthy': 5,
  'very poor': 5,  // alias for very unhealthy
  'extremely poor': 6,
  'extremelypoor': 6,
  'hazardous': 6
};

// Helper function to normalize AQI value and get category data
// --- Open-Meteo Forecast Integration ---
// Default locations: Polanka Hallera, Kraków (Poland, Małopolska)
const DEFAULT_FORECAST_LOCATIONS = [
  {
    name: 'Polanka Hallera',
    latitude: 49.995,
    longitude: 19.902
  },
  {
    name: 'Kraków',
    latitude: 50.067,
    longitude: 19.912
  }
];

function getForecastLocations() {
  // Try to load from localStorage, fallback to defaults
  try {
    const stored = localStorage.getItem('forecastLocations');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_FORECAST_LOCATIONS;
}

function setForecastLocations(locations) {
  localStorage.setItem('forecastLocations', JSON.stringify(locations));
}

async function fetchOpenMeteoForecast(lat, lon) {
  // Robust fetch with no-cache and a single retry. Returns parsed JSON or null on failure.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,windspeed_10m,weathercode&forecast_hours=40&timezone=auto`;

  const tryFetch = async () => {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) return null;
      const j = await resp.json();
      // basic validation
      if (!j || !j.hourly || !Array.isArray(j.hourly.time)) return null;
      return j;
    } catch (e) {
      return null;
    }
  };

  const first = await tryFetch();
  if (first) return first;
  // one quick retry for transient network issues
  return await tryFetch();
}
function renderForecastPanel(container, forecasts, locations) {
  // Render a horizontal grid (master table) so all locations align by hour
  let html = '<h2>Forecast</h2><div class="placeholder">No forecast data</div>';

  const weatherIcons = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️', 56: '🌧️', 57: '🌧️',
    61: '🌦️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '❄️', 77: '❄️',
    80: '🌦️', 81: '🌧️', 82: '🌧️', 85: '🌨️', 86: '❄️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };

  if (forecasts && forecasts.length > 0) {
    const firstForecast = forecasts.find(f => f && f.hourly) || null;
    if (!firstForecast) { container.innerHTML = html; return; }

    const times = firstForecast.hourly.time;
    const now = new Date();
    let startIdx = 0;
    for (let i = 0; i < times.length; ++i) {
      const t = new Date(times[i]);
      if (t >= now) { startIdx = i; break; }
    }

    const hoursToShow = 12;
    html = `<h2>Forecast (next ${hoursToShow}h)</h2>`;
    html += '<div class="forecast-table-container"><table class="forecast-table">';

    // Header
    html += '<tr><th class="forecast-th"></th><th class="forecast-th">Hour</th>';
    for (let i = startIdx; i < startIdx + hoursToShow; ++i) {
      const hour = times[i]?.slice(11,16) || '';
      html += `<th class="forecast-th">${hour}</th>`;
    }
    html += '</tr>';

    // Rows per location
    for (let idx = 0; idx < locations.length; ++idx) {
      const loc = locations[idx];
      const forecast = forecasts[idx];
      if (!forecast || !forecast.hourly) {
        html += `<tr><td colspan="${2 + hoursToShow}">${loc.name}: <span style=\"color:#c00\">No data</span></td></tr>`;
        continue;
      }

      const metricRows = ['Weather','Temp (°C)','Feels Like (°C)','Wind (km/h)','Precip (mm / %)'];
        const metricClassMap = ['metric-weather','metric-temp','metric-feels','metric-wind','metric-precip'];
        for (let r = 0; r < metricRows.length; ++r) {
          const cls = `forecast-row ${metricClassMap[r]} loc-${idx}`;
          html += `<tr class="${cls}">`;
        if (r === 0) html += `<td class="location-name-outer" rowspan="${metricRows.length}"><div class="location-name-inner">${loc.name}</div></td>`;
        html += `<td class="forecast-th">${metricRows[r]}</td>`;

        for (let i = startIdx; i < startIdx + hoursToShow; ++i) {
          if (r === 0) {
            const code = forecast.hourly.weathercode?.[i];
            const icon = weatherIcons[code] || '❓';
            html += `<td class="forecast-td weather-icon-cell">${icon}</td>`;
          } else if (r === 1) {
            const temp = forecast.hourly.temperature_2m[i]?.toFixed(1) ?? '';
            html += `<td class="forecast-td">${temp}</td>`;
          } else if (r === 2) {
            const appTemp = forecast.hourly.apparent_temperature?.[i]?.toFixed(1) ?? '';
            html += `<td class="forecast-td">${appTemp}</td>`;
          } else if (r === 3) {
            const wind = forecast.hourly.windspeed_10m?.[i]?.toFixed(1) ?? '';
            html += `<td class="forecast-td">${wind}</td>`;
          } else if (r === 4) {
            const code = forecast.hourly.weathercode?.[i];
            const precip = forecast.hourly.precipitation[i]?.toFixed(1) ?? '';
            const prob = forecast.hourly.precipitation_probability?.[i] ?? '';
            let icon = '';
            if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code)) {
              const n = Math.max(1, Math.min(3, Math.round(forecast.hourly.precipitation[i] ?? 0)));
              icon = '💧'.repeat(n);
            } else if ([71,73,75,77,85,86].includes(code)) {
              const n = Math.max(1, Math.min(3, Math.round(forecast.hourly.precipitation[i] ?? 0)));
              icon = '❄️'.repeat(n);
            }
            let content;
            if (icon) {
              content = `<div class="precip-container"><div class="precip-values"><div class="precip-amount">${precip}</div><div class="precip-prob">${prob !== '' ? prob + '%' : ''}</div></div><div class="precip-icon">${icon}</div></div>`;
            } else {
              content = `<div class="precip-values"><div class="precip-amount">${precip}</div><div class="precip-prob">${prob !== '' ? prob + '%' : ''}</div></div>`;
            }
            html += `<td class="forecast-td">${content}</td>`;
          }
        }

        html += '</tr>';
      }
    }

    html += '</table></div>';
  }

  container.innerHTML = html;

  // Ensure top panels share the same outer frame height as the Air Quality panel.
  // We only set heights here (no other layout changes) so that Temperature and Humidity
  // panels exactly match the rendered Air Quality panel height.
  function syncTopPanelHeights() {
    try {
      const air = document.querySelector('.air-quality-panel');
      const temp = document.querySelector('.temperature-panel');
      const hum = document.querySelector('.humidity-panel');
      if (!air || !temp || !hum) return;
      const h = Math.round(air.getBoundingClientRect().height) + 'px';
      temp.style.height = h;
      hum.style.height = h;
    } catch (e) {
      console.warn('syncTopPanelHeights failed', e);
    }
  }

  // Sync now and when the window resizes or content updates
  syncTopPanelHeights();
  window.addEventListener('resize', syncTopPanelHeights);
}
function getAQICategory(aqiValue) {
  // Handle numeric values directly
  if (typeof aqiValue === 'number' && aqiValue >= 0 && aqiValue <= 6) {
    return AQI_CATEGORIES[aqiValue];
  }
  
  // Handle string values - normalize to lowercase and remove spaces
  if (typeof aqiValue === 'string') {
    const normalizedKey = aqiValue.toLowerCase().replace(/\s+/g, ' ').trim();
    const enumValue = AQI_CATEGORIES[normalizedKey];
    
    if (typeof enumValue === 'number') {
      return AQI_CATEGORIES[enumValue];
    }
  }
  
  // Fallback to unknown
  return AQI_CATEGORIES[0];
}

function getSeasonName() {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function getTempClothing(tempC) {
  for (const [key, band] of Object.entries(TEMP_BANDS)) {
    if (tempC <= band.max) return band;
  }
  return TEMP_BANDS.veryhot;
}

function getPMColor(pm25) {
  // Simple PM2.5 color mapping (µg/m³)
  if (pm25 <= 12) return '#00aa00';    // Good
  if (pm25 <= 35) return '#ffaa00';    // Fair
  if (pm25 <= 55) return '#ff6600';    // Moderate
  if (pm25 <= 150) return '#ff3300';   // Poor
  return '#990000';                    // Very Poor
}

function getHumidityColor(humidity) {
  // Humidity color: dry (blue) → optimal (green) → wet (orange)
  if (humidity < 30) return '#0099ff';  // Dry
  if (humidity < 50) return '#00cc00';  // Good
  if (humidity < 70) return '#ffaa00';  // Humid
  return '#ff6600';                     // Very Humid
}

function getPressureColor(pressure) {
  // Pressure in hPa: lower = storm approaching
  if (pressure >= 1013) return '#00cc00';    // Rising/High
  if (pressure >= 1009) return '#ffaa00';    // Stable
  return '#ff6600';                          // Falling/Low pressure
}

function renderDashboard(deviceStatus) {
  console.log('[RENDER] renderDashboard called with status:', deviceStatus);
  const container = document.getElementById('dashboard-container');
  if (!container) {
    console.error('[RENDER] Dashboard container not found!');
    return;
  }
  console.log('[RENDER] Container found, rendering HTML...');

  // A value the sensor failed to measure is ABSENT from the hub's payload, not
  // zero. `|| 0` turned every gap into 0 C and pristine air — indistinguishable
  // on screen from a real reading, which is exactly the failure the firmware
  // was changed to avoid. Keep the distinction here: null means no reading.
  const num = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  };

  const temp = num(deviceStatus.temperature?.value);
  const humidity = num(deviceStatus.humidity?.value);
  const pm1 = num(deviceStatus.pm1?.value);
  const pm25 = num(deviceStatus.pm25?.value);
  const pm10 = num(deviceStatus.pm10?.value);
  const aqiValue = deviceStatus.aqi?.value;
  const pressure = deviceStatus.pressure ? num(deviceStatus.pressure.value) : null;

  // The greys the pressure panel has always used for its missing sensor, so a
  // gap reads the same wherever it appears. Only text and colour change —
  // every element stays put, so nothing moves on screen.
  const MISSING_BORDER = '#666';
  const MISSING_TEXT = '#999';

  const fmt = (v, digits, unit) => v === null ? 'N/A' : v.toFixed(digits) + unit;
  const colorOr = (v, fn) => v === null ? MISSING_TEXT : fn(v);

  // Without this, a missing temperature fell through getTempClothing as 0 and
  // the panel confidently recommended a winter coat.
  const tempBand = temp === null
    ? { color: MISSING_BORDER, clothing: ['No temperature reading'] }
    : getTempClothing(temp);
  const aqiData = getAQICategory(aqiValue);
  const aqiLabel = aqiData.label || (aqiValue !== undefined && aqiValue !== null ? String(aqiValue) : 'N/A');
  const pm25Color = colorOr(pm25, getPMColor);
  const humidityColor = colorOr(humidity, getHumidityColor);
  const pressureColor = pressure === null ? MISSING_BORDER : getPressureColor(pressure);

  const season = getSeasonName();

  // Show the READING's timestamp, not the time we fetched it. Those agree only
  // while the sensor is healthy; when it stops posting they diverge, and the
  // fetch time would report a dead sensor as current. The hub tells us both
  // the age and whether it considers the reading stale, so say so.
  const lastEl = document.getElementById('last-updated');
  if (lastEl) {
    if (deviceStatus.recordedAt) {
      const t = new Date(deviceStatus.recordedAt).toLocaleTimeString();
      lastEl.textContent = deviceStatus.stale
        ? 'Reading from ' + t + ' \u2014 STALE, ' + formatAge(deviceStatus.ageSeconds) + ' old'
        : 'Reading from ' + t;
      lastEl.style.color = deviceStatus.stale ? '#ff9800' : '';
    } else {
      lastEl.textContent = 'No reading';
      lastEl.style.color = '#ff9800';
    }
  }

  const html = `
    <div class="dashboard">
      <div class="dashboard-grid">
        <!-- TOP LEFT: Air Quality (most urgent) -->
        <section class="dashboard-panel air-quality-panel">
          <h2>Air Quality</h2>
          <div class="metric-display" style="border-color: ${aqiData.color};">
            <span class="aqi-icon">${aqiData.icon}</span>
            <span class="aqi-label">${aqiLabel}</span>
          </div>
          <div class="pm-details">
            <div class="pm-row">
              <label>PM10</label>
              <span class="pm-value" style="color: ${colorOr(pm10, getPMColor)};">${fmt(pm10, 1, ' µg/m³')}</span>
            </div>
            <div class="pm-row">
              <label>PM2.5</label>
              <span class="pm-value" style="color: ${pm25Color};">${fmt(pm25, 1, ' µg/m³')}</span>
            </div>
            <div class="pm-row">
              <label>PM1</label>
              <span class="pm-value" style="color: ${colorOr(pm1, getPMColor)};">${fmt(pm1, 1, ' µg/m³')}</span>
            </div>
          </div>
          <div class="alert-message" style="color: ${aqiData.color}; background: ${aqiData.color}22;">
            ${aqiData.message}
          </div>
        </section>

        <!-- TOP RIGHT: Temperature + Clothing -->
        <section class="dashboard-panel temperature-panel">
          <h2>Temperature & Clothing</h2>
          <div class="temp-display" style="border-color: ${tempBand.color};">
            <span class="temp-value"${temp === null ? ' style="color: ' + MISSING_TEXT + '"' : ''}>${fmt(temp, 1, '°C')}</span>
            <span class="temp-color-indicator" style="background: ${tempBand.color};"></span>
          </div>
          <div class="clothing-recommendation">
            <h3>What to Wear</h3>
            <ul>
              ${tempBand.clothing.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </section>

        <!-- BOTTOM LEFT: Humidity & Pressure -->
        <section class="dashboard-panel humidity-panel">
          <h2>Humidity & Pressure</h2>
          <div class="metric-row">
            <label>Humidity</label>
            <div class="metric-display" style="border-color: ${humidityColor};">
              <span class="metric-value" style="color: ${humidityColor};">${fmt(humidity, 0, '%')}</span>
            </div>
          </div>
          ${pressure !== null ? `
          <div class="metric-row">
            <label>Pressure</label>
            <div class="metric-display" style="border-color: ${pressureColor};">
              <span class="metric-value" style="color: ${pressureColor};">${pressure.toFixed(1)} hPa</span>
            </div>
          </div>
          ` : `
          <div class="metric-row">
            <label>Pressure</label>
            <div class="metric-display" style="border-color: #666;">
              <span class="metric-value" style="color: #999;">N/A</span>
              <small style="display: block; opacity: 0.6; font-size: 11px;">(sensor not available)</small>
            </div>
          </div>
          `}
        </section>

        <!-- BOTTOM RIGHT: Weather Forecast (Open-Meteo) -->
        <section class="dashboard-panel forecast-panel" id="forecast-panel">
          <div class="placeholder">Loading forecast...</div>
        </section>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // --- Forecast Integration ---
  // Use requestAnimationFrame + setTimeout to ensure DOM is fully settled before fetching
  const runForecastFetch = async () => {
    try {
      console.log('[FORECAST] Starting forecast fetch');
      const locations = getForecastLocations();
      console.log('[FORECAST] Locations:', locations);
      
      const forecasts = [];
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        console.log('[FORECAST] Fetching for:', loc.name);
        const res = await fetchOpenMeteoForecast(loc.latitude, loc.longitude);
        
        if (res && res.hourly) {
          console.log('[FORECAST] Got data for:', loc.name);
          forecasts.push(res);
        } else {
          console.warn('[FORECAST] No data for:', loc?.name);
          forecasts.push(null);
        }
      }
      
      const forecastPanel = document.getElementById('forecast-panel');
      console.log('[FORECAST] Panel element:', forecastPanel ? 'found' : 'NOT FOUND');
      if (forecastPanel) {
        renderForecastPanel(forecastPanel, forecasts, locations);
        console.log('[FORECAST] Render complete');
      }
    } catch (e) {
      console.error('[FORECAST] Integration failed:', e);
    }
  };

  // Schedule forecast fetch after DOM is fully rendered
  requestAnimationFrame(() => {
    setTimeout(() => {
      runForecastFetch();
    }, 100);
  });

  // The wall clock ticks every second. renderDashboard runs on every refresh,
  // so starting an interval here unguarded added one per minute and left the
  // old ones running — on a TV that stays up for days that is hundreds of
  // timers. Start it once.
  updateCurrentTime();
  if (!window.__clockInterval) {
    window.__clockInterval = setInterval(updateCurrentTime, 1000);
  }
}

function updateCurrentTime() {
  const currentTimeEl = document.getElementById('current-time');
  if (currentTimeEl) currentTimeEl.textContent = new Date().toLocaleTimeString();
}

function formatAge(seconds) {
  if (typeof seconds !== 'number' || !isFinite(seconds)) return 'unknown';
  if (seconds < 90) return Math.round(seconds) + 's';
  if (seconds < 5400) return Math.round(seconds / 60) + ' min';
  if (seconds < 172800) return Math.round(seconds / 3600) + ' h';
  return Math.round(seconds / 86400) + ' days';
}

// Fetch the latest reading from the local hub and render it.
//
// This used to call api.smartthings.com to list devices, pick one, read its
// component status and unpick SmartThings' capability envelopes. The hub
// serves the reading the station posted, in the shape the station sent it, so
// none of that is needed — and none of it costs a subscription.
async function fetchAndRenderDashboard() {
  const hub = (window.APP_CONFIG && window.APP_CONFIG.hub) || {};
  if (!hub.baseUrl) throw new Error('APP_CONFIG.hub.baseUrl is not set - copy config.example.js to config.js');

  const headers = {};
  if (hub.readToken) headers.Authorization = 'Bearer ' + hub.readToken;

  const url = String(hub.baseUrl).replace(/\/+$/, '') + '/api/weather';
  console.log('[DASHBOARD] fetching', url);
  const resp = await fetch(url, { headers: headers });

  // Distinguish the cases that need different action from the viewer. A 404
  // means the hub is up and simply has nothing yet, which is a very different
  // problem from the hub being unreachable.
  if (resp.status === 404) throw new Error('NO_READINGS');
  if (resp.status === 401 || resp.status === 403) throw new Error('NOT_AUTHORIZED');
  if (!resp.ok) throw new Error('HTTP ' + resp.status);

  const data = await resp.json();
  window.lastRawResponse = data;

  // The hub omits a field the sensor failed to measure rather than sending a
  // zero, so absence is meaningful. renderDashboard keeps that distinction.
  const displayData = {
    temperature: { value: data.temperature_c },
    humidity: { value: data.humidity_pct },
    pm1: { value: data.pm1 },
    pm25: { value: data.pm25 },
    pm10: { value: data.pm10 },
    aqi: { value: data.aqi !== undefined ? data.aqi : 'N/A' },
    pressure: (typeof data.pressure_hpa === 'number') ? { value: data.pressure_hpa } : null,
    recordedAt: data.recorded_at,
    ageSeconds: data.age_seconds,
    stale: data.stale === true
  };

  console.log('[DASHBOARD] rendering', displayData);
  renderDashboard(displayData);
  return displayData;
}
