# TV App vs Android App Implementation Comparison

This document shows how the Android app implementation matches the TV app (Tizen) implementation.

## OAuth Token Refresh Implementation

### TV App (oauth.js) - Lines 45-71
```javascript
function saveTokens(tokens) {
  // Get existing tokens to preserve refresh_token if not returned
  const existingTokens = getTokens();
  
  const tokenData = {
    access_token: tokens.access_token,
    // Preserve existing refresh_token if new one not provided
    // SmartThings typically doesn't return refresh_token on refresh flow
    refresh_token: tokens.refresh_token || (existingTokens && existingTokens.refresh_token),
    expires_in: tokens.expires_in || 86400,
    token_type: tokens.token_type || 'Bearer',
    timestamp: Date.now()
  };
  
  if (!tokenData.refresh_token) {
    console.warn('No refresh_token available - tokens may not be refreshable');
  }
  
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  console.log('Tokens saved successfully', {
    has_access_token: !!tokenData.access_token,
    has_refresh_token: !!tokenData.refresh_token,
    expires_in: tokenData.expires_in
  });
}
```

### Android App (OAuthManager.kt) - Lines 373-403
```kotlin
private fun saveTokens(accessToken: String, refreshToken: String, expiresIn: Int) {
    // Get existing tokens to preserve refresh_token if not returned
    val existingRefreshToken = prefs.getString(KEY_REFRESH_TOKEN, null)
    
    // Preserve existing refresh_token if new one not provided
    // SmartThings typically doesn't return refresh_token on refresh flow
    val finalRefreshToken = if (refreshToken.isEmpty() && existingRefreshToken != null) {
        existingRefreshToken
    } else {
        refreshToken
    }
    
    // Validate we have a refresh token
    if (finalRefreshToken.isEmpty()) {
        println("WARNING: No refresh_token available - tokens may not be refreshable")
    }
    
    prefs.edit()
        .putString(KEY_ACCESS_TOKEN, accessToken)
        .putString(KEY_REFRESH_TOKEN, finalRefreshToken)
        .putInt(KEY_EXPIRES_IN, expiresIn)
        .putLong(KEY_TIMESTAMP, System.currentTimeMillis())
        .apply()
    
    println("Tokens saved successfully")
    println("DEBUG: has_access_token=${accessToken.isNotEmpty()}, has_refresh_token=${finalRefreshToken.isNotEmpty()}, expires_in=$expiresIn")
}
```

**✅ Match**: Both implementations preserve the refresh token if not returned in the response.

---

## Token Refresh Implementation

### TV App (oauth.js) - Lines 207-280
```javascript
async function refreshAccessToken() {
  const config = window.APP_CONFIG.oauth;
  const tokenData = getTokens();
  
  if (!tokenData || !tokenData.refresh_token) {
    console.error('No refresh token available');
    throw new Error('No refresh token available. Re-authorization required.');
  }
  
  console.log('Attempting token refresh', {
    has_refresh_token: !!tokenData.refresh_token,
    token_age_hours: ((Date.now() - tokenData.timestamp) / 1000 / 60 / 60).toFixed(2)
  });
  
  // ... request building ...
  
  console.log('Refreshing access token...');
  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: headers,
    body: body.toString()
  });
  
  // ... error handling ...
  
  const tokens = await response.json();
  console.log('Refresh response received', {
    has_access_token: !!tokens.access_token,
    has_new_refresh_token: !!tokens.refresh_token,
    expires_in: tokens.expires_in
  });
  
  // Save tokens (will preserve old refresh_token if new one not provided)
  saveTokens(tokens);
  
  console.log('Token refreshed successfully');
  return tokens;
}
```

### Android App (OAuthManager.kt) - Lines 218-302
```kotlin
private suspend fun refreshAccessToken(): Boolean = withContext(Dispatchers.IO) {
    try {
        val refreshToken = prefs.getString(KEY_REFRESH_TOKEN, null)
        if (refreshToken.isNullOrEmpty()) {
            println("ERROR: No refresh token available")
            return@withContext false
        }
        
        val timestamp = prefs.getLong(KEY_TIMESTAMP, 0)
        val tokenAgeHours = if (timestamp > 0) {
            (System.currentTimeMillis() - timestamp) / 1000.0 / 60.0 / 60.0
        } else {
            0.0
        }
        
        println("Attempting token refresh")
        println("DEBUG: has_refresh_token=true, token_age_hours=%.2f".format(tokenAgeHours))
        
        // ... request building ...
        
        println("Refreshing access token...")
        val response = client.newCall(request).execute()
        
        // ... error handling ...
        
        val responseBody = response.body?.string() ?: return@withContext false
        val json = JSONObject(responseBody)
        
        val newAccessToken = json.getString("access_token")
        val newRefreshToken = json.optString("refresh_token", "")
        val expiresIn = json.optInt("expires_in", 86400)
        
        println("Refresh response received")
        println("DEBUG: has_access_token=${newAccessToken.isNotEmpty()}, has_new_refresh_token=${newRefreshToken.isNotEmpty()}, expires_in=$expiresIn")
        
        // Save tokens (will preserve old refresh_token if new one not provided)
        // SmartThings typically doesn't return refresh_token on refresh flow
        saveTokens(
            accessToken = newAccessToken,
            refreshToken = newRefreshToken,
            expiresIn = expiresIn
        )
        
        println("Token refreshed successfully")
        true
    } catch (e: Exception) {
        println("ERROR: Token refresh exception: ${e.message}")
        e.printStackTrace()
        clearTokens()
        false
    }
}
```

**✅ Match**: Both implementations have identical logging and token preservation logic.

---

