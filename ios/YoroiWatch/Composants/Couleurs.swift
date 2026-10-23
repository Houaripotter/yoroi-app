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
  static let fond = Color.black
  static let carte = Color(hexa: 0x1C1C1E)
  static let texte = Color(hexa: 0xF2F1EC)
  static let texteDoux = Color(hexa: 0xF2F1EC).opacity(0.62)
  static let accent = Color(hexa: 0x8FA8DE)
  static let vert = Color(hexa: 0x5FBF8A)
  static let bleu = Color(hexa: 0x6AA6E8)
  static let orange = Color(hexa: 0xF0A040)
  static let ambre = Color(hexa: 0xF2C14E)
  static let vermillon = Color(hexa: 0xE0452B)
  /// Rouge reserve aux records et aux erreurs.
  static let rouge = Color(hexa: 0xE5484D)

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
  static let piste = Color(hexa: 0xF2F1EC).opacity(0.18)
  static let plateau2 = Color(hexa: 0x2A2A2D)
  /// Fond plein des tuiles de minuteur (gris tres fonce), teinte de la couleur de la duree a 13 %.
  static let tuile = Color(hexa: 0x1F1F22)
  static let teinteTuile: Double = 0.13

  // Minuteurs : une couleur par tranche de duree, pour se reperer d'un coup d'oeil.
  // Meme couleur pour l'anneau du rond de la liste, l'ecran du minuteur en cours, l'ecran Termine
  // et la complication. Du vert au bleu, a l'indigo, au violet, a l'orchidee puis a l'ambre :
  // jamais de rouge (reserve aux erreurs et aux records). Toutes lisibles sur fond noir.
  /// Tranches : borne haute exclue (en secondes), couleur, version eclaircie pour les degrades.
  private static let tranchesMinuteur: [(jusqua: Int, couleur: UInt32, claire: UInt32)] = [
    (30, 0x5FBF8A, 0xA6E3C1),          // moins de 30 s : vert
    (60, 0x6CCBFF, 0xB5E6FF),          // 30 s a moins de 1 min : bleu clair
    (120, 0x8FA8DE, 0xC6D3F0),         // 1 a moins de 2 min : indigo eclairci (accent)
    (300, 0xB48CFF, 0xD7C2FF),         // 2 a moins de 5 min : violet
    (600, 0xE58FD6, 0xF3C4EB),         // 5 a moins de 10 min : orchidee
    (Int.max, 0xF2C14E, 0xF8DF9F),     // 10 min et plus : ambre
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
