package com.houari.yoroi.wear.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
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

    // --- Connexion ---
    var isConnected by mutableStateOf(false)
        private set

    private var timerJob: Job? = null

    /**
     * Traite les donnees recues du telephone
     */
    fun processData(data: Map<String, Any>) {
        // Poids
        (data["w"] as? Double)?.let { currentWeight = it; save("currentWeight", it.toFloat()) }
        (data["currentWeight"] as? Double)?.let { currentWeight = it; save("currentWeight", it.toFloat()) }
        (data["tw"] as? Double)?.let { targetWeight = it; save("targetWeight", it.toFloat()) }
        (data["targetWeight"] as? Double)?.let { targetWeight = it; save("targetWeight", it.toFloat()) }
        (data["sw"] as? Double)?.let { startWeight = it; save("startWeight", it.toFloat()) }

        // Hydratation
        (data["wi"] as? Int)?.let { hydrationCurrent = it; save("hydrationCurrent", it) }
        (data["waterIntake"] as? Int)?.let { hydrationCurrent = it; save("hydrationCurrent", it) }
        (data["wg"] as? Int)?.let { hydrationGoal = it; save("hydrationGoal", it) }
        (data["waterGoal"] as? Int)?.let { hydrationGoal = it; save("hydrationGoal", it) }

        // Sommeil
        (data["sd"] as? Int)?.let { sleepDuration = it; save("sleepDuration", it) }
        (data["sq"] as? Int)?.let { sleepQuality = it; save("sleepQuality", it) }
        (data["sbt"] as? String)?.let { sleepBedTime = it; saveStr("sleepBedTime", it) }
        (data["swt"] as? String)?.let { sleepWakeTime = it; saveStr("sleepWakeTime", it) }
        (data["sgm"] as? Int)?.let { sleepGoalMinutes = it; save("sleepGoalMinutes", it) }
        (data["sdb"] as? Double)?.let { sleepDebt = it; save("sleepDebt", it.toFloat()) }

        // Profil
        (data["un"] as? String)?.let { userName = it; saveStr("userName", it) }
        (data["userName"] as? String)?.let { userName = it; saveStr("userName", it) }
        (data["lv"] as? Int)?.let { level = it; save("level", it) }
        (data["level"] as? Int)?.let { level = it; save("level", it) }
        (data["rk"] as? String)?.let { rank = it; saveStr("rank", it) }
        (data["rank"] as? String)?.let { rank = it; saveStr("rank", it) }
        (data["s"] as? Int)?.let { streak = it; save("streak", it) }
        (data["streak"] as? Int)?.let { streak = it; save("streak", it) }

        // Sante
        (data["heartRate"] as? Int)?.let { heartRate = it; save("heartRate", it) }
        (data["spo2"] as? Int)?.let { spo2 = it; save("spo2", it) }
        (data["activeCalories"] as? Int)?.let { activeCalories = it; save("activeCalories", it) }
        (data["distance"] as? Double)?.let { distance = it; save("distance", it.toFloat()) }
        (data["stepsGoal"] as? Int)?.let { stepsGoal = it; save("stepsGoal", it) }

        isConnected = true
    }

    // --- Objectifs ---

    fun adjustStepsGoal(delta: Int) {
        stepsGoal = (stepsGoal + delta).coerceIn(1000, 30000)
        save("stepsGoal", stepsGoal)
    }

    fun adjustHydrationGoal(delta: Int) {
        hydrationGoal = (hydrationGoal + delta).coerceIn(500, 6000)
        save("hydrationGoal", hydrationGoal)
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
        timerJob?.cancel()
        timerJob = CoroutineScope(Dispatchers.Main).launch {
            while (timerRemainingSeconds > 0 && timerIsRunning) {
                delay(1000)
                timerRemainingSeconds--
            }
            if (timerRemainingSeconds <= 0) {
                timerIsRunning = false
                // Vibrer a la fin
                @Suppress("DEPRECATION")
                (context.getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator)
                    ?.vibrate(longArrayOf(0, 300, 200, 300), -1)
            }
        }
    }

    fun pauseTimer() {
        timerIsRunning = false
        timerJob?.cancel()
    }

    fun resetTimer() {
        timerIsRunning = false
        timerJob?.cancel()
        timerRemainingSeconds = timerTotalSeconds
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
