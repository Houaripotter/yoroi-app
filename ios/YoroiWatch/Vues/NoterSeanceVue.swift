import SwiftUI

// Noter une seance deja faite : sport, duree a la couronne, ressenti, Valider.

struct NoterSeanceVue: View {
  private enum Etape { case sport, duree, ressenti }

  @Environment(\.dismiss) private var fermer
  @State private var synchro = Synchro.shared
  @State private var etape: Etape = .sport
  @State private var sport: SportCtx?
  @State private var minutes: Double = 60
  @State private var rpe: Double = 6
  @State private var envoye = false
  @FocusState private var couronne: Bool

  var body: some View {
    Group {
      switch etape {
      case .sport: choixSport
      case .duree: choixDuree
      case .ressenti: choixRessenti
      }
    }
    .navigationTitle("Noter")
    .onAppear {
      if synchro.sports.isEmpty && etape == .sport { etape = .duree }
    }
  }

  private var choixSport: some View {
    List {
      ForEach(synchro.sports) { s in
        Button {
          sport = s
          etape = .duree
        } label: {
          Text(s.nom)
            .font(.system(size: 16, weight: .medium, design: .rounded))
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        }
      }
    }
  }

  private var choixDuree: some View {
    VStack(spacing: 6) {
      if let s = sport {
        Text(s.nom)
          .font(.system(size: 14, weight: .semibold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
          .lineLimit(1)
      }
      GrosChiffre(valeur: Format.dureeLongue(Int(minutes.rounded()) * 60), taille: 40)
        .focusable(true)
        .focused($couronne)
        .digitalCrownRotation($minutes, from: 5, through: 300, by: 5, sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)
        .accessibilityLabel("Durée")
      Text("Tourne la couronne")
        .font(.system(size: 13, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
      BoutonPlein(titre: "Suivant") { etape = .ressenti }
    }
    .onAppear { couronne = true }
  }

  private var choixRessenti: some View {
    VStack(spacing: 6) {
      ChoixRessenti(valeur: $rpe)
      BoutonPlein(titre: envoye ? "Enregistré" : "Valider", icone: envoye ? "checkmark" : nil) {
        valider()
      }
      .disabled(envoye)
    }
  }

  private func valider() {
    envoye = true
    let duree = Int(minutes.rounded()) * 60
    // La seance est notee comme finie maintenant, commencee il y a "duree".
    var a = ActionMontre(type: .seance, quand: Date())
    a.sportId = sport?.id
    a.dureeS = duree
    a.rpe = Int(rpe.rounded())
    a.source = .note
    a.dansSante = false
    synchro.enregistrerSeance(a)
    Haptique.validation()
    Task {
      try? await Task.sleep(nanoseconds: 600_000_000)
      await MainActor.run { fermer() }
    }
  }
}
