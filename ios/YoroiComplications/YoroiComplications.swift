//
//  YoroiComplications.swift
//  YoroiComplications
//
//  Complications Apple Watch pour Yoroi
//  6 complications différentes pour le cadran
//

import WidgetKit
import SwiftUI

// MARK: - Shared Data Store
class YoroiDataStore {
    static let shared = YoroiDataStore()

    private let userDefaults = UserDefaults(suiteName: "group.com.houari.yoroi")

    var streak: Int {
        userDefaults?.integer(forKey: "streak") ?? 0
    }

    var weight: Double {
        userDefaults?.double(forKey: "currentWeight") ?? 0
    }

    var workoutsThisWeek: Int {
        userDefaults?.integer(forKey: "workoutsThisWeek") ?? 0
    }

    var waterIntake: Double {
        userDefaults?.double(forKey: "waterIntake") ?? 0
    }

    var stepsToday: Int {
        userDefaults?.integer(forKey: "stepsToday") ?? 0
    }

    var personalRecord: String {
        userDefaults?.string(forKey: "lastRecord") ?? "—"
    }

    var rank: String {
        userDefaults?.string(forKey: "rank") ?? "Ashigaru"
    }

    var level: Int {
        userDefaults?.integer(forKey: "level") ?? 1
    }
}

// MARK: - Timeline Entry
struct YoroiEntry: TimelineEntry {
    let date: Date
    let streak: Int
    let weight: Double
    let workouts: Int
    let water: Double
    let steps: Int
    let record: String
    let rank: String
    let level: Int
}

// MARK: - Timeline Provider
struct YoroiProvider: TimelineProvider {
    func placeholder(in context: Context) -> YoroiEntry {
        YoroiEntry(
            date: Date(),
            streak: 7,
            weight: 75.0,
            workouts: 3,
            water: 2.0,
            steps: 8500,
            record: "100kg",
            rank: "Samurai",
            level: 5
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (YoroiEntry) -> Void) {
        let entry = createEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<YoroiEntry>) -> Void) {
        let entry = createEntry()
        // Refresh toutes les 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func createEntry() -> YoroiEntry {
        let store = YoroiDataStore.shared
        return YoroiEntry(
            date: Date(),
            streak: store.streak,
            weight: store.weight,
            workouts: store.workoutsThisWeek,
            water: store.waterIntake,
            steps: store.stepsToday,
            record: store.personalRecord,
            rank: store.rank,
            level: store.level
        )
    }
}

// MARK: - 1. STREAK COMPLICATION
struct StreakComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.orange)
                    Text("\(entry.streak)")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                    .font(.title2)
                    .foregroundColor(.orange)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Série")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(entry.streak) jours")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                Spacer()
            }
        case .accessoryInline:
            Label("\(entry.streak) jours", systemImage: "flame.fill")
        case .accessoryCorner:
            ZStack {
                Image(systemName: "flame.fill")
                    .font(.title3)
                    .foregroundColor(.orange)
            }
            .widgetLabel {
                Text("\(entry.streak)j")
            }
        default:
            Text("\(entry.streak)")
        }
    }
}

struct StreakComplication: Widget {
    let kind = "YoroiStreak"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            StreakComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("🔥 Série")
        .description("Ta série d'entraînements consécutifs")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

// MARK: - 2. WEIGHT COMPLICATION
struct WeightComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var formattedWeight: String {
        entry.weight > 0 ? String(format: "%.1f", entry.weight) : "—"
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: "scalemass.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.cyan)
                    Text(formattedWeight)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                    Text("kg")
                        .font(.system(size: 8))
                        .foregroundColor(.secondary)
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "scalemass.fill")
                    .font(.title2)
                    .foregroundColor(.cyan)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Poids")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(formattedWeight) kg")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                Spacer()
            }
        case .accessoryInline:
            Label("\(formattedWeight) kg", systemImage: "scalemass.fill")
        case .accessoryCorner:
            ZStack {
                Image(systemName: "scalemass.fill")
                    .font(.title3)
                    .foregroundColor(.cyan)
            }
            .widgetLabel {
                Text("\(formattedWeight)kg")
            }
        default:
            Text(formattedWeight)
        }
    }
}

