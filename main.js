/**
 * ==========================================================================
 * Skyeo Weather Dashboard — Application Logic
 * Vanilla JavaScript (ES Module)
 * Real Open-Meteo API Integration, Today Time Search & Forecast Tabs
 * ==========================================================================
 */

// --- Global Application State ---
const state = {
  currentUnit: 'C', // 'C' or 'F'
  currentTab: 'today', // 'today', 'tomorrow', '7days'
  currentTheme: localStorage.getItem('skyeo_theme') || localStorage.getItem('skycast_theme') || 'light',

  // Cached API response for dynamic tab switching & unit conversions
  currentWeatherData: null,
  currentLocation: null,
  processedForecast: {
    today: [],
    tomorrow: [],
    '7days': []
  },

  // Stale request race-condition protection
  currentRequestId: 0
};

// --- DOM Element References ---
const elements = {
  // Navigation & Location Badge
  currentLocationText: document.getElementById('current-location-text'),
  previewBadge: document.getElementById('preview-badge'),

  // City Search Controls
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  searchBtn: document.getElementById('search-btn'),

  // Current Weather Card Elements
  currentTempValue: document.getElementById('current-temp-value'),
  currentTempUnit: document.getElementById('current-temp-unit'),
  currentConditionText: document.getElementById('current-condition-text'),
  feelsLikeValue: document.getElementById('feels-like-value'),
  highLowPlaceholder: document.getElementById('high-low-placeholder'),
  weatherSummaryText: document.getElementById('weather-summary-text'),
  currentTimeDisplay: document.getElementById('current-time-display'),

  // Weather Statistics Highlights
  statHumidityValue: document.getElementById('stat-humidity-value'),
  statDewPoint: document.getElementById('stat-dew-point'),
  statWindValue: document.getElementById('stat-wind-value'),
  statWindUnit: document.getElementById('stat-wind-unit'),
  statWindDir: document.getElementById('stat-wind-dir'),
  statPressureValue: document.getElementById('stat-pressure-value'),
  statVisibilityValue: document.getElementById('stat-visibility-value'),
  statUvValue: document.getElementById('stat-uv-value'),
  statUvLabel: document.getElementById('stat-uv-label'),

  // Sunrise / Sunset Elements
  sunriseTime: document.getElementById('sunrise-time'),
  sunsetTime: document.getElementById('sunset-time'),
  daylightLength: document.getElementById('daylight-length'),
  solarNoonTime: document.getElementById('solar-noon-time'),

  // Forecast Panel
  tabButtons: document.querySelectorAll('.tab-btn'),
  forecastList: document.getElementById('forecast-list'),

  // Loading & Error Containers
  loadingIndicator: document.getElementById('loading-indicator'),
  errorContainer: document.getElementById('error-container'),
  errorMessage: document.getElementById('error-message'),
  statusBanner: document.getElementById('status-banner'),

  // Theme & Units
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeIconSun: document.querySelector('.theme-icon-sun'),
  themeIconMoon: document.querySelector('.theme-icon-moon'),
  unitCelsiusBtn: document.getElementById('unit-celsius-btn'),
  unitFahrenheitBtn: document.getElementById('unit-fahrenheit-btn'),

  // Settings Modal
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  saveSettingsBtn: document.getElementById('save-settings-btn')
};

// ==========================================================================
// Weather Code Translation & SVG Icons
// ==========================================================================

/**
 * Converts Open-Meteo WMO weather codes into user-friendly conditions & icons
 * @param {number} weatherCode
 * @returns {{ condition: string, summary: string, icon: string }}
 */
