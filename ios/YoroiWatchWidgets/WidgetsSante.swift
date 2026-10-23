import SwiftUI
import WidgetKit

// Complications Yoroi Coeur, Yoroi Oxygene, Yoroi Repos, Yoroi Respiration et Yoroi Coeur et oxygene.
// L'extension ne lit pas Apple Sante : l'app montre y ecrit le dernier etat (App Group).
// Echelle fixe sur chaque jauge. Une valeur ancienne garde ses couleurs (estompees) et montre
// une horloge et son heure. Juste les chiffres.

struct EntreeCardio: TimelineEntry {
  let date: Date
  let etat: EtatCardio?
}

struct FournisseurCardio: TimelineProvider {
  func placeholder(in context: Context) -> EntreeCardio {
    EntreeCardio(date: Date(), etat: FournisseurCardio.exemple(Date()))
  }

  func getSnapshot(in context: Context, completion: @escaping (EntreeCardio) -> Void) {
    let maintenant = Date()
    let lu = StockCardio.lire()
    // Dans la galerie, sans aucune mesure encore, on montre la forme avec un exemple.
    if context.isPreview && (lu?.fc == nil && lu?.oxygene == nil) {
      completion(EntreeCardio(date: maintenant, etat: FournisseurCardio.exemple(maintenant)))
    } else {
      completion(EntreeCardio(date: maintenant, etat: lu))
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<EntreeCardio>) -> Void) {
    let maintenant = Date()
    let lu = StockCardio.lire()
    let ensuite = maintenant.addingTimeInterval(15 * 60)
    let entrees = [EntreeCardio(date: maintenant, etat: lu), EntreeCardio(date: ensuite, etat: lu)]
    completion(Timeline(entries: entrees, policy: .after(ensuite)))
  }

  /// Apercu de la galerie seulement, jamais affiche comme une vraie mesure.
  static func exemple(_ maintenant: Date) -> EtatCardio {
    let jour = DatesISO.ecrireJour(maintenant)
    let fcSerie = [60, 59, 58, 60, 62, 66, 72, 70, 74, 78, 73, 96, 131, 104, 78, 72].enumerated().map {
      PointJour(t: $0.offset * 50, v: Double($0.element))
    }
    let oxSerie = [97, 96, 98, 97, 98, 96, 97].enumerated().map { PointJour(t: 60 + $0.offset * 120, v: Double($0.element)) }
    return EtatCardio(
      fc: MesureJour(valeur: 72, date: maintenant, jour: jour, mini: 58, maxi: 131, serie: fcSerie),
      oxygene: MesureJour(valeur: 97, date: maintenant, jour: jour, mini: 96, maxi: 98, serie: oxSerie),
      repos: ValeurDatee(valeur: 54, date: maintenant),
      variabilite: nil,
      respiration: ValeurDatee(valeur: 15, date: maintenant),
      maj: maintenant
    )
  }
}

/// Ce qu'une complication montre d'une mesure, a la date de l'entree.
struct LectureMesure {
  let valeur: Double?
  let mini: Double?
  let maxi: Double?
  let date: Date?
  /// Mesure encore fraiche (dans la fenetre du style) : couleurs pleines.
  let recente: Bool
  let serie: [PointJour]
  let finMinutes: Int

  init(_ m: MesureJour?, a maintenant: Date, fenetre: TimeInterval) {
    valeur = m?.valeur
    mini = m?.miniDuJour(maintenant)
    maxi = m?.maxiDuJour(maintenant)
    date = m?.date
    recente = m?.estRecente(a: maintenant, fenetre: fenetre) ?? false
    serie = m?.serieDuJour(maintenant) ?? []
    finMinutes = max(60, Int(maintenant.timeIntervalSince(Calendar.current.startOfDay(for: maintenant)) / 60))
  }

  /// Valeur du jour sans courbe (FC au repos, respiration).
  init(_ v: ValeurDatee?, a maintenant: Date, fenetre: TimeInterval) {
    valeur = v?.valeur
    mini = nil
    maxi = nil
    date = v?.date
    recente = v.map { maintenant.timeIntervalSince($0.date) <= fenetre } ?? false
    serie = []
    finMinutes = 60
  }

  var texte: String { valeur.map { Format.entier($0) } ?? "--" }
  var texteMini: String { mini.map { Format.entier($0) } ?? "" }
  var texteMaxi: String { maxi.map { Format.entier($0) } ?? "" }
  var heure: String { date.map { Format.heure($0) } ?? "" }
  /// Ancienne valeur : on la montre quand meme, avec une horloge et son heure.
  var ancienne: Bool { valeur != nil && !recente }

