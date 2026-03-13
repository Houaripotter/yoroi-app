package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Pas du Jour
 * Équivalent Apple Watch : steps complication
 */
class StepsComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.RANGED_VALUE -> buildRanged(6420, 10000)
            ComplicationType.SHORT_TEXT -> buildShortText(6420, 10000)
            ComplicationType.LONG_TEXT -> buildLongText(6420, 10000)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        val steps = repo.localSteps.takeIf { it > 0 } ?: 0
        val goal = repo.stepsGoal
        return when (request.complicationType) {
            ComplicationType.RANGED_VALUE -> buildRanged(steps, goal)
            ComplicationType.SHORT_TEXT -> buildShortText(steps, goal)
            ComplicationType.LONG_TEXT -> buildLongText(steps, goal)
            else -> null
        }
    }

    private fun formatSteps(steps: Int) =
        if (steps >= 1000) "%.1fk".format(steps / 1000f) else steps.toString()

    private fun buildRanged(steps: Int, goal: Int) = RangedValueComplicationData.Builder(
        value = steps.toFloat(),
        min = 0f,
        max = goal.toFloat().coerceAtLeast(1f),
        contentDescription = PlainComplicationText.Builder("Pas").build()
    )
        .setText(PlainComplicationText.Builder(formatSteps(steps)).build())
        .setTitle(PlainComplicationText.Builder("Pas").build())
        .build()

    private fun buildShortText(steps: Int, goal: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(formatSteps(steps)).build(),
        contentDescription = PlainComplicationText.Builder("Pas du jour").build()
    )
        .setTitle(PlainComplicationText.Builder("Pas").build())
        .build()

    private fun buildLongText(steps: Int, goal: Int) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            "${formatSteps(steps)} / ${formatSteps(goal)} pas"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Pas du jour").build()
    )
        .setTitle(PlainComplicationText.Builder("Pas").build())
        .build()
}
