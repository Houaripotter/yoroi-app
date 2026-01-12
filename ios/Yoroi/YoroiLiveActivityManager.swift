//
//  YoroiLiveActivityManager.swift
//  Yoroi
//
//  YOROI - Module Natif React Native pour gérer les Live Activities
//  Permet de démarrer/arrêter/mettre à jour les Live Activities depuis JS
//

import Foundation
import ActivityKit
import React

@available(iOS 16.1, *)
@objc(YoroiLiveActivityManager)
class YoroiLiveActivityManager: NSObject {

    private var currentActivity: Activity<YoroiWidgetAttributes>?

    // ============================================
    // DÉMARRER UNE LIVE ACTIVITY
    // ============================================
    @objc(startActivity:withResolver:withRejecter:)
    func startActivity(
        data: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("UNAVAILABLE", "Live Activities ne sont pas activées", nil)
            return
        }

        guard let activityName = data["activityName"] as? String else {
            reject("INVALID_DATA", "activityName est requis", nil)
            return
        }

        let elapsedSeconds = data["elapsedSeconds"] as? Int ?? 0
        let isRunning = data["isRunning"] as? Bool ?? true
        let heartRate = data["heartRate"] as? Int

        let attributes = YoroiWidgetAttributes(
            activityName: activityName,
            startTime: Date()
        )

        let initialState = YoroiWidgetAttributes.ContentState(
            elapsedSeconds: elapsedSeconds,
            isRunning: isRunning,
            heartRate: heartRate
        )

        do {
            let activity = try Activity<YoroiWidgetAttributes>.request(
                attributes: attributes,
                contentState: initialState,
                pushType: nil
            )

            self.currentActivity = activity

            NSLog("[YoroiLiveActivity] Live Activity démarrée: \(activity.id)")

            resolve([
                "activityId": activity.id,
                "success": true
            ])

        } catch {
            NSLog("[YoroiLiveActivity] Erreur démarrage: \(error)")
            reject("START_FAILED", "Erreur lors du démarrage: \(error.localizedDescription)", error)
        }
    }

    // ============================================
    // METTRE À JOUR UNE LIVE ACTIVITY
    // ============================================
    @objc(updateActivity:withResolver:withRejecter:)
    func updateActivity(
        data: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activity = currentActivity else {
            reject("NO_ACTIVITY", "Aucune Live Activity en cours", nil)
            return
        }

        let elapsedSeconds = data["elapsedSeconds"] as? Int ?? 0
        let isRunning = data["isRunning"] as? Bool ?? true
        let heartRate = data["heartRate"] as? Int

        let newState = YoroiWidgetAttributes.ContentState(
            elapsedSeconds: elapsedSeconds,
            isRunning: isRunning,
            heartRate: heartRate
        )

        Task {
            await activity.update(using: newState)

            NSLog("[YoroiLiveActivity] Mise à jour: \(elapsedSeconds)s")

            DispatchQueue.main.async {
                resolve([
                    "success": true,
                    "elapsedSeconds": elapsedSeconds
                ])
            }
        }
    }

    // ============================================
    // ARRÊTER UNE LIVE ACTIVITY
    // ============================================
    @objc(stopActivity:withRejecter:)
    func stopActivity(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activity = currentActivity else {
            reject("NO_ACTIVITY", "Aucune Live Activity en cours", nil)
            return
        }

        Task {
            let finalState = activity.contentState

            await activity.end(using: finalState, dismissalPolicy: .default)

            NSLog("[YoroiLiveActivity] Live Activity arrêtée")

            self.currentActivity = nil

            DispatchQueue.main.async {
                resolve([
                    "success": true
                ])
            }
        }
    }

    // ============================================
    // VÉRIFIER SI UNE ACTIVITÉ EST EN COURS
    // ============================================
    @objc(isActivityRunning:withRejecter:)
    func isActivityRunning(
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let isRunning = currentActivity != nil
        resolve([
            "isRunning": isRunning
        ])
    }

    // ============================================
    // VÉRIFIER SI LES LIVE ACTIVITIES SONT DISPONIBLES
    // ============================================
    @objc(areActivitiesEnabled:withRejecter:)
    func areActivitiesEnabled(
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        let enabled = ActivityAuthorizationInfo().areActivitiesEnabled
        resolve([
            "enabled": enabled
        ])
    }

    // ============================================
    // REACT NATIVE BRIDGE
    // ============================================
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
