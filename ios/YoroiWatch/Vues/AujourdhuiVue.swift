import SwiftUI

// Page 1 : poids du jour (ou dernier poids et sa date), ecart au rythme prevu,
// mini courbe 30 jours avec le rythme en tirets, fenetre d'arrivee avec le torii. Bouton Peser.

struct AujourdhuiVue: View {
  @State private var synchro = Synchro.shared
  @State private var routeur = Routeur.shared

  private var poids: PoidsCtx { synchro.contexte.poids }
  private var livres: Bool { synchro.unitesEnLivres }

  var body: some View {
    Group {
      if let dernier = poids.dernier {
        contenu(dernier)
      } else if synchro.aRecuContexte {
        VStack(spacing: 10) {
          EcranVide(icone: "scalemass", texte: "Pas encore de pesée")
          BoutonPlein(titre: "Peser", icone: "plus") { routeur.ouvrir(.peser) }
        }
      } else {
        VStack(spacing: 8) {
          EcranVide()
          BoutonPlein(titre: "Peser", icone: "plus") { routeur.ouvrir(.peser) }
        }
      }
    }
    .navigationTitle("Poids")
  }

  @ViewBuilder
  private func contenu(_ dernier: DernierPoids) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(Format.jourRelatif(dernier.date))
        .font(.system(size: 13, weight: .medium, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)

      HStack(alignment: .firstTextBaseline) {
        GrosChiffre(valeur: Format.poids(dernier.kg, livres: livres), unite: Format.symbole(livres: livres), taille: 40)
        Spacer(minLength: 4)
        Button {
          routeur.ouvrir(.peser)
        } label: {
          Image(systemName: "plus")
            .font(.system(size: 18, weight: .bold))
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(Teinte.accent)
        .foregroundStyle(Color.black)
        .clipShape(Circle())
        .accessibilityLabel("Peser")
      }

      ligneEcart

      if !poids.serie30.isEmpty {
        MiniCourbe(serie: poids.serie30, ligne: poids.ligne30, couleurSerie: Teinte.texte, couleurLigne: Teinte.accent)
          .frame(height: 38)
          .padding(.top, 2)
      }

      if let a = poids.arrivee {
        HStack(spacing: 5) {
          Torii().frame(width: 16, height: 15)
          Text("Arrivée prévue du \(Format.jourCourt(a.du)) au \(Format.jourCourt(a.au))")
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
        }
        .padding(.top, 2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var ligneEcart: some View {
    if synchro.aEnAttente(.poids) {
      Text("Envoyé à ton iPhone")
        .font(.system(size: 13, weight: .medium, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
    } else if let phrase = poids.phrase, !phrase.isEmpty {
      Text(phrase)
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(Teinte.statut(poids.statut))
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    } else if let e = poids.ecart {
      Text("\(Format.ecart(e, livres: livres)) \(Format.symbole(livres: livres)) par rapport au rythme")
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(Teinte.statut(poids.statut))
    }
  }
}
