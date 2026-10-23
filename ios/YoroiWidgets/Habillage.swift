import ImageIO
import SwiftUI
import UIKit
import WidgetKit

// Trois habillages des widgets (13 octobre) : A Nuit de lanternes (par defaut), B Rouleau et encre, C Armure laquee.
// Le style vient du reglage du widget (appui long, Modifier le widget) ou, par defaut, du reglage de l'app
// (Reglages, Style des widgets, ecrit dans l'App Group). Maquettes : scratchpad/widgets_styles.

enum StyleW: String {
  case a = "A"
  case b = "B"
  case c = "C"

  /// "A", "B" ou "C" ; tout le reste donne A
  static func depuis(_ s: String?) -> StyleW { StyleW(rawValue: (s ?? "").uppercased()) ?? .a }
}

/// Place du widget, pour choisir son image de fond et son voile
enum DecorW {
  case petit
  case moyen
  case eau
  case chrono
  case grand
}

extension WidgetFamily {
  /// Ecran verrouille : monochrome impose par iOS
  var estVerrou: Bool { self == .accessoryCircular || self == .accessoryRectangular || self == .accessoryInline }
}

private func hx(_ v: UInt32, _ a: Double = 1) -> Color { a >= 1 ? Color.hexa(v) : Color.hexa(v).opacity(a) }

/// Les couleurs d'un style, en clair ou en sombre
struct Palette {
  let style: StyleW
  let sombre: Bool
  let texte: Color
  let doux: Color
  let titre: Color
  let bouton: Color
  let surBouton: Color
  let boutonDoux: Color
  let contourDoux: Color
  let courbe: Color
  let tirets: Color
  let bleu: Color
  let vert: Color
  let orange: Color
  let eau: Color
  let piste: Color
  let fait: Color
  let avenir: Color
  let trait: Color
  /// fond uni de secours (mode teinte, fond retire)
  let fondUni: Color
  /// lueur sous la courbe et l'anneau, nil sans halo
  let lueur: Color?

  static let vermillon = Color.hexa(0xE0452B)
  /// cachets du rouleau, un peu plus clairs la nuit
  var cachet: Color { style == .b && sombre ? Color.hexa(0xE8553A) : Palette.vermillon }

