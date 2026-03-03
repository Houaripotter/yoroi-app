package com.houari.yoroi.wear.data

import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/**
 * Service qui ecoute les messages et donnees du telephone.
 * Equivalent du WCSessionDelegate de l'Apple Watch.
 */
class PhoneDataListenerService : WearableListenerService() {

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.dataItem.uri.path?.startsWith("/yoroi") == true) {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                val data = mutableMapOf<String, Any>()

                for (key in dataMap.keySet()) {
                    when {
                        dataMap.containsKey(key) -> {
                            try {
                                data[key] = dataMap.getInt(key)
                            } catch (_: Exception) {
                                try {
                                    data[key] = dataMap.getFloat(key).toDouble()
                                } catch (_: Exception) {
                                    try {
                                        data[key] = dataMap.getString(key) ?: ""
                                    } catch (_: Exception) { }
                                }
                            }
                        }
                    }
                }

                // Sauvegarder dans SharedPreferences pour que le Repository le lise
                val prefs = getSharedPreferences("yoroi_watch_data", MODE_PRIVATE)
                val editor = prefs.edit()

                for ((key, value) in data) {
                    when (value) {
                        is Int -> editor.putInt(key, value)
                        is Double -> editor.putFloat(key, value.toFloat())
                        is String -> editor.putString(key, value)
                    }
                }
                editor.apply()
            }
        }
    }

    override fun onMessageReceived(event: MessageEvent) {
        if (event.path.startsWith("/yoroi")) {
            try {
                val json = JSONObject(String(event.data))
                val prefs = getSharedPreferences("yoroi_watch_data", MODE_PRIVATE)
                val editor = prefs.edit()

                val keys = json.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    when (val value = json.get(key)) {
                        is Int -> editor.putInt(key, value)
                        is Double -> editor.putFloat(key, value.toFloat())
                        is String -> editor.putString(key, value)
                        is Number -> editor.putFloat(key, value.toFloat())
                    }
                }
                editor.apply()
            } catch (_: Exception) { }
        }
    }
}