  /// Valeur ramenee dans l'echelle fixe de la jauge : la position du point vaut
  /// (valeur - bas) / (haut - bas) sur l'echelle affichee aux deux bouts.
  func borne(_ plage: ClosedRange<Double>) -> Double {
    min(plage.upperBound, max(plage.lowerBound, valeur ?? plage.lowerBound))
  }
}

/// Reglages d'affichage d'une mesure.
struct StyleMesure {
  let titre: String
  let court: String
  let icone: String
  let unite: String
  /// Echelle fixe de la jauge, ecrite aux deux bouts (jamais le mini et le maxi du jour :
  /// une echelle qui bouge chaque jour placait le point n'importe ou).
  let plage: ClosedRange<Double>
  let couleur: Color
  let claire: Color
  /// Degrade de la jauge ronde : bleu clair vers violet pour le coeur, violet vers bleu pour l'oxygene.
  let degrade: Gradient
  let enPoints: Bool
  let basCourbe: Double?
  let hautCourbe: Double?
  /// Duree pendant laquelle la mesure reste fraiche.
  let fenetre: TimeInterval
  let vide: String

  var texteBas: String { Format.entier(plage.lowerBound) }
  var texteHaut: String { Format.entier(plage.upperBound) }

  /// Meme degrade, plus discret, pour une mesure ancienne (l'horloge dit pourquoi).
  var degradeAncien: Gradient {
    Gradient(stops: degrade.stops.map { Gradient.Stop(color: $0.color.opacity(0.45), location: $0.location) })
  }

  static let coeur = StyleMesure(
    titre: "Cœur", court: "FC", icone: "heart.fill", unite: "bpm", plage: 40...180,
    couleur: Teinte.coeur, claire: Teinte.coeurClair, degrade: Teinte.degradeCoeur,
    enPoints: false, basCourbe: nil, hautCourbe: nil,
    fenetre: FenetreMesure.coeur, vide: "Pas encore de mesure"
  )
  static let oxygene = StyleMesure(
    titre: "Oxygène", court: "O2", icone: "lungs.fill", unite: "%", plage: 90...100,
    couleur: Teinte.oxygene, claire: Teinte.oxygeneClair, degrade: Teinte.degradeOxygene,
    enPoints: true, basCourbe: 90, hautCourbe: 100,
    fenetre: FenetreMesure.oxygene, vide: "Pas de mesure d'oxygène"
  )
  static let repos = StyleMesure(
    titre: "Au repos", court: "Repos", icone: "bed.double.fill", unite: "bpm", plage: 40...100,
    couleur: Teinte.coeur, claire: Teinte.coeurClair, degrade: Teinte.degradeCoeur,
    enPoints: false, basCourbe: nil, hautCourbe: nil,
    fenetre: FenetreMesure.journaliere, vide: "Pas encore de FC au repos"
  )
  static let respiration = StyleMesure(
    titre: "Respiration", court: "Resp.", icone: "wind", unite: "/min", plage: 8...24,
    couleur: Teinte.accentClair, claire: Teinte.oxygeneClair, degrade: Teinte.degradeOxygene,
    enPoints: false, basCourbe: nil, hautCourbe: nil,
    fenetre: FenetreMesure.journaliere, vide: "Mesurée pendant ton sommeil"
  )
}

struct VueMesureWidget: View {
  let lecture: LectureMesure
  let style: StyleMesure
  @Environment(\.widgetFamily) private var famille

  /// Mesure fraiche : degrade plein. Ancienne : meme degrade estompe, plus une horloge.
  /// Aucune mesure : piste grise.
  private var degrade: Gradient {
    if lecture.valeur == nil { return Gradient(colors: [Teinte.piste, Teinte.piste]) }
    return lecture.recente ? style.degrade : style.degradeAncien
  }

  private var couleurValeur: Color { lecture.recente ? Teinte.texte : Teinte.texteDoux }

