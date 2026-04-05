import SwiftUI
import WatchKit

@main
struct YoroiWatchApp: App {

  @StateObject private var sessionManager = WatchSessionManager.shared
  @Environment(\.scenePhase) private var scenePhase

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(sessionManager)
        // Deep link depuis une complication
        .onContinueUserActivity("com.apple.clockkit.complication") { activity in
          guard let info = activity.userInfo as? [String: Any],
                let tabIndex = info["tabIndex"] as? Int else { return }
          sessionManager.requestedTab = tabIndex
          if info["openTimer"] as? Bool == true {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
              sessionManager.wantsTimer = true
            }
          }
        }
    }
    .onChange(of: scenePhase) {
      if scenePhase == .active {
        // Montre se réveille : recalcule le timer depuis la date de fin
        sessionManager.resyncTimerIfNeeded()
      }
    }
    // ── Background refresh : replanifie l'alarme à l'infini ──
    .backgroundTask(.appRefresh("yoroi.alarm.refresh")) { (_: Void) in
      let manager = WatchSessionManager.shared
      await MainActor.run {
        if manager.timerAlarmRinging {
          manager.handleAlarmBackgroundRefresh()
        }
      }
    }

    // ── Notification plein écran quand la montre est verrouillée ──
    WKNotificationScene(controller: TimerAlarmNotificationController.self, category: "yoroi.timer.alarm")
  }
}
