// ============================================
// YOROI WATCH - CARNET D'ENTRAÎNEMENT
// ============================================
// Page 6 du TabView
// • Bibliothèque des records personnels (PR)
// • Derniers entraînements
// • Données synchronisées depuis l'iPhone
// ============================================

import SwiftUI

struct CarnetPage: View {

  @EnvironmentObject var session: WatchSessionManager

  // Filtre par catégorie
  @State private var selectedFilter: String = "Tous"
  private let filters = ["Tous", "Force", "Endurance", "Vitesse", "Puissance"]

  var filteredBenchmarks: [BenchmarkRecord] {
    if selectedFilter == "Tous" { return session.benchmarks }
    return session.benchmarks.filter {
      $0.category.lowercased() == selectedFilter.lowercased() ||
      ($0.category.lowercased() == "speed" && selectedFilter == "Vitesse") ||
      ($0.category.lowercased() == "power" && selectedFilter == "Puissance")
    }
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {

        // ── En-tête ──────────────────────────────
        headerView

        // ── Derniers entraînements ───────────────
        if !session.recentWorkouts.isEmpty {
          sectionTitle("Derniers entraînements")
          recentWorkoutsSection
        }

        // ── Records personnels ───────────────────
        sectionTitle("Records personnels")

        if session.benchmarks.isEmpty {
          emptyStateView
        } else {
          filterBar
          benchmarksSection
        }

        // ── Footer ───────────────────────────────
        Button(action: { session.requestSync() }) {
          Label("Synchroniser", systemImage: "arrow.trianglehead.2.clockwise")
            .font(.caption2)
        }
        .buttonStyle(.bordered)
        .tint(session.accentColor)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .frame(maxWidth: .infinity)
      }
      .padding(.horizontal, 8)
      .padding(.top, 4)
    }
    .navigationTitle("Carnet")
    .refreshable { session.requestSync() }
  }

  // MARK: - En-tête

  private var headerView: some View {
    HStack(spacing: 10) {
      Image(systemName: "trophy.fill")
        .foregroundStyle(session.accentColor)
        .font(.title3)

      VStack(alignment: .leading, spacing: 1) {
        Text("Carnet YOROI")
          .font(.headline)
          .fontWeight(.bold)
          .foregroundStyle(session.textPrimary)

        Text("\(session.benchmarks.count) record\(session.benchmarks.count > 1 ? "s" : "")")
          .font(.caption2)
          .foregroundStyle(session.textSecondary)
      }

      Spacer()

      // Badge série
      if session.streak > 0 {
        VStack(spacing: 1) {
          Text("\(session.streak)")
            .font(.system(size: 16, weight: .black))
            .foregroundStyle(session.accentColor)
          Text("j")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(session.accentColor)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
        .background(session.accentColor.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 6))
      }
    }
    .padding(.vertical, 8)
  }

  // MARK: - Titre de section

  private func sectionTitle(_ text: String) -> some View {
    Text(text.uppercased())
      .font(.system(size: 9, weight: .bold))
      .foregroundStyle(session.accentColor)
      .tracking(1)
      .padding(.top, 12)
      .padding(.bottom, 4)
  }

  // MARK: - Derniers entraînements

  private var recentWorkoutsSection: some View {
    VStack(spacing: 6) {
      ForEach(session.recentWorkouts.prefix(3)) { workout in
        HStack(spacing: 8) {
          Image(systemName: workout.icon)
            .font(.system(size: 13))
            .foregroundStyle(session.accentColor)
            .frame(width: 20)

          VStack(alignment: .leading, spacing: 1) {
            Text(workout.type)
              .font(.caption)
              .fontWeight(.semibold)
              .foregroundStyle(session.textPrimary)
              .lineLimit(1)
            Text(workout.formattedDuration + (workout.calories > 0 ? "  •  \(workout.calories) kcal" : ""))
              .font(.system(size: 9))
              .foregroundStyle(session.textSecondary)
          }

          Spacer()

          Text(shortDate(workout.date))
            .font(.system(size: 9))
            .foregroundStyle(session.textSecondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(session.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
      }
    }
  }

  // MARK: - Filtre catégories

  private var filterBar: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 6) {
        ForEach(filters, id: \.self) { f in
          Button(action: { selectedFilter = f }) {
            Text(f)
              .font(.system(size: 9, weight: .semibold))
              .foregroundStyle(selectedFilter == f ? session.textPrimary : session.textSecondary)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(selectedFilter == f ? session.accentColor : session.cardBg)
              .clipShape(Capsule())
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.vertical, 4)
    }
  }

  // MARK: - Bibliothèque records

  private var benchmarksSection: some View {
    VStack(spacing: 6) {
      ForEach(filteredBenchmarks) { record in
        benchmarkRow(record)
      }
    }
  }

  private func benchmarkRow(_ record: BenchmarkRecord) -> some View {
    HStack(spacing: 8) {
      // Icône catégorie
      Image(systemName: record.icon)
        .font(.system(size: 13))
        .foregroundStyle(categoryColor(record.category))
        .frame(width: 20)

      VStack(alignment: .leading, spacing: 2) {
        Text(record.name)
          .font(.caption)
          .fontWeight(.bold)
          .foregroundStyle(session.textPrimary)
          .lineLimit(1)

        if !record.sport.isEmpty {
          Text(record.sport)
            .font(.system(size: 9))
            .foregroundStyle(session.accentColor)
            .lineLimit(1)
        }

        Text("\(record.entryCount) entrée\(record.entryCount > 1 ? "s" : "")" + (record.prDate.isEmpty ? "" : "  •  \(shortDate(record.prDate))"))
          .font(.system(size: 9))
          .foregroundStyle(session.textSecondary)
      }

      Spacer()

      // PR en évidence
      VStack(alignment: .trailing, spacing: 1) {
        Text("PR")
          .font(.system(size: 8, weight: .black))
          .foregroundStyle(session.accentColor)
        Text(record.formattedPR)
          .font(.system(size: 13, weight: .black))
          .foregroundStyle(session.textPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        if record.prReps > 1 {
          Text("×\(record.prReps)")
            .font(.system(size: 9))
            .foregroundStyle(session.textSecondary)
        }
      }
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 8)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 10))
    .overlay(
      RoundedRectangle(cornerRadius: 10)
        .stroke(categoryColor(record.category).opacity(0.25), lineWidth: 1)
    )
  }

  // MARK: - État vide

  private var emptyStateView: some View {
    VStack(spacing: 8) {
      Image(systemName: "trophy")
        .font(.largeTitle)
        .foregroundStyle(session.accentColor.opacity(0.4))
      Text("Aucun record")
        .font(.caption)
        .fontWeight(.semibold)
        .foregroundStyle(session.textSecondary)
      Text("Ajoute des records\ndepuis l'app iPhone")
        .font(.system(size: 10))
        .foregroundStyle(session.textSecondary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 20)
  }

  // MARK: - Helpers

  private func categoryColor(_ category: String) -> Color {
    switch category.lowercased() {
    case "force":               return .orange
    case "endurance":           return .red
    case "speed", "vitesse":    return .yellow
    case "power", "puissance":  return .purple
    default:                    return session.accentColor
    }
  }

  private func shortDate(_ dateString: String) -> String {
    guard !dateString.isEmpty else { return "" }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "fr_FR")
    // Try ISO format
    formatter.dateFormat = "yyyy-MM-dd"
    if let date = formatter.date(from: String(dateString.prefix(10))) {
      let out = DateFormatter()
      out.locale = Locale(identifier: "fr_FR")
      out.dateFormat = "d MMM"
      return out.string(from: date)
    }
    return String(dateString.prefix(5))
  }
}
