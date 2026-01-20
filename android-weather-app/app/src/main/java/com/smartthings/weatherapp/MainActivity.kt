package com.smartthings.weatherapp

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.card.MaterialCardView
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

// Data classes for helper functions
data class TempBand(val clothing: List<String>, val color: String)
data class AQICategory(val category: String, val message: String, val color: String, val icon: String)

class MainActivity : AppCompatActivity() {
    
    private lateinit var tvTemperature: TextView
    private lateinit var tvLocation: TextView
    private lateinit var tvHumidity: TextView
    private lateinit var tvLastUpdate: TextView
    private lateinit var tvAqi: TextView
    private lateinit var tvPm10: TextView
    private lateinit var tvPm25: TextView
    private lateinit var tvPm1: TextView
    private lateinit var tvPressure: TextView
    private lateinit var tvClothing: TextView
    private lateinit var tvAqiMessage: TextView
    private lateinit var btnConnect: Button
    private lateinit var progressBar: View
    private lateinit var cardAirQuality: MaterialCardView
    private lateinit var cardTemperature: MaterialCardView
    private lateinit var cardHumidityPressure: MaterialCardView
    
    private lateinit var weatherService: WeatherService
    private lateinit var oauthManager: OAuthManager
    
    private val autoRefreshHandler = Handler(Looper.getMainLooper())
    private val autoRefreshInterval = 60000L // 60 seconds
    
