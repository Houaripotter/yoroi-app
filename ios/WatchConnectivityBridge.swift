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
            try WCSession.default.updateApplicationContext(context)
            print("🚀 [BRIDGE] Application Context mis à jour: \(context.keys)")
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
        
        WCSession.default.sendMessage(message, replyHandler: { reply in
            resolve(reply)
        }, errorHandler: { error in
            reject("SEND_ERROR", error.localizedDescription, error)
        })
    }

    @objc
    func transferUserInfo(_ userInfo: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let transfer = WCSession.default.transferUserInfo(userInfo)
        resolve(["transferring": transfer.isTransferring])
    }

    @objc
    func ping(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let session = WCSession.default
        let status = [
            "supported": WCSession.isSupported(),
            "paired": session.isPaired,
            "installed": session.isWatchAppInstalled,
            "reachable": session.isReachable,
            "state": "\(session.activationState.rawValue)"
        ] as [String : Any]
        resolve(status)
    }
}

extension WatchConnectivityBridge: WCSessionDelegate {
    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if hasListeners {
            sendEvent(withName: "onWatchActivationCompleted", body: [
                "state": "\(activationState.rawValue)",
                "isPaired": session.isPaired,
                "isWatchAppInstalled": session.isWatchAppInstalled,
                "isReachable": session.isReachable
            ])
        }
    }

    public func sessionReachabilityDidChange(_ session: WCSession) {
        if hasListeners {
            sendEvent(withName: "onWatchReachabilityChanged", body: ["isReachable": session.isReachable])
        }
    }

    public func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        if hasListeners {
            sendEvent(withName: "onWatchMessageReceived", body: message)
        }
        replyHandler(["status": "received"])
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {}
    public func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
}