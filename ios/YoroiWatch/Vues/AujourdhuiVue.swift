import SwiftUI
import UIKit

// Page 1 : poids du jour (ou dernier poids et sa date), ecart au rythme prevu,
// mini courbe 30 jours avec le rythme en tirets, fenetre d'arrivee avec le torii. Bouton Peser.

struct AujourdhuiVue: View {
  @State private var synchro = Synchro.shared
  @State private var routeur = Routeur.shared

  private var poids: PoidsCtx { synchro.contexte.poids }
  private var livres: Bool { synchro.unitesEnLivres }

  var body: some View {
    Group {
      if let dernier = poids.dernier {
        // 29 octobre 2026 : defilant, jamais sous le titre « Poids » (41 mm compris)
        ScrollView { contenu(dernier) }
      } else if synchro.aRecuContexte {
        VStack(spacing: 10) {
          EcranVide(icone: "scalemass", texte: NSLocalizedString("Pas encore de pesée", comment: ""))
          BoutonPlein(titre: NSLocalizedString("Peser", comment: ""), icone: "plus") { routeur.ouvrir(.peser) }
        }
      } else {
        VStack(spacing: 8) {
          EcranVide()
          BoutonPlein(titre: NSLocalizedString("Peser", comment: ""), icone: "plus") { routeur.ouvrir(.peser) }
        }
      }
    }
    .navigationTitle("Poids")
  }

