// ============================================
// YOROI WATCH - Base de données d'exercices
// Groupés par muscle pour sélection rapide
// ============================================

import Foundation

struct ExerciseCategory: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
    let exercises: [String]
}

struct ExerciseDatabase {
    static let categories: [ExerciseCategory] = [
        ExerciseCategory(name: "PECTORAUX", icon: "figure.strengthtraining.traditional", exercises: [
            "Développé couché (Barre)",
            "Développé couché (Haltères)",
            "Développé incliné",
            "Écartés haltères",
            "Dips (Pecs)",
            "Pompes",
            "Chest Press (Machine)",
            "Pec Deck",
            "Poulie vis-à-vis haute",
            "Poulie vis-à-vis basse"
        ]),
        
        ExerciseCategory(name: "DOS", icon: "figure.strengthtraining.functional", exercises: [
            "Tractions (Pull-ups)",
            "Tirage poitrine",
            "Rowing barre",
            "Rowing haltère",
            "Deadlift",
            "Tirage horizontal",
            "Pull-over poulie",
            "Lombaires (Banc)",
            "Shrugs",
            "Face Pull"
        ]),
        
        ExerciseCategory(name: "JAMBES", icon: "figure.walk", exercises: [
            "Squat (Barre)",
            "Presse à cuisses",
            "Leg Extension",
            "Leg Curl",
            "Fentes haltères",
            "Hack Squat",
            "Soulevé de terre jambes tendues",
            "Mollets debout",
            "Mollets assis",
            "Abducteurs"
        ]),
        
        ExerciseCategory(name: "ÉPAULES", icon: "figure.strengthtraining.functional", exercises: [
            "Développé militaire",
            "Élévations latérales",
            "Développé haltères assis",
            "Élévations frontales",
            "Oiseau haltères",
            "Arnold Press",
            "Tirage menton",
            "Poulie latérale"
        ]),
        
        ExerciseCategory(name: "BICEPS", icon: "dumbbell.fill", exercises: [
            "Curl barre EZ",
            "Curl haltères",
            "Curl marteau",
            "Curl incliné",
            "Curl Larry Scott",
            "Curl poulie basse",
            "Curl concentration"
        ]),
        
        ExerciseCategory(name: "TRICEPS", icon: "dumbbell.fill", exercises: [
            "Extensions poulie haute",
            "Barre au front",
            "Dips (Triceps)",
            "Extensions haltère derrière tête",
            "Kickback haltère",
            "Pompes diamant",
            "Poulie corde"
        ]),
        
        ExerciseCategory(name: "ABDOMINAUX", icon: "figure.core.training", exercises: [
            "Crunch",
            "Relevé de jambes suspendu",
            "Planche (Gainage)",
            "Roulette abdos",
            "Russian Twist",
            "Crunch poulie haute",
            "Mountain Climbers"
        ])
    ]
}