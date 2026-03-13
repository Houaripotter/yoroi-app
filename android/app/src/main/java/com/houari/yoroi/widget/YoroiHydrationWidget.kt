package com.houari.yoroi.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.houari.yoroi.R

/**
 * Widget Hydratation YOROI — Verres bus / Objectif
 */
class YoroiHydrationWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            updateHydrationWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateHydrationWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs     = context.getSharedPreferences("YoroiWidgetData", Context.MODE_PRIVATE)
            val waterCups = prefs.getInt("waterCups", 0)
            val waterGoal = prefs.getInt("waterGoal", 8).coerceAtLeast(1)

            val views = RemoteViews(context.packageName, R.layout.widget_hydration)

            views.setTextViewText(R.id.widget_water_cups, waterCups.toString())
            views.setTextViewText(R.id.widget_water_goal_label, "/$waterGoal")

            val progress = ((waterCups.toFloat() / waterGoal) * 100).toInt().coerceIn(0, 100)
            views.setProgressBar(R.id.widget_water_progress, 100, progress, false)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
