//
//  ComplicationDataManager.swift
//  YoroiWatch Watch App
//
//  Gestionnaire de données partagées pour les complications
//  Utilise App Groups pour partager les données entre l'app et les widgets
//

import Foundation
import WidgetKit

class ComplicationDataManager {
    static let shared = ComplicationDataManager()

    // App Group identifier - à configurer dans Xcode
    private let appGroupID = "group.com.yoroi.watch"

    private var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupID)
    }

    private init() {}

    // MARK: - Hydration Data

    var hydrationCurrent: Int {
        get { sharedDefaults?.integer(forKey: "hydrationCurrent") ?? 0 }
        set {
            sharedDefaults?.set(newValue, forKey: "hydrationCurrent")
            reloadComplications()
        }
    }

    var hydrationGoal: Int {
        get { sharedDefaults?.integer(forKey: "hydrationGoal") ?? 3000 }
        set { sharedDefaults?.set(newValue, forKey: "hydrationGoal") }
    }

    var hydrationProgress: Double {
        guard hydrationGoal > 0 else { return 0 }
        return min(Double(hydrationCurrent) / Double(hydrationGoal), 1.0)
    }

    // MARK: - Weight Data

    var currentWeight: Double {
        get { sharedDefaults?.double(forKey: "currentWeight") ?? 0 }
        set {
            sharedDefaults?.set(newValue, forKey: "currentWeight")
            addWeightToHistory(newValue)
            reloadComplications()
        }
    }

    var targetWeight: Double {
        get { sharedDefaults?.double(forKey: "targetWeight") ?? 75.0 }
        set { sharedDefaults?.set(newValue, forKey: "targetWeight") }
    }

    var weightHistory: [Double] {
        get { sharedDefaults?.array(forKey: "weightHistory") as? [Double] ?? [] }
        set { sharedDefaults?.set(newValue, forKey: "weightHistory") }
    }

    private func addWeightToHistory(_ weight: Double) {
        var history = weightHistory
        history.append(weight)
        // Garder les 7 dernières valeurs
        if history.count > 7 {
            history = Array(history.suffix(7))
        }
        weightHistory = history
    }

    var weightTrend: WeightTrend {
        guard weightHistory.count >= 2 else { return .stable }
        let last = weightHistory.last ?? 0
        let previous = weightHistory[weightHistory.count - 2]
        let diff = last - previous

        if diff < -0.2 { return .down }
        if diff > 0.2 { return .up }
        return .stable
    }

    // MARK: - Steps Data

    var todaySteps: Int {
        get { sharedDefaults?.integer(forKey: "todaySteps") ?? 0 }
        set {
            sharedDefaults?.set(newValue, forKey: "todaySteps")
            reloadComplications()
        }
    }

    var stepsGoal: Int {
        get { sharedDefaults?.integer(forKey: "stepsGoal") ?? 10000 }
        set { sharedDefaults?.set(newValue, forKey: "stepsGoal") }
    }

    // MARK: - Workout Data

    var isWorkoutActive: Bool {
        get { sharedDefaults?.bool(forKey: "isWorkoutActive") ?? false }
        set {
            sharedDefaults?.set(newValue, forKey: "isWorkoutActive")
            reloadComplications()
        }
    }

    var workoutStartTime: Date? {
        get { sharedDefaults?.object(forKey: "workoutStartTime") as? Date }
        set { sharedDefaults?.set(newValue, forKey: "workoutStartTime") }
    }

    var workoutCalories: Int {
        get { sharedDefaults?.integer(forKey: "workoutCalories") ?? 0 }
        set { sharedDefaults?.set(newValue, forKey: "workoutCalories") }
    }

    var todaySets: Int {
        get { sharedDefaults?.integer(forKey: "todaySets") ?? 0 }
        set {
            sharedDefaults?.set(newValue, forKey: "todaySets")
            reloadComplications()
        }
    }

    // MARK: - Timer Data

    var lastRestDuration: Int {
        get { sharedDefaults?.integer(forKey: "lastRestDuration") ?? 90 }
        set { sharedDefaults?.set(newValue, forKey: "lastRestDuration") }
    }

    var timerEndTime: Date? {
        get { sharedDefaults?.object(forKey: "timerEndTime") as? Date }
        set {
            sharedDefaults?.set(newValue, forKey: "timerEndTime")
            reloadComplications()
        }
    }

    var isTimerRunning: Bool {
        if let endTime = timerEndTime {
            return endTime > Date()
        }
        return false
    }

    var timerRemainingSeconds: Int {
        guard let endTime = timerEndTime else { return 0 }
        return max(0, Int(endTime.timeIntervalSinceNow))
    }

    // MARK: - Heart Rate

    var currentHeartRate: Int {
        get { sharedDefaults?.integer(forKey: "currentHeartRate") ?? 0 }
        set {
            sharedDefaults?.set(newValue, forKey: "currentHeartRate")
            reloadComplications()
        }
    }

    // MARK: - Sleep

    var sleepDuration: Int {
        get { sharedDefaults?.integer(forKey: "sleepDuration") ?? 0 }
        set { sharedDefaults?.set(newValue, forKey: "sleepDuration") }
    }

    var sleepDurationFormatted: String {
        let hours = sleepDuration / 60
        let minutes = sleepDuration % 60
        return "\(hours)h\(String(format: "%02d", minutes))"
    }

    // MARK: - Reload Complications

    func reloadComplications() {
        WidgetCenter.shared.reloadAllTimelines()
    }

    // MARK: - Sync from WatchConnectivityManager

    func syncFromWatchData(_ data: WatchData) {
        hydrationCurrent = data.hydrationCurrent
        hydrationGoal = data.hydrationGoal
        currentWeight = data.currentWeight
        targetWeight = data.targetWeight
        sleepDuration = data.sleepDuration
        stepsGoal = data.stepsGoal
    }
}

// MARK: - Weight Trend Enum

enum WeightTrend {
    case up
    case down
    case stable

    var icon: String {
        switch self {
        case .up: return "arrow.up.right"
        case .down: return "arrow.down.right"
        case .stable: return "arrow.right"
        }
    }

    var color: String {
        switch self {
        case .up: return "orange"
        case .down: return "green"
        case .stable: return "blue"
        }
    }
}
