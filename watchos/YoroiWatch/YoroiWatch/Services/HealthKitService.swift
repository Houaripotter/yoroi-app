// ============================================
// YOROI WATCH - Service HealthKit
// ============================================

import Foundation
import HealthKit

class HealthKitService: ObservableObject {
    static let shared = HealthKitService()

    private let healthStore = HKHealthStore()

    @Published var isAuthorized = false
    @Published var currentWeight: Double = 0
    @Published var sleepHours: Double = 0
    @Published var waterIntake: Double = 0 // en mL
    @Published var activeCalories: Double = 0
    @Published var heartRate: Double = 0
    @Published var steps: Int = 0

    // Types de données à lire
    private let readTypes: Set<HKObjectType> = [
        HKObjectType.quantityType(forIdentifier: .bodyMass)!,
        HKObjectType.quantityType(forIdentifier: .dietaryWater)!,
        HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        HKObjectType.quantityType(forIdentifier: .heartRate)!,
        HKObjectType.quantityType(forIdentifier: .stepCount)!,
        HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
    ]

    // Types de données à écrire
    private let writeTypes: Set<HKSampleType> = [
        HKObjectType.quantityType(forIdentifier: .bodyMass)!,
        HKObjectType.quantityType(forIdentifier: .dietaryWater)!,
        HKObjectType.workoutType(),
    ]

    init() {
        requestAuthorization()
    }

    // MARK: - Autorisation

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        healthStore.requestAuthorization(toShare: writeTypes, read: readTypes) { [weak self] success, error in
            DispatchQueue.main.async {
                self?.isAuthorized = success
                if success {
                    self?.fetchAllData()
                }
            }
        }
    }

    // MARK: - Récupération des données

    func fetchAllData() {
        fetchWeight()
        fetchSleep()
        fetchWater()
        fetchActiveCalories()
        fetchHeartRate()
        fetchSteps()
    }

    func fetchWeight() {
        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: weightType, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else { return }

            DispatchQueue.main.async {
                self?.currentWeight = sample.quantity.doubleValue(for: .gramUnit(with: .kilo))
            }
        }

        healthStore.execute(query)
    }

    func fetchSleep() {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)
        let yesterday = calendar.date(byAdding: .day, value: -1, to: startOfDay)!

        let predicate = HKQuery.predicateForSamples(withStart: yesterday, end: now, options: .strictStartDate)

        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, _ in
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

    func fetchWater() {
        guard let waterType = HKQuantityType.quantityType(forIdentifier: .dietaryWater) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: waterType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, _ in
            guard let sum = result?.sumQuantity() else { return }

            DispatchQueue.main.async {
                self?.waterIntake = sum.doubleValue(for: .literUnit(with: .milli))
            }
        }

        healthStore.execute(query)
    }

    func fetchActiveCalories() {
        guard let caloriesType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: caloriesType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, _ in
            guard let sum = result?.sumQuantity() else { return }

            DispatchQueue.main.async {
                self?.activeCalories = sum.doubleValue(for: .kilocalorie())
            }
        }

        healthStore.execute(query)
    }

    func fetchHeartRate() {
        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: heartRateType, predicate: nil, limit: 1, sortDescriptors: [sortDescriptor]) { [weak self] _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else { return }

            DispatchQueue.main.async {
                self?.heartRate = sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
            }
        }

        healthStore.execute(query)
    }

    func fetchSteps() {
        guard let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }

        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: stepsType, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, result, _ in
            guard let sum = result?.sumQuantity() else { return }

            DispatchQueue.main.async {
                self?.steps = Int(sum.doubleValue(for: .count()))
            }
        }

        healthStore.execute(query)
    }

    // MARK: - Enregistrement des données

    func saveWeight(_ weight: Double) {
        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return }

        let quantity = HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: weight)
        let sample = HKQuantitySample(type: weightType, quantity: quantity, start: Date(), end: Date())

        healthStore.save(sample) { [weak self] success, _ in
            if success {
                DispatchQueue.main.async {
                    self?.currentWeight = weight
                }
            }
        }
    }

    func saveWater(_ ml: Double) {
        guard let waterType = HKQuantityType.quantityType(forIdentifier: .dietaryWater) else { return }

        let quantity = HKQuantity(unit: .literUnit(with: .milli), doubleValue: ml)
        let sample = HKQuantitySample(type: waterType, quantity: quantity, start: Date(), end: Date())

        healthStore.save(sample) { [weak self] success, _ in
            if success {
                self?.fetchWater()
            }
        }
    }

    func saveWorkout(sport: Sport, duration: TimeInterval, calories: Double) {
        let workoutType: HKWorkoutActivityType

        switch sport {
        case .jjb, .mma, .boxe:
            workoutType = .martialArts
        case .musculation:
            workoutType = .traditionalStrengthTraining
        case .running:
            workoutType = .running
        case .autre:
            workoutType = .other
        }

        let workout = HKWorkout(
            activityType: workoutType,
            start: Date().addingTimeInterval(-duration),
            end: Date(),
            duration: duration,
            totalEnergyBurned: HKQuantity(unit: .kilocalorie(), doubleValue: calories),
            totalDistance: nil,
            metadata: ["Sport": sport.rawValue]
        )

        healthStore.save(workout) { success, _ in
            if success {
                print("Workout saved to HealthKit")
            }
        }
    }
}
