package com.smartthings.weatherapp

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface SmartThingsApi {
    @GET("devices/{deviceId}/status")
    suspend fun getDeviceStatus(
        @Path("deviceId") deviceId: String,
        @Header("Authorization") token: String
    ): DeviceStatusResponse
    
    @GET("devices")
    suspend fun getDevices(
        @Header("Authorization") token: String
    ): DevicesResponse
}

data class DeviceStatusResponse(
    val status: Map<String, Any>
)

data class DevicesResponse(
    val items: List<Device>
)

data class Device(
    val deviceId: String,
    val name: String,
    val label: String?,
    val type: String
)

class WeatherService private constructor(private val oauthManager: OAuthManager) {
    
    private val api: SmartThingsApi
    
    init {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
        
        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.smartthings.com/v1/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        
        api = retrofit.create(SmartThingsApi::class.java)
    }
    
    /**
     * Get device status with automatic OAuth token handling
     */
    suspend fun getDeviceStatus(deviceId: String): DeviceStatusResponse? {
        val token = oauthManager.getValidAccessToken() ?: return null
        return try {
            api.getDeviceStatus(deviceId, "Bearer $token")
        } catch (e: Exception) {
            println("Failed to get device status: ${e.message}")
            null
        }
    }
    
    /**
     * Get all devices with automatic OAuth token handling
     */
    suspend fun getDevices(): DevicesResponse? {
        val token = oauthManager.getValidAccessToken() ?: return null
        return try {
            api.getDevices("Bearer $token")
        } catch (e: Exception) {
            println("Failed to get devices: ${e.message}")
            null
        }
    }
    
    companion object {
        @Volatile
        private var instance: WeatherService? = null
        
        fun create(context: Context): WeatherService {
            return instance ?: synchronized(this) {
                instance ?: WeatherService(OAuthManager(context)).also { instance = it }
            }
        }
    }
}
