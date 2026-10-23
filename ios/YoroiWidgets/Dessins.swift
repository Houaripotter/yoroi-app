import SwiftUI
import WidgetKit

// Dessins en Path : torii vermillon et noir, courbe du poids, anneau de l'eau, sept points de la semaine.

struct ToriiRouge: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    let w = r.width, h = r.height, x = r.minX, y = r.minY
    p.addRect(CGRect(x: x + 0.07 * w, y: y + 0.19 * h, width: 0.86 * w, height: 0.08 * h))
    p.addRect(CGRect(x: x + 0.10 * w, y: y + 0.38 * h, width: 0.80 * w, height: 0.07 * h))
    p.addRect(CGRect(x: x + 0.46 * w, y: y + 0.27 * h, width: 0.08 * w, height: 0.11 * h))
    p.move(to: CGPoint(x: x + 0.22 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.31 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.28 * w, y: y + 0.90 * h))
    p.addLine(to: CGPoint(x: x + 0.18 * w, y: y + 0.90 * h))
    p.closeSubpath()
    p.move(to: CGPoint(x: x + 0.69 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.78 * w, y: y + 0.27 * h))
    p.addLine(to: CGPoint(x: x + 0.82 * w, y: y + 0.90 * h))
    p.addLine(to: CGPoint(x: x + 0.72 * w, y: y + 0.90 * h))
    p.closeSubpath()
    return p
  }
}

struct ToriiNoir: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    let w = r.width, h = r.height, x = r.minX, y = r.minY
    p.move(to: CGPoint(x: x, y: y + 0.02 * h))
    p.addQuadCurve(to: CGPoint(x: x + w, y: y + 0.02 * h), control: CGPoint(x: x + 0.5 * w, y: y + 0.16 * h))
    p.addLine(to: CGPoint(x: x + 0.95 * w, y: y + 0.19 * h))
    p.addQuadCurve(to: CGPoint(x: x + 0.05 * w, y: y + 0.19 * h), control: CGPoint(x: x + 0.5 * w, y: y + 0.27 * h))
    p.closeSubpath()
    p.addRect(CGRect(x: x + 0.16 * w, y: y + 0.90 * h, width: 0.14 * w, height: 0.10 * h))
    p.addRect(CGRect(x: x + 0.70 * w, y: y + 0.90 * h, width: 0.14 * w, height: 0.10 * h))
    return p
  }
}

/// Petit torii : piliers et poutres vermillon, chapeau et pieds noirs (cernes de vermillon en sombre)
struct Torii: View {
  @Environment(\.colorScheme) private var scheme

  var body: some View {
    ZStack {
      ToriiRouge().fill(Teinte.vermillon)
      ToriiNoir().fill(Teinte.noirTorii)
      if scheme == .dark {
        ToriiNoir().stroke(Teinte.vermillon, lineWidth: 0.7)
      }
    }
    .aspectRatio(1.1, contentMode: .fit)
    .widgetAccentable()
    .accessibilityHidden(true)
  }
}

/// Courbe des 30 derniers jours : pesees en trait plein, rythme prevu en tirets
struct Courbe: View {
  var serie: [PointI]
  var ligne: [PointI]
  var couleurSerie: Color = Teinte.encre
  var couleurLigne: Color = Teinte.accent
  var epaisseur: CGFloat = 2

  private struct Echelle {
    var debut: Date
    var fin: Date
    var bas: Double
    var haut: Double

    func point(_ p: PointI, _ r: CGRect) -> CGPoint? {
      guard let d = Jours.lire(p.d) else { return nil }
      let duree = max(1, fin.timeIntervalSince(debut))
      let fx = d.timeIntervalSince(debut) / duree
      let fy = (p.kg - bas) / max(0.1, haut - bas)
      return CGPoint(x: r.minX + CGFloat(fx) * r.width, y: r.maxY - CGFloat(fy) * r.height)
    }
  }

