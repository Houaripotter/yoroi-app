import SwiftUI

// Page Entrainement : chrono combat, minuteurs de repos, seance libre, noter une seance faite.

struct EntrainementVue: View {
  @State private var routeur = Routeur.shared

  var body: some View {
    VStack(spacing: 8) {
      BoutonLigne(titre: NSLocalizedString("Chrono combat", comment: ""), icone: "timer", couleur: Teinte.accent) {
        routeur.ouvrir(.chronos)
      }
      BoutonLigne(titre: NSLocalizedString("Minuteurs", comment: ""), icone: "hourglass", couleur: Teinte.ambre) {
        routeur.ouvrirMinuteurs()
      }
      BoutonLigne(titre: NSLocalizedString("Séance libre", comment: ""), icone: "figure.martial.arts", couleur: Teinte.vert) {
        routeur.ouvrir(.seanceLibre)
      }
      BoutonLigne(titre: NSLocalizedString("Noter une séance", comment: ""), icone: "square.and.pencil", couleur: Teinte.texteDoux) {
        routeur.ouvrir(.noter)
      }
    }
    .navigationTitle("Entraînement")
  }
}

/// Grande ligne tactile avec icone et titre.
struct BoutonLigne: View {
  var titre: String
  var icone: String
  var couleur: Color
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 10) {
        Image(systemName: icone)
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(couleur)
          .frame(width: 26)
        Text(titre)
          .font(.system(size: 16, weight: .semibold, design: .rounded))
          .foregroundStyle(Teinte.texte)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, minHeight: 48)
      .padding(.horizontal, 10)
      .background(Teinte.carte, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    .buttonStyle(.plain)
  }
}

// MARK: Liste des chronos

struct ChronoListeVue: View {
  @State private var synchro = Synchro.shared
  @State private var routeur = Routeur.shared

  var body: some View {
    List {
      ForEach(synchro.chronos) { p in
        Button {
          routeur.chemin.append(.chronoPrepa(p))
        } label: {
          VStack(alignment: .leading, spacing: 2) {
            Text(p.nom)
              .font(.system(size: 16, weight: .semibold, design: .rounded))
              .foregroundStyle(Teinte.texte)
            Text(ChronoListeVue.resume(p))
              .font(.system(size: 13, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
          .frame(minHeight: 44)
        }
      }
    }
    .navigationTitle("Chrono")
  }

  /// "3 x 3 min, repos 1 min"
  static func resume(_ p: ChronoPreset) -> String {
    var t = p.rounds > 1 ? String(format: NSLocalizedString("%@ x %@", comment: ""), "\(p.rounds)", "\(Format.dureeCourte(p.roundS))") : Format.dureeCourte(p.roundS)
    if p.reposS > 0 && p.rounds > 1 { t += String(format: NSLocalizedString(", repos %@", comment: ""), "\(Format.dureeCourte(p.reposS))") }
    return t
  }
}

// MARK: Depart d'un chrono

struct ChronoPrepaVue: View {
  let preset: ChronoPreset
  @State private var rounds: Int = 0
  @State private var routeur = Routeur.shared

  var body: some View {
    VStack(spacing: 6) {
      Text(preset.nom)
        .font(.system(size: 17, weight: .semibold, design: .rounded))
        .lineLimit(1)
      HStack(spacing: 6) {
        BoutonRond(icone: "minus") { rounds = max(1, rounds - 1) }
          .disabled(rounds <= 1)
        VStack(spacing: 0) {
          Text("\(rounds)")
            .font(.chiffre(38))
          Text(rounds > 1 ? NSLocalizedString("rounds", comment: "") : NSLocalizedString("round", comment: ""))
            .font(.system(size: 12, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
        }
        .frame(minWidth: 56)
        BoutonRond(icone: "plus") { rounds = min(30, rounds + 1) }
      }
      Text(detail)
        .font(.system(size: 12, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
        .multilineTextAlignment(.center)
        .lineLimit(2)
      BoutonPlein(titre: NSLocalizedString("Démarrer", comment: ""), icone: "play.fill") {
        var p = preset
        p.rounds = rounds
        routeur.lancerChrono(p)
      }
    }
    .navigationTitle("Chrono")
    .onAppear { if rounds == 0 { rounds = preset.rounds } }
  }

  private var detail: String {
    var t = "\(Format.dureeCourte(preset.roundS))"
    if preset.reposS > 0 { t += String(format: NSLocalizedString(", repos %@", comment: ""), "\(Format.dureeCourte(preset.reposS))") }
    var p = preset
    p.rounds = max(1, rounds)
    t += String(format: NSLocalizedString(", total %@", comment: ""), "\(Format.dureeLongue(p.dureeTotaleS))")
    return t
  }
}

struct BoutonRond: View {
  var icone: String
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      Image(systemName: icone)
        .font(.system(size: 16, weight: .bold))
        .frame(width: 44, height: 44)
        .background(Teinte.carte, in: Circle())
    }
    .buttonStyle(.plain)
  }
}
