// ============================================
// YOROI WATCH - Vue Profil + Dojo combinés
// Badge, Rang, Niveau, Avatar, Stats en une seule page scrollable
// ============================================

import SwiftUI

struct ProfileDojoView: View {
    @StateObject private var healthManager = HealthManager.shared

    // Badges (à synchroniser avec l'iPhone plus tard)
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
                // ============================================
                // SECTION PROFIL
                // ============================================

                // AVATAR + GRADE (Données synchronisées depuis iPhone)
                VStack(spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(LinearGradient(colors: [.purple.opacity(0.3), .black], startPoint: .top, endPoint: .bottom))
                            .frame(width: 80, height: 80)

                        Image(systemName: "figure.martial.arts")
                            .font(.system(size: 40))
                            .foregroundColor(.white)
                            .shadow(color: .purple, radius: 8)
                    }

                    Text(healthManager.userRank.uppercased())
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)

                    Text("Niveau \(healthManager.userLevel)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.purple)
                }
                .padding(.top, 10)

                // STATS RÉSUMÉ (Données réelles)
                HStack(spacing: 6) {
                    ProfileStatBox(label: "SÉRIE", value: "\(healthManager.streak)j", color: .orange)
                    ProfileStatBox(label: "SÉANCES", value: "\(healthManager.workoutHistory.count)", color: .green)
                    ProfileStatBox(label: "NIVEAU", value: "\(healthManager.userLevel)", color: .purple)
                }
                .padding(.horizontal, 4)

                // ============================================
                // SECTION DOJO
                // ============================================

                // TITRE DOJO
                Text("MON DOJO")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.orange)
                    .padding(.top, 8)

                // STATS (basées sur les données réelles)
                HStack(spacing: 6) {
                    DojoStatBox(label: "POIDS", value: healthManager.currentWeight > 0 ? String(format: "%.1f", healthManager.currentWeight) : "-", color: .red)
                    DojoStatBox(label: "EAU", value: String(format: "%.1f", healthManager.waterIntake / 1000), color: .blue)
                    DojoStatBox(label: "PAS", value: "\(Int(healthManager.stepsToday / 1000))k", color: .green)
                }
                .padding(.horizontal, 4)

                // ============================================
                // SECTION BADGES
                // ============================================

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
                                    .frame(width: 36, height: 36)
                                    .overlay(
                                        Image(systemName: badge.1)
                                            .foregroundColor(badge.2)
                                            .font(.system(size: 16))
                                    )

                                Text(badge.0)
                                    .font(.system(size: 7, weight: .bold))
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                }
                .padding(10)
                .background(Color.gray.opacity(0.12))
                .cornerRadius(16)
                .padding(.horizontal, 4)

                // PROCHAIN NIVEAU
                VStack(spacing: 4) {
                    Text("PROCHAIN NIVEAU")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(.gray)

                    HStack(spacing: 8) {
                        Image(systemName: "arrow.up.circle.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 16))

                        VStack(alignment: .leading, spacing: 2) {
                            Text("NIVEAU \(healthManager.userLevel + 1)")
                                .font(.system(size: 12, weight: .black))
                                .foregroundColor(.yellow)
                            Text("Continue à t'entraîner!")
                                .font(.system(size: 8))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.yellow.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding(.top, 8)

                Spacer(minLength: 30)
            }
        }
        .background(Color.black)
        .navigationTitle("PROFIL")
    }
}

#Preview {
    ProfileDojoView()
}