struct WeightComplication: Widget {
    let kind = "YoroiWeight"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            WeightComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("⚖️ Poids")
        .description("Ton poids actuel")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

// MARK: - 3. WORKOUTS COMPLICATION
struct WorkoutsComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: "dumbbell.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.purple)
                    Text("\(entry.workouts)")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "dumbbell.fill")
                    .font(.title2)
                    .foregroundColor(.purple)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Cette semaine")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(entry.workouts) séances")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                Spacer()
            }
        case .accessoryInline:
            Label("\(entry.workouts) séances", systemImage: "dumbbell.fill")
        case .accessoryCorner:
            ZStack {
                Image(systemName: "dumbbell.fill")
                    .font(.title3)
                    .foregroundColor(.purple)
            }
            .widgetLabel {
                Text("\(entry.workouts)")
            }
        default:
            Text("\(entry.workouts)")
        }
    }
}

struct WorkoutsComplication: Widget {
    let kind = "YoroiWorkouts"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            WorkoutsComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("💪 Séances")
        .description("Tes entraînements cette semaine")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

// MARK: - 4. WATER COMPLICATION
struct WaterComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var formattedWater: String {
        String(format: "%.1f", entry.water)
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.blue)
                    Text(formattedWater)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                    Text("L")
                        .font(.system(size: 8))
                        .foregroundColor(.secondary)
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "drop.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Hydratation")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(formattedWater) L")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                Spacer()
            }
        case .accessoryInline:
            Label("\(formattedWater)L d'eau", systemImage: "drop.fill")
        case .accessoryCorner:
            ZStack {
                Image(systemName: "drop.fill")
                    .font(.title3)
                    .foregroundColor(.blue)
            }
            .widgetLabel {
                Text("\(formattedWater)L")
            }
        default:
            Text(formattedWater)
        }
    }
}

struct WaterComplication: Widget {
    let kind = "YoroiWater"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            WaterComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("💧 Hydratation")
        .description("Ta consommation d'eau aujourd'hui")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

// MARK: - 5. STEPS COMPLICATION
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
                VStack(spacing: 0) {
                    Image(systemName: "figure.walk")
                        .font(.system(size: 12))
                        .foregroundColor(.green)
                    Text(formattedSteps)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "figure.walk")
                    .font(.title2)
                    .foregroundColor(.green)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Pas")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(entry.steps.formatted())")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                Spacer()
            }
        case .accessoryInline:
            Label("\(entry.steps.formatted()) pas", systemImage: "figure.walk")
        case .accessoryCorner:
            ZStack {
                Image(systemName: "figure.walk")
                    .font(.title3)
                    .foregroundColor(.green)
            }
            .widgetLabel {
                Text(formattedSteps)
            }
        default:
            Text(formattedSteps)
        }
    }
}

struct StepsComplication: Widget {
    let kind = "YoroiSteps"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            StepsComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("🚶 Pas")
        .description("Tes pas aujourd'hui")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

// MARK: - 6. RANK COMPLICATION
struct RankComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.yellow)
                    Text("Nv\(entry.level)")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                }
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "star.fill")
                    .font(.title2)
                    .foregroundColor(.yellow)
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.rank)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("Niveau \(entry.level)")
                        .font(.headline)
                        .fontWeight(.bold)
                }
                Spacer()
            }
        case .accessoryInline:
            Label("\(entry.rank) Nv.\(entry.level)", systemImage: "star.fill")
        case .accessoryCorner:
            ZStack {
                Image(systemName: "star.fill")
                    .font(.title3)
                    .foregroundColor(.yellow)
            }
            .widgetLabel {
                Text("Nv\(entry.level)")
            }
        default:
            Text("Nv\(entry.level)")
        }
    }
}

struct RankComplication: Widget {
    let kind = "YoroiRank"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiProvider()) { entry in
            RankComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("⭐ Rang")
        .description("Ton rang et niveau")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

// MARK: - Previews
#Preview(as: .accessoryCircular) {
    StreakComplication()
} timeline: {
    YoroiEntry(date: .now, streak: 7, weight: 75.5, workouts: 3, water: 2.0, steps: 8500, record: "100kg", rank: "Samurai", level: 5)
}
