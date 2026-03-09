import SwiftUI

// ============================================================
// PAGE: COMPÉTITION — Profil combattant, rang, records, forme
// ============================================================

struct CompetitionPage: View {

  @EnvironmentObject var session: WatchSessionManager

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {

        // ── HEADER ──
        HStack(spacing: 4) {
          Image(systemName: "trophy.fill")
            .font(.system(size: 10))
            .foregroundColor(session.accentColor)
          Text("Compétition")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(session.textPrimary.opacity(0.7))
          Spacer()
        }
        .padding(.horizontal, 2)

        // ── RANG & NIVEAU ──
        rankCard

        // ── POIDS & CORPS ──
        bodyCard

        // ── TOP 3 PRs ──
        if !session.benchmarks.isEmpty {
          prSection
        }

        Spacer(minLength: 8)
      }
      .padding(.horizontal, WatchScreen.hPad)
      .padding(.top, 8)
      .padding(.bottom, 12)
    }
  }

  // ── Carte Rang / Niveau / Streak ──
  private var rankCard: some View {
    VStack(spacing: 8) {
      // Niveau + Rang
      HStack(spacing: 0) {
        VStack(spacing: 2) {
          Text("NIV.")
            .font(.system(size: 7, weight: .heavy))
            .foregroundColor(session.accentColor)
            .tracking(1)
          Text("\(session.level)")
            .font(.system(size: WatchScreen.fs(26), weight: .black))
            .foregroundColor(session.textPrimary)
        }
        .frame(maxWidth: .infinity)

        Rectangle()
          .fill(session.dividerColor)
          .frame(width: 1, height: 36)

        VStack(spacing: 2) {
          Text("RANG")
            .font(.system(size: 7, weight: .heavy))
            .foregroundColor(session.accentColor)
            .tracking(1)
          Text(shortRank)
            .font(.system(size: WatchScreen.fs(11), weight: .black))
            .foregroundColor(session.textPrimary)
            .lineLimit(2)
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)

        Rectangle()
          .fill(session.dividerColor)
          .frame(width: 1, height: 36)

        VStack(spacing: 2) {
          Image(systemName: "flame.fill")
            .font(.system(size: 10))
            .foregroundColor(.orange)
          Text("\(session.streak)")
            .font(.system(size: WatchScreen.fs(26), weight: .black))
            .foregroundColor(session.textPrimary)
          Text("jours")
            .font(.system(size: 7))
            .foregroundColor(session.textSecondary)
        }
        .frame(maxWidth: .infinity)
      }
    }
    .padding(.vertical, 10)
    .padding(.horizontal, 6)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(
      RoundedRectangle(cornerRadius: 12)
        .stroke(session.accentColor.opacity(0.2), lineWidth: 1)
    )
  }

  // ── Carte Corps (Poids + composition) ──
  private var bodyCard: some View {
    HStack(spacing: 0) {
      bodyPill(
        icon: "scalemass.fill",
        value: session.currentWeight > 0 ? String(format: "%.1f", session.currentWeight) : "--",
        unit: "kg",
        color: session.accentColor
      )

      Divider()
        .frame(height: 28)
        .background(session.dividerColor)

      bodyPill(
        icon: "chart.bar.fill",
        value: session.bmi > 0 ? String(format: "%.1f", session.bmi) : "--",
        unit: "IMC",
        color: bmiColor
      )

      Divider()
        .frame(height: 28)
        .background(session.dividerColor)

      bodyPill(
        icon: "figure.arms.open",
        value: session.bodyFat > 0 ? String(format: "%.0f%%", session.bodyFat) : "--",
        unit: "Gras",
        color: .orange
      )
    }
    .padding(.vertical, 10)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }

  private func bodyPill(icon: String, value: String, unit: String, color: Color) -> some View {
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

  // ── Top 3 PRs ──
  private var prSection: some View {
    VStack(spacing: 6) {
      HStack {
        Text("MES RECORDS")
          .font(.system(size: 9, weight: .bold))
          .foregroundColor(session.accentColor)
          .tracking(1)
        Spacer()
      }

      ForEach(topBenchmarks) { record in
        HStack(spacing: 10) {
          Image(systemName: record.icon)
            .font(.system(size: 12))
            .foregroundColor(categoryColor(record.category))
            .frame(width: 20)

          Text(record.name)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(session.textPrimary)
            .lineLimit(1)

          Spacer()

          VStack(alignment: .trailing, spacing: 0) {
            Text(record.formattedPR)
              .font(.system(size: 13, weight: .black))
              .foregroundColor(session.textPrimary)
            Text("PR")
              .font(.system(size: 7, weight: .heavy))
              .foregroundColor(session.accentColor)
          }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(session.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
      }
    }
  }

  // ── Helpers ──
  private var topBenchmarks: [BenchmarkRecord] {
    Array(session.benchmarks.prefix(3))
  }

  private var shortRank: String {
    guard !session.rank.isEmpty else { return "—" }
    // Raccourcir le rang s'il est trop long
    let words = session.rank.split(separator: " ")
    if words.count > 2 { return words.prefix(2).joined(separator: "\n") }
    return session.rank
  }

  private var bmiColor: Color {
    guard session.bmi > 0 else { return session.textSecondary }
    switch session.bmi {
    case ..<18.5: return .blue
    case 18.5..<25: return .green
    case 25..<30: return .orange
    default: return .red
    }
  }

  private func categoryColor(_ cat: String) -> Color {
    switch cat.lowercased() {
    case "force":              return .orange
    case "endurance":          return .red
    case "speed", "vitesse":   return .yellow
    case "power", "puissance": return .purple
    default:                   return session.accentColor
    }
  }
}
