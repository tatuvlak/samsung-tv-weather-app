package com.smartthings.weatherapp

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {
    
    private lateinit var tvTemperature: TextView
    private lateinit var tvLocation: TextView
    private lateinit var tvCondition: TextView
    private lateinit var tvHumidity: TextView
    private lateinit var tvWindSpeed: TextView
    private lateinit var tvLastUpdate: TextView
    private lateinit var btnRefresh: Button
    private lateinit var btnConnect: Button
    private lateinit var progressBar: View
    
    private lateinit var weatherService: WeatherService
    private lateinit var oauthManager: OAuthManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initializeViews()
        initializeServices()
        setupClickListeners()
        
        // Check authorization status
        if (oauthManager.isAuthorized()) {
            loadWeatherData()
        } else {
            showAuthorizationRequired()
        }
    }
    
    private fun initializeViews() {
        tvTemperature = findViewById(R.id.tv_temperature)
        tvLocation = findViewById(R.id.tv_location)
        tvCondition = findViewById(R.id.tv_condition)
        tvHumidity = findViewById(R.id.tv_humidity)
        tvWindSpeed = findViewById(R.id.tv_wind_speed)
        tvLastUpdate = findViewById(R.id.tv_last_update)
        btnRefresh = findViewById(R.id.btn_refresh)
        btnConnect = findViewById(R.id.btn_connect)
        progressBar = findViewById(R.id.progress_bar)
    }
    
    private fun initializeServices() {
        oauthManager = OAuthManager(this)
        weatherService = WeatherService.create(this)
    }
    
    private fun setupClickListeners() {
        btnRefresh.setOnClickListener {
            if (oauthManager.isAuthorized()) {
                loadWeatherData()
            } else {
                showAuthorizationRequired()
            }
        }
        
        btnConnect.setOnClickListener {
            startOAuthFlow()
        }
    }
    
    private fun showAuthorizationRequired() {
        tvCondition.text = "Authorization Required"
        tvTemperature.text = "--°C"
        tvLocation.text = "Not Connected"
        tvHumidity.text = "Humidity: --%"
        tvWindSpeed.text = "Wind: -- km/h"
        tvLastUpdate.text = "Please authorize app to access SmartThings"
    }
    
    private fun startOAuthFlow() {
        // Step 1: Open browser for authorization
        val authIntent = oauthManager.startAuthorizationFlow()
        startActivity(authIntent)
        
        // Step 2: Show dialog to enter authorization code
        // (User will copy code from callback page)
        showAuthorizationCodeDialog()
    }
    
    private fun showAuthorizationCodeDialog() {
        AlertDialog.Builder(this)
            .setTitle("Enter Authorization Code")
            .setMessage("After authorizing, copy the code from the callback page and paste it here:")
            .setView(R.layout.dialog_auth_code)
            .setPositiveButton("Submit") { dialog, _ ->
                val editText = (dialog as AlertDialog).findViewById<EditText>(R.id.et_auth_code)
                val code = editText?.text?.toString()?.trim()
                if (!code.isNullOrEmpty()) {
                    exchangeCodeForTokens(code)
                } else {
                    Toast.makeText(this, "Please enter a valid code", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun exchangeCodeForTokens(code: String) {
        lifecycleScope.launch {
            try {
                showLoading(true)
                
                val success = oauthManager.exchangeCodeForTokens(code)
                
                showLoading(false)
                
                if (success) {
                    Toast.makeText(
                        this@MainActivity,
                        "Authorization successful!",
                        Toast.LENGTH_SHORT
                    ).show()
                    loadWeatherData()
                } else {
                    Toast.makeText(
                        this@MainActivity,
                        "Authorization failed. Please try again.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                showLoading(false)
                showError("Authorization error: ${e.message}")
            }
        }
    }
    
    private fun loadWeatherData() {
        lifecycleScope.launch {
            try {
                showLoading(true)
                
                // Get devices and find weather device
                val devicesResponse = weatherService.getDevices()
                
                if (devicesResponse == null) {
                    showLoading(false)
                    showAuthorizationRequired()
                    return@launch
                }
                
                // Find weather capability device
                val weatherDevice = devicesResponse.items.firstOrNull { device ->
                    device.name.contains("weather", ignoreCase = true) ||
                    device.label?.contains("weather", ignoreCase = true) == true
                }
                
                if (weatherDevice != null) {
                    // Get device status
                    val status = weatherService.getDeviceStatus(weatherDevice.deviceId)
                    
                    if (status != null) {
                        displayWeatherData(status, weatherDevice.label ?: weatherDevice.name)
                    } else {
                        showError("Failed to load weather data")
                    }
                } else {
                    // Simulated weather data for demonstration
                    val weatherData = WeatherData(
                        temperature = 22.5,
                        location = "Living Room",
                        condition = "Partly Cloudy",
                        humidity = 65,
                        windSpeed = 12.5,
                        timestamp = System.currentTimeMillis()
                    )
                    
                    displayWeatherData(weatherData)
                }
                
                showLoading(false)
                
            } catch (e: Exception) {
                showLoading(false)
                showError("Failed to load weather data: ${e.message}")
            }
        }
    }
    
    private fun displayWeatherData(status: DeviceStatusResponse, location: String) {
        // Extract weather data from SmartThings device status
        // This is an example - adjust based on your device's capabilities
        val temperature = extractValue(status.status, "temperature") ?: "--"
        val humidity = extractValue(status.status, "humidity") ?: "--"
        val condition = extractValue(status.status, "weatherCondition") ?: "Unknown"
        
        tvTemperature.text = "$temperature°C"
        tvLocation.text = location
        tvCondition.text = condition.toString()
        tvHumidity.text = "Humidity: $humidity%"
        tvWindSpeed.text = "Wind: -- km/h" // If available in your device
        
        val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        tvLastUpdate.text = "Last updated: ${dateFormat.format(Date())}"
    }
    
    
    private fun extractValue(status: Map<String, Any>, key: String): Any? {
        val capability = status[key] as? Map<*, *>
        return capability?.get("value")
    }
    
    private fun displayWeatherData(data: WeatherData) {
        tvTemperature.text = "${data.temperature}°C"
        tvLocation.text = data.location
        tvCondition.text = data.condition
        tvHumidity.text = "Humidity: ${data.humidity}%"
        tvWindSpeed.text = "Wind: ${data.windSpeed} km/h"
        
        val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        tvLastUpdate.text = "Last updated: ${dateFormat.format(Date(data.timestamp))}"
    }
    
    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
        btnRefresh.isEnabled = !show
        btnConnect.isEnabled = !show
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}

data class WeatherData(
    val temperature: Double,
    val location: String,
    val condition: String,
    val humidity: Int,
    val windSpeed: Double,
    val timestamp: Long
)
