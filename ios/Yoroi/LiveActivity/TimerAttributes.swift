import ActivityKit
import Foundation

struct TimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var elapsedSeconds: Int
    var isRunning: Bool
    var heartRate: Int?
  }

  var activityName: String
}
