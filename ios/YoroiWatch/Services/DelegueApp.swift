import Foundation
import UserNotifications
import WatchKit
#if canImport(ClockKit)
import ClockKit
#endif

// Delegue watchOS :
// - relance l'observation d'Apple Sante a chaque demarrage (y compris quand watchOS reveille
//   l'app pour une nouvelle mesure) et rafraichit coeur et oxygene en tache de fond environ toutes les 30 min ;
// - delegue des notifications : demande l'autorisation au premier lancement, enregistre les actions
//   Arreter et Relancer, et laisse la notification de fin sonner quand l'app est encore au premier plan
//   mais poignet baisse (sans delegue, watchOS ne l'affiche pas et rien ne sonne).

final class DelegueApp: NSObject, WKApplicationDelegate, UNUserNotificationCenterDelegate {
  func applicationDidFinishLaunching() {
    MinuteurMoteur.configurerNotifications(delegue: self)
    SanteCardio.shared.demarrerObservation()
    DelegueApp.planifierRafraichissement()
  }

  func applicationDidBecomeActive() {
    DelegueApp.planifierRafraichissement()
  }

  func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    for tache in backgroundTasks {
      if let rafraichir = tache as? WKApplicationRefreshBackgroundTask {
        Task {
          await SanteCardio.shared.actualiser(force: true)
          DelegueApp.planifierRafraichissement()
          rafraichir.setTaskCompletedWithSnapshot(false)
        }
      } else {
        tache.setTaskCompletedWithSnapshot(false)
      }
    }
  }

  /// watchOS relance l'app pour la session d'alarme d'un minuteur planifiee avec start(at:).
  /// Le delegue doit etre pose ici, sinon watchOS ferme la session.
  func handle(_ extendedRuntimeSession: WKExtendedRuntimeSession) {
    MinuteurMoteur.shared.adopter(extendedRuntimeSession)
  }

  static func planifierRafraichissement() {
    let quand = Date().addingTimeInterval(30 * 60)
    WKApplication.shared().scheduleBackgroundRefresh(withPreferredDate: quand, userInfo: nil) { _ in }
  }

  // MARK: UNUserNotificationCenterDelegate

  /// Notification qui arrive alors que l'app est au premier plan.
  /// Ecran allume et app sous les yeux : l'app sonne deja elle meme, on n'affiche rien.
  /// Poignet baisse ou ecran en veille : bandeau, son et vibration.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    DispatchQueue.main.async {
      if WKApplication.shared().applicationState == .active {
        MinuteurMoteur.shared.resynchroniser()
        completionHandler([])
      } else {
        completionHandler([.banner, .sound, .list])
      }
    }
  }

  /// Toucher la notification, Arreter, Relancer ou Fermer.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let requete = response.notification.request
    let identifiant = requete.identifier
    let action = response.actionIdentifier
    let duree = requete.content.userInfo[MinuteurMoteur.cleDuree] as? Int
    DispatchQueue.main.async {
      if identifiant.hasPrefix(MinuteurMoteur.prefixeNotif) {
        MinuteurMoteur.shared.reponseNotification(identifiant: identifiant, action: action, dureeS: duree)
      }
      completionHandler()
    }
  }
}

// MARK: Menage des anciennes complications

#if canImport(ClockKit)
/// Ancienne source ClockKit, gardee seulement pour le menage (CLKComplicationPrincipalClass dans Info.plist).
/// L'ancienne app montre declarait 18 complications ClockKit (FC, SpO2, Timer YOROI, Rang YOROI, Pas...).
/// Leur fichier n'est plus compile, mais watchOS garde leur liste en cache : elles restaient proposees
/// a cote des nouvelles. Ici :
/// - aucune complication ClockKit n'est plus declaree (liste vide) : watchOS vide son cache ;
/// - les cadrans qui en portaient une passent a la complication WidgetKit equivalente quand elle existe.
@objc(NettoyageComplications)
final class NettoyageComplications: NSObject, CLKComplicationDataSource, CLKComplicationWidgetMigrator {
  private static let extensionWidgets = "com.houari.yoroi.watchkitapp.widgets"

  /// Ancien identifiant ClockKit vers le kind WidgetKit qui le remplace.
  private static let correspondances: [String: String] = [
    "yoroi.heartrate": GenreWidget.coeur,
    "yoroi.hrzone": GenreWidget.coeur,
    "yoroi.spo2": GenreWidget.oxygene,
    "yoroi.timer": GenreWidget.minuteurs,
    "yoroi.weight": GenreWidget.poids,
    "yoroi.hydration": GenreWidget.eau,
    "yoroi.sparring": GenreWidget.semaine,
    "yoroi.trainingload": GenreWidget.semaine,
    "yoroi.nextcompetition": GenreWidget.combat,
    "yoroi.restinghr": GenreWidget.repos,
    "yoroi.respiratory": GenreWidget.respiration,
  ]

  func getComplicationDescriptors(handler: @escaping ([CLKComplicationDescriptor]) -> Void) {
    handler([])
  }

  func getCurrentTimelineEntry(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void) {
    handler(nil)
  }

  var widgetMigrator: CLKComplicationWidgetMigrator { self }

  func widgetConfiguration(from complicationDescriptor: CLKComplicationDescriptor) async -> CLKComplicationWidgetMigrationConfiguration? {
    guard let kind = NettoyageComplications.correspondances[complicationDescriptor.identifier] else { return nil }
    return CLKComplicationStaticWidgetMigrationConfiguration(kind: kind, extensionBundleIdentifier: NettoyageComplications.extensionWidgets)
  }
}
#endif
