import SwiftUI

// Combat : seulement quand une competition est prevue dans l'app.
// Jours restants, categorie, kg restant a faire.

struct CombatVue: View {
  @State private var synchro = Synchro.shared

  private var livres: Bool { synchro.unitesEnLivres }

  var body: some View {
    Group {
      if let c = synchro.contexte.combat, let j = c.joursRestants() {
        VStack(spacing: 4) {
          if j > 0 {
            Text("Combat dans")
              .font(.system(size: 14, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
            GrosChiffre(valeur: "\(j)", unite: j > 1 ? "jours" : "jour", taille: 52)
          } else if j == 0 {
            Text("Combat")
              .font(.system(size: 14, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
            Text("Aujourd'hui")
              .font(.system(size: 30, weight: .bold, design: .rounded))
          } else {
            Text("Combat passé")
              .font(.system(size: 18, weight: .semibold, design: .rounded))
          }
          Text(Format.jourRelatif(c.date))
            .font(.system(size: 13, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)

          if let cat = c.categorieKg {
            Text("Catégorie \(Format.poids(cat, livres: livres)) \(Format.symbole(livres: livres))")
              .font(.system(size: 14, weight: .medium, design: .rounded))
              .padding(.top, 4)
          }
          if let e = c.ecartKg {
            if e > 0.05 {
              Text("Encore \(Format.poids(e, livres: livres)) \(Format.symbole(livres: livres)) à faire")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(Teinte.orange)
            } else {
              Text("Dans ta catégorie")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(Teinte.vert)
            }
          }
        }
      } else {
        EcranVide(icone: "calendar", texte: "Aucun combat prévu")
      }
    }
    .navigationTitle("Combat")
  }
}
