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
  // Fetch next 24h hourly forecast for temperature and precipitation
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&forecast_days=1&timezone=auto`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Forecast fetch failed');
  return resp.json();
}

function renderForecastPanel(container, forecasts, locations) {
  // Render a table for each location
  let html = '<h2>Forecast (next 24h)</h2>';
  forecasts.forEach((forecast, idx) => {
    const loc = locations[idx];
    if (!forecast || !forecast.hourly) {
      html += `<div><b>${loc.name}</b>: <span style="color:#c00">No data</span></div>`;
      return;
    }
    html += `<div style="margin-bottom:12px"><b>${loc.name}</b><table style="font-size:13px;margin-top:4px"><tr><th>Hour</th><th>Temp (°C)</th><th>Precip (mm)</th></tr>`;
    for (let i = 0; i < 24; ++i) {
      const hour = forecast.hourly.time[i]?.slice(11, 16) || '';
      const temp = forecast.hourly.temperature_2m[i]?.toFixed(1) ?? '';
      const precip = forecast.hourly.precipitation[i]?.toFixed(1) ?? '';
      html += `<tr><td>${hour}</td><td>${temp}</td><td>${precip}</td></tr>`;
    }
    html += '</table></div>';
  });
  container.innerHTML = html;
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
  const container = document.getElementById('dashboard-container');
  if (!container) {
    console.error('Dashboard container not found');
    return;
  }

  // Extract weather metrics from device status
  const temp = parseFloat(deviceStatus.temperature?.value || 0);
  const humidity = parseFloat(deviceStatus.humidity?.value || 0);
  const pm1 = parseFloat(deviceStatus.pm1?.value || 0);
  const pm25 = parseFloat(deviceStatus.pm25?.value || 0);
  const pm10 = parseFloat(deviceStatus.pm10?.value || 0);
  const aqiValue = deviceStatus.aqi?.value;
  const pressure = deviceStatus.pressure ? parseFloat(deviceStatus.pressure.value) : null;

  const tempBand = getTempClothing(temp);
  const aqiData = getAQICategory(aqiValue);
  const aqiLabel = aqiData.label || (aqiValue !== undefined && aqiValue !== null ? String(aqiValue) : 'N/A');
  const pm25Color = getPMColor(pm25);
  const humidityColor = getHumidityColor(humidity);
  const pressureColor = pressure ? getPressureColor(pressure) : '#666';

  const season = getSeasonName();
  const lastUpdatedTime = new Date().toLocaleTimeString();

  const html = `
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>Weather</h1>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <span class="current-time" id="current-time"></span>
          <span class="timestamp">Last updated: ${lastUpdatedTime}</span>
        </div>
      </header>

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
              <span class="pm-value" style="color: ${getPMColor(pm10)};">${pm10.toFixed(1)} µg/m³</span>
            </div>
            <div class="pm-row">
              <label>PM2.5</label>
              <span class="pm-value" style="color: ${pm25Color};">${pm25.toFixed(1)} µg/m³</span>
            </div>
            <div class="pm-row">
              <label>PM1</label>
              <span class="pm-value" style="color: ${getPMColor(pm1)};">${pm1.toFixed(1)} µg/m³</span>
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
            <span class="temp-value">${temp.toFixed(1)}°C</span>
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
              <span class="metric-value" style="color: ${humidityColor};">${humidity.toFixed(0)}%</span>
            </div>
          </div>
          ${pressure && pressure !== null ? `
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
  (async () => {
    const locations = getForecastLocations();
    let forecasts = [];
    try {
      forecasts = await Promise.all(locations.map(loc => fetchOpenMeteoForecast(loc.latitude, loc.longitude)));
    } catch (e) {
      // If any fail, show error for that location
      forecasts = locations.map(() => null);
    }
    const forecastPanel = document.getElementById('forecast-panel');
    if (forecastPanel) renderForecastPanel(forecastPanel, forecasts, locations);
  })();

  // Update current time every second
  function updateCurrentTime() {
    const currentTimeEl = document.getElementById('current-time');
    if (currentTimeEl) {
      currentTimeEl.textContent = new Date().toLocaleTimeString();
    }
  }
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
}

// Helper to fetch and render dashboard
async function fetchAndRenderDashboard(accessToken, deviceId) {
  if (!accessToken) {
    alert('Missing access token');
    return;
  }

  try {
    // Fetch device status
    const statusResp = await fetch(
      `https://api.smartthings.com/v1/devices/${encodeURIComponent(deviceId)}/components/main/status`,
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    if (!statusResp.ok) throw new Error(`HTTP ${statusResp.status}`);
    const statusData = await statusResp.json();

    console.log('Raw SmartThings response:', JSON.stringify(statusData, null, 2));

    // Store in global for debug display
    window.lastRawResponse = statusData;

    // Transform SmartThings status format to our expected format
    // SmartThings returns: { "temperatureMeasurement": { "temperature": { "value": -2, ... } }, ... }
    const transformed = {};
    
    if (statusData.temperatureMeasurement && statusData.temperatureMeasurement.temperature) {
      transformed.temperature = { value: statusData.temperatureMeasurement.temperature.value };
    }
    if (statusData.relativeHumidityMeasurement && statusData.relativeHumidityMeasurement.humidity) {
      transformed.humidity = { value: statusData.relativeHumidityMeasurement.humidity.value };
    }
    if (statusData.fineDustSensor && statusData.fineDustSensor.fineDustLevel) {
      transformed.pm25 = { value: statusData.fineDustSensor.fineDustLevel.value };
    }
    if (statusData.veryFineDustSensor && statusData.veryFineDustSensor.veryFineDustLevel) {
      transformed.pm1 = { value: statusData.veryFineDustSensor.veryFineDustLevel.value };
    }
    if (statusData.dustSensor && statusData.dustSensor.dustLevel) {
      transformed.pm10 = { value: statusData.dustSensor.dustLevel.value };
    }
    if (statusData.airQualityHealthConcern && statusData.airQualityHealthConcern.airQualityHealthConcern) {
      transformed.aqi = { value: statusData.airQualityHealthConcern.airQualityHealthConcern.value };
    }
    if (statusData.atmosphericPressureMeasurement && statusData.atmosphericPressureMeasurement.atmosphericPressure) {
      transformed.pressure = { value: statusData.atmosphericPressureMeasurement.atmosphericPressure.value };
    }

    console.log('Transformed data:', transformed);

    // Provide defaults for missing data to prevent errors
    const displayData = {
      temperature: transformed.temperature || { value: 0 },
      humidity: transformed.humidity || { value: 0 },
      pm1: transformed.pm1 || { value: 0 },
      pm25: transformed.pm25 || { value: 0 },
      pm10: transformed.pm10 || { value: 0 },
      aqi: transformed.aqi || { value: 'N/A' },
      pressure: transformed.pressure || null // null indicates not available
    };

    renderDashboard(displayData);
    return displayData;
  } catch (err) {
    console.error('Error fetching/rendering dashboard:', err);
    alert('Failed to render dashboard: ' + err.message);
  }
}
