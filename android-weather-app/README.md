# SmartThings Weather Android App

An Android application that displays weather information from Samsung SmartThings devices.

## Features

- Display current weather information
- Connect to SmartThings API
- Support for Samsung TV weather ambient apps
- Real-time weather updates
- Clean Material Design UI

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
