//
//  WatchConnectivityManager.swift
//  YoroiWatch Watch App
//
//  Gère la communication bidirectionnelle iPhone ↔ Apple Watch
//  Inclut: queue de messages, retry automatique, gestion déconnexion
//

import Foundation
import WatchConnectivity
import Combine

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    // MARK: - Published Properties
    @Published var isReachable: Bool = false
    @Published var isConnected: Bool = false
    @Published var connectionStatus: ConnectionStatus = .disconnected
    @Published var lastSyncDate: Date?
    @Published var pendingMessagesCount: Int = 0

    // MARK: - Private Properties
    private var session: WCSession?
    private var messageQueue: [QueuedMessage] = []
    private var retryTimer: Timer?
    private let maxRetries = 3
    private let retryInterval: TimeInterval = 10.0

    // MARK: - Enums
    enum ConnectionStatus {
        case connected
        case disconnected
        case syncing
        case error(String)

        var displayText: String {
            switch self {
            case .connected: return "Connecté"
            case .disconnected: return "iPhone déconnecté"
            case .syncing: return "Synchronisation..."
            case .error(let msg): return "Erreur: \(msg)"
            }
        }

        var icon: String {
            switch self {
            case .connected: return "checkmark.circle.fill"
            case .disconnected: return "iphone.slash"
            case .syncing: return "arrow.triangle.2.circlepath"
            case .error: return "exclamationmark.triangle.fill"
            }
        }
    }

    struct QueuedMessage: Codable, Identifiable {
        let id: UUID
        let key: String
        let data: Data
        let timestamp: Date
        var retryCount: Int

        init(key: String, data: Data) {
            self.id = UUID()
            self.key = key
            self.data = data
            self.timestamp = Date()
            self.retryCount = 0
        }
    }

    // MARK: - Initialization
    private override init() {
        super.init()

        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()

            // Charger la queue persistée
            loadMessageQueue()

            // Démarrer le retry timer
            startRetryTimer()
        }
    }

    deinit {
        retryTimer?.invalidate()
    }

    // MARK: - Public Methods

    /// Envoie des données à l'iPhone avec retry automatique
    func sendToiPhone<T: Codable>(_ data: T, forKey key: String, completion: ((Bool) -> Void)? = nil) {
        guard let session = session else {
            completion?(false)
            return
        }

        // Encoder les données
        guard let encoded = try? JSONEncoder().encode(data) else {
            completion?(false)
            return
        }

        let message = [key: encoded]

        // Si iPhone est reachable, envoyer immédiatement
        if session.isReachable {
            session.sendMessage(message, replyHandler: { reply in
                DispatchQueue.main.async {
                    self.connectionStatus = .connected
                    self.lastSyncDate = Date()
                    completion?(true)
                }
            }, errorHandler: { error in
                DispatchQueue.main.async {
                    print("❌ Erreur envoi message: \(error.localizedDescription)")
                    // Ajouter à la queue pour retry
                    self.addToQueue(key: key, data: encoded)
                    completion?(false)
                }
            })
        } else {
            // iPhone pas reachable, ajouter à la queue
            addToQueue(key: key, data: encoded)
            completion?(false)
        }
    }

    /// Synchronise les données en attente
    func syncPendingData() {
        guard let session = session, session.isReachable else {
            connectionStatus = .disconnected
            return
        }

        connectionStatus = .syncing

        // Envoyer tous les messages en queue
        let messagesToSend = messageQueue.filter { $0.retryCount < maxRetries }

        for queuedMessage in messagesToSend {
            let message = [queuedMessage.key: queuedMessage.data]

            session.sendMessage(message, replyHandler: { _ in
                DispatchQueue.main.async {
                    // Retirer de la queue si succès
                    self.removeFromQueue(id: queuedMessage.id)
                }
            }, errorHandler: { error in
                DispatchQueue.main.async {
                    print("❌ Retry failed: \(error.localizedDescription)")
                    self.incrementRetry(id: queuedMessage.id)
                }
            })
        }

        // Nettoyer les messages qui ont dépassé max retries
        messageQueue.removeAll { $0.retryCount >= maxRetries }
        saveMessageQueue()
    }

    /// Demande les données à l'iPhone
    func requestDataFromiPhone(forKey key: String, completion: @escaping (Data?) -> Void) {
        guard let session = session, session.isReachable else {
            completion(nil)
            return
        }

        let message = ["request": key]

        session.sendMessage(message, replyHandler: { reply in
            if let data = reply[key] as? Data {
                DispatchQueue.main.async {
                    completion(data)
                }
            } else {
                completion(nil)
            }
        }, errorHandler: { error in
            print("❌ Erreur requête données: \(error.localizedDescription)")
            completion(nil)
        })
    }

    // MARK: - Private Methods

    private func addToQueue(key: String, data: Data) {
        let queuedMessage = QueuedMessage(key: key, data: data)
        messageQueue.append(queuedMessage)
        saveMessageQueue()

        DispatchQueue.main.async {
            self.pendingMessagesCount = self.messageQueue.count
            self.connectionStatus = .disconnected
        }
    }

    private func removeFromQueue(id: UUID) {
        messageQueue.removeAll { $0.id == id }
        saveMessageQueue()

        DispatchQueue.main.async {
            self.pendingMessagesCount = self.messageQueue.count
            if self.messageQueue.isEmpty {
                self.connectionStatus = .connected
            }
        }
    }

    private func incrementRetry(id: UUID) {
        if let index = messageQueue.firstIndex(where: { $0.id == id }) {
            messageQueue[index].retryCount += 1
            saveMessageQueue()
        }
    }

    private func startRetryTimer() {
        retryTimer = Timer.scheduledTimer(withTimeInterval: retryInterval, repeats: true) { [weak self] _ in
            self?.syncPendingData()
        }
    }

    // MARK: - Persistence

    private func saveMessageQueue() {
        if let encoded = try? JSONEncoder().encode(messageQueue) {
            UserDefaults.standard.set(encoded, forKey: "watchConnectivityQueue")
        }
    }

    private func loadMessageQueue() {
        if let data = UserDefaults.standard.data(forKey: "watchConnectivityQueue"),
           let decoded = try? JSONDecoder().decode([QueuedMessage].self, from: data) {
            messageQueue = decoded
            pendingMessagesCount = messageQueue.count
        }
    }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityManager: WCSessionDelegate {

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            switch activationState {
            case .activated:
                self.isConnected = true
                self.connectionStatus = session.isReachable ? .connected : .disconnected
                print("✅ WatchConnectivity activée")

                // Tenter de sync les données en attente
                if session.isReachable {
                    self.syncPendingData()
                }

            case .inactive:
                self.isConnected = false
                self.connectionStatus = .disconnected
                print("⚠️ WatchConnectivity inactive")

            case .notActivated:
                self.isConnected = false
                self.connectionStatus = .error("Non activée")
                print("❌ WatchConnectivity non activée")

            @unknown default:
                break
            }

            if let error = error {
                self.connectionStatus = .error(error.localizedDescription)
                print("❌ Erreur activation: \(error.localizedDescription)")
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
            self.connectionStatus = session.isReachable ? .connected : .disconnected

            print(session.isReachable ? "✅ iPhone à portée" : "⚠️ iPhone hors de portée")

            // Si iPhone revient à portée, sync les données
            if session.isReachable && !self.messageQueue.isEmpty {
                self.syncPendingData()
            }
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        // Recevoir les données de l'iPhone
        DispatchQueue.main.async {
            print("📩 Message reçu de l'iPhone: \(message.keys)")

            // Exemple: recevoir les données de poids/hydratation/etc
            if let weightData = message["weightUpdate"] as? Data {
                NotificationCenter.default.post(name: .didReceiveWeightUpdate, object: weightData)
            }

            if let hydrationData = message["hydrationUpdate"] as? Data {
                NotificationCenter.default.post(name: .didReceiveHydrationUpdate, object: hydrationData)
            }

            // Répondre à l'iPhone
            replyHandler(["status": "received"])
        }
    }

    func session(_ session: WCSession, didReceiveMessageData messageData: Data) {
        // Recevoir des données binaires de l'iPhone
        DispatchQueue.main.async {
            print("📦 Données reçues de l'iPhone: \(messageData.count) bytes")
            NotificationCenter.default.post(name: .didReceiveDataFromiPhone, object: messageData)
        }
    }
}

// MARK: - Notifications
extension Notification.Name {
    static let didReceiveWeightUpdate = Notification.Name("didReceiveWeightUpdate")
    static let didReceiveHydrationUpdate = Notification.Name("didReceiveHydrationUpdate")
    static let didReceiveDataFromiPhone = Notification.Name("didReceiveDataFromiPhone")
}
