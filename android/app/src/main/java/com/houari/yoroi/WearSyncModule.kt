package com.houari.yoroi

// ============================================
// WEAR SYNC MODULE — React Native → Wear OS
// ============================================
// Module natif Android qui expose sendToWatch() au JS.
// Utilise le Wearable Message API pour envoyer les
// données de l'app téléphone vers la montre Wear OS.
// Chemin des messages : /yoroi/data (écouté par PhoneDataListenerService.kt)
// ============================================

import com.facebook.react.bridge.*
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

class WearSyncModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WearSyncModule"

    /**
     * Envoie un objet de données à la montre Wear OS connectée.
     * Retourne le nombre de noeuds qui ont reçu le message (0 = pas de montre connectée).
     */
    @ReactMethod
    fun sendToWatch(data: ReadableMap, promise: Promise) {
        Thread {
            try {
                val json = convertMapToJson(data)
                val payload = json.toString().toByteArray(Charsets.UTF_8)

                val nodes = Tasks.await(Wearable.getNodeClient(reactContext).connectedNodes)

                if (nodes.isEmpty()) {
                    promise.resolve(0)
                    return@Thread
                }

                val messageClient = Wearable.getMessageClient(reactContext)
                for (node in nodes) {
                    Tasks.await(messageClient.sendMessage(node.id, "/yoroi/data", payload))
                }

                promise.resolve(nodes.size)
            } catch (e: Exception) {
                promise.reject("WEAR_SYNC_ERROR", e.message ?: "Erreur envoi vers la montre", e)
            }
        }.start()
    }

    /**
     * Vérifie si une montre Wear OS est connectée.
     */
    @ReactMethod
    fun isWearConnected(promise: Promise) {
        Thread {
            try {
                val nodes = Tasks.await(Wearable.getNodeClient(reactContext).connectedNodes)
                promise.resolve(nodes.isNotEmpty())
            } catch (e: Exception) {
                promise.reject("WEAR_ERROR", e.message ?: "Erreur vérification connexion", e)
            }
        }.start()
    }

    /**
     * Récupère les IDs des montres connectées.
     */
    @ReactMethod
    fun getConnectedNodes(promise: Promise) {
        Thread {
            try {
                val nodes = Tasks.await(Wearable.getNodeClient(reactContext).connectedNodes)
                val result = Arguments.createArray()
                for (node in nodes) {
                    val map = Arguments.createMap()
                    map.putString("id", node.id)
                    map.putString("displayName", node.displayName)
                    map.putBoolean("isNearby", node.isNearby)
                    result.pushMap(map)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("WEAR_ERROR", e.message ?: "Erreur lecture noeuds", e)
            }
        }.start()
    }

    // Convertit un ReadableMap JS en JSONObject
    private fun convertMapToJson(map: ReadableMap): JSONObject {
        val json = JSONObject()
        val iterator = map.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (map.getType(key)) {
                ReadableType.Boolean -> json.put(key, map.getBoolean(key))
                ReadableType.Number  -> json.put(key, map.getDouble(key))
                ReadableType.String  -> json.put(key, map.getString(key))
                ReadableType.Null    -> json.put(key, JSONObject.NULL)
                else -> { /* objets/tableaux imbriqués ignorés */ }
            }
        }
        return json
    }
}
