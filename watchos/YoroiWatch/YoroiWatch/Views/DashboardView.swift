// ============================================
// YOROI WATCH - Dashboard principal
// ============================================

import SwiftUI

struct DashboardView: View {
    @ObservedObject var healthKit = HealthKitService.shared
    @State private var streak: Int = 12
    @State private var todayTraining: Bool = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Logo YOROI
                HStack {
                    Text("YOROI")
                        .font(.system(size: 18, weight: .black))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.yellow, .orange],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                }
                .padding(.top, 4)

                // Poids actuel - Carte principale
                VStack(spacing: 6) {
                    HStack {
                        Image(systemName: "scalemass.fill")
                            .foregroundColor(.cyan)
                            .font(.system(size: 12))
                        Text("Poids")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.gray)
                        Spacer()
                    }

                    HStack(alignment: .bottom, spacing: 2) {
                        Text(String(format: "%.1f", healthKit.currentWeight > 0 ? healthKit.currentWeight : 78.5))
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                        Text("kg")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.gray)
                            .padding(.bottom, 4)
                    }

                    // Barre de progression vers objectif
                    ProgressView(value: 0.7)
                        .progressViewStyle(LinearProgressViewStyle(tint: .cyan))
                        .scaleEffect(x: 1, y: 0.6, anchor: .center)
                }
                .padding(10)
                .frame(maxWidth: .infinity)
                .background(Color.white.opacity(0.08))
                .cornerRadius(14)

                // Stats rapides (Série + Aujourd'hui)
                HStack(spacing: 8) {
                    // Série
                    VStack(spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "flame.fill")
                                .foregroundColor(.orange)
                                .font(.system(size: 12))
                            Text("\(streak)")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.orange)
                        }
                        Text("Série")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.orange.opacity(0.15))
                    .cornerRadius(10)

                    // Aujourd'hui
                    VStack(spacing: 4) {
                        Image(systemName: todayTraining ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 18))
                            .foregroundColor(todayTraining ? .green : .gray)
                        Text("Aujourd'hui")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(todayTraining ? Color.green.opacity(0.15) : Color.white.opacity(0.08))
                    .cornerRadius(10)
                    .onTapGesture {
                        todayTraining.toggle()
                    }
                }

                // Indicateurs santé
                HStack(spacing: 6) {
                    MiniHealthIndicator(
                        icon: "drop.fill",
                        value: "\(Int(healthKit.waterIntake))",
                        unit: "mL",
                        color: .cyan
                    )

                    MiniHealthIndicator(
                        icon: "moon.fill",
                        value: String(format: "%.1f", healthKit.sleepHours),
                        unit: "h",
                        color: .purple
                    )

                    MiniHealthIndicator(
                        icon: "heart.fill",
                        value: "\(Int(healthKit.heartRate))",
                        unit: "bpm",
                        color: .red
                    )
                }

                // Pas du jour
                HStack {
                    Image(systemName: "figure.walk")
                        .foregroundColor(.green)
                        .font(.system(size: 12))
                    Text("\(healthKit.steps)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                    Text("pas")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Spacer()
                    Text("\(Int(healthKit.activeCalories)) kcal")
                        .font(.system(size: 10))
                        .foregroundColor(.orange)
                }
                .padding(8)
                .background(Color.white.opacity(0.08))
                .cornerRadius(8)
            }
            .padding(.horizontal, 8)
        }
    }
}

struct MiniHealthIndicator: View {
    let icon: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.system(size: 10))
            HStack(alignment: .bottom, spacing: 1) {
                Text(value)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                Text(unit)
                    .font(.system(size: 7))
                    .foregroundColor(.gray)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(color.opacity(0.15))
        .cornerRadius(8)
    }
}

#Preview {
    DashboardView()
}
