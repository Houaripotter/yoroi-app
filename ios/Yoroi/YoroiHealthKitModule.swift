// YoroiHealthKitModule.swift
// Contournement du bridge Nitro v13 + iOS 26 beta.
// Utilise NSLog pour les diagnostics (visible dans Xcode même en Release).
// Retourne une String JSON pure — jamais un objet complexe.

import Foundation
import HealthKit
internal import React

@objc(YoroiHealthKitModule)
class YoroiHealthKitModule: NSObject {

  private let healthStore = HKHealthStore()

  @objc static func requiresMainQueueSetup() -> Bool { return false }

  // ============================================================
  // MÉTHODE 1 — Récupérer les workouts (usage production)
  // ============================================================
  @objc func getWorkoutsAsJSON(
    _ days: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    NSLog("[YoroiHK] getWorkoutsAsJSON appelé, days=\(days)")

    guard HKHealthStore.isHealthDataAvailable() else {
      NSLog("[YoroiHK] HealthKit non disponible sur cet appareil")
      resolve("[]")
      return
    }

    let workoutType = HKObjectType.workoutType()

    // Vérifier le statut d'autorisation
    let authStatus = healthStore.authorizationStatus(for: workoutType)
    NSLog("[YoroiHK] Auth workout: \(authStatus.rawValue) (0=notDetermined, 1=denied, 2=authorized)")

    // Construire le prédicat de date avec logs précis
    var predicate: NSPredicate? = nil
    if days > 0 {
      let fromDate = Date(timeIntervalSinceNow: -days * 86400)
      let toDate   = Date()
      predicate = HKQuery.predicateForSamples(
        withStart: fromDate,
        end: toDate,
        options: .strictStartDate
      )
      // Log ISO + Unix timestamp (pour détecter bug de conversion ms→s)
      NSLog("[YoroiHK] Predicate fromDate : %@ (unix=%.0f)", fromDate as CVarArg, fromDate.timeIntervalSince1970)
      NSLog("[YoroiHK] Predicate toDate   : %@ (unix=%.0f)", toDate   as CVarArg, toDate.timeIntervalSince1970)
    } else {
      NSLog("[YoroiHK] Pas de prédicat de date (tout l'historique)")
    }

    let sortDescriptor = NSSortDescriptor(
      key: HKSampleSortIdentifierStartDate,
      ascending: false
    )

    NSLog("[YoroiHK] Exécution de HKSampleQuery...")
    let query = HKSampleQuery(
      sampleType: workoutType,
      predicate: predicate,
      limit: HKObjectQueryNoLimit,
      sortDescriptors: [sortDescriptor]
    ) { _, samples, error in

      if let error = error {
        NSLog("[YoroiHK] ERREUR HKSampleQuery: \(error.localizedDescription)")
        reject("HEALTHKIT_ERROR", error.localizedDescription, error)
        return
      }

      NSLog("[YoroiHK] HKSampleQuery retourné. samples count: \(samples?.count ?? -1)")

      guard let rawSamples = samples else {
        NSLog("[YoroiHK] samples est nil (permissions refusées?)")
        resolve("[]")
        return
      }

      if rawSamples.isEmpty {
        NSLog("[YoroiHK] Tableau vide — aucun workout dans la période ou permissions refusées")
        resolve("[]")
        return
      }

      // Log du premier sample pour vérifier les timestamps
      if let first = rawSamples.first {
        NSLog("[YoroiHK] Premier sample — type: \(type(of: first))")
        NSLog("[YoroiHK] StartDate évaluée: %@, EndDate: %@", first.startDate as CVarArg, first.endDate as CVarArg)
        NSLog("[YoroiHK] StartDate unix: %.0f ms: %.0f", first.startDate.timeIntervalSince1970, first.startDate.timeIntervalSince1970 * 1000)
      }

      var result: [[String: Any]] = []

      for sample in rawSamples {
        var dict: [String: Any] = [:]

        dict["uuid"]       = sample.uuid.uuidString
        dict["startDate"]  = sample.startDate.timeIntervalSince1970 * 1000  // ms pour JS
        dict["endDate"]    = sample.endDate.timeIntervalSince1970   * 1000
        dict["sourceName"] = sample.sourceRevision.source.name

        if let workout = sample as? HKWorkout {
          dict["workoutActivityType"] = Int(workout.workoutActivityType.rawValue)

          // Énergie (deprecated iOS 18+, fallback workoutActivities)
          if let energy = workout.totalEnergyBurned {
            dict["totalEnergyBurned"] = energy.doubleValue(for: .kilocalorie())
          } else if #available(iOS 16.0, *),
                    let energyType    = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned),
                    let firstActivity = workout.workoutActivities.first,
                    let energyStat    = firstActivity.allStatistics[energyType],
                    let sum           = energyStat.sumQuantity() {
            dict["totalEnergyBurned"] = sum.doubleValue(for: .kilocalorie())
          } else {
            dict["totalEnergyBurned"] = 0.0
          }

          // Distance
          if let distance = workout.totalDistance {
            dict["totalDistance"] = distance.doubleValue(for: .meter())
          } else if #available(iOS 16.0, *),
                    let distType      = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning),
                    let firstActivity = workout.workoutActivities.first,
                    let distStat      = firstActivity.allStatistics[distType],
                    let sum           = distStat.sumQuantity() {
            dict["totalDistance"] = sum.doubleValue(for: .meter())
          } else {
            dict["totalDistance"] = 0.0
          }
        } else {
          NSLog("[YoroiHK] Sample n'est pas HKWorkout: \(type(of: sample))")
          dict["workoutActivityType"] = 3000
          dict["totalEnergyBurned"]   = 0.0
          dict["totalDistance"]       = 0.0
        }

        result.append(dict)
      }

