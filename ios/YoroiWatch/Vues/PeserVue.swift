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
      GrosChiffre(valeur: pret ? Format.decimal(arrondi) : "--", unite: Format.symbole(livres: livres), taille: 56)
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

      // 28 octobre 2026 : ton prochain palier suit la couronne
      if pret, let p = synchro.contexte.poids.palier {
        palier(p)
      }

      Spacer(minLength: 0)

      BoutonPlein(titre: envoi ? NSLocalizedString("Enregistré", comment: "") : NSLocalizedString("Valider", comment: ""), icone: envoi ? "checkmark" : nil) {
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

  /// « Palier 78 dans 0,4 kg », ou « Palier 78 franchi » des que la couronne le passe.
  private func palier(_ p: PalierCtx) -> some View {
    let kg = Format.versKg(arrondi, livres: livres)
    // le sens du chemin : vers le bas si ton cap est sous le palier
    let descend = (synchro.contexte.poids.cap ?? p.kg) <= p.kg
    let franchi = descend ? kg <= p.kg + 0.001 : kg >= p.kg - 0.001
    let reste = abs(kg - p.kg)
    let texte: String
    if franchi {
      texte = p.dernier ? NSLocalizedString("Ton cap est atteint", comment: "") : String(format: NSLocalizedString("Palier %@ franchi", comment: ""), Format.poidsCourt(p.kg, livres: livres))
    } else {
      texte = TextesB.palier(PalierCtx(kg: p.kg, reste: reste, dernier: p.dernier), livres: livres)
    }
    return HStack(spacing: 6) {
      Torii(couleur: Teinte.torii).frame(width: 15, height: 14)
      Text(texte)
        .font(.system(size: 12, weight: .heavy, design: .rounded))
        .foregroundStyle(franchi ? Teinte.mentheTexte : Teinte.coachSous)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
    }
    .padding(.horizontal, 10)
    .frame(maxWidth: .infinity, minHeight: 32)
    .background(franchi ? Teinte.menthe : Teinte.cremeClair, in: Capsule())
    .animation(.easeOut(duration: 0.2), value: franchi)
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
