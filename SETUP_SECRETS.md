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

The TV app no longer uses OAuth. It reads the weather station from the local
hub on the NAS, so there is no client secret and nothing to re-authorise.

### Setup Instructions

1. **Copy the example file:**
   ```bash
   cd tizen-app
   cp config.example.js config.js
   ```

2. **Edit `config.js`:**
   ```javascript
   window.APP_CONFIG = {
     hub: {
       baseUrl: "http://192.168.18.250:5000",
       readToken: "THE_READ_TOKEN_FROM_THE_HUB_ENV",
       refreshSeconds: 60
     }
   };
   ```

   Use `READ_TOKEN`, never `INGEST_TOKEN` or `ACTION_TOKEN`. The read token can
   only read weather; the other two can forge sensor readings and command the
   displays.

3. **Also update `config.xml`** if the hub's address changed — it appears in
   the `connect-src` list of the content-security-policy. Miss it and the fetch
   is blocked by policy rather than failing on the network, which looks nothing
   like an address problem.

4. **Build and deploy** — the full sequence is in
   [`tizen-app/DEPLOYMENT.md`](tizen-app/DEPLOYMENT.md). `build-web` alone does
   not produce an installable package; it has to be followed by `tizen package`
   and needs the `-e` exclude list, or the install fails on the signature.

⚠️ `config.js` is gitignored and will NOT be committed.

### The read token is not really a secret

It ships inside the `.wgt` installed on the television. Anyone with the package
or access to the TV can read it. That is why the hub issues three separate
tokens rather than one — this one is deliberately the harmless one. Treat it as
published and keep the other two away from this file.

---

## Security Notes

- **Never commit** `local.properties` or `config.js` to version control
- **Rotate secrets** periodically for security
- Keep the Android OAuth Client Secret confidential
- Use `.gitignore` files to prevent accidental commits

## Getting OAuth Credentials (Android only)

1. Visit [SmartThings Developer Workspace](https://developer.smartthings.com/workspace/)
2. Create a new project or select existing
3. Go to "OAuth" section
4. Generate OAuth Client ID and Secret
5. Set redirect URI to: `https://tatuvlak.github.io/tv-weather-oauth/callback.html`
6. Set scopes to: `r:devices:*` and `r:locations:*`

Only the Android app still needs these. It is next in the migration, and once
it reads from the hub as well, the OAuth credentials and the callback service
they point at can both be retired.
