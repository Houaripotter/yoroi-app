//
//  WatchConnectivityManager.swift
//  YoroiWatch Watch App
//

import Foundation
import Combine
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    @Published var watchData: WatchData = .defaultData
    @Published var isReachable: Bool = false
    @Published var lastSyncTime: Date?
    @Published var availableExercises: [String] = []

    private var session: WCSession?

    override init() {
        super.init()
    }

    func activateSession() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }

    func requestSync() {
        sendMessage(["action": "syncRequest"])
    }

    // MARK: - Hydration & Weight

    func sendHydrationAdded(amount: Int) {
        sendMessage(["action": "hydrationAdded", "amount": amount])
        watchData.hydrationCurrent += amount
    }

    func sendWeightAdded(weight: Double) {
        sendMessage(["action": "weightAdded", "weight": weight])
        watchData.currentWeight = weight
    }

    // MARK: - Workout Session

    func sendWorkoutStarted() {
        let message: [String: Any] = [
            "action": "workoutStarted",
            "timestamp": Date().timeIntervalSince1970
        ]
        sendMessage(message)
    }

    func sendWorkoutEnded(workout: WatchWorkout) {
        // Convertir le workout en dictionnaire
        var exercisesData: [[String: Any]] = []
        for exercise in workout.exercises {
            var setsData: [[String: Any]] = []
            for set in exercise.sets {
                setsData.append([
                    "weight": set.weight,
                    "reps": set.reps,
                    "timestamp": set.timestamp.timeIntervalSince1970,
                    "restTime": set.restTime ?? 0
                ])
            }
            exercisesData.append([
                "id": exercise.id,
                "name": exercise.name,
                "category": exercise.category.rawValue,
                "sets": setsData
            ])
        }

        let message: [String: Any] = [
            "action": "workoutEnded",
            "workoutId": workout.id,
            "startTime": workout.startTime.timeIntervalSince1970,
            "endTime": workout.endTime?.timeIntervalSince1970 ?? Date().timeIntervalSince1970,
            "exercises": exercisesData,
            "totalSets": workout.totalSets,
            "totalVolume": workout.totalVolume
        ]

        // Utiliser transferUserInfo pour garantir la livraison
        session?.transferUserInfo(message)
    }

    func sendSetLogged(exerciseName: String, set: WatchSet) {
        let message: [String: Any] = [
            "action": "setLogged",
            "exerciseName": exerciseName,
            "weight": set.weight,
            "reps": set.reps,
            "timestamp": set.timestamp.timeIntervalSince1970,
            "restTime": set.restTime ?? 0
        ]
        sendMessage(message)
    }

    func requestExercisesList() {
        sendMessage(["action": "requestExercises"])
    }

    // MARK: - Private

    private func sendMessage(_ message: [String: Any]) {
        guard let session = session, session.isReachable else {
            session?.transferUserInfo(message)
            return
        }
        session.sendMessage(message, replyHandler: nil, errorHandler: nil)
    }

    private func updateWatchData(from dictionary: [String: Any]) {
        DispatchQueue.main.async {
            if let v = dictionary["hydrationCurrent"] as? Int { self.watchData.hydrationCurrent = v }
            if let v = dictionary["hydrationGoal"] as? Int { self.watchData.hydrationGoal = v }
            if let v = dictionary["currentWeight"] as? Double { self.watchData.currentWeight = v }
            if let v = dictionary["targetWeight"] as? Double { self.watchData.targetWeight = v }
            if let v = dictionary["sleepDuration"] as? Int { self.watchData.sleepDuration = v }
            if let v = dictionary["sleepQuality"] as? Int { self.watchData.sleepQuality = v }
            if let v = dictionary["sleepBedTime"] as? String { self.watchData.sleepBedTime = v }
            if let v = dictionary["sleepWakeTime"] as? String { self.watchData.sleepWakeTime = v }
            if let v = dictionary["stepsGoal"] as? Int { self.watchData.stepsGoal = v }

            // Liste des exercices depuis l'iPhone
            if let exercises = dictionary["exercises"] as? [String] {
                self.availableExercises = exercises
            }

            self.lastSyncTime = Date()

            // Sync avec les complications
            self.syncComplicationData()
        }
    }

    // MARK: - Complication Sync

    private func syncComplicationData() {
        let complicationManager = ComplicationDataManager.shared
        complicationManager.hydrationCurrent = watchData.hydrationCurrent
        complicationManager.hydrationGoal = watchData.hydrationGoal
        complicationManager.currentWeight = watchData.currentWeight
        complicationManager.targetWeight = watchData.targetWeight
        complicationManager.sleepDuration = watchData.sleepDuration
        complicationManager.stepsGoal = watchData.stepsGoal
    }
}

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            if activationState == .activated {
                self.isReachable = session.isReachable
                self.requestSync()
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
            if session.isReachable { self.requestSync() }
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        updateWatchData(from: message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        updateWatchData(from: message)
        replyHandler(["status": "received"])
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        updateWatchData(from: applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        updateWatchData(from: userInfo)
    }
}
