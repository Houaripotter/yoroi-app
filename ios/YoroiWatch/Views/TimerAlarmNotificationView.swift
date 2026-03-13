import SwiftUI
import WatchKit
import UserNotifications

// ──────────────────────────────────────────────
// Vue plein écran affichée sur la montre quand le timer sonne
// ──────────────────────────────────────────────

struct TimerAlarmNotificationView: View {

  @ObservedObject var session: WatchSessionManager = .shared

  @State private var flash = false      // fond rouge ↔ noir alterné
  @State private var iconScale: CGFloat = 1.0
  @State private var textOpacity: Double = 1.0

  var body: some View {
    ZStack {
      // Fond clignotant rouge ↔ noir
      (flash ? Color(red: 0.85, green: 0.06, blue: 0.06) : Color.black)
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 0.25), value: flash)

      VStack(spacing: 8) {

        // Icône timer pulsante
        ZStack {
          Circle()
            .fill(Color.white.opacity(flash ? 0.25 : 0.08))
            .frame(width: 60, height: 60)
          Image(systemName: "timer")
            .font(.system(size: 30, weight: .black))
            .foregroundColor(.white)
        }
        .scaleEffect(iconScale)

        // Texte principal
        Text("TIMER")
          .font(.system(size: 22, weight: .black))
          .foregroundColor(.white)
          .tracking(3)
          .opacity(textOpacity)

        Text("TERMINÉ !")
          .font(.system(size: 16, weight: .heavy))
          .foregroundColor(flash ? .white : Color(red: 1, green: 0.4, blue: 0.4))
          .tracking(1)

        // Bouton STOP
        Button {
          session.stopAlarm()
        } label: {
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
      startFlashing()
      startIconPulse()
    }
  }

  private func startFlashing() {
    // Clignotement fond rouge toutes les 0.4s
    withAnimation(Animation.easeInOut(duration: 0.4).repeatForever(autoreverses: true)) {
      flash = true
    }
    // Opacité du texte clignote aussi
    withAnimation(Animation.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
      textOpacity = 0.5
    }
  }

  private func startIconPulse() {
    withAnimation(Animation.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
      iconScale = 1.25
    }
  }
}

// ──────────────────────────────────────────────
// Contrôleur de notification requis par watchOS
// ──────────────────────────────────────────────

class TimerAlarmNotificationController: WKUserNotificationHostingController<TimerAlarmNotificationView> {
  override var body: TimerAlarmNotificationView {
    TimerAlarmNotificationView()
  }

  override func didReceive(_ notification: UNNotification) {
    // Marquer l'alarme comme active (même si l'app n'était pas en foreground)
    let session = WatchSessionManager.shared
    session.timerAlarmRinging = true

    // Haptics immédiats à la réception
    WKInterfaceDevice.current().play(.notification)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
      WKInterfaceDevice.current().play(.notification)
    }

    // Son wizz en boucle
    session.startAlarmAudio()
  }
}
