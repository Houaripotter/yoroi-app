import SwiftUI
import WatchKit

// ============================================================
// PAGE 5: REGLAGES
// ============================================================

struct SettingsPage: View {
  @EnvironmentObject var session: WatchSessionManager
  @AppStorage("defaultTimerSeconds") private var defaultTimerSeconds: Int = 90
  @AppStorage("hapticEnabled") private var hapticEnabled: Bool = true
  @AppStorage("unitSystem") private var unitSystem: String = "kg" // kg or lbs

  @State private var showTimerPicker = false
  @State private var showStepsPicker = false
  @State private var showHydrationPicker = false

  // Timer presets for picker
  private let timerOptions: [(Int, String)] = [
    (30, "30s"), (45, "45s"), (60, "1:00"), (90, "1:30"),
    (120, "2:00"), (150, "2:30"), (180, "3:00"), (240, "4:00"), (300, "5:00")
  ]

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {

        // ── HEADER ──
        HStack(spacing: 6) {
          Image(systemName: "gearshape.fill")
            .font(.system(size: 12))
            .foregroundColor(goldColor)
          Text("Reglages")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.white)
          Spacer()
        }
        .padding(.horizontal, 4)

        // ── CONNEXION ──
        VStack(spacing: 4) {
          sectionLabel("CONNEXION", icon: "antenna.radiowaves.left.and.right", color: .green)

          HStack {
            Circle()
              .fill(session.isConnected ? Color.green : Color.red)
              .frame(width: 8, height: 8)
            Text(session.isConnected ? "Connecte" : "Deconnecte")
              .font(.system(size: 11, weight: .semibold))
              .foregroundColor(session.isConnected ? .green : .red)
            Spacer()
            if let lastSync = session.lastSyncDate {
              Text(timeAgo(lastSync))
                .font(.system(size: 8))
                .foregroundColor(.gray)
            }
          }
          .padding(.horizontal, 6)

          Button(action: {
            session.requestSync()
            if hapticEnabled { WKInterfaceDevice.current().play(.click) }
          }) {
            HStack(spacing: 4) {
              Image(systemName: "arrow.triangle.2.circlepath")
                .font(.system(size: 10))
              Text("Synchroniser")
                .font(.system(size: 10, weight: .bold))
            }
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(goldColor)
            .cornerRadius(8)
          }
          .buttonStyle(.plain)
        }

