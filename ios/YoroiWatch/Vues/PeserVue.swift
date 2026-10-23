import SwiftUI

// Peser : couronne digitale au dixieme, depart au dernier poids,
// un cran haptique a chaque kg (ou lb) entier. Valider ecrit dans Apple Sante et envoie a l'iPhone.
// Marche sans iPhone : l'action attend dans la file.

struct PeserVue: View {
  @Environment(\.dismiss) private var fermer
  @State private var synchro = Synchro.shared
  @State private var valeur: Double = 0
  @State private var pret = false
  @State private var envoi = false
  @FocusState private var couronne: Bool

  private var livres: Bool { synchro.unitesEnLivres }
  private var bornes: ClosedRange<Double> { livres ? 44...660 : 20...300 }
  private var arrondi: Double { (valeur * 10).rounded() / 10 }

  var body: some View {
    VStack(spacing: 6) {
      Spacer(minLength: 0)
      GrosChiffre(valeur: pret ? Format.decimal(arrondi) : "--", unite: Format.symbole(livres: livres), taille: 52)
        .focusable(true)
        .focused($couronne)
        .digitalCrownRotation(
          $valeur,
          from: bornes.lowerBound,
          through: bornes.upperBound,
          by: 0.1,
          sensitivity: .low,
          isContinuous: false,
          isHapticFeedbackEnabled: false
        )
        .accessibilityLabel("Poids")
        .accessibilityValue("\(Format.decimal(arrondi)) \(Format.symbole(livres: livres))")
        .accessibilityAdjustableAction { sens in
          switch sens {
          case .increment: valeur = min(bornes.upperBound, arrondi + 0.1)
          case .decrement: valeur = max(bornes.lowerBound, arrondi - 0.1)
          @unknown default: break
          }
        }

      Text("Tourne la couronne")
        .font(.system(size: 13, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)

      Spacer(minLength: 0)

      BoutonPlein(titre: envoi ? "Enregistré" : "Valider", icone: envoi ? "checkmark" : nil) {
        valider()
      }
      .disabled(!pret || envoi)
    }
    .navigationTitle("Peser")
    .onChange(of: valeur) { ancienne, nouvelle in
      guard pret else { return }
      if floor(ancienne) != floor(nouvelle) { Haptique.cran() }
    }
    .task { await preparer() }
  }

  private func preparer() async {
    guard !pret else { return }
    var kg = synchro.contexte.poids.dernier?.kg
    if kg == nil { kg = await Sante.shared.dernierPoids() }
    // Sans aucune pesee connue, la couronne part d'un point neutre, a ajuster.
    let depart = Format.versUnite(kg ?? 70, livres: livres)
    valeur = min(bornes.upperBound, max(bornes.lowerBound, (depart * 10).rounded() / 10))
    pret = true
    couronne = true
  }

  private func valider() {
    let kg = Format.versKg(arrondi, livres: livres)
    envoi = true
    Haptique.validation()
    Task {
      await synchro.enregistrerPoids(kg: kg)
      try? await Task.sleep(nanoseconds: 600_000_000)
      await MainActor.run { fermer() }
    }
  }
}
