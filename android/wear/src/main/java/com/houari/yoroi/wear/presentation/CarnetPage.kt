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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material3.Text
import com.houari.yoroi.wear.data.YoroiDataRepository
import com.houari.yoroi.wear.theme.*

// ============================================================
// Exercise template data (matches iOS watch + phone templates)
// ============================================================

data class ExerciseTemplate(
    val id: String,
    val name: String,
    val muscleGroup: String,
    val category: String,
    val unit: String
)

data class MuscleGroup(
    val name: String,
    val icon: ImageVector,
    val color: Color,
    val exerciseCount: Int
)

private val exerciseLibrary = listOf(
    // Pectoraux
    ExerciseTemplate("dc", "Developpe couche", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("di", "Developpe incline", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("dd", "Developpe decline", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("dc_halt", "Developpe couche halteres", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("di_halt", "Developpe incline halteres", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("dips_pec", "Dips pectoraux", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("ecarte", "Ecarte halteres", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("ecarte_inc", "Ecarte incline", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("pec_deck", "Pec deck (butterfly)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("cable_cross", "Cable crossover", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("pompes", "Pompes", "Pectoraux", "Musculation", "reps"),
    ExerciseTemplate("pompes_dia", "Pompes diamant", "Pectoraux", "Musculation", "reps"),
    ExerciseTemplate("pullover", "Pullover", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("smith_bench", "Smith machine couche", "Pectoraux", "Musculation", "kg"),
    // Dos
    ExerciseTemplate("tractions", "Tractions", "Dos", "Musculation", "reps"),
    ExerciseTemplate("tractions_l", "Tractions lestees", "Dos", "Musculation", "kg"),
    ExerciseTemplate("tractions_s", "Tractions supination", "Dos", "Musculation", "reps"),
    ExerciseTemplate("rowing_barre", "Rowing barre", "Dos", "Musculation", "kg"),
    ExerciseTemplate("rowing_halt", "Rowing haltere", "Dos", "Musculation", "kg"),
    ExerciseTemplate("rowing_t", "Rowing T-bar", "Dos", "Musculation", "kg"),
    ExerciseTemplate("tirage_vert", "Tirage vertical", "Dos", "Musculation", "kg"),
    ExerciseTemplate("tirage_hor", "Tirage horizontal", "Dos", "Musculation", "kg"),
    ExerciseTemplate("tirage_serr", "Tirage prise serree", "Dos", "Musculation", "kg"),
    ExerciseTemplate("sdt", "Souleve de terre", "Dos", "Musculation", "kg"),
    ExerciseTemplate("sdt_roum", "Souleve de terre roumain", "Dos", "Musculation", "kg"),
    ExerciseTemplate("sdt_sumo", "Souleve de terre sumo", "Dos", "Musculation", "kg"),
    ExerciseTemplate("good_morning", "Good morning", "Dos", "Musculation", "kg"),
    ExerciseTemplate("pulldown", "Pulldown", "Dos", "Musculation", "kg"),
    ExerciseTemplate("meadow_row", "Meadows row", "Dos", "Musculation", "kg"),
    ExerciseTemplate("hyper_ext", "Hyperextension", "Dos", "Musculation", "reps"),
    // Epaules
    ExerciseTemplate("dev_mil", "Developpe militaire", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("dev_halt", "Developpe halteres assis", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("arnold", "Arnold press", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("elev_lat", "Elevations laterales", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("elev_lat_c", "Elevations laterales cable", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("elev_front", "Elevations frontales", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("oiseau", "Oiseau (rear delt fly)", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("oiseau_mach", "Reverse pec deck", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("face_pull", "Face pull", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("shrug", "Shrugs halteres", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("shrug_bar", "Shrugs barre", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("upright_row", "Rowing menton", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("push_press", "Push press", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("landmine_pr", "Landmine press", "Epaules", "Musculation", "kg"),
    // Bras
    ExerciseTemplate("curl_bic", "Curl biceps barre", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_halt", "Curl halteres", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_mart", "Curl marteau", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_ez", "Curl barre EZ", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_inc", "Curl incline", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_conc", "Curl concentration", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_larry", "Larry Scott curl", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_cable", "Curl cable", "Bras", "Musculation", "kg"),
    ExerciseTemplate("ext_tri", "Extension triceps poulie", "Bras", "Musculation", "kg"),
    ExerciseTemplate("ext_tri_co", "Extension triceps corde", "Bras", "Musculation", "kg"),
    ExerciseTemplate("dips_tri", "Dips triceps", "Bras", "Musculation", "kg"),
    ExerciseTemplate("skull", "Skull crusher", "Bras", "Musculation", "kg"),
    ExerciseTemplate("kickback", "Kickback triceps", "Bras", "Musculation", "kg"),
    ExerciseTemplate("ext_over", "Extension overhead", "Bras", "Musculation", "kg"),
    ExerciseTemplate("barre_front", "Barre au front", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl_avant", "Curl avant-bras", "Bras", "Musculation", "kg"),
    // Jambes
    ExerciseTemplate("squat", "Squat barre", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("squat_front", "Front squat", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("squat_gob", "Goblet squat", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("squat_bulg", "Bulgarian split squat", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("squat_sumo", "Squat sumo", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("presse", "Presse a cuisses", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("presse_45", "Presse 45 degres", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hack_squat", "Hack squat", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("fentes", "Fentes", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("fentes_mar", "Fentes marchees", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("leg_ext", "Leg extension", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("leg_curl", "Leg curl", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("leg_curl_d", "Leg curl debout", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hip_thrust", "Hip thrust", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hip_abd", "Hip abduction machine", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hip_add", "Hip adduction machine", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("mollets", "Mollets debout", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("mollets_a", "Mollets assis", "Jambes", "Musculation", "kg"),
    // Abdos
    ExerciseTemplate("crunch", "Crunch", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("crunch_cable", "Crunch cable", "Abdos", "Musculation", "kg"),
    ExerciseTemplate("planche", "Gainage planche", "Abdos", "Musculation", "time"),
    ExerciseTemplate("planche_lat", "Gainage lateral", "Abdos", "Musculation", "time"),
    ExerciseTemplate("releve_j", "Releve de jambes", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("releve_j_s", "Releve de jambes suspendu", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("russian", "Russian twist", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("ab_wheel", "Ab wheel rollout", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("dragon_flag", "Dragon flag", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("sit_up", "Sit-up", "Abdos", "Musculation", "reps"),
    // Olympique
    ExerciseTemplate("clean", "Clean (epauler)", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("clean_jerk", "Clean & Jerk", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("snatch", "Snatch (arrache)", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("power_clean", "Power clean", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("power_snatch", "Power snatch", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("hang_clean", "Hang clean", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("hang_snatch", "Hang snatch", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("jerk", "Jerk (epauler-jeter)", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("thruster", "Thruster", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("overhead_sq", "Overhead squat", "Olympique", "Halterophilie", "kg"),
    // CrossFit
    ExerciseTemplate("cf_fran", "Fran (21-15-9)", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cf_grace", "Grace (30 C&J)", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cf_isabel", "Isabel (30 Snatch)", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cf_helen", "Helen", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cf_diane", "Diane", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cf_jackie", "Jackie", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cf_murph", "Murph", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cf_cindy", "Cindy (AMRAP 20)", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_burpee", "Burpees", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_box_jump", "Box jumps", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_du", "Double unders", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_mu", "Muscle-ups", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_ring_mu", "Ring muscle-ups", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_hspu", "Handstand push-ups", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_t2b", "Toes to bar", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_kbs", "Kettlebell swing", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("cf_kb_snatch", "Kettlebell snatch", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("cf_wall_walk", "Wall walks", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_pistol", "Pistol squat", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("cf_rope_climb", "Rope climb", "CrossFit", "CrossFit", "reps"),
    // Hyrox
    ExerciseTemplate("hyrox_full", "HYROX complet", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("skierg", "SkiErg 1000m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("sled_push", "Sled Push 50m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("sled_pull", "Sled Pull 50m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("burpee_bj", "Burpee Broad Jump 80m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox_row", "Rowing 1000m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("farmers", "Farmers Carry 200m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("sandbag", "Sandbag Lunges 100m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("wall_ball", "Wall Balls 100x", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox_run", "HYROX Run 1km", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox_pro", "HYROX Pro complet", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox_doubles", "HYROX Doubles", "Hyrox", "Hyrox", "time"),
    // Running
    ExerciseTemplate("run_400", "400m", "Running", "Running", "time"),
    ExerciseTemplate("run_800", "800m", "Running", "Running", "time"),
    ExerciseTemplate("run_1k", "1 km", "Running", "Running", "time"),
    ExerciseTemplate("run_1500", "1500m", "Running", "Running", "time"),
    ExerciseTemplate("run_3k", "3 km", "Running", "Running", "time"),
    ExerciseTemplate("run_5k", "5 km", "Running", "Running", "time"),
    ExerciseTemplate("run_10k", "10 km", "Running", "Running", "time"),
    ExerciseTemplate("run_15k", "15 km", "Running", "Running", "time"),
    ExerciseTemplate("run_semi", "Semi-marathon", "Running", "Running", "time"),
    ExerciseTemplate("run_mara", "Marathon", "Running", "Running", "time"),
    ExerciseTemplate("run_ultra", "Ultra-trail", "Running", "Running", "time"),
    ExerciseTemplate("run_cooper", "Test Cooper 12min", "Running", "Running", "km"),
    // Cardio
    ExerciseTemplate("rameur_500", "Rameur 500m", "Cardio", "Cardio", "time"),
    ExerciseTemplate("rameur_1k", "Rameur 1000m", "Cardio", "Cardio", "time"),
    ExerciseTemplate("rameur_2k", "Rameur 2000m", "Cardio", "Cardio", "time"),
    ExerciseTemplate("rameur_5k", "Rameur 5000m", "Cardio", "Cardio", "time"),
    ExerciseTemplate("assault", "Assault Bike (cal)", "Cardio", "Cardio", "time"),
    ExerciseTemplate("echo_bike", "Echo Bike (cal)", "Cardio", "Cardio", "time"),
    ExerciseTemplate("velo_int", "Velo interieur", "Cardio", "Cardio", "time"),
    ExerciseTemplate("skierg_gen", "SkiErg", "Cardio", "Cardio", "time"),
    ExerciseTemplate("elliptique", "Elliptique", "Cardio", "Cardio", "time"),
    ExerciseTemplate("stairmaster", "Stairmaster", "Cardio", "Cardio", "time"),
    ExerciseTemplate("corde", "Corde a sauter", "Cardio", "Cardio", "reps"),
    ExerciseTemplate("battle_rope", "Battle ropes", "Cardio", "Cardio", "time"),
    ExerciseTemplate("tapis", "Tapis de course", "Cardio", "Cardio", "time"),
    ExerciseTemplate("natation", "Natation", "Cardio", "Cardio", "time"),
    // Combat
    ExerciseTemplate("sac_round", "Sac de frappe (rounds)", "Combat", "Combat", "time"),
    ExerciseTemplate("sparring", "Sparring", "Combat", "Combat", "time"),
    ExerciseTemplate("shadow", "Shadow boxing", "Combat", "Combat", "time"),
    ExerciseTemplate("pads", "Pattes d'ours", "Combat", "Combat", "time"),
    ExerciseTemplate("randori", "Randori (judo/jjb)", "Combat", "Combat", "time"),
    ExerciseTemplate("rolling", "Rolling (jjb)", "Combat", "Combat", "time"),
    ExerciseTemplate("combat_cond", "Conditioning combat", "Combat", "Combat", "time"),
    ExerciseTemplate("kata", "Kata", "Combat", "Combat", "reps"),
    ExerciseTemplate("clinch", "Clinch work", "Combat", "Combat", "time"),
    ExerciseTemplate("takedown", "Takedown drill", "Combat", "Combat", "reps"),
    // Strongman
    ExerciseTemplate("atlas_stone", "Atlas stones", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("log_press", "Log press", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("yoke_walk", "Yoke walk", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("tire_flip", "Tire flip", "Strongman", "Strongman", "reps"),
    ExerciseTemplate("axle_press", "Axle press", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("car_deadlift", "Car deadlift", "Strongman", "Strongman", "reps"),
    ExerciseTemplate("sandbag_carry", "Sandbag carry", "Strongman", "Strongman", "time"),
    ExerciseTemplate("keg_toss", "Keg toss", "Strongman", "Strongman", "reps"),
)

private fun exercisesFor(group: String) = exerciseLibrary.filter { it.muscleGroup == group }

private val muscleGroups = listOf(
    MuscleGroup("Pectoraux", Icons.Filled.FitnessCenter, Color(0xFFEF4444), 14),
    MuscleGroup("Dos", Icons.Filled.FitnessCenter, Color(0xFF3B82F6), 16),
    MuscleGroup("Epaules", Icons.Filled.FitnessCenter, Color(0xFFF59E0B), 14),
    MuscleGroup("Bras", Icons.Filled.FitnessCenter, Color(0xFFEC4899), 16),
    MuscleGroup("Jambes", Icons.Filled.FitnessCenter, Color(0xFF10B981), 18),
    MuscleGroup("Abdos", Icons.Filled.FitnessCenter, Color(0xFF8B5CF6), 10),
    MuscleGroup("Olympique", Icons.Filled.FitnessCenter, Color(0xFFDC2626), 10),
    MuscleGroup("CrossFit", Icons.Filled.LocalFireDepartment, Color(0xFFF59E0B), 20),
    MuscleGroup("Hyrox", Icons.Filled.LocalFireDepartment, Color(0xFFD97706), 12),
    MuscleGroup("Running", Icons.Filled.Timer, Color(0xFF3B82F6), 12),
    MuscleGroup("Cardio", Icons.Filled.Timer, Color(0xFF06B6D4), 14),
    MuscleGroup("Combat", Icons.Filled.SportsKabaddi, Color(0xFF8B5CF6), 10),
    MuscleGroup("Strongman", Icons.Filled.FitnessCenter, Color(0xFFB91C1C), 8),
)

// ============================================================
// CARNET PAGE - Entry point (muscle groups list)
// ============================================================

@Composable
fun CarnetPage(repo: YoroiDataRepository) {
    val accent = remember(repo.themeAccentHex) { parseHexColor(repo.themeAccentHex) }
    val colors = rememberSyncedWatchColors(
        bgHex = repo.themeBgHex, cardBgHex = repo.themeCardBgHex,
        textPrimaryHex = repo.themeTextPrimaryHex, textSecondaryHex = repo.themeTextSecondaryHex,
        dividerHex = repo.themeDividerHex, textOnAccentHex = repo.themeTextOnAccentHex,
        isDarkMode = repo.isDarkMode
    )

    var selectedGroup by remember { mutableStateOf<String?>(null) }
    var selectedExercise by remember { mutableStateOf<ExerciseTemplate?>(null) }

    when {
        selectedExercise != null -> {
            AddEntryScreen(
                exercise = selectedExercise!!,
                repo = repo,
                accent = accent,
                colors = colors,
                onDone = { selectedExercise = null }
            )
        }
        selectedGroup != null -> {
            ExerciseListScreen(
                group = selectedGroup!!,
                accent = accent,
                colors = colors,
                onSelect = { selectedExercise = it },
                onBack = { selectedGroup = null }
            )
        }
        else -> {
            MuscleGroupsScreen(
                accent = accent,
                colors = colors,
                onSelect = { selectedGroup = it }
            )
        }
    }
}

// ============================================================
// MUSCLE GROUPS SCREEN
// ============================================================

@Composable
private fun MuscleGroupsScreen(
    accent: Color,
    colors: YoroiWatchColors,
    onSelect: (String) -> Unit
) {
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        item {
            Text(
                "CARNET",
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                color = accent,
                letterSpacing = 2.sp,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
        }

        items(muscleGroups) { group ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(colors.cardBg)
                    .clickable { onSelect(group.name) }
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(24.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(group.color.copy(alpha = 0.15f))
                ) {
                    androidx.compose.material3.Icon(
                        group.icon,
                        contentDescription = null,
                        tint = group.color,
                        modifier = Modifier.size(13.dp)
                    )
                }
                Spacer(Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        group.name,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary
                    )
                    Text(
                        "${group.exerciseCount} exercices",
                        fontSize = 8.sp,
                        color = colors.textSecondary
                    )
                }
                androidx.compose.material3.Icon(
                    Icons.Filled.ChevronRight,
                    contentDescription = null,
                    tint = colors.textSecondary.copy(alpha = 0.5f),
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}

// ============================================================
// EXERCISE LIST SCREEN
// ============================================================

@Composable
private fun ExerciseListScreen(
    group: String,
    accent: Color,
    colors: YoroiWatchColors,
    onSelect: (ExerciseTemplate) -> Unit,
    onBack: () -> Unit
) {
    val exercises = remember(group) { exercisesFor(group) }

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onBack() }
                    .padding(bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.Icon(
                    Icons.Filled.ArrowBack,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    group.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = accent,
                    letterSpacing = 1.sp
                )
            }
        }

        items(exercises) { exercise ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.cardBg)
                    .clickable { onSelect(exercise) }
                    .padding(horizontal = 8.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        exercise.name,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        when (exercise.unit) {
                            "kg" -> "Poids (kg)"
                            "reps" -> "Repetitions"
                            "time" -> "Temps"
                            "km" -> "Distance (km)"
                            else -> exercise.unit
                        },
                        fontSize = 8.sp,
                        color = colors.textSecondary
                    )
                }
                androidx.compose.material3.Icon(
                    Icons.Filled.AddCircle,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

// ============================================================
// ADD ENTRY SCREEN
// ============================================================

@Composable
private fun AddEntryScreen(
    exercise: ExerciseTemplate,
    repo: YoroiDataRepository,
    accent: Color,
    colors: YoroiWatchColors,
    onDone: () -> Unit
) {
    var value by remember { mutableStateOf(0.0) }
    var reps by remember { mutableStateOf(5) }
    var rpe by remember { mutableStateOf(7) }
    var timeMinutes by remember { mutableStateOf(0) }
    var timeSeconds by remember { mutableStateOf(0) }
    var saved by remember { mutableStateOf(false) }

    val catColor = when (exercise.category.lowercase()) {
        "musculation" -> Color(0xFFEF4444)
        "running" -> Color(0xFF3B82F6)
        "cardio" -> Color(0xFF10B981)
        "hyrox" -> Color(0xFFF59E0B)
        "crossfit" -> Color(0xFFF59E0B)
        "halterophilie" -> Color(0xFFDC2626)
        "combat" -> Color(0xFF8B5CF6)
        "strongman" -> Color(0xFFB91C1C)
        else -> accent
    }

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Title
        item {
            Text(
                exercise.name.uppercase(),
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                color = catColor,
                letterSpacing = 1.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }

        // Value input
        item {
            when (exercise.unit) {
                "kg", "lbs" -> {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(exercise.unit.uppercase(), fontSize = 8.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                        Text("%.1f".format(value), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFFEF4444).copy(alpha = 0.2f)).clickable { value = (value - 2.5).coerceAtLeast(0.0) }
                            ) {
                                androidx.compose.material3.Icon(Icons.Filled.Remove, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                            }
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFF10B981).copy(alpha = 0.2f)).clickable { value += 2.5 }
                            ) {
                                androidx.compose.material3.Icon(Icons.Filled.Add, null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
                "reps" -> {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("REPETITIONS", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                        Text("${value.toInt()}", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFFEF4444).copy(alpha = 0.2f)).clickable { value = (value - 1).coerceAtLeast(0.0) }
                            ) {
                                androidx.compose.material3.Icon(Icons.Filled.Remove, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                            }
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFF10B981).copy(alpha = 0.2f)).clickable { value += 1.0 }
                            ) {
                                androidx.compose.material3.Icon(Icons.Filled.Add, null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
                "time" -> {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("TEMPS", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(Modifier.size(20.dp).clickable { timeMinutes++ }, contentAlignment = Alignment.Center) {
                                    androidx.compose.material3.Icon(Icons.Filled.KeyboardArrowUp, null, tint = colors.textSecondary, modifier = Modifier.size(16.dp))
                                }
                                Text("%02d".format(timeMinutes), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Box(Modifier.size(20.dp).clickable { timeMinutes = (timeMinutes - 1).coerceAtLeast(0) }, contentAlignment = Alignment.Center) {
                                    androidx.compose.material3.Icon(Icons.Filled.KeyboardArrowDown, null, tint = colors.textSecondary, modifier = Modifier.size(16.dp))
                                }
                            }
                            Text(":", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(Modifier.size(20.dp).clickable { timeSeconds = (timeSeconds + 5).coerceAtMost(59) }, contentAlignment = Alignment.Center) {
                                    androidx.compose.material3.Icon(Icons.Filled.KeyboardArrowUp, null, tint = colors.textSecondary, modifier = Modifier.size(16.dp))
                                }
                                Text("%02d".format(timeSeconds), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Box(Modifier.size(20.dp).clickable { timeSeconds = (timeSeconds - 5).coerceAtLeast(0) }, contentAlignment = Alignment.Center) {
                                    androidx.compose.material3.Icon(Icons.Filled.KeyboardArrowDown, null, tint = colors.textSecondary, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }
                else -> {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(exercise.unit.uppercase(), fontSize = 8.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                        Text("%.1f".format(value), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFFEF4444).copy(alpha = 0.2f)).clickable { value = (value - 1).coerceAtLeast(0.0) }
                            ) {
                                androidx.compose.material3.Icon(Icons.Filled.Remove, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                            }
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFF10B981).copy(alpha = 0.2f)).clickable { value += 1.0 }
                            ) {
                                androidx.compose.material3.Icon(Icons.Filled.Add, null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }

        // Reps (for kg exercises)
        if (exercise.unit == "kg" || exercise.unit == "lbs") {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Reps:", fontSize = 11.sp, color = colors.textSecondary)
                    Spacer(Modifier.weight(1f))
                    Box(Modifier.size(20.dp).clickable { reps = (reps - 1).coerceAtLeast(1) }, contentAlignment = Alignment.Center) {
                        androidx.compose.material3.Icon(Icons.Filled.Remove, null, tint = colors.textSecondary, modifier = Modifier.size(14.dp))
                    }
                    Text("$reps", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary, modifier = Modifier.width(30.dp), textAlign = TextAlign.Center)
                    Box(Modifier.size(20.dp).clickable { reps++ }, contentAlignment = Alignment.Center) {
                        androidx.compose.material3.Icon(Icons.Filled.Add, null, tint = colors.textSecondary, modifier = Modifier.size(14.dp))
                    }
                }
            }
        }

        // RPE
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("RPE", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                Spacer(Modifier.height(2.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    listOf(6, 7, 8, 9, 10).forEach { r ->
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(22.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (rpe == r) catColor else colors.cardBg)
                                .clickable { rpe = r }
                        ) {
                            Text(
                                "$r",
                                fontSize = 10.sp,
                                fontWeight = if (rpe == r) FontWeight.Bold else FontWeight.Normal,
                                color = if (rpe == r) colors.textOnAccent else colors.textPrimary
                            )
                        }
                    }
                }
            }
        }

        // Save button
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (saved) Color(0xFF10B981) else catColor)
                    .clickable {
                        if (!saved) {
                            val finalValue = if (exercise.unit == "time") {
                                (timeMinutes * 60 + timeSeconds).toDouble()
                            } else {
                                value
                            }
                            repo.addBenchmarkEntry(exercise.id, exercise.name, finalValue, reps, rpe)
                            saved = true
                        }
                    }
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (saved) {
                    androidx.compose.material3.Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Envoye!", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                } else {
                    Text("Enregistrer", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }

        // Back button after save
        if (saved) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(colors.cardBg)
                        .clickable { onDone() }
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text("Retour", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textSecondary)
                }
            }
        }
    }
}
