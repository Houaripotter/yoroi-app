import AppIntents
import SwiftUI
import UIKit
import WidgetKit

// Tableau du jour (grand iPhone, tres grand iPad), dans le style choisi :
// A ta scene en plein fond sous un voile, B ta scene nette dans une fenetre arrondie sur le papier,
// C un bandeau de laque avec ton personnage. Puis ton poids et ta courbe, ta semaine, ton eau et ton prochain combat.

struct WidgetTableau: Widget {
  let kind = "YoroiTableau"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .tableau)) { e in
      VueTableau(entree: e)
    }
    .configurationDisplayName("Tableau du jour")
    .description("Ton poids, ta semaine, ton eau et ton prochain combat, sous ta scène.")
    .supportedFamilies([.systemLarge, .systemExtraLarge])
  }
}

struct VueTableau: View {
  @Environment(\.widgetFamily) private var famille
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }
  private var tresGrand: Bool { famille == .systemExtraLarge }

  var body: some View {
    HabilleW(entree: entree, decor: .grand) { pal in
      contenu(pal)
    }
    .widgetURL(Liens.accueil)
  }

  private var titreTexte: String { etat.inst.prenom.isEmpty ? NSLocalizedString("Ton tableau du jour", comment: "") : String(format: NSLocalizedString("Ton jour, %@", comment: ""), "\(etat.inst.prenom)") }
  private var dateTexte: String { Fmt.jourLong(Jours.ecrire(etat.maintenant)) }

  @ViewBuilder private func contenu(_ pal: Palette) -> some View {
    if !etat.present {
      VideW(pal: pal, titre: NSLocalizedString("Tableau du jour", comment: ""))
    } else if pal.style == .d {
      contenuD(pal)
    } else if tresGrand {
      VStack(alignment: .leading, spacing: 12) {
        entete(pal)
        HStack(alignment: .top, spacing: 18) {
          Link(destination: Liens.poids) { blocPoids(pal, courbe: 120, avecArrivee: pal.style != .c) }
            .frame(maxWidth: .infinity)
          VStack(spacing: 12) {
            Link(destination: Liens.seances) { LigneSemaineW(pal: pal, etat: etat, taillePoints: 14) }
            SeparateurW(pal: pal)
            LigneEauW(pal: pal, etat: etat, boutons: true)
            SeparateurW(pal: pal)
            Link(destination: etat.combat == nil ? Liens.ajouterCombat : Liens.combat) { LigneCombatW(pal: pal, etat: etat) }
          }
          .frame(maxWidth: .infinity)
        }
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    } else {
      VStack(alignment: .leading, spacing: 7) {
        entete(pal)
        Link(destination: Liens.poids) { blocPoids(pal, courbe: 60, avecArrivee: pal.style != .c) }
        SeparateurW(pal: pal)
        Link(destination: Liens.seances) { LigneSemaineW(pal: pal, etat: etat, taillePoints: 11) }
        SeparateurW(pal: pal)
        LigneEauW(pal: pal, etat: etat, boutons: true)
        SeparateurW(pal: pal)
        Link(destination: etat.combat == nil ? Liens.ajouterCombat : Liens.combat) { LigneCombatW(pal: pal, etat: etat) }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }

  // MARK: En-tete selon le style

  @ViewBuilder private func entete(_ pal: Palette) -> some View {
    switch pal.style {
    case .a: enteteLanternes(pal)
    case .b: enteteRouleau(pal)
    case .c: enteteLaque(pal)
    case .d: enteteLanternes(pal)
    }
  }

  // MARK: Style D (28 octobre 2026) : ta scene en fond, ton personnage, ton rang

  private var personnageD: Image? {
    entree.personnage.map { Image(uiImage: $0) }
  }

  /// Ta scene en plein fond (posee par FondScenes), ton personnage au milieu, ton rang et ton XP en haut,
  /// en bas une carte depolie : vers le rang suivant, puis poids, semaine et combat.
  @ViewBuilder private func contenuD(_ pal: Palette) -> some View {
    ZStack(alignment: .top) {
      if let p = personnageD {
        p.pleineDesaturee()
          .scaledToFit()
          .frame(height: tresGrand ? 260 : 210)
          .shadow(color: Color.black.opacity(0.3), radius: 8, y: 6)
          .padding(.top, tresGrand ? 30 : 22)
          .accessibilityHidden(true)
      }
      VStack(spacing: 0) {
        HStack {
          if let d = etat.dojo {
            HStack(spacing: 6) {
              Text(d.rang)
                .font(.system(size: 13, weight: .heavy, design: .rounded))
                .foregroundStyle(Color.hexa(0x23358F))
              Text(Textes.rang(d))
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(Color.hexa(0x5A6290))
            }
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .padding(.horizontal, 12)
            .frame(height: 32)
            .verreD(16)
            Spacer(minLength: 6)
            Text(Textes.xp(d.xp))
              .font(.system(size: 13, weight: .heavy, design: .rounded))
              .foregroundStyle(Color.hexa(0xB4471E))
              .lineLimit(1)
              .padding(.horizontal, 12)
              .frame(height: 32)
              .verreD(16)
          } else {
            Text(titreTexte)
              .font(.system(size: 13, weight: .heavy, design: .rounded))
              .foregroundStyle(Color.hexa(0x23358F))
              .lineLimit(1)
              .padding(.horizontal, 12)
              .frame(height: 32)
              .verreD(16)
            Spacer(minLength: 0)
          }
        }
        Spacer(minLength: 0)
        carteBasD
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var carteBasD: some View {
    VStack(alignment: .leading, spacing: 8) {
      if let d = etat.dojo {
        HStack {
          Text(d.suivant.map { String(format: NSLocalizedString("Vers %@", comment: ""), $0) } ?? d.rang)
          Spacer(minLength: 4)
          if let r = d.xpRestant {
            Text(String(format: NSLocalizedString("Encore %@ XP", comment: ""), Fmt.entier(Double(r))))
          }
        }
        .font(.system(size: 11, weight: .heavy, design: .rounded))
        .foregroundStyle(Color.hexa(0x8A3F78))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        BarreRang(part: d.part, hauteur: 9)
      }
      HStack(alignment: .top, spacing: 8) {
        Link(destination: Liens.poids) {
          statD(NSLocalizedString("Poids", comment: ""), etat.poids.dernier.map { Fmt.poids($0.kg, etat.livres) } ?? "", Fmt.unite(etat.livres))
        }
        Link(destination: Liens.seances) {
          statD(NSLocalizedString("Semaine", comment: ""), "\(etat.faites)", etat.objectifSemaine.map { String(format: NSLocalizedString("sur %@", comment: ""), "\($0)") } ?? "")
        }
        Link(destination: etat.combat == nil ? Liens.ajouterCombat : Liens.combat) {
          statD(NSLocalizedString("Combat", comment: ""), etat.joursAvantCombat.map { "\($0)" } ?? "", etat.joursAvantCombat == nil ? "" : (etat.joursAvantCombat == 1 ? NSLocalizedString("jour", comment: "") : NSLocalizedString("jours", comment: "")))
        }
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .verreD(18)
  }

  private func statD(_ titre: String, _ valeur: String, _ unite: String) -> some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(titre.uppercased())
        .font(.system(size: 9.5, weight: .heavy, design: .rounded))
        .tracking(1)
        .foregroundStyle(Color.hexa(0x5A6290))
      HStack(alignment: .firstTextBaseline, spacing: 3) {
        Text(valeur.isEmpty ? "?" : valeur)
          .font(.system(size: 17, weight: .heavy, design: .rounded).monospacedDigit())
          .foregroundStyle(Color.hexa(0x23358F))
          .widgetAccentable()
        if !unite.isEmpty {
          Text(unite)
            .font(.system(size: 11, weight: .heavy, design: .rounded))
            .foregroundStyle(Color.hexa(0x23358F))
        }
      }
      .lineLimit(1)
      .minimumScaleFactor(0.6)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  /// A : le titre en blanc sur ta scene, puis de l'air pour la laisser voir
  private func enteteLanternes(_ pal: Palette) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(titreTexte)
        .font(pal.fort(tresGrand ? 22 : 20))
        .foregroundStyle(Color.hexa(0xFFF6E8))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Text(dateTexte)
        .font(pal.legende(12, .medium))
        .foregroundStyle(Color.hexa(0xFFF6E8).opacity(0.85))
        .lineLimit(1)
      Spacer(minLength: 0)
    }
    .shadow(color: Color.black.opacity(0.45), radius: 3, y: 1)
    .frame(height: tresGrand ? 96 : 72, alignment: .topLeading)
  }

  private var sceneRouleau: Image {
    if let s = entree.scene { return Image(uiImage: s) }
    return Image(entree.style == .b && etatSombre ? "yw_b_theme_nuit" : "yw_b_chateau")
  }

  @Environment(\.colorScheme) private var scheme
  private var etatSombre: Bool { scheme == .dark }

  /// B : ta scene nette dans une fenetre arrondie, le titre en serif blanc
  private func enteteRouleau(_ pal: Palette) -> some View {
    ZStack(alignment: .topLeading) {
      sceneRouleau
        .pleineDesaturee()
        .scaledToFill()
        .frame(maxWidth: .infinity)
        .frame(height: tresGrand ? 118 : 86)
        .clipped()
      LinearGradient(colors: [Color.black.opacity(0.45), .clear], startPoint: .topLeading, endPoint: .center)
      VStack(alignment: .leading, spacing: 1) {
        Text(titreTexte)
          .font(.system(size: tresGrand ? 22 : 20, weight: .bold, design: .serif))
          .foregroundStyle(Color.white)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(dateTexte)
          .font(pal.legende(12, .medium))
          .foregroundStyle(Color.white.opacity(0.9))
          .lineLimit(1)
      }
      .shadow(color: Color.black.opacity(0.4), radius: 2, y: 1)
      .padding(10)
    }
    .frame(height: tresGrand ? 118 : 86)
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(pal.trait, lineWidth: 1))
  }

  private var personnage: Image {
    if let p = entree.personnage { return Image(uiImage: p) }
    return Image("yw_c_guerrier")
  }

  /// C : bandeau de laque noire (date en capitales, titre, arrivee) et ton personnage a droite
  private func enteteLaque(_ pal: Palette) -> some View {
    let or = pal.sombre ? Color.hexa(0xE2B964) : Color.hexa(0xF2D58E)
    let ivoire = Color.hexa(0xF7EEDC)
    return ZStack(alignment: .topLeading) {
      if !pal.sombre {
        LinearGradient(colors: [Color.hexa(0x1A1010), Color.hexa(0x2A0F0E)], startPoint: .top, endPoint: .bottom)
          .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
      VStack(alignment: .leading, spacing: 4) {
        Text(dateTexte.uppercased())
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .tracking(1.4)
          .foregroundStyle(or)
          .lineLimit(1)
        Text(titreTexte)
          .font(pal.fort(tresGrand ? 22 : 20))
          .foregroundStyle(ivoire)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        if let p = Textes.arriveeParts(etat) {
          HStack(spacing: 6) {
            Torii().frame(width: 15, height: 13)
            (Text(p.0 == NSLocalizedString("Arrivée prévue", comment: "") ? NSLocalizedString("Arrivée", comment: "") : p.0).font(pal.legende(12, .medium)).foregroundColor(ivoire.opacity(0.75))
              + Text("  ")
              + Text(p.1).font(pal.legende(12.5, .bold)).foregroundColor(ivoire))
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
        }
      }
      .padding(.horizontal, pal.sombre ? 0 : 12)
      .padding(.vertical, 10)
      .padding(.trailing, tresGrand ? 120 : 76)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .overlay(alignment: .bottom) {
      if pal.sombre {
        Rectangle().fill(or.opacity(0.45)).frame(height: 1)
      }
    }
    .overlay(alignment: .topTrailing) {
      personnage
        .pleineDesaturee()
        .scaledToFit()
        .frame(width: tresGrand ? 110 : 76, height: tresGrand ? 170 : 128)
        .offset(y: -6)
        .accessibilityHidden(true)
    }
  }

  // MARK: Poids

  @ViewBuilder private func blocPoids(_ pal: Palette, courbe: CGFloat, avecArrivee: Bool) -> some View {
    if let d = etat.poids.dernier {
      VStack(alignment: .leading, spacing: 5) {
        HStack(alignment: .center, spacing: 12) {
          VStack(alignment: .leading, spacing: 2) {
            TitreW(pal: pal, texte: NSLocalizedString("Poids", comment: ""))
            GrosPoidsW(pal: pal, kg: d.kg, livres: etat.livres, taille: 34)
            EcartW(pal: pal, etat: etat, taille: 13)
          }
          CourbeW(pal: pal, serie: etat.poids.serie30, ligne: etat.poids.ligne30)
            .frame(maxWidth: .infinity)
            .frame(height: courbe)
        }
        if avecArrivee {
          ArriveeW(pal: pal, etat: etat, taille: 12)
        }
      }
    } else {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          TitreW(pal: pal, texte: NSLocalizedString("Poids", comment: ""))
          Text("Pèse toi dans Yoroi pour voir ta courbe")
            .font(pal.fort(14, .semibold))
            .foregroundStyle(pal.texte)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
        }
        Spacer(minLength: 0)
      }
    }
  }
}


// MARK: - Seance du jour (28 octobre 2026, direction B)

/// La seance du jour de ton Coach, dans ta scene : ton personnage a gauche, la seance et Commencer a droite.
struct WidgetSeanceJour: Widget {
  let kind = "YoroiSeanceJour"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .seanceJour)) { e in
      VueSeanceJour(entree: e)
    }
    .configurationDisplayName("Séance du jour")
    .description("La séance que ton Coach te propose aujourd'hui, dans ta scène.")
    .supportedFamilies([.systemMedium, .accessoryRectangular, .accessoryInline])
  }
}

struct VueSeanceJour: View {
  @Environment(\.widgetFamily) private var famille
  @Environment(\.colorScheme) private var scheme
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }

  var body: some View {
    contenu
      .widgetURL(Liens.coach)
  }

  @ViewBuilder private var contenu: some View {
    switch famille {
    case .accessoryInline:
      Group {
        if let co = etat.coach {
          Text(co.aujourdhui ? "\(co.titre), \(co.resume)" : NSLocalizedString("Jour de repos", comment: ""))
        } else {
          Text("Ton Coach")
        }
      }
      .containerBackground(for: .widget) { Color.clear }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        TitreVerrou(style: entree.style, texte: NSLocalizedString("Séance du jour", comment: ""))
        if let co = etat.coach {
          Text(co.aujourdhui ? co.titre : NSLocalizedString("Jour de repos", comment: ""))
            .font(.system(size: 16, weight: .heavy, design: .rounded))
          Text(co.aujourdhui || co.ensuite.isEmpty ? co.resume : co.ensuite)
            .font(.system(size: 12, weight: .medium, design: .rounded))
        } else {
          Text("Choisis ton programme dans Yoroi").font(.system(size: 13, design: .rounded)).lineLimit(2)
        }
      }
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .frame(maxWidth: .infinity, alignment: .leading)
      .containerBackground(for: .widget) { Color.clear }
    default:
      moyen
    }
  }

  private var sombre: Bool { scheme == .dark }

  private var moyen: some View {
    let pal = Palette.de(.d, sombre: sombre)
    return HStack(spacing: 0) {
      // ta scene et ton personnage
      ZStack(alignment: .bottom) {
        if let sc = entree.scene {
          Image(uiImage: sc).pleineDesaturee().scaledToFill()
        } else {
          LinearGradient(colors: [Color.hexa(0xFFE1D6), Color.hexa(0xEFE6F3)], startPoint: .top, endPoint: .bottom)
        }
        if let p = entree.personnage {
          Image(uiImage: p)
            .pleineDesaturee()
            .scaledToFit()
            .padding(.top, 8)
            .shadow(color: Color.black.opacity(0.25), radius: 5, y: 4)
            .offset(y: 10)
        }
      }
      .frame(width: 130)
      .frame(maxHeight: .infinity)
      .clipped()
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: 4) {
        if let co = etat.coach {
          TitreW(pal: pal, texte: co.aujourdhui ? NSLocalizedString("Ton coach t’attend", comment: "") : NSLocalizedString("Jour de repos", comment: ""), taille: 11)
          Text(co.titre)
            .font(.system(size: 19, weight: .heavy, design: .rounded))
            .foregroundStyle(pal.texte)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          Text(co.aujourdhui || co.ensuite.isEmpty ? co.resume : co.ensuite)
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(pal.doux)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          if !co.muscles.isEmpty {
            HStack(spacing: 4) {
              ForEach(Array(co.muscles.prefix(3).enumerated()), id: \.offset) { i, m in
                PastilleD(texte: m, fond: VueSeanceJour.pastilles[i % 3].0, encre: VueSeanceJour.pastilles[i % 3].1)
              }
            }
            .lineLimit(1)
          }
          Spacer(minLength: 0)
          HStack(spacing: 6) {
            Image(systemName: co.aujourdhui ? "play.fill" : "calendar")
              .font(.system(size: 12, weight: .heavy))
            Text(co.aujourdhui ? NSLocalizedString("Commencer", comment: "") : NSLocalizedString("Voir mon programme", comment: ""))
              .font(.system(size: 13, weight: .heavy, design: .rounded))
              .lineLimit(1)
              .minimumScaleFactor(0.7)
          }
          .foregroundStyle(pal.surBouton)
          .frame(maxWidth: .infinity, minHeight: 32)
          .background(pal.bouton, in: Capsule())
          .widgetAccentable()
        } else {
          TitreW(pal: pal, texte: NSLocalizedString("Ton coach", comment: ""), taille: 11)
          Spacer(minLength: 0)
          Text("Choisis ton programme dans Yoroi")
            .font(.system(size: 15, weight: .heavy, design: .rounded))
            .foregroundStyle(pal.texte)
            .lineLimit(3)
            .minimumScaleFactor(0.8)
          Spacer(minLength: 0)
        }
      }
      .padding(.leading, 14)
      .padding(.trailing, 14)
      .padding(.vertical, 14)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .containerBackground(for: .widget) {
      if pal.sombre {
        LinearGradient(colors: [Color.hexa(0x2E3C8C), Color.hexa(0x4A3584)], startPoint: .topLeading, endPoint: .bottomTrailing)
      } else {
        Color.white
      }
    }
  }

  /// pastilles des muscles : bleu, menthe, lilas
  static let pastilles: [(Color, Color)] = [
    (Color.hexa(0xE6ECF8), Color.hexa(0x3557D9)),
    (Color.hexa(0xE3F2EA), Color.hexa(0x1C6B45)),
    (Color.hexa(0xEFE6F3), Color.hexa(0x8A3F78)),
  ]
}

