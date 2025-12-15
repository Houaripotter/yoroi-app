import Foundation
import WidgetKit

// ============================================
// WIDGET MODULE - Bridge React Native -> Widget
// ============================================
// Permet à React Native de mettre à jour les données du widget

@objc(WidgetModule)
class WidgetModule: NSObject {

  // App Group ID
  private let appGroupID = "group.com.houari.yoroi"

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // Mettre à jour les données du widget
  @objc
  func updateWidgetData(_ weight: Double, delta: Double, timestamp: Double) {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      print("WidgetModule: Could not access App Group")
      return
    }

    defaults.set(weight, forKey: "lastWeight")
    defaults.set(delta, forKey: "weightDelta")
    defaults.set(timestamp, forKey: "lastWeightDate")
    defaults.synchronize()

    // Recharger le widget
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }

    print("WidgetModule: Data updated - Weight: \(weight), Delta: \(delta)")
  }

  // Effacer les données du widget
  @objc
  func clearWidgetData() {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      return
    }

    defaults.removeObject(forKey: "lastWeight")
    defaults.removeObject(forKey: "weightDelta")
    defaults.removeObject(forKey: "lastWeightDate")
    defaults.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  // Recharger le widget manuellement
  @objc
  func reloadWidget() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
