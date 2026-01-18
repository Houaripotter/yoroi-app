// ============================================
// YOROI WATCH - Vue Hydratation
// ============================================

import SwiftUI
import WatchKit

struct HydrationView: View {
    @ObservedObject var healthKit = HealthKitService.shared
    @State private var showAddWater = false

    private let goal: Double = 2500 // mL
    private let quickAddOptions = [250, 500, 750]

    var progress: Double {
        min(healthKit.waterIntake / goal, 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Titre
                HStack {
                    Image(systemName: "drop.fill")
                        .foregroundColor(.cyan)
                    Text("Hydratation")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }

                // Cercle de progression
                ZStack {
                    Circle()
                        .stroke(Color.cyan.opacity(0.2), lineWidth: 8)

                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(
                            LinearGradient(
                                colors: [.cyan, .blue],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .animation(.easeInOut(duration: 0.5), value: progress)

                    VStack(spacing: 2) {
                        Text("\(Int(healthKit.waterIntake))")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                        Text("/ \(Int(goal)) mL")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                    }
                }
                .frame(width: 100, height: 100)

                // Boutons d'ajout rapide
                HStack(spacing: 8) {
                    ForEach(quickAddOptions, id: \.self) { amount in
                        Button(action: {
                            addWater(Double(amount))
                        }) {
                            VStack(spacing: 2) {
                                Image(systemName: "plus")
                                    .font(.system(size: 10))
                                Text("\(amount)")
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .foregroundColor(.cyan)
                            .frame(width: 45, height: 40)
                            .background(Color.cyan.opacity(0.2))
                            .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }

                // Stats
                HStack(spacing: 16) {
                    VStack {
                        Text("\(Int(progress * 100))%")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.cyan)
                        Text("Objectif")
                            .font(.system(size: 8))
                            .foregroundColor(.gray)
                    }

                    VStack {
                        Text("\(Int(goal - healthKit.waterIntake))")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                        Text("Restant")
                            .font(.system(size: 8))
                            .foregroundColor(.gray)
                    }
                }
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(Color.white.opacity(0.1))
                .cornerRadius(10)
            }
            .padding(.horizontal, 8)
        }
    }

    private func addWater(_ amount: Double) {
        healthKit.saveWater(amount)
        WKInterfaceDevice.current().play(.click)
    }
}

#Preview {
    HydrationView()
}
