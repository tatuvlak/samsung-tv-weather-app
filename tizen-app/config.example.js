// OAuth 2.0 with PKCE Configuration for SmartThings API
// Register your app at: https://developer.smartthings.com/
window.APP_CONFIG = {
  // OAuth Configuration
  oauth: {
    clientId: "YOUR_CLIENT_ID_HERE",
    clientSecret: "YOUR_CLIENT_SECRET_HERE",
    authorizationEndpoint: "https://api.smartthings.com/oauth/authorize",
    tokenEndpoint: "https://api.smartthings.com/oauth/token",
    redirectUri: "https://YOUR_GITHUB_USERNAME.github.io/tv-weather-oauth/callback.html",
    scope: "r:devices:* r:locations:*" // Required scopes for reading devices
  },
  
  // Legacy PAT support (fallback during migration)
  pat: "YOUR_PERSONAL_ACCESS_TOKEN_HERE"
};
