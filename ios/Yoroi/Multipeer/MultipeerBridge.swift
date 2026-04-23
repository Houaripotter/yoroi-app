// ============================================
// YOROI - MULTIPEER CONNECTIVITY BRIDGE
// ============================================
// Sync iPhone <-> iPad en local (Bluetooth + WiFi direct)
// Zero serveur, zero internet, 100% gratuit
// ============================================

import Foundation
import MultipeerConnectivity
import UIKit
internal import React

@objc(MultipeerBridge)
class MultipeerBridge: RCTEventEmitter {

  // Service type <= 15 chars, alphanumérique + tirets uniquement
  static let serviceType = "yoroi-sync"

  private var myPeerID: MCPeerID!
  private var session: MCSession!
  private var advertiser: MCNearbyServiceAdvertiser!
  private var browser: MCNearbyServiceBrowser!
  private var hasListeners = false
  private var isRunning = false

  override init() {
    super.init()
    setupSession()
  }

  // ============================================
  // SETUP DE LA SESSION
  // ============================================

  private func setupSession() {
    let deviceName = UIDevice.current.name
    myPeerID = MCPeerID(displayName: deviceName)

    session = MCSession(
      peer: myPeerID,
      securityIdentity: nil,
      encryptionPreference: .required
    )
    session.delegate = self

    advertiser = MCNearbyServiceAdvertiser(
      peer: myPeerID,
      discoveryInfo: ["app": "yoroi"],
      serviceType: MultipeerBridge.serviceType
    )
    advertiser.delegate = self

    browser = MCNearbyServiceBrowser(
      peer: myPeerID,
      serviceType: MultipeerBridge.serviceType
    )
    browser.delegate = self
  }

  // ============================================
  // REACT NATIVE EVENT EMITTER
  // ============================================

  override func supportedEvents() -> [String]! {
    return ["multipeer_peer_changed", "multipeer_data_received"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  private func emit(_ name: String, body: [String: Any]) {
    guard hasListeners else { return }
    sendEvent(withName: name, body: body)
  }

  // ============================================
  // API EXPOSEE A REACT NATIVE
  // ============================================

  @objc func startDiscovery(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !isRunning else {
      resolve(true)
      return
    }
    advertiser.startAdvertisingPeer()
    browser.startBrowsingForPeers()
    isRunning = true
    resolve(true)
  }

  @objc func stopDiscovery(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    advertiser.stopAdvertisingPeer()
    browser.stopBrowsingForPeers()
    session.disconnect()
    isRunning = false
    resolve(true)
  }

  @objc func sendData(
    _ data: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let peers = session.connectedPeers
    guard !peers.isEmpty else {
      reject("NO_PEERS", "Aucun appareil Yoroi connecte a proximite", nil)
      return
    }
    guard let dataToSend = data.data(using: .utf8) else {
      reject("ENCODE_ERROR", "Impossible d'encoder les donnees", nil)
      return
    }
    do {
      try session.send(dataToSend, toPeers: peers, with: .reliable)
      resolve(true)
    } catch {
      reject("SEND_ERROR", error.localizedDescription, error)
    }
  }

  @objc func getConnectedPeers(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let peers = session.connectedPeers.map { $0.displayName }
    resolve(peers)
  }

  @objc func getDeviceName(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(UIDevice.current.name)
  }
}

// ============================================
// MCSessionDelegate
// ============================================

extension MultipeerBridge: MCSessionDelegate {

  func session(
    _ session: MCSession,
    peer peerID: MCPeerID,
    didChange state: MCSessionState
  ) {
    let stateStr: String
    switch state {
    case .connected:    stateStr = "connected"
    case .connecting:   stateStr = "connecting"
    case .notConnected: stateStr = "disconnected"
    @unknown default:   stateStr = "disconnected"
    }
    DispatchQueue.main.async {
      self.emit("multipeer_peer_changed", body: [
        "peer": peerID.displayName,
        "state": stateStr
      ])
    }
  }

  func session(
    _ session: MCSession,
    didReceive data: Data,
    fromPeer peerID: MCPeerID
  ) {
    guard let str = String(data: data, encoding: .utf8) else { return }
    DispatchQueue.main.async {
      self.emit("multipeer_data_received", body: [
        "peer": peerID.displayName,
        "data": str
      ])
    }
  }

  // Methodes requises non utilisees
  func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
  func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
  func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

// ============================================
// MCNearbyServiceAdvertiserDelegate
// ============================================

extension MultipeerBridge: MCNearbyServiceAdvertiserDelegate {

  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didReceiveInvitationFromPeer peerID: MCPeerID,
    withContext context: Data?,
    invitationHandler: @escaping (Bool, MCSession?) -> Void
  ) {
    // Ne pas re-accepter un peer deja connecte
    guard !session.connectedPeers.contains(peerID) else {
      invitationHandler(false, nil)
      return
    }
    // Auto-accepter toutes les invitations Yoroi
    invitationHandler(true, session)
  }

  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didNotStartAdvertisingPeer error: Error
  ) {
    // Retry apres 5 secondes
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
      guard self?.isRunning == true else { return }
      self?.advertiser.startAdvertisingPeer()
    }
  }
}

// ============================================
// MCNearbyServiceBrowserDelegate
// ============================================

extension MultipeerBridge: MCNearbyServiceBrowserDelegate {

  func browser(
    _ browser: MCNearbyServiceBrowser,
    foundPeer peerID: MCPeerID,
    withDiscoveryInfo info: [String: String]?
  ) {
    // Inviter uniquement les appareils Yoroi, non encore connectes
    guard info?["app"] == "yoroi" else { return }
    guard !session.connectedPeers.contains(peerID) else { return }
    browser.invitePeer(peerID, to: session, withContext: nil, timeout: 30)
  }

  func browser(
    _ browser: MCNearbyServiceBrowser,
    lostPeer peerID: MCPeerID
  ) {
    DispatchQueue.main.async {
      self.emit("multipeer_peer_changed", body: [
        "peer": peerID.displayName,
        "state": "disconnected"
      ])
    }
  }

  func browser(
    _ browser: MCNearbyServiceBrowser,
    didNotStartBrowsingForPeers error: Error
  ) {
    // Retry apres 5 secondes
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
      guard self?.isRunning == true else { return }
      self?.browser.startBrowsingForPeers()
    }
  }
}
