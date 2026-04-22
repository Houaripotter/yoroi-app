// YoroiLiveActivityBridge.swift
// Bridge React Native pour démarrer/mettre à jour/arrêter une Live Activity
// depuis JavaScript pendant qu'une séance est en cours.
//
// Usage JS :
//   import { NativeModules } from 'react-native';
//   await NativeModules.YoroiLiveActivityBridge.startSession(sportName, sportIcon, sportColorHex);
//   await NativeModules.YoroiLiveActivityBridge.updateSession(elapsed, hr, kcal, rounds);
//   await NativeModules.YoroiLiveActivityBridge.endSession();

import Foundation
import ActivityKit
internal import React

@objc(YoroiLiveActivityBridge)
class YoroiLiveActivityBridge: NSObject {

  private static var currentActivityId: String?

  @objc static func requiresMainQueueSetup() -> Bool { return false }

  // ============================================================
  // startSession — Démarre une nouvelle Live Activity
  // ============================================================
  @objc func startSession(
    _ sportName: NSString,
    sportIcon: NSString,
    sportColorHex: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.1, *) {
      // Si une activité tourne déjà, on l'arrête avant
      Task { @MainActor in
        for activity in Activity<YoroiSessionAttributes>.activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        let attrs = YoroiSessionAttributes(
          sportName: sportName as String,
          sportIcon: sportIcon as String,
          sportColorHex: sportColorHex as String,
          startedAt: Date()
        )
        let initialState = YoroiSessionAttributes.ContentState(
          elapsedSeconds: 0,
          heartRate: 0,
          calories: 0,
          rounds: 0
        )
        do {
          let activity: Activity<YoroiSessionAttributes>
          if #available(iOS 16.2, *) {
            activity = try Activity.request(
              attributes: attrs,
              content: .init(state: initialState, staleDate: nil),
              pushType: nil
            )
          } else {
            activity = try Activity.request(
              attributes: attrs,
              contentState: initialState,
              pushType: nil
            )
          }
          YoroiLiveActivityBridge.currentActivityId = activity.id
          NSLog("[LiveActivity] Started: \(activity.id)")
          resolve(activity.id)
        } catch {
          NSLog("[LiveActivity] Erreur start: \(error)")
          reject("LIVE_ACTIVITY_ERROR", error.localizedDescription, error)
        }
      }
    } else {
      resolve(NSNull())
    }
  }

  // ============================================================
  // updateSession — Met à jour le contenu de l'activité
  // ============================================================
  @objc func updateSession(
    _ elapsedSeconds: NSNumber,
    heartRate: NSNumber,
    calories: NSNumber,
    rounds: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.1, *) {
      Task { @MainActor in
        guard let activityId = YoroiLiveActivityBridge.currentActivityId,
              let activity = Activity<YoroiSessionAttributes>.activities.first(where: { $0.id == activityId }) else {
          resolve(false)
          return
        }
        let newState = YoroiSessionAttributes.ContentState(
          elapsedSeconds: elapsedSeconds.intValue,
          heartRate: heartRate.intValue,
          calories: calories.intValue,
          rounds: rounds.intValue
        )
        if #available(iOS 16.2, *) {
          await activity.update(.init(state: newState, staleDate: nil))
        } else {
          await activity.update(using: newState)
        }
        resolve(true)
      }
    } else {
      resolve(false)
    }
  }

  // ============================================================
  // endSession — Termine la Live Activity en cours
  // ============================================================
  @objc func endSession(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.1, *) {
      Task { @MainActor in
        for activity in Activity<YoroiSessionAttributes>.activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        YoroiLiveActivityBridge.currentActivityId = nil
        NSLog("[LiveActivity] Ended")
        resolve(true)
      }
    } else {
      resolve(false)
    }
  }

  // ============================================================
  // isAvailable — Indique si Live Activities supportées sur cet appareil
  // ============================================================
  @objc func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.1, *) {
      resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    } else {
      resolve(false)
    }
  }
}
