import Foundation
import ActivityKit
import React

@objc(YoroiLiveActivityManager)
class YoroiLiveActivityManager: NSObject {

  private var _currentActivity: Any?

  @available(iOS 16.2, *)
  private var currentActivity: Activity<TimerAttributes>? {
    get { _currentActivity as? Activity<TimerAttributes> }
    set { _currentActivity = newValue }
  }

  // Construit un ContentState depuis un NSDictionary
  @available(iOS 16.2, *)
  private func buildState(_ data: NSDictionary, fallback: TimerAttributes.ContentState? = nil) -> TimerAttributes.ContentState {
    let endTimeInterval = data["endTime"] as? Double
    let endTime = endTimeInterval.map { Date(timeIntervalSince1970: $0) }

    return TimerAttributes.ContentState(
      endTime: endTime,
      timeRemaining: data["timeRemaining"] as? Int ?? fallback?.timeRemaining ?? 0,
      isRunning: data["isRunning"] as? Bool ?? fallback?.isRunning ?? true,
      mode: data["mode"] as? String ?? fallback?.mode ?? "custom",
      phase: data["phase"] as? String ?? fallback?.phase ?? "work",
      currentRound: data["currentRound"] as? Int ?? fallback?.currentRound ?? 1,
      totalRounds: data["totalRounds"] as? Int ?? fallback?.totalRounds ?? 1,
      timerName: data["timerName"] as? String ?? fallback?.timerName ?? "Timer"
    )
  }

  @objc
  func areActivitiesEnabled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.1, *) {
      resolve(["enabled": ActivityAuthorizationInfo().areActivitiesEnabled])
    } else {
      resolve(["enabled": false])
    }
  }

  @objc
  func startActivity(_ data: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      // Arrêter l'activité précédente si elle existe
      if let existing = self.currentActivity {
        Task { await existing.end(dismissalPolicy: .immediate) }
        self.currentActivity = nil
      }

      let activityName = data["activityName"] as? String ?? "Yoroi Timer"
      let attributes = TimerAttributes(activityName: activityName)
      let state = buildState(data)

      do {
        let content = ActivityContent(state: state, staleDate: nil)
        let activity = try Activity<TimerAttributes>.request(
          attributes: attributes,
          content: content,
          pushType: nil
        )
        self.currentActivity = activity
        resolve(["activityId": activity.id])
      } catch {
        reject("START_ERROR", error.localizedDescription, error)
      }
    } else {
      reject("UNAVAILABLE", "iOS 16.2+ required", nil)
    }
  }

  @objc
  func updateActivity(_ data: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      guard let activity = self.currentActivity else {
        resolve(["success": false])
        return
      }

      let newState = buildState(data, fallback: activity.content.state)

      Task {
        let content = ActivityContent(state: newState, staleDate: nil)
        await activity.update(content)
        resolve(["success": true])
      }
    } else {
      resolve(["success": false])
    }
  }

  @objc
  func stopActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      guard let activity = self.currentActivity else {
        resolve(["success": true])
        return
      }

      Task {
        var finalState = activity.content.state
        finalState.isRunning = false
        finalState.endTime = nil
        let content = ActivityContent(state: finalState, staleDate: nil)
        await activity.end(content, dismissalPolicy: .immediate)
        self.currentActivity = nil
        resolve(["success": true])
      }
    } else {
      resolve(["success": true])
    }
  }

  @objc
  func isActivityRunning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      let isRunning = currentActivity != nil && currentActivity?.activityState == .active
      resolve(["isRunning": isRunning])
    } else {
      resolve(["isRunning": false])
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
