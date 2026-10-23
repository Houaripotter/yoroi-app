import SwiftUI

// Minuteurs de repos : En cours, Epingles, Recents, Tous, rond + pour une duree libre.
// Un toucher lance tout de suite. Modifier : toucher un rond l'epingle ou le retire.

struct MinuteursVue: View {
  @State private var moteur = MinuteurMoteur.shared
  @State private var routeur = Routeur.shared
  @State private var edition = false

  var body: some View {
    // La place reelle sous le titre (zone sure comprise) donne la taille des tuiles :
    // 2 x 2 tuiles entieres remplissent l'ecran, on fait defiler pour voir les suivantes.
    GeometryReader { g in
      let m = TailleTuile.mesure(place: g.size)
      let t = m.taille
      let colonnes = [GridItem(.flexible(), spacing: TailleTuile.ecart), GridItem(.flexible(), spacing: TailleTuile.ecart)]
      ScrollView {
        VStack(alignment: .leading, spacing: TailleTuile.ecart) {
          if !moteur.actifs.isEmpty && !edition {
            section(NSLocalizedString("En cours", comment: ""))
            ForEach(moteur.actifs) { a in
              LigneMinuteurActif(actif: a) { routeur.chemin.append(.minuteur(a.id)) }
            }
          }

          if !moteur.etat.epingles.isEmpty {
            section(NSLocalizedString("Épinglés", comment: ""))
            LazyVGrid(columns: colonnes, spacing: TailleTuile.ecart) {
              ForEach(moteur.etat.epingles, id: \.self) { s in
                RondMinuteur(
                  secondes: s,
                  badge: edition ? "pin.slash.fill" : "pin.fill",
                  couleurBadge: edition ? Teinte.texte : nil,
                  taille: t
                ) {
                  if edition { moteur.basculerEpingle(s) } else { lancer(s) }
                }
              }
            }
          }

          if !moteur.recentsAffiches.isEmpty {
            section(NSLocalizedString("Récents", comment: ""))
            LazyVGrid(columns: colonnes, spacing: TailleTuile.ecart) {
              ForEach(moteur.recentsAffiches, id: \.self) { s in
                RondMinuteur(secondes: s, badge: edition ? "xmark" : nil, couleurBadge: Teinte.texte, taille: t) {
                  if edition { moteur.retirerRecent(s) } else { lancer(s) }
                }
              }
            }
          }

          section(NSLocalizedString("Tous", comment: ""))
          LazyVGrid(columns: colonnes, spacing: TailleTuile.ecart) {
            ForEach(EtatMinuteurs.tous, id: \.self) { s in
              let epingle = moteur.estEpingle(s)
              RondMinuteur(
                secondes: s,
                badge: edition ? (epingle ? "pin.fill" : "pin") : nil,
                couleurBadge: epingle ? nil : Teinte.texteDoux,
                taille: t
              ) {
                if edition { moteur.basculerEpingle(s) } else { lancer(s) }
              }
            }
            if !edition {
              RondPlus(taille: t) { routeur.chemin.append(.minuteurLibre) }
            }
          }

          Button {
            edition.toggle()
            Haptique.cran()
          } label: {
            Text(edition ? NSLocalizedString("OK", comment: "") : NSLocalizedString("Modifier", comment: ""))
              .font(.system(size: 15, weight: .bold, design: .rounded))
              .frame(maxWidth: .infinity, minHeight: 44)
              .background(edition ? Teinte.accent : Teinte.carte, in: Capsule())
              .foregroundStyle(edition ? Color.black : Teinte.texte)
          }
          .buttonStyle(StyleAppui())
          .padding(.top, 4)

          if edition {
            Text("Touche un rond pour l'épingler ou le retirer.")
              .font(.system(size: 12, weight: .medium, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
            // Etat de l'alarme du dernier minuteur, pour les essais (programmee, refusee, sonne).
            if !moteur.etatAlarme.isEmpty {
              Text("Alarme : \(moteur.etatAlarme)")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(Teinte.texteDoux)
            }
          }
        }
        // Marges laterales egales, pour que les 2 colonnes remplissent la largeur utile.
        .padding(.horizontal, m.marge)
      }
    }
    .navigationTitle("Minuteurs")
  }

  private func section(_ titre: String) -> some View {
    Text(titre)
      .font(.system(size: 12, weight: .heavy, design: .rounded))
      .foregroundStyle(Teinte.texteDoux)
      .lineLimit(1)
      .frame(height: TailleTuile.entete)
      .padding(.leading, 4)
  }

  private func lancer(_ s: Int) {
    let id = moteur.lancer(secondes: s)
    routeur.chemin.append(.minuteur(id))
  }
}

/// Ligne d'un minuteur qui tourne, dans la section En cours.
struct LigneMinuteurActif: View {
  let actif: MinuteurActif
  var action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 9) {
        TimelineView(.periodic(from: .now, by: 1)) { ctx in
          AnneauMinuteur(
            progression: actif.progression(ctx.date), epaisseur: 4,
            couleur: Teinte.minuteur(actif.dureeS), couleurClaire: Teinte.minuteurClair(actif.dureeS)
          )
            .frame(width: 30, height: 30)
        }
        VStack(alignment: .leading, spacing: 0) {
          tempsRestant
            .font(.chiffre(22, .bold))
            .foregroundStyle(actif.enPause ? Teinte.texteDoux : Teinte.texte)
          Text("sur \(Format.dureeCourte(actif.dureeS))")
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
        }
        Spacer(minLength: 0)
        Image(systemName: actif.enPause ? "pause.fill" : "chevron.right")
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(Teinte.minuteur(actif.dureeS))
      }
      .padding(.horizontal, 10)
      .frame(maxWidth: .infinity, minHeight: 48)
      .background(Teinte.carte, in: Capsule())
    }
    .buttonStyle(StyleAppui())
  }

  @ViewBuilder
  private var tempsRestant: some View {
    if let debut = actif.debutIntervalle, let fin = actif.fin {
      Text(timerInterval: debut...fin, countsDown: true)
    } else {
      Text(Format.chrono(Int(actif.restant().rounded(.up))))
    }
  }
}

