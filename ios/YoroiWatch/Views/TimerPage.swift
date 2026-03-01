import SwiftUI
import HealthKit
import WatchKit

// ============================================================
// PAGE 1: DASHBOARD - Cards that open detail pages
// ============================================================

struct DashboardPage: View {

  @EnvironmentObject var session: WatchSessionManager
  @State private var steps: Int = 0
  @State private var showTimer = false
  @State private var showCarnet = false
  @State private var showSteps = false

  private let healthStore = HKHealthStore()

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(spacing: 8) {

          // Profile header
          HStack(spacing: 6) {
            Image(systemName: "shield.fill")
              .font(.system(size: 14))
              .foregroundColor(Color("Gold"))
            VStack(alignment: .leading, spacing: 0) {
              Text(session.userName)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
              Text("Niv. \(session.level) - \(session.rank)")
                .font(.system(size: 8))
                .foregroundColor(.gray)
            }
            Spacer()
            // Sync indicator
            Circle()
              .fill(session.isConnected ? Color.green : Color.red)
              .frame(width: 6, height: 6)
          }
          .padding(.horizontal, 4)

          // ── MINUTEUR Card ──
          Button(action: { showTimer = true }) {
            DashCard(
              icon: "timer",
              iconColor: Color("Gold"),
              title: "Minuteur",
              value: session.timerIsRunning
                ? session.formattedTime(session.timerRemainingSeconds)
                : session.formattedTime(session.timerTotalSeconds),
              subtitle: session.timerIsRunning ? "En cours..." : session.timerMode,
              accentColor: Color("Gold"),
              isActive: session.timerIsRunning
            )
          }
          .buttonStyle(.plain)

          // ── PAS Card ──
          Button(action: { showSteps = true }) {
            let goal = max(1, session.stepsGoal)
            let pct = Int(min(100, Double(steps) / Double(goal) * 100))
            DashCard(
              icon: "figure.walk",
              iconColor: .green,
              title: "Pas",
              value: "\(steps)",
              subtitle: "\(pct)% - Obj: \(session.stepsGoal)",
              accentColor: .green,
              isActive: false
            )
          }
          .buttonStyle(.plain)

          // ── CARNET Card ──
          Button(action: { showCarnet = true }) {
            DashCard(
              icon: "book.fill",
              iconColor: Color("Gold"),
              title: "Carnet",
              value: "\(session.benchmarks.count) records",
              subtitle: session.recentWorkouts.isEmpty ? "Ajouter un record" : "Derniere: \(session.recentWorkouts.first?.type.capitalized ?? "")",
              accentColor: Color("Gold"),
              isActive: false
            )
          }
          .buttonStyle(.plain)

          // ── SEANCES RECENTES ──
          if !session.recentWorkouts.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
              Text("RECENTS")
                .font(.system(size: 7, weight: .heavy))
                .foregroundColor(.gray)
                .tracking(1)

              ForEach(session.recentWorkouts.prefix(2)) { workout in
                HStack(spacing: 6) {
                  Image(systemName: workout.icon)
                    .font(.system(size: 10))
                    .foregroundColor(Color("Gold"))
                    .frame(width: 16)
                  Text(workout.type.capitalized)
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.white)
                  Spacer()
                  Text(workout.formattedDuration)
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
                }
              }
            }
            .padding(.horizontal, 4)
          }
        }
        .padding(.horizontal, 2)
      }
    }
    .sheet(isPresented: $showTimer) {
      TimerDetailPage()
    }
    .sheet(isPresented: $showCarnet) {
      CarnetFullPage()
    }
    .sheet(isPresented: $showSteps) {
      StepsDetailPage(steps: steps)
    }
    .onAppear { fetchSteps() }
  }

  private func fetchSteps() {
    guard HKHealthStore.isHealthDataAvailable() else { return }
    let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    healthStore.requestAuthorization(toShare: [], read: [stepType]) { ok, _ in
      if ok {
        let start = Calendar.current.startOfDay(for: Date())
        let pred = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let q = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: pred, options: .cumulativeSum) { _, r, _ in
          DispatchQueue.main.async {
            steps = Int(r?.sumQuantity()?.doubleValue(for: .count()) ?? 0)
          }
        }
        healthStore.execute(q)
      }
    }
  }
}

// MARK: - Dashboard Card

struct DashCard: View {
  let icon: String
  let iconColor: Color
  let title: String
  let value: String
  let subtitle: String
  let accentColor: Color
  let isActive: Bool

