import SwiftUI
import WidgetKit

// 1. Ma semaine : tes 7 jours avec le sticker du sport et le tampon valide, tes chiffres de la semaine,
// et la seance du jour de ton programme. Maquette : 1_semaine_tres_grand et 1_semaine_grand.

struct VueSemaineG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      Group {
        if let s = entree.inst?.semaine {
          if xl { tresGrand(s) } else { grand(s) }
        } else {
          VideG(titre: gL("Ma semaine"), texte: gL("Tes séances de la semaine s’afficheront ici."), sticker: "calendrier", couleur: t.detail)
        }
      }
      .padding(.vertical, xl ? 16 : 14)
      .padding(.horizontal, xl ? 18 : 14)
    }
  }

  private var livres: Bool { entree.inst?.livres ?? false }
  private var seance: SeanceG? {
    guard entree.frais, let s = entree.inst?.seance, s.aujourdhui else { return nil }
    return s
  }

  private func titre(_ s: SemaineG) -> String {
    let n = s.faites
    let mot = n > 1 ? gL("séances") : gL("séance")
    if let o = s.objectif { return "\(n) \(mot) \(gL("sur")) \(o)" }
    return "\(n) \(mot)"
  }

  /// « Encore 1 séance : Lower aujourd’hui »
  private func reste(_ s: SemaineG) -> String? {
    guard let o = s.objectif else { return nil }
    let r = o - s.faites
    if r <= 0 { return gL("Objectif tenu cette semaine") }
    let base = r > 1 ? String(format: gL("Encore %d séances"), r) : gL("Encore 1 séance")
    if let se = seance { return "\(base) : \(se.titre) \(gL("aujourd’hui"))" }
    return base
  }

  private func du(_ s: SemaineG) -> String {
    guard let lundi = FmtG.date(s.lundi), let dim = Calendar.current.date(byAdding: .day, value: 6, to: lundi) else { return "" }
    return "\(gL("Du")) \(FmtG.jourMois(s.lundi)) \(gL("au")) \(FmtG.jourMois(FmtG.iso(dim)))."
  }

  private func anneau(_ s: SemaineG, _ taille: CGFloat, _ ep: CGFloat, _ gros: CGFloat) -> some View {
    let part = s.objectif.map { $0 > 0 ? Double(s.faites) / Double($0) : 0 } ?? 0
    return AnneauG(part: part, taille: taille, epaisseur: ep, couleur: t.detail, fond: t.anneauFond) {
      HStack(alignment: .firstTextBaseline, spacing: 0) {
        Text("\(s.faites)").font(.ag(gros, .noir)).foregroundStyle(t.encre)
        if let o = s.objectif { Text("/\(o)").font(.ag(13, .noir)).foregroundStyle(t.doux) }
      }
    }
  }

  private func caseJour(_ j: JourSemG, l: CGFloat, h: CGFloat, rayon: CGFloat, sticker: CGFloat, tampon: CGFloat, avecRepos: Bool) -> some View {
    let fond: Color = j.fait ? t.jourFait : (j.prevu != nil || j.aujourdhui ? t.tuile : t.jourRepos)
    return ZStack {
      RoundedRectangle(cornerRadius: rayon, style: .continuous).fill(fond)
      if j.aujourdhui {
        RoundedRectangle(cornerRadius: rayon, style: .continuous).strokeBorder(t.detail, lineWidth: 2.5).widgetAccentable()
      }
      if let st = j.sticker {
        StickerG(nom: st, taille: sticker, opacite: j.fait ? 1 : 0.45)
      } else if avecRepos && j.futur && j.prevu == nil {
        Text(gL("repos")).font(.ag(11, .extra)).foregroundStyle(t.pale)
      }
    }
    .frame(width: l, height: h)
    .overlay(alignment: .topTrailing) {
      if j.fait {
        StickerG(nom: "objectif_semaine", taille: tampon)
          .rotationEffect(.degrees(-12))
          .offset(x: 7, y: -8)
      }
    }
  }

  private func jours(_ s: SemaineG, xl: Bool) -> some View {
    HStack(alignment: .top, spacing: 0) {
      ForEach(s.jours, id: \.self) { j in
        VStack(spacing: 4) {
          caseJour(j, l: xl ? 74 : 40, h: xl ? 64 : 40, rayon: xl ? 18 : 12, sticker: xl ? 40 : 24, tampon: xl ? 26 : 18, avecRepos: xl)
          let num = FmtG.date(j.date).map { String(Calendar.current.component(.day, from: $0)) } ?? ""
          Text(xl ? "\(FmtG.lettres[min(6, max(0, j.index))]) \(num)" : FmtG.lettres[min(6, max(0, j.index))])
            .font(.ag(12, .noir))
            .foregroundStyle(j.aujourdhui ? t.detail : t.doux)
          if xl {
            HStack(spacing: 0) {
              Text(j.nom ?? j.prevu ?? " ").foregroundStyle(j.aujourdhui ? t.detail : (j.fait ? t.encre : t.pale))
              if let m = j.minutes { Text(" \(m)′").foregroundStyle(t.pale) }
            }
            .font(.ag(11.5, .extra))
            .lineLimit(1)
            .frame(width: 84)
            .padding(.top, -2)
          }
        }
        if j.index < 6 { Spacer(minLength: 0) }
      }
    }
  }

  /// Petites barres en bas d'une tuile
  private func mini(_ valeurs: [(String, Double)], _ c: Color) -> some View {
    let m = max(1, valeurs.map { $0.1 }.max() ?? 1)
    return HStack(alignment: .bottom, spacing: 6) {
      ForEach(Array(valeurs.enumerated()), id: \.offset) { _, v in
        VStack(spacing: 2) {
          RoundedRectangle(cornerRadius: 4).fill(c).frame(width: 16, height: max(3, CGFloat(v.1 / m) * 22)).widgetAccentable()
          Text(v.0).font(.ag(9.5, .extra)).foregroundStyle(c).lineLimit(1).frame(maxWidth: 34)
        }
      }
    }
  }

  @ViewBuilder
  private func tuileJour(xl: Bool) -> some View {
    if let se = seance {
      Link(destination: LiensGrands.coach) {
        VStack(alignment: .leading, spacing: 0) {
          Text(gL("Séance du jour")).gTl(t.indigoDoux)
          Text(se.titre).font(.ag(xl ? 19 : 16, .noir)).foregroundStyle(t.surIndigo).lineLimit(1).minimumScaleFactor(0.7).padding(.top, 4)
          Text(sousSeance(se, xl: xl)).font(.ag(11.5, .extra)).foregroundStyle(t.indigoDoux).lineLimit(1).padding(.top, 3)
          Spacer(minLength: 4)
          BoutonG(texte: gL("Commencer"), fond: t.bouton, couleur: t.surBouton, vertical: 6)
        }
        .padding(.vertical, 11)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.indigo))
      }
    } else if let n = entree.inst?.semaine?.serieSemaines, n > 0 {
      TuileG(pastel: t.peche, libelle: gL("Série"), valeur: "\(n) \(gL("sem."))", sous: gL("d’affilée"), sticker: "flamme", stickerTaille: xl ? 30 : 24)
    } else {
      TuileG(pastel: t.lilas, libelle: gL("Séries"), valeur: "\(entree.inst?.semaine?.series ?? 0)", sous: gL("cette semaine"), sticker: "muscle", stickerTaille: xl ? 30 : 24)
    }
  }

  private func sousSeance(_ se: SeanceG, xl: Bool) -> String {
    var parts: [String] = []
    if !se.exos.isEmpty { parts.append("\(se.exos.count) \(gL("exos"))") }
    if se.minutes > 0 { parts.append("\(se.minutes) min") }
    var s = parts.joined(separator: ", ")
    if xl, se.cardio != nil { s += s.isEmpty ? gL("puis cardio") : ", \(gL("puis cardio"))" }
    return s
  }

  private func tresGrand(_ s: SemaineG) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 14) {
        anneau(s, 74, 9, 24)
        VStack(alignment: .leading, spacing: 2) {
          Text(gL("Ma semaine")).gSur(t.detail)
          Text(titre(s)).font(.ag(25, .noir)).lineLimit(1)
          Text([du(s), reste(s)].compactMap { $0 }.joined(separator: " ")).font(.ag(13, .gras)).foregroundStyle(t.doux).lineLimit(1)
        }
        Spacer(minLength: 0)
        if let n = s.serieSemaines, n > 0 {
          PastilleG(texte: n > 1 ? String(format: gL("%d semaines d’affilée"), n) : gL("1 semaine tenue"), sticker: "flamme", fond: t.peche.fond, couleur: t.peche.texte)
        }
      }
      jours(s, xl: true).padding(.top, 12)
      Spacer(minLength: 8)
      GeometryReader { g in
        let u = (g.size.width - 30) / 4.35
        HStack(spacing: 10) {
          TuileG(pastel: t.jaune, libelle: gL("Durée"), valeur: s.minutes > 0 ? FmtG.duree(s.minutes) : "0 min", sticker: "sablier", stickerTaille: 30) {
            mini(s.minutesParJour.map { (FmtG.lettres[min(6, max(0, $0.index))], Double($0.minutes)) }, t.jaune.texte)
          }
          .frame(width: u)
          TuileG(pastel: t.bleu, libelle: gL("Kilos soulevés"), valeur: FmtG.kilos(s.kilosKg, livres), sticker: "musculation", stickerTaille: 30) {
            mini(s.kilosParSeance.map { ($0.nom, $0.kg) }, t.bleu.texte)
          }
          .frame(width: u)
          if s.rounds > 0 {
            TuileG(pastel: t.menthe, libelle: gL("Rounds"), valeur: "\(s.rounds)", sous: s.combat.map { "\($0.nom) \(FmtG.jourSemaine($0.date)), \($0.minutes) min" }, sticker: "jjb", stickerTaille: 30)
              .frame(width: u)
          } else {
            TuileG(pastel: t.menthe, libelle: gL("Séries"), valeur: "\(s.series)", sous: gL("de musculation"), sticker: "muscle", stickerTaille: 30)
              .frame(width: u)
          }
          tuileJour(xl: true).frame(width: u * 1.35)
        }
      }
      .frame(height: 104)
    }
  }

  private func grand(_ s: SemaineG) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center, spacing: 12) {
        anneau(s, 62, 8, 20)
        VStack(alignment: .leading, spacing: 1) {
          Text(gL("Ma semaine")).gSur(t.detail)
          Text(titre(s)).font(.ag(20, .noir)).lineLimit(1).minimumScaleFactor(0.8)
          if let r = reste(s) { Text(r).font(.ag(13, .gras)).foregroundStyle(t.doux).lineLimit(1) }
        }
        Spacer(minLength: 0)
      }
      jours(s, xl: false).padding(.top, 12)
      Spacer(minLength: 10)
      VStack(spacing: 9) {
        HStack(spacing: 9) {
          TuileG(pastel: t.jaune, libelle: gL("Durée"), valeur: s.minutes > 0 ? FmtG.duree(s.minutes) : "0 min", sticker: "sablier", stickerTaille: 24, valeurTaille: 20)
          TuileG(pastel: t.bleu, libelle: gL("Kilos soulevés"), valeur: FmtG.kilos(s.kilosKg, livres), sticker: "musculation", stickerTaille: 24, valeurTaille: 20)
        }
        HStack(spacing: 9) {
          if seance != nil, let n = s.serieSemaines, n > 0 {
            TuileG(pastel: t.peche, libelle: gL("Série"), valeur: "\(n) \(gL("sem."))", sous: gL("d’affilée"), sticker: "flamme", stickerTaille: 24, valeurTaille: 20)
          } else if s.rounds > 0 {
            TuileG(pastel: t.menthe, libelle: gL("Rounds"), valeur: "\(s.rounds)", sticker: "jjb", stickerTaille: 24, valeurTaille: 20)
          } else {
            TuileG(pastel: t.menthe, libelle: gL("Séries"), valeur: "\(s.series)", sticker: "muscle", stickerTaille: 24, valeurTaille: 20)
          }
          tuileJour(xl: false)
        }
      }
      .frame(height: 196)
    }
  }
}
