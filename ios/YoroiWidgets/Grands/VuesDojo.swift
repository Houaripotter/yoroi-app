import SwiftUI
import UIKit
import WidgetKit

// 4. Mon dojo : ta scene et ton personnage, ton rang et ton XP, ta serie de jours, ton coffre du jour et ta
// prochaine recompense. Maquette : 4_dojo_tres_grand et 4_dojo_grand.

/// Ta scene d'Accueil en fond, ton personnage devant (les images copiees par l'app dans l'App Group)
struct SceneDojoG: View {
  let scene: UIImage?
  let personnage: UIImage?
  let rang: String?
  /// hauteur du personnage par rapport a la scene (1,28 en grand : il deborde vers le bas, comme la maquette)
  var echelle: CGFloat = 0.94
  var decalage: CGFloat = 6

  @Environment(\.paletteG) var t

  var body: some View {
    GeometryReader { g in
      ZStack {
        if let scene {
          Image(uiImage: scene).resizable().gImageAttenuee().scaledToFill()
            .frame(width: g.size.width, height: g.size.height)
            .clipped()
        } else {
          LinearGradient(colors: [Color.g(0x23358F), Color.g(0x3C4FA8), Color.g(0xC97A5A)], startPoint: .top, endPoint: .bottom)
        }
        if let personnage {
          Image(uiImage: personnage).resizable().gImageAttenuee().scaledToFit()
            .frame(height: g.size.height * echelle)
            .shadow(color: .black.opacity(0.35), radius: 5, x: 0, y: 6)
            .frame(width: g.size.width, height: g.size.height, alignment: .bottom)
            .offset(y: decalage)
        }
        if let rang {
          Text(rang)
            .font(.ag(13, .noir))
            .foregroundStyle(Color.g(0x1D2033))
            .padding(.vertical, 5)
            .padding(.horizontal, 11)
            .background(Capsule().fill(Color.white.opacity(0.92)))
            .padding(12)
            .frame(width: g.size.width, height: g.size.height, alignment: .topLeading)
        }
      }
      .frame(width: g.size.width, height: g.size.height)
      .clipped()
    }
  }
}

