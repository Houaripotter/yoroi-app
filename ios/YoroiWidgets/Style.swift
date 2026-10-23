import SwiftUI
import UIKit
import WidgetKit

// Design v2 : papier et encre en clair, fond nuit en sombre. Couleurs dynamiques (clair et sombre).

extension UIColor {
  convenience init(hexa: UInt32) {
    self.init(red: CGFloat((hexa >> 16) & 0xFF) / 255, green: CGFloat((hexa >> 8) & 0xFF) / 255, blue: CGFloat(hexa & 0xFF) / 255, alpha: 1)
  }
}

extension Color {
  /// Couleur qui suit le mode clair ou sombre du widget
  static func dyn(_ clair: UInt32, _ sombre: UInt32) -> Color {
    Color(UIColor { t in t.userInterfaceStyle == .dark ? UIColor(hexa: sombre) : UIColor(hexa: clair) })
  }

  static func hexa(_ v: UInt32) -> Color { Color(UIColor(hexa: v)) }
}

enum Teinte {
  static let fond = Color.dyn(0xF2F1EC, 0x14161F)
  static let carte = Color.dyn(0xE8E6DE, 0x1E2130)
  static let encre = Color.dyn(0x1D2029, 0xF2F1EC)
  static let doux = Color.dyn(0x5E6170, 0xA7AAB8)
  static let trait = Color.dyn(0xD3D0C6, 0x343849)
  static let accent = Color.dyn(0x2C4A84, 0x8FA8DE)
  static let surAccent = Color.dyn(0xF2F1EC, 0x14161F)
  static let vert = Color.dyn(0x3E9B6A, 0x5FBF8A)
  static let bleu = Color.dyn(0x2F50B8, 0x8EA6FF)
  static let orange = Color.dyn(0xA14E00, 0xF3A55C)
  static let ambre = Color.dyn(0xB7791F, 0xF2C14E)
  static let vermillon = Color.hexa(0xE0452B)
  static let noirTorii = Color.dyn(0x1D2029, 0x0B0C10)

  /// Ecart au rythme prevu : vert dans l'allure, bleu au-dessus, orange trop vite
  static func statut(_ s: String) -> Color {
    switch s {
    case "allure": return vert
    case "dessus": return bleu
    case "vite": return orange
    default: return doux
    }
  }

  /// Couleur d'une phase du chrono
  static func phase(_ p: String) -> Color {
    switch p {
    case "repos": return vert
    case "prepa": return ambre
    default: return accent
    }
  }

  /// Variantes claires pour la Dynamic Island (toujours sur fond noir)
  static func phaseIle(_ p: String) -> Color {
    switch p {
    case "repos": return Color.hexa(0x5FBF8A)
    case "prepa": return Color.hexa(0xF2C14E)
    default: return Color.hexa(0x8FA8DE)
    }
  }
}

extension Font {
  /// Chiffres en police arrondie, a chasse fixe
  static func chiffre(_ taille: CGFloat, _ graisse: Font.Weight = .semibold) -> Font {
    .system(size: taille, weight: graisse, design: .rounded).monospacedDigit()
  }

  static func libelle(_ taille: CGFloat = 13, _ graisse: Font.Weight = .semibold) -> Font {
    .system(size: taille, weight: graisse, design: .rounded)
  }
}

