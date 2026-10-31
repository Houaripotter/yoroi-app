import SwiftUI
import WidgetKit

// 2. Mon corps : ta derniere pesee, ta courbe des 3 derniers mois avec tes paliers, le chemin vers ton objectif.
// Maquette : 2_corps_tres_grand et 2_corps_grand.

/// Courbe du poids : tendance lissee, pesees en points, paliers en pointilles, mois en bas
struct CourbePoidsG: View {
  let corps: CorpsG
  let livres: Bool
  var etiquettes = true

  @Environment(\.paletteG) var t

  private struct Ligne {
    let kg: Double
    let couleur: Color
  }

  /// le dernier palier franchi, le prochain et l'objectif (comme la maquette)
  private var lignes: [Ligne] {
    guard let obj = corps.objectifKg else { return [] }
    var l: [Ligne] = []
    let avant = corps.paliers.dropLast()
    if let f = avant.last(where: { $0.franchi }) { l.append(Ligne(kg: f.kg, couleur: t.vert)) }
    if let p = avant.first(where: { !$0.franchi }) { l.append(Ligne(kg: p.kg, couleur: t.ambre)) }
    l.append(Ligne(kg: obj, couleur: t.accent))
    return l
  }

  var body: some View {
    GeometryReader { g in
      let w = g.size.width
      let h = g.size.height
      let marge: CGFloat = etiquettes ? 34 : 0
      let pts = corps.points
      let valeurs = pts.map { $0.kg } + pts.map { $0.t } + lignes.map { $0.kg }
      let mini = (valeurs.min() ?? 0) - 0.6
      let maxi = (valeurs.max() ?? 1) + 0.6
      let x: (Double) -> CGFloat = { d in 6 + CGFloat(d / 89) * (w - 12 - marge) }
      let y: (Double) -> CGFloat = { kg in 8 + CGFloat((maxi - kg) / max(0.1, maxi - mini)) * (h - 26) }
      ZStack(alignment: .topLeading) {
        ForEach(Array(lignes.enumerated()), id: \.offset) { _, l in
          Path { p in
            p.move(to: CGPoint(x: 6, y: y(l.kg)))
            p.addLine(to: CGPoint(x: w - (etiquettes ? 36 : 6), y: y(l.kg)))
          }
          .stroke(l.couleur.opacity(0.85), style: StrokeStyle(lineWidth: 1.4, dash: [4, 4]))
          if etiquettes {
            Text(FmtG.souple(FmtG.poids(l.kg, livres)))
              .font(.ag(11, .extra))
              .foregroundStyle(l.couleur)
              .frame(width: 34, alignment: .trailing)
              .position(x: w - 19, y: y(l.kg))
          }
        }
        if pts.count >= 2 {
          Path { p in
            p.move(to: CGPoint(x: x(Double(pts[0].d)), y: y(pts[0].t)))
            for q in pts.dropFirst() { p.addLine(to: CGPoint(x: x(Double(q.d)), y: y(q.t))) }
            p.addLine(to: CGPoint(x: x(Double(pts[pts.count - 1].d)), y: h - 18))
            p.addLine(to: CGPoint(x: x(Double(pts[0].d)), y: h - 18))
            p.closeSubpath()
          }
          .fill(LinearGradient(colors: [t.vert.opacity(0.28), t.vert.opacity(0)], startPoint: .top, endPoint: .bottom))
        }
        ForEach(Array(pts.enumerated()), id: \.offset) { _, q in
          Circle().fill(t.doux.opacity(0.55)).frame(width: 4.6, height: 4.6).position(x: x(Double(q.d)), y: y(q.kg))
        }
        if pts.count >= 2 {
          Path { p in
            p.move(to: CGPoint(x: x(Double(pts[0].d)), y: y(pts[0].t)))
            for q in pts.dropFirst() { p.addLine(to: CGPoint(x: x(Double(q.d)), y: y(q.t))) }
          }
          .stroke(t.vert, style: StrokeStyle(lineWidth: 3.2, lineCap: .round, lineJoin: .round))
          .widgetAccentable()
        }
        if let der = pts.last {
          Circle().fill(t.carte).frame(width: 12, height: 12)
            .overlay(Circle().stroke(t.vert, lineWidth: 3))
            .position(x: x(Double(der.d)), y: y(der.kg))
        }
        ForEach(debutsDeMois(), id: \.0) { d, nom in
          Text(nom).font(.ag(11, .gras)).foregroundStyle(t.doux).fixedSize()
            .position(x: x(Double(d)) + 16, y: h - 6)
        }
      }
    }
  }

