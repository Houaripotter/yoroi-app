// ============================================
// YOROI - MULTIPEER CONNECTIVITY BRIDGE
// ============================================
// Synchro locale iPhone, iPad et Mac (Bluetooth, wifi direct, reseau local).
// Zero serveur, zero internet. Le chiffrement et l'appairage par code sont faits en JS
// (lib/peerSyncService.ts) : ici on ne fait que relier les appareils YOROI proches.
//
// 31 octobre 2026, correction de la double invitation :
//  . Avant, chaque appareil invitait tous ceux qu'il trouvait et acceptait toutes les invitations. Deux appareils
//    s'invitaient en meme temps, deux connexions croisees dans la meme session, la session ne s'etablissait pas.
//  . Maintenant, chaque appareil publie un identifiant fixe (identifierForVendor, sinon un UUID garde) dans discoveryInfo.
//    SEUL l'appareil dont l'identifiant est le plus petit invite (comparaison de chaines, meme regle des deux
//    cotes). L'autre se contente d'accepter. Un appareil sans identifiant (ancienne version) n'est jamais invite :
//    c'est lui qui nous invite, comme avant, et on accepte.
//  . Relance : apres un echec ou une deconnexion, l'inviteur reessaie avec une attente croissante
//    (1,5 s, 3 s, 6 s... 30 s au plus) tant que l'autre appareil est visible. Un controle toutes les 5 s
//    rattrape une invitation restee sans reponse au dela de 25 s.
//  . Arriere plan : iOS coupe les sessions. Au retour au premier plan, la session est recreee et la recherche
//    relancee (le JS fait de meme par lib/v2/synchro/auto.ts, les deux sont sans effet en double).
//  . MCPeerID garde d'un lancement a l'autre (archive), comme Apple le recommande : l'autre appareil ne voit pas
//    un nouvel appareil a chaque ouverture.
//  . Nom affiche limite a 63 octets UTF-8 (au dela MCPeerID leve une exception), et « Mac » pour l'app iOS lancee
//    sur Mac quand le systeme ne donne qu'un nom generique.
//  . Une perte de vue (lostPeer) n'est plus annoncee comme une deconnexion : la session peut rester ouverte.
//    Evenements en plus : multipeer_peer_found, multipeer_peer_lost, multipeer_error.
// ============================================

import Foundation
import MultipeerConnectivity
import UIKit
internal import React

@objc(MultipeerBridge)
class MultipeerBridge: RCTEventEmitter {

  // Service type <= 15 chars, alphanumerique + tirets uniquement (Info.plist : _yoroi-sync._tcp et _udp)
  static let serviceType = "yoroi-sync"

  private static let cleIdentifiant = "yoroi_multipeer_id_v1"
  private static let clePeer = "yoroi_multipeer_peer_v1"
  private static let clePeerNom = "yoroi_multipeer_peer_nom_v1"
  private static let clePeerId = "yoroi_multipeer_peer_id_v1"
  /// Duree d'une invitation avant abandon par MultipeerConnectivity
  private static let delaiInvitation: TimeInterval = 15
  /// Au dela, une connexion « en cours » est consideree perdue et relancee
  private static let delaiConnexionMax: TimeInterval = 25
  private static let attenteMax: TimeInterval = 30

  /// Regle unique : j'invite seulement si mon identifiant est plus petit que le sien.
  /// Sans identifiant chez l'autre (ancienne version), je n'invite pas : il m'invite.
  static func doitInviter(monId: String, sonId: String?) -> Bool {
    guard let sonId = sonId, !sonId.isEmpty, !monId.isEmpty, sonId != monId else { return false }
    return monId < sonId
  }

  /// Attente avant le n-ieme nouvel essai (n >= 1) : 1,5 s, 3 s, 6 s, 12 s, 24 s, puis 30 s
  static func attenteAvantEssai(_ n: Int) -> TimeInterval {
    let base = 1.5 * pow(2.0, Double(max(0, n - 1)))
    return min(attenteMax, base)
  }

  private var monId: String = ""
  private var myPeerID: MCPeerID?
  private var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?
  private var hasListeners = false
  private var isRunning = false
  private var enPause = false

