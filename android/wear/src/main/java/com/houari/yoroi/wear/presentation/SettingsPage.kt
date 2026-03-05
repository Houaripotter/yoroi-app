package com.houari.yoroi.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
 * Page 5: Reglages - Connexion, Timer Presets (horizontal scroll), Objectifs, Preferences
 */
@Composable
fun SettingsPage(repo: YoroiDataRepository) {
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
                    tint = accent,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text("Reglages", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
            }
        }

        // ── APPARENCE ──
        item { SectionLabel("APPARENCE", Icons.Filled.Palette, accent, colors) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.cardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    androidx.compose.material3.Icon(
                        if (repo.isDarkMode) Icons.Filled.DarkMode else Icons.Filled.LightMode,
                        contentDescription = null,
                        tint = if (repo.isDarkMode) Purple else Color(0xFFF97316),
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text("Theme", fontSize = 10.sp, color = colors.textSecondary)
                    Spacer(Modifier.weight(1f))
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        ModeButton("Clair", Icons.Filled.LightMode, !repo.isDarkMode, Color(0xFFF97316), accent, colors) {
                            repo.changeThemeMode("light")
                        }
                        ModeButton("Sombre", Icons.Filled.DarkMode, repo.isDarkMode, Purple, accent, colors) {
                            repo.changeThemeMode("dark")
                        }
                    }
                }
            }
        }

        // ── CONNEXION ──
        item { SectionLabel("CONNEXION", Icons.Filled.Wifi, Green, colors) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.cardBg)
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

        // ── MINUTEUR (horizontal scroll presets) ──
        item { SectionLabel("MINUTEUR", Icons.Filled.Timer, accent, colors) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.cardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text("Duree par defaut", fontSize = 9.sp, color = colors.textSecondary)

                // Horizontal scrollable presets
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(
                        30 to "30s", 45 to "45s", 60 to "1:00", 90 to "1:30",
                        120 to "2:00", 150 to "2:30", 180 to "3:00", 240 to "4:00", 300 to "5:00"
                    ).forEach { (seconds, label) ->
                        val isSelected = repo.timerTotalSeconds == seconds && !repo.timerIsRunning
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isSelected) accent
                                    else accent.copy(alpha = 0.1f)
                                )
                        ) {
                            androidx.compose.material3.TextButton(
                                onClick = { repo.setTimer(seconds); repo.changeTimerPreset(seconds) },
                                contentPadding = PaddingValues(0.dp),
                                modifier = Modifier.size(40.dp)
                            ) {
                                Text(
                                    label,
                                    fontSize = 9.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) colors.textOnAccent else accent
                                )
                            }
                        }
                    }
                }
            }
        }

        // ── OBJECTIFS ──
        item { SectionLabel("OBJECTIFS", Icons.Filled.Flag, Green, colors) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.cardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Steps goal
                GoalRow(
                    icon = Icons.Filled.DirectionsWalk,
                    color = Green,
                    label = "Pas / jour",
                    value = "${repo.stepsGoal}",
                    colors = colors,
                    onMinus = { repo.adjustStepsGoal(-1000) },
                    onPlus = { repo.adjustStepsGoal(1000) }
                )

                // Hydration goal
                GoalRow(
                    icon = Icons.Filled.WaterDrop,
                    color = Cyan,
                    label = "Eau / jour",
                    value = "${repo.hydrationGoal}ml",
                    colors = colors,
                    onMinus = { repo.adjustHydrationGoal(-250) },
                    onPlus = { repo.adjustHydrationGoal(250) }
                )
            }
        }

        // ── A PROPOS ──
        item { SectionLabel("A PROPOS", Icons.Filled.Info, colors.textSecondary, colors) }
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.cardBg)
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                InfoRow("App", "Yoroi Watch", colors)
                InfoRow("Version", "2.0.0", colors)
                InfoRow("Plateforme", "WearOS", colors)
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String, icon: ImageVector, color: Color, colors: YoroiWatchColors) {
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
            color = colors.textSecondary,
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
    colors: YoroiWatchColors,
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
        Text(label, fontSize = 10.sp, color = colors.textSecondary)
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
            color = colors.textPrimary,
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
private fun InfoRow(label: String, value: String, colors: YoroiWatchColors) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, fontSize = 9.sp, color = colors.textSecondary)
        Spacer(Modifier.weight(1f))
        Text(value, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
    }
}

@Composable
private fun ModeButton(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    iconColor: Color,
    accent: Color,
    colors: YoroiWatchColors,
    onClick: () -> Unit
) {
    androidx.compose.material3.TextButton(
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 3.dp),
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (isSelected) accent else colors.cardBg)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            androidx.compose.material3.Icon(
                icon,
                contentDescription = null,
                tint = if (isSelected) iconColor else colors.textSecondary,
                modifier = Modifier.size(10.dp)
            )
            Text(
                label,
                fontSize = 8.sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) colors.textOnAccent else colors.textPrimary
            )
        }
    }
}