  /// premier jour de chaque mois dans la fenetre des 90 jours
  private func debutsDeMois() -> [(Int, String)] {
    guard let debut = FmtG.date(corps.debutFenetre) else { return [] }
    let cal = Calendar.current
    var out: [(Int, String)] = []
    for d in 0..<90 {
      guard let jour = cal.date(byAdding: .day, value: d, to: debut) else { continue }
      if cal.component(.day, from: jour) == 1 || (d == 0 && cal.component(.day, from: jour) <= 3) {
        if d <= 80 { out.append((d, FmtG.moisCourt(jour))) }
      }
    }
    return out
  }
}

struct VueCorpsG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      Group {
        if let c = entree.inst?.corps {
          if xl { tresGrand(c) } else { grand(c) }
        } else {
          VideG(titre: gL("Mon corps"), texte: gL("Ta première pesée lancera ta courbe."), sticker: "balance", couleur: t.vert)
        }
      }
      .padding(.vertical, xl ? 16 : 14)
      .padding(.horizontal, xl ? 18 : 14)
    }
  }

  private var livres: Bool { entree.inst?.livres ?? false }
  private var u: String { FmtG.unite(livres) }
  private func kg(_ v: Double) -> String { FmtG.decimal(FmtG.poids(v, livres)) }

  private func gros(_ c: CorpsG, _ taille: CGFloat) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 4) {
      Text(kg(c.dernierKg)).font(.ag(taille, .noir)).tracking(-taille * 0.02)
      Text(u).font(.ag(20, .noir))
    }
    .lineLimit(1)
  }

  /// « −6,6 kg depuis mars »
  private func depuisDepart(_ c: CorpsG) -> String? {
    guard let d = c.departKg, let date = c.departDate.flatMap(FmtG.date), abs(c.dernierKg - d) >= 0.1 else { return nil }
    let v = FmtG.poids(c.dernierKg - d, livres)
    let mois = Calendar.current.isDate(date, equalTo: Date(), toGranularity: .year) ? FmtG.moisCourt(date) : FmtG.moisDe(FmtG.iso(date))
    return "\(FmtG.ecart(v)) \(u) \(gL("depuis")) \(mois)"
  }

  private func prochain(_ c: CorpsG) -> PalierG? {
    c.paliers.dropLast().first(where: { !$0.franchi }) ?? (c.paliers.last?.franchi == false ? c.paliers.last : nil)
  }

  private func chemin(_ c: CorpsG) -> some View {
    let part = c.part ?? 0
    return VStack(spacing: 6) {
      GeometryReader { g in
        ZStack(alignment: .leading) {
          BarreG(part: part, couleur: t.vert, fond: t.anneauFond, hauteur: 10)
          ForEach([0.25, 0.5, 0.75, 1.0], id: \.self) { p in
            Circle()
              .fill(p <= part + 0.0001 ? t.vert : t.trait)
              .frame(width: 12, height: 12)
              .overlay(Circle().stroke(t.carte, lineWidth: 2.5))
              .position(x: g.size.width * p, y: 5)
          }
        }
      }
      .frame(height: 10)
      .padding(.horizontal, 6)
      HStack {
        if let d = c.departKg { Text("\(FmtG.souple(FmtG.poids(d, livres))) \(gL("départ"))") }
        Spacer(minLength: 4)
        Text("\(Int((part * 100).rounded())) % \(gL("du chemin"))").foregroundStyle(t.vert)
        Spacer(minLength: 4)
        if let o = c.objectifKg { Text("\(FmtG.souple(FmtG.poids(o, livres))) \(gL("objectif"))") }
      }
      .font(.ag(11, .extra))
      .foregroundStyle(t.doux)
      .lineLimit(1)
    }
  }

  private func info(_ l: String, _ v: String, _ s: String, _ c: Color) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(l).font(.ag(11, .extra)).tracking(0.66).textCase(.uppercase).foregroundStyle(t.doux).lineLimit(1)
      Text(v).font(.ag(19, .noir)).foregroundStyle(c).lineLimit(1).minimumScaleFactor(0.7)
      Text(s).font(.ag(11.5, .gras)).foregroundStyle(t.doux).lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private func infos(_ c: CorpsG, xl: Bool) -> some View {
    HStack(alignment: .top, spacing: 10) {
      if let tv = c.tendance7 {
        info(gL("Tendance"), "\(FmtG.ecart(FmtG.poids(tv, livres))) \(u)", gL("en 7 jours"), t.vert)
      } else {
        info(gL("Pesées"), "\(c.pesees)", gL("en tout"), t.encre)
      }
      if let p = prochain(c) {
        let reste = abs(c.dernierKg - p.kg)
        info(gL("Prochain palier"), "\(FmtG.souple(FmtG.poids(p.kg, livres))) \(u)", "\(gL("encore")) \(kg(reste)) \(u)", t.ambre)
      }
      if xl, let a = c.arrivee {
        info(gL("Arrivée prévue"), FmtG.moisDe(a), gL("à ton rythme actuel"), t.encre)
      }
    }
  }

  private func carteCourbe(_ c: CorpsG, largeur: CGFloat?, hauteur: CGFloat, entete: Bool) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      if entete {
        HStack {
          Text(gL("3 derniers mois")).gTl(t.doux)
          Spacer(minLength: 4)
          if let e = c.ecart90, abs(e) >= 0.1, let debut = c.points.first, let d0 = FmtG.date(c.debutFenetre),
             let jour = Calendar.current.date(byAdding: .day, value: debut.d, to: d0) {
            Text("\(FmtG.ecart(FmtG.poids(e, livres))) \(u) \(gL("depuis")) \(FmtG.moisCourt(jour))").gTl(t.vert)
          }
        }
      }
      if c.points.count >= 2 {
        CourbePoidsG(corps: c, livres: livres).frame(height: hauteur)
      } else {
        Text(gL("Une pesée de plus et ta courbe apparaît."))
          .font(.ag(13, .gras)).foregroundStyle(t.doux)
          .frame(maxWidth: .infinity, minHeight: hauteur)
      }
    }
    .padding(.top, entete ? 10 : 8)
    .padding(.horizontal, entete ? 12 : 8)
    .padding(.bottom, entete ? 6 : 4)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.tuile))
  }

  private func tresGrand(_ c: CorpsG) -> some View {
    HStack(alignment: .top, spacing: 18) {
      VStack(alignment: .leading, spacing: 0) {
        HStack(spacing: 8) {
          StickerG(nom: "balance", taille: 30)
          Text(gL("Mon corps")).gSur(t.vert)
        }
        gros(c, 52).padding(.top, 8)
        Text("\(gL("Dernière pesée")) \(FmtG.jourSemaine(c.derniereDate)) \(FmtG.jourMoisLong(c.derniereDate))")
          .font(.ag(13, .gras)).foregroundStyle(t.doux).lineLimit(1).padding(.top, 2)
        HStack(spacing: 8) {
          if let d = depuisDepart(c) { PuceG(texte: d, fond: t.menthe.fond, couleur: t.menthe.texte) }
          PuceG(texte: c.pesees > 1 ? "\(c.pesees) \(gL("pesées"))" : gL("1 pesée"), fond: t.tuile, couleur: t.doux)
        }
        .padding(.top, 12)
        Spacer(minLength: 8)
        if c.objectifKg != nil, c.part != nil { chemin(c) }
        Link(destination: LiensGrands.pesee) {
          BoutonG(texte: gL("Me peser"), sticker: "balance", fond: t.menthe.fond, couleur: t.menthe.texte, taille: 14, vertical: 9)
        }
        .padding(.top, 12)
      }
      .frame(width: 250)
      VStack(spacing: 10) {
        carteCourbe(c, largeur: nil, hauteur: 168, entete: true)
        Spacer(minLength: 0)
        infos(c, xl: true)
      }
    }
  }

  private func grand(_ c: CorpsG) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 0) {
          Text(gL("Mon corps")).gSur(t.vert)
          gros(c, 40)
          Text(FmtG.capitale("\(FmtG.jourSemaine(c.derniereDate)) \(FmtG.jourMoisLong(c.derniereDate))"))
            .font(.ag(13, .gras)).foregroundStyle(t.doux).lineLimit(1).padding(.top, 2)
        }
        Spacer(minLength: 4)
        VStack(alignment: .trailing, spacing: 0) {
          StickerG(nom: "balance", taille: 34)
          if let tv = c.tendance7 {
            Text("\(FmtG.ecart(FmtG.poids(tv, livres))) \(u)").font(.ag(17, .noir)).foregroundStyle(t.vert)
            Text(gL("en 7 jours")).font(.ag(11.5, .gras)).foregroundStyle(t.doux)
          }
        }
      }
      carteCourbe(c, largeur: nil, hauteur: 140, entete: false).padding(.top, 8)
      if c.objectifKg != nil, c.part != nil { chemin(c).padding(.top, 10) }
      if let p = prochain(c) {
        Text("\(gL("Prochain palier")) : \(FmtG.souple(FmtG.poids(p.kg, livres))) \(u), \(gL("encore")) \(kg(abs(c.dernierKg - p.kg))) \(u)")
          .font(.ag(13, .extra)).foregroundStyle(t.ambre).lineLimit(1).padding(.top, 8)
      }
      Spacer(minLength: 6)
      HStack(spacing: 8) {
        if let d = depuisDepart(c) { PuceG(texte: d, fond: t.menthe.fond, couleur: t.menthe.texte) }
        if let a = c.arrivee { PuceG(texte: "\(gL("Arrivée prévue")) : \(FmtG.moisDe(a))", fond: t.tuile, couleur: t.doux) }
      }
    }
  }
}
