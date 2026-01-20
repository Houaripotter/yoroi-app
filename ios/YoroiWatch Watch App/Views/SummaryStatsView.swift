// ============================================
// YOROI WATCH - Vue Résumé Stats
// Graphiques sparklines pour toutes les métriques
// ============================================

import SwiftUI

struct SummaryStatsView: View {
    @StateObject private var healthManager = HealthManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("RÉSUMÉ")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.accentColor)
                    .padding(.top, 5)
                
                // Section Corps
                StatSectionHeader(title: "CORPS")
                StatSparklineCard(title: "Poids", value: String(format: "%.1f", healthManager.currentWeight), unit: "kg", color: .orange, data: healthManager.weightHistory.map { $0.weight })
                
                // Section Activité
                StatSectionHeader(title: "ACTIVITÉ")
                StatSparklineCard(title: "Pas", value: "\(healthManager.steps)", unit: "", color: .green, data: [4000, 7000, 5000, 9000, 12000, 8000, 10000]) // Mock si pas d'historique
                StatSparklineCard(title: "Calories", value: "\(Int(healthManager.activeCalories))", unit: "kcal", color: .red, data: [200, 450, 300, 600, 800, 400, 500])
                
                // Section Santé
                StatSectionHeader(title: "SANTÉ")
                StatSparklineCard(title: "Rythme Card.", value: "\(Int(healthManager.heartRate))", unit: "bpm", color: .red, data: [65, 72, 68, 80, 75, 70, 68])
                StatSparklineCard(title: "Hydratation", value: "\(Int(healthManager.waterIntake))", unit: "ml", color: .blue, data: [1500, 2000, 1000, 2500, 3000, 2200, 2100])
                
                Spacer(minLength: 30)
            }
            .padding(.horizontal, 8)
        }
        .background(Color.black)
    }
}

struct StatSectionHeader: View {
    let title: String
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.gray)
            Spacer()
            Divider().frame(height: 1).background(Color.gray.opacity(0.3))
        }
        .padding(.top, 5)
    }
}

struct StatSparklineCard: View {
    let title: String
    let value: String
    let unit: String
    let color: Color
    let data: [Double]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(title).font(.system(size: 10, weight: .bold)).foregroundColor(.white)
                Spacer()
                Text(value).font(.system(size: 14, weight: .black, design: .rounded)).foregroundColor(color)
                Text(unit).font(.system(size: 8, weight: .bold)).foregroundColor(.gray)
            }
            
            // Mini Graphique (Sparkline)
            SparklineView(data: data, color: color)
                .frame(height: 25)
                .padding(.vertical, 2)
        }
        .padding(10)
        .background(Color.gray.opacity(0.12))
        .cornerRadius(12)
    }
}

#Preview {
    SummaryStatsView()
}