// ============================================
// YOROI WATCH - Vue Historique
// Affiche les séances passées avec records
// ============================================

import SwiftUI

struct HistoryView: View {
    @StateObject private var healthManager = HealthManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Titre HISTORIQUE
                HStack(spacing: 6) {
                    Image(systemName: "clock.arrow.circlepath")
                        .foregroundColor(.white)
                    Text("HISTORIQUE")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.top, 8)

                // Liste des séances groupées par jour
                ForEach(healthManager.workoutHistory) { session in
                    SessionCard(session: session)
                }

            }
            .padding(.horizontal, 8)
        }
        .background(Color.black)
    }
}

struct SessionCard: View {
    let session: WorkoutSession

    var dayLabel: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(session.date) {
            return "Aujourd'hui"
        } else if calendar.isDateInYesterday(session.date) {
            return "Hier"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE"
            formatter.locale = Locale(identifier: "fr_FR")
            return formatter.string(from: session.date).capitalized
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Jour
            Text(dayLabel)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)

            // Exercices
            ForEach(session.exercises) { exercise in
                ExerciseRow(exercise: exercise)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(16)
    }
}

struct ExerciseRow: View {
    let exercise: Exercise

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Nom de l'exercice
            Text(exercise.name)
                .font(.system(size: 11))
                .foregroundColor(.yellow)

            // Séries
            HStack(spacing: 6) {
                ForEach(exercise.sets) { set in
                    SetBadge(set: set)
                }
            }
        }
    }
}

struct SetBadge: View {
    let set: ExerciseSet

    var body: some View {
        HStack(spacing: 2) {
            if set.isRecord {
                Image(systemName: "star.fill")
                    .font(.system(size: 8))
                    .foregroundColor(.yellow)
            }

            Text("\(Int(set.weight))×\(set.reps)")
                .font(.system(size: 11, weight: set.isRecord ? .bold : .medium))
        }
        .foregroundColor(set.isRecord ? .yellow : .white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(set.isRecord ? Color.yellow.opacity(0.2) : Color.gray.opacity(0.3))
        .cornerRadius(6)
    }
}

#Preview {
    HistoryView()
}