  var body: some View {
    switch famille {
    case .accessoryInline:
      if lecture.valeur == nil {
        Label("\(style.titre) --", systemImage: style.icone)
      } else if lecture.recente && lecture.mini != nil && lecture.maxi != nil {
        Label("\(lecture.texte) \(style.unite), \(lecture.texteMini) à \(lecture.texteMaxi)", systemImage: style.icone)
      } else {
        Label("\(lecture.texte) \(style.unite) à \(lecture.heure)", systemImage: lecture.ancienne ? "clock" : style.icone)
      }

    case .accessoryCorner:
      Text(lecture.texte)
        .font(.chiffre(17, .bold))
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .foregroundStyle(lecture.valeur == nil ? Teinte.texteDoux : (lecture.recente ? style.claire : style.couleur.opacity(0.7)))
        .widgetAccentable()
        .widgetLabel {
          Gauge(value: lecture.borne(style.plage), in: style.plage) {
            Text(style.court)
          } currentValueLabel: {
            Text(lecture.texte)
          } minimumValueLabel: {
            Text(style.texteBas)
          } maximumValueLabel: {
            Text(style.texteHaut)
          }
          .tint(degrade)
        }

    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 4) {
          Image(systemName: style.icone).font(.system(size: 12, weight: .bold))
          Text(style.titre).font(.system(size: 13, weight: .heavy, design: .rounded))
          Spacer(minLength: 2)
          if lecture.valeur != nil {
            HStack(spacing: 2) {
              if lecture.ancienne { Image(systemName: "clock").font(.system(size: 10, weight: .bold)) }
              Text(lecture.heure)
            }
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
          }
        }
        .foregroundStyle(style.couleur)
        .widgetAccentable()

        HStack(alignment: .bottom, spacing: 4) {
          HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text(lecture.texte)
              .font(.chiffre(30, .bold))
              .foregroundStyle(couleurValeur)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
            Text(style.unite)
              .font(.system(size: 12, weight: .bold, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
          Spacer(minLength: 0)
          if !lecture.serie.isEmpty {
            CourbeJour(
              serie: lecture.serie, couleur: lecture.recente ? style.couleur : style.couleur.opacity(0.55),
              finMinutes: lecture.finMinutes, enPoints: style.enPoints, remplissage: false,
              epaisseur: 1.5, bas: style.basCourbe, haut: style.hautCourbe
            )
            .frame(width: 80, height: 28)
            .widgetAccentable()
          } else if lecture.valeur != nil {
            JaugePlage(
              valeur: lecture.valeur, mini: nil, maxi: nil,
              bornes: style.plage, couleur: style.couleur
            )
            .frame(width: 66, height: 8)
            .padding(.bottom, 8)
            .widgetAccentable()
          }
        }

        Text(ligneBas)
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

    default:
      jaugeRonde
    }
  }

  /// Jauge ronde systeme, ouverte en bas, sur une echelle fixe (40 a 180 pour le coeur, 90 a 100
  /// pour l'oxygene) ecrite aux deux bouts : le point blanc est a sa vraie place.
  /// Mesure ancienne : degrade estompe, chiffre doux et petite horloge en bas a la place de l'echelle.
  /// Cadran teinte : la jauge prend la teinte du cadran, le chiffre reste lisible.
  @ViewBuilder
  private var jaugeRonde: some View {
    if lecture.ancienne || lecture.valeur == nil {
      Gauge(value: lecture.borne(style.plage), in: style.plage) {
        Image(systemName: lecture.ancienne ? "clock" : style.icone)
          .font(.system(size: 9, weight: .bold))
          .foregroundStyle(Teinte.texteDoux)
      } currentValueLabel: {
        chiffreCentre
      }
      .gaugeStyle(.accessoryCircular)
      .tint(degrade)
      .widgetAccentable()
    } else {
      Gauge(value: lecture.borne(style.plage), in: style.plage) {
        Image(systemName: style.icone)
      } currentValueLabel: {
        chiffreCentre
      } minimumValueLabel: {
        Text(style.texteBas)
          .font(.chiffre(9, .semibold))
          .foregroundStyle(Teinte.texteDoux)
      } maximumValueLabel: {
        Text(style.texteHaut)
          .font(.chiffre(9, .semibold))
          .foregroundStyle(Teinte.texteDoux)
      }
      .gaugeStyle(.accessoryCircular)
      .tint(degrade)
      .widgetAccentable()
    }
  }

  private var chiffreCentre: some View {
    Text(lecture.texte)
      .font(.chiffre(lecture.texte.count > 2 ? 16 : 19, .bold))
      .foregroundStyle(couleurValeur)
      .minimumScaleFactor(0.7)
  }

  private var ligneBas: String {
    if lecture.valeur == nil { return style.vide }
    if lecture.recente && lecture.mini != nil && lecture.maxi != nil {
      return "mini \(lecture.texteMini)  maxi \(lecture.texteMaxi)"
    }
    if let d = lecture.date { return "Mesure \(Format.quand(d))" }
    return "Dernière mesure"
  }
}

/// Une ligne du rectangle combine : icone, valeur, plage du jour.
private struct LigneCardio: View {
  let lecture: LectureMesure
  let style: StyleMesure

