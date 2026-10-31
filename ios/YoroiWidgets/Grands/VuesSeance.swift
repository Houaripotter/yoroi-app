import SwiftUI
import UIKit
import WidgetKit

// 5. Ma prochaine seance : la seance du jour de ton programme, ses exercices, series et charges, et le cardio
// vraiment choisi pour ce jour. Maquette : 5_seance_tres_grand et 5_seance_grand.

struct VueSeanceG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      if let s = entree.inst?.seance {
        if xl { tresGrand(s) } else { grand(s) }
      } else {
        VideG(titre: gL("Ma prochaine séance"), texte: gL("Choisis un programme : ta prochaine séance s’affichera ici."), sticker: "coach", couleur: t.detail)
          .padding(.vertical, 16)
          .padding(.horizontal, 18)
      }
    }
  }

  private var livres: Bool { entree.inst?.livres ?? false }
  private var aujourdhui: Bool { entree.frais && (entree.inst?.seance?.aujourdhui ?? false) }

  private func quand(_ s: SeanceG, long: Bool) -> String {
    guard aujourdhui else { return gL("Prochaine séance") }
    return long ? "\(gL("Aujourd’hui")), \(FmtG.jourSemaine(FmtG.iso(entree.date)))" : gL("Aujourd’hui")
  }

  private func series(_ e: ExoG) -> String {
    let fourchette = e.repsMin == e.repsMax ? "\(e.repsMin)" : "\(e.repsMin) \(gL("à")) \(e.repsMax)"
    return "\(e.series) × \(fourchette)\(e.secondes ? " s" : "")"
  }

  private func charge(_ e: ExoG) -> String? {
    guard let kg = e.chargeKg, kg > 0 else { return nil }
    return "\(FmtG.souple((FmtG.poids(kg, livres) * 4).rounded() / 4)) \(FmtG.unite(livres))"
  }

  private func ligne(_ e: ExoG, _ i: Int, xl: Bool, dernier: Bool) -> some View {
    HStack(spacing: xl ? 9 : 7) {
      Text("\(i + 1)")
        .font(.ag(11, .noir))
        .foregroundStyle(t.bleu.texte)
        .frame(width: 21, height: 21)
        .background(Circle().fill(t.bleu.fond))
      Text(e.nom).font(.ag(xl ? 13.5 : 12.5, .extra)).lineLimit(1).truncationMode(.tail)
      Spacer(minLength: 4)
      Text(series(e)).font(.ag(xl ? 12 : 11, .gras)).foregroundStyle(t.doux).lineLimit(1).fixedSize()
      Text(charge(e).map { e.monte ? "\($0) ↑" : $0 } ?? "")
        .font(.ag(xl ? 13.5 : 12.5, .noir))
        .foregroundStyle(e.monte ? t.vert : t.encre)
        .lineLimit(1)
        .frame(width: xl ? 64 : 58, alignment: .trailing)
    }
    .padding(.vertical, 6.5)
    .overlay(alignment: .bottom) {
      if !dernier { Rectangle().fill(t.trait).frame(height: 1) }
    }
  }

  private func commencer(grand: Bool) -> some View {
    Link(destination: LiensGrands.coach) {
      BoutonG(texte: gL("Commencer"), sticker: "play", fond: t.bouton, couleur: t.surBouton, taille: 16, vertical: 11)
    }
  }

  private func perso(hauteur: CGFloat) -> some View {
    Group {
      if let p = entree.personnage {
        Image(uiImage: p).resizable().gImageAttenuee().scaledToFit()
          .frame(height: hauteur)
          .opacity(0.95)
          .shadow(color: .black.opacity(0.3), radius: 5, x: 0, y: 6)
      }
    }
  }

  private func resume(_ s: SeanceG) -> String {
    var parts: [String] = []
    if !s.exos.isEmpty { parts.append("\(s.exos.count) \(gL("exos"))") }
    if s.minutes > 0 { parts.append("\(s.minutes) min") }
    var r = parts.joined(separator: ", ")
    if let c = s.cardio { r += r.isEmpty ? c.texte : ", \(gL("puis")) \(c.minutes) min \(gL("de cardio"))" }
    return r
  }

  @ViewBuilder
  private func liste(_ s: SeanceG, xl: Bool, max: Int) -> some View {
    if s.exos.isEmpty {
      VStack(alignment: .leading, spacing: 6) {
        Text(s.genre == "cardio" ? gL("Séance de cardio") : gL("Séance en rounds")).font(.ag(16, .noir))
        Text(s.minutes > 0 ? "\(s.minutes) min" : "").font(.ag(13, .gras)).foregroundStyle(t.doux)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.top, 8)
    } else {
      let montres = Array(s.exos.prefix(max))
      ForEach(Array(montres.enumerated()), id: \.offset) { i, e in
        ligne(e, i, xl: xl, dernier: i == montres.count - 1)
      }
      if s.exos.count > max {
        let reste = s.exos.dropFirst(max).map { $0.nom }
        Text("\(gL("et")) \(reste.joined(separator: ", "))")
          .font(.ag(13, .gras)).foregroundStyle(t.doux).lineLimit(1)
          .padding(.leading, 30).padding(.top, 4)
      }
    }
  }

  private func tresGrand(_ s: SeanceG) -> some View {
    HStack(spacing: 0) {
      ZStack(alignment: .topTrailing) {
        perso(hauteur: 150).offset(x: 26, y: 86)
        VStack(alignment: .leading, spacing: 0) {
          Text(quand(s, long: true)).gSur(t.indigoDoux)
          Text(s.titre).font(.ag(27, .noir)).foregroundStyle(t.surIndigo).lineLimit(2).minimumScaleFactor(0.7).padding(.top, 2)
          Text(s.programme).font(.ag(13, .gras)).foregroundStyle(t.indigoDoux).lineLimit(1).padding(.top, 2)
          if !s.muscles.isEmpty {
            // les muscles, en pastilles sur deux lignes au plus
            let l1 = Array(s.muscles.prefix(2))
            let l2 = Array(s.muscles.dropFirst(2).prefix(2))
            let l3 = Array(s.muscles.dropFirst(4).prefix(1))
            VStack(alignment: .leading, spacing: 6) {
              ForEach([l1, l2, l3].filter { !$0.isEmpty }, id: \.self) { rang in
                HStack(spacing: 6) {
                  ForEach(rang, id: \.self) { m in
                    Text(m).font(.ag(11.5, .extra)).foregroundStyle(t.surIndigo)
                      .padding(.vertical, 4).padding(.horizontal, 9)
                      .background(Capsule().fill(Color.white.opacity(0.16)))
                  }
                }
              }
            }
            .padding(.top, 10)
          }
          if let d = s.derniere {
            VStack(alignment: .leading, spacing: 1) {
              Text("\(gL("La dernière fois")), \(FmtG.jourCourt(d.date))").font(.ag(12, .gras)).foregroundStyle(t.indigoDoux)
              Text(d.kilosKg > 0 ? "\(d.minutes) min, \(FmtG.kilos(d.kilosKg, livres)) \(gL("soulevés"))" : "\(d.minutes) min")
                .font(.ag(13, .noir)).foregroundStyle(t.surIndigo)
            }
            .frame(width: 190, alignment: .leading)
            .padding(.top, 10)
          }
          Spacer(minLength: 6)
          HStack(spacing: 8) {
            if s.minutes > 0 {
              HStack(spacing: 5) {
                StickerG(nom: "chrono", taille: 24)
                Text("\(s.minutes) min").font(.ag(15, .noir))
              }
              .padding(.vertical, 4).padding(.leading, 5).padding(.trailing, 10)
              .background(Capsule().fill(Color.white.opacity(0.14)))
            }
            if let c = s.cardio {
              HStack(spacing: 5) {
                StickerG(nom: c.sticker, taille: 24)
                Text("+ \(c.minutes) min").font(.ag(15, .noir))
              }
              .padding(.vertical, 4).padding(.leading, 5).padding(.trailing, 10)
              .background(Capsule().fill(Color.white.opacity(0.14)))
            }
          }
          .foregroundStyle(t.surIndigo)
          commencer(grand: true).padding(.top, 10)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
      .padding(.vertical, 16)
      .padding(.horizontal, 18)
      .frame(width: 300)
      .frame(maxHeight: .infinity)
      .background(t.indigo)
      .clipped()
      VStack(alignment: .leading, spacing: 2) {
        HStack {
          Text(s.exos.isEmpty ? gL("Au programme") : "\(s.exos.count) \(s.exos.count > 1 ? gL("exercices") : gL("exercice"))").gTl(t.doux)
          Spacer(minLength: 4)
          if s.exos.contains(where: { $0.monte }) { Text("↑ \(gL("charge montée de 5 %"))").gTl(t.vert) }
        }
        .padding(.bottom, 4)
        liste(s, xl: true, max: 6)
        Spacer(minLength: 4)
        if let c = s.cardio {
          HStack(spacing: 6) {
            StickerG(nom: c.sticker, taille: 24)
            Text("\(gL("Puis cardio")) :").font(.ag(12.5, .noir))
            Text("\(c.texte), \(gL("zone 2"))").font(.ag(12.5, .gras)).lineLimit(1)
          }
          .foregroundStyle(t.menthe.texte)
          .padding(.vertical, 7).padding(.horizontal, 10)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(t.menthe.fond))
        }
      }
      .padding(.vertical, 14)
      .padding(.horizontal, 16)
    }
  }

  private func grand(_ s: SeanceG) -> some View {
    VStack(spacing: 0) {
      ZStack(alignment: .topTrailing) {
        perso(hauteur: 120).offset(x: 10, y: 6)
        VStack(alignment: .leading, spacing: 1) {
          Text(quand(s, long: false)).gSur(t.indigoDoux)
          Text(s.titre).font(.ag(22, .noir)).foregroundStyle(t.surIndigo).lineLimit(1).minimumScaleFactor(0.7)
          Text(resume(s)).font(.ag(13, .gras)).foregroundStyle(t.indigoDoux).lineLimit(1)
        }
        .padding(.trailing, 60)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.top, 14).padding(.horizontal, 16).padding(.bottom, 12)
      .background(t.indigo)
      .clipped()
      VStack(alignment: .leading, spacing: 0) {
        liste(s, xl: false, max: 5)
        Spacer(minLength: 6)
        commencer(grand: true)
      }
      .padding(.top, 6).padding(.horizontal, 14).padding(.bottom, 12)
    }
  }
}
