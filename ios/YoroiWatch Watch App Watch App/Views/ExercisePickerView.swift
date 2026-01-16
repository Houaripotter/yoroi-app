//
//  ExercisePickerView.swift
//  YoroiWatch Watch App
//
//  Sélection d'exercice pour le carnet
//

import SwiftUI

struct ExercisePickerView: View {
    let onSelect: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedCategory: ExerciseCategory?
    @State private var searchText: String = ""

    private let haptics = HapticsManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Header
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.green)
                    Text("Exercice")
                        .font(.headline)
                }

                // Exercices récents
                if !recentExercises.isEmpty && selectedCategory == nil {
                    recentSection
                }

                // Catégories ou liste d'exercices
                if let category = selectedCategory {
                    exerciseListSection(for: category)
                } else {
                    categoriesSection
                }
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Section Récents

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "clock.arrow.circlepath")
                    .foregroundColor(.secondary)
                Text("Récents")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            ForEach(recentExercises, id: \.name) { recent in
                Button(action: {
                    onSelect(recent.name)
                    haptics.playConfirmation()
                }) {
                    HStack {
                        Circle()
                            .fill(categoryColor(recent.category))
                            .frame(width: 8, height: 8)
                        Text(recent.name)
                            .font(.caption)
                            .lineLimit(1)
                        Spacer()
                    }
                    .padding(8)
                    .background(Color.gray.opacity(0.15))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Section Catégories

    private var categoriesSection: some View {
        VStack(spacing: 6) {
            Text("Catégories")
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 6) {
                ForEach(ExerciseCategory.allCases, id: \.self) { category in
                    Button(action: {
                        selectedCategory = category
                        haptics.playCrownTick()
                    }) {
                        VStack(spacing: 4) {
                            Image(systemName: category.icon)
                                .font(.title3)
                                .foregroundColor(categoryColor(category))
                            Text(category.rawValue)
                                .font(.caption2)
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(categoryColor(category).opacity(0.15))
                        .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Liste Exercices par Catégorie

    private func exerciseListSection(for category: ExerciseCategory) -> some View {
        VStack(spacing: 8) {
            // Header avec retour
            HStack {
                Button(action: {
                    selectedCategory = nil
                    haptics.playCrownTick()
                }) {
                    Image(systemName: "chevron.left")
                        .font(.caption)
                }
                .buttonStyle(.plain)

                Image(systemName: category.icon)
                    .foregroundColor(categoryColor(category))
                Text(category.rawValue)
                    .font(.caption)
                    .fontWeight(.bold)

                Spacer()
            }

            // Liste des exercices
            ForEach(ExerciseLibrary.exercisesFor(category: category), id: \.self) { exerciseName in
                Button(action: {
                    onSelect(exerciseName)
                    haptics.playConfirmation()
                }) {
                    HStack {
                        Text(exerciseName)
                            .font(.caption)
                            .lineLimit(1)
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

            // Bouton Annuler
            Button(action: { dismiss() }) {
                Text("Annuler")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 8)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Helpers

    private var recentExercises: [(name: String, category: ExerciseCategory)] {
        return RecentExercisesManager.shared.getRecent()
    }

    private func categoryColor(_ category: ExerciseCategory) -> Color {
        switch category {
        case .chest: return .blue
        case .back: return .green
        case .legs: return .red
        case .shoulders: return .orange
        case .arms: return .purple
        case .core: return .yellow
        case .cardio: return .pink
        }
    }
}

#Preview {
    ExercisePickerView { _ in }
}
