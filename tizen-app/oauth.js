/* OAuth 2.0 with PKCE Implementation for SmartThings API
 - Implements PKCE (Proof Key for Code Exchange) flow
 - Token storage and refresh logic
 - Authorization flow for Tizen TV (QR code display)
*/

// PKCE Helper Functions
function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(v => charset[v % charset.length])
    .join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return hash;
}

function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(codeVerifier) {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}

// Token Storage using localStorage
const TOKEN_STORAGE_KEY = 'smartthings_oauth_tokens';
const VERIFIER_STORAGE_KEY = 'smartthings_code_verifier';

function saveTokens(tokens) {
  // Add timestamp for expiration tracking
  const tokenData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in || 86400, // Default 24 hours
    token_type: tokens.token_type || 'Bearer',
    timestamp: Date.now()
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  console.log('Tokens saved successfully');
}

function getTokens() {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse stored tokens:', e);
    return null;
  }
}

function clearTokens() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(VERIFIER_STORAGE_KEY);
  console.log('Tokens cleared');
}

function isTokenExpired(tokenData) {
  if (!tokenData || !tokenData.timestamp || !tokenData.expires_in) {
    return true;
  }
  
  const expirationTime = tokenData.timestamp + (tokenData.expires_in * 1000);
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  return Date.now() >= (expirationTime - bufferTime);
}

// OAuth Authorization Flow
async function startAuthorizationFlow() {
  const config = window.APP_CONFIG.oauth;
  
  // SmartThings with client_secret: Use standard OAuth (not PKCE)
  // If client_secret exists, don't use PKCE
  const usePKCE = !config.clientSecret;
  
  let codeChallenge = null;
  let codeVerifier = null;
  
  if (usePKCE) {
    // Generate PKCE code verifier and challenge
    codeVerifier = generateRandomString(128);
    codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later exchange
    localStorage.setItem(VERIFIER_STORAGE_KEY, codeVerifier);
  } else {
    // Clear any old verifier
    localStorage.removeItem(VERIFIER_STORAGE_KEY);
  }
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: generateRandomString(32) // CSRF protection
  });
  
  // Only add PKCE parameters if not using client_secret
  if (usePKCE && codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }
  
  const authUrl = `${config.authorizationEndpoint}?${params.toString()}`;
  
  console.log('Authorization URL:', authUrl);
  console.log('Using PKCE:', usePKCE);
  return authUrl;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(authorizationCode) {
  const config = window.APP_CONFIG.oauth;
  const codeVerifier = localStorage.getItem(VERIFIER_STORAGE_KEY);
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: config.redirectUri
  });
  
  // Only add code_verifier if we used PKCE (no client_secret)
  if (!config.clientSecret && codeVerifier) {
    body.append('code_verifier', codeVerifier);
  }
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  
  // Use Basic Authentication if client_secret is available
  if (config.clientSecret) {
    const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    // If no client_secret, include client_id in body
    body.append('client_id', config.clientId);
  }
  
  try {
    console.log('Exchanging code for tokens...');
    console.log('Request body:', Object.fromEntries(body));
    console.log('Using Basic Auth:', !!config.clientSecret);
    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: headers,
      body: body.toString()
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error:', response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }
    
    const tokens = await response.json();
    saveTokens(tokens);
    
    // Clean up code verifier
    localStorage.removeItem(VERIFIER_STORAGE_KEY);
    
    return tokens;
  } catch (err) {
    console.error('Token exchange error:', err);
    throw err;
  }
}

// Refresh access token using refresh token
async function refreshAccessToken() {
  const config = window.APP_CONFIG.oauth;
  const tokenData = getTokens();
  
  if (!tokenData || !tokenData.refresh_token) {
    throw new Error('No refresh token available. Re-authorization required.');
  }
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenData.refresh_token
  });
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  
  // Use Basic Authentication if client_secret is available
  if (config.clientSecret) {
    const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else {
    // If no client_secret, include client_id in body
    body.append('client_id', config.clientId);
  }
  
  try {
    console.log('Refreshing access token...');
    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: headers,
      body: body.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh error:', response.status, errorText);
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }
    
    const tokens = await response.json();
    saveTokens(tokens);
    
    console.log('Token refreshed successfully');
    return tokens;
  } catch (err) {
    console.error('Token refresh error:', err);
    // Clear tokens on refresh failure - user needs to re-authorize
    clearTokens();
    throw err;
  }
}

// Get valid access token (with automatic refresh)
async function getValidAccessToken() {
  const tokenData = getTokens();
  
  if (!tokenData) {
    throw new Error('NOT_AUTHORIZED');
  }
  
  // Check if token is expired or about to expire
  if (isTokenExpired(tokenData)) {
    console.log('Token expired, refreshing...');
    try {
      const newTokens = await refreshAccessToken();
      return newTokens.access_token;
    } catch (err) {
      throw new Error('NOT_AUTHORIZED');
    }
  }
  
  return tokenData.access_token;
}

// Check if user is authorized
function isAuthorized() {
  const tokenData = getTokens();
  return tokenData && tokenData.access_token;
}

// QR Code generation for TV display
function generateQRCodeDataURL(text) {
  // Simple QR code using Google Charts API (no library needed)
  // Alternative: Use qrcodejs library for offline support
  const encodedText = encodeURIComponent(text);
  return `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodedText}`;
}

