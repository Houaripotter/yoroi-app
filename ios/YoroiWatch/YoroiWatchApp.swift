import SwiftUI

@main
struct YoroiWatchApp: App {

  @StateObject private var sessionManager = WatchSessionManager.shared

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
  }
}
