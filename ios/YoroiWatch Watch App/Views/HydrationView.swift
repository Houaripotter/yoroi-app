// ============================================
// YOROI WATCH - Vue Hydratation
// Bouteille animée avec vagues
// ============================================

import SwiftUI

struct HydrationView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var waveOffset: CGFloat = 0
    @State private var isAnimating: Bool = false

    private let goal: Double = 3000 // mL

    var progress: Double {
        min(healthManager.waterIntake / goal, 1.0)
    }

    var body: some View {
        VStack(spacing: 6) {
            // Titre compact
            HStack(spacing: 4) {
                Image(systemName: "drop.fill")
                    .font(.system(size: 10))
                    .foregroundColor(.cyan)
                Text("HYDRATATION")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.cyan)
            }
            .padding(.top, 2)
            
            // Bouteille animée plus petite pour libérer de l'espace
            TimelineView(.animation) { timeline in
                let now = timeline.date.timeIntervalSinceReferenceDate
                let angle = now.remainder(dividingBy: 2) * .pi * 2
                
                ZStack {
                    WaterBottleShape()
                        .stroke(Color.cyan.opacity(0.3), lineWidth: 2)
                        .frame(width: 60, height: 75)
                    
                    WaterBottleShape()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.cyan, Color.cyan.opacity(0.7)]),
                                startPoint: .bottom,
                                endPoint: .top
                            )
                        )
                        .frame(width: 60, height: 75)
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
            }
            .frame(height: 75)
            
            // Valeur centrale
            Text("\(Int(healthManager.waterIntake)) ml")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundColor(.cyan)
            
            // Contrôles sur une seule ligne horizontale
            HStack(spacing: 6) {
                // Bouton MOINS
                Button(action: { 
                    healthManager.removeWater(250)
                    WKInterfaceDevice.current().play(.directionUp)
                }) {
                    Image(systemName: "minus")
                        .font(.system(size: 14, weight: .bold))
                        .frame(width: 32, height: 32)
                        .background(Color.red.opacity(0.2))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                
                // Bouton +250
                Button(action: { 
                    healthManager.addWater(250)
                    WKInterfaceDevice.current().play(.click)
                }) {
                    Text("+250")
                        .font(.system(size: 11, weight: .bold))
                        .frame(width: 48, height: 32)
                        .background(Color.cyan)
                        .foregroundColor(.black)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                // Bouton +500
                Button(action: { 
                    healthManager.addWater(500)
                    WKInterfaceDevice.current().play(.click)
                }) {
                    Text("+500")
                        .font(.system(size: 11, weight: .bold))
                        .frame(width: 48, height: 32)
                        .background(Color.cyan)
                        .foregroundColor(.black)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding(.bottom, 2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

// Forme de la bouteille
struct WaterBottleShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()

        let width = rect.width
        let height = rect.height

        // Goulot
        let neckWidth = width * 0.4
        let neckHeight = height * 0.15
        let neckX = (width - neckWidth) / 2

        // Corps
        let bodyTop = neckHeight
        let cornerRadius: CGFloat = 15

        path.move(to: CGPoint(x: neckX, y: 0))
        path.addLine(to: CGPoint(x: neckX + neckWidth, y: 0))
        path.addLine(to: CGPoint(x: neckX + neckWidth, y: bodyTop))

        // Épaule droite
        path.addQuadCurve(
            to: CGPoint(x: width - cornerRadius, y: bodyTop + 15),
            control: CGPoint(x: width, y: bodyTop)
        )

        // Côté droit
        path.addLine(to: CGPoint(x: width, y: height - cornerRadius))

        // Coin bas droit
        path.addQuadCurve(
            to: CGPoint(x: width - cornerRadius, y: height),
            control: CGPoint(x: width, y: height)
        )

        // Bas
        path.addLine(to: CGPoint(x: cornerRadius, y: height))

        // Coin bas gauche
        path.addQuadCurve(
            to: CGPoint(x: 0, y: height - cornerRadius),
            control: CGPoint(x: 0, y: height)
        )

        // Côté gauche
        path.addLine(to: CGPoint(x: 0, y: bodyTop + 15))

        // Épaule gauche
        path.addQuadCurve(
            to: CGPoint(x: neckX, y: bodyTop),
            control: CGPoint(x: 0, y: bodyTop)
        )

        path.closeSubpath()

        return path
    }
}

// Forme des vagues
struct WaveShape: Shape {
    var offset: CGFloat
    var percent: Double

    var animatableData: CGFloat {
        get { offset }
        set { offset = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()

        let waveHeight: CGFloat = 5
        let width = rect.width
        let height = rect.height

        path.move(to: CGPoint(x: 0, y: waveHeight))

        for x in stride(from: 0, through: width, by: 1) {
            let relativeX = x / width
            let sine = sin(relativeX * .pi * 2 + offset)
            let y = waveHeight + sine * waveHeight
            path.addLine(to: CGPoint(x: x, y: y))
        }

        path.addLine(to: CGPoint(x: width, y: height))
        path.addLine(to: CGPoint(x: 0, y: height))
        path.closeSubpath()

        return path
    }
}

#Preview {
    HydrationView()
}
