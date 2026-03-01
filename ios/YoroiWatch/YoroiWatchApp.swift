import SwiftUI

@main
struct YoroiWatchApp: App {

  @StateObject private var sessionManager = WatchSessionManager.shared

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(sessionManager)
    }
  }
}
