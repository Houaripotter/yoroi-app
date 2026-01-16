//
//  YoroiComplications.swift
//  YoroiWatch Watch App
//
//  Complications pour le cadran Apple Watch
//  Disponibles: Timer, Hydratation, Poids, Pas, Workout
//

import SwiftUI
import WidgetKit

// MARK: - Timeline Entry

struct YoroiEntry: TimelineEntry {
    let date: Date

    // Hydration
    let hydrationProgress: Double
    let hydrationCurrent: Int
    let hydrationGoal: Int

    // Weight
    let currentWeight: Double
    let targetWeight: Double
    let weightHistory: [Double]
    let weightTrend: WeightTrend

    // Steps
    let todaySteps: Int
    let stepsGoal: Int

    // Workout
    let isWorkoutActive: Bool
    let workoutDuration: TimeInterval
    let todaySets: Int

    // Timer
    let isTimerRunning: Bool
    let timerRemaining: Int
    let lastRestDuration: Int

    // Heart
    let heartRate: Int

    // Sleep
    let sleepDuration: String

    static var placeholder: YoroiEntry {
        YoroiEntry(
            date: Date(),
            hydrationProgress: 0.6,
            hydrationCurrent: 1800,
            hydrationGoal: 3000,
            currentWeight: 78.0,
            targetWeight: 75.0,
            weightHistory: [78.5, 78.3, 78.1, 78.4, 78.0, 77.8, 77.6],
            weightTrend: .down,
            todaySteps: 6500,
            stepsGoal: 10000,
            isWorkoutActive: false,
            workoutDuration: 0,
            todaySets: 0,
            isTimerRunning: false,
            timerRemaining: 0,
            lastRestDuration: 90,
            heartRate: 72,
            sleepDuration: "7h30"
        )
    }
}

// MARK: - Timeline Provider

struct YoroiTimelineProvider: TimelineProvider {
    let dataManager = ComplicationDataManager.shared

