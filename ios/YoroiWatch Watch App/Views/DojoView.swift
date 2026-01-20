// ============================================
// YOROI WATCH - Vue Dojo
// Visualisation de l'avatar et de l'esprit combatif
// ============================================

import SwiftUI

struct DojoView: View {
    @StateObject private var healthManager = HealthManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // TITRE DOJO
                Text("MON DOJO")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.orange)
                    .padding(.top, 5)
                
                // VISUEL AVATAR (Grand)
                ZStack {
                    Circle()
                        .fill(LinearGradient(colors: [.orange.opacity(0.3), .black], startPoint: .top, endPoint: .bottom))
                        .frame(width: 120, height: 120)
                    
                    // On simule l'avatar avec une image système pour l'instant
                    Image(systemName: "figure.martial.arts")
                        .font(.system(size: 60))
                        .foregroundColor(.white)
                        .shadow(color: .orange, radius: 10)
                }
                
                // GRADE
                VStack(spacing: 2) {
                    Text("SAMURAI")
                        .font(.system(size: 18, weight: .black))
                    Text("Niveau 12")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.orange)
                }
                
                // STATS COMBAT
                HStack(spacing: 8) {
                    DojoStatBox(label: "FORCE", value: "85", color: .red)
                    DojoStatBox(label: "AGILITÉ", value: "72", color: .green)
                    DojoStatBox(label: "MENTAL", value: "90", color: .purple)
                }
                .padding(.horizontal, 4)
                
                Spacer(minLength: 20)
            }
        }
        .background(Color.black)
        .navigationTitle("DOJO")
    }
}

struct DojoStatBox: View {
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(label).font(.system(size: 7, weight: .black)).foregroundColor(.gray)
            Text(value).font(.system(size: 14, weight: .black, design: .rounded)).foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(8)
    }
}

#Preview {
    DojoView()
}
