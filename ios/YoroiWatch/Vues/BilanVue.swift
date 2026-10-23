import SwiftUI

// Fin de seance (chrono ou libre) : resume, choix du sport, ressenti a la couronne, Enregistrer.
// Enregistrer ecrit l'entrainement dans Apple Sante et envoie la seance faite a l'iPhone.

struct BilanVue: View {
  let source: SourceSeance
  let sportPropose: SportCtx?

  private enum Etape { case resume, sport, ressenti }

  @State private var etape: Etape = .resume
  @State private var sport: SportCtx?
  @State private var rpe: Double = 6
  @State private var enregistrement = false
  @State private var bilan: BilanSeance?
  @State private var rounds: Int = 0
  @State private var synchro = Synchro.shared

  var body: some View {
    Group {
      switch etape {
      case .resume: resume
      case .sport: choixSport
      case .ressenti: ressenti
      }
    }
    .onAppear {
      if bilan == nil {
        bilan = Seance.shared.bilan
        rounds = source == .chrono ? ChronoMoteur.shared.roundsFaits : 0
        sport = sportPropose
      }
    }
  }

  // MARK: Resume

  private var resume: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 6) {
        Text("Séance terminée")
          .font(.system(size: 16, weight: .semibold, design: .rounded))
        if let b = bilan {
          ligne(NSLocalizedString("Durée", comment: ""), Format.chrono(b.dureeS))
          if source == .chrono { ligne(NSLocalizedString("Rounds", comment: ""), "\(rounds)") }
          if let m = b.fcMoy { ligne(NSLocalizedString("FC moyenne", comment: ""), "\(m)") }
          if let x = b.fcMax { ligne(NSLocalizedString("FC max", comment: ""), "\(x)") }
          if let k = b.kcal { ligne(NSLocalizedString("Calories", comment: ""), String(format: NSLocalizedString("%@ kcal", comment: ""), "\(k)")) }
          if b.fcMoy == nil && !Seance.shared.avecSante {
            Text("Autorise Yoroi dans Apple Santé pour avoir ta fréquence cardiaque.")
              .font(.system(size: 12, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
        BoutonPlein(titre: NSLocalizedString("Continuer", comment: "")) {
          etape = synchro.sports.count > 1 || (sport == nil && !synchro.sports.isEmpty) ? .sport : .ressenti
        }
        .padding(.top, 4)
        Button("Ne pas enregistrer") {
          Seance.shared.abandonner()
          terminer()
        }
        .frame(minHeight: 44)
      }
    }
  }

  private func ligne(_ titre: String, _ valeur: String) -> some View {
    HStack {
      Text(titre).foregroundStyle(Teinte.texteDoux)
      Spacer()
      Text(valeur).font(.chiffre(18))
    }
    .font(.system(size: 14, design: .rounded))
  }

  // MARK: Sport

  private var choixSport: some View {
    List {
      ForEach(synchro.sports) { s in
        Button {
          sport = s
          etape = .ressenti
        } label: {
          HStack {
            Text(s.nom).font(.system(size: 16, weight: .medium, design: .rounded))
            Spacer()
            if s.id == sport?.id { Image(systemName: "checkmark").foregroundStyle(Teinte.accent) }
          }
          .frame(minHeight: 44)
        }
      }
    }
    .navigationTitle("Ton sport")
  }

  // MARK: Ressenti

  private var ressenti: some View {
    VStack(spacing: 6) {
      ChoixRessenti(valeur: $rpe)
      BoutonPlein(titre: enregistrement ? NSLocalizedString("Enregistré", comment: "") : NSLocalizedString("Enregistrer", comment: ""), icone: enregistrement ? "checkmark" : nil) {
        enregistrer()
      }
      .disabled(enregistrement)
    }
  }

  private func enregistrer() {
    guard let b = bilan else { return }
    enregistrement = true
    Haptique.validation()
    let id = UUID().uuidString
    let sportChoisi = sport
    let note = Int(rpe.rounded())
    let nbRounds = rounds
    Task {
      let dansSante = await Seance.shared.enregistrerDansSante(id: id, nomSport: sportChoisi?.nom)
      var a = ActionMontre(type: .seance, id: id, quand: b.debut.addingTimeInterval(Double(b.dureeS)))
      a.sportId = sportChoisi?.id
      a.dureeS = b.dureeS
      a.rpe = note
      a.rounds = source == .chrono ? nbRounds : nil
      a.fcMoy = b.fcMoy
      a.fcMax = b.fcMax
      a.kcal = b.kcal
      a.source = source
      a.dansSante = dansSante
      await MainActor.run {
        synchro.enregistrerSeance(a)
        terminer()
      }
    }
  }

  private func terminer() {
    ChronoMoteur.shared.liberer()
    Routeur.shared.fermerLive()
  }
}

/// Ressenti de 1 a 10 a la couronne.
struct ChoixRessenti: View {
  @Binding var valeur: Double
  @FocusState private var couronne: Bool

  private var note: Int { Int(valeur.rounded()) }

  private var mot: String {
    switch note {
    case ...3: return NSLocalizedString("Facile", comment: "")
    case 4...6: return NSLocalizedString("Moyen", comment: "")
    case 7...8: return NSLocalizedString("Dur", comment: "")
    default: return NSLocalizedString("Maximal", comment: "")
    }
  }

  var body: some View {
    VStack(spacing: 0) {
      Text("Ressenti")
        .font(.system(size: 13, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
      Text("\(note)")
        .font(.chiffre(50))
        .focusable(true)
        .focused($couronne)
        .digitalCrownRotation($valeur, from: 1, through: 10, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
        .accessibilityLabel("Ressenti")
        .accessibilityValue("\(note) sur 10")
      Text(mot)
        .font(.system(size: 13, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
    }
    .onAppear { couronne = true }
  }
}
