package com.houari.yoroi.wear.presentation

import android.graphics.BitmapFactory
import android.util.Base64
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material3.Text
import com.houari.yoroi.wear.data.YoroiDataRepository
import com.houari.yoroi.wear.theme.*

/**
 * Page 1: Dashboard Premium - Profile, Quick Actions, Health Metrics, Streak
 */
@Composable
fun DashboardPage(repo: YoroiDataRepository) {
    val accent = remember(repo.themeAccentHex) { parseHexColor(repo.themeAccentHex) }
    val colors = rememberSyncedWatchColors(
        bgHex = repo.themeBgHex, cardBgHex = repo.themeCardBgHex,
        textPrimaryHex = repo.themeTextPrimaryHex, textSecondaryHex = repo.themeTextSecondaryHex,
        dividerHex = repo.themeDividerHex, textOnAccentHex = repo.themeTextOnAccentHex,
        isDarkMode = repo.isDarkMode
    )

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // ── PROFILE HEADER ──
        item { ProfileHeader(repo, accent, colors) }

        // ── SYNC BUTTON ──
        item { SyncButton(repo, accent, colors) }

        // ── QUICK ACTIONS ROW ──
        item { QuickActionsRow(repo, accent, colors) }

        // ── HEALTH METRICS GRID ──
        item { HealthSectionLabel(colors) }
        item { HealthRow1(repo, colors) }
        item { HealthRow2(repo, colors) }

        // ── HYDRATION MINI ──
        item { HydrationMiniCard(repo, colors) }

        // ── STREAK ──
        if (repo.streak > 0) {
            item { StreakBanner(repo, colors) }
        }
    }
}

@Composable
private fun ProfileHeader(repo: YoroiDataRepository, accent: Color, colors: YoroiWatchColors) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp)
    ) {
        // Profile photo circle with accent border
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        colors = listOf(accent, accent.copy(alpha = 0.6f))
                    )
                )
        ) {
            val profileBitmap = remember(repo.profileImageBase64) {
                repo.profileImageBase64?.let { b64 ->
                    try {
                        val bytes = Base64.decode(b64, Base64.DEFAULT)
                        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
                    } catch (_: Exception) { null }
                }
            }
            if (profileBitmap != null) {
                androidx.compose.foundation.Image(
                    bitmap = profileBitmap,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(32.dp).clip(CircleShape)
                )
            } else {
                val initials = repo.userName.split(" ")
                    .take(2)
                    .mapNotNull { it.firstOrNull()?.uppercase() }
                    .joinToString("")
                    .ifEmpty { "Y" }
                Text(
                    initials,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textOnAccent
                )
            }
        }

        Spacer(Modifier.width(8.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                if (repo.userName.isNotEmpty()) repo.userName else "Yoroi",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Niv.${repo.level}",
                    fontSize = 8.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = accent
                )
                if (repo.rank.isNotEmpty()) {
                    Spacer(Modifier.width(4.dp))
                    Text(
                        repo.rank,
                        fontSize = 7.sp,
                        color = colors.textSecondary
                    )
                }
            }
        }

        // Connection indicator
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(if (repo.isConnected) Green else Red)
        )
    }
}

@Composable
private fun SyncButton(repo: YoroiDataRepository, accent: Color, colors: YoroiWatchColors) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(accent.copy(alpha = 0.1f))
            .clickable { repo.requestSync() }
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        androidx.compose.material3.Icon(
            Icons.Filled.Sync,
            contentDescription = null,
            tint = accent,
            modifier = Modifier.size(12.dp)
        )
        Spacer(Modifier.width(4.dp))
        Text("Synchroniser", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = accent)
    }
}

@Composable
private fun QuickActionsRow(repo: YoroiDataRepository, accent: Color, colors: YoroiWatchColors) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Timer
        QuickActionCircle(
            icon = if (repo.timerIsRunning) Icons.Filled.Pause else Icons.Filled.Timer,
            color = accent,
            label = if (repo.timerIsRunning) repo.formatTime(repo.timerRemainingSeconds) else "Timer",
            progress = if (repo.timerIsRunning && repo.timerTotalSeconds > 0)
                repo.timerRemainingSeconds.toFloat() / repo.timerTotalSeconds.toFloat() else null,
            textColor = colors.textSecondary
        )

        // Steps (prefer local Watch data)
        val displaySteps = if (repo.localSteps > 0) repo.localSteps else 0
        val stepsProgress = if (repo.stepsGoal > 0 && displaySteps > 0)
            (displaySteps.toFloat() / repo.stepsGoal.toFloat()).coerceIn(0f, 1f) else null
        val stepsLabel = if (displaySteps > 0) {
            if (displaySteps >= 1000) "%.1fk".format(displaySteps / 1000.0) else "$displaySteps"
        } else "--"
        QuickActionCircle(
            icon = Icons.Filled.DirectionsWalk,
            color = Green,
            label = stepsLabel,
            progress = stepsProgress,
            textColor = colors.textSecondary
        )

        // Carnet
        QuickActionCircle(
            icon = Icons.Filled.MenuBook,
            color = Cyan,
            label = "Carnet",
            progress = null,
            textColor = colors.textSecondary
        )
    }
}

