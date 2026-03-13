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
    // Pectoraux (20)
    ExerciseTemplate("bench-press", "Développé Couché (Barre)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("incline-bench-press", "Développé Incliné (Barre)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("decline-bench-press", "Développé Décliné (Barre)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("dumbbell-bench-press", "Développé Haltères", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("incline-dumbbell-press", "Développé Haltères Incliné", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("decline-dumbbell-press", "Développé Haltères Décliné", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("chest-fly", "Ecarté Couché (Haltères)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("incline-fly", "Ecarté Incliné (Haltères)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("cable-crossover", "Croisé Câble Haut", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("cable-crossover-low", "Croisé Câble Bas", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("cable-crossover-mid", "Croisé Câble Milieu", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("chest-press-machine-pec", "Chest Press Machine", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("pec-deck", "Pec Deck (Butterfly)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("dips-chest", "Dips (Focus Pectoraux)", "Pectoraux", "Musculation", "reps"),
    ExerciseTemplate("weighted-push-up", "Pompes Lestées", "Pectoraux", "Musculation", "reps"),
    ExerciseTemplate("pullover-dumbbell", "Pull-Over Haltère", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("floor-press", "Développé Sol (Floor Press)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("svend-press", "Compression Pecto (Svend Press)", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("landmine-press-chest", "Landmine Press", "Pectoraux", "Musculation", "kg"),
    ExerciseTemplate("push-up-standard", "Pompes (Poids de Corps)", "Pectoraux", "Musculation", "reps"),
    // Dos (22)
    ExerciseTemplate("deadlift", "Soulevé de Terre", "Dos", "Musculation", "kg"),
    ExerciseTemplate("deadlift-romanian", "Deadlift Roumain", "Dos", "Musculation", "kg"),
    ExerciseTemplate("deadlift-sumo", "Deadlift Sumo", "Dos", "Musculation", "kg"),
    ExerciseTemplate("pull-up", "Tractions Pronation", "Dos", "Musculation", "reps"),
    ExerciseTemplate("pull-up-supination", "Tractions Supination", "Dos", "Musculation", "reps"),
    ExerciseTemplate("pull-up-wide", "Tractions Larges", "Dos", "Musculation", "reps"),
    ExerciseTemplate("pull-up-neutral", "Tractions Prises Neutres", "Dos", "Musculation", "reps"),
    ExerciseTemplate("lat-pulldown", "Tirage Poulie Haute", "Dos", "Musculation", "kg"),
    ExerciseTemplate("lat-pulldown-close", "Tirage Serré V-Bar", "Dos", "Musculation", "kg"),
    ExerciseTemplate("lat-pulldown-neck", "Tirage Nuque", "Dos", "Musculation", "kg"),
    ExerciseTemplate("lat-pulldown-unilateral", "Tirage Unilatéral", "Dos", "Musculation", "kg"),
    ExerciseTemplate("barbell-row", "Rowing Barre", "Dos", "Musculation", "kg"),
    ExerciseTemplate("pendlay-row", "Rowing Pendlay", "Dos", "Musculation", "kg"),
    ExerciseTemplate("dumbbell-row", "Rowing Haltère (One Arm)", "Dos", "Musculation", "kg"),
    ExerciseTemplate("seated-cable-row", "Rowing Câble Assis", "Dos", "Musculation", "kg"),
    ExerciseTemplate("t-bar-row", "Rowing T-Bar", "Dos", "Musculation", "kg"),
    ExerciseTemplate("seal-row", "Rowing Plat-Ventre (Seal Row)", "Dos", "Musculation", "kg"),
    ExerciseTemplate("chest-supported-row", "Rowing Soutenu (Banc)", "Dos", "Musculation", "kg"),
    ExerciseTemplate("low-row-machine-dos", "Low Row Machine", "Dos", "Musculation", "kg"),
    ExerciseTemplate("face-pull", "Tirage Visage (Face Pull)", "Dos", "Musculation", "kg"),
    ExerciseTemplate("hyperextensions", "Hyperextensions", "Dos", "Musculation", "reps"),
    ExerciseTemplate("good-morning", "Inclinaison Barre (Good Morning)", "Dos", "Musculation", "kg"),
    // Epaules (16)
    ExerciseTemplate("military-press", "Développé Militaire (Barre)", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("dumbbell-shoulder-press", "Développé Haltères Assis", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("dumbbell-shoulder-press-stand", "Développé Haltères Debout", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("arnold-press", "Arnold Press", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("lateral-raise", "Elévations Latérales", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("cable-lateral-raise", "Elévations Latérales Câble", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("lateral-raise-machine", "Elévations Latérales Machine", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("front-raise", "Elévations Frontales", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("rear-delt-fly", "Oiseau (Deltoïdes Postérieurs)", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("rear-delt-machine", "Oiseau Machine", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("upright-row", "Rowing Menton", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("shoulder-press-machine", "Développé Epaules Machine", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("bradford-press", "Bradford Press", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("w-raise", "W-Raise (YTW)", "Epaules", "Musculation", "kg"),
    ExerciseTemplate("band-pull-apart", "Ecartement Elastique (Band Pull-Apart)", "Epaules", "Musculation", "reps"),
    ExerciseTemplate("pike-push-up", "Pompes Pike", "Epaules", "Musculation", "reps"),
    // Bras (18)
    ExerciseTemplate("barbell-curl", "Curl Barre", "Bras", "Musculation", "kg"),
    ExerciseTemplate("dumbbell-curl", "Curl Haltères", "Bras", "Musculation", "kg"),
    ExerciseTemplate("hammer-curl", "Curl Marteau", "Bras", "Musculation", "kg"),
    ExerciseTemplate("preacher-curl", "Curl Pupitre (Larry Scott)", "Bras", "Musculation", "kg"),
    ExerciseTemplate("concentration-curl", "Curl Concentré", "Bras", "Musculation", "kg"),
    ExerciseTemplate("cable-curl", "Curl Câble Bas", "Bras", "Musculation", "kg"),
    ExerciseTemplate("incline-curl", "Curl Incliné (Haltères)", "Bras", "Musculation", "kg"),
    ExerciseTemplate("spider-curl", "Curl Araignée (Spider Curl)", "Bras", "Musculation", "kg"),
    ExerciseTemplate("reverse-curl", "Curl Inversé (Pronation)", "Bras", "Musculation", "kg"),
    ExerciseTemplate("tricep-pushdown", "Extension Triceps Poulie", "Bras", "Musculation", "kg"),
    ExerciseTemplate("tricep-pushdown-rope", "Extension Triceps Corde", "Bras", "Musculation", "kg"),
    ExerciseTemplate("skull-crusher", "Barre au Front (Skull Crusher)", "Bras", "Musculation", "kg"),
    ExerciseTemplate("close-grip-bench-press", "Développé Serré (Triceps)", "Bras", "Musculation", "kg"),
    ExerciseTemplate("overhead-tricep-extension", "Extension Triceps Nuque", "Bras", "Musculation", "kg"),
    ExerciseTemplate("dips-triceps", "Dips (Focus Triceps)", "Bras", "Musculation", "reps"),
    ExerciseTemplate("tricep-kickback", "Kickback Triceps", "Bras", "Musculation", "kg"),
    ExerciseTemplate("wrist-curl", "Curl Poignets", "Bras", "Musculation", "kg"),
    ExerciseTemplate("curl-21s", "21s Biceps", "Bras", "Musculation", "kg"),
    // Jambes (20)
    ExerciseTemplate("squat", "Squat (Barre)", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("front-squat", "Squat Avant", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hack-squat", "Hack Squat (Machine)", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("goblet-squat", "Squat Coupe (Goblet Squat)", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("box-squat", "Squat sur Boîte (Box Squat)", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("bulgarian-split-squat", "Squat Bulgare", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("leg-press", "Presse à Cuisses", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("lunges", "Fentes Avant", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("reverse-lunges", "Fentes Arrière", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("walking-lunges", "Fentes Marchées", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("leg-extension", "Leg Extension", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("leg-curl", "Leg Curl Allongé", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("leg-curl-seated", "Leg Curl Assis", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("standing-calf-raise", "Mollets Debout", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("seated-calf-raise", "Mollets Assis", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hip-thrust", "Poussée de Hanche (Hip Thrust)", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("glute-kickback", "Glute Kickback Câble", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hip-abductor", "Abducteur Machine", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("hip-adductor", "Adducteur Machine", "Jambes", "Musculation", "kg"),
    ExerciseTemplate("nordic-curl", "Curl Nordique (Ischio)", "Jambes", "Musculation", "reps"),
    // Abdos (14)
    ExerciseTemplate("crunch", "Crunch", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("crunch-decline", "Crunch Décliné", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("sit-up", "Sit-Up", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("plank", "Gainage (Planche)", "Abdos", "Musculation", "time"),
    ExerciseTemplate("side-plank", "Gainage Latéral", "Abdos", "Musculation", "time"),
    ExerciseTemplate("ab-wheel", "Roue Abdominale", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("hanging-leg-raise", "Relevé de Jambes Suspendu", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("hanging-knee-raise", "Relevé de Genoux Suspendu", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("russian-twist", "Rotation Russe", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("cable-crunch", "Crunch Câble", "Abdos", "Musculation", "kg"),
    ExerciseTemplate("bicycle-crunch", "Crunch Vélo", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("dragon-flag", "Dragon Flag", "Abdos", "Musculation", "reps"),
    ExerciseTemplate("pallof-press", "Pallof Press", "Abdos", "Musculation", "kg"),
    ExerciseTemplate("dead-bug", "Gainage Sol (Dead Bug)", "Abdos", "Musculation", "reps"),
    // Machines (12)
    ExerciseTemplate("chest-press-machine", "Presse Pectoraux Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("shoulder-press-machine-m", "Développé Epaules Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("lat-pulldown-machine", "Tirage Dorsal Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("low-row-machine", "Rowing Bas Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("leg-press-machine", "Presse Jambes Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("leg-extension-machine", "Leg Extension Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("leg-curl-machine", "Leg Curl Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("hip-abductor-m", "Abducteur Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("hip-adductor-m", "Adducteur Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("back-extension-machine", "Extension Lombaires", "Machines", "Musculation", "kg"),
    ExerciseTemplate("curl-machine", "Curl Biceps Machine", "Machines", "Musculation", "kg"),
    ExerciseTemplate("tricep-machine", "Extension Triceps Machine", "Machines", "Musculation", "kg"),
    // Olympique (12)
    ExerciseTemplate("snatch", "Arraché", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("clean-and-jerk", "Epaulé-Jeté", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("power-clean", "Power Clean", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("hang-clean", "Hang Clean", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("hang-snatch", "Hang Snatch", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("power-snatch", "Power Snatch", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("push-press", "Push Press", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("push-jerk", "Push Jerk", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("split-jerk", "Split Jerk", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("clean-pull", "Tirage Epaulé", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("block-clean", "Clean sur Blocs", "Olympique", "Halterophilie", "kg"),
    ExerciseTemplate("snatch-squat", "Squat Arraché", "Olympique", "Halterophilie", "kg"),
    // Strongman (12)
    ExerciseTemplate("atlas-stone", "Pierre d'Atlas (Atlas Stone)", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("tire-flip", "Retournement de Pneu (Tire Flip)", "Strongman", "Strongman", "reps"),
    ExerciseTemplate("farmers-walk", "Marche du Fermier (Farmers Walk)", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("log-press", "Développé à la Bûche (Log Press)", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("yoke-walk", "Marche au Joug (Yoke Walk)", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("keg-toss", "Lancer de Tonneau", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("axle-deadlift", "Deadlift Axle", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("conan-wheel", "Roue de Conan", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("sandbag-carry", "Portée Sac de Sable", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("viking-press", "Viking Press", "Strongman", "Strongman", "kg"),
    ExerciseTemplate("arm-over-arm-pull", "Tirage Bras-sur-Bras", "Strongman", "Strongman", "time"),
    ExerciseTemplate("car-deadlift", "Deadlift Voiture", "Strongman", "Strongman", "kg"),
    // CrossFit WODs (20)
    ExerciseTemplate("murph", "Murph", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("fran", "Fran", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("cindy", "Cindy", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("grace", "Grace", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("helen", "Helen", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("annie", "Annie", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("karen", "Karen", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("jackie", "Jackie", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("diane", "Diane", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("elizabeth", "Elizabeth", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("amanda", "Amanda", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("isabel", "Isabel", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("mary", "Mary", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("linda", "Linda", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("chelsea", "Chelsea", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("barbara", "Barbara", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("nancy", "Nancy", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("kelly", "Kelly", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("eva", "Eva", "CrossFit", "CrossFit", "time"),
    ExerciseTemplate("filthy-fifty", "Filthy Fifty", "CrossFit", "CrossFit", "time"),
    // CrossFit Mouvements (20)
    ExerciseTemplate("thruster", "Thruster (Squat + Développé)", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("wall-ball", "Lancer au Mur (Wall Ball)", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("box-jump", "Saut sur Boîte (Box Jump)", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("double-under", "Double Saut Corde (Double Under)", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("toes-to-bar", "Pieds à la Barre (Toes to Bar)", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("kipping-pull-up", "Traction Kipping", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("butterfly-pull-up", "Traction Papillon (Butterfly)", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("muscle-up", "Muscle Up Barre", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("ring-muscle-up", "Muscle Up Anneaux", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("handstand-push-up", "Pompes en Equilibre (HSPU)", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("handstand-walk", "Marche sur les Mains", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("rope-climb", "Corde Lisse", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("burpee", "Burpee", "CrossFit", "CrossFit", "reps"),
    ExerciseTemplate("kettlebell-swing", "Kettlebell Swing Russe", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("american-kb-swing", "Balancé KB Américain", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("goblet-squat-kb", "Squat Coupe Kettlebell", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("devil-press", "Devil Press (Sol + Développé)", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("dumbbell-snatch", "Arraché Haltère", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("single-leg-deadlift", "Deadlift Unijambiste", "CrossFit", "CrossFit", "kg"),
    ExerciseTemplate("assault-bike-cal", "Vélo Air (Calories)", "CrossFit", "CrossFit", "reps"),
    // Hyrox (12)
    ExerciseTemplate("hyrox-sled-push", "Poussée Traîneau (Sled Push)", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-sled-pull", "Tirage Traîneau (Sled Pull)", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-skierg", "SkiErg 1000m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-row", "Rameur 1000m", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-farmers-carry", "Portée de Fermier (Farmers Carry)", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-sandbag-lunges", "Fentes Sac de Sable", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-wall-balls", "Lancers au Mur 100 reps", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-burpees", "Burpees Grand Saut", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-run-1k", "Run 1km (entre stations)", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-full", "Hyrox Complet", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-simulator", "Hyrox Simul. 4 Stations", "Hyrox", "Hyrox", "time"),
    ExerciseTemplate("hyrox-open", "Hyrox Open (Solo)", "Hyrox", "Hyrox", "time"),
    // Running (15)
    ExerciseTemplate("run-100m", "100m", "Running", "Running", "time"),
    ExerciseTemplate("run-200m", "200m", "Running", "Running", "time"),
    ExerciseTemplate("run-400m", "400m", "Running", "Running", "time"),
    ExerciseTemplate("run-800m", "800m", "Running", "Running", "time"),
    ExerciseTemplate("run-1500m", "1500m", "Running", "Running", "time"),
    ExerciseTemplate("run-3k", "3km", "Running", "Running", "time"),
    ExerciseTemplate("run-5k", "5km", "Running", "Running", "time"),
    ExerciseTemplate("run-10k", "10km", "Running", "Running", "time"),
    ExerciseTemplate("run-15k", "15km", "Running", "Running", "time"),
    ExerciseTemplate("half-marathon", "Semi-Marathon (21km)", "Running", "Running", "time"),
    ExerciseTemplate("marathon", "Marathon (42km)", "Running", "Running", "time"),
    ExerciseTemplate("vma-interval", "Fractionné VMA", "Running", "Running", "time"),
    ExerciseTemplate("tempo-run", "Allure au Seuil", "Running", "Running", "time"),
    ExerciseTemplate("long-run", "Sortie Longue", "Running", "Running", "km"),
    ExerciseTemplate("trail-run", "Trail", "Running", "Running", "km"),
    // Cardio (14)
    ExerciseTemplate("bike-ergometer", "Vélo Ergomètre", "Cardio", "Cardio", "time"),
    ExerciseTemplate("spinning", "Spinning / Biking", "Cardio", "Cardio", "time"),
    ExerciseTemplate("assault-bike", "Assault Bike (AirBike)", "Cardio", "Cardio", "time"),
    ExerciseTemplate("ski-erg", "SkiErg Technogym", "Cardio", "Cardio", "time"),
    ExerciseTemplate("rowing-machine", "Rameur Concept2", "Cardio", "Cardio", "time"),
    ExerciseTemplate("treadmill", "Tapis Roulant", "Cardio", "Cardio", "time"),
    ExerciseTemplate("treadmill-incline", "Tapis Incliné (Marche)", "Cardio", "Cardio", "time"),
    ExerciseTemplate("elliptical", "Elliptique / Vario", "Cardio", "Cardio", "time"),
    ExerciseTemplate("stairmaster", "Stepper / Stairmaster", "Cardio", "Cardio", "time"),
    ExerciseTemplate("jump-rope", "Corde à Sauter", "Cardio", "Cardio", "time"),
    ExerciseTemplate("cycling", "Cyclisme (Vélo de Route)", "Cardio", "Cardio", "km"),
    ExerciseTemplate("swimming", "Natation", "Cardio", "Cardio", "time"),
    ExerciseTemplate("swimming-50m", "Nage 50m", "Cardio", "Cardio", "time"),
    ExerciseTemplate("hiit-session", "Séance HIIT (Fractionné Intensif)", "Cardio", "Cardio", "time"),
    // Combat (15)
    ExerciseTemplate("bjj-gi", "BJJ Kimono", "Combat", "Combat", "time"),
    ExerciseTemplate("bjj-nogi", "BJJ No-Gi / Grappling", "Combat", "Combat", "time"),
    ExerciseTemplate("boxing", "Boxe Anglaise", "Combat", "Combat", "time"),
    ExerciseTemplate("muay-thai", "Muay Thai", "Combat", "Combat", "time"),
    ExerciseTemplate("savate", "Savate / Boxe Française", "Combat", "Combat", "time"),
    ExerciseTemplate("kickboxing", "Kickboxing / K-1", "Combat", "Combat", "time"),
    ExerciseTemplate("wrestling", "Lutte (Wrestling)", "Combat", "Combat", "time"),
    ExerciseTemplate("judo", "Judo", "Combat", "Combat", "time"),
    ExerciseTemplate("mma", "MMA", "Combat", "Combat", "time"),
    ExerciseTemplate("sparring", "Sparring (Assaut Libre)", "Combat", "Combat", "time"),
    ExerciseTemplate("padwork", "Travail aux Pattes", "Combat", "Combat", "time"),
    ExerciseTemplate("bag-work", "Sac de Frappe", "Combat", "Combat", "time"),
    ExerciseTemplate("shadow-boxing", "Boxe à l'Ombre (Shadow Boxing)", "Combat", "Combat", "time"),
    ExerciseTemplate("catch-wrestling", "Lutte avec Soumissions (Catch)", "Combat", "Combat", "time"),
    ExerciseTemplate("competition", "Compétition", "Combat", "Combat", "time"),
    // Street Workout (15)
    ExerciseTemplate("street-pull-up", "Tractions Max", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("street-pull-up-wide", "Tractions Larges", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("street-dips", "Dips Barres Parallèles", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("push-up-max", "Pompes Max en 1 set", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("muscle-up-bar", "Muscle Up Barre (Max)", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("muscle-up-rings", "Muscle Up Anneaux", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("front-lever", "Levier Avant (Front Lever)", "Street Workout", "Street Workout", "time"),
    ExerciseTemplate("back-lever", "Levier Arrière (Back Lever)", "Street Workout", "Street Workout", "time"),
    ExerciseTemplate("planche", "Planche Tenue", "Street Workout", "Street Workout", "time"),
    ExerciseTemplate("tuck-planche", "Planche Regroupée (Tuck Planche)", "Street Workout", "Street Workout", "time"),
    ExerciseTemplate("human-flag", "Drapeau (Human Flag)", "Street Workout", "Street Workout", "time"),
    ExerciseTemplate("l-sit", "L-Sit sur Barres", "Street Workout", "Street Workout", "time"),
    ExerciseTemplate("pistol-squat", "Squat Unijambiste (Max)", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("skin-the-cat", "Tour de Barre (Skin the Cat)", "Street Workout", "Street Workout", "reps"),
    ExerciseTemplate("dead-hang", "Dead Hang (Suspension)", "Street Workout", "Street Workout", "time"),
)

private fun exercisesFor(group: String) = exerciseLibrary.filter { it.muscleGroup == group }

private val muscleGroups = listOf(
    MuscleGroup("Pectoraux", Icons.Filled.FitnessCenter, Color(0xFFEF4444), 20),
    MuscleGroup("Dos", Icons.Filled.FitnessCenter, Color(0xFF3B82F6), 22),
    MuscleGroup("Epaules", Icons.Filled.FitnessCenter, Color(0xFFF59E0B), 16),
    MuscleGroup("Bras", Icons.Filled.FitnessCenter, Color(0xFFEC4899), 18),
    MuscleGroup("Jambes", Icons.Filled.FitnessCenter, Color(0xFF10B981), 20),
    MuscleGroup("Abdos", Icons.Filled.FitnessCenter, Color(0xFF8B5CF6), 14),
    MuscleGroup("Machines", Icons.Filled.FitnessCenter, Color(0xFF6B7280), 12),
    MuscleGroup("Olympique", Icons.Filled.FitnessCenter, Color(0xFFDC2626), 12),
    MuscleGroup("Strongman", Icons.Filled.FitnessCenter, Color(0xFFB91C1C), 12),
    MuscleGroup("CrossFit", Icons.Filled.LocalFireDepartment, Color(0xFFF59E0B), 40),
    MuscleGroup("Hyrox", Icons.Filled.LocalFireDepartment, Color(0xFFD97706), 12),
    MuscleGroup("Running", Icons.Filled.Timer, Color(0xFF3B82F6), 15),
    MuscleGroup("Cardio", Icons.Filled.Timer, Color(0xFF06B6D4), 14),
    MuscleGroup("Combat", Icons.Filled.SportsKabaddi, Color(0xFF8B5CF6), 15),
    MuscleGroup("Street Workout", Icons.Filled.FitnessCenter, Color(0xFFF59E0B), 15),
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
