// ============================================
// YOROI WATCH - Main App Entry Point
// ============================================

import SwiftUI

@main
struct YoroiWatchApp: App {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivityManager)
        }
    }
}
