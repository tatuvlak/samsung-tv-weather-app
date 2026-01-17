TV Weather App — VS Code + CLI Deployment Guide

Overview
Instead of Tizen Studio, we'll use:
- VS Code for editing (already have it)
- Command-line Tizen tools for building & deploying
- SDB (Samsung Debug Bridge) for TV connection

This is simpler, faster, and the recommended approach going forward.

Prerequisites

1. Install Node.js (if not already installed)
   - Download from https://nodejs.org/
   - Version 14+ recommended
   - Verify: `node --version` in PowerShell

2. Install Tizen CLI Tools (Command Line)
   - Download from: https://developer.tizen.org/development/tizen-studio/download
   - Look for "Tizen CLI (Command Line Tools)"
   - Extract to a folder (e.g., C:\tizen-cli)
   - Add to PATH:
     * Right-click "This PC" → Properties → Advanced system settings
     * Environment Variables → New (User variable)
     * Variable name: TIZEN_HOME
     * Variable value: C:\tizen-cli
     * Click OK, restart PowerShell

3. Verify Installation
   ```powershell
   tizen --version
   sdb devices
   ```
   Should show Tizen version and connected devices

4. Enable Developer Mode on Samsung SG5B TV
   - TV remote: Settings → About TV → Developer Mode → ON
   - Note TV's IP address

5. Connect TV via SDB
   ```powershell
   sdb connect <TV_IP_ADDRESS>:26101
   ```
   If prompted on TV, accept permission request.
   Verify: `sdb devices` should show your TV as "device"

Building & Deploying from VS Code

Step 1: Open Project in VS Code
```powershell
cd path/to/samsung-tv-weather-app
code .
```

Step 2: Update config.js with SmartThings PAT
- Open tizen-app/config.js
- Add your PAT token

Step 3: Build the Web Package
```powershell
cd tizen-app
tizen build-web --out ./build
```
This creates a `.wgt` file (Tizen web package) in the build/ folder.

Step 4: Install on TV
```powershell
sdb install ./build/tv-weather.wgt
```

Step 5: Launch App on TV
```powershell
sdb shell app_launcher -s com.example.tvweather
```

The app should now appear on your TV screen!

Step 6: View Logs (for Debugging)
```powershell
sdb dlog *:V
```
This streams app logs from the TV to your terminal.

Automating Build & Deploy

Create a PowerShell script `deploy.ps1` in tizen-app/:

```powershell
# deploy.ps1
Write-Host "Building TV Weather App..."
tizen build-web --out ./build

if ($?) {
    Write-Host "Installing on TV..."
    sdb install ./build/tv-weather.wgt
    
    if ($?) {
        Write-Host "Launching app..."
        sdb shell app_launcher -s com.example.tvweather
        Write-Host "App should appear on TV now!"
    }
} else {
    Write-Host "Build failed!"
}
```

Run it:
```powershell
cd tizen-app
./deploy.ps1
```

Using VS Code Extensions (Optional)

Install "Tizen Web IDE" extension in VS Code:
- Open VS Code Extensions (Ctrl+Shift+X)
- Search "Tizen Web"
- Install "Tizen Web IDE"
- Adds UI buttons for build/deploy (but CLI also works fine)

Troubleshooting

Q: `tizen` command not found
A: Tizen CLI not in PATH. Verify TIZEN_HOME environment variable and restart PowerShell.

Q: TV not appearing in `sdb devices`
A:
- Check TV IP: Settings → Network → IP Address
- Verify TV is on same network as PC
- Verify Developer Mode is enabled
- Try: `sdb connect <IP>:26101` again
- Restart TV if needed

Q: App doesn't launch after install
A: Check TV logs:
```powershell
sdb dlog *:V
```
Look for error messages related to com.example.tvweather

Q: "Permission denied" error
A: Accept the permission prompt on the TV itself when sdb tries to connect.

Q: Build fails with "tizen CLI error"
A: Make sure you're in the tizen-app directory with tizen-manifest.xml present.

Testing Workflow

Once deployment works:

1. Make changes in VS Code
2. Run: `tizen build-web --out ./build`
3. Run: `sdb install ./build/tv-weather.wgt`
4. Run: `sdb shell app_launcher -s com.example.tvweather`
5. View on TV
6. Check logs with: `sdb dlog *:V`

Quick Reference Commands

```powershell
# Check Tizen version
tizen --version

# List connected devices
sdb devices

# Connect to TV (one time)
sdb connect 192.168.1.100:26101

# Build app
tizen build-web --out ./build

# Install on TV
sdb install ./build/tv-weather.wgt

# Launch app
sdb shell app_launcher -s com.example.tvweather

# View live logs
sdb dlog *:V

# Uninstall app
sdb uninstall com.example.tvweather

# Reboot TV
sdb reboot
```

Next Steps

1. Download and extract Tizen CLI tools
2. Add to PATH and restart PowerShell
3. Connect TV via: `sdb connect <TV_IP>:26101`
4. Run: `tizen build-web --out ./build` from tizen-app/
5. Run: `sdb install ./build/tv-weather.wgt`
6. Run: `sdb shell app_launcher -s com.example.tvweather`
7. Check TV for app!

No IDE needed—just VS Code and CLI commands. Much simpler!
