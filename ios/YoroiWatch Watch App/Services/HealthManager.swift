// ============================================
// YOROI WATCH - Health Manager
// Gestion des données (mock + HealthKit)
// ============================================

import Foundation
import HealthKit
import Combine

class HealthManager: ObservableObject {
    static let shared = HealthManager()

    private var healthStore: HKHealthStore?
    private var isHealthKitAvailable = false

    // CORRECTION MEMORY LEAK: Stocker les queries actives pour les annuler
    private var activeQueries: [HKQuery] = []
    private let queryQueue = DispatchQueue(label: "com.yoroi.healthmanager", attributes: .concurrent)

    // Données publiées
    @Published var heartRate: Double = 72
    @Published var spO2: Int = 98
    @Published var steps: Int = 3600
    @Published var sleepHours: Double = 7.5
    @Published var waterIntake: Double = 1000
    @Published var activeCalories: Double = 450
    @Published var streak: Int = 12
    @Published var currentWeight: Double = 78.0
    @Published var targetWeight: Double = 77.0

    // NOUVEAU: Error handling UI
    @Published var healthKitError: String?
    @Published var isLoadingData: Bool = false

    // Historique poids pour graphique
    @Published var weightHistory: [(date: Date, weight: Double)] = []

    // Records
    @Published var records: [ExerciseRecord] = []

    // Historique entraînements
    @Published var workoutHistory: [WorkoutSession] = []

    // NOUVEAU: Détection mode économie énergie
    @Published var isLowPowerModeEnabled: Bool = ProcessInfo.processInfo.isLowPowerModeEnabled

