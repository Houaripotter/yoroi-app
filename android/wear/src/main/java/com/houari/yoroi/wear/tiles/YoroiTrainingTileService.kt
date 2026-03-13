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
 * Tile Entraînement Yoroi
 * Affiche : pas du jour, calories actives, distance, série
 */
class YoroiTrainingTileService : TileService() {

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
            val accentColor = YoroiDashboardTileService.parseColor(repo.themeAccentHex, 0xFFD4AF37.toInt())
            val bgColor = 0xFF0A0A0A.toInt()
            val textColor = 0xFFFFFFFF.toInt()
            val secondaryColor = 0xFFAAAAAA.toInt()

            // Valeurs
            val steps = repo.localSteps.takeIf { it > 0 } ?: 0
            val stepsGoal = repo.stepsGoal
            val stepsStr = if (steps >= 1000) "%.1fk".format(steps / 1000f) else steps.toString()
            val stepsGoalStr = if (stepsGoal >= 1000) "%.0fk".format(stepsGoal / 1000f) else stepsGoal.toString()

            val calories = repo.localActiveCalories.takeIf { it > 0 } ?: repo.activeCalories
            val caloriesStr = if (calories > 0) "${calories}kcal" else "--"

            val distance = repo.localDistance.takeIf { it > 0 } ?: repo.distance
            val distanceStr = if (distance > 0) "%.1fkm".format(distance) else "--"

            val streak = repo.streak
            val streakStr = "${streak}j"

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
                                .setText("Entrainement")
                                .setFontStyle(
                                    FontStyle.Builder()
                                        .setSize(sp(10f))
                                        .setColor(argb(accentColor))
                                        .build()
                                )
                                .build()
                        )
                        .addContent(Spacer.Builder().setHeight(dp(6f)).build())
                        .addContent(
                            // Pas - valeur principale
                            Column.Builder()
                                .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
                                .addContent(
                                    Text.Builder()
                                        .setText(stepsStr)
                                        .setFontStyle(
                                            FontStyle.Builder()
                                                .setSize(sp(22f))
                                                .setWeight(FONT_WEIGHT_BOLD)
                                                .setColor(argb(textColor))
                                                .build()
                                        )
                                        .build()
                                )
                                .addContent(
                                    Text.Builder()
                                        .setText("/ $stepsGoalStr pas")
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
                        .addContent(Spacer.Builder().setHeight(dp(6f)).build())
                        .addContent(
                            // 3 stats secondaires
                            Row.Builder()
                                .setVerticalAlignment(VERTICAL_ALIGN_CENTER)
                                .addContent(statColumn(caloriesStr, "Cal", accentColor, secondaryColor))
                                .addContent(Spacer.Builder().setWidth(dp(12f)).build())
                                .addContent(statColumn(distanceStr, "Dist", accentColor, secondaryColor))
                                .addContent(Spacer.Builder().setWidth(dp(12f)).build())
                                .addContent(statColumn(streakStr, "Serie", accentColor, secondaryColor))
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
                .setFreshnessIntervalMillis(10 * 60 * 1000L) // Refresh toutes les 10 min
                .build()
        }

        private fun statColumn(
            value: String,
            label: String,
            accentColor: Int,
            secondaryColor: Int
        ): LayoutElement {
            return Column.Builder()
                .setHorizontalAlignment(HORIZONTAL_ALIGN_CENTER)
                .addContent(
                    Text.Builder()
                        .setText(value)
                        .setFontStyle(
                            FontStyle.Builder()
                                .setSize(sp(12f))
                                .setWeight(FONT_WEIGHT_BOLD)
                                .setColor(argb(accentColor))
                                .build()
                        )
                        .build()
                )
                .addContent(
                    Text.Builder()
                        .setText(label)
                        .setFontStyle(
                            FontStyle.Builder()
                                .setSize(sp(8f))
                                .setColor(argb(secondaryColor))
                                .build()
                        )
                        .build()
                )
                .build()
        }
    }
}
