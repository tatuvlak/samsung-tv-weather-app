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
                
                println("DEBUG: Exchanging code: ${code.take(10)}...")
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
                        "Authorization failed. Check logcat for details.",
                        Toast.LENGTH_LONG
                    ).show()
                    showAuthorizationRequired()
                }
            } catch (e: Exception) {
                showLoading(false)
                println("ERROR: Authorization exception: ${e.message}")
                e.printStackTrace()
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
                
                // Find weather capability device (look for air quality sensor)
                val weatherDevice = devicesResponse.items.firstOrNull { device ->
                    val componentsStr = device.components?.toString() ?: ""
                    componentsStr.contains("temperatureMeasurement") ||
                    componentsStr.contains("relativeHumidityMeasurement") ||
                    componentsStr.contains("pm25Measurement") ||
                    componentsStr.contains("airQuality")
                }
                
                if (weatherDevice != null) {
                    // Get device status from main component
                    val status = weatherService.getDeviceStatus(weatherDevice.deviceId)
                    
                    if (status != null) {
                        displayWeatherData(status, weatherDevice.label ?: weatherDevice.name)
                    } else {
                        showError("Failed to load weather data")
                    }
                } else {
                    showError("No weather device found. Please check your SmartThings setup.")
                }
                
                showLoading(false)
                
            } catch (e: Exception) {
                showLoading(false)
                showError("Failed to load weather data: ${e.message}")
                e.printStackTrace()
            }
        }
    }
    
    private fun displayWeatherData(status: Map<String, ComponentStatus>, location: String) {
        // Extract weather data from SmartThings component status
        // Component status contains: temperatureMeasurement, relativeHumidityMeasurement, etc.
        
        val tempMeasurement = status["temperatureMeasurement"]
        val humidityMeasurement = status["relativeHumidityMeasurement"]
        val pm25Measurement = status["fineDustSensor"]
        val pm10Measurement = status["dustSensor"]
        val pm1Measurement = status["veryFineDustSensor"]
        val pressureMeasurement = status["atmosphericPressureMeasurement"]
        val aqiMeasurement = status["airQualityHealthConcern"]
        
        val temperature = tempMeasurement?.temperature?.value?.toString() ?: "--"
        val humidity = humidityMeasurement?.humidity?.value?.toString() ?: "--"
        val pm25 = pm25Measurement?.fineDustLevel?.value?.toString() ?: "--"
        val pm10 = pm10Measurement?.dustLevel?.value?.toString() ?: "--"
        val pm1 = pm1Measurement?.veryFineDustLevel?.value?.toString() ?: "--"
        val pressure = pressureMeasurement?.atmosphericPressure?.value?.toString() ?: "--"
        val aqi = aqiMeasurement?.airQualityHealthConcern?.value?.toString() ?: "N/A"
        
        tvTemperature.text = if (temperature != "--") "$temperature°C" else temperature
        tvLocation.text = location
        tvCondition.text = "AQI: $aqi"
        tvHumidity.text = "Humidity: $humidity%"
        tvWindSpeed.text = "PM2.5: $pm25 µg/m³" // Reuse wind speed field for PM2.5
        
        val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        tvLastUpdate.text = "Last updated: ${dateFormat.format(Date())}"
        
        // Log for debugging
        println("Weather data: temp=$temperature, humidity=$humidity, pm25=$pm25, aqi=$aqi")
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
