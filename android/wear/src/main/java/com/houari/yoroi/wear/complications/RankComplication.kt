package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication Rang Yoroi
 * Équivalent Apple Watch : rank complication
 */
class RankComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> buildShortText("Lv12", "Guerrier")
            ComplicationType.LONG_TEXT -> buildLongText(12, "Guerrier Elite")
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        val level = repo.level
        val rank = repo.rank.ifBlank { "Yoroi" }.take(10)
        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> buildShortText("Lv$level", rank)
            ComplicationType.LONG_TEXT -> buildLongText(level, rank)
            else -> null
        }
    }

    private fun buildShortText(levelStr: String, rank: String) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(levelStr).build(),
        contentDescription = PlainComplicationText.Builder("Rang Yoroi").build()
    )
        .setTitle(PlainComplicationText.Builder(rank.take(7)).build())
        .build()

    private fun buildLongText(level: Int, rank: String) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder("$rank · Niv.$level").build(),
        contentDescription = PlainComplicationText.Builder("Rang Yoroi").build()
    )
        .setTitle(PlainComplicationText.Builder("Rang").build())
        .build()
}
