import SwiftUI
import WidgetKit

// 6. Mes records : tes 4 derniers records battus, avec la marque d'avant et le gain.
// Maquette : 6_records_tres_grand (le grand les range en 2 x 2).

struct VueRecordsG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      Group {
        if let r = entree.inst?.records, !r.isEmpty {
          contenu(Array(r.prefix(4)), xl: xl)
        } else {
          VideG(titre: gL("Mes records"), texte: gL("Ton prochain record s’affichera ici."), sticker: "records", couleur: t.or)
        }
      }
      .padding(.vertical, xl ? 16 : 14)
      .padding(.horizontal, xl ? 18 : 14)
    }
  }

  private var livres: Bool { entree.inst?.livres ?? false }

  private func couleur(_ i: Int) -> Color { [t.push, t.pull, t.jambes, t.bas][i % 4] }

  /// « 4'52 »
  private func allure(_ s: Double) -> String {
    let r = Int(s.rounded())
    return "\(r / 60)'\(String(format: "%02d", r % 60))"
  }

  /// valeur et unite affichees
  private func valeur(_ r: RecordG, _ v: Double) -> (String, String) {
    switch r.kind {
    case "force": return (FmtG.entier(FmtG.poids(v, livres)), FmtG.unite(livres))
    case "reps": return (FmtG.entier(v), gL("rép."))
    case "distance": return (FmtG.souple(v), "km")
    case "allure": return (allure(v), "/km")
    case "rounds": return (FmtG.entier(v), gL("rounds"))
    default:
      let m = Int(v.rounded())
      return m >= 60 ? (FmtG.heures(m), "") : ("\(m)", "min")
    }
  }

  private func detail(_ r: RecordG) -> String {
    switch r.kind {
    case "force": return gL("max estimé")
    case "reps": return gL("au poids du corps")
    case "distance": return gL("en une séance")
    case "allure": return gL("meilleure allure")
    case "rounds": return gL("en une séance")
    default: return gL("séance la plus longue")
    }
  }

  private func gain(_ r: RecordG) -> String? {
    guard let a = r.avant else { return nil }
    let d = r.valeur - a
    switch r.kind {
    case "force": return "+\(FmtG.souple(FmtG.poids(abs(d), livres))) \(FmtG.unite(livres))"
    case "reps": return "+\(FmtG.entier(abs(d))) \(gL("rép."))"
    case "distance": return "+\(FmtG.souple(abs(d))) km"
    case "allure": return "\(FmtG.moins)\(Int(abs(d).rounded())) s \(gL("au km"))"
    case "rounds": return "+\(FmtG.entier(abs(d))) \(gL("rounds"))"
    default: return "+\(Int(abs(d).rounded())) min"
    }
  }

  private func partAvant(_ r: RecordG) -> Double {
    guard let a = r.avant, a > 0, r.valeur > 0 else { return 0 }
    return r.kind == "allure" ? min(1, r.valeur / a) : min(1, a / r.valeur)
  }

  private func barre(_ l: String, _ part: Double, _ c: Color, _ v: String, _ fort: Bool) -> some View {
    HStack(spacing: 6) {
      Text(l).font(.ag(11, .extra)).foregroundStyle(fort ? c : t.doux).frame(width: 40, alignment: .leading)
      BarreG(part: part, couleur: fort ? c : t.pale, fond: t.anneauFond, hauteur: 8)
      Text(v).font(.ag(11.5, .noir)).foregroundStyle(fort ? t.encre : t.doux).lineLimit(1).fixedSize()
    }
  }

  private func carte(_ r: RecordG, _ i: Int, compacte: Bool) -> some View {
    let (v, u) = valeur(r, r.valeur)
    let c = couleur(i)
    return VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        StickerG(nom: r.sticker, taille: compacte ? 34 : 46, prefixe: "yg_t_")
        Spacer(minLength: 2)
        Text(FmtG.jourCourt(r.date)).font(.ag(11, .extra)).foregroundStyle(t.doux).lineLimit(1)
      }
      Text(r.titre).gTl(c).padding(.top, compacte ? 4 : 8)
      HStack(alignment: .firstTextBaseline, spacing: 3) {
        Text(v).font(.ag(compacte ? 26 : 34, .noir)).tracking(-0.5)
        if !u.isEmpty { Text(u).font(.ag(compacte ? 13 : 15, .noir)) }
      }
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .padding(.top, 2)
      if !compacte { Text(detail(r)).font(.ag(11.5, .extra)).foregroundStyle(t.doux).padding(.top, 3) }
      Spacer(minLength: 4)
      if let a = r.avant {
        VStack(spacing: 5) {
          barre(gL("avant"), partAvant(r), c, valeur(r, a).0 + (valeur(r, a).1.isEmpty || r.kind == "allure" ? "" : " \(valeur(r, a).1)"), false)
          barre(gL("record"), 1, c, v, true)
        }
        if let g = gain(r) {
          Text(g)
            .font(.ag(12.5, .noir))
            .foregroundStyle(t.menthe.texte)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 5)
            .background(Capsule().fill(t.menthe.fond))
            .padding(.top, 5)
        }
      } else {
        Text(detail(r)).font(.ag(11.5, .extra)).foregroundStyle(t.doux)
      }
    }
    .padding(.top, 11).padding(.horizontal, 12).padding(.bottom, 12)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.tuile))
  }

  private func moisDesRecords() -> String {
    guard let jour = entree.inst?.jour, let d = FmtG.date(jour) else { return "" }
    let f = DateFormatter()
    f.locale = FmtG.locale
    f.setLocalizedDateFormatFromTemplate("MMMM")
    return f.string(from: d)
  }

  private func contenu(_ r: [RecordG], xl: Bool) -> some View {
    let mois = r.filter { $0.date.prefix(7) == (entree.inst?.jour.prefix(7) ?? "") }.count
    return VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center) {
        HStack(spacing: 8) {
          StickerG(nom: "records", taille: xl ? 30 : 26)
          VStack(alignment: .leading, spacing: 0) {
            Text(gL("Mes records")).gSur(t.or)
            if xl {
              Text(r.count > 1 ? (mois == r.count ? "\(String(format: gL("Les %d derniers"), r.count)), \(gL("en")) \(moisDesRecords())" : String(format: gL("Les %d derniers"), r.count)) : gL("Ton dernier record"))
                .font(.ag(13, .gras)).foregroundStyle(t.doux)
            }
          }
        }
        Spacer(minLength: 4)
        if mois > 0 {
          PastilleG(texte: mois > 1 ? String(format: gL("%d records ce mois"), mois) : gL("1 record ce mois"), sticker: "medaille_or", fond: t.jaune.fond, couleur: t.jaune.texte, stickerTaille: 20)
        }
      }
      if xl {
        HStack(spacing: 10) {
          ForEach(Array(r.enumerated()), id: \.offset) { i, x in carte(x, i, compacte: false) }
          ForEach(0..<max(0, 4 - r.count), id: \.self) { _ in Color.clear.frame(maxWidth: .infinity) }
        }
        .padding(.top, 12)
      } else {
        VStack(spacing: 9) {
          HStack(spacing: 9) {
            ForEach(Array(r.prefix(2).enumerated()), id: \.offset) { i, x in carte(x, i, compacte: true) }
            if r.count == 1 { Color.clear.frame(maxWidth: .infinity) }
          }
          if r.count > 2 {
            HStack(spacing: 9) {
              ForEach(Array(r.dropFirst(2).enumerated()), id: \.offset) { i, x in carte(x, i + 2, compacte: true) }
              if r.count == 3 { Color.clear.frame(maxWidth: .infinity) }
            }
          }
        }
        .padding(.top, 10)
      }
    }
  }
}