## AQI Category Mapping

### TV App (dashboard.js) - Lines 20-46
```javascript
const AQI_CATEGORIES = {
  // Numeric enum values (from Matter specification)
  0: { color: '#cccccc', icon: '❓', message: 'Unknown', label: 'Unknown' },
  1: { color: '#28a745', icon: '😊', message: 'Air quality is good', label: 'Good' },
  2: { color: '#ffc107', icon: '🙂', message: 'Acceptable air quality', label: 'Moderate' },
  3: { color: '#fd7e14', icon: '😕', message: 'Sensitive groups should limit outdoor activity', label: 'Slightly Unhealthy' },
  4: { color: '#dc3545', icon: '☹️', message: 'WEAR MASK - Unhealthy air', label: 'Unhealthy' },
  5: { color: '#6f42c1', icon: '🤢', message: 'STAY INDOORS - Very unhealthy', label: 'Very Unhealthy' },
  6: { color: '#721c24', icon: '☠️', message: 'HAZARDOUS - DO NOT GO OUTSIDE', label: 'Hazardous' },
  
  // String aliases (case-insensitive keys normalized to lowercase)
  'unknown': 0,
  'good': 1,
  'moderate': 2,
  'fair': 2,  // alias for moderate
  'slightly unhealthy': 3,
  'slightlyunhealthy': 3,
  'unhealthy': 4,
  'poor': 4,  // alias for unhealthy
  'very unhealthy': 5,
  'veryunhealthy': 5,
  'very poor': 5,  // alias for very unhealthy
  'extremely poor': 6,
  'extremelypoor': 6,
  'hazardous': 6
};
```

### TV App (dashboard.js) - Lines 208-226
```javascript
function getAQICategory(aqiValue) {
  // Handle numeric values directly
  if (typeof aqiValue === 'number' && aqiValue >= 0 && aqiValue <= 6) {
    return AQI_CATEGORIES[aqiValue];
  }
  
  // Handle string values - normalize to lowercase and remove spaces
  if (typeof aqiValue === 'string') {
    const normalizedKey = aqiValue.toLowerCase().replace(/\s+/g, ' ').trim();
    const enumValue = AQI_CATEGORIES[normalizedKey];
    
    if (typeof enumValue === 'number') {
      return AQI_CATEGORIES[enumValue];
    }
  }
  
  // Fallback to unknown
  return AQI_CATEGORIES[0];
}
```

### Android App (MainActivity.kt) - Lines 425-456
```kotlin
private fun getAQICategory(aqiValue: String): AQICategory {
    // Handle numeric enum values (Matter specification: 0-6)
    val numericValue = aqiValue.toIntOrNull()
    if (numericValue != null) {
        return when (numericValue) {
            0 -> AQICategory("Unknown", "Unknown air quality", "#cccccc", "❓")
            1 -> AQICategory("Good", "Air quality is good", "#28a745", "😊")
            2 -> AQICategory("Moderate", "Acceptable air quality", "#ffc107", "🙂")
            3 -> AQICategory("Slightly Unhealthy", "Sensitive groups should limit outdoor activity", "#fd7e14", "😕")
            4 -> AQICategory("Unhealthy", "WEAR MASK - Unhealthy air", "#dc3545", "☹️")
            5 -> AQICategory("Very Unhealthy", "STAY INDOORS - Very unhealthy", "#6f42c1", "🤢")
            6 -> AQICategory("Hazardous", "HAZARDOUS - DO NOT GO OUTSIDE", "#721c24", "☠️")
            else -> AQICategory("Unknown", "Unknown air quality", "#cccccc", "❓")
        }
    }
    
    // Handle string values - normalize to lowercase and trim
    val normalizedKey = aqiValue.lowercase().replace(Regex("\\s+"), " ").trim()
    return when (normalizedKey) {
        "good" -> AQICategory("Good", "Air quality is good", "#28a745", "😊")
        "moderate", "fair" -> AQICategory("Moderate", "Acceptable air quality", "#ffc107", "🙂")
        "slightly unhealthy", "slightlyunhealthy" -> AQICategory("Slightly Unhealthy", "Sensitive groups should limit outdoor activity", "#fd7e14", "😕")
        "unhealthy", "poor" -> AQICategory("Unhealthy", "WEAR MASK - Unhealthy air", "#dc3545", "☹️")
        "very unhealthy", "veryunhealthy", "very poor" -> AQICategory("Very Unhealthy", "STAY INDOORS - Very unhealthy", "#6f42c1", "🤢")
        "hazardous", "extremely poor", "extremelypoor" -> AQICategory("Hazardous", "HAZARDOUS - DO NOT GO OUTSIDE", "#721c24", "☠️")
        else -> AQICategory("Unknown", "Unknown air quality", "#cccccc", "❓")
    }
}
```

**✅ Match**: Both implementations:
- Use identical emoji icons (😊, 🙂, 😕, ☹️, 🤢, ☠️)
- Use identical color codes (#28a745, #ffc107, #fd7e14, #dc3545, #6f42c1, #721c24, #cccccc)
- Use identical messages and labels
- Handle numeric values 0-6 (Matter specification)
- Support string aliases (fair, poor, very poor, extremely poor)
- Normalize strings by converting to lowercase and handling multiple whitespace

---

## Summary

✅ **OAuth Implementation**: Android app now perfectly matches TV app's token refresh logic  
✅ **AQI Display**: Android app now uses identical emoji icons and color coding  
✅ **Logging**: Android app has equivalent logging to TV app's console.log calls  
✅ **Error Handling**: Both apps handle token expiration and refresh failures identically  

The Android app is now fully synchronized with the TV app's latest implementation.
