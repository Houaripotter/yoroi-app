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

    private var session: WCSession?
    private var hasListeners = false
    
    // Instance statique pour accéder au bridge depuis d'autres classes Swift
    public static var emitter: WatchConnectivityBridge?

    override init() {
        super.init()
        WatchConnectivityBridge.emitter = self
        
        if WCSession.isSupported() {
            self.session = WCSession.default
            self.session?.delegate = self
            self.session?.activate()
        }
    }

    // Réactiver la session si nécessaire
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
                resolve(true)
            } else {
                resolve(false)
            }
        }
    }


    /// Méthode de Test (Ping) pour vérifier si le bridge répond
    @objc
    func ping(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let status = [
            "supported": WCSession.isSupported(),
            "paired": session?.isPaired ?? false,
            "installed": session?.isWatchAppInstalled ?? false,
            "reachable": session?.isReachable ?? false,
            "state": "\(session?.activationState.rawValue ?? -1)"
        ] as [String : Any]
        resolve(status)
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
