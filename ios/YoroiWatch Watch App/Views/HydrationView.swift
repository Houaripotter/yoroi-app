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
        VStack(spacing: 12) {
            // Titre
            HStack(spacing: 6) {
                Image(systemName: "drop.fill")
                    .foregroundColor(.cyan)
                Text("HYDRATATION")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.cyan)
            }
            .padding(.top, 8)

            // Bouteille animée
            ZStack {
                // Contour bouteille
                WaterBottleShape()
                    .stroke(Color.cyan.opacity(0.3), lineWidth: 3)
                    .frame(width: 100, height: 80)

                // Eau avec vagues
                WaterBottleShape()
                    .fill(Color.cyan.opacity(0.8))
                    .frame(width: 100, height: 80)
                    .mask(
                        GeometryReader { geo in
                            VStack {
                                Spacer()
                                WaveShape(offset: waveOffset, percent: progress)
                                    .fill(Color.cyan)
                                    .frame(height: geo.size.height * progress)
                            }
                        }
                    )
                    .clipShape(WaterBottleShape())
            }
            .onAppear {
                // Ne lancer l'animation que si pas en mode économie d'énergie
                guard !ProcessInfo.processInfo.isLowPowerModeEnabled else { return }

                isAnimating = true
                withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
                    waveOffset = .pi * 2
                }
            }
            // CORRECTION MEMORY LEAK: Arrêter l'animation quand la vue disparaît
            .onDisappear {
                isAnimating = false
                waveOffset = 0
            }
            // Observer le mode économie d'énergie
            .onReceive(NotificationCenter.default.publisher(for: Notification.Name.NSProcessInfoPowerStateDidChange)) { _ in
                if ProcessInfo.processInfo.isLowPowerModeEnabled {
                    // Arrêter l'animation
                    isAnimating = false
                    waveOffset = 0
                } else if !isAnimating {
                    // Relancer l'animation si pas active
                    isAnimating = true
                    withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
                        waveOffset = .pi * 2
                    }
                }
            }

            // Valeurs
            HStack(alignment: .bottom, spacing: 4) {
                Text("\(Int(healthManager.waterIntake))")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.cyan)

                Text("/ \(Int(goal)) ml")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                    .padding(.bottom, 4)
            }

            // Boutons d'action
            HStack(spacing: 8) {
                // Retirer
                Button(action: { healthManager.removeWater(250) }) {
                    Text("-")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                        // CORRECTION: Augmenté de 44x44 à 50x50 (minimum recommandé + marge)
                        .frame(width: 50, height: 50)
                        .background(Color.red.opacity(0.8))
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)

                // +250
                Button(action: { healthManager.addWater(250) }) {
                    Text("+250")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.black)
                        // CORRECTION: Augmenté hauteur de 44 à 50
                        .frame(width: 60, height: 50)
                        .background(Color.cyan)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)

                // +500
                Button(action: { healthManager.addWater(500) }) {
                    Text("+500")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.black)
                        // CORRECTION: Augmenté hauteur de 44 à 50
                        .frame(width: 60, height: 50)
                        .background(Color.cyan)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 8)

            Spacer()
        }
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
