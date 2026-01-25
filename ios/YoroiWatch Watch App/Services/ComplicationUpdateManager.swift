// ============================================
// YOROI WATCH - Complication Update Manager
// Met à jour les complications quand les données changent
// ============================================

import Foundation
import WidgetKit

class ComplicationUpdateManager {
    static let shared = ComplicationUpdateManager()

    private let defaults = UserDefaults(suiteName: "group.com.houari.yoroi")

    private init() {}

    // ============================================
    // TIMER COMPLICATION
    // ============================================

    func updateTimerComplication(active: Bool, duration: Int, total: Int) {
        defaults?.set(active, forKey: "timerActive")
        defaults?.set(duration, forKey: "timerDuration")
        defaults?.set(total, forKey: "timerTotal")
        defaults?.synchronize()

        // Reload les complications
        WidgetCenter.shared.reloadTimelines(ofKind: "TimerComplication")

        print("✅ Timer complication mise à jour: \(active ? "Active" : "Inactive") - \(duration)s/\(total)s")
    }

    func clearTimerComplication() {
        updateTimerComplication(active: false, duration: 0, total: 0)
    }

    // ============================================
    // RECORDS COMPLICATION
    // ============================================

    func updateRecordsComplication(exercise: String, value: String, type: String) {
        defaults?.set(exercise, forKey: "lastRecordExercise")
        defaults?.set(value, forKey: "lastRecordValue")
        defaults?.set(type, forKey: "lastRecordType")
        defaults?.synchronize()

        // Reload les complications
        WidgetCenter.shared.reloadTimelines(ofKind: "RecordsComplication")

        print("✅ Records complication mise à jour: \(exercise) - \(value) (\(type))")
    }

    func clearRecordsComplication() {
        defaults?.removeObject(forKey: "lastRecordExercise")
        defaults?.removeObject(forKey: "lastRecordValue")
        defaults?.removeObject(forKey: "lastRecordType")
        defaults?.synchronize()

        WidgetCenter.shared.reloadTimelines(ofKind: "RecordsComplication")
    }

    // ============================================
    // RELOAD ALL
    // ============================================

    func reloadAllComplications() {
        WidgetCenter.shared.reloadAllTimelines()
        print("✅ Toutes les complications rechargées")
    }
}
