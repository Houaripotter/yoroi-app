// ============================================
// YOROI WATCH - Timer Complication
// Affiche le timer actif sur le cadran Watch
// ============================================

import SwiftUI
import WidgetKit

struct TimerComplicationEntry: TimelineEntry {
    let date: Date
    let timerActive: Bool
    let timerDuration: Int // secondes écoulées
    let timerTotal: Int // durée totale en secondes
}

struct TimerComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> TimerComplicationEntry {
        TimerComplicationEntry(
            date: Date(),
            timerActive: false,
            timerDuration: 0,
            timerTotal: 0
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TimerComplicationEntry) -> Void) {
        // Lire l'état du timer depuis UserDefaults partagé
        let entry = loadTimerState()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TimerComplicationEntry>) -> Void) {
        let entry = loadTimerState()

        // Mettre à jour toutes les minutes si le timer est actif
        let refreshDate = entry.timerActive ? Date().addingTimeInterval(60) : Date().addingTimeInterval(3600)
        let timeline = Timeline(entries: [entry], policy: .after(refreshDate))

        completion(timeline)
    }

    private func loadTimerState() -> TimerComplicationEntry {
        // Lire depuis UserDefaults le timer actuel
        let defaults = UserDefaults(suiteName: "group.com.houari.yoroi")
        let timerActive = defaults?.bool(forKey: "timerActive") ?? false
        let timerDuration = defaults?.integer(forKey: "timerDuration") ?? 0
        let timerTotal = defaults?.integer(forKey: "timerTotal") ?? 0

        return TimerComplicationEntry(
            date: Date(),
            timerActive: timerActive,
            timerDuration: timerDuration,
            timerTotal: timerTotal
        )
    }
}

struct TimerComplicationView: View {
    var entry: TimerComplicationEntry

    var body: some View {
        ZStack {
            // Cercle de progression
            if entry.timerActive && entry.timerTotal > 0 {
                Circle()
                    .trim(from: 0, to: CGFloat(entry.timerDuration) / CGFloat(entry.timerTotal))
                    .stroke(Color.red, lineWidth: 3)
                    .rotationEffect(.degrees(-90))
            }

            // Icône ou temps
            if entry.timerActive {
                VStack(spacing: 0) {
                    Image(systemName: "timer")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.red)
                    Text(formatTime(entry.timerDuration))
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.red)
                }
            } else {
                Image(systemName: "timer")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.gray)
            }
        }
    }

    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }
}

struct TimerComplication: Widget {
    let kind: String = "TimerComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TimerComplicationProvider()) { entry in
            TimerComplicationView(entry: entry)
        }
        .configurationDisplayName("Yoroi Timer")
        .description("Affiche le timer actif")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryInline
        ])
    }
}

#Preview("Timer Complication") {
    TimerComplicationView(entry: TimerComplicationEntry(
        date: Date(),
        timerActive: true,
        timerDuration: 125,
        timerTotal: 300
    ))
    .previewContext(WidgetPreviewContext(family: .accessoryCircular))
}
