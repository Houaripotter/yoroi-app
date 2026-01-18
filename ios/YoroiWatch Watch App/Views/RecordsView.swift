// ============================================
// YOROI WATCH - Vue Carnet / Records
// Design jaune avec liste des records
// ============================================

import SwiftUI

struct RecordsView: View {
    @StateObject private var healthManager = HealthManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Titre CARNET
                HStack(spacing: 6) {
                    Image(systemName: "book.fill")
                        .foregroundColor(.yellow)
                    Text("CARNET")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.yellow)
                }
                .padding(.top, 8)

                // Carte Records
                VStack(alignment: .leading, spacing: 12) {
                    // Header MES RECORDS
                    HStack(spacing: 6) {
                        Image(systemName: "trophy.fill")
                            .foregroundColor(.yellow)
                        Text("MES RECORDS")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.yellow)
                    }

                    // Liste des records
                    ForEach(healthManager.records) { record in
                        RecordRow(record: record)
                    }
                }
                .padding(12)
                .background(Color.gray.opacity(0.15))
                .cornerRadius(16)
                .padding(.horizontal, 8)

            }
        }
        .background(Color.black)
    }
}

struct RecordRow: View {
    let record: ExerciseRecord

    var body: some View {
        HStack {
            // Nom exercice et date
            VStack(alignment: .leading, spacing: 2) {
                Text(truncateText(record.exercise, maxLength: 15))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)

                Text(formatDate(record.date))
                    .font(.system(size: 9))
                    .foregroundColor(.gray)
            }

            Spacer()

            // Poids et reps
            HStack(alignment: .bottom, spacing: 4) {
                Text("\(Int(record.weight))")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.yellow)

                Text("kg")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
                    .padding(.bottom, 2)

                Text("×")
                    .font(.system(size: 12))
                    .foregroundColor(.gray)

                Text("\(record.reps)")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.yellow)
            }
        }
    }

    private func truncateText(_ text: String, maxLength: Int) -> String {
        if text.count > maxLength {
            return String(text.prefix(maxLength - 3)) + "..."
        }
        return text
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM"
        return formatter.string(from: date)
    }
}

#Preview {
    RecordsView()
}
