// ============================================
// YOROI SHORTCUTS · App Intents Siri
// ============================================
// Trois intents : "Demarrer une seance", "Logger ma pesee", "Commencer un sparring"
// Ils ouvrent l'app sur l'ecran correspondant via deeplink.
//
// Setup requis dans Xcode :
//   1. Ajouter ce fichier a la target Yoroi (main app)
//   2. Le target doit cibler iOS 16.0+
//   3. Dans Info.plist : <key>NSUserActivityTypes</key> ... (automatique avec AppIntents)
// ============================================

import Foundation
import UIKit

#if canImport(AppIntents)
import AppIntents

@available(iOS 16.0, *)
struct StartSessionIntent: AppIntent {
    static var title: LocalizedStringResource = "Démarrer une séance Yoroi"
    static var description = IntentDescription("Ouvre Yoroi sur le timer pour démarrer une séance.")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        if let url = URL(string: "yoroi://timer") {
            await MainActor.run {
                UIApplication.shared.open(url)
            }
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct LogWeightIntent: AppIntent {
    static var title: LocalizedStringResource = "Logger ma pesée"
    static var description = IntentDescription("Ouvre Yoroi sur l'écran d'ajout de pesée.")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        if let url = URL(string: "yoroi://entry") {
            await MainActor.run {
                UIApplication.shared.open(url)
            }
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct StartSparringIntent: AppIntent {
    static var title: LocalizedStringResource = "Démarrer un sparring"
    static var description = IntentDescription("Ouvre le timer combat BJJ/MMA.")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        if let url = URL(string: "yoroi://combat-timer") {
            await MainActor.run {
                UIApplication.shared.open(url)
            }
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct YoroiShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartSessionIntent(),
            phrases: [
                "Démarrer une séance avec \(.applicationName)",
                "Lance une séance \(.applicationName)",
                "Start session with \(.applicationName)",
            ],
            shortTitle: "Démarrer une séance",
            systemImageName: "play.circle.fill"
        )
        AppShortcut(
            intent: LogWeightIntent(),
            phrases: [
                "Logger ma pesée dans \(.applicationName)",
                "Ajouter ma pesée \(.applicationName)",
                "Log weight in \(.applicationName)",
            ],
            shortTitle: "Logger ma pesée",
            systemImageName: "scalemass.fill"
        )
        AppShortcut(
            intent: StartSparringIntent(),
            phrases: [
                "Démarrer un sparring \(.applicationName)",
                "Lance un sparring \(.applicationName)",
                "Start sparring with \(.applicationName)",
            ],
            shortTitle: "Démarrer un sparring",
            systemImageName: "figure.martial.arts"
        )
    }
}

#endif
