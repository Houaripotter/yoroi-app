// ============================================
// YOROI WATCH - Base de données d'exercices
// Groupés par muscle pour sélection rapide
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
        SportCategory(name: "MUSCULATION", icon: "figure.strengthtraining.traditional", subCategories: [
            ExerciseCategory(name: "PECTORAUX", icon: "figure.strengthtraining.traditional", exercises: [
                "Développé couché (Barre)", "Développé couché (Haltères)", "Développé incliné", "Écartés haltères", "Dips (Pecs)", "Pompes"
            ]),
            ExerciseCategory(name: "DOS", icon: "figure.strengthtraining.functional", exercises: [
                "Tractions", "Tirage poitrine", "Rowing barre", "Rowing haltère", "Deadlift", "Tirage horizontal"
            ]),
            ExerciseCategory(name: "JAMBES", icon: "figure.walk", exercises: [
                "Squat (Barre)", "Presse à cuisses", "Leg Extension", "Leg Curl", "Fentes haltères", "Hack Squat"
            ]),
            ExerciseCategory(name: "ÉPAULES", icon: "figure.strengthtraining.functional", exercises: [
                "Développé militaire", "Élévations latérales", "Développé haltères assis", "Arnold Press"
            ]),
            ExerciseCategory(name: "BRAS", icon: "dumbbell.fill", exercises: [
                "Curl barre EZ", "Curl haltères", "Extensions triceps", "Barre au front"
            ]),
            ExerciseCategory(name: "ABDOMINAUX", icon: "figure.core.training", exercises: [
                "Crunch", "Relevé de jambes", "Planche (Gainage)", "Russian Twist"
            ])
        ]),
        
        SportCategory(name: "STREET WORKOUT", icon: "figure.gymnastics", subCategories: [
            ExerciseCategory(name: "STATIQUE", icon: "figure.hold", exercises: [
                "Planche", "Front Lever", "Back Lever", "Human Flag", "L-Sit"
            ]),
            ExerciseCategory(name: "FORCE", icon: "figure.strengthtraining.functional", exercises: [
                "Muscle Up", "Tractions lestées", "Dips lestés", "HSPU (Handstand Push-up)"
            ]),
            ExerciseCategory(name: "REPS", icon: "repeat", exercises: [
                "Max Pompes", "Max Tractions", "Max Dips"
            ])
        ]),
        
        SportCategory(name: "HYROX", icon: "timer", subCategories: [
            ExerciseCategory(name: "STATIONS", icon: "figure.cross.training", exercises: [
                "1000m SkiErg", "50m Sled Push", "50m Sled Pull", "80m Burpee Broad Jumps", "1000m Row", "200m Farmers Carry", "100m Sandbag Lunges", "100 Wall Balls"
            ]),
            ExerciseCategory(name: "RUNNING", icon: "figure.run", exercises: [
                "1 km Run", "Total Time (Hyrox)"
            ])
        ]),
        
        SportCategory(name: "RUNNING", icon: "figure.run", subCategories: [
            ExerciseCategory(name: "DISTANCES", icon: "map", exercises: [
                "1 km", "5 km", "10 km", "Semi-Marathon", "Marathon"
            ]),
            ExerciseCategory(name: "TESTS", icon: "stopwatch", exercises: [
                "Cooper (12 min)", "VMA (Demi-Cooper)"
            ])
        ])
    ]
    
    // Pour compatibilité descendante si nécessaire
    static var categories: [ExerciseCategory] {
        return sports.first(where: { $0.name == "MUSCULATION" })?.subCategories ?? []
    }
}