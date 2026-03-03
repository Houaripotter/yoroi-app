package com.houari.yoroi.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
 * Page 5: Reglages - Connexion, Objectifs, Preferences
 */
@Composable
fun SettingsPage(repo: YoroiDataRepository) {
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Header
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 4.dp)
            ) {
                androidx.compose.material3.Icon(
                    Icons.Filled.Settings,
                    contentDescription = null,
                    tint = Gold,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text("Reglages", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        }

        // ── CONNEXION ──
        item { SectionLabel("CONNEXION", Icons.Filled.Wifi, Green) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(CardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (repo.isConnected) Green else Red)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        if (repo.isConnected) "Connecte" else "Deconnecte",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (repo.isConnected) Green else Red
                    )
                }

                // Sync button
                androidx.compose.material3.Button(
                    onClick = { repo.requestSync() },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        androidx.compose.material3.Icon(
                            Icons.Filled.Sync,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("Synchroniser", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // ── OBJECTIFS ──
        item { SectionLabel("OBJECTIFS", Icons.Filled.Flag, Green) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(CardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Steps goal
                GoalRow(
                    icon = Icons.Filled.DirectionsWalk,
                    color = Green,
                    label = "Pas / jour",
                    value = "${repo.stepsGoal}",
                    onMinus = { repo.adjustStepsGoal(-1000) },
                    onPlus = { repo.adjustStepsGoal(1000) }
                )

                // Hydration goal
                GoalRow(
                    icon = Icons.Filled.WaterDrop,
                    color = Cyan,
                    label = "Eau / jour",
                    value = "${repo.hydrationGoal}ml",
                    onMinus = { repo.adjustHydrationGoal(-250) },
                    onPlus = { repo.adjustHydrationGoal(250) }
                )
            }
        }

        // ── MINUTEUR ──
        item { SectionLabel("MINUTEUR", Icons.Filled.Timer, Gold) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(CardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text("Duree par defaut", fontSize = 9.sp, color = TextSecondary)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    listOf(60, 90, 120, 180).forEach { seconds ->
                        val label = when (seconds) {
                            60 -> "1:00"
                            90 -> "1:30"
                            120 -> "2:00"
                            180 -> "3:00"
                            else -> "${seconds}s"
                        }
                        val isSelected = repo.timerTotalSeconds == seconds && !repo.timerIsRunning
                        androidx.compose.material3.TextButton(
                            onClick = { repo.setTimer(seconds) }
                        ) {
                            Text(
                                label,
                                fontSize = 10.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                color = if (isSelected) Gold else TextSecondary
                            )
                        }
                    }
                }
            }
        }

        // ── A PROPOS ──
        item { SectionLabel("A PROPOS", Icons.Filled.Info, TextSecondary) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(CardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                InfoRow("App", "Yoroi Watch")
                InfoRow("Version", "2.0.0")
                InfoRow("Plateforme", "WearOS")
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String, icon: ImageVector, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(horizontal = 4.dp)
    ) {
        androidx.compose.material3.Icon(
            icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(8.dp)
        )
        Spacer(Modifier.width(4.dp))
        Text(
            text,
            fontSize = 7.sp,
            fontWeight = FontWeight.ExtraBold,
            color = TextSecondary,
            letterSpacing = 1.sp
        )
    }
}

@Composable
private fun GoalRow(
    icon: ImageVector,
    color: Color,
    label: String,
    value: String,
    onMinus: () -> Unit,
    onPlus: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        androidx.compose.material3.Icon(
            icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(12.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(label, fontSize = 10.sp, color = TextSecondary)
        Spacer(Modifier.weight(1f))

        androidx.compose.material3.IconButton(
            onClick = onMinus,
            modifier = Modifier.size(24.dp)
        ) {
            androidx.compose.material3.Icon(
                Icons.Filled.RemoveCircle,
                contentDescription = null,
                tint = Red,
                modifier = Modifier.size(16.dp)
            )
        }

        Text(
            value,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
            modifier = Modifier.widthIn(min = 48.dp)
        )

        androidx.compose.material3.IconButton(
            onClick = onPlus,
            modifier = Modifier.size(24.dp)
        ) {
            androidx.compose.material3.Icon(
                Icons.Filled.AddCircle,
                contentDescription = null,
                tint = Green,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, fontSize = 9.sp, color = TextSecondary)
        Spacer(Modifier.weight(1f))
        Text(value, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
    }
}
