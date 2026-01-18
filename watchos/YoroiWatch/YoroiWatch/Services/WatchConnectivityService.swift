// ============================================
// YOROI WATCH - Service de connectivité
// ============================================

import Foundation
import WatchConnectivity

class WatchConnectivityService: NSObject, ObservableObject {
    static let shared = WatchConnectivityService()

    @Published var userStats = UserStats()
    @Published var isReachable = false

    private override init() {
        super.init()

        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    // Envoyer une séance à l'iPhone
    func sendWorkout(_ workout: WorkoutData) {
        guard WCSession.default.isReachable else {
            print("iPhone non joignable")
            return
        }

        let encoder = JSONEncoder()
        if let data = try? encoder.encode(workout) {
            WCSession.default.sendMessageData(data, replyHandler: nil) { error in
                print("Erreur envoi workout: \(error.localizedDescription)")
            }
        }
    }

    // Demander les stats à l'iPhone
    func requestStats() {
        guard WCSession.default.isReachable else { return }

        WCSession.default.sendMessage(["request": "stats"], replyHandler: { response in
            if let statsData = response["stats"] as? Data {
                let decoder = JSONDecoder()
                if let stats = try? decoder.decode(UserStats.self, from: statsData) {
                    DispatchQueue.main.async {
                        self.userStats = stats
                    }
                }
            }
        }, errorHandler: nil)
    }
}

extension WatchConnectivityService: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        // Recevoir des mises à jour de l'iPhone
        if let statsData = message["stats"] as? Data {
            let decoder = JSONDecoder()
            if let stats = try? decoder.decode(UserStats.self, from: statsData) {
                DispatchQueue.main.async {
                    self.userStats = stats
                }
            }
        }
    }
}
