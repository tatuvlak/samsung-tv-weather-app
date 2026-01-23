# Secure Configuration Setup

## Android App

### Setup Instructions

1. **Copy the example file:**
   ```bash
   cd android-weather-app
   cp local.properties.example local.properties
   ```

2. **Get your OAuth credentials:**
   - Go to [SmartThings Developer Workspace](https://developer.smartthings.com/workspace/)
   - Create or select your app
   - Copy the OAuth Client ID and Client Secret

3. **Edit `local.properties`** and add your credentials:
   ```properties
   oauth.clientId=YOUR_CLIENT_ID
   oauth.clientSecret=YOUR_CLIENT_SECRET
   oauth.redirectUri=https://tatuvlak.github.io/tv-weather-oauth/callback.html
   oauth.scope=r:devices:* r:locations:*
   ```

4. **Build the app:**
   ```bash
   ./gradlew assembleDebug
   ```

⚠️ **IMPORTANT:** `local.properties` is gitignored and will NOT be committed.

---

## TV App (Tizen)

### Setup Instructions

1. **Copy the example file:**
   ```bash
   cd tizen-app
   cp config.example.js config.js
   ```

2. **Edit `config.js`** and fill in your OAuth credentials:
   ```javascript
   window.APP_CONFIG = {
     oauth: {
       clientId: "YOUR_CLIENT_ID",
       clientSecret: "YOUR_CLIENT_SECRET",
       redirectUri: "https://tatuvlak.github.io/tv-weather-oauth/callback.html",
       scope: "r:devices:* r:locations:*"
     }
   };
   ```

3. **Build and deploy:**
   ```bash
   tizen build-web -out ./build
   ```

⚠️ **IMPORTANT:** `config.js` is gitignored and will NOT be committed.

---

## Security Notes

- **Never commit** `local.properties` or `config.js` to version control
- **Rotate secrets** periodically for security
- Keep your OAuth Client Secret confidential
- Use `.gitignore` files to prevent accidental commits

## Getting OAuth Credentials

1. Visit [SmartThings Developer Workspace](https://developer.smartthings.com/workspace/)
2. Create a new project or select existing
3. Go to "OAuth" section
4. Generate OAuth Client ID and Secret
5. Set redirect URI to: `https://tatuvlak.github.io/tv-weather-oauth/callback.html`
6. Set scopes to: `r:devices:*` and `r:locations:*`
