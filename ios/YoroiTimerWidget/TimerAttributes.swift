/**
 * TimerAttributes.swift
 * Définition des attributs pour les Live Activities du Timer
 *
 * IMPORTANT: Ce fichier doit être ajouté aux DEUX targets dans Xcode:
 * - ✅ Yoroi (app principale)
 * - ✅ YoroiTimerWidget (widget extension)
 *
 * Instructions:
 * 1. Clic droit sur Yoroi folder → Add Files to "Yoroi"
 * 2. Sélectionner TimerAttributes.swift
 * 3. ✅ Cocher "Yoroi" ET "YoroiTimerWidget" dans Target Membership
 */

import Foundation
import ActivityKit

// ============================================
// Attributs de la Live Activity du Timer
// Partagés entre l'app et le Widget Extension
// ============================================

public struct TimerAttributes: ActivityAttributes {
  /// État dynamique du timer (mis à jour en temps réel)
  public struct ContentState: Codable, Hashable {
    /// Temps restant en secondes
    public var remainingTime: Int

    /// Temps total du timer en secondes
    public var totalTime: Int

    /// Mode du timer: "musculation", "combat", "tabata", "hiit", "emom", "amrap"
    public var mode: String

    /// Est-ce une phase de repos ?
    public var isResting: Bool

    /// Numéro du round actuel (optionnel, pour combat/tabata)
    public var roundNumber: Int?

    /// Nombre total de rounds (optionnel, pour combat/tabata)
    public var totalRounds: Int?

    public init(
      remainingTime: Int,
      totalTime: Int,
      mode: String,
      isResting: Bool,
      roundNumber: Int? = nil,
      totalRounds: Int? = nil
    ) {
      self.remainingTime = remainingTime
      self.totalTime = totalTime
      self.mode = mode
      self.isResting = isResting
      self.roundNumber = roundNumber
      self.totalRounds = totalRounds
    }
  }

  /// Nom du timer (statique, ne change pas pendant l'activité)
  public var timerName: String

  public init(timerName: String) {
    self.timerName = timerName
  }
}
