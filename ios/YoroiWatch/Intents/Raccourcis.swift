import AppIntents
import Foundation

// App Intents (watchOS 10) : Siri, Smart Stack, bouton Action de l'Ultra (via Raccourcis).
// Minuteurs : « Lance un minuteur de 1 min 30 dans Yoroi ».

struct DemarrerChronoIntent: AppIntent {
  static var title: LocalizedStringResource = "Démarrer le chrono"
  static var description = IntentDescription("Ouvre le chrono combat sur ton dernier réglage.")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    Routeur.shared.ouvrirChrono()
    return .result()
  }
}

struct NoterPoidsIntent: AppIntent {
  static var title: LocalizedStringResource = "Noter mon poids"
  static var description = IntentDescription("Ouvre la pesée à la couronne.")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    Routeur.shared.ouvrir(.peser)
    return .result()
  }
}

struct NoterVerreIntent: AppIntent {
  static var title: LocalizedStringResource = "Noter un verre d'eau"
  static var description = IntentDescription("Ajoute un verre à ton eau du jour, de la taille choisie dans Yoroi.")
  static var openAppWhenRun: Bool = false

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let synchro = Synchro.shared
    synchro.demarrer()
    await synchro.changerEau(signe: 1)
    let total = Format.eau(synchro.contexte.eau.ml)
    return .result(dialog: "Verre noté, \(total) aujourd'hui.")
  }
}

/// Durees proposees a Siri et au bouton Action.
enum DureeMinuteur: String, AppEnum {
  case s15 = "15"
  case s30 = "30"
  case s45 = "45"
  case m1 = "60"
  case m1_30 = "90"
  case m2 = "120"
  case m3 = "180"
  case m5 = "300"
  case m10 = "600"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Durée"

  static var caseDisplayRepresentations: [DureeMinuteur: DisplayRepresentation] = [
    .s15: "15 s",
    .s30: "30 s",
    .s45: "45 s",
    .m1: "1 min",
    .m1_30: "1 min 30",
    .m2: "2 min",
    .m3: "3 min",
    .m5: "5 min",
    .m10: "10 min",
  ]

  var secondes: Int { Int(rawValue) ?? 60 }
}

struct LancerMinuteurIntent: AppIntent {
  static var title: LocalizedStringResource = "Lancer un minuteur"
  static var description = IntentDescription("Lance tout de suite un minuteur de repos sur ta montre.")
  static var openAppWhenRun: Bool = true

  @Parameter(title: "Durée", default: .m1_30)
  var duree: DureeMinuteur

  static var parameterSummary: some ParameterSummary {
    Summary("Lancer un minuteur de \(\.$duree)")
  }

  init() {}

  init(duree: DureeMinuteur) {
    self.duree = duree
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    Routeur.shared.lancerMinuteur(secondes: duree.secondes)
    return .result()
  }
}

struct OuvrirMinuteursIntent: AppIntent {
  static var title: LocalizedStringResource = "Ouvrir les minuteurs"
  static var description = IntentDescription("Ouvre tes minuteurs de repos, ou celui qui tourne.")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    Routeur.shared.ouvrirMinuteurs()
    return .result()
  }
}

struct RaccourcisYoroi: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: DemarrerChronoIntent(),
      phrases: [
        "Démarrer le chrono \(.applicationName)",
        "Lance le chrono \(.applicationName)",
      ],
      shortTitle: "Démarrer le chrono",
      systemImageName: "timer"
    )
    AppShortcut(
      intent: NoterPoidsIntent(),
      phrases: [
        "Noter mon poids dans \(.applicationName)",
        "Pesée \(.applicationName)",
      ],
      shortTitle: "Noter mon poids",
      systemImageName: "scalemass"
    )
    AppShortcut(
      intent: NoterVerreIntent(),
      phrases: [
        "Noter un verre d'eau dans \(.applicationName)",
        "Un verre d'eau \(.applicationName)",
      ],
      shortTitle: "Noter un verre d'eau",
      systemImageName: "drop.fill"
    )
    AppShortcut(
      intent: LancerMinuteurIntent(),
      phrases: [
        "Lance un minuteur de \(\.$duree) dans \(.applicationName)",
        "Minuteur de \(\.$duree) \(.applicationName)",
        "Lance un minuteur \(.applicationName)",
      ],
      shortTitle: "Lancer un minuteur",
      systemImageName: "hourglass"
    )
    AppShortcut(
      intent: OuvrirMinuteursIntent(),
      phrases: [
        "Ouvre les minuteurs \(.applicationName)",
        "Mes minuteurs \(.applicationName)",
      ],
      shortTitle: "Minuteurs",
      systemImageName: "timer"
    )
  }
}
