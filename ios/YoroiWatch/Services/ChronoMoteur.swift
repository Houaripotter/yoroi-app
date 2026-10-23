import Foundation
import Observation
import UserNotifications
import WatchKit

// Moteur du chrono combat : preparation, rounds, repos.
// Tout est calcule depuis le temps ecoule (pas de decompte qui derive).
// Pendant une HKWorkoutSession l'app reste active poignet baisse et les haptiques tombent a l'heure.
// Sans Apple Sante, des notifications locales prennent le relais ecran eteint. Plus de session etendue
// ici : le seul mode de session de l'app est maintenant "alarm" (minuteurs), qui ne convient pas au chrono.

enum PhaseChrono: Equatable {
  case preparation
  case round(Int)
  case repos(Int)
  case fini

  var titre: String {
    switch self {
    case .preparation: return NSLocalizedString("Préparation", comment: "")
    case .round: return NSLocalizedString("Round", comment: "")
    case .repos: return NSLocalizedString("Repos", comment: "")
    case .fini: return NSLocalizedString("Terminé", comment: "")
    }
  }
}

struct SegmentChrono: Equatable {
  var phase: PhaseChrono
  var debut: TimeInterval
  var duree: TimeInterval
  var fin: TimeInterval { debut + duree }
}

@Observable
final class ChronoMoteur: NSObject, WKExtendedRuntimeSessionDelegate {
  static let shared = ChronoMoteur()

  private(set) var preset: ChronoPreset?
  private(set) var phase: PhaseChrono = .preparation
  /// Secondes restantes dans la phase en cours.
  private(set) var restant: Int = 0
  private(set) var enPause = false
  private(set) var actif = false
  private(set) var segments: [SegmentChrono] = []

  @ObservationIgnored private var cumul: TimeInterval = 0
  @ObservationIgnored private var repriseLe: Date?
  @ObservationIgnored private var minuterie: Timer?
  @ObservationIgnored private var indexCourant: Int = -1
  @ObservationIgnored private var alerteFaite: Set<Int> = []
  @ObservationIgnored private var dernierDecompte: Int = -1
  @ObservationIgnored private var sessionEtendue: WKExtendedRuntimeSession?

  private let prefixeNotif = "yoroi.chrono."

  var nombreRounds: Int { preset?.rounds ?? 0 }

  var roundCourant: Int {
    switch phase {
    case .round(let n): return n
    case .repos(let n): return n
    case .fini: return nombreRounds
    case .preparation: return 0
    }
  }

  /// Rounds commences (pour le bilan).
  var roundsFaits: Int {
    let e = ecoule()
    return segments.filter {
      if case .round = $0.phase { return e >= $0.debut + 1 }
      return false
    }.count
  }

  var progressionPhase: Double {
    guard indexCourant >= 0, indexCourant < segments.count else { return phase == .fini ? 1 : 0 }
    let s = segments[indexCourant]
    return min(1, max(0, (ecoule() - s.debut) / max(1, s.duree)))
  }

  // MARK: Commandes

  func lancer(_ p: ChronoPreset) {
    arreterMinuterie()
    annulerNotifications()
    preset = p
    segments = ChronoMoteur.decouper(p)
    phase = segments.first?.phase ?? .preparation
    restant = Int(segments.first?.duree ?? 0)
    cumul = 0
    repriseLe = Date()
    indexCourant = -1
    alerteFaite = []
    dernierDecompte = -1
    enPause = false
    actif = true
    tic()
    demarrerMinuterie()
    if !Seance.shared.avecSante { activerRelais() }
  }

  func basculerPause() {
    guard actif, phase != .fini else { return }
    if enPause {
      repriseLe = Date()
      enPause = false
      Seance.shared.reprendre()
      Haptique.reprise()
      if !Seance.shared.avecSante { planifierNotifications() }
    } else {
      if let r = repriseLe { cumul += Date().timeIntervalSince(r) }
      repriseLe = nil
      enPause = true
      Seance.shared.pause()
      Haptique.pause()
      annulerNotifications()
    }
    tic()
  }

  /// Saute au debut du round suivant (ou finit si c'etait le dernier).
  func roundSuivant() {
    guard actif, phase != .fini else { return }
    let e = ecoule()
    if let s = segments.first(where: { seg in
      if case .round = seg.phase { return seg.debut > e + 0.5 }
      return false
    }) {
      sauterA(s.debut)
    } else {
      sauterA(segments.last?.fin ?? e)
    }
  }

  /// Revient au debut du round en cours, ou du precedent si on vient d'en commencer un.
  func roundPrecedent() {
    guard actif, phase != .fini else { return }
    let e = ecoule()
    let debuts = segments.compactMap { seg -> TimeInterval? in
      if case .round = seg.phase { return seg.debut }
      return nil
    }
    let cible = debuts.last(where: { $0 < e - 3 }) ?? 0
    sauterA(cible)
  }

  /// Arret avant la fin : le chrono passe a Termine.
  func terminer() {
    guard actif else { return }
    if let r = repriseLe { cumul += Date().timeIntervalSince(r) }
    repriseLe = nil
    phase = .fini
    restant = 0
    finir(jouer: false)
  }

  /// Tout remettre a zero apres le bilan.
  func liberer() {
    arreterMinuterie()
    annulerNotifications()
    couperRelais()
    actif = false
    preset = nil
    segments = []
    phase = .preparation
    restant = 0
    enPause = false
  }

  /// A appeler au retour au premier plan.
  func resynchroniser() {
    guard actif else { return }
    tic()
  }

  // MARK: Calcul