// Display authorization flow on TV
function displayAuthorizationPrompt(authUrl) {
  const container = document.getElementById('dashboard-container');
  if (!container) return;
  
  const html = `
    <div class="auth-prompt">
      <h1>🔐 Authorization Required</h1>
      <p>Scan this QR code with your phone or visit the URL below to authorize this app:</p>
      
      <div class="qr-code-container">
        <div id="qrcode" class="qr-placeholder"></div>
      </div>
      
      <div style="margin: 10px 0; font-size: 11px; opacity: 0.7;">
        <p>Copy and paste this URL into your phone or computer browser</p>
      </div>
      
      <div class="auth-instructions">
        <h3>Steps:</h3>
        <ol>
          <li>Open the URL above on your phone or computer</li>
          <li>Log in to SmartThings and authorize this app</li>
          <li>After authorization, you'll be redirected to a callback URL</li>
          <li>Look for <code>code=</code> in the URL and copy everything after it (until the next & or end)</li>
          <li>Paste the code below and submit</li>
        </ol>
        <p style="font-size: 12px; opacity: 0.8; margin-top: 12px;">
          <strong>Example:</strong> If redirected to:<br>
          <code>https://example.com/callback?code=ABC123XYZ&state=...</code><br>
          Copy only: <code>ABC123XYZ</code>
        </p>
      </div>
      
      <div class="manual-code-entry">
        <p>After authorization, enter the code:</p>
        <input type="text" id="auth-code-input" class="focusable" placeholder="Enter authorization code" 
               style="width: 400px; padding: 10px; font-size: 16px; margin: 10px 0;">
        <button id="submit-auth-code" class="focusable" 
                style="padding: 10px 20px; font-size: 16px; margin-left: 10px;">
          Submit Code
        </button>
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
        Note: You only need to do this once. The app will automatically refresh tokens afterwards.
      </p>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Generate QR code using qrcodejs library
  setTimeout(() => {
    const qrCodeDiv = document.getElementById('qrcode');
    if (!qrCodeDiv) return;
    
    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(qrCodeDiv, {
          text: authUrl,
          width: 256,
          height: 256,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
        console.log('QR code generated successfully');
      } catch (err) {
        console.error('QR code generation failed:', err);
        showUrlFallback(qrCodeDiv, authUrl);
      }
    } else {
      console.log('QRCode library not available, showing URL fallback');
      showUrlFallback(qrCodeDiv, authUrl);
    }
  }, 500);
  
  function showUrlFallback(container, url) {
    container.innerHTML = `
      <div style="background: white; color: black; padding: 30px; border-radius: 8px; border: 3px solid #0066aa;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 15px 0; color: #0066aa;">Authorization URL:</p>
        <p style="word-break: break-all; font-size: 16px; font-family: monospace; margin: 0; line-height: 1.6;">${url}</p>
      </div>
    `;
  }
  
  // Setup event listener for code submission
  const submitButton = document.getElementById('submit-auth-code');
  const codeInput = document.getElementById('auth-code-input');
  
  if (submitButton && codeInput) {
    submitButton.addEventListener('click', async () => {
      const code = codeInput.value.trim();
      if (!code) {
        alert('Please enter the authorization code');
        return;
      }
      
      try {
        submitButton.textContent = 'Processing...';
        submitButton.disabled = true;
        
        await exchangeCodeForTokens(code);
        
        // Reload app to show dashboard
        location.reload();
      } catch (err) {
        console.error('Authorization failed:', err);
        
        // Show error message with retry option
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin-top: 20px; padding: 15px; background: #dc3545; color: white; border-radius: 8px;';
        errorDiv.innerHTML = `
          <p style="margin: 0 0 10px 0; font-weight: bold;">❌ Authorization Failed</p>
          <p style="margin: 0 0 10px 0; font-size: 14px;">${err.message}</p>
          <button id="retry-auth-btn" class="focusable" 
                  style="padding: 10px 20px; font-size: 14px; background: white; color: #dc3545; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            🔄 Clear & Retry Authorization
          </button>
        `;
        
        // Remove old error message if exists
        const oldError = document.querySelector('.auth-error-message');
        if (oldError) oldError.remove();
        
        errorDiv.className = 'auth-error-message';
        submitButton.parentElement.appendChild(errorDiv);
        
        // Add retry button handler
        const retryBtn = document.getElementById('retry-auth-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', async () => {
            try {
              await window.OAuth.clearAndRetryAuthorization();
            } catch (retryErr) {
              console.error('Retry failed:', retryErr);
            }
          });
        }
        
        submitButton.textContent = 'Submit Code';
        submitButton.disabled = false;
      }
    });
    
    // TV remote: Enter key on input should submit
    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        submitButton.click();
      }
    });
    
    // Focus input initially
    setTimeout(() => {
      codeInput.focus();
      // Trigger initial focus setup from app.js
      const focusEvent = new Event('focusin', { bubbles: true });
      codeInput.dispatchEvent(focusEvent);
    }, 200);
  }
}

// Apply virtual focus styling (for TV remote navigation)
function applyVirtualFocus(el) {
  const focusables = document.querySelectorAll('.focusable');
  focusables.forEach(node => node.classList.remove('tv-focused'));
  if (el) {
    el.classList.add('tv-focused');
  }
}

// Clear tokens and restart authorization flow
async function clearAndRetryAuthorization() {
  clearTokens();
  const authUrl = await startAuthorizationFlow();
  displayAuthorizationPrompt(authUrl);
}

// Export functions for use in app
window.OAuth = {
  startAuthorizationFlow,
  exchangeCodeForTokens,
  refreshAccessToken,
  getValidAccessToken,
  isAuthorized,
  clearTokens,
  displayAuthorizationPrompt,
  getTokens,
  clearAndRetryAuthorization
};
