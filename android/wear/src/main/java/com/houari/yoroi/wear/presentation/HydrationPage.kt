package com.houari.yoroi.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material3.Text
import com.houari.yoroi.wear.data.YoroiDataRepository
import com.houari.yoroi.wear.theme.*

/**
 * Page 3: Hydratation - Bouteille + boutons rapides
 */
@Composable
fun HydrationPage(repo: YoroiDataRepository) {
    val colors = rememberSyncedWatchColors(
        bgHex = repo.themeBgHex, cardBgHex = repo.themeCardBgHex,
        textPrimaryHex = repo.themeTextPrimaryHex, textSecondaryHex = repo.themeTextSecondaryHex,
        dividerHex = repo.themeDividerHex, textOnAccentHex = repo.themeTextOnAccentHex,
        isDarkMode = repo.isDarkMode
    )
    val fillPct = if (repo.hydrationGoal > 0)
        (repo.hydrationCurrent.toFloat() / repo.hydrationGoal).coerceIn(0f, 1f) else 0f
    val goalReached = fillPct >= 1f
    val accent = if (goalReached) Green else Cyan

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Header
        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 2.dp)) {
                androidx.compose.material3.Icon(
                    Icons.Filled.WaterDrop,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(10.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Hydratation", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary.copy(alpha = 0.7f))
            }
        }

        // Sync button
        item {
            val themeAccent = remember(repo.themeAccentHex) { parseHexColor(repo.themeAccentHex) }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(themeAccent.copy(alpha = 0.08f))
                    .clickable { repo.requestSync() }
                    .padding(vertical = 5.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Icon(
                    Icons.Filled.Sync,
                    contentDescription = null,
                    tint = themeAccent,
                    modifier = Modifier.size(10.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Synchroniser", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = themeAccent)
            }
        }

        // Bottle visual
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(88.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 70.dp, height = 80.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .border(2.dp, accent.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                ) {
                    // Fill
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(fillPct)
                            .align(Alignment.BottomCenter)
                            .background(accent.copy(alpha = 0.25f))
                    )
                    // Value
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "${repo.hydrationCurrent}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (goalReached) Green else colors.textPrimary
                        )
                        Text("ml", fontSize = 7.sp, color = colors.textPrimary.copy(alpha = 0.7f))
                    }
                }
            }
        }

        // Progress text
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    "%.1f".format(repo.hydrationCurrent / 1000f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (goalReached) Green else colors.textPrimary
                )
                Text("L", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = colors.textSecondary)
                Text(" / ", fontSize = 10.sp, color = colors.textSecondary)
                Text(
                    "%.1f".format(repo.hydrationGoal / 1000f),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textSecondary
                )
                Text("L", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = colors.textSecondary)
            }
        }

        // Progress bar
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .padding(horizontal = 4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(accent.copy(alpha = 0.1f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fillPct)
                        .clip(RoundedCornerShape(2.dp))
                        .background(accent)
                )
            }
        }

        // Percentage
        item {
            Text(
                "${(fillPct * 100).toInt()}%",
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = accent,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // Quick buttons
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
            ) {
                listOf(250, 500).forEach { amount ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.dp, accent.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                            .clickable { repo.addHydration(amount) }
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("+${amount}ml", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = accent)
                    }
                }
            }
        }
    }
}
