# Android Weather App Changelog

## 2026-02-18 - Updated to Match TV App v1.0

### OAuth Token Refresh Fix
**Problem**: The Android app was requiring re-authorization after 24 hours, even though SmartThings refresh tokens are valid for 60 days.

**Root Cause**: Similar to the TV app issue documented in `../OAUTH_REFRESH_FIX.md`, the Android app's `saveTokens()` function was not preserving the existing `refresh_token` when SmartThings API returned only a new `access_token` during token refresh operations.

**Changes Made**:

1. **Updated `OAuthManager.saveTokens()` function** (lines 373-403):
   - Now retrieves existing tokens before saving new ones
   - Preserves the existing `refresh_token` if the new token response doesn't include one
   - Matches the logic from the TV app's `oauth.js` implementation
   - Added warning when no refresh token is available
   - Added detailed logging showing token status

2. **Enhanced `OAuthManager.refreshAccessToken()` function** (lines 218-302):
   - Added detailed logging showing token age and refresh status
   - Improved logging messages to match TV app's console output
   - Better error handling for invalid/expired refresh tokens
   - Logs the refresh response to help diagnose issues

3. **Improved logging throughout**:
   - Changed log prefixes to match TV app (e.g., "Attempting token refresh", "Refresh response received")
   - Added explicit comments referencing the TV app's implementation

### Air Quality Icon Fix
**Problem**: The Android app's AQI display didn't properly handle all cases and string normalization.

**Changes Made**:

1. **Updated `MainActivity.getAQICategory()` function** (lines 425-456):
   - Added comprehensive documentation matching the TV app's Matter specification enum mapping
   - Improved string normalization to handle multiple whitespace characters (not just lowercase)
   - Uses `Regex("\\s+")` to replace multiple spaces with single space
   - Matches the exact logic from TV app's `dashboard.js` implementation
   - Supports all enum values: 0=unknown, 1=good, 2=moderate, 3=slightly unhealthy, 4=unhealthy, 5=very unhealthy, 6=hazardous
   - Supports string aliases: "fair" (moderate), "poor" (unhealthy), "very poor" (very unhealthy), "extremely poor" (hazardous)

### Display Optimization
The Android app UI was already optimized for phone screens with:
- ScrollView for vertical scrolling on smaller screens
- Compact card-based layout with proper spacing
- SwipeRefreshLayout for pull-to-refresh functionality
- Material Design cards with color-coded borders
- Responsive text sizes appropriate for mobile devices

### Expected Behavior After Update

1. ✅ Initial authorization via browser works as before
2. ✅ Access token expires after 24 hours
3. ✅ App automatically refreshes access token using the refresh_token
4. ✅ Refresh token is preserved across multiple refresh operations
5. ✅ App continues working for up to 60 days without requiring re-authorization
6. ✅ After 60 days, when refresh token expires, app prompts for re-authorization
7. ✅ AQI displays correct emoji icons (😊, 🙂, 😕, ☹️, 🤢, ☠️) based on air quality
8. ✅ AQI handles both numeric (0-6) and string values correctly

### Testing Instructions

#### OAuth Token Refresh Testing
1. **Fresh Authorization**:
   - Clear app data: Settings → Apps → SmartThings Weather → Storage → Clear Data
   - Open app and complete OAuth flow via browser
   - Verify app loads weather data

2. **Token Refresh Testing**:
   - Use Android Studio Logcat to monitor logs
   - Look for: "Attempting token refresh", "Refresh response received", "Token refreshed successfully"
   - App should automatically refresh token after 24 hours without requiring re-authorization

3. **Manual Testing via Shared Preferences**:
   - Use Android Debug Bridge (adb) or Android Studio Device File Explorer
   - Modify the timestamp in shared preferences to simulate expired token
   - Restart app - should automatically refresh token

#### Air Quality Display Testing
1. **Verify Emoji Icons**:
   - Check that AQI displays proper emoji icons
   - Verify color coding matches air quality level
   - Test with different AQI values (0-6) if possible

2. **String Value Testing**:
   - Verify app handles string values like "good", "moderate", "poor", etc.
   - Check aliases work: "fair" → moderate, "very poor" → very unhealthy

### Related Files
- `app/src/main/java/com/smartthings/weatherapp/OAuthManager.kt` - OAuth implementation
- `app/src/main/java/com/smartthings/weatherapp/MainActivity.kt` - Main app UI and logic
- `../OAUTH_REFRESH_FIX.md` - Original TV app OAuth fix documentation
- `../tizen-app/oauth.js` - TV app OAuth implementation (reference)
- `../tizen-app/dashboard.js` - TV app dashboard implementation (reference)

### Notes
- Changes are backward compatible - existing authorized users won't be affected
- Enhanced logging will help diagnose any future token issues
- Check Android Logcat for detailed token refresh information
- The fix matches the TV app's implementation from `OAUTH_REFRESH_FIX.md`
