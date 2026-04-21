package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication "Séances ce mois"
 * Affiche le nombre de séances du mois courant + objectif mensuel estimé.
 */
class TrainingsMonthComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> buildShortText(12)
            ComplicationType.LONG_TEXT -> buildLongText(12)
            ComplicationType.RANGED_VALUE -> buildRanged(12, 20)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        val value = repo.trainingsThisMonth
        // Objectif estimé : proportionnel à l'objectif annuel (ex: 365 → ~30/mois)
        val monthGoal = (repo.yearlyGoal / 12).coerceAtLeast(1)
        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> buildShortText(value)
            ComplicationType.LONG_TEXT -> buildLongText(value)
            ComplicationType.RANGED_VALUE -> buildRanged(value, monthGoal)
            else -> null
        }
    }

    private fun buildShortText(count: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder("$count").build(),
        contentDescription = PlainComplicationText.Builder("Séances ce mois").build()
    )
        .setTitle(PlainComplicationText.Builder("Mois").build())
        .build()

    private fun buildLongText(count: Int) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (count == 0) "Aucune séance ce mois"
            else "$count séance${if (count > 1) "s" else ""} ce mois"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Séances du mois").build()
    )
        .setTitle(PlainComplicationText.Builder("Entraînement").build())
        .build()

    private fun buildRanged(count: Int, goal: Int) = RangedValueComplicationData.Builder(
        value = count.toFloat().coerceAtMost(goal.toFloat()),
        min = 0f,
        max = goal.toFloat(),
        contentDescription = PlainComplicationText.Builder("Séances ce mois").build()
    )
        .setText(PlainComplicationText.Builder("$count").build())
        .setTitle(PlainComplicationText.Builder("Mois").build())
        .build()
}
