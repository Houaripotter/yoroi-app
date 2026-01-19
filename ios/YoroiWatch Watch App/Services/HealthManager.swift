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
    @Published var heartRate: Double = 0
    @Published var spO2: Int = 0
    @Published var steps: Int = 0
    @Published var sleepHours: Double = 0
    @Published var waterIntake: Double = 0
    @Published var activeCalories: Double = 0
    @Published var streak: Int = 0
    @Published var currentWeight: Double = 0
    @Published var targetWeight: Double = 0

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
            if success {
                print("✅ HealthKit Autorisé")
                self?.startObservingHealthChanges()
                self?.fetchAllData()
            } else if let error = error {
                print("❌ Erreur HealthKit: \(error.localizedDescription)")
            }
        }
    }
    
    // Observer les changements en temps réel
    private func startObservingHealthChanges() {
        guard let healthStore = healthStore else { return }
        
        // Observer les pas
        if let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) {
            let query = HKObserverQuery(sampleType: stepType, predicate: nil) { [weak self] _, completion, error in
                self?.fetchSteps()
                completion()
            }
            healthStore.execute(query)
        }
        
        // Observer le rythme cardiaque
        if let hrType = HKObjectType.quantityType(forIdentifier: .heartRate) {
            let query = HKObserverQuery(sampleType: hrType, predicate: nil) { [weak self] _, completion, error in
                self?.fetchHeartRate()
                completion()
            }
            healthStore.execute(query)
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
        fetchCalories()
        fetchSpO2()
        fetchRecentWorkouts()

        // Marquer comme fini après 2 secondes
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.isLoadingData = false
        }
    }

    private func fetchCalories() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else { return }

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
                self?.activeCalories = sum.doubleValue(for: .kilocalorie())
                self?.removeQuery(query)
            }
        }
        addQuery(query)
        healthStore.execute(query)
    }

    private func fetchSpO2() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .oxygenSaturation) else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] query, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else {
                self?.removeQuery(query)
                return
            }

            DispatchQueue.main.async {
                let value = sample.quantity.doubleValue(for: .percent())
                self?.spO2 = Int(value * 100)
                self?.removeQuery(query)
            }
        }
        addQuery(query)
        healthStore.execute(query)
    }

    private func fetchRecentWorkouts() {
        guard let healthStore = healthStore else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: .workoutType(), predicate: nil, limit: 5, sortDescriptors: [sortDescriptor]) { [weak self] query, samples, _ in
            guard let workouts = samples as? [HKWorkout] else {
                self?.removeQuery(query)
                return
            }

            let sessions = workouts.map { workout -> WorkoutSession in
                // Convertir HKWorkout en ton modèle WorkoutSession
                // Note: On simplifie ici pour l'affichage de l'historique
                return WorkoutSession(
                    date: workout.startDate,
                    exercises: [Exercise(name: workout.workoutActivityType.name, sets: [])]
                )
            }

            DispatchQueue.main.async {
                self?.workoutHistory = sessions
                self?.removeQuery(query)
            }
        }
        addQuery(query)
        healthStore.execute(query)
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
        
        // 1. Sync avec iPhone via WatchConnectivity (Priorité immédiate)
        WatchConnectivityManager.shared.sendToiPhone(weight, forKey: "weightUpdate") { success in
            print(success ? "✅ Poids sync iPhone" : "⚠️ Poids mis en queue")
        }

        // 2. Sauvegarde HealthKit
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
    
    // NOUVEAU: Ajouter un record depuis la vue Records
    func addRecord(exercise: String, weight: Double, reps: Int) {
        let newRecord = ExerciseRecord(
            exercise: exercise,
            weight: weight,
            reps: reps,
            date: Date()
        )
        records.insert(newRecord, at: 0)
        savePersistedData()
        
        // Optionnel: On pourrait aussi sync vers l'iPhone ici
        print("✅ Nouveau record ajouté: \(exercise)")
    }

    func resetAllData() {
        let defaults = UserDefaults.standard
        let dictionary = defaults.dictionaryRepresentation()
        dictionary.keys.forEach { key in
            defaults.removeObject(forKey: key)
        }
        
        // Reset variables locales
        heartRate = 0
        spO2 = 0
        steps = 0
        sleepHours = 0
        waterIntake = 0
        activeCalories = 0
        streak = 0
        currentWeight = 0
        targetWeight = 0
        weightHistory = []
        records = []
        workoutHistory = []
        
        print("🗑️ TOUTES les données de la montre ont été effacées")
    }

    // MARK: - Persistance Locale (UserDefaults)

    func savePersistedData() {
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
            weightHistory = decoded.map { (entry: WeightEntry) -> (date: Date, weight: Double) in
                return (date: entry.date, weight: entry.weight)
            }
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
}

extension HKWorkoutActivityType {
    var name: String {
        switch self {
        case .traditionalStrengthTraining: return "Musculation"
        case .functionalStrengthTraining: return "CrossFit"
        case .running: return "Running"
        case .cycling: return "Vélo"
        case .swimming: return "Natation"
        case .boxing: return "Boxe"
        case .martialArts: return "Arts Martiaux"
        case .highIntensityIntervalTraining: return "HIIT"
        case .yoga: return "Yoga"
        default: return "Sport"
        }
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
