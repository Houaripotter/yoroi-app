// ============================================
// YOROI WATCH - Vue Réglages
// Configuration et informations sur l'app
// ============================================

import SwiftUI

struct SettingsView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var useDemoMode = false
    @State private var hapticEnabled = true
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Header
                HStack(spacing: 6) {
                    Image(systemName: "gearshape.fill")
                        .foregroundColor(.gray)
                    Text("RÉGLAGES")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.gray)
                }
                .padding(.top, 8)
                
                // Section Profil
                VStack(spacing: 8) {
                    HStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.2))
                            .frame(width: 40, height: 40)
                            .overlay(
                                Image(systemName: "person.fill")
                                    .foregroundColor(.accentColor)
                            )
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(healthManager.currentWeight > 0 ? "Utilisateur Yoroi" : "En attente sync...")
                                .font(.system(size: 14, weight: .bold))
                            Text(healthManager.streak > 0 ? "Série: \(healthManager.streak) jours" : "Connecte ton iPhone")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(10)
                    .background(Color.gray.opacity(0.12))
                    .cornerRadius(12)
                }
                .padding(.horizontal, 8)
                
                // Options
                VStack(spacing: 0) {
                    Toggle(isOn: $useDemoMode) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Mode Démo")
                                .font(.system(size: 13, weight: .semibold))
                            Text("Utiliser des données mock")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 10)
                    
                    Divider().background(Color.gray.opacity(0.3))
                    
                    Toggle(isOn: $hapticEnabled) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Haptique")
                                .font(.system(size: 13, weight: .semibold))
                            Text("Vibrations lors des actions")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 10)
                }
                .background(Color.gray.opacity(0.12))
                .cornerRadius(12)
                .padding(.horizontal, 8)
                
                // Info Version
                VStack(spacing: 2) {
                    Text("Yoroi App")
                        .font(.system(size: 10, weight: .bold))
                }
                .padding(.top, 4)
                
                // Bouton Déconnexion (Sync Reset)
                Button(action: {
                    healthManager.resetAllData()
                    WKInterfaceDevice.current().play(.failure)
                }) {
                    Text("EFFACER TOUTES LES DONNÉES")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.red)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
                
                Button(action: {
                    healthManager.fetchAllData()
                }) {
                    Text("Forcer Synchronisation")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.blue)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
            }
            .padding(.bottom, 20)
        }
        .background(Color.black)
    }
}

#Preview {
    SettingsView()
}
