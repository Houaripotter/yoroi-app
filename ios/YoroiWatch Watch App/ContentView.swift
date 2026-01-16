//
//  ContentView.swift
//  YoroiWatch Watch App
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    var body: some View {
        TabView {
            DashboardView()
            HydrationView()
            WeightView()
            StatsView()
        }
        .tabViewStyle(.verticalPage)
    }
}

// MARK: - Dashboard
struct DashboardView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("YOROI")
                    .font(.headline)
                    .fontWeight(.bold)

                HStack {
                    Image(systemName: "scalemass.fill")
                        .foregroundColor(.orange)
                    Text(String(format: "%.1f kg", connectivityManager.watchData.currentWeight))
                        .font(.title3)
                        .fontWeight(.semibold)
                }

                VStack(spacing: 4) {
                    HStack {
                        Image(systemName: "drop.fill")
                            .foregroundColor(.cyan)
                        Text("\(connectivityManager.watchData.hydrationCurrent) / \(connectivityManager.watchData.hydrationGoal) ml")
                            .font(.caption)
                    }
                    ProgressView(value: connectivityManager.watchData.hydrationProgress)
                        .tint(.cyan)
                }

                HStack {
                    Image(systemName: "figure.walk")
                        .foregroundColor(.green)
                    Text("\(healthKitManager.todaySteps) pas")
                        .font(.caption)
                }

                if healthKitManager.currentHeartRate > 0 {
                    HStack {
                        Image(systemName: "heart.fill")
                            .foregroundColor(.red)
                        Text("\(healthKitManager.currentHeartRate) bpm")
                            .font(.caption)
                    }
                }

                HStack {
                    Circle()
                        .fill(connectivityManager.isReachable ? Color.green : Color.orange)
                        .frame(width: 8, height: 8)
                    Text(connectivityManager.isReachable ? "Connecte" : "Hors ligne")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
    }
}

// MARK: - Stats
struct StatsView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Stats")
                    .font(.headline)

                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("\(healthKitManager.todayCalories) kcal")
                    Spacer()
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "moon.fill")
                            .foregroundColor(.purple)
                        Text("Sommeil")
                    }
                    Text(connectivityManager.watchData.sleepDurationFormatted)
                        .font(.title2)
                        .fontWeight(.semibold)
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "target")
                            .foregroundColor(.blue)
                        Text("Objectif")
                    }
                    Text(String(format: "%.1f kg", connectivityManager.watchData.targetWeight))
                        .font(.title3)
                }
            }
            .padding()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchConnectivityManager.shared)
        .environmentObject(HealthKitManager.shared)
}
