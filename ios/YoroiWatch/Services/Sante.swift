import Foundation
import HealthKit

// Apple Sante : autorisations, poids, date de naissance (pour les zones de FC).
// Lecture aussi de l'oxygene, de la FC au repos, de la variabilite et de la respiration (voir SanteCardio).

final class Sante {
  static let shared = Sante()

  let store = HKHealthStore()

  var disponible: Bool { HKHealthStore.isHealthDataAvailable() }

  var typesEcriture: Set<HKSampleType> {
    [
      HKObjectType.workoutType(),
      HKQuantityType(.bodyMass),
      HKQuantityType(.activeEnergyBurned),
      HKQuantityType(.heartRate),
      HKQuantityType(.dietaryWater),
    ]
  }

  var typesLecture: Set<HKObjectType> {
    [
      HKObjectType.workoutType(),
      HKQuantityType(.heartRate),
      HKQuantityType(.activeEnergyBurned),
      HKQuantityType(.bodyMass),
      HKCharacteristicType(.dateOfBirth),
      HKQuantityType(.oxygenSaturation),
      HKQuantityType(.restingHeartRate),
      HKQuantityType(.heartRateVariabilitySDNN),
      HKQuantityType(.respiratoryRate),
    ]
  }

  /// true si la feuille d'autorisation n'a pas encore ete montree pour tous les types.
  func autorisationAFaire() async -> Bool {
    guard disponible else { return false }
    return await withCheckedContinuation { (suite: CheckedContinuation<Bool, Never>) in
      store.getRequestStatusForAuthorization(toShare: typesEcriture, read: typesLecture) { statut, _ in
        suite.resume(returning: statut == .shouldRequest)
      }
    }
  }

  /// Affiche la feuille d'autorisation la premiere fois, ne fait rien ensuite.
  @discardableResult
  func demanderAutorisation() async -> Bool {
    guard disponible else { return false }
    return await withCheckedContinuation { (suite: CheckedContinuation<Bool, Never>) in
      store.requestAuthorization(toShare: typesEcriture, read: typesLecture) { ok, _ in
        suite.resume(returning: ok)
      }
    }
  }

  var peutEnregistrerEntrainement: Bool {
    disponible && store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
  }

  var peutEcrirePoids: Bool {
    disponible && store.authorizationStatus(for: HKQuantityType(.bodyMass)) == .sharingAuthorized
  }

  /// Ecrit une pesee dans Apple Sante. Renvoie true si elle y est vraiment.
  func ecrirePoids(kg: Double, id: String, date: Date = Date()) async -> Bool {
    guard disponible else { return false }
    if !peutEcrirePoids { await demanderAutorisation() }
    guard peutEcrirePoids else { return false }
    let quantite = HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: kg)
    let echantillon = HKQuantitySample(
      type: HKQuantityType(.bodyMass),
      quantity: quantite,
      start: date,
      end: date,
      metadata: [
        HKMetadataKeyExternalUUID: id,
        HKMetadataKeyWasUserEntered: NSNumber(value: true),
      ]
    )
    return await withCheckedContinuation { (suite: CheckedContinuation<Bool, Never>) in
      store.save(echantillon) { ok, _ in suite.resume(returning: ok) }
    }
  }

  var peutEcrireEau: Bool {
    disponible && store.authorizationStatus(for: HKQuantityType(.dietaryWater)) == .sharingAuthorized
  }

  /// Ecrit un verre dans Apple Sante, avec l'id de l'action en HKMetadataKeyExternalUUID.
  /// Pas de feuille d'autorisation ici (un verre peut venir d'un raccourci, sans ecran) :
  /// elle est montree a l'ouverture de l'app (SanteCardio.preparer). Renvoie true si le verre y est vraiment.
  func ecrireEau(ml: Double, id: String, date: Date = Date()) async -> Bool {
    guard disponible, ml > 0, peutEcrireEau else { return false }
    let echantillon = HKQuantitySample(
      type: HKQuantityType(.dietaryWater),
      quantity: HKQuantity(unit: .literUnit(with: .milli), doubleValue: ml),
      start: date,
      end: date,
      metadata: [
        HKMetadataKeyExternalUUID: id,
        HKMetadataKeyWasUserEntered: NSNumber(value: true),
      ]
    )
    return await withCheckedContinuation { (suite: CheckedContinuation<Bool, Never>) in
      store.save(echantillon) { ok, _ in suite.resume(returning: ok) }
    }
  }

  /// Retire un verre : supprime le plus recent verre de ce volume ecrit par la montre le meme jour.
  /// Une app ne peut supprimer que ce qu'elle a ecrit : un verre ecrit par l'iPhone, ou une autorisation
  /// refusee, renvoie false et l'iPhone s'en charge a la reception (dansSante = false).
  func retirerEau(ml: Double, date: Date = Date()) async -> Bool {
    guard disponible, ml > 0, peutEcrireEau else { return false }
    let cal = Calendar.current
    let debut = cal.startOfDay(for: date)
    guard let fin = cal.date(byAdding: .day, value: 1, to: debut) else { return false }
    let predicat = NSCompoundPredicate(andPredicateWithSubpredicates: [
      HKQuery.predicateForObjects(from: HKSource.default()),
      HKQuery.predicateForSamples(withStart: debut, end: fin, options: .strictStartDate),
    ])
    let tri = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    let unite = HKUnit.literUnit(with: .milli)
    let magasin = store
    return await withCheckedContinuation { (suite: CheckedContinuation<Bool, Never>) in
      let requete = HKSampleQuery(sampleType: HKQuantityType(.dietaryWater), predicate: predicat, limit: 100, sortDescriptors: [tri]) { _, resultats, _ in
        let verres = (resultats as? [HKQuantitySample]) ?? []
        guard let cible = verres.first(where: { abs($0.quantity.doubleValue(for: unite) - ml) < 0.5 }) else {
          suite.resume(returning: false)
          return
        }
        magasin.delete(cible) { ok, _ in suite.resume(returning: ok) }
      }
      magasin.execute(requete)
    }
  }

  /// Derniere pesee connue d'Apple Sante, pour partir d'une valeur reelle quand l'iPhone n'a rien envoye.
  func dernierPoids() async -> Double? {
    guard disponible else { return nil }
    let tri = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    return await withCheckedContinuation { (suite: CheckedContinuation<Double?, Never>) in
      let requete = HKSampleQuery(sampleType: HKQuantityType(.bodyMass), predicate: nil, limit: 1, sortDescriptors: [tri]) { _, resultats, _ in
        let kg = (resultats?.first as? HKQuantitySample)?.quantity.doubleValue(for: .gramUnit(with: .kilo))
        suite.resume(returning: kg)
      }
      store.execute(requete)
    }
  }

  /// FC maximale estimee (220 moins l'age), seulement si la date de naissance est connue.
  func fcMaxTheorique() -> Double? {
    guard disponible, let naissance = try? store.dateOfBirthComponents(),
          let annee = naissance.year else { return nil }
    let maintenant = Calendar.current.component(.year, from: Date())
    let age = maintenant - annee
    guard age > 5 && age < 110 else { return nil }
    return Double(220 - age)
  }
}
