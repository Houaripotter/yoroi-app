// ============================================
// YOROI WATCH - Vue Hydratation
// Bouteille animée avec vagues + Options avancées
// ============================================

import SwiftUI

struct HydrationView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var waveOffset: CGFloat = 0
    @State private var isAnimating: Bool = false
    @State private var customAmount: Double = 100
    @State private var bottleScale: CGFloat = 1.0

    var progress: Double {
        min(healthManager.waterIntake / max(1, healthManager.waterGoal), 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // SECTION 1: VISUEL PRINCIPAL
                VStack(spacing: 4) {
                    // Bouteille animée
                    TimelineView(.animation) { (timeline: TimelineViewDefaultContext) in
                        let now = timeline.date.timeIntervalSinceReferenceDate
                        let angle = now.remainder(dividingBy: 2) * .pi * 2
                        
                        ZStack {
                            WaterBottleShape()
                                .stroke(Color.cyan.opacity(0.3), lineWidth: 2)
                                .frame(width: 50, height: 70)
                            
                            WaterBottleShape()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.cyan, Color.cyan.opacity(0.7)]),
                                        startPoint: .bottom,
                                        endPoint: .top
                                    )
                                )
                                .frame(width: 50, height: 70)
                                .mask(
                                    GeometryReader { geo in
                                        VStack {
                                            Spacer(minLength: 0)
                                            WaveShape(offset: CGFloat(angle), percent: progress)
                                                .fill(Color.cyan)
                                                .frame(height: geo.size.height * CGFloat(progress))
                                        }
                                    }
                                )
                                .clipShape(WaterBottleShape())
                        }
                        .scaleEffect(bottleScale)
                    }
                    .frame(height: 70)
                    .padding(.top, 0) // Supprimé padding négatif ou positif, on colle au haut
                    
                    // Valeur centrale
                    VStack(spacing: 0) {
                        Text("\(Int(healthManager.waterIntake)) ml")
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundColor(.cyan)
                        Text("OBJECTIF: \(Int(healthManager.waterGoal))ml")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.gray)
                    }
                    
                    // Contrôles Rapides
                    HStack(spacing: 6) {
                        Button(action: { animateWaterAdd( -250) }) {
                            Image(systemName: "minus").font(.system(size: 12, weight: .bold))
                                .frame(width: 32, height: 32).background(Color.red.opacity(0.2)).clipShape(Circle())
                        }.buttonStyle(.plain)
                        
                        Button(action: { animateWaterAdd(250) }) {
                            Text("+250").font(.system(size: 11, weight: .black))
                                .frame(width: 48, height: 32).background(Color.cyan).foregroundColor(.black).cornerRadius(16)
                        }.buttonStyle(.plain)
                        
                        Button(action: { animateWaterAdd(500) }) {
                            Text("+500").font(.system(size: 11, weight: .black))
                                .frame(width: 48, height: 32).background(Color.blue).foregroundColor(.white).cornerRadius(16)
                        }.buttonStyle(.plain)
                    }
                }
                .padding(.bottom, 10)
                
                // SECTION 2: OPTIONS AVANCÉES
                VStack(spacing: 8) {
                    Divider().background(Color.gray.opacity(0.3)).padding(.horizontal, 10)
                    
                    Text("PRÉCIS")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.gray)
                    
                    HStack {
                        Button(action: { if customAmount > 50 { customAmount -= 50 } }) {
                            Image(systemName: "minus.circle.fill").foregroundColor(.gray)
                        }.buttonStyle(.plain)
                        
                        Text("\(Int(customAmount))")
                            .font(.system(size: 14, weight: .bold))
                            .frame(minWidth: 40)
                        
                        Button(action: { customAmount += 50 }) {
                            Image(systemName: "plus.circle.fill").foregroundColor(.gray)
                        }.buttonStyle(.plain)
                        
                        Button(action: { animateWaterAdd(customAmount) }) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.cyan)
                                .font(.system(size: 24))
                        }.buttonStyle(.plain)
                    }
                    .padding(6)
                    .background(Color.gray.opacity(0.12))
                    .cornerRadius(12)
                    .focusable(true)
                    .digitalCrownRotation($customAmount, from: 0, through: 2000, by: 50, sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)
                    
                    // MODIFIER L'OBJECTIF
                    HStack {
                        Text("OBJ.")
                            .font(.system(size: 9, weight: .black))
                            .foregroundColor(.orange)
                        Spacer()
                        Button(action: { if healthManager.waterGoal > 500 { healthManager.waterGoal -= 250; healthManager.savePersistedData() } }) {
                            Image(systemName: "minus.square.fill").foregroundColor(.gray)
                        }.buttonStyle(.plain)
                        Text("\(Int(healthManager.waterGoal))").font(.system(size: 12, weight: .bold)).frame(minWidth: 45)
                        Button(action: { healthManager.waterGoal += 250; healthManager.savePersistedData() }) {
                            Image(systemName: "plus.square.fill").foregroundColor(.gray)
                        }.buttonStyle(.plain)
                    }
                    .padding(8)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(10)
                }
                .padding(.horizontal, 4)
                .padding(.bottom, 20)
            }
        }
        .background(Color.black)
    }
    
    private func animateWaterAdd(_ amount: Double) {
        if amount > 0 {
            healthManager.addWater(amount)
            WKInterfaceDevice.current().play(.click)
            
            // Animation de la bouteille
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                bottleScale = 1.2
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(.spring()) {
                    bottleScale = 1.0
                }
            }
        } else {
            healthManager.removeWater(abs(amount))
            WKInterfaceDevice.current().play(.directionUp)
        }
    }
}

#Preview {
    HydrationView()
}
