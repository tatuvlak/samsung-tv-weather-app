// OAuth 2.0 with PKCE Configuration for SmartThings API
// Register your app at: https://developer.smartthings.com/
window.APP_CONFIG = {
  // OAuth Configuration
  oauth: {
    clientId: "2fc15490-2e53-40d6-a4f3-b4ef5782acc3",
    clientSecret: "35dfab34-988f-4794-b369-d912adc90b5f",
    authorizationEndpoint: "https://api.smartthings.com/oauth/authorize",
    tokenEndpoint: "https://api.smartthings.com/oauth/token",
    redirectUri: "https://tatuvlak.github.io/tv-weather-oauth/callback.html",
    scope: "r:devices:* r:locations:*" // Required scopes for reading devices
  },
  
  // Legacy PAT support (fallback during migration)
  pat: "0779d28b-e131-4748-8b0d-d6621b555edc"
};