  var body: some View {
    HStack(spacing: 8) {
      // Icon
      Image(systemName: icon)
        .font(.system(size: 16))
        .foregroundColor(iconColor)
        .frame(width: 32, height: 32)
        .background(iconColor.opacity(0.15))
        .cornerRadius(8)

      // Content
      VStack(alignment: .leading, spacing: 1) {
        Text(title)
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(.gray)
        Text(value)
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(.white)
        Text(subtitle)
          .font(.system(size: 8))
          .foregroundColor(.gray)
      }

      Spacer()

      // Arrow or active indicator
      if isActive {
        Circle()
          .fill(accentColor)
          .frame(width: 8, height: 8)
      } else {
        Image(systemName: "chevron.right")
          .font(.system(size: 9))
          .foregroundColor(.gray.opacity(0.5))
      }
    }
    .padding(8)
    .background(Color.white.opacity(0.06))
    .cornerRadius(10)
  }
}

// ============================================================
// TIMER DETAIL PAGE
// ============================================================

struct TimerDetailPage: View {
  @EnvironmentObject var session: WatchSessionManager
  @State private var selectedPreset: Int = 90

  private let presets = [30, 60, 90, 120, 180]
  private let presetLabels = ["30s", "1min", "1:30", "2min", "3min"]

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Text("MINUTEUR")
          .font(.system(size: 9, weight: .heavy))
          .foregroundColor(Color("Gold"))
          .tracking(2)

        // Circular countdown
        ZStack {
          Circle()
            .stroke(Color.gray.opacity(0.2), lineWidth: 6)

          Circle()
            .trim(from: 0, to: timerProgress)
            .stroke(
              session.timerRemainingSeconds <= 10 && session.timerIsRunning
                ? Color.red : Color("Gold"),
              style: StrokeStyle(lineWidth: 6, lineCap: .round)
            )
            .rotationEffect(.degrees(-90))
            .animation(.linear(duration: 1), value: session.timerRemainingSeconds)

          VStack(spacing: 0) {
            Text(session.formattedTime(session.timerRemainingSeconds))
              .font(.system(size: 32, weight: .bold, design: .monospaced))
              .foregroundColor(.white)
            if session.timerIsRunning {
              Text(session.timerMode)
                .font(.system(size: 9))
                .foregroundColor(.gray)
            }
          }
        }
        .frame(width: 110, height: 110)

        // Presets
        if !session.timerIsRunning {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
              ForEach(0..<presets.count, id: \.self) { i in
                Button(action: {
                  selectedPreset = presets[i]
                  session.setTimer(seconds: presets[i])
                }) {
                  Text(presetLabels[i])
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(selectedPreset == presets[i] ? .black : Color("Gold"))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(selectedPreset == presets[i] ? Color("Gold") : Color("Gold").opacity(0.15))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
              }
            }
          }
        }

        // Controls
        HStack(spacing: 16) {
          if session.timerIsRunning {
            Button(action: { session.pauseTimer() }) {
              Image(systemName: "pause.fill")
                .font(.system(size: 20))
                .foregroundColor(.black)
                .frame(width: 44, height: 44)
                .background(Color("Gold"))
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          } else {
            Button(action: { session.startTimer() }) {
              Image(systemName: "play.fill")
                .font(.system(size: 20))
                .foregroundColor(.black)
                .frame(width: 44, height: 44)
                .background(Color("Gold"))
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          }

          if session.timerRemainingSeconds != session.timerTotalSeconds {
            Button(action: { session.resetTimer() }) {
              Image(systemName: "arrow.counterclockwise")
                .font(.system(size: 15))
                .foregroundColor(.white)
                .frame(width: 36, height: 36)
                .background(Color.white.opacity(0.15))
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          }
        }
      }
      .padding(.horizontal, 4)
    }
  }

  private var timerProgress: Double {
    guard session.timerTotalSeconds > 0 else { return 0 }
    return Double(session.timerRemainingSeconds) / Double(session.timerTotalSeconds)
  }
}

// ============================================================
// STEPS DETAIL PAGE
// ============================================================

struct StepsDetailPage: View {
  @EnvironmentObject var session: WatchSessionManager
  let steps: Int

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        Text("PAS")
          .font(.system(size: 9, weight: .heavy))
          .foregroundColor(.green)
          .tracking(2)

