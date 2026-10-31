import CoreText
import SwiftUI
import WidgetKit

// Grands widgets iPad et Mac (31 octobre 2026) : couleurs, polices et petits morceaux communs.
// Couleurs recopiees des maquettes validees (_propositions/widgets_grands_2026-10-31/_travail/source/widgets.js,
// THEMES), qui viennent elles-memes du code de l'app (components/yoroi/tokens.ts, usePastel, Visus.tsx).
// Rien ici ne depend de Style.swift : ce dossier se compile a cote des widgets existants sans les toucher.

// MARK: - Couleurs

extension Color {
  /// Couleur depuis un entier 0xRRGGBB
  static func g(_ v: UInt32, _ opacite: Double = 1) -> Color {
    Color(.sRGB, red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255, opacity: opacite)
  }
}

/// Un pastel : le fond de la tuile et sa couleur de texte
struct PastelG {
  let fond: Color
  let texte: Color
}

/// Un anneau d'activite : debut et fin du degrade, piste
struct AnneauActiviteG {
  let debut: Color
  let fin: Color
  let piste: Color
}

struct PaletteG {
  let sombre: Bool
  /// widget atténué (bureau du Mac au repos, ecran d'accueil teinte) : fonds unis retires, texte en clair
  var attenue: Bool = false
  let fond: Color
  let carte: Color
  let tuile: Color
  let encre: Color
  let doux: Color
  let pale: Color
  let trait: Color
  let accent: Color
  let detail: Color
  let vert: Color
  let ambre: Color
  let rouge: Color
  let or: Color
  let anneauFond: Color
  let jaune: PastelG
  let bleu: PastelG
  let peche: PastelG
  let menthe: PastelG
  let lilas: PastelG
  let push: Color
  let pull: Color
  let jambes: Color
  let bas: Color
  let indigo: Color
  let surIndigo: Color
  let indigoDoux: Color
  let bouton: Color
  let surBouton: Color
  let jourFait: Color
  let jourRepos: Color
  let pas: AnneauActiviteG
  let exercice: AnneauActiviteG
  let calories: AnneauActiviteG

  static let clair = PaletteG(
    sombre: false,
    fond: .g(0xFFFFFF), carte: .g(0xFFFFFF), tuile: .g(0xEEF0F7), encre: .g(0x1D2033), doux: .g(0x646985), pale: .g(0x8F94AC), trait: .g(0xECEEF5),
    accent: .g(0x23358F), detail: .g(0x4C6EF5), vert: .g(0x1C6B45), ambre: .g(0xA57A1C), rouge: .g(0xE0452B), or: .g(0xC59D45), anneauFond: .g(0xE8EBF4),
    jaune: PastelG(fond: .g(0xF6EEDD), texte: .g(0xA57A1C)), bleu: PastelG(fond: .g(0xE6ECF8), texte: .g(0x3557D9)),
    peche: PastelG(fond: .g(0xFBE7DE), texte: .g(0xB4471E)), menthe: PastelG(fond: .g(0xE3F2EA), texte: .g(0x1C6B45)),
    lilas: PastelG(fond: .g(0xEFE6F3), texte: .g(0x8A3F78)),
    push: .g(0x3557D9), pull: .g(0xB4471E), jambes: .g(0x1C6B45), bas: .g(0xA57A1C), indigo: .g(0x23358F), surIndigo: .g(0xFFFFFF), indigoDoux: .g(0xD5DCF5),
    bouton: .g(0xDCE3FF), surBouton: .g(0x23358F), jourFait: .g(0xE8ECFF), jourRepos: .g(0xEEF0F7),
    pas: AnneauActiviteG(debut: .g(0xFA114F), fin: .g(0xFF3B8E), piste: .g(0xFFE0EA)),
    exercice: AnneauActiviteG(debut: .g(0x92E82A), fin: .g(0xB6FF3A), piste: .g(0xE9F9D2)),
    calories: AnneauActiviteG(debut: .g(0x1EEAEF), fin: .g(0x6BF6FF), piste: .g(0xD6F8FA))
  )

