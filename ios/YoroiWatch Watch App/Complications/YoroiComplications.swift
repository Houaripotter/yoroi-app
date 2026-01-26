// ============================================
// YOROI WATCH - COMPLICATIONS (WIDGETS)
// Implémentation des cadrans pour l'Apple Watch
// ============================================

import WidgetKit
import SwiftUI

// MARK: - TIMELINE PROVIDER (Générique)
struct YoroiTimelineProvider: TimelineProvider {
    // Clé pour accéder aux données partagées
    let suiteName = "group.com.houari.yoroi"
    
    func placeholder(in context: Context) -> YoroiEntry {
        YoroiEntry(date: Date(), timerActive: false, timerDuration: 0, lastRecord: "Bench Press: 100kg", waterLevel: 1500, rank: "Samouraï")
    }

    func getSnapshot(in context: Context, completion: @escaping (YoroiEntry) -> ()) {
        completion(loadData())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<YoroiEntry>) -> ()) {
        // Rafraîchissement immédiat
        let entry = loadData()
        // On demande un rafraîchissement dans 15 minutes si rien ne change, 
        // mais l'app forcera le reload via ComplicationUpdateManager
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    // Charger les données depuis le UserDefaults partagé
    private func loadData() -> YoroiEntry {
        let defaults = UserDefaults(suiteName: suiteName)
        
        let timerActive = defaults?.bool(forKey: "timerActive") ?? false
        let timerDuration = defaults?.integer(forKey: "timerDuration") ?? 0
        
        let recordEx = defaults?.string(forKey: "lastRecordExercise") ?? "Musculation"
        let recordVal = defaults?.string(forKey: "lastRecordValue") ?? "--"
        let lastRecord = "\(recordEx): \(recordVal)"
        
        // Note: Ces clés doivent être synchronisées avec HealthManager si on veut l'eau/rang
        let water = defaults?.double(forKey: "waterIntake") ?? 0
        let rank = defaults?.string(forKey: "userRank") ?? "Novice"
        
        return YoroiEntry(
            date: Date(),
            timerActive: timerActive,
            timerDuration: timerDuration,
            lastRecord: lastRecord,
            waterLevel: Int(water),
            rank: rank
        )
    }
}

// MARK: - MODEL
struct YoroiEntry: TimelineEntry {
    let date: Date
    let timerActive: Bool
    let timerDuration: Int
    let lastRecord: String
    let waterLevel: Int
    let rank: String
}

// MARK: - WIDGETS VIEWS

// 1. TIMER VIEW
struct TimerComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                Circle().stroke(Color.orange.opacity(0.3), lineWidth: 4)
                if entry.timerActive {
                    Image(systemName: "timer")
                        .foregroundColor(.orange)
                } else {
                    Image(systemName: "stopwatch")
                        .foregroundColor(.gray)
                }
            }
        case .accessoryRectangular:
            HStack {
                Image(systemName: entry.timerActive ? "timer" : "stopwatch")
                    .foregroundColor(.orange)
                VStack(alignment: .leading) {
                    Text("CHRONO")
                        .font(.caption2)
                        .fontWeight(.bold)
                    if entry.timerActive {
                        Text("\(entry.timerDuration / 60) min")
                            .font(.headline)
                    } else {
                        Text("Prêt")
                            .font(.headline)
                            .foregroundColor(.gray)
                    }
                }
            }
        case .accessoryInline:
            if entry.timerActive {
                Text("⏱ \(entry.timerDuration / 60) min")
            } else {
                Text("YOROI Chrono")
            }
        case .accessoryCorner:
            Image(systemName: "timer")
                .foregroundColor(.orange)
        default:
            Text("Chrono")
        }
    }
}

// 2. RECORDS VIEW
struct RecordsComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading) {
                HStack {
                    Image(systemName: "trophy.fill")
                        .foregroundColor(.yellow)
                    Text("RECORD")
                        .font(.caption2)
                        .fontWeight(.bold)
                }
                Text(entry.lastRecord)
                    .font(.caption)
                    .lineLimit(1)
            }
        case .accessoryCircular:
            ZStack {
                Circle().fill(Color.yellow.opacity(0.2))
                Image(systemName: "trophy")
                    .foregroundColor(.yellow)
            }
        case .accessoryInline:
            Text("🏆 \(entry.lastRecord)")
        default:
            Image(systemName: "trophy")
        }
    }
}

// 3. DOJO/RANK VIEW
struct DojoComplicationView: View {
    var entry: YoroiEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                Circle().stroke(Color.red, lineWidth: 3)
                Text(String(entry.rank.prefix(1)))
                    .font(.title3)
                    .fontWeight(.black)
                    .foregroundColor(.red)
            }
        case .accessoryRectangular:
            HStack {
                Image(systemName: "figure.martial.arts")
                    .foregroundColor(.red)
                VStack(alignment: .leading) {
                    Text("RANG")
                        .font(.caption2)
                        .fontWeight(.bold)
                    Text(entry.rank.uppercased())
                        .font(.headline)
                        .foregroundColor(.red)
                }
            }
        case .accessoryInline:
            Text("🥋 \(entry.rank)")
        default:
            Image(systemName: "figure.martial.arts")
        }
    }
}

// MARK: - WIDGET DEFINITIONS
// NOTE: @main retiré car YoroiWatchApp.swift est déjà le point d'entrée principal
// Les complications doivent être enregistrées via une Widget Extension séparée dans Xcode

struct YoroiComplicationsBundle: WidgetBundle {
    var body: some Widget {
        TimerComplication()
        RecordsComplication()
        DojoComplication()
    }
}

struct TimerComplication: Widget {
    let kind: String = "TimerComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            TimerComplicationView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Chrono Yoroi")
        .description("Accès rapide au chronomètre.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner])
    }
}

struct RecordsComplication: Widget {
    let kind: String = "RecordsComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            RecordsComplicationView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Dernier Record")
        .description("Affiche votre dernière performance.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .accessoryCircular])
    }
}

struct DojoComplication: Widget {
    let kind: String = "DojoComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            DojoComplicationView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Rang Dojo")
        .description("Votre rang actuel dans le Dojo.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .accessoryCircular])
    }
}
