package com.houari.yoroi.wear.presentation

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
import androidx.compose.ui.graphics.vector.ImageVector
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
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // ── PROFILE HEADER ──
        item { ProfileHeader(repo) }

        // ── QUICK ACTIONS ROW ──
        item { QuickActionsRow(repo) }

        // ── HEALTH METRICS GRID ──
        item { HealthSectionLabel() }
        item { HealthRow1(repo) }
        item { HealthRow2(repo) }

        // ── STREAK ──
        if (repo.streak > 0) {
            item { StreakBanner(repo) }
        }
    }
}

@Composable
private fun ProfileHeader(repo: YoroiDataRepository) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp)
    ) {
        // Profile photo circle with gold border
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        colors = listOf(Gold, Gold.copy(alpha = 0.6f))
                    )
                )
        ) {
            // Initials fallback
            val initials = repo.userName.split(" ")
                .take(2)
                .mapNotNull { it.firstOrNull()?.uppercase() }
                .joinToString("")
                .ifEmpty { "Y" }
            Text(
                initials,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
        }

        Spacer(Modifier.width(8.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                if (repo.userName.isNotEmpty()) repo.userName else "Yoroi",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Niv.${repo.level}",
                    fontSize = 8.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Gold
                )
                if (repo.rank.isNotEmpty()) {
                    Spacer(Modifier.width(4.dp))
                    Text(
                        repo.rank,
                        fontSize = 7.sp,
                        color = TextSecondary
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
private fun QuickActionsRow(repo: YoroiDataRepository) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Timer
        QuickActionCircle(
            icon = if (repo.timerIsRunning) Icons.Filled.Pause else Icons.Filled.Timer,
            color = Gold,
            label = if (repo.timerIsRunning) repo.formatTime(repo.timerRemainingSeconds) else "Timer",
            progress = if (repo.timerIsRunning && repo.timerTotalSeconds > 0)
                repo.timerRemainingSeconds.toFloat() / repo.timerTotalSeconds.toFloat() else null
        )

        // Steps
        val stepsProgress = if (repo.stepsGoal > 0) 0f else null // Placeholder - real steps from Health Services
        QuickActionCircle(
            icon = Icons.Filled.DirectionsWalk,
            color = Green,
            label = "--",
            progress = stepsProgress
        )

        // Carnet
        QuickActionCircle(
            icon = Icons.Filled.MenuBook,
            color = Cyan,
            label = "Carnet",
            progress = null
        )
    }
}

@Composable
private fun QuickActionCircle(
    icon: ImageVector,
    color: Color,
    label: String,
    progress: Float?
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.size(44.dp)
        ) {
            // Background
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.15f))
            )

            // Progress ring overlay (if provided)
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

            // Icon
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
            color = TextSecondary
        )
    }
}

@Composable
private fun HealthSectionLabel() {
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
            color = TextSecondary,
            letterSpacing = 1.sp
        )
    }
}

@Composable
private fun HealthRow1(repo: YoroiDataRepository) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        HealthMiniCard(
            icon = Icons.Filled.Favorite,
            color = Color(0xFFEC4899),
            value = if (repo.heartRate > 0) "${repo.heartRate}" else "--",
            unit = "BPM",
            label = "FC",
            modifier = Modifier.weight(1f)
        )
        HealthMiniCard(
            icon = Icons.Filled.WaterDrop,
            color = Cyan,
            value = if (repo.spo2 > 0) "${repo.spo2}" else "--",
            unit = "%",
            label = "SpO2",
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun HealthRow2(repo: YoroiDataRepository) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        HealthMiniCard(
            icon = Icons.Filled.LocalFireDepartment,
            color = Orange,
            value = if (repo.activeCalories > 0) "${repo.activeCalories}" else "--",
            unit = "kcal",
            label = "Actives",
            modifier = Modifier.weight(1f)
        )
        HealthMiniCard(
            icon = Icons.Filled.DirectionsWalk,
            color = Color(0xFF3B82F6),
            value = if (repo.distance > 0) "%.1f".format(repo.distance) else "--",
            unit = "km",
            label = "Distance",
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun HealthMiniCard(
    icon: ImageVector,
    color: Color,
    value: String,
    unit: String,
    label: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(CardBg)
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
                    color = TextPrimary
                )
                Spacer(Modifier.width(2.dp))
                Text(
                    unit,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary
                )
            }
            Text(
                label,
                fontSize = 7.sp,
                color = TextSecondary
            )
        }
    }
}

@Composable
private fun StreakBanner(repo: YoroiDataRepository) {
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
            color = TextPrimary
        )
        Spacer(Modifier.width(4.dp))
        Text(
            "jours",
            fontSize = 9.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextSecondary
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
                            else TextPrimary.copy(alpha = 0.1f)
                        )
                )
            }
        }
    }
}

