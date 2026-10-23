import SwiftUI
import WatchKit

// Tuile de minuteur facon Yoroi : squircle plein (gris tres fonce teinte de la couleur de sa tranche
// de duree, Teinte.minuteur), contour epais de la meme couleur qui suit la forme, gros chiffre blanc
// arrondi, unite coloree dessous. 2 tuiles par ligne remplissent la largeur et 2 rangees tiennent
// entieres sous le titre, sur toutes les tailles (40 a 49 mm). Toute la case est tactile.

struct StyleAppui: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.93 : 1)
      .opacity(configuration.isPressed ? 0.85 : 1)
      .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
  }
}

/// Fond d'une tuile : gris tres fonce, legerement teinte de la couleur de la duree.
struct FondTuile<Forme: Shape>: View {
  var forme: Forme
  var teinte: Color

  var body: some View {
    ZStack {
      forme.fill(Teinte.tuile)
      forme.fill(teinte.opacity(Teinte.teinteTuile))
    }
  }
}

struct RondMinuteur: View {
  var secondes: Int
  /// Couleur du contour et de l'unite : par defaut celle de la tranche de duree (Teinte.minuteur).
  var couleur: Color? = nil
  /// Petite icone discrete posee sur le coin haut droit du contour (epingle, mode Modifier) : symbole SF.
  var badge: String? = nil
  /// Couleur de l'icone : par defaut celle de la tuile.
  var couleurBadge: Color? = nil
  /// Taille de la tuile, calculee par TailleTuile depuis la place reelle de l'ecran.
  var taille: CGSize = TailleTuile.repli
  var action: () -> Void

  private var valeur: String { Format.rondMinuteurValeur(secondes) }
  private var unite: String { Format.rondMinuteurUnite(secondes) }
  private var teinte: Color { couleur ?? Teinte.minuteur(secondes) }
  private var largeur: CGFloat { taille.width }
  private var hauteur: CGFloat { taille.height }
  private var retrait: CGFloat { TailleTuile.retraitContour }

  /// Contour epais, proportionne a la tuile : 4 pt vers 60 pt, 5 a 6 pt vers 80 pt.
  private var trait: CGFloat { max(4, (min(largeur, hauteur) * 0.07).rounded()) }

  /// Gros chiffre : "1:30" (4 signes) un peu plus petit que "45" ou "10". Borne aussi par la largeur
  /// libre dans le contour (chiffres a chasse fixe d'environ 0,6 em, deux-points 0,3 em) :
  /// jamais de texte coupe, minimumScaleFactor en filet de securite.
  private var tailleValeur: CGFloat {
    let parHauteur: CGFloat
    switch valeur.count {
    case ...2: parHauteur = hauteur * 0.44
    case 3: parHauteur = hauteur * 0.40
    default: parHauteur = hauteur * 0.36
    }
    let libre = largeur - 2 * (retrait + trait + 4)
    let em = CGFloat(valeur.count) * 0.6 - (valeur.contains(":") ? 0.3 : 0)
    return max(12, min(parHauteur, libre / max(1, em)).rounded())
  }

  private var tailleUnite: CGFloat { max(9, (hauteur * 0.17).rounded()) }
  private var tailleBadge: CGFloat { min(15, max(12, (hauteur * 0.19).rounded())) }

  var body: some View {
    Button(action: action) {
      ZStack {
        FondTuile(forme: Squircle(), teinte: teinte)
        Squircle()
          .inset(by: retrait)
          .strokeBorder(teinte, lineWidth: trait)
        VStack(spacing: -2) {
          Text(valeur)
            .font(.chiffre(tailleValeur, .bold))
            .foregroundStyle(Teinte.texte)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(unite)
            .font(.system(size: tailleUnite, weight: .heavy, design: .rounded))
            .foregroundStyle(teinte)
            .lineLimit(1)
        }
        .padding(.horizontal, retrait + trait + 3)
        if let badge {
          pastille(badge)
        }
      }
      .frame(width: largeur, height: hauteur)
      // Toute la case de la grille est tactile, pas seulement la tuile.
      .frame(maxWidth: .infinity, minHeight: max(44, hauteur))
      .contentShape(Rectangle())
    }
    .buttonStyle(StyleAppui())
    .accessibilityLabel("Minuteur de \(Format.dureeCourte(secondes))")
  }

