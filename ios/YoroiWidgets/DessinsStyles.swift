import SwiftUI
import WidgetKit

// Dessins des trois styles : lanterne (A), losange (C), traits et anneaux au pinceau (B), courbe, anneau,
// sept jours, torii en cachet, et les ronds de l'ecran verrouille (seules les formes changent, iOS impose le monochrome).

/// Petite lanterne de papier (titres du style A)
struct Lanterne: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    let w = r.width, h = r.height, x = r.minX, y = r.minY
    p.addRect(CGRect(x: x + 0.30 * w, y: y, width: 0.40 * w, height: 0.12 * h))
    p.addRoundedRect(in: CGRect(x: x, y: y + 0.14 * h, width: w, height: 0.72 * h), cornerSize: CGSize(width: 0.5 * w, height: 0.36 * h))
    p.addRect(CGRect(x: x + 0.30 * w, y: y + 0.88 * h, width: 0.40 * w, height: 0.12 * h))
    // deux cotes de bambou, en creux (remplissage pair impair)
    p.addRect(CGRect(x: x + 0.06 * w, y: y + 0.37 * h, width: 0.88 * w, height: 0.06 * h))
    p.addRect(CGRect(x: x + 0.06 * w, y: y + 0.57 * h, width: 0.88 * w, height: 0.06 * h))
    return p
  }
}

/// Losange dore (titres et jours du style C)
struct Losange: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.midX, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.midY))
    p.addLine(to: CGPoint(x: r.midX, y: r.maxY))
    p.addLine(to: CGPoint(x: r.minX, y: r.midY))
    p.closeSubpath()
    return p
  }
}

/// Epaisseur d'un trait de pinceau : fin a l'attaque et a la levee, un peu irregulier
private func largeurPinceau(_ t: Double, _ i: Int, _ e: Double) -> Double {
  let corps = 0.35 + 0.65 * pow(max(0, sin(Double.pi * t)), 0.6)
  let grain = 0.08 * sin(Double(i) * 1.7)
  return max(0.6, e * (corps + grain))
}

/// Arc trace d'un geste (anneau de l'eau et ronds du style B), part de 0 a 1 depuis midi
struct ArcPinceau: Shape {
  var part: Double
  var epaisseur: CGFloat

  func path(in r: CGRect) -> Path {
    var p = Path()
    let f = min(1, max(0, part))
    guard f > 0.001 else { return p }
    let cx = Double(r.midX), cy = Double(r.midY)
    let rayon = Double(min(r.width, r.height)) / 2 - Double(epaisseur) / 2
    let n = max(12, Int(72 * f))
    var dehors: [CGPoint] = []
    var dedans: [CGPoint] = []
    for i in 0...n {
      let t = Double(i) / Double(n)
      let a = (-90 + 360 * f * t) * Double.pi / 180
      let w = largeurPinceau(t, i, Double(epaisseur)) / 2
      dehors.append(CGPoint(x: cx + cos(a) * (rayon + w), y: cy + sin(a) * (rayon + w)))
      dedans.append(CGPoint(x: cx + cos(a) * (rayon - w), y: cy + sin(a) * (rayon - w)))
    }
    p.move(to: dehors[0])
    for q in dehors.dropFirst() { p.addLine(to: q) }
    for q in dedans.reversed() { p.addLine(to: q) }
    p.closeSubpath()
    return p
  }
}

enum TraitsW {
  /// Trait de pinceau d'epaisseur variable le long des points (a remplir)
  static func pinceau(_ pts: [CGPoint], epaisseur: CGFloat) -> Path {
    var p = Path()
    guard pts.count >= 2 else { return p }
    var gauche: [CGPoint] = []
    var droite: [CGPoint] = []
    let n = pts.count
    for i in 0..<n {
      let a = pts[max(0, i - 1)]
      let b = pts[min(n - 1, i + 1)]
      var dx = Double(b.x - a.x)
      var dy = Double(b.y - a.y)
      let l = max(0.0001, (dx * dx + dy * dy).squareRoot())
      dx /= l
      dy /= l
      let t = n > 1 ? Double(i) / Double(n - 1) : 0.5
      let w = largeurPinceau(t, i, Double(epaisseur)) / 2
      gauche.append(CGPoint(x: Double(pts[i].x) - dy * w, y: Double(pts[i].y) + dx * w))
      droite.append(CGPoint(x: Double(pts[i].x) + dy * w, y: Double(pts[i].y) - dx * w))
    }
    p.move(to: gauche[0])
    for q in gauche.dropFirst() { p.addLine(to: q) }
    for q in droite.reversed() { p.addLine(to: q) }
    p.closeSubpath()
    return p
  }

