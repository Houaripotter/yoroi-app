import SwiftUI
import WidgetKit

// Complication Yoroi Minuteurs : un chrono Yoroi dessine au repos (anneau des 3/4 en degrade
// bleu clair vers violet, comme les jauges Coeur et Oxygene), le temps restant en direct
// (Text(timerInterval:) et anneau qui se vide) quand un minuteur tourne, a la couleur de sa
// tranche de duree (Teinte.minuteur, la meme que sa tuile dans l'app).
// Lit l'etat des minuteurs ecrit par l'app montre dans l'App Group.

struct EntreeMinuteurs: TimelineEntry {
  let date: Date
  /// Minuteur affiche (le plus proche de la fin, sinon un en pause).
  let actif: MinuteurActif?
  /// Autres minuteurs utiles a cet instant.
  let autres: Int
  let epingles: [Int]
}

struct FournisseurMinuteurs: TimelineProvider {
  func placeholder(in context: Context) -> EntreeMinuteurs {
    EntreeMinuteurs(date: Date(), actif: nil, autres: 0, epingles: EtatMinuteurs.initial.epingles)
  }

  func getSnapshot(in context: Context, completion: @escaping (EntreeMinuteurs) -> Void) {
    completion(entree(StockMinuteurs.lire(), a: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<EntreeMinuteurs>) -> Void) {
    let etat = StockMinuteurs.lire()
    let maintenant = Date()
    // Une entree maintenant, puis une a chaque fin de minuteur (la complication passe au suivant ou au repos).
    let fins = etat.actifs.compactMap { $0.fin }.filter { $0 > maintenant }.sorted()
    var entrees = [entree(etat, a: maintenant)]
    for f in fins.prefix(6) { entrees.append(entree(etat, a: f.addingTimeInterval(0.5))) }
    let prochaine = fins.last.map { $0.addingTimeInterval(60) } ?? maintenant.addingTimeInterval(3600)
    completion(Timeline(entries: entrees, policy: .after(prochaine)))
  }

  private func entree(_ etat: EtatMinuteurs, a date: Date) -> EntreeMinuteurs {
    let p = etat.principal(a: date)
    let autres = max(0, etat.nombreUtiles(a: date) - (p == nil ? 0 : 1))
    return EntreeMinuteurs(date: date, actif: p, autres: autres, epingles: etat.epingles)
  }
}

struct WidgetMinuteurs: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: GenreWidget.minuteurs, provider: FournisseurMinuteurs()) { e in
      VueMinuteursWidget(entree: e)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://minuteurs"))
    }
    .configurationDisplayName("Yoroi Minuteurs")
    .description("Tes minuteurs de repos. Le temps restant s'affiche en direct.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
  }
}

/// Icone Yoroi Minuteurs, dessinee en formes SwiftUI (aucune image) :
/// chrono rond, couronne et poussoir blanc casse, anneau des 3/4 en degrade bleu clair, indigo, violet
/// (le meme que la jauge Coeur), aiguille qui pointe la fin de l'arc.
/// Lisible des 16 pt. Cadran teinte : l'arc prend la teinte du cadran, le reste reste clair.
struct IconeMinuteur: View {
  var body: some View {
    GeometryReader { g in
      let s = min(g.size.width, g.size.height)
      let trait = max(1.5, s * 0.11)
      let rayon = s * 0.33
      let tigeH = s * 0.07
      let aiguille = s * 0.2
      let point = max(2.8, trait * 1.24)
      ZStack {
        // Piste discrete, sous l'arc
        Circle()
          .stroke(Teinte.piste, lineWidth: trait)
          .frame(width: rayon * 2, height: rayon * 2)
        // Arc des 3/4, du haut dans le sens horaire
        Circle()
          .trim(from: 0, to: 0.75)
          .stroke(
            AngularGradient(
              gradient: Teinte.degradeCoeur, center: .center,
              startAngle: .degrees(-12), endAngle: .degrees(282)
            ),
            style: StrokeStyle(lineWidth: trait, lineCap: .round)
          )
          .rotationEffect(.degrees(-90))
          .frame(width: rayon * 2, height: rayon * 2)
          .widgetAccentable()
        // Tige et couronne
        Rectangle()
          .fill(Teinte.texte)
          .frame(width: s * 0.075, height: tigeH)
          .offset(y: -(rayon + trait / 2 + tigeH / 2) + 0.5)
        Capsule()
          .fill(Teinte.texte)
          .frame(width: s * 0.2, height: s * 0.075)
          .offset(y: -s * 0.445)
        // Poussoir a une heure et demie
        Capsule()
          .fill(Teinte.texte)
          .frame(width: s * 0.12, height: s * 0.075)
          .rotationEffect(.degrees(45))
          .offset(x: s * 0.3, y: -s * 0.3)
        // Aiguille vers la fin de l'arc (neuf heures)
        Capsule()
          .fill(Teinte.texte)
          .frame(width: aiguille, height: max(1.2, trait * 0.5))
          .offset(x: -aiguille / 2)
        Circle()
          .fill(Teinte.texte)
          .frame(width: point, height: point)
      }
      .frame(width: s, height: s)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .accessibilityHidden(true)
  }
}

struct VueMinuteursWidget: View {
  let entree: EntreeMinuteurs
  @Environment(\.widgetFamily) private var famille

