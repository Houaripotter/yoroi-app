import SwiftUI

// Palette montre (fond noir). Partagee avec l'extension de widgets.

extension Color {
  init(hexa: UInt32) {
    let r = Double((hexa >> 16) & 0xFF) / 255
    let g = Double((hexa >> 8) & 0xFF) / 255
    let b = Double(hexa & 0xFF) / 255
    self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
  }
}

enum Teinte {
  // 28 octobre 2026, direction B « ton dojo au poignet » : noir pur, accents pastel lisibles sur noir,
  // anneaux fins. Les noms restent ceux d'avant : tout l'habillage de la montre et des complications suit.
  static let fond = Color.black
  static let carte = Color(hexa: 0x1B1C22)
  static let texte = Color(hexa: 0xF2F1EC)
  static let texteDoux = Color(hexa: 0xF2F1EC).opacity(0.62)
  static let accent = Color(hexa: 0xA9BCF5)
  static let vert = Color(hexa: 0x9FE3C0)
  static let bleu = Color(hexa: 0xA9BCF5)
  static let orange = Color(hexa: 0xFFB59E)
  static let ambre = Color(hexa: 0xF6DFA6)
  static let vermillon = Color(hexa: 0xF0896A)
  /// Rouge reserve aux records et aux erreurs.
  static let rouge = Color(hexa: 0xE5484D)

  // Accents pastel de la direction B (maquettes Montre-B-*), et leur texte fonce pour les fonds clairs.
  static let peche = Color(hexa: 0xFFB59E)
  static let pecheClair = Color(hexa: 0xFFD6C8)
  static let pecheTexte = Color(hexa: 0x5A2412)
  static let pecheSous = Color(hexa: 0x7A3A24)
  static let menthe = Color(hexa: 0x9FE3C0)
  static let mentheClair = Color(hexa: 0xCFF3DF)
  static let mentheTexte = Color(hexa: 0x123F2A)
  /// Piste du bord de l'ecran sous le vert d'un repos.
  static let mentheNuit = Color(hexa: 0x16261E)
  static let lilas = Color(hexa: 0xD7BCEB)
  static let creme = Color(hexa: 0xF6DFA6)
  static let cremeClair = Color(hexa: 0xFBEFD0)
  static let navy = Color(hexa: 0x23358F)
  static let torii = Color(hexa: 0xF0896A)
  /// Carte du Coach : creme vers peche, textes bruns.
  static let coachFond = Gradient(colors: [Color(hexa: 0xFBEFD0), Color(hexa: 0xFFE1D6)])
  static let coachCaps = Color(hexa: 0xB4471E)
  static let coachSous = Color(hexa: 0x6B5A3A)

  // Minuteurs, coeur et oxygene (lisibles sur cadran noir)
  static let accentClair = Color(hexa: 0xB9CBF2)
  // Coeur bleu, oxygene violet : jauges en degrade bleu clair vers violet (le rouge reste aux records).
  static let coeur = Color(hexa: 0x6FA2FF)
  static let coeurClair = Color(hexa: 0x7FD3FF)
  static let oxygene = Color(hexa: 0xB48CFF)
  static let oxygeneClair = Color(hexa: 0xD7C2FF)
  static let jaugeBleu = Color(hexa: 0x6CCBFF)
  static let jaugeIndigo = Color(hexa: 0x6F86F7)
  static let jaugeViolet = Color(hexa: 0xA977F2)
  /// Jauge du coeur : bleu clair vers violet.
  static let degradeCoeur = Gradient(colors: [jaugeBleu, jaugeIndigo, jaugeViolet])
  /// Jauge de l'oxygene : violet vers bleu clair.
  static let degradeOxygene = Gradient(colors: [jaugeViolet, jaugeIndigo, jaugeBleu])
  /// Jauge de la semaine : indigo vers violet.
  static let degradeSemaine = Gradient(colors: [jaugeIndigo, jaugeViolet])
  /// Jauge de l'eau : bleu clair vers indigo.
  static let degradeEau = Gradient(colors: [jaugeBleu, jaugeIndigo])
  static let piste = Color(hexa: 0x2A2B31)
  static let plateau2 = Color(hexa: 0x2A2B31)
  /// Fond plein des tuiles de minuteur (gris tres fonce), teinte de la couleur de la duree a 13 %.
  static let tuile = Color(hexa: 0x1B1C22)
  static let teinteTuile: Double = 0.13

