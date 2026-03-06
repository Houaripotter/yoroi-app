// ============================================
// YOROI WATCH - CARNET D'ENTRAINEMENT
// ============================================
// - Liste des exercices avec PR
// - Logger une serie directement depuis la Watch
// - Digital Crown pour les valeurs (poids, reps, RPE)
// - Historique local instantane (sans attendre l'iPhone)
// - Gros boutons +/- pour les doigts
// ============================================

import SwiftUI
import WatchKit

// MARK: - Page principale

struct CarnetPage: View {
  @EnvironmentObject var session: WatchSessionManager
  @State private var selectedTab: CarnetTab = .bibliotheque

  enum CarnetTab: String, CaseIterable {
    case bibliotheque = "Bibliotheque"
    case historique = "Historique"
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Onglets
        tabSelector
        // Contenu
        if selectedTab == .bibliotheque {
          ExercicesListView()
        } else {
          HistoriqueView()
        }
      }
      .navigationTitle("Carnet")
    }
  }

  private var tabSelector: some View {
    HStack(spacing: 0) {
      ForEach(CarnetTab.allCases, id: \.self) { tab in
        Button(action: { selectedTab = tab }) {
          Text(tab.rawValue)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(selectedTab == tab ? session.textPrimary : session.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(selectedTab == tab ? session.accentColor : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.horizontal, 6)
    .padding(.top, 4)
    .padding(.bottom, 2)
  }
}

// MARK: - Liste des exercices

struct ExercicesListView: View {
  @EnvironmentObject var session: WatchSessionManager
  @State private var selectedFilter: String = "Tous"
  @State private var showLibrary = false
  private let filters = ["Tous", "Force", "Endurance", "Vitesse", "Puissance"]

  var filtered: [BenchmarkRecord] {
    guard selectedFilter != "Tous" else { return session.benchmarks }
    return session.benchmarks.filter {
      $0.category.lowercased() == selectedFilter.lowercased() ||
      ($0.category.lowercased() == "speed"  && selectedFilter == "Vitesse") ||
      ($0.category.lowercased() == "power"  && selectedFilter == "Puissance")
    }
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 0) {
        // Add button — always visible
        Button(action: { showLibrary = true }) {
          HStack(spacing: 6) {
            Image(systemName: "plus.circle.fill")
              .font(.system(size: 13))
            Text("Ajouter un exercice")
              .font(.system(size: 11, weight: .bold))
          }
          .foregroundColor(session.textOnAccent)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 8)
          .background(session.accentColor)
          .cornerRadius(10)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 6)
        .padding(.top, 6)
        .padding(.bottom, 4)

        // Only show filter + records when there are records
        if !session.benchmarks.isEmpty {
          filterBar
          VStack(spacing: 6) {
            ForEach(filtered) { record in
              NavigationLink(destination: BenchmarkDetailView(record: record)) {
                ExerciceRow(record: record)
              }
              .buttonStyle(.plain)
            }
          }
          .padding(.horizontal, 6)
          .padding(.bottom, 8)
        }
      }
    }
    .sheet(isPresented: $showLibrary) {
      ExerciseLibraryPage()
    }
  }

  private var filterBar: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 5) {
        ForEach(filters, id: \.self) { f in
          Button(action: { selectedFilter = f }) {
            Text(f)
              .font(.system(size: 9, weight: .semibold))
              .foregroundStyle(selectedFilter == f ? .black : session.textSecondary)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(selectedFilter == f ? session.accentColor : session.cardBg)
              .clipShape(Capsule())
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 6)
      .padding(.vertical, 5)
    }
  }
}

// MARK: - Ligne exercice

struct ExerciceRow: View {
  @EnvironmentObject var session: WatchSessionManager
  let record: BenchmarkRecord

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: record.icon)
        .font(.system(size: 14))
        .foregroundStyle(categoryColor(record.category))
        .frame(width: 22)

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
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 1) {
        Text("PR")
          .font(.system(size: 8, weight: .black))
          .foregroundStyle(session.accentColor)
        Text(record.formattedPR)
          .font(.system(size: 13, weight: .black))
          .foregroundStyle(session.textPrimary)
          .minimumScaleFactor(0.7)
          .lineLimit(1)
      }
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 9)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 10))
    .overlay(
      RoundedRectangle(cornerRadius: 10)
        .stroke(categoryColor(record.category).opacity(0.2), lineWidth: 1)
    )
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

// MARK: - Detail exercice

struct BenchmarkDetailView: View {
  @EnvironmentObject var session: WatchSessionManager
  let record: BenchmarkRecord
  @State private var showLog = false

