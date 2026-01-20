package com.smartthings.weatherapp

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
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
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initializeViews()
        initializeWeatherService()
        setupClickListeners()
        
        // Load initial weather data
        loadWeatherData()
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
    
    private fun initializeWeatherService() {
        weatherService = WeatherService.create()
    }
    
    private fun setupClickListeners() {
        btnRefresh.setOnClickListener {
            loadWeatherData()
        }
        
        btnConnect.setOnClickListener {
            connectToSmartThings()
        }
    }
    
    private fun loadWeatherData() {
        lifecycleScope.launch {
            try {
                showLoading(true)
                
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
                showLoading(false)
                
            } catch (e: Exception) {
                showLoading(false)
                showError("Failed to load weather data: ${e.message}")
            }
        }
    }
    
    private fun connectToSmartThings() {
        lifecycleScope.launch {
            try {
                showLoading(true)
                
                // TODO: Implement SmartThings API connection
                // This will connect to the SmartThings MCP server
                
                Toast.makeText(
                    this@MainActivity,
                    "Connecting to SmartThings...",
                    Toast.LENGTH_SHORT
                ).show()
                
                showLoading(false)
                
            } catch (e: Exception) {
                showLoading(false)
                showError("Failed to connect: ${e.message}")
            }
        }
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
