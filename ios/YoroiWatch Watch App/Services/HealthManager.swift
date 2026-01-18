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

    // Historique poids pour graphique
    @Published var weightHistory: [(date: Date, weight: Double)] = []

    // Records
    @Published var records: [ExerciseRecord] = []

    // Historique entraînements
    @Published var workoutHistory: [WorkoutSession] = []

    private init() {
        // Vérifier si HealthKit est disponible
        if HKHealthStore.isHealthDataAvailable() {
            healthStore = HKHealthStore()
            isHealthKitAvailable = true
        }
        loadMockData()
    }

    // MARK: - Autorisation HealthKit

    func requestAuthorization() {
        guard isHealthKitAvailable, let healthStore = healthStore else {
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
            if success {
                DispatchQueue.main.async {
                    self?.fetchAllData()
                }
            } else if let error = error {
                print("Erreur HealthKit: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Récupération des données

    func fetchAllData() {
        guard isHealthKitAvailable else { return }
        fetchHeartRate()
        fetchSteps()
        fetchWeight()
        fetchWater()
        fetchSleep()
    }

    private func fetchHeartRate() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else { return }

            DispatchQueue.main.async {
                self?.heartRate = sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
            }
        }
        healthStore.execute(query)
    }

    private func fetchSteps() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, _ in
            guard let sum = result?.sumQuantity() else { return }

            DispatchQueue.main.async {
                self?.steps = Int(sum.doubleValue(for: .count()))
            }
        }
        healthStore.execute(query)
    }

    private func fetchWeight() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 7, sortDescriptors: [sortDescriptor]) { [weak self] _, samples, _ in
            guard let samples = samples as? [HKQuantitySample] else { return }

            DispatchQueue.main.async {
                if let latest = samples.first {
                    self?.currentWeight = latest.quantity.doubleValue(for: .gramUnit(with: .kilo))
                }

                self?.weightHistory = samples.map { sample in
                    (date: sample.startDate, weight: sample.quantity.doubleValue(for: .gramUnit(with: .kilo)))
                }.reversed()
            }
        }
        healthStore.execute(query)
    }

    private func fetchWater() {
        guard let healthStore = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .dietaryWater) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, _ in
            guard let sum = result?.sumQuantity() else { return }

            DispatchQueue.main.async {
                self?.waterIntake = sum.doubleValue(for: .literUnit(with: .milli))
            }
        }
        healthStore.execute(query)
    }

    private func fetchSleep() {
        guard let healthStore = healthStore,
              let type = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return }

        let calendar = Calendar.current
        let now = Date()
        let yesterday = calendar.date(byAdding: .day, value: -1, to: calendar.startOfDay(for: now))!

        let predicate = HKQuery.predicateForSamples(withStart: yesterday, end: now, options: .strictStartDate)

        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, _ in
            guard let sleepSamples = samples as? [HKCategorySample] else { return }

            var totalSleep: TimeInterval = 0
            for sample in sleepSamples {
                if sample.value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue ||
                   sample.value == HKCategoryValueSleepAnalysis.asleepCore.rawValue ||
                   sample.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue ||
                   sample.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue {
                    totalSleep += sample.endDate.timeIntervalSince(sample.startDate)
                }
            }

            DispatchQueue.main.async {
                self?.sleepHours = totalSleep / 3600
            }
        }
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

struct ExerciseRecord: Identifiable {
    let id = UUID()
    let exercise: String
    let weight: Double
    let reps: Int
    let date: Date
}

struct WorkoutSession: Identifiable {
    let id = UUID()
    let date: Date
    let exercises: [Exercise]
}

struct Exercise: Identifiable {
    let id = UUID()
    let name: String
    let sets: [ExerciseSet]
}

struct ExerciseSet: Identifiable {
    let id = UUID()
    let weight: Double
    let reps: Int
    let isRecord: Bool
}
