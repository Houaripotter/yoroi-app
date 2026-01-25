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

                // AVATAR + GRADE
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

                    Text("SAMURAI")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)

                    Text("Niveau 12 • 1565 XP")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.purple)
                }
                .padding(.top, 10)

                // STATS RÉSUMÉ
                HStack(spacing: 6) {
                    ProfileStatBox(label: "SÉRIE", value: "\(healthManager.streak)j", color: .orange)
                    ProfileStatBox(label: "SÉANCES", value: "\(healthManager.workoutHistory.count)", color: .green)
                    ProfileStatBox(label: "BADGES", value: "7", color: .purple)
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

                // STATS COMBAT
                HStack(spacing: 6) {
                    DojoStatBox(label: "FORCE", value: "85", color: .red)
                    DojoStatBox(label: "AGILITÉ", value: "72", color: .green)
                    DojoStatBox(label: "MENTAL", value: "90", color: .purple)
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

                // PROCHAIN RANG
                VStack(spacing: 4) {
                    Text("PROCHAIN RANG")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(.gray)

                    HStack(spacing: 8) {
                        Image(systemName: "crown.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 16))

                        VStack(alignment: .leading, spacing: 2) {
                            Text("SHOGUN")
                                .font(.system(size: 12, weight: .black))
                                .foregroundColor(.yellow)
                            Text("Dans 435 XP")
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
