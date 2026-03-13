package com.houari.yoroi.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.houari.yoroi.R

/**
 * Widget Streak YOROI — Série d'entraînements consécutifs + Rang
 */
class YoroiStreakWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            updateStreakWidget(context, appWidgetManager, id)
        }
    }

    companion object {
        fun updateStreakWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs  = context.getSharedPreferences("YoroiWidgetData", Context.MODE_PRIVATE)
            val streak = prefs.getInt("streak", 0)
            val rank   = prefs.getString("rank", "Recrue") ?: "Recrue"

            val views = RemoteViews(context.packageName, R.layout.widget_streak)
            views.setTextViewText(R.id.widget_streak_count, streak.toString())
            views.setTextViewText(R.id.widget_streak_rank, rank)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
