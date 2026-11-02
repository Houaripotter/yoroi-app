import SwiftUI
import UIKit
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
  var texte: String = NSLocalizedString("Ouvre Yoroi sur ton iPhone", comment: "")
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
          VStack(spacing: 0) {
            Torii(couleur: Teinte.torii)
              .frame(width: 14, height: 12)
              .widgetAccentable()
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
        // 28 octobre 2026, direction B : le torii dans son rond, le poids, et le prochain palier
        HStack(spacing: 8) {
          ZStack {
            Circle().fill(Teinte.torii.opacity(0.22))
            Torii(couleur: Teinte.torii).padding(9)
          }
          .frame(width: 40, height: 40)
          .widgetAccentable()
          VStack(alignment: .leading, spacing: 0) {
            Text(NSLocalizedString("Poids", comment: "").uppercased())
              .font(.system(size: 11, weight: .heavy, design: .rounded))
              .tracking(1.2)
              .foregroundStyle(Teinte.torii)
              .widgetAccentable()
            HStack(alignment: .firstTextBaseline, spacing: 3) {
              Text("\(valeur) \(unite)").font(.chiffre(19, .heavy))
              Spacer(minLength: 2)
              if let ecart, c.poids.palier != nil {
                Text(ecart)
                  .font(.chiffre(12, .bold))
                  .foregroundStyle(couleur)
              }
            }
            if let p = c.poids.palier {
              Text(p.dernier
                ? String(format: NSLocalizedString("Ton cap dans %@", comment: ""), "\(Format.poidsCourt(p.reste, livres: livres)) \(unite)")
                : String(format: NSLocalizedString("Palier %@ dans %@", comment: ""), Format.poidsCourt(p.kg, livres: livres), "\(Format.poidsCourt(p.reste, livres: livres)) \(unite)"))
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(Teinte.texteDoux)
            } else if let ecart {
              Text("\(ecart) \(unite)")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(couleur)
            }
          }
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          Spacer(minLength: 0)
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
        let cle: String = objectif > 0
          ? (s.faites > 1 ? "%@ séances sur %@" : "%@ séance sur %@")
          : (s.faites > 1 ? "%@ séances cette semaine" : "%@ séance cette semaine")
        let ligne: String = String(format: NSLocalizedString(cle, comment: ""), "\(s.faites)", "\(objectif)")
        Text(ligne)
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
            titre(NSLocalizedString("Ta semaine", comment: ""))
            Spacer()
            Text(objectif > 0 ? String(format: NSLocalizedString("%@ sur %@", comment: ""), "\(s.faites)", "\(objectif)") : "\(s.faites)")
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
        Text(objectif > 0 ? String(format: NSLocalizedString("Eau %@ sur %@", comment: ""), "\(Format.eau(e.ml))", "\(Format.eau(objectif))") : String(format: NSLocalizedString("Eau %@", comment: ""), "\(Format.eau(e.ml))"))
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
            titre(NSLocalizedString("Eau", comment: ""))
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
          Text(entree.dernierChrono ?? NSLocalizedString("Rounds et repos", comment: ""))
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
        Text(j == 0 ? NSLocalizedString("Combat aujourd'hui", comment: "") : String(format: NSLocalizedString("Combat dans %@ j", comment: ""), "\(j)"))
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          VStack(spacing: -2) {
            Text(j == 0 ? NSLocalizedString("Jour", comment: "") : "\(j)")
              .font(.chiffre(j == 0 ? 14 : 20))
            Text(j == 0 ? NSLocalizedString("J", comment: "") : (j > 1 ? NSLocalizedString("jours", comment: "") : NSLocalizedString("jour", comment: "")))
              .font(.system(size: 10, design: .rounded))
          }
        }
      case .accessoryCorner:
        Text(j == 0 ? NSLocalizedString("J", comment: "") : "\(j)")
          .font(.chiffre(18))
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          // Libelle court : le coin coupe vite un texte long le long du bord.
          .widgetLabel(j == 0 ? NSLocalizedString("Combat", comment: "") : (j > 1 ? NSLocalizedString("jours avant combat", comment: "") : NSLocalizedString("jour avant combat", comment: "")))
      default:
        VStack(alignment: .leading, spacing: 2) {
          HStack(alignment: .firstTextBaseline) {
            titre(NSLocalizedString("Combat", comment: ""))
            Spacer()
            Text(j == 0 ? NSLocalizedString("Aujourd'hui", comment: "") : String(format: NSLocalizedString("dans %@ j", comment: ""), "\(j)"))
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
      VideWidget(texte: NSLocalizedString("Aucun combat prévu", comment: ""), ligne: NSLocalizedString("Aucun combat prévu", comment: ""))
    }
  }
}


// MARK: Seance du jour (28 octobre 2026)

/// Ton personnage dans un rond (ou le torii tant que l'iPhone ne l'a pas envoye).
private struct RondPersonnage: View {
  var image: UIImage?
  var diametre: CGFloat
  var bord: Color

