internal import Expo
internal import React
internal import ReactAppDependencyProvider
import UserNotifications
import AVFoundation

@UIApplicationMain
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    // Enregistrer le délégué de notifications pour intercepter les alarmes timer
    UNUserNotificationCenter.current().delegate = self

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

// MARK: - Notification delegate : flash + vibration à la réception de l'alarme timer
extension AppDelegate: UNUserNotificationCenterDelegate {

  /// Appelé quand une notification arrive PENDANT que l'app est au premier plan
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let data = notification.request.content.userInfo
    if let type = data["type"] as? String, type == "timer_finished" {
      flashAlarm()
    }
    completionHandler([.banner, .sound, .badge])
  }

  /// Appelé quand l'utilisateur tape sur la notification (app en veille/fond)
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let data = response.notification.request.content.userInfo
    if let type = data["type"] as? String, type == "timer_finished" {
      flashAlarm()
    }
    completionHandler()
  }

  /// Flash stroboscopique : 6 clignotements de 250ms
  private func flashAlarm() {
    guard let device = AVCaptureDevice.default(for: .video),
          device.hasTorch else { return }
    var count = 0
    Timer.scheduledTimer(withTimeInterval: 0.22, repeats: true) { timer in
      do {
        try device.lockForConfiguration()
        device.torchMode = (count % 2 == 0) ? .on : .off
        device.unlockForConfiguration()
      } catch {}
      count += 1
      if count >= 12 {
        timer.invalidate()
        try? device.lockForConfiguration()
        device.torchMode = .off
        device.unlockForConfiguration()
      }
    }
  }
}

// MARK: -
class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
