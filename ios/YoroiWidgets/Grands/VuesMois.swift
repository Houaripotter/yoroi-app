import SwiftUI
import WidgetKit

// 7. Mon mois : le calendrier du mois avec le sticker du sport de chaque seance, tes chiffres et tes sports.
// Maquette : 7_mois_tres_grand (le grand garde le calendrier et les 3 chiffres).

struct VueMoisG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      Group {
        if let m = entree.inst?.mois {
          if xl { tresGrand(m) } else { grand(m) }
        } else {
          VideG(titre: gL("Mon mois"), texte: gL("Ton mois s’affichera ici."), sticker: "calendrier", couleur: t.detail)
        }
      }
      .padding(.vertical, xl ? 16 : 14)
      .padding(.horizontal, xl ? 18 : 14)
    }
  }

  private var livres: Bool { entree.inst?.livres ?? false }

  private func entete(_ m: MoisG, _ taille: CGFloat) -> some View {
    HStack(alignment: .firstTextBaseline) {
      Text(gL("Mon mois")).gSur(t.detail)
      Spacer(minLength: 4)
      Text(FmtG.moisAnnee(m.annee, m.mois)).font(.ag(taille, .noir))
    }
  }

  /// 6 rangees de 7 cases au plus (lignes faites a la main : rien de paresseux dans un widget)
  private func calendrier(_ m: MoisG, hauteur: CGFloat) -> some View {
    let cases: [Int] = Array(repeating: 0, count: max(0, min(6, m.premier))) + Array(1...max(1, m.jours))
    let rangees = stride(from: 0, to: cases.count, by: 7).map { Array(cases[$0..<min($0 + 7, cases.count)]) }
    return VStack(spacing: 4) {
      HStack(spacing: 4) {
        ForEach(0..<7, id: \.self) { i in
          Text(FmtG.lettres[i]).font(.ag(10.5, .noir)).foregroundStyle(t.pale).frame(maxWidth: .infinity)
        }
      }
      ForEach(Array(rangees.enumerated()), id: \.offset) { _, r in
        HStack(spacing: 4) {
          ForEach(0..<7, id: \.self) { k in
            if k < r.count, r[k] > 0 {
              caseJour(m, r[k], hauteur: hauteur).frame(maxWidth: .infinity)
            } else {
              Color.clear.frame(maxWidth: .infinity).frame(height: hauteur)
            }
          }
        }
      }
    }
  }

  private func caseJour(_ m: MoisG, _ d: Int, hauteur: CGFloat) -> some View {
    let st = m.calendrier[String(d)] ?? []
    let auj = d == m.aujourdhui
    let futur = d > m.aujourdhui
    return ZStack {
      RoundedRectangle(cornerRadius: 10, style: .continuous).fill(st.isEmpty ? Color.clear : t.jourFait)
      if auj {
        RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(t.detail, lineWidth: 2.5).widgetAccentable()
      }
      if st.count > 1 {
        HStack(spacing: -6) {
          ForEach(st, id: \.self) { s in StickerG(nom: s, taille: hauteur * 0.6) }
        }
        .padding(.leading, 4)
      } else if let s = st.first {
        StickerG(nom: s, taille: hauteur * 0.86)
      } else {
        Text("\(d)").font(.ag(12, .extra)).foregroundStyle(futur ? t.pale : t.doux).opacity(futur ? 0.6 : 1)
      }
    }
    .frame(height: hauteur)
    .overlay(alignment: .topLeading) {
      if !st.isEmpty {
        Text("\(d)").font(.ag(8.5, .noir)).foregroundStyle(t.doux).padding(.leading, 4).padding(.top, 2)
      }
    }
  }

  private func chiffres(_ m: MoisG) -> some View {
    HStack(spacing: 9) {
      TuileG(pastel: t.jaune, libelle: gL("Temps total"), valeur: m.minutes > 0 ? FmtG.duree(m.minutes) : "0 min", sticker: "sablier", stickerTaille: 24)
      TuileG(pastel: t.bleu, libelle: gL("Séances"), valeur: "\(m.seances)", sticker: "calendrier", stickerTaille: 24)
      TuileG(pastel: t.menthe, libelle: gL("Jours actifs"), valeur: "\(m.joursActifs)", sticker: "objectif_semaine", stickerTaille: 24)
    }
    .frame(height: 76)
  }

  private func sports(_ m: MoisG) -> some View {
    let maxi = max(1, m.sports.map { $0.seances }.max() ?? 1)
    let couleurs = [t.push, t.pull, t.jambes]
    return VStack(spacing: 9) {
      ForEach(Array(m.sports.enumerated()), id: \.offset) { i, s in
        HStack(spacing: 9) {
          StickerG(nom: s.sticker, taille: 26)
          VStack(spacing: 3) {
            HStack {
              Text(s.nom).font(.ag(13, .extra)).lineLimit(1)
              Spacer(minLength: 4)
              Text("\(s.seances)").font(.ag(14, .noir))
            }
            BarreG(part: Double(s.seances) / Double(maxi), couleur: couleurs[i % 3], fond: t.anneauFond, hauteur: 7)
          }
        }
      }
    }
  }

  private func comparaison(_ m: MoisG) -> String? {
    guard let e = m.ecartMoisPrecedent, e != 0 else { return nil }
    var c = DateComponents()
    c.year = m.annee
    c.month = m.mois - 1
    c.day = 1
    c.hour = 12
    let nom: String = Calendar.current.date(from: c).map { d in
      let f = DateFormatter()
      f.locale = FmtG.locale
      f.setLocalizedDateFormatFromTemplate("MMMM")
      return f.string(from: d)
    } ?? ""
    let n = abs(e)
    let mot = n > 1 ? gL("séances") : gL("séance")
    return e > 0 ? "\(n) \(mot) \(gL("de plus qu’en")) \(nom)" : "\(n) \(mot) \(gL("de moins qu’en")) \(nom)"
  }

  private func tresGrand(_ m: MoisG) -> some View {
    HStack(alignment: .top, spacing: 18) {
      VStack(alignment: .leading, spacing: 6) {
        entete(m, 17)
        calendrier(m, hauteur: 32)
        Spacer(minLength: 0)
      }
      .frame(width: 300)
      VStack(alignment: .leading, spacing: 12) {
        chiffres(m)
        if !m.sports.isEmpty { sports(m) }
        HStack(spacing: 8) {
          if m.distanceKm > 0 { PuceG(texte: "\(FmtG.souple(m.distanceKm)) km \(gL("parcourus"))", sticker: "course", fond: t.tuile, couleur: t.encre) }
          if m.kilosKg > 0 { PuceG(texte: "\(FmtG.kilos(m.kilosKg, livres)) \(gL("soulevés"))", sticker: "musculation", fond: t.tuile, couleur: t.encre) }
          if m.rounds > 0 { PuceG(texte: "\(m.rounds) \(gL("rounds"))", sticker: "jjb", fond: t.tuile, couleur: t.encre) }
        }
        if let c = comparaison(m) {
          PastilleG(texte: c, sticker: "etincelles", fond: t.menthe.fond, couleur: t.menthe.texte, stickerTaille: 20)
        }
        Spacer(minLength: 0)
      }
    }
  }

  private func grand(_ m: MoisG) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      entete(m, 16)
      calendrier(m, hauteur: 34)
      Spacer(minLength: 6)
      chiffres(m)
    }
  }
}
