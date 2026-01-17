//
//  SetLogView.swift
//  YoroiWatch Watch App
//
//  Vue pour logger une série (poids + reps)
//

import SwiftUI

struct SetLogView: View {
    let exercise: WatchExercise
    let onSave: (WatchSet) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var weight: Double = 20.0
    @State private var reps: Int = 10
    @State private var selectedRestTime: Int = 90
    @State private var showRestTimer: Bool = true

    @State private var isWeightFocused: Bool = true

    private let haptics = HapticsManager.shared

    // Presets de reps courants
    let repsPresets = [6, 8, 10, 12, 15]

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Titre exercice
                Text(exercise.name)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
                    .lineLimit(1)

                // Série actuelle
                Text("Série \(exercise.sets.count + 1)")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                // Poids
                weightSection

                Divider()

                // Répétitions
                repsSection

                Divider()

                // Timer automatique
                timerToggle

                // Bouton Valider
                Button(action: saveSet) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Valider")
                    }
                    .font(.body)
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.green)
                    .foregroundColor(.black)
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)

                // Annuler
                Button(action: { dismiss() }) {
                    Text("Annuler")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Section Poids

    private var weightSection: some View {
        VStack(spacing: 6) {
            HStack {
                Image(systemName: "scalemass")
                    .foregroundColor(.orange)
                Text("Poids")
                    .font(.caption)
                Spacer()
            }

            HStack(spacing: 8) {
                // Bouton -
                Button(action: { adjustWeight(-2.5) }) {
                    Image(systemName: "minus")
                        .font(.caption)
                        .frame(width: 32, height: 32)
                        .background(Color.gray.opacity(0.3))
                        .cornerRadius(16)
                }
                .buttonStyle(.plain)

                // Valeur
                Text(formattedWeight)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.orange)
                    .frame(minWidth: 70)
                    .focusable(isWeightFocused)
                    .digitalCrownRotation(
                        $weight,
                        from: 0,
                        through: 500,
                        by: 2.5,
                        sensitivity: .medium,
                        isContinuous: false,
                        isHapticFeedbackEnabled: true
                    )
                    .onTapGesture {
                        isWeightFocused = true
                    }

                // Bouton +
                Button(action: { adjustWeight(2.5) }) {
                    Image(systemName: "plus")
                        .font(.caption)
                        .frame(width: 32, height: 32)
                        .background(Color.gray.opacity(0.3))
                        .cornerRadius(16)
                }
                .buttonStyle(.plain)
            }

            // Dernier poids utilisé
            if let lastSet = exercise.sets.last {
                Button(action: { weight = lastSet.weight }) {
                    Text("Dernier: \(lastSet.formattedWeight)")
                        .font(.caption2)
                        .foregroundColor(.cyan)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.cyan.opacity(0.2))
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Section Répétitions

    private var repsSection: some View {
        VStack(spacing: 6) {
            HStack {
                Image(systemName: "repeat")
                    .foregroundColor(.blue)
                Text("Répétitions")
                    .font(.caption)
                Spacer()
            }

            HStack(spacing: 8) {
                // Bouton -
                Button(action: { adjustReps(-1) }) {
                    Image(systemName: "minus")
                        .font(.caption)
                        .frame(width: 32, height: 32)
                        .background(Color.gray.opacity(0.3))
                        .cornerRadius(16)
                }
                .buttonStyle(.plain)

                // Valeur
                Text("\(reps)")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.blue)
                    .frame(minWidth: 50)
                    .focusable(!isWeightFocused)
                    .digitalCrownRotation(
                        Binding(
                            get: { Double(reps) },
                            set: { reps = max(1, min(100, Int($0))) }
                        ),
                        from: 1,
                        through: 100,
                        by: 1,
                        sensitivity: .medium,
                        isContinuous: false,
                        isHapticFeedbackEnabled: true
                    )
                    .onTapGesture {
                        isWeightFocused = false
                    }

                // Bouton +
                Button(action: { adjustReps(1) }) {
                    Image(systemName: "plus")
                        .font(.caption)
                        .frame(width: 32, height: 32)
                        .background(Color.gray.opacity(0.3))
                        .cornerRadius(16)
                }
                .buttonStyle(.plain)
            }

            // Presets reps
            HStack(spacing: 4) {
                ForEach(repsPresets, id: \.self) { preset in
                    Button(action: {
                        reps = preset
                        haptics.playCrownTick()
                    }) {
                        Text("\(preset)")
                            .font(.caption2)
                            .fontWeight(reps == preset ? .bold : .regular)
                            .frame(width: 28, height: 24)
                            .background(reps == preset ? Color.blue : Color.blue.opacity(0.2))
                            .foregroundColor(reps == preset ? .black : .blue)
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Toggle Timer

    private var timerToggle: some View {
        HStack {
            Image(systemName: "timer")
                .foregroundColor(.yellow)
            Text("Timer repos")
                .font(.caption)

            Spacer()

            Toggle("", isOn: $showRestTimer)
                .labelsHidden()
                .tint(.yellow)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Actions

    private func adjustWeight(_ amount: Double) {
        weight = max(0, weight + amount)
        haptics.playCrownTick()
    }

    private func adjustReps(_ amount: Int) {
        reps = max(1, reps + amount)
        haptics.playCrownTick()
    }

    private func saveSet() {
        let restTime = showRestTimer ? selectedRestTime : nil
        let set = WatchSet(weight: weight, reps: reps, restTime: restTime)
        onSave(set)
        haptics.playSetLogged()

        // Démarrer le timer si activé
        if showRestTimer {
            // Le timer sera déclenché par le parent
        }

        dismiss()
    }

    // MARK: - Helpers

    private var formattedWeight: String {
        if weight.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(weight))"
        }
        return String(format: "%.1f", weight)
    }
}

#Preview {
    let exercise = WatchExercise(name: "Développé couché", category: .chest)
    SetLogView(exercise: exercise) { _ in }
}
