import SwiftUI

// Courbe du jour (frequence cardiaque ou oxygene) et jauge de plage mini maxi.
// Dessinees en Path, sans Swift Charts. Partagees avec l'extension de widgets.

struct CourbeJour: View {
  var serie: [PointJour]
  var couleur: Color
  /// Fin de l'axe horizontal, en minutes depuis minuit (en general : maintenant).
  var finMinutes: Int
  /// Points separes plutot qu'une ligne (oxygene : mesures espacees).
  var enPoints: Bool = false
  var remplissage: Bool = true
  var epaisseur: CGFloat = 2
  /// Bornes verticales imposees (sinon mini et maxi de la serie).
  var bas: Double? = nil
  var haut: Double? = nil

  private func bornes() -> (Double, Double)? {
    guard let mn = serie.map(\.v).min(), let mx = serie.map(\.v).max() else { return nil }
    var b = bas ?? mn
    var h = haut ?? mx
    if h - b < 1 {
      b -= 1
      h += 1
    }
    return (b, h)
  }

  private func position(_ p: PointJour, _ r: CGRect, _ b: Double, _ h: Double) -> CGPoint {
    let fx = Double(p.t) / Double(max(1, finMinutes))
    let fy = (p.v - b) / max(0.001, h - b)
    return CGPoint(x: r.minX + CGFloat(min(1, max(0, fx))) * r.width,
                   y: r.maxY - CGFloat(min(1, max(0, fy))) * r.height)
  }

  var body: some View {
    GeometryReader { geo in
      let r = CGRect(origin: .zero, size: geo.size).insetBy(dx: epaisseur * 2, dy: epaisseur * 2)
      if let limites = bornes() {
        let pts = serie.sorted { $0.t < $1.t }.map { position($0, r, limites.0, limites.1) }
        ZStack {
          if enPoints || pts.count < 2 {
            ForEach(Array(pts.enumerated()), id: \.offset) { _, p in
              Circle()
                .fill(couleur)
                .frame(width: epaisseur * 2.4, height: epaisseur * 2.4)
                .position(p)
            }
          } else {
            if remplissage, let premier = pts.first, let dernier = pts.last {
              Path { c in
                c.move(to: CGPoint(x: premier.x, y: geo.size.height))
                pts.forEach { c.addLine(to: $0) }
                c.addLine(to: CGPoint(x: dernier.x, y: geo.size.height))
                c.closeSubpath()
              }
              .fill(LinearGradient(colors: [couleur.opacity(0.42), couleur.opacity(0)], startPoint: .top, endPoint: .bottom))
            }
            Path { c in
              guard let premier = pts.first else { return }
              c.move(to: premier)
              pts.dropFirst().forEach { c.addLine(to: $0) }
            }
            .stroke(couleur, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round, lineJoin: .round))
          }
          if let dernier = pts.last {
            Circle()
              .fill(Color.white)
              .overlay(Circle().stroke(couleur, lineWidth: epaisseur))
              .frame(width: epaisseur * 3.4, height: epaisseur * 3.4)
              .position(dernier)
          }
        }
      }
    }
    .accessibilityHidden(true)
  }
}

/// Piste horizontale : plage du jour (mini a maxi) en couleur, point blanc sur la derniere valeur.
struct JaugePlage: View {
  var valeur: Double?
  var mini: Double?
  var maxi: Double?
  var bornes: ClosedRange<Double>
  var couleur: Color

  private func fraction(_ v: Double) -> CGFloat {
    let f = (v - bornes.lowerBound) / max(0.001, bornes.upperBound - bornes.lowerBound)
    return CGFloat(min(1, max(0, f)))
  }

  var body: some View {
    GeometryReader { geo in
      let w = geo.size.width
      let h = geo.size.height
      ZStack(alignment: .leading) {
        Capsule().fill(Teinte.piste).frame(height: h * 0.4)
        if let a = mini, let b = maxi {
          let x0 = fraction(a) * w
          let x1 = fraction(b) * w
          Capsule()
            .fill(couleur)
            .frame(width: max(h * 0.4, x1 - x0), height: h * 0.4)
            .offset(x: x0)
        }
        if let v = valeur {
          Circle()
            .fill(Color.white)
            .overlay(Circle().stroke(Color.black, lineWidth: 1.5))
            .frame(width: h, height: h)
            .offset(x: fraction(v) * w - h / 2)
        }
      }
      .frame(height: h)
    }
    .accessibilityHidden(true)
  }
}
