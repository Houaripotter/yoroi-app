package com.houari.yoroi.wear.data

import android.content.Context
import android.content.SharedPreferences
import android.media.MediaPlayer
import android.os.PowerManager
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.health.services.client.HealthServices
import androidx.health.services.client.PassiveListeningClient
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.PassiveListenerConfig
import androidx.health.services.client.PassiveListenerCallback
import androidx.health.services.client.data.DataPointContainer
import com.google.android.gms.wearable.*
import kotlinx.coroutines.*

/**
 * Repository central pour les donnees synchronisees avec le telephone.
 * Equivalent du WatchSessionManager.swift de l'Apple Watch.
 */
class YoroiDataRepository(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("yoroi_watch_data", Context.MODE_PRIVATE)

    // --- Poids ---
    var currentWeight by mutableStateOf(prefs.getFloat("currentWeight", 0f).toDouble())
        private set
    var targetWeight by mutableStateOf(prefs.getFloat("targetWeight", 0f).toDouble())
        private set
    var startWeight by mutableStateOf(prefs.getFloat("startWeight", 0f).toDouble())
        private set

    // --- Hydratation ---
    var hydrationCurrent by mutableStateOf(prefs.getInt("hydrationCurrent", 0))
        private set
    var hydrationGoal by mutableStateOf(prefs.getInt("hydrationGoal", 2500))
        private set

    // --- Sommeil ---
    var sleepDuration by mutableStateOf(prefs.getInt("sleepDuration", 0)) // minutes
        private set
    var sleepQuality by mutableStateOf(prefs.getInt("sleepQuality", 0)) // 0-5
        private set
    var sleepBedTime by mutableStateOf(prefs.getString("sleepBedTime", "--:--") ?: "--:--")
        private set
    var sleepWakeTime by mutableStateOf(prefs.getString("sleepWakeTime", "--:--") ?: "--:--")
        private set
    var sleepGoalMinutes by mutableStateOf(prefs.getInt("sleepGoalMinutes", 480))
        private set
    var sleepDebt by mutableStateOf(prefs.getFloat("sleepDebt", 0f).toDouble())
        private set

    // --- Profil ---
    var userName by mutableStateOf(prefs.getString("userName", "Champion") ?: "Champion")
        private set
    var level by mutableStateOf(prefs.getInt("level", 1))
        private set
    var rank by mutableStateOf(prefs.getString("rank", "") ?: "")
        private set
    var streak by mutableStateOf(prefs.getInt("streak", 0))
        private set

    // --- Sante ---
    var heartRate by mutableStateOf(prefs.getInt("heartRate", 0))
        private set
    var spo2 by mutableStateOf(prefs.getInt("spo2", 0))
        private set
    var activeCalories by mutableStateOf(prefs.getInt("activeCalories", 0))
        private set
    var distance by mutableStateOf(prefs.getFloat("distance", 0f).toDouble())
        private set
    var stepsGoal by mutableStateOf(prefs.getInt("stepsGoal", 10000))
        private set

    // --- Timer ---
    var timerTotalSeconds by mutableStateOf(90)
        private set
    var timerRemainingSeconds by mutableStateOf(90)
        private set
    var timerIsRunning by mutableStateOf(false)
        private set
    var timerMode by mutableStateOf("Repos")
        private set
    var timerFavorites by mutableStateOf(
        prefs.getString("timerFavorites", "")?.split(",")
            ?.mapNotNull { it.toIntOrNull() } ?: emptyList()
    )
        private set

    // --- Profile Photo ---
    var profileImageBase64 by mutableStateOf(prefs.getString("profileImageBase64", null))
        private set

    // --- Theme ---
    var themeAccentHex by mutableStateOf(prefs.getString("themeAccentHex", "#D4AF37") ?: "#D4AF37")
        private set
    var themeCompanionHex by mutableStateOf(prefs.getString("themeCompanionHex", "#FFFFFF") ?: "#FFFFFF")
        private set
    var themeMode by mutableStateOf(prefs.getString("themeMode", "dark") ?: "dark")
        private set
    var themeBgHex by mutableStateOf(prefs.getString("themeBgHex", "#000000") ?: "#000000")
        private set
    var themeCardBgHex by mutableStateOf(prefs.getString("themeCardBgHex", "#151515") ?: "#151515")
        private set
    var themeTextPrimaryHex by mutableStateOf(prefs.getString("themeTextPrimaryHex", "#FFFFFF") ?: "#FFFFFF")
        private set
    var themeTextSecondaryHex by mutableStateOf(prefs.getString("themeTextSecondaryHex", "#E0E0E0") ?: "#E0E0E0")
        private set
    var themeDividerHex by mutableStateOf(prefs.getString("themeDividerHex", "#2A2A2A") ?: "#2A2A2A")
        private set
    var themeTextOnAccentHex by mutableStateOf(prefs.getString("themeTextOnAccentHex", "#FFFFFF") ?: "#FFFFFF")
        private set

    val isDarkMode: Boolean get() = themeMode != "light"

    // --- Local Health (from Watch sensors via Health Services) ---
    var localSteps by mutableStateOf(0)
        private set
    var localHeartRate by mutableStateOf(0)
        private set
    var localActiveCalories by mutableStateOf(0)
        private set
    var localDistance by mutableStateOf(0.0) // km
        private set

    // --- Connexion ---
    var isConnected by mutableStateOf(false)
        private set

    private var timerJob: Job? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var mediaPlayer: MediaPlayer? = null
    private var passiveClient: PassiveListeningClient? = null

    /**
     * Traite les donnees recues du telephone
     */
    fun processData(data: Map<String, Any>) {
        // Helper: JSON numbers can be Int, Long, or Double
        fun intOf(key: String): Int? = (data[key] as? Number)?.toInt()
        fun doubleOf(key: String): Double? = (data[key] as? Number)?.toDouble()

        // Poids
        doubleOf("w")?.let { currentWeight = it; save("currentWeight", it.toFloat()) }
        doubleOf("currentWeight")?.let { currentWeight = it; save("currentWeight", it.toFloat()) }
        doubleOf("tw")?.let { targetWeight = it; save("targetWeight", it.toFloat()) }
        doubleOf("targetWeight")?.let { targetWeight = it; save("targetWeight", it.toFloat()) }
        doubleOf("sw")?.let { startWeight = it; save("startWeight", it.toFloat()) }
        doubleOf("startWeight")?.let { startWeight = it; save("startWeight", it.toFloat()) }

        // Hydratation
        intOf("wi")?.let { hydrationCurrent = it; save("hydrationCurrent", it) }
        intOf("waterIntake")?.let { hydrationCurrent = it; save("hydrationCurrent", it) }
        intOf("wg")?.let { hydrationGoal = it; save("hydrationGoal", it) }
        intOf("waterGoal")?.let { hydrationGoal = it; save("hydrationGoal", it) }
        intOf("hydrationGoal")?.let { hydrationGoal = it; save("hydrationGoal", it) }

        // Sommeil
        intOf("sd")?.let { sleepDuration = it; save("sleepDuration", it) }
        intOf("sleepDuration")?.let { sleepDuration = it; save("sleepDuration", it) }
        intOf("sq")?.let { sleepQuality = it; save("sleepQuality", it) }
        intOf("sleepQuality")?.let { sleepQuality = it; save("sleepQuality", it) }
        (data["sbt"] as? String)?.let { sleepBedTime = it; saveStr("sleepBedTime", it) }
        (data["sleepBedTime"] as? String)?.let { sleepBedTime = it; saveStr("sleepBedTime", it) }
        (data["swt"] as? String)?.let { sleepWakeTime = it; saveStr("sleepWakeTime", it) }
        (data["sleepWakeTime"] as? String)?.let { sleepWakeTime = it; saveStr("sleepWakeTime", it) }
        intOf("sgm")?.let { sleepGoalMinutes = it; save("sleepGoalMinutes", it) }
        intOf("sleepGoal")?.let { sleepGoalMinutes = it; save("sleepGoalMinutes", it) }
        doubleOf("sdb")?.let { sleepDebt = it; save("sleepDebt", it.toFloat()) }
        doubleOf("sleepDebt")?.let { sleepDebt = it; save("sleepDebt", it.toFloat()) }

        // Profil
        (data["un"] as? String)?.let { userName = it; saveStr("userName", it) }
        (data["userName"] as? String)?.let { userName = it; saveStr("userName", it) }
        intOf("lv")?.let { level = it; save("level", it) }
        intOf("level")?.let { level = it; save("level", it) }
        (data["rk"] as? String)?.let { rank = it; saveStr("rank", it) }
        (data["rank"] as? String)?.let { rank = it; saveStr("rank", it) }
        intOf("s")?.let { streak = it; save("streak", it) }
        intOf("streak")?.let { streak = it; save("streak", it) }

        // Sante
        intOf("heartRate")?.let { heartRate = it; save("heartRate", it) }
        intOf("spo2")?.let { spo2 = it; save("spo2", it) }
        intOf("activeCalories")?.let { activeCalories = it; save("activeCalories", it) }
        doubleOf("distance")?.let { distance = it; save("distance", it.toFloat()) }
        intOf("stepsGoal")?.let { stepsGoal = it; save("stepsGoal", it) }

        // Profile photo
        (data["profileImage"] as? String)?.let {
            profileImageBase64 = it
            saveStr("profileImageBase64", it)
        }

        // Theme
        (data["themeAccent"] as? String)?.let { themeAccentHex = it; saveStr("themeAccentHex", it) }
        (data["themeCompanion"] as? String)?.let { themeCompanionHex = it; saveStr("themeCompanionHex", it) }
        (data["themeMode"] as? String)?.let { themeMode = it; saveStr("themeMode", it) }
        (data["themeBg"] as? String)?.let { themeBgHex = it; saveStr("themeBgHex", it) }
        (data["themeCardBg"] as? String)?.let { themeCardBgHex = it; saveStr("themeCardBgHex", it) }
        (data["themeTextPrimary"] as? String)?.let { themeTextPrimaryHex = it; saveStr("themeTextPrimaryHex", it) }
        (data["themeTextSecondary"] as? String)?.let { themeTextSecondaryHex = it; saveStr("themeTextSecondaryHex", it) }
        (data["themeDivider"] as? String)?.let { themeDividerHex = it; saveStr("themeDividerHex", it) }
        (data["themeTextOnAccent"] as? String)?.let { themeTextOnAccentHex = it; saveStr("themeTextOnAccentHex", it) }

        isConnected = true
    }

    // --- Health Services (direct Watch sensor data) ---

    fun startHealthListening() {
        try {
            passiveClient = HealthServices.getClient(context).passiveMonitoringClient

            val dataTypes = setOf(
                DataType.STEPS_DAILY,
                DataType.HEART_RATE_BPM,
                DataType.CALORIES_DAILY,
                DataType.DISTANCE_DAILY
            )

            val config = PassiveListenerConfig.builder()
                .setDataTypes(dataTypes)
                .build()

            val callback = object : PassiveListenerCallback {
                override fun onNewDataPointsReceived(dataPoints: DataPointContainer) {
                    // Steps
                    dataPoints.getData(DataType.STEPS_DAILY).lastOrNull()?.let {
                        localSteps = it.value.toInt()
                    }

                    // Heart rate
                    dataPoints.getData(DataType.HEART_RATE_BPM).lastOrNull()?.let {
                        localHeartRate = it.value.toInt()
                    }

                    // Calories
                    dataPoints.getData(DataType.CALORIES_DAILY).lastOrNull()?.let {
                        localActiveCalories = it.value.toInt()
                    }

                    // Distance (meters -> km)
                    dataPoints.getData(DataType.DISTANCE_DAILY).lastOrNull()?.let {
                        localDistance = it.value / 1000.0
                    }
                }
            }

            passiveClient?.setPassiveListenerCallback(callback, config)
        } catch (_: Exception) {
            // Health Services not available on this device - use iPhone sync
        }
    }

    // --- Objectifs ---

    fun adjustStepsGoal(delta: Int) {
        stepsGoal = (stepsGoal + delta).coerceIn(1000, 30000)
        save("stepsGoal", stepsGoal)
        sendAction("updateStepsGoal", mapOf("stepsGoal" to stepsGoal))
    }

    fun adjustHydrationGoal(delta: Int) {
        hydrationGoal = (hydrationGoal + delta).coerceIn(500, 6000)
        save("hydrationGoal", hydrationGoal)
        sendAction("updateHydrationGoal", mapOf("hydrationGoal" to hydrationGoal))
    }

    // --- Theme (synced back to phone) ---

    fun changeThemeMode(mode: String) {
        themeMode = mode
        saveStr("themeMode", mode)
        sendAction("changeThemeMode", mapOf("themeMode" to mode))
        // Request sync to get updated theme colors
        CoroutineScope(Dispatchers.Main).launch {
            delay(500)
            requestSync()
        }
    }

    // --- Units (synced back to phone) ---

    fun changeUnitSystem(unit: String) {
        sendAction("changeUnitSystem", mapOf("unitSystem" to unit))
    }

    // --- Timer preset (synced back to phone) ---

    fun changeTimerPreset(seconds: Int) {
        sendAction("changeTimerPreset", mapOf("timerSeconds" to seconds))
    }

    // --- Timer ---

    fun addTimerFavorite(seconds: Int) {
        if (seconds !in timerFavorites) {
            timerFavorites = (timerFavorites + seconds).sorted()
            saveStr("timerFavorites", timerFavorites.joinToString(","))
        }
    }

    fun removeTimerFavorite(seconds: Int) {
        timerFavorites = timerFavorites.filter { it != seconds }
        saveStr("timerFavorites", timerFavorites.joinToString(","))
    }

    fun setTimer(seconds: Int, mode: String = "Repos") {
        timerTotalSeconds = seconds
        timerRemainingSeconds = seconds
        timerMode = mode
        timerIsRunning = false
        timerJob?.cancel()
    }

    fun startTimer() {
        if (timerRemainingSeconds <= 0) return
        timerIsRunning = true
        acquireWakeLock()
        timerJob?.cancel()
        timerJob = CoroutineScope(Dispatchers.Main).launch {
            while (timerRemainingSeconds > 0 && timerIsRunning) {
                delay(1000)
                timerRemainingSeconds--
            }
            if (timerRemainingSeconds <= 0) {
                timerIsRunning = false
                releaseWakeLock()
                // Vibrer a la fin
                @Suppress("DEPRECATION")
                (context.getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator)
                    ?.vibrate(longArrayOf(0, 300, 200, 300, 200, 300), -1)
                // Jouer le son Wizz
                playWizzSound()
            }
        }
    }

    fun pauseTimer() {
        timerIsRunning = false
        timerJob?.cancel()
        releaseWakeLock()
    }

    fun resetTimer() {
        timerIsRunning = false
        timerJob?.cancel()
        releaseWakeLock()
        timerRemainingSeconds = timerTotalSeconds
    }

    // --- WakeLock (keeps timer alive when screen off) ---

    @Suppress("DEPRECATION")
    private fun acquireWakeLock() {
        releaseWakeLock()
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        wakeLock = pm?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "yoroi:timer_wakelock"
        )?.apply {
            acquire(10 * 60 * 1000L) // max 10 minutes
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
    }

    // --- Wizz Sound ---

    private fun playWizzSound() {
        try {
            val afd = context.assets.openFd("wizz-made-with-Voicemod.mp3")
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                afd.close()
                prepare()
                start()
                setOnCompletionListener { it.release() }
            }
        } catch (_: Exception) {
            // No sound file - vibration is the fallback (already done above)
        }
    }

    // --- Hydratation ---

    fun addHydration(amount: Int) {
        hydrationCurrent += amount
        save("hydrationCurrent", hydrationCurrent)
        // Envoyer au telephone
        sendAction("addHydration", mapOf("amount" to amount))
    }

    // --- Poids ---

    fun logWeight(weight: Double) {
        currentWeight = weight
        save("currentWeight", weight.toFloat())
        sendAction("logWeight", mapOf("weight" to weight))
    }

    // --- Communication avec le telephone ---

    private fun sendAction(action: String, data: Map<String, Any> = emptyMap()) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val nodeClient = Wearable.getNodeClient(context)
                val nodes = Tasks.await(nodeClient.connectedNodes)
                val messageClient = Wearable.getMessageClient(context)

                val payload = buildString {
                    append("{\"action\":\"$action\"")
                    data.forEach { (key, value) ->
                        when (value) {
                            is Int -> append(",\"$key\":$value")
                            is Double -> append(",\"$key\":$value")
                            is String -> append(",\"$key\":\"$value\"")
                        }
                    }
                    append("}")
                }.toByteArray()

                for (node in nodes) {
                    messageClient.sendMessage(node.id, "/yoroi/action", payload)
                }
            } catch (_: Exception) { }
        }
    }

    fun addBenchmarkEntry(benchmarkId: String, exerciseName: String, value: Double, reps: Int, rpe: Int) {
        sendAction("addBenchmarkEntry", mapOf(
            "benchmarkId" to benchmarkId,
            "exerciseName" to exerciseName,
            "value" to value,
            "reps" to reps,
            "rpe" to rpe,
            "timestamp" to System.currentTimeMillis().toDouble()
        ))
    }

    fun requestSync() {
        sendAction("requestSync")
    }

    fun formatTime(seconds: Int): String {
        val m = seconds / 60
        val s = seconds % 60
        return "%d:%02d".format(m, s)
    }

    // --- Persistence ---
    private fun save(key: String, value: Float) = prefs.edit().putFloat(key, value).apply()
    private fun save(key: String, value: Int) = prefs.edit().putInt(key, value).apply()
    private fun saveStr(key: String, value: String) = prefs.edit().putString(key, value).apply()
}

// Pour Tasks.await
private object Tasks {
    fun <T> await(task: com.google.android.gms.tasks.Task<T>): T {
        while (!task.isComplete) Thread.sleep(50)
        if (task.isSuccessful) return task.result!!
        throw task.exception ?: RuntimeException("Task failed")
    }
}