  static func de(_ style: StyleW, sombre: Bool) -> Palette {
    switch (style, sombre) {
    case (.a, true):
      return Palette(style: style, sombre: true, texte: hx(0xF6EFE3), doux: hx(0xF6EFE3, 0.72), titre: hx(0xF2C46B),
                     bouton: hx(0xF2C46B), surBouton: hx(0x1B1208), boutonDoux: hx(0xFFFFFF, 0.10), contourDoux: hx(0xF6EFE3, 0.30),
                     courbe: hx(0xFFF4DE), tirets: hx(0xF6EFE3, 0.55), bleu: hx(0x8DB9F2), vert: hx(0x6FD39A), orange: hx(0xF0A040),
                     eau: hx(0x8FC6F5), piste: hx(0xFFFFFF, 0.18), fait: hx(0xE9B95E), avenir: hx(0xF6EFE3, 0.50), trait: hx(0xF6EFE3, 0.16),
                     fondUni: hx(0x0E1020), lueur: hx(0xF2B45C))
    case (.a, false):
      return Palette(style: style, sombre: false, texte: hx(0x2A1C14), doux: hx(0x2A1C14, 0.68), titre: hx(0xB07A1E),
                     bouton: hx(0x2A1C14), surBouton: hx(0xFBF1E2), boutonDoux: hx(0x2A1C14, 0.07), contourDoux: hx(0x2A1C14, 0.22),
                     courbe: hx(0x3A2416), tirets: hx(0x3A2416, 0.50), bleu: hx(0x2C4A84), vert: hx(0x2E8A5C), orange: hx(0xA14E00),
                     eau: hx(0x2C6FB3), piste: hx(0x2A1C14, 0.12), fait: hx(0xC9963A), avenir: hx(0x2A1C14, 0.35), trait: hx(0x2A1C14, 0.12),
                     fondUni: hx(0xFBF1E2), lueur: nil)
    case (.b, false):
      return Palette(style: style, sombre: false, texte: hx(0x17140F), doux: hx(0x17140F, 0.62), titre: hx(0x17140F),
                     bouton: hx(0x17140F), surBouton: hx(0xF3E7D0), boutonDoux: hx(0x17140F, 0.05), contourDoux: hx(0x17140F, 0.35),
                     courbe: hx(0x17140F), tirets: hx(0x17140F, 0.45), bleu: hx(0x24407A), vert: hx(0x2E7D50), orange: hx(0xA14E00),
                     eau: hx(0x24407A), piste: hx(0x17140F, 0.12), fait: hx(0xE0452B), avenir: hx(0x17140F, 0.40), trait: hx(0x17140F, 0.18),
                     fondUni: hx(0xF3E7D0), lueur: nil)
    case (.b, true):
      return Palette(style: style, sombre: true, texte: hx(0xF1E6D2), doux: hx(0xF1E6D2, 0.66), titre: hx(0xF1E6D2),
                     bouton: hx(0xF1E6D2), surBouton: hx(0x1D1915), boutonDoux: hx(0xF1E6D2, 0.06), contourDoux: hx(0xF1E6D2, 0.35),
                     courbe: hx(0xF1E6D2), tirets: hx(0xF1E6D2, 0.45), bleu: hx(0x93B2EC), vert: hx(0x6CCB93), orange: hx(0xF0A040),
                     eau: hx(0x93B2EC), piste: hx(0xF1E6D2, 0.14), fait: hx(0xE8553A), avenir: hx(0xF1E6D2, 0.40), trait: hx(0xF1E6D2, 0.16),
                     fondUni: hx(0x1D1915), lueur: nil)
    case (.c, true):
      return Palette(style: style, sombre: true, texte: hx(0xF7EEDC), doux: hx(0xF7EEDC, 0.68), titre: hx(0xE2B964),
                     bouton: hx(0xE2B964), surBouton: hx(0x1A0E0C), boutonDoux: hx(0xF7EEDC, 0.06), contourDoux: hx(0xE2B964, 0.55),
                     courbe: hx(0xE2B964), tirets: hx(0xF7EEDC, 0.45), bleu: hx(0x8FB0EC), vert: hx(0x6FD39A), orange: hx(0xF0A040),
                     eau: hx(0x8FB0EC), piste: hx(0xF7EEDC, 0.14), fait: hx(0xE2B964), avenir: hx(0xE2B964, 0.60), trait: hx(0xE2B964, 0.25),
                     fondUni: hx(0x1A0B0A), lueur: hx(0xE2B964))
    case (.c, false):
      return Palette(style: style, sombre: false, texte: hx(0x160F0D), doux: hx(0x160F0D, 0.62), titre: hx(0xA87A28),
                     bouton: hx(0x160F0D), surBouton: hx(0xF2D58E), boutonDoux: hx(0x160F0D, 0.04), contourDoux: hx(0xA87A28, 0.70),
                     courbe: hx(0xA87A28), tirets: hx(0x160F0D, 0.40), bleu: hx(0x2C4A84), vert: hx(0x2E7D50), orange: hx(0xA14E00),
                     eau: hx(0x2C4A84), piste: hx(0x160F0D, 0.10), fait: hx(0xA87A28), avenir: hx(0xA87A28, 0.70), trait: hx(0xA87A28, 0.35),
                     fondUni: hx(0xFBF5EA), lueur: nil)
    }
  }

  /// Ecart au rythme prevu : vert dans l'allure, bleu au-dessus, orange trop vite
  func statut(_ s: String) -> Color {
    switch s {
    case "allure": return vert
    case "dessus": return bleu
    case "vite": return orange
    default: return doux
    }
  }

  // MARK: Polices

  /// Chiffres : serif (New York) pour le rouleau, police arrondie sinon, chasse fixe
  func chiffre(_ t: CGFloat, _ g: Font.Weight = .bold) -> Font {
    .system(size: t, weight: g, design: style == .b ? .serif : .rounded).monospacedDigit()
  }

  /// Textes forts (titres, noms)
  func fort(_ t: CGFloat, _ g: Font.Weight = .bold) -> Font {
    .system(size: t, weight: g, design: style == .b ? .serif : .rounded)
  }

  /// Petites legendes, toujours en police arrondie
  func legende(_ t: CGFloat, _ g: Font.Weight = .medium) -> Font {
    .system(size: t, weight: g, design: .rounded)
  }
}

// MARK: - Images

enum ImagesW {
  /// Lit une image du disque en la decodant a la bonne taille (la memoire de l'extension est comptee)
  static func charger(_ url: URL?, maxPixels: CGFloat) -> UIImage? {
    guard let url, FileManager.default.fileExists(atPath: url.path) else { return nil }
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      kCGImageSourceThumbnailMaxPixelSize: maxPixels,
    ]
    guard let cg = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
    return UIImage(cgImage: cg)
  }

  /// Scene par defaut du style A quand l'app n'a pas encore copie la tienne
  static func sceneLanternes(_ decor: DecorW, sombre: Bool) -> String {
    guard sombre else { return "yw_a_machiya_couchant" }
    switch decor {
    case .petit: return "yw_a_machiya_nuit"
    case .moyen: return "yw_a_lanternes_chateau"
    case .eau: return "yw_a_lanternes_canal"
    case .chrono: return "yw_a_lanternes_festival"
    case .grand: return "yw_a_partage_nuit"
    }
  }
}