  var body: some View {
    ZStack {
      Circle().fill(Teinte.carte)
      if let image {
        Image(uiImage: image)
          .resizable()
          .scaledToFit()
          .frame(height: diametre * 2.1)
          .offset(y: diametre * 0.56)
      } else {
        Torii(couleur: Teinte.torii).padding(diametre * 0.25)
      }
    }
    .frame(width: diametre, height: diametre)
    .clipShape(Circle())
    .overlay(Circle().stroke(bord, lineWidth: 2))
  }
}

struct VueCoachWidget: View {
  let entree: EntreeYoroi
  @Environment(\.widgetFamily) private var famille

  private func icone(_ co: CoachCtx) -> String {
    if !co.aujourdhui { return "moon.zzz.fill" }
    switch co.genre {
    case "cardio": return "figure.run"
    case "rounds": return "figure.boxing"
    default: return "dumbbell.fill"
    }
  }

  var body: some View {
    if let c = entree.contexte, let co = c.coach {
      let caps = co.aujourdhui ? NSLocalizedString("Séance du jour", comment: "") : NSLocalizedString("Jour de repos", comment: "")
      let sous = co.aujourdhui || co.ensuite.isEmpty ? co.resume : co.ensuite
      switch famille {
      case .accessoryInline:
        Text(co.aujourdhui ? "\(co.titre), \(co.resume)" : NSLocalizedString("Jour de repos", comment: ""))
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          VStack(spacing: 0) {
            Image(systemName: icone(co))
              .font(.system(size: 15, weight: .bold))
              .foregroundStyle(Teinte.peche)
              .widgetAccentable()
            Text(co.minutes > 0 ? "\(co.minutes)" : "\(co.exos)")
              .font(.chiffre(15, .heavy))
            Text(co.minutes > 0 ? "min" : NSLocalizedString("exos", comment: ""))
              .font(.system(size: 9, weight: .bold, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
      case .accessoryCorner:
        Image(systemName: icone(co))
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(Teinte.peche)
          .widgetAccentable()
          .widgetLabel(co.titre)
      default:
        HStack(spacing: 8) {
          RondPersonnage(image: entree.personnage, diametre: 42, bord: Teinte.peche)
            .widgetAccentable()
          VStack(alignment: .leading, spacing: 0) {
            Text(caps.uppercased())
              .font(.system(size: 11, weight: .heavy, design: .rounded))
              .tracking(1.1)
              .foregroundStyle(Teinte.peche)
              .widgetAccentable()
            Text(co.titre)
              .font(.system(size: 16, weight: .heavy, design: .rounded))
            Text(sous)
              .font(.system(size: 12, weight: .semibold, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    } else {
      VideWidget(texte: NSLocalizedString("Choisis ton programme dans Yoroi", comment: ""), ligne: NSLocalizedString("Ton Coach", comment: ""))
    }
  }
}

// MARK: Rang et personnage (28 octobre 2026)

struct VueRangWidget: View {
  let entree: EntreeYoroi
  @Environment(\.widgetFamily) private var famille

  var body: some View {
    if let c = entree.contexte, let d = c.dojo {
      let xp = String(format: NSLocalizedString("%@ XP", comment: ""), Format.entier(Double(d.xp)))
      switch famille {
      case .accessoryInline:
        Text("\(d.rang), \(xp)")
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          Circle()
            .trim(from: 0, to: CGFloat(max(0.02, d.part)))
            .stroke(Teinte.lilas, style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .rotationEffect(.degrees(-90))
            .padding(2)
            .widgetAccentable()
          RondPersonnage(image: entree.personnage, diametre: 36, bord: Color.clear)
        }
      case .accessoryCorner:
        Text("\(d.rangIndex + 1)")
          .font(.chiffre(18, .heavy))
          .widgetLabel {
            Gauge(value: d.part, in: 0...1) {
              Text(d.rang)
            }
            .tint(Teinte.lilas)
          }
      default:
        HStack(spacing: 8) {
          ZStack {
            Circle().stroke(Teinte.piste, lineWidth: 4)
            Circle()
              .trim(from: 0, to: CGFloat(max(0.02, d.part)))
              .stroke(Teinte.lilas, style: StrokeStyle(lineWidth: 4, lineCap: .round))
              .rotationEffect(.degrees(-90))
              .widgetAccentable()
            RondPersonnage(image: entree.personnage, diametre: 34, bord: Color.clear)
          }
          .frame(width: 44, height: 44)
          VStack(alignment: .leading, spacing: 0) {
            Text(String(format: NSLocalizedString("%@, rang %@", comment: ""), d.rang, "\(d.rangIndex + 1)").uppercased())
              .font(.system(size: 11, weight: .heavy, design: .rounded))
              .tracking(1.1)
              .foregroundStyle(Teinte.lilas)
              .widgetAccentable()
            Text(xp)
              .font(.chiffre(17, .heavy))
            if let s = d.suivant, let x = d.xpSuivant {
              Text(String(format: NSLocalizedString("%@ à %@", comment: ""), s, Format.entier(Double(x))))
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(Teinte.texteDoux)
            }
          }
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    } else {
      VideWidget(texte: NSLocalizedString("Ouvre Yoroi sur ton iPhone", comment: ""), ligne: NSLocalizedString("Ton rang", comment: ""))
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
