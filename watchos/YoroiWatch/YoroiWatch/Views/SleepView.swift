// ============================================
// YOROI WATCH - Vue Sommeil
// ============================================

import SwiftUI

struct SleepView: View {
    @ObservedObject var healthKit = HealthKitService.shared

    private let sleepGoal: Double = 8.0 // heures

    var sleepQuality: (text: String, color: Color) {
        let hours = healthKit.sleepHours
        if hours >= 7.5 {
            return ("Excellent", .green)
        } else if hours >= 6.5 {
            return ("Bon", .yellow)
        } else if hours >= 5 {
            return ("Moyen", .orange)
        } else {
            return ("Insuffisant", .red)
        }
    }

    var progress: Double {
        min(healthKit.sleepHours / sleepGoal, 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Titre
                HStack {
                    Image(systemName: "moon.zzz.fill")
                        .foregroundColor(.purple)
                    Text("Sommeil")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }

                // Affichage principal
                ZStack {
                    // Arc de fond
                    Circle()
                        .trim(from: 0.15, to: 0.85)
                        .stroke(Color.purple.opacity(0.2), lineWidth: 10)
                        .rotationEffect(.degrees(90))

                    // Arc de progression
                    Circle()
                        .trim(from: 0.15, to: 0.15 + (progress * 0.7))
                        .stroke(
                            LinearGradient(
                                colors: [.purple, .indigo],
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            style: StrokeStyle(lineWidth: 10, lineCap: .round)
                        )
                        .rotationEffect(.degrees(90))
                        .animation(.easeInOut(duration: 0.5), value: progress)

                    // Contenu central
                    VStack(spacing: 4) {
                        Text(formatSleepTime(healthKit.sleepHours))
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)

                        Text("sur \(Int(sleepGoal))h")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)

                        // Badge qualité
                        Text(sleepQuality.text)
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(sleepQuality.color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(sleepQuality.color.opacity(0.2))
                            .cornerRadius(6)
                    }
                }
                .frame(width: 110, height: 110)

                // Indicateurs
                HStack(spacing: 12) {
                    SleepIndicator(
                        icon: "bed.double.fill",
                        value: formatBedtime(),
                        label: "Coucher",
                        color: .indigo
                    )

                    SleepIndicator(
                        icon: "alarm.fill",
                        value: formatWakeTime(),
                        label: "Réveil",
                        color: .orange
                    )
                }
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(Color.white.opacity(0.1))
                .cornerRadius(10)

                // Conseil
                if healthKit.sleepHours < 7 {
                    HStack {
                        Image(systemName: "lightbulb.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 10))
                        Text("Essayez de dormir plus pour optimiser la récupération")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                    .padding(8)
                    .background(Color.yellow.opacity(0.1))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal, 8)
        }
    }

    private func formatSleepTime(_ hours: Double) -> String {
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        return "\(h)h\(String(format: "%02d", m))"
    }

    private func formatBedtime() -> String {
        // Estimation basée sur le réveil - durée de sommeil
        let calendar = Calendar.current
        let now = Date()
        let bedtime = calendar.date(byAdding: .hour, value: -Int(healthKit.sleepHours), to: now) ?? now
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: bedtime)
    }

    private func formatWakeTime() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: Date())
    }
}

struct SleepIndicator: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(color)
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 8))
                .foregroundColor(.gray)
        }
    }
}

#Preview {
    SleepView()
}
