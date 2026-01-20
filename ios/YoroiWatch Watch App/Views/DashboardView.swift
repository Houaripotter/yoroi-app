// ============================================
// YOROI WATCH - Dashboard principal
// Adapté pour toutes les tailles Apple Watch
// ============================================

import SwiftUI

struct DashboardView: View {
    @StateObject private var healthManager = HealthManager.shared

    var body: some View {
        GeometryReader { geometry in
            let isSmallWatch = geometry.size.width < 170
            let ringSize = geometry.size.width * 0.38
            
            ScrollView {
                VStack(spacing: 10) {
                    // Espace de sécurité en haut
                    Spacer(minLength: 5)
                    
                    // STATUS SYNC (Nouveau)
                    Button(action: {
                        WKInterfaceDevice.current().play(.click)
                        healthManager.fetchAllData()
                    }) {
                        HStack {
                            Circle()
                                .fill(healthManager.currentWeight > 0 ? Color.green : Color.orange)
                                .frame(width: 6, height: 6)
                            Text(healthManager.currentWeight > 0 ? "Synchronisé" : "Sync iPhone...")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.gray)
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 8))
                                .foregroundColor(.blue)
                        }
                        .padding(.vertical, 4)
                        .padding(.horizontal, 8)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                    
                    // ANNEAUX DE PROGRESSION (Adaptatif)
                    HStack(spacing: geometry.size.width * 0.05) {
                        ZStack {
                            // Pas Ring
                            ProgressRing(
                                progress: Double(healthManager.steps) / 10000.0,
                                color: .green,
                                size: ringSize,
                                thickness: isSmallWatch ? 5 : 7
                            )
                            
                            // Calories Ring
                            ProgressRing(
                                progress: healthManager.activeCalories / 800.0,
                                color: .red,
                                size: ringSize * 0.74,
                                thickness: isSmallWatch ? 5 : 7
                            )
                            
                            // Hydratation Ring
                            ProgressRing(
                                progress: healthManager.waterIntake / 2500.0,
                                color: .blue,
                                size: ringSize * 0.48,
                                thickness: isSmallWatch ? 5 : 7
                            )
                        }
                        .padding(.leading, 4)
                        
                        VStack(alignment: .leading, spacing: isSmallWatch ? 2 : 4) {
                            RingLegende(icon: "figure.walk", label: "Pas", value: formatSteps(healthManager.steps), color: .green, isSmall: isSmallWatch)
                            RingLegende(icon: "flame.fill", label: "Kcal", value: "\(Int(healthManager.activeCalories))", color: .red, isSmall: isSmallWatch)
                            RingLegende(icon: "drop.fill", label: "Eau", value: "\(Int(healthManager.waterIntake))ml", color: .blue, isSmall: isSmallWatch)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 10)
                    .background(Color.gray.opacity(0.12))
                    .cornerRadius(16)
                    .padding(.horizontal, 4)
                    
                    // CARTE POIDS (Nouveau)
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("POIDS ACTUEL")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.gray)
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", healthManager.currentWeight))
                                    .font(.system(size: 20, weight: .black, design: .rounded))
                                Text("KG")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.orange)
                            }
                        }
                        Spacer()
                        Image(systemName: "scalemass.fill")
                            .foregroundColor(.orange)
                            .font(.system(size: 20))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 4)

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
                .padding(.bottom, 20)
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

// MARK: - Composants Visuels Dashboard

struct ProgressRing: View {
    let progress: Double
    let color: Color
    let size: CGFloat
    let thickness: CGFloat
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.2), lineWidth: thickness)
            
            Circle()
                .trim(from: 0, to: min(progress, 1.0))
                .stroke(
                    AngularGradient(
                        gradient: Gradient(colors: [color, color.opacity(0.8)]),
                        center: .center,
                        startAngle: .degrees(-90),
                        endAngle: .degrees(max(0.001, progress) * 360 - 90)
                    ),
                    style: StrokeStyle(lineWidth: thickness, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

struct RingLegende: View {
    let icon: String
    let label: String
    let value: String
    let color: Color
    let isSmall: Bool
    
    var body: some View {
        HStack(spacing: isSmall ? 4 : 6) {
            Image(systemName: icon)
                .font(.system(size: isSmall ? 8 : 10))
                .foregroundColor(color)
            
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.system(size: isSmall ? 10 : 11, weight: .bold))
                Text(label)
                    .font(.system(size: isSmall ? 6 : 7, weight: .semibold))
                    .foregroundColor(.gray)
            }
        }
    }
}

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