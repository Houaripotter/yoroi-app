import SwiftUI

// ============================================================
// COLORS (static fallbacks - dynamic accent from session.accentColor)
// ============================================================

private let cyanColor = Color(red: 0.024, green: 0.714, blue: 0.831) // #06B6D4
private let pinkColor = Color(red: 0.925, green: 0.306, blue: 0.604) // #EC4E9A
private let greenColor = Color(red: 0.063, green: 0.725, blue: 0.506) // #10B981
private let redColor = Color(red: 0.937, green: 0.267, blue: 0.267) // #EF4444
private let orangeColor = Color(red: 0.976, green: 0.451, blue: 0.086) // #F97316
private let blueColor = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6
private let purpleColor = Color(red: 0.545, green: 0.361, blue: 0.965) // #8B5CF6
private let indigoColor = Color(red: 0.388, green: 0.400, blue: 0.945) // #6366F1

// ============================================================
// PAGE 1: DASHBOARD - Premium redesign with pull-to-refresh
// ============================================================

struct DashboardPage: View {

  @EnvironmentObject var session: WatchSessionManager
  @State private var showTimer = false
  @State private var showSteps = false

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(spacing: 8) {
          profileHeader
          vitauxRow
          activiteRow
          secondaryRow
          quickActionsSection
          if !session.recentWorkouts.isEmpty {
            recentSessions
          }
        }
        .padding(.horizontal, 4)
        .padding(.top, 2)
      }
      .refreshable {
        session.requestSync()
        session.fetchAllHealthData()
        try? await Task.sleep(nanoseconds: 1_500_000_000)
      }
    }
    .sheet(isPresented: $showTimer) { TimerDetailPage() }
    .sheet(isPresented: $showSteps) { StepsDetailPage(steps: session.localSteps) }
    .onAppear { session.fetchAllHealthData() }
  }

  // MARK: - Header compact
  private var profileHeader: some View {
    HStack(spacing: 8) {
      ZStack {
        Circle()
          .fill(LinearGradient(
            colors: [session.accentColor, session.accentColor.opacity(0.5)],
            startPoint: .topLeading, endPoint: .bottomTrailing
          ))
          .frame(width: 32, height: 32)
        if let imgData = session.profileImageData, let uiImage = UIImage(data: imgData) {
          Image(uiImage: uiImage)
            .resizable().scaledToFill()
            .frame(width: 28, height: 28)
            .clipShape(Circle())
        } else {
          Text(initials)
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(session.textOnAccent)
        }
      }
      VStack(alignment: .leading, spacing: 0) {
        Text(session.userName.isEmpty ? "Yoroi" : session.userName)
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(session.textPrimary)
          .lineLimit(1)
        Text(session.rank.isEmpty ? "Niveau \(session.level)" : session.rank)
          .font(.system(size: 8, weight: .semibold))
          .foregroundColor(session.accentColor)
          .lineLimit(1)
      }
      Spacer()
      if session.streak > 0 {
        HStack(spacing: 2) {
          Image(systemName: "flame.fill").font(.system(size: 8)).foregroundColor(orangeColor)
          Text("\(session.streak)j").font(.system(size: 9, weight: .bold)).foregroundColor(orangeColor)
        }
        .padding(.horizontal, 5).padding(.vertical, 2)
        .background(orangeColor.opacity(0.12))
        .cornerRadius(7)
      }
      Circle()
        .fill(session.isConnected ? greenColor : redColor)
        .frame(width: 5, height: 5)
    }
    .padding(.horizontal, 2)
  }

  private var initials: String {
    let parts = session.userName.split(separator: " ")
    if parts.count >= 2 { return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased() }
    return String(session.userName.prefix(2)).uppercased()
  }

  // MARK: - Vitaux héros : FC + SpO2
  private var vitauxRow: some View {
    HStack(spacing: 6) {
      vitalCard(
        value: displayHeartRate > 0 ? "\(displayHeartRate)" : "--",
        unit: "BPM", label: "FC", icon: "heart.fill",
        gradient: [Color(red: 0.80, green: 0.12, blue: 0.18), Color(red: 0.45, green: 0.04, blue: 0.08)]
      )
      vitalCard(
        value: displaySpo2 > 0 ? "\(displaySpo2)" : "--",
        unit: "%", label: "SpO2", icon: "lungs.fill",
        gradient: [Color(red: 0.22, green: 0.44, blue: 0.95), Color(red: 0.12, green: 0.20, blue: 0.60)]
      )
    }
  }

  private func vitalCard(value: String, unit: String, label: String, icon: String, gradient: [Color]) -> some View {
    VStack(alignment: .leading, spacing: 5) {
      HStack(spacing: 4) {
        Image(systemName: icon).font(.system(size: 9)).foregroundColor(.white.opacity(0.75))
        Text(label).font(.system(size: 8, weight: .semibold)).foregroundColor(.white.opacity(0.75))
      }
      HStack(alignment: .lastTextBaseline, spacing: 3) {
        Text(value)
          .font(.system(size: 24, weight: .black))
          .foregroundColor(.white)
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text(unit)
          .font(.system(size: 9, weight: .bold))
          .foregroundColor(.white.opacity(0.65))
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 10).padding(.vertical, 10)
    .background(LinearGradient(colors: gradient, startPoint: .topLeading, endPoint: .bottomTrailing))
    .cornerRadius(13)
  }

  // MARK: - Anneaux d'activité (Pas + Eau + Calories)
  private var activiteRow: some View {
    HStack(spacing: 0) {
      ringButton(icon: "figure.walk", progress: stepsProgress,
        value: displaySteps > 0 ? formatSteps(displaySteps) : "--",
        color: greenColor, action: { showSteps = true })
      ringButton(icon: "drop.fill", progress: hydrationProgress,
        value: session.hydrationCurrent > 0 ? String(format: "%.1fL", Double(session.hydrationCurrent)/1000) : "--",
        color: cyanColor, action: { session.requestedTab = 2 })
      ringButton(icon: "flame.fill", progress: caloriesProgress,
        value: displayCalories > 0 ? "\(displayCalories)" : "--",
        color: orangeColor, action: { session.requestedTab = 4 })
    }
    .padding(.vertical, 2)
  }

  private func ringButton(icon: String, progress: Double, value: String, color: Color, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      VStack(spacing: 4) {
        ZStack {
          Circle().stroke(color.opacity(0.15), lineWidth: 4)
          Circle()
            .trim(from: 0, to: progress)
            .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .rotationEffect(.degrees(-90))
          Image(systemName: icon).font(.system(size: 12)).foregroundColor(color)
        }
        .frame(width: 44, height: 44)
        Text(value)
          .font(.system(size: 8, weight: .semibold))
          .foregroundColor(session.textSecondary)
          .lineLimit(1).minimumScaleFactor(0.7)
      }
    }
    .buttonStyle(.plain)
    .frame(maxWidth: .infinity)
  }

  // MARK: - Métriques secondaires (FR + Exercice + Debout)
  private var secondaryRow: some View {
    HStack(spacing: 4) {
      compactStat(icon: "wind",
        value: displayRespiratory > 0 ? "\(displayRespiratory)" : "--",
        unit: "rpm", color: greenColor)
      compactStat(icon: "figure.run",
        value: displayExerciseMinutes > 0 ? "\(displayExerciseMinutes)" : "--",
        unit: "min", color: purpleColor)
      compactStat(icon: "figure.stand",
        value: displayStandHours > 0 ? "\(displayStandHours)" : "--",
        unit: "h", color: blueColor)
    }
  }

  private func compactStat(icon: String, value: String, unit: String, color: Color) -> some View {
    VStack(spacing: 3) {
      Image(systemName: icon).font(.system(size: 10)).foregroundColor(color)
      Text(value)
        .font(.system(size: 14, weight: .black))
        .foregroundColor(session.textPrimary)
        .minimumScaleFactor(0.7).lineLimit(1)
      Text(unit).font(.system(size: 7)).foregroundColor(session.textSecondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 8)
    .background(session.cardBg)
    .cornerRadius(10)
  }

  // MARK: - Actions rapides (Minuteur + Carnet)
  private var quickActionsSection: some View {
    VStack(spacing: 4) {
      Button(action: { showTimer = true }) {
        HStack(spacing: 8) {
          ZStack {
            Circle().fill(session.accentColor.opacity(0.15)).frame(width: 30, height: 30)
            if session.timerIsRunning {
              Circle()
                .trim(from: 0, to: timerProgress)
                .stroke(session.accentColor, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .frame(width: 30, height: 30)
            }
            Image(systemName: session.timerIsRunning ? "pause.fill" : "timer")
              .font(.system(size: 12)).foregroundColor(session.accentColor)
          }
          VStack(alignment: .leading, spacing: 1) {
            Text("MINUTEUR").font(.system(size: 7, weight: .heavy)).foregroundColor(session.accentColor).tracking(0.5)
            Text(session.timerIsRunning
              ? session.formattedTime(session.timerRemainingSeconds)
              : "Appuyer pour démarrer")
              .font(.system(size: 9)).foregroundColor(session.textSecondary).lineLimit(1)
          }
          Spacer()
          Image(systemName: "chevron.right").font(.system(size: 8)).foregroundColor(session.textSecondary.opacity(0.4))
        }
        .padding(.horizontal, 8).padding(.vertical, 7)
        .background(session.cardBg).cornerRadius(10)
      }
      .buttonStyle(.plain)

      Button(action: { session.requestedTab = 5 }) {
        HStack(spacing: 8) {
          ZStack {
            RoundedRectangle(cornerRadius: 7).fill(purpleColor.opacity(0.15)).frame(width: 30, height: 30)
            Image(systemName: "dumbbell.fill").font(.system(size: 12)).foregroundColor(purpleColor)
          }
          VStack(alignment: .leading, spacing: 1) {
            Text("CARNET").font(.system(size: 7, weight: .heavy)).foregroundColor(purpleColor).tracking(0.5)
            let prCount = session.benchmarks.filter { $0.pr > 0 }.count
            Text(session.streak > 0 ? "\(session.streak)j de suite · \(prCount) PRs" : "Logger une séance")
              .font(.system(size: 9)).foregroundColor(session.textSecondary).lineLimit(1)
          }
          Spacer()
          Image(systemName: "chevron.right").font(.system(size: 8)).foregroundColor(session.textSecondary.opacity(0.4))
        }
        .padding(.horizontal, 8).padding(.vertical, 7)
        .background(session.cardBg).cornerRadius(10)
      }
      .buttonStyle(.plain)
    }
  }

  // MARK: - Séances récentes
  private var recentSessions: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Image(systemName: "clock.fill").font(.system(size: 7)).foregroundColor(session.accentColor)
        Text("RÉCENTS").font(.system(size: 7, weight: .heavy)).foregroundColor(session.textSecondary).tracking(1)
        Spacer()
      }
      .padding(.horizontal, 2)
      ForEach(session.recentWorkouts.prefix(2)) { workout in
        HStack(spacing: 6) {
          Image(systemName: workout.icon).font(.system(size: 9)).foregroundColor(session.accentColor)
            .frame(width: 18, height: 18).background(session.accentColor.opacity(0.12)).cornerRadius(5)
          Text(workout.type.capitalized)
            .font(.system(size: 9, weight: .semibold)).foregroundColor(session.textPrimary).lineLimit(1)
          Spacer()
          Text(workout.formattedDuration).font(.system(size: 8)).foregroundColor(session.textSecondary)
        }
        .padding(.horizontal, 4)
      }
    }
  }

  // MARK: - Computed helpers
  private var displayHeartRate: Int { session.localHeartRate > 0 ? session.localHeartRate : session.heartRate }
  private var displaySteps: Int { session.localSteps > 0 ? session.localSteps : 0 }
  private var displayCalories: Int { session.localActiveCalories > 0 ? session.localActiveCalories : session.activeCalories }
  private var displayDistance: Double { session.localDistance > 0 ? session.localDistance : session.distance }
  private var displaySpo2: Int { session.localSpo2 > 0 ? session.localSpo2 : session.spo2 }
  private var displayRespiratory: Int { session.localRespiratoryRate > 0 ? session.localRespiratoryRate : session.respiratoryRate }
  private var displayExerciseMinutes: Int { session.localExerciseMinutes > 0 ? session.localExerciseMinutes : session.exerciseMinutes }
  private var displayStandHours: Int { session.localStandHours > 0 ? session.localStandHours : session.standHours }

  private var timerProgress: Double {
    guard session.timerTotalSeconds > 0 else { return 0 }
    return Double(session.timerRemainingSeconds) / Double(session.timerTotalSeconds)
  }
  private var stepsProgress: Double { min(1.0, Double(displaySteps) / Double(max(1, session.stepsGoal))) }
  private var hydrationProgress: Double { min(1.0, Double(session.hydrationCurrent) / Double(max(1, session.hydrationGoal))) }
  private var caloriesProgress: Double { min(1.0, Double(displayCalories) / 500.0) }
  private func formatSteps(_ n: Int) -> String { n >= 1000 ? String(format: "%.1fk", Double(n)/1000) : "\(n)" }

}

