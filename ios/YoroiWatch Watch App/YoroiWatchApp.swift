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
    // Utiliser les singletons directement
    private let healthManager = HealthManager.shared
    private let connectivityManager = WatchConnectivityManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    // S'assurer que la session WCSession est activée au démarrage
                    print("🚀 [APP] ContentView appeared, ensuring WCSession...")
                    connectivityManager.ensureSessionActivated()
                }
        }
    }

    init() {
        // Forcer l'initialisation des singletons au lancement
        print("🚀 [APP] YoroiWatchApp init - initializing singletons...")
        _ = HealthManager.shared
        _ = WatchConnectivityManager.shared
    }
}
