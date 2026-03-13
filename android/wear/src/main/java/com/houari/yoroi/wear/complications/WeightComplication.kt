package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Poids
 * Équivalent Apple Watch : weight complication
 */
class WeightComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.RANGED_VALUE -> buildRanged(83.2, 100.0, 80.0)
            ComplicationType.SHORT_TEXT -> buildShortText(83.2)
            ComplicationType.LONG_TEXT -> buildLongText(83.2, 80.0)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        return when (request.complicationType) {
            ComplicationType.RANGED_VALUE -> buildRanged(repo.currentWeight, repo.startWeight, repo.targetWeight)
            ComplicationType.SHORT_TEXT -> buildShortText(repo.currentWeight)
            ComplicationType.LONG_TEXT -> buildLongText(repo.currentWeight, repo.targetWeight)
            else -> null
        }
    }

    private fun buildRanged(current: Double, start: Double, target: Double): RangedValueComplicationData {
        val max = start.takeIf { it > 0 } ?: (current + 10)
        val min = target.takeIf { it > 0 } ?: (current - 10)
        return RangedValueComplicationData.Builder(
            value = current.toFloat(),
            min = min.toFloat(),
            max = max.toFloat().coerceAtLeast(min.toFloat() + 1f),
            contentDescription = PlainComplicationText.Builder("Poids").build()
        )
            .setText(PlainComplicationText.Builder("%.1fkg".format(current)).build())
            .setTitle(PlainComplicationText.Builder("Poids").build())
            .build()
    }

    private fun buildShortText(current: Double) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (current > 0) "%.1f".format(current) else "--"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Poids").build()
    )
        .setTitle(PlainComplicationText.Builder("kg").build())
        .build()

    private fun buildLongText(current: Double, target: Double) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (current > 0 && target > 0)
                "%.1f → %.1f kg".format(current, target)
            else if (current > 0) "%.1f kg".format(current)
            else "--"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Poids").build()
    )
        .setTitle(PlainComplicationText.Builder("Poids").build())
        .build()
}
