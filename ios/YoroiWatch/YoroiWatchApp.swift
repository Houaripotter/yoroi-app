//
//  YoroiWatchApp.swift
//  YoroiWatch Watch App
//
//  Created by Houari BOUKEROUCHA on 16/01/2026.
//

import SwiftUI
import WatchConnectivity

@main
struct YoroiWatchApp: App {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @StateObject private var healthKitManager = HealthKitManager.shared
    @StateObject private var workoutSessionManager = WorkoutSessionManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connectivityManager)
                .environmentObject(healthKitManager)
                .environmentObject(workoutSessionManager)
                .onAppear {
                    connectivityManager.activateSession()
                    healthKitManager.requestAuthorization()
                    workoutSessionManager.requestWorkoutAuthorization { _ in }
                }
        }
    }
}
