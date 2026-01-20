package com.smartthings.weatherapp

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.TimeUnit

/**
 * OAuth 2.0 Manager with PKCE for SmartThings API
 * Matches the TV app's oauth.js implementation
 */
class OAuthManager(private val context: Context) {
    
    private val prefs: SharedPreferences = context.getSharedPreferences(
        "smartthings_oauth",
        Context.MODE_PRIVATE
    )
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    companion object {
        // OAuth Configuration (match your SmartThings OAuth app)
        const val CLIENT_ID = "2fc15490-2e53-40d6-a4f3-b4ef5782acc3"
        const val CLIENT_SECRET = "" // Optional: leave empty to use PKCE
        const val REDIRECT_URI = "https://tatuvlak.github.io/tv-weather-oauth/callback.html"
        const val SCOPE = "r:devices:* r:locations:*"
        
        const val AUTHORIZATION_ENDPOINT = "https://api.smartthings.com/oauth/authorize"
        const val TOKEN_ENDPOINT = "https://api.smartthings.com/oauth/token"
        
        // Storage keys
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_EXPIRES_IN = "expires_in"
        private const val KEY_TIMESTAMP = "timestamp"
        private const val KEY_CODE_VERIFIER = "code_verifier"
        
        // Token expiration buffer (5 minutes)
        private const val EXPIRATION_BUFFER_MS = 5 * 60 * 1000L
    }
    
    // Generate random string for PKCE
    private fun generateRandomString(length: Int): String {
        val charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
        val random = SecureRandom()
        return (1..length)
            .map { charset[random.nextInt(charset.length)] }
            .joinToString("")
    }
    
    // Generate code challenge from verifier
    private fun generateCodeChallenge(verifier: String): String {
        val bytes = verifier.toByteArray(Charsets.US_ASCII)
        val messageDigest = MessageDigest.getInstance("SHA-256")
        val hash = messageDigest.digest(bytes)
        return Base64.encodeToString(hash, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }
    
    /**
     * Start OAuth authorization flow
     * Returns an Intent to launch the browser with the authorization URL
     */
    fun startAuthorizationFlow(): Intent {
        val usePKCE = CLIENT_SECRET.isEmpty()
        
        var codeChallenge: String? = null
        var codeVerifier: String? = null
        
        if (usePKCE) {
            // Generate PKCE parameters
            codeVerifier = generateRandomString(128)
            codeChallenge = generateCodeChallenge(codeVerifier)
            
            // Store verifier for later exchange
            prefs.edit().putString(KEY_CODE_VERIFIER, codeVerifier).apply()
        } else {
            // Clear old verifier
            prefs.edit().remove(KEY_CODE_VERIFIER).apply()
        }
        
        // Build authorization URL
        val uriBuilder = Uri.parse(AUTHORIZATION_ENDPOINT).buildUpon()
            .appendQueryParameter("client_id", CLIENT_ID)
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("scope", SCOPE)
            .appendQueryParameter("state", generateRandomString(32))
        
        // Add PKCE parameters if not using client_secret
        if (usePKCE && codeChallenge != null) {
            uriBuilder
                .appendQueryParameter("code_challenge", codeChallenge)
                .appendQueryParameter("code_challenge_method", "S256")
        }
        
        val authUrl = uriBuilder.build().toString()
        
        // Return intent to open browser
        return Intent(Intent.ACTION_VIEW, Uri.parse(authUrl))
    }
    
    /**
     * Exchange authorization code for tokens
     * Call this after user completes authorization and you receive the code
     */
    suspend fun exchangeCodeForTokens(authorizationCode: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val codeVerifier = prefs.getString(KEY_CODE_VERIFIER, null)
            
            println("DEBUG: Starting token exchange")
            println("DEBUG: Using PKCE: ${CLIENT_SECRET.isEmpty()}")
            println("DEBUG: Code verifier exists: ${codeVerifier != null}")
            
            val bodyBuilder = FormBody.Builder()
                .add("grant_type", "authorization_code")
                .add("code", authorizationCode)
                .add("redirect_uri", REDIRECT_URI)
            
            val requestBuilder = Request.Builder()
                .url(TOKEN_ENDPOINT)
            
            // Use Basic Auth if client_secret is available
            if (CLIENT_SECRET.isNotEmpty()) {
                println("DEBUG: Using client_secret with Basic Auth")
                val credentials = "$CLIENT_ID:$CLIENT_SECRET"
                val encoded = Base64.encodeToString(
                    credentials.toByteArray(),
                    Base64.NO_WRAP
                )
                requestBuilder.addHeader("Authorization", "Basic $encoded")
            } else {
                println("DEBUG: Using PKCE (no client_secret)")
                // Include client_id in body if no secret
                bodyBuilder.add("client_id", CLIENT_ID)
                
                // Add code_verifier if using PKCE
                if (codeVerifier != null) {
                    bodyBuilder.add("code_verifier", codeVerifier)
                } else {
                    println("ERROR: No code verifier found for PKCE flow!")
                }
            }
            
            val request = requestBuilder
                .post(bodyBuilder.build())
                .build()
            
            println("DEBUG: Making token request to: $TOKEN_ENDPOINT")
            val response = client.newCall(request).execute()
            
            if (!response.isSuccessful) {
                val errorBody = response.body?.string()
                println("ERROR: Token exchange failed: ${response.code}")
                println("ERROR: Response body: $errorBody")
                return@withContext false
            }
            
            val responseBody = response.body?.string() ?: return@withContext false
            println("DEBUG: Token exchange successful")
            
            val json = JSONObject(responseBody)
            
            saveTokens(
                accessToken = json.getString("access_token"),
                refreshToken = json.optString("refresh_token", ""),
                expiresIn = json.optInt("expires_in", 86400)
            )
            
            // Clean up code verifier
            prefs.edit().remove(KEY_CODE_VERIFIER).apply()
            
            true
        } catch (e: Exception) {
            println("ERROR: Token exchange exception: ${e.message}")
            e.printStackTrace()
            false
        }
    }
    
