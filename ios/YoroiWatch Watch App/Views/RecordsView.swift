// ============================================
// YOROI WATCH - Vue Carnet / Records Évoluée
// Ajout de performances avec sélection d'exercices
// ============================================

import SwiftUI

struct RecordsView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var showSportPicker = false
    @State private var selectedExercise: String?
    @State private var selectedCategory: String = "musculation"
    @State private var selectedMuscle: String = "GÉNÉRAL"
    @State private var showEntrySheet = false
    
    // Groupement des records existants
    var groupedRecords: [(sport: String, categories: [(name: String, items: [ExerciseRecord])])] {
        // Grouper par Sport (Category principale)
        let bySport = Dictionary(grouping: healthManager.records, by: { $0.category }) // Utilise category comme sport (ex: musculation, running)
        
        return bySport.map { sport, records in
            // Grouper par Sous-catégorie (MuscleGroup)
            let bySubCat = Dictionary(grouping: records, by: { $0.muscleGroup })
            let sortedSubCats = bySubCat.map { name, items in
                (name: name, items: items)
            }.sorted(by: { $0.name < $0.name })
            
            return (sport: sport, categories: sortedSubCats)
        }.sorted(by: { $0.sport < $0.sport })
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Header CARNET
                HStack(spacing: 6) {
                    Image(systemName: "list.bullet.clipboard.fill")
                        .foregroundColor(.yellow)
                    Text("CARNET")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.yellow)
                }
                .padding(.top, 8)
                
                // Bouton Ajouter
                Button(action: { 
                    WKInterfaceDevice.current().play(.click)
                    showSportPicker = true 
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("AJOUTER")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.yellow)
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)

                // Liste des records groupés
                if healthManager.records.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "trophy.slash")
                            .font(.system(size: 30))
                            .foregroundColor(.gray.opacity(0.5))
                        Text("Aucun record")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                    .padding(.top, 20)
                } else {
                    ForEach(groupedRecords, id: \.sport) { group in
                        VStack(alignment: .leading, spacing: 10) {
                            // Header Sport (ex: MUSCULATION)
                            Text(group.sport.uppercased())
                                .font(.system(size: 12, weight: .black))
                                .foregroundColor(.yellow)
                                .padding(.horizontal, 8)
                                .padding(.top, 10)
                            
                            ForEach(group.categories, id: \.name) { subCat in
                                VStack(alignment: .leading, spacing: 6) {
                                    // Header Sous-catégorie (ex: PECTORAUX, 5K)
                                    if subCat.name != "GÉNÉRAL" {
                                        Text(subCat.name)
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(.gray)
                                            .padding(.horizontal, 8)
                                    }
                                    
                                    ForEach(subCat.items) { record in
                                        PerformanceRow(record: record)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding(.bottom, 16)
        }
        .background(Color.black)
        .sheet(isPresented: $showSportPicker) {
            NavigationView {
                SportPickerView(selectedExercise: $selectedExercise, selectedCategory: $selectedCategory, selectedMuscle: $selectedMuscle, isPresented: $showSportPicker, showEntry: $showEntrySheet)
            }
        }
        .sheet(isPresented: $showEntrySheet) {
            if let exercise = selectedExercise {
                AddPerformanceSheet(exercise: exercise, category: selectedCategory, muscleGroup: selectedMuscle, isPresented: $showEntrySheet)
            }
        }
    }
}

// MARK: - Row Performance
struct PerformanceRow: View {
    let record: ExerciseRecord
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(record.exercise.uppercased())
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.yellow)
                Spacer()
                Text(formatDate(record.date))
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.gray)
            }
            
            HStack(alignment: .lastTextBaseline, spacing: 4) {
                if record.category == "RUNNING" {
                    Text(formatTime(Int(record.weight))) // Weight utilisé pour stocker le temps en secondes pour le running
                        .font(.system(size: 24, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                } else {
                    Text("\(Int(record.weight))")
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("KG")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.yellow)
                }
                
                Spacer()
                
                if record.category != "RUNNING" {
                    Text("×")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.gray)
                    
                    Text("\(record.reps)")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("REPS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(12)
        .background(Color.gray.opacity(0.12))
        .cornerRadius(16)
        .padding(.horizontal, 8)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd MMM"
        return formatter.string(from: date)
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 {
            return String(format: "%dh%02d", h, m)
        }
        return String(format: "%dm%02d", m, s)
    }
}

// MARK: - Sélecteur de Sport (Racine)
struct SportPickerView: View {
    @Binding var selectedExercise: String?
    @Binding var selectedCategory: String
    @Binding var selectedMuscle: String
    @Binding var isPresented: Bool
    @Binding var showEntry: Bool
    
    var body: some View {
        List(ExerciseDatabase.sports) { sport in
            NavigationLink(destination: CategoryPickerView(sport: sport, selectedExercise: $selectedExercise, selectedCategory: $selectedCategory, selectedMuscle: $selectedMuscle, isPresented: $isPresented, showEntry: $showEntry)) {
                HStack(spacing: 10) {
                    Image(systemName: sport.icon)
                        .font(.system(size: 16))
                        .foregroundColor(.yellow)
                        .frame(width: 24)
                    
                    Text(sport.name)
                        .font(.system(size: 13, weight: .bold))
                }
                .padding(.vertical, 4)
            }
        }
        .listStyle(.carousel)
        .navigationTitle("SPORTS")
    }
}

// MARK: - Sélecteur de Sous-Catégorie (ex: Muscles ou Distances)
struct CategoryPickerView: View {
    let sport: SportCategory
    @Binding var selectedExercise: String?
    @Binding var selectedCategory: String
    @Binding var selectedMuscle: String
    @Binding var isPresented: Bool
    @Binding var showEntry: Bool
    
    var body: some View {
        List(sport.subCategories) { cat in
            NavigationLink(destination: ExerciseListView(category: cat, sportName: sport.name, selectedExercise: $selectedExercise, selectedCategory: $selectedCategory, selectedMuscle: $selectedMuscle, isPresented: $isPresented, showEntry: $showEntry)) {
                HStack(spacing: 10) {
                    Image(systemName: cat.icon)
                        .font(.system(size: 16))
                        .foregroundColor(.yellow)
                        .frame(width: 24)
                    
                    Text(cat.name)
                        .font(.system(size: 13, weight: .bold))
                }
                .padding(.vertical, 4)
            }
        }
        .listStyle(.carousel)
        .navigationTitle(sport.name)
    }
}

// MARK: - Liste des Exercices
struct ExerciseListView: View {
    let category: ExerciseCategory
    let sportName: String
    @Binding var selectedExercise: String?
    @Binding var selectedCategory: String
    @Binding var selectedMuscle: String
    @Binding var isPresented: Bool
    @Binding var showEntry: Bool
    
    var body: some View {
        List(category.exercises, id: \.self) { ex in
            Button(action: {
                selectedExercise = ex
                selectedCategory = sportName
                selectedMuscle = category.name
                isPresented = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    showEntry = true
                }
            }) {
                Text(ex)
                    .font(.system(size: 13))
                    .padding(.vertical, 4)
            }
        }
        .listStyle(.carousel)
        .navigationTitle(category.name)
    }
}

struct AddPerformanceSheet: View {
    let exercise: String
    let category: String
    let muscleGroup: String
    @Binding var isPresented: Bool
    @StateObject private var healthManager = HealthManager.shared
    
    // Pour Running: weight = temps en secondes, reps = 0 (ou distance exacte si besoin)
    @State private var weight: Double = 60.0 // KG ou SECONDES
    @State private var reps: Int = 10
    
    // Pour Running (Temps)
    @State private var hours: Int = 0
    @State private var minutes: Int = 30
    @State private var seconds: Int = 0
    
    var isRunning: Bool {
        return category == "RUNNING"
    }
    
    // Trouver l'ancien record pour cet exercice (Ghost Set)
    var lastRecord: ExerciseRecord? {
        healthManager.records.first(where: { $0.exercise.lowercased() == exercise.lowercased() })
    }
    
    var body: some View {
        VStack(spacing: 8) {
            Text(exercise.uppercased())
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.yellow)
                .multilineTextAlignment(.center)
            
            // AFFICHAGE GHOST SET
            if let last = lastRecord {
                HStack(spacing: 4) {
                    Image(systemName: "ghost.fill")
                    if isRunning {
                        Text("DERNIER : \(formatTime(Int(last.weight)))")
                    } else {
                        Text("DERNIER : \(Int(last.weight))KG x \(last.reps)")
                    }
                }
                .font(.system(size: 9, weight: .black))
                .foregroundColor(.yellow.opacity(0.6))
                .padding(.vertical, 2)
                .padding(.horizontal, 8)
                .background(Color.yellow.opacity(0.1))
                .cornerRadius(4)
            }
            
            Spacer()
            
            if isRunning {
                // Saisie TEMPS pour Running
                HStack(spacing: 2) {
                    Picker("H", selection: $hours) {
                        ForEach(0..<24) { i in Text("\(i)h").tag(i) }
                    }
                    .labelsHidden()
                    .frame(width: 45, height: 70)
                    
                    Picker("M", selection: $minutes) {
                        ForEach(0..<60) { i in Text("\(i)m").tag(i) }
                    }
                    .labelsHidden()
                    .frame(width: 45, height: 70)
                    
                    Picker("S", selection: $seconds) {
                        ForEach(0..<60) { i in Text("\(i)s").tag(i) }
                    }
                    .labelsHidden()
                    .frame(width: 45, height: 70)
                }
            } else {
                // Saisie POIDS / REPS pour Muscu
                HStack {
                    // POIDS
                    VStack {
                        Text("\(Int(weight))")
                            .font(.system(size: 36, weight: .black, design: .rounded))
                            .focusable(true)
                            .digitalCrownRotation($weight, from: 0, through: 400, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
                        Text("KG")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.gray)
                    }
                    
                    Text("×")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.yellow)
                        .padding(.horizontal, 5)
                    
                    // REPS
                    VStack {
                        Text("\(reps)")
                            .font(.system(size: 36, weight: .black, design: .rounded))
                        
                        HStack(spacing: 10) {
                            Button(action: { if reps > 1 { reps -= 1 } }) {
                                Image(systemName: "minus.circle.fill")
                                    .font(.system(size: 24))
                            }
                            .buttonStyle(.plain)
                            
                            Button(action: { reps += 1 }) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 24))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.vertical, 10)
            }
            
            Button(action: {
                let finalValue = isRunning ? Double(hours * 3600 + minutes * 60 + seconds) : weight
                
                healthManager.addRecord(
                    exercise: exercise, 
                    weight: finalValue, 
                    reps: reps, 
                    category: category, 
                    muscleGroup: muscleGroup
                )
                
                WKInterfaceDevice.current().play(.success)
                isPresented = false
            }) {
                Text("ENREGISTRER")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.yellow)
                    .cornerRadius(12)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
        .background(Color.black)
        .navigationTitle("DÉTAILS")
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 {
            return String(format: "%dh%02d", h, m)
        }
        return String(format: "%dm%02d", m, s)
    }
}

#Preview {
    RecordsView()
}
