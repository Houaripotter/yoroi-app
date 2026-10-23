import AppIntents
import WidgetKit

// Reglage d'un widget (iOS 17, appui long puis Modifier le widget) : son style.
// « Comme dans l'app » suit Reglages, Style des widgets (A tant que rien n'a change).

enum ChoixStyleW: String, AppEnum {
  case app
  case lanternes
  case rouleau
  case armure

  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Style"

  static let caseDisplayRepresentations: [ChoixStyleW: DisplayRepresentation] = [
    .app: "Comme dans l'app",
    .lanternes: "Nuit de lanternes",
    .rouleau: "Rouleau et encre",
    .armure: "Armure laquée",
  ]

  /// Le style a dessiner
  var style: StyleW {
    switch self {
    case .app: return StyleW.depuis(GroupeYoroi.lireStyle())
    case .lanternes: return .a
    case .rouleau: return .b
    case .armure: return .c
    }
  }
}

struct ConfigStyleIntent: WidgetConfigurationIntent {
  static let title: LocalizedStringResource = "Style du widget"
  static let description = IntentDescription("Choisis l'allure de ce widget.")

  @Parameter(title: "Style", default: .app)
  var style: ChoixStyleW

  init() {}
}