        ZStack {
          Circle()
            .stroke(Color.gray.opacity(0.2), lineWidth: 8)
          Circle()
            .trim(from: 0, to: progress)
            .stroke(Color.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
            .rotationEffect(.degrees(-90))

          VStack(spacing: 0) {
            Text("\(steps)")
              .font(.system(size: 24, weight: .bold))
              .foregroundColor(.white)
            Text("/ \(session.stepsGoal)")
              .font(.system(size: 10))
              .foregroundColor(.gray)
          }
        }
        .frame(width: 90, height: 90)

        Text("\(Int(progress * 100))%")
          .font(.system(size: 16, weight: .bold))
          .foregroundColor(.green)

        if progress >= 1.0 {
          HStack(spacing: 4) {
            Image(systemName: "checkmark.circle.fill")
              .font(.system(size: 12))
            Text("Objectif atteint !")
              .font(.system(size: 11, weight: .semibold))
          }
          .foregroundColor(.green)
        }
      }
      .padding(.horizontal, 4)
    }
  }

  private var progress: Double {
    let goal = max(1, session.stepsGoal)
    return min(1.0, Double(steps) / Double(goal))
  }
}

// ============================================================
// CARNET FULL PAGE (Records + Exercise Library + Add)
// ============================================================

struct CarnetFullPage: View {
  @EnvironmentObject var session: WatchSessionManager
  @State private var showLibrary = false
  @State private var selectedRecord: BenchmarkRecord? = nil

  // Category colors
  static let catColors: [String: Color] = [
    "musculation": Color(red: 0.937, green: 0.267, blue: 0.267),
    "force": Color(red: 0.937, green: 0.267, blue: 0.267),
    "running": Color(red: 0.231, green: 0.510, blue: 0.965),
    "trail": Color(red: 0.063, green: 0.725, blue: 0.506),
    "cardio": Color(red: 0.063, green: 0.725, blue: 0.506),
    "hyrox": Color(red: 0.961, green: 0.620, blue: 0.043),
    "bodyweight": Color(red: 0.545, green: 0.361, blue: 0.965),
    "custom": Color(red: 0.420, green: 0.451, blue: 0.498),
  ]

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 8) {

          // Add button
          Button(action: { showLibrary = true }) {
            HStack(spacing: 6) {
              Image(systemName: "plus.circle.fill")
                .font(.system(size: 14))
              Text("Ajouter un record")
                .font(.system(size: 11, weight: .bold))
            }
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(Color("Gold"))
            .cornerRadius(10)
          }
          .buttonStyle(.plain)

          // My Records grouped by category
          if !session.benchmarks.isEmpty {
            Text("MES RECORDS")
              .font(.system(size: 8, weight: .heavy))
              .foregroundColor(Color("Gold"))
              .tracking(1)

            let grouped = groupedBenchmarks
            ForEach(Array(grouped.keys.sorted()), id: \.self) { category in
              let catColor = CarnetFullPage.catColors[category.lowercased()] ?? Color("Gold")
              let records = grouped[category] ?? []

              // Category header
              HStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 2)
                  .fill(catColor)
                  .frame(width: 3, height: 14)
                Text(category.uppercased())
                  .font(.system(size: 9, weight: .heavy))
                  .foregroundColor(catColor)
                  .tracking(0.5)
              }
              .padding(.top, 2)

              ForEach(records) { record in
                Button(action: { selectedRecord = record }) {
                  RecordCard(record: record, catColor: catColor)
                }
                .buttonStyle(.plain)
              }
            }
          } else {
            VStack(spacing: 8) {
              Image(systemName: "trophy")
                .font(.system(size: 20))
                .foregroundColor(.gray)
              Text("Aucun record")
                .font(.system(size: 11))
                .foregroundColor(.gray)
              Text("Utilise le + pour ajouter")
                .font(.system(size: 9))
                .foregroundColor(.gray.opacity(0.7))
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
          }

          // Recent workouts
          if !session.recentWorkouts.isEmpty {
            Text("SEANCES")
              .font(.system(size: 8, weight: .heavy))
              .foregroundColor(.cyan)
              .tracking(1)
              .padding(.top, 6)

            ForEach(session.recentWorkouts.prefix(5)) { workout in
              HStack(spacing: 6) {
                Image(systemName: workout.icon)
                  .font(.system(size: 11))
                  .foregroundColor(.cyan)
                  .frame(width: 20)
                VStack(alignment: .leading, spacing: 1) {
                  Text(workout.type.capitalized)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white)
                  Text(workout.formattedDuration)
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
                }
                Spacer()
                Text(workout.date)
                  .font(.system(size: 8))
                  .foregroundColor(.gray)
              }
              .padding(.vertical, 2)
            }
          }
        }
        .padding(.horizontal, 4)
      }
      .navigationTitle("Carnet")
    }
    .sheet(isPresented: $showLibrary) {
      ExerciseLibraryPage()
    }
    .sheet(item: $selectedRecord) { record in
      let catColor = CarnetFullPage.catColors[record.category.lowercased()] ?? Color("Gold")
      AddEntryPage(
        exerciseName: record.name,
        exerciseId: record.id,
        unit: record.unit,
        catColor: catColor,
        currentPR: record.formattedPR,
        lastValue: record.lastValue > 0 ? record.lastValue : record.pr
      )
    }
  }

  private var groupedBenchmarks: [String: [BenchmarkRecord]] {
    var result: [String: [BenchmarkRecord]] = [:]
    for b in session.benchmarks {
      let cat = b.category.isEmpty ? "Force" : b.category
      result[cat, default: []].append(b)
    }
    return result
  }
}

