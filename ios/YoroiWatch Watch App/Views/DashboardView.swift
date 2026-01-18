// ============================================
// YOROI WATCH - Dashboard principal
// Adapté pour toutes les tailles Apple Watch
// ============================================

import SwiftUI

struct DashboardView: View {
    @StateObject private var healthManager = HealthManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Grille de stats 2x2
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 6),
                    GridItem(.flexible(), spacing: 6)
                ], spacing: 6) {
                    // BPM
                    DashboardStatCard(
                        icon: "heart.fill",
                        iconColor: .red,
                        value: healthManager.heartRate > 0 ? "\(Int(healthManager.heartRate))" : "--",
                        label: "BPM"
                    )

                    // SpO2
                    DashboardStatCard(
                        icon: "waveform.path.ecg",
                        iconColor: .cyan,
                        value: "\(healthManager.spO2)",
                        label: "SpO2"
                    )

                    // PAS
                    DashboardStatCard(
                        icon: "figure.walk",
                        iconColor: .green,
                        value: formatSteps(healthManager.steps),
                        label: "PAS"
                    )

                    // SOMMEIL
                    DashboardStatCard(
                        icon: "moon.fill",
                        iconColor: .purple,
                        value: formatSleep(healthManager.sleepHours),
                        label: "SOMMEIL"
                    )
                }
                .padding(.horizontal, 8)
                .padding(.top, 8)

                // Ligne avec flamme (série), entraînements et hydratation
                HStack(spacing: 6) {
                    // Série/Streak
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.orange)

                        Text("\(healthManager.streak)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(10)

                    // Nombre d'entraînements
                    HStack(spacing: 4) {
                        Image(systemName: "dumbbell.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.green)

                        Text("\(healthManager.workoutHistory.count)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(10)

                    // Hydratation
                    HStack(spacing: 4) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.cyan)

                        Text("\(Int(healthManager.waterIntake))")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(10)
                }
                .padding(.horizontal, 8)
            }
        }
        .background(Color.black)
        .onAppear {
            healthManager.fetchAllData()
        }
    }

    private func formatSteps(_ steps: Int) -> String {
        if steps >= 1000 {
            return String(format: "%.1fk", Double(steps) / 1000)
        }
        return "\(steps)"
    }

    private func formatSleep(_ hours: Double) -> String {
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        return "\(h)h\(String(format: "%02d", m))"
    }
}

// MARK: - Carte de statistique du Dashboard

struct DashboardStatCard: View {
    let icon: String
    let iconColor: Color
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(iconColor)

            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)

            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }
}

#Preview {
    DashboardView()
}