    func placeholder(in context: Context) -> YoroiEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (YoroiEntry) -> Void) {
        completion(createEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<YoroiEntry>) -> Void) {
        let entry = createEntry()

        // Mise à jour toutes les 5 minutes, ou plus fréquemment si timer actif
        let refreshInterval: TimeInterval = dataManager.isTimerRunning ? 1 : 300
        let nextUpdate = Date().addingTimeInterval(refreshInterval)

        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func createEntry() -> YoroiEntry {
        let workoutDuration: TimeInterval
        if let startTime = dataManager.workoutStartTime, dataManager.isWorkoutActive {
            workoutDuration = Date().timeIntervalSince(startTime)
        } else {
            workoutDuration = 0
        }

        return YoroiEntry(
            date: Date(),
            hydrationProgress: dataManager.hydrationProgress,
            hydrationCurrent: dataManager.hydrationCurrent,
            hydrationGoal: dataManager.hydrationGoal,
            currentWeight: dataManager.currentWeight,
            targetWeight: dataManager.targetWeight,
            weightHistory: dataManager.weightHistory,
            weightTrend: dataManager.weightTrend,
            todaySteps: dataManager.todaySteps,
            stepsGoal: dataManager.stepsGoal,
            isWorkoutActive: dataManager.isWorkoutActive,
            workoutDuration: workoutDuration,
            todaySets: dataManager.todaySets,
            isTimerRunning: dataManager.isTimerRunning,
            timerRemaining: dataManager.timerRemainingSeconds,
            lastRestDuration: dataManager.lastRestDuration,
            heartRate: dataManager.currentHeartRate,
            sleepDuration: dataManager.sleepDurationFormatted
        )
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - 1. HYDRATION COMPLICATION (Circular)
// MARK: - ═══════════════════════════════════════════════════════════════

struct HydrationComplicationView: View {
    let entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            circularView
        case .accessoryCorner:
            cornerView
        case .accessoryInline:
            inlineView
        case .accessoryRectangular:
            rectangularView
        default:
            circularView
        }
    }

    private var circularView: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(Color.cyan.opacity(0.3), lineWidth: 4)

            // Progress ring
            Circle()
                .trim(from: 0, to: entry.hydrationProgress)
                .stroke(Color.cyan, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))

            // Center content
            VStack(spacing: 0) {
                Image(systemName: "drop.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.cyan)
                Text("\(Int(entry.hydrationProgress * 100))%")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
            }
        }
        .padding(3)
    }

    private var cornerView: some View {
        ZStack {
            Circle()
                .trim(from: 0, to: entry.hydrationProgress)
                .stroke(Color.cyan, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Image(systemName: "drop.fill")
                .font(.system(size: 16))
                .foregroundColor(.cyan)
        }
    }

    private var inlineView: some View {
        HStack(spacing: 4) {
            Image(systemName: "drop.fill")
            Text("\(entry.hydrationCurrent)ml")
        }
    }

    private var rectangularView: some View {
        HStack(spacing: 8) {
            // Mini bottle
            ZStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.cyan.opacity(0.3))
                    .frame(width: 20, height: 40)

                VStack {
                    Spacer()
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.cyan)
                        .frame(width: 16, height: 36 * entry.hydrationProgress)
                }
                .frame(width: 20, height: 40)
                .clipped()
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Hydratation")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)

                Text("\(entry.hydrationCurrent)")
                    .font(.system(size: 18, weight: .bold, design: .rounded))

                Text("/ \(entry.hydrationGoal) ml")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - 2. WEIGHT COMPLICATION (With mini graph)
// MARK: - ═══════════════════════════════════════════════════════════════

struct WeightComplicationView: View {
    let entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            circularView
        case .accessoryCorner:
            cornerView
        case .accessoryInline:
            inlineView
        case .accessoryRectangular:
            rectangularView
        default:
            circularView
        }
    }

    private var circularView: some View {
        VStack(spacing: 1) {
            Image(systemName: "scalemass.fill")
                .font(.system(size: 12))
                .foregroundColor(.orange)

            Text(String(format: "%.1f", entry.currentWeight))
                .font(.system(size: 16, weight: .bold, design: .rounded))

            // Trend indicator
            Image(systemName: entry.weightTrend.icon)
                .font(.system(size: 8))
                .foregroundColor(trendColor)
        }
    }

    private var cornerView: some View {
        VStack(spacing: 0) {
            Image(systemName: "scalemass.fill")
                .font(.system(size: 14))
                .foregroundColor(.orange)
            Text(String(format: "%.0f", entry.currentWeight))
                .font(.system(size: 10, weight: .bold))
        }
    }

    private var inlineView: some View {
        HStack(spacing: 4) {
            Image(systemName: "scalemass.fill")
            Text(String(format: "%.1f kg", entry.currentWeight))
            Image(systemName: entry.weightTrend.icon)
                .font(.system(size: 10))
        }
    }

    private var rectangularView: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "scalemass.fill")
                    .foregroundColor(.orange)
                Text("Poids")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Spacer()
                Image(systemName: entry.weightTrend.icon)
                    .font(.system(size: 10))
                    .foregroundColor(trendColor)
            }

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(String(format: "%.1f", entry.currentWeight))
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                Text("kg")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)

                Spacer()

                // Mini sparkline graph
                if entry.weightHistory.count > 1 {
                    MiniSparkline(data: entry.weightHistory, color: .orange)
                        .frame(width: 40, height: 20)
                }
            }

            // Goal
            HStack(spacing: 4) {
                Text("Objectif:")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                Text(String(format: "%.1f kg", entry.targetWeight))
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.orange)
            }
        }
    }

    private var trendColor: Color {
        switch entry.weightTrend {
        case .up: return .orange
        case .down: return .green
        case .stable: return .blue
        }
    }
}

// Mini Sparkline for weight graph
struct MiniSparkline: View {
    let data: [Double]
    let color: Color

