# SmartThings Weather Android App

An Android application that displays weather information from Samsung SmartThings devices.

## Features

- **Air Quality Monitoring**: Display PM1, PM2.5, PM10, and AQI with color-coded indicators and emoji icons
- **Temperature & Clothing Recommendations**: Smart clothing suggestions based on current temperature
- **Humidity & Atmospheric Pressure**: Track indoor/outdoor humidity and barometric pressure
- **OAuth 2.0 with Token Refresh**: Seamless authentication with automatic token refresh (no re-auth for 60 days)
- **Pull-to-Refresh**: Swipe down to manually refresh weather data
- **Auto-Refresh**: Automatic updates every 60 seconds
- **Material Design UI**: Clean, modern UI optimized for mobile screens

## Recent Updates (2026-02-18)

✅ **Updated to match TV app version 1.0**:
- Fixed OAuth token refresh to preserve refresh_token (matches `OAUTH_REFRESH_FIX.md`)
- Updated AQI icons to use proper emoji display (😊, 🙂, 😕, ☹️, 🤢, ☠️)
- Enhanced logging for better debugging
- Improved string normalization for AQI values

See [CHANGELOG.md](CHANGELOG.md) for detailed changes.

## Requirements

- Android 7.0 (API level 24) or higher
- SmartThings OAuth application (Client ID from [SmartThings Developer Portal](https://my.smartthings.com/))
- Internet connection

## Installation

1. Clone this repository
2. Open the `android-weather-app` directory in Android Studio
3. Sync Gradle files
4. Build and run the app

## Configuration

To connect to SmartThings:

1. Configure your OAuth Client ID in `OAuthManager.kt`
2. In the app, click "Connect TV" to start OAuth flow
3. Authorize the app in your browser
4. Copy and paste the authorization code back into the app

The app uses the same OAuth callback as the TV app: `https://tatuvlak.github.io/tv-weather-oauth/callback.html`

## Building

### Debug Build
```bash
./gradlew assembleDebug
```

### Release Build
```bash
./gradlew assembleRelease
```

## Architecture

The app follows modern Android development practices:

- **Language**: Kotlin
- **Architecture**: MVVM pattern
- **Networking**: Retrofit + OkHttp
- **Async**: Kotlin Coroutines
- **UI**: Material Design Components
- **DI**: Service Locator pattern

## API Integration

The app integrates with SmartThings API to:
- Fetch device status
- Get weather ambient app data from Samsung TVs
- Monitor device state changes

## Permissions

The app requires:
- `INTERNET`: To communicate with SmartThings API
- `ACCESS_NETWORK_STATE`: To check network connectivity

## Screenshots

[Screenshots will be added after running the app]

## License

This project is part of the SmartThings MCP & Agent project.
See the main [LICENSE](../LICENSE) file for details.

## Support

For issues and feature requests, please use the main repository's issue tracker.