  var recentEntries: [LocalLogEntry] {
    session.localLogHistory.filter { $0.benchmarkId == record.id }.prefix(5).map { $0 }
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        // PR card
        prCard
        // Bouton logger - gros, facile a taper
        Button(action: { showLog = true }) {
          HStack(spacing: 6) {
            Image(systemName: "plus.circle.fill")
              .font(.system(size: 16))
            Text("Logger une serie")
              .font(.system(size: 13, weight: .semibold))
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, 12)
        }
        .buttonStyle(.borderedProminent)
        .tint(session.accentColor)
        .clipShape(RoundedRectangle(cornerRadius: 12))

        // Historique local
        if !recentEntries.isEmpty {
          Text("DERNIERS LOGS")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(session.accentColor)
            .tracking(1)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 4)

          ForEach(recentEntries) { entry in
            entryRow(entry)
          }
        }
      }
      .padding(.horizontal, 8)
      .padding(.vertical, 6)
    }
    .navigationTitle(record.name)
    .sheet(isPresented: $showLog) {
      LogEntryView(record: record)
    }
  }

  private var prCard: some View {
    HStack {
      VStack(alignment: .leading, spacing: 2) {
        Text("RECORD PERSO")
          .font(.system(size: 9, weight: .bold))
          .foregroundStyle(session.accentColor)
          .tracking(1)
        Text(record.formattedPR)
          .font(.system(size: 22, weight: .black))
          .foregroundStyle(session.textPrimary)
        if record.prReps > 1 {
          Text("\(record.prReps) reps")
            .font(.caption2)
            .foregroundStyle(session.textSecondary)
        }
      }
      Spacer()
      Image(systemName: "trophy.fill")
        .font(.system(size: 22))
        .foregroundStyle(session.accentColor.opacity(0.8))
    }
    .padding(12)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }

  private func entryRow(_ entry: LocalLogEntry) -> some View {
    HStack(spacing: 8) {
      VStack(alignment: .leading, spacing: 1) {
        Text(entry.formattedValue)
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(session.textPrimary)
        Text("\(entry.reps) reps  •  RPE \(entry.rpe)")
          .font(.system(size: 10))
          .foregroundStyle(session.textSecondary)
      }
      Spacer()
      Text(entry.shortDate)
        .font(.system(size: 9))
        .foregroundStyle(session.textSecondary)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 7)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 8))
  }
}

// MARK: - Logger une serie

struct LogEntryView: View {
  @EnvironmentObject var session: WatchSessionManager
  let record: BenchmarkRecord
  @Environment(\.dismiss) var dismiss

  enum Step { case poids, reps, rpe, confirm }
  @State private var step: Step = .poids

  // Valeurs
  @State private var weight: Double = 0
  @State private var reps: Int = 5
  @State private var rpe: Int = 7

  // Crown
  @State private var crownWeight: Double = 0
  @State private var crownReps:   Double = 5
  @FocusState private var crownFocused: Bool

  var body: some View {
    switch step {
    case .poids:   PoidsStep(weight: $weight, crownWeight: $crownWeight, crownFocused: $crownFocused, onNext: { step = .reps })
    case .reps:    RepsStep(reps: $reps, crownReps: $crownReps, crownFocused: $crownFocused, onBack: { step = .poids }, onNext: { step = .rpe })
    case .rpe:     RPEStep(rpe: $rpe, onBack: { step = .reps }, onNext: { step = .confirm })
    case .confirm: ConfirmStep(
        record: record, weight: weight, reps: reps, rpe: rpe,
        onBack: { step = .rpe },
        onSave: {
          session.logBenchmarkEntry(
            benchmarkId: record.id,
            exerciseName: record.name,
            value: weight,
            reps: reps,
            rpe: rpe
          )
          WKInterfaceDevice.current().play(.success)
          dismiss()
        }
      )
    }
  }
}

// MARK: - Step 1 : Poids

struct PoidsStep: View {
  @EnvironmentObject var session: WatchSessionManager
  @Binding var weight: Double
  @Binding var crownWeight: Double
  var crownFocused: FocusState<Bool>.Binding
  let onNext: () -> Void

  private let step = 2.5