// MARK: - Ton personnage (28 octobre 2026, direction B)

/// Ton personnage dans ta scene, ton rang et la barre vers le rang suivant.
struct WidgetPersonnage: Widget {
  let kind = "YoroiPersonnage"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigStyleIntent.self, provider: FournisseurYoroi(genre: .personnage)) { e in
      VuePersonnage(entree: e)
    }
    .configurationDisplayName("Ton personnage")
    .description("Ton personnage dans ta scène, avec ton rang et ton XP.")
    .supportedFamilies([.systemSmall, .accessoryCircular])
  }
}

struct VuePersonnage: View {
  @Environment(\.widgetFamily) private var famille
  var entree: EntreeYoroi

  private var etat: EtatYoroi { entree.etat }

  var body: some View {
    contenu
      .widgetURL(Liens.dojo)
  }

  @ViewBuilder private var contenu: some View {
    if famille == .accessoryCircular {
      RondW(style: .d, part: etat.dojo?.part ?? 0) {
        if let p = entree.personnage {
          Image(uiImage: p)
            .resizable()
            .scaledToFit()
            .padding(2)
            .widgetAccentable()
        } else {
          Text(etat.dojo.map { "\($0.rangIndex + 1)" } ?? "?")
            .font(.system(size: 20, weight: .heavy, design: .rounded))
        }
      }
      .containerBackground(for: .widget) { Color.clear }
    } else {
      ZStack(alignment: .bottom) {
        if let p = entree.personnage {
          Image(uiImage: p)
            .pleineDesaturee()
            .scaledToFit()
            .padding(.top, 4)
            .padding(.bottom, 34)
            .shadow(color: Color.black.opacity(0.3), radius: 6, y: 5)
            .accessibilityHidden(true)
        }
        VStack(alignment: .leading, spacing: 5) {
          Text(etat.dojo?.rang ?? NSLocalizedString("Ton personnage", comment: ""))
            .font(.system(size: 13, weight: .heavy, design: .rounded))
            .foregroundStyle(Color.hexa(0x23358F))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          BarreRang(part: etat.dojo?.part ?? 0, hauteur: 5)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .verreD(14)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .containerBackground(for: .widget) {
        if let sc = entree.scene {
          Color.hexa(0xF6EEDD).overlay { Image(uiImage: sc).pleineDesaturee().scaledToFill() }.clipped()
        } else {
          LinearGradient(colors: [Color.hexa(0xFFE1D6), Color.hexa(0xEFE6F3)], startPoint: .top, endPoint: .bottom)
        }
      }
    }
  }
}
