import UIKit

/// Minimal SceneDelegate required by iOS 13+ scene lifecycle.
/// Its first job: associate the UIWindow (created by React Native in AppDelegate)
/// with the UIWindowScene so it becomes visible.
/// Without this, implementing `configurationForConnecting` activates scene mode but
/// leaves the window without a scene → black screen.
///
/// Liens (widgets, Centre de controle, raccourcis, Live Activity) : avec les scenes, iOS ne passe plus
/// les URL a `application(_:open:options:)` de l'AppDelegate mais a la scene. Sans les deux fonctions
/// ci-dessous, le lien etait perdu et l'app s'ouvrait simplement sur l'Accueil.
///  - app deja lancee : `scene(_:openURLContexts:)` relaie l'URL a l'AppDelegate (Expo puis React Native Linking) ;
///  - demarrage a froid : l'URL arrive dans `connectionOptions` alors que React Native n'est pas pret,
///    elle attend dans l'App Group et l'app la lit au premier plan (lib/v2/widgets/LiensWidgets.tsx).
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

    // Demarrage a froid par un lien : il attend que l'app soit prete
    if let url = connectionOptions.urlContexts.first?.url {
      GroupeYoroi.deposerLien(url.absoluteString)
    }
    // Demarrage a froid par une activite (lien universel) : meme chemin, avec son adresse web
    if let activite = connectionOptions.userActivities.first,
       activite.activityType == NSUserActivityTypeBrowsingWeb,
       let web = activite.webpageURL {
      GroupeYoroi.deposerLien(web.absoluteString)
    }
  }

  /// App deja lancee : le lien passe par l'AppDelegate, comme avant les scenes
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let contexte = URLContexts.first,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let source = contexte.options.sourceApplication {
      options[.sourceApplication] = source
    }
    if let annotation = contexte.options.annotation {
      options[.annotation] = annotation
    }
    _ = appDelegate.application(UIApplication.shared, open: contexte.url, options: options)
  }

  /// Lien universel avec l'app deja lancee
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
