import SwiftUI

/// Un gros chiffre avec son unite, lisible d'un coup d'oeil.
struct GrosChiffre: View {
  var valeur: String
  var unite: String? = nil
  var taille: CGFloat = 46
  var couleur: Color = Teinte.texte

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 3) {
      Text(valeur)
        .font(.chiffre(taille))
        .foregroundStyle(couleur)
        .minimumScaleFactor(0.5)
        .lineLimit(1)
      if let unite {
        Text(unite)
          .font(.system(size: max(12, taille * 0.32), weight: .medium, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
      }
    }
  }
}

/// Bouton plein large, cible tactile d'au moins 44 pt.
struct BoutonPlein: View {
  var titre: String
  var icone: String? = nil
  var couleur: Color = Teinte.accent
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) {
        if let icone { Image(systemName: icone) }
        Text(titre).fontWeight(.semibold)
      }
      .frame(maxWidth: .infinity, minHeight: 44)
    }
    .buttonStyle(.borderedProminent)
    .tint(couleur)
    .foregroundStyle(Color.black)
  }
}

/// Ecran vide propre quand l'iPhone n'a encore rien envoye.
struct EcranVide: View {
  var icone: String = "iphone"
  var texte: String = NSLocalizedString("Ouvre Yoroi sur ton iPhone pour commencer", comment: "")

  var body: some View {
    VStack(spacing: 10) {
      Image(systemName: icone)
        .font(.system(size: 28))
        .foregroundStyle(Teinte.accent)
      Text(texte)
        .font(.system(size: 15, weight: .medium, design: .rounded))
        .multilineTextAlignment(.center)
        .foregroundStyle(Teinte.texte)
    }
    .padding(.horizontal, 8)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}