  /// Ligne adoucie (courbes quadratiques entre les milieux)
  static func lisse(_ pts: [CGPoint]) -> Path {
    var p = Path()
    guard let premier = pts.first else { return p }
    p.move(to: premier)
    guard pts.count > 1 else { return p }
    for i in 1..<pts.count {
      let a = pts[i - 1], b = pts[i]
      p.addQuadCurve(to: CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2), control: a)
    }
    p.addLine(to: pts[pts.count - 1])
    return p
  }

  static func brisee(_ pts: [CGPoint]) -> Path {
    var p = Path()
    guard let premier = pts.first else { return p }
    p.move(to: premier)
    for q in pts.dropFirst() { p.addLine(to: q) }
    return p
  }

  /// Plus de points le long de la ligne, pour que le pinceau ait de la matiere
  static func densifier(_ pts: [CGPoint], pas: CGFloat = 6) -> [CGPoint] {
    guard pts.count >= 2 else { return pts }
    var out: [CGPoint] = [pts[0]]
    for i in 1..<pts.count {
      let a = pts[i - 1], b = pts[i]
      let dist = (Double(b.x - a.x) * Double(b.x - a.x) + Double(b.y - a.y) * Double(b.y - a.y)).squareRoot()
      let d = max(1, Int((dist / Double(pas)).rounded(.up)))
      for k in 1...d {
        let t = CGFloat(k) / CGFloat(d)
        out.append(CGPoint(x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t))
      }
    }
    return out
  }
}

/// Courbe des 30 derniers jours dans le style : trait clair avec halo (A), pinceau (B), trait dore (C)
struct CourbeW: View {
  let pal: Palette
  var serie: [PointI]
  var ligne: [PointI]
  var epaisseur: CGFloat = 2.2

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

  private func points(_ l: [PointI], _ e: Echelle, _ r: CGRect) -> [CGPoint] {
    l.sorted { $0.d < $1.d }.compactMap { e.point($0, r) }
  }

  var body: some View {
    GeometryReader { geo in
      let r = CGRect(origin: .zero, size: geo.size).insetBy(dx: 6, dy: 6)
      if let e = echelle {
        let pl = points(ligne, e, r)
        let ps = points(serie, e, r)
        ZStack {
          if pal.style == .b {
            TraitsW.brisee(pl)
              .stroke(pal.tirets, style: StrokeStyle(lineWidth: 2.2, lineCap: .round, dash: [2.5, 5]))
            TraitsW.pinceau(TraitsW.densifier(ps), epaisseur: epaisseur * 2.2)
              .fill(pal.courbe)
              .widgetAccentable()
          } else {
            TraitsW.brisee(pl)
              .stroke(pal.tirets, style: StrokeStyle(lineWidth: 1.3, lineCap: .round, dash: [3, 4]))
            if let lueur = pal.lueur {
              TraitsW.lisse(ps)
                .stroke(pal.courbe, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round, lineJoin: .round))
                .shadow(color: lueur.opacity(0.9), radius: 3.5)
                .widgetAccentable()
            } else {
              TraitsW.lisse(ps)
                .stroke(pal.courbe, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round, lineJoin: .round))
                .widgetAccentable()
            }
          }
          if let pt = ps.last {
            pointFinal
              .position(pt)
          }
        }
      }
    }
    .accessibilityHidden(true)
  }

  @ViewBuilder private var pointFinal: some View {
    switch pal.style {
    case .a:
      Circle()
        .fill(pal.courbe)
        .overlay(Circle().stroke(pal.titre, lineWidth: 1.6))
        .frame(width: 8, height: 8)
        .widgetAccentable()
    case .b:
      Circle()
        .fill(pal.cachet)
        .frame(width: 10, height: 10)
        .widgetAccentable()
    case .c:
      Circle()
        .fill(pal.sombre ? Color.hexa(0x2A0B0A) : Color.hexa(0xFBF5EA))
        .overlay(Circle().stroke(pal.courbe, lineWidth: 1.6))
        .frame(width: 8, height: 8)
        .widgetAccentable()
    }
  }
}