  var body: some View {
    HStack(spacing: 5) {
      Image(systemName: style.icone)
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(lecture.valeur == nil ? Teinte.texteDoux : style.couleur)
        .widgetAccentable()
        .frame(width: 16)
      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text(lecture.texte)
          .font(.chiffre(25, .bold))
          .foregroundStyle(lecture.recente ? Teinte.texte : Teinte.texteDoux)
        Text(style.unite)
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
      }
      Spacer(minLength: 2)
      VStack(alignment: .trailing, spacing: 2) {
        Text(lecture.valeur == nil ? "" : (lecture.recente && lecture.mini != nil && lecture.maxi != nil
          ? "\(lecture.texteMini) à \(lecture.texteMaxi)" : (lecture.ancienne ? "ancienne, \(lecture.heure)" : "à \(lecture.heure)")))
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
          .lineLimit(1)
        JaugePlage(
          valeur: lecture.valeur, mini: lecture.mini, maxi: lecture.maxi,
          bornes: style.plage, couleur: lecture.recente ? style.couleur : style.couleur.opacity(0.55)
        )
        .frame(width: 66, height: 8)
        .widgetAccentable()
      }
    }
  }
}

struct VueCardioWidget: View {
  let entree: EntreeCardio

  var body: some View {
    VStack(spacing: 6) {
      LigneCardio(lecture: LectureMesure(entree.etat?.fc, a: entree.date, fenetre: StyleMesure.coeur.fenetre), style: .coeur)
      LigneCardio(lecture: LectureMesure(entree.etat?.oxygene, a: entree.date, fenetre: StyleMesure.oxygene.fenetre), style: .oxygene)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct WidgetCoeur: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: GenreWidget.coeur, provider: FournisseurCardio()) { e in
      VueMesureWidget(lecture: LectureMesure(e.etat?.fc, a: e.date, fenetre: StyleMesure.coeur.fenetre), style: .coeur)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://coeur"))
    }
    .configurationDisplayName("Yoroi Cœur")
    .description("Ta dernière fréquence cardiaque, avec le mini et le maxi du jour.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
  }
}

struct WidgetOxygene: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: GenreWidget.oxygene, provider: FournisseurCardio()) { e in
      VueMesureWidget(lecture: LectureMesure(e.etat?.oxygene, a: e.date, fenetre: StyleMesure.oxygene.fenetre), style: .oxygene)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://oxygene"))
    }
    .configurationDisplayName("Yoroi Oxygène")
    .description("Ta dernière saturation en oxygène, avec le mini et le maxi du jour.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
  }
}

struct WidgetCardio: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: GenreWidget.cardio, provider: FournisseurCardio()) { e in
      VueCardioWidget(entree: e)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://cardio"))
    }
    .configurationDisplayName("Yoroi Cœur et oxygène")
    .description("Fréquence cardiaque et oxygène côte à côte, avec la plage du jour.")
    .supportedFamilies([.accessoryRectangular])
  }
}

struct WidgetRepos: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: GenreWidget.repos, provider: FournisseurCardio()) { e in
      VueMesureWidget(lecture: LectureMesure(e.etat?.repos, a: e.date, fenetre: StyleMesure.repos.fenetre), style: .repos)
        .containerBackground(Color.black, for: .widget)
        .widgetURL(URL(string: "yoroimontre://repos"))
    }
    .configurationDisplayName("Yoroi Repos")
    .description("Ta fréquence cardiaque au repos, calculée par ta montre.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
  }
}

struct WidgetRespiration: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: GenreWidget.respiration, provider: FournisseurCardio()) { e in
      VueMesureWidget(
        lecture: LectureMesure(e.etat?.respiration, a: e.date, fenetre: StyleMesure.respiration.fenetre),
        style: .respiration
      )
      .containerBackground(Color.black, for: .widget)
      .widgetURL(URL(string: "yoroimontre://respiration"))
    }
    .configurationDisplayName("Yoroi Respiration")
    .description("Ta fréquence respiratoire, mesurée par ta montre pendant ton sommeil.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
  }
}