    private init() {
        // Vérifier si HealthKit est disponible
        if HKHealthStore.isHealthDataAvailable() {
            healthStore = HKHealthStore()
            isHealthKitAvailable = true
        }

        // Charger les données persistées
        loadPersistedData()

        // Charger données mock si pas de données
        if weightHistory.isEmpty {
            loadMockData()
        }

        // Observer le mode économie d'énergie
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(lowPowerModeChanged),
            name: Notification.Name.NSProcessInfoPowerStateDidChange,
            object: nil
        )
    }

    // CORRECTION MEMORY LEAK: Nettoyer les queries à la destruction
    deinit {
        stopAllQueries()
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func lowPowerModeChanged() {
        DispatchQueue.main.async {
            self.isLowPowerModeEnabled = ProcessInfo.processInfo.isLowPowerModeEnabled

            // Si mode économie activé, arrêter toutes les queries
            if self.isLowPowerModeEnabled {
                self.stopAllQueries()
            }
        }
    }

    // NOUVEAU: Arrêter toutes les queries actives
    private func stopAllQueries() {
        guard let healthStore = healthStore else { return }

        queryQueue.async(flags: .barrier) {
            for query in self.activeQueries {
                healthStore.stop(query)
            }
            self.activeQueries.removeAll()
        }
    }

    // NOUVEAU: Ajouter une query à la liste des actives
    private func addQuery(_ query: HKQuery) {
        queryQueue.async(flags: .barrier) {
            self.activeQueries.append(query)
        }
    }

    // NOUVEAU: Retirer une query de la liste
    private func removeQuery(_ query: HKQuery) {
        queryQueue.async(flags: .barrier) {
            self.activeQueries.removeAll { $0 === query }
        }
    }

    // MARK: - Autorisation HealthKit

    func requestAuthorization() {
        guard isHealthKitAvailable, let healthStore = healthStore else {
            DispatchQueue.main.async {
                self.healthKitError = "HealthKit non disponible"
            }
            print("HealthKit non disponible - utilisation des données mock")
            return
        }

        let readTypes: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!,
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .bodyMass)!,
            HKObjectType.quantityType(forIdentifier: .dietaryWater)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
        ]

        let writeTypes: Set<HKSampleType> = [
            HKObjectType.quantityType(forIdentifier: .bodyMass)!,
            HKObjectType.quantityType(forIdentifier: .dietaryWater)!,
            HKObjectType.workoutType(),
        ]

        healthStore.requestAuthorization(toShare: writeTypes, read: readTypes) { [weak self] success, error in
            DispatchQueue.main.async {
                if success {
                    self?.healthKitError = nil
                    self?.fetchAllData()
                } else if let error = error {
                    self?.healthKitError = "Permissions refusées: \(error.localizedDescription)"
                    print("❌ Erreur HealthKit: \(error.localizedDescription)")
                } else {
                    self?.healthKitError = "Permissions refusées"
                }
            }
        }
    }

    // MARK: - Récupération des données

    func fetchAllData() {
        guard isHealthKitAvailable else { return }

        // Ne pas fetch si mode économie d'énergie
        guard !isLowPowerModeEnabled else {
            print("⚡ Mode économie d'énergie - skip fetch")
            return
        }

        DispatchQueue.main.async {
            self.isLoadingData = true
        }

        fetchHeartRate()
        fetchSteps()
        fetchWeight()
        fetchWater()
        fetchSleep()

        // Marquer comme fini après 2 secondes
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.isLoadingData = false
        }
    }

    private func fetchHeartRate() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] query, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else {
                self?.removeQuery(query)
                return
            }

            DispatchQueue.main.async {
                self?.heartRate = sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                self?.removeQuery(query)
            }
        }
        addQuery(query)
        healthStore.execute(query)
    }

    private func fetchSteps() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] query, result, _ in
            guard let sum = result?.sumQuantity() else {
                self?.removeQuery(query)
                return
            }

            DispatchQueue.main.async {
                self?.steps = Int(sum.doubleValue(for: .count()))
                self?.removeQuery(query)
            }
        }
        addQuery(query)
        healthStore.execute(query)
    }

    private func fetchWeight() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 7, sortDescriptors: [sortDescriptor]) { [weak self] query, samples, _ in
            guard let samples = samples as? [HKQuantitySample] else {
                self?.removeQuery(query)
                return
            }

            // CORRECTION THREAD-SAFETY: Calculer hors main thread
            let weightData = samples.map { sample in
                (date: sample.startDate, weight: sample.quantity.doubleValue(for: .gramUnit(with: .kilo)))
            }.reversed()

            let latestWeight = samples.first?.quantity.doubleValue(for: .gramUnit(with: .kilo))

            DispatchQueue.main.async {
                if let weight = latestWeight {
                    self?.currentWeight = weight
                }
                self?.weightHistory = Array(weightData)
                self?.removeQuery(query)

                // Persister les données
                self?.savePersistedData()
            }
        }
        addQuery(query)
        healthStore.execute(query)
    }

    private func fetchWater() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .dietaryWater) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] query, result, _ in
            guard let sum = result?.sumQuantity() else {
                self?.removeQuery(query)
                return
            }

            let waterValue = sum.doubleValue(for: .literUnit(with: .milli))

            DispatchQueue.main.async {
                self?.waterIntake = waterValue
                self?.removeQuery(query)
                self?.savePersistedData()
            }
        }
        addQuery(query)
        healthStore.execute(query)
    }

    private func fetchSleep() {
        guard let healthStore = healthStore,
              let type = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return }

        let calendar = Calendar.current
        let now = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: calendar.startOfDay(for: now))!

        let predicate = HKQuery.predicateForSamples(withStart: yesterday, end: now, options: .strictStartDate)

        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] query, samples, _ in
            guard let sleepSamples = samples as? [HKCategorySample] else {
                self?.removeQuery(query)
                return
            }

            var totalSleep: TimeInterval = 0
            for sample in sleepSamples {
                if sample.value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue ||
                   sample.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
                   sample.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
                   sample.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue {
                    totalSleep += sample.endDate.timeIntervalSince(sample.startDate)
                }
            }

            let sleepHoursValue = totalSleep / 3600

            DispatchQueue.main.async {
                self?.sleepHours = sleepHoursValue
                self?.removeQuery(query)
                self?.savePersistedData()
            }
        }
        addQuery(query)
        healthStore.execute(query)
    }

    // MARK: - Sauvegarde

    func saveWeight(_ weight: Double) {
        currentWeight = weight

        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return }

        let quantity = HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: weight)
        let sample = HKQuantitySample(type: type, quantity: quantity, start: Date(), end: Date())

        healthStore.save(sample) { [weak self] success, _ in
            if success {
                DispatchQueue.main.async {
                    self?.fetchWeight()
                }
            }
        }
    }

    func addWater(_ ml: Double) {
        waterIntake += ml

        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .dietaryWater) else { return }

        let quantity = HKQuantity(unit: .literUnit(with: .milli), doubleValue: ml)
        let sample = HKQuantitySample(type: type, quantity: quantity, start: Date(), end: Date())

        healthStore.save(sample) { _, _ in }
    }

    func removeWater(_ ml: Double) {
        waterIntake = max(0, waterIntake - ml)
        savePersistedData()
    }

    // MARK: - Persistance Locale (UserDefaults)

    private func savePersistedData() {
        let defaults = UserDefaults.standard

        // Sauvegarder les valeurs simples
        defaults.set(heartRate, forKey: "heartRate")
        defaults.set(steps, forKey: "steps")
        defaults.set(sleepHours, forKey: "sleepHours")
        defaults.set(waterIntake, forKey: "waterIntake")
        defaults.set(currentWeight, forKey: "currentWeight")
        defaults.set(targetWeight, forKey: "targetWeight")
        defaults.set(streak, forKey: "streak")

        // Sauvegarder l'historique de poids (encodé)
        if let encoded = try? JSONEncoder().encode(weightHistory.map { WeightEntry(date: $0.date, weight: $0.weight) }) {
            defaults.set(encoded, forKey: "weightHistory")
        }

        // Sauvegarder les records
        if let encoded = try? JSONEncoder().encode(records) {
            defaults.set(encoded, forKey: "exerciseRecords")
        }

        // Sauvegarder l'historique des workouts
        if let encoded = try? JSONEncoder().encode(workoutHistory) {
            defaults.set(encoded, forKey: "workoutHistory")
        }

        print("✅ Données persistées dans UserDefaults")
    }

    private func loadPersistedData() {
        let defaults = UserDefaults.standard

        // Charger les valeurs simples
        heartRate = defaults.double(forKey: "heartRate")
        steps = defaults.integer(forKey: "steps")
        sleepHours = defaults.double(forKey: "sleepHours")
        waterIntake = defaults.double(forKey: "waterIntake")
        currentWeight = defaults.double(forKey: "currentWeight")
        targetWeight = defaults.double(forKey: "targetWeight")
        streak = defaults.integer(forKey: "streak")

        // Charger l'historique de poids
        if let data = defaults.data(forKey: "weightHistory"),
           let decoded = try? JSONDecoder().decode([WeightEntry].self, from: data) {
            weightHistory = decoded.map { ($0.date, $0.weight) }
        }

        // Charger les records
        if let data = defaults.data(forKey: "exerciseRecords"),
           let decoded = try? JSONDecoder().decode([ExerciseRecord].self, from: data) {
            records = decoded
        }

        // Charger l'historique des workouts
        if let data = defaults.data(forKey: "workoutHistory"),
           let decoded = try? JSONDecoder().decode([WorkoutSession].self, from: data) {
            workoutHistory = decoded
        }

        print("✅ Données chargées depuis UserDefaults")
    }

    // MARK: - Mock Data

    private func loadMockData() {
        // Historique poids mockné
        let calendar = Calendar.current
        weightHistory = (0..<7).map { i in
            let date = calendar.date(byAdding: .day, value: -6 + i, to: Date())!
            let weights = [78.5, 78.3, 78.1, 78.4, 78.0, 77.8, 77.6]
            return (date: date, weight: weights[i])
        }

        // Records mockés
        records = [
            ExerciseRecord(exercise: "Développé couché", weight: 90, reps: 6, date: Date()),
            ExerciseRecord(exercise: "Squat", weight: 110, reps: 6, date: Date()),
            ExerciseRecord(exercise: "Soulevé de terre", weight: 130, reps: 3, date: calendar.date(byAdding: .day, value: -1, to: Date())!),
        ]

        // Historique séances
        workoutHistory = [
            WorkoutSession(
                date: Date(),
                exercises: [
                    Exercise(name: "Développé couché", sets: [
                        ExerciseSet(weight: 80, reps: 10, isRecord: false),
                        ExerciseSet(weight: 85, reps: 8, isRecord: false),
                        ExerciseSet(weight: 90, reps: 6, isRecord: true),
                    ]),
                    Exercise(name: "Squat", sets: [
                        ExerciseSet(weight: 100, reps: 8, isRecord: false),
                        ExerciseSet(weight: 110, reps: 6, isRecord: true),
                    ]),
                ]
            ),
            WorkoutSession(
                date: calendar.date(byAdding: .day, value: -1, to: Date())!,
                exercises: [
                    Exercise(name: "Soulevé de terre", sets: [
                        ExerciseSet(weight: 120, reps: 5, isRecord: false),
                        ExerciseSet(weight: 130, reps: 3, isRecord: true),
                    ]),
                ]
            ),
        ]
    }
}

// MARK: - Modèles

// Structure pour encoder/décoder l'historique de poids
struct WeightEntry: Codable {
    let date: Date
    let weight: Double
}

struct ExerciseRecord: Identifiable, Codable {
    let id = UUID()
    let exercise: String
    let weight: Double
    let reps: Int
    let date: Date
}

struct WorkoutSession: Identifiable, Codable {
    let id = UUID()
    let date: Date
    let exercises: [Exercise]
}

struct Exercise: Identifiable, Codable {
    let id = UUID()
    let name: String
    let sets: [ExerciseSet]
}

struct ExerciseSet: Identifiable, Codable {
    let id = UUID()
    let weight: Double
    let reps: Int
    let isRecord: Bool
}
