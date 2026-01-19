//
//  WatchConnectivityBridge.swift
//  Yoroi
//
//  Bridge entre React Native et WatchConnectivity
//  Permet la communication bidirectionnelle iPhone ↔ Apple Watch
//

import Foundation
import WatchConnectivity
import React

@objc(WatchConnectivityBridge)
public class WatchConnectivityBridge: RCTEventEmitter {

    // MARK: - Singleton
    static let shared = WatchConnectivityBridge()

    // MARK: - Private Properties
    private var session: WCSession?
    private var hasListeners = false

    // MARK: - Initialization
    override init() {
        super.init()

        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }

    // MARK: - RCTEventEmitter Override

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return [
            "onWatchReachabilityChanged",
            "onWatchDataReceived",
            "onWatchMessageReceived",
            "onWatchActivationCompleted",
            "onWatchError"
        ]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    // MARK: - Public Methods (Exposed to React Native)

    /// Vérifie si la Watch est disponible
    @objc
    func isWatchAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            resolve(false)
            return
        }

        let available = session.isPaired && session.isWatchAppInstalled
        resolve(available)
    }

    /// Vérifie si la Watch est à portée (reachable)
    @objc
    func isWatchReachable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            resolve(false)
            return
        }

        resolve(session.isReachable)
    }

    /// Envoie des données à la Watch (message avec reply)
    @objc
    func sendMessageToWatch(_ message: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            reject("NO_SESSION", "WatchConnectivity session not available", nil)
            return
        }

        guard session.isReachable else {
            reject("NOT_REACHABLE", "Apple Watch is not reachable", nil)
            return
        }

        session.sendMessage(message, replyHandler: { reply in
            resolve(reply)
        }, errorHandler: { error in
            reject("SEND_ERROR", error.localizedDescription, error)
        })
    }

    /// Envoie des données à la Watch (applicationContext - pour données persistantes)
    @objc
    func updateApplicationContext(_ context: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            reject("NO_SESSION", "WatchConnectivity session not available", nil)
            return
        }

        do {
            try session.updateApplicationContext(context)
            resolve(true)
        } catch {
            reject("UPDATE_ERROR", error.localizedDescription, error)
        }
    }

    /// Transfert de fichier vers la Watch
    @objc
    func transferFile(_ fileURL: String, metadata: [String: Any]?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            reject("NO_SESSION", "WatchConnectivity session not available", nil)
            return
        }

        let url = URL(fileURLWithPath: fileURL)

        guard FileManager.default.fileExists(atPath: fileURL) else {
            reject("FILE_NOT_FOUND", "File not found at path: \(fileURL)", nil)
            return
        }

        let transfer = session.transferFile(url, metadata: metadata)
        resolve(["transferID": transfer.description])
    }

    /// Transfert de UserInfo vers la Watch (en arrière-plan)
    @objc
    func transferUserInfo(_ userInfo: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            reject("NO_SESSION", "WatchConnectivity session not available", nil)
            return
        }

        let transfer = session.transferUserInfo(userInfo)
        resolve(["transferring": transfer.isTransferring])
    }

    /// Récupère le contexte applicatif reçu de la Watch
    @objc
    func getReceivedApplicationContext(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            reject("NO_SESSION", "WatchConnectivity session not available", nil)
            return
        }

        resolve(session.receivedApplicationContext)
    }

    /// Active la session WatchConnectivity
    @objc
    func activateSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            reject("NO_SESSION", "WatchConnectivity not supported", nil)
            return
        }

        session.activate()
        resolve(true)
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityBridge: WCSessionDelegate {

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        var statusString = ""

        switch activationState {
        case .activated:
            statusString = "activated"
        case .inactive:
            statusString = "inactive"
        case .notActivated:
            statusString = "notActivated"
        @unknown default:
            statusString = "unknown"
        }

        if hasListeners {
            sendEvent(withName: "onWatchActivationCompleted", body: [
                "state": statusString,
                "isPaired": session.isPaired,
                "isWatchAppInstalled": session.isWatchAppInstalled,
                "isReachable": session.isReachable,
                "error": error?.localizedDescription ?? NSNull()
            ])
        }

        if let error = error {
            print("❌ WatchConnectivity activation error: \(error.localizedDescription)")
        } else {
            print("✅ WatchConnectivity activated: \(statusString)")
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        if hasListeners {
            sendEvent(withName: "onWatchReachabilityChanged", body: [
                "isReachable": session.isReachable,
                "isPaired": session.isPaired,
                "isWatchAppInstalled": session.isWatchAppInstalled
            ])
        }

        print(session.isReachable ? "✅ Watch reachable" : "⚠️ Watch not reachable")
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        if hasListeners {
            sendEvent(withName: "onWatchMessageReceived", body: message)
        }

        print("📩 Message received from Watch: \(message.keys)")
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        if hasListeners {
            sendEvent(withName: "onWatchMessageReceived", body: [
                "message": message,
                "requiresReply": true
            ])
        }

        // Répondre automatiquement (React Native peut override via un handler)
        replyHandler(["status": "received"])

        print("📩 Message with reply received from Watch: \(message.keys)")
    }

    func session(_ session: WCSession, didReceiveMessageData messageData: Data) {
        if hasListeners {
            let base64 = messageData.base64EncodedString()
            sendEvent(withName: "onWatchDataReceived", body: [
                "data": base64,
                "size": messageData.count
            ])
        }

        print("📦 Data received from Watch: \(messageData.count) bytes")
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        if hasListeners {
            sendEvent(withName: "onWatchDataReceived", body: [
                "type": "applicationContext",
                "data": applicationContext
            ])
        }

        print("📦 Application context received from Watch: \(applicationContext.keys)")
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        if hasListeners {
            sendEvent(withName: "onWatchDataReceived", body: [
                "type": "userInfo",
                "data": userInfo
            ])
        }

        print("📦 UserInfo received from Watch: \(userInfo.keys)")
    }

    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        if let error = error {
            if hasListeners {
                sendEvent(withName: "onWatchError", body: [
                    "type": "fileTransfer",
                    "error": error.localizedDescription
                ])
            }
            print("❌ File transfer error: \(error.localizedDescription)")
        } else {
            print("✅ File transfer completed")
        }
    }

    // MARK: - iOS Specific Delegate Methods

    func sessionDidBecomeInactive(_ session: WCSession) {
        print("⚠️ Session became inactive")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        // Réactiver la session pour supporter les changements de Watch
        session.activate()
        print("🔄 Session deactivated, reactivating...")
    }
}
