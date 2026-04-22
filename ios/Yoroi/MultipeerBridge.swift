// ============================================
// MULTIPEER BRIDGE - Swift native module
// Sync iPhone <-> iPad en local (Bluetooth/WiFi) via MultipeerConnectivity.
// Appelé depuis JS via lib/multipeerBridge.ts
// ============================================

import Foundation
import MultipeerConnectivity
internal import React

@objc(MultipeerBridge)
class MultipeerBridge: RCTEventEmitter {

  // Service type : doit être identique sur iPhone ET iPad pour qu'ils se trouvent.
  // Limite : 15 caractères max, lowercase, alphanumériques + hyphens.
  private static let SERVICE_TYPE = "yoroi-sync"

  private var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?
  private var localPeer: MCPeerID?
  private var hasListeners = false

  // RCTEventEmitter requires this on main queue
  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc override func supportedEvents() -> [String]! {
    return ["multipeer_peer_changed", "multipeer_data_received"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving()  { hasListeners = false }

  // ============================================
  // Helpers
  // ============================================

  private func setupSession() {
    guard self.session == nil else { return }
    let deviceName = UIDevice.current.name
    let peer = MCPeerID(displayName: deviceName)
    self.localPeer = peer
    let session = MCSession(peer: peer, securityIdentity: nil, encryptionPreference: .required)
    session.delegate = self
    self.session = session
  }

  private func emitPeerChanged(peerName: String, state: String) {
    guard hasListeners else { return }
    sendEvent(withName: "multipeer_peer_changed", body: ["peer": peerName, "state": state])
  }

  private func emitDataReceived(peerName: String, data: String) {
    guard hasListeners else { return }
    sendEvent(withName: "multipeer_data_received", body: ["peer": peerName, "data": data])
  }

  // ============================================
  // Exposed methods
  // ============================================

  @objc func startDiscovery(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.setupSession()
      guard let session = self.session, let peer = self.localPeer else {
        reject("MULTIPEER_ERROR", "Session init failed", nil)
        return
      }
      // Arrêter les instances précédentes si elles existent
      self.advertiser?.stopAdvertisingPeer()
      self.browser?.stopBrowsingForPeers()

      let advertiser = MCNearbyServiceAdvertiser(
        peer: peer,
        discoveryInfo: ["app": "yoroi"],
        serviceType: MultipeerBridge.SERVICE_TYPE
      )
      advertiser.delegate = self
      advertiser.startAdvertisingPeer()
      self.advertiser = advertiser

      let browser = MCNearbyServiceBrowser(peer: peer, serviceType: MultipeerBridge.SERVICE_TYPE)
      browser.delegate = self
      browser.startBrowsingForPeers()
      self.browser = browser

      NSLog("[Multipeer] Discovery started as \(peer.displayName)")
      resolve(true)
    }
  }

  @objc func stopDiscovery(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.advertiser?.stopAdvertisingPeer()
      self.browser?.stopBrowsingForPeers()
      self.session?.disconnect()
      self.advertiser = nil
      self.browser = nil
      NSLog("[Multipeer] Discovery stopped")
      resolve(nil)
    }
  }

  @objc func sendData(
    _ jsonString: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let session = self.session else {
      resolve(false)
      return
    }
    let peers = session.connectedPeers
    guard !peers.isEmpty else {
      resolve(false)
      return
    }
    guard let data = (jsonString as String).data(using: .utf8) else {
      reject("MULTIPEER_ERROR", "Invalid UTF-8 data", nil)
      return
    }
    do {
      try session.send(data, toPeers: peers, with: .reliable)
      NSLog("[Multipeer] Sent \(data.count) bytes to \(peers.count) peer(s)")
      resolve(true)
    } catch {
      NSLog("[Multipeer] Send error: \(error)")
      reject("MULTIPEER_SEND_ERROR", error.localizedDescription, error)
    }
  }

  @objc func getConnectedPeers(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let names = self.session?.connectedPeers.map { $0.displayName } ?? []
    resolve(names)
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
  func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
    let stateStr: String
    switch state {
    case .connecting:   stateStr = "connecting"
    case .connected:    stateStr = "connected"
    case .notConnected: stateStr = "disconnected"
    @unknown default:   stateStr = "disconnected"
    }
    NSLog("[Multipeer] Peer \(peerID.displayName) → \(stateStr)")
    emitPeerChanged(peerName: peerID.displayName, state: stateStr)
  }

  func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
    guard let str = String(data: data, encoding: .utf8) else { return }
    NSLog("[Multipeer] Received \(data.count) bytes from \(peerID.displayName)")
    emitDataReceived(peerName: peerID.displayName, data: str)
  }

  func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
  func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
  func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

// ============================================
// MCNearbyServiceAdvertiserDelegate
// ============================================

extension MultipeerBridge: MCNearbyServiceAdvertiserDelegate {
  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
    NSLog("[Multipeer] Invitation from \(peerID.displayName) — auto-accept")
    invitationHandler(true, self.session)
  }

  func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) {
    NSLog("[Multipeer] Advertise error: \(error)")
  }
}

// ============================================
// MCNearbyServiceBrowserDelegate
// ============================================

extension MultipeerBridge: MCNearbyServiceBrowserDelegate {
  func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String : String]?) {
    NSLog("[Multipeer] Found peer \(peerID.displayName) — inviting")
    guard let session = self.session else { return }
    // Invitation auto avec timeout 10s
    browser.invitePeer(peerID, to: session, withContext: nil, timeout: 10)
  }

  func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
    NSLog("[Multipeer] Lost peer \(peerID.displayName)")
  }

  func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
    NSLog("[Multipeer] Browse error: \(error)")
  }
}
