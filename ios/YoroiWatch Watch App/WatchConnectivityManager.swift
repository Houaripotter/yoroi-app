//
//  WatchConnectivityManager.swift
//  YoroiWatch Watch App
//
//  Manages communication between Watch and iPhone
//

import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    @Published var watchData: WatchData = .defaultData
    @Published var isReachable: Bool = false
    @Published var lastSyncTime: Date?

    private var session: WCSession?

    override init() {
        super.init()
    }

    // MARK: - Session Activation

    func activateSession() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
            print("[Watch] WCSession activee")
        }
    }

    // MARK: - Send Messages to iPhone

    /// Demander une synchronisation a l'iPhone
    func requestSync() {
        sendMessage(["action": "syncRequest"])
    }

    /// Envoyer l'ajout d'hydratation a l'iPhone
    func sendHydrationAdded(amount: Int) {
        sendMessage([
            "action": "hydrationAdded",
            "amount": amount
        ])
        // Mise a jour locale optimiste
        watchData.hydrationCurrent += amount
    }

    /// Envoyer l'ajout de poids a l'iPhone
    func sendWeightAdded(weight: Double) {
        sendMessage([
            "action": "weightAdded",
            "weight": weight
        ])
        // Mise a jour locale optimiste
        watchData.currentWeight = weight
    }

    // MARK: - Private Helpers

    private func sendMessage(_ message: [String: Any]) {
        guard let session = session, session.isReachable else {
            print("[Watch] iPhone non atteignable, utilisation du transfert en arriere-plan")
            // Utiliser transferUserInfo pour les messages en arriere-plan
            session?.transferUserInfo(message)
            return
        }

        session.sendMessage(message, replyHandler: { reply in
            print("[Watch] Reponse de l'iPhone: \(reply)")
        }, errorHandler: { error in
            print("[Watch] Erreur envoi message: \(error.localizedDescription)")
        })
    }

    private func updateWatchData(from dictionary: [String: Any]) {
        DispatchQueue.main.async {
            if let hydrationCurrent = dictionary["hydrationCurrent"] as? Int {
                self.watchData.hydrationCurrent = hydrationCurrent
            }
            if let hydrationGoal = dictionary["hydrationGoal"] as? Int {
                self.watchData.hydrationGoal = hydrationGoal
            }
            if let currentWeight = dictionary["currentWeight"] as? Double {
                self.watchData.currentWeight = currentWeight
            }
            if let targetWeight = dictionary["targetWeight"] as? Double {
                self.watchData.targetWeight = targetWeight
            }
            if let sleepDuration = dictionary["sleepDuration"] as? Int {
                self.watchData.sleepDuration = sleepDuration
            }
            if let sleepQuality = dictionary["sleepQuality"] as? Int {
                self.watchData.sleepQuality = sleepQuality
            }
            if let sleepBedTime = dictionary["sleepBedTime"] as? String {
                self.watchData.sleepBedTime = sleepBedTime
            }
            if let sleepWakeTime = dictionary["sleepWakeTime"] as? String {
                self.watchData.sleepWakeTime = sleepWakeTime
            }
            if let stepsGoal = dictionary["stepsGoal"] as? Int {
                self.watchData.stepsGoal = stepsGoal
            }

            self.lastSyncTime = Date()
            print("[Watch] Donnees mises a jour depuis l'iPhone")
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            if activationState == .activated {
                print("[Watch] Session activee avec succes")
                self.isReachable = session.isReachable
                // Demander les donnees initiales
                self.requestSync()
            } else if let error = error {
                print("[Watch] Erreur activation: \(error.localizedDescription)")
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
            print("[Watch] Reachability changee: \(session.isReachable)")
            if session.isReachable {
                self.requestSync()
            }
        }
    }

    // Recevoir des messages de l'iPhone
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        print("[Watch] Message recu: \(message)")
        updateWatchData(from: message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        print("[Watch] Message recu (avec reply): \(message)")
        updateWatchData(from: message)
        replyHandler(["status": "received"])
    }

    // Recevoir des donnees en arriere-plan
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        print("[Watch] Application context recu: \(applicationContext)")
        updateWatchData(from: applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        print("[Watch] UserInfo recu: \(userInfo)")
        updateWatchData(from: userInfo)
    }
}
