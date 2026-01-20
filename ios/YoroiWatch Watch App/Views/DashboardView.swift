// ============================================
// YOROI WATCH - Dashboard principal
// Adapté pour toutes les tailles Apple Watch
// Deux pages verticales : Résumé (Haut) et Détails (Bas)
// ============================================

import SwiftUI

struct DashboardView: View {
    @StateObject private var healthManager = HealthManager.shared

    var body: some View {
        GeometryReader { geometry in
            let isSmallWatch = geometry.size.width < 170
            let ringSize = geometry.size.width * 0.42
            
            TabView {
                // PAGE 1: RÉSUMÉ (Anneaux + Poids)
                VStack(spacing: 8) {
                    // Sync Status
                    Button(action: {
                        WKInterfaceDevice.current().play(.click)
                        healthManager.fetchAllData()
                    }) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(healthManager.currentWeight > 0 ? Color.green : Color.orange)
                                .frame(width: 6, height: 6)
                            Text(healthManager.currentWeight > 0 ? "Connecté" : "Sync...")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.gray)
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 4)
                    
                    // GRANDS ANNEAUX
                    ZStack {
                        // Pas Ring
                        ProgressRing(
                            progress: Double(healthManager.steps) / 10000.0,
                            color: .green,
                            size: ringSize * 1.6,
                            thickness: 10
                        )
                        VStack {
                            Image(systemName: "figure.walk")
                                .font(.system(size: 12))
                                .foregroundColor(.green)
                            Text(formatSteps(healthManager.steps))
                                .font(.system(size: 14, weight: .bold))
                        }
                        .offset(y: -ringSize * 0.7)
                        
                        // Kcal Ring
                        ProgressRing(
                            progress: healthManager.activeCalories / 800.0,
                            color: .red,
                            size: ringSize * 1.15,
                            thickness: 10
                        )
                        VStack {
                            Text("\(Int(healthManager.activeCalories))")
                                .font(.system(size: 12, weight: .bold))
                            Image(systemName: "flame.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.red)
                        }
                        .offset(x: ringSize * 0.55, y: ringSize * 0.2)
                        
                        // Eau Ring
                        ProgressRing(
                            progress: healthManager.waterIntake / 2500.0,
                            color: .blue,
                            size: ringSize * 0.7,
                            thickness: 10
                        )
                        VStack {
                            Text("\(Int(healthManager.waterIntake))ml")
                                .font(.system(size: 10, weight: .bold))
                            Image(systemName: "drop.fill")
                                .font(.system(size: 8))
                                .foregroundColor(.blue)
                        }
                    }
                    .frame(height: ringSize * 1.7)
                    
                    // CARTE POIDS
                    HStack {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("POIDS")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.gray)
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", healthManager.currentWeight))
                                    .font(.system(size: 24, weight: .black, design: .rounded))
                                Text("KG")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.orange)
                            }
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                    
                    // Indicateur page suivante
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.gray.opacity(0.5))
                        .padding(.bottom, 4)
                }
                .tag(0)
                
                // PAGE 2: DÉTAILS (Grille Stats)
                ScrollView {
                    VStack(spacing: 10) {
                        Text("DÉTAILS SANTÉ")
                            .font(.system(size: 12, weight: .black))
                            .foregroundColor(.accentColor)
                            .padding(.top, 10)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 8),
                            GridItem(.flexible(), spacing: 8)
                        ], spacing: 8) {
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
                                value: "\(healthManager.spO2)%",
                                label: "OXYGÈNE"
                            )

                            // SOMMEIL
                            DashboardStatCard(
                                icon: "moon.fill",
                                iconColor: .purple,
                                value: formatSleep(healthManager.sleepHours),
                                label: "SOMMEIL"
                            )
                            
                            // TEMPÉRATURE
                            DashboardStatCard(
                                icon: "thermometer.medium",
                                iconColor: .orange,
                                value: "36.6°", // Placeholder si pas de donnée
                                label: "CORPS"
                            )
                        }
                        .padding(.horizontal, 8)
                        
                        // STREAK
                        HStack {
                            Image(systemName: "flame.fill")
                                .foregroundColor(.orange)
                            Text("\(healthManager.streak) Jours de suite")
                                .font(.system(size: 14, weight: .bold))
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.gray.opacity(0.15))
                        .cornerRadius(12)
                        .padding(.horizontal, 8)
                    }
                    .padding(.bottom, 20)
                }
                .tag(1)
            }
            .tabViewStyle(.verticalPage)
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