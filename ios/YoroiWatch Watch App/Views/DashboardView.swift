// ============================================
// YOROI WATCH - Dashboard principal (V7)
// Design Musculation, Photo/Avatar, Poids/Eau Interactifs
// ============================================

import SwiftUI

struct DashboardView: View {
    @StateObject private var healthManager = HealthManager.shared
    @Binding var selectedTab: Int

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // 1. TOP HEADER
                HStack(spacing: 12) {
                    Button(action: { selectedTab = 7; WKInterfaceDevice.current().play(.click) }) {
                        Group {
                            if let data = healthManager.profilePhotoData, let uiImage = UIImage(data: data) {
                                Image(uiImage: uiImage).resizable().aspectRatio(contentMode: .fill)
                            } else {
                                Image(systemName: "person.crop.circle.fill").font(.system(size: 32)).foregroundColor(.purple)
                            }
                        }
                        .frame(width: 44, height: 44).clipShape(Circle())
                        .overlay(Circle().stroke(Color.purple.opacity(0.5), lineWidth: 2))
                    }.buttonStyle(.plain)
                    
                    Spacer()
                    
                    Button(action: { selectedTab = 6; WKInterfaceDevice.current().play(.click) }) {
                        ZStack {
                            Circle().fill(Color.orange.opacity(0.2)).frame(width: 44, height: 44)
                            Image(healthManager.avatarName == "ninja" ? "avatar_ninja" : "avatar_samurai")
                                .resizable().aspectRatio(contentMode: .fit).frame(width: 32, height: 32)
                        }
                        .overlay(Circle().stroke(Color.orange.opacity(0.5), lineWidth: 2))
                    }.buttonStyle(.plain)
                }
                .padding(.horizontal, 12).padding(.top, 5)
                
                // 2. SECTION POIDS
                Button(action: { selectedTab = 4; WKInterfaceDevice.current().play(.click) }) {
                    HStack {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("MON POIDS").font(.system(size: 8, weight: .black)).foregroundColor(.gray)
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text(String(format: "%.1f", healthManager.currentWeight)).font(.system(size: 28, weight: .black, design: .rounded)).foregroundColor(.white)
                                Text("KG").font(.system(size: 12, weight: .bold)).foregroundColor(.orange)
                            }
                        }
                        Spacer()
                        SparklineView(data: healthManager.weightHistory.map { $0.weight }, color: .orange).frame(width: 45, height: 25)
                        Image(systemName: "chevron.right").font(.system(size: 10, weight: .bold)).foregroundColor(.gray)
                    }
                    .padding(10).background(Color.orange.opacity(0.15)).cornerRadius(12)
                }.buttonStyle(.plain).padding(.horizontal, 8)

                // 3. SECTION HYDRATATION
                Button(action: { selectedTab = 3; WKInterfaceDevice.current().play(.click) }) {
                    HStack(spacing: 10) {
                        MiniAnimatedBottle(progress: healthManager.waterIntake / max(1, healthManager.waterGoal))
                            .frame(width: 25, height: 35)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("EAU DU JOUR").font(.system(size: 8, weight: .black)).foregroundColor(.gray)
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text("\(Int(healthManager.waterIntake))").font(.system(size: 22, weight: .black, design: .rounded)).foregroundColor(.white)
                                Text("ML").font(.system(size: 10, weight: .bold)).foregroundColor(.cyan)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 10, weight: .bold)).foregroundColor(.gray)
                    }
                    .padding(10).background(Color.cyan.opacity(0.15)).cornerRadius(12)
                }.buttonStyle(.plain).padding(.horizontal, 8)

                // 4. GRILLE DE MÉTRIQUES
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 6) {
                    MetricSquare(icon: "heart.fill", color: .red, value: healthManager.heartRate > 0 ? "\(Int(healthManager.heartRate))" : "--", label: "BPM")
                    MetricSquare(icon: "waveform.path.ecg", color: .cyan, value: "\(healthManager.spO2)", label: "SpO2 %")
                    MetricSquare(icon: "figure.walk", color: .green, value: formatSteps(healthManager.steps), label: "PAS")
                    MetricSquare(icon: "flame.fill", color: .red, value: "\(Int(healthManager.activeCalories))", label: "KCAL")
                }
                .padding(.horizontal, 8)
                
                Button(action: { selectedTab = 5; WKInterfaceDevice.current().play(.click) }) {
                    Text("BILAN COMPLET").font(.system(size: 9, weight: .black)).foregroundColor(.blue).padding(.vertical, 8).frame(maxWidth: .infinity).background(Color.blue.opacity(0.1)).cornerRadius(10)
                }.buttonStyle(.plain).padding(.horizontal, 8)

                Spacer(minLength: 35)
            }
        }
        .background(Color.black)
    }

    private func formatSteps(_ steps: Int) -> String {
        steps >= 1000 ? String(format: "%.1fk", Double(steps) / 1000) : "\(steps)"
    }
}

// MARK: - Mini Bouteille Animée
struct MiniAnimatedBottle: View {
    let progress: Double
    var body: some View {
        TimelineView(.animation) { (timeline: TimelineViewDefaultContext) in
            let now = timeline.date.timeIntervalSinceReferenceDate
            let angle = now.remainder(dividingBy: 2) * .pi * 2
            ZStack {
                WaterBottleShape().stroke(Color.cyan.opacity(0.3), lineWidth: 1)
                WaterBottleShape().fill(Color.cyan.opacity(0.8)).mask(
                    GeometryReader { geo in
                        VStack {
                            Spacer(minLength: 0)
                            WaveShape(offset: CGFloat(angle), percent: progress)
                                .fill(Color.cyan)
                                .frame(height: geo.size.height * CGFloat(min(1.0, progress)))
                        }
                    }
                ).clipShape(WaterBottleShape())
            }
        }
    }
}

#Preview {
    DashboardView(selectedTab: .constant(0))
}