  static let nuit = PaletteG(
    sombre: true,
    fond: .g(0x1A1E29), carte: .g(0x242936), tuile: .g(0x1F2430), encre: .g(0xECEAE3), doux: .g(0xB8BBC6), pale: .g(0x8A8E9B), trait: .g(0x242935),
    accent: .g(0x8FA8DE), detail: .g(0x8FA8DE), vert: .g(0xA8C77A), ambre: .g(0xD3AE5C), rouge: .g(0xE0452B), or: .g(0xD8B562), anneauFond: .g(0x252A36),
    jaune: PastelG(fond: .g(0x2F2A1C), texte: .g(0xD3AE5C)), bleu: PastelG(fond: .g(0x212B42), texte: .g(0x8FA8DE)),
    peche: PastelG(fond: .g(0x3A2326), texte: .g(0xEC7A70)), menthe: PastelG(fond: .g(0x222B1D), texte: .g(0xA8C77A)),
    lilas: PastelG(fond: .g(0x1F2430), texte: .g(0x8FA8DE)),
    push: .g(0x8FA8DE), pull: .g(0xEC7A70), jambes: .g(0xA8C77A), bas: .g(0xD3AE5C), indigo: .g(0x232838), surIndigo: .g(0xECEAE3), indigoDoux: .g(0xB8BBC6),
    bouton: .g(0x2A3557), surBouton: .g(0xDCE3FF), jourFait: .g(0x1E2540), jourRepos: .g(0x1F2430),
    pas: AnneauActiviteG(debut: .g(0xFA114F), fin: .g(0xFF3B8E), piste: .g(0x3B0A16)),
    exercice: AnneauActiviteG(debut: .g(0x92E82A), fin: .g(0xB6FF3A), piste: .g(0x1C2E07)),
    calories: AnneauActiviteG(debut: .g(0x1EEAEF), fin: .g(0x6BF6FF), piste: .g(0x08363A))
  )

  /// Mode atténué (widgetRenderingMode accented ou vibrant) : le systeme recolore tout. On garde des contrastes
  /// nets : texte blanc, pistes et tuiles en blanc transparent, plus aucun aplat de couleur.
  static let attenueBase: PaletteG = {
    let blanc = Color.white
    let voile = Color.white.opacity(0.14)
    let p = PastelG(fond: voile, texte: blanc.opacity(0.85))
    let a = AnneauActiviteG(debut: blanc, fin: blanc, piste: blanc.opacity(0.18))
    return PaletteG(
      sombre: true, attenue: true,
      fond: .clear, carte: voile, tuile: voile, encre: blanc, doux: blanc.opacity(0.75), pale: blanc.opacity(0.55), trait: blanc.opacity(0.2),
      accent: blanc, detail: blanc, vert: blanc, ambre: blanc, rouge: blanc, or: blanc, anneauFond: blanc.opacity(0.18),
      jaune: p, bleu: p, peche: p, menthe: p, lilas: p,
      push: blanc, pull: blanc.opacity(0.8), jambes: blanc.opacity(0.65), bas: blanc.opacity(0.5), indigo: voile, surIndigo: blanc, indigoDoux: blanc.opacity(0.75),
      bouton: blanc.opacity(0.22), surBouton: blanc, jourFait: blanc.opacity(0.2), jourRepos: blanc.opacity(0.08),
      pas: a, exercice: a, calories: a
    )
  }()

  static func pour(_ schema: ColorScheme, _ mode: WidgetRenderingMode) -> PaletteG {
    if mode != .fullColor { return attenueBase }
    return schema == .dark ? nuit : clair
  }
}

private struct ClePaletteG: EnvironmentKey {
  static let defaultValue = PaletteG.clair
}

extension EnvironmentValues {
  var paletteG: PaletteG {
    get { self[ClePaletteG.self] }
    set { self[ClePaletteG.self] = newValue }
  }
}

// MARK: - Polices (Archivo, comme l'app)

enum PolicesG {
  private static var faites = false
  private static let verrou = NSLock()

  /// Enregistre les polices Archivo du dossier Grands/Polices pour l'extension (sans toucher a Info.plist).
  /// Sans elles, Font.custom retombe sur la police du systeme : rien ne casse.
  static func enregistrer() {
    verrou.lock()
    defer { verrou.unlock() }
    if faites { return }
    faites = true
    for nom in ["Archivo_500Medium", "Archivo_700Bold", "Archivo_800ExtraBold", "Archivo_900Black"] {
      guard let url = Bundle.main.url(forResource: nom, withExtension: "ttf") else { continue }
      CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }
  }
}

enum GraisseG {
  case moyen, gras, extra, noir

  var nom: String {
    switch self {
    case .moyen: return "Archivo-Medium"
    case .gras: return "Archivo-Bold"
    case .extra: return "Archivo-ExtraBold"
    case .noir: return "Archivo-Black"
    }
  }

  var systeme: Font.Weight {
    switch self {
    case .moyen: return .medium
    case .gras: return .bold
    case .extra: return .heavy
    case .noir: return .black
    }
  }
}

extension Font {
  /// Archivo a la taille de la maquette (points du widget dessine), sinon la police du systeme
  static func ag(_ taille: CGFloat, _ g: GraisseG = .noir) -> Font {
    .custom(g.nom, fixedSize: taille)
  }
}

// MARK: - Textes

