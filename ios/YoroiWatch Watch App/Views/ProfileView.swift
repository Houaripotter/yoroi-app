// ============================================
// YOROI WATCH - Vue Profil & Badges
// Progression, Grade et Collection
// ============================================

import SwiftUI

struct ProfileView: View {
    @StateObject private var healthManager = HealthManager.shared
    
    // Simuler les badges pour l'instant (à lier au système de badges iPhone plus tard)
    let badges = [
        ("Primeur", "star.fill", Color.yellow),
        ("Guerrier", "shield.fill", Color.orange),
        ("Hydraté", "drop.fill", Color.blue),
        ("Régulier", "flame.fill", Color.red),
        ("Sommeil", "moon.fill", Color.purple),
        ("Expert", "crown.fill", Color.yellow)
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // SECTION GRADE
                VStack(spacing: 4) {
                    ZStack {
                        Circle()
                            .stroke(Color.accentColor.opacity(0.2), lineWidth: 4)
                            .frame(width: 70, height: 70)
                        
                        Image(systemName: "person.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.accentColor)
                    }
                    
                    Text("SAMURAI")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)
                    
                    Text("Niveau 12")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.gray)
                }
                .padding(.top, 10)
                
                // STATS RÉSUMÉ
                HStack(spacing: 8) {
                    ProfileStatBox(label: "SÉRIE", value: "\(healthManager.streak)j", color: .orange)
                    ProfileStatBox(label: "SÉANCES", value: "\(healthManager.workoutHistory.count)", color: .green)
                }
                .padding(.horizontal, 8)
                
                // SECTION BADGES (Grille)
                VStack(alignment: .leading, spacing: 8) {
                    Text("MES BADGES")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.gray)
                        .padding(.leading, 8)
                    
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        ForEach(badges, id: \.0) { badge in
                            VStack(spacing: 4) {
                                Circle()
                                    .fill(badge.2.opacity(0.15))
                                    .frame(width: 40, height: 40)
                                    .overlay(
                                        Image(systemName: badge.1)
                                            .foregroundColor(badge.2)
                                            .font(.system(size: 18))
                                    )
                                
                                Text(badge.0)
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                }
                .padding(12)
                .background(Color.gray.opacity(0.12))
                .cornerRadius(20)
                .padding(.horizontal, 4)
                
                Spacer(minLength: 20)
            }
        }
        .background(Color.black)
        .navigationTitle("PROFIL")
    }
}

struct ProfileStatBox: View {
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.system(size: 8, weight: .black))
                .foregroundColor(.gray)
            Text(value)
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }
}

#Preview {
    ProfileView()
}
