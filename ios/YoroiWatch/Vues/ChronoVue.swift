import SwiftUI

// Chrono combat en cours. Chiffres enormes, couleur par phase
// (round indigo clair, repos vert, preparation ambre). Toucher l'ecran met en pause.
// Les boutons du bas changent de round. En pause : reprendre ou terminer.

struct ChronoVue: View {
  let preset: ChronoPreset
  @State private var moteur = ChronoMoteur.shared
  @State private var seance = Seance.shared
  @State private var demarre = false
  @Environment(\.isLuminanceReduced) private var ecranVeille

  private var couleur: Color {
    switch moteur.phase {
    case .preparation: return Teinte.ambre
    case .round: return Teinte.accent
    case .repos: return Teinte.vert
    case .fini: return Teinte.texte
    }
  }

  private var titrePhase: String {
    switch moteur.phase {
    case .preparation: return "Préparation"
    case .round(let n): return "Round \(n) sur \(moteur.nombreRounds)"
    case .repos(let n): return "Repos, round \(n + 1) ensuite"
    case .fini: return "Terminé"
    }
  }

  var body: some View {
    VStack(spacing: 2) {
      HStack {
        Text(titrePhase)
          .font(.system(size: 14, weight: .semibold, design: .rounded))
          .foregroundStyle(couleur)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Spacer(minLength: 2)
        if seance.fc > 0 {
          HStack(spacing: 2) {
            Image(systemName: "heart.fill").font(.system(size: 11))
            Text("\(Int(seance.fc.rounded()))").font(.chiffre(14))
          }
          .foregroundStyle(Teinte.texteDoux)
        }
      }

      Spacer(minLength: 0)

      Text(Format.chrono(moteur.restant))
        .font(.chiffre(76, .bold))
        .minimumScaleFactor(0.4)
        .lineLimit(1)
        .foregroundStyle(ecranVeille ? couleur.opacity(0.7) : couleur)
        .contentTransition(.numericText(countsDown: true))

      // Barre de progression de la phase
      GeometryReader { g in
        ZStack(alignment: .leading) {
          Capsule().fill(couleur.opacity(0.2))
          Capsule().fill(couleur).frame(width: g.size.width * moteur.progressionPhase)
        }
      }
      .frame(height: 5)
      .opacity(ecranVeille ? 0.5 : 1)

      Spacer(minLength: 0)

      if moteur.enPause {
        HStack(spacing: 8) {
          Button {
            moteur.terminer()
          } label: {
            Text("Terminer").fontWeight(.semibold).frame(maxWidth: .infinity, minHeight: 44)
          }
          .tint(Teinte.texteDoux)
          Button {
            moteur.basculerPause()
          } label: {
            Image(systemName: "play.fill").frame(maxWidth: .infinity, minHeight: 44)
          }
          .tint(couleur)
        }
      } else if !ecranVeille {
        HStack {
          BoutonRond(icone: "backward.end.fill") { moteur.roundPrecedent() }
            .accessibilityLabel("Round précédent")
          Spacer()
          Text("Touche pour pause")
            .font(.system(size: 11, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
          Spacer()
          BoutonRond(icone: "forward.end.fill") { moteur.roundSuivant() }
            .accessibilityLabel("Round suivant")
        }
      }
    }
    .padding(.horizontal, 4)
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
