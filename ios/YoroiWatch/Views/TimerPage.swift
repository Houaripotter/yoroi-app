import SwiftUI
import HealthKit
import WatchKit

// ============================================================
// COLORS
// ============================================================

private let goldColor = Color(red: 0.831, green: 0.686, blue: 0.216) // #D4AF37
private let cyanColor = Color(red: 0.024, green: 0.714, blue: 0.831) // #06B6D4
private let pinkColor = Color(red: 0.925, green: 0.306, blue: 0.604) // #EC4E9A
private let greenColor = Color(red: 0.063, green: 0.725, blue: 0.506) // #10B981
private let redColor = Color(red: 0.937, green: 0.267, blue: 0.267) // #EF4444
private let orangeColor = Color(red: 0.976, green: 0.451, blue: 0.086) // #F97316
private let blueColor = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6
private let purpleColor = Color(red: 0.545, green: 0.361, blue: 0.965) // #8B5CF6
private let indigoColor = Color(red: 0.388, green: 0.400, blue: 0.945) // #6366F1

// ============================================================
// PAGE 1: DASHBOARD - Premium redesign
// ============================================================

struct DashboardPage: View {

  @EnvironmentObject var session: WatchSessionManager
  @State private var steps: Int = 0
  @State private var localHeartRate: Int = 0
  @State private var showTimer = false
  @State private var showCarnet = false
  @State private var showSteps = false
  @State private var showHealth = false

