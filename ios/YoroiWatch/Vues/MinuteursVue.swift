import SwiftUI
import UIKit

// Minuteurs de repos : En cours, Epingles, Recents, Tous, rond + pour une duree libre.
// Un toucher lance tout de suite. Modifier : toucher un rond l'epingle ou le retire.

struct MinuteursVue: View {
  @State private var moteur = MinuteurMoteur.shared
  @State private var routeur = Routeur.shared
  @State private var edition = false
  /// Rappel montre une seule fois : les vibrations fortes se reglent dans watchOS, pas dans l'app.
  @AppStorage("yoroi.astuce.vibrationsProno") private var astuceVue = false

  var body: some View {
    // La place reelle sous le titre (zone sure comprise) donne la taille des tuiles :
    // 2 x 2 tuiles entieres remplissent l'ecran, on fait defiler pour voir les suivantes.
    GeometryReader { g in
      let m = TailleTuile.mesure(place: g.size)
      let t = m.taille
      let colonnes = [GridItem(.flexible(), spacing: TailleTuile.ecart), GridItem(.flexible(), spacing: TailleTuile.ecart)]
      ScrollView {
        VStack(alignment: .leading, spacing: TailleTuile.ecart) {
          if !astuceVue && !edition {
            AstuceVibrations { astuceVue = true }
          }
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
            // 29 octobre 2026, pour les essais : seance de maintien et chemin de la derniere sonnerie
            Text(verbatim: "Maintien : \(moteur.etatMaintien)")
              .font(.system(size: 11, weight: .medium, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
            if !moteur.derniereSonnerieVia.isEmpty {
              Text(verbatim: "A sonné par : \(moteur.derniereSonnerieVia)")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(Teinte.texteDoux)
            }
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

/// Rappel unique en haut des minuteurs : watchOS garde pour lui l'intensite des vibrations.
/// Vibrations prononcees ajoute une vibration d'annonce avant chaque alerte.
struct AstuceVibrations: View {
  var fermer: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("Alarme plus forte")
        .font(.system(size: 14, weight: .heavy, design: .rounded))
        .foregroundStyle(Teinte.texte)
      Text("Sur ta montre : Réglages, Sons et vibrations, active Vibrations prononcées et monte le volume.")
        .font(.system(size: 12, weight: .medium, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
        .fixedSize(horizontal: false, vertical: true)
      Button {
        fermer()
        Haptique.cran()
      } label: {
        Text("Compris")
          .font(.system(size: 14, weight: .bold, design: .rounded))
          .frame(maxWidth: .infinity, minHeight: 36)
          .background(Teinte.accent, in: Capsule())
          .foregroundStyle(Color.black)
      }
      .buttonStyle(StyleAppui())
    }
    .padding(10)
    .background(Teinte.carte, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
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

  /// 28 octobre 2026, direction B : le bord de l'ecran se vide comme un anneau, le temps en tres grand au centre.
  private func contenu(_ a: MinuteurActif) -> some View {
    let couleur = Teinte.minuteur(a.dureeS)
    return ZStack {
      TimelineView(.periodic(from: .now, by: veille ? 1 : 0.2)) { ctx in
        AnneauBord(progression: a.progression(ctx.date), couleur: couleur, piste: couleur.opacity(0.18), epaisseur: 7)
          .opacity(veille ? 0.55 : 1)
      }
      .ignoresSafeArea()

      VStack(spacing: 2) {
        Capitales(texte: SeanceGuidee.shared.estRepos(a.id) ? NSLocalizedString("Repos", comment: "") : NSLocalizedString("Minuteur", comment: ""), couleur: couleur)
        Text(Format.dureeCourte(a.dureeS))
          .font(.system(size: 15, weight: .heavy, design: .rounded))
          .foregroundStyle(couleur)
          .lineLimit(1)
        temps(a)
          .font(.chiffre(64, .heavy))
          .foregroundStyle(a.enPause ? Teinte.texteDoux : Teinte.texte)
          .lineLimit(1)
          .minimumScaleFactor(0.45)
        Text(a.enPause ? NSLocalizedString("En pause", comment: "") : String(format: NSLocalizedString("fin à %@", comment: ""), "\(Format.heure(a.fin ?? Date()))"))
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
          .lineLimit(1)
        Spacer(minLength: 2)
        if !veille {
          HStack(spacing: 0) {
            boutonRond(icone: "xmark", fond: Teinte.plateau2, texte: Teinte.texte, largeur: 46) {
              moteur.annuler(a.id)
            }
            .accessibilityLabel("Annuler")
            Spacer(minLength: 4)
            boutonRond(icone: a.enPause ? "play.fill" : "pause.fill", fond: couleur, texte: Color.black, largeur: 64) {
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
      .multilineTextAlignment(.center)
      .padding(.horizontal, 10)
      .padding(.top, 4)
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

/// Ecran de fin, en calque par-dessus toute l'app (voir RacineVue).
/// 28 octobre 2026, direction B : plein ecran peche seulement pendant qu'il sonne, ton personnage qui vibre,
/// 0:00 en grand, Arreter et Repeter tres gros. Arreter coupe tout du premier toucher ; Repeter relance la meme
/// duree. Sans toucher, ca s'arrete seul au bout de 5 min. Fin d'un repos de la seance guidee : « Repos fini »
/// et la serie qui vient. En veille (poignet baisse, ecran toujours allume), l'ecran reste la, assombri par watchOS.
struct AlarmeMinuteurVue: View {
  @State private var moteur = MinuteurMoteur.shared
  @State private var routeur = Routeur.shared
  @State private var synchro = Synchro.shared
  @State private var guidee = SeanceGuidee.shared
  @State private var pulsation = false
  @Environment(\.isLuminanceReduced) private var veille

  /// Fin du repos de ta seance guidee (et pas d'un minuteur lance a la main).
  private var finDeRepos: Bool {
    guard let s = moteur.sonnerie else { return false }
    return guidee.estRepos(s.id)
  }

  private var titre: String {
    finDeRepos ? NSLocalizedString("Repos fini", comment: "") : NSLocalizedString("Temps écoulé", comment: "")
  }

  private var sousTitre: String {
    if finDeRepos, let e = guidee.seance?.exoCourant, !e.fini {
      return String(format: NSLocalizedString("Au boulot, série %@ sur %@", comment: ""), "\(e.faites + 1)", "\(e.total)")
    }
    if finDeRepos { return NSLocalizedString("Au boulot", comment: "") }
    if let s = moteur.sonnerie { return String(format: NSLocalizedString("Minuteur de %@", comment: ""), "\(Format.dureeCourte(s.dureeS))") }
    return ""
  }

  var body: some View {
    GeometryReader { g in
      let k = min(g.size.width / 185, g.size.height / 225)
      ZStack {
        RadialGradient(
          colors: [Color(hexa: 0xFFE4DA), Teinte.peche, Color(hexa: 0xFF9E82)],
          center: UnitPoint(x: 0.5, y: 0.38), startRadius: 0, endRadius: max(g.size.width, g.size.height) * 0.75
        )
        .opacity(veille ? 0.55 : 1)
        .ignoresSafeArea()

        VStack(spacing: 0) {
          HStack(spacing: 10 * k) {
            Vibration(sens: -1, couleur: Teinte.pecheTexte, taille: 20 * k, actif: pulsation)
            avatar(46 * k)
            Vibration(sens: 1, couleur: Teinte.pecheTexte, taille: 20 * k, actif: pulsation)
          }
          .padding(.top, 2 * k)

          Text("0:00")
            .font(.chiffre(54 * k, .heavy))
            .foregroundStyle(Teinte.pecheTexte)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .padding(.top, -2 * k)

          Text(titre)
            .font(.system(size: 17 * k, weight: .heavy, design: .rounded))
            .foregroundStyle(Teinte.navy)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(sousTitre)
            .font(.system(size: 12 * k, weight: .bold, design: .rounded))
            .foregroundStyle(Teinte.pecheSous)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .padding(.top, 1)

          Spacer(minLength: 4 * k)

          HStack(spacing: 6 * k) {
            Button {
              moteur.arreterSonnerie()
            } label: {
              Text("Arrêter")
                .font(.system(size: 17 * k, weight: .heavy, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .foregroundStyle(Color.white)
                .frame(maxWidth: .infinity, minHeight: max(46, 48 * k))
                .background(Teinte.navy, in: Capsule())
                .contentShape(Capsule())
            }
            .buttonStyle(StyleAppui())
            .accessibilityLabel("Arrêter")
            Button {
              if let id = moteur.relancer() { routeur.chemin = [.minuteurs, .minuteur(id)] }
            } label: {
              Image(systemName: "arrow.clockwise")
                .font(.system(size: 20 * k, weight: .heavy))
                .foregroundStyle(Teinte.navy)
                .frame(width: max(46, 48 * k), height: max(46, 48 * k))
                .background(Color.white.opacity(0.72), in: Circle())
                .contentShape(Circle())
            }
            .buttonStyle(StyleAppui())
            .accessibilityLabel("Répéter")
          }
        }
        .padding(.horizontal, 8 * k)
        .padding(.bottom, 2)
        .frame(width: g.size.width, height: g.size.height)
      }
    }
    .onAppear {
      guard moteur.sonneEnBoucle else { return }
      withAnimation(.easeInOut(duration: 0.45).repeatForever(autoreverses: true)) { pulsation = true }
    }
  }

  /// Ton personnage dans un rond blanc (ou le torii tant que l'iPhone ne l'a pas envoye).
  @ViewBuilder private func avatar(_ d: CGFloat) -> some View {
    ZStack {
      Circle().fill(Color.white)
      if let p = synchro.personnageAffiche {
        Image(uiImage: p)
          .resizable()
          .scaledToFill()
          .frame(width: d * 1.9, height: d * 1.9)
          .offset(y: d * 0.42)
          .frame(width: d - 6, height: d - 6)
          .clipShape(Circle())
      } else {
        Torii(couleur: Teinte.torii).padding(d * 0.24)
      }
    }
    .frame(width: d, height: d)
    .scaleEffect(pulsation ? 1.06 : 1)
    .accessibilityHidden(true)
  }
}

/// Les ondes de la vibration, de part et d'autre du personnage : (( et )).
struct Vibration: View {
  /// -1 a gauche, 1 a droite
  var sens: CGFloat
  var couleur: Color
  var taille: CGFloat
  var actif: Bool

  var body: some View {
    ZStack {
      Onde(sens: sens).stroke(couleur, style: StrokeStyle(lineWidth: max(2, taille * 0.1), lineCap: .round))
        .frame(width: taille * 0.45, height: taille * 0.75)
        .offset(x: sens * taille * 0.12)
      Onde(sens: sens).stroke(couleur.opacity(0.7), style: StrokeStyle(lineWidth: max(2, taille * 0.1), lineCap: .round))
        .frame(width: taille * 0.6, height: taille)
        .offset(x: sens * taille * 0.32)
    }
    .frame(width: taille, height: taille)
    .opacity(actif ? 1 : 0.55)
    .accessibilityHidden(true)
  }
}

/// Un arc vertical tourne vers l'exterieur.
struct Onde: Shape {
  var sens: CGFloat

  func path(in r: CGRect) -> Path {
    var p = Path()
    let x0 = sens < 0 ? r.maxX : r.minX
    let x1 = sens < 0 ? r.minX : r.maxX
    p.move(to: CGPoint(x: x0, y: r.minY))
    p.addQuadCurve(to: CGPoint(x: x0, y: r.maxY), control: CGPoint(x: x1, y: r.midY))
    return p
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
