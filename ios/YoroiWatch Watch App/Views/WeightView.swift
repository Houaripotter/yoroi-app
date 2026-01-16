//
//  WeightView.swift
//  YoroiWatch Watch App
//

import SwiftUI
import WatchKit

struct WeightView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    @State private var inputWeight: Double = 78.0
    @State private var showingConfirmation = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                HStack {
                    Image(systemName: "scalemass.fill")
                        .foregroundColor(.orange)
                    Text("Poids")
                        .font(.headline)
                }

                VStack(spacing: 2) {
                    Text("Actuel")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f kg", connectivityManager.watchData.currentWeight))
                        .font(.title3)
                        .fontWeight(.bold)
                }

                Divider()

                Text("Nouvelle pesee")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(String(format: "%.1f", inputWeight))
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.orange)
                    .focusable(true)
                    .digitalCrownRotation($inputWeight, from: 40.0, through: 200.0, by: 0.1, sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)

                Text("kg")
                    .font(.caption)
                    .foregroundColor(.secondary)

                HStack(spacing: 12) {
                    Button(action: { inputWeight -= 0.1 }) {
                        Image(systemName: "minus")
                            .frame(width: 36, height: 36)
                            .background(Color.gray.opacity(0.3))
                            .cornerRadius(18)
                    }
                    .buttonStyle(.plain)

                    Button(action: { inputWeight += 0.1 }) {
                        Image(systemName: "plus")
                            .frame(width: 36, height: 36)
                            .background(Color.gray.opacity(0.3))
                            .cornerRadius(18)
                    }
                    .buttonStyle(.plain)
                }

                Button(action: saveWeight) {
                    HStack {
                        Image(systemName: "checkmark")
                        Text("OK")
                    }
                    .font(.caption)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.orange)
                    .foregroundColor(.black)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
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
                    .padding(8)
                    .background(Color.green.opacity(0.2))
                    .cornerRadius(20)
                }
            }
            .animation(.easeInOut, value: showingConfirmation)
        )
    }

    private func saveWeight() {
        WKInterfaceDevice.current().play(.success)
        connectivityManager.sendWeightAdded(weight: inputWeight)
        healthKitManager.saveWeight(inputWeight)
        showingConfirmation = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showingConfirmation = false
        }
    }
}
