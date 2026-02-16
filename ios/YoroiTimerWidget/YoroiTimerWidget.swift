//
//  YoroiTimerWidget.swift
//  YoroiTimerWidget
//
//  Widget statique pour le Home Screen
//

import WidgetKit
import SwiftUI

// ============================================
// WIDGET STATIQUE (HOME SCREEN)
// ============================================

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), workoutsToday: 0, streakDays: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), workoutsToday: 0, streakDays: 0)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []

        // Mise à jour toutes les heures
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, workoutsToday: 0, streakDays: 0)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let workoutsToday: Int
    let streakDays: Int
}

struct YoroiTimerWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack(spacing: 8) {
            // Header
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                    .font(.system(size: 16, weight: .bold))

                Text("YOROI")
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.white)

                Spacer()
            }

            Spacer()

            // Stats
            HStack(spacing: 20) {
                VStack(spacing: 4) {
                    Text("\(entry.workoutsToday)")
                        .font(.system(size: 24, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)

                    Text("Workouts")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.gray)
                }

                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 1, height: 40)

                VStack(spacing: 4) {
                    Text("\(entry.streakDays)")
                        .font(.system(size: 24, weight: .heavy, design: .rounded))
                        .foregroundColor(.orange)

                    Text("Streak")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.gray)
                }
            }

            Spacer()

            // Footer
            Text(entry.date, style: .time)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.gray.opacity(0.6))
        }
        .padding()
    }
}

struct YoroiTimerWidget: Widget {
    let kind: String = "YoroiTimerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                YoroiTimerWidgetEntryView(entry: entry)
                    .containerBackground(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.black, Color.gray.opacity(0.8)]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        for: .widget
                    )
            } else {
                YoroiTimerWidgetEntryView(entry: entry)
                    .padding()
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.black, Color.gray.opacity(0.8)]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }
        }
        .configurationDisplayName("Yoroi Stats")
        .description("Vois tes stats d'entraînement rapidement")
        .supportedFamilies([.systemSmall])
    }
}

#Preview(as: .systemSmall) {
    YoroiTimerWidget()
} timeline: {
    SimpleEntry(date: .now, workoutsToday: 3, streakDays: 7)
    SimpleEntry(date: .now, workoutsToday: 0, streakDays: 0)
}
