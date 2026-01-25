// ============================================
// YOROI WATCH - Vue Réglages COMPLÈTE
// Configuration et informations sur l'app
// ============================================

import SwiftUI
import WatchKit

struct SettingsView: View {
    @StateObject private var healthManager = HealthManager.shared
    @AppStorage("hapticEnabled") private var hapticEnabled = true
    @AppStorage("autoSyncEnabled") private var autoSyncEnabled = true
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("soundEnabled") private var soundEnabled = true
    @AppStorage("alwaysOnDisplay") private var alwaysOnDisplay = true
    @AppStorage("wakeOnWristRaise") private var wakeOnWristRaise = true
    @State private var syncInterval = 5 // minutes - Changed to @State
    @AppStorage("waterReminderEnabled") private var waterReminderEnabled = false
    @State private var waterReminderInterval = 60 // minutes - Changed to @State
    @State private var complicationUpdateInterval = 15 // minutes - Changed to @State
    @AppStorage("showCaloriesInComplication") private var showCaloriesInComplication = true
    @AppStorage("useMetricUnits") private var useMetricUnits = true
    @AppStorage("showHeartRateInComplication") private var showHeartRateInComplication = false
    @AppStorage("enableDebugMode") private var enableDebugMode = false

    // Secret Menu State
    @State private var versionTapCount = 0
    @State private var showCodeInput = false
    @State private var enteredCode = ""
    @State private var isScreenshotMode = false
    @State private var showResetConfirmation = false
    @State private var lastSyncTime: Date?

    var body: some View {
        List {
            // ============================================
            // SECTION UTILISATEUR
            // ============================================
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

                // Statut de connexion
                HStack {
                    Image(systemName: WatchConnectivityManager.shared.isReachable ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                        .foregroundColor(WatchConnectivityManager.shared.isReachable ? .green : .orange)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(WatchConnectivityManager.shared.isReachable ? "iPhone Connecté" : "iPhone Déconnecté")
                            .font(.system(size: 11, weight: .semibold))

                        if let lastSync = lastSyncTime {
                            Text("Sync: \(timeAgoString(from: lastSync))")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                        } else {
                            Text("Jamais synchronisé")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                        }
                    }
                }
            }

            // ============================================
            // SECTION SYNCHRONISATION
            // ============================================
            Section(header: Text("SYNCHRONISATION").font(.system(size: 10, weight: .black))) {
                Button(action: {
                    if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    healthManager.fetchAllData()
                    WatchConnectivityManager.shared.syncPendingData()
                    lastSyncTime = Date()
                }) {
                    Label("Sync Maintenant", systemImage: "arrow.triangle.2.circlepath")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.blue)
                }

                Toggle("Sync Auto", isOn: $autoSyncEnabled)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: autoSyncEnabled) { newValue in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                        if newValue {
                            healthManager.fetchAllData()
                        }
                    }

                if autoSyncEnabled {
                    Picker("Intervalle Sync", selection: $syncInterval) {
                        Text("1 min").tag(1)
                        Text("5 min").tag(5)
                        Text("15 min").tag(15)
                        Text("30 min").tag(30)
                    }
                    .font(.system(size: 11, weight: .semibold))
                }

