package com.houari.yoroi.wear.complications

import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Complication "Dernière séance"
 * Affiche le sport + note de la dernière séance enregistrée.
 */
class LastTrainingComplication : ComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        return when (type) {
            ComplicationType.SHORT_TEXT -> buildShortText("JJB", 8)
            ComplicationType.LONG_TEXT -> buildLongText("JJB", 8, "flow")
            else -> null
        }
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        val repo = YoroiDataRepository(this)
        val sport = repo.lastTrainingSport.take(12).ifBlank { "—" }
        val rating = repo.lastTrainingRating
        val mood = repo.lastTrainingMood
        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> buildShortText(sport, rating)
            ComplicationType.LONG_TEXT -> buildLongText(sport, rating, mood)
            else -> null
        }
    }

    private fun buildShortText(sport: String, rating: Int) = ShortTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            if (rating > 0) "$sport ${rating}/10" else sport
        ).build(),
        contentDescription = PlainComplicationText.Builder("Dernière séance").build()
    )
        .setTitle(PlainComplicationText.Builder("Dernière").build())
        .build()

    private fun buildLongText(sport: String, rating: Int, mood: String) = LongTextComplicationData.Builder(
        text = PlainComplicationText.Builder(
            buildString {
                append(sport.ifBlank { "Aucune séance" })
                if (rating > 0) append(" · ${rating}/10")
                if (mood.isNotBlank()) append(" · ${moodEmoji(mood)}")
            }
        ).build(),
        contentDescription = PlainComplicationText.Builder("Dernière séance").build()
    )
        .setTitle(PlainComplicationText.Builder("Dernière séance").build())
        .build()

    /** Convertit une chaîne mood (fire/flow/focus/etc.) en emoji pour la Watch. */
    private fun moodEmoji(mood: String): String = when (mood.lowercase()) {
        "fire" -> "🔥"
        "strong" -> "💪"
        "focus" -> "🎯"
        "flow" -> "🌊"
        "gassed" -> "😮‍💨"
        "tired" -> "😓"
        "confused" -> "🤯"
        "frustrated" -> "😤"
        else -> ""
    }
}
