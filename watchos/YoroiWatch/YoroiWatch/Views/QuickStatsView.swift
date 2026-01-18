// ============================================
// YOROI WATCH - Stats rapides
// ============================================

import SwiftUI

struct QuickStatsView: View {
    @State private var weekSessions: Int = 4
    @State private var monthSessions: Int = 18
    @State private var totalHours: Double = 32.5

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Cette semaine")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Stats semaine
                HStack(spacing: 12) {
                    StatCard(value: "\(weekSessions)", label: "Séances", color: .blue)
                    StatCard(value: "\(Int(totalHours/4))h", label: "Durée", color: .green)
                }

                Divider()
                    .padding(.vertical, 4)

                Text("Ce mois")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Stats mois
                HStack(spacing: 12) {
                    StatCard(value: "\(monthSessions)", label: "Séances", color: .purple)
                    StatCard(value: "\(Int(totalHours))h", label: "Total", color: .orange)
                }
            }
            .padding(.horizontal, 8)
        }
    }
}

struct StatCard: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.1))
        .cornerRadius(10)
    }
}

#Preview {
    QuickStatsView()
}
