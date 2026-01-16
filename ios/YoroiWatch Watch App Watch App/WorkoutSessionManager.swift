//
//  WorkoutSessionManager.swift
//  YoroiWatch Watch App
//
//  Gestionnaire de session d'entraînement - garde l'écran allumé
//

import Foundation
import HealthKit
import Combine

enum WorkoutState: String {
    case notStarted = "Non démarré"
    case active = "En cours"
    case paused = "Pause"
    case ended = "Terminé"
}

class WorkoutSessionManager: NSObject, ObservableObject {
    static let shared = WorkoutSessionManager()

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?

    @Published var workoutState: WorkoutState = .notStarted
    @Published var activeCalories: Double = 0
    @Published var heartRate: Double = 0
    @Published var elapsedTime: TimeInterval = 0
    @Published var startTime: Date?

    private var timer: Timer?

    override init() {
        super.init()
    }

    // MARK: - Authorization

    func requestWorkoutAuthorization(completion: @escaping (Bool) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false)
            return
        }

        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.workoutType()
        ]

        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.workoutType()
        ]

        healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                completion(success)
            }
        }
    }

    // MARK: - Workout Session Management

    func startWorkout() {
        guard workoutState == .notStarted || workoutState == .ended else { return }

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining
        configuration.locationType = .indoor

        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            workoutBuilder = workoutSession?.associatedWorkoutBuilder()

            workoutSession?.delegate = self
            workoutBuilder?.delegate = self

            workoutBuilder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            let startDate = Date()
            workoutSession?.startActivity(with: startDate)
            workoutBuilder?.beginCollection(withStart: startDate) { success, error in
                if success {
                    DispatchQueue.main.async {
                        self.workoutState = .active
                        self.startTime = startDate
                        self.startTimer()
                        // Sync avec complications
                        ComplicationDataManager.shared.isWorkoutActive = true
                        ComplicationDataManager.shared.workoutStartTime = startDate
                    }
                }
            }
        } catch {
            print("Erreur démarrage workout: \(error.localizedDescription)")
        }
    }

    func pauseWorkout() {
        guard workoutState == .active else { return }
        workoutSession?.pause()
        DispatchQueue.main.async {
            self.workoutState = .paused
            self.stopTimer()
        }
    }

    func resumeWorkout() {
        guard workoutState == .paused else { return }
        workoutSession?.resume()
        DispatchQueue.main.async {
            self.workoutState = .active
            self.startTimer()
        }
    }

    func endWorkout() {
        guard workoutState == .active || workoutState == .paused else { return }

        workoutSession?.end()

        workoutBuilder?.endCollection(withEnd: Date()) { success, error in
            if success {
                self.workoutBuilder?.finishWorkout { workout, error in
                    DispatchQueue.main.async {
                        self.workoutState = .ended
                        self.stopTimer()
                        self.resetWorkoutData()
                    }
                }
            }
        }
    }

    // MARK: - Timer

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.startTime else { return }
            DispatchQueue.main.async {
                self.elapsedTime = Date().timeIntervalSince(startTime)
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func resetWorkoutData() {
        activeCalories = 0
        heartRate = 0
        elapsedTime = 0
        startTime = nil
        workoutState = .notStarted
        // Sync avec complications
        ComplicationDataManager.shared.isWorkoutActive = false
        ComplicationDataManager.shared.workoutStartTime = nil
    }

    // MARK: - Helpers

    var elapsedTimeFormatted: String {
        let hours = Int(elapsedTime) / 3600
        let minutes = (Int(elapsedTime) % 3600) / 60
        let seconds = Int(elapsedTime) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}

// MARK: - HKWorkoutSessionDelegate

extension WorkoutSessionManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession,
                        didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState,
                        date: Date) {
        DispatchQueue.main.async {
            switch toState {
            case .running:
                self.workoutState = .active
            case .paused:
                self.workoutState = .paused
            case .ended:
                self.workoutState = .ended
            default:
                break
            }
        }
    }

    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        print("Workout session error: \(error.localizedDescription)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WorkoutSessionManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }

            let statistics = workoutBuilder.statistics(for: quantityType)

            DispatchQueue.main.async {
                switch quantityType {
                case HKQuantityType.quantityType(forIdentifier: .heartRate):
                    if let value = statistics?.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) {
                        self.heartRate = value
                    }
                case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
                    if let value = statistics?.sumQuantity()?.doubleValue(for: .kilocalorie()) {
                        self.activeCalories = value
                    }
                default:
                    break
                }
            }
        }
    }

    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Gérer les événements de workout si nécessaire
    }
}
