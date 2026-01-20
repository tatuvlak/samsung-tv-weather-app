# Android Weather App

This directory contains the Android application for displaying weather information from SmartThings devices.

## Overview

The SmartThings Weather Android app is a companion application that:
- Displays weather information from Samsung SmartThings devices
- Integrates with Samsung TV weather ambient apps
- Provides real-time weather updates on your Android phone

## Quick Start

### Prerequisites

1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
2. **Android SDK** - Installed via Android Studio
3. **Java 17** - For building the project
4. **SmartThings PAT Token** - From [SmartThings Developer Portal](https://my.smartthings.com/)

### Build Instructions

1. **Open in Android Studio:**
   ```bash
   # Navigate to the android-weather-app directory
   cd android-weather-app
   
   # Open in Android Studio
   # File -> Open -> Select android-weather-app folder
   ```

2. **Configure SDK Path:**
   - Android Studio should auto-detect your SDK
   - Or manually create `local.properties`:
     ```properties
     sdk.dir=/path/to/your/Android/Sdk
     ```

3. **Sync Gradle:**
   - Android Studio will prompt to sync Gradle files
   - Click "Sync Now"

4. **Build the App:**
   ```bash
   # Using Gradle wrapper
   ./gradlew assembleDebug
   
   # Or use Android Studio
   # Build -> Make Project
   ```

5. **Run on Device/Emulator:**
   - Connect Android device via USB (with USB debugging enabled)
   - Or create an AVD (Android Virtual Device) in Android Studio
   - Click Run button or `Shift+F10`

### Command Line Build

```bash
# Debug build
./gradlew assembleDebug

# Release build (requires signing configuration)
./gradlew assembleRelease

# Run tests
./gradlew test

# Install on connected device
./gradlew installDebug
```

## Features

### Current Features
- 📱 Clean Material Design UI
- 🌤️ Display current weather conditions
- 🔄 Refresh weather data
- 🔗 Connect to SmartThings API
- 📊 Show temperature, humidity, and wind speed
- ⏰ Last update timestamp

### Planned Features
- 🌡️ Real-time SmartThings device integration
- 📍 Location-based weather from multiple rooms
- 📈 Weather trends and forecasts
- 🔔 Weather alerts and notifications
- 🎨 Customizable themes
- 📺 Samsung TV ambient app control

## Architecture

### Tech Stack
- **Language**: Kotlin
- **Min SDK**: Android 7.0 (API 24)
- **Target SDK**: Android 14 (API 34)
- **Build System**: Gradle 8.1.0
- **UI Framework**: Material Design Components
- **Networking**: Retrofit + OkHttp
- **Async**: Kotlin Coroutines
- **Architecture**: MVVM pattern

### Project Structure

```
android-weather-app/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/smartthings/weatherapp/
│   │       │   ├── MainActivity.kt           # Main UI controller
│   │       │   └── WeatherService.kt         # API service
│   │       ├── res/
│   │       │   ├── layout/
│   │       │   │   └── activity_main.xml     # Main layout
│   │       │   ├── values/
│   │       │   │   ├── strings.xml           # String resources
│   │       │   │   ├── colors.xml            # Color palette
│   │       │   │   └── themes.xml            # App themes
│   │       │   └── mipmap-*/                 # App icons
│   │       └── AndroidManifest.xml           # App manifest
│   ├── build.gradle                          # App dependencies
│   └── proguard-rules.pro                    # ProGuard rules
├── build.gradle                              # Project config
├── settings.gradle                           # Project settings
├── gradle.properties                         # Gradle properties
└── README.md                                 # This file
```

## Configuration

### SmartThings API

To connect to SmartThings:

1. Get your Personal Access Token (PAT) from [SmartThings Portal](https://my.smartthings.com/)
2. In the app, click "Connect TV"
3. Enter your PAT token
4. The app will fetch device data from SmartThings API

### API Endpoints

The app uses these SmartThings API endpoints:
- `GET /devices` - List all devices
- `GET /devices/{id}/status` - Get device status
- Weather data from Samsung TV ambient apps

## Development

### Adding Dependencies

Edit `app/build.gradle`:

```gradle
dependencies {
    implementation 'your-library:version'
}
```

### Modifying UI

1. Layouts: Edit XML files in `app/src/main/res/layout/`
2. Strings: Edit `app/src/main/res/values/strings.xml`
3. Colors: Edit `app/src/main/res/values/colors.xml`
4. Themes: Edit `app/src/main/res/values/themes.xml`

### Adding Features

1. Create new Kotlin files in `app/src/main/java/com/smartthings/weatherapp/`
2. Add new layouts if needed
3. Update `AndroidManifest.xml` for new activities/permissions
4. Sync Gradle and rebuild

## Troubleshooting

### SDK Not Found
```
Error: SDK location not found
```
**Solution**: Create `local.properties` with your SDK path:
```properties
sdk.dir=/path/to/Android/Sdk
```

### Gradle Sync Failed
```
Gradle sync failed
```
**Solution**: 
1. Invalidate caches: File -> Invalidate Caches / Restart
2. Check internet connection for dependency downloads
3. Verify Gradle version compatibility

### Build Failed
```
Build failed with exceptions
```
**Solution**:
1. Check Build Output for specific errors
2. Clean and rebuild: Build -> Clean Project, then Build -> Rebuild Project
3. Verify Java version (requires Java 17)

## Testing

### Run Unit Tests
```bash
./gradlew test
```

### Run on Emulator
1. Create AVD in Android Studio
2. Start emulator
3. Run app from Android Studio

### Run on Physical Device
1. Enable Developer Options on Android device
2. Enable USB Debugging
3. Connect via USB
4. Run app from Android Studio

## Screenshots

The app interface includes:
- Weather card displaying current conditions
- Temperature display in Celsius
- Humidity and wind speed information
- Refresh and Connect buttons
- Material Design styling

## Contributing

When contributing to the Android app:

1. Follow Kotlin coding conventions
2. Use Material Design guidelines
3. Add comments for complex logic
4. Test on multiple Android versions
5. Update documentation

## License

This Android app is part of the SmartThings MCP & Agent project.
See the main [LICENSE](../LICENSE) file for details.

## Support

For issues, questions, or feature requests:
- Check the main repository [issues](https://github.com/tatuvlak/smartthings-mcp-and-agent/issues)
- Read the [SmartThings API docs](https://developer.smartthings.com/)
- Review Android development [best practices](https://developer.android.com/guide)
