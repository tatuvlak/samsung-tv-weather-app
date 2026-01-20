package com.smartthings.weatherapp

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

class WeatherService private constructor() {
    
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
    
    suspend fun getDeviceStatus(deviceId: String, token: String): DeviceStatusResponse {
        return api.getDeviceStatus(deviceId, "Bearer $token")
    }
    
    suspend fun getDevices(token: String): DevicesResponse {
        return api.getDevices("Bearer $token")
    }
    
    companion object {
        @Volatile
        private var instance: WeatherService? = null
        
        fun create(): WeatherService {
            return instance ?: synchronized(this) {
                instance ?: WeatherService().also { instance = it }
            }
        }
    }
}
