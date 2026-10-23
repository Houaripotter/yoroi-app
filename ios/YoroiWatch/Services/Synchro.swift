import Foundation
import Observation
import WatchConnectivity
import WidgetKit

// Synchro avec l'iPhone (contrat v1).
// Recoit le contexte par applicationContext, envoie les actions par transferUserInfo
// (plus sendMessage quand l'iPhone est joignable). Les actions restent dans une file
// persistee en App Group tant que l'iPhone ne les a pas prises en compte, et l'affichage
// les integre tout de suite.

@Observable
final class Synchro: NSObject, WCSessionDelegate {
  static let shared = Synchro()

  /// Ce qu'affiche la montre : dernier contexte de l'iPhone plus les actions en attente.
  private(set) var contexte = Contexte()
  /// true des que l'iPhone a envoye au moins un contexte.
  private(set) var aRecuContexte = false
  private(set) var file: [ActionEnAttente] = []
  private(set) var iphoneJoignable = false
  private(set) var derniereSynchro: Date?

  @ObservationIgnored private var recu: Contexte?
  @ObservationIgnored private var session: WCSession?
  @ObservationIgnored private var dernierAffiche: Contexte?
  /// Verres en cours d'ecriture dans Apple Sante, pas encore dans la file :
  /// un double appui ne retire pas deux fois le meme verre.
  @ObservationIgnored private var eauEnVol: Double = 0

  override init() {
    super.init()
    file = Partage.lireFile()
    if let texte = Partage.lireContexteRecu(), let c = Contexte.depuisJSON(texte) {
      recu = c
      aRecuContexte = true
      derniereSynchro = c.dateGeneree
    }
    recalculer(rechargerWidgets: false)
  }

  // MARK: Demarrage

  func demarrer() {
    guard WCSession.isSupported(), session == nil else { return }
    let s = WCSession.default
    s.delegate = self
    s.activate()
    session = s
  }

  // MARK: Lecture pratique

  var unitesEnLivres: Bool { contexte.profil.enLivres }

  var sports: [SportCtx] { contexte.profil.sports.filter { !$0.nom.isEmpty } }

  /// Chronos de l'iPhone d'abord, puis les defauts dont le nom n'est pas deja pris.
  var chronos: [ChronoPreset] {
    let perso = contexte.chronos
    let noms = Set(perso.map { $0.nom.lowercased() })
    return perso + ChronoPreset.defauts.filter { !noms.contains($0.nom.lowercased()) }
  }

  func aEnAttente(_ type: TypeAction) -> Bool {
    file.contains { $0.action.type == type && $0.livreeLe == nil }
  }

  // MARK: Actions de l'utilisateur

  /// Pese : ecrit dans Apple Sante (avec l'id en HKMetadataKeyExternalUUID) puis envoie a l'iPhone.
  func enregistrerPoids(kg: Double) async {
    let id = UUID().uuidString
    let dansSante = await Sante.shared.ecrirePoids(kg: kg, id: id)
    let action = ActionMontre.poids(kg: kg, id: id, dansSante: dansSante)
    await MainActor.run { self.envoyer(action) }
  }

  /// Ajoute (signe +1) ou retire (signe -1) un verre de la taille reglee sur l'iPhone.
  /// Comme la pesee : le verre est d'abord ecrit (ou retire) dans Apple Sante avec l'id de l'action
  /// en HKMetadataKeyExternalUUID, puis envoye a l'iPhone avec dansSante. Si la montre n'a pas pu
  /// (autorisation, verre ecrit par l'iPhone), dansSante = false et l'iPhone le fait a la reception :
  /// chaque verre n'est qu'une fois dans Apple Sante.
  @MainActor
  func changerEau(signe: Int) async {
    let verre = contexte.eau.verre
    let ml = max(0, contexte.eau.ml + eauEnVol)
    if signe < 0 && ml <= 0 { return }
    let delta = signe < 0 ? -min(verre, ml) : verre
    guard delta != 0 else { return }
    eauEnVol += delta
    let id = UUID().uuidString
    let quand = Date()
    let dansSante: Bool
    if delta > 0 {
      dansSante = await Sante.shared.ecrireEau(ml: delta, id: id, date: quand)
    } else {
      dansSante = await Sante.shared.retirerEau(ml: -delta, date: quand)
    }
    eauEnVol -= delta
    envoyer(ActionMontre.eau(deltaMl: delta, id: id, quand: quand, dansSante: dansSante))
  }

