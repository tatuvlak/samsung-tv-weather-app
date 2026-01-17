# TV Weather — Samsung Tizen TV App

A Tizen web application that displays real-time weather data from Matter-based weather stations via SmartThings API. Features include temperature, humidity, PM2.5, and air quality monitoring with intuitive color-coded emoji indicators.

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
4. **SmartThings Personal Access Token** with device read permissions
5. **Matter Weather Station** connected to SmartThings

## Setup

### 1. SmartThings Personal Access Token

1. Open SmartThings mobile app (iOS or Android)
2. Go to **Settings** → **Personal Access Tokens**
3. Create a new PAT with scopes: `r:devices:*` and `r:locations:*`
4. Copy the generated token (shown only once)
5. Edit `config.js` and paste your token:
   ```javascript
   window.APP_CONFIG = {
     pat: "YOUR_PAT_HERE"
   };
   ```

### 2. Samsung Certificate Setup

Ensure your certificate profile is configured in Tizen Studio. The default profile name used is `bartek`. Update the build commands below if you use a different profile name.

## Build and Deployment

### Building the Package

Navigate to the `build-clean` directory and create a signed .wgt package:

```powershell
cd build-clean

# Clean old artifacts
Remove-Item "*.wgt" -Force -ErrorAction SilentlyContinue
Remove-Item ".manifest.tmp" -Force -ErrorAction SilentlyContinue
Remove-Item "*signature*.xml" -Force -ErrorAction SilentlyContinue

# Create signed package (replace 'bartek' with your certificate profile name)
tizen package -t wgt -s bartek -- .

# Copy package to parent directory for easy access
Copy-Item "TV Weather.wgt" "..\tv-weather.wgt" -Force
cd ..
```

### Installing on TV

1. **Connect to TV via SDB:**
   ```powershell
   sdb connect 192.168.18.109:26101
   ```
   Replace `192.168.18.109` with your TV's IP address.

2. **Install the package:**
   ```powershell
   tizen install -n "tv-weather.wgt" -s 192.168.18.109:26101
   ```

3. **Launch the app:**
   ```powershell
   tizen run -p tvweather1.tvweather -s 192.168.18.109:26101
   ```

### Complete Deployment Script

For convenience, you can run all commands in sequence:

```powershell
cd build-clean
Remove-Item "*.wgt" -Force -ErrorAction SilentlyContinue
Remove-Item ".manifest.tmp" -Force -ErrorAction SilentlyContinue
Remove-Item "*signature*.xml" -Force -ErrorAction SilentlyContinue
tizen package -t wgt -s bartek -- .
Copy-Item "TV Weather.wgt" "..\tv-weather.wgt" -Force
cd ..
tizen install -n "tv-weather.wgt" -s 192.168.18.109:26101
tizen run -p tvweather1.tvweather -s 192.168.18.109:26101
```

## Project Structure

```
tizen-app/
├── build-clean/           # Clean build directory (used for packaging)
│   ├── app.js            # SmartThings API integration
│   ├── dashboard.js      # Weather data visualization
│   ├── index.html        # Application shell
│   ├── style.css         # Styling
│   ├── config.js         # SmartThings PAT configuration
│   ├── config.xml        # Tizen app configuration
│   ├── tizen-manifest.xml # App manifest
│   └── icon.svg          # App icon
├── app.js                # Source: API integration
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
- Ensure old app version is uninstalled: `tizen uninstall -p tvweather1.tvweather -s 192.168.18.109:26101`

### App Shows No Data
- Verify SmartThings PAT in `config.js`
- Check Matter weather station is online in SmartThings app
- Open browser console (F12) to see API response logs

## Technical Details

- **Platform**: Tizen 6.5, Platform Version 4.0
- **API**: SmartThings REST API v1
- **Protocol**: Matter (CHIP) with AirQualityEnum support
- **Package ID**: tvweather1.tvweather
- **Auto-refresh**: 60 seconds
- **Clock update**: 1 second

## License

See project license file.