  var body: some View {
    VStack(spacing: 8) {
      Text("POIDS (kg)")
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(session.accentColor)
        .tracking(1)

      // Valeur principale — grande et lisible
      Text(formattedWeight)
        .font(.system(size: 36, weight: .black, design: .rounded))
        .foregroundStyle(session.textPrimary)
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
        // Capture de la couronne sur ce bloc
        .focusable(true, interactions: .automatic)
        .digitalCrownRotation(
          $crownWeight,
          from: 0, through: 500, by: step,
          sensitivity: .medium,
          isContinuous: false,
          isHapticFeedbackEnabled: true
        )
        .onChange(of: crownWeight) { weight = max(0, crownWeight) }
        .onAppear { crownWeight = weight }

      // Boutons +/-  (gros pour les doigts)
      HStack(spacing: 12) {
        bigButton(icon: "minus", color: .red) {
          weight = max(0, weight - step)
          crownWeight = weight
        }
        bigButton(icon: "arrow.up.arrow.down", color: session.accentColor) {
          // indique qu'on peut utiliser la couronne
          WKInterfaceDevice.current().play(.click)
        }
        bigButton(icon: "plus", color: .green) {
          weight += step
          crownWeight = weight
        }
      }

      // Bouton Suivant
      Button(action: onNext) {
        Text("Suivant")
          .font(.system(size: 14, weight: .semibold))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
      }
      .buttonStyle(.borderedProminent)
      .tint(session.accentColor)
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 6)
  }

  private var formattedWeight: String {
    weight == 0 ? "0 kg" : (weight.truncatingRemainder(dividingBy: 1) == 0
      ? "\(Int(weight)) kg"
      : String(format: "%.1f kg", weight))
  }
}

// MARK: - Step 2 : Reps

struct RepsStep: View {
  @EnvironmentObject var session: WatchSessionManager
  @Binding var reps: Int
  @Binding var crownReps: Double
  var crownFocused: FocusState<Bool>.Binding
  let onBack: () -> Void
  let onNext: () -> Void