  // Minuteurs : une couleur par tranche de duree, pour se reperer d'un coup d'oeil.
  // Meme couleur pour l'anneau du rond de la liste, l'ecran du minuteur en cours, l'ecran Termine
  // et la complication. Du vert au bleu, a l'indigo, au violet, a l'orchidee puis a l'ambre :
  // jamais de rouge (reserve aux erreurs et aux records). Toutes lisibles sur fond noir.
  /// Tranches : borne haute exclue (en secondes), couleur, version eclaircie pour les degrades.
  /// 28 octobre 2026 (direction B) : les memes six tranches, en pastels de la maquette.
  private static let tranchesMinuteur: [(jusqua: Int, couleur: UInt32, claire: UInt32)] = [
    (30, 0x9FE3C0, 0xCFF3DF),          // moins de 30 s : menthe
    (60, 0x9FD6F2, 0xCFEAF8),          // 30 s a moins de 1 min : bleu ciel
    (120, 0xA9BCF5, 0xD6DFFB),         // 1 a moins de 2 min : bleu pervenche (accent)
    (300, 0xD7BCEB, 0xEEDFF7),         // 2 a moins de 5 min : lilas
    (600, 0xFFB59E, 0xFFD6C8),         // 5 a moins de 10 min : peche
    (Int.max, 0xF6DFA6, 0xFBEFD0),     // 10 min et plus : creme
  ]

  private static func trancheMinuteur(_ secondes: Int) -> (jusqua: Int, couleur: UInt32, claire: UInt32) {
    tranchesMinuteur.first { secondes < $0.jusqua } ?? tranchesMinuteur[tranchesMinuteur.count - 1]
  }

  /// Couleur d'un minuteur selon sa duree choisie.
  static func minuteur(_ secondes: Int) -> Color { Color(hexa: trancheMinuteur(secondes).couleur) }

  /// Version eclaircie, pour le degrade de l'anneau.
  static func minuteurClair(_ secondes: Int) -> Color { Color(hexa: trancheMinuteur(secondes).claire) }

  /// Couleur de l'ecart au rythme prevu, selon le statut calcule par l'iPhone.
  static func statut(_ s: String) -> Color {
    switch s {
    case "allure": return vert
    case "dessus": return bleu
    case "vite": return orange
    default: return texteDoux
    }
  }
}

/// Squircle : superellipse |x/a|^n + |y/b|^n = 1, un carre aux coins continus, plus doux qu'un
/// rectangle arrondi (n = 4). Partage avec la complication. Le trace part du haut au centre et tourne
/// dans le sens horaire : trim(from: 0, to: p) vide la progression le long du contour.
struct Squircle: InsettableShape {
  static let exposantTuile: CGFloat = 4
  var exposant: CGFloat = Squircle.exposantTuile
  var retrait: CGFloat = 0

  func path(in rect: CGRect) -> Path {
    let r = rect.insetBy(dx: retrait, dy: retrait)
    guard r.width > 0, r.height > 0 else { return Path() }
    let a = Double(r.width / 2)
    let b = Double(r.height / 2)
    let cx = Double(r.midX)
    let cy = Double(r.midY)
    let e = 2 / Double(max(2, exposant))
    let pas = 240
    var p = Path()
    for i in 0..<pas {
      let t = -Double.pi / 2 + 2 * Double.pi * Double(i) / Double(pas)
      let co = cos(t)
      let si = sin(t)
      let x = cx + a * copysign(pow(abs(co), e), co)
      let y = cy + b * copysign(pow(abs(si), e), si)
      if i == 0 { p.move(to: CGPoint(x: x, y: y)) } else { p.addLine(to: CGPoint(x: x, y: y)) }
    }
    p.closeSubpath()
    return p
  }

