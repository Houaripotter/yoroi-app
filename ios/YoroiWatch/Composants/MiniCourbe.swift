import SwiftUI

// Mini courbe des 30 derniers jours : pesees en trait plein,
// rythme prevu en tirets. Dessinee en Path, sans Swift Charts.

struct MiniCourbe: View {
  var serie: [PointPoids]
  var ligne: [PointPoids]
  var couleurSerie: Color = Teinte.texte
  var couleurLigne: Color = Teinte.accent
  var epaisseur: CGFloat = 2

  private struct Echelle {
    var debut: Date
    var fin: Date
    var min: Double
    var max: Double

    func point(_ p: PointPoids, dans r: CGRect) -> CGPoint? {
      guard let d = DatesISO.lireJour(p.d) else { return nil }
      let duree = Swift.max(1, fin.timeIntervalSince(debut))
      let fx = d.timeIntervalSince(debut) / duree
      let ecart = Swift.max(0.1, self.max - self.min)
      let fy = (p.kg - self.min) / ecart
      return CGPoint(x: r.minX + CGFloat(fx) * r.width, y: r.maxY - CGFloat(fy) * r.height)
    }
  }

  private var echelle: Echelle? {
    let tous = serie + ligne
    let dates = tous.compactMap { DatesISO.lireJour($0.d) }
    guard let d0 = dates.min(), let d1 = dates.max(), !tous.isEmpty else { return nil }
    let valeurs = tous.map(\.kg)
    let bas = valeurs.min() ?? 0
    let haut = valeurs.max() ?? 0
    let marge = Swift.max(0.3, (haut - bas) * 0.12)
    return Echelle(debut: d0, fin: d1 > d0 ? d1 : d0.addingTimeInterval(86_400), min: bas - marge, max: haut + marge)
  }

  private func chemin(_ pts: [PointPoids], _ e: Echelle, _ r: CGRect) -> Path {
    var p = Path()
    let tries = pts.sorted { $0.d < $1.d }.compactMap { e.point($0, dans: r) }
    guard let premier = tries.first else { return p }
    p.move(to: premier)
    for q in tries.dropFirst() { p.addLine(to: q) }
    return p
  }

  var body: some View {
    GeometryReader { geo in
      let r = CGRect(origin: .zero, size: geo.size).insetBy(dx: epaisseur, dy: epaisseur)
      if let e = echelle {
        ZStack {
          chemin(ligne, e, r)
            .stroke(couleurLigne, style: StrokeStyle(lineWidth: max(1, epaisseur - 0.5), lineCap: .round, dash: [3, 3]))
          chemin(serie, e, r)
            .stroke(couleurSerie, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round, lineJoin: .round))
          if let dernier = serie.sorted(by: { $0.d < $1.d }).last, let pt = e.point(dernier, dans: r) {
            Circle()
              .fill(couleurSerie)
              .frame(width: epaisseur * 2.5, height: epaisseur * 2.5)
              .position(pt)
          }
        }
      }
    }
    .accessibilityHidden(true)
  }
}