  var body: some View {
    if let a = entree.actif {
      enCours(a)
    } else {
      auRepos
    }
  }

  // MARK: Au repos

  @ViewBuilder
  private var auRepos: some View {
    switch famille {
    case .accessoryInline:
      // La famille en ligne n'affiche que du texte et des symboles systeme.
      Label("Minuteurs", systemImage: "timer")
    case .accessoryCorner:
      IconeMinuteur()
        .widgetLabel("Minuteurs")
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 5) {
          IconeMinuteur().frame(width: 16, height: 16)
          Text("Minuteurs")
            .font(.system(size: 13, weight: .heavy, design: .rounded))
            .foregroundStyle(Teinte.accentClair)
            .widgetAccentable()
        }
        HStack(spacing: 6) {
          ForEach(Array(entree.epingles.prefix(3)), id: \.self) { s in
            // Meme squircle que les tuiles de l'app (la complication ronde reste un cercle).
            ZStack {
              Squircle().fill(Color.white.opacity(0.08))
              Squircle()
                .strokeBorder(Teinte.minuteur(s), lineWidth: 2.5)
                .widgetAccentable()
              VStack(spacing: -2) {
                Text(Format.rondMinuteurValeur(s))
                  .font(.chiffre(Format.rondMinuteurValeur(s).count > 2 ? 14 : 18, .bold))
                  .foregroundStyle(Teinte.texte)
                  .minimumScaleFactor(0.6)
                  .lineLimit(1)
                Text(Format.rondMinuteurUnite(s))
                  .font(.system(size: 9, weight: .heavy, design: .rounded))
                  .foregroundStyle(Teinte.minuteur(s))
                  .widgetAccentable()
              }
              .padding(.horizontal, 4)
            }
            .frame(width: 42, height: 42)
          }
          Spacer(minLength: 0)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    default:
      ZStack {
        AccessoryWidgetBackground()
        IconeMinuteur().padding(5)
      }
    }
  }

  // MARK: Un minuteur tourne ou est en pause

