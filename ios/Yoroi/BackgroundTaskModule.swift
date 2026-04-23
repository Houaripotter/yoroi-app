// BackgroundTaskModule.swift
// Demande à iOS du temps d'exécution en arrière-plan pour que le timer
// continue de tourner (jusqu'à ~30s après le verrouillage de l'écran).
// Combiné avec la notification planifiée, couvre 100% des cas.

import UIKit
import Foundation
internal import React

@objc(BackgroundTaskModule)
class BackgroundTaskModule: NSObject {

  private var bgTaskId: UIBackgroundTaskIdentifier = .invalid

  @objc static func requiresMainQueueSetup() -> Bool { return true }

  /// Démarrer la tâche d'arrière-plan.
  /// iOS accorde ~30 secondes d'exécution JS supplémentaires après verrouillage.
  @objc func beginTask() {
    DispatchQueue.main.async {
      // Annuler une tâche précédente si elle existe
      if self.bgTaskId != .invalid {
        UIApplication.shared.endBackgroundTask(self.bgTaskId)
        self.bgTaskId = .invalid
      }

      self.bgTaskId = UIApplication.shared.beginBackgroundTask(withName: "yoroi-timer") {
        // Expiry handler : iOS va tuer la tâche, on nettoie
        UIApplication.shared.endBackgroundTask(self.bgTaskId)
        self.bgTaskId = .invalid
      }
    }
  }

  /// Libérer la tâche d'arrière-plan (quand le timer est arrêté / pausé)
  @objc func endTask() {
    DispatchQueue.main.async {
      if self.bgTaskId != .invalid {
        UIApplication.shared.endBackgroundTask(self.bgTaskId)
        self.bgTaskId = .invalid
      }
    }
  }

  /// Durée restante accordée par iOS (en secondes), 0 si pas de tâche active
  @objc func remainingTime(_ resolve: @escaping RCTPromiseResolveBlock,
                            reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let remaining = UIApplication.shared.backgroundTimeRemaining
      resolve(remaining.isInfinite ? -1 : remaining)
    }
  }
}