  @ViewBuilder
  private func contenu(_ dernier: DernierPoids) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(Format.jourRelatif(dernier.date))
        .font(.system(size: 13, weight: .medium, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)

      HStack(alignment: .firstTextBaseline) {
        GrosChiffre(valeur: Format.poids(dernier.kg, livres: livres), unite: Format.symbole(livres: livres), taille: 40)
        Spacer(minLength: 4)
        Button {
          routeur.ouvrir(.peser)
        } label: {
          Image(systemName: "plus")
            .font(.system(size: 18, weight: .bold))
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(Teinte.accent)
        .foregroundStyle(Color.black)
        .clipShape(Circle())
        .accessibilityLabel("Peser")
      }

      ligneEcart

      // 28 octobre 2026 : le prochain palier du chemin vers ton cap
      if let p = poids.palier {
        LignePalier(palier: p, livres: livres, taille: 12)
      }

      if !poids.serie30.isEmpty {
        MiniCourbe(serie: poids.serie30, ligne: poids.ligne30, couleurSerie: Teinte.texte, couleurLigne: Teinte.accent)
          .frame(height: 38)
          .padding(.top, 2)
      }

      if let a = poids.arrivee {
        HStack(spacing: 5) {
          Torii().frame(width: 16, height: 15)
          Text("Arrivée prévue du \(Format.jourCourt(a.du)) au \(Format.jourCourt(a.au))")
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
        }
        .padding(.top, 2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private var ligneEcart: some View {
    if synchro.aEnAttente(.poids) {
      Text("Envoyé à ton iPhone")
        .font(.system(size: 13, weight: .medium, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
    } else if let phrase = poids.phrase, !phrase.isEmpty {
      Text(phrase)
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(Teinte.statut(poids.statut))
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    } else if let e = poids.ecart {
      Text("\(Format.ecart(e, livres: livres)) \(Format.symbole(livres: livres)) par rapport au rythme")
        .font(.system(size: 13, weight: .semibold, design: .rounded))
        .foregroundStyle(Teinte.statut(poids.statut))
    }
  }
}


// MARK: - Accueil, direction B « ton dojo au poignet » (28 octobre 2026)

/// Page d'accueil : ton personnage et ton rang au premier plan dans un anneau fin (XP vers le palier suivant),
/// la seance du jour de ton Coach, ton poids avec le torii et ta semaine. Tout vient de l'iPhone.
struct AccueilVue: View {
  @State private var synchro = Synchro.shared
  @State private var routeur = Routeur.shared
  @State private var guidee = SeanceGuidee.shared

  private var c: Contexte { synchro.contexte }
  private var livres: Bool { synchro.unitesEnLivres }

  var body: some View {
    Group {
      if !synchro.aRecuContexte {
        EcranVide()
      } else {
        GeometryReader { g in
          // 29 octobre 2026 : borne aussi par la hauteur reelle sous l'heure (41, 45 et 49 mm), rien ne deborde
          let k = min(1.12, max(0.72, min(g.size.width / 185, (g.size.height - 16) / 184)))
          VStack(alignment: .leading, spacing: 7 * k) {
            enteteRang(k)
            carteCoach(k)
            HStack(alignment: .top, spacing: 8 * k) {
              blocPoids(k)
                .frame(maxWidth: .infinity, alignment: .leading)
              blocSemaine(k)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 4 * k)
          }
          .frame(width: g.size.width, height: g.size.height, alignment: .top)
        }
      }
    }
    .navigationTitle("")
  }

  // MARK: Rang et personnage

  @ViewBuilder private func enteteRang(_ k: CGFloat) -> some View {
    let d = c.dojo
    HStack(spacing: 9 * k) {
      ZStack {
        Circle().stroke(Teinte.piste, lineWidth: 5 * k)
        Circle()
          .trim(from: 0, to: CGFloat(max(0.02, d?.part ?? 0)))
          .stroke(
            AngularGradient(colors: [Teinte.lilas, Teinte.pecheClair, Teinte.lilas], center: .center),
            style: StrokeStyle(lineWidth: 5 * k, lineCap: .round)
          )
          .rotationEffect(.degrees(-90))
        AvatarRond(personnage: synchro.personnageAffiche, scene: synchro.scene, diametre: 62 * k)
      }
      .frame(width: 76 * k, height: 76 * k)
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: 1) {
        if let d {
          Capitales(texte: String(format: NSLocalizedString("Rang %@ sur %@", comment: ""), "\(d.rangIndex + 1)", "\(d.rangs)"), couleur: Teinte.lilas, taille: 9 * k)
          Text(d.rang)
            .font(.system(size: 20 * k, weight: .heavy, design: .rounded))
            .foregroundStyle(Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          Text(String(format: NSLocalizedString("%@ XP", comment: ""), Format.entier(Double(d.xp))))
            .font(.chiffre(12 * k, .heavy))
            .foregroundStyle(Teinte.peche)
            .lineLimit(1)
          if let s = d.suivant, let x = d.xpSuivant {
            Text(String(format: NSLocalizedString("%@ à %@", comment: ""), s, Format.entier(Double(x))))
              .font(.system(size: 10 * k, weight: .bold, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
        } else {
          Capitales(texte: NSLocalizedString("Ton dojo", comment: ""), couleur: Teinte.lilas, taille: 9 * k)
          Text(c.profil.prenom.isEmpty ? "Yoroi" : c.profil.prenom)
            .font(.system(size: 20 * k, weight: .heavy, design: .rounded))
            .foregroundStyle(Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.top, 2 * k)
    .accessibilityElement(children: .combine)
  }

  // MARK: Ton Coach

  @ViewBuilder private func carteCoach(_ k: CGFloat) -> some View {
    if guidee.active, let s = guidee.seance {
      Button {
        routeur.ouvrir(.seanceGuidee)
      } label: {
        capsuleCoach(k, caps: NSLocalizedString("Séance en cours", comment: ""), titre: s.exoCourant?.nom ?? s.titre, sous: s.titre, icone: "dumbbell.fill")
      }
      .buttonStyle(StyleAppui())
    } else if let co = c.coach {
      Button {
        routeur.allerA(.entrainement)
      } label: {
        capsuleCoach(
          k,
          caps: co.aujourdhui ? NSLocalizedString("Ton coach", comment: "") : NSLocalizedString("Jour de repos", comment: ""),
          titre: co.titre,
          sous: co.aujourdhui ? co.resume : (co.ensuite.isEmpty ? co.resume : co.ensuite),
          icone: co.aujourdhui ? "play.fill" : "moon.zzz.fill"
        )
      }
      .buttonStyle(StyleAppui())
    }
  }

  private func capsuleCoach(_ k: CGFloat, caps: String, titre: String, sous: String, icone: String) -> some View {
    HStack(spacing: 8 * k) {
      ZStack {
        Circle().fill(Teinte.navy)
        Image(systemName: icone)
          .font(.system(size: 14 * k, weight: .heavy))
          .foregroundStyle(Color.white)
          .offset(x: icone == "play.fill" ? 1.5 : 0)
      }
      .frame(width: 36 * k, height: 36 * k)
      VStack(alignment: .leading, spacing: 0) {
        Capitales(texte: caps, couleur: Teinte.coachCaps, taille: 8.5 * k)
        Text(titre)
          .font(.system(size: 14.5 * k, weight: .heavy, design: .rounded))
          .foregroundStyle(Teinte.navy)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        Text(sous)
          .font(.system(size: 10 * k, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.coachSous)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      Spacer(minLength: 0)
    }
    .padding(.leading, 7 * k)
    .padding(.trailing, 8 * k)
    .frame(maxWidth: .infinity, minHeight: 52 * k)
    .background(LinearGradient(gradient: Teinte.coachFond, startPoint: .leading, endPoint: .trailing), in: Capsule())
  }

  // MARK: Poids et semaine

  private func blocPoids(_ k: CGFloat) -> some View {
    Button {
      routeur.allerA(.aujourdhui)
    } label: {
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 4) {
          Torii(couleur: Teinte.torii).frame(width: 15 * k, height: 14 * k)
          Capitales(texte: NSLocalizedString("Poids", comment: ""), couleur: Teinte.torii, taille: 8.5 * k)
        }
        if let d = c.poids.dernier {
          HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text(Format.poids(d.kg, livres: livres))
              .font(.chiffre(21 * k, .heavy))
              .foregroundStyle(Color.white)
              .lineLimit(1)
              .minimumScaleFactor(0.6)
            Text(Format.symbole(livres: livres))
              .font(.system(size: 10 * k, weight: .heavy, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
          if let p = c.poids.palier {
            Text(TextesB.palierCourt(p, livres: livres))
              .font(.system(size: 9.5 * k, weight: .heavy, design: .rounded))
              .foregroundStyle(Teinte.menthe)
              .lineLimit(1)
              .minimumScaleFactor(0.6)
          } else if let e = c.poids.ecart {
            Text("\(Format.ecart(e, livres: livres)) \(Format.symbole(livres: livres))")
              .font(.system(size: 9.5 * k, weight: .heavy, design: .rounded))
              .foregroundStyle(Teinte.statut(c.poids.statut))
              .lineLimit(1)
          }
        } else {
          Text("Peser")
            .font(.system(size: 15 * k, weight: .heavy, design: .rounded))
            .foregroundStyle(Color.white)
        }
      }
    }
    .buttonStyle(.plain)
  }

  private func blocSemaine(_ k: CGFloat) -> some View {
    let s = c.semaine
    let auj = Calendar.current.dateComponents([.day], from: Contexte.lundiCourant(), to: Calendar.current.startOfDay(for: Date())).day ?? 0
    return Button {
      routeur.allerA(.semaine)
    } label: {
      VStack(alignment: .leading, spacing: 2) {
        Capitales(texte: NSLocalizedString("Semaine", comment: ""), couleur: Teinte.bleu, taille: 8.5 * k)
          .frame(height: 14 * k)
        HStack(alignment: .firstTextBaseline, spacing: 3) {
          Text("\(s.faites)")
            .font(.chiffre(21 * k, .heavy))
            .foregroundStyle(Color.white)
          if let o = s.objectif, o > 0 {
            Text(String(format: NSLocalizedString("sur %@", comment: ""), "\(o)"))
              .font(.system(size: 10 * k, weight: .heavy, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
        HStack(spacing: 3 * k) {
          ForEach(0..<7, id: \.self) { i in
            let fait = i < s.jours.count && s.jours[i]
            Circle()
              .fill(fait ? Teinte.bleu : Teinte.piste)
              .overlay(Circle().stroke(i == auj ? Color.white : Color.clear, lineWidth: 1.5))
              .frame(width: 7 * k, height: 7 * k)
          }
        }
        .padding(.top, 2)
        .accessibilityHidden(true)
      }
    }
    .buttonStyle(.plain)
  }
}

/// Ton personnage dans un rond, sur ta scene (ou sur un fond sombre tant que l'iPhone n'a rien envoye).
struct AvatarRond: View {
  var personnage: UIImage?
  var scene: UIImage?
  var diametre: CGFloat
  var bord: Color = Color.black

  var body: some View {
    ZStack {
      if let scene {
        Image(uiImage: scene)
          .resizable()
          .scaledToFill()
          .frame(width: diametre, height: diametre)
      } else {
        Circle().fill(Teinte.carte)
      }
      if let personnage {
        Image(uiImage: personnage)
          .resizable()
          .scaledToFit()
          .frame(height: diametre * 2.1)
          .offset(y: diametre * 0.56)
      } else {
        Torii(couleur: Teinte.torii).padding(diametre * 0.25)
      }
    }
    .frame(width: diametre, height: diametre)
    .clipShape(Circle())
    .overlay(Circle().stroke(bord, lineWidth: 2))
  }
}

/// Le palier en une ligne : « Palier 78 dans 0,4 », « Ton cap dans 0,4 ».
struct LignePalier: View {
  var palier: PalierCtx
  var livres: Bool
  var taille: CGFloat = 12

  var body: some View {
    HStack(spacing: 5) {
      Torii(couleur: Teinte.torii).frame(width: taille * 1.2, height: taille * 1.1)
      Text(TextesB.palier(palier, livres: livres))
        .font(.system(size: taille, weight: .heavy, design: .rounded))
        .foregroundStyle(Teinte.menthe)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
  }
}

/// Textes de la direction B partages par les ecrans.
enum TextesB {
  /// « Palier 78 dans 0,4 kg » ou « Ton cap dans 0,4 kg »
  static func palier(_ p: PalierCtx, livres: Bool) -> String {
    let reste = "\(Format.poids(p.reste, livres: livres)) \(Format.symbole(livres: livres))"
    if p.dernier { return String(format: NSLocalizedString("Ton cap dans %@", comment: ""), reste) }
    return String(format: NSLocalizedString("Palier %@ dans %@", comment: ""), Format.poidsCourt(p.kg, livres: livres), reste)
  }

  /// « palier 78 dans 0,4 » (sans unite, pour les petites places)
  static func palierCourt(_ p: PalierCtx, livres: Bool) -> String {
    if p.dernier { return String(format: NSLocalizedString("cap dans %@", comment: ""), Format.poidsCourt(p.reste, livres: livres)) }
    return String(format: NSLocalizedString("palier %@ dans %@", comment: ""), Format.poidsCourt(p.kg, livres: livres), Format.poidsCourt(p.reste, livres: livres))
  }
}
