import Foundation
import Observation
import OSLog
import UserNotifications
import WatchKit
import WidgetKit

// Minuteurs de repos : plusieurs a la fois (jusqu'a 4), pause, +30 s, annuler.
// Tout est calcule depuis l'heure de fin (jamais depuis un compteur qui s'arrete en veille),
// et l'etat est garde dans l'App Group pour la complication.
//
// Qui sonne a la fin (comme le Minuteur d'Apple) :
// - une session d'alarme (WKExtendedRuntimeSession, mode "alarm" dans WKBackgroundModes) est
//   planifiee a chaque depart avec start(at:), pour le minuteur qui finit le plus tot (une seule
//   session a la fois, replanifiee ensuite). watchOS relance l'app quelques secondes avant la fin,
//   meme ecran eteint ou app fermee ; a l'heure, notifyUser fait vibrer fort et en boucle
//   (notification, echec, nouvel essai, toutes les 1 s, avec leur son systeme), 5 min, puis une
//   vibration par minute jusqu'a Arreter. App au premier plan : ecran Termine (Arreter, Repeter).
//   App pas active (poignet baisse, autre app, ecran eteint) : watchOS affiche son alerte d'alarme
//   plein ecran (Arreter, Ouvrir) ; Ouvrir ramene l'app sur l'ecran Termine ;
// - filet : la notification locale (time sensitive) planifiee 2 s apres la fin. Elle n'est retiree
//   qu'au moment ou l'alarme vibre vraiment : si watchOS refuse ou coupe la session (actualisation
//   en arriere plan desactivee, seance d'entrainement en cours), c'est elle qui previent ;
// - pause ou annulation : session et notification annulees.
// Rien n'est envoye a l'iPhone ni ecrit dans Apple Sante.

@Observable
final class MinuteurMoteur: NSObject, WKExtendedRuntimeSessionDelegate {
  static let shared = MinuteurMoteur()
  static let maxActifs = 4
  /// La sonnerie forte dure 5 min (son et vibrations), puis s'arrete toute seule.
  /// 24 octobre 2026 (Houari : « trop timide » face au minuteur d'Apple) : 2 min devient 5 min.
  static let dureeSonnerieMax: TimeInterval = 300
  /// Ecart entre deux salves quand l'app sonne elle meme (premier plan).
  /// 26 octobre 2026 : 1,2 s coupait la salve en cours (elle durait plus longtemps). 1,8 s laisse
  /// finir la salve (1,6 s), et le wizz tourne en continu par dessus.
  static let ecartSonnerie: TimeInterval = 1.8
  /// Ecart entre deux vibrations de la session d'alarme (watchOS demande plus de 0 et 60 s au plus).
  /// 26 octobre 2026 : 0,8 s coupait la vibration et le son precedents avant leur fin, 1 s les laisse finir.
  static let ecartVibrationAlarme: TimeInterval = 1.0
  /// La notification de secours tombe 2 s apres la fin : l'alarme la retire avant si elle a sonne.
  static let retardFilet: TimeInterval = 2

  static let prefixeNotif = "yoroi.minuteur."
  static let categorieNotif = "yoroi.minuteur.fin"
  static let actionArreter = "yoroi.minuteur.arreter"
  static let actionRelancer = "yoroi.minuteur.relancer"
  static let cleDuree = "dureeS"

  private(set) var etat: EtatMinuteurs = .initial
  /// Minuteur termine (ecran Termine), nil sinon.
  private(set) var sonnerie: MinuteurActif?
  /// Vrai tant que le son et les vibrations se repetent (5 min au plus).
  private(set) var sonneEnBoucle = false
  /// Etat de la session d'alarme du dernier minuteur, affiche en mode Modifier pour les essais.
  private(set) var etatAlarme = ""
  private let journal = Logger(subsystem: "com.houari.yoroi.watchkitapp", category: "minuteur")

  @ObservationIgnored private var minuterie: Timer?
  @ObservationIgnored private var boucle: Timer?
  @ObservationIgnored private var finBoucle = Date.distantPast
  @ObservationIgnored private var dernierDecompte: [String: Int] = [:]
  @ObservationIgnored private var notifAutorisees = false
  @ObservationIgnored private var alertesCritiques = false