// HealthMiniCard kept for backward compatibility (unused in dashboard)
struct HealthMiniCard: View {
  let icon: String
  let color: Color
  let value: String
  let unit: String
  let label: String
  var cardBg: Color = Color.white.opacity(0.05)
  var textPrimary: Color = .white
  var textSecondary: Color = .gray

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
          Text(value).font(.system(size: 13, weight: .bold)).foregroundColor(textPrimary)
          Text(unit).font(.system(size: 7, weight: .medium)).foregroundColor(textSecondary)
        }
        Text(label).font(.system(size: 7)).foregroundColor(textSecondary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 6).padding(.vertical, 6)
    .background(cardBg).cornerRadius(8)
  }
}
// ============================================================
// TIMER DETAIL PAGE - Horizontal scrollable presets, full screen on tap
// ============================================================

struct TimerDetailPage: View {
  @EnvironmentObject var session: WatchSessionManager
  @State private var selectedPreset: Int? = nil
  @State private var showCustom = false
  @State private var customHours: Int = 0
  @State private var customMinutes: Int = 1
  @State private var customSeconds: Int = 30
  // Digital Crown : 0 = heures, 1 = minutes, 2 = secondes
  @State private var focusedField: Int = 1
  @State private var crownValue: Double = 1
  // Alarm flash states
  @State private var alarmFlash = false
  @State private var alarmIconScale: CGFloat = 1.0
  @State private var alarmTextOpacity: Double = 1.0

