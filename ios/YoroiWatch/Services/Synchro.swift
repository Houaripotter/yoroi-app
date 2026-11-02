import Foundation
import Observation
import UIKit
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
  /// 28 octobre 2026 : ton personnage et ta scene, recus de l'iPhone (nil tant qu'ils ne sont pas arrives).
  private(set) var personnage: UIImage?
  private(set) var scene: UIImage?

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
    personnage = Partage.image(Partage.fichierPersonnage)
    scene = Partage.image(Partage.fichierScene)
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

  /// Ton personnage, seulement si l'iPhone dit que tu en as un (« Sans personnage » : rien).
  var personnageAffiche: UIImage? { contexte.dojo?.personnage == nil ? nil : personnage }

  /// 28 octobre 2026 : un appui de la seance guidee (« Série faite », « +15 s »), dans le format des appuis
  /// de la Dynamic Island (lib/v2/seance/actionsIle.ts). Pas de file locale : watchOS garde le transferUserInfo
  /// jusqu'a l'iPhone, et l'iPhone dedoublonne par id.
  func envoyerAppuiSeance(type: String, exo: String?) {
    var o: [String: Any] = [
      "id": UUID().uuidString.lowercased(),
      "type": type,
      "at": (Date().timeIntervalSince1970 * 1000).rounded(),
    ]
    if let exo { o["exo"] = exo }
    guard let s = session, s.activationState == .activated,
          JSONSerialization.isValidJSONObject(o),
          let data = try? JSONSerialization.data(withJSONObject: o, options: []),
          let json = String(data: data, encoding: .utf8) else { return }
    let charge: [String: Any] = ["yoroi": json]
    s.transferUserInfo(charge)
    if s.isReachable {
      s.sendMessage(charge, replyHandler: nil, errorHandler: nil)
    }
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
    // la seance guidee suit l'iPhone (et garde tes appuis pas encore revenus)
    SeanceGuidee.shared.recevoir(base.seance)
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

  /// 28 octobre 2026 : ton personnage et ta scene, reduits par l'iPhone (YoroiWidgetsModule.sendImagesToWatch).
  /// Le fichier temporaire disparait au retour de cette methode : il est range tout de suite.
  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    guard let genre = file.metadata?["yoroiImage"] as? String else { return }
    let nom: String
    switch genre {
    case "personnage": nom = Partage.fichierPersonnage
    case "scene": nom = Partage.fichierScene
    default: return
    }
    guard Partage.rangerImage(depuis: file.fileURL, nom: nom) else { return }
    let image = Partage.image(nom)
    DispatchQueue.main.async {
      if genre == "personnage" { self.personnage = image } else { self.scene = image }
      WidgetCenter.shared.reloadAllTimelines()
    }
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

// MARK: - Seance guidee (28 octobre 2026, maquette Montre B, Muscu)

/// Ta seance de musculation de l'iPhone, guidee sur la montre : la serie en cours, la charge, le repos.
/// « Série faite », « +15 s » et « Passer » avancent tout de suite l'affichage (comme l'ile de l'iPhone),
/// puis partent a l'iPhone (sauf Passer, qui ne coupe le repos que sur la montre). Chaque repos est confie
/// a un minuteur de la montre (MinuteurMoteur) : fin de repos avec la meme alarme que les minuteurs,
/// qui reveille la montre (session d'alarme) et sonne meme ecran eteint.
@Observable
final class SeanceGuidee {
  static let shared = SeanceGuidee()

  /// La seance affichee, nil sans seance en cours.
  private(set) var seance: SeanceCtx?

  /// Version locale apres un appui, gardee jusqu'a ce que l'iPhone ait compte la serie (20 s au plus).
  @ObservationIgnored private var locale: SeanceCtx?
  @ObservationIgnored private var localeLe = Date.distantPast
  /// Fin de repos coupee par Passer : la meme fin renvoyee par l'iPhone reste coupee.
  @ObservationIgnored private var reposPasse: Double?
  /// Minuteur de la montre qui porte le repos en cours, et sa fin.
  @ObservationIgnored private(set) var idMinuteur: String?
  @ObservationIgnored private var finArmee: Date?

  /// Une seance commencee il y a plus de 6 h n'est plus montree.
  private static let dureeMax: TimeInterval = 6 * 3600
  private static let cleMinuteur = "yoroi.seance.minuteurRepos"
  private static let cleFin = "yoroi.seance.finRepos"

  init() {
    // l'app relancee retrouve le minuteur du repos en cours : pas de second minuteur pour le meme repos
    let d = UserDefaults.standard
    idMinuteur = d.string(forKey: SeanceGuidee.cleMinuteur)
    let f = d.double(forKey: SeanceGuidee.cleFin)
    finArmee = f > 0 ? Date(timeIntervalSince1970: f) : nil
  }

  private func memoriser() {
    let d = UserDefaults.standard
    if let id = idMinuteur { d.set(id, forKey: SeanceGuidee.cleMinuteur) } else { d.removeObject(forKey: SeanceGuidee.cleMinuteur) }
    if let f = finArmee { d.set(f.timeIntervalSince1970, forKey: SeanceGuidee.cleFin) } else { d.removeObject(forKey: SeanceGuidee.cleFin) }
  }

  var active: Bool { seance != nil }

  /// Le repos tourne encore.
  func enRepos(_ maintenant: Date = Date()) -> Bool {
    guard let f = seance?.finRepos else { return false }
    return f > maintenant
  }

  /// Le minuteur qui sonne est-il celui du repos de la seance ?
  func estRepos(_ idMinuteurFini: String) -> Bool { idMinuteurFini == idMinuteur }

  private static func faites(_ s: SeanceCtx) -> Int { s.exos.reduce(0) { $0 + $1.faites } }

  /// Le contexte de l'iPhone vient d'arriver (ou d'etre recalcule).
  func recevoir(_ recue: SeanceCtx?) {
    var s = recue
    if let r = s, Date().timeIntervalSince(r.debut) > SeanceGuidee.dureeMax { s = nil }
    if var r = s, let p = reposPasse, r.finReposMs == p { r.finReposMs = nil; s = r }
    if let l = locale, Date().timeIntervalSince(localeLe) < 20, let r = s, r.debutMs == l.debutMs, SeanceGuidee.faites(r) < SeanceGuidee.faites(l) {
      s = l
    } else {
      locale = nil
    }
    if s != seance { seance = s }
    if s == nil {
      reposPasse = nil
    }
    armerRepos()
  }

  // MARK: Appuis

  func serieFaite() {
    guard var s = seance, !s.exos.isEmpty else { return }
    let i = min(max(0, s.cur), s.exos.count - 1)
    guard !s.exos[i].fini else { return }
    let exo = s.exos[i]
    s.exos[i].faites += 1
    let repos = max(15, exo.repos)
    if s.exos[i].fini, let j = s.prochain(apres: i) { s.cur = j }
    let maintenant = Date()
    if s.bouclee {
      s.finReposMs = nil
      s.reposTotalS = 0
    } else {
      s.finReposMs = (maintenant.timeIntervalSince1970 + Double(repos)) * 1000
      s.reposTotalS = repos
    }
    reposPasse = nil
    garderLocale(s)
    Haptique.validation()
    Synchro.shared.envoyerAppuiSeance(type: "serie", exo: exo.id)
    armerRepos()
  }

  func plus15() {
    guard var s = seance, let fin = s.finReposMs, fin > Date().timeIntervalSince1970 * 1000 else { return }
    s.finReposMs = fin + 15_000
    s.reposTotalS += 15
    garderLocale(s)
    Synchro.shared.envoyerAppuiSeance(type: "repos15", exo: nil)
    if let id = idMinuteur, MinuteurMoteur.shared.actif(id) != nil {
      MinuteurMoteur.shared.ajouter(id, secondes: 15)
      finArmee = finArmee?.addingTimeInterval(15)
      memoriser()
    } else {
      armerRepos()
    }
  }

  /// Passer le repos : sur la montre seulement (l'iPhone n'a pas d'appui pour ca).
  func passer() {
    guard var s = seance, let fin = s.finReposMs else { return }
    reposPasse = fin
    s.finReposMs = nil
    garderLocale(s)
    Haptique.cran()
    if let id = idMinuteur, MinuteurMoteur.shared.actif(id) != nil { MinuteurMoteur.shared.annuler(id) }
    idMinuteur = nil
    finArmee = nil
    memoriser()
  }

  private func garderLocale(_ s: SeanceCtx) {
    locale = s
    localeLe = Date()
    seance = s
  }

  /// Le repos en cours porte par un minuteur de la montre (lance, decale ou coupe selon la fin connue).
  private func armerRepos() {
    let maintenant = Date()
    let moteur = MinuteurMoteur.shared
    guard let fin = seance?.finRepos, fin.timeIntervalSince(maintenant) > 2 else {
      // effort, ou repos deja fini : un minuteur de repos encore en marche n'a plus lieu d'etre
      if seance?.finRepos == nil, let id = idMinuteur, moteur.actif(id)?.tourne(a: maintenant) == true {
        moteur.annuler(id)
      }
      if seance?.finRepos == nil && idMinuteur != nil {
        idMinuteur = nil
        finArmee = nil
        memoriser()
      }
      return
    }
    if let f = finArmee, abs(f.timeIntervalSince(fin)) < 1.5, let id = idMinuteur, moteur.actif(id) != nil { return }
    if let id = idMinuteur, moteur.actif(id) != nil { moteur.annuler(id) }
    let secondes = Int(fin.timeIntervalSince(maintenant).rounded())
    idMinuteur = moteur.lancer(secondes: secondes, recent: false)
    finArmee = fin
    memoriser()
  }
}
