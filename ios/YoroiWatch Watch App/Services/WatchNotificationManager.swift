// ============================================
// YOROI WATCH - Gestionnaire de Notifications Locales
// Gère les rappels d'hydratation et autres notifications
// ============================================

import Foundation
import UserNotifications
import WatchKit

class WatchNotificationManager: NSObject, ObservableObject {
    static let shared = WatchNotificationManager()

    @Published var notificationsEnabled = false
    @Published var waterReminderEnabled = false
    @Published var permissionGranted = false

    private let center = UNUserNotificationCenter.current()

    override init() {
        super.init()
        center.delegate = self
        checkPermissionStatus()
    }

    // ============================================
    // PERMISSIONS
    // ============================================

    func requestPermissions(completion: @escaping (Bool) -> Void) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            DispatchQueue.main.async {
                self.permissionGranted = granted
                if granted {
                    print("✅ Notifications autorisées sur Apple Watch")
                } else {
                    print("❌ Notifications refusées sur Apple Watch")
                }
                completion(granted)
            }

            if let error = error {
                print("❌ Erreur permissions notifications: \(error.localizedDescription)")
            }
        }
    }

    func checkPermissionStatus() {
        center.getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.permissionGranted = settings.authorizationStatus == .authorized
            }
        }
    }

    // ============================================
    // RAPPELS D'HYDRATATION
    // ============================================

    func scheduleHydrationReminders(intervalMinutes: Int) {
        // Annuler les anciens rappels
        cancelHydrationReminders()

        guard permissionGranted else {
            print("⚠️ Permissions non accordées, impossible de programmer les rappels")
            requestPermissions { granted in
                if granted {
                    self.scheduleHydrationReminders(intervalMinutes: intervalMinutes)
                }
            }
            return
        }

        // Messages variés pour les rappels
        let messages = [
            "💧 Il est temps de boire de l'eau !",
            "🚰 N'oublie pas de t'hydrater !",
            "💦 Une pause hydratation s'impose !",
            "🌊 Hydrate-toi pour rester performant !",
            "💧 Ton corps a besoin d'eau !",
            "🚰 Reste hydraté, champion !",
        ]

        // Programmer les rappels tout au long de la journée (8h - 22h)
        let startHour = 8
        let endHour = 22
        let totalHours = endHour - startHour
        let remindersPerDay = totalHours * 60 / intervalMinutes

        var currentHour = startHour
        var currentMinute = 0

        for i in 0..<min(remindersPerDay, 20) { // Max 20 notifications/jour
            let content = UNMutableNotificationContent()
            content.title = "Yoroi Hydratation"
            content.body = messages[i % messages.count]
            content.sound = .default
            content.categoryIdentifier = "HYDRATION_REMINDER"

            // Calculer l'heure du rappel
            var dateComponents = DateComponents()
            dateComponents.hour = currentHour
            dateComponents.minute = currentMinute

            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            let identifier = "hydration-reminder-\(i)"
            let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

            center.add(request) { error in
                if let error = error {
                    print("❌ Erreur ajout notification hydratation: \(error.localizedDescription)")
                } else {
                    print("✅ Rappel hydratation programmé: \(currentHour):\(String(format: "%02d", currentMinute))")
                }
            }

            // Incrémenter le temps pour le prochain rappel
            currentMinute += intervalMinutes
            while currentMinute >= 60 {
                currentMinute -= 60
                currentHour += 1
            }

            // Arrêter si on dépasse 22h
            if currentHour >= endHour {
                break
            }
        }

        print("✅ \(min(remindersPerDay, 20)) rappels d'hydratation programmés (intervalle: \(intervalMinutes) min)")
    }

    func cancelHydrationReminders() {
        center.getPendingNotificationRequests { requests in
            let hydrationIdentifiers = requests
                .filter { $0.identifier.hasPrefix("hydration-reminder-") }
                .map { $0.identifier }

            if !hydrationIdentifiers.isEmpty {
                self.center.removePendingNotificationRequests(withIdentifiers: hydrationIdentifiers)
                print("🗑️ \(hydrationIdentifiers.count) rappels d'hydratation annulés")
            }
        }
    }

    // ============================================
    // GESTION DES NOTIFICATIONS
    // ============================================

    func cancelAllNotifications() {
        center.removeAllPendingNotificationRequests()
        print("🗑️ Toutes les notifications annulées")
    }

    func getPendingNotificationsCount(completion: @escaping (Int) -> Void) {
        center.getPendingNotificationRequests { requests in
            DispatchQueue.main.async {
                completion(requests.count)
            }
        }
    }

    func listPendingNotifications() {
        center.getPendingNotificationRequests { requests in
            print("📋 Notifications en attente: \(requests.count)")
            for request in requests {
                print("  - \(request.identifier): \(request.content.title)")
            }
        }
    }
}

// ============================================
// DELEGATE POUR GÉRER LES NOTIFICATIONS REÇUES
// ============================================

extension WatchNotificationManager: UNUserNotificationCenterDelegate {
    // Afficher les notifications même quand l'app est au premier plan
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Sur watchOS, afficher banner et son
        completionHandler([.banner, .sound])
    }

    // Gérer les actions sur les notifications
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let identifier = response.notification.request.identifier

        if identifier.hasPrefix("hydration-reminder-") {
            // L'utilisateur a tapé sur le rappel d'hydratation
            // On pourrait ouvrir la vue Hydratation ici
            print("👆 Rappel d'hydratation tapé")
            WKInterfaceDevice.current().play(.click)
        }

        completionHandler()
    }
}
