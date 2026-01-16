//
//  HydrationView.swift
//  YoroiWatch Watch App
//

import SwiftUI
import WatchKit

struct HydrationView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    @State private var showingConfirmation = false
    @State private var lastAddedAmount = 0

    let quickOptions = [150, 250, 330, 500]

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                HStack {
                    Image(systemName: "drop.fill")
                        .foregroundColor(.cyan)
                    Text("Hydratation")
                        .font(.headline)
                }

                Text("\(connectivityManager.watchData.hydrationCurrent)")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.cyan)

                Text("/ \(connectivityManager.watchData.hydrationGoal) ml")
                    .font(.caption)
                    .foregroundColor(.secondary)

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
                }

                Text("Ajouter")
                    .font(.caption)
                    .foregroundColor(.secondary)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(quickOptions, id: \.self) { amount in
                        Button(action: { addHydration(amount) }) {
                            Text("+\(amount)")
                                .font(.caption)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 6)
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
            VStack {
                Spacer()
                if showingConfirmation {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("+\(lastAddedAmount)ml")
                    }
                    .padding(8)
                    .background(Color.green.opacity(0.2))
                    .cornerRadius(20)
                }
            }
            .animation(.easeInOut, value: showingConfirmation)
        )
    }

    private func addHydration(_ amount: Int) {
        WKInterfaceDevice.current().play(.success)
        connectivityManager.sendHydrationAdded(amount: amount)
        healthKitManager.saveWaterIntake(amount)
        lastAddedAmount = amount
        showingConfirmation = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showingConfirmation = false
        }
    }
}
