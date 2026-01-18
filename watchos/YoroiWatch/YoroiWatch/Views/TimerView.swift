// ============================================
// YOROI WATCH - Timer d'entraînement
// ============================================

import SwiftUI

struct TimerView: View {
    @State private var isRunning = false
    @State private var elapsedTime: TimeInterval = 0
    @State private var timer: Timer?

    var body: some View {
        VStack(spacing: 16) {
            // Temps écoulé
            Text(timeString(from: elapsedTime))
                .font(.system(size: 36, weight: .bold, design: .monospaced))
                .foregroundColor(.white)

            // Boutons
            HStack(spacing: 20) {
                // Reset
                Button(action: resetTimer) {
                    Image(systemName: "arrow.counterclockwise")
                        .font(.system(size: 20))
                        .foregroundColor(.gray)
                }
                .buttonStyle(.plain)

                // Play/Pause
                Button(action: toggleTimer) {
                    Image(systemName: isRunning ? "pause.fill" : "play.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.yellow)
                }
                .buttonStyle(.plain)

                // Stop et sauvegarder
                Button(action: stopAndSave) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.green)
                }
                .buttonStyle(.plain)
            }

            // Sport actuel
            Text("JJB")
                .font(.system(size: 12))
                .foregroundColor(.gray)
                .padding(.top, 8)
        }
        .padding()
    }

    private func timeString(from interval: TimeInterval) -> String {
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    private func toggleTimer() {
        if isRunning {
            timer?.invalidate()
        } else {
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
                elapsedTime += 1
            }
        }
        isRunning.toggle()
    }

    private func resetTimer() {
        timer?.invalidate()
        isRunning = false
        elapsedTime = 0
    }

    private func stopAndSave() {
        timer?.invalidate()
        isRunning = false
        // TODO: Sauvegarder la séance
    }
}

#Preview {
    TimerView()
}
