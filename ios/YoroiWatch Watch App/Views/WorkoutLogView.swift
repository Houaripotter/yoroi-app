//
//  WorkoutLogView.swift
//  YoroiWatch Watch App
//
//  Vue principale du carnet d'entraînement
//

import SwiftUI

struct WorkoutLogView: View {
    @EnvironmentObject var workoutSessionManager: WorkoutSessionManager
    @EnvironmentObject var connectivityManager: WatchConnectivityManager

    @State private var currentWorkout: WatchWorkout?
    @State private var showingExercisePicker = false
    @State private var selectedExercise: WatchExercise?
    @State private var showingSetLog = false

    private let haptics = HapticsManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Header
                headerView

                if let workout = currentWorkout, workout.isActive {
                    // Séance en cours
                    activeWorkoutView(workout)
                } else {
                    // Pas de séance
                    startWorkoutView
                }
            }
            .padding(.horizontal, 4)
        }
        .sheet(isPresented: $showingExercisePicker) {
            ExercisePickerView { exercise in
                addExercise(exercise)
                showingExercisePicker = false
            }
        }
        .sheet(isPresented: $showingSetLog) {
            if let exercise = selectedExercise {
                SetLogView(exercise: exercise) { set in
                    addSet(set, to: exercise)
                    showingSetLog = false
                }
            }
        }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack {
            Image(systemName: "dumbbell.fill")
                .foregroundColor(.green)
            Text("Carnet")
                .font(.headline)
            Spacer()
            if currentWorkout?.isActive == true {
                Text(workoutSessionManager.elapsedTimeFormatted)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Vue Séance Active

    private func activeWorkoutView(_ workout: WatchWorkout) -> some View {
        VStack(spacing: 10) {
            // Résumé
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(workout.totalSets) séries")
                        .font(.title3)
                        .fontWeight(.bold)
                    Text(workout.formattedVolume)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                // Status
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text("Actif")
                        .font(.caption2)
                        .foregroundColor(.green)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(Color.green.opacity(0.1))
            .cornerRadius(8)

            // Liste des exercices
            if workout.exercises.isEmpty {
                Text("Aucun exercice")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(workout.exercises) { exercise in
                    exerciseRow(exercise)
                }
            }

            // Boutons d'action
            VStack(spacing: 8) {
                // Ajouter exercice
                Button(action: { showingExercisePicker = true }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Exercice")
                    }
                    .font(.caption)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.green)
                    .foregroundColor(.black)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)

                // Terminer séance
                Button(action: endWorkout) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Terminer")
                    }
                    .font(.caption)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.red.opacity(0.3))
                    .foregroundColor(.red)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Row Exercice

    private func exerciseRow(_ exercise: WatchExercise) -> some View {
        Button(action: {
            selectedExercise = exercise
            showingSetLog = true
        }) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(exercise.name)
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text("\(exercise.totalSets) séries")
                            .font(.caption2)
                            .foregroundColor(.secondary)

                        if exercise.maxWeight > 0 {
                            Text("•")
                                .foregroundColor(.secondary)
                            Text("Max: \(exercise.maxWeight, specifier: "%.1f")kg")
                                .font(.caption2)
                                .foregroundColor(.orange)
                        }
                    }
                }

                Spacer()

                Image(systemName: "plus.circle")
                    .foregroundColor(.green)
            }
            .padding(8)
            .background(Color.gray.opacity(0.15))
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Vue Démarrer Séance

    private var startWorkoutView: some View {
        VStack(spacing: 16) {
            Image(systemName: "figure.strengthtraining.traditional")
                .font(.largeTitle)
                .foregroundColor(.green)

            Text("Prêt pour l'entraînement?")
                .font(.caption)
                .foregroundColor(.secondary)

            Button(action: startWorkout) {
                HStack {
                    Image(systemName: "play.fill")
                    Text("Démarrer")
                }
                .font(.body)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.green)
                .foregroundColor(.black)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)

            // Dernière séance
            if let lastWorkout = getLastWorkout() {
                VStack(spacing: 4) {
                    Text("Dernière séance")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("\(lastWorkout.exercises.count) exercices • \(lastWorkout.totalSets) séries")
                        .font(.caption)
                }
            }
        }
        .padding()
    }

    // MARK: - Actions

    private func startWorkout() {
        currentWorkout = WatchWorkout()
        workoutSessionManager.startWorkout()
        haptics.playWorkoutStarted()

        // Notifier l'iPhone
        connectivityManager.sendWorkoutStarted()
    }

    private func endWorkout() {
        guard var workout = currentWorkout else { return }
        workout.finish()
        saveWorkout(workout)
        workoutSessionManager.endWorkout()
        haptics.playWorkoutEnded()

        // Notifier l'iPhone
        connectivityManager.sendWorkoutEnded(workout: workout)

        currentWorkout = nil
    }

    private func addExercise(_ exerciseName: String) {
        guard currentWorkout != nil else { return }

        // Trouver la catégorie
        let category = ExerciseLibrary.allExercises.first { $0.name == exerciseName }?.category ?? .chest

        let exercise = WatchExercise(name: exerciseName, category: category)
        currentWorkout?.addExercise(exercise)

        // Ajouter aux récents
        RecentExercisesManager.shared.addRecent(name: exerciseName, category: category)

        haptics.playConfirmation()
    }

    private func addSet(_ set: WatchSet, to exercise: WatchExercise) {
        guard currentWorkout != nil else { return }
        currentWorkout?.addSet(to: exercise.id, set: set)

        // Mettre à jour l'exercice sélectionné
        if let updated = currentWorkout?.exercises.first(where: { $0.id == exercise.id }) {
            selectedExercise = updated
        }

        // Notifier l'iPhone
        connectivityManager.sendSetLogged(exerciseName: exercise.name, set: set)

        haptics.playSetLogged()
    }

    // MARK: - Persistence

    private func saveWorkout(_ workout: WatchWorkout) {
        // Sauvegarder localement
        if let data = try? JSONEncoder().encode(workout) {
            UserDefaults.standard.set(data, forKey: "lastWorkout")
        }
    }

    private func getLastWorkout() -> WatchWorkout? {
        guard let data = UserDefaults.standard.data(forKey: "lastWorkout"),
              let workout = try? JSONDecoder().decode(WatchWorkout.self, from: data) else {
            return nil
        }
        return workout
    }
}

#Preview {
    WorkoutLogView()
        .environmentObject(WorkoutSessionManager.shared)
        .environmentObject(WatchConnectivityManager.shared)
}
