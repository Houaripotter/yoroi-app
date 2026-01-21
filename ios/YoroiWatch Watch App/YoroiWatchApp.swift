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
    
    // Initialiser le gestionnaire de connexion immédiatement
    private let connectivityManager = WatchConnectivityManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }

    init() {
        // CORRECTION: Retirer reload automatique au launch
        // Les complications se rafraîchissent déjà automatiquement via leur timeline
        // Ce reload inutile consomme de la batterie
        // WidgetCenter.shared.reloadAllTimelines()

        // Pour forcer un reload, le faire seulement quand les données changent
        // via WatchConnectivityManager ou HealthManager
    }
}
