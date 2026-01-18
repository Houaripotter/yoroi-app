// ============================================
// YOROI WATCH - Vue Charge d'Entraînement
// ============================================

import SwiftUI

struct TrainingLoadView: View {
    @ObservedObject var healthKit = HealthKitService.shared
    @State private var weeklyLoad: Int = 420 // minutes
    @State private var lastWeekLoad: Int = 380
    @State private var acuteLoad: Int = 150 // charge aiguë (7 jours)
    @State private var chronicLoad: Int = 120 // charge chronique (28 jours)

    var loadRatio: Double {
        guard chronicLoad > 0 else { return 1.0 }
        return Double(acuteLoad) / Double(chronicLoad)
    }

    var loadStatus: (text: String, color: Color, advice: String) {
        if loadRatio < 0.8 {
            return ("Sous-entraînement", .blue, "Augmentez progressivement")
        } else if loadRatio <= 1.3 {
            return ("Optimal", .green, "Zone idéale")
        } else if loadRatio <= 1.5 {
            return ("Attention", .orange, "Risque de fatigue")
        } else {
            return ("Danger", .red, "Risque de blessure")
        }
    }

    var loadChange: Int {
        weeklyLoad - lastWeekLoad
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Titre
                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("Charge")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }

                // Jauge principale
                ZStack {
                    // Arc de fond
                    LoadGaugeArc(progress: 1, color: Color.gray.opacity(0.2))

                    // Arc coloré selon la zone
                    LoadGaugeArc(progress: min(loadRatio / 2, 1), color: loadStatus.color)

                    // Valeur centrale
                    VStack(spacing: 2) {
                        Text(String(format: "%.2f", loadRatio))
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                        Text("ACWR")
                            .font(.system(size: 8))
                            .foregroundColor(.gray)
                    }
                }
                .frame(width: 90, height: 60)

                // Status
                HStack {
                    Circle()
                        .fill(loadStatus.color)
                        .frame(width: 8, height: 8)
                    Text(loadStatus.text)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(loadStatus.color)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(loadStatus.color.opacity(0.15))
                .cornerRadius(10)

                // Stats hebdo
                HStack(spacing: 8) {
                    LoadStatBox(
                        title: "Semaine",
                        value: "\(weeklyLoad)",
                        unit: "min",
                        change: loadChange,
                        color: .orange
                    )

                    LoadStatBox(
                        title: "Calories",
                        value: "\(Int(healthKit.activeCalories))",
                        unit: "kcal",
                        change: nil,
                        color: .red
                    )
                }

                // Zones de charge
                VStack(spacing: 4) {
                    LoadZoneBar(label: "Aiguë (7j)", value: acuteLoad, maxValue: 200, color: .orange)
                    LoadZoneBar(label: "Chronique", value: chronicLoad, maxValue: 200, color: .purple)
                }
                .padding(8)
                .background(Color.white.opacity(0.1))
                .cornerRadius(10)

                // Conseil
                Text(loadStatus.advice)
                    .font(.system(size: 9))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 8)
        }
    }
}

struct LoadGaugeArc: View {
    let progress: Double
    let color: Color

    var body: some View {
        Circle()
            .trim(from: 0.25, to: 0.25 + (progress * 0.5))
            .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
            .rotationEffect(.degrees(0))
    }
}

struct LoadStatBox: View {
    let title: String
    let value: String
    let unit: String
    let change: Int?
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(title)
                .font(.system(size: 8))
                .foregroundColor(.gray)
            HStack(alignment: .bottom, spacing: 1) {
                Text(value)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text(unit)
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
            }
            if let change = change {
                HStack(spacing: 2) {
                    Image(systemName: change >= 0 ? "arrow.up" : "arrow.down")
                        .font(.system(size: 8))
                    Text("\(abs(change))")
                        .font(.system(size: 8))
                }
                .foregroundColor(change >= 0 ? .green : .red)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(color.opacity(0.15))
        .cornerRadius(8)
    }
}

struct LoadZoneBar: View {
    let label: String
    let value: Int
    let maxValue: Int
    let color: Color

    var progress: Double {
        min(Double(value) / Double(maxValue), 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(label)
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
                Spacer()
                Text("\(value) min")
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundColor(.white)
            }
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 4)
                        .cornerRadius(2)

                    Rectangle()
                        .fill(color)
                        .frame(width: geometry.size.width * progress, height: 4)
                        .cornerRadius(2)
                }
            }
            .frame(height: 4)
        }
    }
}

#Preview {
    TrainingLoadView()
}
