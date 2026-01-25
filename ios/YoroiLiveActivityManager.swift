/**
 * YoroiLiveActivityManager.swift
 * Native Module pour gérer les Live Activities (Dynamic Island) du Timer
 *
 * IMPORTANT: Ce fichier doit être ajouté dans Xcode:
 * 1. Ouvrir Yoroi.xcworkspace
 * 2. Clic droit sur Yoroi folder → Add Files to "Yoroi"
 * 3. Sélectionner ce fichier YoroiLiveActivityManager.swift
 * 4. Cocher "Copy items if needed" et "Yoroi" target
 */

import Foundation
import ActivityKit

// IMPORTANT: TimerAttributes est défini dans TimerAttributes.swift
// Ce fichier doit être ajouté aux deux targets (Yoroi et YoroiTimerWidget)

// ============================================
// Native Module React Native
// ============================================
@objc(YoroiLiveActivityManager)
class YoroiLiveActivityManager: NSObject {

  private static var currentActivity: Activity<TimerAttributes>?

  // ============================================
  // DÉMARRER une Live Activity
  // ============================================
  @objc
  func startLiveActivity(
    _ timerName: String,
    mode: String,
    totalTime: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // Vérifier si ActivityKit est disponible (iOS 16.1+)
    guard #available(iOS 16.1, *) else {
      reject("UNAVAILABLE", "Live Activities requires iOS 16.1 or later", nil)
      return
    }

    // Arrêter l'activité existante si elle existe
    if let existing = YoroiLiveActivityManager.currentActivity {
      Task {
        await existing.end(dismissalPolicy: .immediate)
      }
    }

    // Créer les attributs de la Live Activity
    let attributes = TimerAttributes(timerName: timerName)

    let initialState = TimerAttributes.ContentState(
      remainingTime: totalTime.intValue,
      totalTime: totalTime.intValue,
      mode: mode,
      isResting: false,
      roundNumber: nil,
      totalRounds: nil
    )

    do {
      // Démarrer la Live Activity
      let activity = try Activity<TimerAttributes>.request(
        attributes: attributes,
        contentState: initialState,
        pushType: nil
      )

      YoroiLiveActivityManager.currentActivity = activity

      resolve([
        "activityId": activity.id,
        "state": "active"
      ])
    } catch {
      reject("START_ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
    }
  }

  // ============================================
  // METTRE À JOUR la Live Activity
  // ============================================
  @objc
  func updateLiveActivity(
    _ remainingTime: NSNumber,
    isResting: Bool,
    roundNumber: NSNumber?,
    totalRounds: NSNumber?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      reject("UNAVAILABLE", "Live Activities requires iOS 16.1 or later", nil)
      return
    }

    guard let activity = YoroiLiveActivityManager.currentActivity else {
      reject("NO_ACTIVITY", "No active Live Activity found", nil)
      return
    }

    Task {
      let updatedState = TimerAttributes.ContentState(
        remainingTime: remainingTime.intValue,
        totalTime: activity.contentState.totalTime,
        mode: activity.contentState.mode,
        isResting: isResting,
        roundNumber: roundNumber?.intValue,
        totalRounds: totalRounds?.intValue
      )

      await activity.update(using: updatedState)

      resolve([
        "activityId": activity.id,
        "state": "updated"
      ])
    }
  }

  // ============================================
  // ARRÊTER la Live Activity
  // ============================================
  @objc
  func endLiveActivity(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      reject("UNAVAILABLE", "Live Activities requires iOS 16.1 or later", nil)
      return
    }

    guard let activity = YoroiLiveActivityManager.currentActivity else {
      resolve(["state": "no_activity"])
      return
    }

    Task {
      await activity.end(
        using: activity.contentState,
        dismissalPolicy: .default
      )

      YoroiLiveActivityManager.currentActivity = nil

      resolve([
        "activityId": activity.id,
        "state": "ended"
      ])
    }
  }

  // ============================================
  // VÉRIFIER si une Live Activity est active
  // ============================================
  @objc
  func isLiveActivityActive(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolve(["isActive": false, "reason": "unsupported"])
      return
    }

    let isActive = YoroiLiveActivityManager.currentActivity != nil
    resolve([
      "isActive": isActive,
      "activityId": YoroiLiveActivityManager.currentActivity?.id ?? ""
    ])
  }

  // ============================================
  // Module Configuration
  // ============================================
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
