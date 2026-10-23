import AppIntents
import SwiftUI
import WidgetKit

// Centre de controle, ecran verrouille et bouton Action (iOS 18) :
// « Chrono combat » ouvre le chrono rounds, « + 1 verre » ajoute un verre sans ouvrir l'app.

@available(iOS 18.0, *)
struct ControleChrono: ControlWidget {
  static let kind = "com.houari.yoroi.widgets.controle.chrono"

  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: Self.kind) {
      ControlWidgetButton(action: OuvrirChronoIntent()) {
        Label("Chrono combat", systemImage: "stopwatch")
      }
    }
    .displayName("Chrono combat")
    .description("Ouvre ton chrono rounds dans Yoroi.")
  }
}

@available(iOS 18.0, *)
struct ControleVerre: ControlWidget {
  static let kind = "com.houari.yoroi.widgets.controle.verre"

  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: Self.kind) {
      ControlWidgetButton(action: AjouterVerreIntent()) {
        Label("+ 1 verre", systemImage: "drop.fill")
      }
    }
    .displayName("+ 1 verre")
    .description("Ajoute un verre à ton eau du jour.")
  }
}
