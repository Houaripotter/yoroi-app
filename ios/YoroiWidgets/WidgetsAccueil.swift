import AppIntents
import SwiftUI
import WidgetKit

// Les widgets d'une idee chacun : Poids, Ta semaine, Eau, Combat, Chrono, dans le style choisi
// (A Nuit de lanternes par defaut, B Rouleau et encre, C Armure laquee).
// Ecran d'accueil (iPhone et iPad), ecran verrouille (seules les formes changent), StandBy, mode teinte (widgetAccentable).
// Les memes kind qu'avant : les widgets deja poses restent en place et prennent le style de l'app.

private let famillesVerrou: [WidgetFamily] = [.accessoryCircular, .accessoryRectangular, .accessoryInline]

/// Chiffres de l'ecran verrouille : serif pour le rouleau, arrondis sinon
func chiffreVerrou(_ style: StyleW, _ t: CGFloat) -> Font {
  .system(size: t, weight: .bold, design: style == .b ? .serif : .rounded).monospacedDigit()
}

private func legendeVerrou(_ t: CGFloat, _ g: Font.Weight = .medium) -> Font {
  .system(size: t, weight: g, design: .rounded)
}

// MARK: - Poids

struct WidgetPoids: Widget {
  let kind = "YoroiPoids"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .poids)) { e in
      VuePoids(entree: e)
    }
    .configurationDisplayName("Poids")
    .description("Ton poids, ton écart au rythme prévu et ta courbe de 30 jours.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge] + famillesVerrou)
  }
}