  private let healthStore = HKHealthStore()

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(spacing: 10) {

          // ── PROFILE HEADER ──
          profileHeader

          // ── QUICK ACTIONS ROW: Timer + Carnet ──
          quickActionsRow

          // ── HEALTH METRICS GRID ──
          healthMetricsGrid

          // ── STREAK ──
          if session.streak > 0 {
            streakBanner
          }

          // ── RECENT SESSIONS ──
          if !session.recentWorkouts.isEmpty {
            recentSessions
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
    .onAppear {
      fetchSteps()
      fetchHeartRate()
    }
  }

  // MARK: - Profile Header
  private var profileHeader: some View {
    HStack(spacing: 8) {
      // Profile photo circle
      ZStack {
        Circle()
          .fill(
            LinearGradient(
              colors: [goldColor, goldColor.opacity(0.6)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 36, height: 36)

        if let imgData = session.profileImageData,
           let uiImage = UIImage(data: imgData) {
          Image(uiImage: uiImage)
            .resizable()
            .scaledToFill()
            .frame(width: 32, height: 32)
            .clipShape(Circle())
        } else {
          // Initials fallback
          Text(initials)
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.black)
        }
      }

      VStack(alignment: .leading, spacing: 1) {
        Text(session.userName.isEmpty ? "Yoroi" : session.userName)
          .font(.system(size: 13, weight: .bold))
          .foregroundColor(.white)
          .lineLimit(1)
        HStack(spacing: 3) {
          Text("Niv.\(session.level)")
            .font(.system(size: 8, weight: .semibold))
            .foregroundColor(goldColor)
          if !session.rank.isEmpty {
            Text(session.rank)
              .font(.system(size: 7, weight: .medium))
              .foregroundColor(.gray)
              .lineLimit(1)
          }
        }
      }

      Spacer()

      // Connection dot
      Circle()
        .fill(session.isConnected ? greenColor : redColor)
        .frame(width: 6, height: 6)
    }
    .padding(.horizontal, 4)
    .padding(.top, 2)
  }

  private var initials: String {
    let parts = session.userName.split(separator: " ")
    if parts.count >= 2 {
      return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased()
    }
    return String(session.userName.prefix(2)).uppercased()
  }

  // MARK: - Quick Actions (Timer + Carnet as compact circles)
  private var quickActionsRow: some View {
    HStack(spacing: 10) {
      // Timer circle
      Button(action: { showTimer = true }) {
        VStack(spacing: 3) {
          ZStack {
            Circle()
              .fill(goldColor.opacity(0.15))
              .frame(width: 44, height: 44)

            if session.timerIsRunning {
              // Progress ring when running
              Circle()
                .trim(from: 0, to: timerProgress)
                .stroke(goldColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .frame(width: 44, height: 44)
            }

            Image(systemName: session.timerIsRunning ? "pause.fill" : "timer")
              .font(.system(size: 16))
              .foregroundColor(goldColor)
          }
          Text(session.timerIsRunning
            ? session.formattedTime(session.timerRemainingSeconds)
            : "Timer")
            .font(.system(size: 8, weight: .semibold))
            .foregroundColor(session.timerIsRunning ? goldColor : .gray)
        }
      }
      .buttonStyle(.plain)

      // Steps circle
      Button(action: { showSteps = true }) {
        VStack(spacing: 3) {
          ZStack {
            Circle()
              .fill(greenColor.opacity(0.15))
              .frame(width: 44, height: 44)

            Circle()
              .trim(from: 0, to: stepsProgress)
              .stroke(greenColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
              .rotationEffect(.degrees(-90))
              .frame(width: 44, height: 44)

            Image(systemName: "figure.walk")
              .font(.system(size: 16))
              .foregroundColor(greenColor)
          }
          Text("\(steps > 0 ? formattedSteps : "--")")
            .font(.system(size: 8, weight: .semibold))
            .foregroundColor(.gray)
        }
      }
      .buttonStyle(.plain)

      // Carnet circle
      Button(action: { showCarnet = true }) {
        VStack(spacing: 3) {
          ZStack {
            Circle()
              .fill(cyanColor.opacity(0.15))
              .frame(width: 44, height: 44)

            Image(systemName: "book.fill")
              .font(.system(size: 16))
              .foregroundColor(cyanColor)
          }
          Text("\(session.benchmarks.count) PR")
            .font(.system(size: 8, weight: .semibold))
            .foregroundColor(.gray)
        }
      }
      .buttonStyle(.plain)
    }
    .padding(.vertical, 4)
  }

  private var timerProgress: Double {
    guard session.timerTotalSeconds > 0 else { return 0 }
    return Double(session.timerRemainingSeconds) / Double(session.timerTotalSeconds)
  }

  private var stepsProgress: Double {
    let goal = max(1, session.stepsGoal)
    return min(1.0, Double(steps) / Double(goal))
  }

  private var formattedSteps: String {
    if steps >= 1000 {
      return String(format: "%.1fk", Double(steps) / 1000.0)
    }
    return "\(steps)"
  }

  // MARK: - Health Metrics Grid (2x2 cards like iPhone)
  private var healthMetricsGrid: some View {
    VStack(spacing: 4) {
      // Section label
      HStack {
        Image(systemName: "heart.fill")
          .font(.system(size: 8))
          .foregroundColor(pinkColor)
        Text("SANTE")
          .font(.system(size: 7, weight: .heavy))
          .foregroundColor(.gray)
          .tracking(1)
        Spacer()
      }
      .padding(.horizontal, 4)

      // Grid 2x2
      VStack(spacing: 4) {
        HStack(spacing: 4) {
          HealthMiniCard(
            icon: "heart.fill",
            color: pinkColor,
            value: displayHeartRate > 0 ? "\(displayHeartRate)" : "--",
            unit: "BPM",
            label: "FC"
          )
          HealthMiniCard(
            icon: "drop.fill",
            color: cyanColor,
            value: session.spo2 > 0 ? "\(session.spo2)" : "--",
            unit: "%",
            label: "SpO2"
          )
        }
        HStack(spacing: 4) {
          HealthMiniCard(
            icon: "flame.fill",
            color: orangeColor,
            value: session.activeCalories > 0 ? "\(session.activeCalories)" : "--",
            unit: "kcal",
            label: "Actives"
          )
          HealthMiniCard(
            icon: "figure.walk",
            color: blueColor,
            value: session.distance > 0 ? String(format: "%.1f", session.distance) : "--",
            unit: "km",
            label: "Distance"
          )
        }
      }
    }
  }

  private var displayHeartRate: Int {
    // Prefer local HealthKit reading, fallback to synced
    localHeartRate > 0 ? localHeartRate : session.heartRate
  }

  // MARK: - Streak Banner
  private var streakBanner: some View {
    HStack(spacing: 6) {
      Image(systemName: "flame.fill")
        .font(.system(size: 12))
        .foregroundColor(orangeColor)
      Text("\(session.streak)")
        .font(.system(size: 16, weight: .black))
        .foregroundColor(.white)
      Text("jours")
        .font(.system(size: 9, weight: .semibold))
        .foregroundColor(.gray)
      Spacer()
      // Mini progress dots for the week
      HStack(spacing: 2) {
        ForEach(0..<7, id: \.self) { i in
          Circle()
            .fill(i < min(session.streak, 7) ? orangeColor : Color.white.opacity(0.1))
            .frame(width: 4, height: 4)
        }
      }
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 6)
    .background(orangeColor.opacity(0.1))
    .cornerRadius(10)
    .padding(.horizontal, 2)
  }

  // MARK: - Recent Sessions
  private var recentSessions: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Image(systemName: "clock.fill")
          .font(.system(size: 8))
          .foregroundColor(goldColor)
        Text("RECENTS")
          .font(.system(size: 7, weight: .heavy))
          .foregroundColor(.gray)
          .tracking(1)
        Spacer()
      }
      .padding(.horizontal, 4)

      ForEach(session.recentWorkouts.prefix(2)) { workout in
        HStack(spacing: 6) {
          Image(systemName: workout.icon)
            .font(.system(size: 10))
            .foregroundColor(goldColor)
            .frame(width: 20, height: 20)
            .background(goldColor.opacity(0.12))
            .cornerRadius(5)
          Text(workout.type.capitalized)
            .font(.system(size: 9, weight: .semibold))
            .foregroundColor(.white)
            .lineLimit(1)
          Spacer()
          Text(workout.formattedDuration)
            .font(.system(size: 8))
            .foregroundColor(.gray)
        }
        .padding(.horizontal, 4)
      }
    }
  }

  // MARK: - HealthKit Fetching

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

  private func fetchHeartRate() {
    guard HKHealthStore.isHealthDataAvailable() else { return }
    let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    healthStore.requestAuthorization(toShare: [], read: [hrType]) { ok, _ in
      if ok {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let q = HKSampleQuery(sampleType: hrType, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
          if let sample = samples?.first as? HKQuantitySample {
            DispatchQueue.main.async {
              localHeartRate = Int(sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())))
            }
          }
        }
        healthStore.execute(q)
      }
    }
  }
}

