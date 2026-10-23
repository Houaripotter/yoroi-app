import SwiftUI

// Eau : ajouter ou retirer un verre (taille reglee sur l'iPhone), anneau vers l'objectif.

struct EauVue: View {
  @State private var synchro = Synchro.shared

  private var eau: EauCtx { synchro.contexte.eau }

  private var progression: Double {
    guard let o = eau.objectif, o > 0 else { return 0 }
    return eau.ml / o
  }

  var body: some View {
    VStack(spacing: 6) {
      Anneau(progression: progression, couleur: Teinte.bleu, epaisseur: 8) {
        VStack(spacing: 0) {
          Text(Format.eau(eau.ml))
            .font(.chiffre(24))
            .minimumScaleFactor(0.6)
            .lineLimit(1)
          if let o = eau.objectif, o > 0 {
            Text("sur \(Format.eau(o))")
              .font(.system(size: 12, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
        .padding(.horizontal, 10)
      }
      .frame(maxHeight: 104)

      HStack(spacing: 10) {
        BoutonRond(icone: "minus") {
          Task { await synchro.changerEau(signe: -1) }
          Haptique.cran()
        }
        .disabled(eau.ml <= 0)
        .accessibilityLabel("Retirer un verre")

        Button {
          Task { await synchro.changerEau(signe: 1) }
          Haptique.validation()
        } label: {
          Label("\(Format.entier(eau.verre)) ml", systemImage: "drop.fill")
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(Teinte.bleu)
        .foregroundStyle(Color.black)
        .accessibilityLabel("Ajouter un verre")
      }
    }
    .navigationTitle("Eau")
  }
}
