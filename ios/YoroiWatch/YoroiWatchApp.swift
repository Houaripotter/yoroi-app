import SwiftUI
import WatchKit
import UserNotifications

@main
struct YoroiWatchApp: App {

  @StateObject private var sessionManager = WatchSessionManager.shared
  @Environment(\.scenePhase) private var scenePhase

  init() {
    // Autorisation notifications demandée UNE SEULE FOIS au lancement.
    // Si l'utilisateur refuse, le timer sonne quand même via haptics + son (Extended Session)
    // mais sans notification si l'app est suspendue.
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound, .badge, .criticalAlert]) { _, _ in }

    // Registration de la catégorie d'alarme AVEC actions "Arrêter" et "Répéter"
    // → style Apple Timer : l'utilisateur peut stopper OU relancer le même timer
    //   directement depuis la notification, sans ouvrir l'app.
    let stopAction = UNNotificationAction(
      identifier: "yoroi.timer.stop",
      title: "Arrêter",
      options: [.foreground, .destructive]
    )
    let repeatAction = UNNotificationAction(
      identifier: "yoroi.timer.repeat",
      title: "Répéter",
      options: [.foreground]
    )
    let category = UNNotificationCategory(
      identifier: "yoroi.timer.alarm",
      actions: [stopAction, repeatAction],
      intentIdentifiers: [],
      options: [.customDismissAction]
    )
    center.setNotificationCategories([category])

    // Delegate pour handler les actions Arrêter / Répéter
    center.delegate = WatchSessionManager.shared
  }

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
