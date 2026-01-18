// ============================================
// YOROI WATCH - Complications pour cadrans
// WidgetKit pour watchOS 10+
// ============================================

#if os(watchOS)
import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct YoroiProvider: TimelineProvider {
    func placeholder(in context: Context) -> YoroiEntry {
        YoroiEntry(date: Date(), hydration: 1500, streak: 12, steps: 5000)
    }

    func getSnapshot(in context: Context, completion: @escaping (YoroiEntry) -> Void) {
        let healthManager = HealthManager.shared
        let entry = YoroiEntry(
            date: Date(),
            hydration: healthManager.waterIntake,
            streak: healthManager.streak,
            steps: healthManager.steps
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<YoroiEntry>) -> Void) {
        let healthManager = HealthManager.shared
        let currentDate = Date()

        let entry = YoroiEntry(
            date: currentDate,
            hydration: healthManager.waterIntake,
            streak: healthManager.streak,
            steps: healthManager.steps
        )

        // Rafraîchir toutes les 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct YoroiEntry: TimelineEntry {
    let date: Date
    let hydration: Double
    let streak: Int
    let steps: Int
}

// MARK: - Hydration Complication

struct HydrationComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 2) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.cyan)
                    Text("\(Int(entry.hydration))")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.cyan)
                }
            }

        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "drop.fill")
                    .font(.system(size: 20))
                    .foregroundColor(.cyan)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Hydratation")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Text("\(Int(entry.hydration)) ml")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
            }

        case .accessoryCorner:
            Text("\(Int(entry.hydration))")
                .font(.system(size: 14, weight: .bold))
                .widgetLabel {
                    Image(systemName: "drop.fill")
                }

        case .accessoryInline:
            Label("\(Int(entry.hydration)) ml", systemImage: "drop.fill")

        default:
            Text("\(Int(entry.hydration))")
        }
    }
}

struct HydrationComplication: Widget {
    let kind: String = "HydrationComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            HydrationComplicationView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Hydratation")
        .description("Suivez votre consommation d'eau")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryCorner, .accessoryInline])
    }
}

// MARK: - Streak Complication

struct StreakComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 2) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.orange)
                    Text("\(entry.streak)")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.orange)
                }
            }

        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 20))
                    .foregroundColor(.orange)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Série")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Text("\(entry.streak) jours")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
            }

        case .accessoryCorner:
            Text("\(entry.streak)")
                .font(.system(size: 14, weight: .bold))
                .widgetLabel {
                    Image(systemName: "flame.fill")
                }

        case .accessoryInline:
            Label("\(entry.streak) jours", systemImage: "flame.fill")

        default:
            Text("\(entry.streak)")
        }
    }
}

struct StreakComplication: Widget {
    let kind: String = "StreakComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            StreakComplicationView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Série")
        .description("Votre série d'entraînements")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryCorner, .accessoryInline])
    }
}

// MARK: - Steps Complication

struct StepsComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var formattedSteps: String {
        if entry.steps >= 1000 {
            return String(format: "%.1fk", Double(entry.steps) / 1000)
        }
        return "\(entry.steps)"
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 2) {
                    Image(systemName: "figure.walk")
                        .font(.system(size: 14))
                        .foregroundColor(.green)
                    Text(formattedSteps)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.green)
                }
            }

        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "figure.walk")
                    .font(.system(size: 20))
                    .foregroundColor(.green)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Pas")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Text("\(entry.steps)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
            }

        case .accessoryCorner:
            Text(formattedSteps)
                .font(.system(size: 14, weight: .bold))
                .widgetLabel {
                    Image(systemName: "figure.walk")
                }

        case .accessoryInline:
            Label("\(entry.steps) pas", systemImage: "figure.walk")

        default:
            Text(formattedSteps)
        }
    }
}

struct StepsComplication: Widget {
    let kind: String = "StepsComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            StepsComplicationView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Pas")
        .description("Compteur de pas")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryCorner, .accessoryInline])
    }
}
#endif
