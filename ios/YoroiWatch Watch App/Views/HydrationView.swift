//
//  HydrationView.swift
//  YoroiWatch Watch App
//
//  Quick hydration tracking
//

import SwiftUI

struct HydrationView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    @State private var showingConfirmation = false
    @State private var lastAddedAmount = 0

    // Options d'ajout rapide
    let quickOptions = [150, 250, 330, 500]

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Titre
                HStack {
                    Image(systemName: "drop.fill")
                        .foregroundColor(.cyan)
                    Text("Hydratation")
                        .font(.headline)
                }

                // Progression actuelle
                VStack(spacing: 4) {
                    Text("\(connectivityManager.watchData.hydrationCurrent)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.cyan)

                    Text("/ \(connectivityManager.watchData.hydrationGoal) ml")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    // Barre de progression circulaire
                    ZStack {
                        Circle()
                            .stroke(Color.cyan.opacity(0.2), lineWidth: 8)
                            .frame(width: 60, height: 60)

                        Circle()
                            .trim(from: 0, to: connectivityManager.watchData.hydrationProgress)
                            .stroke(Color.cyan, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                            .frame(width: 60, height: 60)
                            .rotationEffect(.degrees(-90))

                        Text("\(Int(connectivityManager.watchData.hydrationProgress * 100))%")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                }

                // Boutons d'ajout rapide
                Text("Ajouter")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(quickOptions, id: \.self) { amount in
                        Button(action: {
                            addHydration(amount)
                        }) {
                            Text("+\(amount)ml")
                                .font(.caption)
                                .fontWeight(.medium)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(Color.cyan.opacity(0.2))
                                .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding()
        }
        .overlay(
            // Confirmation toast
            VStack {
                Spacer()
                if showingConfirmation {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("+\(lastAddedAmount)ml")
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.green.opacity(0.2))
                    .cornerRadius(20)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut, value: showingConfirmation)
        )
    }

    private func addHydration(_ amount: Int) {
        // Feedback haptique
        WKInterfaceDevice.current().play(.success)

        // Envoyer a l'iPhone
        connectivityManager.sendHydrationAdded(amount: amount)

        // Sauvegarder dans HealthKit
        healthKitManager.saveWaterIntake(amount)

        // Afficher confirmation
        lastAddedAmount = amount
        showingConfirmation = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showingConfirmation = false
        }
    }
}

#Preview {
    HydrationView()
        .environmentObject(WatchConnectivityManager.shared)
        .environmentObject(HealthKitManager.shared)
}
