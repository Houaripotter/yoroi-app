// ============================================
// YOROI WIDGET — Home Screen iOS
// Affiche 3 KPI sportifs (séances cette semaine, streak, dernière pesée)
// directement sur l'écran d'accueil. Tailles: small, medium, large.
//
// Les données sont écrites par l'app principale dans UserDefaults
// du suite "group.com.houari.yoroi" (App Group à configurer dans Xcode).
// ============================================

import WidgetKit
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// MARK: - Modèle de données

struct YoroiStats {
    let weeklyTrainings: Int     // Nombre de séances cette semaine
    let streakDays: Int          // Jours consécutifs avec séance
    let latestWeightKg: Double   // Dernière pesée
    let weightTrend: String      // "up" / "down" / "flat"
    let weeklyMinutes: Int       // Minutes d'entraînement cette semaine
    let lastUpdated: Date        // Quand ont été générées ces données

    static let placeholder = YoroiStats(
        weeklyTrainings: 4,
        streakDays: 7,
        latestWeightKg: 78.5,
        weightTrend: "down",
        weeklyMinutes: 320,
        lastUpdated: Date()
    )
}

// MARK: - Lecture App Group

let APP_GROUP = "group.com.houari.yoroi"

func loadStats() -> YoroiStats {
    guard let defaults = UserDefaults(suiteName: APP_GROUP) else {
        return YoroiStats.placeholder
    }
    return YoroiStats(
        weeklyTrainings: defaults.integer(forKey: "widget_weeklyTrainings"),
        streakDays: defaults.integer(forKey: "widget_streakDays"),
        latestWeightKg: defaults.double(forKey: "widget_latestWeightKg"),
        weightTrend: defaults.string(forKey: "widget_weightTrend") ?? "flat",
        weeklyMinutes: defaults.integer(forKey: "widget_weeklyMinutes"),
        lastUpdated: defaults.object(forKey: "widget_lastUpdated") as? Date ?? Date()
    )
}

// MARK: - Timeline Provider

struct StatsEntry: TimelineEntry {
    let date: Date
    let stats: YoroiStats
}

struct StatsProvider: TimelineProvider {
    func placeholder(in context: Context) -> StatsEntry {
        StatsEntry(date: Date(), stats: YoroiStats.placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (StatsEntry) -> Void) {
        completion(StatsEntry(date: Date(), stats: loadStats()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StatsEntry>) -> Void) {
        // Refresh toutes les 30 minutes (économie batterie)
        let entry = StatsEntry(date: Date(), stats: loadStats())
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(next))
        completion(timeline)
    }
}

// MARK: - UI Helpers

struct StatBox: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundColor(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .lineLimit(1)
        }
    }
}

func formatMinutes(_ min: Int) -> String {
    if min < 60 { return "\(min)min" }
    let h = min / 60
    let m = min % 60
    return m > 0 ? "\(h)h\(m)" : "\(h)h"
}

// MARK: - Vues par taille

struct SmallWidget: View {
    let stats: YoroiStats
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                    .font(.system(size: 14))
                Text("Yoroi")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)
            }
            Spacer()
            VStack(alignment: .leading, spacing: 4) {
                Text("\(stats.streakDays)")
                    .font(.system(size: 38, weight: .black, design: .rounded))
                    .foregroundColor(stats.streakDays > 0 ? .orange : .gray)
                Text(stats.streakDays > 1 ? "jours d'affilée" : "jour")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.secondary)
            }
        }
        .padding(12)
    }
}

struct MediumWidget: View {
    let stats: YoroiStats
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(.blue)
                    .font(.system(size: 14))
                Text("Yoroi · Cette semaine")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)
            }
            Spacer(minLength: 4)
            HStack(spacing: 18) {
                StatBox(
                    label: "Séances",
                    value: "\(stats.weeklyTrainings)",
                    color: .blue
                )
                StatBox(
                    label: "Temps",
                    value: formatMinutes(stats.weeklyMinutes),
                    color: .orange
                )
                StatBox(
                    label: "Streak",
                    value: "\(stats.streakDays)j",
                    color: stats.streakDays > 0 ? .red : .gray
                )
            }
        }
        .padding(14)
    }
}

struct LargeWidget: View {
    let stats: YoroiStats
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "figure.run")
                    .foregroundColor(.blue)
                    .font(.system(size: 18))
                Text("Yoroi")
                    .font(.system(size: 14, weight: .heavy))
                Spacer()
                Text("Cette semaine")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)
            }
            Divider()
            HStack(spacing: 14) {
                StatBox(label: "Séances", value: "\(stats.weeklyTrainings)", color: .blue)
                StatBox(label: "Temps", value: formatMinutes(stats.weeklyMinutes), color: .orange)
            }
            HStack(spacing: 14) {
                StatBox(
                    label: "Streak",
                    value: "\(stats.streakDays)j",
                    color: stats.streakDays > 0 ? .red : .gray
                )
                StatBox(
                    label: "Poids",
                    value: stats.latestWeightKg > 0 ? String(format: "%.1f kg", stats.latestWeightKg) : "—",
                    color: .purple
                )
            }
            Spacer()
            Text("Mis à jour \(stats.lastUpdated.formatted(date: .omitted, time: .shortened))")
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
        .padding(16)
    }
}

// MARK: - Widget Entry View

struct YoroiWidgetEntryView: View {
    var entry: StatsProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidget(stats: entry.stats)
        case .systemMedium:
            MediumWidget(stats: entry.stats)
        case .systemLarge:
            LargeWidget(stats: entry.stats)
        default:
            MediumWidget(stats: entry.stats)
        }
    }
}

// MARK: - Widget Configuration

@main
struct YoroiWidget: Widget {
    let kind: String = "YoroiWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StatsProvider()) { entry in
            if #available(iOS 17.0, *) {
                YoroiWidgetEntryView(entry: entry)
                    .containerBackground(.background, for: .widget)
            } else {
                YoroiWidgetEntryView(entry: entry)
                    .padding()
            }
        }
        .configurationDisplayName("Yoroi · Stats")
        .description("Vos statistiques sportives en un coup d'œil.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