  static func decouper(_ p: ChronoPreset) -> [SegmentChrono] {
    var t: TimeInterval = 0
    var s: [SegmentChrono] = []
    if p.prepaS > 0 {
      s.append(SegmentChrono(phase: .preparation, debut: 0, duree: TimeInterval(p.prepaS)))
      t = TimeInterval(p.prepaS)
    }
    for n in 1...max(1, p.rounds) {
      s.append(SegmentChrono(phase: .round(n), debut: t, duree: TimeInterval(p.roundS)))
      t += TimeInterval(p.roundS)
      if n < p.rounds && p.reposS > 0 {
        s.append(SegmentChrono(phase: .repos(n), debut: t, duree: TimeInterval(p.reposS)))
        t += TimeInterval(p.reposS)
      }
    }
    return s
  }

  private func ecoule(_ maintenant: Date = Date()) -> TimeInterval {
    var e = cumul
    if let r = repriseLe { e += maintenant.timeIntervalSince(r) }
    return e
  }

  private func sauterA(_ cible: TimeInterval) {
    cumul = cible
    repriseLe = enPause ? nil : Date()
    alerteFaite = alerteFaite.filter { i in i < segments.count && segments[i].fin <= cible }
    dernierDecompte = -1
    tic()
    if !enPause && !Seance.shared.avecSante { planifierNotifications() }
  }

  private func tic() {
    guard actif, phase != .fini else { return }
    let e = ecoule()
    guard let total = segments.last?.fin else { return }
    if e >= total {
      cumul = total
      repriseLe = nil
      phase = .fini
      restant = 0
      finir(jouer: true)
      return
    }
    let i = segments.firstIndex(where: { e >= $0.debut && e < $0.fin }) ?? 0
    let s = segments[i]
    let r = max(0, Int((s.fin - e).rounded(.up)))
    restant = r

    if i != indexCourant {
      let precedent = indexCourant
      indexCourant = i
      phase = s.phase
      dernierDecompte = -1
      if precedent >= 0 || s.phase != .preparation {
        switch s.phase {
        case .round: Haptique.debutRound()
        case .repos: Haptique.finRound()
        default: break
        }
      }
    }

    if enPause { return }

    // Claquettes avant la fin du round
    if case .round = s.phase, let p = preset, p.alerteS > 0, Double(p.alerteS) < s.duree,
       r <= p.alerteS, !alerteFaite.contains(i) {
      alerteFaite.insert(i)
      Haptique.alerteFinRound()
    }

    // Decompte des 3 dernieres secondes de preparation et de repos
    switch s.phase {
    case .preparation, .repos:
      if r <= 3 && r >= 1 && r != dernierDecompte {
        dernierDecompte = r
        Haptique.decompte()
      }
    default: break
    }
  }

  private func finir(jouer: Bool) {
    arreterMinuterie()
    annulerNotifications()
    indexCourant = segments.count
    enPause = false
    if jouer { Haptique.finChrono() }
    Seance.shared.terminer()
    couperRelais()
  }

  private func demarrerMinuterie() {
    let t = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in self?.tic() }
    RunLoop.main.add(t, forMode: .common)
    minuterie = t
  }

  private func arreterMinuterie() {
    minuterie?.invalidate()
    minuterie = nil
  }

  // MARK: Relais sans Apple Sante (ecran eteint)

  private func activerRelais() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { [weak self] _, _ in
      DispatchQueue.main.async { self?.planifierNotifications() }
    }
  }

  private func couperRelais() {
    if let s = sessionEtendue, s.state == .running { s.invalidate() }
    sessionEtendue = nil
    annulerNotifications()
  }

  private func planifierNotifications() {
    annulerNotifications()
    guard actif, !enPause, phase != .fini else { return }
    let e = ecoule()
    let centre = UNUserNotificationCenter.current()
    var n = 0
    for s in segments where s.fin > e + 1 && n < 50 {
      let contenu = UNMutableNotificationContent()
      switch s.phase {
      case .preparation:
        contenu.title = NSLocalizedString("C'est parti", comment: "")
        contenu.body = NSLocalizedString("Round 1", comment: "")
      case .round(let k):
        contenu.title = k >= nombreRounds ? NSLocalizedString("Chrono terminé", comment: "") : String(format: NSLocalizedString("Fin du round %@", comment: ""), "\(k)")
        contenu.body = k >= nombreRounds ? NSLocalizedString("Bien joué", comment: "") : NSLocalizedString("Repos", comment: "")
      case .repos(let k):
        contenu.title = String(format: NSLocalizedString("Round %@", comment: ""), "\(k + 1)")
        contenu.body = NSLocalizedString("C'est reparti", comment: "")
      case .fini:
        continue
      }
      contenu.sound = .default
      contenu.interruptionLevel = .timeSensitive
      let declencheur = UNTimeIntervalNotificationTrigger(timeInterval: max(1, s.fin - e), repeats: false)
      centre.add(UNNotificationRequest(identifier: prefixeNotif + "\(n)", content: contenu, trigger: declencheur))
      n += 1
    }
  }

  private func annulerNotifications() {
    let ids = (0..<50).map { prefixeNotif + "\($0)" }
    let centre = UNUserNotificationCenter.current()
    centre.removePendingNotificationRequests(withIdentifiers: ids)
    centre.removeDeliveredNotifications(withIdentifiers: ids)
  }

  // MARK: WKExtendedRuntimeSessionDelegate

  func extendedRuntimeSessionDidStart(_ extendedRuntimeSession: WKExtendedRuntimeSession) {}

  func extendedRuntimeSessionWillExpire(_ extendedRuntimeSession: WKExtendedRuntimeSession) {}

  func extendedRuntimeSession(_ extendedRuntimeSession: WKExtendedRuntimeSession, didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason, error: Error?) {
    DispatchQueue.main.async {
      if self.sessionEtendue === extendedRuntimeSession { self.sessionEtendue = nil }
    }
  }
}