// MARK: Minuteur en cours

/// Tailles du minuteur en cours, calculees depuis la place reelle du squircle
/// (41, 45, 49 mm comme 40 et 44 mm) : le temps tient toujours dans le contour.
/// Le squircle laisse plus de largeur qu'un cercle a l'interieur, d'ou 86 % pour les textes.
struct MesuresAnneau {
  let diametre: CGFloat
  let epaisseur: CGFloat
  /// Diametre libre a l'interieur de l'anneau.
  let interieur: CGFloat
  /// Largeur utile pour les textes, sous la corde du cercle.
  let largeurTexte: CGFloat
  let tailleTemps: CGFloat
  let tailleLibelle: CGFloat
  /// Le libelle du haut (duree choisie) n'apparait que s'il a la place.
  let libelleHaut: Bool
  /// Le libelle du bas (heure de fin ou En pause) n'apparait que s'il a la place.
  let libelleBas: Bool

  init(place: CGSize) {
    let d = max(60, min(place.width, place.height))
    let e = max(7, (d * 0.075).rounded())
    let i = d - 2 * e
    diametre = d
    epaisseur = e
    interieur = i
    largeurTexte = i * 0.86
    tailleTemps = (i * 0.32).rounded()
    tailleLibelle = max(10, min(14, (i * 0.105).rounded()))
    libelleHaut = i >= 96
    libelleBas = i >= 74
  }
}

struct MinuteurVue: View {
  let id: String
  @State private var moteur = MinuteurMoteur.shared
  @State private var routeur = Routeur.shared
  @Environment(\.isLuminanceReduced) private var veille

  var body: some View {
    Group {
      if let a = moteur.actif(id) {
        contenu(a)
      } else {
        Color.clear
      }
    }
    .navigationTitle("")
    .onAppear {
      // Ouvert sur un minuteur deja fini : retour a la liste. Le retour en arriere normal
      // (fin ou annulation) est fait par RacineVue, une seule fois.
      if moteur.actif(id) == nil {
        DispatchQueue.main.async { routeur.retirerMinuteurs(sauf: moteur.actifs.map(\.id)) }
      }
    }
  }

