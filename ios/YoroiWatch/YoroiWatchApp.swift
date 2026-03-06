import SwiftUI

@main
struct YoroiWatchApp: App {

  @StateObject private var sessionManager = WatchSessionManager.shared
  @Environment(\.scenePhase) private var scenePhase

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(sessionManager)
        // Deep link depuis une complication : ouvre directement le bon onglet
        .onContinueUserActivity("com.apple.clockkit.complication") { activity in
          guard let info = activity.userInfo as? [String: Any],
                let tabIndex = info["tabIndex"] as? Int else { return }
          sessionManager.requestedTab = tabIndex
        }
    }
    .onChange(of: scenePhase) {
      if scenePhase == .active {
        // Montre se réveille : recalcule le timer depuis la date de fin
        sessionManager.resyncTimerIfNeeded()
      }
    }
  }
}
