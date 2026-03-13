package com.houari.yoroi.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.houari.yoroi.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Widget Dashboard YOROI — Poids, Streak, Eau, Rang
 */
class YoroiDashboardWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            updateDashboardWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateDashboardWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences("YoroiWidgetData", Context.MODE_PRIVATE)
            val weight      = prefs.getFloat("weight", 0f)
            val streak      = prefs.getInt("streak", 0)
            val rank        = prefs.getString("rank", "Recrue") ?: "Recrue"
            val waterCups   = prefs.getInt("waterCups", 0)
            val waterGoal   = prefs.getInt("waterGoal", 8)

            val views = RemoteViews(context.packageName, R.layout.widget_dashboard)

            // Date
            val fmt = SimpleDateFormat("EEE d MMM", Locale.FRENCH)
            views.setTextViewText(R.id.widget_date, fmt.format(Date()))

            // Poids
            if (weight > 0f) {
                views.setTextViewText(R.id.widget_weight, String.format("%.1f", weight))
            } else {
                views.setTextViewText(R.id.widget_weight, "--")
            }

            // Streak
            views.setTextViewText(R.id.widget_streak, streak.toString())

            // Eau
            views.setTextViewText(R.id.widget_water, "$waterCups/$waterGoal")

            // Rang
            views.setTextViewText(R.id.widget_rank, rank)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