// MARK: - Record Card (compact, with left border + PR badge)

struct RecordCard: View {
  let record: BenchmarkRecord
  let catColor: Color

  var body: some View {
    HStack(spacing: 6) {
      RoundedRectangle(cornerRadius: 2)
        .fill(catColor)
        .frame(width: 3)

      Image(systemName: record.icon)
        .font(.system(size: 11))
        .foregroundColor(catColor)
        .frame(width: 22, height: 22)
        .background(catColor.opacity(0.15))
        .cornerRadius(5)

      VStack(alignment: .leading, spacing: 1) {
        Text(record.name)
          .font(.system(size: 10, weight: .semibold))
          .foregroundColor(.white)
          .lineLimit(1)

        HStack(spacing: 3) {
          Text(record.formattedPR)
            .font(.system(size: 9, weight: .bold))
            .foregroundColor(catColor)

          if record.prReps > 0 {
            Text("x\(record.prReps)")
              .font(.system(size: 7))
              .foregroundColor(.gray)
          }

          if record.pr > 0 {
            Text("PR")
              .font(.system(size: 6, weight: .heavy))
              .foregroundColor(.white)
              .padding(.horizontal, 3)
              .padding(.vertical, 1)
              .background(catColor)
              .cornerRadius(3)
          }
        }
      }

      Spacer()

      Image(systemName: "chevron.right")
        .font(.system(size: 8))
        .foregroundColor(.gray.opacity(0.5))
    }
    .padding(.vertical, 5)
    .padding(.horizontal, 4)
    .background(Color.white.opacity(0.04))
    .cornerRadius(8)
  }
}

// ============================================================
// EXERCISE LIBRARY PAGE (browse by muscle group)
// ============================================================

struct ExerciseLibraryPage: View {
  @Environment(\.dismiss) var dismiss

  var body: some View {
    NavigationView {
      List {
        ForEach(ExerciseTemplate.muscleGroups, id: \.self) { group in
          NavigationLink(destination: MuscleGroupPage(group: group)) {
            HStack(spacing: 8) {
              Image(systemName: iconFor(group))
                .font(.system(size: 13))
                .foregroundColor(colorFor(group))
                .frame(width: 24, height: 24)
                .background(colorFor(group).opacity(0.15))
                .cornerRadius(6)

              VStack(alignment: .leading, spacing: 1) {
                Text(group)
                  .font(.system(size: 12, weight: .semibold))
                  .foregroundColor(.white)
                Text("\(ExerciseTemplate.exercises(for: group).count) exercices")
                  .font(.system(size: 8))
                  .foregroundColor(.gray)
              }
            }
          }
        }
      }
      .navigationTitle("Bibliotheque")
    }
  }

  private func iconFor(_ group: String) -> String {
    switch group {
    case "Pectoraux": return "figure.strengthtraining.traditional"
    case "Dos": return "figure.strengthtraining.traditional"
    case "Epaules": return "figure.strengthtraining.traditional"
    case "Bras": return "figure.strengthtraining.traditional"
    case "Jambes": return "scalemass.fill"
    case "Abdos": return "figure.core.training"
    case "Hyrox": return "flame.fill"
    case "Running": return "figure.run"
    case "Cardio": return "heart.fill"
    default: return "trophy.fill"
    }
  }

