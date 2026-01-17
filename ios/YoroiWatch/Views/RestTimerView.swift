//
//  RestTimerView.swift
//  YoroiWatch Watch App
//
//  Timer de repos entre les séries avec haptics
//

import SwiftUI
import WatchKit

struct RestTimerView: View {
    @EnvironmentObject var workoutSessionManager: WorkoutSessionManager

    @State private var selectedDuration: Int = 90  // en secondes
    @State private var remainingTime: Int = 0
    @State private var isRunning: Bool = false
    @State private var isPaused: Bool = false
    @State private var timer: Timer?
    @State private var totalDuration: Int = 0
    @State private var hasPlayedHalfway: Bool = false
    @State private var hasPlayedTenSeconds: Bool = false

    let presets = [30, 60, 90, 120, 180]  // 30s, 1min, 1:30, 2min, 3min

    private let haptics = HapticsManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Titre
                HStack {
                    Image(systemName: "timer")
                        .foregroundColor(.yellow)
                    Text("Repos")
                        .font(.headline)
                }

                if isRunning || isPaused {
                    // Timer actif
                    activeTimerView
                } else {
                    // Sélection du temps
                    selectionView
                }
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Vue Timer Actif

    private var activeTimerView: some View {
        VStack(spacing: 12) {
            // Cercle de progression
            ZStack {
                // Fond
                Circle()
                    .stroke(Color.yellow.opacity(0.2), lineWidth: 10)
                    .frame(width: 100, height: 100)

                // Progression
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        progressColor,
                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                    )
                    .frame(width: 100, height: 100)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: remainingTime)

                // Temps restant
                VStack(spacing: 2) {
                    Text(timeFormatted)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(progressColor)
                    if remainingTime <= 10 && remainingTime > 0 {
                        Text("Bientôt!")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
            }

            // Boutons de contrôle
            HStack(spacing: 16) {
                // Pause/Resume
                Button(action: togglePause) {
                    Image(systemName: isPaused ? "play.fill" : "pause.fill")
                        .font(.title3)
                        .frame(width: 44, height: 44)
                        .background(Color.gray.opacity(0.3))
                        .cornerRadius(22)
                }
                .buttonStyle(.plain)

                // Stop
                Button(action: stopTimer) {
                    Image(systemName: "stop.fill")
                        .font(.title3)
                        .frame(width: 44, height: 44)
                        .background(Color.red.opacity(0.3))
                        .cornerRadius(22)
                }
                .buttonStyle(.plain)
            }

            // Ajustement rapide
            HStack(spacing: 8) {
                Button(action: { adjustTime(-15) }) {
                    Text("-15s")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)

                Button(action: { adjustTime(15) }) {
                    Text("+15s")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
        .focusable(true)
        .digitalCrownRotation(
            Binding(
                get: { Double(remainingTime) },
                set: { newValue in
                    let newTime = max(0, min(Int(newValue), 600))
                    if newTime != remainingTime {
                        remainingTime = newTime
                        totalDuration = max(totalDuration, remainingTime)
                    }
                }
            ),
            from: 0,
            through: 600,
            by: 5,
            sensitivity: .medium,
            isContinuous: false,
            isHapticFeedbackEnabled: true
        )
    }

    // MARK: - Vue Sélection

    private var selectionView: some View {
        VStack(spacing: 10) {
            // Affichage du temps sélectionné
            Text(formatDuration(selectedDuration))
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundColor(.yellow)
                .focusable(true)
                .digitalCrownRotation(
                    Binding(
                        get: { Double(selectedDuration) },
                        set: { selectedDuration = max(10, min(Int($0), 600)) }
                    ),
                    from: 10,
                    through: 600,
                    by: 5,
                    sensitivity: .medium,
                    isContinuous: false,
                    isHapticFeedbackEnabled: true
                )

            // Presets
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 6) {
                ForEach(presets, id: \.self) { preset in
                    Button(action: {
                        selectedDuration = preset
                        haptics.playCrownTick()
                    }) {
                        Text(formatPreset(preset))
                            .font(.caption2)
                            .fontWeight(selectedDuration == preset ? .bold : .regular)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(selectedDuration == preset ? Color.yellow : Color.yellow.opacity(0.2))
                            .foregroundColor(selectedDuration == preset ? .black : .yellow)
                            .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                }
            }

            // Bouton Start
            Button(action: startTimer) {
                HStack {
                    Image(systemName: "play.fill")
                    Text("Démarrer")
                }
                .font(.body)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.yellow)
                .foregroundColor(.black)
                .cornerRadius(10)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Timer Logic

    private func startTimer() {
        remainingTime = selectedDuration
        totalDuration = selectedDuration
        isRunning = true
        isPaused = false
        hasPlayedHalfway = false
        hasPlayedTenSeconds = false

        haptics.playWorkoutStarted()

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            tick()
        }
    }

    private func tick() {
        guard isRunning && !isPaused else { return }

        if remainingTime > 0 {
            remainingTime -= 1

            // Haptic à mi-temps
            if !hasPlayedHalfway && remainingTime == totalDuration / 2 && totalDuration >= 30 {
                haptics.playHalfwayHaptic()
                hasPlayedHalfway = true
            }

            // Haptic à 10 secondes
            if !hasPlayedTenSeconds && remainingTime == 10 {
                haptics.playTenSecondsWarning()
                hasPlayedTenSeconds = true
            }

            // Haptic final à 3, 2, 1
            if remainingTime <= 3 && remainingTime > 0 {
                haptics.playCrownTick()
            }
        } else {
            // Timer terminé
            haptics.playRestComplete()
            stopTimer()
        }
    }

    private func togglePause() {
        isPaused.toggle()
        if isPaused {
            haptics.playWorkoutPaused()
        } else {
            haptics.playWorkoutResumed()
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
        isRunning = false
        isPaused = false
        remainingTime = 0
    }

    private func adjustTime(_ seconds: Int) {
        let newTime = remainingTime + seconds
        remainingTime = max(0, min(newTime, 600))
        totalDuration = max(totalDuration, remainingTime)
        haptics.playCrownTick()
    }

    // MARK: - Helpers

    private var progress: Double {
        guard totalDuration > 0 else { return 0 }
        return Double(remainingTime) / Double(totalDuration)
    }

    private var progressColor: Color {
        if remainingTime <= 10 {
            return .red
        } else if remainingTime <= 30 {
            return .orange
        } else {
            return .yellow
        }
    }

    private var timeFormatted: String {
        let minutes = remainingTime / 60
        let seconds = remainingTime % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func formatDuration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        if minutes > 0 {
            return String(format: "%d:%02d", minutes, secs)
        } else {
            return "\(secs)s"
        }
    }

    private func formatPreset(_ seconds: Int) -> String {
        if seconds >= 60 {
            let min = seconds / 60
            let sec = seconds % 60
            return sec > 0 ? "\(min):\(String(format: "%02d", sec))" : "\(min)m"
        }
        return "\(seconds)s"
    }

    // MARK: - Public Methods for External Start

    func startWithDuration(_ duration: Int) {
        selectedDuration = duration
        startTimer()
    }
}

#Preview {
    RestTimerView()
        .environmentObject(WorkoutSessionManager.shared)
}
