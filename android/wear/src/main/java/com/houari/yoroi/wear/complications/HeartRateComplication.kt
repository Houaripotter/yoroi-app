package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Fréquence Cardiaque
 * Équivalent Apple Watch : heart rate complication
 */
class HeartRateComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> buildShortText(72)
            ComplicationType.RANGED_VALUE -> buildRanged(72)
            ComplicationType.LONG_TEXT -> buildLongText(72)
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        val hr = repo.localHeartRate.takeIf { it > 0 } ?: repo.heartRate
        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> buildShortText(hr)
            ComplicationType.RANGED_VALUE -> buildRanged(hr)
            ComplicationType.LONG_TEXT -> buildLongText(hr)
            else -> null
        }
    }

    private fun buildShortText(hr: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(if (hr > 0) "$hr" else "--").build(),
        contentDescription = PlainComplicationText.Builder("Frequence cardiaque").build()
    )
        .setTitle(PlainComplicationText.Builder("bpm").build())
        .build()

    private fun buildRanged(hr: Int) = RangedValueComplicationData.Builder(
        value = hr.toFloat().coerceIn(0f, 220f),
        min = 40f,
        max = 220f,
        contentDescription = PlainComplicationText.Builder("FC").build()
    )
        .setText(PlainComplicationText.Builder(if (hr > 0) "$hr" else "--").build())
        .setTitle(PlainComplicationText.Builder("bpm").build())
        .build()

    private fun buildLongText(hr: Int): LongTextComplicationData {
        val zone = when {
            hr <= 0 -> "--"
            hr < 100 -> "Repos"
            hr < 140 -> "Modere"
            hr < 170 -> "Intense"
            else -> "Max"
        }
        return LongTextComplicationData.Builder(
            text = PlainComplicationText.Builder(
                if (hr > 0) "$hr bpm · $zone" else "-- bpm"
            ).build(),
            contentDescription = PlainComplicationText.Builder("Frequence cardiaque").build()
        )
            .setTitle(PlainComplicationText.Builder("Cardio").build())
            .build()
    }
}
