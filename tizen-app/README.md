# TV Weather — Samsung Tizen TV App

A Tizen web application that displays readings from a home weather station, fetched from a local hub on the NAS. Temperature, humidity, pressure, PM1/2.5/10 and air quality, with colour-coded indicators, plus an Open-Meteo forecast panel.

It makes no SmartThings API call. That API becomes a paid subscription in October 2026, and this app was one of the three things that depended on it. The station still reports over Matter, so its tile in the SmartThings app is unaffected — this app simply reads the same data from somewhere that stays free.

## Features

- **Real-time Weather Data**: Displays temperature, humidity, PM2.5 levels, and air quality index
- **Matter Protocol Support**: Full support for Matter AirQualityEnum specification (7 levels: 0-6)
- **Visual Indicators**: Color-coded display with expressive emoji icons (😊 → ☠️) for air quality levels
- **Auto-refresh**: Updates every 60 seconds automatically
- **Live Clock**: Real-time clock display
- **Fully Automated**: No user interaction required - auto-discovers and displays data on startup

## Air Quality Index Mapping

The app supports the complete Matter AirQualityEnum specification:

| Value | Category | Color | Icon | Description |
|-------|----------|-------|------|-------------|
| 0 | Unknown | Gray | ❓ | Data unavailable |
| 1 | Good | Green | 😊 | Air quality is satisfactory |
| 2 | Moderate | Yellow | 🙂 | Acceptable air quality |
| 3 | Slightly Unhealthy | Orange | 😕 | Sensitive groups may experience effects |
| 4 | Unhealthy | Red | ☹️ | Everyone may begin to experience effects |
| 5 | Very Unhealthy | Purple | 🤢 | Health alert: everyone may experience serious effects |
| 6 | Hazardous | Maroon | ☠️ | Health warnings of emergency conditions |

## Prerequisites

1. **Samsung Tizen TV** (tested on Tizen 6.5, platform 4.0)
2. **Tizen Studio** with CLI tools installed
3. **Samsung Certificate** (author.p12 and distributor.p12)
4. **The weather hub** running and reachable on the LAN (see the
   `edge-driver-http-request` repository)

## Setup

### 1. Point it at the hub

```bash
cp config.example.js config.js
```

Then edit `config.js`:

```javascript
window.APP_CONFIG = {
  hub: {
    baseUrl: "http://192.168.18.250:5000",
    readToken: "THE_READ_TOKEN_FROM_THE_HUB_ENV",
    refreshSeconds: 60
  }
};
```

Use `READ_TOKEN`, never `INGEST_TOKEN` or `ACTION_TOKEN` — the read token can
only read weather, and it ships inside the `.wgt` on the television, so treat
it as published.

**If the hub's address changes, change it in `config.xml` too**, in the
`connect-src` list of the content-security-policy. Miss that and the fetch is
blocked by policy rather than failing on the network, which looks nothing like
an address problem from the TV's console.

### 2. Samsung Certificate Setup

Ensure your certificate profile is configured in Tizen Studio. Replace `<YOUR_CERT_PROFILE>` in the build commands below with your actual certificate profile name.

## Build and Deployment

### Building the Package

Navigate to the `build-clean` directory and create a signed .wgt package:

```powershell
cd build-clean

# Clean old artifacts
Remove-Item "*.wgt" -Force -ErrorAction SilentlyContinue
Remove-Item ".manifest.tmp" -Force -ErrorAction SilentlyContinue
Remove-Item "*signature*.xml" -Force -ErrorAction SilentlyContinue

# Create signed package (replace '<YOUR_CERT_PROFILE>' with your certificate profile name)
tizen package -t wgt -s <YOUR_CERT_PROFILE> -- .

# Copy package to parent directory for easy access
Copy-Item "TV Weather.wgt" "..\tv-weather.wgt" -Force
cd ..
```

### Installing on TV

1. **Connect to TV via SDB:**
   ```powershell
   sdb connect <YOUR_TV_IP>:26101
   ```
   Replace `<YOUR_TV_IP>` with your TV's actual IP address.

2. **Install the package:**
   ```powershell
   tizen install -n "tv-weather.wgt" -s <YOUR_TV_IP>:26101
   ```

3. **Launch the app:**
   ```powershell
   tizen run -p tvweather1.tvweather -s <YOUR_TV_IP>:26101
   ```

### Complete Deployment Script

