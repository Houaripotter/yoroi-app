import SwiftUI
import WidgetKit

// Vues des complications, par famille : ronde, rectangle (aussi Smart Stack), en ligne, coin.

private func titre(_ t: String) -> some View {
  Text(t)
    .font(.system(size: 13, weight: .semibold, design: .rounded))
    .foregroundStyle(Teinte.accent)
    .widgetAccentable()
}

private struct VideWidget: View {
  @Environment(\.widgetFamily) private var famille
  var texte: String = "Ouvre Yoroi sur ton iPhone"
  /// Texte de la famille en ligne (une seule ligne courte autour du cadran).
  var ligne: String = "Yoroi"

  var body: some View {
    switch famille {
    case .accessoryInline:
      Text(ligne)
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Torii().padding(9)
      }
    case .accessoryCorner:
      Torii()
        .widgetLabel("Yoroi")
    default:
      HStack(spacing: 6) {
        Torii().frame(width: 22)
        Text(texte)
          .font(.system(size: 14, design: .rounded))
          .lineLimit(2)
          .minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

// MARK: Poids

struct VuePoidsWidget: View {
  let entree: EntreeYoroi
  @Environment(\.widgetFamily) private var famille

  var body: some View {
    if let c = entree.contexte, let d = c.poids.dernier {
      let livres = c.profil.enLivres
      let valeur = Format.poids(d.kg, livres: livres)
      let unite = Format.symbole(livres: livres)
      let couleur = Teinte.statut(c.poids.statut)
      let ecart = c.poids.ecart.map { Format.ecart($0, livres: livres) }
      switch famille {
      case .accessoryInline:
        Text(ecart.map { "\(valeur) \(unite), \($0)" } ?? "\(valeur) \(unite)")
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          VStack(spacing: -1) {
            Text(valeur)
              .font(.chiffre(15))
              .lineLimit(1)
              .minimumScaleFactor(0.6)
            if let ecart {
              Text(ecart)
                .font(.chiffre(11))
                .foregroundStyle(couleur)
                .widgetAccentable()
            } else {
              Text(unite).font(.system(size: 10, design: .rounded))
            }
          }
          .padding(2)
        }
      case .accessoryCorner:
        Text(valeur)
          .font(.chiffre(15))
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .widgetLabel {
            Text(ecart.map { "\($0) \(unite)" } ?? unite)
          }
      default:
        VStack(alignment: .leading, spacing: 1) {
          HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text(valeur).font(.chiffre(22))
            Text(unite).font(.system(size: 12, design: .rounded)).foregroundStyle(Teinte.texteDoux)
            Spacer(minLength: 2)
            if let ecart {
              Text(ecart)
                .font(.chiffre(14))
                .foregroundStyle(couleur)
                .widgetAccentable()
            }
          }
          if c.poids.serie30.count > 1 {
            MiniCourbe(serie: c.poids.serie30, ligne: c.poids.ligne30, couleurSerie: Teinte.texte, couleurLigne: Teinte.accent, epaisseur: 1.5)
              .frame(height: 22)
          } else if let a = c.poids.arrivee {
            Text("Arrivée du \(Format.jourCourt(a.du)) au \(Format.jourCourt(a.au))")
              .font(.system(size: 12, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    } else {
      VideWidget()
    }
  }
}

// MARK: Semaine

struct VueSemaineWidget: View {
  let entree: EntreeYoroi
  @Environment(\.widgetFamily) private var famille

  var body: some View {
    if let c = entree.contexte {
      let s = c.semaine
      let objectif = s.objectif ?? 0
      let haut = Double(max(1, objectif, s.faites))
      switch famille {
      case .accessoryInline:
        Text(objectif > 0
          ? "\(s.faites) \(s.faites > 1 ? "séances" : "séance") sur \(objectif)"
          : "\(s.faites) \(s.faites > 1 ? "séances" : "séance") cette semaine")
      case .accessoryCircular:
        if objectif > 0 {
          Gauge(value: min(Double(s.faites), haut), in: 0...haut) {
            Image(systemName: "figure.martial.arts")
          } currentValueLabel: {
            Text("\(s.faites)").font(.chiffre(19, .bold)).foregroundStyle(Teinte.texte)
          } minimumValueLabel: {
            Text("0").font(.chiffre(9, .semibold)).foregroundStyle(Teinte.texteDoux)
          } maximumValueLabel: {
            Text("\(objectif)").font(.chiffre(9, .semibold)).foregroundStyle(Teinte.texteDoux)
          }
          .gaugeStyle(.accessoryCircular)
          .tint(Teinte.degradeSemaine)
          .widgetAccentable()
        } else {
          Gauge(value: Double(s.faites), in: 0...haut) {
            Text("Sem.")
          } currentValueLabel: {
            Text("\(s.faites)").font(.chiffre(19, .bold)).foregroundStyle(Teinte.texte)
          }
          .gaugeStyle(.accessoryCircular)
          .tint(Teinte.degradeSemaine)
          .widgetAccentable()
        }
      case .accessoryCorner:
        Text("\(s.faites)")
          .font(.chiffre(18))
          .widgetLabel {
            Gauge(value: Double(s.faites), in: 0...haut) {
              Text("Séances")
            }
            .tint(Teinte.degradeSemaine)
          }
      default:
        VStack(alignment: .leading, spacing: 4) {
          HStack(alignment: .firstTextBaseline) {
            titre("Ta semaine")
            Spacer()
            Text(objectif > 0 ? "\(s.faites) sur \(objectif)" : "\(s.faites)")
              .font(.chiffre(16))
          }
          HStack(spacing: 4) {
            ForEach(0..<7, id: \.self) { i in
              Circle()
                .fill(i < s.jours.count && s.jours[i] ? Teinte.accent : Teinte.texte.opacity(0.25))
                .frame(width: 12, height: 12)
                .frame(maxWidth: .infinity)
            }
          }
          .widgetAccentable()
        }
      }
    } else {
      VideWidget()
    }
  }
}

// MARK: Eau

struct VueEauWidget: View {
  let entree: EntreeYoroi
  @Environment(\.widgetFamily) private var famille

  var body: some View {
    if let c = entree.contexte {
      let e = c.eau
      let objectif = e.objectif ?? 0
      let haut = max(1, objectif, e.ml)
      switch famille {
      case .accessoryInline:
        Text(objectif > 0 ? "Eau \(Format.eau(e.ml)) sur \(Format.eau(objectif))" : "Eau \(Format.eau(e.ml))")
      case .accessoryCircular:
        Gauge(value: min(e.ml, haut), in: 0...haut) {
          Image(systemName: "drop.fill")
        } currentValueLabel: {
          Text(e.ml >= 1000 ? Format.decimal(e.ml / 1000) : Format.entier(e.ml))
            .font(.chiffre(15, .bold))
            .foregroundStyle(Teinte.texte)
            .minimumScaleFactor(0.7)
        }
        .gaugeStyle(.accessoryCircular)
        .tint(Teinte.degradeEau)
        .widgetAccentable()
      case .accessoryCorner:
        Image(systemName: "drop.fill")
          .font(.system(size: 18))
          .widgetLabel {
            Gauge(value: min(e.ml, haut), in: 0...haut) {
              Text("Eau")
            }
            .tint(Teinte.degradeEau)
          }
      default:
        VStack(alignment: .leading, spacing: 4) {
          HStack(alignment: .firstTextBaseline) {
            titre("Eau")
            Spacer()
            Text(Format.eau(e.ml)).font(.chiffre(16))
          }
          if objectif > 0 {
            Gauge(value: e.ml, in: 0...haut) {
              Text("Eau")
            } currentValueLabel: {
              Text("sur \(Format.eau(objectif))")
            }
            .gaugeStyle(.accessoryLinear)
            .tint(Teinte.degradeEau)
          }
        }
      }
    } else {
      VideWidget()
    }
  }
}

// MARK: Chrono

struct VueChronoWidget: View {
  let entree: EntreeYoroi
  @Environment(\.widgetFamily) private var famille

  var body: some View {
    switch famille {
    case .accessoryInline:
      Label("Chrono combat", systemImage: "figure.boxing")
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "figure.boxing")
          .font(.system(size: 22, weight: .semibold))
          .foregroundStyle(Teinte.accent)
          .widgetAccentable()
      }
    case .accessoryCorner:
      Image(systemName: "figure.boxing")
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(Teinte.accent)
        .widgetAccentable()
        .widgetLabel("Chrono")
    default:
      HStack(spacing: 8) {
        Image(systemName: "figure.boxing")
          .font(.system(size: 26, weight: .semibold))
          .foregroundStyle(Teinte.accent)
          .widgetAccentable()
        VStack(alignment: .leading, spacing: 1) {
          Text("Chrono combat")
            .font(.system(size: 15, weight: .semibold, design: .rounded))
          Text(entree.dernierChrono ?? "Rounds et repos")
            .font(.system(size: 13, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .lineLimit(1)
        }
        Spacer(minLength: 0)
      }
    }
  }
}

// MARK: Combat

struct VueCombatWidget: View {
  let entree: EntreeYoroi
  @Environment(\.widgetFamily) private var famille

  var body: some View {
    if let c = entree.contexte, let combat = c.combat, let j = combat.joursRestants(depuis: entree.date), j >= 0 {
      let livres = c.profil.enLivres
      switch famille {
      case .accessoryInline:
        Text(j == 0 ? "Combat aujourd'hui" : "Combat dans \(j) j")
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          VStack(spacing: -2) {
            Text(j == 0 ? "Jour" : "\(j)")
              .font(.chiffre(j == 0 ? 14 : 20))
            Text(j == 0 ? "J" : (j > 1 ? "jours" : "jour"))
              .font(.system(size: 10, design: .rounded))
          }
        }
      case .accessoryCorner:
        Text(j == 0 ? "J" : "\(j)")
          .font(.chiffre(18))
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          // Libelle court : le coin coupe vite un texte long le long du bord.
          .widgetLabel(j == 0 ? "Combat" : (j > 1 ? "jours avant combat" : "jour avant combat"))
      default:
        VStack(alignment: .leading, spacing: 2) {
          HStack(alignment: .firstTextBaseline) {
            titre("Combat")
            Spacer()
            Text(j == 0 ? "Aujourd'hui" : "dans \(j) j")
              .font(.chiffre(16))
          }
          if let e = combat.ecartKg, e > 0.05 {
            Text("Encore \(Format.poids(e, livres: livres)) \(Format.symbole(livres: livres)) à faire")
              .font(.system(size: 13, design: .rounded))
              .foregroundStyle(Teinte.orange)
          } else if let cat = combat.categorieKg {
            Text("Catégorie \(Format.poids(cat, livres: livres)) \(Format.symbole(livres: livres))")
              .font(.system(size: 13, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
      }
    } else {
      VideWidget(texte: "Aucun combat prévu", ligne: "Aucun combat prévu")
    }
  }
}

// MARK: Apercus Xcode (debug seulement, donnees d'exemple jamais affichees sur la montre)

#if DEBUG
private let entreeExemple = EntreeYoroi(date: .now, contexte: FournisseurYoroi.exemple(.now), dernierChrono: "Boxe")

#Preview("Poids", as: .accessoryRectangular) {
  WidgetPoids()
} timeline: {
  entreeExemple
  EntreeYoroi.apercu
}

#Preview("Semaine", as: .accessoryCircular) {
  WidgetSemaine()
} timeline: {
  entreeExemple
}

#Preview("Eau", as: .accessoryRectangular) {
  WidgetEau()
} timeline: {
  entreeExemple
}

#Preview("Chrono", as: .accessoryCircular) {
  WidgetChrono()
} timeline: {
  entreeExemple
}

#Preview("Combat", as: .accessoryRectangular) {
  WidgetCombat()
} timeline: {
  entreeExemple
  EntreeYoroi.apercu
}
#endif
