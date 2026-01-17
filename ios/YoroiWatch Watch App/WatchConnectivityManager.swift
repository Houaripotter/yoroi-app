// ============================================
// YOROI WATCH - Connectivity Manager
// ============================================
// Gere la communication avec l'iPhone via WatchConnectivity

import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {

    // MARK: - Singleton
    static let shared = WatchConnectivityManager()

    // MARK: - Published Properties
    @Published var isReachable = false
    @Published var hydrationGoal: Int = 2000
    @Published var currentHydration: Int = 0
    @Published var currentWeight: Double = 0
    @Published var weightGoal: Double = 0
    @Published var userName: String = "Guerrier"
    @Published var themeColor: String = "#FF3B30"

    // MARK: - Private Properties
    private var session: WCSession?

    // MARK: - Initialization
    override init() {
        super.init()
        setupSession()
    }

    private func setupSession() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }

    // MARK: - Public Methods

    /// Ajoute de l'hydratation et sync avec l'iPhone
    func addHydration(amount: Int) {
        currentHydration += amount
        sendMessage([
            "action": "addHydration",
            "amount": amount,
            "timestamp": Date().timeIntervalSince1970
        ])
    }

    /// Enregistre le poids et sync avec l'iPhone
    func addWeight(weight: Double) {
        currentWeight = weight
        sendMessage([
            "action": "addWeight",
            "weight": weight,
            "timestamp": Date().timeIntervalSince1970
        ])
    }

    /// Demande une synchronisation complete
    func requestSync() {
        sendMessage(["action": "syncRequest"])
    }

    // MARK: - Private Methods

    private func sendMessage(_ message: [String: Any]) {
        guard let session = session, session.isReachable else {
            // Fallback: utiliser transferUserInfo pour les messages en background
            session?.transferUserInfo(message)
            print("[WatchConnectivity] Message en queue (transferUserInfo)")
            return
        }

        session.sendMessage(message, replyHandler: { reply in
            print("[WatchConnectivity] Reponse: \(reply)")
        }, errorHandler: { error in
            print("[WatchConnectivity] Erreur: \(error.localizedDescription)")
            // Retry via transferUserInfo
            self.session?.transferUserInfo(message)
        })
    }

    private func updateFromContext(_ context: [String: Any]) {
        DispatchQueue.main.async {
            if let hydrationGoal = context["hydrationGoal"] as? Int {
                self.hydrationGoal = hydrationGoal
            }
            if let currentHydration = context["currentHydration"] as? Int {
                self.currentHydration = currentHydration
            }
            if let currentWeight = context["currentWeight"] as? Double {
                self.currentWeight = currentWeight
            }
            if let weightGoal = context["weightGoal"] as? Double {
                self.weightGoal = weightGoal
            }
            if let userName = context["userName"] as? String {
                self.userName = userName
            }
            if let themeColor = context["themeColor"] as? String {
                self.themeColor = themeColor
            }
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("[WatchConnectivity] Activation echouee: \(error.localizedDescription)")
            return
        }

        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }

        print("[WatchConnectivity] Session activee avec etat: \(activationState.rawValue)")

        // Charger le contexte initial
        if !session.receivedApplicationContext.isEmpty {
            updateFromContext(session.receivedApplicationContext)
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
        }
        print("[WatchConnectivity] Reachability: \(session.isReachable)")
    }

    // Messages recus de l'iPhone
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        handleMessage(message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        handleMessage(message)
        replyHandler(["status": "received"])
    }

    // Application Context recu
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        print("[WatchConnectivity] Context recu: \(applicationContext)")
        updateFromContext(applicationContext)
    }

    // User Info recu (messages en background)
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        print("[WatchConnectivity] UserInfo recu: \(userInfo)")
        handleMessage(userInfo)
    }

    private func handleMessage(_ message: [String: Any]) {
        print("[WatchConnectivity] Message recu: \(message)")

        if let action = message["action"] as? String {
            switch action {
            case "syncData":
                updateFromContext(message)
            case "themeUpdate":
                if let color = message["themeColor"] as? String {
                    DispatchQueue.main.async {
                        self.themeColor = color
                    }
                }
            default:
                updateFromContext(message)
            }
        } else {
            updateFromContext(message)
        }
    }
}