/// Anneau de l'eau vers l'objectif (0 a 1)
struct AnneauW: View {
  let pal: Palette
  var part: Double
  var epaisseur: CGFloat = 7

  private var f: CGFloat { CGFloat(min(1, max(0, part))) }

  var body: some View {
    ZStack {
      switch pal.style {
      case .a:
        Circle().stroke(pal.piste, lineWidth: epaisseur)
        arc
          .shadow(color: pal.lueur == nil ? .clear : pal.eau.opacity(0.7), radius: 4)
      case .b:
        Circle().stroke(pal.piste, lineWidth: max(1, epaisseur * 0.35))
        ArcPinceau(part: part, epaisseur: epaisseur * 1.3)
          .fill(pal.eau)
          .widgetAccentable()
      case .c:
        Circle().stroke(pal.piste, lineWidth: epaisseur)
        Circle().inset(by: epaisseur * 0.5 + 3).stroke(pal.trait, lineWidth: 0.8)
        arc
      }
    }
    .padding(epaisseur / 2)
    .accessibilityHidden(true)
  }

  private var arc: some View {
    Circle()
      .trim(from: 0, to: f)
      .stroke(pal.eau, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round))
      .rotationEffect(.degrees(-90))
      .widgetAccentable()
  }
}

/// Les sept jours, lundi d'abord : points dores (A), cachets avec la lettre du jour (B), losanges (C)
struct PointsW: View {
  let pal: Palette
  var jours: [Bool]
  var aujourdhui: Int
  var taille: CGFloat = 12
  var lettres = true

  static let initiales = ["L", "M", "M", "J", "V", "S", "D"]

  var body: some View {
    HStack(spacing: taille * (pal.style == .b ? 0.28 : 0.42)) {
      ForEach(0..<7, id: \.self) { i in
        let fait = i < jours.count && jours[i]
        VStack(spacing: 3) {
          marque(fait, i)
            .frame(width: taille, height: taille)
          if lettres && pal.style != .b {
            Text(PointsW.initiales[i])
              .font(pal.legende(max(8, taille * 0.62), i == aujourdhui ? .bold : .medium))
              .foregroundStyle(i == aujourdhui ? pal.titre : pal.doux)
          }
        }
      }
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(jours.filter { $0 }.count) jours avec une séance cette semaine")
  }

  @ViewBuilder private func marque(_ fait: Bool, _ i: Int) -> some View {
    switch pal.style {
    case .a:
      if fait {
        Circle()
          .fill(pal.fait)
          .shadow(color: pal.lueur == nil ? .clear : pal.fait.opacity(0.8), radius: 3)
          .widgetAccentable()
      } else {
        Circle().stroke(i == aujourdhui ? pal.texte.opacity(0.85) : pal.avenir, lineWidth: i == aujourdhui ? 1.6 : 1.2)
      }
    case .b:
      if fait {
        ZStack {
          Circle().fill(pal.cachet)
          Text(PointsW.initiales[i])
            .font(.system(size: taille * 0.5, weight: .bold, design: .serif))
            .foregroundStyle(Color.hexa(0xF3E7D0))
        }
        .widgetAccentable()
      } else {
        ZStack {
          Circle().stroke(i == aujourdhui ? pal.texte.opacity(0.8) : pal.avenir, style: StrokeStyle(lineWidth: 1, dash: [1.6, 2]))
          Text(PointsW.initiales[i])
            .font(.system(size: taille * 0.45, weight: i == aujourdhui ? .bold : .regular, design: .serif))
            .foregroundStyle(i == aujourdhui ? pal.texte : pal.doux)
        }
      }
    case .c:
      if fait {
        Losange().fill(pal.fait).widgetAccentable()
      } else {
        Losange().stroke(i == aujourdhui ? pal.texte.opacity(0.8) : pal.avenir, lineWidth: 1)
      }
    }
  }
}

/// Le torii de l'arrivee : seul (A, C) ou blanc dans un cachet vermillon (B)
struct ToriiW: View {
  let pal: Palette
  var taille: CGFloat = 16

