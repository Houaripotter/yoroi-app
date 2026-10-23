import ActivityKit
import SwiftUI
import WidgetKit

// Live Activity du chrono rounds : ecran verrouille et Dynamic Island.
// Round X sur Y, phase, compte a rebours natif (Text(timerInterval:)), une couleur par phase.
// Demarree, mise a jour a chaque phase et arretee par le chrono de l'app (module natif YoroiWidgets).

struct ActiviteChrono: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ChronoAttributs.self) { context in
      VueChronoVerrou(titre: context.attributes.titre, etat: context.state)
        .activityBackgroundTint(Teinte.fond)
        .activitySystemActionForegroundColor(Teinte.encre)
        .widgetURL(Liens.chronoEnCours)
    } dynamicIsland: { context in
      let s = context.state
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
          BarreChrono(etat: s, couleur: Teinte.phaseIle(s.phase), fondBarre: Color.white.opacity(0.18))
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

enum ChronoTextes {
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
    .padding(16)
  }
}
