//
//  Models.swift
//  YoroiWatch Watch App
//
//  Data models for Watch app
//

import Foundation

struct WatchData: Codable {
    // Hydratation
    var hydrationCurrent: Int // ml
    var hydrationGoal: Int // ml

    // Poids
    var currentWeight: Double // kg
    var targetWeight: Double // kg

    // Sommeil
    var sleepDuration: Int // minutes
    var sleepQuality: Int // 1-5
    var sleepBedTime: String // "23:15"
    var sleepWakeTime: String // "06:45"

    // Pas
    var stepsGoal: Int

    // Timestamp
    var timestamp: TimeInterval

    // Valeurs par defaut
    static let defaultData = WatchData(
        hydrationCurrent: 0,
        hydrationGoal: 3000,
        currentWeight: 78.0,
        targetWeight: 77.0,
        sleepDuration: 450,
        sleepQuality: 4,
        sleepBedTime: "23:00",
        sleepWakeTime: "06:30",
        stepsGoal: 8000,
        timestamp: Date().timeIntervalSince1970
    )

    // Helper: pourcentage hydratation
    var hydrationProgress: Double {
        guard hydrationGoal > 0 else { return 0 }
        return min(Double(hydrationCurrent) / Double(hydrationGoal), 1.0)
    }

    // Helper: difference poids
    var weightDifference: Double {
        return currentWeight - targetWeight
    }

    // Helper: duree sommeil formatee
    var sleepDurationFormatted: String {
        let hours = sleepDuration / 60
        let minutes = sleepDuration % 60
        return "\(hours)h\(String(format: "%02d", minutes))"
    }
}