    private val autoRefreshRunnable = object : Runnable {
        override fun run() {
            if (oauthManager.isAuthorized()) {
                loadWeatherData()
            }
            autoRefreshHandler.postDelayed(this, autoRefreshInterval)
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initializeViews()
        initializeServices()
        setupClickListeners()
        
        // Check authorization status
        if (oauthManager.isAuthorized()) {
            btnConnect.visibility = View.GONE
            loadWeatherData()
            startAutoRefresh()
        } else {
            btnConnect.visibility = View.VISIBLE
            showAuthorizationRequired()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopAutoRefresh()
    }
    
    private fun startAutoRefresh() {
        autoRefreshHandler.postDelayed(autoRefreshRunnable, autoRefreshInterval)
    }
    
    private fun stopAutoRefresh() {
        autoRefreshHandler.removeCallbacks(autoRefreshRunnable)
    }
    
    private fun initializeViews() {
        tvTemperature = findViewById(R.id.tv_temperature)
        tvLocation = findViewById(R.id.tv_location)
        tvHumidity = findViewById(R.id.tv_humidity)
        tvLastUpdate = findViewById(R.id.tv_last_update)
        tvAqi = findViewById(R.id.tv_aqi)
        tvPm10 = findViewById(R.id.tv_pm10)
        tvPm25 = findViewById(R.id.tv_pm25)
        tvPm1 = findViewById(R.id.tv_pm1)
        tvPressure = findViewById(R.id.tv_pressure)
        tvClothing = findViewById(R.id.tv_clothing)
        tvAqiMessage = findViewById(R.id.tv_aqi_message)
        btnConnect = findViewById(R.id.btn_connect)
        progressBar = findViewById(R.id.progress_bar)
        cardAirQuality = findViewById(R.id.card_air_quality)
        cardTemperature = findViewById(R.id.card_temperature)
        cardHumidityPressure = findViewById(R.id.card_humidity_pressure)
    }
    
    private fun initializeServices() {
        oauthManager = OAuthManager(this)
        weatherService = WeatherService.create(this)
    }
    
    private fun setupClickListeners() {
        btnConnect.setOnClickListener {
            startOAuthFlow()
        }
    }
    
    private fun showAuthorizationRequired() {
        tvTemperature.text = "--°C"
        tvLocation.text = "Not Connected"
        tvHumidity.text = "--%"
        tvPressure.text = "-- hPa"
        tvAqi.text = "AQI: --"
        tvPm10.text = "--"
        tvPm25.text = "--"
        tvPm1.text = "--"
        tvClothing.text = "Please authorize app to access SmartThings"
        tvAqiMessage.visibility = View.GONE
        tvLastUpdate.text = "Not connected"
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
                    btnConnect.visibility = View.GONE
                    loadWeatherData()
                    startAutoRefresh()
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
        val tempMeasurement = status["temperatureMeasurement"]
        val humidityMeasurement = status["relativeHumidityMeasurement"]
        val pm25Measurement = status["fineDustSensor"]
        val pm10Measurement = status["dustSensor"]
        val pm1Measurement = status["veryFineDustSensor"]
        val pressureMeasurement = status["atmosphericPressureMeasurement"]
        val aqiMeasurement = status["airQualityHealthConcern"]
        
        // Get numeric values for calculations
        val temperature = tempMeasurement?.temperature?.value?.toString()?.toDoubleOrNull()
        val humidity = humidityMeasurement?.humidity?.value?.toString()?.toDoubleOrNull()
        val pm25 = pm25Measurement?.fineDustLevel?.value?.toString()?.toDoubleOrNull()
        val pm10 = pm10Measurement?.dustLevel?.value?.toString()?.toDoubleOrNull()
        val pm1 = pm1Measurement?.veryFineDustLevel?.value?.toString()?.toDoubleOrNull()
        val pressure = pressureMeasurement?.atmosphericPressure?.value?.toString()?.toDoubleOrNull()
        val aqiValue = aqiMeasurement?.airQualityHealthConcern?.value?.toString()
        
        // Update location
        tvLocation.text = location
        
        // Temperature with color coding
        if (temperature != null) {
            tvTemperature.text = "${temperature.toInt()}°C"
            val tempBand = getTempClothing(temperature)
            tvTemperature.setTextColor(android.graphics.Color.parseColor(tempBand.color))
            
            // Update card border color based on temperature
            updateCardBorderColor(cardTemperature, tempBand.color)
            
            // Clothing recommendations
            val clothingText = tempBand.clothing.joinToString("\n") { "• $it" }
            tvClothing.text = clothingText
        } else {
            tvTemperature.text = "--°C"
            tvClothing.text = "No data"
        }
        
        // Air Quality Index
        if (aqiValue != null) {
            val aqiCategory = getAQICategory(aqiValue)
            tvAqi.text = "${aqiCategory.icon} ${aqiCategory.category}"
            tvAqi.setTextColor(android.graphics.Color.parseColor(aqiCategory.color))
            
            // Update card border color based on AQI
            updateCardBorderColor(cardAirQuality, aqiCategory.color)
            
            // Show AQI message for concerning air quality
            if (aqiValue.toIntOrNull() != null && aqiValue.toInt() >= 3) {
                tvAqiMessage.text = aqiCategory.message
                tvAqiMessage.visibility = View.VISIBLE
            } else {
                tvAqiMessage.visibility = View.GONE
            }
        } else {
            tvAqi.text = "AQI: --"
            tvAqiMessage.visibility = View.GONE
        }
        
        // PM10 with color coding
        if (pm10 != null) {
            tvPm10.text = "${pm10.toInt()} µg/m³"
            tvPm10.setTextColor(getPMColor(pm10))
        } else {
            tvPm10.text = "-- µg/m³"
        }
        
        // PM2.5 with color coding
        if (pm25 != null) {
            tvPm25.text = "${pm25.toInt()} µg/m³"
            tvPm25.setTextColor(getPMColor(pm25))
        } else {
            tvPm25.text = "-- µg/m³"
        }
        
        // PM1 with color coding
        if (pm1 != null) {
            tvPm1.text = "${pm1.toInt()} µg/m³"
            tvPm1.setTextColor(getPMColor(pm1))
        } else {
            tvPm1.text = "-- µg/m³"
        }
        
        // Humidity with color coding
        if (humidity != null) {
            tvHumidity.text = "${humidity.toInt()}%"
            val humidityColor = getHumidityColor(humidity)
            tvHumidity.setTextColor(humidityColor)
            
            // Update card border color - use average of humidity and pressure colors
            if (pressure != null) {
                val pressureColor = getPressureColor(pressure)
                // Use better color (green if either is green, otherwise use worse color)
                val cardColor = if (humidityColor == android.graphics.Color.parseColor("#00cc00") || 
                                    pressureColor == android.graphics.Color.parseColor("#00cc00")) {
                    "#00cc00"
                } else if (humidityColor == android.graphics.Color.parseColor("#ffaa00") || 
                           pressureColor == android.graphics.Color.parseColor("#ffaa00")) {
                    "#ffaa00"
                } else {
                    "#ff6600"
                }
                updateCardBorderColor(cardHumidityPressure, cardColor)
            }
        } else {
            tvHumidity.text = "--%"
        }
        
        // Pressure with color coding
        if (pressure != null) {
            tvPressure.text = "${pressure.toInt()} hPa"
            tvPressure.setTextColor(getPressureColor(pressure))
        } else {
            tvPressure.text = "-- hPa"
        }
        
        // Update timestamp
        val dateFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        tvLastUpdate.text = "Updated: ${dateFormat.format(Date())}"
    }
    
    // Helper function: Get clothing recommendations based on temperature
    private fun getTempClothing(tempC: Double): TempBand {
        return when {
            tempC <= 0 -> TempBand(
                listOf("❄️ Heavy Coat", "🧤 Gloves", "🧣 Scarf", "🎿 Warm Boots"),
                "#0066ff"
            )
            tempC <= 10 -> TempBand(
                listOf("🧥 Jacket", "👖 Long Pants", "👢 Shoes"),
                "#0099ff"
            )
            tempC <= 15 -> TempBand(
                listOf("🧥 Light Jacket", "👖 Long Pants", "👟 Sneakers"),
                "#00ccff"
            )
            tempC <= 20 -> TempBand(
                listOf("👕 Long Sleeve Shirt", "👖 Long Pants"),
                "#00ff99"
            )
            tempC <= 25 -> TempBand(
                listOf("👕 T-Shirt", "👖 Shorts or Light Pants"),
                "#ffff00"
            )
            tempC <= 30 -> TempBand(
                listOf("👕 T-Shirt", "🩳 Shorts"),
                "#ff9900"
            )
            else -> TempBand(
                listOf("👕 Light T-Shirt", "🩳 Shorts", "🕶️ Sunglasses"),
                "#ff3300"
            )
        }
    }
    
    // Helper function: Get AQI category with message and color
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
        
        // Handle string values
        return when (aqiValue.lowercase()) {
            "good" -> AQICategory("Good", "Air quality is good", "#28a745", "😊")
            "moderate", "fair" -> AQICategory("Moderate", "Acceptable air quality", "#ffc107", "🙂")
            "slightly unhealthy", "slightlyunhealthy" -> AQICategory("Slightly Unhealthy", "Sensitive groups should limit outdoor activity", "#fd7e14", "😕")
            "unhealthy", "poor" -> AQICategory("Unhealthy", "WEAR MASK - Unhealthy air", "#dc3545", "☹️")
            "very unhealthy", "veryunhealthy", "very poor" -> AQICategory("Very Unhealthy", "STAY INDOORS - Very unhealthy", "#6f42c1", "🤢")
            "hazardous", "extremely poor", "extremelypoor" -> AQICategory("Hazardous", "HAZARDOUS - DO NOT GO OUTSIDE", "#721c24", "☠️")
            else -> AQICategory("Unknown", "Unknown air quality", "#cccccc", "❓")
        }
    }
    
    // Helper function: Get PM color based on value
    private fun getPMColor(pm: Double): Int {
        return when {
            pm <= 12 -> android.graphics.Color.parseColor("#00aa00")  // Good
            pm <= 35 -> android.graphics.Color.parseColor("#ffaa00")  // Fair
            pm <= 55 -> android.graphics.Color.parseColor("#ff6600")  // Moderate
            pm <= 150 -> android.graphics.Color.parseColor("#ff3300") // Poor
            else -> android.graphics.Color.parseColor("#990000")      // Very Poor
        }
    }
    
    // Helper function: Get humidity color
    private fun getHumidityColor(humidity: Double): Int {
        return when {
            humidity < 30 -> android.graphics.Color.parseColor("#0099ff")  // Dry
            humidity < 50 -> android.graphics.Color.parseColor("#00cc00")  // Good
            humidity < 70 -> android.graphics.Color.parseColor("#ffaa00")  // Humid
            else -> android.graphics.Color.parseColor("#ff6600")           // Very Humid
        }
    }
    
    // Helper function: Get pressure color
    private fun getPressureColor(pressure: Double): Int {
        return when {
            pressure >= 1013 -> android.graphics.Color.parseColor("#00cc00")  // Rising/High
            pressure >= 1009 -> android.graphics.Color.parseColor("#ffaa00")  // Stable
            else -> android.graphics.Color.parseColor("#ff6600")              // Falling/Low
        }
    }
    
    // Helper function: Update card border color
    private fun updateCardBorderColor(card: MaterialCardView, colorHex: String) {
        card.setCardBackgroundColor(android.graphics.Color.parseColor("#000000"))
        card.strokeColor = android.graphics.Color.parseColor(colorHex)
        card.strokeWidth = 9 // 3dp in pixels
    }
    
    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        tvLastUpdate.text = message
    }
    
    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
        btnConnect.isEnabled = !show
    }
}
