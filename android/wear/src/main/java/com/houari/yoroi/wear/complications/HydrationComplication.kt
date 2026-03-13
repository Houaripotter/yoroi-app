package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Hydratation
 * Affiche : progression eau (ex: "1.2 / 2.5L" ou jauge circulaire)
 * Équivalent Apple Watch : hydration complication
 */
class HydrationComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.RANGED_VALUE -> buildRanged(1200, 2500)
            ComplicationType.SHORT_TEXT -> buildShortText(1200, 2500)
            ComplicationType.LONG_TEXT -> buildLongText(1200, 2500)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        return when (request.complicationType) {
            ComplicationType.RANGED_VALUE -> buildRanged(repo.hydrationCurrent, repo.hydrationGoal)
            ComplicationType.SHORT_TEXT -> buildShortText(repo.hydrationCurrent, repo.hydrationGoal)
            ComplicationType.LONG_TEXT -> buildLongText(repo.hydrationCurrent, repo.hydrationGoal)
            else -> null
        }
    }

    private fun buildRanged(current: Int, goal: Int) = RangedValueComplicationData.Builder(
        value = current.toFloat(),
        min = 0f,
        max = goal.toFloat().coerceAtLeast(1f),
        contentDescription = PlainComplicationText.Builder("Hydratation").build()
    )
        .setText(PlainComplicationText.Builder("%.1fL".format(current / 1000f)).build())
        .setTitle(PlainComplicationText.Builder("Eau").build())
        .build()

    private fun buildShortText(current: Int, goal: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder("%.1fL".format(current / 1000f)).build(),
        contentDescription = PlainComplicationText.Builder("Hydratation").build()
    )
        .setTitle(PlainComplicationText.Builder("Eau").build())
        .build()

    private fun buildLongText(current: Int, goal: Int) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            "%.1f / %.1f L".format(current / 1000f, goal / 1000f)
        ).build(),
        contentDescription = PlainComplicationText.Builder("Hydratation").build()
    )
        .setTitle(PlainComplicationText.Builder("Hydratation").build())
        .build()
}
