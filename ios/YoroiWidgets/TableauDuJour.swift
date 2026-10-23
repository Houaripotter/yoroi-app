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
    }
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
