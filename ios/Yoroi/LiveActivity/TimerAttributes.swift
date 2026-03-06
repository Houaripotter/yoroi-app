import ActivityKit
import Foundation

struct TimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var endTime: Date?       // Date de fin de la phase en cours (pour countdown natif)
    var timeRemaining: Int   // Secondes restantes (utilisé quand en pause)
    var isRunning: Bool
    var mode: String         // combat, tabata, emom, amrap, repos, custom
    var phase: String        // work, rest, idle
    var currentRound: Int
    var totalRounds: Int
    var timerName: String    // Nom affiché (ex: "JJB", "Tabata")
  }

  var activityName: String
}
