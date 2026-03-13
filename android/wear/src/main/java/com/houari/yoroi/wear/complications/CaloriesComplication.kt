package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Calories Actives
 * Équivalent Apple Watch : active calories complication
 */
class CaloriesComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.RANGED_VALUE -> buildRanged(420, 600)
            ComplicationType.SHORT_TEXT -> buildShortText(420)
            ComplicationType.LONG_TEXT -> buildLongText(420, 600)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        val cal = repo.localActiveCalories.takeIf { it > 0 } ?: repo.activeCalories
        val goal = 600 // Objectif par défaut (pas encore dans le repo)
        return when (request.complicationType) {
            ComplicationType.RANGED_VALUE -> buildRanged(cal, goal)
            ComplicationType.SHORT_TEXT -> buildShortText(cal)
            ComplicationType.LONG_TEXT -> buildLongText(cal, goal)
            else -> null
        }
    }

    private fun buildRanged(cal: Int, goal: Int) = RangedValueComplicationData.Builder(
        value = cal.toFloat(),
        min = 0f,
        max = goal.toFloat().coerceAtLeast(1f),
        contentDescription = PlainComplicationText.Builder("Calories").build()
    )
        .setText(PlainComplicationText.Builder("$cal").build())
        .setTitle(PlainComplicationText.Builder("kcal").build())
        .build()

    private fun buildShortText(cal: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(if (cal > 0) "$cal" else "--").build(),
        contentDescription = PlainComplicationText.Builder("Calories actives").build()
    )
        .setTitle(PlainComplicationText.Builder("kcal").build())
        .build()

    private fun buildLongText(cal: Int, goal: Int) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (cal > 0) "$cal / $goal kcal" else "-- kcal"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Calories actives").build()
    )
        .setTitle(PlainComplicationText.Builder("Calories").build())
        .build()
}
