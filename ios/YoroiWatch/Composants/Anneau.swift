import SwiftUI

/// Anneau de progression (0 a 1), contenu libre au centre.
struct Anneau<Centre: View>: View {
  var progression: Double
  var couleur: Color = Teinte.accent
  var epaisseur: CGFloat = 9
  @ViewBuilder var centre: () -> Centre

  var body: some View {
    ZStack {
      Circle()
        .stroke(couleur.opacity(0.18), lineWidth: epaisseur)
      Circle()
        .trim(from: 0, to: CGFloat(min(1, max(0, progression))))
        .stroke(couleur, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round))
        .rotationEffect(.degrees(-90))
        .animation(.easeOut(duration: 0.35), value: progression)
      centre()
    }
    .padding(epaisseur / 2)
  }
}
