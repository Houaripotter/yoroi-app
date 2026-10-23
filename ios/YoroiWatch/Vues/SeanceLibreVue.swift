import SwiftUI

// Seance libre : choisir un de ses sports, puis duree, FC en direct et zone, pause, fin.

struct SeanceLibreChoixVue: View {
  @State private var synchro = Synchro.shared
  @State private var routeur = Routeur.shared

  var body: some View {
    List {
      if synchro.sports.isEmpty {
        Button {
          routeur.lancerSeanceLibre(nil)
        } label: {
          Label("Entraînement", systemImage: "figure.mixed.cardio")
            .frame(minHeight: 44)
        }
      } else {
        ForEach(synchro.sports) { s in
          Button {
            routeur.lancerSeanceLibre(s)
          } label: {
            Text(s.nom)
              .font(.system(size: 16, weight: .medium, design: .rounded))
              .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
          }
        }
      }
    }
    .navigationTitle("Séance libre")
  }
}

struct SeanceLibreVue: View {
  let sport: SportCtx?
  @State private var seance = Seance.shared
  @State private var demarre = false
  @Environment(\.isLuminanceReduced) private var ecranVeille

  private func couleurZone(_ z: Int) -> Color {
    switch z {
    case 1: return Teinte.texteDoux
    case 2: return Teinte.bleu
    case 3: return Teinte.vert
    case 4: return Teinte.ambre
    default: return Teinte.orange
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(sport?.nom ?? "Entraînement")
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .foregroundStyle(Teinte.vert)
        .lineLimit(1)

      TimelineView(.periodic(from: .now, by: 1)) { contexte in
        Text(Format.chrono(Int(seance.dureeEcoulee(a: contexte.date))))
          .font(.chiffre(54, .bold))
          .minimumScaleFactor(0.5)
          .lineLimit(1)
          .foregroundStyle(seance.etat == .enPause ? Teinte.texteDoux : Teinte.texte)
      }

      HStack(alignment: .firstTextBaseline, spacing: 4) {
        Image(systemName: "heart.fill")
          .font(.system(size: 14))
          .foregroundStyle(Teinte.texteDoux)
        Text(seance.fc > 0 ? "\(Int(seance.fc.rounded()))" : "--")
          .font(.chiffre(30))
        Text("bpm")
          .font(.system(size: 12, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
        Spacer(minLength: 0)
        if let z = seance.zone {
          Text("Zone \(z)")
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .foregroundStyle(couleurZone(z))
        }
      }

      if let k = seance.kcal > 0 ? Int(seance.kcal.rounded()) : nil {
        Text("\(k) kcal")
          .font(.system(size: 13, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
      }

      Spacer(minLength: 0)

      if !ecranVeille {
        HStack(spacing: 8) {
          Button {
            seance.terminer()
          } label: {
            Text("Fin").fontWeight(.semibold).frame(maxWidth: .infinity, minHeight: 44)
          }
          .tint(Teinte.texteDoux)
          Button {
            if seance.etat == .enPause {
              seance.reprendre()
              Haptique.reprise()
            } else {
              seance.pause()
              Haptique.pause()
            }
          } label: {
            Image(systemName: seance.etat == .enPause ? "play.fill" : "pause.fill")
              .frame(maxWidth: .infinity, minHeight: 44)
          }
          .tint(Teinte.vert)
        }
      }
    }
    .padding(.horizontal, 4)
    .task {
      guard !demarre else { return }
      demarre = true
      let activite = sport.map { TypeSport.activite(pour: $0.nom) } ?? .other
      await Seance.shared.demarrer(activite: activite, interieur: TypeSport.interieur(activite))
      await MainActor.run { Haptique.reprise() }
    }
  }
}
