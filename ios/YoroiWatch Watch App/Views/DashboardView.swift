// ============================================
// YOROI WATCH - Dashboard principal
// Adapté pour toutes les tailles Apple Watch
// ============================================

import SwiftUI

struct DashboardView: View {
    @StateObject private var healthManager = HealthManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Logo YOROI avec avatar
                HStack(spacing: 8) {
                    // Avatar/Logo rond
                    ZStack {
                        Circle()
                            .fill(Color.black)
                            .frame(width: 35, height: 35)
                            .overlay(
                                Circle()
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )

                        // Image du samourai
                        Image(systemName: "figure.martial.arts")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                    }

                    Text("YOROI")
                        .font(.system(size: 18, weight: .black))
                        .foregroundColor(.white)
                }
                .padding(.top, 4)

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

                // Ligne avec flamme (série) et hydratation
                HStack(spacing: 6) {
                    // Série/Streak
                    HStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .stroke(Color.gray.opacity(0.3), lineWidth: 3)
                                .frame(width: 30, height: 30)

                            Circle()
                                .trim(from: 0, to: 0.7)
                                .stroke(Color.orange, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                                .frame(width: 30, height: 30)
                                .rotationEffect(.degrees(-90))

                            Image(systemName: "flame.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.orange)
                        }

                        Text("\(healthManager.streak)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(12)

                    // Points/Pagination
                    HStack(spacing: 4) {
                        ForEach(0..<5, id: \.self) { i in
                            Circle()
                                .fill(i == 0 ? Color.white : Color.gray.opacity(0.5))
                                .frame(width: 6, height: 6)
                        }
                    }

                    // Hydratation
                    HStack(spacing: 6) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.cyan)

                        Text("\(Int(healthManager.waterIntake))")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(12)
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