  private var echelle: Echelle? {
    let tous = serie + ligne
    let dates = tous.compactMap { Jours.lire($0.d) }
    guard let d0 = dates.min(), let d1 = dates.max() else { return nil }
    let v = tous.map { $0.kg }
    let bas = v.min() ?? 0
    let haut = v.max() ?? 0
    let marge = max(0.3, (haut - bas) * 0.12)
    return Echelle(debut: d0, fin: d1 > d0 ? d1 : d0.addingTimeInterval(86_400), bas: bas - marge, haut: haut + marge)
  }

  private func chemin(_ pts: [PointI], _ e: Echelle, _ r: CGRect) -> Path {
    var p = Path()
    let q = pts.sorted { $0.d < $1.d }.compactMap { e.point($0, r) }
    guard let premier = q.first else { return p }
    p.move(to: premier)
    for x in q.dropFirst() { p.addLine(to: x) }
    return p
  }

  var body: some View {
    GeometryReader { geo in
      let r = CGRect(origin: .zero, size: geo.size).insetBy(dx: epaisseur * 1.5, dy: epaisseur * 1.5)
      if let e = echelle {
        ZStack {
          chemin(ligne, e, r)
            .stroke(couleurLigne, style: StrokeStyle(lineWidth: max(1, epaisseur - 0.5), lineCap: .round, dash: [3, 4]))
          chemin(serie, e, r)
            .stroke(couleurSerie, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round, lineJoin: .round))
            .widgetAccentable()
          if let d = serie.sorted(by: { $0.d < $1.d }).last, let pt = e.point(d, r) {
            Circle()
              .fill(couleurSerie)
              .frame(width: epaisseur * 3, height: epaisseur * 3)
              .position(pt)
              .widgetAccentable()
          }
        }
      }
    }
    .accessibilityHidden(true)
  }
}

/// Anneau vers l'objectif (0 a 1)
struct Anneau: View {
  var part: Double
  var couleur: Color = Teinte.accent
  var epaisseur: CGFloat = 7

  var body: some View {
    ZStack {
      Circle().stroke(Teinte.trait, lineWidth: epaisseur)
      Circle()
        .trim(from: 0, to: CGFloat(min(1, max(0, part))))
        .stroke(couleur, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round))
        .rotationEffect(.degrees(-90))
        .widgetAccentable()
    }
    .padding(epaisseur / 2)
    .accessibilityHidden(true)
  }
}

/// Les sept jours, lundi d'abord : plein si une seance est faite
struct PointsSemaine: View {
  var jours: [Bool]
  var aujourdhui: Int
  var taille: CGFloat = 12
  var lettres = true

  private static let initiales = ["L", "M", "M", "J", "V", "S", "D"]

  var body: some View {
    HStack(spacing: taille * 0.45) {
      ForEach(0..<7, id: \.self) { i in
        let fait = i < jours.count && jours[i]
        VStack(spacing: 3) {
          ZStack {
            if fait {
              Circle().fill(Teinte.accent).widgetAccentable()
            } else {
              Circle().stroke(i == aujourdhui ? Teinte.encre : Teinte.trait, lineWidth: i == aujourdhui ? 1.6 : 1.2)
            }
          }
          .frame(width: taille, height: taille)
          if lettres {
            Text(PointsSemaine.initiales[i])
              .font(.libelle(max(8, taille * 0.72), i == aujourdhui ? .bold : .medium))
              .foregroundStyle(i == aujourdhui ? Teinte.encre : Teinte.doux)
          }
        }
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(jours.filter { $0 }.count) jours avec une séance cette semaine")
  }
}

/// Fleche de l'ecart au rythme prevu
struct FlecheEcart: View {
  var ecart: Double
  var taille: CGFloat = 12

  var body: some View {
    Image(systemName: abs(ecart) < 0.05 ? "arrow.right" : (ecart > 0 ? "arrow.up.right" : "arrow.down.right"))
      .font(.system(size: taille, weight: .bold))
  }
}
