//
//  WatchConnectivityBridge.swift
//  Yoroi
//
//  Bridge complet entre React Native et WatchConnectivity
//  Gère tous les scénarios de sync : iPhone éteint, hors Bluetooth, force quit, etc.
//

import Foundation
import WatchConnectivity
import React

@objc(WatchConnectivityBridge)
public class WatchConnectivityBridge: RCTEventEmitter {

    private var session: WCSession?
    private var hasListeners = false

    public static var emitter: WatchConnectivityBridge?

    // NOUVEAU : Queue de messages en attente
    private var pendingMessages: [(message: [String: Any], completion: (Error?) -> Void)] = []
    private let messageQueueKey = "com.yoroi.watchconnectivity.pendingMessages"

    override init() {
        super.init()
        WatchConnectivityBridge.emitter = self

        if WCSession.isSupported() {
            self.session = WCSession.default
            self.session?.delegate = self

            // Restaurer queue de messages
            restorePendingMessages()
        }
    }

    override public static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override public func supportedEvents() -> [String]! {
        return [
            "onWatchReachabilityChanged",
            "onWatchDataReceived",
            "onWatchMessageReceived",
            "onWatchActivationCompleted",
            "onWatchError"
        ]
    }

    override public func startObserving() {
        hasListeners = true
    }

    override public func stopObserving() {
        hasListeners = false
    }

    // MARK: - API Methods

