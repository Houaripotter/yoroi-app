import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Live Activity du chrono rounds : ecran verrouille et Dynamic Island.
// Round X sur Y, phase, compte a rebours natif (Text(timerInterval:)), une couleur par phase.
// Demarree, mise a jour a chaque phase et arretee par le chrono de l'app (module natif YoroiWidgets).

struct ActiviteChrono: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ChronoAttributs.self) { context in
      VueChronoVerrou(titre: context.attributes.titre, etat: AfficheIle.etat(context.state, perime: context.isStale))
        .activityBackgroundTint(Teinte.fond)
        .activitySystemActionForegroundColor(Teinte.encre)
        .widgetURL(Liens.chronoEnCours)
    } dynamicIsland: { context in
      let s = AfficheIle.etat(context.state, perime: context.isStale)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text(ChronoTextes.phase(s))
              .font(.libelle(13, .bold))
              .foregroundStyle(Teinte.phaseIle(s.phase))
            if s.rounds > 0 {
              Text("Round \(s.round) sur \(s.rounds)")
                .font(.chiffre(12, .medium))
                .foregroundStyle(Color.white.opacity(0.75))
            } else if let ensuite = ChronoTextes.ensuite(s) {
              Text(ensuite)
                .font(.libelle(12, .medium))
                .foregroundStyle(Color.white.opacity(0.75))
            }
          }
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CompteChrono(etat: s)
            .font(.chiffre(30, .bold))
            .foregroundStyle(Color.white)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 120, alignment: .trailing)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 8) {
            BarreChrono(etat: s, couleur: Teinte.phaseIle(s.phase), fondBarre: Color.white.opacity(0.18))
            BoutonsSeance(etat: s, couleur: Teinte.phaseIle(s.phase), texteBouton: Color.black, fondSecond: Color.white.opacity(0.18), texteSecond: Color.white)
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        HStack(spacing: 3) {
          Circle().fill(Teinte.phaseIle(s.phase)).frame(width: 8, height: 8)
          if s.rounds > 0 {
            Text("R\(s.round)")
              .font(.chiffre(13, .bold))
              .foregroundStyle(Teinte.phaseIle(s.phase))
          }
        }
      } compactTrailing: {
        CompteChrono(etat: s)
          .font(.chiffre(14, .bold))
          .foregroundStyle(Teinte.phaseIle(s.phase))
          .multilineTextAlignment(.trailing)
          .frame(width: 46)
      } minimal: {
        Image(systemName: "stopwatch.fill")
          .foregroundStyle(Teinte.phaseIle(s.phase))
      }
      .widgetURL(Liens.chronoEnCours)
      .keylineTint(Teinte.phaseIle(s.phase))
    }
  }
}

/// Seance de musculation (plan present) : « Série faite », et « +15 s » pendant le repos (SeanceIle.swift)
struct BoutonsSeance: View {
  var etat: ChronoAttributs.ContentState
  var couleur: Color
  var texteBouton: Color
  var fondSecond: Color
  var texteSecond: Color

  var body: some View {
    // l'extension de widgets vise iOS 17 : Button(intent:) toujours disponible ici
    if let plan = PlanIle.lire(etat.plan), !plan.fini {
      HStack(spacing: 8) {
        Button(intent: SerieFaiteIntent()) {
          Label(plan.t.bouton, systemImage: "checkmark")
            .font(.libelle(15, .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, minHeight: 40)
            .foregroundStyle(texteBouton)
            .background(Capsule().fill(couleur))
        }
        .buttonStyle(.plain)
        if etat.phase == "repos" {
          Button(intent: ReposPlus15Intent()) {
            Text(plan.t.plus15)
              .font(.chiffre(15, .bold))
              .lineLimit(1)
              .frame(width: 76, height: 40)
              .foregroundStyle(texteSecond)
              .background(Capsule().fill(fondSecond))
          }
          .buttonStyle(.plain)
        }
      }
    }
  }
}

enum ChronoTextes {
  /// Pendant le repos d'une seance : ce qui vient ensuite (« Ensuite : Squat, série 3 »)
  static func ensuite(_ s: ChronoAttributs.ContentState) -> String? {
    guard s.phase == "repos", s.rounds == 0, s.plan != nil, !s.libelle.isEmpty else { return nil }
    return s.libelle
  }

