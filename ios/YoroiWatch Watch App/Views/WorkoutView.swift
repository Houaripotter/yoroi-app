// ============================================
// YOROI WATCH - Vue Entraînements
// Navigation verticale entre les sous-vues
// ============================================

import SwiftUI
import HealthKit

struct WorkoutView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var selectedActivity: String?
    @State private var showActivityPicker = false

    let activities: [(name: String, icon: String, color: Color)] = [
        ("Muscu", "dumbbell.fill", .green),
        ("Cardio", "figure.run", Color(red: 1.0, green: 0.42, blue: 0.21)),
        ("HIIT", "bolt.fill", Color(red: 0.85, green: 0.55, blue: 0.27)),
        ("Yoga", "figure.mind.and.body", .purple),
        ("Boxe", "figure.boxing", .red),
        ("CrossFit", "figure.strengthtraining.functional", Color(red: 0.6, green: 0.2, blue: 0.8)),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Header
                HStack(spacing: 6) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .foregroundColor(.green)
                    Text("SÉANCE")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.green)
                }
                .padding(.top, 8)

                if healthManager.workoutActive {
                    // AFFICHAGE SÉANCE EN COURS
                    VStack(spacing: 10) {
                        Text(formatDuration(healthManager.workoutDuration))
                            .font(.system(size: 32, weight: .black, design: .rounded))
                            .foregroundColor(.green)
                        
                        HStack(spacing: 20) {
                            VStack {
                                Image(systemName: "heart.fill").foregroundColor(.red)
                                Text("\(Int(healthManager.heartRate))").font(.system(size: 18, weight: .bold))
                                Text("BPM").font(.system(size: 8)).foregroundColor(.gray)
                            }
                            
                            VStack {
                                Image(systemName: "flame.fill").foregroundColor(.orange)
                                Text("\(Int(healthManager.activeCalories))").font(.system(size: 18, weight: .bold))
                                Text("KCAL").font(.system(size: 8)).foregroundColor(.gray)
                            }
                        }
                        
                        Button(action: { 
                            WKInterfaceDevice.current().play(.stop)
                            healthManager.stopWorkout() 
                        }) {
                            Text("TERMINER")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.red)
                                .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.12))
                    .cornerRadius(16)
                    .padding(.horizontal, 8)
                    
                } else {
                    // BOUTON DÉMARRER SÉANCE
                    Button(action: { 
                        WKInterfaceDevice.current().play(.start)
                        showActivityPicker = true 
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "play.fill")
                                .font(.system(size: 16))
                            Text("Démarrer")
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.green)
                        .cornerRadius(14)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 8)
                }

                // Dernier entraînement (Historique rapide)
                HStack(spacing: 8) {
                    StatBox(
                        icon: "flame.fill",
                        value: "\(healthManager.streak)",
                        label: "Série",
                        color: .orange
                    )

                    StatBox(
                        icon: "trophy.fill",
                        value: "\(healthManager.records.count)",
                        label: "Records",
                        color: .yellow
                    )
                }
                .padding(.horizontal, 8)

                // Dernier entraînement
                if let lastWorkout = healthManager.workoutHistory.first {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("DERNIÈRE SÉANCE")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.gray)

                        ForEach(lastWorkout.exercises.prefix(2)) { exercise in
                            HStack {
                                Text(exercise.name)
                                    .font(.system(size: 12))
                                    .foregroundColor(.white)

                                Spacer()

                                if let lastSet = exercise.sets.last {
                                    Text("\(Int(lastSet.weight))kg × \(lastSet.reps)")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(.green)
                                }
                            }
                        }
                    }
                    .padding(12)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(12)
                    .padding(.horizontal, 8)
                }
            }
            .padding(.bottom, 16)
        }
        .background(Color.black)
        .sheet(isPresented: $showActivityPicker) {
            ActivityPickerSheet(activities: activities, selectedActivity: $selectedActivity, healthManager: healthManager)
        }
    }
    private func formatDuration(_ seconds: TimeInterval) -> String {
        let h = Int(seconds) / 3600
        let m = Int(seconds) % 3600 / 60
        let s = Int(seconds) % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }
}

// MARK: - Stat Box

struct StatBox: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(color)

            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.white)

            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }
}

// MARK: - Activity Picker Sheet

struct ActivityPickerSheet: View {
    let activities: [(name: String, icon: String, color: Color)]
    @Binding var selectedActivity: String?
    @ObservedObject var healthManager: HealthManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("TYPE D'ACTIVITÉ")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.gray)
                    .padding(.top, 8)

                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 6),
                    GridItem(.flexible(), spacing: 6)
                ], spacing: 6) {
                    ForEach(activities, id: \.name) { activity in
                        Button(action: {
                            // Convertir le nom en HKWorkoutActivityType
                            let type: HKWorkoutActivityType = activity.name == "Muscu" ? .traditionalStrengthTraining : 
                                                             activity.name == "Cardio" ? .running :
                                                             activity.name == "Boxe" ? .boxing : .other
                            healthManager.startWorkout(type: type)
                            dismiss()
                        }) {
                            VStack(spacing: 6) {
                                Image(systemName: activity.icon)
                                    .font(.system(size: 22))
                                    .foregroundColor(activity.color)

                                Text(activity.name)
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(activity.color.opacity(0.2))
                            .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 8)
            }
        }
        .background(Color.black)
    }
}

#Preview {
    WorkoutView()
}
