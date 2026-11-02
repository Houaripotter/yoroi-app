import SwiftUI

// Page Entrainement : chrono combat, minuteurs de repos, seance libre, noter une seance faite.

struct EntrainementVue: View {
  @State private var routeur = Routeur.shared
  @State private var guidee = SeanceGuidee.shared

  var body: some View {
    // 29 octobre 2026 : dans un ScrollView, la liste passe sous le titre « Entraînement » au lieu de le chevaucher
    ScrollView {
    VStack(spacing: 8) {
      // 28 octobre 2026 : ta seance de musculation de l'iPhone, guidee sur la montre
      if guidee.active {
        BoutonLigne(titre: NSLocalizedString("Séance en cours", comment: ""), icone: "dumbbell.fill", couleur: Teinte.menthe) {
          routeur.ouvrir(.seanceGuidee)
        }
      }
      BoutonLigne(titre: NSLocalizedString("Chrono combat", comment: ""), icone: "timer", couleur: Teinte.peche) {
        routeur.ouvrir(.chronos)
      }
      BoutonLigne(titre: NSLocalizedString("Minuteurs", comment: ""), icone: "hourglass", couleur: Teinte.creme) {
        routeur.ouvrirMinuteurs()
      }
      BoutonLigne(titre: NSLocalizedString("Séance libre", comment: ""), icone: "figure.martial.arts", couleur: Teinte.menthe) {
        routeur.ouvrir(.seanceLibre)
      }
      BoutonLigne(titre: NSLocalizedString("Noter une séance", comment: ""), icone: "square.and.pencil", couleur: Teinte.texteDoux) {
        routeur.ouvrir(.noter)
      }
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
      .background(Teinte.carte, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
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


// MARK: - Seance guidee (28 octobre 2026, maquette Montre B, Muscu)

/// Ta seance de musculation de l'iPhone sur la montre. Pendant le repos : le bord de l'ecran se vide,
/// le temps en grand, la serie qui vient avec sa charge, +15 s et Passer. Pendant l'effort : la serie
/// en cours, sa charge, et Série faite en grand. La fin du repos sonne comme un minuteur.
struct SeanceGuideeVue: View {
  @State private var guidee = SeanceGuidee.shared
  @State private var synchro = Synchro.shared
  @Environment(\.isLuminanceReduced) private var veille

  private var livres: Bool { synchro.unitesEnLivres }

  var body: some View {
    Group {
      if let s = guidee.seance {
        TimelineView(.periodic(from: .now, by: veille ? 1 : 0.25)) { ctx in
          contenu(s, ctx.date)
        }
      } else {
        EcranVide(icone: "dumbbell", texte: NSLocalizedString("Lance ta séance dans Yoroi sur ton iPhone", comment: ""))
      }
    }
    .navigationTitle("")
  }

  @ViewBuilder private func contenu(_ s: SeanceCtx, _ maintenant: Date) -> some View {
    let fin = s.finRepos
    let enRepos = fin.map { $0 > maintenant } ?? false
    let restant = fin.map { max(0, $0.timeIntervalSince(maintenant)) } ?? 0
    let total = Double(max(1, s.reposTotalS))
    ZStack {
      if enRepos {
        AnneauBord(progression: restant / total, couleur: Teinte.menthe, piste: Teinte.mentheNuit, epaisseur: 7)
          .opacity(veille ? 0.55 : 1)
          .ignoresSafeArea()
      }
      VStack(spacing: 4) {
        if s.bouclee {
          Spacer(minLength: 0)
          Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 34, weight: .bold))
            .foregroundStyle(Teinte.menthe)
          Text("Séance bouclée")
            .font(.system(size: 18, weight: .heavy, design: .rounded))
          Text("Enregistre la sur ton iPhone")
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .multilineTextAlignment(.center)
          Spacer(minLength: 0)
        } else if enRepos {
          Capitales(texte: NSLocalizedString("Repos", comment: ""), couleur: Teinte.menthe, taille: 10)
          Text(Format.chrono(Int(restant.rounded(.up))))
            .font(.chiffre(54, .heavy))
            .foregroundStyle(Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
          carte(s, caps: NSLocalizedString("Ensuite", comment: ""))
          Spacer(minLength: 0)
          if !veille {
            HStack(spacing: 6) {
              bouton(NSLocalizedString("+15 s", comment: ""), fond: Teinte.carte, texte: Teinte.texte) { guidee.plus15() }
              bouton(NSLocalizedString("Passer", comment: ""), fond: Teinte.menthe, texte: Teinte.mentheTexte) { guidee.passer() }
            }
          }
        } else {
          Capitales(texte: s.titre, couleur: Teinte.peche, taille: 10)
            .padding(.top, 4)
          carte(s, caps: NSLocalizedString("En cours", comment: ""))
          Spacer(minLength: 0)
          if !veille {
            bouton(NSLocalizedString("Série faite", comment: ""), icone: "checkmark", fond: Teinte.menthe, texte: Teinte.mentheTexte, hauteur: 50) { guidee.serieFaite() }
          }
        }
      }
      .padding(.horizontal, 14)
      .padding(.top, 2)
      .padding(.bottom, 4)
    }
  }

  /// L'exercice en cours : son nom, la serie, la charge et les repetitions.
  @ViewBuilder private func carte(_ s: SeanceCtx, caps: String) -> some View {
    if let e = s.exoCourant {
      VStack(alignment: .leading, spacing: 3) {
        Capitales(texte: caps, couleur: Teinte.texteDoux, taille: 9)
        Text(e.nom)
          .font(.system(size: 14, weight: .heavy, design: .rounded))
          .foregroundStyle(Color.white)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        HStack(spacing: 6) {
          Text(String(format: NSLocalizedString("Série %@ sur %@", comment: ""), "\(min(e.total, e.faites + 1))", "\(e.total)"))
            .font(.system(size: 10, weight: .heavy, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .lineLimit(1)
            .fixedSize()
          Segments(total: e.total, faits: e.faites, enCours: Teinte.bleu, couleurFaits: Teinte.menthe, hauteur: 4, ecart: 3)
        }
        if e.kg > 0 || e.reps > 0 {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            if e.kg > 0 {
              Text("\(Format.poidsCourt(e.kg, livres: livres)) \(Format.symbole(livres: livres))")
                .font(.chiffre(21, .heavy))
            }
            if e.reps > 0 {
              Text("× \(e.reps)")
                .font(.chiffre(15, .heavy))
            }
          }
          .foregroundStyle(Teinte.peche)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        }
      }
      .padding(.horizontal, 11)
      .padding(.vertical, 8)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Teinte.carte, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
  }

  private func bouton(_ titre: String, icone: String? = nil, fond: Color, texte: Color, hauteur: CGFloat = 40, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 5) {
        if let icone { Image(systemName: icone).font(.system(size: 14, weight: .heavy)) }
        Text(titre)
          .font(.system(size: 15, weight: .heavy, design: .rounded))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      .foregroundStyle(texte)
      .frame(maxWidth: .infinity, minHeight: hauteur)
      .background(fond, in: Capsule())
      .contentShape(Capsule())
    }
    .buttonStyle(StyleAppui())
  }
}
