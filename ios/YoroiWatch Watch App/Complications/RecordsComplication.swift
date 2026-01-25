// ============================================
// YOROI WATCH - Records Complication
// Affiche le dernier record sur le cadran Watch
// ============================================

import SwiftUI
import WidgetKit

struct RecordsComplicationEntry: TimelineEntry {
    let date: Date
    let exerciseName: String
    let recordValue: String
    let recordType: String // "PR" ou "Volume"
}

struct RecordsComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecordsComplicationEntry {
        RecordsComplicationEntry(
            date: Date(),
            exerciseName: "Squat",
            recordValue: "120kg",
            recordType: "PR"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (RecordsComplicationEntry) -> Void) {
        let entry = loadRecordState()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecordsComplicationEntry>) -> Void) {
        let entry = loadRecordState()

        // Mettre à jour toutes les heures
        let refreshDate = Date().addingTimeInterval(3600)
        let timeline = Timeline(entries: [entry], policy: .after(refreshDate))

        completion(timeline)
    }

    private func loadRecordState() -> RecordsComplicationEntry {
        // Lire depuis UserDefaults le dernier record
        let defaults = UserDefaults(suiteName: "group.com.houari.yoroi")
        let exerciseName = defaults?.string(forKey: "lastRecordExercise") ?? "No Record"
        let recordValue = defaults?.string(forKey: "lastRecordValue") ?? "--"
        let recordType = defaults?.string(forKey: "lastRecordType") ?? "PR"

        return RecordsComplicationEntry(
            date: Date(),
            exerciseName: exerciseName,
            recordValue: recordValue,
            recordType: recordType
        )
    }
}

struct RecordsComplicationView: View {
    var entry: RecordsComplicationEntry

    var body: some View {
        ZStack {
            // Badge "PR" ou "Vol"
            Circle()
                .fill(entry.recordType == "PR" ? Color.yellow : Color.orange)
                .opacity(0.2)

            VStack(spacing: 2) {
                // Type de record
                Text(entry.recordType)
                    .font(.system(size: 8, weight: .black))
                    .foregroundColor(entry.recordType == "PR" ? .yellow : .orange)

                // Valeur
                if entry.exerciseName != "No Record" {
                    Text(entry.recordValue)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                } else {
                    Image(systemName: "trophy")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

struct RecordsComplication: Widget {
    let kind: String = "RecordsComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecordsComplicationProvider()) { entry in
            RecordsComplicationView(entry: entry)
        }
        .configurationDisplayName("Yoroi Records")
        .description("Affiche ton dernier record")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryInline,
            .accessoryRectangular
        ])
    }
}

#Preview("Records Complication") {
    RecordsComplicationView(entry: RecordsComplicationEntry(
        date: Date(),
        exerciseName: "Squat",
        recordValue: "120kg",
        recordType: "PR"
    ))
    .previewContext(WidgetPreviewContext(family: .accessoryCircular))
}
