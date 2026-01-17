//
//  YoroiComplication.swift
//  YoroiWatch Watch App
//
//  Complications pour le cadran Apple Watch
//

import SwiftUI
import WidgetKit

// MARK: - Complication Entry

struct YoroiComplicationEntry: TimelineEntry {
    let date: Date
    let hydrationProgress: Double
    let hydrationCurrent: Int
    let hydrationGoal: Int
    let currentWeight: Double
    let targetWeight: Double
    let todaySteps: Int
    let todaySets: Int
}

// MARK: - Timeline Provider

struct YoroiComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> YoroiComplicationEntry {
        YoroiComplicationEntry(
            date: Date(),
            hydrationProgress: 0.6,
            hydrationCurrent: 1800,
            hydrationGoal: 3000,
            currentWeight: 78.0,
            targetWeight: 75.0,
            todaySteps: 5000,
            todaySets: 12
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (YoroiComplicationEntry) -> Void) {
        let entry = placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<YoroiComplicationEntry>) -> Void) {
        // Récupérer les données depuis UserDefaults (synchronisé via WatchConnectivity)
        let watchData = WatchConnectivityManager.shared.watchData
        let healthKit = HealthKitManager.shared

        let entry = YoroiComplicationEntry(
            date: Date(),
            hydrationProgress: watchData.hydrationProgress,
            hydrationCurrent: watchData.hydrationCurrent,
            hydrationGoal: watchData.hydrationGoal,
            currentWeight: watchData.currentWeight,
            targetWeight: watchData.targetWeight,
            todaySteps: healthKit.todaySteps,
            todaySets: UserDefaults.standard.integer(forKey: "todaySets")
        )

        // Mise à jour toutes les 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Circular Complication (Hydratation)

struct HydrationCircularView: View {
    let entry: YoroiComplicationEntry

    var body: some View {
        ZStack {
            // Cercle de progression
            Circle()
                .stroke(Color.cyan.opacity(0.3), lineWidth: 4)

            Circle()
                .trim(from: 0, to: entry.hydrationProgress)
                .stroke(Color.cyan, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))

            // Icône centrale
            VStack(spacing: 0) {
                Image(systemName: "drop.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.cyan)
                Text("\(Int(entry.hydrationProgress * 100))%")
                    .font(.system(size: 9, weight: .bold))
            }
        }
        .padding(2)
    }
}

// MARK: - Rectangular Complication (Poids)

struct WeightRectangularView: View {
    let entry: YoroiComplicationEntry

    var body: some View {
        HStack {
            Image(systemName: "scalemass.fill")
                .foregroundColor(.orange)
                .font(.title3)

            VStack(alignment: .leading, spacing: 2) {
                Text(String(format: "%.1f kg", entry.currentWeight))
                    .font(.system(size: 14, weight: .bold))

                HStack(spacing: 2) {
                    Image(systemName: "target")
                        .font(.system(size: 8))
                    Text(String(format: "%.1f kg", entry.targetWeight))
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 8)
    }
}

// MARK: - Corner Complication (Pas)

struct StepsCornerView: View {
    let entry: YoroiComplicationEntry

    var body: some View {
        VStack(spacing: 0) {
            Image(systemName: "figure.walk")
                .font(.system(size: 10))
                .foregroundColor(.green)
            Text("\(formatSteps(entry.todaySteps))")
                .font(.system(size: 10, weight: .semibold))
        }
    }

    private func formatSteps(_ steps: Int) -> String {
        if steps >= 1000 {
            return String(format: "%.1fk", Double(steps) / 1000)
        }
        return "\(steps)"
    }
}

// MARK: - Inline Complication (Séries)

struct SetsInlineView: View {
    let entry: YoroiComplicationEntry

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "dumbbell.fill")
                .font(.system(size: 10))
            Text("\(entry.todaySets) séries")
                .font(.system(size: 12))
        }
    }
}

// MARK: - Widget

struct YoroiComplicationBundle: Widget {
    let kind: String = "YoroiComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiComplicationProvider()) { entry in
            YoroiComplicationEntryView(entry: entry)
        }
        .configurationDisplayName("Yoroi")
        .description("Suivez votre hydratation, poids et entraînement")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryCorner,
            .accessoryInline
        ])
    }
}

// MARK: - Entry View

struct YoroiComplicationEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: YoroiComplicationEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            HydrationCircularView(entry: entry)
        case .accessoryRectangular:
            WeightRectangularView(entry: entry)
        case .accessoryCorner:
            StepsCornerView(entry: entry)
        case .accessoryInline:
            SetsInlineView(entry: entry)
        @unknown default:
            HydrationCircularView(entry: entry)
        }
    }
}

// MARK: - Previews

#Preview("Circular", as: .accessoryCircular) {
    YoroiComplicationBundle()
} timeline: {
    YoroiComplicationEntry(
        date: Date(),
        hydrationProgress: 0.6,
        hydrationCurrent: 1800,
        hydrationGoal: 3000,
        currentWeight: 78.0,
        targetWeight: 75.0,
        todaySteps: 5000,
        todaySets: 12
    )
}

#Preview("Rectangular", as: .accessoryRectangular) {
    YoroiComplicationBundle()
} timeline: {
    YoroiComplicationEntry(
        date: Date(),
        hydrationProgress: 0.6,
        hydrationCurrent: 1800,
        hydrationGoal: 3000,
        currentWeight: 78.0,
        targetWeight: 75.0,
        todaySteps: 5000,
        todaySets: 12
    )
}