  // Session d'alarme : une seule a la fois, pour le minuteur qui finit le plus tot.
  @ObservationIgnored private var sessionAlarme: WKExtendedRuntimeSession?
  @ObservationIgnored private var cibleAlarme: MinuteurActif?
  @ObservationIgnored private var minuterieAlarme: Timer?
  /// notifyUser deja appele pour la session en cours (watchOS exige au moins une vibration par session,
  /// sinon il propose de desactiver les alarmes de l'app).
  @ObservationIgnored private var sessionNotifiee = false
  /// Lu par le repeatHandler de notifyUser, appele par watchOS sur un fil quelconque.
  private let repetition = Repetition()
  private static let cleCibleAlarme = "yoroi.minuteur.alarme"

  override init() {
    super.init()
    etat = StockMinuteurs.lire()
    nettoyer(maintenant: Date(), sonner: false)
    if !etat.actifs.isEmpty { demarrerMinuterie() }
    lireAutorisation()
  }

  // MARK: Notifications (appele au lancement par DelegueApp)

  /// Categorie avec les actions Arreter et Relancer, puis demande d'autorisation (watchOS ne la pose qu'une fois).
  static func configurerNotifications(delegue: UNUserNotificationCenterDelegate) {
    let centre = UNUserNotificationCenter.current()
    centre.delegate = delegue
    let arreter = UNNotificationAction(identifier: actionArreter, title: NSLocalizedString("Arrêter", comment: ""), options: [])
    let relancer = UNNotificationAction(identifier: actionRelancer, title: NSLocalizedString("Répéter", comment: ""), options: [.foreground])
    let categorie = UNNotificationCategory(
      identifier: categorieNotif,
      actions: [arreter, relancer],
      intentIdentifiers: [],
      options: [.customDismissAction]
    )
    centre.setNotificationCategories([categorie])
    centre.requestAuthorization(options: [.alert, .sound]) { _, _ in
      DispatchQueue.main.async { MinuteurMoteur.shared.lireAutorisation() }
    }
  }

  func lireAutorisation() {
    UNUserNotificationCenter.current().getNotificationSettings { reglages in
      let ok = reglages.authorizationStatus == .authorized || reglages.authorizationStatus == .provisional
      let critiques = reglages.criticalAlertSetting == .enabled
      DispatchQueue.main.async {
        self.notifAutorisees = ok
        self.alertesCritiques = critiques
      }
    }
  }

