//
//  HapticsManager.swift
//  YoroiWatch Watch App
//
//  Gestionnaire de vibrations haptic pour le timer de repos
//

import Foundation
import WatchKit

class HapticsManager {
    static let shared = HapticsManager()

    private let device = WKInterfaceDevice.current()

    private init() {}

    // MARK: - Timer Haptics

    /// Vibration légère à mi-temps du timer
    func playHalfwayHaptic() {
        device.play(.click)
    }

    /// Vibration d'alerte à 10 secondes restantes
    func playTenSecondsWarning() {
        device.play(.notification)
    }

    /// Triple vibration à la fin du repos
    func playRestComplete() {
        // Séquence de 3 vibrations fortes
        device.play(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.device.play(.success)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            self.device.play(.success)
        }
    }

    // MARK: - Set Logging Haptics

    /// Vibration de confirmation pour l'enregistrement d'une série
    func playSetLogged() {
        device.play(.success)
    }

    /// Vibration pour chaque rotation du Digital Crown
    func playCrownTick() {
        device.play(.click)
    }

    // MARK: - Workout Haptics

    /// Vibration pour le démarrage d'entraînement
    func playWorkoutStarted() {
        device.play(.start)
    }

    /// Vibration pour la fin d'entraînement
    func playWorkoutEnded() {
        device.play(.stop)
    }

    /// Vibration pour la pause
    func playWorkoutPaused() {
        device.play(.stop)
    }

    /// Vibration pour la reprise
    func playWorkoutResumed() {
        device.play(.start)
    }

    // MARK: - Alert Haptics

    /// Vibration d'erreur
    func playError() {
        device.play(.failure)
    }

    /// Vibration de confirmation générique
    func playConfirmation() {
        device.play(.success)
    }

    /// Vibration d'attention
    func playAttention() {
        device.play(.notification)
    }
}