    @objc
    func isWatchAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let available = WCSession.isSupported() && WCSession.default.isPaired && WCSession.default.isWatchAppInstalled
        resolve(available)
    }

    @objc
    func isWatchReachable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(WCSession.default.isReachable)
    }

    @objc
    func activateSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            if WCSession.isSupported() {
                let session = WCSession.default
                if session.delegate == nil {
                    session.delegate = self
                }
                if session.activationState != .activated {
                    session.activate()
                }

                // Après activation, traiter les messages en attente
                self.processPendingMessages()

                resolve(true)
            } else {
                resolve(false)
            }
        }
    }

    @objc
    func updateApplicationContext(_ context: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard WCSession.isSupported() else {
            reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
            return
        }

        do {
            // Ajouter le nom de l'iPhone au contexte
            var enrichedContext = context
            enrichedContext["deviceName"] = UIDevice.current.name

            try WCSession.default.updateApplicationContext(enrichedContext)
            print("🚀 [BRIDGE] Application Context mis à jour: \(enrichedContext.keys)")
            resolve(true)
        } catch {
            reject("UPDATE_ERROR", error.localizedDescription, error)
        }
    }

    @objc
    func sendMessageToWatch(_ message: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard WCSession.default.activationState == .activated else {
            reject("NOT_ACTIVATED", "Session not activated", nil)
            return
        }

        guard WCSession.default.isReachable else {
            // NOUVEAU : Si pas reachable, ajouter à la queue
            print("⚠️ [BRIDGE] Watch not reachable, adding to queue")
            addToPendingMessages(message) { error in
                if let error = error {
                    reject("QUEUE_ERROR", error.localizedDescription, error)
                } else {
                    resolve(["queued": true, "message": "Message will be sent when Watch is reachable"])
                }
            }
            return
        }

        var hasCompleted = false
        var timeoutTimer: Timer?

        // Timeout de 5 secondes
        timeoutTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { _ in
            if !hasCompleted {
                hasCompleted = true
                reject("SEND_TIMEOUT", "Message delivery timeout after 5s", nil)
            }
        }

        WCSession.default.sendMessage(message, replyHandler: { reply in
            if !hasCompleted {
                hasCompleted = true
                timeoutTimer?.invalidate()
                resolve(reply)
            }
        }, errorHandler: { error in
            if !hasCompleted {
                hasCompleted = true
                timeoutTimer?.invalidate()

                // Si erreur, ajouter à la queue
                print("❌ [BRIDGE] Send error, adding to queue: \(error.localizedDescription)")
                self.addToPendingMessages(message) { queueError in
                    if queueError != nil {
                        reject("SEND_ERROR", error.localizedDescription, error)
                    } else {
                        reject("SEND_ERROR_QUEUED", "Message failed but queued for retry", error)
                    }
                }
            }
        })
    }

    @objc
    func transferUserInfo(_ userInfo: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard WCSession.isSupported() else {
            reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
            return
        }

        do {
            let transfer = WCSession.default.transferUserInfo(userInfo)
            print("📤 [BRIDGE] UserInfo transfer initiated: \(transfer.isTransferring)")
            resolve(["transferring": transfer.isTransferring])
        } catch {
            reject("TRANSFER_ERROR", error.localizedDescription, error)
        }
    }

    @objc
    func transferFile(_ fileURL: String, metadata: [String: Any]?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard WCSession.isSupported() else {
            reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
            return
        }

        guard let url = URL(string: fileURL) else {
            reject("INVALID_URL", "Invalid file URL", nil)
            return
        }

        guard FileManager.default.fileExists(atPath: url.path) else {
            reject("FILE_NOT_FOUND", "File does not exist at path: \(url.path)", nil)
            return
        }

        let transfer = WCSession.default.transferFile(url, metadata: metadata)
        print("📤 [BRIDGE] File transfer initiated: \(url.lastPathComponent)")
        resolve(["transferID": transfer.description, "isTransferring": transfer.isTransferring])
    }

    @objc
    func getReceivedApplicationContext(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard WCSession.isSupported() else {
            reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
            return
        }

        let context = WCSession.default.receivedApplicationContext
        print("📥 [BRIDGE] Received application context: \(context.keys)")
        resolve(context)
    }

    @objc
    func ping(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let session = WCSession.default
        let status = [
            "supported": WCSession.isSupported(),
            "paired": session.isPaired,
            "installed": session.isWatchAppInstalled,
            "reachable": session.isReachable,
            "state": "\(session.activationState.rawValue)",
            "pendingMessages": pendingMessages.count
        ] as [String : Any]
        resolve(status)
    }

    // MARK: - Queue Management

    private func addToPendingMessages(_ message: [String: Any], completion: @escaping (Error?) -> Void) {
        pendingMessages.append((message: message, completion: completion))
        savePendingMessages()
        print("📝 [BRIDGE] Message added to queue (total: \(pendingMessages.count))")
    }

    private func processPendingMessages() {
        guard WCSession.default.isReachable else {
            print("⚠️ [BRIDGE] Cannot process queue - Watch not reachable")
            return
        }

        print("🔄 [BRIDGE] Processing \(pendingMessages.count) pending messages")

        let messagesToProcess = pendingMessages
        pendingMessages.removeAll()
        savePendingMessages()

        for (message, completion) in messagesToProcess {
            WCSession.default.sendMessage(message, replyHandler: { _ in
                completion(nil)
                print("✅ [BRIDGE] Queued message sent successfully")
            }, errorHandler: { error in
                completion(error)
                print("❌ [BRIDGE] Queued message failed: \(error.localizedDescription)")
                // Re-ajouter à la queue
                self.addToPendingMessages(message, completion: completion)
            })
        }
    }

    private func savePendingMessages() {
        let messagesData = pendingMessages.map { $0.message }
        UserDefaults.standard.set(messagesData, forKey: messageQueueKey)
        UserDefaults.standard.synchronize()
    }

    private func restorePendingMessages() {
        if let savedMessages = UserDefaults.standard.array(forKey: messageQueueKey) as? [[String: Any]] {
            pendingMessages = savedMessages.map { message in
                (message: message, completion: { _ in })
            }
            print("📂 [BRIDGE] Restored \(pendingMessages.count) messages from queue")
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityBridge: WCSessionDelegate {
    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        print("🔌 [BRIDGE] Activation completed: \(activationState.rawValue)")

        if hasListeners {
            sendEvent(withName: "onWatchActivationCompleted", body: [
                "state": "\(activationState.rawValue)",
                "isPaired": session.isPaired,
                "isWatchAppInstalled": session.isWatchAppInstalled,
                "isReachable": session.isReachable
            ])
        }

        // Traiter messages en attente après activation
        if activationState == .activated {
            processPendingMessages()
        }
    }

    public func sessionReachabilityDidChange(_ session: WCSession) {
        print("📡 [BRIDGE] Reachability changed: \(session.isReachable)")

        if hasListeners {
            sendEvent(withName: "onWatchReachabilityChanged", body: [
                "isReachable": session.isReachable,
                "isPaired": session.isPaired,
                "isWatchAppInstalled": session.isWatchAppInstalled
            ])
        }

        // Traiter messages en attente si Watch devient reachable
        if session.isReachable {
            processPendingMessages()
        }
    }

    public func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        print("📨 [BRIDGE] Message received: \(message.keys)")

        if hasListeners {
            sendEvent(withName: "onWatchMessageReceived", body: message)
        }

        replyHandler(["status": "received", "timestamp": Date().timeIntervalSince1970])
    }

    public func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        print("📦 [BRIDGE] Application context received: \(applicationContext.keys)")

        if hasListeners {
            sendEvent(withName: "onWatchDataReceived", body: [
                "type": "applicationContext",
                "data": applicationContext
            ])
        }
    }

    public func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        print("📬 [BRIDGE] UserInfo received: \(userInfo.keys)")

        if hasListeners {
            sendEvent(withName: "onWatchDataReceived", body: [
                "type": "userInfo",
                "data": userInfo
            ])
        }
    }

    public func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        if let error = error {
            print("❌ [BRIDGE] File transfer failed: \(error.localizedDescription)")
            if hasListeners {
                sendEvent(withName: "onWatchError", body: [
                    "type": "fileTransferFailed",
                    "error": error.localizedDescription
                ])
            }
        } else {
            print("✅ [BRIDGE] File transfer completed successfully")
        }
    }

    // iOS uniquement
    public func sessionDidBecomeInactive(_ session: WCSession) {
        print("💤 [BRIDGE] Session became inactive")
    }

    public func sessionDidDeactivate(_ session: WCSession) {
        print("🔌 [BRIDGE] Session deactivated - reactivating...")
        // IMPORTANT : Réactiver automatiquement
        session.activate()
    }
}
