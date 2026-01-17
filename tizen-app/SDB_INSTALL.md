Tizen SDB Installation - Manual Setup

The sdb (Samsung Debug Bridge) tool is missing. Here's how to get it:

Option 1: Download Tizen CLI Minimal Package (Recommended)

1. Go to: https://developer.tizen.org/development/tizen-studio/download
2. Look for "Command Line Tools" or "CLI" section
3. Download for Windows (should be ~50MB)
4. Extract to: C:\tizen-cli
5. Open PowerShell as Admin and run:
   ```powershell
   $env:TIZEN_HOME = "C:\tizen-cli"
   [Environment]::SetEnvironmentVariable("TIZEN_HOME", "C:\tizen-cli", "User")
   [Environment]::SetEnvironmentVariable("PATH", "$env:PATH;C:\tizen-cli\tools", "User")
   ```
6. Restart PowerShell and test: `sdb --version`

Option 2: Use ADB Instead (if you have Android SDK)

If you have Android SDK installed, you can use adb instead:
```powershell
# Check if adb is available
adb devices
```

For Samsung TV, both sdb and adb may work on the same protocol.

Option 3: Install via Pre-built Binary (Quick)

If the above doesn't work, I can create a minimal sdb wrapper script to communicate with your TV using SSH/telnet directly.

Quick Alternative - Test App Without sdb

Since sdb may be complex to get working, let's verify the app works first using:

1. Local Web Server Hosting:
   ```powershell
   cd tizen-app
   python -m http.server 8000
   ```
   Then on TV, open web browser and navigate to: http://<YOUR_PC_IP>:8000

2. This proves the dashboard works on your TV before we worry about app installation.

What to do next:

1. Try downloading and extracting the Tizen CLI tools to C:\tizen-cli
2. Or, let's test the app via web browser first to confirm it works on your TV

Which would you prefer?