  var body: some View {
    if pal.style == .b {
      ZStack {
        Circle().fill(pal.cachet)
        ZStack {
          ToriiRouge().fill(Color.hexa(0xFBF1E2))
          ToriiNoir().fill(Color.hexa(0xFBF1E2))
        }
        .aspectRatio(1.1, contentMode: .fit)
        .padding(taille * 0.22)
      }
      .frame(width: taille * 1.25, height: taille * 1.25)
      .widgetAccentable()
      .accessibilityHidden(true)
    } else {
      Torii()
        .frame(width: taille * 1.1, height: taille)
    }
  }
}

/// Rond de l'ecran verrouille : anneau fin (A), cercle au pinceau (B), double anneau (C)
struct RondW<Contenu: View>: View {
  let style: StyleW
  var part: Double? = nil
  @ViewBuilder let contenu: () -> Contenu

  private var f: CGFloat { CGFloat(min(1, max(0, part ?? 1))) }

  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      anneau
      contenu()
        .padding(.horizontal, 6)
    }
  }

  @ViewBuilder private var anneau: some View {
    switch style {
    case .a:
      if part != nil {
        Circle().inset(by: 2).stroke(Color.primary.opacity(0.25), lineWidth: 2.5)
      }
      Circle()
        .inset(by: 2)
        .trim(from: 0, to: f)
        .stroke(Color.primary, style: StrokeStyle(lineWidth: part == nil ? 1.2 : 2.5, lineCap: .round))
        .rotationEffect(.degrees(-90))
        .widgetAccentable()
    case .b:
      if part != nil {
        Circle().inset(by: 3).stroke(Color.primary.opacity(0.25), lineWidth: 1)
      }
      ArcPinceau(part: part ?? 0.94, epaisseur: 4.5)
        .fill(Color.primary)
        .padding(1)
        .widgetAccentable()
    case .c:
      Circle().inset(by: 1.5).stroke(Color.primary.opacity(part == nil ? 0.9 : 0.3), lineWidth: 1.5)
      if part != nil {
        Circle()
          .inset(by: 1.5)
          .trim(from: 0, to: f)
          .stroke(Color.primary, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
          .rotationEffect(.degrees(-90))
          .widgetAccentable()
      }
      Circle().inset(by: 5.5).stroke(Color.primary.opacity(0.55), lineWidth: 0.8)
    }
  }
}

/// Titre d'un widget de l'ecran verrouille, dans la forme du style
struct TitreVerrou: View {
  let style: StyleW
  let texte: String

  var body: some View {
    HStack(spacing: 4) {
      switch style {
      case .a:
        Lanterne().fill(style: FillStyle(eoFill: true)).frame(width: 8, height: 11)
        Text(texte).font(.system(size: 12, weight: .semibold, design: .rounded))
      case .b:
        Text(texte).font(.system(size: 13, weight: .bold, design: .serif))
      case .c:
        Losange().frame(width: 7, height: 7)
        Text(texte.uppercased()).font(.system(size: 11, weight: .bold, design: .rounded)).tracking(1.2)
      }
    }
    .lineLimit(1)
    .widgetAccentable()
  }
}

/// Titre d'un widget de l'ecran d'accueil : lanterne et or (A), serif a l'encre (B), losange et capitales (C)
struct TitreW: View {
  let pal: Palette
  let texte: String
  var taille: CGFloat = 13

  var body: some View {
    HStack(spacing: 5) {
      switch pal.style {
      case .a:
        Lanterne()
          .fill(pal.titre, style: FillStyle(eoFill: true))
          .frame(width: taille * 0.7, height: taille)
          .widgetAccentable()
        Text(texte)
          .font(pal.legende(taille, .bold))
          .foregroundStyle(pal.titre)
      case .b:
        Text(texte)
          .font(.system(size: taille + 1, weight: .bold, design: .serif))
          .foregroundStyle(pal.titre)
      case .c:
        Losange()
          .fill(pal.titre)
          .frame(width: taille * 0.58, height: taille * 0.58)
          .widgetAccentable()
        Text(texte.uppercased())
          .font(.system(size: max(10, taille - 2), weight: .bold, design: .rounded))
          .tracking(1.4)
          .foregroundStyle(pal.titre)
      }
    }
    .lineLimit(1)
    .minimumScaleFactor(0.8)
  }
}
