package com.houari.yoroi.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.*

/**
 * Module React Native — Écrit les données dans SharedPreferences
 * et force la mise à jour de tous les widgets YOROI.
 */
class WidgetDataModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetDataModule"

    @ReactMethod
    fun updateWidgetData(data: ReadableMap, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("YoroiWidgetData", Context.MODE_PRIVATE)
            val editor = prefs.edit()

            if (data.hasKey("weight"))          editor.putFloat("weight",     data.getDouble("weight").toFloat())
            if (data.hasKey("streak"))          editor.putInt("streak",       data.getInt("streak"))
            if (data.hasKey("rank"))            editor.putString("rank",      data.getString("rank"))
            if (data.hasKey("waterCups"))       editor.putInt("waterCups",    data.getInt("waterCups"))
            if (data.hasKey("waterGoal"))       editor.putInt("waterGoal",    data.getInt("waterGoal"))
            if (data.hasKey("calories"))        editor.putInt("calories",     data.getInt("calories"))
            if (data.hasKey("steps"))           editor.putInt("steps",        data.getInt("steps"))
            if (data.hasKey("nextSession"))     editor.putString("nextSession",     data.getString("nextSession"))
            if (data.hasKey("nextSessionTime")) editor.putString("nextSessionTime", data.getString("nextSessionTime"))

            editor.apply()

            // Forcer la mise à jour de tous les widgets
            val manager = AppWidgetManager.getInstance(reactContext)

            val dashIds = manager.getAppWidgetIds(
                ComponentName(reactContext, YoroiDashboardWidget::class.java))
            for (id in dashIds) {
                YoroiDashboardWidget.updateDashboardWidget(reactContext, manager, id)
            }

            val hydroIds = manager.getAppWidgetIds(
                ComponentName(reactContext, YoroiHydrationWidget::class.java))
            for (id in hydroIds) {
                YoroiHydrationWidget.updateHydrationWidget(reactContext, manager, id)
            }

            val streakIds = manager.getAppWidgetIds(
                ComponentName(reactContext, YoroiStreakWidget::class.java))
            for (id in streakIds) {
                YoroiStreakWidget.updateStreakWidget(reactContext, manager, id)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_UPDATE_ERROR", e.message, e)
        }
    }
}
