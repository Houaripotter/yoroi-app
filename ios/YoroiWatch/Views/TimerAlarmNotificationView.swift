import SwiftUI
import WatchKit
import UserNotifications

// ──────────────────────────────────────────────
// Vue plein écran affichée sur la montre verrouillée
// quand une notification d'alarme YOROI arrive
// ──────────────────────────────────────────────

struct TimerAlarmNotificationView: View {

  @EnvironmentObject var session: WatchSessionManager

  // Pulsation de l'icône
  @State private var pulse = false

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()

      VStack(spacing: 10) {

        // Icône pulsante
        Image(systemName: "timer")
          .font(.system(size: 36, weight: .bold))
          .foregroundColor(session.accentColor)
          .scaleEffect(pulse ? 1.15 : 1.0)
          .animation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true), value: pulse)
          .onAppear { pulse = true }

        Text("Timer terminé !")
          .font(.system(size: 18, weight: .bold))
          .foregroundColor(.white)
          .multilineTextAlignment(.center)

        Text("Reprends ta séance")
          .font(.system(size: 13, weight: .medium))
          .foregroundColor(.gray)
          .multilineTextAlignment(.center)

        // Bouton STOP visible directement depuis la notification
        Button {
          session.stopAlarm()
        } label: {
          Text("Arrêter")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.black)
            .padding(.horizontal, 18)
            .padding(.vertical, 8)
            .background(session.accentColor)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
      }
      .padding()
    }
  }
}

// ──────────────────────────────────────────────
// Contrôleur de notification requis par watchOS
// ──────────────────────────────────────────────

class TimerAlarmNotificationController: WKUserNotificationHostingController<TimerAlarmNotificationView> {
  override var body: TimerAlarmNotificationView {
    TimerAlarmNotificationView()
      .environmentObject(WatchSessionManager.shared)
  }

  override func didReceive(_ notification: UNNotification) {
    // Pas de traitement supplémentaire nécessaire
  }
}
