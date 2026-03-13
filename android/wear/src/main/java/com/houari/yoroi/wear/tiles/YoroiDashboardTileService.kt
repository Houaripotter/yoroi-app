package com.houari.yoroi.wear.tiles

import android.content.Context
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders.*
import androidx.wear.protolayout.ModifiersBuilders.*
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.houari.yoroi.wear.data.YoroiDataRepository

/**
 * Tile Dashboard Yoroi
 * Affiche : poids actuel, série d'entraînement, rang
 * Accessible par swipe gauche depuis le cadran Wear OS
 */
class YoroiDashboardTileService : TileService() {

    private lateinit var repo: YoroiDataRepository

    override fun onCreate() {
        super.onCreate()
        repo = YoroiDataRepository(this)
    }

    override fun onTileRequest(
        requestParams: RequestBuilders.TileRequest
    ): ListenableFuture<TileBuilders.Tile> {
        val deviceParams = requestParams.deviceConfiguration
        return Futures.immediateFuture(buildTile(this, repo, deviceParams))
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest
    ): ListenableFuture<ResourceBuilders.Resources> {
        return Futures.immediateFuture(
            ResourceBuilders.Resources.Builder()
                .setVersion("1")
                .build()
        )
    }

    companion object {
        fun buildTile(
            context: Context,
            repo: YoroiDataRepository,
            deviceParams: DeviceParameters?
        ): TileBuilders.Tile {
            val accentColor = parseColor(repo.themeAccentHex, 0xFFD4AF37.toInt())
            val bgColor = 0xFF0A0A0A.toInt()
            val textColor = 0xFFFFFFFF.toInt()
            val secondaryColor = 0xFFAAAAAA.toInt()

            // Poids
            val weightStr = if (repo.currentWeight > 0)
                "%.1f kg".format(repo.currentWeight) else "--"

            // Streak
            val streakStr = if (repo.streak > 0) "${repo.streak}j" else "0j"

            // Rang
            val rankStr = repo.rank.ifBlank { "Guerrier" }.take(12)

            val layout = Box.Builder()
                .setWidth(expand())
                .setHeight(expand())
                .setModifiers(
                    Modifiers.Builder()
                        .setBackground(
                            Background.Builder()
                                .setColor(argb(bgColor))
                                .build()
                        )
                        .setClickable(
                            Clickable.Builder()
                                .setOnClick(
                                    ActionBuilders.LaunchAction.Builder()
                                        .setAndroidActivity(
                                            ActionBuilders.AndroidActivity.Builder()
                                                .setPackageName(context.packageName)
                                                .setClassName("com.houari.yoroi.wear.presentation.MainActivity")
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .addContent(
                    Column.Builder()
                        .setWidth(expand())
                        .setHeight(expand())
                        .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
                        .addContent(
                            // Titre YOROI
                            Text.Builder()
                                .setText("YOROI")
                                .setFontStyle(
                                    FontStyle.Builder()
                                        .setSize(sp(11f))
                                        .setWeight(FONT_WEIGHT_BOLD)
                                        .setColor(argb(accentColor))
                                        .build()
                                )
                                .build()
                        )
                        .addContent(Spacer.Builder().setHeight(dp(4f)).build())
                        .addContent(
                            // Poids
                            Row.Builder()
                                .setVerticalAlignment(VERTICAL_ALIGN_CENTER)
                                .addContent(
                                    Text.Builder()
                                        .setText(weightStr)
                                        .setFontStyle(
                                            FontStyle.Builder()
                                                .setSize(sp(26f))
                                                .setWeight(FONT_WEIGHT_BOLD)
                                                .setColor(argb(textColor))
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .addContent(Spacer.Builder().setHeight(dp(6f)).build())
                        .addContent(
                            // Séparateur
                            Box.Builder()
                                .setWidth(dp(60f))
                                .setHeight(dp(1f))
                                .setModifiers(
                                    Modifiers.Builder()
                                        .setBackground(
                                            Background.Builder()
                                                .setColor(argb(accentColor))
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .addContent(Spacer.Builder().setHeight(dp(6f)).build())
                        .addContent(
                            // Streak + Rang
                            Row.Builder()
                                .setVerticalAlignment(VERTICAL_ALIGN_CENTER)
                                .addContent(
                                    Column.Builder()
                                        .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
                                        .addContent(
                                            Text.Builder()
                                                .setText(streakStr)
                                                .setFontStyle(
                                                    FontStyle.Builder()
                                                        .setSize(sp(16f))
                                                        .setWeight(FONT_WEIGHT_BOLD)
                                                        .setColor(argb(accentColor))
                                                        .build()
                                                )
                                                .build()
                                        )
                                        .addContent(
                                            Text.Builder()
                                                .setText("Serie")
                                                .setFontStyle(
                                                    FontStyle.Builder()
                                                        .setSize(sp(9f))
                                                        .setColor(argb(secondaryColor))
                                                        .build()
                                                )
                                                .build()
                                        )
                                        .build()
                                )
                                .addContent(Spacer.Builder().setWidth(dp(20f)).build())
                                .addContent(
                                    Column.Builder()
                                        .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
                                        .addContent(
                                            Text.Builder()
                                                .setText(rankStr)
                                                .setFontStyle(
                                                    FontStyle.Builder()
                                                        .setSize(sp(11f))
                                                        .setWeight(FONT_WEIGHT_BOLD)
                                                        .setColor(argb(textColor))
                                                        .build()
                                                )
                                                .build()
                                        )
                                        .addContent(
                                            Text.Builder()
                                                .setText("Rang")
                                                .setFontStyle(
                                                    FontStyle.Builder()
                                                        .setSize(sp(9f))
                                                        .setColor(argb(secondaryColor))
                                                        .build()
                                                )
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .build()

            val timeline = TimelineBuilders.Timeline.Builder()
                .addTimelineEntry(
                    TimelineBuilders.TimelineEntry.Builder()
                        .setLayout(Layout.Builder().setRoot(layout).build())
                        .build()
                )
                .build()

            return TileBuilders.Tile.Builder()
                .setResourcesVersion("1")
                .setTileTimeline(timeline)
                .setFreshnessIntervalMillis(15 * 60 * 1000L) // Refresh toutes les 15 min
                .build()
        }

        fun parseColor(hex: String, fallback: Int): Int {
            return try {
                android.graphics.Color.parseColor(hex)
            } catch (_: Exception) {
                fallback
            }
        }
    }
}
