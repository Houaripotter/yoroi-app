import SwiftUI

// Petit torii dessine en SwiftUI : poutres et piliers vermillon,
// poutre haute et pieds noirs cernes de vermillon pour rester visibles sur fond noir.

struct ToriiPartiesRouges: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    let w = r.width, h = r.height, x = r.minX, y = r.minY
    // Poutre sous le chapeau
    p.addRect(CGRect(x: x + 0.07 * w, y: y + 0.19 * h, width: 0.86 * w, height: 0.08 * h))
    // Poutre basse, qui depasse des piliers
    p.addRect(CGRect(x: x + 0.10 * w, y: y + 0.38 * h, width: 0.80 * w, height: 0.07 * h))
    // Montant central
    p.addRect(CGRect(x: x + 0.46 * w, y: y + 0.27 * h, width: 0.08 * w, height: 0.11 * h))
    // Pilier gauche, legerement incline
    p.move(to: CGPoint(x: x + 0.22 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.31 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.28 * w, y: y + 0.90 * h))
    p.addLine(to: CGPoint(x: x + 0.18 * w, y: y + 0.90 * h))
    p.closeSubpath()
    // Pilier droit
    p.move(to: CGPoint(x: x + 0.69 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.78 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.82 * w, y: y + 0.90 * h))
    p.addLine(to: CGPoint(x: x + 0.72 * w, y: y + 0.90 * h))
    p.closeSubpath()
    return p
  }
}

struct ToriiPartiesNoires: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    let w = r.width, h = r.height, x = r.minX, y = r.minY
    // Chapeau courbe, extremites relevees
    p.move(to: CGPoint(x: x, y: y + 0.02 * h))
    p.addQuadCurve(to: CGPoint(x: x + w, y: y + 0.02 * h), control: CGPoint(x: x + 0.5 * w, y: y + 0.16 * h))
    p.addLine(to: CGPoint(x: x + 0.95 * w, y: y + 0.19 * h))
    p.addQuadCurve(to: CGPoint(x: x + 0.05 * w, y: y + 0.19 * h), control: CGPoint(x: x + 0.5 * w, y: y + 0.27 * h))
    p.closeSubpath()
    // Pieds
    p.addRect(CGRect(x: x + 0.16 * w, y: y + 0.90 * h, width: 0.14 * w, height: 0.10 * h))
    p.addRect(CGRect(x: x + 0.70 * w, y: y + 0.90 * h, width: 0.14 * w, height: 0.10 * h))
    return p
  }
}

struct Torii: View {
  var couleur: Color = Teinte.vermillon

  var body: some View {
    ZStack {
      ToriiPartiesRouges().fill(couleur)
      ToriiPartiesNoires().fill(Color.black)
      ToriiPartiesNoires().stroke(couleur, lineWidth: 0.8)
    }
    .aspectRatio(1.1, contentMode: .fit)
    .accessibilityHidden(true)
  }
}
