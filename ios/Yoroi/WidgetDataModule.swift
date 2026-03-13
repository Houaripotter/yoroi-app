// ============================================================
// WidgetDataModule.swift
// Écrit les données clés dans l'App Group partagé iOS
// pour que les widgets WidgetKit puissent les lire.
// ============================================================

import Foundation
import WidgetKit

@objc(WidgetDataModule)
class WidgetDataModule: NSObject {

  private let appGroupID = "group.com.houari.yoroi"

  @objc static func requiresMainQueueSetup() -> Bool { false }

  /// Met à jour les données widget depuis JavaScript.
  /// - data: { weight, streak, rank, waterCups, waterGoal,
  ///            calories, steps, nextSession, nextSessionTime }
  @objc func updateWidgetData(
    _ data: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      reject("APP_GROUP_ERROR", "App Group '\(appGroupID)' non configuré", nil)
      return
    }

    if let v = data["weight"]          as? Double  { defaults.set(v, forKey: "weight") }
    if let v = data["streak"]          as? Int     { defaults.set(v, forKey: "streak") }
    if let v = data["rank"]            as? String  { defaults.set(v, forKey: "rank") }
    if let v = data["waterCups"]       as? Int     { defaults.set(v, forKey: "waterCups") }
    if let v = data["waterGoal"]       as? Int     { defaults.set(v, forKey: "waterGoal") }
    if let v = data["calories"]        as? Int     { defaults.set(v, forKey: "calories") }
    if let v = data["steps"]           as? Int     { defaults.set(v, forKey: "steps") }
    if let v = data["nextSession"]     as? String  { defaults.set(v, forKey: "nextSession") }
    if let v = data["nextSessionTime"] as? String  { defaults.set(v, forKey: "nextSessionTime") }

    defaults.synchronize()

    // Force le rechargement de tous les timelines widgets
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }

    resolve(["success": true])
  }
}