struct VueDojoG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      if let d = entree.inst?.dojo {
        if xl { tresGrand(d) } else { grand(d) }
      } else {
        VideG(titre: gL("Mon dojo"), texte: gL("Ton rang et ton XP s’afficheront ici."), sticker: "couronne", couleur: t.or)
          .padding(.vertical, 16)
          .padding(.horizontal, 18)
      }
    }
  }

  private func perso(_ d: DojoG) -> UIImage? { d.personnage ? entree.personnage : nil }

  private func xp(_ d: DojoG, xl: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .firstTextBaseline) {
        Text("\(FmtG.entier(d.xp)) XP").font(.ag(xl ? 22 : 18, .noir))
        Spacer(minLength: 4)
        if let s = d.suivant, let x = d.xpSuivant {
          Text("\(s) \(gL("à")) \(FmtG.entier(x))").gTl(t.doux)
        }
      }
      BarreG(part: d.part ?? 0, couleur: t.or, fond: t.anneauFond, hauteur: 12, degrade: [t.or, t.ambre]).padding(.top, 6)
      if let s = d.suivant, let r = d.xpRestant {
        Text("\(gL("Encore")) \(FmtG.entier(r)) XP \(gL("pour le rang")) \(s)").font(.ag(11.5, .extra)).foregroundStyle(t.doux).lineLimit(1).padding(.top, 5)
      }
    }
  }

  private func coffreTexte(_ c: CoffreG) -> String {
    switch c.etat {
    case "pret": return gL("Prêt à ouvrir")
    case "ouvert": return gL("Ouvert aujourd’hui")
    default: return gL("Un geste et il s’ouvre")
    }
  }

  @ViewBuilder
  private func coffre(_ d: DojoG, xl: Bool) -> some View {
    if let c = d.coffre {
      HStack(spacing: 10) {
        StickerG(nom: c.grand ? "grand_coffre_ferme" : "coffre_ferme", taille: xl ? 54 : 44)
        VStack(alignment: .leading, spacing: 0) {
          Text(gL("Coffre du jour")).gTl(t.jaune.texte)
          Text(coffreTexte(c)).font(.ag(xl ? 17 : 15, .noir)).lineLimit(1).padding(.top, 4)
          Text(c.grand ? gL("Le grand coffre, aujourd’hui") : c.grandDans > 1 ? String(format: gL("Grand coffre dans %d jours"), c.grandDans) : gL("Grand coffre demain"))
            .font(.ag(11.5, .extra)).foregroundStyle(t.jaune.texte).lineLimit(1).padding(.top, 3)
        }
        Spacer(minLength: 0)
      }
      .padding(.vertical, 11)
      .padding(.horizontal, 12)
      .frame(maxWidth: .infinity, maxHeight: xl ? .infinity : nil)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.jaune.fond))
    }
  }

  private func recompense(_ d: DojoG) -> some View {
    ZStack(alignment: .topTrailing) {
      VStack(alignment: .leading, spacing: 0) {
        Text(gL("Prochaine récompense")).gTl(t.lilas.texte).padding(.trailing, 36)
        if let r = d.recompense {
          Text(r.piece).font(.ag(18, .noir)).lineLimit(2).minimumScaleFactor(0.75).padding(.top, 4)
          Text("\(gL("au rang")) \(r.rang)").font(.ag(11.5, .extra)).foregroundStyle(t.lilas.texte).padding(.top, 3)
        } else {
          Text(gL("Tous les rangs sont à toi")).font(.ag(18, .noir)).lineLimit(2).padding(.top, 4)
        }
        Spacer(minLength: 6)
        HStack(alignment: .top, spacing: 0) {
          ForEach(Array(d.rangs.enumerated()), id: \.offset) { i, r in
            VStack(spacing: 4) {
              Circle()
                .fill(i < d.rangIndex ? t.lilas.texte : i == d.rangIndex ? t.or : t.carte)
                .frame(width: 12, height: 12)
                .overlay(Circle().stroke(t.carte, lineWidth: i == d.rangIndex ? 3 : 0).padding(-3))
              Text(r).font(.ag(10, .extra)).foregroundStyle(i == d.rangIndex ? t.encre : t.lilas.texte).lineLimit(1).fixedSize()
            }
            if i < d.rangs.count - 1 { Spacer(minLength: 2) }
          }
        }
      }
      StickerG(nom: "couronne", taille: 30)
    }
    .padding(.vertical, 11)
    .padding(.horizontal, 12)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.lilas.fond))
  }

  private func serie(_ d: DojoG, court: Bool) -> String? {
    guard let n = d.serieJours, n > 0 else { return nil }
    if court { return n > 1 ? String(format: gL("%d jours"), n) : gL("1 jour") }
    return n > 1 ? String(format: gL("%d jours d’affilée"), n) : gL("1 jour, c’est parti")
  }

  private func puces(_ d: DojoG, xl: Bool) -> some View {
    HStack(spacing: xl ? 8 : 6) {
      if let n = d.semainesTenues, n > 0 {
        PuceG(texte: n > 1 ? String(format: gL("%d semaines tenues"), n) : gL("1 semaine tenue"), sticker: "objectif_semaine", fond: t.tuile, couleur: t.encre, stickerTaille: xl ? 20 : 18)
      }
      if xl, d.recordsMois > 0 {
        PuceG(texte: d.recordsMois > 1 ? String(format: gL("%d records ce mois"), d.recordsMois) : gL("1 record ce mois"), sticker: "medaille_or", fond: t.tuile, couleur: t.encre)
      }
      if let x = d.xpSemaine, x > 0 {
        PuceG(texte: xl ? "+ \(FmtG.entier(x)) XP \(gL("cette semaine"))" : "+ \(FmtG.entier(x)) XP", sticker: "etoile", fond: t.tuile, couleur: t.encre, stickerTaille: xl ? 20 : 18)
      }
      Spacer(minLength: 0)
    }
  }

  private func tresGrand(_ d: DojoG) -> some View {
    HStack(spacing: 0) {
      SceneDojoG(scene: entree.scene, personnage: perso(d), rang: d.rang).frame(width: 290)
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .center) {
          VStack(alignment: .leading, spacing: 2) {
            Text(gL("Mon dojo")).gSur(t.or)
            Text("\(gL("Rang")) \(d.rang)").font(.ag(24, .noir)).lineLimit(1).minimumScaleFactor(0.7)
          }
          Spacer(minLength: 4)
          if let s = serie(d, court: false) { PastilleG(texte: s, sticker: "flamme", fond: t.peche.fond, couleur: t.peche.texte) }
        }
        xp(d, xl: true)
        HStack(spacing: 10) {
          coffre(d, xl: true)
          recompense(d)
        }
        .frame(maxHeight: .infinity)
        puces(d, xl: true)
      }
      .padding(.vertical, 16)
      .padding(.horizontal, 18)
    }
  }

  private func grand(_ d: DojoG) -> some View {
    VStack(spacing: 0) {
      SceneDojoG(scene: entree.scene, personnage: perso(d), rang: d.rang, echelle: 1.28, decalage: 46)
        .frame(height: 150)
        .overlay(alignment: .topTrailing) {
          if let s = serie(d, court: true) {
            PastilleG(texte: s, sticker: "flamme", fond: t.peche.fond, couleur: t.peche.texte, stickerTaille: 18).padding(12)
          }
        }
      VStack(alignment: .leading, spacing: 10) {
        Text(gL("Mon dojo")).gSur(t.or)
        xp(d, xl: false)
        coffre(d, xl: false)
        Spacer(minLength: 0)
        puces(d, xl: false)
      }
      .padding(.top, 12)
      .padding(.horizontal, 14)
      .padding(.bottom, 14)
    }
  }
}
