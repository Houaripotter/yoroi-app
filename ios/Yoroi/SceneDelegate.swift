import UIKit

/// Minimal SceneDelegate required by iOS 13+ scene lifecycle.
/// Its sole job: associate the UIWindow (created by React Native in AppDelegate)
/// with the UIWindowScene so it becomes visible.
/// Without this, implementing `configurationForConnecting` activates scene mode but
/// leaves the window without a scene → black screen.
@available(iOS 13.0, *)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    // The React Native window was already created and set up in AppDelegate.
    // We just need to attach it to this scene so UIKit shows it.
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate,
       let window = appDelegate.window {
      window.windowScene = windowScene
    }
  }
}
