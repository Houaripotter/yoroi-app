//
//  ContentView.swift
//  YoroiWatch Watch App
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager
    @EnvironmentObject var workoutSessionManager: WorkoutSessionManager

    var body: some View {
        TabView {
            DashboardView()
            WorkoutLogView()
            RestTimerView()
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
    @EnvironmentObject var workoutSessionManager: WorkoutSessionManager

    @State private var showingWorkoutLog = false

    private let haptics = HapticsManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Header
                Text("YOROI")
                    .font(.headline)
                    .fontWeight(.bold)

                // Bouton Entraînement ou Status
                workoutSection

                Divider()
                    .padding(.vertical, 4)

                // Stats rapides
                quickStatsSection

                // Status connexion
                connectionStatus
            }
            .padding()
        }
        .sheet(isPresented: $showingWorkoutLog) {
            WorkoutLogView()
        }
    }

    // MARK: - Section Entraînement

    @ViewBuilder
    private var workoutSection: some View {
        if workoutSessionManager.workoutState == .active {
            // Séance en cours
            VStack(spacing: 8) {
                HStack {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 10, height: 10)
                    Text("Entraînement actif")
                        .font(.caption)
                        .foregroundColor(.green)
                }

                Text(workoutSessionManager.elapsedTimeFormatted)
                    .font(.title2)
                    .fontWeight(.bold)

                HStack(spacing: 16) {
                    // Calories
                    VStack {
                        Image(systemName: "flame.fill")
                            .foregroundColor(.orange)
                        Text("\(Int(workoutSessionManager.activeCalories))")
                            .font(.caption)
                    }

                    // BPM
                    if workoutSessionManager.heartRate > 0 {
                        VStack {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                            Text("\(Int(workoutSessionManager.heartRate))")
                                .font(.caption)
                        }
                    }
                }

                // Bouton aller au carnet
                Button(action: { showingWorkoutLog = true }) {
                    HStack {
                        Image(systemName: "list.bullet")
                        Text("Voir carnet")
                    }
                    .font(.caption)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(Color.green.opacity(0.3))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding(10)
            .background(Color.green.opacity(0.1))
            .cornerRadius(12)
        } else {
            // Pas de séance - bouton démarrer
            Button(action: startWorkout) {
                VStack(spacing: 8) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .font(.title)
                        .foregroundColor(.green)

                    Text("Démarrer")
                        .font(.body)
                        .fontWeight(.semibold)

                    Text("Entraînement")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.green.opacity(0.2))
                .cornerRadius(12)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Stats Rapides

    private var quickStatsSection: some View {
        VStack(spacing: 8) {
            // Poids
            HStack {
                Image(systemName: "scalemass.fill")
                    .foregroundColor(.orange)
                Text(String(format: "%.1f kg", connectivityManager.watchData.currentWeight))
                    .font(.body)
                    .fontWeight(.semibold)
                Spacer()
            }

            // Hydratation
            HStack {
                Image(systemName: "drop.fill")
                    .foregroundColor(.cyan)
                Text("\(connectivityManager.watchData.hydrationCurrent)")
                    .font(.body)
                Text("/ \(connectivityManager.watchData.hydrationGoal) ml")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()

                // Mini progress
                Circle()
                    .trim(from: 0, to: connectivityManager.watchData.hydrationProgress)
                    .stroke(Color.cyan, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .frame(width: 20, height: 20)
                    .rotationEffect(.degrees(-90))
            }

            // Pas
            HStack {
                Image(systemName: "figure.walk")
                    .foregroundColor(.green)
                Text("\(healthKitManager.todaySteps)")
                    .font(.body)
                Text("pas")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
            }

            // BPM si disponible
            if healthKitManager.currentHeartRate > 0 {
                HStack {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.red)
                    Text("\(healthKitManager.currentHeartRate)")
                        .font(.body)
                    Text("bpm")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
        }
    }

    // MARK: - Status Connexion

    private var connectionStatus: some View {
        HStack {
            Circle()
                .fill(connectivityManager.isReachable ? Color.green : Color.orange)
                .frame(width: 8, height: 8)
            Text(connectivityManager.isReachable ? "Connecté" : "Hors ligne")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Actions

    private func startWorkout() {
        workoutSessionManager.startWorkout()
        haptics.playWorkoutStarted()
        connectivityManager.sendWorkoutStarted()
        showingWorkoutLog = true
    }
}

// MARK: - Stats

struct StatsView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager
    @EnvironmentObject var workoutSessionManager: WorkoutSessionManager

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Stats")
                    .font(.headline)

                // Calories
                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("\(healthKitManager.todayCalories) kcal")
                    Spacer()
                }

                // Entraînement actif
                if workoutSessionManager.workoutState == .active {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "dumbbell.fill")
                                .foregroundColor(.green)
                            Text("Séance")
                        }
                        Text(workoutSessionManager.elapsedTimeFormatted)
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(.green)
                    }
                }

                // Sommeil
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

                // Objectif poids
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "target")
                            .foregroundColor(.blue)
                        Text("Objectif")
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(String(format: "%.1f", connectivityManager.watchData.targetWeight))
                            .font(.title3)
                            .fontWeight(.semibold)
                        Text("kg")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    // Différence
                    let diff = connectivityManager.watchData.currentWeight - connectivityManager.watchData.targetWeight
                    Text(String(format: "%+.1f kg", diff))
                        .font(.caption)
                        .foregroundColor(diff <= 0 ? .green : .orange)
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
        .environmentObject(WorkoutSessionManager.shared)
}
