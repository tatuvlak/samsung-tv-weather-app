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

Step 2: Update config.js with the hub address and READ_TOKEN
- Open tizen-app/config.js
- Add the hub address and READ_TOKEN

Step 3: Build, Package and Install

```powershell
cd tizen-app; Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue; tizen build-web -out ./build -e "*.md,test-*.js,build-clean/*,.gitignore"; cd build; tizen package -t wgt -s bartek -- .; Move-Item -Force "Świnka Pogodynka.wgt" "tv-weather.wgt"; cd ..; tizen uninstall -p tvweather1.tvweather -s <TV_IP>:26101; tizen install -n build/tv-weather.wgt -s <TV_IP>:26101; tizen run -p tvweather1.tvweather -s <TV_IP>:26101
```

`tizen-app/DEPLOYMENT.md` is the canonical copy of this sequence, including the
step-by-step version with an explanation of each part. Prefer it over the line
above if the two ever disagree.

Three things this doc used to get wrong, worth knowing if you have an older
copy of it in a terminal history:

- **`build-web` does not produce a `.wgt`.** It stages the web files; `tizen
  package` is what makes and signs the package. Installing straight after
  `build-web` installs nothing.
- **The `-e` exclude list is required.** Without it the `.md` files and the
  Node test harnesses are copied in and signed, and the install fails on the
  signature.
- **The application id is `tvweather1.tvweather`**, from `config.xml`, not
  `com.example.tvweather`. The wrong id makes uninstall and launch quietly do
  nothing.

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
param([Parameter(Mandatory=$true)][string]$TvIp)

Write-Host "Building TV Weather App..."
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
tizen build-web -out ./build -e "*.md,test-*.js,build-clean/*,.gitignore"

if ($?) {
    Write-Host "Packaging and signing..."
    Push-Location build
    tizen package -t wgt -s bartek -- .
    Move-Item -Force "Świnka Pogodynka.wgt" "tv-weather.wgt"
    Pop-Location

    Write-Host "Installing on TV..."
    tizen uninstall -p tvweather1.tvweather -s "${TvIp}:26101"
    tizen install -n build/tv-weather.wgt -s "${TvIp}:26101"

    if ($?) {
        Write-Host "Launching app..."
        tizen run -p tvweather1.tvweather -s "${TvIp}:26101"
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
Look for error messages related to `tvweather1.tvweather`

Q: "Permission denied" error
A: Accept the permission prompt on the TV itself when sdb tries to connect.

Q: Build fails with "tizen CLI error"
A: Make sure you're in the tizen-app directory with tizen-manifest.xml present.

Testing Workflow

Once deployment works:

1. Make changes in VS Code
2. Run the one-liner from Step 3 above, or from `DEPLOYMENT.md`
3. View on TV
4. Check logs with: `sdb dlog *:V`

Quick Reference Commands

```powershell
# Check Tizen version
tizen --version

# List connected devices
sdb devices

# Connect to TV (one time)
# The M7 changes address regularly - check it rather than reusing an old one.
sdb connect <TV_IP>:26101

# Build, package and install - see Step 3, or DEPLOYMENT.md

# Launch app
tizen run -p tvweather1.tvweather -s <TV_IP>:26101

# View live logs
sdb dlog *:V

# Uninstall app
tizen uninstall -p tvweather1.tvweather -s <TV_IP>:26101

# Reboot TV
sdb reboot
```

Next Steps

1. Download and extract Tizen CLI tools
2. Add to PATH and restart PowerShell
3. Connect TV via: `sdb connect <TV_IP>:26101`
4. Run the Step 3 one-liner from `tizen-app/`
5. Check TV for app!

No IDE needed—just VS Code and CLI commands. Much simpler!
