//
//  YoroiTimerWidgetLiveActivity.swift
//  YoroiTimerWidget
//
//  Dynamic Island + Lock Screen pour le Timer Yoroi
//  Affiche le temps restant, le mode, et les rounds en temps réel
//

import ActivityKit
import WidgetKit
import SwiftUI

// ============================================
// LIVE ACTIVITY - DYNAMIC ISLAND & LOCK SCREEN
// ============================================

struct YoroiTimerWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerAttributes.self) { context in
            // ============================================
            // LOCK SCREEN / BANNER UI
            // ============================================
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // ============================================
                // EXPANDED VIEW (when tapped)
                // ============================================

                DynamicIslandExpandedRegion(.leading) {
                    // Icône du mode à gauche
                    VStack(alignment: .leading, spacing: 2) {
                        Image(systemName: getModeIcon(context.state.mode))
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(context.state.isResting ? .orange : .green)

                        Text(context.state.mode.uppercased())
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(.gray)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    // Rounds à droite (si applicable)
                    if let roundNumber = context.state.roundNumber,
                       let totalRounds = context.state.totalRounds {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("ROUND")
                                .font(.system(size: 8, weight: .black))
                                .foregroundColor(.gray)

                            Text("\(roundNumber)/\(totalRounds)")
                                .font(.system(size: 18, weight: .heavy))
                                .foregroundColor(.white)
                        }
                    }
                }

                DynamicIslandExpandedRegion(.center) {
                    // Timer au centre (grand)
                    VStack(spacing: 4) {
                        Text(formatTime(context.state.remainingTime))
                            .font(.system(size: 40, weight: .heavy, design: .rounded))
                            .foregroundColor(context.state.isResting ? .orange : .white)
                            .monospacedDigit()

                        // Barre de progression
                        ProgressBar(
                            current: context.state.remainingTime,
                            total: context.state.totalTime,
                            isResting: context.state.isResting
                        )
                        .frame(height: 6)
                        .padding(.horizontal, 20)

                        Text(context.state.isResting ? "🧘 REPOS" : "💪 TRAVAIL")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(context.state.isResting ? .orange : .green)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    // Nom du timer en bas
                    HStack {
                        Image(systemName: "timer")
                            .font(.system(size: 12))

                        Text(context.attributes.timerName)
                            .font(.system(size: 13, weight: .semibold))
                            .lineLimit(1)
                    }
                    .foregroundColor(.gray)
                }

            } compactLeading: {
                // ============================================
                // COMPACT LEADING (gauche de l'île)
                // ============================================
                Image(systemName: context.state.isResting ? "pause.circle.fill" : "timer")
                    .foregroundColor(context.state.isResting ? .orange : .green)
                    .font(.system(size: 16))

            } compactTrailing: {
                // ============================================
                // COMPACT TRAILING (droite de l'île)
                // ============================================
                Text(formatTimeCompact(context.state.remainingTime))
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(context.state.isResting ? .orange : .white)
                    .monospacedDigit()

            } minimal: {
                // ============================================
                // MINIMAL (quand plusieurs Live Activities)
                // ============================================
                Image(systemName: context.state.isResting ? "pause.fill" : "flame.fill")
                    .foregroundColor(context.state.isResting ? .orange : .red)
                    .font(.system(size: 12))
            }
            .widgetURL(URL(string: "yoroi://timer"))
            .keylineTint(context.state.isResting ? .orange : .green)
        }
    }
}

// ============================================
// LOCK SCREEN VIEW
// ============================================

struct LockScreenView: View {
    let context: ActivityViewContext<TimerAttributes>

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                Image(systemName: getModeIcon(context.state.mode))
                    .font(.system(size: 18, weight: .bold))

                Text(context.attributes.timerName)
                    .font(.system(size: 16, weight: .bold))
                    .lineLimit(1)

                Spacer()

                if let roundNumber = context.state.roundNumber,
                   let totalRounds = context.state.totalRounds {
                    Text("R\(roundNumber)/\(totalRounds)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.gray)
                }
            }

            // Timer principal
            HStack(spacing: 8) {
                Text(formatTime(context.state.remainingTime))
                    .font(.system(size: 36, weight: .heavy, design: .rounded))
                    .foregroundColor(context.state.isResting ? .orange : .green)
                    .monospacedDigit()

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.isResting ? "REPOS" : "TRAVAIL")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(context.state.isResting ? .orange : .green)

                    Text(context.state.mode.uppercased())
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.gray)
                }
            }

            // Barre de progression
            ProgressBar(
                current: context.state.remainingTime,
                total: context.state.totalTime,
                isResting: context.state.isResting
            )
            .frame(height: 8)
        }
        .padding(16)
        .activityBackgroundTint(Color.black.opacity(0.8))
        .activitySystemActionForegroundColor(Color.white)
    }
}

// ============================================
// PROGRESS BAR
// ============================================

struct ProgressBar: View {
    let current: Int
    let total: Int
    let isResting: Bool

    var progress: Double {
        guard total > 0 else { return 0 }
        return Double(current) / Double(total)
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.3))

                // Progress
                RoundedRectangle(cornerRadius: 4)
                    .fill(isResting ? Color.orange : Color.green)
                    .frame(width: geometry.size.width * progress)
            }
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

func formatTime(_ seconds: Int) -> String {
    let mins = seconds / 60
    let secs = seconds % 60
    return String(format: "%d:%02d", mins, secs)
}

func formatTimeCompact(_ seconds: Int) -> String {
    let mins = seconds / 60
    let secs = seconds % 60

    if mins > 0 {
        return "\(mins)m"
    } else {
        return "\(secs)s"
    }
}

func getModeIcon(_ mode: String) -> String {
    switch mode.lowercased() {
    case "musculation":
        return "dumbbell.fill"
    case "combat":
        return "figure.boxing"
    case "tabata":
        return "flame.fill"
    case "hiit":
        return "bolt.fill"
    case "emom":
        return "clock.fill"
    case "amrap":
        return "infinity"
    default:
        return "timer"
    }
}

// ============================================
// PREVIEW
// ============================================

#Preview("Notification", as: .content, using: TimerAttributes(timerName: "Combat Intense")) {
   YoroiTimerWidgetLiveActivity()
} contentStates: {
    // En travail
    TimerAttributes.ContentState(
        remainingTime: 180,
        totalTime: 180,
        mode: "combat",
        isResting: false,
        roundNumber: 1,
        totalRounds: 5
    )

    // En repos
    TimerAttributes.ContentState(
        remainingTime: 30,
        totalTime: 60,
        mode: "combat",
        isResting: true,
        roundNumber: 1,
        totalRounds: 5
    )
}
