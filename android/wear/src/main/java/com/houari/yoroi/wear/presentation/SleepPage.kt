package com.houari.yoroi.wear.presentation

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material3.Text
import com.houari.yoroi.wear.data.YoroiDataRepository
import com.houari.yoroi.wear.theme.*

/**
 * Page 4: Sommeil - Scene de nuit animee + metriques
 */
@Composable
fun SleepPage(repo: YoroiDataRepository) {
    val colors = rememberSyncedWatchColors(
        bgHex = repo.themeBgHex, cardBgHex = repo.themeCardBgHex,
        textPrimaryHex = repo.themeTextPrimaryHex, textSecondaryHex = repo.themeTextSecondaryHex,
        dividerHex = repo.themeDividerHex, textOnAccentHex = repo.themeTextOnAccentHex,
        isDarkMode = repo.isDarkMode
    )
    val sleepH = repo.sleepDuration / 60
    val sleepM = repo.sleepDuration % 60
    val qualityPct = repo.sleepQuality * 20 // 0-5 -> 0-100

    // --- Animations ---
    val infiniteTransition = rememberInfiniteTransition(label = "sleep")

    val moonOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -4f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "moonFloat"
    )

    val star1Alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "star1"
    )
    val star2Alpha by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 0.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, delayMillis = 300, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "star2"
    )
    val star3Alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, delayMillis = 600, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "star3"
    )

    val zzz1Y by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -12f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = EaseOut),
            repeatMode = RepeatMode.Restart
        ),
        label = "zzz1Y"
    )
    val zzz1Alpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = EaseOut),
            repeatMode = RepeatMode.Restart
        ),
        label = "zzz1A"
    )
    val zzz2Y by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -12f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, delayMillis = 500, easing = EaseOut),
            repeatMode = RepeatMode.Restart
        ),
        label = "zzz2Y"
    )
    val zzz2Alpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, delayMillis = 500, easing = EaseOut),
            repeatMode = RepeatMode.Restart
        ),
        label = "zzz2A"
    )
    val zzz3Y by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -12f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, delayMillis = 1000, easing = EaseOut),
            repeatMode = RepeatMode.Restart
        ),
        label = "zzz3Y"
    )
    val zzz3Alpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, delayMillis = 1000, easing = EaseOut),
            repeatMode = RepeatMode.Restart
        ),
        label = "zzz3A"
    )

    val breatheScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, delayMillis = 400, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathe"
    )

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Header
        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 2.dp)) {
                androidx.compose.material3.Icon(
                    Icons.Filled.DarkMode,
                    contentDescription = null,
                    tint = NightMid,
                    modifier = Modifier.size(10.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Sommeil", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary.copy(alpha = 0.7f))
            }
        }

        // Sync button
        item {
            val accent = remember(repo.themeAccentHex) { parseHexColor(repo.themeAccentHex) }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(accent.copy(alpha = 0.08f))
                    .clickable { repo.requestSync() }
                    .padding(vertical = 5.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Icon(
                    Icons.Filled.Sync,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(10.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Synchroniser", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = accent)
            }
        }

        // Night scene with animations (kept static colors - night scene)
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(NightBg, NightBg.copy(alpha = 0.8f), NightMid.copy(alpha = 0.2f))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                // Moon
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .offset(x = 40.dp, y = (-20 + moonOffset).dp)
                        .clip(CircleShape)
                        .background(MoonColor)
                )
                // Stars
                Text("\u2726", fontSize = 4.sp, color = MoonColor.copy(alpha = star1Alpha),
                    modifier = Modifier.offset(x = (-50).dp, y = (-30).dp))
                Text("\u2726", fontSize = 3.sp, color = MoonColor.copy(alpha = star2Alpha),
                    modifier = Modifier.offset(x = (-30).dp, y = (-20).dp))
                Text("\u2726", fontSize = 4.sp, color = MoonColor.copy(alpha = star3Alpha),
                    modifier = Modifier.offset(x = 20.dp, y = (-28).dp))
                Text("\u2726", fontSize = 3.sp, color = MoonColor.copy(alpha = star2Alpha),
                    modifier = Modifier.offset(x = 50.dp, y = (-25).dp))
                Text("\u2726", fontSize = 3.5.sp, color = MoonColor.copy(alpha = star1Alpha),
                    modifier = Modifier.offset(x = (-15).dp, y = (-35).dp))
                // Bed icon
                androidx.compose.material3.Icon(
                    Icons.Filled.Bed,
                    contentDescription = null,
                    tint = NightLight,
                    modifier = Modifier
                        .size((24 * breatheScale).dp)
                        .offset(y = 8.dp)
                )
                // ZZZ
                Text("z", fontSize = 6.sp, fontWeight = FontWeight.ExtraBold, color = NightLight.copy(alpha = zzz1Alpha * 0.6f),
                    modifier = Modifier.offset(x = 18.dp, y = (10 + zzz1Y).dp))
                Text("Z", fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = NightLight.copy(alpha = zzz2Alpha * 0.8f),
                    modifier = Modifier.offset(x = 24.dp, y = (4 + zzz2Y).dp))
                Text("Z", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = NightMid.copy(alpha = zzz3Alpha),
                    modifier = Modifier.offset(x = 32.dp, y = (-4 + zzz3Y).dp))
            }
        }

        // Duration
        item {
            Text(
                if (repo.sleepDuration > 0) "${sleepH}h${"%02d".format(sleepM)}" else "--",
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                color = colors.textPrimary,
                letterSpacing = (-1).sp,
                modifier = Modifier.fillMaxWidth()
            )
        }

        // Bed/Wake times
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    androidx.compose.material3.Icon(
                        Icons.Filled.Bed,
                        contentDescription = null,
                        tint = NightMid,
                        modifier = Modifier.size(10.dp)
                    )
                    Text(repo.sleepBedTime, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                }
                Box(Modifier.width(1.dp).height(28.dp).background(colors.divider))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    androidx.compose.material3.Icon(
                        Icons.Filled.WbSunny,
                        contentDescription = null,
                        tint = MoonColor,
                        modifier = Modifier.size(10.dp)
                    )
                    Text(repo.sleepWakeTime, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                }
            }
        }

        // Debt
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Icon(
                    if (repo.sleepDebt > 0) Icons.Filled.Warning else Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = if (repo.sleepDebt > 0) Red else Green,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text("Dette", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textSecondary)
                Spacer(Modifier.weight(1f))
                Text(
                    if (repo.sleepDebt > 0) "%.1fh".format(repo.sleepDebt) else "0h",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (repo.sleepDebt > 0) Red else Green
                )
            }
        }

        // Quality
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Icon(
                    Icons.Filled.DarkMode,
                    contentDescription = null,
                    tint = NightMid,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text("Qualite", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textSecondary)
                Spacer(Modifier.weight(1f))
                Text(
                    if (qualityPct > 0) "$qualityPct%" else "--",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = when {
                        qualityPct >= 80 -> Green
                        qualityPct >= 60 -> MoonColor
                        else -> Red
                    }
                )
            }
        }

        // Stars
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally)
            ) {
                repeat(5) { i ->
                    androidx.compose.material3.Icon(
                        if (i < repo.sleepQuality) Icons.Filled.Star else Icons.Filled.StarBorder,
                        contentDescription = null,
                        tint = if (i < repo.sleepQuality) MoonColor else colors.textSecondary.copy(alpha = 0.3f),
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }

        // Quality bar
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .padding(horizontal = 6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(NightMid.copy(alpha = 0.15f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth((qualityPct / 100f).coerceIn(0f, 1f))
                        .clip(RoundedCornerShape(3.dp))
                        .background(
                            Brush.horizontalGradient(listOf(NightMid, NightLight))
                        )
                )
            }
        }
    }
}