  /// Reponse a la notification de fin : Arreter, Relancer, toucher la notification ou la fermer.
  func reponseNotification(identifiant: String, action: String, dureeS: Int?) {
    nettoyer(maintenant: Date(), sonner: false)
    let duree = dureeS ?? sonnerie?.dureeS
    arreterSonnerie()
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [identifiant])
    switch action {
    case MinuteurMoteur.actionRelancer:
      if let d = duree {
        lancer(secondes: d)
        Routeur.shared.recevoir(lien: "minuteurs")
      }
    case UNNotificationDefaultActionIdentifier:
      Routeur.shared.recevoir(lien: "minuteurs")
    default:
      break
    }
  }

  // MARK: Lecture

  var actifs: [MinuteurActif] { etat.actifs }

  func actif(_ id: String) -> MinuteurActif? { etat.actifs.first { $0.id == id } }

  /// Celui a ouvrir depuis une complication.
  var principal: MinuteurActif? { etat.principal(a: Date()) }

  func estEpingle(_ s: Int) -> Bool { etat.epingles.contains(s) }

  /// Recents qui ne sont pas deja epingles, 4 au plus.
  var recentsAffiches: [Int] {
    Array(etat.recents.filter { !etat.epingles.contains($0) }.prefix(4))
  }

  // MARK: Commandes

  /// Lance un minuteur et renvoie son id.
  @discardableResult
  func lancer(secondes: Int) -> String {
    let s = min(99 * 60, max(1, secondes))
    let maintenant = Date()
    let a = MinuteurActif(id: UUID().uuidString, dureeS: s, totalS: Double(s), fin: maintenant.addingTimeInterval(Double(s)), restantPause: nil)
    if etat.actifs.count >= MinuteurMoteur.maxActifs {
      let retire = etat.actifs.removeFirst()
      annulerNotification(retire.id)
    }
    etat.actifs.append(a)
    etat.recents.removeAll { $0 == s }
    etat.recents.insert(s, at: 0)
    if etat.recents.count > 8 { etat.recents = Array(etat.recents.prefix(8)) }
    if sonnerie != nil { arreterSonnerie() }
    enregistrer()
    planifierNotification(a, maintenant: maintenant)
    Haptique.reprise()
    demarrerMinuterie()
    planifierAlarme()
    return a.id
  }

  func basculerPause(_ id: String) {
    guard let i = etat.actifs.firstIndex(where: { $0.id == id }) else { return }
    let maintenant = Date()
    var a = etat.actifs[i]
    if a.enPause {
      a.fin = maintenant.addingTimeInterval(max(1, a.restantPause ?? 1))
      a.restantPause = nil
      etat.actifs[i] = a
      planifierNotification(a, maintenant: maintenant)
      Haptique.reprise()
    } else {
      a.restantPause = a.restant(maintenant)
      a.fin = nil
      etat.actifs[i] = a
      annulerNotification(a.id)
      Haptique.pause()
    }
    dernierDecompte[id] = nil
    enregistrer()
    planifierAlarme()
  }

  func ajouter30(_ id: String) {
    guard let i = etat.actifs.firstIndex(where: { $0.id == id }) else { return }
    var a = etat.actifs[i]
    a.totalS += 30
    if let f = a.fin {
      a.fin = f.addingTimeInterval(30)
    } else {
      a.restantPause = (a.restantPause ?? 0) + 30
    }
    etat.actifs[i] = a
    dernierDecompte[id] = nil
    if !a.enPause { planifierNotification(a, maintenant: Date()) }
    Haptique.cran()
    enregistrer()
    planifierAlarme()
  }

  func annuler(_ id: String) {
    etat.actifs.removeAll { $0.id == id }
    annulerNotification(id)
    dernierDecompte[id] = nil
    Haptique.pause()
    enregistrer()
    arreterSiInutile()
    planifierAlarme()
  }

  /// Arreter : coupe le son, les vibrations deja programmees et la notification, ferme l'ecran Termine.
  func arreterSonnerie() {
    let id = sonnerie?.id
    sonnerie = nil
    arreterBoucle()
    if let id { annulerNotification(id) }
    arreterSiInutile()
    // Prochain minuteur encore en marche : on replanifie l'alarme pour lui.
    planifierAlarme()
  }

  /// Relance la meme duree depuis l'ecran de fin. Renvoie l'id du nouveau minuteur.
  @discardableResult
  func relancer() -> String? {
    guard let s = sonnerie else { return nil }
    arreterSonnerie()
    return lancer(secondes: s.dureeS)
  }

  func basculerEpingle(_ s: Int) {
    if let i = etat.epingles.firstIndex(of: s) {
      etat.epingles.remove(at: i)
    } else {
      etat.epingles.append(s)
      etat.epingles.sort()
    }
    Haptique.cran()
    enregistrer()
  }

  func retirerRecent(_ s: Int) {
    etat.recents.removeAll { $0 == s }
    Haptique.cran()
    enregistrer()
  }

  /// Rattrape ce qui a fini pendant que l'app dormait (calcul depuis l'heure de fin).
  func resynchroniser() {
    let lu = StockMinuteurs.lire()
    if lu != etat { etat = lu }
    tic()
    if !etat.actifs.isEmpty { demarrerMinuterie() }
  }

  /// Retour au premier plan (poignet leve, app rouverte).
  func entrerPremierPlan() {
    lireAutorisation()
    resynchroniser()
    // L'app n'a pu replanifier l'alarme qu'au premier plan : on le fait maintenant si besoin.
    planifierAlarme()
    guard let s = sonnerie else { return }
    let depuis = Date().timeIntervalSince(s.fin ?? Date())
    if depuis > 10 * 60 {
      // Ecran Termine oublie depuis longtemps : on le ferme sans bruit.
      arreterSonnerie()
    } else if boucle == nil && !notifAutorisees && depuis < 60 {
      // Notifications refusees : rien n'a sonne pendant la veille, l'app sonne maintenant.
      demarrerBoucle()
    }
  }

  /// L'app quitte le premier plan : la sonnerie s'arrete (la notification prend le relais)
  /// et la complication est rafraichie une derniere fois.
  func quitterPremierPlan() {
    // Pendant la session d'alarme, l'app continue a sonner meme ecran eteint : on ne coupe pas.
    // Avant, ce retour en veille coupait la sonnerie de l'app juste apres avoir retire la notification.
    if !alarmeEnMarche { arreterBoucle() }
    WidgetCenter.shared.reloadTimelines(ofKind: GenreWidget.minuteurs)
  }

  // MARK: Boucle des minuteurs

  private var auPremierPlan: Bool { WKApplication.shared().applicationState == .active }

  /// Vrai quand la session d'alarme tourne : l'app peut sonner et vibrer meme ecran eteint.
  private var alarmeEnMarche: Bool { sessionAlarme?.state == .running }

  private func demarrerMinuterie() {
    guard minuterie == nil else { return }
    let t = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in self?.tic() }
    RunLoop.main.add(t, forMode: .common)
    minuterie = t
  }

  private func arreterMinuterie() {
    minuterie?.invalidate()
    minuterie = nil
  }

  private func tic() {
    let maintenant = Date()
    for a in etat.actifs where !a.enPause {
      let r = Int(a.restant(maintenant).rounded(.up))
      if r >= 1 && r <= 3 && dernierDecompte[a.id] != r {
        dernierDecompte[a.id] = r
        Haptique.decompteMinuteur()
      }
    }
    nettoyer(maintenant: maintenant, sonner: true)
    arreterSiInutile()
  }

  /// Retire les minuteurs finis. Celui qui vient de finir ouvre l'ecran Termine.
  /// Il ne sonne dans l'app que si elle est sous les yeux ; sinon c'est la notification qui sonne.
  private func nettoyer(maintenant: Date, sonner: Bool) {
    let finis = etat.actifs.filter { a in
      guard let f = a.fin else { return false }
      return f <= maintenant
    }
    guard !finis.isEmpty else { return }
    etat.actifs.removeAll { a in finis.contains { $0.id == a.id } }
    for a in finis { dernierDecompte[a.id] = nil }
    if sonner, let recent = finis.filter({ maintenant.timeIntervalSince($0.fin ?? maintenant) < 60 }).last {
      sonnerie = recent
      if auPremierPlan || alarmeEnMarche {
        // L'app sonne elle meme : la notification ne doit pas sonner en double.
        annulerNotification(recent.id)
        let aLInstant = maintenant.timeIntervalSince(recent.fin ?? maintenant) < 3
        if aLInstant || !notifAutorisees || alarmeEnMarche { demarrerBoucle() }
      }
      // Ni l'un ni l'autre : la notification planifiee sonne a l'heure, rien a jouer ici.
    }
    enregistrer()
  }

  private func arreterSiInutile() {
    if etat.actifs.isEmpty {
      arreterMinuterie()
    }
  }

  private func enregistrer() {
    StockMinuteurs.ecrire(etat)
    WidgetCenter.shared.reloadTimelines(ofKind: GenreWidget.minuteurs)
  }

  // MARK: Sonnerie (60 s au plus, Arreter coupe tout)

  private func demarrerBoucle() {
    // Deja en train de sonner (deux chemins arrivent a la fin : la boucle des minuteurs et la session).
    if sonneEnBoucle { return }
    boucle?.invalidate()
    sonneEnBoucle = true
    finBoucle = Date().addingTimeInterval(MinuteurMoteur.dureeSonnerieMax)
    repetition.jusqua = finBoucle
    // Le wizz tourne en boucle (session ambiante, haut parleur de la montre) jusqu'a Arreter.
    Haptique.demarrerWizz()
    if alarmeEnMarche {
      vibrerParSession()
    } else {
      Haptique.alarmeMinuteur()
    }
    let t = Timer(timeInterval: MinuteurMoteur.ecartSonnerie, repeats: true) { [weak self] _ in self?.tourDeSonnerie() }
    RunLoop.main.add(t, forMode: .common)
    boucle = t
  }

  private func tourDeSonnerie() {
    guard sonnerie != nil, Date() < finBoucle, auPremierPlan || alarmeEnMarche else {
      arreterBoucle()
      return
    }
    // Session d'alarme en marche : notifyUser repete deja la vibration, rien a jouer ici.
    if !alarmeEnMarche {
      Haptique.alarmeMinuteur()
    }
  }

  private func arreterBoucle() {
    let sonnait = boucle != nil || sonneEnBoucle
    boucle?.invalidate()
    boucle = nil
    sonneEnBoucle = false
    repetition.jusqua = .distantPast
    // La session d'alarme a fait son travail : on la ferme (elle ne sert qu'a une fin de minuteur).
    if alarmeEnMarche { annulerAlarme() }
    guard sonnait else { return }
    Haptique.couper()
  }

  // MARK: Session d'alarme

  /// Vibration repetee par watchOS lui meme, ecran eteint compris : notification, echec et nouvel
  /// essai en alternance toutes les 1 s pendant 5 min, puis une par minute jusqu'a Arreter ou la fin
  /// de la session (watchOS n'accepte pas d'intervalle nul, et une session planifiee ne peut etre
  /// fermee par l'app qu'au premier plan). App pas active : watchOS affiche en plus son alerte d'alarme.
  private func vibrerParSession() {
    guard let s = sessionAlarme, s.state == .running, !sessionNotifiee else { return }
    sessionNotifiee = true
    repetition.jusqua = max(finBoucle, Date().addingTimeInterval(5))
    repetition.repartir()
    let r = repetition
    let ecart = MinuteurMoteur.ecartVibrationAlarme
    s.notifyUser(hapticType: .notification) { prochain in
      if Date() < r.jusqua {
        prochain.pointee = r.suivant()
        return ecart
      }
      prochain.pointee = .notification
      return 60
    }
    // L'alarme vibre vraiment : la notification de secours ne doit pas sonner en plus.
    if let c = cibleAlarme ?? sonnerie { annulerNotification(c.id) }
    noterAlarme(String(format: NSLocalizedString("a sonné à %@", comment: ""), "\(Format.heure(Date()))"))
  }

  /// Raison lisible d'un refus de la session d'alarme.
  private static func libelle(_ e: NSError) -> String {
    guard let c = WKExtendedRuntimeSessionErrorCode(rawValue: e.code) else { return String(format: NSLocalizedString("erreur %@", comment: ""), "\(e.code)") }
    switch c {
    case .barDisabled: return NSLocalizedString("actualisation en arrière-plan coupée", comment: "")
    case .mustBeActiveToStartOrSchedule: return NSLocalizedString("app pas au premier plan", comment: "")
    case .notApprovedToStartSession, .notApprovedToSchedule: return NSLocalizedString("mode Smart Alarm absent", comment: "")
    case .exceededResourceLimits: return NSLocalizedString("trop de calcul", comment: "")
    case .scheduledTooFarInAdvance: return NSLocalizedString("trop lointaine", comment: "")
    default: return String(format: NSLocalizedString("erreur %@", comment: ""), "\(e.code)")
    }
  }

  private func noterAlarme(_ texte: String) {
    etatAlarme = texte
    journal.info("Alarme minuteur : \(texte, privacy: .public)")
  }

  /// Planifie la session d'alarme pour le minuteur en marche qui finit le plus tot.
  /// watchOS n'accepte start(at:) et invalidate() qu'app active : sinon on garde l'existant,
  /// la notification sert de filet, et on replanifie au retour au premier plan.
  private func planifierAlarme() {
    let maintenant = Date()
    let cible = etat.actifs
      .filter { $0.tourne(a: maintenant) }
      .min { ($0.fin ?? maintenant) < ($1.fin ?? maintenant) }
    if let s = sessionAlarme, s.state == .scheduled || s.state == .running {
      // Deja planifiee pour la bonne fin : rien a faire.
      if let c = cible, cibleAlarme?.id == c.id, cibleAlarme?.fin == c.fin { return }
      // Une alarme qui sonne n'est coupee que par Arreter.
      if s.state == .running && sonneEnBoucle { return }
    } else if cible == nil {
      return
    }
    guard auPremierPlan else { return }
    annulerAlarme()
    guard let c = cible, let fin = c.fin else { return }
    // La session demarre 4 s avant la fin : le temps de relancer l'app et de retirer la notification.
    let avance: TimeInterval = fin.timeIntervalSince(maintenant) > 10 ? 4 : 0
    let s = WKExtendedRuntimeSession()
    s.delegate = self
    s.start(at: fin.addingTimeInterval(-avance))
    sessionNotifiee = false
    sessionAlarme = s
    cibleAlarme = c
    memoriserCible(c)
    noterAlarme(String(format: NSLocalizedString("programmée pour %@", comment: ""), "\(Format.heure(fin))"))
  }

  /// Annule la session d'alarme (planifiee ou en cours) et ce qui l'attend.
  private func annulerAlarme() {
    minuterieAlarme?.invalidate()
    minuterieAlarme = nil
    if let s = sessionAlarme, s.state == .scheduled || s.state == .running {
      s.invalidate()
    }
    sessionAlarme = nil
    cibleAlarme = nil
    memoriserCible(nil)
  }

  /// watchOS a relance l'app pour la session planifiee (DelegueApp.handle) : on la reprend.
  func adopter(_ session: WKExtendedRuntimeSession) {
    session.delegate = self
    sessionAlarme = session
    sessionNotifiee = false
    if cibleAlarme == nil { cibleAlarme = MinuteurMoteur.lireCible() }
  }

  /// A l'heure de fin : la boucle des minuteurs sonne d'habitude la premiere. Sinon (app relancee
  /// par watchOS et minuteur deja retire), on sonne pour le minuteur memorise.
  private func declencherAlarme() {
    minuterieAlarme = nil
    nettoyer(maintenant: Date(), sonner: true)
    guard !sonneEnBoucle else {
      // La boucle sonnait deja (app au premier plan) : la session doit quand meme vibrer.
      vibrerParSession()
      return
    }
    if sonnerie == nil { sonnerie = cibleAlarme }
    if let c = cibleAlarme { annulerNotification(c.id) }
    demarrerBoucle()
  }

  private func memoriserCible(_ c: MinuteurActif?) {
    let d = UserDefaults.standard
    if let c, let data = try? JSONEncoder().encode(c) {
      d.set(data, forKey: MinuteurMoteur.cleCibleAlarme)
    } else {
      d.removeObject(forKey: MinuteurMoteur.cleCibleAlarme)
    }
  }

  private static func lireCible() -> MinuteurActif? {
    guard let data = UserDefaults.standard.data(forKey: cleCibleAlarme) else { return nil }
    return try? JSONDecoder().decode(MinuteurActif.self, from: data)
  }

  private func planifierNotification(_ a: MinuteurActif, maintenant: Date) {
    annulerNotification(a.id)
    guard let f = a.fin, f > maintenant else { return }
    let contenu = UNMutableNotificationContent()
    contenu.title = NSLocalizedString("Minuteur terminé", comment: "")
    contenu.body = String(format: NSLocalizedString("Minuteur de %@", comment: ""), "\(Format.dureeCourte(a.dureeS))")
    // Son critique seulement si l'autorisation existe (droit Apple a part), sinon le son normal.
    contenu.sound = alertesCritiques ? .defaultCritical : .default
    contenu.interruptionLevel = .timeSensitive
    contenu.categoryIdentifier = MinuteurMoteur.categorieNotif
    contenu.userInfo = [MinuteurMoteur.cleDuree: a.dureeS]
    // 2 s apres la fin : la session d'alarme, si elle tourne, la retire avant (pas de double alerte).
    let declencheur = UNTimeIntervalNotificationTrigger(
      timeInterval: max(1, f.timeIntervalSince(maintenant) + MinuteurMoteur.retardFilet), repeats: false
    )
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: MinuteurMoteur.prefixeNotif + a.id, content: contenu, trigger: declencheur))
  }

  private func annulerNotification(_ id: String) {
    let centre = UNUserNotificationCenter.current()
    centre.removePendingNotificationRequests(withIdentifiers: [MinuteurMoteur.prefixeNotif + id])
    centre.removeDeliveredNotifications(withIdentifiers: [MinuteurMoteur.prefixeNotif + id])
  }

  // MARK: WKExtendedRuntimeSessionDelegate

  func extendedRuntimeSessionDidStart(_ extendedRuntimeSession: WKExtendedRuntimeSession) {
    DispatchQueue.main.async {
      if self.sessionAlarme == nil { self.adopter(extendedRuntimeSession) }
      guard self.sessionAlarme === extendedRuntimeSession else { return }
      let cible = self.cibleAlarme ?? MinuteurMoteur.lireCible()
      self.cibleAlarme = cible
      // La notification de secours reste planifiee (2 s apres la fin) : elle n'est retiree
      // qu'au moment ou l'alarme vibre vraiment (vibrerParSession). Avant, elle etait retiree ici,
      // et si l'alarme ne s'affichait pas ensuite, plus rien ne prevenait.
      self.noterAlarme(NSLocalizedString("démarrée", comment: ""))
      self.etat = StockMinuteurs.lire()
      if !self.etat.actifs.isEmpty { self.demarrerMinuterie() }
      let attente = max(0, (cible?.fin ?? Date()).timeIntervalSinceNow)
      self.minuterieAlarme?.invalidate()
      let t = Timer(timeInterval: attente, repeats: false) { [weak self] _ in self?.declencherAlarme() }
      RunLoop.main.add(t, forMode: .common)
      self.minuterieAlarme = t
    }
  }

  func extendedRuntimeSessionWillExpire(_ extendedRuntimeSession: WKExtendedRuntimeSession) {
    DispatchQueue.main.async {
      guard self.sessionAlarme === extendedRuntimeSession else { return }
      self.arreterBoucle()
    }
  }

  func extendedRuntimeSession(_ extendedRuntimeSession: WKExtendedRuntimeSession, didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason, error: Error?) {
    DispatchQueue.main.async {
      guard self.sessionAlarme === extendedRuntimeSession else { return }
      // Fermee par watchOS (refus, fin du temps) ou par Arreter dans l'alerte d'alarme du systeme.
      // Si elle a ete refusee avant de demarrer, la notification de filet est toujours planifiee.
      if let e = error as NSError? {
        self.noterAlarme(String(format: NSLocalizedString("refusée : %@", comment: ""), "\(MinuteurMoteur.libelle(e))"))
      } else if !self.sessionNotifiee {
        self.noterAlarme(String(format: NSLocalizedString("fermée avant de sonner (raison %@)", comment: ""), "\(reason.rawValue)"))
      } else {
        self.noterAlarme(NSLocalizedString("arrêtée", comment: ""))
      }
      self.sessionAlarme = nil
      self.minuterieAlarme?.invalidate()
      self.minuterieAlarme = nil
      if self.sonneEnBoucle {
        self.arreterBoucle()
        if !self.auPremierPlan { self.sonnerie = nil }
      }
      self.cibleAlarme = nil
      self.memoriserCible(nil)
    }
  }
}

/// Fin des repetitions fortes et suite des vibrations, lues par le repeatHandler de notifyUser
/// (appele par watchOS sur un fil quelconque).
final class Repetition: @unchecked Sendable {
  var jusqua = Date.distantPast
  /// Alternance des vibrations les plus marquees de watchOS.
  private static let suite: [WKHapticType] = [.failure, .retry, .notification]
  private var tour = 0
  private let verrou = NSLock()

  func repartir() {
    verrou.lock()
    tour = 0
    verrou.unlock()
  }

  func suivant() -> WKHapticType {
    verrou.lock()
    defer { verrou.unlock() }
    let t = Repetition.suite[tour % Repetition.suite.count]
    tour += 1
    return t
  }
}
