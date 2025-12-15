import WidgetKit
import SwiftUI

// ============================================
// YOROI WIDGET - Dernier Poids
// ============================================
// Affiche le dernier poids enregistré et le delta

struct WeightEntry: TimelineEntry {
    let date: Date
    let weight: Double
    let delta: Double
    let lastUpdated: Date?
}

struct Provider: TimelineProvider {
    // App Group ID pour partager les données
    let appGroupID = "group.com.houari.yoroi"

    func placeholder(in context: Context) -> WeightEntry {
        WeightEntry(date: Date(), weight: 75.0, delta: -0.5, lastUpdated: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (WeightEntry) -> ()) {
        let entry = loadWeightData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeightEntry>) -> ()) {
        let entry = loadWeightData()

        // Mise à jour toutes les 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadWeightData() -> WeightEntry {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            return WeightEntry(date: Date(), weight: 0, delta: 0, lastUpdated: nil)
        }

        let weight = defaults.double(forKey: "lastWeight")
        let delta = defaults.double(forKey: "weightDelta")
        let timestamp = defaults.double(forKey: "lastWeightDate")

        var lastUpdated: Date? = nil
        if timestamp > 0 {
            lastUpdated = Date(timeIntervalSince1970: timestamp)
        }

        return WeightEntry(
            date: Date(),
            weight: weight > 0 ? weight : 0,
            delta: delta,
            lastUpdated: lastUpdated
        )
    }
}

// Vue principale du widget
struct YoroiWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    // Couleurs
    let goldColor = Color(red: 212/255, green: 175/255, blue: 55/255)
    let backgroundColor = Color(red: 13/255, green: 13/255, blue: 13/255)
    let cardColor = Color(red: 26/255, green: 26/255, blue: 26/255)

    var body: some View {
        ZStack {
            // Background
            backgroundColor

            VStack(spacing: 8) {
                // Logo
                HStack {
                    Text("YOROI")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(goldColor)
                    Spacer()
                    Image(systemName: "figure.strengthtraining.traditional")
                        .foregroundColor(goldColor)
                        .font(.system(size: 12))
                }

                Spacer()

                if entry.weight > 0 {
                    // Poids actuel
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(String(format: "%.1f", entry.weight))
                            .font(.system(size: family == .systemSmall ? 36 : 44, weight: .bold))
                            .foregroundColor(.white)
                        Text("kg")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.gray)
                    }

                    // Delta
                    if entry.delta != 0 {
                        HStack(spacing: 4) {
                            Image(systemName: entry.delta < 0 ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                                .foregroundColor(entry.delta < 0 ? .green : .red)
                                .font(.system(size: 14))

                            Text(String(format: "%@%.1f kg", entry.delta > 0 ? "+" : "", entry.delta))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(entry.delta < 0 ? .green : .red)
                        }
                    }

                    // Date de dernière mise à jour
                    if let lastUpdated = entry.lastUpdated {
                        Text(formatDate(lastUpdated))
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                    }
                } else {
                    // Pas de données
                    VStack(spacing: 4) {
                        Image(systemName: "scalemass")
                            .font(.system(size: 28))
                            .foregroundColor(.gray)
                        Text("Aucune pesée")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                }

                Spacer()
            }
            .padding(12)
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// Configuration du Widget
struct YoroiWidget: Widget {
    let kind: String = "YoroiWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            YoroiWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Poids Yoroi")
        .description("Affiche ton dernier poids et ta progression")
        .supportedFamilies([.systemSmall])
    }
}

// Preview
struct YoroiWidget_Previews: PreviewProvider {
    static var previews: some View {
        YoroiWidgetEntryView(entry: WeightEntry(
            date: Date(),
            weight: 74.5,
            delta: -1.2,
            lastUpdated: Date()
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