@Composable
private fun QuickActionCircle(
    icon: ImageVector,
    color: Color,
    label: String,
    progress: Float?,
    textColor: Color = TextSecondary
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(44.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.15f))
            )

            if (progress != null && progress > 0f) {
                androidx.compose.foundation.Canvas(
                    modifier = Modifier.size(44.dp)
                ) {
                    drawArc(
                        color = color,
                        startAngle = -90f,
                        sweepAngle = 360f * progress.coerceIn(0f, 1f),
                        useCenter = false,
                        style = androidx.compose.ui.graphics.drawscope.Stroke(
                            width = 3.dp.toPx(),
                            cap = androidx.compose.ui.graphics.StrokeCap.Round
                        )
                    )
                }
            }

            androidx.compose.material3.Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(16.dp)
            )
        }

        Text(
            label,
            fontSize = 8.sp,
            fontWeight = FontWeight.SemiBold,
            color = textColor
        )
    }
}

@Composable
private fun HealthSectionLabel(colors: YoroiWatchColors) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        androidx.compose.material3.Icon(
            Icons.Filled.Favorite,
            contentDescription = null,
            tint = Color(0xFFEC4899),
            modifier = Modifier.size(8.dp)
        )
        Spacer(Modifier.width(4.dp))
        Text(
            "SANTE",
            fontSize = 7.sp,
            fontWeight = FontWeight.ExtraBold,
            color = colors.textSecondary,
            letterSpacing = 1.sp
        )
    }
}

@Composable
private fun HealthRow1(repo: YoroiDataRepository, colors: YoroiWatchColors) {
    // Prefer local Watch sensor data, fallback to iPhone sync
    val hr = if (repo.localHeartRate > 0) repo.localHeartRate else repo.heartRate
    val sp = repo.spo2 // SpO2 from iPhone sync (no Watch sensor API on Wear OS)
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        HealthMiniCard(
            icon = Icons.Filled.Favorite,
            color = Color(0xFFEC4899),
            value = if (hr > 0) "$hr" else "--",
            unit = "BPM",
            label = "FC",
            colors = colors,
            modifier = Modifier.weight(1f)
        )
        HealthMiniCard(
            icon = Icons.Filled.WaterDrop,
            color = Cyan,
            value = if (sp > 0) "$sp" else "--",
            unit = "%",
            label = "SpO2",
            colors = colors,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun HealthRow2(repo: YoroiDataRepository, colors: YoroiWatchColors) {
    // Prefer local Watch sensor data, fallback to iPhone sync
    val cal = if (repo.localActiveCalories > 0) repo.localActiveCalories else repo.activeCalories
    val dist = if (repo.localDistance > 0) repo.localDistance else repo.distance
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        HealthMiniCard(
            icon = Icons.Filled.LocalFireDepartment,
            color = Orange,
            value = if (cal > 0) "$cal" else "--",
            unit = "kcal",
            label = "Actives",
            colors = colors,
            modifier = Modifier.weight(1f)
        )
        HealthMiniCard(
            icon = Icons.Filled.DirectionsWalk,
            color = Color(0xFF3B82F6),
            value = if (dist > 0) "%.1f".format(dist) else "--",
            unit = "km",
            label = "Distance",
            colors = colors,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun HydrationMiniCard(repo: YoroiDataRepository, colors: YoroiWatchColors) {
    val progress = if (repo.hydrationGoal > 0)
        (repo.hydrationCurrent.toFloat() / repo.hydrationGoal.toFloat()).coerceIn(0f, 1f) else 0f

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(colors.cardBg)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .background(Cyan.copy(alpha = 0.15f))
        ) {
            androidx.compose.material3.Icon(
                Icons.Filled.WaterDrop,
                contentDescription = null,
                tint = Cyan,
                modifier = Modifier.size(11.dp)
            )
        }
        Spacer(Modifier.width(6.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    "${repo.hydrationCurrent}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                Spacer(Modifier.width(2.dp))
                Text(
                    "/ ${repo.hydrationGoal}ml",
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Medium,
                    color = colors.textSecondary
                )
            }
            // Mini progress bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Cyan.copy(alpha = 0.1f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress)
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (progress >= 1f) Green else Cyan)
                )
            }
        }
    }
}

@Composable
private fun HealthMiniCard(
    icon: ImageVector,
    color: Color,
    value: String,
    unit: String,
    label: String,
    colors: YoroiWatchColors,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(colors.cardBg)
            .padding(horizontal = 6.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.15f))
        ) {
            androidx.compose.material3.Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(11.dp)
            )
        }
        Spacer(Modifier.width(6.dp))
        Column {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    value,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                Spacer(Modifier.width(2.dp))
                Text(
                    unit,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Medium,
                    color = colors.textSecondary
                )
            }
            Text(
                label,
                fontSize = 7.sp,
                color = colors.textSecondary
            )
        }
    }
}

@Composable
private fun StreakBanner(repo: YoroiDataRepository, colors: YoroiWatchColors) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(Orange.copy(alpha = 0.1f))
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        androidx.compose.material3.Icon(
            Icons.Filled.LocalFireDepartment,
            contentDescription = null,
            tint = Orange,
            modifier = Modifier.size(12.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            "${repo.streak}",
            fontSize = 16.sp,
            fontWeight = FontWeight.Black,
            color = colors.textPrimary
        )
        Spacer(Modifier.width(4.dp))
        Text(
            "jours",
            fontSize = 9.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.textSecondary
        )
        Spacer(Modifier.weight(1f))
        // Weekly dots
        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            repeat(7) { i ->
                Box(
                    modifier = Modifier
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(
                            if (i < minOf(repo.streak, 7)) Orange
                            else colors.textPrimary.copy(alpha = 0.1f)
                        )
                )
            }
        }
    }
}
