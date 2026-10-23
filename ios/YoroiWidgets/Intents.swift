import AppIntents
import Foundation
import WidgetKit

// Boutons interactifs (iOS 17) : l'eau s'ajoute sans ouvrir l'app.
// L'action va dans la file partagee (App Group) avec un id ; le widget l'affiche tout de suite,
// l'app l'applique a son prochain lancement ou retour au premier plan (lib/v2/montre/actions.ts).

enum EauWidget {
  static func ajouter(_ signe: Double) {
    let etat = EtatYoroi.lire()
    let verre = etat.verre > 0 ? etat.verre : 250
    if signe < 0 && etat.eauMl <= 0 { return }
    let delta = signe < 0 ? -min(verre, etat.eauMl) : verre
    GroupeYoroi.ajouterAction(GroupeYoroi.actionEau(deltaMl: delta))
    WidgetCenter.shared.reloadAllTimelines()
  }
}

struct AjouterVerreIntent: AppIntent {
  static let title: LocalizedStringResource = "Ajouter un verre d'eau"
  static let description = IntentDescription("Ajoute un verre à ton eau du jour dans Yoroi.")

  func perform() async throws -> some IntentResult {
    EauWidget.ajouter(1)
    return .result()
  }
}

struct RetirerVerreIntent: AppIntent {
  static let title: LocalizedStringResource = "Retirer un verre d'eau"
  static let description = IntentDescription("Retire un verre de ton eau du jour dans Yoroi.")

  func perform() async throws -> some IntentResult {
    EauWidget.ajouter(-1)
    return .result()
  }
}

/// Centre de controle (iOS 18) : ouvre le chrono rounds de l'app avec ton dernier reglage
@available(iOS 18.0, *)
struct OuvrirChronoIntent: AppIntent {
  static let title: LocalizedStringResource = "Ouvrir le chrono combat"
  static let description = IntentDescription("Ouvre le chrono rounds de Yoroi.")
  static let openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult & OpensIntent {
    // Double chemin : la cible est aussi laissee dans l'App Group, l'app la lit au premier plan
    // (module natif getPendingLink) si iOS n'ouvre pas le schema maison depuis le Centre de controle.
    // Les deux arrivent au meme endroit, l'app n'ouvre qu'un ecran (doublon ignore 3 s).
    GroupeYoroi.deposerLien(Liens.chrono.absoluteString)
    return .result(opensIntent: OpenURLIntent(Liens.chrono))
  }
}
