import SwiftUI
import UIKit
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
    case .d:
      Circle()
        .fill(Color.hexa(0xB4471E))
        .overlay(Circle().stroke(Color.white, lineWidth: 2))
        .frame(width: 10, height: 10)
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
      case .d:
        Circle().stroke(pal.piste, lineWidth: epaisseur)
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

  static let initiales: [String] = { var c = Calendar(identifier: .gregorian); c.locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "fr"); let s = c.veryShortStandaloneWeekdaySymbols; return Array(s[1...]) + [s[0]] }()

  var body: some View {
    HStack(spacing: taille * (pal.style == .b ? 0.28 : (pal.style == .d ? 0.36 : 0.42))) {
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
    case .d:
      // une petite lanterne : allumee les jours de seance, cernee aujourd'hui
      LanterneD(allumee: fait, aujourdhui: i == aujourdhui, pal: pal)
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
    case .d:
      // anneau fin, comme la maquette de l'ecran verrouille
      Circle().inset(by: 2.5).stroke(Color.primary.opacity(0.28), lineWidth: 3.5)
      Circle()
        .inset(by: 2.5)
        .trim(from: 0, to: f)
        .stroke(Color.primary, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
        .rotationEffect(.degrees(-90))
        .widgetAccentable()
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
      case .d:
        Text(texte.uppercased()).font(.system(size: 10.5, weight: .heavy, design: .rounded)).tracking(1.3)
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
  /// style D : la couleur des capitales du widget (peche brun pour le poids, bleu pour la semaine...)
  var couleurD: Color? = nil

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
      case .d:
        // petites capitales espacees, sans ornement (maquette Widgets-B)
        Text(texte.uppercased())
          .font(.system(size: max(10, taille - 1.5), weight: .heavy, design: .rounded))
          .tracking(1.5)
          .foregroundStyle(couleurD ?? pal.titre)
          .widgetAccentable()
      }
    }
    .lineLimit(1)
    .minimumScaleFactor(0.8)
  }
}

// MARK: - Style D (28 octobre 2026) : dessins des scenes illustrees

/// Une lanterne de papier : allumee (orange doux, lueur) ou eteinte (gris lavande), cernee de marine aujourd'hui.
struct LanterneD: View {
  var allumee: Bool
  var aujourdhui: Bool
  let pal: Palette

  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      let h = g.size.height
      ZStack {
        RoundedRectangle(cornerRadius: w * 0.5, style: .continuous)
          .fill(allumee ? pal.fait : pal.avenir)
          .shadow(color: allumee ? Color.hexa(0xFFBE78).opacity(0.85) : .clear, radius: w * 0.35)
        RoundedRectangle(cornerRadius: w * 0.5, style: .continuous)
          .fill(Color.black.opacity(0.06))
          .frame(height: h * 0.14)
          .frame(maxHeight: .infinity, alignment: .bottom)
        if aujourdhui {
          RoundedRectangle(cornerRadius: w * 0.55, style: .continuous)
            .stroke(Color.hexa(0x23358F), lineWidth: max(1.5, w * 0.12))
            .padding(-w * 0.12)
        }
      }
    }
    .widgetAccentable(allumee)
    .accessibilityHidden(true)
  }
}

/// Le fil des lanternes, une courbe molle d'un bord a l'autre.
struct FilLanternes: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: r.minY + r.height * 0.25))
    p.addQuadCurve(to: CGPoint(x: r.maxX, y: r.minY + r.height * 0.25), control: CGPoint(x: r.midX, y: r.minY + r.height * 1.2))
    return p
  }
}

/// Les sept lanternes de la semaine, accrochees au fil, lettres des jours dessous.
struct SemaineLanternes: View {
  let pal: Palette
  var jours: [Bool]
  var aujourdhui: Int
  var largeur: CGFloat
  var hauteur: CGFloat = 16