  private func contenu(_ a: MinuteurActif) -> some View {
    VStack(spacing: 6) {
      GeometryReader { g in
        let m = MesuresAnneau(place: g.size)
        ZStack {
          TimelineView(.periodic(from: .now, by: veille ? 1 : 0.2)) { ctx in
            AnneauMinuteur(
              progression: a.progression(ctx.date), epaisseur: m.epaisseur,
              couleur: Teinte.minuteur(a.dureeS), couleurClaire: Teinte.minuteurClair(a.dureeS)
            )
              .opacity(veille ? 0.55 : 1)
          }
          VStack(spacing: 0) {
            if m.libelleHaut {
              Text(Format.dureeCourte(a.dureeS))
                .font(.system(size: m.tailleLibelle, weight: .heavy, design: .rounded))
                .foregroundStyle(Teinte.minuteur(a.dureeS))
            }
            temps(a)
              .font(.chiffre(m.tailleTemps, .bold))
              .foregroundStyle(a.enPause ? Teinte.texteDoux : Teinte.texte)
            if m.libelleBas {
              Text(a.enPause ? NSLocalizedString("En pause", comment: "") : String(format: NSLocalizedString("fin à %@", comment: ""), "\(Format.heure(a.fin ?? Date()))"))
                .font(.system(size: m.tailleLibelle, weight: .bold, design: .rounded))
                .foregroundStyle(Teinte.texteDoux)
            }
          }
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .multilineTextAlignment(.center)
          .frame(width: m.largeurTexte)
        }
        .frame(width: m.diametre, height: m.diametre)
        .position(x: g.size.width / 2, y: g.size.height / 2)
      }

      if !veille {
        HStack(spacing: 0) {
          boutonRond(icone: "xmark", fond: Teinte.plateau2, texte: Teinte.texte, largeur: 46) {
            moteur.annuler(a.id)
          }
          .accessibilityLabel("Annuler")
          Spacer(minLength: 4)
          boutonRond(icone: a.enPause ? "play.fill" : "pause.fill", fond: Teinte.minuteur(a.dureeS), texte: Color.black, largeur: 64) {
            moteur.basculerPause(a.id)
          }
          .accessibilityLabel(a.enPause ? NSLocalizedString("Reprendre", comment: "") : NSLocalizedString("Pause", comment: ""))
          Spacer(minLength: 4)
          Button {
            moteur.ajouter30(a.id)
          } label: {
            Text("+30")
              .font(.system(size: 15, weight: .heavy, design: .rounded))
              .foregroundStyle(Teinte.texte)
              .frame(width: 46, height: 46)
              .background(Teinte.plateau2, in: Capsule())
          }
          .buttonStyle(StyleAppui())
          .accessibilityLabel("Ajouter 30 secondes")
        }
      }
    }
  }

  @ViewBuilder
  private func temps(_ a: MinuteurActif) -> some View {
    if let debut = a.debutIntervalle, let fin = a.fin {
      Text(timerInterval: debut...fin, countsDown: true)
        .monospacedDigit()
    } else {
      Text(Format.chrono(Int(a.restant().rounded(.up))))
        .monospacedDigit()
    }
  }

  private func boutonRond(icone: String, fond: Color, texte: Color, largeur: CGFloat, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Image(systemName: icone)
        .font(.system(size: 17, weight: .bold))
        .foregroundStyle(texte)
        .frame(width: largeur, height: 46)
        .background(fond, in: Capsule())
    }
    .buttonStyle(StyleAppui())
  }
}

// MARK: Fin du minuteur

/// Ecran Termine, en calque par-dessus toute l'app (voir RacineVue).
/// Arreter coupe tout du premier toucher ; Repeter relance la meme duree. Sans toucher, ca s'arrete seul au bout de 2 min.
/// Couleur de la tranche de duree du minuteur (la meme que son rond et son anneau).
struct AlarmeMinuteurVue: View {
  @State private var moteur = MinuteurMoteur.shared
  @State private var routeur = Routeur.shared
  @State private var pulsation = false
  /// Gardee a l'ouverture : la couleur ne change pas pendant que l'ecran s'efface.
  @State private var couleur: Color = MinuteurMoteur.shared.sonnerie.map { Teinte.minuteur($0.dureeS) } ?? Teinte.accent