extension Image {
  /// En mode teinte (iOS 18), l'image passe en niveaux de gris au lieu d'un aplat
  @ViewBuilder func pleineDesaturee() -> some View {
    if #available(iOS 18.0, *) {
      self.resizable().widgetAccentedRenderingMode(.desaturated)
    } else {
      self.resizable()
    }
  }
}

// MARK: - Habillage d'un widget

/// Pose le fond du style et donne la palette au contenu
struct HabilleW<Contenu: View>: View {
  @Environment(\.colorScheme) private var scheme
  @Environment(\.widgetFamily) private var famille
  @Environment(\.widgetRenderingMode) private var rendu
  @Environment(\.showsWidgetContainerBackground) private var avecFond

  let entree: EntreeYoroi
  let decor: DecorW
  @ViewBuilder let contenu: (Palette) -> Contenu

  var body: some View {
    // StandBy (fond retire) : toujours la palette de nuit
    let pal = Palette.de(entree.style, sombre: scheme == .dark || !avecFond)
    if famille.estVerrou {
      contenu(pal)
        .containerBackground(for: .widget) { Color.clear }
    } else {
      contenu(pal)
        .containerBackground(for: .widget) {
          if rendu == .fullColor {
            ZStack {
              FondW(pal: pal, decor: decor, scene: entree.scene)
              // Halloween, Noel : petites images dans le coin haut droit, sous le contenu (18 octobre 2026)
              DecorSaisonW(saison: GroupeYoroi.lireSaison(entree.date))
            }
          } else {
            pal.fondUni
          }
        }
    }
  }
}

/// Le fond d'un widget selon son style
struct FondW: View {
  let pal: Palette
  let decor: DecorW
  let scene: UIImage?

  var body: some View {
    switch pal.style {
    case .a: FondLanternes(pal: pal, decor: decor, scene: scene)
    case .b: FondRouleau(pal: pal)
    case .c: FondLaque(pal: pal)
    }
  }
}

/// A : ta scene en plein fond (ou la ruelle de nuit), sous un voile sombre ou creme
struct FondLanternes: View {
  let pal: Palette
  let decor: DecorW
  let scene: UIImage?

  private var image: Image {
    if let scene { return Image(uiImage: scene) }
    return Image(ImagesW.sceneLanternes(decor, sombre: pal.sombre))
  }

  private var voile: LinearGradient {
    let horizontal = decor == .moyen
    if pal.sombre {
      let a = Color(red: 10 / 255, green: 12 / 255, blue: 28 / 255)
      let b = Color(red: 8 / 255, green: 8 / 255, blue: 18 / 255)
      if horizontal {
        return LinearGradient(stops: [.init(color: a.opacity(0.92), location: 0), .init(color: a.opacity(0.70), location: 0.45), .init(color: a.opacity(0.30), location: 1)],
                              startPoint: .leading, endPoint: .trailing)
      }
      if decor == .eau {
        return LinearGradient(stops: [.init(color: a.opacity(0.45), location: 0), .init(color: a.opacity(0.70), location: 0.6), .init(color: b.opacity(0.88), location: 1)],
                              startPoint: .top, endPoint: .bottom)
      }
      return LinearGradient(stops: [.init(color: a.opacity(0.05), location: 0), .init(color: a.opacity(0.86), location: 0.66), .init(color: b.opacity(0.95), location: 1)],
                            startPoint: .top, endPoint: .bottom)
    }
    let creme = Color(red: 1, green: 244 / 255, blue: 228 / 255)
    let bas = Color.hexa(0xFBF1E2)
    if horizontal {
      return LinearGradient(stops: [.init(color: creme.opacity(0.95), location: 0), .init(color: creme.opacity(0.62), location: 0.5), .init(color: creme.opacity(0.18), location: 1)],
                            startPoint: .leading, endPoint: .trailing)
    }
    if decor == .eau {
      return LinearGradient(stops: [.init(color: creme.opacity(0.55), location: 0), .init(color: creme.opacity(0.80), location: 0.6), .init(color: bas.opacity(0.95), location: 1)],
                            startPoint: .top, endPoint: .bottom)
    }
    return LinearGradient(stops: [.init(color: creme.opacity(0), location: 0), .init(color: creme.opacity(0.94), location: 0.66), .init(color: bas, location: 1)],
                          startPoint: .top, endPoint: .bottom)
  }

