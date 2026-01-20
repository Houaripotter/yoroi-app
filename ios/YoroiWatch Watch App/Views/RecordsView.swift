// ============================================
// YOROI WATCH - Vue Carnet / Records Évoluée
// Ajout de performances avec sélection d'exercices
// ============================================

import SwiftUI

struct RecordsView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var showExercisePicker = false
    
    var body: some View {
        NavigationView {
            List {
                // SECTION BIBLIOTHÈQUE DE SPORTS
                Section(header: Text("BIBLIOTHÈQUE").font(.system(size: 10, weight: .black))) {
                    ForEach(ExerciseDatabase.sports) { sport in
                        NavigationLink(destination: SportRecordsDetailView(sportName: sport.name)) {
                            HStack(spacing: 12) {
                                Image(systemName: sport.icon)
                                    .foregroundColor(.yellow)
                                    .font(.system(size: 16))
                                    .frame(width: 24)
                                
                                Text(sport.name)
                                    .font(.system(size: 13, weight: .bold))
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                
                // BOUTON AJOUT RAPIDE
                Section {
                    Button(action: { 
                        WKInterfaceDevice.current().play(.click)
                        showExercisePicker = true 
                    }) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("NOUVEAU RECORD")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .foregroundColor(.yellow)
                    }
                }
            }
            .listStyle(.carousel)
            .navigationTitle("RECORDS")
            .sheet(isPresented: $showExercisePicker) {
                NavigationView {
                    SportPickerRootView(isPresented: $showExercisePicker)
                }
            }
        }
    }
}

// MARK: - Vue Détails des Records d'un Sport
struct SportRecordsDetailView: View {
    let sportName: String
    @StateObject private var healthManager = HealthManager.shared
    
    var filteredRecords: [(name: String, items: [ExerciseRecord])] {
        let sportRecords = healthManager.records.filter { $0.category.uppercased() == sportName.uppercased() }
        let grouped = Dictionary(grouping: sportRecords, by: { $0.muscleGroup })
        
        return grouped.map { name, items in
            (name: name, items: items)
        }.sorted { $0.name < $1.name }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if filteredRecords.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "trophy.slash")
                            .font(.system(size: 30))
                            .foregroundColor(.gray.opacity(0.5))
                        Text("Aucun record en \(sportName.lowercased())")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                } else {
                    ForEach(filteredRecords, id: \.name) { group in
                        VStack(alignment: .leading, spacing: 6) {
                            if group.name != "GÉNÉRAL" {
                                Text(group.name)
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundColor(.gray)
                                    .padding(.horizontal, 8)
                                    .padding(.top, 5)
                            }
                            
                            ForEach(group.items) { record in
                                PerformanceRow(record: record)
                            }
                        }
                    }
                }
            }
            .padding(.bottom, 20)
        }
        .navigationTitle(sportName)
        .background(Color.black)
    }
}

// MARK: - Racine du sélecteur (Sport)
struct SportPickerRootView: View {
    @Binding var isPresented: Bool
    
