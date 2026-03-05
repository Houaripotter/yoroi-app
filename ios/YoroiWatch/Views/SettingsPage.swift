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
            .foregroundColor(session.textPrimary)
          Spacer()
        }
        .padding(.horizontal, 4)

        // ── APPARENCE ──
        VStack(spacing: 4) {
          sectionLabel("APPARENCE", icon: "paintbrush.fill", color: goldColor)

          HStack {
            Image(systemName: session.isDarkMode ? "moon.fill" : "sun.max.fill")
              .font(.system(size: 10))
              .foregroundColor(session.isDarkMode ? .purple : .orange)
            Text("Theme")
              .font(.system(size: 10))
              .foregroundColor(session.textSecondary)
            Spacer()
            HStack(spacing: 4) {
              modeButton("Clair", icon: "sun.max.fill", isSelected: !session.isDarkMode, iconColor: .orange)
              modeButton("Sombre", icon: "moon.fill", isSelected: session.isDarkMode, iconColor: .purple)
            }
          }
          .padding(.horizontal, 6)
          .padding(.vertical, 4)
        }

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
                .foregroundColor(session.textSecondary)
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
            .foregroundColor(session.textOnAccent)
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
                .foregroundColor(session.textSecondary)
              Spacer()
              Text(formatTime(defaultTimerSeconds))
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(goldColor)
              Image(systemName: "chevron.right")
                .font(.system(size: 8))
                .foregroundColor(session.textSecondary.opacity(0.5))
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 6)
            .background(session.cardBg)
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
              .foregroundColor(session.textSecondary)
            Spacer()
            Button(action: {
              session.updateStepsGoal(max(1000, session.stepsGoal - 1000))
              if hapticEnabled { WKInterfaceDevice.current().play(.click) }
            }) {
              Image(systemName: "minus.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.red)
            }.buttonStyle(.plain)
            Text("\(session.stepsGoal)")
              .font(.system(size: 12, weight: .bold))
              .foregroundColor(session.textPrimary)
              .frame(width: 44)
            Button(action: {
              session.updateStepsGoal(min(30000, session.stepsGoal + 1000))
              if hapticEnabled { WKInterfaceDevice.current().play(.click) }
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
              .foregroundColor(session.textSecondary)
            Spacer()
            Button(action: {
              session.updateHydrationGoal(max(500, session.hydrationGoal - 250))
              if hapticEnabled { WKInterfaceDevice.current().play(.click) }
            }) {
              Image(systemName: "minus.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.red)
            }.buttonStyle(.plain)
            Text("\(session.hydrationGoal)ml")
              .font(.system(size: 11, weight: .bold))
              .foregroundColor(session.textPrimary)
              .frame(width: 52)
            Button(action: {
              session.updateHydrationGoal(min(6000, session.hydrationGoal + 250))
              if hapticEnabled { WKInterfaceDevice.current().play(.click) }
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
              .foregroundColor(session.textSecondary)
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
              .foregroundColor(session.textSecondary)
            Spacer()
            Button(action: {
              hapticEnabled.toggle()
              if hapticEnabled { WKInterfaceDevice.current().play(.click) }
            }) {
              Image(systemName: hapticEnabled ? "iphone.radiowaves.left.and.right" : "iphone.slash")
                .font(.system(size: 12))
                .foregroundColor(hapticEnabled ? .green : session.textSecondary)
                .frame(width: 28, height: 28)
                .background(hapticEnabled ? Color.green.opacity(0.15) : session.cardBg)
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
          .background(session.cardBg)
          .cornerRadius(8)
        }

        // Spacer at bottom
        Spacer().frame(height: 20)
      }
      .padding(.horizontal, 2)
    }
    .refreshable { session.requestSync() }
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
            session.changeTimerPreset(seconds)
            showTimerPicker = false
            if hapticEnabled { WKInterfaceDevice.current().play(.click) }
          }) {
            HStack {
              Text(label)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(seconds == defaultTimerSeconds ? session.textOnAccent : session.textPrimary)
              Spacer()
              if seconds == defaultTimerSeconds {
                Image(systemName: "checkmark")
                  .font(.system(size: 10, weight: .bold))
                  .foregroundColor(session.textOnAccent)
              }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(seconds == defaultTimerSeconds ? goldColor : session.cardBg)
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
        .foregroundColor(session.textSecondary)
        .tracking(1)
      Spacer()
    }
    .padding(.horizontal, 4)
  }

  private func modeButton(_ label: String, icon: String, isSelected: Bool, iconColor: Color) -> some View {
    Button(action: {
      let mode = label == "Clair" ? "light" : "dark"
      session.changeThemeMode(mode)
      if hapticEnabled { WKInterfaceDevice.current().play(.click) }
    }) {
      HStack(spacing: 3) {
        Image(systemName: icon)
          .font(.system(size: 8))
          .foregroundColor(isSelected ? iconColor : session.textSecondary)
        Text(label)
          .font(.system(size: 8, weight: .bold))
          .foregroundColor(isSelected ? session.textOnAccent : session.textPrimary)
      }
      .padding(.horizontal, 8)
      .padding(.vertical, 5)
      .background(isSelected ? goldColor : session.cardBg)
      .cornerRadius(6)
    }
    .buttonStyle(.plain)
  }

  private func unitButton(_ unit: String, isSelected: Bool) -> some View {
    Button(action: {
      unitSystem = unit
      session.changeUnitSystem(unit)
      if hapticEnabled { WKInterfaceDevice.current().play(.click) }
    }) {
      Text(unit.uppercased())
        .font(.system(size: 9, weight: .bold))
        .foregroundColor(isSelected ? session.textOnAccent : session.textPrimary)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(isSelected ? goldColor : session.cardBg)
        .cornerRadius(6)
    }
    .buttonStyle(.plain)
  }

  private func infoRow(_ label: String, value: String) -> some View {
    HStack {
      Text(label)
        .font(.system(size: 9))
        .foregroundColor(session.textSecondary)
      Spacer()
      Text(value)
        .font(.system(size: 9, weight: .bold))
        .foregroundColor(session.textPrimary)
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
    session.accentColor
  }
}