/// Texte fixe du widget, en francais ; traduisible plus tard par les Localizable.strings de l'extension
func gL(_ cle: String) -> String {
  NSLocalizedString(cle, comment: "")
}

extension Text {
  /// Petit titre en capitales (.sur de la maquette)
  func gSur(_ c: Color, _ taille: CGFloat = 12) -> some View {
    self.font(.ag(taille, .noir)).tracking(taille * 0.09).textCase(.uppercase).foregroundStyle(c).lineLimit(1)
  }

  /// Libelle de tuile en capitales (.tl)
  func gTl(_ c: Color, _ taille: CGFloat = 11) -> some View {
    self.font(.ag(taille, .noir)).tracking(taille * 0.07).textCase(.uppercase).foregroundStyle(c).lineLimit(2)
  }
}

// MARK: - Mise en page a l'echelle de la maquette

/// Dessine le contenu a la largeur de la maquette (715 points en tres grand, 364 en grand), puis le met a
/// l'echelle du widget reel : iPad 11 et 13 pouces, Mac et iPhone gardent la meme composition.
/// La hauteur suit la proportion du widget, les blocs souples (Spacer) absorbent la difference.
struct CanevasG<Contenu: View>: View {
  let largeur: CGFloat
  @ViewBuilder let contenu: () -> Contenu

  var body: some View {
    GeometryReader { g in
      let s = g.size.width > 1 ? g.size.width / largeur : 1
      contenu()
        .frame(width: largeur, height: max(1, g.size.height / s), alignment: .topLeading)
        .scaleEffect(s, anchor: .topLeading)
        .frame(width: g.size.width, height: g.size.height, alignment: .topLeading)
    }
  }
}

// MARK: - Morceaux

/// Sticker de l'app (catalogue Grands.xcassets, prefixe yg_s_)
struct StickerG: View {
  let nom: String
  var taille: CGFloat = 28
  var opacite: Double = 1
  var prefixe: String = "yg_s_"

  var body: some View {
    Image(prefixe + nom)
      .resizable()
      .gImageAttenuee()
      .scaledToFit()
      .frame(width: taille, height: taille)
      .opacity(opacite)
      .shadow(color: .black.opacity(0.12), radius: 0.75, x: 0, y: 1)
  }
}

extension Image {
  /// En mode atténué (iOS 18 teinte, bureau du Mac), l'image passe en niveaux de gris plutot qu'en aplat
  @ViewBuilder func gImageAttenuee() -> some View {
    if #available(iOS 18.0, *) {
      self.widgetAccentedRenderingMode(.desaturated)
    } else {
      self
    }
  }
}

/// Anneau de progression simple, contenu au centre
struct AnneauG<Contenu: View>: View {
  let part: Double
  let taille: CGFloat
  let epaisseur: CGFloat
  let couleur: Color
  let fond: Color
  @ViewBuilder var contenu: () -> Contenu

  var body: some View {
    ZStack {
      Circle().stroke(fond, lineWidth: epaisseur)
      Circle()
        .trim(from: 0, to: max(0, min(1, part)))
        .stroke(couleur, style: StrokeStyle(lineWidth: epaisseur, lineCap: .round))
        .rotationEffect(.degrees(-90))
        .widgetAccentable()
      contenu()
    }
    .padding(epaisseur / 2)
    .frame(width: taille, height: taille)
  }
}

/// Les trois anneaux d'activite (pas, exercice, calories), de l'exterieur vers l'interieur
struct AnneauxActiviteG: View {
  let taille: CGFloat
  let valeurs: [(part: Double, teinte: AnneauActiviteG)]

  var body: some View {
    let ep = taille * 0.115
    let ecart: CGFloat = 3
    ZStack {
      ForEach(Array(valeurs.enumerated()), id: \.offset) { i, v in
        let d = taille - ep - CGFloat(i) * 2 * (ep + ecart)
        if d > 0 {
          ZStack {
            Circle().stroke(v.teinte.piste, lineWidth: ep)
            Circle()
              .trim(from: 0, to: max(0, min(1, v.part)))
              .stroke(LinearGradient(colors: [v.teinte.debut, v.teinte.fin], startPoint: .topLeading, endPoint: .bottomTrailing), style: StrokeStyle(lineWidth: ep, lineCap: .round))
              .rotationEffect(.degrees(-90))
              .widgetAccentable()
          }
          .frame(width: d, height: d)
        }
      }
    }
    .frame(width: taille, height: taille)
  }
}