struct VuePoids: View {
  @Environment(\.widgetFamily) private var famille
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }
  private var decor: DecorW { famille == .systemMedium ? .moyen : (famille == .systemLarge ? .grand : .petit) }

  var body: some View {
    HabilleW(entree: entree, decor: decor) { pal in
      contenu(pal)
    }
    .widgetURL(Liens.poids)
  }

  @ViewBuilder private func contenu(_ pal: Palette) -> some View {
    if let d = etat.poids.dernier, etat.present {
      switch famille {
      case .accessoryInline:
        Text("Poids \(Fmt.poids(d.kg, etat.livres)) \(Fmt.unite(etat.livres))")
      case .accessoryCircular:
        RondW(style: entree.style) {
          VStack(spacing: 0) {
            Text(Fmt.poids(d.kg, etat.livres))
              .font(chiffreVerrou(entree.style, 16))
              .lineLimit(1)
              .minimumScaleFactor(0.5)
              .widgetAccentable()
            Text(Fmt.unite(etat.livres))
              .font(legendeVerrou(10))
          }
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Poids", comment: ""))
          HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("\(Fmt.poids(d.kg, etat.livres)) \(Fmt.unite(etat.livres))")
              .font(chiffreVerrou(entree.style, 20))
            Spacer(minLength: 2)
            if let ec = etat.poids.ecart {
              HStack(spacing: 2) {
                FlecheEcart(ecart: ec, taille: 10)
                Text(Fmt.ecart(ec, etat.livres))
                  .font(legendeVerrou(12, .bold))
              }
            }
          }
          if etat.poids.ecart != nil, let s = Textes.statut(etat.poids.statut) {
            Text(s).font(legendeVerrou(12))
          } else {
            Text(Fmt.jourRelatif(d.date, etat.maintenant)).font(legendeVerrou(12))
          }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity, alignment: .leading)
      case .systemMedium:
        moyen(pal, d)
      case .systemLarge:
        grand(pal, d)
      default:
        petit(pal, d)
      }
    } else {
      switch famille {
      case .accessoryInline:
        Text("Ouvre Yoroi pour commencer")
      case .accessoryCircular:
        RondW(style: entree.style) {
          Image(systemName: "scalemass")
            .font(.system(size: 18, weight: .semibold))
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 2) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Poids", comment: ""))
          Text("Ouvre Yoroi pour commencer").font(legendeVerrou(13)).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        VideW(pal: pal, titre: NSLocalizedString("Poids", comment: ""), compact: famille == .systemSmall)
      }
    }
  }

  /// Le trait sous le chiffre : pinceau (B) ou filet dore (C)
  @ViewBuilder private func soulignement(_ pal: Palette) -> some View {
    if pal.style == .b {
      TraitSous()
        .fill(pal.texte)
        .frame(height: 5)
        .padding(.trailing, 18)
    } else if pal.style == .c {
      LinearGradient(colors: [pal.titre, pal.titre.opacity(0)], startPoint: .leading, endPoint: .trailing)
        .frame(height: 1)
        .padding(.trailing, 30)
    }
  }

  private func petit(_ pal: Palette, _ d: DernierI) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      EnteteW(pal: pal, titre: NSLocalizedString("Poids", comment: ""), coin: Textes.jourDiscret(d.date, etat.maintenant))
      Spacer(minLength: 0)
      HStack(alignment: .top, spacing: 2) {
        GrosPoidsW(pal: pal, kg: d.kg, livres: etat.livres, taille: 40)
        if pal.style == .b && Textes.arriveeParts(etat) != nil {
          Spacer(minLength: 0)
          ToriiW(pal: pal, taille: 18)
        }
      }
      soulignement(pal)
      EcartW(pal: pal, etat: etat, taille: 15)
      StatutW(pal: pal, etat: etat, taille: 12)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func moyen(_ pal: Palette, _ d: DernierI) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      EnteteW(pal: pal, titre: NSLocalizedString("Poids", comment: ""), coin: Textes.jourDiscret(d.date, etat.maintenant))
      HStack(alignment: .center, spacing: 10) {
        VStack(alignment: .leading, spacing: 2) {
          GrosPoidsW(pal: pal, kg: d.kg, livres: etat.livres, taille: 38)
          EcartW(pal: pal, etat: etat, taille: 14)
          StatutW(pal: pal, etat: etat, taille: 12)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        CourbeW(pal: pal, serie: etat.poids.serie30, ligne: etat.poids.ligne30)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
      .frame(maxHeight: .infinity)
      ArriveeW(pal: pal, etat: etat, taille: 12)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func grand(_ pal: Palette, _ d: DernierI) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      EnteteW(pal: pal, titre: NSLocalizedString("Poids", comment: ""), coin: Textes.jourDiscret(d.date, etat.maintenant))
      HStack(alignment: .firstTextBaseline) {
        GrosPoidsW(pal: pal, kg: d.kg, livres: etat.livres, taille: 44)
        Spacer(minLength: 8)
        VStack(alignment: .trailing, spacing: 2) {
          EcartW(pal: pal, etat: etat, taille: 15)
          StatutW(pal: pal, etat: etat, taille: 12)
        }
      }
      CourbeW(pal: pal, serie: etat.poids.serie30, ligne: etat.poids.ligne30, epaisseur: 2.6)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      if let phrase = etat.poids.phrase {
        Text(phrase)
          .font(pal.legende(13, .medium))
          .foregroundStyle(pal.texte)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
          .fixedSize(horizontal: false, vertical: true)
      }
      ArriveeW(pal: pal, etat: etat, taille: 13)
      SeparateurW(pal: pal)
      Link(destination: Liens.seances) { LigneSemaineW(pal: pal, etat: etat, taillePoints: 12) }
      Link(destination: Liens.eau) { LigneEauW(pal: pal, etat: etat) }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

/// Coup de pinceau horizontal (sous le poids, style B)
struct TraitSous: Shape {
  func path(in r: CGRect) -> Path {
    let pts = TraitsW.densifier([CGPoint(x: r.minX + 1, y: r.midY + 0.6), CGPoint(x: r.midX, y: r.midY - 0.4), CGPoint(x: r.maxX - 1, y: r.midY + 0.3)], pas: 4)
    return TraitsW.pinceau(pts, epaisseur: r.height)
  }
}

// MARK: - Ta semaine

struct WidgetSemaine: Widget {
  let kind = "YoroiSemaine"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .semaine)) { e in
      VueSemaine(entree: e)
    }
    .configurationDisplayName("Ta semaine")
    .description("Tes séances de la semaine, du lundi au dimanche, vers ton objectif.")
    .supportedFamilies([.systemSmall, .systemMedium] + famillesVerrou)
  }
}

