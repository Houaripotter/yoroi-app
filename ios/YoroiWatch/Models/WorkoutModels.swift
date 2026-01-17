//
//  WorkoutModels.swift
//  YoroiWatch Watch App
//
//  Modèles de données pour le carnet d'entraînement
//

import Foundation

// MARK: - Exercise Set

struct WatchSet: Codable, Identifiable {
    let id: String
    let weight: Double      // en kg
    let reps: Int
    let timestamp: Date
    var restTime: Int?      // temps de repos après cette série (en secondes)

    init(weight: Double, reps: Int, restTime: Int? = nil) {
        self.id = UUID().uuidString
        self.weight = weight
        self.reps = reps
        self.timestamp = Date()
        self.restTime = restTime
    }

    var volume: Double {
        return weight * Double(reps)
    }

    var formattedWeight: String {
        if weight.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(weight))kg"
        }
        return String(format: "%.1fkg", weight)
    }
}

// MARK: - Exercise

struct WatchExercise: Codable, Identifiable {
    let id: String
    let name: String
    let category: ExerciseCategory
    var sets: [WatchSet]

    init(id: String = UUID().uuidString, name: String, category: ExerciseCategory) {
        self.id = id
        self.name = name
        self.category = category
        self.sets = []
    }

    var totalSets: Int {
        return sets.count
    }

    var totalVolume: Double {
        return sets.reduce(0) { $0 + $1.volume }
    }

    var totalReps: Int {
        return sets.reduce(0) { $0 + $1.reps }
    }

    var maxWeight: Double {
        return sets.map { $0.weight }.max() ?? 0
    }

    var formattedVolume: String {
        if totalVolume >= 1000 {
            return String(format: "%.1ft", totalVolume / 1000)
        }
        return "\(Int(totalVolume))kg"
    }
}

// MARK: - Exercise Category

enum ExerciseCategory: String, Codable, CaseIterable {
    case chest = "Pectoraux"
    case back = "Dos"
    case legs = "Jambes"
    case shoulders = "Épaules"
    case arms = "Bras"
    case core = "Abdos"
    case cardio = "Cardio"

    var icon: String {
        switch self {
        case .chest: return "figure.strengthtraining.traditional"
        case .back: return "figure.rowing"
        case .legs: return "figure.walk"
        case .shoulders: return "figure.arms.open"
        case .arms: return "figure.boxing"
        case .core: return "figure.core.training"
        case .cardio: return "figure.run"
        }
    }

    var color: String {
        switch self {
        case .chest: return "blue"
        case .back: return "green"
        case .legs: return "red"
        case .shoulders: return "orange"
        case .arms: return "purple"
        case .core: return "yellow"
        case .cardio: return "pink"
        }
    }
}

// MARK: - Workout Session

struct WatchWorkout: Codable, Identifiable {
    let id: String
    let startTime: Date
    var endTime: Date?
    var exercises: [WatchExercise]
    var isActive: Bool

    init() {
        self.id = UUID().uuidString
        self.startTime = Date()
        self.exercises = []
        self.isActive = true
    }

    var duration: TimeInterval {
        let end = endTime ?? Date()
        return end.timeIntervalSince(startTime)
    }

    var durationFormatted: String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        if hours > 0 {
            return "\(hours)h\(String(format: "%02d", minutes))"
        }
        return "\(minutes)min"
    }

    var totalSets: Int {
        return exercises.reduce(0) { $0 + $1.totalSets }
    }

    var totalVolume: Double {
        return exercises.reduce(0) { $0 + $1.totalVolume }
    }

    var formattedVolume: String {
        if totalVolume >= 1000 {
            return String(format: "%.1f t", totalVolume / 1000)
        }
        return "\(Int(totalVolume)) kg"
    }

    mutating func addExercise(_ exercise: WatchExercise) {
        exercises.append(exercise)
    }

    mutating func addSet(to exerciseId: String, set: WatchSet) {
        if let index = exercises.firstIndex(where: { $0.id == exerciseId }) {
            exercises[index].sets.append(set)
        }
    }

    mutating func finish() {
        endTime = Date()
        isActive = false
    }
}

// MARK: - Predefined Exercises

struct ExerciseLibrary {
    static let exercises: [ExerciseCategory: [String]] = [
        .chest: [
            "Développé couché",
            "Développé incliné",
            "Développé décliné",
            "Écarté haltères",
            "Pec deck",
            "Pompes",
            "Dips pectoraux"
        ],
        .back: [
            "Tirage vertical",
            "Tirage horizontal",
            "Rowing barre",
            "Rowing haltère",
            "Pull-over",
            "Soulevé de terre",
            "Tractions"
        ],
        .legs: [
            "Squat",
            "Presse à cuisses",
            "Leg extension",
            "Leg curl",
            "Mollets debout",
            "Fentes",
            "Hip thrust"
        ],
        .shoulders: [
            "Développé militaire",
            "Élévations latérales",
            "Élévations frontales",
            "Oiseau",
            "Shrugs",
            "Face pull"
        ],
        .arms: [
            "Curl biceps",
            "Curl marteau",
            "Curl concentré",
            "Triceps poulie",
            "Dips triceps",
            "Extension triceps",
            "Barre au front"
        ],
        .core: [
            "Crunch",
            "Planche",
            "Relevé de jambes",
            "Russian twist",
            "Ab wheel"
        ],
        .cardio: [
            "Tapis de course",
            "Vélo",
            "Rameur",
            "Elliptique",
            "Corde à sauter"
        ]
    ]

    static func exercisesFor(category: ExerciseCategory) -> [String] {
        return exercises[category] ?? []
    }

    static var allExercises: [(name: String, category: ExerciseCategory)] {
        var all: [(String, ExerciseCategory)] = []
        for (category, names) in exercises {
            for name in names {
                all.append((name, category))
            }
        }
        return all.sorted { $0.0 < $1.0 }
    }
}

// MARK: - Recent Exercises Storage

class RecentExercisesManager {
    static let shared = RecentExercisesManager()
    private let key = "recentExercises"
    private let maxRecent = 5

    private init() {}

    func getRecent() -> [(name: String, category: ExerciseCategory)] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode([[String: String]].self, from: data) else {
            return []
        }

        return decoded.compactMap { dict in
            guard let name = dict["name"],
                  let categoryRaw = dict["category"],
                  let category = ExerciseCategory(rawValue: categoryRaw) else {
                return nil
            }
            return (name, category)
        }
    }

    func addRecent(name: String, category: ExerciseCategory) {
        var recent = getRecent()

        // Supprimer si déjà présent
        recent.removeAll { $0.name == name }

        // Ajouter en premier
        recent.insert((name, category), at: 0)

        // Limiter à maxRecent
        if recent.count > maxRecent {
            recent = Array(recent.prefix(maxRecent))
        }

        // Sauvegarder
        let encoded = recent.map { ["name": $0.name, "category": $0.category.rawValue] }
        if let data = try? JSONEncoder().encode(encoded) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
