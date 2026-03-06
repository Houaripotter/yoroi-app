import SwiftUI
import WatchKit

// ============================================================
// YOROI WATCH — SYSTÈME RESPONSIVE
// Adapte automatiquement les tailles à chaque modèle de montre
//
// Tailles d'écran Apple Watch (points logiques, largeur) :
//   Series 4/5  40mm : 162 pt
//   Series 4/5  44mm : 184 pt
//   Series 6/7/8 41mm: 176 pt
//   Series 6/7/8 45mm: 198 pt
//   Ultra / Ultra 2  : 205 pt
// ============================================================

struct WatchScreen {

  // Dimensions réelles de l'écran
  static let bounds = WKInterfaceDevice.current().screenBounds
  static let width: CGFloat  = bounds.width
  static let height: CGFloat = bounds.height

  // Référence de base : Apple Watch Series 6/7/8 41mm (176 × 215)
  static let refWidth:  CGFloat = 176
  static let refHeight: CGFloat = 215

  // Facteur de scale (0.85 pour Series 4 40mm, 1.17 pour Ultra)
  static let scaleFactor: CGFloat = {
    let f = width / refWidth
    return min(max(f, 0.85), 1.25)
  }()

  /// true si la montre est grande (Ultra, 45mm, 44mm)
  static let isLarge: Bool = width >= 184
  /// true si la montre est une Ultra/Ultra 2
  static let isUltra: Bool = width >= 200

  // ── Scale d'une valeur proportionnelle à la largeur
  static func s(_ value: CGFloat) -> CGFloat {
    return (value * scaleFactor).rounded()
  }

  // ── Scale d'une taille de police (variation modérée)
  static func fs(_ size: CGFloat) -> CGFloat {
    let scaled = size + (s(size) - size) * 0.5
    return scaled.rounded()
  }

  // ── Padding horizontal adapté
  static var hPad: CGFloat { s(isUltra ? 6 : 4) }

  // ── Hauteur du bandeau titre
  static var titleSize: CGFloat { fs(isLarge ? 12 : 11) }

  // ── Taille principale des chiffres (ex: poids, durée)
  static var bigNumberSize: CGFloat { fs(isUltra ? 26 : isLarge ? 24 : 22) }

  // ── Taille secondaire (labels, unités)
  static var labelSize: CGFloat { fs(isLarge ? 11 : 10) }

  // ── Taille icônes
  static var iconSize: CGFloat { fs(isLarge ? 13 : 12) }
}

// ============================================================
// VIEW MODIFIER — rend n'importe quelle vue responsive
// ============================================================

extension View {
  /// Applique un padding horizontal adaptatif
  func watchHPad() -> some View {
    self.padding(.horizontal, WatchScreen.hPad)
  }

  /// Frame adaptatif en largeur max (sans contraindre la hauteur)
  func watchFullWidth() -> some View {
    self.frame(maxWidth: .infinity)
  }
}