  private func colorFor(_ group: String) -> Color {
    switch group {
    case "Pectoraux", "Dos": return Color(red: 0.937, green: 0.267, blue: 0.267)
    case "Epaules", "Bras": return Color(red: 0.937, green: 0.267, blue: 0.267)
    case "Jambes": return Color(red: 0.937, green: 0.267, blue: 0.267)
    case "Abdos": return Color(red: 0.937, green: 0.267, blue: 0.267)
    case "Hyrox": return Color(red: 0.961, green: 0.620, blue: 0.043)
    case "Running": return Color(red: 0.231, green: 0.510, blue: 0.965)
    case "Cardio": return Color(red: 0.063, green: 0.725, blue: 0.506)
    default: return Color("Gold")
    }
  }
}

// MARK: - Muscle Group Page (list exercises, tap to add entry)

struct MuscleGroupPage: View {
  let group: String
  @State private var selectedExercise: ExerciseTemplate? = nil

  var body: some View {
    List {
      ForEach(ExerciseTemplate.exercises(for: group)) { exercise in
        Button(action: { selectedExercise = exercise }) {
          HStack(spacing: 8) {
            Image(systemName: exercise.icon)
              .font(.system(size: 12))
              .foregroundColor(Color("Gold"))
              .frame(width: 22, height: 22)
              .background(Color("Gold").opacity(0.15))
              .cornerRadius(5)

            VStack(alignment: .leading, spacing: 1) {
              Text(exercise.name)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.white)
              Text(exercise.unit == "kg" ? "Poids (kg)" : exercise.unit == "reps" ? "Repetitions" : "Temps")
                .font(.system(size: 8))
                .foregroundColor(.gray)
            }

            Spacer()

            Image(systemName: "plus.circle.fill")
              .font(.system(size: 14))
              .foregroundColor(Color("Gold"))
          }
        }
        .buttonStyle(.plain)
      }
    }
    .navigationTitle(group)
    .sheet(item: $selectedExercise) { exercise in
      let catColor = CarnetFullPage.catColors[exercise.category.lowercased()] ?? Color("Gold")
      AddEntryPage(
        exerciseName: exercise.name,
        exerciseId: exercise.id,
        unit: exercise.unit,
        catColor: catColor,
        currentPR: nil,
        lastValue: 0
      )
    }
  }
}

// ============================================================
// ADD ENTRY PAGE (log weight/reps/RPE)
// ============================================================

struct AddEntryPage: View {
  let exerciseName: String
  let exerciseId: String
  let unit: String
  let catColor: Color
  let currentPR: String?
  let lastValue: Double
  @EnvironmentObject var session: WatchSessionManager
  @Environment(\.dismiss) var dismiss
  @State private var value: Double = 0
  @State private var reps: Int = 5
  @State private var rpe: Int = 7
  @State private var timeMinutes: Int = 0
  @State private var timeSeconds: Int = 0

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        Text(exerciseName.uppercased())
          .font(.system(size: 10, weight: .heavy))
          .foregroundColor(catColor)
          .tracking(1.5)
          .multilineTextAlignment(.center)

        // Current PR if exists
        if let pr = currentPR {
          VStack(spacing: 1) {
            Text("Record actuel")
              .font(.system(size: 8))
              .foregroundColor(.gray)
            Text(pr)
              .font(.system(size: 18, weight: .bold))
              .foregroundColor(catColor)
          }
        }

        Divider().background(Color.gray.opacity(0.3))

