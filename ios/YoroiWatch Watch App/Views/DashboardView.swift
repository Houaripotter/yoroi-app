// ============================================
// YOROI WATCH - Dashboard principal
// Adapté pour toutes les tailles Apple Watch (y compris Ultra 2)
// Design entièrement scrollable et adaptatif
// ============================================

import SwiftUI

struct DashboardView: View {
    @StateObject private var healthManager = HealthManager.shared

    var body: some View {
        GeometryReader { geometry in
            let screenWidth = geometry.size.width
            let ringSize = screenWidth * 0.48
            
            ScrollView {
                VStack(spacing: 0) {
                    // 1. RÉSUMÉ ACTIVITÉ (Anneaux avec texte à l'intérieur)
                    ZStack {
                        // Pas (Extérieur)
                        ProgressRing(
                            progress: Double(healthManager.steps) / 10000.0,
                            color: .green,
                            size: ringSize * 1.8,
                            thickness: 14
                        )
                        .overlay(
                            Image(systemName: "figure.walk")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.green)
                                .offset(y: -ringSize * 0.82)
                        )
                        
                        // Kcal (Milieu)
                        ProgressRing(
                            progress: healthManager.activeCalories / 800.0,
                            color: .red,
                            size: ringSize * 1.25,
                            thickness: 14
                        )
                        .overlay(
                            Image(systemName: "flame.fill")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.red)
                                .offset(y: -ringSize * 0.55)
                        )
                        
                        // Eau (Intérieur)
                        ProgressRing(
                            progress: healthManager.waterIntake / healthManager.waterGoal,
                            color: .blue,
                            size: ringSize * 0.7,
                            thickness: 14
                        )
                        .overlay(
                            Image(systemName: "drop.fill")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.blue)
                                .offset(y: -ringSize * 0.28)
                        )
                        
                        // Valeur centrale (Active Kcal)
                        VStack(spacing: -2) {
                            Text("\(Int(healthManager.activeCalories))")
                                .font(.system(size: 18, weight: .black, design: .rounded))
                            Text("KCAL")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.gray)
                        }
                    }
                    .frame(height: ringSize * 1.9)
                    .padding(.top, -10) // Remonte tout en haut
                    
                    // 2. STATUS & SYNC (Compact sous les anneaux)
                    HStack {
                        Circle().fill(healthManager.currentWeight > 0 ? Color.green : Color.orange).frame(width: 4, height: 4)
                        Text(healthManager.currentWeight > 0 ? "SYNC OK" : "SYNC...")
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(.gray)
                        Spacer()
                        Text("\(healthManager.streak) JRS").foregroundColor(.orange).font(.system(size: 8, weight: .black))
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 10)

                    // 3. SECTION POIDS
                    HStack {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("POIDS ACTUEL")
                                .font(.system(size: 8, weight: .black))
                                .foregroundColor(.gray)
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", healthManager.currentWeight))
                                    .font(.system(size: 28, weight: .black, design: .rounded))
                                    .foregroundColor(.white)
                                Text("KG")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.orange)
                            }
                        }
                        Spacer()
                        Image(systemName: "scalemass.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.orange.opacity(0.5))
                    }
                    .padding(12)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(16)
                    .padding(.horizontal, 8)
                    
                    // 4. GRILLE SANTÉ
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        HealthDetailMiniCard(icon: "heart.fill", color: .red, value: healthManager.heartRate > 0 ? "\(Int(healthManager.heartRate))" : "--", unit: "BPM")
                        HealthDetailMiniCard(icon: "waveform.path.ecg", color: .cyan, value: "\(healthManager.spO2)", unit: "% SpO2")
                    }
                    .padding(.horizontal, 8)
                    .padding(.top, 8)
                    
                    Spacer(minLength: 20)
                }
            }
        }
        .background(Color.black)
        .onAppear {
            healthManager.fetchAllData()
        }
    }

    private func formatSteps(_ steps: Int) -> String {
        steps >= 1000 ? String(format: "%.1fk", Double(steps) / 1000) : "\(steps)"
    }

    private func formatSleep(_ hours: Double) -> String {
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        return "\(h)h\(String(format: "%02d", m))"
    }
}

    private func formatSteps(_ steps: Int) -> String {
        steps >= 1000 ? String(format: "%.1fk", Double(steps) / 1000) : "\(steps)"
    }

    private func formatSleep(_ hours: Double) -> String {
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        return "\(h)h\(String(format: "%02d", m))"
    }
}

struct HealthDetailMiniCard: View {
    let icon: String
    let color: Color
    let value: String
    let unit: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon).foregroundColor(color).font(.system(size: 14))
            Text(value).font(.system(size: 18, weight: .black))
            Text(unit).font(.system(size: 8, weight: .bold)).foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
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