    var body: some View {
        GeometryReader { geo in
            if data.count > 1 {
                let minVal = data.min() ?? 0
                let maxVal = data.max() ?? 1
                let range = max(maxVal - minVal, 0.1)

                Path { path in
                    for (index, value) in data.enumerated() {
                        let x = geo.size.width * CGFloat(index) / CGFloat(data.count - 1)
                        let y = geo.size.height * (1 - (value - minVal) / range)

                        if index == 0 {
                            path.move(to: CGPoint(x: x, y: y))
                        } else {
                            path.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                }
                .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            }
        }
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - 3. TIMER COMPLICATION
// MARK: - ═══════════════════════════════════════════════════════════════

struct TimerComplicationView: View {
    let entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            circularView
        case .accessoryCorner:
            cornerView
        case .accessoryInline:
            inlineView
        case .accessoryRectangular:
            rectangularView
        default:
            circularView
        }
    }

    private var circularView: some View {
        ZStack {
            if entry.isTimerRunning {
                // Timer running
                Circle()
                    .stroke(Color.yellow.opacity(0.3), lineWidth: 4)

                Circle()
                    .trim(from: 0, to: timerProgress)
                    .stroke(timerColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                Text(formatTime(entry.timerRemaining))
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(timerColor)
            } else {
                // Timer not running - show last duration
                Circle()
                    .stroke(Color.yellow.opacity(0.3), lineWidth: 4)

                VStack(spacing: 0) {
                    Image(systemName: "timer")
                        .font(.system(size: 14))
                        .foregroundColor(.yellow)
                    Text(formatTime(entry.lastRestDuration))
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                }
            }
        }
        .padding(3)
    }

    private var cornerView: some View {
        ZStack {
            if entry.isTimerRunning {
                Circle()
                    .trim(from: 0, to: timerProgress)
                    .stroke(timerColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                Text("\(entry.timerRemaining)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(timerColor)
            } else {
                Image(systemName: "timer")
                    .font(.system(size: 16))
                    .foregroundColor(.yellow)
            }
        }
    }

    private var inlineView: some View {
        HStack(spacing: 4) {
            Image(systemName: "timer")
            if entry.isTimerRunning {
                Text(formatTime(entry.timerRemaining))
                    .foregroundColor(timerColor)
            } else {
                Text("Repos: \(formatTime(entry.lastRestDuration))")
            }
        }
    }

    private var rectangularView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "timer")
                        .foregroundColor(.yellow)
                    Text("Timer Repos")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }

                if entry.isTimerRunning {
                    Text(formatTime(entry.timerRemaining))
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(timerColor)

                    ProgressView(value: timerProgress)
                        .tint(timerColor)
                } else {
                    Text("Tap pour lancer")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)

                    Text(formatTime(entry.lastRestDuration))
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(.yellow)
                }
            }
            Spacer()
        }
    }

    private var timerProgress: Double {
        guard entry.lastRestDuration > 0 else { return 0 }
        return Double(entry.timerRemaining) / Double(entry.lastRestDuration)
    }

    private var timerColor: Color {
        if entry.timerRemaining <= 10 {
            return .red
        } else if entry.timerRemaining <= 30 {
            return .orange
        }
        return .yellow
    }

    private func formatTime(_ seconds: Int) -> String {
        let min = seconds / 60
        let sec = seconds % 60
        if min > 0 {
            return String(format: "%d:%02d", min, sec)
        }
        return "\(sec)s"
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - 4. WORKOUT COMPLICATION
// MARK: - ═══════════════════════════════════════════════════════════════

struct WorkoutComplicationView: View {
    let entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            circularView
        case .accessoryCorner:
            cornerView
        case .accessoryInline:
            inlineView
        case .accessoryRectangular:
            rectangularView
        default:
            circularView
        }
    }

    private var circularView: some View {
        ZStack {
            Circle()
                .fill(entry.isWorkoutActive ? Color.green.opacity(0.3) : Color.gray.opacity(0.2))

            if entry.isWorkoutActive {
                VStack(spacing: 0) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .font(.system(size: 12))
                        .foregroundColor(.green)
                    Text(formatDuration(entry.workoutDuration))
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                }
            } else {
                VStack(spacing: 0) {
                    Image(systemName: "dumbbell.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.green)
                    Text("\(entry.todaySets)")
                        .font(.system(size: 12, weight: .bold))
                }
            }
        }
    }

    private var cornerView: some View {
        ZStack {
            if entry.isWorkoutActive {
                Circle()
                    .fill(Color.green)
                Image(systemName: "figure.run")
                    .font(.system(size: 14))
                    .foregroundColor(.black)
            } else {
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.green)
            }
        }
    }

    private var inlineView: some View {
        HStack(spacing: 4) {
            Image(systemName: "dumbbell.fill")
            if entry.isWorkoutActive {
                Text(formatDuration(entry.workoutDuration))
                    .foregroundColor(.green)
            } else {
                Text("\(entry.todaySets) séries aujourd'hui")
            }
        }
    }

    private var rectangularView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: entry.isWorkoutActive ? "figure.strengthtraining.traditional" : "dumbbell.fill")
                        .foregroundColor(.green)
                    Text(entry.isWorkoutActive ? "En cours" : "Workout")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)

                    if entry.isWorkoutActive {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                    }
                }

                if entry.isWorkoutActive {
                    Text(formatDuration(entry.workoutDuration))
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundColor(.green)
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(entry.todaySets)")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                        Text("séries")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }

                    Text("Tap pour démarrer")
                        .font(.system(size: 9))
                        .foregroundColor(.green.opacity(0.8))
                }
            }
            Spacer()
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - 5. STEPS COMPLICATION
// MARK: - ═══════════════════════════════════════════════════════════════

