import SwiftUI
import WatchKit

@main
struct YoroiWatchApp: App {
  @WKApplicationDelegateAdaptor(DelegueApp.self) private var delegue

  init() {
    Synchro.shared.demarrer()
  }

  var body: some Scene {
    WindowGroup {
      RacineVue()
    }
  }
}