    /**
     * Refresh access token using refresh token
     */
    private suspend fun refreshAccessToken(): Boolean = withContext(Dispatchers.IO) {
        try {
            val refreshToken = prefs.getString(KEY_REFRESH_TOKEN, null)
            if (refreshToken.isNullOrEmpty()) {
                println("No refresh token available")
                return@withContext false
            }
            
            val bodyBuilder = FormBody.Builder()
                .add("grant_type", "refresh_token")
                .add("refresh_token", refreshToken)
            
            val requestBuilder = Request.Builder()
                .url(TOKEN_ENDPOINT)
                .post(bodyBuilder.build())
            
            // Use Basic Auth if client_secret is available
            if (CLIENT_SECRET.isNotEmpty()) {
                val credentials = "$CLIENT_ID:$CLIENT_SECRET"
                val encoded = Base64.encodeToString(
                    credentials.toByteArray(),
                    Base64.NO_WRAP
                )
                requestBuilder.addHeader("Authorization", "Basic $encoded")
            } else {
                bodyBuilder.add("client_id", CLIENT_ID)
            }
            
            val request = requestBuilder.build()
            val response = client.newCall(request).execute()
            
            if (!response.isSuccessful) {
                println("Token refresh failed: ${response.code}")
                clearTokens()
                return@withContext false
            }
            
            val responseBody = response.body?.string() ?: return@withContext false
            val json = JSONObject(responseBody)
            
            saveTokens(
                accessToken = json.getString("access_token"),
                refreshToken = json.optString("refresh_token", refreshToken),
                expiresIn = json.optInt("expires_in", 86400)
            )
            
            true
        } catch (e: Exception) {
            println("Token refresh error: ${e.message}")
            clearTokens()
            false
        }
    }
    
    /**
     * Get valid access token (with automatic refresh)
     * Returns null if not authorized or refresh failed
     */
    suspend fun getValidAccessToken(): String? {
        if (!isAuthorized()) {
            return null
        }
        
        if (isTokenExpired()) {
            println("Token expired, refreshing...")
            if (!refreshAccessToken()) {
                return null
            }
        }
        
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }
    
    /**
     * Check if user is authorized (has tokens)
     */
    fun isAuthorized(): Boolean {
        val accessToken = prefs.getString(KEY_ACCESS_TOKEN, null)
        return !accessToken.isNullOrEmpty()
    }
    
    /**
     * Check if token is expired or about to expire
     */
    private fun isTokenExpired(): Boolean {
        val timestamp = prefs.getLong(KEY_TIMESTAMP, 0)
        val expiresIn = prefs.getInt(KEY_EXPIRES_IN, 0)
        
        if (timestamp == 0L || expiresIn == 0) {
            return true
        }
        
        val expirationTime = timestamp + (expiresIn * 1000L)
        return System.currentTimeMillis() >= (expirationTime - EXPIRATION_BUFFER_MS)
    }
    
    /**
     * Save OAuth tokens to shared preferences
     */
    private fun saveTokens(accessToken: String, refreshToken: String, expiresIn: Int) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putInt(KEY_EXPIRES_IN, expiresIn)
            .putLong(KEY_TIMESTAMP, System.currentTimeMillis())
            .apply()
        println("Tokens saved successfully")
    }
    
    /**
     * Clear all stored tokens
     */
    fun clearTokens() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_EXPIRES_IN)
            .remove(KEY_TIMESTAMP)
            .remove(KEY_CODE_VERIFIER)
            .apply()
        println("Tokens cleared")
    }
}
