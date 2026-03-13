package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Sommeil
 * Équivalent Apple Watch : sleep complication
 */
class SleepComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.RANGED_VALUE -> buildRanged(420, 480)
            ComplicationType.SHORT_TEXT -> buildShortText(420, 3)
            ComplicationType.LONG_TEXT -> buildLongText(420, 3, "23:00", "06:00")
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        return when (request.complicationType) {
            ComplicationType.RANGED_VALUE -> buildRanged(repo.sleepDuration, repo.sleepGoalMinutes)
            ComplicationType.SHORT_TEXT -> buildShortText(repo.sleepDuration, repo.sleepQuality)
            ComplicationType.LONG_TEXT -> buildLongText(
                repo.sleepDuration, repo.sleepQuality,
                repo.sleepBedTime, repo.sleepWakeTime
            )
            else -> null
        }
    }

    private fun formatDuration(minutes: Int): String {
        if (minutes <= 0) return "--"
        val h = minutes / 60
        val m = minutes % 60
        return if (m == 0) "${h}h" else "${h}h${m}m"
    }

    private fun buildRanged(duration: Int, goal: Int) = RangedValueComplicationData.Builder(
        value = duration.toFloat(),
        min = 0f,
        max = goal.toFloat().coerceAtLeast(1f),
        contentDescription = PlainComplicationText.Builder("Sommeil").build()
    )
        .setText(PlainComplicationText.Builder(formatDuration(duration)).build())
        .setTitle(PlainComplicationText.Builder("Sommeil").build())
        .build()

    private fun buildShortText(duration: Int, quality: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(formatDuration(duration)).build(),
        contentDescription = PlainComplicationText.Builder("Sommeil").build()
    )
        .setTitle(PlainComplicationText.Builder("Nuit").build())
        .build()

    private fun buildLongText(
        duration: Int, quality: Int,
        bedTime: String, wakeTime: String
    ) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            buildString {
                append(formatDuration(duration))
                if (bedTime.isNotBlank() && bedTime != "--:--") append(" · $bedTime→$wakeTime")
            }
        ).build(),
        contentDescription = PlainComplicationText.Builder("Sommeil").build()
    )
        .setTitle(PlainComplicationText.Builder("Sommeil").build())
        .build()
}