struct VueSemaine: View {
  @Environment(\.widgetFamily) private var famille
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }

  var body: some View {
    HabilleW(entree: entree, decor: famille == .systemMedium ? .moyen : .petit) { pal in
      contenu(pal)
    }
    .widgetURL(famille == .systemSmall ? Liens.seance : Liens.seances)
  }

  @ViewBuilder private func contenu(_ pal: Palette) -> some View {
    if etat.present {
      switch famille {
      case .accessoryInline:
        Text("Semaine \(Textes.semaine(etat))")
      case .accessoryCircular:
        RondW(style: entree.style, part: etat.objectifSemaine.map { Double(min(etat.faites, $0)) / Double(max(1, $0)) }) {
          VStack(spacing: 0) {
            Text("\(etat.faites)")
              .font(chiffreVerrou(entree.style, 18))
              .widgetAccentable()
            Text(etat.objectifSemaine.map { String(format: NSLocalizedString("sur %@", comment: ""), "\($0)") } ?? (etat.faites > 1 ? NSLocalizedString("séances", comment: "") : NSLocalizedString("séance", comment: "")))
              .font(legendeVerrou(9))
              .lineLimit(1)
              .minimumScaleFactor(0.6)
          }
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 3) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Ta semaine", comment: ""))
          Text(Textes.semaine(etat))
            .font(chiffreVerrou(entree.style, 17))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          PointsW(pal: pal, jours: etat.jours, aujourdhui: etat.rangAujourdhui, taille: entree.style == .b ? 12 : 9, lettres: false)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      case .systemMedium:
        moyen(pal)
      default:
        petit(pal)
      }
    } else {
      switch famille {
      case .accessoryInline:
        Text("Ouvre Yoroi pour commencer")
      case .accessoryCircular:
        RondW(style: entree.style) {
          Image(systemName: "calendar").font(.system(size: 18, weight: .semibold))
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 2) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Ta semaine", comment: ""))
          Text("Ouvre Yoroi pour commencer").font(legendeVerrou(13)).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        VideW(pal: pal, titre: NSLocalizedString("Ta semaine", comment: ""), compact: famille == .systemSmall)
      }
    }
  }

  private func chiffre(_ pal: Palette) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 5) {
      Text("\(etat.faites)")
        .font(pal.chiffre(38))
        .foregroundStyle(pal.texte)
        .widgetAccentable()
      Text(etat.objectifSemaine.map { String(format: NSLocalizedString("sur %@", comment: ""), "\($0)") } ?? (etat.faites > 1 ? NSLocalizedString("séances", comment: "") : NSLocalizedString("séance", comment: "")))
        .font(pal.fort(16, .semibold))
        .foregroundStyle(pal.doux)
    }
    .lineLimit(1)
    .minimumScaleFactor(0.7)
  }

  private func petit(_ pal: Palette) -> some View {
    VStack(alignment: .leading, spacing: 5) {
      TitreW(pal: pal, texte: NSLocalizedString("Ta semaine", comment: ""))
      chiffre(pal)
      Spacer(minLength: 0)
      PointsW(pal: pal, jours: etat.jours, aujourdhui: etat.rangAujourdhui, taille: pal.style == .b ? 15 : 11)
      BoutonSeanceW(pal: pal, hauteur: 26)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func moyen(_ pal: Palette) -> some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 4) {
        TitreW(pal: pal, texte: NSLocalizedString("Ta semaine", comment: ""))
        chiffre(pal)
        Spacer(minLength: 0)
        Text(etat.objectifSemaine == nil ? NSLocalizedString("Choisis ton objectif dans Yoroi", comment: "") : NSLocalizedString("Séances cette semaine", comment: ""))
          .font(pal.legende(12, .medium))
          .foregroundStyle(pal.doux)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      VStack(spacing: 12) {
        Spacer(minLength: 0)
        PointsW(pal: pal, jours: etat.jours, aujourdhui: etat.rangAujourdhui, taille: pal.style == .b ? 19 : 15)
        Link(destination: Liens.seance) { BoutonSeanceW(pal: pal, hauteur: 34) }
      }
      .frame(maxWidth: .infinity)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

// MARK: - Eau

struct WidgetEau: Widget {
  let kind = "YoroiEau"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .eau)) { e in
      VueEau(entree: e)
    }
    .configurationDisplayName("Eau")
    .description("Ton eau du jour vers ton objectif. Ajoute un verre sans ouvrir l'app.")
    .supportedFamilies([.systemSmall, .systemMedium] + famillesVerrou)
  }
}