enum Fmt {
  // 23 octobre 2026 : dates et nombres dans la langue affichée par le widget
  private static let fr = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "fr")

  private static func nombre(_ chiffres: Int) -> NumberFormatter {
    let f = NumberFormatter()
    f.locale = fr
    f.numberStyle = .decimal
    f.minimumFractionDigits = chiffres
    f.maximumFractionDigits = chiffres
    return f
  }

  private static let un = nombre(1)
  private static let zero = nombre(0)

  private static let formatJourMois: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "fr")
    f.setLocalizedDateFormatFromTemplate("d MMM")
    return f
  }()

  private static let formatJourLong: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "fr")
    f.setLocalizedDateFormatFromTemplate("EEEE d MMMM")
    return f
  }()

  static let kgParLivre = 0.45359237

  static func decimal(_ x: Double) -> String { un.string(from: NSNumber(value: x)) ?? String(format: "%.1f", x) }

  static func entier(_ x: Double) -> String { zero.string(from: NSNumber(value: x.rounded())) ?? "\(Int(x.rounded()))" }

  static func unite(_ livres: Bool) -> String { livres ? "lb" : "kg" }

  /// "72,4" dans l'unite choisie
  static func poids(_ kg: Double, _ livres: Bool) -> String { decimal(livres ? kg / kgParLivre : kg) }

  /// "+0,4" ou "-1,2" (trait d'union simple), "0,0" quand c'est pile
  static func ecart(_ kg: Double, _ livres: Bool) -> String {
    let v = livres ? kg / kgParLivre : kg
    if abs(v) < 0.05 { return decimal(0) }
    return (v > 0 ? "+" : "-") + decimal(abs(v))
  }

  /// "1,2 L" ou "750 ml"
  static func eau(_ ml: Double) -> String {
    if ml >= 1000 { return decimal(ml / 1000) + " L" }
    return entier(ml) + " ml"
  }

  /// "12 oct."
  static func jourCourt(_ iso: String) -> String {
    guard let d = Jours.lire(iso) else { return iso }
    return formatJourMois.string(from: d)
  }

  /// "samedi 8 novembre"
  static func jourLong(_ iso: String) -> String {
    guard let d = Jours.lire(iso) else { return iso }
    return formatJourLong.string(from: d)
  }

  /// "Aujourd'hui", "Hier" ou "12 oct."
  static func jourRelatif(_ iso: String, _ maintenant: Date) -> String {
    guard let d = Jours.lire(iso) else { return iso }
    let n = Jours.ecart(de: d, a: maintenant)
    if n == 0 { return NSLocalizedString("Aujourd'hui", comment: "") }
    if n == 1 { return NSLocalizedString("Hier", comment: "") }
    return formatJourMois.string(from: d)
  }

  /// "3 min", "45 s", "1 min 30"
  static func duree(_ s: Int) -> String {
    if s < 60 { return "\(s) s" }
    let m = s / 60
    let r = s % 60
    return r == 0 ? "\(m) min" : "\(m) min \(r)"
  }

  /// "12:05" ou "1:02:05"
  static func chrono(_ secondes: Int) -> String {
    let s = max(0, secondes)
    let h = s / 3600
    let m = (s % 3600) / 60
    let r = s % 60
    if h > 0 { return String(format: "%d:%02d:%02d", h, m, r) }
    return String(format: "%d:%02d", m, r)
  }

  /// "J-12", "Jour J"
  static func jMoins(_ n: Int) -> String { n == 0 ? NSLocalizedString("Jour J", comment: "") : String(format: NSLocalizedString("J-%@", comment: ""), "\(n)") }
}

// MARK: - Liens profonds : un seul format yoroi://w/<cible>, traduit par l'app (lib/v2/widgets/liens.ts)

enum Liens {
  static let poids = URL(string: "yoroi://w/poids")!
  static let pesee = URL(string: "yoroi://w/pesee")!
  static let seances = URL(string: "yoroi://w/semaine")!
  /// bouton « Séance faite » : noter une séance deja faite
  static let seance = URL(string: "yoroi://w/seance-faite")!
  static let eau = URL(string: "yoroi://w/eau")!
  /// chrono rounds avec ton dernier reglage
  static let chrono = URL(string: "yoroi://w/timer?mode=combat")!
  static let tabata = URL(string: "yoroi://w/timer?mode=tabata")!
  /// Live Activity : revient au chrono deja ouvert, sans en ouvrir un second
  static let chronoEnCours = URL(string: "yoroi://w/chrono-en-cours")!
  static let combat = URL(string: "yoroi://w/combat")!
  static let ajouterCombat = URL(string: "yoroi://w/ajout-combat")!
  static let accueil = URL(string: "yoroi://w/accueil")!
}

// MARK: - Fond du widget

extension View {
  /// Fond papier ou nuit pour l'ecran d'accueil ; transparent pour l'ecran verrouille
  @ViewBuilder
  func fondYoroi(_ famille: WidgetFamily) -> some View {
    switch famille {
    case .accessoryCircular, .accessoryRectangular, .accessoryInline:
      self.containerBackground(for: .widget) { Color.clear }
    default:
      self.containerBackground(for: .widget) { Teinte.fond }
    }
  }
}

/// Etat vide propre, sans chiffre
struct VueVide: View {
  var titre: String
  var compact = false

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(titre)
        .font(.libelle(13))
        .foregroundStyle(Teinte.doux)
      Spacer(minLength: 0)
      Text("Ouvre Yoroi pour commencer")
        .font(.libelle(compact ? 14 : 16, .semibold))
        .foregroundStyle(Teinte.encre)
        .lineLimit(3)
        .minimumScaleFactor(0.8)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}
