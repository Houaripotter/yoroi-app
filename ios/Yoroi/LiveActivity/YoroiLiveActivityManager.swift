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
      let activityName = data["activityName"] as? String ?? "Timer"
      let elapsedSeconds = data["elapsedSeconds"] as? Int ?? 0
      let isRunning = data["isRunning"] as? Bool ?? true

      let attributes = TimerAttributes(activityName: activityName)
      let state = TimerAttributes.ContentState(
        elapsedSeconds: elapsedSeconds,
        isRunning: isRunning,
        heartRate: data["heartRate"] as? Int
      )

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
        reject("NO_ACTIVITY", "No active Live Activity", nil)
        return
      }

      let currentState = activity.content.state
      let elapsedSeconds = data["elapsedSeconds"] as? Int ?? currentState.elapsedSeconds
      let isRunning = data["isRunning"] as? Bool ?? currentState.isRunning
      let heartRate = data["heartRate"] as? Int ?? currentState.heartRate

      let newState = TimerAttributes.ContentState(
        elapsedSeconds: elapsedSeconds,
        isRunning: isRunning,
        heartRate: heartRate
      )

      Task {
        let content = ActivityContent(state: newState, staleDate: nil)
        await activity.update(content)
        resolve(["success": true])
      }
    } else {
      reject("UNAVAILABLE", "iOS 16.2+ required", nil)
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
        let finalState = TimerAttributes.ContentState(
          elapsedSeconds: activity.content.state.elapsedSeconds,
          isRunning: false,
          heartRate: nil
        )
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
