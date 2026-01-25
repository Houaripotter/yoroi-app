/**
 * YoroiTimerWidget.swift
 * Widget Extension pour afficher le Timer dans le Dynamic Island
 *
 * IMPORTANT: Ce fichier doit faire partie d'une Widget Extension Target dans Xcode
 * Instructions complètes dans: /ios/DYNAMIC_ISLAND_SETUP.md
 */

import ActivityKit
import WidgetKit
import SwiftUI

// ============================================
// Vues pour le Dynamic Island
// ============================================

// Vue COMPACTE - Affichée quand le Dynamic Island est réduit
struct CompactView: View {
  let context: ActivityViewContext<TimerAttributes>

  var body: some View {
    HStack(spacing: 4) {
      // Icône du mode
      Image(systemName: getModeIcon(context.state.mode))
        .font(.system(size: 14, weight: .bold))
        .foregroundColor(.white)

      // Temps restant
      Text(formatTime(context.state.remainingTime))
        .font(.system(size: 13, weight: .bold))
        .foregroundColor(.white)
    }
  }
}

// Vue MINIMALE - Affichée dans la capsule du Dynamic Island
struct MinimalView: View {
  let context: ActivityViewContext<TimerAttributes>

  var body: some View {
    Image(systemName: getModeIcon(context.state.mode))
      .font(.system(size: 12, weight: .bold))
      .foregroundColor(.white)
  }
}

// Vue ÉTENDUE - Affichée quand l'utilisateur appuie sur le Dynamic Island
struct ExpandedView: View {
  let context: ActivityViewContext<TimerAttributes>

  var body: some View {
    VStack(spacing: 12) {
      // Header avec nom du mode et round
      HStack {
        Image(systemName: getModeIcon(context.state.mode))
          .font(.system(size: 20, weight: .bold))
          .foregroundColor(.white)

        Text(context.attributes.timerName)
          .font(.system(size: 16, weight: .bold))
          .foregroundColor(.white)

        Spacer()

        if let roundNumber = context.state.roundNumber,
           let totalRounds = context.state.totalRounds {
          Text("Round \(roundNumber)/\(totalRounds)")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.white.opacity(0.8))
        }
      }

      // Barre de progression
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          // Background
          RoundedRectangle(cornerRadius: 8)
            .fill(Color.white.opacity(0.2))
            .frame(height: 12)

          // Progress
          RoundedRectangle(cornerRadius: 8)
            .fill(
              context.state.isResting
                ? Color.blue
                : Color.green
            )
            .frame(
              width: geometry.size.width * CGFloat(context.state.remainingTime) / CGFloat(context.state.totalTime),
              height: 12
            )
        }
      }
      .frame(height: 12)

      // Temps restant (grand)
      HStack(alignment: .firstTextBaseline, spacing: 4) {
        Text(formatTime(context.state.remainingTime))
          .font(.system(size: 36, weight: .bold, design: .rounded))
          .foregroundColor(.white)

        if context.state.isResting {
          Text("REPOS")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.blue)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.blue.opacity(0.2))
            .cornerRadius(6)
        } else {
          Text("TRAVAIL")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.green)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.green.opacity(0.2))
            .cornerRadius(6)
        }
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
  }
}

// Vue de LOCK SCREEN - Affichée sur l'écran de verrouillage
struct LockScreenView: View {
  let context: ActivityViewContext<TimerAttributes>

  var body: some View {
    VStack(spacing: 8) {
      HStack {
        Image(systemName: getModeIcon(context.state.mode))
          .font(.system(size: 16, weight: .bold))

        Text(context.attributes.timerName)
          .font(.system(size: 14, weight: .semibold))

        Spacer()
      }

      HStack {
        Text(formatTime(context.state.remainingTime))
          .font(.system(size: 24, weight: .bold, design: .rounded))

        Spacer()

        if context.state.isResting {
          Text("REPOS")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.blue)
        }

        if let roundNumber = context.state.roundNumber,
           let totalRounds = context.state.totalRounds {
          Text("\(roundNumber)/\(totalRounds)")
            .font(.system(size: 12, weight: .semibold))
        }
      }
    }
  }
}

// ============================================
// Configuration du Widget
// ============================================
@main
struct YoroiTimerWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TimerAttributes.self) { context in
      // Lock Screen View
      LockScreenView(context: context)
        .activityBackgroundTint(Color.black.opacity(0.5))
        .activitySystemActionForegroundColor(Color.white)

    } dynamicIsland: { context in
      DynamicIsland {
        // Vue étendue (quand on appuie sur le Dynamic Island)
        DynamicIslandExpandedRegion(.center) {
          ExpandedView(context: context)
        }
      } compactLeading: {
        // Côté gauche de la vue compacte
        Image(systemName: getModeIcon(context.state.mode))
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(.white)
      } compactTrailing: {
        // Côté droit de la vue compacte
        Text(formatTime(context.state.remainingTime))
          .font(.system(size: 13, weight: .bold))
          .foregroundColor(.white)
      } minimal: {
        // Vue minimale (icône seulement)
        MinimalView(context: context)
      }
      .contentMargins(.horizontal, 12, for: .expanded)
    }
  }
}

// ============================================
// Helpers
// ============================================

// Formater le temps en MM:SS
func formatTime(_ seconds: Int) -> String {
  let minutes = seconds / 60
  let secs = seconds % 60
  return String(format: "%d:%02d", minutes, secs)
}

// Obtenir l'icône SF Symbol selon le mode
func getModeIcon(_ mode: String) -> String {
  switch mode {
  case "combat":
    return "figure.boxing"
  case "musculation":
    return "dumbbell.fill"
  case "tabata":
    return "timer"
  case "hiit":
    return "flame.fill"
  case "emom":
    return "clock.fill"
  case "amrap":
    return "repeat"
  default:
    return "timer"
  }
}