  var body: some View {
    let pas = largeur / 7
    ZStack(alignment: .topLeading) {
      FilLanternes()
        .stroke(pal.sombre ? pal.doux : Color.hexa(0x8C91AA), lineWidth: 1.3)
        .frame(width: largeur, height: 16)
      HStack(spacing: 0) {
        ForEach(0..<7, id: \.self) { i in
          // les lanternes du milieu pendent un peu plus bas, comme sur le fil
          let creux: CGFloat = i == 3 ? 7 : ((i == 2 || i == 4) ? 6 : ((i == 1 || i == 5) ? 3.5 : 0))
          VStack(spacing: 2) {
            Rectangle().fill(pal.sombre ? pal.doux : Color.hexa(0x8C91AA)).frame(width: 1.3, height: 6 + creux)
            LanterneD(allumee: i < jours.count && jours[i], aujourdhui: i == aujourdhui, pal: pal)
              .frame(width: hauteur * 0.72, height: hauteur)
            Text(PointsW.initiales[i])
              .font(.system(size: 9.5, weight: .heavy, design: .rounded))
              .foregroundStyle(i == aujourdhui ? pal.texte : pal.doux)
          }
          .frame(width: pas)
        }
      }
      .padding(.top, 4)
    }
    .frame(width: largeur, alignment: .topLeading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(jours.filter { $0 }.count) lanternes allumées cette semaine")
  }
}

/// Le chemin du poids : colline, pierres de gue jusqu'au torii, soleil, et ton personnage sur sa pierre.
struct CheminPierres: View {
  let pal: Palette
  /// part du chemin deja faite (0 a 1), pour placer ton personnage
  var part: Double
  var personnage: UIImage?

  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      let h = g.size.height
      // pierres le long d'une diagonale douce, du bas gauche vers le torii en haut a droite
      let pierres: [CGPoint] = (0..<4).map { i in
        let t = CGFloat(i) / 3
        return CGPoint(x: w * (0.14 + 0.52 * t), y: h * (0.86 - 0.20 * t))
      }
      let ici = min(3, max(0, Int((part * 3).rounded())))
      ZStack(alignment: .topLeading) {
        Circle()
          .fill(Color.hexa(pal.sombre ? 0x5A3A34 : 0xFFD2BF))
          .frame(width: w * 0.18, height: w * 0.18)
          .position(x: w * 0.86, y: h * 0.2)
        Colline(haut: 0.56)
          .fill(Color.hexa(pal.sombre ? 0x233A30 : 0xCDEBDB))
        Colline(haut: 0.82)
          .fill(Color.hexa(pal.sombre ? 0x1D3128 : 0xB5E0C8))
        ForEach(0..<4, id: \.self) { i in
          Ellipse()
            .fill(Color.white.opacity(pal.sombre ? 0.75 : 0.95))
            .overlay(Ellipse().fill(Color.hexa(0xC9D3F5).opacity(0.6)).offset(y: 2))
            .frame(width: w * (0.16 - 0.015 * CGFloat(i)), height: 9)
            .position(pierres[i])
        }
        ZStack {
          ToriiRouge().fill(Color.hexa(0xF0896A))
          ToriiNoir().fill(Color.hexa(0xF0896A))
        }
        .aspectRatio(1.1, contentMode: .fit)
        .frame(width: w * 0.22)
        .position(x: w * 0.84, y: h * 0.56)
        .widgetAccentable()
        if let personnage {
          let p = pierres[ici]
          Image(uiImage: personnage)
            .resizable()
            .scaledToFit()
            .frame(height: w * 0.3)
            .clipShape(Circle())
            .background(Circle().fill(Color.white))
            .overlay(Circle().stroke(Color.white, lineWidth: 2))
            .frame(width: w * 0.18, height: w * 0.18)
            .clipShape(Circle())
            .position(x: p.x, y: p.y - w * 0.11)
        }
      }
    }
    .accessibilityHidden(true)
  }
}

/// Une colline qui monte vers la droite, remplie jusqu'en bas.
struct Colline: Shape {
  /// hauteur du bord gauche, en part de la hauteur (0 en haut)
  var haut: CGFloat

  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: r.minY + r.height * min(0.98, haut + 0.06)))
    p.addCurve(to: CGPoint(x: r.maxX, y: r.minY + r.height * haut),
               control1: CGPoint(x: r.minX + r.width * 0.35, y: r.minY + r.height * (haut - 0.08)),
               control2: CGPoint(x: r.minX + r.width * 0.65, y: r.minY + r.height * (haut + 0.06)))
    p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
    p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
    p.closeSubpath()
    return p
  }
}

/// Une pastille de texte (« Pecs », « Dos »)
struct PastilleD: View {
  var texte: String
  var fond: Color
  var encre: Color

  var body: some View {
    Text(texte)
      .font(.system(size: 11, weight: .heavy, design: .rounded))
      .foregroundStyle(encre)
      .lineLimit(1)
      .padding(.horizontal, 9)
      .frame(height: 22)
      .background(fond, in: Capsule())
  }
}