function getWeatherDescription(weatherCode) {
  switch (weatherCode) {
    case 0:
      return { condition: 'Clear Sky', summary: 'Sunny and completely clear skies.', icon: 'sun' };
    case 1:
      return { condition: 'Mainly Clear', summary: 'Mostly clear skies with gentle sunshine.', icon: 'sun' };
    case 2:
      return { condition: 'Partly Cloudy', summary: 'Scattered clouds with intermittent sunny spells.', icon: 'cloud-sun' };
    case 3:
      return { condition: 'Overcast', summary: 'Dense continuous overcast cloud layer.', icon: 'cloud' };
    case 45:
    case 48:
      return { condition: 'Foggy', summary: 'Misty fog causing reduced visibility.', icon: 'cloud' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', summary: 'Light continuous drizzle.', icon: 'rain' };
    case 56:
    case 57:
      return { condition: 'Freezing Drizzle', summary: 'Cold drizzle freezing on cold surfaces.', icon: 'rain' };
    case 61:
      return { condition: 'Slight Rain', summary: 'Light rain showers.', icon: 'rain' };
    case 63:
      return { condition: 'Moderate Rain', summary: 'Steady rainfall across the area.', icon: 'rain' };
    case 65:
      return { condition: 'Heavy Rain', summary: 'Heavy rain downpours. Outdoor precautions advised.', icon: 'rain' };
    case 66:
    case 67:
      return { condition: 'Freezing Rain', summary: 'Freezing rain with slick road conditions.', icon: 'rain' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snow Fall', summary: 'Snowfall accumulating on the ground.', icon: 'snow' };
    case 77:
      return { condition: 'Snow Grains', summary: 'Intermittent snow grains falling.', icon: 'snow' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', summary: 'Scattered convective rain showers.', icon: 'rain' };
    case 85:
    case 86:
      return { condition: 'Snow Showers', summary: 'Passing snow flurries.', icon: 'snow' };
    case 95:
      return { condition: 'Thunderstorm', summary: 'Thunderstorm activity with lightning risk.', icon: 'thunder' };
    case 96:
    case 99:
      return { condition: 'Thunderstorm with Hail', summary: 'Severe storm with hail precipitation.', icon: 'thunder' };
    default:
      return { condition: 'Moderate Weather', summary: 'Mixed meteorological conditions reported.', icon: 'cloud-sun' };
  }
}

/**
 * Returns clean inline SVG for the forecast item icons
 * @param {string} type
 */
function getWeatherIconSvg(type) {
  switch (type) {
    case 'sun':
      return `
        <svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" fill="#FBBF24" fill-opacity="0.3"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
    case 'cloud-sun':
      return `
        <svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v2"></path>
          <path d="M4.93 4.93l1.41 1.41"></path>
          <path d="M20 12h2"></path>
          <path d="M19.07 4.93l-1.41 1.41"></path>
          <path d="M15.5 8.5a4 4 0 0 0-5.8 3.5"></path>
          <path d="M17.5 19H9a5 5 0 0 1 0-10c.24 0 .47.02.7.06A6 6 0 0 1 21 14a4 4 0 0 1-3.5 5z" fill="#93C5FD" fill-opacity="0.3"></path>
        </svg>
      `;
    case 'cloud':
      return `
        <svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#CBD5E1" fill-opacity="0.3"></path>
        </svg>
      `;
    case 'rain':
      return `
        <svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="16" y1="13" x2="16" y2="21"></line>
          <line x1="8" y1="13" x2="8" y2="21"></line>
          <line x1="12" y1="15" x2="12" y2="23"></line>
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" fill="#BAE6FD" fill-opacity="0.3"></path>
        </svg>
      `;
    case 'snow':
      return `
        <svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"></line>
        </svg>
      `;
    case 'thunder':
      return `
        <svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path>
          <polyline points="13 11 9 17 15 17 11 23"></polyline>
        </svg>
      `;
    default:
      return `
        <svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#818CF8" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
        </svg>
      `;
  }
}

// Convert wind direction degrees to 8-point compass text
function getWindDirectionText(degrees) {
  if (degrees === null || degrees === undefined) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return `${directions[index]} (${Math.round(degrees)}°)`;
}

// Format temperature value based on active unit (°C or °F)
function convertToDisplayTemp(celsiusValue) {
  if (celsiusValue === null || celsiusValue === undefined || isNaN(celsiusValue)) {
    return '--';
  }
  if (state.currentUnit === 'F') {
    return Math.round((celsiusValue * 9) / 5 + 32);
  }
  return Math.round(celsiusValue);
}

function formatTempWithDegree(celsiusValue) {
  return `${convertToDisplayTemp(celsiusValue)}°`;
}

// ==========================================================================
// 1. Render Current Weather
// ==========================================================================

function renderCurrentWeather(weatherData, location) {
  if (!weatherData || !weatherData.current) return;

  const current = weatherData.current;
  const tempC = current.temperature_2m;
  const apparentTempC = current.apparent_temperature;
  const humidity = current.relative_humidity_2m;
  const windSpeed = current.wind_speed_10m;
  const windDirection = current.wind_direction_10m;
  const weatherCode = current.weather_code;

  const { condition, summary } = getWeatherDescription(weatherCode);

  // Update Location badge
  const regionText = location.region ? `${location.region}, ` : '';
  const countryText = location.country ? location.country : '';
  elements.currentLocationText.textContent = `${location.name}, ${regionText}${countryText}`;

  // Update Current Temperature
  elements.currentTempValue.textContent = convertToDisplayTemp(tempC);
  elements.currentTempUnit.textContent = state.currentUnit === 'F' ? '°F' : '°C';

  // Update Feels-Like Temperature
  const unitSymbol = state.currentUnit === 'F' ? '°F' : '°C';
  elements.feelsLikeValue.textContent = `${convertToDisplayTemp(apparentTempC)}${unitSymbol}`;

  // Update Humidity & calculated Dew Point
  elements.statHumidityValue.textContent = `${Math.round(humidity)}%`;
  const dewPointC = Math.round(tempC - ((100 - humidity) / 5));
  if (elements.statDewPoint) {
    elements.statDewPoint.textContent = state.currentUnit === 'F'
      ? `${Math.round((dewPointC * 9) / 5 + 32)}°F`
      : `${dewPointC}°C`;
  }

  // Update Wind Speed
  elements.statWindValue.textContent = windSpeed.toFixed(1);
  elements.statWindUnit.textContent = 'km/h';
  if (elements.statWindDir) {
    elements.statWindDir.textContent = getWindDirectionText(windDirection);
  }

  // Update Weather Condition & Summary
  elements.currentConditionText.textContent = condition;
  elements.weatherSummaryText.textContent = summary;

  // Update High & Low from daily data
  if (weatherData.daily && weatherData.daily.temperature_2m_max && weatherData.daily.temperature_2m_min) {
    const high = convertToDisplayTemp(weatherData.daily.temperature_2m_max[0]);
    const low = convertToDisplayTemp(weatherData.daily.temperature_2m_min[0]);
    elements.highLowPlaceholder.textContent = `H: ${high}° L: ${low}°`;
  }

  // Update Sunrise & Sunset if available
  if (weatherData.daily && weatherData.daily.sunrise && weatherData.daily.sunset) {
    const sunriseDate = new Date(weatherData.daily.sunrise[0]);
    const sunsetDate = new Date(weatherData.daily.sunset[0]);
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    
    if (elements.sunriseTime) elements.sunriseTime.textContent = sunriseDate.toLocaleTimeString('en-US', timeOptions);
    if (elements.sunsetTime) elements.sunsetTime.textContent = sunsetDate.toLocaleTimeString('en-US', timeOptions);

    const diffMs = sunsetDate - sunriseDate;
    if (diffMs > 0 && elements.daylightLength) {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      elements.daylightLength.textContent = `${diffHrs}h ${diffMins}m`;

      if (elements.solarNoonTime) {
        const noonDate = new Date(sunriseDate.getTime() + diffMs / 2);
        elements.solarNoonTime.textContent = noonDate.toLocaleTimeString('en-US', timeOptions);
      }
    }
  }

  // Remove preview badge once real data is present
  if (elements.previewBadge) elements.previewBadge.style.display = 'none';
  if (elements.statusBanner) elements.statusBanner.style.display = 'none';
}

// ==========================================================================
// 2. Forecast Parsing & Tab Rendering (Today with Search, Tomorrow, 7 Days)
// ==========================================================================

/**
 * Parses hourly and daily forecast data into structured objects for the 3 tabs.
 * In particular, extracts all 24 hours of Today so user can search any hour.
 * @param {Object} weatherData
 */
function processForecastData(weatherData) {
  const hourly = weatherData.hourly;
  const daily = weatherData.daily;
  if (!hourly || !daily) return;

  const formatHour12 = (d) => {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // 1. Process "Today" Tab (All 24 hours of Today's date for time search)
  const todayDateStr = daily.time[0]; // YYYY-MM-DD
  const currentHour = new Date(weatherData.current.time).getHours();
  const todayList = [];

  for (let i = 0; i < hourly.time.length; i++) {
    if (hourly.time[i].startsWith(todayDateStr)) {
      const d = new Date(hourly.time[i]);
      const hour = d.getHours();
      const desc = getWeatherDescription(hourly.weather_code[i]);

      const time12 = formatHour12(d); // e.g. "02:00 PM"
      const time12Concise = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }); // e.g. "2 PM"
      const time24 = `${String(hour).padStart(2, '0')}:00`; // e.g. "14:00"

      let period = 'Night';
      if (hour >= 6 && hour < 12) period = 'Morning';
      else if (hour >= 12 && hour < 17) period = 'Afternoon';
      else if (hour >= 17 && hour < 21) period = 'Evening';

      const isCurrent = hour === currentHour;

      todayList.push({
        time: isCurrent ? 'Now' : time12,
        rawTime12: time12,
        time12Concise: time12Concise,
        time24: time24,
        hour: hour,
        period: period,
        sub: isCurrent ? 'Current Hour' : period,
        condition: desc.condition,
        tempC: hourly.temperature_2m[i],
        wind: `${Math.round(hourly.wind_speed_10m[i])} km/h`,
        humidity: `${hourly.relative_humidity_2m[i]}%`,
        icon: desc.icon,
        isCurrent: isCurrent
      });
    }
  }

  // 2. Process "Tomorrow" Tab (Sampled hourly intervals on tomorrow's date)
  const tomorrowList = [];
  const tomorrowDate = daily.time[1]; // YYYY-MM-DD
  if (tomorrowDate) {
    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i].startsWith(tomorrowDate)) {
        const d = new Date(hourly.time[i]);
        const hour = d.getHours();
        // Sample every 3 hours across tomorrow (06:00, 09:00, 12:00, 15:00, 18:00, 21:00)
        if (hour >= 6 && hour % 3 === 0) {
          const desc = getWeatherDescription(hourly.weather_code[i]);
          tomorrowList.push({
            time: formatHour12(d),
            sub: 'Tomorrow',
            condition: desc.condition,
            tempC: hourly.temperature_2m[i],
            wind: `${Math.round(hourly.wind_speed_10m[i])} km/h`,
            humidity: `${hourly.relative_humidity_2m[i]}%`,
            icon: desc.icon
          });
        }
      }
    }
  }

  // 3. Process "7 Days" Tab (Daily summaries)
  const sevenDaysList = [];
  const daysCount = Math.min(7, daily.time.length);
  for (let d = 0; d < daysCount; d++) {
    const dateObj = new Date(daily.time[d] + 'T00:00:00');
    const dayLabel = d === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const dateSub = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const desc = getWeatherDescription(daily.weather_code[d]);

    sevenDaysList.push({
      time: dayLabel,
      sub: dateSub,
      condition: desc.condition,
      highC: daily.temperature_2m_max[d],
      lowC: daily.temperature_2m_min[d],
      wind: `${Math.round(weatherData.current.wind_speed_10m)} km/h`,
      humidity: `${weatherData.current.relative_humidity_2m}%`,
      icon: desc.icon
    });
  }

  state.processedForecast = {
    today: todayList,
    tomorrow: tomorrowList,
    '7days': sevenDaysList
  };
}

/**
 * Updates the forecast list DOM whenever the active tab or unit changes
 */
function renderForecast() {
  const items = state.processedForecast[state.currentTab] || [];
  elements.forecastList.innerHTML = '';

  if (items.length === 0) {
    elements.forecastList.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        Forecast data is loading...
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'forecast-row';

    // Format temperature: display High/Low for 7-day tab or single temp for hourly tabs
    const tempHtml = item.highC !== undefined
      ? `<span class="forecast-temp-high">${formatTempWithDegree(item.highC)}</span>
         <span class="forecast-temp-low">Low ${formatTempWithDegree(item.lowC)}</span>`
      : `<span class="forecast-temp-high">${formatTempWithDegree(item.tempC)}</span>`;

    row.innerHTML = `
      <div class="forecast-time-col">
        <span class="forecast-label">${item.time}</span>
        <span class="forecast-sublabel">${item.sub}</span>
      </div>
      <div class="forecast-condition-col">
        ${getWeatherIconSvg(item.icon)}
        <span class="forecast-condition-name">${item.condition}</span>
      </div>
      <div class="forecast-temp-col">
        ${tempHtml}
      </div>
      <div class="forecast-metrics-col">
        <span class="forecast-metric-item" title="Wind">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/></svg>
          ${item.wind}
        </span>
        <span class="forecast-metric-item" title="Humidity">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          ${item.humidity}
        </span>
      </div>
    `;

    elements.forecastList.appendChild(row);
  });
}

/**
 * Tab Click Handler: updates active tab in state, toggles active class, and re-renders DOM
 */
function handleTabClick(e) {
  const targetTab = e.currentTarget.dataset.tab;
  if (!targetTab || targetTab === state.currentTab) return;

  state.currentTab = targetTab;

  elements.tabButtons.forEach((btn) => {
    const isSelected = btn.dataset.tab === targetTab;
    btn.classList.toggle('active', isSelected);
    btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });

  renderForecast();
}

// ==========================================================================
// Search & API Orchestration
// ==========================================================================

async function searchAndLoadCity(cityName) {
  if (!cityName || !cityName.trim()) {
    showError('Please enter a city name.');
    return;
  }

  const query = cityName.trim();
  const requestId = ++state.currentRequestId;

  showLoading();
  hideError();

  try {
    // 1. Geocode City
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error(`Geocoding error: ${geoResponse.status}`);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`No city found matching "${query}". Please check the spelling.`);
    }

    const loc = geoData.results[0];
    const location = {
      name: loc.name,
      region: loc.admin1 || '',
      country: loc.country || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone || 'auto'
    };

    if (requestId !== state.currentRequestId) return;

    // 2. Fetch Weather Data (Current observations + hourly + 7-day daily)
    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.search = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
      timezone: location.timezone
    }).toString();

    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) throw new Error(`Forecast service error: ${forecastResponse.status}`);
    const weatherData = await forecastResponse.json();

    if (requestId !== state.currentRequestId) return;

    // Cache state
    state.currentWeatherData = weatherData;
    state.currentLocation = location;

    // Update Current Weather in DOM
    renderCurrentWeather(weatherData, location);

    // Process & Render Forecast in DOM for Today (with time search), Tomorrow, and 7 Days tabs
    processForecastData(weatherData);
    renderForecast();

    // Update local clock with city timezone
    updateClock(location.timezone);

    hideLoading();
  } catch (err) {
    if (requestId !== state.currentRequestId) return;
    hideLoading();
    showError(err.message || 'Unable to fetch weather data.');
  }
}

// --- Loading & Error UI States ---
function showLoading() {
  elements.loadingIndicator.style.display = 'flex';
  elements.errorContainer.style.display = 'none';
  elements.searchBtn.disabled = true;
}

function hideLoading() {
  elements.loadingIndicator.style.display = 'none';
  elements.searchBtn.disabled = false;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorContainer.style.display = 'flex';
  elements.loadingIndicator.style.display = 'none';
  if (elements.statusBanner) elements.statusBanner.style.display = 'none';
}

function hideError() {
  elements.errorContainer.style.display = 'none';
}

// --- Unit Switching (°C / °F) ---
function setUnit(unit) {
  if (state.currentUnit === unit) return;
  state.currentUnit = unit;

  if (unit === 'C') {
    elements.unitCelsiusBtn.classList.add('active');
    elements.unitCelsiusBtn.setAttribute('aria-checked', 'true');
    elements.unitFahrenheitBtn.classList.remove('active');
    elements.unitFahrenheitBtn.setAttribute('aria-checked', 'false');
  } else {
    elements.unitFahrenheitBtn.classList.add('active');
    elements.unitFahrenheitBtn.setAttribute('aria-checked', 'true');
    elements.unitCelsiusBtn.classList.remove('active');
    elements.unitCelsiusBtn.setAttribute('aria-checked', 'false');
  }

  // Re-render both Current Weather and Forecast items with converted unit
  if (state.currentWeatherData && state.currentLocation) {
    renderCurrentWeather(state.currentWeatherData, state.currentLocation);
    renderForecast();
  }
}

// --- Theme Management ---
function applyTheme(theme) {
  state.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('skyeo_theme', theme);

  if (theme === 'dark') {
    elements.themeIconSun.style.display = 'none';
    elements.themeIconMoon.style.display = 'block';
  } else {
    elements.themeIconSun.style.display = 'block';
    elements.themeIconMoon.style.display = 'none';
  }
}

function toggleTheme() {
  applyTheme(state.currentTheme === 'light' ? 'dark' : 'light');
}

// --- Live Clock ---
function updateClock(timeZone) {
  try {
    const now = new Date();
    elements.currentTimeDisplay.textContent = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone || undefined
    }).format(now);
  } catch {
    const now = new Date();
    elements.currentTimeDisplay.textContent = now.toLocaleTimeString('en-US', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

// --- Event Listeners Registration ---
function setupEventListeners() {
  // Theme Toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Unit Selector
  elements.unitCelsiusBtn.addEventListener('click', () => setUnit('C'));
  elements.unitFahrenheitBtn.addEventListener('click', () => setUnit('F'));

  // Forecast Tabs Click Listener (Today / Tomorrow / 7 Days)
  elements.tabButtons.forEach((btn) => {
    btn.addEventListener('click', handleTabClick);
  });

  // City Search Form
  elements.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = elements.searchInput.value.trim();
    if (!query) {
      showError('Please enter a city name.');
      return;
    }
    searchAndLoadCity(query);
  });

  // City Search Input Clear Button
  elements.searchInput.addEventListener('input', (e) => {
    elements.clearSearchBtn.style.display = e.target.value.length > 0 ? 'block' : 'none';
    if (elements.errorContainer.style.display === 'flex') {
      hideError();
    }
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    elements.searchInput.focus();
  });

  // Settings Modal Controls
  elements.settingsBtn.addEventListener('click', () => elements.settingsModal.style.display = 'flex');
  elements.closeModalBtn.addEventListener('click', () => elements.settingsModal.style.display = 'none');
  elements.saveSettingsBtn.addEventListener('click', () => elements.settingsModal.style.display = 'none');
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) elements.settingsModal.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') elements.settingsModal.style.display = 'none';
  });
}

// --- Application Initialization ---
function init() {
  applyTheme(state.currentTheme);
  setupEventListeners();

  // Load initial city (San Francisco)
  searchAndLoadCity('San Francisco');

  // Clock tick interval
  setInterval(() => {
    updateClock(state.currentLocation?.timezone);
  }, 30000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