        // Input based on unit type
        if unit == "kg" || unit == "lbs" {
          // Weight input
          VStack(spacing: 3) {
            Text(unit.uppercased())
              .font(.system(size: 8, weight: .bold))
              .foregroundColor(.gray)
            Text(String(format: "%.1f", value))
              .font(.system(size: 28, weight: .bold))
              .foregroundColor(.white)
            HStack(spacing: 16) {
              Button(action: { value = max(0, value - 2.5) }) {
                Image(systemName: "minus.circle.fill")
                  .font(.system(size: 24))
                  .foregroundColor(.red)
              }.buttonStyle(.plain)
              Button(action: { value += 2.5 }) {
                Image(systemName: "plus.circle.fill")
                  .font(.system(size: 24))
                  .foregroundColor(.green)
              }.buttonStyle(.plain)
            }
          }

          // Reps
          HStack {
            Text("Reps:")
              .font(.system(size: 11))
              .foregroundColor(.gray)
            Spacer()
            Button(action: { reps = max(1, reps - 1) }) {
              Image(systemName: "minus").font(.system(size: 10))
            }.buttonStyle(.plain)
            Text("\(reps)")
              .font(.system(size: 16, weight: .bold))
              .foregroundColor(.white)
              .frame(width: 30)
            Button(action: { reps += 1 }) {
              Image(systemName: "plus").font(.system(size: 10))
            }.buttonStyle(.plain)
          }
          .padding(.horizontal, 8)

        } else if unit == "reps" {
          // Reps-only input
          VStack(spacing: 3) {
            Text("REPETITIONS")
              .font(.system(size: 8, weight: .bold))
              .foregroundColor(.gray)
            Text("\(Int(value))")
              .font(.system(size: 28, weight: .bold))
              .foregroundColor(.white)
            HStack(spacing: 16) {
              Button(action: { value = max(0, value - 1) }) {
                Image(systemName: "minus.circle.fill")
                  .font(.system(size: 24))
                  .foregroundColor(.red)
              }.buttonStyle(.plain)
              Button(action: { value += 1 }) {
                Image(systemName: "plus.circle.fill")
                  .font(.system(size: 24))
                  .foregroundColor(.green)
              }.buttonStyle(.plain)
            }
          }

        } else if unit == "time" {
          // Time input (minutes : seconds)
          VStack(spacing: 3) {
            Text("TEMPS")
              .font(.system(size: 8, weight: .bold))
              .foregroundColor(.gray)
            HStack(spacing: 4) {
              // Minutes
              VStack(spacing: 2) {
                Button(action: { timeMinutes += 1 }) {
                  Image(systemName: "chevron.up")
                    .font(.system(size: 10))
                }.buttonStyle(.plain)
                Text(String(format: "%02d", timeMinutes))
                  .font(.system(size: 22, weight: .bold, design: .monospaced))
                  .foregroundColor(.white)
                Button(action: { timeMinutes = max(0, timeMinutes - 1) }) {
                  Image(systemName: "chevron.down")
                    .font(.system(size: 10))
                }.buttonStyle(.plain)
              }
              Text(":")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.gray)
              // Seconds
              VStack(spacing: 2) {
                Button(action: { timeSeconds = min(59, timeSeconds + 5) }) {
                  Image(systemName: "chevron.up")
                    .font(.system(size: 10))
                }.buttonStyle(.plain)
                Text(String(format: "%02d", timeSeconds))
                  .font(.system(size: 22, weight: .bold, design: .monospaced))
                  .foregroundColor(.white)
                Button(action: { timeSeconds = max(0, timeSeconds - 5) }) {
                  Image(systemName: "chevron.down")
                    .font(.system(size: 10))
                }.buttonStyle(.plain)
              }
            }
          }
        }

        // RPE
        VStack(spacing: 3) {
          Text("RPE")
            .font(.system(size: 8, weight: .bold))
            .foregroundColor(.gray)
          HStack(spacing: 3) {
            ForEach([6, 7, 8, 9, 10], id: \.self) { r in
              Button(action: { rpe = r }) {
                Text("\(r)")
                  .font(.system(size: 10, weight: rpe == r ? .bold : .regular))
                  .foregroundColor(rpe == r ? .black : .white)
                  .frame(width: 22, height: 22)
                  .background(rpe == r ? catColor : Color.white.opacity(0.1))
                  .cornerRadius(6)
              }
              .buttonStyle(.plain)
            }
          }
        }

        // Save
        Button(action: {
          let finalValue: Double
          if unit == "time" {
            finalValue = Double(timeMinutes * 60 + timeSeconds)
          } else {
            finalValue = value
          }
          session.logBenchmarkEntry(benchmarkId: exerciseId, value: finalValue, reps: reps, rpe: rpe)
          WKInterfaceDevice.current().play(.success)
          dismiss()
        }) {
          Text("Enregistrer")
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(catColor)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
      }
      .padding(.horizontal, 4)
    }
    .onAppear {
      if unit == "time" {
        let total = Int(lastValue)
        timeMinutes = total / 60
        timeSeconds = total % 60
      } else {
        value = lastValue > 0 ? lastValue : 0
      }
    }
  }
}