  // Extended presets (scrollable)
  private let presets: [(Int, String)] = [
    (15, "15s"),
    (30, "30s"),
    (45, "45s"),
    (60, "1:00"),
    (90, "1:30"),
    (120, "2:00"),
    (150, "2:30"),
    (180, "3:00"),
    (240, "4:00"),
    (300, "5:00"),
  ]

  var body: some View {
    Group {
      if session.timerAlarmRinging {
        // ALARM RINGING - full screen stop overlay
        alarmOverlay
      } else if session.timerIsRunning || selectedPreset != nil {
        // FULL SCREEN TIMER (only when a preset is selected or timer is running)
        timerFullScreen
      } else {
        // PRESET SELECTOR (initial view)
        presetSelector
      }
    }
    .sheet(isPresented: $showCustom) {
      customTimerSheet
    }
  }

  // MARK: - Preset Selector (scrollable horizontal)
  private var presetSelector: some View {
    ScrollView {
      VStack(spacing: 10) {
        Text("MINUTEUR")
          .font(.system(size: 9, weight: .heavy))
          .foregroundColor(session.accentColor)
          .tracking(2)

        Text("Choisis un temps")
          .font(.system(size: 10))
          .foregroundColor(session.textSecondary)

        // Horizontal scrollable presets
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 8) {
            ForEach(presets, id: \.0) { (seconds, label) in
              Button(action: {
                selectedPreset = seconds
                session.setTimer(seconds: seconds)
              }) {
                VStack(spacing: 4) {
                  Text(label)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(session.textPrimary)
                }
                .frame(width: 52, height: 52)
                .background(session.accentColor.opacity(0.15))
                .clipShape(Circle())
              }
              .buttonStyle(.plain)
            }
          }
          .padding(.horizontal, 8)
        }

        // Custom button
        Button(action: { showCustom = true }) {
          HStack(spacing: 4) {
            Image(systemName: "slider.horizontal.3")
              .font(.system(size: 10))
            Text("Personnalise")
              .font(.system(size: 10, weight: .semibold))
          }
          .foregroundColor(session.textPrimary)
          .padding(.horizontal, 14)
          .padding(.vertical, 8)
          .background(session.cardBg)
          .cornerRadius(10)
        }
        .buttonStyle(.plain)

        // Favorites
        if !session.timerFavorites.isEmpty {
          VStack(spacing: 4) {
            Text("FAVORIS")
              .font(.system(size: 7, weight: .heavy))
              .foregroundColor(session.accentColor.opacity(0.6))
              .tracking(1)

            ScrollView(.horizontal, showsIndicators: false) {
              HStack(spacing: 6) {
                ForEach(session.timerFavorites, id: \.self) { fav in
                  Button(action: {
                    selectedPreset = fav
                    session.setTimer(seconds: fav)
                  }) {
                    HStack(spacing: 2) {
                      Image(systemName: "star.fill")
                        .font(.system(size: 5))
                      Text(formatPresetLabel(fav))
                        .font(.system(size: 9, weight: .bold))
                    }
                    .foregroundColor(session.accentColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(session.accentColor.opacity(0.1))
                    .cornerRadius(8)
                  }
                  .buttonStyle(.plain)
                }
              }
              .padding(.horizontal, 4)
            }
          }
        }
      }
      .padding(.horizontal, 4)
    }
  }

  // MARK: - Full Screen Timer
  private var timerFullScreen: some View {
    ScrollView {
      VStack(spacing: 8) {
        // Circular countdown
        ZStack {
          Circle()
            .stroke(session.dividerColor, lineWidth: 8)

          Circle()
            .trim(from: 0, to: timerProgress)
            .stroke(
              session.timerRemainingSeconds <= 10 && session.timerIsRunning
                ? LinearGradient(colors: [redColor, orangeColor], startPoint: .leading, endPoint: .trailing)
                : LinearGradient(colors: [session.accentColor, session.accentColor.opacity(0.7)], startPoint: .leading, endPoint: .trailing),
              style: StrokeStyle(lineWidth: 8, lineCap: .round)
            )
            .rotationEffect(.degrees(-90))
            .animation(.linear(duration: 1), value: session.timerRemainingSeconds)

          VStack(spacing: 2) {
            let displaySecs = (session.timerRemainingSeconds == 0 && !session.timerIsRunning)
              ? session.timerTotalSeconds
              : session.timerRemainingSeconds
            Text(session.formattedTime(displaySecs))
              .font(.system(size: 28, weight: .bold, design: .monospaced))
              .foregroundColor(session.textPrimary)
          }
        }
        .frame(width: 110, height: 110)

        // Controls
        HStack(spacing: 14) {
          if session.timerIsRunning {
            Button(action: { session.pauseTimer() }) {
              Image(systemName: "pause.fill")
                .font(.system(size: 18))
                .foregroundColor(session.textOnAccent)
                .frame(width: 42, height: 42)
                .background(session.accentColor)
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          } else {
            Button(action: { session.startTimer() }) {
              Image(systemName: "play.fill")
                .font(.system(size: 18))
                .foregroundColor(session.textOnAccent)
                .frame(width: 42, height: 42)
                .background(session.accentColor)
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          }

          if session.timerRemainingSeconds != session.timerTotalSeconds {
            Button(action: { session.resetTimer() }) {
              Image(systemName: "arrow.counterclockwise")
                .font(.system(size: 14))
                .foregroundColor(session.textPrimary)
                .frame(width: 34, height: 34)
                .background(session.cardBg)
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
          }
        }

        // Back to presets (when not running)
        if !session.timerIsRunning {
          Button(action: {
            selectedPreset = nil
            session.resetTimer()
          }) {
            HStack(spacing: 4) {
              Image(systemName: "chevron.left")
                .font(.system(size: 8))
              Text("Presets")
                .font(.system(size: 10, weight: .semibold))
            }
            .foregroundColor(session.textSecondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(session.cardBg)
            .cornerRadius(8)
          }
          .buttonStyle(.plain)

          // Save to favorites
          if let preset = selectedPreset, !presets.map({ $0.0 }).contains(preset) {
            Button(action: { session.addTimerFavorite(preset) }) {
              HStack(spacing: 3) {
                Image(systemName: "star.fill")
                  .font(.system(size: 8))
                Text("Sauvegarder")
                  .font(.system(size: 8, weight: .semibold))
              }
              .foregroundColor(session.accentColor)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(session.accentColor.opacity(0.15))
              .cornerRadius(6)
            }
            .buttonStyle(.plain)
          }
        }
      }
      .padding(.horizontal, 4)
    }
  }

  // MARK: - Alarm Overlay (looping sound + vibration)
  private var alarmOverlay: some View {
    ZStack {
      // Fond clignotant rouge ↔ noir
      (alarmFlash ? Color(red: 0.85, green: 0.06, blue: 0.06) : Color.black)
        .ignoresSafeArea()

      VStack(spacing: 8) {
        // Icône pulsante
        ZStack {
          Circle()
            .fill(Color.white.opacity(alarmFlash ? 0.25 : 0.08))
            .frame(width: 60, height: 60)
          Image(systemName: "timer")
            .font(.system(size: 30, weight: .black))
            .foregroundColor(.white)
        }
        .scaleEffect(alarmIconScale)

        Text("TIMER")
          .font(.system(size: 22, weight: .black))
          .foregroundColor(.white)
          .tracking(3)
          .opacity(alarmTextOpacity)

        Text("TERMINÉ !")
          .font(.system(size: 16, weight: .heavy))
          .foregroundColor(alarmFlash ? .white : Color(red: 1, green: 0.4, blue: 0.4))
          .tracking(1)

        Button(action: {
          session.stopAlarm()
          session.resetTimer()
          selectedPreset = nil
        }) {
          Text("ARRÊTER")
            .font(.system(size: 13, weight: .black))
            .tracking(1)
            .foregroundColor(.black)
            .padding(.horizontal, 20)
            .padding(.vertical, 9)
            .background(Color.white)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .padding(.top, 2)
      }
    }
    .onAppear {
      withAnimation(Animation.easeInOut(duration: 0.4).repeatForever(autoreverses: true)) {
        alarmFlash = true
      }
      withAnimation(Animation.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
        alarmIconScale = 1.25
      }
      withAnimation(Animation.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
        alarmTextOpacity = 0.5
      }
    }
  }

  // MARK: - Custom Timer Sheet
  private var customTimerSheet: some View {
    VStack(spacing: 6) {

      Text("PERSONNALISE")
        .font(.system(size: 9, weight: .heavy))
        .foregroundColor(session.accentColor)
        .tracking(1.5)
        .padding(.top, 4)

      // ── Labels H / M / S ──
      HStack(spacing: 0) {
        Text("H")
          .frame(maxWidth: .infinity)
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(focusedField == 0 ? session.accentColor : session.textSecondary)
        Text("M")
          .frame(maxWidth: .infinity)
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(focusedField == 1 ? session.accentColor : session.textSecondary)
        Text("S")
          .frame(maxWidth: .infinity)
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(focusedField == 2 ? session.accentColor : session.textSecondary)
      }
      .padding(.horizontal, 8)

      // ── Colonnes ──
      HStack(spacing: 0) {
        timeColumn(
          value: $customHours,
          range: 0...23,
          step: 1,
          isFocused: focusedField == 0
        ) { focusedField = 0; crownValue = Double(customHours) }

        Text(":")
          .font(.system(size: 26, weight: .bold, design: .monospaced))
          .foregroundColor(session.textSecondary.opacity(0.6))
          .frame(width: 12)

        timeColumn(
          value: $customMinutes,
          range: 0...59,
          step: 1,
          isFocused: focusedField == 1
        ) { focusedField = 1; crownValue = Double(customMinutes) }

        Text(":")
          .font(.system(size: 26, weight: .bold, design: .monospaced))
          .foregroundColor(session.textSecondary.opacity(0.6))
          .frame(width: 12)

        timeColumn(
          value: $customSeconds,
          range: 0...59,
          step: 5,
          isFocused: focusedField == 2
        ) { focusedField = 2; crownValue = Double(customSeconds) }
      }
      .padding(.horizontal, 4)
      // Digital Crown contrôle la colonne active
      .digitalCrownRotation(
        $crownValue,
        from: 0,
        through: focusedField == 0 ? 23 : 59,
        by: focusedField == 2 ? 5 : 1,
        sensitivity: .medium,
        isContinuous: false,
        isHapticFeedbackEnabled: true
      )
      .onChange(of: crownValue) {
        let v = Int(crownValue.rounded())
        switch focusedField {
        case 0: customHours   = max(0, min(23, v))
        case 1: customMinutes = max(0, min(59, v))
        default: customSeconds = max(0, min(59, v))
        }
      }

      // ── Bouton Valider ──
      Button(action: {
        let total = customHours * 3600 + customMinutes * 60 + customSeconds
        guard total > 0 else { return }
        selectedPreset = total
        session.setTimer(seconds: total)
        showCustom = false
      }) {
        Text("Valider")
          .font(.system(size: 13, weight: .bold))
          .foregroundColor(session.textOnAccent)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 9)
          .background(session.accentColor)
          .cornerRadius(12)
      }
      .buttonStyle(.plain)
      .padding(.horizontal, 8)
      .padding(.bottom, 4)
    }
  }

  // ── Colonne réutilisable H / M / S ──
  @ViewBuilder
  private func timeColumn(
    value: Binding<Int>,
    range: ClosedRange<Int>,
    step: Int,
    isFocused: Bool,
    onTap: @escaping () -> Void
  ) -> some View {
    VStack(spacing: 0) {
      // Bouton +
      Button(action: {
        onTap()
        let next = value.wrappedValue + step
        value.wrappedValue = next > range.upperBound ? range.lowerBound : next
        crownValue = Double(value.wrappedValue)
      }) {
        Image(systemName: "chevron.up")
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(isFocused ? session.accentColor : session.textSecondary)
          .frame(width: 44, height: 32)
          .background(isFocused ? session.accentColor.opacity(0.12) : Color.clear)
          .clipShape(RoundedRectangle(cornerRadius: 8))
      }
      .buttonStyle(.plain)

      // Valeur — tap pour sélectionner cette colonne
      Button(action: onTap) {
        Text(String(format: "%02d", value.wrappedValue))
          .font(.system(size: 30, weight: .bold, design: .monospaced))
          .foregroundColor(isFocused ? session.accentColor : session.textPrimary)
          .frame(width: 44, height: 36)
      }
      .buttonStyle(.plain)

      // Bouton -
      Button(action: {
        onTap()
        let prev = value.wrappedValue - step
        value.wrappedValue = prev < range.lowerBound ? range.upperBound : prev
        crownValue = Double(value.wrappedValue)
      }) {
        Image(systemName: "chevron.down")
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(isFocused ? session.accentColor : session.textSecondary)
          .frame(width: 44, height: 32)
          .background(isFocused ? session.accentColor.opacity(0.12) : Color.clear)
          .clipShape(RoundedRectangle(cornerRadius: 8))
      }
      .buttonStyle(.plain)
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Helpers

  private func formatPresetLabel(_ seconds: Int) -> String {
    let h = seconds / 3600
    let m = (seconds % 3600) / 60
    let s = seconds % 60
    if h > 0 { return "\(h)h\(String(format: "%02d", m))" }
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
            .stroke(session.dividerColor, lineWidth: 8)
          Circle()
            .trim(from: 0, to: progress)
            .stroke(Color.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
            .rotationEffect(.degrees(-90))

          VStack(spacing: 0) {
            Text("\(steps)")
              .font(.system(size: 24, weight: .bold))
              .foregroundColor(session.textPrimary)
            Text("/ \(session.stepsGoal)")
              .font(.system(size: 10))
              .foregroundColor(session.textSecondary)
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

// Shared category colors used by ExerciseLibraryPage and MuscleGroupPage
private let watchCatColors: [String: Color] = [
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

// ============================================================
// EXERCISE LIBRARY PAGE
// ============================================================

struct ExerciseLibraryPage: View {
  @EnvironmentObject var session: WatchSessionManager
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
                  .foregroundColor(session.textPrimary)
                Text("\(ExerciseTemplate.exercises(for: group).count) exercices")
                  .font(.system(size: 8))
                  .foregroundColor(session.textSecondary)
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
    case "Fessiers": return "figure.strengthtraining.traditional"
    case "Ischios": return "figure.strengthtraining.traditional"
    case "Mobilite": return "figure.flexibility"
    default: return "trophy.fill"
    }
  }

  private func colorFor(_ group: String) -> Color {
    switch group {
    case "Pectoraux": return Color(red: 0.937, green: 0.267, blue: 0.267)
    case "Dos": return Color(red: 0.231, green: 0.510, blue: 0.965)
    case "Epaules": return Color(red: 0.976, green: 0.451, blue: 0.086)
    case "Bras": return Color(red: 0.545, green: 0.361, blue: 0.965)
    case "Jambes": return Color(red: 0.063, green: 0.725, blue: 0.506)
    case "Fessiers": return Color(red: 0.976, green: 0.341, blue: 0.573)
    case "Ischios": return Color(red: 0.180, green: 0.800, blue: 0.443)
    case "Abdos": return Color(red: 0.925, green: 0.306, blue: 0.604)
    case "Mobilite": return Color(red: 0.400, green: 0.780, blue: 0.820)
    case "Olympique": return Color(red: 0.831, green: 0.686, blue: 0.216)
    case "CrossFit": return Color(red: 0.961, green: 0.620, blue: 0.043)
    case "Hyrox": return Color(red: 0.976, green: 0.451, blue: 0.086)
    case "Running": return Color(red: 0.231, green: 0.510, blue: 0.965)
    case "Cardio": return Color(red: 0.063, green: 0.725, blue: 0.506)
    case "Combat": return Color(red: 0.937, green: 0.267, blue: 0.267)
    case "Strongman": return Color(red: 0.545, green: 0.361, blue: 0.965)
    default: return session.accentColor
    }
  }
}

// MARK: - Muscle Group Page

struct MuscleGroupPage: View {
  @EnvironmentObject var session: WatchSessionManager
  let group: String
  @State private var selectedExercise: ExerciseTemplate? = nil

  var body: some View {
    List {
      ForEach(ExerciseTemplate.exercises(for: group)) { exercise in
        Button(action: { selectedExercise = exercise }) {
          HStack(spacing: 8) {
            Image(systemName: exercise.icon)
              .font(.system(size: 12))
              .foregroundColor(session.accentColor)
              .frame(width: 22, height: 22)
              .background(session.accentColor.opacity(0.15))
              .cornerRadius(5)

            VStack(alignment: .leading, spacing: 1) {
              Text(exercise.name)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(session.textPrimary)
              Text(exercise.unit == "kg" ? "Poids (kg)" : exercise.unit == "reps" ? "Repetitions" : "Temps")
                .font(.system(size: 8))
                .foregroundColor(session.textSecondary)
            }

            Spacer()

            Image(systemName: "plus.circle.fill")
              .font(.system(size: 14))
              .foregroundColor(session.accentColor)
          }
        }
        .buttonStyle(.plain)
      }
    }
    .navigationTitle(group)
    .sheet(item: $selectedExercise) { exercise in
      let catColor = watchCatColors[exercise.category.lowercased()] ?? session.accentColor
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
// ADD ENTRY PAGE
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

        if let pr = currentPR {
          VStack(spacing: 1) {
            Text("Record actuel")
              .font(.system(size: 8))
              .foregroundColor(session.textSecondary)
            Text(pr)
              .font(.system(size: 18, weight: .bold))
              .foregroundColor(catColor)
          }
        }

        Divider().background(session.dividerColor)

        if unit == "kg" || unit == "lbs" {
          VStack(spacing: 3) {
            Text(unit.uppercased())
              .font(.system(size: 8, weight: .bold))
              .foregroundColor(session.textSecondary)
            Text(String(format: "%.1f", value))
              .font(.system(size: 28, weight: .bold))
              .foregroundColor(session.textPrimary)
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

          HStack {
            Text("Reps:")
              .font(.system(size: 11))
              .foregroundColor(session.textSecondary)
            Spacer()
            Button(action: { reps = max(1, reps - 1) }) {
              Image(systemName: "minus").font(.system(size: 10))
            }.buttonStyle(.plain)
            Text("\(reps)")
              .font(.system(size: 16, weight: .bold))
              .foregroundColor(session.textPrimary)
              .frame(width: 30)
            Button(action: { reps += 1 }) {
              Image(systemName: "plus").font(.system(size: 10))
            }.buttonStyle(.plain)
          }
          .padding(.horizontal, 8)

        } else if unit == "reps" {
          VStack(spacing: 3) {
            Text("REPETITIONS")
              .font(.system(size: 8, weight: .bold))
              .foregroundColor(session.textSecondary)
            Text("\(Int(value))")
              .font(.system(size: 28, weight: .bold))
              .foregroundColor(session.textPrimary)
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
          VStack(spacing: 3) {
            Text("TEMPS")
              .font(.system(size: 8, weight: .bold))
              .foregroundColor(session.textSecondary)
            HStack(spacing: 4) {
              VStack(spacing: 2) {
                Button(action: { timeMinutes += 1 }) {
                  Image(systemName: "chevron.up")
                    .font(.system(size: 10))
                }.buttonStyle(.plain)
                Text(String(format: "%02d", timeMinutes))
                  .font(.system(size: 22, weight: .bold, design: .monospaced))
                  .foregroundColor(session.textPrimary)
                Button(action: { timeMinutes = max(0, timeMinutes - 1) }) {
                  Image(systemName: "chevron.down")
                    .font(.system(size: 10))
                }.buttonStyle(.plain)
              }
              Text(":")
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(session.textSecondary)
              VStack(spacing: 2) {
                Button(action: { timeSeconds = min(59, timeSeconds + 5) }) {
                  Image(systemName: "chevron.up")
                    .font(.system(size: 10))
                }.buttonStyle(.plain)
                Text(String(format: "%02d", timeSeconds))
                  .font(.system(size: 22, weight: .bold, design: .monospaced))
                  .foregroundColor(session.textPrimary)
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
            .foregroundColor(session.textSecondary)
          HStack(spacing: 3) {
            ForEach([6, 7, 8, 9, 10], id: \.self) { r in
              Button(action: { rpe = r }) {
                Text("\(r)")
                  .font(.system(size: 10, weight: rpe == r ? .bold : .regular))
                  .foregroundColor(rpe == r ? (session.textOnAccent) : session.textPrimary)
                  .frame(width: 22, height: 22)
                  .background(rpe == r ? catColor : session.cardBg)
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
          session.logBenchmarkEntry(benchmarkId: exerciseId, exerciseName: exerciseName, value: finalValue, reps: reps, rpe: rpe)
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