  // Tout l'etat ci dessous n'est lu et modifie que sur la file principale
  /// Appareils YOROI visibles : peer -> identifiant publie ("" si ancienne version)
  private var trouves: [MCPeerID: String] = [:]
  /// Connexions en cours (invitation envoyee ou acceptee) : peer -> debut
  private var enCours: [MCPeerID: Date] = [:]
  /// Essais rates d'affilee, et heure avant laquelle on ne reinvite pas
  private var essais: [MCPeerID: Int] = [:]
  private var prochainEssai: [MCPeerID: Date] = [:]
  /// Appareils dont la session est etablie (pour n'annoncer « disconnected » que s'ils l'etaient)
  private var connectes: Set<MCPeerID> = []
  private var controle: Timer?
  private var observateurs: [NSObjectProtocol] = []

  override init() {
    super.init()
    let centre = NotificationCenter.default
    observateurs.append(centre.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
      self?.passerEnArrierePlan()
    })
    observateurs.append(centre.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
      self?.revenirAuPremierPlan()
    })
  }

  deinit {
    observateurs.forEach { NotificationCenter.default.removeObserver($0) }
  }

  // ============================================
  // IDENTITE
  // ============================================

  /// identifierForVendor d'abord : il differe d'un appareil a l'autre, meme pour un iPad restaure depuis la
  /// sauvegarde de l'iPhone (UserDefaults, lui, serait copie et les deux appareils auraient le meme identifiant).
  private static func identifiantPersistant() -> String {
    if let idfv = UIDevice.current.identifierForVendor?.uuidString, !idfv.isEmpty { return idfv }
    let defaults = UserDefaults.standard
    if let id = defaults.string(forKey: cleIdentifiant), !id.isEmpty { return id }
    let id = UUID().uuidString
    defaults.set(id, forKey: cleIdentifiant)
    return id
  }

  /// Nom montre aux autres appareils. Depuis iOS 16, sans autorisation speciale d'Apple, UIDevice.name ne donne
  /// que « iPhone » ou « iPad ». Sur Mac (app iOS), on ecrit « Mac » plutot qu'un nom d'iPad trompeur.
  static func nomAffiche() -> String {
    var nom = UIDevice.current.name.trimmingCharacters(in: .whitespacesAndNewlines)
    var surMac = false
    if #available(iOS 14.0, *) { surMac = ProcessInfo.processInfo.isiOSAppOnMac }
    if surMac {
      let bas = nom.lowercased()
      if nom.isEmpty || bas == "ipad" || bas == "iphone" { nom = "Mac" }
    }
    if nom.isEmpty { nom = UIDevice.current.model }
    if nom.isEmpty { nom = "YOROI" }
    // MCPeerID refuse plus de 63 octets UTF-8 (exception, donc plantage)
    while nom.utf8.count > 63 { nom.removeLast() }
    return nom
  }

  /// Le meme MCPeerID d'un lancement a l'autre, recree si le nom ou l'identifiant a change
  /// (une sauvegarde restauree sur un autre appareil n'en reprend donc pas le MCPeerID)
  private static func peerPersistant(nom: String, id: String) -> MCPeerID {
    let defaults = UserDefaults.standard
    if defaults.string(forKey: clePeerNom) == nom,
       defaults.string(forKey: clePeerId) == id,
       let data = defaults.data(forKey: clePeer),
       let peer = try? NSKeyedUnarchiver.unarchivedObject(ofClass: MCPeerID.self, from: data) {
      return peer
    }
    let peer = MCPeerID(displayName: nom)
    if let data = try? NSKeyedArchiver.archivedData(withRootObject: peer, requiringSecureCoding: true) {
      defaults.set(data, forKey: clePeer)
      defaults.set(nom, forKey: clePeerNom)
      defaults.set(id, forKey: clePeerId)
    }
    return peer
  }

  // ============================================
  // SESSION, ANNONCE, RECHERCHE (file principale)
  // ============================================

  private func preparerSiBesoin() {
    guard myPeerID == nil else { return }
    if monId.isEmpty { monId = MultipeerBridge.identifiantPersistant() }
    let peer = MultipeerBridge.peerPersistant(nom: MultipeerBridge.nomAffiche(), id: monId)
    myPeerID = peer

    let ad = MCNearbyServiceAdvertiser(
      peer: peer,
      discoveryInfo: ["app": "yoroi", "id": monId],
      serviceType: MultipeerBridge.serviceType
    )
    ad.delegate = self
    advertiser = ad

    let br = MCNearbyServiceBrowser(peer: peer, serviceType: MultipeerBridge.serviceType)
    br.delegate = self
    browser = br
  }

  /// Session neuve a chaque demarrage : une MCSession deconnectee puis reutilisee se relie mal
  private func nouvelleSession() {
    guard let peer = myPeerID else { return }
    session?.delegate = nil
    session?.disconnect()
    let s = MCSession(peer: peer, securityIdentity: nil, encryptionPreference: .required)
    s.delegate = self
    session = s
  }

  private func viderEtat() {
    trouves.removeAll()
    enCours.removeAll()
    essais.removeAll()
    prochainEssai.removeAll()
    connectes.removeAll()
  }

  private func lancer() {
    nouvelleSession()
    viderEtat()
    advertiser?.startAdvertisingPeer()
    browser?.startBrowsingForPeers()
    controle?.invalidate()
    controle = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
      self?.controler()
    }
  }

  private func arreter() {
    controle?.invalidate()
    controle = nil
    advertiser?.stopAdvertisingPeer()
    browser?.stopBrowsingForPeers()
    session?.delegate = nil
    session?.disconnect()
    session = nil
    viderEtat()
  }

  private func passerEnArrierePlan() {
    guard isRunning, !enPause else { return }
    enPause = true
    arreter()
  }

  private func revenirAuPremierPlan() {
    guard isRunning, enPause else { return }
    enPause = false
    lancer()
  }

  /// Toutes les 5 s : relance une connexion bloquee et invite un appareil visible pas encore relie
  private func controler() {
    guard isRunning, !enPause else { return }
    let maintenant = Date()
    for (peer, debut) in enCours where maintenant.timeIntervalSince(debut) > MultipeerBridge.delaiConnexionMax {
      enCours[peer] = nil
    }
    for peer in trouves.keys { inviterSiBesoin(peer) }
  }

  private func inviterSiBesoin(_ peer: MCPeerID) {
    guard isRunning, !enPause, let session = session, let browser = browser else { return }
    guard let sonId = trouves[peer], MultipeerBridge.doitInviter(monId: monId, sonId: sonId) else { return }
    guard !session.connectedPeers.contains(peer), enCours[peer] == nil else { return }
    if let p = prochainEssai[peer], p > Date() { return }
    enCours[peer] = Date()
    browser.invitePeer(peer, to: session, withContext: nil, timeout: MultipeerBridge.delaiInvitation)
  }

  private func programmerEssai(_ peer: MCPeerID) {
    let n = (essais[peer] ?? 0) + 1
    essais[peer] = n
    let attente = MultipeerBridge.attenteAvantEssai(n)
    prochainEssai[peer] = Date().addingTimeInterval(attente)
    DispatchQueue.main.asyncAfter(deadline: .now() + attente + 0.1) { [weak self] in
      self?.inviterSiBesoin(peer)
    }
  }

  // ============================================
  // REACT NATIVE EVENT EMITTER
  // ============================================

  override func supportedEvents() -> [String]! {
    return [
      "multipeer_peer_changed",
      "multipeer_data_received",
      "multipeer_peer_found",
      "multipeer_peer_lost",
      "multipeer_error",
    ]
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
  // API EXPOSEE A REACT NATIVE (memes signatures, MultipeerBridge.m inchange)
  // ============================================

  @objc func startDiscovery(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.preparerSiBesoin()
      guard !self.isRunning else {
        resolve(true)
        return
      }
      self.isRunning = true
      self.enPause = UIApplication.shared.applicationState == .background
      if !self.enPause { self.lancer() }
      resolve(true)
    }
  }

  @objc func stopDiscovery(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.isRunning = false
      self.enPause = false
      self.arreter()
      resolve(true)
    }
  }

  @objc func sendData(
    _ data: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard let session = self.session else {
        reject("NO_PEERS", "Aucun appareil Yoroi connecte a proximite", nil)
        return
      }
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
  }

  @objc func getConnectedPeers(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      resolve((self.session?.connectedPeers ?? []).map { $0.displayName })
    }
  }

  @objc func getDeviceName(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      resolve(self.myPeerID?.displayName ?? MultipeerBridge.nomAffiche())
    }
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
    DispatchQueue.main.async {
      // un evenement d'une ancienne session (avant arriere plan ou arret) ne compte plus
      guard session === self.session else { return }
      let etaitConnecte = self.connectes.contains(peerID)
      switch state {
      case .connected:
        self.enCours[peerID] = nil
        self.essais[peerID] = nil
        self.prochainEssai[peerID] = nil
        self.connectes.insert(peerID)
        self.emit("multipeer_peer_changed", body: ["peer": peerID.displayName, "state": "connected"])
      case .connecting:
        if self.enCours[peerID] == nil { self.enCours[peerID] = Date() }
        self.emit("multipeer_peer_changed", body: ["peer": peerID.displayName, "state": "connecting"])
      case .notConnected:
        self.enCours[peerID] = nil
        self.connectes.remove(peerID)
        // On annonce une deconnexion seulement pour un appareil qui etait relie : un essai rate n'en est pas une
        if etaitConnecte {
          self.emit("multipeer_peer_changed", body: ["peer": peerID.displayName, "state": "disconnected"])
        }
        if self.isRunning, !self.enPause, self.trouves[peerID] != nil { self.programmerEssai(peerID) }
      @unknown default:
        break
      }
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

  // Sans certificat (securityIdentity nil) : on accepte, la confiance est faite en JS par la cle de la paire
  func session(
    _ session: MCSession,
    didReceiveCertificate certificate: [Any]?,
    fromPeer peerID: MCPeerID,
    certificateHandler: @escaping (Bool) -> Void
  ) {
    certificateHandler(true)
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
    DispatchQueue.main.async {
      guard self.isRunning, !self.enPause, let session = self.session, peerID != self.myPeerID else {
        invitationHandler(false, nil)
        return
      }
      // Deja relie : on refuse, sinon on casserait la session en place
      guard !session.connectedPeers.contains(peerID) else {
        invitationHandler(false, nil)
        return
      }
      // L'autre est l'inviteur (identifiant plus petit, ou ancienne version) : on accepte, on ne l'invite pas
      self.enCours[peerID] = Date()
      invitationHandler(true, session)
    }
  }

  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didNotStartAdvertisingPeer error: Error
  ) {
    let ns = error as NSError
    DispatchQueue.main.async {
      self.emit("multipeer_error", body: ["source": "annonce", "code": ns.code, "domaine": ns.domain])
    }
    // Nouvel essai apres 5 secondes
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
      guard let self = self, self.isRunning, !self.enPause else { return }
      self.advertiser?.startAdvertisingPeer()
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
    DispatchQueue.main.async {
      guard self.isRunning, !self.enPause, peerID != self.myPeerID else { return }
      guard info?["app"] == "yoroi" else { return }
      let sonId = info?["id"] ?? ""
      if !sonId.isEmpty && sonId == self.monId { return } // soi meme
      self.trouves[peerID] = sonId
      self.emit("multipeer_peer_found", body: ["peer": peerID.displayName])
      self.inviterSiBesoin(peerID)
    }
  }

  func browser(
    _ browser: MCNearbyServiceBrowser,
    lostPeer peerID: MCPeerID
  ) {
    DispatchQueue.main.async {
      self.trouves[peerID] = nil
      self.essais[peerID] = nil
      self.prochainEssai[peerID] = nil
      // Perdu de vue n'est pas deconnecte : la session peut tenir. La deconnexion vient de MCSession.
      self.emit("multipeer_peer_lost", body: ["peer": peerID.displayName])
    }
  }

  func browser(
    _ browser: MCNearbyServiceBrowser,
    didNotStartBrowsingForPeers error: Error
  ) {
    let ns = error as NSError
    DispatchQueue.main.async {
      self.emit("multipeer_error", body: ["source": "recherche", "code": ns.code, "domaine": ns.domain])
    }
    // Nouvel essai apres 5 secondes
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
      guard let self = self, self.isRunning, !self.enPause else { return }
      self.browser?.startBrowsingForPeers()
    }
  }
}
