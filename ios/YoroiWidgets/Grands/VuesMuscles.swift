import SwiftUI
import WidgetKit

// 8. Muscles de la semaine : la carte des muscles face et dos, les series de travail par groupe (comptees
// exercice par exercice par l'app, le cardio ne compte pas), le repere des 10 series, et ce que ta seance du
// jour ajoute. Maquette : 8_muscles_tres_grand (le grand range la carte a gauche de la liste).

/// Silhouette face ou dos, avec les calques rouges des groupes travailles
struct CorpsMusclesG: View {
  let cote: String
  let groupes: [GroupeMuscleG]
  let largeur: CGFloat
  let hauteur: CGFloat

  @Environment(\.paletteG) var t

  /// 10 series et plus : plein ; 5 a 9 : a moitie ; 1 a 4 : leger
  private func opacite(_ s: Int) -> Double { s >= 10 ? 1 : s >= 5 ? 0.55 : s > 0 ? 0.3 : 0 }

  var body: some View {
    ZStack {
      if t.sombre && !t.attenue {
        RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.tuile)
      }
      Image("yg_m_\(cote)").resizable().gImageAttenuee().scaledToFit().opacity(t.sombre ? 0.86 : 1)
      ForEach(groupes, id: \.self) { g in
        ForEach(g.calques.filter { $0.hasPrefix(cote) }, id: \.self) { c in
          Image("yg_m_\(c)").resizable().gImageAttenuee().scaledToFit().opacity(opacite(g.series))
        }
      }
    }
    .frame(width: largeur, height: hauteur)
  }
}

struct VueMusclesG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      Group {
        if let m = entree.inst?.muscles {
          if xl { tresGrand(m) } else { grand(m) }
        } else {
          VideG(titre: gL("Muscles de la semaine"), texte: gL("Tes séries de la semaine s’afficheront ici."), sticker: "muscle", couleur: t.rouge)
        }
      }
      .padding(.vertical, xl ? 16 : 14)
      .padding(.horizontal, xl ? 18 : 14)
    }
  }

  let repere = 10

  private func titre(_ m: MusclesG) -> String {
    if m.total == 0 { return gL("Pas encore de séries cette semaine") }
    let s = m.total > 1 ? gL("séries") : gL("série")
    let se = m.seances > 1 ? gL("séances") : gL("séance")
    return "\(m.total) \(s) \(gL("en")) \(m.seances) \(se)"
  }

  private func lignes(_ m: MusclesG, nom: CGFloat) -> some View {
    let echelle = Double(max(18, m.groupes.map { $0.series }.max() ?? 0))
    return VStack(spacing: 6) {
      ForEach(m.groupes, id: \.self) { g in
        let ok = g.series >= repere
        HStack(spacing: 8) {
          Text(g.nom).font(.ag(13.5, .extra)).lineLimit(1).frame(width: nom, alignment: .leading)
          GeometryReader { geo in
            ZStack(alignment: .leading) {
              Capsule().fill(t.anneauFond)
              if g.series > 0 {
                Capsule().fill(ok ? t.rouge : t.rouge.opacity(0.5))
                  .frame(width: max(12, geo.size.width * min(1, Double(g.series) / echelle)))
                  .widgetAccentable()
              }
              RoundedRectangle(cornerRadius: 1).fill(t.encre.opacity(0.55))
                .frame(width: 2, height: 18)
                .offset(x: geo.size.width * Double(repere) / echelle - 1)
            }
          }
          .frame(height: 12)
          Text("\(g.series)").font(.ag(13.5, .noir)).foregroundStyle(g.series == 0 ? t.pale : t.encre).frame(width: 26, alignment: .trailing)
          Text(ok ? "✓" : "").font(.ag(13.5, .noir)).foregroundStyle(t.vert).frame(width: 14)
        }
        .padding(.vertical, 2)
      }
    }
  }

  @ViewBuilder
  private func duJour() -> some View {
    if entree.frais, let s = entree.inst?.seance, s.aujourdhui, let g = s.seriesParGroupe.first, g.series > 0 {
      HStack(spacing: 6) {
        StickerG(nom: "fessiers", taille: 22)
        Text("\(s.titre) \(gL("aujourd’hui")) :").font(.ag(12.5, .noir))
        Text("\(g.series) \(g.series > 1 ? gL("séries") : gL("série")) \(gL("pour tes")) \(g.nom.lowercased())").font(.ag(12.5, .gras)).lineLimit(1)
      }
      .foregroundStyle(t.peche.texte)
      .padding(.vertical, 7).padding(.horizontal, 10)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.peche.fond))
    }
  }

  private func puces(_ m: MusclesG, max: Int) -> some View {
    HStack(spacing: 7) {
      ForEach(Array(m.parSeance.suffix(max).enumerated()), id: \.offset) { _, s in
        PuceG(texte: "\(s.nom) \(FmtG.jourSemaine(s.date)), \(s.series)", sticker: "musculation", fond: t.tuile, couleur: t.encre, stickerTaille: 18)
      }
    }
  }

  private func tresGrand(_ m: MusclesG) -> some View {
    HStack(spacing: 16) {
      HStack(spacing: 6) {
        CorpsMusclesG(cote: "face", groupes: m.groupes, largeur: 120, hauteur: 302)
        CorpsMusclesG(cote: "dos", groupes: m.groupes, largeur: 120, hauteur: 302)
      }
      .frame(width: 250)
      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 1) {
            Text(gL("Muscles de la semaine")).gSur(t.rouge)
            Text(titre(m)).font(.ag(20, .noir)).lineLimit(1).minimumScaleFactor(0.7)
          }
          Spacer(minLength: 4)
          StickerG(nom: "muscle", taille: 34)
        }
        Text(gL("Séries par groupe. Le trait marque 10 séries : le repère pour faire du muscle."))
          .font(.ag(11.5, .extra)).foregroundStyle(t.doux).lineLimit(2).padding(.top, -4)
        lignes(m, nom: 82).padding(.top, 2)
        puces(m, max: 3).padding(.top, 4)
        Spacer(minLength: 0)
        duJour()
      }
    }
  }

  private func grand(_ m: MusclesG) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 1) {
          Text(gL("Muscles de la semaine")).gSur(t.rouge)
          Text(titre(m)).font(.ag(18, .noir)).lineLimit(1).minimumScaleFactor(0.7)
        }
        Spacer(minLength: 4)
        StickerG(nom: "muscle", taille: 30)
      }
      HStack(alignment: .top, spacing: 10) {
        HStack(spacing: 3) {
          CorpsMusclesG(cote: "face", groupes: m.groupes, largeur: 64, hauteur: 160)
          CorpsMusclesG(cote: "dos", groupes: m.groupes, largeur: 64, hauteur: 160)
        }
        lignes(m, nom: 68)
      }
      Text(gL("Le trait marque 10 séries : le repère pour faire du muscle."))
        .font(.ag(11, .extra)).foregroundStyle(t.doux).lineLimit(2)
      Spacer(minLength: 0)
      duJour()
    }
  }
}
