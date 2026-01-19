// ============================================
// YOROI WATCH - Vue Carnet / Records Évoluée
// Ajout de performances avec sélection d'exercices
// ============================================

import SwiftUI

struct RecordsView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var showExercisePicker = false
    @State private var selectedExercise: String?
    @State private var showEntrySheet = false
    
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
                    showExercisePicker = true 
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

                // Liste des records
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
                    ForEach(healthManager.records) { record in
                        PerformanceRow(record: record)
                    }
                }
            }
            .padding(.bottom, 16)
        }
        .background(Color.black)
        .sheet(isPresented: $showExercisePicker) {
            NavigationView {
                CategoryPickerView(selectedExercise: $selectedExercise, isPresented: $showExercisePicker)
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
                Text("\(Int(record.weight))")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                Text("KG")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.yellow)
                
                Spacer()
                
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
}

// MARK: - Sélecteur de Catégorie
struct CategoryPickerView: View {
    @Binding var selectedExercise: String?
    @Binding var isPresented: Bool
    
    var body: some View {
        List(ExerciseDatabase.categories) { cat in
            NavigationLink(destination: ExerciseListView(category: cat, selectedExercise: $selectedExercise, isPresented: $isPresented)) {
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
        .navigationTitle("MUSCLES")
    }
}

// MARK: - Liste des Exercices
struct ExerciseListView: View {
    let category: ExerciseCategory
    @Binding var selectedExercise: String?
    @Binding var isPresented: Bool
    
    var body: some View {
        List(category.exercises, id: \.self) { ex in
            NavigationLink(destination: AddPerformanceSheet(exercise: ex, isPresented: $isPresented)) {
                Text(ex)
                    .font(.system(size: 13))
                    .padding(.vertical, 4)
            }
        }
        .listStyle(.carousel)
        .navigationTitle(category.name)
    }
}

// MARK: - Sheet Ajout Poids/Reps
struct AddPerformanceSheet: View {
    let exercise: String
    @Binding var isPresented: Bool
    @StateObject private var healthManager = HealthManager.shared
    
    @State private var weight: Double = 60.0
    @State private var reps: Int = 10
    
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text(exercise.uppercased())
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.yellow)
                    .multilineTextAlignment(.center)
                    .padding(.top, 5)
                
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
                
                Button(action: {
                    healthManager.addRecord(exercise: exercise, weight: weight, reps: reps)
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
        }
        .background(Color.black)
        .navigationTitle("DÉTAILS")
    }
}

#Preview {
    RecordsView()
}
