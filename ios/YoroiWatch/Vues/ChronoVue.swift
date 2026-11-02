import SwiftUI

// Chrono combat en cours. Chiffres enormes, couleur par phase
// (round peche, repos menthe, preparation creme). Toucher l'ecran met en pause.
// Les boutons du bas changent de round. En pause : reprendre ou terminer.
// 28 octobre 2026, direction B : le bord de l'ecran se vide comme un anneau pendant la phase,
// un segment par round, et ce qui vient ensuite.

struct ChronoVue: View {
  let preset: ChronoPreset
  @State private var moteur = ChronoMoteur.shared
  @State private var seance = Seance.shared
  @State private var demarre = false
  @Environment(\.isLuminanceReduced) private var ecranVeille

  private var couleur: Color {
    switch moteur.phase {
    case .preparation: return Teinte.creme
    case .round: return Teinte.peche
    case .repos: return Teinte.menthe
    case .fini: return Teinte.texte
    }
  }

  /// Piste sombre du bord de l'ecran, teintee de la phase
  private var piste: Color {
    switch moteur.phase {
    case .repos: return Teinte.mentheNuit
    default: return couleur.opacity(0.16)
    }
  }

  private var titrePhase: String {
    switch moteur.phase {
    case .preparation: return NSLocalizedString("Préparation", comment: "")
    case .round: return NSLocalizedString("Round", comment: "")
    case .repos: return NSLocalizedString("Repos", comment: "")
    case .fini: return NSLocalizedString("Terminé", comment: "")
    }
  }

  /// « Round 3 sur 8 »
  private var ligneRound: String {
    let n = max(1, min(moteur.nombreRounds, moteur.roundCourant == 0 ? 1 : moteur.roundCourant))
    return String(format: NSLocalizedString("Round %@ sur %@", comment: ""), "\(n)", "\(moteur.nombreRounds)")
  }

  /// Rounds deja finis (pour les segments)
  private var roundsFinis: Int {
    switch moteur.phase {
    case .preparation: return 0
    case .round(let n): return max(0, n - 1)
    case .repos(let n): return n
    case .fini: return moteur.nombreRounds
    }
  }

  /// « Ensuite travail 20 s », « Ensuite repos 1 min », rien a la fin
  private var ensuite: String? {
    guard let p = moteur.preset else { return nil }
    switch moteur.phase {
    case .preparation:
      return String(format: NSLocalizedString("Ensuite travail %@", comment: ""), "\(Format.dureeCourte(p.roundS))")
    case .round(let n):
      guard n < p.rounds else { return NSLocalizedString("Dernier round", comment: "") }
      if p.reposS > 0 { return String(format: NSLocalizedString("Ensuite repos %@", comment: ""), "\(Format.dureeCourte(p.reposS))") }
      return String(format: NSLocalizedString("Ensuite travail %@", comment: ""), "\(Format.dureeCourte(p.roundS))")
    case .repos:
      return String(format: NSLocalizedString("Ensuite travail %@", comment: ""), "\(Format.dureeCourte(p.roundS))")
    case .fini:
      return nil
    }
  }

  var body: some View {
    ZStack {
      // la part restante de la phase, sur le bord de l'ecran
      AnneauBord(progression: 1 - moteur.progressionPhase, couleur: couleur, piste: piste, epaisseur: 7)
        .opacity(ecranVeille ? 0.5 : 1)
        .ignoresSafeArea()

      VStack(spacing: 1) {
        HStack(spacing: 4) {
          Capitales(texte: preset.nom, couleur: couleur, taille: 10)
          if seance.fc > 0 {
            HStack(spacing: 2) {
              Image(systemName: "heart.fill").font(.system(size: 9))
              Text("\(Int(seance.fc.rounded()))").font(.chiffre(11))
            }
            .foregroundStyle(Teinte.texteDoux)
          }
        }
        Text(titrePhase)
          .font(.system(size: 19, weight: .heavy, design: .rounded))
          .foregroundStyle(couleur)
          .lineLimit(1)
          .minimumScaleFactor(0.7)

        Text(Format.chrono(moteur.restant))
          .font(.chiffre(84, .heavy))
          .minimumScaleFactor(0.4)
          .lineLimit(1)
          .foregroundStyle(ecranVeille ? Teinte.texte.opacity(0.7) : Teinte.texte)
          .contentTransition(.numericText(countsDown: true))

        if moteur.nombreRounds > 1 {
          Segments(total: moteur.nombreRounds, faits: roundsFinis, enCours: moteur.phase == .fini ? nil : couleur, hauteur: 5, ecart: 3)
            .padding(.horizontal, 18)
            .opacity(ecranVeille ? 0.5 : 1)
        }
        Text(ligneRound)
          .font(.system(size: 12, weight: .heavy, design: .rounded))
          .foregroundStyle(Teinte.texte)
          .lineLimit(1)
          .padding(.top, 3)
        if let e = ensuite {
          Text(e)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }

        Spacer(minLength: 0)

        if moteur.enPause {
          // en pause : changer de round, terminer ou reprendre
          HStack(spacing: 4) {
            BoutonRond(icone: "backward.end.fill") { moteur.roundPrecedent() }
              .accessibilityLabel("Round précédent")
            Button {
              moteur.terminer()
            } label: {
              Image(systemName: "stop.fill").frame(maxWidth: .infinity, minHeight: 44)
            }
            .tint(Teinte.texteDoux)
            .accessibilityLabel("Terminer")
            Button {
              moteur.basculerPause()
            } label: {
              Image(systemName: "play.fill").frame(maxWidth: .infinity, minHeight: 44)
            }
            .tint(couleur)
            .accessibilityLabel("Reprendre")
            BoutonRond(icone: "forward.end.fill") { moteur.roundSuivant() }
              .accessibilityLabel("Round suivant")
          }
        } else if !ecranVeille {
          HStack(spacing: 4) {
            Image(systemName: "pause.fill").font(.system(size: 9, weight: .bold))
            Text("Touche pour pause")
              .font(.system(size: 11, weight: .bold, design: .rounded))
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
          .foregroundStyle(Teinte.texteDoux)
          .padding(.bottom, 6)
        }
      }
      .padding(.horizontal, 14)
      .padding(.top, 6)
    }
    .contentShape(Rectangle())
    .onTapGesture { if !moteur.enPause { moteur.basculerPause() } }
    .task {
      guard !demarre else { return }
      demarre = true
      await lancer()
    }
  }

  private func lancer() async {
    let activite = TypeSport.activite(pour: preset.nom)
    await Seance.shared.demarrer(activite: activite, interieur: true)
    await MainActor.run { ChronoMoteur.shared.lancer(preset) }
  }
}
