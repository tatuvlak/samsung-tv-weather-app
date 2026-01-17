# OAuth 2.0 Setup Guide

This app now uses OAuth 2.0 with PKCE for SmartThings API authentication, replacing the daily-expiring Personal Access Token (PAT).

## SmartThings Developer Setup

### 1. Register OAuth Application

1. Go to [SmartThings Developer Workspace](https://developer.smartthings.com/)
2. Sign in with your SmartThings account
3. Navigate to **My Apps** → **Create New App**
4. Fill in app details:
   - **App Name**: TV Weather
   - **Description**: Weather dashboard for Tizen TV
   - **Category**: Lifestyle
5. Under **OAuth Settings**:
   - **Client Type**: Confidential (even though we use PKCE, this allows longer token lifetimes)
   - **Authorization Endpoint**: `https://api.smartthings.com/oauth/authorize`
   - **Token Endpoint**: `https://api.smartthings.com/oauth/token`
   - **Redirect URIs**: See [OAUTH_REDIRECT_SOLUTIONS.md](OAUTH_REDIRECT_SOLUTIONS.md) for options:
     - **Recommended**: `https://yourusername.github.io/tv-weather-oauth/callback.html` (host callback page)
     - **Alternative**: `http://localhost:8080/oauth/callback` (manual code copy - works but clunky)
     - **Test if supported**: `urn:ietf:wg:oauth:2.0:oob` (out-of-band)
   - **Scopes**: Select:
     - `r:devices:*` - Read all devices
     - `r:locations:*` - Read locations
6. Click **Save**
7. Note your **Client ID** - you'll need this

**Important:** The redirect URI must be publicly accessible. Localhost won't work because SmartThings (cloud) cannot reach your TV. See [OAUTH_REDIRECT_SOLUTIONS.md](OAUTH_REDIRECT_SOLUTIONS.md) for detailed solutions.

### 2. Update config.js

Open [config.js](config.js) and update the OAuth configuration:

```javascript
window.APP_CONFIG = {
  oauth: {
    clientId: "YOUR_CLIENT_ID_HERE", // Paste your SmartThings OAuth Client ID
    authorizationEndpoint: "https://api.smartthings.com/oauth/authorize",
    tokenEndpoint: "https://api.smartthings.com/oauth/token",
    redirectUri: "http://localhost:8080/oauth/callback",
    scope: "r:devices:* r:locations:*"
  }
};
```

## First-Time Authorization Flow

### On Your TV:

1. Launch the TV Weather app
2. You'll see an authorization screen with a URL
3. **Copy the URL** or **scan it with your phone** if you add QR code support

### On Your Phone/Computer:

1. Open the authorization URL in a browser
2. Log in to your SmartThings account
3. Review and approve the permissions
4. You'll be redirected to `http://localhost:8080/oauth/callback?code=XXXXX...`
5. **Copy the `code` parameter** from the URL (everything after `code=`)

### Back on Your TV:

1. Enter the authorization code in the input field
2. Click **Submit Code**
3. The app will exchange the code for access and refresh tokens
4. Dashboard will load automatically

## Token Management

### Automatic Refresh
- Access tokens expire after ~24 hours
- The app automatically refreshes tokens 5 minutes before expiration
- Refresh tokens are long-lived (typically 60 days)
- **You only need to authorize once** (unless refresh token expires)

### Token Storage
- Tokens are stored in `localStorage`
- Stored data:
  - `access_token` - Used for API calls
  - `refresh_token` - Used to get new access tokens
  - `expires_in` - Token lifetime in seconds
  - `timestamp` - When token was issued

### Manual Token Management

**View current tokens:**
```javascript
window.OAuth.getTokens()
```

**Check authorization status:**
```javascript
window.OAuth.isAuthorized()
```

**Force token refresh:**
```javascript
await window.OAuth.refreshAccessToken()
```

**Clear tokens (re-authorization required):**
```javascript
window.OAuth.clearTokens()
location.reload()
```

## Architecture

### Files Added/Modified

1. **oauth.js** - New file with OAuth implementation
   - PKCE code generation (SHA-256 challenge)
   - Token exchange and refresh
   - Token storage in localStorage
   - Authorization UI display

2. **config.js** - Updated with OAuth configuration

3. **app.js** - Modified to:
   - Check authorization status on startup
   - Trigger OAuth flow if not authorized
   - Use OAuth tokens for API calls

4. **dashboard.js** - Updated to accept OAuth tokens

5. **index.html** - Added oauth.js script

6. **style.css** - Added authorization prompt styles

### OAuth Flow Diagram

```
1. App Start
   ↓
2. Check localStorage for tokens
   ↓
   NO TOKENS → Display Authorization URL
               ↓
               User authorizes on phone
               ↓
               Enter code on TV
               ↓
               Exchange code for tokens
               ↓
               Save to localStorage
   
   HAS TOKENS → Check if expired
                ↓
                EXPIRED → Use refresh_token to get new access_token
                          ↓
                          Update localStorage
                
                VALID → Use access_token for API calls
```

### Security Notes

- **PKCE (Proof Key for Code Exchange)** prevents authorization code interception
- **No Client Secret** needed (secure for public clients like TV apps)
- **Tokens stored locally** - only accessible by this app
- **State parameter** prevents CSRF attacks
- **Short-lived access tokens** reduce risk if compromised
- **Automatic refresh** minimizes token lifetime exposure

## Troubleshooting

### "NOT_AUTHORIZED" Error
- Tokens expired or invalid
- App will automatically trigger re-authorization flow

### Token Refresh Fails
- Refresh token expired (typically after 60 days of inactivity)
- Network connection issues
- SmartThings API changes
- **Solution**: Complete authorization flow again

### Authorization Code Invalid
- Code may have expired (usually 10 minutes)
- Code already used
- **Solution**: Restart authorization flow (reload app)

### API Calls Fail After Successful Authorization
- Check Client ID is correct in config.js
- Verify scopes include `r:devices:*` and `r:locations:*`
- Check SmartThings Developer Console for app status

## Advantages Over PAT

| Feature | PAT | OAuth 2.0 |
|---------|-----|-----------|
| Expiration | 24 hours (daily regeneration) | 60+ days with auto-refresh |
| User Experience | Manual token update daily | One-time setup |
| Security | Manual token copying | Secure authorization flow |
| Revocation | Delete PAT manually | Automatic via OAuth |
| Multi-device | Share same PAT | Per-device authorization |

## Optional Enhancements

### Add QR Code Library
To display actual QR codes instead of URLs:

1. Download [qrcode.js](https://davidshimjs.github.io/qrcodejs/)
2. Add to project: `<script src="qrcode.min.js"></script>`
3. Update oauth.js `displayAuthorizationPrompt()` to generate QR code:
   ```javascript
   new QRCode(document.getElementById("qr-placeholder"), {
     text: authUrl,
     width: 256,
     height: 256
   });
   ```

### Implement HTTP Callback Server
For automatic code capture (advanced):
- Use Tizen's network APIs to create simple HTTP server on port 8080
- Listen for redirect callback
- Automatically extract and exchange authorization code
- No manual code entry needed