        // ── MINUTEUR ──
        VStack(spacing: 4) {
          sectionLabel("MINUTEUR", icon: "timer", color: goldColor)

          Button(action: { showTimerPicker = true }) {
            HStack {
              Text("Duree par defaut")
                .font(.system(size: 10))
                .foregroundColor(.gray)
              Spacer()
              Text(formatTime(defaultTimerSeconds))
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(goldColor)
              Image(systemName: "chevron.right")
                .font(.system(size: 8))
                .foregroundColor(.gray.opacity(0.5))
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.05))
            .cornerRadius(8)
          }
          .buttonStyle(.plain)
        }

        // ── OBJECTIFS ──
        VStack(spacing: 4) {
          sectionLabel("OBJECTIFS", icon: "target", color: .green)

          // Steps goal
          HStack {
            Image(systemName: "figure.walk")
              .font(.system(size: 10))
              .foregroundColor(.green)
            Text("Pas / jour")
              .font(.system(size: 10))
              .foregroundColor(.gray)
            Spacer()
            Button(action: {
              session.stepsGoal = max(1000, session.stepsGoal - 1000)
            }) {
              Image(systemName: "minus.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.red)
            }.buttonStyle(.plain)
            Text("\(session.stepsGoal)")
              .font(.system(size: 12, weight: .bold))
              .foregroundColor(.white)
              .frame(width: 44)
            Button(action: {
              session.stepsGoal = min(30000, session.stepsGoal + 1000)
            }) {
              Image(systemName: "plus.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.green)
            }.buttonStyle(.plain)
          }
          .padding(.horizontal, 6)
          .padding(.vertical, 4)

          // Hydration goal
          HStack {
            Image(systemName: "drop.fill")
              .font(.system(size: 10))
              .foregroundColor(.cyan)
            Text("Eau / jour")
              .font(.system(size: 10))
              .foregroundColor(.gray)
            Spacer()
            Button(action: {
              session.hydrationGoal = max(500, session.hydrationGoal - 250)
            }) {
              Image(systemName: "minus.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.red)
            }.buttonStyle(.plain)
            Text("\(session.hydrationGoal)ml")
              .font(.system(size: 11, weight: .bold))
              .foregroundColor(.white)
              .frame(width: 52)
            Button(action: {
              session.hydrationGoal = min(6000, session.hydrationGoal + 250)
            }) {
              Image(systemName: "plus.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.green)
            }.buttonStyle(.plain)
          }
          .padding(.horizontal, 6)
          .padding(.vertical, 4)
        }

        // ── PREFERENCES ──
        VStack(spacing: 4) {
          sectionLabel("PREFERENCES", icon: "slider.horizontal.3", color: .purple)

          // Unit system
          HStack {
            Text("Unites")
              .font(.system(size: 10))
              .foregroundColor(.gray)
            Spacer()
            HStack(spacing: 4) {
              unitButton("kg", isSelected: unitSystem == "kg")
              unitButton("lbs", isSelected: unitSystem == "lbs")
            }
          }
          .padding(.horizontal, 6)
          .padding(.vertical, 4)

          // Haptic
          HStack {
            Text("Vibrations")
              .font(.system(size: 10))
              .foregroundColor(.gray)
            Spacer()
            Button(action: {
              hapticEnabled.toggle()
              if hapticEnabled { WKInterfaceDevice.current().play(.click) }
            }) {
              Image(systemName: hapticEnabled ? "iphone.radiowaves.left.and.right" : "iphone.slash")
                .font(.system(size: 12))
                .foregroundColor(hapticEnabled ? .green : .gray)
                .frame(width: 28, height: 28)
                .background(hapticEnabled ? Color.green.opacity(0.15) : Color.white.opacity(0.05))
                .cornerRadius(7)
            }
            .buttonStyle(.plain)
          }
          .padding(.horizontal, 6)
          .padding(.vertical, 4)
        }

        // ── A PROPOS ──
        VStack(spacing: 4) {
          sectionLabel("A PROPOS", icon: "info.circle.fill", color: .gray)

          VStack(spacing: 2) {
            infoRow("App", value: "Yoroi Watch")
            infoRow("Version", value: "2.0.0")
            infoRow("Exercices", value: "\(ExerciseTemplate.library.count)")
          }
          .padding(.horizontal, 6)
          .padding(.vertical, 4)
          .background(Color.white.opacity(0.03))
          .cornerRadius(8)
        }

        // Spacer at bottom
        Spacer().frame(height: 20)
      }
      .padding(.horizontal, 2)
    }
    .sheet(isPresented: $showTimerPicker) {
      timerPickerSheet
    }
  }

  // MARK: - Timer Picker Sheet
  private var timerPickerSheet: some View {
    ScrollView {
      VStack(spacing: 6) {
        Text("DUREE PAR DEFAUT")
          .font(.system(size: 8, weight: .heavy))
          .foregroundColor(goldColor)
          .tracking(1)

        ForEach(timerOptions, id: \.0) { (seconds, label) in
          Button(action: {
            defaultTimerSeconds = seconds
            session.setTimer(seconds: seconds)
            showTimerPicker = false
            if hapticEnabled { WKInterfaceDevice.current().play(.click) }
          }) {
            HStack {
              Text(label)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(seconds == defaultTimerSeconds ? .black : .white)
              Spacer()
              if seconds == defaultTimerSeconds {
                Image(systemName: "checkmark")
                  .font(.system(size: 10, weight: .bold))
                  .foregroundColor(.black)
              }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(seconds == defaultTimerSeconds ? goldColor : Color.white.opacity(0.06))
            .cornerRadius(8)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 4)
    }
  }

  // MARK: - Helpers

  private func sectionLabel(_ text: String, icon: String, color: Color) -> some View {
    HStack(spacing: 4) {
      Image(systemName: icon)
        .font(.system(size: 8))
        .foregroundColor(color)
      Text(text)
        .font(.system(size: 7, weight: .heavy))
        .foregroundColor(.gray)
        .tracking(1)
      Spacer()
    }
    .padding(.horizontal, 4)
  }

  private func unitButton(_ unit: String, isSelected: Bool) -> some View {
    Button(action: { unitSystem = unit }) {
      Text(unit.uppercased())
        .font(.system(size: 9, weight: .bold))
        .foregroundColor(isSelected ? .black : .white)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(isSelected ? goldColor : Color.white.opacity(0.08))
        .cornerRadius(6)
    }
    .buttonStyle(.plain)
  }

  private func infoRow(_ label: String, value: String) -> some View {
    HStack {
      Text(label)
        .font(.system(size: 9))
        .foregroundColor(.gray)
      Spacer()
      Text(value)
        .font(.system(size: 9, weight: .bold))
        .foregroundColor(.white)
    }
    .padding(.vertical, 1)
  }

  private func formatTime(_ seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
    if s == 0 { return "\(m) min" }
    return "\(m):\(String(format: "%02d", s))"
  }

  private func timeAgo(_ date: Date) -> String {
    let diff = Date().timeIntervalSince(date)
    if diff < 60 { return "a l'instant" }
    if diff < 3600 { return "il y a \(Int(diff / 60))min" }
    return "il y a \(Int(diff / 3600))h"
  }

  private var goldColor: Color {
    Color(red: 0.831, green: 0.686, blue: 0.216)
  }
}
