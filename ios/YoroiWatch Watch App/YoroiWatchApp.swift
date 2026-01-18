//
//  YoroiWatchApp.swift
//  YoroiWatch Watch App
//
//  Created by Houari BOUKEROUCHA on 18/01/2026.
//

import SwiftUI
import WidgetKit

@main
struct YoroiWatchApp: App {
    @StateObject private var healthManager = HealthManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }

    init() {
        // Rafraîchir les complications au lancement
        WidgetCenter.shared.reloadAllTimelines()
    }
}
