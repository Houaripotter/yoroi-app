// ============================================
// YOROI WATCH - Timer de repos
// Design jaune comme sur le screenshot
// ============================================

import SwiftUI
import WatchKit

struct TimerView: View {
    @State private var selectedDuration: Int = 90 // secondes
    @State private var remainingTime: Int = 90
    @State private var isRunning = false
    @State private var timer: Timer?

    // NOUVEAU: Détection mode économie d'énergie
    @State private var isLowPowerMode: Bool = ProcessInfo.processInfo.isLowPowerModeEnabled

    let durations = [30, 60, 90, 120, 180] // 30s, 1m, 1:30, 2m, 3m

    var body: some View {
        VStack(spacing: 10) {
            // Titre REPOS
            HStack(spacing: 6) {
                Image(systemName: "timer")
                    .foregroundColor(.yellow)
                Text("REPOS")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.yellow)
            }
            .padding(.top, 8)

            Spacer()

            // Temps affiché
            Text(formatTime(remainingTime))
                .font(.system(size: 52, weight: .bold, design: .rounded))
                .foregroundColor(.yellow)
                .monospacedDigit()

            Spacer()

            // Sélecteur de durée
            HStack(spacing: 4) {
                ForEach(durations, id: \.self) { duration in
                    DurationButton(
                        duration: duration,
                        isSelected: selectedDuration == duration,
                        action: {
                            if !isRunning {
                                selectedDuration = duration
                                remainingTime = duration
                            }
                        }
                    )
                }
            }
            .padding(.horizontal, 4)

            // Bouton GO/STOP
            Button(action: toggleTimer) {
                HStack(spacing: 8) {
                    Image(systemName: isRunning ? "stop.fill" : "play.fill")
                        .font(.system(size: 18))
                    Text(isRunning ? "STOP" : "GO")
                        .font(.system(size: 18, weight: .bold))
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.yellow)
                .cornerRadius(16)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .background(Color.black)
        // CORRECTION MEMORY LEAK: Arrêter le timer quand la vue disparaît
        .onDisappear {
            stopTimer()
        }
        // Observer le mode économie d'énergie
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name.NSProcessInfoPowerStateDidChange)) { _ in
            isLowPowerMode = ProcessInfo.processInfo.isLowPowerModeEnabled

            // Si mode économie activé, arrêter le timer
            if isLowPowerMode && isRunning {
                stopTimer()
            }
        }
    }

    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }

    private func toggleTimer() {
        if isRunning {
            stopTimer()
        } else {
            startTimer()
        }
    }

    private func startTimer() {
        isRunning = true

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if remainingTime > 0 {
                remainingTime -= 1
            } else {
                stopTimer()
            }
        }
    }

    private func stopTimer() {
        isRunning = false
        timer?.invalidate()
        timer = nil
        remainingTime = selectedDuration
    }
}

struct DurationButton: View {
    let duration: Int
    let isSelected: Bool
    let action: () -> Void

    var label: String {
        if duration < 60 {
            return "\(duration)\ns"
        } else if duration == 60 {
            return "1\nm"
        } else if duration == 90 {
            return "1:30"
        } else if duration == 120 {
            return "2\nm"
        } else {
            return "3m"
        }
    }

    var body: some View {
        Button(action: action) {
            Text(label)
                // CORRECTION: Augmenté de 11pt à 14pt pour meilleure lisibilité
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(isSelected ? .black : .gray)
                .multilineTextAlignment(.center)
                // CORRECTION: Augmenté de 36x36 à 44x44 (minimum recommandé)
                .frame(width: 44, height: 44)
                .background(isSelected ? Color.yellow : Color.gray.opacity(0.2))
                .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    TimerView()
}
