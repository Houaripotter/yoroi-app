// ============================================
// YOROI WATCH - Vue Poids Interactive
// Graphique scrollable avec Digital Crown
// ============================================

import SwiftUI

struct WeightView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var showAddWeight = false
    @State private var selectedIndex: Int = 0
    @State private var crownValue: Double = 0.0
    
    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // TITRE
                Text("POIDS")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.orange)
                    .padding(.top, 5)
                
                // AFFICHAGE DU POINT SÉLECTIONNÉ
                if !healthManager.weightHistory.isEmpty {
                    let entry = healthManager.weightHistory[min(selectedIndex, healthManager.weightHistory.count - 1)]
                    
                    VStack(spacing: 0) {
                        Text(formatFullDate(entry.date))
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.gray)
                        
                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text(String(format: "%.1f", entry.weight))
                                .font(.system(size: 32, weight: .black, design: .rounded))
                            Text("KG")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.orange)
                        }
                    }
                    .padding(.vertical, 4)
                }

                // GRAPHIQUE INTERACTIF (Focus sur Digital Crown)
                ZStack {
                    InteractiveWeightChart(data: healthManager.weightHistory, selectedIndex: selectedIndex)
                        .frame(height: 80)
                        .focusable(true)
                        .digitalCrownRotation($crownValue, from: 0, through: Double(max(0, healthManager.weightHistory.count - 1)), by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
                        .onChange(of: crownValue) { newValue in
                            selectedIndex = Int(newValue)
                        }
                    
                    // Overlay instructions
                    if healthManager.weightHistory.count > 1 {
                        VStack {
                            Spacer()
                            HStack {
                                Image(systemName: "applewatch.side.right")
                                Text("Tourner pour défiler")
                            }
                            .font(.system(size: 7, weight: .bold))
                            .foregroundColor(.gray.opacity(0.5))
                        }
                    }
                }
                .padding(.horizontal, 4)

                // BOUTON AJOUTER
                Button(action: { 
                    WKInterfaceDevice.current().play(.click)
                    showAddWeight = true 
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("NOUVELLE PESÉE")
                            .font(.system(size: 12, weight: .black))
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.orange)
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)
                
                Spacer(minLength: 20)
            }
        }
        .background(Color.black)
        .onAppear {
            if !healthManager.weightHistory.isEmpty {
                selectedIndex = healthManager.weightHistory.count - 1
                crownValue = Double(selectedIndex)
            }
        }
        .sheet(isPresented: $showAddWeight) {
            AddWeightView()
        }
    }
    
    func formatFullDate(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "EEEE d MMMM"
        f.locale = Locale(identifier: "fr_FR")
        return f.string(from: date).uppercased()
    }
}

struct AddWeightView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var healthManager = HealthManager.shared
    @State private var weightValue: Double = 75.0
    
    var body: some View {
        VStack(spacing: 10) {
            Text("NOUVEAU POIDS")
                .font(.system(size: 12, weight: .black))
                .foregroundColor(.orange)
            
            VStack(spacing: 0) {
                Text(String(format: "%.1f", weightValue))
                    .font(.system(size: 44, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .focusable(true)
                    .digitalCrownRotation($weightValue, from: 30, through: 250, by: 0.1, sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)
                
                Text("KG")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.orange)
            }
            .padding(.vertical, 5)
            
            Button(action: {
                healthManager.saveWeight(weightValue)
                WKInterfaceDevice.current().play(.success)
                dismiss()
            }) {
                Text("ENREGISTRER")
                    .font(.system(size: 14, weight: .black))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.orange)
                    .foregroundColor(.black)
                    .cornerRadius(12)
            }
            .buttonStyle(.plain)
        }
        .onAppear {
            // Initialiser avec le dernier poids connu
            if healthManager.currentWeight > 0 {
                weightValue = healthManager.currentWeight
            }
        }
    }
}

struct InteractiveWeightChart: View {
    let data: [(date: Date, weight: Double)]
    let selectedIndex: Int
    
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let maxW = data.map { $0.weight }.max() ?? 100
            let minW = data.map { $0.weight }.min() ?? 50
            let range = max(1, maxW - minW)
            
            ZStack {
                // Ligne de base
                Path { path in
                    guard data.count > 1 else { return }
                    for (i, entry) in data.enumerated() {
                        let x = CGFloat(i) / CGFloat(data.count - 1) * w
                        let y = h - CGFloat((entry.weight - minW) / range) * h
                        if i == 0 { path.move(to: CGPoint(x: x, y: y)) }
                        else { path.addLine(to: CGPoint(x: x, y: y)) }
                    }
                }
                .stroke(Color.orange.opacity(0.3), lineWidth: 2)
                
                // Point sélectionné
                if !data.isEmpty && selectedIndex < data.count {
                    let entry = data[selectedIndex]
                    let x = CGFloat(selectedIndex) / CGFloat(max(1, data.count - 1)) * w
                    let y = h - CGFloat((entry.weight - minW) / range) * h
                    
                    // Ligne verticale indicateur
                    Path { path in
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: h))
                    }
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    
                    Circle()
                        .fill(Color.orange)
                        .frame(width: 8, height: 8)
                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                        .position(x: x, y: y)
                }
            }
        }
    }
}