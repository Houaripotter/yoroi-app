// ============================================
// YOROI WATCH - Vue Carnet / Records
// ============================================

import SwiftUI
import WatchKit

// MARK: - Modèle Record

struct PersonalRecord: Identifiable, Codable {
    let id: UUID
    let sport: String
    let category: String
    let name: String
    let value: Double
    let unit: String
    let date: Date

    init(id: UUID = UUID(), sport: String, category: String, name: String, value: Double, unit: String, date: Date = Date()) {
        self.id = id
        self.sport = sport
        self.category = category
        self.name = name
        self.value = value
        self.unit = unit
        self.date = date
    }
}

// MARK: - Vue principale

struct RecordsView: View {
    @State private var selectedSport = 0
    private let sports = ["Muscu", "Running", "JJB"]

    // Records de démonstration
    @State private var muscuRecords: [PersonalRecord] = [
        PersonalRecord(sport: "Muscu", category: "Développé couché", name: "1RM", value: 100, unit: "kg"),
        PersonalRecord(sport: "Muscu", category: "Squat", name: "1RM", value: 140, unit: "kg"),
        PersonalRecord(sport: "Muscu", category: "Soulevé de terre", name: "1RM", value: 160, unit: "kg"),
        PersonalRecord(sport: "Muscu", category: "Tractions", name: "Max", value: 15, unit: "reps"),
    ]

    @State private var runningRecords: [PersonalRecord] = [
        PersonalRecord(sport: "Running", category: "5 km", name: "Temps", value: 22.5, unit: "min"),
        PersonalRecord(sport: "Running", category: "10 km", name: "Temps", value: 48.3, unit: "min"),
        PersonalRecord(sport: "Running", category: "Semi", name: "Temps", value: 115, unit: "min"),
        PersonalRecord(sport: "Running", category: "Distance", name: "Max", value: 21.1, unit: "km"),
    ]

    @State private var jjbRecords: [PersonalRecord] = [
        PersonalRecord(sport: "JJB", category: "Compétitions", name: "Victoires", value: 12, unit: ""),
        PersonalRecord(sport: "JJB", category: "Soumissions", name: "Préférée", value: 8, unit: "triangles"),
        PersonalRecord(sport: "JJB", category: "Temps mat", name: "Total", value: 156, unit: "h"),
        PersonalRecord(sport: "JJB", category: "Ceinture", name: "Grade", value: 3, unit: "barrettes"),
    ]

    var currentRecords: [PersonalRecord] {
        switch selectedSport {
        case 0: return muscuRecords
        case 1: return runningRecords
        case 2: return jjbRecords
        default: return []
        }
    }

    var sportColor: Color {
        switch selectedSport {
        case 0: return .purple
        case 1: return .green
        case 2: return .red
        default: return .gray
        }
    }

    var sportIcon: String {
        switch selectedSport {
        case 0: return "dumbbell.fill"
        case 1: return "figure.run"
        case 2: return "figure.martial.arts"
        default: return "star.fill"
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Titre avec icône
                HStack {
                    Image(systemName: "trophy.fill")
                        .foregroundColor(.yellow)
                    Text("Records")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }

                // Sélecteur de sport
                HStack(spacing: 4) {
                    ForEach(0..<sports.count, id: \.self) { index in
                        SportTab(
                            name: sports[index],
                            isSelected: selectedSport == index,
                            color: tabColor(for: index)
                        ) {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedSport = index
                            }
                            WKInterfaceDevice.current().play(.click)
                        }
                    }
                }

                // Sport header
                HStack {
                    Image(systemName: sportIcon)
                        .foregroundColor(sportColor)
                    Text(sports[selectedSport])
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                    Text("\(currentRecords.count) records")
                        .font(.system(size: 9))
                        .foregroundColor(.gray)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(sportColor.opacity(0.15))
                .cornerRadius(8)

                // Liste des records
                VStack(spacing: 6) {
                    ForEach(currentRecords) { record in
                        RecordRow(record: record, color: sportColor)
                    }
                }

                // Bouton ajouter
                Button(action: {
                    // Action pour ajouter un record
                    WKInterfaceDevice.current().play(.click)
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Nouveau record")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundColor(sportColor)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(sportColor.opacity(0.15))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 8)
        }
    }

    private func tabColor(for index: Int) -> Color {
        switch index {
        case 0: return .purple
        case 1: return .green
        case 2: return .red
        default: return .gray
        }
    }
}

// MARK: - Composants

struct SportTab: View {
    let name: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(name)
                .font(.system(size: 10, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? .white : .gray)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(isSelected ? color : Color.clear)
                .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}

struct RecordRow: View {
    let record: PersonalRecord
    let color: Color

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text(record.category)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white)
                Text(record.name)
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
            }

            Spacer()

            HStack(alignment: .bottom, spacing: 2) {
                Text(formatValue(record.value))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(color)
                if !record.unit.isEmpty {
                    Text(record.unit)
                        .font(.system(size: 8))
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(Color.white.opacity(0.1))
        .cornerRadius(8)
    }

    private func formatValue(_ value: Double) -> String {
        if value == floor(value) {
            return String(format: "%.0f", value)
        } else {
            return String(format: "%.1f", value)
        }
    }
}

#Preview {
    RecordsView()
}
