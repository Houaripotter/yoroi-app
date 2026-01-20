// ============================================
// YOROI WATCH - Vue Réglages
// Configuration et informations sur l'app
// ============================================

import SwiftUI

struct SettingsView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var hapticEnabled = true
    
    // Secret Menu State
    @State private var versionTapCount = 0
    @State private var showCodeInput = false
    @State private var enteredCode = ""
    @State private var isScreenshotMode = false
    
    var body: some View {
        List {
            // SECTION UTILISATEUR
            Section(header: Text("PROFIL").font(.system(size: 10, weight: .black))) {
                HStack(spacing: 10) {
                    Image(systemName: "person.crop.circle.fill")
                        .foregroundColor(.accentColor)
                        .font(.system(size: 24))
                    
                    VStack(alignment: .leading, spacing: 0) {
                        Text(healthManager.currentWeight > 0 ? "Utilisateur" : "Non Sync")
                            .font(.system(size: 13, weight: .bold))
                        Text("\(healthManager.streak) jours de série")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                }
                .padding(.vertical, 4)
            }
            
            // SECTION SYNCHRONISATION
            Section(header: Text("IPHONE SYNC").font(.system(size: 10, weight: .black))) {
                Button(action: {
                    WKInterfaceDevice.current().play(.click)
                    healthManager.fetchAllData()
                }) {
                    Label("Sync iPhone", systemImage: "arrow.triangle.2.circlepath")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.blue)
                }
                
                Button(action: {
                    // Envoyer un signal de test à l'iPhone
                    WatchConnectivityManager.shared.sendToiPhone(["ping": true], forKey: "testSignal") { _ in
                        WKInterfaceDevice.current().play(.success)
                    }
                }) {
                    Label("Tester Connexion", systemImage: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 12, weight: .semibold))
                }
            }
            
            // SECTION PRÉFÉRENCES
            Section(header: Text("PRÉFÉRENCES").font(.system(size: 10, weight: .black))) {
                Toggle("Haptique", isOn: $hapticEnabled)
                    .font(.system(size: 12, weight: .semibold))
                
                if isScreenshotMode {
                    HStack {
                        Label("Mode Screenshot", systemImage: "camera.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.orange)
                        Spacer()
                        Image(systemName: "checkmark.circle.fill").foregroundColor(.orange)
                    }
                }
            }
            
            // SECTION MAINTENANCE
            Section(header: Text("MAINTENANCE").font(.system(size: 10, weight: .black))) {
                Button(action: {
                    healthManager.resetAllData()
                    isScreenshotMode = false
                    WKInterfaceDevice.current().play(.failure)
                }) {
                    Text("Effacer Données")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.red)
                }
            }
            
            // VERSION & SECRET
            Section {
                Button(action: handleVersionTap) {
                    Text("Yoroi V: 1.0.1")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.gray.opacity(0.5))
                        .frame(maxWidth: .infinity, alignment: .center)
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.carousel)
        .navigationTitle("RÉGLAGES")
        .sheet(isPresented: $showCodeInput) {
            VStack(spacing: 15) {
                Text("CODE SECRET")
                    .font(.headline)
                
                TextField("Code...", text: $enteredCode)
                    .multilineTextAlignment(.center)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                
                Button("VALIDER") {
                    if enteredCode == "2022" {
                        activateScreenshotMode()
                    } else {
                        enteredCode = ""
                        showCodeInput = false
                        WKInterfaceDevice.current().play(.failure)
                    }
                }
                .padding()
                .background(Color.orange)
                .cornerRadius(12)
            }
        }
    }
    
    private func handleVersionTap() {
        versionTapCount += 1
        if versionTapCount >= 4 {
            versionTapCount = 0
            enteredCode = ""
            showCodeInput = true
            WKInterfaceDevice.current().play(.click)
        }
    }
    
    private func activateScreenshotMode() {
        isScreenshotMode = true
        showCodeInput = false
        healthManager.enableScreenshotMode()
        WKInterfaceDevice.current().play(.success)
    }
}
    
    private func handleVersionTap() {
        versionTapCount += 1
        if versionTapCount >= 4 {
            versionTapCount = 0
            enteredCode = ""
            showCodeInput = true
            WKInterfaceDevice.current().play(.click)
        }
    }
    
    private func activateScreenshotMode() {
        isScreenshotMode = true
        showCodeInput = false
        healthManager.enableScreenshotMode()
        WKInterfaceDevice.current().play(.success)
    }
}

#Preview {
    SettingsView()
}