  func enregistrerSeance(_ action: ActionMontre) {
    envoyer(action)
  }

  // MARK: File d'attente

  private func envoyer(_ action: ActionMontre) {
    file.append(ActionEnAttente(action: action))
    Partage.ecrireFile(file)
    recalculer(rechargerWidgets: true)
    transmettre(action)
  }

  private func transmettre(_ action: ActionMontre) {
    guard let s = session, s.activationState == .activated, let json = action.json() else { return }
    let charge: [String: Any] = ["yoroi": json]
    s.transferUserInfo(charge)
    if s.isReachable {
      s.sendMessage(charge, replyHandler: nil, errorHandler: nil)
    }
  }

  /// Renvoie ce qui n'a pas ete livre et n'est plus dans la file systeme de watchOS.
  private func renvoyerEnAttente() {
    guard let s = session, s.activationState == .activated else { return }
    let enCours = Set(s.outstandingUserInfoTransfers.compactMap { t -> String? in
      guard let json = t.userInfo["yoroi"] as? String,
            let data = json.data(using: .utf8),
            let a = try? JSONDecoder().decode(ActionMontre.self, from: data) else { return nil }
      return a.id
    })
    for e in file where e.livreeLe == nil && !enCours.contains(e.action.id) {
      transmettre(e.action)
    }
  }

  private func marquerLivree(id: String, erreur: Bool) {
    guard let i = file.firstIndex(where: { $0.action.id == id }) else { return }
    if erreur {
      file[i].essais += 1
    } else {
      file[i].livreeLe = Date()
    }
    Partage.ecrireFile(file)
  }

  // MARK: Fusion

  private func recalculer(rechargerWidgets: Bool) {
    let maintenant = Date()
    var base = recu ?? Contexte()
    base.ramenerAujourdhui(maintenant)

    // Une action livree est consideree prise en compte des qu'un contexte genere apres sa livraison arrive.
    let genere = recu?.dateGeneree
    let limite = maintenant.addingTimeInterval(-14 * 86_400)
    let avant = file.count
    file.removeAll { e in
      if let livree = e.livreeLe, let g = genere, g > livree { return true }
      return e.action.date < limite
    }
    if file.count != avant { Partage.ecrireFile(file) }

    for e in file.sorted(by: { $0.action.at < $1.action.at }) {
      base.appliquer(e.action, maintenant: maintenant)
    }

    if base != dernierAffiche {
      dernierAffiche = base
      contexte = base
      Partage.ecrireContexteAffiche(base)
      if rechargerWidgets { WidgetCenter.shared.reloadAllTimelines() }
    }
  }

  /// A appeler quand l'app revient au premier plan (changement de jour, de semaine).
  func rafraichir() {
    recalculer(rechargerWidgets: true)
    renvoyerEnAttente()
  }

  private func recevoir(_ dico: [String: Any]) {
    guard let texte = dico["yoroi"] as? String, let c = Contexte.depuisJSON(texte) else { return }
    // On ignore un contexte plus ancien que celui qu'on a deja.
    if let actuel = recu?.dateGeneree, let nouveau = c.dateGeneree, nouveau < actuel { return }
    DispatchQueue.main.async {
      Partage.ecrireContexteRecu(texte)
      self.recu = c
      self.aRecuContexte = true
      self.derniereSynchro = c.dateGeneree ?? Date()
      self.recalculer(rechargerWidgets: true)
    }
  }

  // MARK: WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    let contexteSysteme = session.receivedApplicationContext
    let joignable = session.isReachable
    DispatchQueue.main.async {
      self.iphoneJoignable = joignable
      if !contexteSysteme.isEmpty { self.recevoir(contexteSysteme) }
      self.renvoyerEnAttente()
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    let joignable = session.isReachable
    DispatchQueue.main.async {
      self.iphoneJoignable = joignable
      if joignable { self.renvoyerEnAttente() }
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    recevoir(applicationContext)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    recevoir(userInfo)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    recevoir(message)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    recevoir(message)
    replyHandler(["ok": true])
  }

  func session(_ session: WCSession, didFinish userInfoTransfer: WCSessionUserInfoTransfer, error: Error?) {
    guard let json = userInfoTransfer.userInfo["yoroi"] as? String,
          let data = json.data(using: .utf8),
          let a = try? JSONDecoder().decode(ActionMontre.self, from: data) else { return }
    let echec = error != nil
    DispatchQueue.main.async {
      self.marquerLivree(id: a.id, erreur: echec)
      if echec { self.transmettre(a) }
    }
  }
}
