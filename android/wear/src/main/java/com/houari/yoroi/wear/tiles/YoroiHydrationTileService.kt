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
 * Tile Hydratation Yoroi
 * Affiche : ml bus / objectif + barre de progression + bouton +250ml
 */
class YoroiHydrationTileService : TileService() {

    private lateinit var repo: YoroiDataRepository

    override fun onCreate() {
        super.onCreate()
        repo = YoroiDataRepository(this)
    }

    override fun onTileRequest(
        requestParams: RequestBuilders.TileRequest
    ): ListenableFuture<TileBuilders.Tile> {
        return Futures.immediateFuture(buildTile(this, repo, requestParams.deviceConfiguration))
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest
    ): ListenableFuture<ResourceBuilders.Resources> {
        return Futures.immediateFuture(
            ResourceBuilders.Resources.Builder().setVersion("1").build()
        )
    }

    companion object {
        fun buildTile(
            context: Context,
            repo: YoroiDataRepository,
            deviceParams: DeviceParameters?
        ): TileBuilders.Tile {
            val accentColor = YoroiDashboardTileService.parseColor(repo.themeAccentHex, 0xFF2196F3.toInt())
            val bgColor = 0xFF0A0A0A.toInt()
            val textColor = 0xFFFFFFFF.toInt()
            val secondaryColor = 0xFFAAAAAA.toInt()
            val barBg = 0xFF222222.toInt()

            val current = repo.hydrationCurrent
            val goal = repo.hydrationGoal.coerceAtLeast(1)
            val progress = (current.toFloat() / goal).coerceIn(0f, 1f)
            val progressPct = (progress * 100).toInt()

            val currentL = "%.1f".format(current / 1000f)
            val goalL = "%.1f".format(goal / 1000f)
            val barWidth = 120f
            val fillWidth = (barWidth * progress).coerceAtLeast(2f)

            val layout = Box.Builder()
                .setWidth(expand())
                .setHeight(expand())
                .setModifiers(
                    Modifiers.Builder()
                        .setBackground(Background.Builder().setColor(argb(bgColor)).build())
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
                            Text.Builder()
                                .setText("Hydratation")
                                .setFontStyle(
                                    FontStyle.Builder()
                                        .setSize(sp(10f))
                                        .setColor(argb(accentColor))
                                        .build()
                                )
                                .build()
                        )
                        .addContent(Spacer.Builder().setHeight(dp(4f)).build())
                        .addContent(
                            // Valeur principale
                            Row.Builder()
                                .setVerticalAlignment(VERTICAL_ALIGN_BOTTOM)
                                .addContent(
                                    Text.Builder()
                                        .setText(currentL)
                                        .setFontStyle(
                                            FontStyle.Builder()
                                                .setSize(sp(28f))
                                                .setWeight(FONT_WEIGHT_BOLD)
                                                .setColor(argb(textColor))
                                                .build()
                                        )
                                        .build()
                                )
                                .addContent(
                                    Text.Builder()
                                        .setText("/$goalL L")
                                        .setFontStyle(
                                            FontStyle.Builder()
                                                .setSize(sp(12f))
                                                .setColor(argb(secondaryColor))
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .addContent(Spacer.Builder().setHeight(dp(6f)).build())
                        .addContent(
                            // Barre de progression (fond + remplissage)
                            Box.Builder()
                                .setWidth(dp(barWidth))
                                .setHeight(dp(6f))
                                .setHorizontalAlignment(HORIZONTAL_ALIGN_START)
                                .setModifiers(
                                    Modifiers.Builder()
                                        .setBackground(
                                            Background.Builder()
                                                .setColor(argb(barBg))
                                                .setCorner(Corner.Builder().setRadius(dp(3f)).build())
                                                .build()
                                        )
                                        .build()
                                )
                                .addContent(
                                    Box.Builder()
                                        .setWidth(dp(fillWidth))
                                        .setHeight(dp(6f))
                                        .setModifiers(
                                            Modifiers.Builder()
                                                .setBackground(
                                                    Background.Builder()
                                                        .setColor(argb(accentColor))
                                                        .setCorner(Corner.Builder().setRadius(dp(3f)).build())
                                                        .build()
                                                )
                                                .build()
                                        )
                                        .build()
                                )
                                .build()
                        )
                        .addContent(Spacer.Builder().setHeight(dp(2f)).build())
                        .addContent(
                            Text.Builder()
                                .setText("$progressPct%")
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
                .setFreshnessIntervalMillis(5 * 60 * 1000L) // Refresh toutes les 5 min
                .build()
        }
    }
}
