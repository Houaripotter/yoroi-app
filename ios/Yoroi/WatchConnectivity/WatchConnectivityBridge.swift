import Foundation
import WatchConnectivity
internal import React

@objc(WatchConnectivityBridge)
class WatchConnectivityBridge: RCTEventEmitter, WCSessionDelegate {

  private var session: WCSession?
  private var hasListeners = false

  override init() {
    super.init()
    if WCSession.isSupported() {
      session = WCSession.default
      session?.delegate = self
    }
  }

  // MARK: - RCTEventEmitter

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

  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Bridge Methods

  @objc
  func activateSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      reject("NOT_SUPPORTED", "WatchConnectivity not supported on this device", nil)
      return
    }
    session.activate()
    resolve(true)
  }

  @objc
  func isWatchAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      resolve(false)
      return
    }
    let available = session.isPaired && session.isWatchAppInstalled
    resolve(available)
  }

  @objc
  func isWatchReachable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      resolve(false)
      return
    }
    resolve(session.isReachable)
  }

  @objc
  func sendMessageToWatch(_ message: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
      return
    }
    guard session.isReachable else {
      reject("NOT_REACHABLE", "Apple Watch is not reachable", nil)
      return
    }

    let dict = message as? [String: Any] ?? [:]
    session.sendMessage(dict, replyHandler: { reply in
      resolve(reply)
    }, errorHandler: { error in
      reject("SEND_ERROR", error.localizedDescription, error)
    })
  }

  @objc
  func updateApplicationContext(_ context: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
      return
    }

    let dict = context as? [String: Any] ?? [:]
    do {
      try session.updateApplicationContext(dict)
      resolve(true)
    } catch {
      reject("CONTEXT_ERROR", error.localizedDescription, error)
    }
  }

  @objc
  func getReceivedApplicationContext(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      resolve([:])
      return
    }
    resolve(session.receivedApplicationContext)
  }

  @objc
  func transferUserInfo(_ userInfo: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
      return
    }

    let dict = userInfo as? [String: Any] ?? [:]
    let transfer = session.transferUserInfo(dict)
    resolve(["transferring": transfer.isTransferring])
  }

  @objc
  func transferFile(_ fileURL: NSString, metadata: NSDictionary?, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      reject("NOT_SUPPORTED", "WatchConnectivity not supported", nil)
      return
    }

    let url = URL(fileURLWithPath: fileURL as String)
    guard FileManager.default.fileExists(atPath: url.path) else {
      reject("FILE_NOT_FOUND", "File not found at \(url.path)", nil)
      return
    }

    let meta = metadata as? [String: Any]
    let transfer = session.transferFile(url, metadata: meta)
    resolve(["transferID": transfer.hashValue])
  }

  @objc
  func ping(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let session = session else {
      resolve([
        "supported": false,
        "paired": false,
        "installed": false,
        "reachable": false,
        "state": "not_supported",
        "pendingMessages": 0
      ])
      return
    }

    resolve([
      "supported": WCSession.isSupported(),
      "paired": session.isPaired,
      "installed": session.isWatchAppInstalled,
      "reachable": session.isReachable,
      "state": sessionStateString(session.activationState),
      "pendingMessages": session.outstandingUserInfoTransfers.count
    ])
  }

  // MARK: - WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    guard hasListeners else { return }

    let status: [String: Any] = [
      "state": sessionStateString(activationState),
      "isReachable": session.isReachable,
      "isPaired": session.isPaired,
      "isWatchAppInstalled": session.isWatchAppInstalled,
      "error": error?.localizedDescription ?? NSNull()
    ]
    sendEvent(withName: "onWatchActivationCompleted", body: status)
  }

  func sessionDidBecomeInactive(_ session: WCSession) {
    // Required for iOS
  }

  func sessionDidDeactivate(_ session: WCSession) {
    // Re-activate for switching watches
    session.activate()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    guard hasListeners else { return }

    let status: [String: Any] = [
      "isReachable": session.isReachable,
      "isPaired": session.isPaired,
      "isWatchAppInstalled": session.isWatchAppInstalled
    ]
    sendEvent(withName: "onWatchReachabilityChanged", body: status)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    guard hasListeners else { return }
    sendEvent(withName: "onWatchMessageReceived", body: ["message": message])
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    guard hasListeners else {
      replyHandler(["status": "no_listeners"])
      return
    }
    sendEvent(withName: "onWatchMessageReceived", body: ["message": message])
    replyHandler(["status": "received", "timestamp": Date().timeIntervalSince1970 * 1000])
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    guard hasListeners else { return }
    sendEvent(withName: "onWatchDataReceived", body: [
      "type": "applicationContext",
      "data": applicationContext,
      "size": applicationContext.count
    ])
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    guard hasListeners else { return }
    sendEvent(withName: "onWatchDataReceived", body: [
      "type": "userInfo",
      "data": userInfo,
      "size": userInfo.count
    ])
  }

  func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
    guard hasListeners else { return }

    if let error = error {
      sendEvent(withName: "onWatchError", body: [
        "type": "fileTransfer",
        "error": error.localizedDescription
      ])
    }
  }

  // MARK: - Helpers

  private func sessionStateString(_ state: WCSessionActivationState) -> String {
    switch state {
    case .activated: return "activated"
    case .inactive: return "inactive"
    case .notActivated: return "notActivated"
    @unknown default: return "unknown"
    }
  }
}
