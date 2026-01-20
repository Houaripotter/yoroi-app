// ============================================
// YOROI WATCH - Base de données d'exercices
// Classé par sport, groupe musculaire et équipement
// ============================================

import Foundation

struct SportCategory: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
    let subCategories: [ExerciseCategory]
}

struct ExerciseCategory: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
    let exercises: [String]
}

struct ExerciseDatabase {
    static let sports: [SportCategory] = [
        // 1. MUSCULATION (Classé par Groupe Musculaire)
        SportCategory(name: "MUSCULATION", icon: "figure.strengthtraining.traditional", subCategories: [
            ExerciseCategory(name: "PECTORAUX", icon: "figure.strengthtraining.traditional", exercises: [
                "Développé couché (Barre)", "Développé couché (Haltères)", "Développé incliné (Barre)", "Développé incliné (Haltères)", "Écarté couché", "Pec Deck", "Dips (Pecs)", "Pompes", "Écartés poulie haute"
            ]),
            ExerciseCategory(name: "DOS", icon: "figure.strengthtraining.functional", exercises: [
                "Tractions (Pronation)", "Tractions (Supination)", "Rowing barre", "Rowing haltère", "Tirage poitrine", "Tirage horizontal", "Deadlift", "Pull-over poulie", "Banc à lombaires"
            ]),
            ExerciseCategory(name: "ÉPAULES", icon: "figure.strengthtraining.traditional", exercises: [
                "Développé militaire", "Développé haltères assis", "Élévations latérales", "Oiseau haltères", "Face Pull", "Arnold Press", "Shrugs"
            ]),
            ExerciseCategory(name: "BRAS", icon: "dumbbell.fill", exercises: [
                "Curl barre EZ", "Curl haltères", "Curl marteau", "Curl Larry Scott", "Curl poulie basse", "Extensions triceps poulie", "Barre au front", "Dips (Triceps)", "Extension haltère nuque"
            ]),
            ExerciseCategory(name: "JAMBES", icon: "figure.walk", exercises: [
                "Squat (Barre)", "Presse à cuisses", "Leg Extension", "Leg Curl", "Fentes haltères", "Hack Squat", "Soulevé de terre jambes tendues"
            ]),
            ExerciseCategory(name: "ABDOMINAUX", icon: "figure.core.training", exercises: [
                "Crunch", "Relevé de jambes", "Planche (Gainage)", "Russian Twist", "Roulette abdos"
            ])
        ]),
        
        // 2. CARDIO (Classé par Appareil)
        SportCategory(name: "CARDIO", icon: "figure.run", subCategories: [
            ExerciseCategory(name: "TAPIS", icon: "figure.walk", exercises: [
                "Course (Tapis)", "Marche inclinée"
            ]),
            ExerciseCategory(name: "VÉLO", icon: "figure.outdoor.cycle", exercises: [
                "Spinning / RPM", "Vélo statique"
            ]),
            ExerciseCategory(name: "RAMEUR", icon: "figure.rower", exercises: [
                "Rameur (Concept2)"
            ]),
            ExerciseCategory(name: "ELLIPTIQUE", icon: "figure.cross.training", exercises: [
                "Elliptique"
            ]),
            ExerciseCategory(name: "SKIERG", icon: "figure.skiing.crosscountry", exercises: [
                "SkiErg"
            ]),
            ExerciseCategory(name: "ASSAULT BIKE", icon: "figure.indoor.cycle", exercises: [
                "Assault Bike"
            ]),
            ExerciseCategory(name: "ESCALIER", icon: "figure.stairs", exercises: [
                "Escaliers (Stairmaster)"
            ]),
            ExerciseCategory(name: "CORDE", icon: "figure.jumprope", exercises: [
                "Corde à sauter"
            ])
        ]),
        
        // 3. STREET WORKOUT
        SportCategory(name: "STREET WORKOUT", icon: "figure.gymnastics", subCategories: [
            ExerciseCategory(name: "STATIQUE", icon: "figure.hold", exercises: [
                "Planche (Full/Straddle)", "Front Lever", "Back Lever", "Human Flag", "L-Sit", "Handstand Hold"
            ]),
            ExerciseCategory(name: "DYNAMIQUE", icon: "figure.strengthtraining.functional", exercises: [
                "Muscle Up", "Tractions lestées", "Dips lestés", "HSPU", "Pompes en planche"
            ])
        ]),
        
        // 4. HYROX
        SportCategory(name: "HYROX", icon: "timer", subCategories: [
            ExerciseCategory(name: "STATIONS", icon: "figure.cross.training", exercises: [
                "1000m SkiErg", "50m Sled Push", "50m Sled Pull", "80m Burpee Broad Jumps", "1000m Row", "200m Farmers Carry", "100m Sandbag Lunges", "100 Wall Balls"
            ])
        ])
    ]
}
