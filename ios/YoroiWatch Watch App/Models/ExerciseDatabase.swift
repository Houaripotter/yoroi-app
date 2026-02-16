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
                "Développé couché (Barre)", "Développé couché (Haltères)", "Développé incliné (Barre)", "Développé incliné (Haltères)", "Écartés haltères", "Écartés poulie haute", "Dips (Pecs)", "Pompes", "Pec Deck", "Chest Press Machine"
            ]),
            ExerciseCategory(name: "DOS", icon: "figure.strengthtraining.functional", exercises: [
                "Tractions", "Tirage poitrine", "Rowing barre", "Rowing haltère", "Deadlift", "Tirage horizontal", "Pull-over poulie", "Shrugs", "Lombaires", "Rowing Machine"
            ]),
            ExerciseCategory(name: "JAMBES", icon: "figure.walk", exercises: [
                "Squat (Barre)", "Presse à cuisses", "Leg Extension", "Leg Curl", "Fentes haltères", "Hack Squat", "Soulevé de terre jambes tendues", "Mollets debout", "Mollets assis", "Adducteurs"
            ]),
            ExerciseCategory(name: "ÉPAULES", icon: "figure.strengthtraining.functional", exercises: [
                "Développé militaire", "Élévations latérales", "Développé haltères assis", "Oiseau haltères", "Arnold Press", "Tirage menton", "Face Pull", "Élévations frontales"
            ]),
            ExerciseCategory(name: "BRAS", icon: "dumbbell.fill", exercises: [
                "Curl barre EZ", "Curl haltères", "Curl marteau", "Curl pupitre Larry Scott", "Extensions triceps poulie", "Barre au front", "Dips (Triceps)", "Kickback haltère"
            ]),
            ExerciseCategory(name: "ABDOMINAUX", icon: "figure.core.training", exercises: [
                "Crunch", "Relevé de jambes", "Planche (Gainage)", "Russian Twist", "Roulette abdos", "Crunch poulie haute", "Mountain Climbers", "Leg Raise suspendu"
            ])
        ]),
        
        SportCategory(name: "STREET WORKOUT", icon: "figure.gymnastics", subCategories: [
            ExerciseCategory(name: "STATIQUE", icon: "figure.hold", exercises: [
                "Planche (Full/Straddle)", "Front Lever", "Back Lever", "Human Flag", "L-Sit", "V-Sit", "Handstand Hold", "Elbow Lever"
            ]),
            ExerciseCategory(name: "FORCE", icon: "figure.strengthtraining.functional", exercises: [
                "Muscle Up", "Tractions lestées", "Dips lestés", "HSPU (Handstand Push-up)", "Pompes en planche", "Tractions Archer", "Pompes Archer"
            ]),
            ExerciseCategory(name: "REPS", icon: "repeat", exercises: [
                "Max Pompes", "Max Tractions", "Max Dips", "Burpees", "Pompes Diamant", "Jump Squats"
            ])
        ]),
        
        SportCategory(name: "HYROX", icon: "timer", subCategories: [
            ExerciseCategory(name: "STATIONS", icon: "figure.cross.training", exercises: [
                "1000m SkiErg", "50m Sled Push", "50m Sled Pull", "80m Burpee Broad Jumps", "1000m Row", "200m Farmers Carry", "100m Sandbag Lunges", "100 Wall Balls"
            ]),
            ExerciseCategory(name: "RUNNING", icon: "figure.run", exercises: [
                "1 km Run", "Total Time (Hyrox)", "Intervalles 1km"
            ])
        ]),
        
        SportCategory(name: "RUNNING", icon: "figure.run", subCategories: [
            ExerciseCategory(name: "DISTANCES", icon: "map", exercises: [
                "1 km", "5 km", "10 km", "Semi-Marathon", "Marathon", "Trail 15km", "Trail 30km"
            ]),
            ExerciseCategory(name: "TESTS", icon: "stopwatch", exercises: [
                "Cooper (12 min)", "VMA (Demi-Cooper)", "Test 2.4 km"
            ])
        ])
    ]
    
    // Pour compatibilité descendante si nécessaire
    static var categories: [ExerciseCategory] {
        return sports.first(where: { $0.name == "MUSCULATION" })?.subCategories ?? []
    }
}