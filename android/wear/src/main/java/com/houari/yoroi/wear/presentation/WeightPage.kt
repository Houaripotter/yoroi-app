package com.houari.yoroi.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
 * Page 2: Poids - Arc de progression + stats + log
 * Identique a WeightPage.swift de l'Apple Watch
 */
@Composable
fun WeightPage(repo: YoroiDataRepository) {
    val diff = if (repo.targetWeight > 0) repo.currentWeight - repo.targetWeight else 0.0
    val remaining = kotlin.math.abs(diff)
    val goalLabel = if (diff > 0) "SECHE" else if (diff < 0) "PRISE" else "MAINTIEN"

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Header
        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 2.dp)) {
                androidx.compose.material3.Icon(
                    Icons.Filled.FitnessCenter,
                    contentDescription = null,
                    tint = Gold,
                    modifier = Modifier.size(10.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Poids", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary.copy(alpha = 0.7f))
                Spacer(Modifier.weight(1f))
                Text(
                    goalLabel,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Gold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Gold.copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }

        // Poids principal
        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        if (repo.currentWeight > 0) "%.1f".format(repo.currentWeight) else "--",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = TextPrimary
                    )
                    Spacer(Modifier.width(2.dp))
                    Text(
                        "kg",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextSecondary,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }
                if (repo.targetWeight > 0) {
                    Text(
                        if (diff > 0) "-%.1f kg restant".format(remaining)
                        else if (diff < 0) "+%.1f kg restant".format(remaining)
                        else "Objectif atteint",
                        fontSize = 8.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextSecondary
                    )
                }
            }
        }

        // Stats row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatCol(
                    label = "OBJECTIF",
                    value = if (repo.targetWeight > 0) "%.1f".format(repo.targetWeight) else "--",
                    unit = "kg",
                    color = Gold
                )
                Box(
                    Modifier
                        .width(1.dp)
                        .height(28.dp)
                        .background(Divider)
                )
                StatCol(
                    label = "RESTE",
                    value = if (repo.targetWeight > 0) "%.1f".format(remaining) else "--",
                    unit = "kg",
                    color = if (diff > 0) Red else Green
                )
            }
        }

        // Log button
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(Gold.copy(alpha = 0.1f))
                    .border(1.dp, Gold.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                    .padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Icon(
                    Icons.Filled.Add,
                    contentDescription = null,
                    tint = Gold,
                    modifier = Modifier.size(10.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Logger poids", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Gold)
            }
        }
    }
}

@Composable
private fun StatCol(label: String, value: String, unit: String, color: androidx.compose.ui.graphics.Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 7.sp, fontWeight = FontWeight.ExtraBold, color = color, letterSpacing = 0.5.sp)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Spacer(Modifier.width(1.dp))
            Text(unit, fontSize = 7.sp, color = TextSecondary, modifier = Modifier.padding(bottom = 1.dp))
        }
    }
}