struct StepsComplicationView: View {
    let entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var stepsProgress: Double {
        guard entry.stepsGoal > 0 else { return 0 }
        return min(Double(entry.todaySteps) / Double(entry.stepsGoal), 1.0)
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            circularView
        case .accessoryCorner:
            cornerView
        case .accessoryInline:
            inlineView
        case .accessoryRectangular:
            rectangularView
        default:
            circularView
        }
    }

    private var circularView: some View {
        ZStack {
            Circle()
                .stroke(Color.green.opacity(0.3), lineWidth: 4)

            Circle()
                .trim(from: 0, to: stepsProgress)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))

            VStack(spacing: 0) {
                Image(systemName: "figure.walk")
                    .font(.system(size: 10))
                    .foregroundColor(.green)
                Text(formatSteps(entry.todaySteps))
                    .font(.system(size: 12, weight: .bold, design: .rounded))
            }
        }
        .padding(3)
    }

    private var cornerView: some View {
        ZStack {
            Circle()
                .trim(from: 0, to: stepsProgress)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Image(systemName: "figure.walk")
                .font(.system(size: 14))
                .foregroundColor(.green)
        }
    }

    private var inlineView: some View {
        HStack(spacing: 4) {
            Image(systemName: "figure.walk")
            Text("\(entry.todaySteps) pas")
        }
    }

    private var rectangularView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "figure.walk")
                        .foregroundColor(.green)
                    Text("Pas")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }

                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(formatSteps(entry.todaySteps))
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                    Text("/ \(formatSteps(entry.stepsGoal))")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }

                ProgressView(value: stepsProgress)
                    .tint(.green)
            }
            Spacer()
        }
    }

    private func formatSteps(_ steps: Int) -> String {
        if steps >= 1000 {
            return String(format: "%.1fk", Double(steps) / 1000)
        }
        return "\(steps)"
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - 6. HEART RATE COMPLICATION (Bonus)
// MARK: - ═══════════════════════════════════════════════════════════════

struct HeartRateComplicationView: View {
    let entry: YoroiEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            circularView
        case .accessoryCorner:
            cornerView
        case .accessoryInline:
            inlineView
        default:
            circularView
        }
    }

    private var circularView: some View {
        VStack(spacing: 2) {
            Image(systemName: "heart.fill")
                .font(.system(size: 16))
                .foregroundColor(.red)
                .symbolEffect(.pulse)

            Text("\(entry.heartRate)")
                .font(.system(size: 16, weight: .bold, design: .rounded))

            Text("BPM")
                .font(.system(size: 8))
                .foregroundColor(.secondary)
        }
    }

    private var cornerView: some View {
        VStack(spacing: 0) {
            Image(systemName: "heart.fill")
                .font(.system(size: 14))
                .foregroundColor(.red)
            Text("\(entry.heartRate)")
                .font(.system(size: 10, weight: .bold))
        }
    }

    private var inlineView: some View {
        HStack(spacing: 4) {
            Image(systemName: "heart.fill")
                .foregroundColor(.red)
            Text("\(entry.heartRate) BPM")
        }
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - WIDGET CONFIGURATIONS
// MARK: - ═══════════════════════════════════════════════════════════════

// 1. Hydration Widget
struct HydrationWidget: Widget {
    let kind = "HydrationWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            HydrationComplicationView(entry: entry)
        }
        .configurationDisplayName("Hydratation")
        .description("Suivez votre consommation d'eau")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline, .accessoryRectangular])
    }
}

// 2. Weight Widget
struct WeightWidget: Widget {
    let kind = "WeightWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            WeightComplicationView(entry: entry)
        }
        .configurationDisplayName("Poids")
        .description("Votre poids avec graphique de tendance")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline, .accessoryRectangular])
    }
}

// 3. Timer Widget
struct TimerWidget: Widget {
    let kind = "TimerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            TimerComplicationView(entry: entry)
        }
        .configurationDisplayName("Timer Repos")
        .description("Timer de repos entre les séries")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline, .accessoryRectangular])
    }
}

// 4. Workout Widget
struct WorkoutWidget: Widget {
    let kind = "WorkoutWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            WorkoutComplicationView(entry: entry)
        }
        .configurationDisplayName("Workout")
        .description("Démarrez et suivez vos entraînements")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline, .accessoryRectangular])
    }
}

// 5. Steps Widget
struct StepsWidget: Widget {
    let kind = "StepsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            StepsComplicationView(entry: entry)
        }
        .configurationDisplayName("Pas")
        .description("Nombre de pas aujourd'hui")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline, .accessoryRectangular])
    }
}

// 6. Heart Rate Widget
struct HeartRateWidget: Widget {
    let kind = "HeartRateWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: YoroiTimelineProvider()) { entry in
            HeartRateComplicationView(entry: entry)
        }
        .configurationDisplayName("Fréquence Cardiaque")
        .description("Votre rythme cardiaque actuel")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline])
    }
}

// MARK: - Widget Bundle

struct YoroiWidgetBundle: WidgetBundle {
    var body: some Widget {
        HydrationWidget()
        WeightWidget()
        TimerWidget()
        WorkoutWidget()
        StepsWidget()
        HeartRateWidget()
    }
}
