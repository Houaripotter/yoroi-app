import Foundation
import HealthKit
import Observation

// Entrainement en cours : HKWorkoutSession + HKLiveWorkoutBuilder.
// Garde l'app active poignet baisse, ecran toujours allume, FC en direct et calories.
// Si Apple Sante est refuse, la seance tourne quand meme (sans FC ni enregistrement Sante).

enum EtatSeance: Equatable {
  case inactive
  case enCours
  case enPause
  case terminee
}

struct BilanSeance: Equatable {
  var debut: Date
  var dureeS: Int
  var fcMoy: Int?
  var fcMax: Int?
  var kcal: Int?
}

@Observable
final class Seance: NSObject, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
  static let shared = Seance()

  private(set) var etat: EtatSeance = .inactive
  private(set) var fc: Double = 0
  private(set) var fcMoy: Double = 0
  private(set) var fcMax: Double = 0
  private(set) var kcal: Double = 0
  private(set) var debut: Date?
  private(set) var fin: Date?
  /// true quand une vraie HKWorkoutSession tourne.
  private(set) var avecSante = false
  private(set) var fcMaxTheorique: Double?
  /// watchOS 27 : zone 1 a 5 calculee par Apple avec tes zones de Sante (la meme que l'app Exercice).
  private(set) var zoneApple: Int?

  @ObservationIgnored private var session: HKWorkoutSession?
  @ObservationIgnored private var builder: HKLiveWorkoutBuilder?
  @ObservationIgnored private var cumul: TimeInterval = 0
  @ObservationIgnored private var repriseLe: Date?
  @ObservationIgnored private var sommeFc: Double = 0
  @ObservationIgnored private var nbFc: Int = 0

  private var store: HKHealthStore { Sante.shared.store }

  // MARK: Duree

  func dureeEcoulee(a date: Date = Date()) -> TimeInterval {
    var d = cumul
    if let r = repriseLe { d += date.timeIntervalSince(r) }
    return max(0, d)
  }

  /// Zone de FC 1 a 5 : celle d'Apple sur watchOS 27, sinon estimee (50, 60, 70, 80, 90 % de la FC max),
  /// nil si l'age est inconnu.
  var zone: Int? {
    if let z = zoneApple, fc > 0 { return z }
    guard let maxi = fcMaxTheorique, maxi > 0, fc > 0 else { return nil }
    let p = fc / maxi
    switch p {
    case ..<0.5: return nil
    case ..<0.6: return 1
    case ..<0.7: return 2
    case ..<0.8: return 3
    case ..<0.9: return 4
    default: return 5
    }
  }

  // MARK: Cycle de vie

  func demarrer(activite: HKWorkoutActivityType, interieur: Bool) async {
    await MainActor.run { self.reinitialiser() }
    let sante = Sante.shared
    if sante.disponible && !sante.peutEnregistrerEntrainement {
      await sante.demanderAutorisation()
    }
    let maxi = sante.fcMaxTheorique()

    let config = HKWorkoutConfiguration()
    config.activityType = activite
    config.locationType = interieur ? .indoor : .outdoor

    var nouvelleSession: HKWorkoutSession?
    var nouveauBuilder: HKLiveWorkoutBuilder?
    if sante.peutEnregistrerEntrainement {
      if let s = try? HKWorkoutSession(healthStore: store, configuration: config) {
        let b = s.associatedWorkoutBuilder()
        b.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
        s.delegate = self
        b.delegate = self
        nouvelleSession = s
        nouveauBuilder = b
      }
    }

    await MainActor.run {
      let maintenant = Date()
      self.fcMaxTheorique = maxi
      self.session = nouvelleSession
      self.builder = nouveauBuilder
      self.avecSante = nouvelleSession != nil
      self.debut = maintenant
      self.repriseLe = maintenant
      self.etat = .enCours
      if let s = nouvelleSession, let b = nouveauBuilder {
        s.startActivity(with: maintenant)
        b.beginCollection(withStart: maintenant) { _, _ in }
      }
    }
  }

  func pause() {
    guard etat == .enCours else { return }
    if let r = repriseLe { cumul += Date().timeIntervalSince(r) }
    repriseLe = nil
    etat = .enPause
    session?.pause()
  }

  func reprendre() {
    guard etat == .enPause else { return }
    repriseLe = Date()
    etat = .enCours
    session?.resume()
  }

  /// Arrete les capteurs. L'entrainement n'est ecrit dans Sante qu'a l'enregistrement.
  func terminer() {
    guard etat == .enCours || etat == .enPause else { return }
    if let r = repriseLe { cumul += Date().timeIntervalSince(r) }
    repriseLe = nil
    fin = Date()
    etat = .terminee
    session?.end()
  }

  var bilan: BilanSeance {
    BilanSeance(
      debut: debut ?? Date(),
      dureeS: Int(dureeEcoulee().rounded()),
      fcMoy: fcMoy > 0 ? Int(fcMoy.rounded()) : nil,
      fcMax: fcMax > 0 ? Int(fcMax.rounded()) : nil,
      kcal: kcal > 0 ? Int(kcal.rounded()) : nil
    )
  }

  /// Ecrit l'entrainement dans Apple Sante. Renvoie true s'il y est.
  func enregistrerDansSante(id: String, nomSport: String?) async -> Bool {
    guard let b = builder else {
      await MainActor.run { self.reinitialiser() }
      return false
    }
    let finCollecte = fin ?? Date()
    var meta: [String: Any] = [HKMetadataKeyExternalUUID: id]
    if let nomSport, !nomSport.isEmpty { meta["YoroiSport"] = nomSport }

    let ok: Bool = await withCheckedContinuation { (suite: CheckedContinuation<Bool, Never>) in
      b.endCollection(withEnd: finCollecte) { _, _ in
        b.addMetadata(meta) { _, _ in
          b.finishWorkout { entrainement, _ in
            suite.resume(returning: entrainement != nil)
          }
        }
      }
    }
    await MainActor.run { self.reinitialiser() }
    return ok
  }

  /// Ne garde rien de la seance.
  func abandonner() {
    if etat == .enCours || etat == .enPause { session?.end() }
    if let b = builder {
      b.endCollection(withEnd: fin ?? Date()) { _, _ in b.discardWorkout() }
    }
    reinitialiser()
  }

  private func reinitialiser() {
    session = nil
    builder = nil
    avecSante = false
    etat = .inactive
    fc = 0
    fcMoy = 0
    fcMax = 0
    kcal = 0
    debut = nil
    fin = nil
    cumul = 0
    repriseLe = nil
    sommeFc = 0
    nbFc = 0
    zoneApple = nil
  }

  // MARK: HKWorkoutSessionDelegate

  func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {}

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}

  // MARK: HKLiveWorkoutBuilderDelegate

  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  #if compiler(>=6.4)
  // 14 octobre 2026 (ios27) : watchOS 27 envoie la zone de FC en direct (HKLiveWorkoutZoneUpdate).
  // Les zones viennent de tes reglages Sante, comme dans l'app Exercice. Seance enregistree : HealthKit
  // calcule aussi le temps par zone (HKWorkout.zoneGroupsByType), que l'iPhone lit ensuite.
  @available(watchOS 27.0, *)
  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didUpdateWorkoutZone zoneUpdate: HKLiveWorkoutZoneUpdate) {
    guard let groupe = zoneUpdate.zoneGroup,
          groupe.configuration.quantityType.identifier == HKQuantityTypeIdentifier.heartRate.rawValue,
          groupe.configuration.zones.count == 5,
          let index = zoneUpdate.currentZoneDuration?.zone.index,
          index >= 0, index < 5 else { return }
    DispatchQueue.main.async { self.zoneApple = index + 1 }
  }
  #endif

  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
    let typeFc = HKQuantityType(.heartRate)
    let typeKcal = HKQuantityType(.activeEnergyBurned)
    let bpm = HKUnit.count().unitDivided(by: .minute())

    var recent: Double?
    var moyenne: Double?
    var maximum: Double?
    var calories: Double?

    if collectedTypes.contains(typeFc), let st = workoutBuilder.statistics(for: typeFc) {
      recent = st.mostRecentQuantity()?.doubleValue(for: bpm)
      moyenne = st.averageQuantity()?.doubleValue(for: bpm)
      maximum = st.maximumQuantity()?.doubleValue(for: bpm)
    }
    if collectedTypes.contains(typeKcal), let st = workoutBuilder.statistics(for: typeKcal) {
      calories = st.sumQuantity()?.doubleValue(for: .kilocalorie())
    }

    DispatchQueue.main.async {
      if let r = recent, r > 0 {
        self.fc = r
        self.sommeFc += r
        self.nbFc += 1
        self.fcMax = max(self.fcMax, maximum ?? r)
        self.fcMoy = moyenne ?? (self.sommeFc / Double(self.nbFc))
      }
      if let c = calories { self.kcal = c }
    }
  }
}

