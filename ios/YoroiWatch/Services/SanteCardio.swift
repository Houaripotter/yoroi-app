import Foundation
import HealthKit
import Observation
import WidgetKit

// Frequence cardiaque et oxygene du jour, lus dans Apple Sante par l'app montre.
// Mise a jour a l'ouverture, a chaque nouvelle mesure (HKObserverQuery et livraison en tache de fond)
// et par le rafraichissement de fond de watchOS. Le resultat va dans l'App Group pour les complications.
// Juste les chiffres : aucun diagnostic, aucun seuil d'alerte.

@Observable
final class SanteCardio {
  static let shared = SanteCardio()

  /// Dernier etat lu (ou garde dans l'App Group).
  private(set) var etat: EtatCardio?

  @ObservationIgnored private var observateurs: [HKObserverQuery] = []
  @ObservationIgnored private var derniereLecture: Date?

  private var store: HKHealthStore { Sante.shared.store }
  private let bpm = HKUnit.count().unitDivided(by: .minute())

  init() {
    etat = StockCardio.lire()
  }

  /// A l'ouverture de l'app : feuille d'autorisation si besoin, observation, lecture.
  func preparer() async {
    guard Sante.shared.disponible else { return }
    if await Sante.shared.autorisationAFaire() {
      await Sante.shared.demanderAutorisation()
    }
    await MainActor.run { self.demarrerObservation() }
    await actualiser(force: true)
  }

  /// Observe les nouvelles mesures de FC et d'oxygene, meme app fermee.
  /// A lancer au demarrage de l'app (y compris un demarrage en tache de fond).
  func demarrerObservation() {
    guard Sante.shared.disponible, observateurs.isEmpty else { return }
    // FC au repos et frequence respiratoire : calculees par la montre une ou deux fois par jour.
    for id in [HKQuantityTypeIdentifier.heartRate, .oxygenSaturation, .restingHeartRate, .respiratoryRate] {
      let type = HKQuantityType(id)
      let q = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, fini, erreur in
        guard let self, erreur == nil else {
          fini()
          return
        }
        Task {
          await self.actualiser()
          fini()
        }
      }
      store.execute(q)
      observateurs.append(q)
      store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }
  }

  /// Relit le jour dans Sante. Sans force, ignore un appel moins de 45 s apres le precedent.
  func actualiser(force: Bool = false) async {
    guard Sante.shared.disponible else { return }
    let maintenant = Date()
    let aFaire: Bool = await MainActor.run {
      if !force, let d = self.derniereLecture, maintenant.timeIntervalSince(d) < 45 { return false }
      self.derniereLecture = maintenant
      return true
    }
    guard aFaire else { return }

    let fc = await mesureJour(.heartRate, unite: bpm, facteur: 1, maintenant: maintenant)
    let ox = await mesureJour(.oxygenSaturation, unite: .percent(), facteur: 100, maintenant: maintenant)
    let repos = await derniereValeur(.restingHeartRate, unite: bpm)
    let variabilite = await derniereValeur(.heartRateVariabilitySDNN, unite: .secondUnit(with: .milli))
    let respiration = await derniereValeur(.respiratoryRate, unite: bpm)
    let nouvel = EtatCardio(
      fc: fc, oxygene: ox, repos: repos, variabilite: variabilite, respiration: respiration, maj: maintenant
    )

    let ancien = StockCardio.lire()
    StockCardio.ecrire(nouvel)
    await MainActor.run { self.etat = nouvel }
    if ancien.map({ $0.memeAffichage(que: nouvel) }) != true {
      let centre = WidgetCenter.shared
      centre.reloadTimelines(ofKind: GenreWidget.coeur)
      centre.reloadTimelines(ofKind: GenreWidget.oxygene)
      centre.reloadTimelines(ofKind: GenreWidget.cardio)
      centre.reloadTimelines(ofKind: GenreWidget.repos)
      centre.reloadTimelines(ofKind: GenreWidget.respiration)
    }
  }

  // MARK: Requetes

  private func mesureJour(_ id: HKQuantityTypeIdentifier, unite: HKUnit, facteur: Double, maintenant: Date) async -> MesureJour? {
    let type = HKQuantityType(id)
    guard let dernier = await dernierEchantillon(type) else { return nil }
    let debutJour = Calendar.current.startOfDay(for: maintenant)
    var m = MesureJour(
      valeur: dernier.quantity.doubleValue(for: unite) * facteur,
      date: dernier.endDate,
      jour: DatesISO.ecrireJour(maintenant),
      mini: nil,
      maxi: nil,
      serie: []
    )
    if let st = await statistiques(type, debut: debutJour, fin: maintenant) {
      m.mini = st.minimumQuantity().map { $0.doubleValue(for: unite) * facteur }
      m.maxi = st.maximumQuantity().map { $0.doubleValue(for: unite) * facteur }
    }
    m.serie = await serie(type, unite: unite, facteur: facteur, debut: debutJour, fin: maintenant)
    return m
  }

  private func dernierEchantillon(_ type: HKQuantityType) async -> HKQuantitySample? {
    let tri = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
    return await withCheckedContinuation { (suite: CheckedContinuation<HKQuantitySample?, Never>) in
      let q = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [tri]) { _, resultats, _ in
        suite.resume(returning: resultats?.first as? HKQuantitySample)
      }
      store.execute(q)
    }
  }

  private func derniereValeur(_ id: HKQuantityTypeIdentifier, unite: HKUnit) async -> ValeurDatee? {
    guard let e = await dernierEchantillon(HKQuantityType(id)) else { return nil }
    return ValeurDatee(valeur: e.quantity.doubleValue(for: unite), date: e.endDate)
  }

  private func statistiques(_ type: HKQuantityType, debut: Date, fin: Date) async -> HKStatistics? {
    let filtre = HKQuery.predicateForSamples(withStart: debut, end: fin, options: .strictStartDate)
    return await withCheckedContinuation { (suite: CheckedContinuation<HKStatistics?, Never>) in
      let q = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: filtre, options: [.discreteMin, .discreteMax]) { _, st, _ in
        suite.resume(returning: st)
      }
      store.execute(q)
    }
  }

  /// Moyenne par tranche de 20 min depuis minuit, 72 points au plus.
  private func serie(_ type: HKQuantityType, unite: HKUnit, facteur: Double, debut: Date, fin: Date) async -> [PointJour] {
    let filtre = HKQuery.predicateForSamples(withStart: debut, end: fin, options: .strictStartDate)
    return await withCheckedContinuation { (suite: CheckedContinuation<[PointJour], Never>) in
      let q = HKStatisticsCollectionQuery(
        quantityType: type,
        quantitySamplePredicate: filtre,
        options: .discreteAverage,
        anchorDate: debut,
        intervalComponents: DateComponents(minute: 20)
      )
      q.initialResultsHandler = { _, resultats, _ in
        var points: [PointJour] = []
        resultats?.enumerateStatistics(from: debut, to: fin) { st, _ in
          if let moyenne = st.averageQuantity() {
            let minutes = Int(st.startDate.timeIntervalSince(debut) / 60) + 10
            points.append(PointJour(t: minutes, v: moyenne.doubleValue(for: unite) * facteur))
          }
        }
        suite.resume(returning: points)
      }
      store.execute(q)
    }
  }
}
