import SwiftUI

// ============================================================
// PAGE SPARRING · Stats de la semaine en cours
// Rounds, Win rate, V/D, progression vers objectif hebdo
// ============================================================

struct SparringPage: View {

  @EnvironmentObject var session: WatchSessionManager

  private let redColor = Color(red: 0.937, green: 0.267, blue: 0.267)
  private let orangeColor = Color(red: 0.976, green: 0.451, blue: 0.086)
  private let greenColor = Color(red: 0.063, green: 0.725, blue: 0.506)
  private let purpleColor = Color(red: 0.545, green: 0.361, blue: 0.965)

  private var progress: Double {
    guard session.sparringRoundsGoal > 0 else { return 0 }
    return min(1.0, Double(session.sparringRoundsWeek) / Double(session.sparringRoundsGoal))
  }

  private var winRate: Int {
    let total = session.sparringWinsWeek + session.sparringLossesWeek
    guard total > 0 else { return 0 }
    return Int(round(Double(session.sparringWinsWeek) / Double(total) * 100))
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        // Header titre
        HStack(spacing: 4) {
          Image(systemName: "figure.martial.arts")
            .foregroundColor(redColor)
            .font(.system(size: 14, weight: .bold))
          Text("SPARRING")
            .font(.system(size: 11, weight: .heavy))
            .tracking(1.5)
            .foregroundColor(session.textPrimary)
        }
        .padding(.top, 4)

        // Rond progression + rounds
        ZStack {
          Circle()
            .stroke(Color.white.opacity(0.1), lineWidth: 10)
            .frame(width: 110, height: 110)

          Circle()
            .trim(from: 0, to: progress)
            .stroke(
              LinearGradient(colors: [redColor, orangeColor], startPoint: .topLeading, endPoint: .bottomTrailing),
              style: StrokeStyle(lineWidth: 10, lineCap: .round)
            )
            .frame(width: 110, height: 110)
            .rotationEffect(.degrees(-90))
            .animation(.easeInOut(duration: 0.6), value: progress)

          VStack(spacing: 0) {
            Text("\(session.sparringRoundsWeek)")
              .font(.system(size: 32, weight: .heavy, design: .rounded))
              .foregroundColor(session.textPrimary)
            Text("/ \(session.sparringRoundsGoal) rounds")
              .font(.system(size: 9, weight: .semibold))
              .foregroundColor(session.textSecondary)
          }
        }
        .padding(.vertical, 4)

        // Winrate + V/D
        if session.sparringWinsWeek + session.sparringLossesWeek > 0 {
          HStack(spacing: 6) {
            // Winrate %
            VStack(spacing: 2) {
              Text("\(winRate)%")
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .foregroundColor(purpleColor)
              Text("WINRATE")
                .font(.system(size: 8, weight: .bold))
                .tracking(0.8)
                .foregroundColor(session.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(purpleColor.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Victoires
            VStack(spacing: 2) {
              Text("\(session.sparringWinsWeek)")
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .foregroundColor(greenColor)
              Text("VICTOIRES")
                .font(.system(size: 8, weight: .bold))
                .tracking(0.8)
                .foregroundColor(session.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(greenColor.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Défaites
            VStack(spacing: 2) {
              Text("\(session.sparringLossesWeek)")
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .foregroundColor(redColor)
              Text("DÉFAITES")
                .font(.system(size: 8, weight: .bold))
                .tracking(0.8)
                .foregroundColor(session.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(redColor.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 10))
          }
        }

        // Message contextuel
        Text(motivationalMessage)
          .font(.system(size: 11, weight: .medium))
          .foregroundColor(session.textSecondary)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 8)
          .padding(.top, 4)

        // Bouton "Nouvelle séance"
        NavigationLink(destination: WorkoutPage()) {
          HStack(spacing: 6) {
            Image(systemName: "plus.circle.fill")
              .font(.system(size: 14, weight: .bold))
            Text("Nouvelle séance")
              .font(.system(size: 12, weight: .bold))
          }
          .foregroundColor(.white)
          .padding(.horizontal, 14)
          .padding(.vertical, 8)
          .background(
            LinearGradient(colors: [redColor, orangeColor], startPoint: .leading, endPoint: .trailing)
          )
          .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .padding(.top, 2)
      }
      .padding(.horizontal, 4)
      .padding(.bottom, 6)
    }
    .refreshable {
      session.requestSync()
      try? await Task.sleep(nanoseconds: 1_000_000_000)
    }
  }

  private var motivationalMessage: String {
    if session.sparringRoundsWeek == 0 {
      return "Commence ta semaine sur le tatami 🥋"
    }
    if progress >= 1.0 {
      return "✓ Objectif hebdo atteint, beau boulot !"
    }
    let remaining = session.sparringRoundsGoal - session.sparringRoundsWeek
    if remaining <= 5 {
      return "Plus que \(remaining) rounds et c'est ok"
    }
    if winRate >= 70 {
      return "🔥 Tu domines cette semaine"
    }
    if winRate >= 40 {
      return "Belle bagarre, continue comme ça"
    }
    return "Une défaite, c'est une leçon. Keep going."
  }
}
