//
//  HealthKitManager.swift
//  YoroiWatch Watch App
//
//  Manages HealthKit data on the Watch
//

import Foundation
import HealthKit

class HealthKitManager: NSObject, ObservableObject {
    static let shared = HealthKitManager()

    private let healthStore = HKHealthStore()

    @Published var todaySteps: Int = 0
    @Published var todayCalories: Int = 0
    @Published var currentHeartRate: Int = 0
    @Published var isAuthorized: Bool = false

    override init() {
        super.init()
    }

    // MARK: - Authorization

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            print("[Watch HealthKit] HealthKit non disponible")
            return
        }

        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .bodyMass)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]

        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.quantityType(forIdentifier: .bodyMass)!,
            HKObjectType.quantityType(forIdentifier: .dietaryWater)!
        ]

        healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                self.isAuthorized = success
                if success {
                    print("[Watch HealthKit] Autorisation accordee")
                    self.startObservingData()
                } else if let error = error {
                    print("[Watch HealthKit] Erreur autorisation: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Data Fetching

    private func startObservingData() {
        fetchTodaySteps()
        fetchTodayCalories()
        observeHeartRate()
    }

    func fetchTodaySteps() {
        guard let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }

        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: stepsType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            DispatchQueue.main.async {
                if let sum = result?.sumQuantity() {
                    self.todaySteps = Int(sum.doubleValue(for: HKUnit.count()))
                }
            }
        }

        healthStore.execute(query)
    }

    func fetchTodayCalories() {
        guard let caloriesType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else { return }

        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

        let query = HKStatisticsQuery(quantityType: caloriesType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            DispatchQueue.main.async {
                if let sum = result?.sumQuantity() {
                    self.todayCalories = Int(sum.doubleValue(for: HKUnit.kilocalorie()))
                }
            }
        }

        healthStore.execute(query)
    }

    private func observeHeartRate() {
        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }

        let query = HKAnchoredObjectQuery(type: heartRateType, predicate: nil, anchor: nil, limit: HKObjectQueryNoLimit) { query, samples, deletedObjects, anchor, error in
            self.processHeartRateSamples(samples)
        }

        query.updateHandler = { query, samples, deletedObjects, anchor, error in
            self.processHeartRateSamples(samples)
        }

        healthStore.execute(query)
    }

    private func processHeartRateSamples(_ samples: [HKSample]?) {
        guard let heartRateSamples = samples as? [HKQuantitySample],
              let mostRecent = heartRateSamples.last else { return }

        DispatchQueue.main.async {
            let heartRateUnit = HKUnit.count().unitDivided(by: .minute())
            self.currentHeartRate = Int(mostRecent.quantity.doubleValue(for: heartRateUnit))
        }
    }

    // MARK: - Data Writing

    func saveWeight(_ weightKg: Double) {
        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { return }

        let quantity = HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: weightKg)
        let sample = HKQuantitySample(type: weightType, quantity: quantity, start: Date(), end: Date())

        healthStore.save(sample) { success, error in
            if success {
                print("[Watch HealthKit] Poids sauvegarde: \(weightKg)kg")
            } else if let error = error {
                print("[Watch HealthKit] Erreur sauvegarde poids: \(error.localizedDescription)")
            }
        }
    }

    func saveWaterIntake(_ milliliters: Int) {
        guard let waterType = HKQuantityType.quantityType(forIdentifier: .dietaryWater) else { return }

        let quantity = HKQuantity(unit: .literUnit(with: .milli), doubleValue: Double(milliliters))
        let sample = HKQuantitySample(type: waterType, quantity: quantity, start: Date(), end: Date())

        healthStore.save(sample) { success, error in
            if success {
                print("[Watch HealthKit] Eau sauvegardee: \(milliliters)ml")
            } else if let error = error {
                print("[Watch HealthKit] Erreur sauvegarde eau: \(error.localizedDescription)")
            }
        }
    }
}
