package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Distance
 * Équivalent Apple Watch : distance complication
 */
class DistanceComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> buildShortText(3.4)
            ComplicationType.RANGED_VALUE -> buildRanged(3.4, 5.0)
            ComplicationType.LONG_TEXT -> buildLongText(3.4, 5.0)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        val dist = repo.localDistance.takeIf { it > 0 } ?: repo.distance
        val goal = 5.0 // km objectif par défaut
        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> buildShortText(dist)
            ComplicationType.RANGED_VALUE -> buildRanged(dist, goal)
            ComplicationType.LONG_TEXT -> buildLongText(dist, goal)
            else -> null
        }
    }

    private fun buildShortText(dist: Double) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (dist > 0) "%.1f".format(dist) else "--"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Distance").build()
    )
        .setTitle(PlainComplicationText.Builder("km").build())
        .build()

    private fun buildRanged(dist: Double, goal: Double) = RangedValueComplicationData.Builder(
        value = dist.toFloat(),
        min = 0f,
        max = goal.toFloat().coerceAtLeast(1f),
        contentDescription = PlainComplicationText.Builder("Distance").build()
    )
        .setText(PlainComplicationText.Builder("%.1fkm".format(dist)).build())
        .setTitle(PlainComplicationText.Builder("Dist").build())
        .build()

    private fun buildLongText(dist: Double, goal: Double) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (dist > 0) "%.1f / %.1f km".format(dist, goal) else "-- km"
        ).build(),
        contentDescription = PlainComplicationText.Builder("Distance").build()
    )
        .setTitle(PlainComplicationText.Builder("Distance").build())
        .build()
}
