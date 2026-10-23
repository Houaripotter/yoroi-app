import SwiftUI
import WidgetKit

// Extension de widgets iPhone et iPad de Yoroi (iOS 17 et plus).
// Donnees : l'instantane ecrit par l'app dans l'App Group group.com.houari.yoroi.

@main
struct YoroiWidgetsBundle: WidgetBundle {
  var body: some Widget {
    WidgetPoids()
    WidgetSemaine()
    WidgetEau()
    WidgetCombat()
    WidgetChrono()
    WidgetTableau()
    ActiviteChrono()
    if #available(iOS 18.0, *) {
      ControleChrono()
      ControleVerre()
    }
  }
}