/// Barre de progression vers le rang suivant, lilas vers peche.
struct BarreRang: View {
  var part: Double
  var hauteur: CGFloat = 8

  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .leading) {
        Capsule().fill(Color.hexa(0xECEEF5))
        Capsule()
          .fill(LinearGradient(colors: [Color.hexa(0xC9B3E6), Color.hexa(0xF4A38C)], startPoint: .leading, endPoint: .trailing))
          .frame(width: max(hauteur, g.size.width * CGFloat(min(1, max(0, part)))))
          .widgetAccentable()
      }
    }
    .frame(height: hauteur)
    .accessibilityHidden(true)
  }
}

/// Une capsule de verre depoli, lisible sur ta scene.
extension View {
  func verreD(_ rayon: CGFloat = 17) -> some View {
    self.background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: rayon, style: .continuous))
  }
}

/// La banniere du combat : un tissu accroche, coupe en V en bas.
struct BanniereD: Shape {
  func path(in r: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: r.minX, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.minY))
    p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
    p.addLine(to: CGPoint(x: r.midX, y: r.maxY - r.width * 0.18))
    p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
    p.closeSubpath()
    return p
  }
}

/// Les marches jusqu'a la pesee : un trace en escalier, la part faite en peche, ton point, le torii au bout.
struct MarchesPesee: View {
  var part: Double

  var body: some View {
    GeometryReader { g in
      let w = g.size.width - 30
      let h = g.size.height
      let f = CGFloat(min(1, max(0, part)))
      ZStack(alignment: .topLeading) {
        Escalier(fin: 1).stroke(Color.white, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
          .frame(width: w, height: h * 0.7)
        Escalier(fin: f).stroke(Color.hexa(0xE9764F), style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
          .frame(width: w, height: h * 0.7)
          .widgetAccentable()
        Circle()
          .fill(Color.hexa(0xB4471E))
          .overlay(Circle().stroke(Color.white, lineWidth: 3))
          .frame(width: 12, height: 12)
          .position(Escalier.point(f, CGSize(width: w, height: h * 0.7)))
        ZStack {
          ToriiRouge().fill(Color.hexa(0xF0896A))
          ToriiNoir().fill(Color.hexa(0xF0896A))
        }
        .aspectRatio(1.1, contentMode: .fit)
        .frame(width: 24)
        .position(x: w + 18, y: h * 0.45)
      }
    }
    .accessibilityHidden(true)
  }
}

/// Trois marches qui descendent vers la droite, tracees jusqu'a la part `fin` (0 a 1).
struct Escalier: Shape {
  var fin: CGFloat

  /// Le point du trace a la part t
  static func point(_ t: CGFloat, _ s: CGSize) -> CGPoint {
    let pts = sommets(s)
    let total = longueurs(pts).reduce(0, +)
    var reste = max(0, min(1, t)) * total
    for i in 1..<pts.count {
      let a = pts[i - 1], b = pts[i]
      let l = hypot(b.x - a.x, b.y - a.y)
      if reste <= l || i == pts.count - 1 {
        let k = l > 0 ? min(1, reste / l) : 0
        return CGPoint(x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k)
      }
      reste -= l
    }
    return pts.last ?? .zero
  }

  static func sommets(_ s: CGSize) -> [CGPoint] {
    let w = s.width, h = s.height
    return [CGPoint(x: 2, y: h * 0.2), CGPoint(x: w * 0.3, y: h * 0.2), CGPoint(x: w * 0.3, y: h * 0.5),
            CGPoint(x: w * 0.6, y: h * 0.5), CGPoint(x: w * 0.6, y: h * 0.8), CGPoint(x: w - 2, y: h * 0.8)]
  }

  static func longueurs(_ pts: [CGPoint]) -> [CGFloat] {
    guard pts.count > 1 else { return [] }
    return (1..<pts.count).map { i in hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) }
  }

  func path(in r: CGRect) -> Path {
    var p = Path()
    let pts = Escalier.sommets(r.size)
    guard fin > 0.001 else { return p }
    p.move(to: pts[0])
    let total = Escalier.longueurs(pts).reduce(0, +)
    var reste = min(1, fin) * total
    for i in 1..<pts.count {
      let a = pts[i - 1], b = pts[i]
      let l = hypot(b.x - a.x, b.y - a.y)
      if reste <= l {
        let k = l > 0 ? reste / l : 0
        p.addLine(to: CGPoint(x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k))
        return p
      }
      p.addLine(to: b)
      reste -= l
    }
    return p
  }
}