  var body: some View {
    // l'image remplit le widget sans l'agrandir : posee sur un aplat qui prend la taille proposee
    pal.fondUni
      .overlay {
        image
          .pleineDesaturee()
          .scaledToFill()
      }
      .overlay { voile }
      .overlay {
        if decor == .grand {
          // le titre « Ton jour » reste lisible en blanc sur la scene
          LinearGradient(stops: [.init(color: Color(red: 60 / 255, green: 28 / 255, blue: 12 / 255).opacity(pal.sombre ? 0.25 : 0.5), location: 0), .init(color: .clear, location: 0.28)],
                         startPoint: .top, endPoint: .bottom)
        }
      }
      .clipped()
  }
}

/// B : papier washi texture, plus fonce sur les bords
struct FondRouleau: View {
  let pal: Palette

  var body: some View {
    ZStack {
      pal.fondUni
      Image(pal.sombre ? "yw_b_washi_sombre" : "yw_b_washi_clair")
        .resizable(resizingMode: .tile)
      RadialGradient(colors: [.clear, Color.hexa(pal.sombre ? 0x0F0D0B : 0xE9D9BC).opacity(pal.sombre ? 0.55 : 0.85)],
                     center: .center, startRadius: 40, endRadius: 260)
    }
  }
}

/// C : laque profonde, reflet en biais et double filet dore
struct FondLaque: View {
  let pal: Palette

  var body: some View {
    ZStack {
      if pal.sombre {
        RadialGradient(colors: [Color.hexa(0x5A1512), Color.hexa(0x2A0B0A), Color.hexa(0x0D0909)], center: UnitPoint(x: 0.65, y: 0.1), startRadius: 0, endRadius: 380)
      } else {
        RadialGradient(colors: [Color.hexa(0xFBF5EA), Color.hexa(0xF2E8D6), Color.hexa(0xE9DCC4)], center: UnitPoint(x: 0.35, y: 0.15), startRadius: 0, endRadius: 400)
      }
      LinearGradient(stops: [.init(color: Color.white.opacity(pal.sombre ? 0.07 : 0.35), location: 0), .init(color: .clear, location: 0.45)],
                     startPoint: .topLeading, endPoint: .bottomTrailing)
      ContainerRelativeShape()
        .inset(by: 5)
        .stroke(pal.sombre ? Color(red: 226 / 255, green: 185 / 255, blue: 100 / 255).opacity(0.6) : Color(red: 168 / 255, green: 122 / 255, blue: 40 / 255).opacity(0.75), lineWidth: 1)
      ContainerRelativeShape()
        .inset(by: 8)
        .stroke(pal.sombre ? Color(red: 226 / 255, green: 185 / 255, blue: 100 / 255).opacity(0.3) : Color(red: 168 / 255, green: 122 / 255, blue: 40 / 255).opacity(0.35), lineWidth: 0.6)
    }
  }
}

// MARK: - Decoration de saison (Halloween, Noel)

/// Comme INRO (SeasonDecor) : de petites images de saison dans le coin haut droit, dans la marge au dessus du contenu,
/// sous le contenu (fond du widget) : jamais sur un chiffre. Citrouille et chauve souris, sapin et flocons.
/// La saison vient de l'app (GroupeYoroi.lireSaison), vide hors saison ou si les decorations sont coupees.
struct DecorSaisonW: View {
  let saison: String

  var body: some View {
    if saison == "halloween" || saison == "noel" {
      GeometryReader { geo in
        let w = geo.size.width
        ZStack(alignment: .topLeading) {
          if saison == "halloween" {
            petite("yw_s_chauve_souris", 16, 8, x: w - 50, y: 9)
            petite("yw_s_citrouille", 16, 14.4, x: w - 27, y: 9)
          } else {
            petite("yw_s_flocon", 7, 7, x: w - 58, y: 7, opacite: 0.7)
            petite("yw_s_flocon", 9, 9, x: w - 44, y: 11, opacite: 0.85)
            petite("yw_s_sapin", 11, 16, x: w - 27, y: 9.5)
          }
        }
        .frame(width: w, height: geo.size.height, alignment: .topLeading)
      }
      .allowsHitTesting(false)
      .accessibilityHidden(true)
    } else {
      Color.clear
    }
  }

  private func petite(_ nom: String, _ largeur: CGFloat, _ hauteur: CGFloat, x: CGFloat, y: CGFloat, opacite: Double = 1) -> some View {
    Image(nom)
      .resizable()
      .scaledToFit()
      .frame(width: largeur, height: hauteur)
      .opacity(opacite)
      .position(x: x, y: y)
  }
}
