# OAuth Token Refresh Fix

## Problem Identified

The TV weather app was requiring re-authorization via QR code after 24 hours of inactivity, despite SmartThings refresh tokens being valid for 60 days.

## Root Cause

The issue was in the `saveTokens()` function in [oauth.js](tizen-app/oauth.js):

1. **Missing Refresh Token Preservation**: When SmartThings refreshes an access token, the API response typically only contains the new `access_token` without returning a new `refresh_token`. The code was not preserving the existing refresh_token, causing it to be lost after the first refresh.

2. **Insufficient Logging**: There was no visibility into what was happening during token refresh operations, making it difficult to diagnose the issue.

## Changes Made

### 1. Fixed `saveTokens()` Function
- Now preserves the existing `refresh_token` if the new token response doesn't include one
- Added validation to warn if no refresh token is available
- Added detailed logging showing token status

**Before:**
```javascript
function saveTokens(tokens) {
  const tokenData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token, // ❌ Lost if not in response
    expires_in: tokens.expires_in || 86400,
    token_type: tokens.token_type || 'Bearer',
    timestamp: Date.now()
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  console.log('Tokens saved successfully');
}
```

**After:**
```javascript
function saveTokens(tokens) {
  const existingTokens = getTokens();
  
  const tokenData = {
    access_token: tokens.access_token,
    // ✅ Preserve existing refresh_token if not returned
    refresh_token: tokens.refresh_token || (existingTokens && existingTokens.refresh_token),
    expires_in: tokens.expires_in || 86400,
    token_type: tokens.token_type || 'Bearer',
    timestamp: Date.now()
  };
  
  if (!tokenData.refresh_token) {
    console.warn('No refresh_token available - tokens may not be refreshable');
  }
  
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  console.log('Tokens saved successfully', {
    has_access_token: !!tokenData.access_token,
    has_refresh_token: !!tokenData.refresh_token,
    expires_in: tokenData.expires_in
  });
}
```

### 2. Enhanced `refreshAccessToken()` Function
- Added detailed logging showing token age and refresh status
- Better error handling for invalid/expired refresh tokens
- Logs the refresh response to help diagnose issues

### 3. Improved `getValidAccessToken()` Function
- Added logging to show token age and whether it's being refreshed
- Better error messages for debugging

## Expected Behavior After Fix

1. ✅ Initial authorization via QR code works as before
2. ✅ Access token expires after 24 hours
3. ✅ App automatically refreshes access token using the refresh_token
4. ✅ Refresh token is preserved across multiple refresh operations
5. ✅ App continues working for up to 60 days without requiring re-authorization
6. ✅ After 60 days, when refresh token expires, app prompts for re-authorization

## Testing Instructions

1. **Fresh Authorization**:
   - Clear localStorage: `localStorage.clear()`
   - Reload app and complete OAuth flow via QR code
   - Verify app loads weather data

2. **Token Refresh After 24 Hours**:
   - Wait 24+ hours (or manually adjust timestamp in localStorage for testing)
   - Open browser console to see logs
   - Refresh the app
   - Should see: `Token expired (age: X hours), refreshing...`
   - Should see: `Refresh response received` with token details
   - App should load without requiring QR code

3. **Manual Testing (Advanced)**:
   ```javascript
   // In browser console on TV:
   
   // 1. Check current token status
   const tokens = JSON.parse(localStorage.getItem('smartthings_oauth_tokens'));
   console.log('Current tokens:', {
     has_access: !!tokens.access_token,
     has_refresh: !!tokens.refresh_token,
     age_hours: ((Date.now() - tokens.timestamp) / 1000 / 60 / 60).toFixed(2)
   });
   
   // 2. Force token expiration for testing
   tokens.timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
   localStorage.setItem('smartthings_oauth_tokens', JSON.stringify(tokens));
   
   // 3. Reload page - should automatically refresh token
   location.reload();
   ```

## SmartThings OAuth Token Lifecycle

- **Access Token**: Valid for ~24 hours, used for API requests
- **Refresh Token**: Valid for 60 days, used to get new access tokens
- **Token Refresh Response**: Only returns new access_token, NOT a new refresh_token (must preserve existing one)

## Related Files

- [tizen-app/oauth.js](tizen-app/oauth.js) - OAuth implementation
- [tizen-app/app.js](tizen-app/app.js) - Main app using OAuth
- [tizen-app/config.example.js](tizen-app/config.example.js) - OAuth configuration template

## Deployment

After deploying this fix:
1. Users with active sessions will benefit immediately
2. Users who lost their refresh_token will need to re-authorize once (via QR code)
3. After that, they should be good for 60 days

## Notes

- The fix is backward compatible - existing authorized users won't be affected
- Enhanced logging will help diagnose any future token issues
- Console logs can be reviewed on TV using Tizen Studio Remote Web Inspector
