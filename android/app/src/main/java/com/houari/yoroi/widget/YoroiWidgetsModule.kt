package com.houari.yoroi.widget

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType

/**
 * Module natif « YoroiWidgets » (meme nom et memes methodes que sur iOS, appele par lib/v2/widgets/) :
 *  setSnapshot(json)        : l'instantane v1 de la montre, puis rafraichit les widgets
 *  setSceneImage(uri)       : copie reduite de la scene d'Accueil (Tableau du jour, fond du style A ; uri vide : la retire)
 *  setPersonnageImage(uri)  : ton personnage, la meme image que l'Accueil sans rang ni XP (style C ; uri vide : le retire)
 *  setStyle(style)          : style des widgets, "A" Nuit de lanternes (par defaut), "B" Rouleau et encre, "C" Armure laquee
 *  getPendingActions()      : tableau JSON des actions faites depuis un widget {v:1,id,type:"eau",at,deltaMl}
 *  clearPendingActions(ids) : retire de la file les actions appliquees par l'app
 *  reload()                 : redessine tous les widgets
 * Chaque methode rend aussi une promesse (facultative cote JS).
 */
class YoroiWidgetsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "YoroiWidgets"

    @ReactMethod
    fun setSnapshot(json: String?, promise: Promise) {
        try {
            if (json.isNullOrBlank() || LectureInstantane.lire(json) == null) {
                promise.reject("YW_INSTANTANE", "Instantane illisible ou hors contrat v1")
                return
            }
            Magasin.ecrireInstantane(reactContext, json)
            WidgetsYoroi.toutMettreAJour(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("YW_INSTANTANE", e.message, e)
        }
    }

    @ReactMethod
    fun setSceneImage(uri: String?, promise: Promise) {
        Thread {
            try {
                Scene.copier(reactContext, uri)
                WidgetsYoroi.toutMettreAJour(reactContext)
                promise.resolve(true)
            } catch (e: Throwable) {
                promise.reject("YW_SCENE", e.message ?: "Scene non copiee", e)
            }
        }.start()
    }

    @ReactMethod
    fun setPersonnageImage(uri: String?, promise: Promise) {
        Thread {
            try {
                Personnage.copier(reactContext, uri)
                WidgetsYoroi.toutMettreAJour(reactContext)
                promise.resolve(true)
            } catch (e: Throwable) {
                promise.reject("YW_PERSONNAGE", e.message ?: "Personnage non copie", e)
            }
        }.start()
    }

    @ReactMethod
    fun setStyle(style: String?, promise: Promise) {
        try {
            Magasin.ecrireStyle(reactContext, style ?: "A")
            WidgetsYoroi.toutMettreAJour(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("YW_STYLE", e.message, e)
        }
    }

    @ReactMethod
    fun getPendingActions(promise: Promise) {
        try {
            promise.resolve(Magasin.actions(reactContext).toString())
        } catch (e: Exception) {
            promise.reject("YW_FILE", e.message, e)
        }
    }

    @ReactMethod
    fun clearPendingActions(ids: ReadableArray?, promise: Promise) {
        try {
            val set = HashSet<String>()
            if (ids != null) {
                for (i in 0 until ids.size()) {
                    if (ids.getType(i) == ReadableType.String) ids.getString(i)?.let { set.add(it) }
                }
            }
            Magasin.retirerActions(reactContext, set)
            WidgetsYoroi.toutMettreAJour(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("YW_FILE", e.message, e)
        }
    }

    @ReactMethod
    fun reload(promise: Promise) {
        try {
            WidgetsYoroi.toutMettreAJour(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("YW_RELOAD", e.message, e)
        }
    }
}
