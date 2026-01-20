# Quick Start - Testing OAuth Implementation

## Before You Start

1. **Register OAuth app** at [SmartThings Developer Workspace](https://developer.smartthings.com/)
2. **Copy your Client ID**
3. **Update [config.js](config.js)** - replace `YOUR_CLIENT_ID` with your actual Client ID

## Testing Locally (Before Deploying to TV)

### Option 1: Browser Testing
```powershell
# Serve files locally
cd tizen-app
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

### Option 2: Direct File Testing
Open [index.html](index.html) directly in Chrome/Edge (may have CORS issues with API calls).

## Testing OAuth Flow

### 1. First Launch (No Tokens)
- App displays authorization URL
- Copy URL and open in new tab/phone
- Authorize with SmartThings account
- Copy the `code` parameter from redirect URL
- Paste code in app input field
- Submit → Tokens saved to localStorage

### 2. Subsequent Launches (Has Tokens)
- App checks localStorage
- Uses existing access token
- Automatically loads dashboard

### 3. Token Expiration Simulation
```javascript
// In browser console:
// Force token to appear expired
let tokens = JSON.parse(localStorage.getItem('smartthings_oauth_tokens'));
tokens.timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
localStorage.setItem('smartthings_oauth_tokens', JSON.stringify(tokens));
location.reload();
// Should trigger automatic refresh
```

### 4. Force Re-Authorization
```javascript
// In browser console:
window.OAuth.clearTokens();
location.reload();
```

## Debugging Commands

### Check Current Token Status
```javascript
// In browser console:
console.log('Tokens:', window.OAuth.getTokens());
console.log('Is Authorized:', window.OAuth.isAuthorized());
```

### Manual Token Refresh
```javascript
// In browser console:
await window.OAuth.refreshAccessToken();
```

### View Authorization URL
```javascript
// In browser console:
let url = await window.OAuth.startAuthorizationFlow();
console.log('Auth URL:', url);
```

## Expected Flow

1. **App loads** → Checks `localStorage` for tokens
2. **No tokens found** → Display authorization screen
3. **User authorizes** → Enters code → Tokens saved
4. **Dashboard loads** → Uses access_token for API calls
5. **Token expires** → Auto-refresh using refresh_token
6. **Refresh fails** → Show authorization screen again

## Common Issues

### "YOUR_CLIENT_ID" in Authorization URL
- **Problem**: Forgot to update config.js
- **Solution**: Edit [config.js](config.js) and add your SmartThings Client ID

### CORS Errors in Browser
- **Problem**: SmartThings API blocks localhost origins
- **Solution**: This is expected; will work on actual TV
- **Workaround**: Use browser extension to disable CORS (dev only)

### "Code verifier not found"
- **Problem**: Page was refreshed during authorization flow
- **Solution**: Restart authorization flow (reload page)

### Token Refresh Returns 401
- **Problem**: Refresh token expired or invalid
- **Solution**: Clear tokens and re-authorize
```javascript
window.OAuth.clearTokens();
location.reload();
```

## Deploy to TV

Once tested locally:

```powershell
cd tizen-app
tizen package -t wgt -s bartek -- .
tizen install -n "TV Weather.wgt" -s <YOUR_TV_IP>:26101
tizen run -p tvweather1.tvweather -s <YOUR_TV_IP>:26101
```

**Note**: On TV, you'll need to:
1. View authorization URL on TV screen
2. Type/scan URL on phone
3. Authorize
4. Copy code back to TV input

## Migration Path

If you want to test both PAT and OAuth during transition:

1. Keep PAT in config.js as fallback:
```javascript
window.APP_CONFIG = {
  oauth: { clientId: "...", ... },
  pat: "your-pat-here" // Fallback
};
```

2. Modify app.js to try OAuth first, fall back to PAT:
```javascript
async function getAuthToken() {
  if (window.OAuth.isAuthorized()) {
    return await window.OAuth.getValidAccessToken();
  }
  // Fallback to PAT
  return window.APP_CONFIG.pat;
}
```

This allows gradual migration and testing.

## Next Steps

Once OAuth is working:
1. Remove PAT from config.js (security)
2. Add QR code library for easier phone scanning
3. Consider implementing local HTTP server for automatic code capture
4. Add "Sign Out" button to clear tokens
5. Display token expiration time in UI