struct VueEau: View {
  @Environment(\.widgetFamily) private var famille
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }

  var body: some View {
    HabilleW(entree: entree, decor: famille == .systemMedium ? .eau : .petit) { pal in
      contenu(pal)
    }
    .widgetURL(Liens.eau)
  }

  private var sousTitre: String {
    if let o = etat.eauObjectif { return String(format: NSLocalizedString("sur %@", comment: ""), "\(Fmt.eau(o))") }
    return NSLocalizedString("aujourd'hui", comment: "")
  }

  /// "1,2" et "L", ou "750" et "ml"
  private var eauEnDeux: (String, String) {
    if etat.eauMl >= 1000 { return (Fmt.decimal(etat.eauMl / 1000), "L") }
    return (Fmt.entier(etat.eauMl), "ml")
  }

  @ViewBuilder private func contenu(_ pal: Palette) -> some View {
    if etat.present {
      switch famille {
      case .accessoryInline:
        Text("Eau \(Textes.eau(etat))")
      case .accessoryCircular:
        RondW(style: entree.style, part: etat.partEau) {
          VStack(spacing: 0) {
            Text("eau")
              .font(legendeVerrou(9))
            Text(Fmt.eau(etat.eauMl))
              .font(chiffreVerrou(entree.style, 13))
              .lineLimit(1)
              .minimumScaleFactor(0.5)
              .widgetAccentable()
          }
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 3) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Eau", comment: ""))
          Text(Textes.eau(etat))
            .font(chiffreVerrou(entree.style, 17))
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          if let p = etat.partEau {
            Gauge(value: p, in: 0...1) { EmptyView() }
              .gaugeStyle(.accessoryLinearCapacity)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      case .systemMedium:
        moyen(pal)
      default:
        petit(pal)
      }
    } else {
      switch famille {
      case .accessoryInline:
        Text("Ouvre Yoroi pour commencer")
      case .accessoryCircular:
        RondW(style: entree.style) {
          Image(systemName: "drop").font(.system(size: 18, weight: .semibold))
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 2) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Eau", comment: ""))
          Text("Ouvre Yoroi pour commencer").font(legendeVerrou(13)).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        VideW(pal: pal, titre: NSLocalizedString("Eau", comment: ""), compact: famille == .systemSmall)
      }
    }
  }

  private func grosChiffre(_ pal: Palette, _ t: CGFloat) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 3) {
      Text(eauEnDeux.0)
        .font(pal.chiffre(t))
        .foregroundStyle(pal.texte)
        .widgetAccentable()
      Text(eauEnDeux.1)
        .font(pal.legende(max(11, t * 0.38), .medium))
        .foregroundStyle(pal.doux)
    }
    .lineLimit(1)
    .minimumScaleFactor(0.6)
  }

  private func petit(_ pal: Palette) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      TitreW(pal: pal, texte: NSLocalizedString("Eau", comment: ""))
      HStack(spacing: 10) {
        GoutteW(pal: pal, part: etat.partEau ?? 0, taille: 50, epaisseur: 6)
        VStack(alignment: .leading, spacing: 1) {
          grosChiffre(pal, 24)
          Text(sousTitre)
            .font(pal.legende(12, .medium))
            .foregroundStyle(pal.doux)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
      }
      Spacer(minLength: 0)
      BoutonsEauW(pal: pal, hauteur: 30)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func moyen(_ pal: Palette) -> some View {
    HStack(spacing: 14) {
      GoutteW(pal: pal, part: etat.partEau ?? 0, taille: 98, epaisseur: 10)
      VStack(alignment: .leading, spacing: 2) {
        TitreW(pal: pal, texte: NSLocalizedString("Eau", comment: ""))
        grosChiffre(pal, 34)
        Text(sousTitre)
          .font(pal.legende(13, .medium))
          .foregroundStyle(pal.doux)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      VStack(spacing: 8) {
        BoutonsEauW(pal: pal, hauteur: 38, vertical: true)
        Text("un verre : \(Fmt.eau(etat.verre))")
          .font(pal.legende(11, .medium))
          .foregroundStyle(pal.doux)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .frame(width: 118)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Combat

struct WidgetCombat: Widget {
  let kind = "YoroiCombat"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .combat)) { e in
      VueCombat(entree: e)
    }
    .configurationDisplayName("Combat")
    .description("Les jours avant ta prochaine compétition, ta catégorie et ce qu'il reste à faire.")
    .supportedFamilies([.systemSmall, .systemMedium] + famillesVerrou)
  }
}

struct VueCombat: View {
  @Environment(\.widgetFamily) private var famille
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }

  var body: some View {
    HabilleW(entree: entree, decor: famille == .systemMedium ? .moyen : .petit) { pal in
      contenu(pal)
    }
    .widgetURL(etat.present && etat.combat == nil ? Liens.ajouterCombat : Liens.combat)
  }

  @ViewBuilder private func contenu(_ pal: Palette) -> some View {
    if !etat.present {
      switch famille {
      case .accessoryInline: Text("Ouvre Yoroi pour commencer")
      case .accessoryCircular:
        RondW(style: entree.style) {
          Image(systemName: "figure.boxing").font(.system(size: 18, weight: .semibold))
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 2) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Combat", comment: ""))
          Text("Ouvre Yoroi pour commencer").font(legendeVerrou(13)).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default: VideW(pal: pal, titre: NSLocalizedString("Combat", comment: ""), compact: famille == .systemSmall)
      }
    } else if let c = etat.combat, let n = etat.joursAvantCombat {
      switch famille {
      case .accessoryInline:
        Text(n == 0 ? NSLocalizedString("Combat aujourd'hui", comment: "") : String(format: NSLocalizedString("Combat %@", comment: ""), "\(Fmt.jMoins(n))"))
      case .accessoryCircular:
        RondW(style: entree.style) {
          VStack(spacing: 0) {
            Text("combat").font(legendeVerrou(9))
            Text(Fmt.jMoins(n))
              .font(chiffreVerrou(entree.style, n == 0 ? 13 : 17))
              .lineLimit(1)
              .minimumScaleFactor(0.5)
              .widgetAccentable()
          }
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          let titreCombat: String = n == 0 ? NSLocalizedString("Combat aujourd'hui", comment: "") : (n == 1 ? NSLocalizedString("Combat demain", comment: "") : String(format: NSLocalizedString("Combat dans %@ jours", comment: ""), "\(n)"))
          TitreVerrou(style: entree.style, texte: titreCombat)
          if let cat = Textes.categorie(c, etat.livres) {
            Text(cat).font(legendeVerrou(12))
          }
          if let reste = Textes.resteCombat(c, etat.livres) {
            Text(reste.0).font(legendeVerrou(12, .semibold))
          }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity, alignment: .leading)
      case .systemMedium:
        moyen(pal, c, n)
      default:
        petit(pal, c, n)
      }
    } else {
      switch famille {
      case .accessoryInline: Text("Aucune compétition prévue")
      case .accessoryCircular:
        RondW(style: entree.style) {
          Image(systemName: "plus").font(.system(size: 18, weight: .semibold))
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 2) {
          TitreVerrou(style: entree.style, texte: NSLocalizedString("Combat", comment: ""))
          Text("Ajoute ta prochaine compétition").font(legendeVerrou(13)).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        VStack(alignment: .leading, spacing: 6) {
          TitreW(pal: pal, texte: NSLocalizedString("Combat", comment: ""))
          Spacer(minLength: 0)
          Text("Aucune compétition prévue")
            .font(pal.fort(16, .semibold))
            .foregroundStyle(pal.texte)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
            .fixedSize(horizontal: false, vertical: true)
          Text("Ajoute la tienne")
            .font(pal.legende(13, .bold))
            .foregroundStyle(pal.titre)
            .widgetAccentable()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
  }

  private func reste(_ pal: Palette, _ c: CombatI, _ taille: CGFloat) -> some View {
    Group {
      if let r = Textes.resteCombat(c, etat.livres) {
        Text(r.0)
          .font(pal.legende(taille, .bold))
          .foregroundStyle(r.1 ? pal.vert : pal.titre)
      }
    }
  }

  private func petit(_ pal: Palette, _ c: CombatI, _ n: Int) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      EnteteW(pal: pal, titre: NSLocalizedString("Combat", comment: ""), coin: Fmt.jourCourt(c.date))
      Spacer(minLength: 0)
      Text(Fmt.jMoins(n))
        .font(pal.chiffre(42))
        .foregroundStyle(pal.texte)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .widgetAccentable()
      if let cat = Textes.categorie(c, etat.livres) {
        Text(cat)
          .font(pal.legende(12, .medium))
          .foregroundStyle(pal.doux)
      }
      reste(pal, c, 13)
    }
    .lineLimit(1)
    .minimumScaleFactor(0.7)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func moyen(_ pal: Palette, _ c: CombatI, _ n: Int) -> some View {
    HStack(alignment: .center, spacing: 14) {
      VStack(alignment: .leading, spacing: 3) {
        TitreW(pal: pal, texte: NSLocalizedString("Combat", comment: ""))
        Text(Fmt.jMoins(n))
          .font(pal.chiffre(48))
          .foregroundStyle(pal.texte)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .widgetAccentable()
        Text(Fmt.jourLong(c.date))
          .font(pal.legende(13, .medium))
          .foregroundStyle(pal.doux)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      VStack(alignment: .leading, spacing: 6) {
        if let cat = Textes.categorie(c, etat.livres) {
          Text(cat)
            .font(pal.fort(15, .semibold))
            .foregroundStyle(pal.texte)
        }
        reste(pal, c, 15)
        if let d = etat.poids.dernier {
          Text("Ton poids \(Fmt.poids(d.kg, etat.livres)) \(Fmt.unite(etat.livres))")
            .font(pal.legende(12, .medium))
            .foregroundStyle(pal.doux)
        }
      }
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Chrono

struct WidgetChrono: Widget {
  let kind = "YoroiChrono"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .chrono)) { e in
      VueChrono(entree: e)
    }
    .configurationDisplayName("Chrono")
    .description("Ouvre le chrono rounds avec ton dernier réglage.")
    .supportedFamilies([.systemSmall, .accessoryCircular])
  }
}

struct VueChrono: View {
  @Environment(\.widgetFamily) private var famille
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }

  var body: some View {
    HabilleW(entree: entree, decor: .chrono) { pal in
      contenu(pal)
    }
    .widgetURL(Textes.lienChrono(etat.chrono))
  }

  @ViewBuilder private func contenu(_ pal: Palette) -> some View {
    if famille == .accessoryCircular {
      RondW(style: entree.style) {
        VStack(spacing: 0) {
          Image(systemName: "stopwatch")
            .font(.system(size: 11, weight: .bold))
          Text(Textes.chronoNom(etat.chrono))
            .font(chiffreVerrou(entree.style, 13))
            .lineLimit(1)
            .minimumScaleFactor(0.5)
        }
        .widgetAccentable()
      }
      .accessibilityLabel("Chrono rounds")
    } else {
      petit(pal)
    }
  }

  /// Bouton lecture vermillon
  private var lecture: some View {
    ZStack {
      Circle().fill(Palette.vermillon)
      Image(systemName: "play.fill")
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(Color.white)
        .offset(x: 1)
    }
    .frame(width: 32, height: 32)
    .widgetAccentable()
    .accessibilityHidden(true)
  }

  /// Le grand visuel en haut a gauche : chronometre dore (A), gants dans un cercle a l'encre (B), gong (C)
  @ViewBuilder private func ornement(_ pal: Palette) -> some View {
    switch pal.style {
    case .a:
      Image("yw_a_chrono")
        .pleineDesaturee()
        .scaledToFit()
        .frame(width: 58, height: 72)
        .shadow(color: Color.hexa(0xF2B45C).opacity(pal.sombre ? 0.7 : 0.35), radius: 8)
    case .b:
      ZStack {
        ArcPinceau(part: 0.94, epaisseur: 6)
          .fill(pal.texte)
        Image("yw_b_combat")
          .pleineDesaturee()
          .scaledToFit()
          .padding(9)
      }
      .frame(width: 70, height: 70)
    case .c:
      Image("yw_c_gong")
        .pleineDesaturee()
        .scaledToFit()
        .frame(width: 66, height: 66)
        .shadow(color: Color.black.opacity(0.35), radius: 3, y: 2)
    }
  }

  private var personnage: Image {
    if let p = entree.personnage { return Image(uiImage: p) }
    return Image("yw_c_guerrier")
  }

  private func petit(_ pal: Palette) -> some View {
    ZStack(alignment: .topLeading) {
      if pal.style == .c {
        // ton personnage en pied, a droite
        personnage
          .pleineDesaturee()
          .scaledToFit()
          .frame(width: 70, height: 128)
          .offset(x: 14, y: 16)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
      }
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top, spacing: 0) {
          ornement(pal)
          Spacer(minLength: 0)
          if pal.style != .c {
            lecture
          }
        }
        Spacer(minLength: 0)
        Text(Textes.chronoNom(etat.chrono))
          .font(pal.fort(36, pal.style == .b ? .bold : .heavy))
          .foregroundStyle(pal.texte)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .shadow(color: pal.style == .a && pal.sombre ? Color.black.opacity(0.5) : .clear, radius: 3)
        Text(Textes.chronoCourt(etat.chrono))
          .font(pal.style == .b ? .system(size: 22, weight: .semibold, design: .serif) : pal.legende(22, .bold))
          .foregroundStyle(pal.style == .b ? pal.texte : pal.titre)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}
