# OAuth Redirect URI Solutions

## The Problem

OAuth requires a **redirect URI** where SmartThings sends the authorization code after the user approves access. For TV apps, this creates a challenge:

- **localhost doesn't work** - SmartThings (cloud service) cannot reach your TV's localhost
- **TVs don't have public IPs** - They're behind your router's NAT
- **Manual code entry is clunky** - Current workaround requires user to copy/paste

## Solution Options

### ✅ Option 1: Static Callback Page (RECOMMENDED)

Host a simple HTML page on a public URL that displays the authorization code.

**Steps:**

1. **Host the callback page** somewhere publicly accessible:
   - **GitHub Pages** (free): `https://yourusername.github.io/tv-weather-oauth/callback.html`
   - **Netlify/Vercel** (free): Deploy `oauth-callback.html`
   - **Your own server**: Any web hosting

2. **Use the provided callback page**:
   - Copy [oauth-callback.html](oauth-callback.html) to your hosting
   - This page extracts the `code` parameter and displays it nicely

3. **Update [config.js](config.js)**:
   ```javascript
   redirectUri: "https://yourusername.github.io/tv-weather-oauth/callback.html"
   ```

4. **Register in SmartThings**:
   - Add the same URL to your app's allowed redirect URIs

**User Experience:**
1. TV shows authorization URL
2. User opens URL on phone → authorizes
3. SmartThings redirects to your callback page
4. Callback page displays the code with a "Copy" button
5. User pastes code into TV app
6. Done!

**Pros:** ✅ Clean UX, ✅ Works reliably, ✅ Free hosting options  
**Cons:** ⚠️ Still requires manual code entry

---

### Option 2: Quick GitHub Pages Setup (5 minutes)

**Fastest way to get a working redirect URI:**

1. **Create a new GitHub repository**:
   ```
   Name: tv-weather-oauth
   Public repository
   Add README: ✓
   ```

2. **Upload the callback file**:
   - Go to repository → Add file → Upload files
   - Upload `oauth-callback.html` (rename to `callback.html`)
   - Commit

3. **Enable GitHub Pages**:
   - Settings → Pages
   - Source: Deploy from a branch → `main` → `/root`
   - Save

4. **Your redirect URI** is now:
   ```
   https://YOUR_GITHUB_USERNAME.github.io/tv-weather-oauth/callback.html
   ```

5. **Update config.js** with this URL

---

### Option 3: Out-of-Band (OOB) Flow

Some OAuth providers support `urn:ietf:wg:oauth:2.0:oob` which displays the code instead of redirecting.

**Update [config.js](config.js)**:
```javascript
redirectUri: "urn:ietf:wg:oauth:2.0:oob"
```

**Note:** Need to verify if SmartThings supports this. Test and if it doesn't work, use Option 1.

---

### Option 4: Localhost with Instructions (Current - WORKS but clunky)

Keep `http://localhost:8080/oauth/callback` as redirect URI, but user must:

1. Authorize on phone/computer
2. Browser tries to redirect to `http://localhost:8080/oauth/callback?code=...`
3. Page won't load (nothing listening)
4. User manually copies `code=ABC123XYZ` from URL bar
5. Pastes into TV app

**Update [config.js](config.js)**:
```javascript
redirectUri: "http://localhost:8080/oauth/callback"
```

**Pros:** ✅ No external hosting needed  
**Cons:** ⚠️ Confusing UX (broken page), ⚠️ Error messages in browser

---

### 🚀 Option 5: Advanced - Companion Service (Future)

Build a simple cloud service that acts as intermediary:

1. **Service receives OAuth callback** from SmartThings
2. **Stores code** with a session ID for 5 minutes
3. **TV app polls service** with session ID to get code
4. **Auto-completes** authorization without manual entry

**Example Architecture:**
```
TV App → Generates session ID → Shows QR code with session ID
User → Scans QR → Authorizes → SmartThings redirects to service
Service → Stores code with session ID
TV App → Polls service → Gets code → Completes OAuth
```

**Pros:** ✅ Best UX (no manual code entry)  
**Cons:** ⚠️ Requires backend service, ⚠️ More complex

---

## Recommended Approach

**For immediate use:** Option 1 or 2 (Static callback page)

**Quick Start:**
1. Create GitHub repo
2. Upload `oauth-callback.html` (rename to `callback.html`)
3. Enable GitHub Pages
4. Update `config.js` with your GitHub Pages URL
5. Add URL to SmartThings app registration

**Example `config.js` with GitHub Pages:**
```javascript
window.APP_CONFIG = {
  oauth: {
    clientId: "your-client-id-here",
    authorizationEndpoint: "https://api.smartthings.com/oauth/authorize",
    tokenEndpoint: "https://api.smartthings.com/oauth/token",
    redirectUri: "https://yourusername.github.io/tv-weather-oauth/callback.html",
    scope: "r:devices:* r:locations:*"
  }
};
```

This provides the best balance of simplicity, reliability, and user experience.
