// YoroiWidgetBridge.swift
// Bridge React Native pour mettre à jour les données du Widget iOS.
// Pattern aligné sur YoroiHealthKitModule (RCT bridge classique, pas Expo Modules).
//
// Usage JS :
//   import { NativeModules } from 'react-native';
//   await NativeModules.YoroiWidgetBridge.updateStats(weeklyTrainings, streakDays, ...);

import Foundation
import WidgetKit
internal import React

@objc(YoroiWidgetBridge)
class YoroiWidgetBridge: NSObject {

  static let APP_GROUP = "group.com.houari.yoroi"

  @objc static func requiresMainQueueSetup() -> Bool { return false }

  // ============================================================
  // updateStats — écrit dans App Group + force refresh des widgets
  // ============================================================
  @objc func updateStats(
    _ weeklyTrainings: NSNumber,
    streakDays: NSNumber,
    latestWeightKg: NSNumber,
    weightTrend: NSString,
    weeklyMinutes: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: YoroiWidgetBridge.APP_GROUP) else {
      NSLog("[YoroiWidget] App Group introuvable — vérifier l'entitlement")
      resolve(false)
      return
    }
    defaults.set(weeklyTrainings.intValue, forKey: "widget_weeklyTrainings")
    defaults.set(streakDays.intValue, forKey: "widget_streakDays")
    defaults.set(latestWeightKg.doubleValue, forKey: "widget_latestWeightKg")
    defaults.set(weightTrend as String, forKey: "widget_weightTrend")
    defaults.set(weeklyMinutes.intValue, forKey: "widget_weeklyMinutes")
    defaults.set(Date(), forKey: "widget_lastUpdated")
    defaults.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    NSLog("[YoroiWidget] Stats mis à jour : \(weeklyTrainings) séances, streak \(streakDays)")
    resolve(true)
  }

  // ============================================================
  // isAvailable — vérifie que l'App Group est correctement configuré
  // ============================================================
  @objc func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let available = UserDefaults(suiteName: YoroiWidgetBridge.APP_GROUP) != nil
    resolve(available)
  }

  // ============================================================
  // reloadWidgets — force le refresh manuel
  // ============================================================
  @objc func reloadWidgets(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      resolve(true)
    } else {
      resolve(false)
    }
  }
}