  /// Nom de la phase en clair
  static func phase(_ s: ChronoAttributs.ContentState) -> String {
    switch s.phase {
    case "repos": return NSLocalizedString("Repos", comment: "")
    case "prepa": return NSLocalizedString("Préparation", comment: "")
    default: return s.rounds > 0 ? NSLocalizedString("Round", comment: "") : (s.libelle.isEmpty ? NSLocalizedString("Effort", comment: "") : s.libelle)
    }
  }
}

/// Le temps de la phase : compte a rebours natif, ou fige en pause
struct CompteChrono: View {
  var etat: ChronoAttributs.ContentState

  var body: some View {
    if etat.enPause || etat.fin <= etat.debut {
      Text(Fmt.chrono(etat.figeS))
    } else {
      Text(timerInterval: etat.debut...etat.fin, countsDown: !etat.monte, showsHours: false)
    }
  }
}

struct BarreChrono: View {
  var etat: ChronoAttributs.ContentState
  var couleur: Color
  var fondBarre: Color

  var body: some View {
    if etat.enPause || etat.fin <= etat.debut {
      HStack(spacing: 6) {
        Image(systemName: "pause.fill").font(.system(size: 11, weight: .bold))
        Text("En pause").font(.libelle(12, .semibold))
        Spacer(minLength: 0)
      }
      .foregroundStyle(couleur)
    } else {
      ProgressView(timerInterval: etat.debut...etat.fin, countsDown: !etat.monte) {
        EmptyView()
      } currentValueLabel: {
        EmptyView()
      }
      .progressViewStyle(.linear)
      .tint(couleur)
    }
  }
}

struct VueChronoVerrou: View {
  var titre: String
  var etat: ChronoAttributs.ContentState

  var body: some View {
    VStack(spacing: 0) {
    HStack(alignment: .center, spacing: 14) {
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Image(systemName: "stopwatch.fill")
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(Teinte.phase(etat.phase))
          Text(titre)
            .font(.libelle(13, .semibold))
            .foregroundStyle(Teinte.doux)
        }
        Text(ChronoTextes.phase(etat))
          .font(.libelle(22, .bold))
          .foregroundStyle(Teinte.phase(etat.phase))
        if etat.rounds > 0 {
          Text("Round \(etat.round) sur \(etat.rounds)")
            .font(.chiffre(15, .semibold))
            .foregroundStyle(Teinte.encre)
        } else if let ensuite = ChronoTextes.ensuite(etat) {
          Text(ensuite)
            .font(.libelle(14, .semibold))
            .foregroundStyle(Teinte.encre)
        }
      }
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .frame(maxWidth: .infinity, alignment: .leading)
      VStack(alignment: .trailing, spacing: 8) {
        CompteChrono(etat: etat)
          .font(.chiffre(40, .bold))
          .foregroundStyle(Teinte.encre)
          .multilineTextAlignment(.trailing)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        BarreChrono(etat: etat, couleur: Teinte.phase(etat.phase), fondBarre: Teinte.trait)
          .frame(width: 120)
      }
      .frame(maxWidth: 150, alignment: .trailing)
    }
    .padding(.horizontal, 16)
    .padding(.top, 16)
    .padding(.bottom, PlanIle.lire(etat.plan).map { !$0.fini } == true ? 10 : 16)
    BoutonsSeance(etat: etat, couleur: Teinte.phase(etat.phase), texteBouton: Color.white, fondSecond: Teinte.trait, texteSecond: Teinte.encre)
      .padding(.horizontal, 16)
      .padding(.bottom, 14)
    }
  }
}