  /// Icone posee sur le contour, au coin haut droit (point a 45 degres du squircle) :
  /// le contour s'interrompt sous elle, rien ne deborde sur le chiffre.
  private func pastille(_ symbole: String) -> some View {
    let k = CGFloat(pow(0.5, 1 / Double(Squircle.exposantTuile)))
    let dx = (largeur / 2 - retrait - trait / 2) * k
    let dy = (hauteur / 2 - retrait - trait / 2) * k
    return Image(systemName: symbole)
      .font(.system(size: (tailleBadge * 0.7).rounded(), weight: .bold))
      .foregroundStyle(couleurBadge ?? teinte)
      .frame(width: tailleBadge, height: tailleBadge)
      .background(FondTuile(forme: Circle(), teinte: teinte))
      .offset(x: dx, y: -dy)
      .accessibilityHidden(true)
  }
}

/// Taille des tuiles de la liste des minuteurs, calculee depuis la place reelle sous le titre
/// (GeometryReader, zone sure comprise) : un intitule de section et 2 rangees de 2 tuiles tiennent
/// entieres, et les 2 colonnes remplissent la largeur avec des marges egales. Si la hauteur manque
/// (petits ecrans), la tuile s'allonge un peu en largeur (jusqu'a 1,3 fois sa hauteur) plutot que de
/// laisser du vide sur les cotes. On fait defiler pour voir la suite.
enum TailleTuile {
  /// Ecart entre deux tuiles, en largeur comme en hauteur (fin, comme chez Apple).
  static let ecart: CGFloat = 5
  /// Hauteur fixe d'un intitule de section ("Epingles", "Tous").
  static let entete: CGFloat = 15
  /// Marge laissee sous la deuxieme rangee.
  static let margeBas: CGFloat = 4
  /// Retrait du contour par rapport au bord du fond plein.
  static let retraitContour: CGFloat = 3
  /// Largeur maximale d'une tuile, en multiple de sa hauteur.
  static let allongementMax: CGFloat = 1.3

  /// Taille d'une tuile et marge laterale a ajouter pour que 2 x 2 tuiles tiennent dans `place`.
  static func mesure(place: CGSize) -> (taille: CGSize, marge: CGFloat) {
    guard place.width > 60, place.height > 60 else { return (repliFixe, 0) }
    let ecran = WKInterfaceDevice.current().screenBounds.width
    // Marges de 5 % de l'ecran de chaque cote, zone sure deja deduite comprise.
    let marge = max(0, (ecran * 0.05).rounded() - max(0, (ecran - place.width) / 2))
    let parLargeur = ((place.width - 2 * marge - ecart) / 2).rounded(.down)
    // Intitule, ecart, tuile, ecart, tuile, marge en hauteur.
    let parHauteur = ((place.height - entete - 2 * ecart - margeBas) / 2).rounded(.down)
    let hauteur = max(44, min(parLargeur, parHauteur))
    let largeur = max(hauteur, min(parLargeur, (hauteur * allongementMax).rounded(.down)))
    return (CGSize(width: largeur, height: hauteur), marge)
  }

  private static let repliFixe = CGSize(width: 76, height: 64)

  /// Avant la premiere mesure : estimation depuis l'ecran (barre du haut retiree).
  static var repli: CGSize {
    let ecran = WKInterfaceDevice.current().screenBounds.size
    return mesure(place: CGSize(width: ecran.width, height: ecran.height - 64)).taille
  }
}

/// Tuile + pour une duree libre.
struct RondPlus: View {
  var taille: CGSize = TailleTuile.repli
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      ZStack {
        Squircle().fill(Teinte.plateau2)
        Image(systemName: "plus")
          .font(.system(size: (min(taille.width, taille.height) * 0.4).rounded(), weight: .semibold))
          .foregroundStyle(Teinte.texte)
      }
      .frame(width: taille.width, height: taille.height)
      .frame(maxWidth: .infinity, minHeight: max(44, taille.height))
      .contentShape(Rectangle())
    }
    .buttonStyle(StyleAppui())
    .accessibilityLabel("Autre durée")
  }
}

/// Contour de squircle qui se vide (progression 1 au depart, 0 a la fin), du haut au centre
/// dans le sens horaire, le long de la forme.
struct AnneauMinuteur: View {
  var progression: Double
  var epaisseur: CGFloat = 11
  var couleur: Color = Teinte.accent
  var couleurClaire: Color = Teinte.accentClair

  var body: some View {
    ZStack {
      Squircle()
        .stroke(couleur.opacity(0.2), lineWidth: epaisseur)
      Squircle()
        .trim(from: 0, to: CGFloat(min(1, max(0, progression))))
        .stroke(
          LinearGradient(colors: [couleurClaire, couleur], startPoint: .topLeading, endPoint: .bottomTrailing),
          style: StrokeStyle(lineWidth: epaisseur, lineCap: .round, lineJoin: .round)
        )
        .animation(.linear(duration: 0.25), value: progression)
    }
    .padding(epaisseur / 2)
    .accessibilityHidden(true)
  }
}
