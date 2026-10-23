import SwiftUI
import WidgetKit

// Extension de widgets de la montre : complications et Smart Stack.
// Minuteurs : WidgetsMinuteurs.swift. Coeur, oxygene, repos et respiration : WidgetsSante.swift.
// Une seule liste, noms courts "Yoroi ..." : les anciennes complications ClockKit ne sont plus
// compilees (voir NettoyageComplications dans DelegueApp.swift).

@main
struct WidgetsMontre: WidgetBundle {
  // Deux sous-ensembles : un bloc de WidgetBundle accepte 10 widgets au plus.
  var body: some Widget {
    WidgetsSuivi().body
    WidgetsSanteMontre().body
  }
}

struct WidgetsSuivi: WidgetBundle {
  var body: some Widget {
    WidgetPoids()
    WidgetSemaine()
    WidgetEau()
    WidgetChrono()
    WidgetCombat()
    WidgetMinuteurs()
  }
}

struct WidgetsSanteMontre: WidgetBundle {
  var body: some Widget {
    WidgetCoeur()
    WidgetOxygene()
    WidgetCardio()
    WidgetRepos()
    WidgetRespiration()
  }
}

private let famillesToutes: [WidgetFamily] = [.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner]

struct WidgetPoids: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "yoroi.montre.poids", provider: FournisseurYoroi()) { e in
      VuePoidsWidget(entree: e)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://aujourdhui"))
    }
    .configurationDisplayName("Yoroi Poids")
    .description("Ton poids et ton écart au rythme prévu.")
    .supportedFamilies(famillesToutes)
  }
}

struct WidgetSemaine: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "yoroi.montre.semaine", provider: FournisseurYoroi()) { e in
      VueSemaineWidget(entree: e)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://semaine"))
    }
    .configurationDisplayName("Yoroi Semaine")
    .description("Tes séances de la semaine.")
    .supportedFamilies(famillesToutes)
  }
}

struct WidgetEau: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "yoroi.montre.eau", provider: FournisseurYoroi()) { e in
      VueEauWidget(entree: e)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://eau"))
    }
    .configurationDisplayName("Yoroi Eau")
    .description("Ce que tu as bu aujourd'hui.")
    .supportedFamilies(famillesToutes)
  }
}

struct WidgetChrono: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "yoroi.montre.chrono", provider: FournisseurYoroi()) { e in
      VueChronoWidget(entree: e)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://chrono"))
    }
    .configurationDisplayName("Yoroi Chrono")
    .description("Lance ton chrono de combat, rounds et repos.")
    .supportedFamilies(famillesToutes)
  }
}

struct WidgetCombat: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "yoroi.montre.combat", provider: FournisseurYoroi()) { e in
      VueCombatWidget(entree: e)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://combat"))
    }
    .configurationDisplayName("Yoroi Combat")
    .description("Les jours avant ton prochain combat.")
    .supportedFamilies(famillesToutes)
  }
}
