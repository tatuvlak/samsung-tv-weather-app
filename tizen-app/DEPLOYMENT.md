TV Weather App — Tizen Deployment Guide

Prerequisites
- Tizen Studio installed (https://developer.tizen.org/development/tizen-studio/download)
- Samsung SG5B TV connected to your development machine via USB or same network
- Developer mode enabled on TV (Settings → About TV → Developer Mode ON)

Deployment Steps

Option 1: Using Tizen Studio (Recommended for TV)

1. Create Tizen Project
   - Open Tizen Studio
   - File → New → Tizen Project
   - Select "Web Application" → "Web Application (for TV)"
   - Name: "tv-weather"
   - Click Finish

2. Replace Project Files
   - Replace the default project files with contents from tizen-app/
   - Keep: tizen-manifest.xml, config.xml
   - Copy: index.html, style.css, app.js, dashboard.js, config.js

3. Update config.js
   - Edit config.js with your SmartThings PAT

4. Build & Run
   - Right-click project → Build → Build With Active Profile
   - Click "Run As" → Run on Target Device
   - Select your Samsung SG5B TV from device list
   - App installs and launches automatically

Option 2: Command-Line Deployment (Recommended)

**Prerequisites:**
- Tizen CLI tools installed
- TV connected to same network
- Developer mode enabled on TV

**Complete Build & Deploy Process:**

```powershell
# Navigate to project directory
cd tizen-app

# Step 1: Build the web application (exclude non-app files to avoid signature errors)
tizen build-web -out ./build -e "*.md,oauth-callback.html,build-clean/*,.gitignore"

# Step 2: Package and sign the built application
cd build
tizen package -t wgt -s bartek -- .

# Step 3: Rename package (use actual package name from config.xml)
Move-Item -Force "Świnka Pogodynka.wgt" "tv-weather.wgt"
cd ..

# Step 4: Connect to TV via SDB (if not already connected)
# Replace <YOUR_TV_IP> with your TV's actual IP address
sdb connect <YOUR_TV_IP>:26101

# Step 5: Uninstall previous version (if certificate changed)
tizen uninstall -p tvweather1.tvweather -s <YOUR_TV_IP>:26101

# Step 6: Install on TV
tizen install -n build/tv-weather.wgt -s <YOUR_TV_IP>:26101

# Step 7: Launch app
tizen run -p tvweather1.tvweather -s <YOUR_TV_IP>:26101
```

**One-Line Deploy (after initial setup):**
```powershell
cd tizen-app; Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue; tizen build-web -out ./build -e "*.md,oauth-callback.html,build-clean/*,.gitignore"; cd build; tizen package -t wgt -s bartek -- .; Move-Item -Force "Świnka Pogodynka.wgt" "tv-weather.wgt"; cd ..; tizen uninstall -p tvweather1.tvweather -s <YOUR_TV_IP>:26101; tizen install -n build/tv-weather.wgt -s <YOUR_TV_IP>:26101; tizen run -p tvweather1.tvweather -s <YOUR_TV_IP>:26101
```

**Important Notes:**
- The `-e` exclude parameter is critical - it prevents unsigned files from causing installation failures
- OAuth files (oauth.js) are automatically included and signed
- Documentation files (*.md) must be excluded as they're not needed in the runtime package
- Package must be signed with your certificate profile (replace `bartek` with your profile name)

Option 3: Direct File Sharing (For Testing)

If you don't have Tizen Studio yet:

1. Host the app locally on your development machine:
   ```bash
   cd tizen-app
   python -m http.server 8000
   ```

2. On Samsung TV:
   - Open Smart Hub
   - Go to Settings → Apps → App Launcher
   - Look for "Web Browser" or "Internet"
   - Navigate to http://<YOUR_MACHINE_IP>:8000

Note: This works for testing but not ideal for morning automatic startup.

TV Requirements

Your Samsung SG5B must have:
- Network connectivity (same WiFi as weather station)
- Developer mode enabled
- For auto-startup: SmartThings integration configured (see SmartThings routine setup guide)

Troubleshooting

**Installation fails with "Invalid file reference. An unsigned file was found"**
- Cause: Extra files (documentation, git files, etc.) included in package
- Solution: Ensure you use the `-e` exclude parameter in build-web command
- Files to exclude: `*.md,oauth-callback.html,build-clean/*,.gitignore`

**If app doesn't appear on TV:**
- Check SDB connection: `sdb devices`
- Verify TV IP address is correct
- Ensure developer mode is enabled on TV
- Try restarting TV and reconnecting

**If PAT/OAuth authentication fails:**
- For OAuth: Verify Client ID is correct in config.js
- For OAuth: Check redirect URI matches GitHub Pages URL
- Check TV has internet access
- Confirm SmartThings account is active

**Cannot connect to TV:**
```powershell
# Check if TV is reachable (use your TV's actual IP)
ping <YOUR_TV_IP>

# Try reconnecting
sdb disconnect
sdb connect <YOUR_TV_IP>:26101
sdb devices
```

**Package signing fails:**
- Verify certificate profile exists: `tizen security-profiles list`
- If certificate missing, create one in Tizen Studio or use CLI
- Replace `bartek` with your actual certificate profile name

**Author certificate not match error:**
- Cause: App was previously installed with a different certificate
- Solution: Uninstall the old version first:
  ```powershell
  tizen uninstall -p tvweather1.tvweather -s <YOUR_TV_IP>:26101
  ```
- Then reinstall with the new certificate

Next Steps

After deploying to TV:
1. Verify app displays correctly on big screen
2. Confirm real weather data loads
3. Set up SmartThings morning routine to auto-launch app
4. Configure auto-refresh interval (currently manual)