// MARK: Sport vers type d'entrainement Apple Sante

enum TypeSport {
  static func activite(pour nom: String) -> HKWorkoutActivityType {
    let n = nom.lowercased().folding(options: .diacriticInsensitive, locale: Locale(identifier: "fr_FR"))
    func a(_ mots: [String]) -> Bool { mots.contains { n.contains($0) } }
    if a(["boxe anglaise", "boxing", "boxe"]) && !a(["thai", "kick", "francaise", "savate"]) { return .boxing }
    if a(["muay", "thai", "kick", "savate", "boxe francaise", "k1", "k-1"]) { return .kickboxing }
    if a(["lutte", "wrestling", "grappling"]) { return .wrestling }
    if a(["mma", "jiu", "jjb", "bjj", "judo", "karate", "krav", "taekwondo", "sambo", "aikido", "kung", "combat", "self"]) { return .martialArts }
    if a(["tabata", "hiit", "fractionne"]) { return .highIntensityIntervalTraining }
    if a(["muscu", "force", "halt", "powerlifting"]) { return .traditionalStrengthTraining }
    if a(["crossfit", "cross training", "functional"]) { return .crossTraining }
    if a(["course", "running", "footing", "trail"]) { return .running }
    if a(["velo", "cycl", "spinning"]) { return .cycling }
    if a(["marche", "rando"]) { return .walking }
    if a(["yoga"]) { return .yoga }
    if a(["corde", "jump rope"]) { return .jumpRope }
    if a(["natation", "nage"]) { return .other }
    if a(["etirement", "mobilite", "stretching"]) { return .flexibility }
    if a(["cardio"]) { return .mixedCardio }
    return .other
  }

  static func interieur(_ activite: HKWorkoutActivityType) -> Bool {
    switch activite {
    case .running, .cycling, .walking: return false
    default: return true
    }
  }
}
