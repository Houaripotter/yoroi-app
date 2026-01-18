// ============================================
// YOROI WATCH - Vue Poids
// Avec graphique orange et bouton ajouter
// ============================================

import SwiftUI

struct WeightView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var showAddWeight = false
    @State private var newWeight: Double = 78.0

    var weightChange: Double {
        if healthManager.weightHistory.count >= 2 {
            let current = healthManager.currentWeight
            let previous = healthManager.weightHistory[healthManager.weightHistory.count - 2].weight
            return current - previous
        }
        return 0
    }

    var body: some View {
        VStack(spacing: 8) {
            // Titre
            HStack(spacing: 6) {
                Image(systemName: "scalemass.fill")
                    .foregroundColor(.orange)
                Text("POIDS")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.orange)
            }
            .padding(.top, 8)

            // Valeur actuelle
            HStack(alignment: .bottom) {
                Text(String(format: "%.1f", healthManager.currentWeight))
                    .font(.system(size: 44, weight: .bold))
                    .foregroundColor(.white)

                Text("kg")
                    .font(.system(size: 18))
                    .foregroundColor(.gray)
                    .padding(.bottom, 6)

                Spacer()

                // Changement et objectif
                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 2) {
                        Image(systemName: weightChange >= 0 ? "arrow.up.right" : "arrow.down.right")
                            .font(.system(size: 12))
                        Text(String(format: "%+.1f", weightChange))
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(weightChange <= 0 ? .green : .red)

                    Text("obj: \(String(format: "%.1f", healthManager.targetWeight))")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 8)

            // Graphique
            WeightChartView(data: healthManager.weightHistory)
                .frame(height: 60)
                .padding(.horizontal, 4)

            // Bouton ajouter
            Button(action: { showAddWeight = true }) {
                HStack {
                    Image(systemName: "plus")
                    Text("Ajouter")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.orange)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .background(Color.black)
        .sheet(isPresented: $showAddWeight) {
            AddWeightView(weight: $newWeight) {
                healthManager.saveWeight(newWeight)
                showAddWeight = false
            }
        }
    }
}

// MARK: - Graphique du poids

struct WeightChartView: View {
    let data: [(date: Date, weight: Double)]

    var minWeight: Double {
        (data.map { $0.weight }.min() ?? 75) - 0.5
    }

    var maxWeight: Double {
        (data.map { $0.weight }.max() ?? 80) + 0.5
    }

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let height = geo.size.height

            ZStack {
                // Ligne du graphique
                Path { path in
                    guard data.count > 1 else { return }

                    for (index, entry) in data.enumerated() {
                        let x = CGFloat(index) / CGFloat(data.count - 1) * width
                        let normalizedY = (entry.weight - minWeight) / (maxWeight - minWeight)
                        let y = height - (normalizedY * height)

                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .stroke(Color.orange, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))

                // Points et labels
                ForEach(Array(data.enumerated()), id: \.offset) { index, entry in
                    let x = CGFloat(index) / CGFloat(max(data.count - 1, 1)) * width
                    let normalizedY = (entry.weight - minWeight) / (maxWeight - minWeight)
                    let y = height - (normalizedY * height)

                    // Point
                    Circle()
                        .fill(Color.orange)
                        .frame(width: 6, height: 6)
                        .position(x: x, y: y)

                    // Label poids
                    Text(String(format: "%.1f", entry.weight))
                        .font(.system(size: 8))
                        .foregroundColor(.white)
                        .position(x: x, y: y - 12)

                    // Label jour
                    Text(dayLabel(entry.date))
                        .font(.system(size: 7))
                        .foregroundColor(.gray)
                        .position(x: x, y: height + 8)
                }
            }
        }
    }

    private func dayLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "E"
        formatter.locale = Locale(identifier: "fr_FR")
        return String(formatter.string(from: date).prefix(1).uppercased())
    }
}

// MARK: - Vue ajout poids

struct AddWeightView: View {
    @Binding var weight: Double
    let onSave: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("Nouveau poids")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.gray)

            HStack {
                Button(action: { weight -= 0.1 }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.orange)
                }
                .buttonStyle(.plain)

                Text(String(format: "%.1f", weight))
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 80)

                Button(action: { weight += 0.1 }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.orange)
                }
                .buttonStyle(.plain)
            }

            Text("kg")
                .font(.system(size: 14))
                .foregroundColor(.gray)

            Button(action: onSave) {
                Text("Enregistrer")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.orange)
                    .cornerRadius(10)
            }
            .buttonStyle(.plain)
            .padding(.horizontal)
        }
        .background(Color.black)
    }
}

#Preview {
    WeightView()
}
