package com.houari.yoroi.wear.complications

import android.content.Intent
import androidx.wear.watchface.complications.data.*
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import com.houari.yoroi.wear.MainActivity

/**
 * Complication Timer avec countdown LIVE qui défile seconde par seconde.
 * Équivalent Apple Watch : CLKRelativeDateTextProvider style .timer
 *
 * Utilise TimeDifferenceComplicationText qui laisse Wear OS rendre le texte
 * de manière dynamique sans que l'app tourne — idéal pour un countdown fluide.
 *
 * Familles supportées :
 *   - SHORT_TEXT : "0:45" countdown
 *   - LONG_TEXT : "Timer · 0:45"
 *   - RANGED_VALUE : progression 0 → total avec countdown au centre
 */
class TimerComplication : ComplicationDataSourceService() {

  override fun getPreviewData(type: ComplicationType): ComplicationData? {
    return when (type) {
      ComplicationType.SHORT_TEXT -> buildIdleShort("1:30")
      ComplicationType.LONG_TEXT -> buildIdleLong("Timer · 1:30")
      ComplicationType.RANGED_VALUE -> buildIdleRanged(90, 90, "1:30")
      else -> null
    }
  }

  override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
    val prefs = getSharedPreferences("YoroiPrefs", MODE_PRIVATE)
    val endMillis = prefs.getLong("timerEndDateMillis", 0L)
    val totalSeconds = prefs.getInt("timerTotalSeconds", 90)
    val now = System.currentTimeMillis()
    val running = endMillis > now

    val tap = tapAction()

    return when (request.complicationType) {
      ComplicationType.SHORT_TEXT -> {
        if (running) {
          val countdownText = TimeDifferenceComplicationText.Builder(
            TimeDifferenceStyle.SHORT_SINGLE_UNIT,
            CountDownTimeReference(java.time.Instant.ofEpochMilli(endMillis))
          )
            .setMinimumTimeUnit(TimeUnit.SECONDS)
            .build()
          ShortTextComplicationData.Builder(
            text = countdownText,
            contentDescription = PlainComplicationText.Builder("Timer en cours").build()
          )
            .setTitle(PlainComplicationText.Builder("Timer").build())
            .setTapAction(tap)
            .build()
        } else {
          buildIdleShort(formatSeconds(totalSeconds)).also { }
            .let {
              ShortTextComplicationData.Builder(
                text = PlainComplicationText.Builder(formatSeconds(totalSeconds)).build(),
                contentDescription = PlainComplicationText.Builder("Timer").build()
              )
                .setTitle(PlainComplicationText.Builder("Timer").build())
                .setTapAction(tap)
                .build()
            }
        }
      }

      ComplicationType.LONG_TEXT -> {
        if (running) {
          val countdownText = TimeDifferenceComplicationText.Builder(
            TimeDifferenceStyle.SHORT_SINGLE_UNIT,
            CountDownTimeReference(java.time.Instant.ofEpochMilli(endMillis))
          )
            .setMinimumTimeUnit(TimeUnit.SECONDS)
            .build()
          LongTextComplicationData.Builder(
            text = countdownText,
            contentDescription = PlainComplicationText.Builder("Timer en cours").build()
          )
            .setTitle(PlainComplicationText.Builder("⏱ Timer YOROI").build())
            .setTapAction(tap)
            .build()
        } else {
          LongTextComplicationData.Builder(
            text = PlainComplicationText.Builder("Timer · ${formatSeconds(totalSeconds)}").build(),
            contentDescription = PlainComplicationText.Builder("Timer pret").build()
          )
            .setTitle(PlainComplicationText.Builder("⏱ Timer YOROI").build())
            .setTapAction(tap)
            .build()
        }
      }

      ComplicationType.RANGED_VALUE -> {
        if (running) {
          val remainingSecs = ((endMillis - now) / 1000f).coerceAtLeast(0f)
          val countdownText = TimeDifferenceComplicationText.Builder(
            TimeDifferenceStyle.SHORT_SINGLE_UNIT,
            CountDownTimeReference(java.time.Instant.ofEpochMilli(endMillis))
          )
            .setMinimumTimeUnit(TimeUnit.SECONDS)
            .build()
          RangedValueComplicationData.Builder(
            value = remainingSecs,
            min = 0f,
            max = totalSeconds.toFloat().coerceAtLeast(1f),
            contentDescription = PlainComplicationText.Builder("Timer en cours").build()
          )
            .setText(countdownText)
            .setTitle(PlainComplicationText.Builder("Timer").build())
            .setTapAction(tap)
            .build()
        } else {
          buildIdleRanged(totalSeconds, totalSeconds, formatSeconds(totalSeconds))
        }
      }

      else -> null
    }
  }

  private fun buildIdleShort(label: String) = ShortTextComplicationData.Builder(
    text = PlainComplicationText.Builder(label).build(),
    contentDescription = PlainComplicationText.Builder("Timer").build()
  )
    .setTitle(PlainComplicationText.Builder("Timer").build())
    .setTapAction(tapAction())
    .build()

  private fun buildIdleLong(label: String) = LongTextComplicationData.Builder(
    text = PlainComplicationText.Builder(label).build(),
    contentDescription = PlainComplicationText.Builder("Timer").build()
  )
    .setTitle(PlainComplicationText.Builder("⏱ Timer YOROI").build())
    .setTapAction(tapAction())
    .build()

  private fun buildIdleRanged(value: Int, max: Int, label: String) = RangedValueComplicationData.Builder(
    value = value.toFloat(),
    min = 0f,
    max = max.toFloat().coerceAtLeast(1f),
    contentDescription = PlainComplicationText.Builder("Timer").build()
  )
    .setText(PlainComplicationText.Builder(label).build())
    .setTitle(PlainComplicationText.Builder("Timer").build())
    .setTapAction(tapAction())
    .build()

  private fun tapAction(): android.app.PendingIntent? {
    val intent = Intent(this, MainActivity::class.java).apply {
      putExtra("openTab", "timer")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    return android.app.PendingIntent.getActivity(
      this,
      0,
      intent,
      android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
    )
  }

  private fun formatSeconds(totalSeconds: Int): String {
    val mins = totalSeconds / 60
    val secs = totalSeconds % 60
    return if (mins > 0) "%d:%02d".format(mins, secs) else "0:%02d".format(secs)
  }
}