/// Barre de progression arrondie
struct BarreG: View {
  let part: Double
  let couleur: Color
  let fond: Color
  var hauteur: CGFloat = 10
  var degrade: [Color]? = nil

  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .leading) {
        Capsule().fill(fond)
        if part > 0 {
          Group {
            if let degrade {
              Capsule().fill(LinearGradient(colors: degrade, startPoint: .leading, endPoint: .trailing))
            } else {
              Capsule().fill(couleur)
            }
          }
          .frame(width: max(hauteur, g.size.width * min(1, part)))
          .widgetAccentable()
        }
      }
    }
    .frame(height: hauteur)
  }
}

/// Pastille arrondie avec un sticker (« 6 semaines d'affilée »)
struct PastilleG: View {
  let texte: String
  var sticker: String? = nil
  let fond: Color
  let couleur: Color
  var taille: CGFloat = 12.5
  var stickerTaille: CGFloat = 22

  var body: some View {
    HStack(spacing: 6) {
      if let sticker { StickerG(nom: sticker, taille: stickerTaille) }
      Text(texte).font(.ag(taille, .noir)).foregroundStyle(couleur).lineLimit(1)
    }
    .padding(.vertical, 6)
    .padding(.leading, sticker == nil ? 12 : 8)
    .padding(.trailing, 12)
    .background(Capsule().fill(fond))
    .fixedSize()
  }
}

/// Petite puce grise (« 38 pesées »)
struct PuceG: View {
  let texte: String
  var sticker: String? = nil
  let fond: Color
  let couleur: Color
  var stickerTaille: CGFloat = 20

  var body: some View {
    HStack(spacing: 6) {
      if let sticker { StickerG(nom: sticker, taille: stickerTaille) }
      Text(texte).font(.ag(11.5, .extra)).foregroundStyle(couleur).lineLimit(1)
    }
    .padding(.vertical, 5)
    .padding(.leading, sticker == nil ? 10 : 6)
    .padding(.trailing, 10)
    .background(Capsule().fill(fond))
    .fixedSize()
  }
}

/// Bouton plein (lien ou intention)
struct BoutonG: View {
  let texte: String
  var sticker: String? = nil
  let fond: Color
  let couleur: Color
  var taille: CGFloat = 13
  var vertical: CGFloat = 7

  var body: some View {
    HStack(spacing: 6) {
      if let sticker { StickerG(nom: sticker, taille: taille + 7) }
      Text(texte).font(.ag(taille, .noir)).foregroundStyle(couleur).lineLimit(1)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, vertical)
    .padding(.horizontal, 12)
    .background(Capsule().fill(fond))
  }
}

/// Tuile pastel : libelle, valeur, sous-titre, sticker en haut a droite
struct TuileG<Bas: View>: View {
  let pastel: PastelG
  let libelle: String
  let valeur: String
  var sous: String? = nil
  var sticker: String? = nil
  var stickerTaille: CGFloat = 28
  var valeurTaille: CGFloat = 22
  @ViewBuilder var bas: () -> Bas

  @Environment(\.paletteG) var t

  var body: some View {
    ZStack(alignment: .topTrailing) {
      VStack(alignment: .leading, spacing: 0) {
        Text(libelle).gTl(pastel.texte).padding(.trailing, sticker == nil ? 0 : stickerTaille + 6)
        Text(valeur).font(.ag(valeurTaille, .noir)).foregroundStyle(t.encre).lineLimit(1).minimumScaleFactor(0.7).padding(.top, 4)
        if let sous, !sous.isEmpty {
          Text(sous).font(.ag(11.5, .extra)).foregroundStyle(pastel.texte).lineLimit(2).padding(.top, 3)
        }
        Spacer(minLength: 0)
        bas()
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      if let sticker { StickerG(nom: sticker, taille: stickerTaille) }
    }
    .padding(.vertical, 11)
    .padding(.horizontal, 12)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(pastel.fond))
  }
}

extension TuileG where Bas == EmptyView {
  init(pastel: PastelG, libelle: String, valeur: String, sous: String? = nil, sticker: String? = nil, stickerTaille: CGFloat = 28, valeurTaille: CGFloat = 22) {
    self.init(pastel: pastel, libelle: libelle, valeur: valeur, sous: sous, sticker: sticker, stickerTaille: stickerTaille, valeurTaille: valeurTaille, bas: { EmptyView() })
  }
}

/// Etat vide propre : rien a montrer, jamais de chiffre invente
struct VideG: View {
  let titre: String
  let texte: String
  var sticker: String = "activite"
  let couleur: Color

  @Environment(\.paletteG) var t

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) {
        StickerG(nom: sticker, taille: 30)
        Text(titre).gSur(couleur)
      }
      Spacer(minLength: 0)
      Text(texte).font(.ag(17, .noir)).foregroundStyle(t.encre).lineLimit(3)
      Text(gL("Ouvre YOROI : ce widget se remplit avec tes vraies données.")).font(.ag(12.5, .gras)).foregroundStyle(t.doux).lineLimit(2)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}
