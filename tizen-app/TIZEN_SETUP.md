Tizen Studio Installation & Setup Guide

Quick Start (Windows)

1. Download Tizen Studio
   - Go to https://developer.tizen.org/development/tizen-studio/download
   - Select "Windows" version (Installer)
   - Download the latest version (around 500MB+)

2. Run Installer
   - Double-click the downloaded .exe file
   - Follow installation wizard
   - Accept default installation path: C:\tizen-studio
   - Installation takes 5-10 minutes

3. Launch Tizen Studio
   - After installation, click "Launch Tizen Studio"
   - Or manually run: C:\tizen-studio\IDE\bin\tizen.exe
   - Choose a workspace folder (default is fine)
   - Studio will open

4. Install TV Extensions (Critical for SG5B)
   - Go to Tools → Package Manager
   - In "Main SDK" tab, check these:
     ☑ Tizen SDK Tools
     ☑ Tizen 6.5 (or latest 6.x) - for TV profile
   - Click "Install"
   - Accept license agreements
   - Wait for installation (~10 minutes)

5. Connect TV to Development Machine
   Option A - USB Connection:
   - Enable Developer Mode on TV: Settings → About TV → Developer Mode ON
   - Connect TV to computer via USB cable
   - Tizen Studio should auto-detect TV in Devices list

   Option B - Network Connection (Recommended):
   - Enable Developer Mode on TV
   - Note TV's IP address: Settings → Network → IP Address
   - In Tizen Studio: Tools → Device Manager
   - Click "+" button
   - Select "Samsung Remote Device"
   - Enter TV IP address and port 26101
   - Click "Add"
   - TV will ask for permission - accept on TV screen

6. Verify TV Connection
   - Go to Windows → Device Manager
   - Should see your Samsung SG5B listed with status "Connected"
   - If not, check TV IP and network connectivity

Next: Create and Deploy App

Once Tizen Studio is running and TV is connected:

1. File → New → Tizen Project
2. Select "Web Application (for TV)"
3. Project name: "tv-weather"
4. Click Finish
5. Delete generated files, copy tizen-app/ contents into project
6. Edit config.js with your SmartThings PAT
7. Right-click project → Build
8. Right-click project → Run As → Run on Target Device
9. Select your TV from device list
10. App will install and launch on TV

Troubleshooting Installation

Q: Installation hangs at "Installing"
A: Try restarting installer, check internet connection

Q: Tizen Studio won't launch
A: Try running as Administrator, or manually run tizen.exe

Q: TV not appearing in Device Manager
A: 
- Verify Developer Mode is enabled on TV
- Check TV and computer are on same network
- Try restarting TV
- Verify TV IP address is correct

Q: "Permission denied" when installing app
A: Make sure you accept the permission prompt on the TV itself

Need Help?
- Tizen Developer Forum: https://developer.tizen.org/forums
- Samsung TV Developer: https://developer.samsung.com/tv

Once Tizen Studio is set up and TV is connected, we can deploy the weather app in minutes.
