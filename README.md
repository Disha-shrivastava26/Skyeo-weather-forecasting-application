# Skyeo — Modern Weather Dashboard

A polished, responsive weather dashboard built with **HTML5, CSS3, and vanilla JavaScript**, powered by **Vite** and the **Open-Meteo API**. Skyeo features a soft blue-lavender glassmorphism aesthetic, seamless dark/light theme switching, dynamic unit conversions, and real-time meteorological observations.

---

## 🌟 Implemented Features

* **Instant Global City Search**: Geocodes city and region names worldwide via the Open-Meteo Geocoding API.
* **Live Current Weather**:
  * Prominent temperature display with active unit indicator.
  * Real-time apparent ("feels-like") temperature.
  * WMO meteorological weather condition badges and descriptive narrative summaries.
* **Weather Highlights (6 In-Depth Cards)**:
  * **Wind Speed & Direction**: Real-time velocity in km/h with 8-point cardinal compass direction (e.g., `NW (310°)`).
  * **Humidity & Dew Point**: Relative humidity percentage and calculated dew point.
  * **Atmospheric Pressure**: Barometric surface pressure in hPa.
  * **UV Index**: Live UV index with standardized risk level badges (*Low, Moderate, High, Very High*).
  * **Horizontal Visibility**: Real-time visibility distance in kilometers.
  * **Air Quality (AQI)**: United States Air Quality Index observation when available (*Good, Moderate, Unhealthy*).
* **Daylight & Solar Schedule**:
  * Sunrise and sunset times.
  * Calculated total daylight length and solar noon time.
  * Visual sun-path trajectory illustration.
* **Interactive Forecast Panel**:
  * **Today Tab**: Hourly forecasts for the remainder of the current day.
  * **Tomorrow Tab**: Hourly projections across tomorrow.
  * **7 Days Tab**: Daily high/low temperature forecasts, weather icons, wind, and humidity.
* **Temperature Unit Converter**:
  * Instant toggle between Celsius (°C) and Fahrenheit (°F) across all current weather metrics and forecast tabs without re-fetching.
* **Light & Dark Theme Switcher**:
  * Dual-theme glassmorphism styling using CSS variables and backdrop blur filters.
  * Theme preference automatically saved to `localStorage`.
* **Robust Error & Request Handling**:
  * Animated loading indicator for in-flight network queries.
  * Friendly error banners for misspelled or unresolvable city queries.
  * Race-condition protection to prevent slower, stale searches from overwriting newer queries.
* **Responsive Layout**:
  * Desktop: Two-column dashboard with main weather indicators on the left and a scrollable forecast panel on the right.
  * Tablet & Mobile: Stacked single-column view with touch-friendly spacing and zero horizontal overflow.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5 (Semantic elements & accessible ARIA labels)
* **Styling**: Vanilla CSS3 (Custom properties, CSS Grid, Flexbox, Glassmorphism, zero frameworks)
* **Scripting**: Vanilla JavaScript (ES Modules, `fetch()`, `async/await`, DOM manipulation)
* **Build Tool & Dev Server**: [Vite](https://vitejs.dev/)
* **APIs**:
  * [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) (Free, no API key required)
  * [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs) (Free, no API key required)
  * [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (Free, no API key required)

---

## 🚀 Installation & Local Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
* [npm](https://www.npmjs.com/) (bundled with Node.js)

### Step 1: Clone the Repository
```bash
git clone <YOUR_REPOSITORY_URL>
cd Weather-app
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to the local address printed in the terminal (typically `http://localhost:5173/`).

### Step 4: Build for Production
To generate minified, optimized production assets in the `dist/` directory:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 📡 API Information

This application uses the open-source **Open-Meteo** APIs:
* **Geocoding Endpoint**: `https://geocoding-api.open-meteo.com/v1/search`
* **Forecast Endpoint**: `https://api.open-meteo.com/v1/forecast`
* **Air Quality Endpoint**: `https://air-quality-api.open-meteo.com/v1/air-quality`

*Note: Open-Meteo provides public non-commercial access without requiring an API key or backend proxy.*

---

## 🔮 Future Improvements (Planned)

The following features are planned for future iterations:
* [ ] **Automatic Geolocation**: Detect current user coordinates using `navigator.geolocation` on first visit.
* [ ] **Interactive Weather Charts**: Render 24-hour temperature and precipitation curves using a lightweight canvas chart.
* [ ] **Saved / Pinned Cities**: Allow bookmarking favorite cities stored in `localStorage` for quick one-click switching.
* [ ] **PWA Support**: Add service workers and a web app manifest for offline caching and home-screen installation.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