// MARK: - Health Mini Card

struct HealthMiniCard: View {
  let icon: String
  let color: Color
  let value: String
  let unit: String
  let label: String

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: icon)
        .font(.system(size: 11))
        .foregroundColor(color)
        .frame(width: 22, height: 22)
        .background(color.opacity(0.15))
        .clipShape(Circle())

      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 2) {
          Text(value)
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.white)
          Text(unit)
            .font(.system(size: 7, weight: .medium))
            .foregroundColor(.gray)
        }
        Text(label)
          .font(.system(size: 7))
          .foregroundColor(.gray)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 6)
    .padding(.vertical, 6)
    .background(Color.white.opacity(0.05))
    .cornerRadius(8)
  }
}

// ============================================================
// TIMER DETAIL PAGE
// ============================================================

struct TimerDetailPage: View {
  @EnvironmentObject var session: WatchSessionManager
  @State private var selectedPreset: Int = 90
  @State private var showCustom = false
  @State private var customMinutes: Int = 1
  @State private var customSeconds: Int = 30

  // Standard presets
  private let presets: [(Int, String)] = [
    (30, "30s"),
    (45, "45s"),
    (60, "1:00"),
    (90, "1:30"),
    (120, "2:00"),
  ]

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {

        // ── Circular countdown (main display) ──
        ZStack {
          // Background ring
          Circle()
            .stroke(Color.white.opacity(0.08), lineWidth: 8)

          // Progress ring
          Circle()
            .trim(from: 0, to: timerProgress)
            .stroke(
              session.timerRemainingSeconds <= 10 && session.timerIsRunning
                ? LinearGradient(colors: [redColor, orangeColor], startPoint: .leading, endPoint: .trailing)
                : LinearGradient(colors: [goldColor, goldColor.opacity(0.7)], startPoint: .leading, endPoint: .trailing),
              style: StrokeStyle(lineWidth: 8, lineCap: .round)
            )
            .rotationEffect(.degrees(-90))
            .animation(.linear(duration: 1), value: session.timerRemainingSeconds)

          VStack(spacing: 2) {
            Text(session.formattedTime(session.timerRemainingSeconds))
              .font(.system(size: 28, weight: .bold, design: .monospaced))
              .foregroundColor(.white)
            Text(session.timerMode)
              .font(.system(size: 8, weight: .medium))
              .foregroundColor(.gray)
          }
        }
        .frame(width: 110, height: 110)

        // ── Play/Pause/Reset Controls ──
        HStack(spacing: 14) {
          if session.timerIsRunning {
            Button(action: { session.pauseTimer() }) {
              Image(systemName: "pause.fill")
                .font(.system(size: 18))
                .foregroundColor(.black)
                .frame(width: 42, height: 42)
                .background(goldColor)
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          } else {
            Button(action: { session.startTimer() }) {
              Image(systemName: "play.fill")
                .font(.system(size: 18))
                .foregroundColor(.black)
                .frame(width: 42, height: 42)
                .background(goldColor)
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          }

          if session.timerRemainingSeconds != session.timerTotalSeconds {
            Button(action: { session.resetTimer() }) {
              Image(systemName: "arrow.counterclockwise")
                .font(.system(size: 14))
                .foregroundColor(.white)
                .frame(width: 34, height: 34)
                .background(Color.white.opacity(0.12))
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          }
        }

        // ── Preset Circles ──
        if !session.timerIsRunning {
          VStack(spacing: 6) {
            Text("PRESETS")
              .font(.system(size: 7, weight: .heavy))
              .foregroundColor(.gray)
              .tracking(1)

            // Row of circles
            HStack(spacing: 6) {
              ForEach(presets, id: \.0) { (seconds, label) in
                Button(action: {
                  selectedPreset = seconds
                  session.setTimer(seconds: seconds)
                }) {
                  Text(label)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(selectedPreset == seconds ? .black : goldColor)
                    .frame(width: 32, height: 32)
                    .background(
                      selectedPreset == seconds
                        ? goldColor
                        : goldColor.opacity(0.15)
                    )
                    .clipShape(Circle())
                }
                .buttonStyle(.plain)
              }
            }

            // Custom + Favorites row
            HStack(spacing: 6) {
              // Custom button
              Button(action: { showCustom = true }) {
                HStack(spacing: 3) {
                  Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 8))
                  Text("Perso")
                    .font(.system(size: 8, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.white.opacity(0.1))
                .cornerRadius(8)
              }
              .buttonStyle(.plain)

              // Save to favorites
              if !presets.map({ $0.0 }).contains(session.timerTotalSeconds) {
                Button(action: { session.addTimerFavorite(session.timerTotalSeconds) }) {
                  Image(systemName: "star.fill")
                    .font(.system(size: 10))
                    .foregroundColor(goldColor)
                    .frame(width: 24, height: 24)
                    .background(goldColor.opacity(0.15))
                    .clipShape(Circle())
                }
                .buttonStyle(.plain)
              }
            }

            // Favorites
            if !session.timerFavorites.isEmpty {
              VStack(spacing: 4) {
                Text("FAVORIS")
                  .font(.system(size: 7, weight: .heavy))
                  .foregroundColor(goldColor.opacity(0.6))
                  .tracking(1)

                ScrollView(.horizontal, showsIndicators: false) {
                  HStack(spacing: 4) {
                    ForEach(session.timerFavorites, id: \.self) { fav in
                      Button(action: {
                        selectedPreset = fav
                        session.setTimer(seconds: fav)
                      }) {
                        HStack(spacing: 2) {
                          Image(systemName: "star.fill")
                            .font(.system(size: 5))
                          Text(formatPresetLabel(fav))
                            .font(.system(size: 8, weight: .bold))
                        }
                        .foregroundColor(selectedPreset == fav ? .black : goldColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 4)
                        .background(selectedPreset == fav ? goldColor : goldColor.opacity(0.1))
                        .cornerRadius(6)
                      }
                      .buttonStyle(.plain)
                    }
                  }
                }
              }
            }
          }
        }
      }
      .padding(.horizontal, 4)
    }
    .sheet(isPresented: $showCustom) {
      customTimerSheet
    }
  }

  // MARK: - Custom Timer Sheet
  private var customTimerSheet: some View {
    ScrollView {
      VStack(spacing: 10) {
        Text("PERSONNALISE")
          .font(.system(size: 9, weight: .heavy))
          .foregroundColor(goldColor)
          .tracking(1.5)

        HStack(spacing: 4) {
          // Minutes
          VStack(spacing: 2) {
            Button(action: { customMinutes = min(59, customMinutes + 1) }) {
              Image(systemName: "chevron.up")
                .font(.system(size: 10))
                .foregroundColor(goldColor)
            }.buttonStyle(.plain)

            Text(String(format: "%02d", customMinutes))
              .font(.system(size: 24, weight: .bold, design: .monospaced))
              .foregroundColor(.white)

            Button(action: { customMinutes = max(0, customMinutes - 1) }) {
              Image(systemName: "chevron.down")
                .font(.system(size: 10))
                .foregroundColor(goldColor)
            }.buttonStyle(.plain)
          }

          Text(":")
            .font(.system(size: 24, weight: .bold))
            .foregroundColor(.gray)

          // Seconds
          VStack(spacing: 2) {
            Button(action: { customSeconds = min(55, customSeconds + 5) }) {
              Image(systemName: "chevron.up")
                .font(.system(size: 10))
                .foregroundColor(goldColor)
            }.buttonStyle(.plain)

            Text(String(format: "%02d", customSeconds))
              .font(.system(size: 24, weight: .bold, design: .monospaced))
              .foregroundColor(.white)

            Button(action: { customSeconds = max(0, customSeconds - 5) }) {
              Image(systemName: "chevron.down")
                .font(.system(size: 10))
                .foregroundColor(goldColor)
            }.buttonStyle(.plain)
          }
        }

        Button(action: {
          let total = customMinutes * 60 + customSeconds
          guard total > 0 else { return }
          selectedPreset = total
          session.setTimer(seconds: total, mode: "Perso")
          showCustom = false
        }) {
          Text("Valider")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(goldColor)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
      }
      .padding(.horizontal, 8)
    }
  }

  // MARK: - Helpers

  private func formatPresetLabel(_ seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
    if m == 0 { return "\(s)s" }
    if s == 0 { return "\(m)min" }
    return "\(m):\(String(format: "%02d", s))"
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
    "halterophilie": Color(red: 0.831, green: 0.686, blue: 0.216),
    "crossfit": Color(red: 0.961, green: 0.620, blue: 0.043),
    "combat": Color(red: 0.937, green: 0.267, blue: 0.267),
    "strongman": Color(red: 0.545, green: 0.361, blue: 0.965),
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
    case "Olympique": return "scalemass.fill"
    case "CrossFit": return "flame.fill"
    case "Hyrox": return "flame.fill"
    case "Running": return "figure.run"
    case "Cardio": return "heart.fill"
    case "Combat": return "figure.martial.arts"
    case "Strongman": return "scalemass.fill"
    default: return "trophy.fill"
    }
  }

  private func colorFor(_ group: String) -> Color {
    switch group {
    case "Pectoraux": return Color(red: 0.937, green: 0.267, blue: 0.267) // Rouge
    case "Dos": return Color(red: 0.231, green: 0.510, blue: 0.965) // Bleu
    case "Epaules": return Color(red: 0.976, green: 0.451, blue: 0.086) // Orange
    case "Bras": return Color(red: 0.545, green: 0.361, blue: 0.965) // Violet
    case "Jambes": return Color(red: 0.063, green: 0.725, blue: 0.506) // Vert
    case "Abdos": return Color(red: 0.925, green: 0.306, blue: 0.604) // Rose
    case "Olympique": return Color(red: 0.831, green: 0.686, blue: 0.216) // Gold
    case "CrossFit": return Color(red: 0.961, green: 0.620, blue: 0.043) // Jaune
    case "Hyrox": return Color(red: 0.976, green: 0.451, blue: 0.086) // Orange
    case "Running": return Color(red: 0.231, green: 0.510, blue: 0.965) // Bleu
    case "Cardio": return Color(red: 0.063, green: 0.725, blue: 0.506) // Vert
    case "Combat": return Color(red: 0.937, green: 0.267, blue: 0.267) // Rouge
    case "Strongman": return Color(red: 0.545, green: 0.361, blue: 0.965) // Violet
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
