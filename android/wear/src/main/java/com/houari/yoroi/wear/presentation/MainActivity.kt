package com.houari.yoroi.wear.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.houari.yoroi.wear.data.YoroiDataRepository

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repository = YoroiDataRepository(applicationContext)
        repository.requestSync()
        repository.startHealthListening()

        setContent {
            YoroiWatchApp(repository = repository)
        }
    }
}