  @ViewBuilder
  private func enCours(_ a: MinuteurActif) -> some View {
    if let debut = a.debutIntervalle, let fin = a.fin {
      let intervalle = debut...fin
      switch famille {
      case .accessoryInline:
        Text("Minuteur ") + Text(timerInterval: intervalle, countsDown: true)
      case .accessoryCorner:
        Text(timerInterval: intervalle, countsDown: true)
          .font(.chiffre(13, .bold))
          .multilineTextAlignment(.center)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .widgetLabel {
            ProgressView(timerInterval: intervalle, countsDown: true) {
              Text("Minuteur")
            } currentValueLabel: {
              EmptyView()
            }
            .tint(Teinte.minuteur(a.dureeS))
          }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          enTete(a)
          Text(timerInterval: intervalle, countsDown: true)
            .font(.chiffre(30, .bold))
            .foregroundStyle(Teinte.texte)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          ProgressView(timerInterval: intervalle, countsDown: true) {
            EmptyView()
          } currentValueLabel: {
            EmptyView()
          }
          .progressViewStyle(.linear)
          .tint(Teinte.minuteur(a.dureeS))
          .widgetAccentable()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        // Anneau qui se vide jusqu'a la fin, temps restant au centre, a chasse fixe.
        ZStack {
          AccessoryWidgetBackground()
          ProgressView(timerInterval: intervalle, countsDown: true) {
            EmptyView()
          } currentValueLabel: {
            EmptyView()
          }
          .progressViewStyle(.circular)
          .tint(Teinte.minuteur(a.dureeS))
          .widgetAccentable()
          Text(timerInterval: intervalle, countsDown: true)
            .font(.chiffre(14, .bold))
            .foregroundStyle(Teinte.texte)
            .multilineTextAlignment(.center)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .padding(.horizontal, 7)
        }
      }
    } else {
      // En pause : valeur figee, grisee.
      let reste = Format.chrono(Int(a.restant(entree.date).rounded(.up)))
      let part = a.progression(entree.date)
      switch famille {
      case .accessoryInline:
        Label("Minuteur en pause, \(reste)", systemImage: "pause.fill")
      case .accessoryCorner:
        Text(reste)
          .font(.chiffre(13, .bold))
          .foregroundStyle(Teinte.texteDoux)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .widgetLabel {
            Gauge(value: part) { Text("En pause") }
              .tint(Teinte.texteDoux)
          }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          enTete(a)
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text(reste).font(.chiffre(30, .bold)).foregroundStyle(Teinte.texteDoux)
            Text("en pause").font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(Teinte.texteDoux)
          }
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          Gauge(value: part) { EmptyView() }
            .gaugeStyle(.accessoryLinearCapacity)
            .tint(Teinte.texteDoux)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      default:
        Gauge(value: part) {
          Image(systemName: "pause.fill")
        } currentValueLabel: {
          Text(reste)
            .font(.chiffre(12, .bold))
            .minimumScaleFactor(0.6)
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .tint(Teinte.texteDoux)
      }
    }
  }

  private func enTete(_ a: MinuteurActif) -> some View {
    HStack(spacing: 5) {
      IconeMinuteur().frame(width: 15, height: 15)
      Text("Minuteur \(Format.dureeCourte(a.dureeS))")
        .font(.system(size: 13, weight: .heavy, design: .rounded))
        .foregroundStyle(Teinte.minuteur(a.dureeS))
        .lineLimit(1)
        .widgetAccentable()
      Spacer(minLength: 2)
      if entree.autres > 0 {
        Text("+\(entree.autres)")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
      }
    }
  }
}

// MARK: Apercus Xcode (debug seulement, jamais affiches sur la montre)

#if DEBUG
private enum ApercuMinuteurs {
  static let repos = EntreeMinuteurs(date: .now, actif: nil, autres: 0, epingles: [60, 90, 180])
  static let enCours = EntreeMinuteurs(
    date: .now,
    actif: MinuteurActif(id: "apercu", dureeS: 90, totalS: 90, fin: Date.now.addingTimeInterval(64), restantPause: nil),
    autres: 1, epingles: [60, 90, 180]
  )
  static let pause = EntreeMinuteurs(
    date: .now,
    actif: MinuteurActif(id: "apercu", dureeS: 180, totalS: 180, fin: nil, restantPause: 75),
    autres: 0, epingles: [60, 90, 180]
  )
}

#Preview("Ronde", as: .accessoryCircular) {
  WidgetMinuteurs()
} timeline: {
  ApercuMinuteurs.repos
  ApercuMinuteurs.enCours
  ApercuMinuteurs.pause
}

#Preview("Rectangle", as: .accessoryRectangular) {
  WidgetMinuteurs()
} timeline: {
  ApercuMinuteurs.repos
  ApercuMinuteurs.enCours
  ApercuMinuteurs.pause
}

#Preview("Coin", as: .accessoryCorner) {
  WidgetMinuteurs()
} timeline: {
  ApercuMinuteurs.repos
  ApercuMinuteurs.enCours
}

#Preview("En ligne", as: .accessoryInline) {
  WidgetMinuteurs()
} timeline: {
  ApercuMinuteurs.repos
  ApercuMinuteurs.enCours
}
#endif