                Button(action: {
                    if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    WatchConnectivityManager.shared.sendToiPhone(["ping": true], forKey: "testSignal") { success in
                        if success {
                            if hapticEnabled { WKInterfaceDevice.current().play(.success) }
                            lastSyncTime = Date()
                        } else {
                            if hapticEnabled { WKInterfaceDevice.current().play(.failure) }
                        }
                    }
                }) {
                    Label("Tester Connexion", systemImage: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 12, weight: .semibold))
                }
            }

            // ============================================
            // SECTION NOTIFICATIONS & SONS
            // ============================================
            Section(header: Text("NOTIFICATIONS & SONS").font(.system(size: 10, weight: .black))) {
                Toggle("Notifications", isOn: $notificationsEnabled)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: notificationsEnabled) { _ in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    }

                Toggle("Sons", isOn: $soundEnabled)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: soundEnabled) { _ in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    }

                Toggle("Rappel Hydratation", isOn: $waterReminderEnabled)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: waterReminderEnabled) { newValue in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                        if newValue {
                            if hapticEnabled { WKInterfaceDevice.current().play(.success) }
                        }
                    }

                if waterReminderEnabled {
                    Picker("Intervalle Rappel", selection: $waterReminderInterval) {
                        Text("30 min").tag(30)
                        Text("1 heure").tag(60)
                        Text("2 heures").tag(120)
                        Text("3 heures").tag(180)
                    }
                    .font(.system(size: 11, weight: .semibold))
                }
            }

            // ============================================
            // SECTION AFFICHAGE
            // ============================================
            Section(header: Text("AFFICHAGE").font(.system(size: 10, weight: .black))) {
                Toggle("Haptique", isOn: $hapticEnabled)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: hapticEnabled) { newValue in
                        if newValue { WKInterfaceDevice.current().play(.click) }
                    }

                Toggle("Always-On Display", isOn: $alwaysOnDisplay)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: alwaysOnDisplay) { _ in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    }

                Toggle("Wake on Wrist Raise", isOn: $wakeOnWristRaise)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: wakeOnWristRaise) { _ in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    }

                Toggle("Unités Métriques", isOn: $useMetricUnits)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: useMetricUnits) { _ in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    }

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

            // ============================================
            // SECTION COMPLICATIONS
            // ============================================
            Section(header: Text("COMPLICATIONS").font(.system(size: 10, weight: .black))) {
                Picker("Mise à jour", selection: $complicationUpdateInterval) {
                    Text("5 min").tag(5)
                    Text("15 min").tag(15)
                    Text("30 min").tag(30)
                    Text("60 min").tag(60)
                }
                .font(.system(size: 11, weight: .semibold))

                Toggle("Afficher Calories", isOn: $showCaloriesInComplication)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: showCaloriesInComplication) { _ in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    }

                Toggle("Afficher Fréquence Cardiaque", isOn: $showHeartRateInComplication)
                    .font(.system(size: 12, weight: .semibold))
                    .onChange(of: showHeartRateInComplication) { _ in
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    }
            }

            // ============================================
            // SECTION SANTÉ & APPLE HEALTH
            // ============================================
            Section(header: Text("APPLE HEALTH").font(.system(size: 10, weight: .black))) {
                HStack {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.red)
                    Text("Sync Automatique")
                        .font(.system(size: 12, weight: .semibold))
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.system(size: 14))
                }

                Button(action: {
                    if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    healthManager.fetchAllData()
                }) {
                    Label("Rafraîchir Health Data", systemImage: "arrow.clockwise")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.blue)
                }

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Poids Actuel")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                        Text("\(Int(healthManager.currentWeight)) kg")
                            .font(.system(size: 13, weight: .bold))
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Hydratation")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                        Text("\(Int(healthManager.waterIntake)) ml")
                            .font(.system(size: 13, weight: .bold))
                    }
                }
            }

            // ============================================
            // SECTION DÉVELOPPEUR
            // ============================================
            if enableDebugMode {
                Section(header: Text("DÉVELOPPEUR").font(.system(size: 10, weight: .black))) {
                    Toggle("Mode Debug", isOn: $enableDebugMode)
                        .font(.system(size: 12, weight: .semibold))
                        .onChange(of: enableDebugMode) { _ in
                            if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                        }

                    HStack {
                        Text("Messages en attente")
                            .font(.system(size: 11))
                        Spacer()
                        Text("\(WatchConnectivityManager.shared.pendingMessagesCount)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.orange)
                    }

                    Button(action: {
                        if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                        print("🔍 Debug Info:")
                        print("   - isReachable: \(WatchConnectivityManager.shared.isReachable)")
                        print("   - isConnected: \(WatchConnectivityManager.shared.isConnected)")
                        print("   - Pending Messages: \(WatchConnectivityManager.shared.pendingMessagesCount)")
                        print("   - Weight: \(healthManager.currentWeight)")
                        print("   - Water: \(healthManager.todayWaterIntake)")
                    }) {
                        Label("Afficher Logs", systemImage: "doc.text.magnifyingglass")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.purple)
                    }
                }
            }

            // ============================================
            // SECTION MAINTENANCE
            // ============================================
            Section(header: Text("MAINTENANCE").font(.system(size: 10, weight: .black))) {
                Button(action: {
                    if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    showResetConfirmation = true
                }) {
                    Text("Effacer Données")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.red)
                }
                .confirmationDialog("Êtes-vous sûr?", isPresented: $showResetConfirmation, titleVisibility: .visible) {
                    Button("Tout Effacer", role: .destructive) {
                        healthManager.resetAllData()
                        isScreenshotMode = false
                        lastSyncTime = nil
                        if hapticEnabled { WKInterfaceDevice.current().play(.failure) }
                    }
                    Button("Annuler", role: .cancel) {}
                }

                Button(action: {
                    if hapticEnabled { WKInterfaceDevice.current().play(.click) }
                    // Vider le cache
                    URLCache.shared.removeAllCachedResponses()
                    if hapticEnabled { WKInterfaceDevice.current().play(.success) }
                }) {
                    Text("Vider le Cache")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.orange)
                }
            }

            // ============================================
            // SECTION À PROPOS
            // ============================================
            Section(header: Text("À PROPOS").font(.system(size: 10, weight: .black))) {
                HStack {
                    Text("Version")
                        .font(.system(size: 11))
                    Spacer()
                    Text("1.0.1")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.gray)
                }

                HStack {
                    Text("Build")
                        .font(.system(size: 11))
                    Spacer()
                    Text("2026.01.25")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.gray)
                }

                HStack {
                    Text("Développeur")
                        .font(.system(size: 11))
                    Spacer()
                    Text("Houari BOUKEROUCHA")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.gray)
                }
            }

            // VERSION & SECRET
            Section {
                Button(action: handleVersionTap) {
                    Text("Yoroi Watch • V1.0.1")
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
                    } else if enteredCode == "DEBUG" {
                        enableDebugMode = true
                        showCodeInput = false
                        if hapticEnabled { WKInterfaceDevice.current().play(.success) }
                    } else {
                        enteredCode = ""
                        showCodeInput = false
                        if hapticEnabled { WKInterfaceDevice.current().play(.failure) }
                    }
                }
                .padding()
                .background(Color.orange)
                .cornerRadius(12)
            }
        }
        .onAppear {
            // Charger la dernière date de sync
            if let lastSync = UserDefaults.standard.object(forKey: "lastSyncDate") as? Date {
                lastSyncTime = lastSync
            }
        }
    }

    private func handleVersionTap() {
        versionTapCount += 1
        if versionTapCount >= 4 {
            versionTapCount = 0
            enteredCode = ""
            showCodeInput = true
            if hapticEnabled { WKInterfaceDevice.current().play(.click) }
        }
    }

    private func activateScreenshotMode() {
        isScreenshotMode = true
        showCodeInput = false
        healthManager.enableScreenshotMode()
        if hapticEnabled { WKInterfaceDevice.current().play(.success) }
    }

    private func timeAgoString(from date: Date) -> String {
        let seconds = Int(Date().timeIntervalSince(date))

        if seconds < 60 {
            return "À l'instant"
        } else if seconds < 3600 {
            let minutes = seconds / 60
            return "Il y a \(minutes) min"
        } else if seconds < 86400 {
            let hours = seconds / 3600
            return "Il y a \(hours)h"
        } else {
            let days = seconds / 86400
            return "Il y a \(days)j"
        }
    }
}

#Preview {
    SettingsView()
}
