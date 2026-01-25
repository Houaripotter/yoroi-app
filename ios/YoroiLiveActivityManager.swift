//
//  YoroiLiveActivityManager.swift
//  Yoroi
//
//  Module React Native pour contrôler les Live Activities (Dynamic Island)
//

import Foundation
import ActivityKit
import React

@objc(YoroiLiveActivityManager)
class YoroiLiveActivityManager: NSObject {

  // Référence vers l'activité en cours
  private var currentActivity: Activity<TimerAttributes>?

  // MARK: - Check Availability

  @objc
  func areActivitiesEnabled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.1, *) {
      let enabled = ActivityAuthorizationInfo().areActivitiesEnabled
      resolve(["enabled": enabled])
    } else {
      resolve(["enabled": false])
    }
  }

  // MARK: - Start Activity

  @objc
  func startActivity(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 16.1, *) else {
      reject("UNAVAILABLE", "Live Activities requires iOS 16.1+", nil)
      return
    }

    // Extraire les données
    guard let activityName = data["activityName"] as? String else {
      reject("INVALID_DATA", "Missing activityName", nil)
      return
    }

    let elapsedSeconds = data["elapsedSeconds"] as? Int ?? 0
    let isRunning = data["isRunning"] as? Bool ?? false

    // Créer les attributs
    let attributes = TimerAttributes(timerName: activityName)

    // Créer l'état initial
    let contentState = TimerAttributes.ContentState(
      remainingTime: elapsedSeconds,
      totalTime: elapsedSeconds,
      mode: activityName.lowercased(),
      isResting: false,
      roundNumber: nil,
      totalRounds: nil
    )

    do {
      // Démarrer la Live Activity
      currentActivity = try Activity<TimerAttributes>.request(
        attributes: attributes,
        contentState: contentState,
        pushType: nil
      )

      print("✅ Live Activity démarrée: \(currentActivity?.id ?? "unknown")")

      resolve(["activityId": currentActivity?.id ?? "unknown"])
    } catch {
      print("❌ Erreur démarrage Live Activity: \(error)")
      reject("START_ERROR", error.localizedDescription, error)
    }
  }

  // MARK: - Update Activity

  @objc
  func updateActivity(_ data: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 16.1, *) else {
      reject("UNAVAILABLE", "Live Activities requires iOS 16.1+", nil)
      return
    }

    guard let activity = currentActivity else {
      reject("NO_ACTIVITY", "No Live Activity running", nil)
      return
    }

    // Extraire les données à mettre à jour
    let elapsedSeconds = data["elapsedSeconds"] as? Int
    let isRunning = data["isRunning"] as? Bool
    let isResting = data["isResting"] as? Bool ?? false
    let roundNumber = data["roundNumber"] as? Int
    let totalRounds = data["totalRounds"] as? Int

    // Créer le nouvel état
    var newContentState = activity.contentState

    if let elapsed = elapsedSeconds {
      newContentState.remainingTime = elapsed
    }

    newContentState.isResting = isResting
    newContentState.roundNumber = roundNumber
    newContentState.totalRounds = totalRounds

    Task {
      do {
        await currentActivity?.update(using: newContentState)
        resolve(["success": true])
      } catch {
        print("❌ Erreur mise à jour Live Activity: \(error)")
        reject("UPDATE_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Stop Activity

  @objc
  func stopActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard #available(iOS 16.1, *) else {
      reject("UNAVAILABLE", "Live Activities requires iOS 16.1+", nil)
      return
    }

    guard let activity = currentActivity else {
      // Pas d'erreur si pas d'activité - c'est OK
      resolve(["success": true])
      return
    }

    Task {
      do {
        // Mettre fin à l'activité immédiatement
        await activity.end(dismissalPolicy: .immediate)
        currentActivity = nil
        print("✅ Live Activity arrêtée")
        resolve(["success": true])
      } catch {
        print("❌ Erreur arrêt Live Activity: \(error)")
        reject("STOP_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Check if Running

  @objc
  func isActivityRunning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {

    if #available(iOS 16.1, *) {
      let isRunning = currentActivity != nil
      resolve(["isRunning": isRunning])
    } else {
      resolve(["isRunning": false])
    }
  }

  // MARK: - React Native Setup

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
