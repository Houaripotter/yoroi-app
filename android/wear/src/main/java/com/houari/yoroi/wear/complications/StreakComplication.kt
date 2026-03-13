package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Série d'entraînement
 * Équivalent Apple Watch : streak complication
 */
class StreakComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> buildShortText(12)
            ComplicationType.LONG_TEXT -> buildLongText(12)
            ComplicationType.RANGED_VALUE -> buildRanged(12, 30)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> buildShortText(repo.streak)
            ComplicationType.LONG_TEXT -> buildLongText(repo.streak)
            ComplicationType.RANGED_VALUE -> buildRanged(repo.streak, 30)
            else -> null
        }
    }

    private fun buildShortText(streak: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder("${streak}j").build(),
        contentDescription = PlainComplicationText.Builder("Serie").build()
    )
        .setTitle(PlainComplicationText.Builder("Serie").build())
        .build()

    private fun buildLongText(streak: Int) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (streak > 0) "Serie de $streak jours" else "Pas de serie"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Serie d'entrainement").build()
    )
        .setTitle(PlainComplicationText.Builder("Entrainement").build())
        .build()

    private fun buildRanged(streak: Int, goal: Int) = RangedValueComplicationData.Builder(
        value = streak.toFloat(),
        min = 0f,
        max = goal.toFloat(),
        contentDescription = PlainComplicationText.Builder("Serie").build()
    )
        .setText(PlainComplicationText.Builder("${streak}j").build())
        .setTitle(PlainComplicationText.Builder("Serie").build())
        .build()
}