  var body: some View {
    VStack(spacing: 8) {
      Text("REPETITIONS")
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(session.accentColor)
        .tracking(1)

      Text("\(reps)")
        .font(.system(size: 48, weight: .black, design: .rounded))
        .foregroundStyle(session.textPrimary)
        .frame(maxWidth: .infinity)
        .focusable(true, interactions: .automatic)
        .digitalCrownRotation(
          $crownReps,
          from: 1, through: 100, by: 1,
          sensitivity: .medium,
          isContinuous: false,
          isHapticFeedbackEnabled: true
        )
        .onChange(of: crownReps) { reps = max(1, Int(crownReps)) }
        .onAppear { crownReps = Double(reps) }

      HStack(spacing: 12) {
        bigButton(icon: "minus", color: .red) {
          reps = max(1, reps - 1)
          crownReps = Double(reps)
        }
        bigButton(icon: "arrow.up.arrow.down", color: session.accentColor) {
          WKInterfaceDevice.current().play(.click)
        }
        bigButton(icon: "plus", color: .green) {
          reps = min(100, reps + 1)
          crownReps = Double(reps)
        }
      }

      HStack(spacing: 8) {
        Button(action: onBack) {
          Image(systemName: "chevron.left")
            .font(.system(size: 13, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
        }
        .buttonStyle(.bordered)

        Button(action: onNext) {
          Text("Suivant")
            .font(.system(size: 13, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
        }
        .buttonStyle(.borderedProminent)
        .tint(session.accentColor)
      }
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 6)
  }
}

// MARK: - Step 3 : RPE

struct RPEStep: View {
  @EnvironmentObject var session: WatchSessionManager
  @Binding var rpe: Int
  let onBack: () -> Void
  let onNext: () -> Void

  // Couleurs par niveau RPE
  private func rpeColor(_ value: Int) -> Color {
    switch value {
    case 1...3: return .green
    case 4...6: return .yellow
    case 7...8: return .orange
    default:    return .red
    }
  }

  private func rpeLabel(_ value: Int) -> String {
    switch value {
    case 1...3: return "Facile"
    case 4...6: return "Modere"
    case 7...8: return "Dur"
    case 9:     return "Tres dur"
    default:    return "MAX"
    }
  }

  var body: some View {
    VStack(spacing: 6) {
      HStack {
        Text("RPE")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(session.accentColor)
          .tracking(1)
        Text("\(rpe) – \(rpeLabel(rpe))")
          .font(.system(size: 10))
          .foregroundStyle(rpeColor(rpe))
      }

      // Grille 5x2 — gros boutons faciles a taper
      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 5), spacing: 6) {
        ForEach(1...10, id: \.self) { value in
          Button(action: { rpe = value }) {
            Text("\(value)")
              .font(.system(size: 14, weight: .bold))
              .frame(maxWidth: .infinity)
              .padding(.vertical, 9)
              .background(rpe == value ? rpeColor(value) : session.cardBg)
              .foregroundStyle(rpe == value ? .black : session.textSecondary)
              .clipShape(RoundedRectangle(cornerRadius: 8))
          }
          .buttonStyle(.plain)
        }
      }

      HStack(spacing: 8) {
        Button(action: onBack) {
          Image(systemName: "chevron.left")
            .font(.system(size: 13, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
        }
        .buttonStyle(.bordered)

        Button(action: onNext) {
          Text("Suivant")
            .font(.system(size: 13, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
        }
        .buttonStyle(.borderedProminent)
        .tint(session.accentColor)
      }
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
  }
}

// MARK: - Step 4 : Confirmation

struct ConfirmStep: View {
  @EnvironmentObject var session: WatchSessionManager
  let record: BenchmarkRecord
  let weight: Double
  let reps: Int
  let rpe: Int
  let onBack: () -> Void
  let onSave: () -> Void

  private var formattedWeight: String {
    weight == 0 ? "0 kg" : (weight.truncatingRemainder(dividingBy: 1) == 0
      ? "\(Int(weight)) kg"
      : String(format: "%.1f kg", weight))
  }

  var body: some View {
    VStack(spacing: 10) {
      Text("CONFIRMER")
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(session.accentColor)
        .tracking(1)

      VStack(spacing: 6) {
        summaryRow(label: "Exercice", value: record.name)
        summaryRow(label: "Poids",    value: formattedWeight)
        summaryRow(label: "Reps",     value: "\(reps)")
        summaryRow(label: "RPE",      value: "\(rpe)/10")
      }
      .padding(10)
      .background(session.cardBg)
      .clipShape(RoundedRectangle(cornerRadius: 12))

      HStack(spacing: 8) {
        Button(action: onBack) {
          Image(systemName: "chevron.left")
            .font(.system(size: 13, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
        }
        .buttonStyle(.bordered)

        Button(action: onSave) {
          HStack(spacing: 4) {
            Image(systemName: "checkmark")
              .font(.system(size: 13, weight: .bold))
            Text("Sauver")
              .font(.system(size: 13, weight: .semibold))
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
        }
        .buttonStyle(.borderedProminent)
        .tint(.green)
      }
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 6)
  }

  private func summaryRow(label: String, value: String) -> some View {
    HStack {
      Text(label)
        .font(.system(size: 11))
        .foregroundStyle(session.textSecondary)
      Spacer()
      Text(value)
        .font(.system(size: 12, weight: .bold))
        .foregroundStyle(session.textPrimary)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
  }
}

// MARK: - Historique global

struct HistoriqueView: View {
  @EnvironmentObject var session: WatchSessionManager

  var body: some View {
    if session.localLogHistory.isEmpty {
      VStack(spacing: 8) {
        Image(systemName: "clock.badge.xmark")
          .font(.largeTitle)
          .foregroundStyle(session.accentColor.opacity(0.4))
        Text("Aucun log")
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundStyle(session.textSecondary)
        Text("Tes series loggees\napparaitront ici")
          .font(.system(size: 10))
          .foregroundStyle(session.textSecondary)
          .multilineTextAlignment(.center)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    } else {
      ScrollView {
        VStack(spacing: 6) {
          ForEach(session.localLogHistory) { entry in
            historyRow(entry)
          }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
      }
    }
  }

  private func historyRow(_ entry: LocalLogEntry) -> some View {
    HStack(spacing: 8) {
      VStack(alignment: .leading, spacing: 2) {
        Text(entry.exerciseName)
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(session.textPrimary)
          .lineLimit(1)
        HStack(spacing: 4) {
          Text(entry.formattedValue)
            .font(.system(size: 12, weight: .black))
            .foregroundStyle(session.accentColor)
          Text("x\(entry.reps)")
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(session.textPrimary)
          Text("RPE \(entry.rpe)")
            .font(.system(size: 10))
            .foregroundStyle(rpeColor(entry.rpe))
        }
      }
      Spacer()
      Text(entry.shortDate)
        .font(.system(size: 9))
        .foregroundStyle(session.textSecondary)
        .multilineTextAlignment(.trailing)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 8)
    .background(session.cardBg)
    .clipShape(RoundedRectangle(cornerRadius: 10))
  }

  private func rpeColor(_ value: Int) -> Color {
    switch value {
    case 1...3: return .green
    case 4...6: return .yellow
    case 7...8: return .orange
    default:    return .red
    }
  }
}

// MARK: - Helper bouton +/-

private func bigButton(icon: String, color: Color, action: @escaping () -> Void) -> some View {
  Button(action: action) {
    Image(systemName: icon)
      .font(.system(size: 16, weight: .bold))
      .foregroundStyle(color)
      .frame(width: 44, height: 44)
      .background(color.opacity(0.12))
      .clipShape(Circle())
  }
  .buttonStyle(.plain)
}
