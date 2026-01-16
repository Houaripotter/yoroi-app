//
//  Models.swift
//  YoroiWatch Watch App
//

import Foundation

struct WatchData: Codable {
    var hydrationCurrent: Int
    var hydrationGoal: Int
    var currentWeight: Double
    var targetWeight: Double
    var sleepDuration: Int
    var sleepQuality: Int
    var sleepBedTime: String
    var sleepWakeTime: String
    var stepsGoal: Int
    var timestamp: TimeInterval

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

    var hydrationProgress: Double {
        guard hydrationGoal > 0 else { return 0 }
        return min(Double(hydrationCurrent) / Double(hydrationGoal), 1.0)
    }

    var weightDifference: Double {
        return currentWeight - targetWeight
    }

    var sleepDurationFormatted: String {
        let hours = sleepDuration / 60
        let minutes = sleepDuration % 60
        return "\(hours)h\(String(format: "%02d", minutes))"
    }
}
