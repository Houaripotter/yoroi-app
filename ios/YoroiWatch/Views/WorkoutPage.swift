import SwiftUI

// ============================================================
// PAGE: SÉANCES — Historique des entraînements + stats du jour
// ============================================================

struct WorkoutPage: View {

  @EnvironmentObject var session: WatchSessionManager

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {

        // ── HEADER ──
        HStack(spacing: 4) {
          Image(systemName: "figure.strengthtraining.traditional")
            .font(.system(size: 10))
            .foregroundColor(session.accentColor)
          Text("Séances")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(session.textPrimary.opacity(0.7))
          Spacer()
          if !session.recentWorkouts.isEmpty {
            Text("\(session.recentWorkouts.count) séances")
              .font(.system(size: 7, weight: .heavy))
              .foregroundColor(session.accentColor)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(session.accentColor.opacity(0.15))
              .cornerRadius(4)
          }
        }
        .padding(.horizontal, 2)

        // ── STATS DU JOUR ──
        todayStatsCard

        // ── LISTE DES SÉANCES RÉCENTES ──
        if session.recentWorkouts.isEmpty {
          emptyState
        } else {
          VStack(spacing: 6) {
            ForEach(session.recentWorkouts) { workout in
              WorkoutRow(workout: workout)
            }
          }
        }

        Spacer(minLength: 8)
      }
      .padding(.horizontal, WatchScreen.hPad)
      .padding(.top, 8)
      .padding(.bottom, 12)
    }
  }

  // ── Stats du jour (calories + minutes + FC) ──
  private var todayStatsCard: some View {
    HStack(spacing: 0) {
      statPill(
        icon: "flame.fill",
        value: session.activeCalories > 0 ? "\(session.activeCalories)" : "--",
        unit: "kcal",
        color: .orange
      )
      Divider()
        .frame(height: 28)
        .background(session.dividerColor)
      statPill(
        icon: "clock.fill",
        value: session.exerciseMinutes > 0 ? "\(session.exerciseMinutes)" : "--",
        unit: "min",
        color: .green
      )
      Divider()
        .frame(height: 28)
        .background(session.dividerColor)
      statPill(
        icon: "heart.fill",
        value: session.localHeartRate > 0 ? "\(session.localHeartRate)" : (session.heartRate > 0 ? "\(session.heartRate)" : "--"),
        unit: "bpm",
        color: .red
      )
    }
    .padding(.vertical, 10)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }

  private func statPill(icon: String, value: String, unit: String, color: Color) -> some View {
    VStack(spacing: 2) {
      Image(systemName: icon)
        .font(.system(size: WatchScreen.fs(9)))
        .foregroundColor(color)
      Text(value)
        .font(.system(size: WatchScreen.fs(14), weight: .black))
        .foregroundColor(session.textPrimary)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
      Text(unit)
        .font(.system(size: WatchScreen.fs(7)))
        .foregroundColor(session.textSecondary)
    }
    .frame(maxWidth: .infinity)
  }

  // ── Empty state ──
  private var emptyState: some View {
    VStack(spacing: 8) {
      Image(systemName: "figure.run.circle")
        .font(.system(size: 28))
        .foregroundColor(session.accentColor.opacity(0.35))
      Text("Aucune séance")
        .font(.system(size: 12, weight: .semibold))
        .foregroundColor(session.textSecondary)
      Text("Lance ton premier\nentraînement sur iPhone")
        .font(.system(size: 10))
        .foregroundColor(session.textSecondary.opacity(0.6))
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 20)
  }
}

// ── Ligne d'une séance ──
struct WorkoutRow: View {
  @EnvironmentObject var session: WatchSessionManager
  let workout: WorkoutEntry

  var body: some View {
    HStack(spacing: 10) {
      // Icone sport
      ZStack {
        Circle()
          .fill(iconColor.opacity(0.15))
          .frame(width: 30, height: 30)
        Image(systemName: workout.icon)
          .font(.system(size: 13))
          .foregroundColor(iconColor)
      }

      // Type + date
      VStack(alignment: .leading, spacing: 2) {
        Text(workout.type)
          .font(.system(size: 11, weight: .bold))
          .foregroundColor(session.textPrimary)
          .lineLimit(1)
        Text(workout.date)
          .font(.system(size: 9))
          .foregroundColor(session.textSecondary)
          .lineLimit(1)
      }

      Spacer()

      // Stats
      VStack(alignment: .trailing, spacing: 2) {
        Text(workout.formattedDuration)
          .font(.system(size: 12, weight: .black))
          .foregroundColor(session.accentColor)
        if workout.calories > 0 {
          Text("\(workout.calories) kcal")
            .font(.system(size: 9))
            .foregroundColor(session.textSecondary)
        }
      }
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 9)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 10))
    .overlay(
      RoundedRectangle(cornerRadius: 10)
        .stroke(iconColor.opacity(0.15), lineWidth: 1)
    )
  }

  private var iconColor: Color {
    switch workout.type.lowercased() {
    case "combat", "boxe", "mma", "jjb", "judo", "karate", "lutte", "grappling":
      return session.accentColor
    case "muscu", "musculation", "force":
      return .orange
    case "cardio", "running", "course":
      return .green
    case "yoga", "stretching":
      return .purple
    default:
      return .blue
    }
  }
}
