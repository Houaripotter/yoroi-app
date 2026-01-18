// ============================================
// YOROI WATCH - Modèles de données
// ============================================

import Foundation

// Données d'entraînement
struct WorkoutData: Codable, Identifiable {
    let id: UUID
    let sport: String
    let date: Date
    let duration: Int // en minutes
    let notes: String?

    init(id: UUID = UUID(), sport: String, date: Date = Date(), duration: Int, notes: String? = nil) {
        self.id = id
        self.sport = sport
        self.date = date
        self.duration = duration
        self.notes = notes
    }
}

// Données de poids
struct WeightEntry: Codable, Identifiable {
    let id: UUID
    let weight: Double
    let date: Date

    init(id: UUID = UUID(), weight: Double, date: Date = Date()) {
        self.id = id
        self.weight = weight
        self.date = date
    }
}

// Stats utilisateur
struct UserStats: Codable {
    var currentWeight: Double
    var targetWeight: Double?
    var streak: Int
    var totalSessions: Int
    var totalMinutes: Int

    init(currentWeight: Double = 0, targetWeight: Double? = nil, streak: Int = 0, totalSessions: Int = 0, totalMinutes: Int = 0) {
        self.currentWeight = currentWeight
        self.targetWeight = targetWeight
        self.streak = streak
        self.totalSessions = totalSessions
        self.totalMinutes = totalMinutes
    }
}

// Sports disponibles
enum Sport: String, CaseIterable, Codable {
    case jjb = "JJB"
    case mma = "MMA"
    case boxe = "Boxe"
    case musculation = "Muscu"
    case running = "Running"
    case autre = "Autre"

    var icon: String {
        switch self {
        case .jjb: return "figure.martial.arts"
        case .mma: return "figure.boxing"
        case .boxe: return "figure.boxing"
        case .musculation: return "dumbbell.fill"
        case .running: return "figure.run"
        case .autre: return "sportscourt.fill"
        }
    }

    var color: String {
        switch self {
        case .jjb: return "#EF4444"
        case .mma: return "#F97316"
        case .boxe: return "#DC2626"
        case .musculation: return "#8B5CF6"
        case .running: return "#10B981"
        case .autre: return "#6B7280"
        }
    }
}
