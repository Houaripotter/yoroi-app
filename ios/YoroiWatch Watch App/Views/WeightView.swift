//
//  WeightView.swift
//  YoroiWatch Watch App
//
//  Quick weight entry
//

import SwiftUI

struct WeightView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    @State private var inputWeight: Double = 78.0
    @State private var showingConfirmation = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Titre
                HStack {
                    Image(systemName: "scalemass.fill")
                        .foregroundColor(.orange)
                    Text("Poids")
                        .font(.headline)
                }

                // Poids actuel
                VStack(spacing: 2) {
                    Text("Actuel")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f kg", connectivityManager.watchData.currentWeight))
                        .font(.title2)
                        .fontWeight(.bold)
                }

                Divider()
                    .padding(.vertical, 4)

                // Nouvelle pesee
                Text("Nouvelle pesee")
                    .font(.caption)
                    .foregroundColor(.secondary)

                // Selecteur de poids avec Digital Crown
                VStack(spacing: 8) {
                    Text(String(format: "%.1f", inputWeight))
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.orange)

                    Text("kg")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .focusable(true)
                .digitalCrownRotation(
                    $inputWeight,
                    from: 40.0,
                    through: 200.0,
                    by: 0.1,
                    sensitivity: .medium,
                    isContinuous: false,
                    isHapticFeedbackEnabled: true
                )

                // Boutons ajustement rapide
                HStack(spacing: 12) {
                    Button(action: { inputWeight -= 0.1 }) {
                        Image(systemName: "minus")
                            .frame(width: 40, height: 40)
                            .background(Color.gray.opacity(0.3))
                            .cornerRadius(20)
                    }
                    .buttonStyle(.plain)

                    Button(action: { inputWeight += 0.1 }) {
                        Image(systemName: "plus")
                            .frame(width: 40, height: 40)
                            .background(Color.gray.opacity(0.3))
                            .cornerRadius(20)
                    }
                    .buttonStyle(.plain)
                }

                // Bouton enregistrer
                Button(action: saveWeight) {
                    HStack {
                        Image(systemName: "checkmark")
                        Text("Enregistrer")
                    }
                    .font(.caption)
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.orange)
                    .foregroundColor(.black)
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)

                // Objectif
                HStack {
                    Image(systemName: "target")
                        .foregroundColor(.blue)
                        .font(.caption2)
                    Text("Objectif: \(String(format: "%.1f", connectivityManager.watchData.targetWeight)) kg")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 4)
            }
            .padding()
        }
        .onAppear {
            inputWeight = connectivityManager.watchData.currentWeight
        }
        .overlay(
            VStack {
                Spacer()
                if showingConfirmation {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Enregistre!")
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

    private func saveWeight() {
        // Feedback haptique
        WKInterfaceDevice.current().play(.success)

        // Envoyer a l'iPhone
        connectivityManager.sendWeightAdded(weight: inputWeight)

        // Sauvegarder dans HealthKit
        healthKitManager.saveWeight(inputWeight)

        // Confirmation
        showingConfirmation = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showingConfirmation = false
        }
    }
}

#Preview {
    WeightView()
        .environmentObject(WatchConnectivityManager.shared)
        .environmentObject(HealthKitManager.shared)
}