For convenience, you can run all commands in sequence:

```powershell
cd build-clean
Remove-Item "*.wgt" -Force -ErrorAction SilentlyContinue
Remove-Item ".manifest.tmp" -Force -ErrorAction SilentlyContinue
Remove-Item "*signature*.xml" -Force -ErrorAction SilentlyContinue
tizen package -t wgt -s <YOUR_CERT_PROFILE> -- .
Copy-Item "TV Weather.wgt" "..\tv-weather.wgt" -Force
cd ..
tizen install -n "tv-weather.wgt" -s <YOUR_TV_IP>:26101
tizen run -p tvweather1.tvweather -s <YOUR_TV_IP>:26101
```

## Project Structure

```
tizen-app/
├── build-clean/           # Clean build directory (used for packaging)
│   ├── app.js            # Polling and remote navigation
│   ├── dashboard.js      # Weather data visualization
│   ├── index.html        # Application shell
│   ├── style.css         # Styling
│   ├── config.js         # Hub address and read token (gitignored)
│   ├── config.xml        # Tizen app configuration
│   ├── tizen-manifest.xml # App manifest
│   └── icon.svg          # App icon
├── app.js                # Source: polling and remote navigation
├── dashboard.js          # Source: Data visualization
├── index.html            # Source: HTML shell
├── style.css             # Source: Styling
├── config.js             # Source: Configuration
├── config.xml            # Source: Tizen config
├── tizen-manifest.xml    # Source: App manifest
├── icon.svg              # Source: App icon
├── README.md             # This file
├── DEPLOYMENT.md         # Additional deployment notes
├── SDB_INSTALL.md        # SDB setup instructions
├── TIZEN_SETUP.md        # Tizen Studio setup
└── VS_CODE_SETUP.md      # VS Code setup
```

## Development

### Local Testing (Browser)

For quick testing without deploying to TV:

```bash
cd tizen-app
python -m http.server 8000
```

Open http://localhost:8000 in a browser to test the UI and API integration.

### Making Changes

1. Edit source files in `tizen-app/` directory
2. Copy changes to `build-clean/` directory
3. Follow the build and deployment steps above

## Troubleshooting

### Connection Issues
- Ensure TV and development machine are on the same network
- Verify TV's developer mode is enabled
- Check SDB connection: `sdb devices`

### Package Installation Fails
- Verify certificate profile name matches the `-s` parameter
- Check certificate validity in Tizen Studio
- Ensure old app version is uninstalled: `tizen uninstall -p tvweather1.tvweather -s <YOUR_TV_IP>:26101`

### App Shows No Data

The status line names the case, so read it before guessing:

- *"Cannot reach the hub at ..."* — the address in `config.js`, **or** the
  `connect-src` list in `config.xml` blocking it. These look identical from the
  TV, so check both.
- *"The hub rejected the read token"* — `readToken` does not match `READ_TOKEN`
  on the hub.
- *"The hub has no readings yet"* — the hub is fine and the weather station is
  not posting. Look at the sensor, not at this app.
- *"STALE"* next to the reading time — data is arriving but old. Again the
  sensor, not this app.

`window.lastRawResponse` holds the last payload for inspection.

## Tests

```bash
node test-hub-mapping.js
```

Loads the real `dashboard.js`, feeds it a payload copied verbatim from the
hub, and asserts every field lands where it should — including the partial
reading case, where the hub omits what the sensor failed to measure, and the
error cases the status line distinguishes.

It also renders a full reading and an empty one and checks two things: that a
missing value shows `N/A` rather than a convincing `0.0`, and that the panels,
metric boxes and rows are identical in both — so a gap never moves anything on
screen.

```bash
node test-startup-retry.js
```

Loads the real `app.js` and checks the startup path: one attempt when the hub
answers, retries when it does not, and a visible panel on screen rather than a
blank dashboard when every attempt fails.

Nothing enforces the field names the app and the hub agree on. A rename on
either side would show up on the television as zeroes rather than as an error,
which is exactly the kind of failure nobody notices for a fortnight.

## Technical Details

- **Platform**: Tizen 6.5, Platform Version 4.0
- **Data source**: `GET /api/weather` on the local hub
- **Protocol**: Matter (CHIP) with AirQualityEnum support
- **Package ID**: tvweather1.tvweather
- **Auto-refresh**: 60 seconds
- **Clock update**: 1 second

## License

See project license file.