      NSLog("[YoroiHK] \(result.count) workout(s) mappés, sérialisation JSON...")

      do {
        let jsonData   = try JSONSerialization.data(withJSONObject: result, options: [])
        let jsonString = String(data: jsonData, encoding: .utf8) ?? "[]"
        NSLog("[YoroiHK] JSON OK, longueur: \(jsonString.count) chars")
        resolve(jsonString)
      } catch {
        NSLog("[YoroiHK] Erreur JSON: \(error)")
        reject("JSON_ERROR", "Impossible de sérialiser les workouts", error)
      }
    }

    healthStore.execute(query)
  }

  // ============================================================
  // MÉTHODE 2 — Re-demander la permission de LECTURE des workouts
  // ============================================================
  // Contourne Nitro v13 qui échoue silencieusement à enregistrer
  // la permission de lecture. Appelle directement HKHealthStore.
  // Retourne: "granted" | "denied" | "notDetermined" | "error:<msg>"
  @objc func requestWorkoutReadAuth(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    NSLog("[YoroiHK] requestWorkoutReadAuth — demande native de lecture workouts")

    guard HKHealthStore.isHealthDataAvailable() else {
      NSLog("[YoroiHK] HealthKit non disponible")
      resolve("error:HealthKit non disponible")
      return
    }

    let workoutType = HKObjectType.workoutType()

    // Vérifier le statut AVANT la demande
    let beforeStatus = healthStore.authorizationStatus(for: workoutType)
    NSLog("[YoroiHK] Statut AVANT requestAuthorization: \(beforeStatus.rawValue)")

    // Liste complète des types à lire (workout + métriques associées)
    let readTypes: Set<HKObjectType> = [
      workoutType,
      HKSeriesType.workoutRoute(),
    ]

    healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
      if let error = error {
        NSLog("[YoroiHK] requestAuthorization ERREUR: \(error.localizedDescription)")
        resolve("error:\(error.localizedDescription)")
        return
      }

      let afterStatus = self.healthStore.authorizationStatus(for: workoutType)
      NSLog("[YoroiHK] requestAuthorization OK. Statut APRÈS: \(afterStatus.rawValue) (success=\(success))")

      // Vérifier si on peut maintenant lire quelque chose
      let testQuery = HKSampleQuery(
        sampleType    : workoutType,
        predicate     : nil,
        limit         : 3,
        sortDescriptors: nil
      ) { _, samples, queryError in
        let count = samples?.count ?? 0
        let sources = (samples ?? []).map { $0.sourceRevision.source.name }
        NSLog("[YoroiHK] Test post-auth: \(count) workout(s) lisible(s), sources: \(sources)")
        resolve("count:\(count)|sources:\(sources.joined(separator: ","))|authStatus:\(afterStatus.rawValue)")
      }
      self.healthStore.execute(testQuery)
    }
  }

  // ============================================================
  // MÉTHODE 3 — Diagnostic approfondi (3 tests Gemini)
  // ============================================================
  // Retourne un JSON :
  // {
  //   "authStatus": 2,
  //   "sources": ["Apple Watch", "Strava"],
  //   "sourceError": null,
  //   "nuclearTest":   { "found": true,  "count": 1, "activityType": 37, "startDate": 1234567890000, "sourceName": "Apple Watch" },
  //   "predicateTest": { "found": true,  "count": 3 },
  //   "predicateFrom": 1700000000,   // unix seconds
  //   "predicateTo":   1700086400
  // }
  @objc func runDiagnosticAsJSON(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    NSLog("[YoroiHK-DIAG] ==========================================")
    NSLog("[YoroiHK-DIAG] runDiagnosticAsJSON démarré")
    NSLog("[YoroiHK-DIAG] ==========================================")

    guard HKHealthStore.isHealthDataAvailable() else {
      NSLog("[YoroiHK-DIAG] HealthKit non disponible")
      resolve("{\"error\":\"HealthKit non disponible\"}")
      return
    }

    let workoutType = HKObjectType.workoutType()
    let authStatus  = healthStore.authorizationStatus(for: workoutType)
    NSLog("[YoroiHK-DIAG] Auth workout: \(authStatus.rawValue) (0=notDetermined, 1=denied, 2=authorized)")

    // Résultat mutable partagé entre les closures
    // (accès sérialisé via DispatchGroup — pas de race condition)
    var result: [String: Any] = [
      "authStatus"    : authStatus.rawValue,
      "sources"       : [String](),
      "sourceError"   : NSNull(),
      "nuclearTest"   : ["found": false, "count": 0] as [String: Any],
      "predicateTest" : ["found": false, "count": 0] as [String: Any],
    ]

    let group = DispatchGroup()
    let lock   = NSLock()   // protège result contre les écritures concurrentes

    // ----------------------------------------------------------
    // TEST A — HKSourceQuery : quelles apps ont des workouts ?
    // ----------------------------------------------------------
    group.enter()
    NSLog("[YoroiHK-DIAG] TEST A — HKSourceQuery...")
    let sourceQuery = HKSourceQuery(sampleType: workoutType, samplePredicate: nil) { _, sources, error in
      lock.lock(); defer { lock.unlock() }
      if let error = error {
        NSLog("[YoroiHK-DIAG] TEST A ERREUR: \(error.localizedDescription)")
        result["sourceError"] = error.localizedDescription
      } else if let sources = sources {
        let names = sources.map { $0.name }
        NSLog("[YoroiHK-DIAG] TEST A — \(sources.count) source(s): \(names.joined(separator: ", "))")
        result["sources"] = names
        if names.isEmpty {
          NSLog("[YoroiHK-DIAG] TEST A — LISTE VIDE => iOS 26 bloque l'accès en lecture OU aucun workout jamais enregistré")
        }
      }
      group.leave()
    }
    healthStore.execute(sourceQuery)

    // ----------------------------------------------------------
    // TEST B — Test nucléaire (predicate: nil, limit: 1)
    // Si ça retourne 0 alors que les sources ne sont pas vides,
    // c'est une permission refusée au niveau OS.
    // ----------------------------------------------------------
    group.enter()
    NSLog("[YoroiHK-DIAG] TEST B — Nuclear (predicate nil, limit 1)...")
    let nuclearQuery = HKSampleQuery(
      sampleType    : workoutType,
      predicate     : nil,
      limit         : 1,
      sortDescriptors: nil
    ) { _, samples, error in
      lock.lock(); defer { lock.unlock() }
      if let error = error {
        NSLog("[YoroiHK-DIAG] TEST B ERREUR: \(error.localizedDescription)")
        result["nuclearError"] = error.localizedDescription
      } else {
        let count = samples?.count ?? 0
        NSLog("[YoroiHK-DIAG] TEST B — \(count) sample(s) sans filtre de date")
        var info: [String: Any] = ["found": count > 0, "count": count]
        if let first = samples?.first {
          NSLog("[YoroiHK-DIAG] TEST B — Premier sample: start=%@ end=%@", first.startDate as CVarArg, first.endDate as CVarArg)
          NSLog("[YoroiHK-DIAG] TEST B — StartDate unix: %.0f  source: %@", first.startDate.timeIntervalSince1970, first.sourceRevision.source.name)
          info["startDate"]  = first.startDate.timeIntervalSince1970 * 1000
          info["sourceName"] = first.sourceRevision.source.name
          if let workout = first as? HKWorkout {
            info["activityType"] = Int(workout.workoutActivityType.rawValue)
          }
        }
        result["nuclearTest"] = info
      }
      group.leave()
    }
    healthStore.execute(nuclearQuery)

    // ----------------------------------------------------------
    // TEST C — Requête avec prédicat 365 jours (limit: 5)
    // Compare au test nucléaire pour isoler un problème de dates.
    // ----------------------------------------------------------
    let fromDate = Date(timeIntervalSinceNow: -365 * 86400)
    let toDate   = Date()
    NSLog("[YoroiHK-DIAG] TEST C — Predicate 365j: from=%@ (unix=%.0f) to=%@ (unix=%.0f)",
          fromDate as CVarArg, fromDate.timeIntervalSince1970,
          toDate   as CVarArg, toDate.timeIntervalSince1970)

    result["predicateFrom"] = fromDate.timeIntervalSince1970
    result["predicateTo"]   = toDate.timeIntervalSince1970

    let predicate365 = HKQuery.predicateForSamples(withStart: fromDate, end: toDate, options: .strictStartDate)
    group.enter()
    let predicateQuery = HKSampleQuery(
      sampleType    : workoutType,
      predicate     : predicate365,
      limit         : 5,
      sortDescriptors: nil
    ) { _, samples, error in
      lock.lock(); defer { lock.unlock() }
      if let error = error {
        NSLog("[YoroiHK-DIAG] TEST C ERREUR: \(error.localizedDescription)")
        result["predicateError"] = error.localizedDescription
      } else {
        let count = samples?.count ?? 0
        NSLog("[YoroiHK-DIAG] TEST C — \(count) sample(s) avec prédicat 365j (limit 5)")
        if let first = samples?.first {
          NSLog("[YoroiHK-DIAG] TEST C — Premier: start=%@  unix=%.0f", first.startDate as CVarArg, first.startDate.timeIntervalSince1970)
        }
        result["predicateTest"] = ["found": count > 0, "count": count]
      }
      group.leave()
    }
    healthStore.execute(predicateQuery)

    // ----------------------------------------------------------
    // TEST D — Cherche uniquement les séances NON-Yoroi (Apple Watch, Fitness, etc.)
    // Si nuclear=1 (Yoroi) mais ce test=0, alors iOS ne montre que les séances de Yoroi.
    // Cela prouve que iOS 26 beta restreint la lecture aux séances de l'app elle-même.
    // ----------------------------------------------------------
    group.enter()
    NSLog("[YoroiHK-DIAG] TEST D — Recherche seances hors-Yoroi (Apple Watch, Fitness...)...")
    // Predicate qui exclut les sources dont le bundle ID contient "yoroi"
    let yoroiSource = HKSource.default()
    NSLog("[YoroiHK-DIAG] TEST D — Bundle ID de cette app: %@", yoroiSource.bundleIdentifier)
    let notYoroiPredicate = NSCompoundPredicate(notPredicateWithSubpredicate:
      HKQuery.predicateForObjects(from: [yoroiSource])
    )
    let externalQuery = HKSampleQuery(
      sampleType    : workoutType,
      predicate     : notYoroiPredicate,
      limit         : 5,
      sortDescriptors: nil
    ) { _, samples, error in
      lock.lock(); defer { lock.unlock() }
      if let error = error {
        NSLog("[YoroiHK-DIAG] TEST D ERREUR: \(error.localizedDescription)")
        result["externalError"] = error.localizedDescription
      } else {
        let count = samples?.count ?? 0
        NSLog("[YoroiHK-DIAG] TEST D — \(count) seance(s) hors-Yoroi trouvee(s)")
        var info: [String: Any] = ["found": count > 0, "count": count]
        if let first = samples?.first {
          let srcName = first.sourceRevision.source.name
          let srcBundle = first.sourceRevision.source.bundleIdentifier
          NSLog("[YoroiHK-DIAG] TEST D — Première: source=%@ bundle=%@", srcName, srcBundle)
          info["sourceName"]   = srcName
          info["sourceBundle"] = srcBundle
        }
        result["externalTest"] = info
        if count == 0 {
          NSLog("[YoroiHK-DIAG] TEST D — 0 seance hors-Yoroi => iOS 26 limite la lecture aux propres donnees de l'app")
        }
      }
      group.leave()
    }
    healthStore.execute(externalQuery)

    // ----------------------------------------------------------
    // Agrégation — attendre les 4 tests
    // ----------------------------------------------------------
    group.notify(queue: .global()) {
      NSLog("[YoroiHK-DIAG] ==========================================")
      NSLog("[YoroiHK-DIAG] Tous les tests terminés")
      let nuclear    = (result["nuclearTest"]   as? [String: Any])?["count"] as? Int ?? -1
      let predCount  = (result["predicateTest"] as? [String: Any])?["count"] as? Int ?? -1
      let extCount   = (result["externalTest"]  as? [String: Any])?["count"] as? Int ?? -1
      let sources    = (result["sources"]       as? [String])?.joined(separator: ", ") ?? "?"
      NSLog("[YoroiHK-DIAG] RÉSUMÉ: nuclear=%d | predicate365=%d | external=%d | sources=[%@]", nuclear, predCount, extCount, sources)
      if nuclear > 0 && extCount == 0 {
        NSLog("[YoroiHK-DIAG] DIAGNOSTIC: Yoroi ne voit QUE ses propres seances => iOS 26 restreint la lecture cross-app")
      } else if nuclear > 0 && predCount == 0 {
        NSLog("[YoroiHK-DIAG] DIAGNOSTIC: workouts trouvés SANS date mais PAS avec date => bug conversion timestamps")
      } else if nuclear == 0 {
        NSLog("[YoroiHK-DIAG] DIAGNOSTIC: 0 workout même sans filtre => permission OS refusée ou aucun workout")
      } else if extCount > 0 {
        NSLog("[YoroiHK-DIAG] DIAGNOSTIC: Seances externes visibles => permissions OK, bug dans le mapping JS")
      }
      NSLog("[YoroiHK-DIAG] ==========================================")

      do {
        let jsonData   = try JSONSerialization.data(withJSONObject: result, options: [])
        let jsonString = String(data: jsonData, encoding: .utf8) ?? "{}"
        resolve(jsonString)
      } catch {
        NSLog("[YoroiHK-DIAG] Erreur sérialisation: \(error)")
        reject("JSON_ERROR", "Impossible de sérialiser le diagnostic", error)
      }
    }
  }

  // ============================================================
  // HELPER — Fallback sans Apple Watch : samples directs HealthKit
  // ============================================================
  private func getTodayActivityFallback(completion: @escaping (Int?, Int?, Int?) -> Void) {
    let calendar = Calendar.current
    let startOfDay = calendar.startOfDay(for: Date())
    let now = Date()
    let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

    var exMin: Int? = nil
    var standH: Int? = nil
    var cal: Int? = nil
    let group = DispatchGroup()

    // appleExerciseTime (fonctionne même sans Watch si des séances sont enregistrées)
    if let exType = HKObjectType.quantityType(forIdentifier: .appleExerciseTime) {
      group.enter()
      let q = HKStatisticsQuery(quantityType: exType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
        if let sum = stats?.sumQuantity() {
          exMin = Int(sum.doubleValue(for: .minute()))
          NSLog("[YoroiHK] fallback appleExerciseTime=%dmin", exMin ?? 0)
        }
        group.leave()
      }
      healthStore.execute(q)
    }

    // appleStandHour (catégorie — compte les heures où l'utilisateur s'est levé)
    if let standType = HKObjectType.categoryType(forIdentifier: .appleStandHour) {
      group.enter()
      let q = HKSampleQuery(sampleType: standType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
        if let s = samples {
          // Ne compter que les entrées "stood" (value == 1)
          let stoodCount = s.compactMap { $0 as? HKCategorySample }.filter { $0.value == HKCategoryValueAppleStandHour.stood.rawValue }.count
          if stoodCount > 0 { standH = stoodCount }
          NSLog("[YoroiHK] fallback appleStandHour=%dh", standH ?? 0)
        }
        group.leave()
      }
      healthStore.execute(q)
    }

    // activeEnergyBurned (calories actives)
    if let calType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
      group.enter()
      let q = HKStatisticsQuery(quantityType: calType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
        if let sum = stats?.sumQuantity() {
          cal = Int(sum.doubleValue(for: .kilocalorie()))
        }
        group.leave()
      }
      healthStore.execute(q)
    }

    group.notify(queue: .global()) {
      completion(exMin, standH, cal)
    }
  }

  // ============================================================
  // MÉTHODE 4b — Anneaux d'activité du jour (exercice + debout + calories)
  // ============================================================
  // HKActivitySummaryQuery = la seule API fiable pour les anneaux Apple Watch.
  // Retourne JSON: { "exerciseMinutes": 42, "standHours": 8, "activeCalories": 350 }
  @objc func getTodayActivityRings(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      resolve("{\"exerciseMinutes\":null,\"standHours\":null,\"activeCalories\":null}")
      return
    }

    // Construire le prédicat pour aujourd'hui
    let calendar = Calendar.current
    let now = Date()
    var components = calendar.dateComponents([.year, .month, .day], from: now)
    components.calendar = calendar
    let predicate = HKQuery.predicate(forActivitySummariesBetweenStart: components, end: components)

    let query = HKActivitySummaryQuery(predicate: predicate) { _, summaries, error in
      if let error = error {
        NSLog("[YoroiHK] getTodayActivityRings ERREUR: \(error.localizedDescription)")
        resolve("{\"exerciseMinutes\":null,\"standHours\":null,\"activeCalories\":null}")
        return
      }

      guard let summary = summaries?.first else {
        NSLog("[YoroiHK] getTodayActivityRings — aucun résumé (pas de Watch?), fallback sur samples directs")
        // Fallback sans Apple Watch : lire appleExerciseTime + appleStandHour directement
        self.getTodayActivityFallback { exMin, standH, cal in
          let result: [String: Any] = [
            "exerciseMinutes": exMin as Any,
            "standHours": standH as Any,
            "activeCalories": cal as Any,
          ]
          do {
            let json = try JSONSerialization.data(withJSONObject: result)
            resolve(String(data: json, encoding: .utf8) ?? "{}")
          } catch {
            resolve("{\"exerciseMinutes\":null,\"standHours\":null,\"activeCalories\":null}")
          }
        }
        return
      }

      let exerciseMin = Int(summary.appleExerciseTime.doubleValue(for: .minute()))
      let standH      = Int(summary.appleStandHours.doubleValue(for: HKUnit.count()))
      let calories    = Int(summary.activeEnergyBurned.doubleValue(for: .kilocalorie()))

      NSLog("[YoroiHK] getTodayActivityRings — exercice=%dmin, debout=%dh, calories=%dkcal", exerciseMin, standH, calories)

      let result: [String: Any] = [
        "exerciseMinutes": exerciseMin,
        "standHours": standH,
        "activeCalories": calories,
      ]

      do {
        let json = try JSONSerialization.data(withJSONObject: result)
        resolve(String(data: json, encoding: .utf8) ?? "{}")
      } catch {
        resolve("{\"exerciseMinutes\":null,\"standHours\":null,\"activeCalories\":null}")
      }
    }

    healthStore.execute(query)
  }

  // ============================================================
  // MÉTHODE 4 — Demander TOUTES les permissions santé (bypass Nitro)
  // ============================================================
  // Contourne le bug Nitro v13 qui n'enregistre pas les permissions non-workout.
  // Retourne: "ok:<N types>" | "error:<msg>"
  @objc func requestAllHealthPermissions(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    NSLog("[YoroiHK] requestAllHealthPermissions — demande native de toutes les permissions")

    guard HKHealthStore.isHealthDataAvailable() else {
      resolve("error:HealthKit non disponible")
      return
    }

    var readTypes = Set<HKObjectType>()

    // Workouts + routes + résumés d'activité (anneaux)
    readTypes.insert(HKObjectType.workoutType())
    readTypes.insert(HKSeriesType.workoutRoute())
    readTypes.insert(HKObjectType.activitySummaryType())

    // Activité
    let quantityIds: [HKQuantityTypeIdentifier] = [
      .bodyMass,
      .bodyFatPercentage,
      .leanBodyMass,
      .height,
      .stepCount,
      .distanceWalkingRunning,
      .distanceCycling,
      .distanceSwimming,
      .distanceDownhillSnowSports,
      .appleExerciseTime,
      .appleStandTime,
      .flightsClimbed,
      .activeEnergyBurned,
      .basalEnergyBurned,
      .dietaryWater,
      .heartRate,
      .heartRateVariabilitySDNN,
      .restingHeartRate,
      .vo2Max,
      .oxygenSaturation,
      .respiratoryRate,
      .bodyTemperature,
      .bloodPressureSystolic,
      .bloodPressureDiastolic,
      .bloodGlucose,
    ]
    for qid in quantityIds {
      if let t = HKObjectType.quantityType(forIdentifier: qid) {
        readTypes.insert(t)
      }
    }

    // Sommeil + pleine conscience
    let categoryIds: [HKCategoryTypeIdentifier] = [
      .sleepAnalysis,
      .appleStandHour,
      .mindfulSession,
    ]
    for cid in categoryIds {
      if let t = HKObjectType.categoryType(forIdentifier: cid) {
        readTypes.insert(t)
      }
    }

    // Température poignet pendant le sommeil (Apple Watch Series 8+, iOS 16+)
    if #available(iOS 16.0, *) {
      if let wristTempType = HKObjectType.quantityType(forIdentifier: .appleSleepingWristTemperature) {
        readTypes.insert(wristTempType)
      }
    }

    NSLog("[YoroiHK] requestAllHealthPermissions — \(readTypes.count) types à demander")

    let shareTypes: Set<HKSampleType> = [
      HKObjectType.workoutType(),
      HKObjectType.quantityType(forIdentifier: .bodyMass)!,
      HKObjectType.quantityType(forIdentifier: .dietaryWater)!,
    ]

    healthStore.requestAuthorization(toShare: shareTypes, read: readTypes) { success, error in
      if let error = error {
        NSLog("[YoroiHK] requestAllHealthPermissions ERREUR: \(error.localizedDescription)")
        resolve("error:\(error.localizedDescription)")
        return
      }
      NSLog("[YoroiHK] requestAllHealthPermissions OK — success=\(success), types=\(readTypes.count)")
      resolve("ok:\(readTypes.count)")
    }
  }

  // ============================================================
  // MÉTHODE 5 — Enregistrer de l'eau dans Apple Health
  // ============================================================
  @objc func saveDietaryWater(
    _ amountMl: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("NOT_AVAILABLE", "HealthKit non disponible", nil)
      return
    }
    guard let waterType = HKObjectType.quantityType(forIdentifier: .dietaryWater) else {
      reject("TYPE_ERROR", "Type dietaryWater non disponible", nil)
      return
    }
    let quantity = HKQuantity(unit: HKUnit.literUnit(with: .milli), doubleValue: amountMl)
    let sample = HKQuantitySample(type: waterType, quantity: quantity, start: Date(), end: Date())
    healthStore.save(sample) { success, error in
      if let error = error {
        NSLog("[YoroiHK] saveDietaryWater ERREUR: \(error.localizedDescription)")
        reject("SAVE_ERROR", error.localizedDescription, error)
      } else {
        NSLog("[YoroiHK] saveDietaryWater OK — %.0f ml", amountMl)
        resolve("ok")
      }
    }
  }

  // ============================================================
  // MÉTHODE 6 — Lire FC repos + FC max réelle pour zones Karvonen
  // ============================================================
  // Lit :
  //   - restingHeartRate : dernière mesure HKQuantityTypeIdentifierRestingHeartRate
  //   - maxHeartRate     : valeur max de HKQuantityTypeIdentifierHeartRate sur 180 jours
  //                        (approximation de la FCmax réelle)
  // Retourne JSON : { restingHR, maxHR, source }
  @objc func getHeartZonesData(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      resolve("{\"restingHR\":0,\"maxHR\":0,\"source\":\"unavailable\"}")
      return
    }

    let group = DispatchGroup()
    var restingHR: Double = 0
    var maxHR: Double = 0

    // 1. FC au repos (dernière valeur)
    if let restingType = HKQuantityType.quantityType(forIdentifier: .restingHeartRate) {
      group.enter()
      let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
      let query = HKSampleQuery(sampleType: restingType, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
        if let s = samples?.first as? HKQuantitySample {
          restingHR = s.quantity.doubleValue(for: HKUnit(from: "count/min"))
        }
        group.leave()
      }
      healthStore.execute(query)
    }

    // 2. FC max réelle — valeur maximale sur 180 jours
    if let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) {
      group.enter()
      let from = Calendar.current.date(byAdding: .day, value: -180, to: Date()) ?? Date()
      let predicate = HKQuery.predicateForSamples(withStart: from, end: Date())
      let statsQuery = HKStatisticsQuery(quantityType: hrType, quantitySamplePredicate: predicate, options: .discreteMax) { _, stats, _ in
        if let max = stats?.maximumQuantity() {
          maxHR = max.doubleValue(for: HKUnit(from: "count/min"))
        }
        group.leave()
      }
      healthStore.execute(statsQuery)
    }

    group.notify(queue: .main) {
      NSLog("[YoroiHK] getHeartZonesData — FCR=%.0f, FCmax=%.0f", restingHR, maxHR)
      let result: [String: Any] = [
        "restingHR": Int(restingHR),
        "maxHR": Int(maxHR),
        "source": "healthkit",
      ]
      do {
        let json = try JSONSerialization.data(withJSONObject: result)
        resolve(String(data: json, encoding: .utf8) ?? "{\"restingHR\":0,\"maxHR\":0,\"source\":\"error\"}")
      } catch {
        resolve("{\"restingHR\":0,\"maxHR\":0,\"source\":\"error\"}")
      }
    }
  }
}
