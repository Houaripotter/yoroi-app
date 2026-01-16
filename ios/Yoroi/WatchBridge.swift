//
//  WatchBridge.swift
//  Yoroi
//
//  Bridge between React Native and Apple Watch
//

import Foundation
import WatchConnectivity

@objc(WatchBridge)
class WatchBridge: RCTEventEmitter, WCSessionDelegate {

    private var session: WCSession?
    private var hasListeners = false

    override init() {
        super.init()
        setupWatchConnectivity()
    }

    // MARK: - RCTEventEmitter

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return [
            "onWatchMessage",
            "onWatchStateChanged",
            "onHydrationAdded",
            "onWeightAdded"
        ]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    // MARK: - Watch Connectivity Setup

    private func setupWatchConnectivity() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
            print("[WatchBridge] WCSession configuree")
        }
    }

    // MARK: - React Native Methods

    @objc
    func syncDataToWatch(_ data: NSDictionary) {
        guard let session = session, session.activationState == .activated else {
            print("[WatchBridge] Session non activee")
            return
        }

        let message = data as! [String: Any]

        if session.isReachable {
            // Envoi direct si la watch est atteignable
            session.sendMessage(message, replyHandler: { reply in
                print("[WatchBridge] Reponse de la watch: \(reply)")
            }, errorHandler: { error in
                print("[WatchBridge] Erreur envoi: \(error.localizedDescription)")
                // Fallback: utiliser le contexte d'application
                self.sendViaApplicationContext(message)
            })
        } else {
            // Utiliser le contexte d'application pour la sync en arriere-plan
            sendViaApplicationContext(message)
        }
    }

    private func sendViaApplicationContext(_ data: [String: Any]) {
        do {
            try session?.updateApplicationContext(data)
            print("[WatchBridge] Donnees envoyees via applicationContext")
        } catch {
            print("[WatchBridge] Erreur applicationContext: \(error.localizedDescription)")
        }
    }

    @objc
    func isWatchReachable(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            resolve([
                "isReachable": false,
                "isPaired": false,
                "isWatchAppInstalled": false
            ])
            return
        }

        resolve([
            "isReachable": session.isReachable,
            "isPaired": session.isPaired,
            "isWatchAppInstalled": session.isWatchAppInstalled
        ])
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            if activationState == .activated {
                print("[WatchBridge] Session activee")
                if self.hasListeners {
                    self.sendEvent(withName: "onWatchStateChanged", body: [
                        "isReachable": session.isReachable,
                        "isPaired": session.isPaired,
                        "isWatchAppInstalled": session.isWatchAppInstalled
                    ])
                }
            }
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {
        print("[WatchBridge] Session inactive")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        print("[WatchBridge] Session desactivee")
        // Reactiver la session
        session.activate()
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        if hasListeners {
            sendEvent(withName: "onWatchStateChanged", body: [
                "isReachable": session.isReachable
            ])
        }
    }

    // Recevoir des messages de la watch
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        handleWatchMessage(message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        handleWatchMessage(message)
        replyHandler(["status": "received"])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        handleWatchMessage(userInfo)
    }

    private func handleWatchMessage(_ message: [String: Any]) {
        guard hasListeners else { return }

        DispatchQueue.main.async {
            if let action = message["action"] as? String {
                switch action {
                case "syncRequest":
                    self.sendEvent(withName: "onWatchMessage", body: ["action": "syncRequest"])

                case "hydrationAdded":
                    if let amount = message["amount"] as? Int {
                        self.sendEvent(withName: "onHydrationAdded", body: ["amount": amount])
                    }

                case "weightAdded":
                    if let weight = message["weight"] as? Double {
                        self.sendEvent(withName: "onWeightAdded", body: ["weight": weight])
                    }

                default:
                    self.sendEvent(withName: "onWatchMessage", body: message)
                }
            } else {
                self.sendEvent(withName: "onWatchMessage", body: message)
            }
        }
    }
}