  func inset(by amount: CGFloat) -> Squircle {
    var s = self
    s.retrait += amount
    return s
  }
}

extension Font {
  /// Chiffres arrondis a chasse fixe.
  static func chiffre(_ taille: CGFloat, _ graisse: Font.Weight = .semibold) -> Font {
    .system(size: taille, weight: graisse, design: .rounded).monospacedDigit()
  }
}

/// Bord de l'ecran qui se vide comme un anneau (direction B) : un rectangle aux coins arrondis
/// qui part du haut au centre et tourne dans le sens horaire. trim(from: 0, to: p) garde la part p.
struct BordEcran: Shape {
  /// Rayon des coins, en part de la largeur (l'ecran de la montre est tres arrondi).
  var rayonRelatif: CGFloat = 0.21

  func path(in rect: CGRect) -> Path {
    let r = min(rect.width, rect.height) * rayonRelatif
    let x0 = rect.minX, y0 = rect.minY, x1 = rect.maxX, y1 = rect.maxY
    var p = Path()
    p.move(to: CGPoint(x: rect.midX, y: y0))
    p.addLine(to: CGPoint(x: x1 - r, y: y0))
    p.addArc(center: CGPoint(x: x1 - r, y: y0 + r), radius: r, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
    p.addLine(to: CGPoint(x: x1, y: y1 - r))
    p.addArc(center: CGPoint(x: x1 - r, y: y1 - r), radius: r, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
    p.addLine(to: CGPoint(x: x0 + r, y: y1))
    p.addArc(center: CGPoint(x: x0 + r, y: y1 - r), radius: r, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
    p.addLine(to: CGPoint(x: x0, y: y0 + r))
    p.addArc(center: CGPoint(x: x0 + r, y: y0 + r), radius: r, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
    p.closeSubpath()
    return p
  }
}

/// Anneau du bord de l'ecran : piste sombre et part restante en couleur (1 au depart, 0 a la fin).
struct AnneauBord: View {
  var progression: Double
  var couleur: Color
  var piste: Color = Teinte.piste
  var epaisseur: CGFloat = 7

  var body: some View {
    ZStack {
      BordEcran().stroke(piste, lineWidth: epaisseur)
      BordEcran()
        .trim(from: 0, to: CGFloat(min(1, max(0, progression))))
        .stroke(couleur, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round, lineJoin: .round))
        .animation(.linear(duration: 0.25), value: progression)
    }
    .padding(epaisseur / 2 + 1)
    .accessibilityHidden(true)
  }
}

/// Petites capitales espacees (« RANG 2 SUR 5 », « TON COACH »).
struct Capitales: View {
  var texte: String
  var couleur: Color
  var taille: CGFloat = 10

  var body: some View {
    Text(texte.uppercased())
      .font(.system(size: taille, weight: .heavy, design: .rounded))
      .tracking(taille * 0.12)
      .foregroundStyle(couleur)
      .lineLimit(1)
      .minimumScaleFactor(0.7)
  }
}

/// Segments des rounds ou des series : faits en peche, celui en cours dans sa couleur, a venir sur la piste.
struct Segments: View {
  var total: Int
  var faits: Int
  /// Couleur du segment en cours (nil : pas de segment en cours).
  var enCours: Color?
  var couleurFaits: Color = Teinte.peche
  var hauteur: CGFloat = 5
  var ecart: CGFloat = 3

  var body: some View {
    HStack(spacing: ecart) {
      ForEach(0..<max(1, min(total, 24)), id: \.self) { i in
        Capsule()
          .fill(i < faits ? couleurFaits : (i == faits && enCours != nil ? (enCours ?? Teinte.piste) : Teinte.piste))
          .frame(height: hauteur)
      }
    }
    .accessibilityHidden(true)
  }
}
