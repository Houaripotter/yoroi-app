// ============================================
// YOROI - WatchBridge Native Module
// ============================================
// Communication bidirectionnelle avec Apple Watch
// via WatchConnectivity framework

import Foundation
import WatchConnectivity
import React

@objc(WatchBridge)
class WatchBridge: RCTEventEmitter, WCSessionDelegate {

  // MARK: - Singleton
  static let shared = WatchBridge()

  private var session: WCSession?
  private var hasListeners = false

  // MARK: - Initialization

  override init() {
    super.init()
    setupWatchConnectivity()
  }

  private func setupWatchConnectivity() {
    if WCSession.isSupported() {
      session = WCSession.default
      session?.delegate = self
      session?.activate()
      print("[WatchBridge] WCSession activée")
    } else {
      print("[WatchBridge] WCSession non supportée sur cet appareil")
    }
  }

  // MARK: - React Native Bridge

  override static func moduleName() -> String! {
    return "WatchBridge"
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return [
      "onWatchMessage",
      "onWatchStateChanged",
      "onHydrationAdded",
      "onWeightAdded",
      "onWatchReachabilityChanged"
    ]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  // MARK: - Exposed Methods to React Native

  @objc
  func isWatchReachable(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
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

  @objc
  func syncDataToWatch(_ data: NSDictionary) {
    guard let session = session, session.isReachable else {
      print("[WatchBridge] Watch non joignable, utilisation de transferUserInfo")
      // Fallback: utiliser transferUserInfo pour les données en background
      if let session = session, session.isPaired && session.isWatchAppInstalled {
        do {
          let dataDict = data as? [String: Any] ?? [:]
          session.transferUserInfo(dataDict)
          print("[WatchBridge] Données envoyées via transferUserInfo")
        }
      }
      return
    }

    // Envoi immédiat si la watch est joignable
    let dataDict = data as? [String: Any] ?? [:]
    session.sendMessage(dataDict, replyHandler: { reply in
      print("[WatchBridge] Réponse de la watch: \(reply)")
    }, errorHandler: { error in
      print("[WatchBridge] Erreur envoi: \(error.localizedDescription)")
    })
  }

  @objc
  func sendMessage(_ message: NSDictionary,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session, session.isReachable else {
      reject("NOT_REACHABLE", "Apple Watch non joignable", nil)
      return
    }

    let messageDict = message as? [String: Any] ?? [:]
    session.sendMessage(messageDict, replyHandler: { reply in
      resolve(reply)
    }, errorHandler: { error in
      reject("SEND_ERROR", error.localizedDescription, error)
    })
  }

  @objc
  func updateApplicationContext(_ context: NSDictionary) {
    guard let session = session else { return }

    do {
      let contextDict = context as? [String: Any] ?? [:]
      try session.updateApplicationContext(contextDict)
      print("[WatchBridge] Application context mis à jour")
    } catch {
      print("[WatchBridge] Erreur mise à jour context: \(error.localizedDescription)")
    }
  }

  // MARK: - WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if let error = error {
      print("[WatchBridge] Activation échouée: \(error.localizedDescription)")
      return
    }

    print("[WatchBridge] Session activée avec état: \(activationState.rawValue)")

    if hasListeners {
      sendEvent(withName: "onWatchStateChanged", body: [
        "activationState": activationState.rawValue,
        "isReachable": session.isReachable,
        "isPaired": session.isPaired,
        "isWatchAppInstalled": session.isWatchAppInstalled
      ])
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {
    print("[WatchBridge] Session inactive")
  }

  func sessionDidDeactivate(_ session: WCSession) {
    print("[WatchBridge] Session désactivée, réactivation...")
    session.activate()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    print("[WatchBridge] Reachability changée: \(session.isReachable)")

    if hasListeners {
      sendEvent(withName: "onWatchReachabilityChanged", body: [
        "isReachable": session.isReachable
      ])
    }
  }

  // Messages reçus de la Watch
  func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    handleWatchMessage(message)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    handleWatchMessage(message)
    replyHandler(["status": "received"])
  }

  private func handleWatchMessage(_ message: [String: Any]) {
    print("[WatchBridge] Message reçu de la watch: \(message)")

    guard hasListeners else { return }

    // Traiter les actions spécifiques
    if let action = message["action"] as? String {
      switch action {
      case "addHydration":
        if let amount = message["amount"] as? Int {
          sendEvent(withName: "onHydrationAdded", body: ["amount": amount])
        }

      case "addWeight":
        if let weight = message["weight"] as? Double {
          sendEvent(withName: "onWeightAdded", body: ["weight": weight])
        }

      case "syncRequest":
        sendEvent(withName: "onWatchMessage", body: ["action": "syncRequest"])

      default:
        sendEvent(withName: "onWatchMessage", body: message)
      }
    } else {
      sendEvent(withName: "onWatchMessage", body: message)
    }
  }

  // User Info reçu (données en background)
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
    print("[WatchBridge] UserInfo reçu: \(userInfo)")
    handleWatchMessage(userInfo)
  }

  // Application Context mis à jour
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
    print("[WatchBridge] Application context reçu: \(applicationContext)")

    if hasListeners {
      sendEvent(withName: "onWatchMessage", body: [
        "action": "contextUpdate",
        "context": applicationContext
      ])
    }
  }
}