  var body: some View {
    GeometryReader { g in
      // Place laissee a la cloche une fois poses le titre (27), la ligne du dessous (16),
      // les boutons (44) et les cinq espaces de 4 pt.
      let cloche = max(44, min(104, g.size.height - 108, g.size.width * 0.62))
      VStack(spacing: 4) {
        Spacer(minLength: 0)
        ZStack {
          // Meme squircle que les tuiles et le minuteur en cours.
          Squircle().fill(couleur.opacity(0.14)).scaleEffect(pulsation ? 1 : 0.86)
          Squircle().fill(couleur.opacity(0.24)).padding(cloche * 0.09).scaleEffect(pulsation ? 1 : 0.9)
          Squircle().fill(couleur).padding(cloche * 0.18)
          Image(systemName: "bell.fill")
            .font(.system(size: (cloche * 0.27).rounded(), weight: .bold))
            .foregroundStyle(Color.black)
        }
        .frame(width: cloche, height: cloche)

        Text("Terminé")
          .font(.system(size: 22, weight: .heavy, design: .rounded))
          .lineLimit(1)
        if let s = moteur.sonnerie {
          Text("Minuteur de \(Format.dureeCourte(s.dureeS))")
            .font(.system(size: 13, weight: .bold, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        Spacer(minLength: 0)

        HStack(spacing: 8) {
          Button {
            moteur.arreterSonnerie()
          } label: {
            Text("Arrêter")
              .font(.system(size: 15, weight: .heavy, design: .rounded))
              .lineLimit(1)
              .minimumScaleFactor(0.8)
              .foregroundStyle(Color.black)
              .frame(maxWidth: .infinity, minHeight: 44)
              .background(couleur, in: Capsule())
              .contentShape(Capsule())
          }
          .buttonStyle(StyleAppui())
          Button {
            if let id = moteur.relancer() { routeur.chemin = [.minuteurs, .minuteur(id)] }
          } label: {
            Text("Répéter")
              .font(.system(size: 14, weight: .heavy, design: .rounded))
              .lineLimit(1)
              .minimumScaleFactor(0.8)
              .foregroundStyle(Teinte.texte)
              .frame(maxWidth: .infinity, minHeight: 44)
              .background(Teinte.plateau2, in: Capsule())
              .contentShape(Capsule())
          }
          .buttonStyle(StyleAppui())
        }
      }
      .frame(width: g.size.width, height: g.size.height)
    }
    .padding(.horizontal, 6)
    .background(Teinte.fond.ignoresSafeArea())
    .onAppear {
      if let s = moteur.sonnerie { couleur = Teinte.minuteur(s.dureeS) }
      guard moteur.sonneEnBoucle else { return }
      withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { pulsation = true }
    }
  }
}

// MARK: Duree libre a la couronne

struct MinuteurLibreVue: View {
  @State private var routeur = Routeur.shared
  /// Depart a 2 min 15.
  @State private var index: Double = 16
  @FocusState private var couronne: Bool

  /// 5 s a 1 min par 5 s, puis 1 min 15 a 5 min par 15 s, 5 min 30 a 20 min par 30 s, 21 a 90 min par minute.
  static let durees: [Int] = {
    var d: [Int] = Array(stride(from: 5, through: 60, by: 5))
    d += Array(stride(from: 75, through: 300, by: 15))
    d += Array(stride(from: 330, through: 1200, by: 30))
    d += Array(stride(from: 1260, through: 5400, by: 60))
    return d
  }()

  private var secondes: Int {
    let i = min(MinuteurLibreVue.durees.count - 1, max(0, Int(index.rounded())))
    return MinuteurLibreVue.durees[i]
  }

  var body: some View {
    VStack(spacing: 4) {
      Spacer(minLength: 0)
      VStack(spacing: -2) {
        Text(Format.rondMinuteurValeur(secondes))
          .font(.chiffre(62, .bold))
          .lineLimit(1)
          .minimumScaleFactor(0.5)
        Text(Format.rondMinuteurUnite(secondes))
          .font(.system(size: 15, weight: .heavy, design: .rounded))
          .foregroundStyle(Teinte.minuteur(secondes))
      }
      .focusable(true)
      .focused($couronne)
      .digitalCrownRotation(
        $index,
        from: 0,
        through: Double(MinuteurLibreVue.durees.count - 1),
        by: 1,
        sensitivity: .medium,
        isContinuous: false,
        isHapticFeedbackEnabled: true
      )
      .accessibilityLabel("Durée")
      .accessibilityValue(Format.dureeCourte(secondes))

      Text("Tourne la couronne")
        .font(.system(size: 12, weight: .semibold, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
      Spacer(minLength: 0)
      BoutonPlein(titre: NSLocalizedString("Lancer", comment: ""), icone: "play.fill") {
        let id = MinuteurMoteur.shared.lancer(secondes: secondes)
        routeur.chemin = [.minuteurs, .minuteur(id)]
      }
    }
    .navigationTitle("Durée")
    .onAppear { couronne = true }
  }
}