    var body: some View {
        List(ExerciseDatabase.sports) { sport in
            NavigationLink(destination: SubCategoryPickerView(sport: sport, isPresented: $isPresented)) {
                HStack(spacing: 10) {
                    Image(systemName: sport.icon)
                        .foregroundColor(.yellow)
                    Text(sport.name)
                        .font(.system(size: 13, weight: .bold))
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("SPORTS")
    }
}

// MARK: - Sélecteur de Muscle / Distance
struct SubCategoryPickerView: View {
    let sport: SportCategory
    @Binding var isPresented: Bool
    
    var body: some View {
        List(sport.subCategories) { cat in
            NavigationLink(destination: ExerciseSelectionListView(category: cat, sportName: sport.name, isPresented: $isPresented)) {
                HStack(spacing: 10) {
                    Image(systemName: cat.icon)
                        .foregroundColor(.yellow)
                    Text(cat.name)
                        .font(.system(size: 13, weight: .bold))
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle(sport.name)
    }
}

// MARK: - Liste des Exercices finaux
struct ExerciseSelectionListView: View {
    let category: ExerciseCategory
    let sportName: String
    @Binding var isPresented: Bool
    
    var body: some View {
        List(category.exercises, id: \.self) { ex in
            NavigationLink(destination: AddPerformanceFinalView(exercise: ex, category: sportName, muscleGroup: category.name, isPresented: $isPresented)) {
                Text(ex)
                    .font(.system(size: 13))
                    .padding(.vertical, 4)
            }
        }
        .navigationTitle(category.name)
    }
}

// MARK: - Vue de saisie finale
struct AddPerformanceFinalView: View {
    let exercise: String
    let category: String
    let muscleGroup: String
    @Binding var isPresented: Bool
    @StateObject private var healthManager = HealthManager.shared
    
    @State private var weight: Double = 60.0
    @State private var reps: Int = 10
    
    @State private var hours: Int = 0
    @State private var minutes: Int = 30
    @State private var seconds: Int = 0
    
    var isRunning: Bool { category == "RUNNING" }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text(exercise.uppercased())
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.yellow)
                    .multilineTextAlignment(.center)
                
                if isRunning {
                    HStack(spacing: 2) {
                        Picker("H", selection: $hours) { ForEach(0..<24) { Text("\($0)h").tag($0) } }.labelsHidden().frame(width: 40)
                        Picker("M", selection: $minutes) { ForEach(0..<60) { Text("\($0)m").tag($0) } }.labelsHidden().frame(width: 40)
                        Picker("S", selection: $seconds) { ForEach(0..<60) { Text("\($0)s").tag($0) } }.labelsHidden().frame(width: 40)
                    }
                    .frame(height: 80)
                } else {
                    VStack(spacing: 4) {
                        Text("\(Int(weight)) KG")
                            .font(.system(size: 32, weight: .black, design: .rounded))
                            .focusable(true)
                            .digitalCrownRotation($weight, from: 0, through: 500, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
                        
                        Stepper(value: $reps, in: 1...100) {
                            Text("\(reps) REPS")
                                .font(.system(size: 18, weight: .bold))
                        }
                    }
                }
                
                Button(action: {
                    let finalValue = isRunning ? Double(hours * 3600 + minutes * 60 + seconds) : weight
                    healthManager.addRecord(exercise: exercise, weight: finalValue, reps: reps, category: category, muscleGroup: muscleGroup)
                    WKInterfaceDevice.current().play(.success)
                    isPresented = false
                }) {
                    Text("ENREGISTRER")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.black)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity)
                        .background(Color.yellow)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 8)
        }
        .navigationTitle("SAISIE")
    }
}

// Les structures PerformanceRow et formatage restent identiques mais nettoyées...
struct PerformanceRow: View {
    let record: ExerciseRecord
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(record.exercise.uppercased()).font(.system(size: 11, weight: .black)).foregroundColor(.yellow)
                Spacer()
                Text(formatDate(record.date)).font(.system(size: 9)).foregroundColor(.gray)
            }
            HStack(alignment: .lastTextBaseline, spacing: 4) {
                if record.category == "RUNNING" {
                    Text(formatTime(Int(record.weight))).font(.system(size: 24, weight: .black, design: .rounded)).foregroundColor(.white)
                } else {
                    Text("\(Int(record.weight))").font(.system(size: 28, weight: .black, design: .rounded)).foregroundColor(.white)
                    Text("KG").font(.system(size: 12, weight: .bold)).foregroundColor(.yellow)
                    Spacer()
                    Text("×").font(.system(size: 16)).foregroundColor(.gray)
                    Text("\(record.reps)").font(.system(size: 24, weight: .bold, design: .rounded)).foregroundColor(.white)
                    Text("REPS").font(.system(size: 10, weight: .bold)).foregroundColor(.gray)
                }
            }
        }
        .padding(12).background(Color.gray.opacity(0.12)).cornerRadius(16).padding(.horizontal, 8)
    }
    func formatDate(_ date: Date) -> String { let f = DateFormatter(); f.dateFormat = "dd MMM"; return f.string(from: date) }
    func formatTime(_ s: Int) -> String { let h = s / 3600; let m = (s % 3600) / 60; let sec = s % 60; return h > 0 ? String(format: "%dh%02d", h, m) : String(format: "%dm%02d", m, sec) }
}


#Preview {
    RecordsView()
}
