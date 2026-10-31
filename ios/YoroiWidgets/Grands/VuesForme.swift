import AppIntents
import SwiftUI
import WidgetKit

// 3. Ma forme du jour : tes anneaux (pas, exercice, calories), ta recuperation, ton sommeil, ta FC au repos
// et ton eau, comme l'ecran Sante. Maquette : 3_forme_tres_grand (le grand reprend la colonne de gauche).

struct VueFormeG: View {
  let entree: EntreeGrands
  @Environment(\.widgetFamily) var famille
  @Environment(\.paletteG) var t

  var body: some View {
    let xl = famille == .systemExtraLarge
    CanevasG(largeur: xl ? 715 : 364) {
      Group {
        if entree.frais, let f = entree.inst?.forme {
          if xl { tresGrand(f) } else { grand(f) }
        } else {
          VideG(titre: gL("Ma forme du jour"), texte: gL("Ta forme du jour s’affichera ici, avec Santé."), sticker: "energie", couleur: t.detail)
        }
      }
      .padding(.vertical, xl ? 16 : 14)
      .padding(.horizontal, xl ? 18 : 14)
    }
  }

  // MARK: Eau (les verres ajoutes depuis un widget comptent tout de suite)

  private var eauLitres: Double {
    if let l = entree.eauLitres { return l }
    return entree.frais ? (entree.inst?.eau?.litres ?? 0) : 0
  }
  private var eauObjectif: Double? { entree.inst?.eau?.objectif }
  private var verres: Int { Int((eauLitres / 0.25).rounded()) }

  private func litres(_ l: Double) -> String { "\(FmtG.souple((l * 10).rounded() / 10)) L" }

  // MARK: Anneaux

  private struct LigneAnneau {
    let nom: String
    let valeur: String
    let objectif: String
    let part: Double
    let teinte: AnneauActiviteG
  }

  private func anneaux(_ f: FormeG) -> [LigneAnneau] {
    let part = { (v: Int?, o: Int) -> Double in o > 0 ? Double(v ?? 0) / Double(o) : 0 }
    return [
      LigneAnneau(nom: gL("Pas"), valeur: f.pas.map { FmtG.entier($0) } ?? gL("aucune mesure"), objectif: "\(gL("sur")) \(FmtG.entier(f.pasObjectif))", part: part(f.pas, f.pasObjectif), teinte: t.pas),
      LigneAnneau(nom: gL("Exercice"), valeur: f.exercice.map { "\($0) min" } ?? gL("aucune mesure"), objectif: "\(gL("sur")) \(f.exerciceObjectif)", part: part(f.exercice, f.exerciceObjectif), teinte: t.exercice),
      LigneAnneau(nom: gL("Calories"), valeur: f.kcal.map { "\(FmtG.entier($0)) kcal" } ?? gL("aucune mesure"), objectif: "\(gL("sur")) \(f.kcalObjectif)", part: part(f.kcal, f.kcalObjectif), teinte: t.calories),
    ]
  }

  private func legende(_ f: FormeG, gap: CGFloat) -> some View {
    VStack(alignment: .leading, spacing: gap) {
      ForEach(Array(anneaux(f).enumerated()), id: \.offset) { _, a in
        HStack(spacing: 8) {
          Circle().fill(a.teinte.debut).frame(width: 10, height: 10)
          VStack(alignment: .leading, spacing: 0) {
            Text(a.nom).font(.ag(11, .extra)).tracking(0.66).textCase(.uppercase).foregroundStyle(t.doux)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
              Text(a.valeur).font(.ag(14, .noir))
              Text(a.objectif).font(.ag(12, .gras)).foregroundStyle(t.pale)
            }
            .lineLimit(1)
          }
        }
      }
    }
  }

  private func cercles(_ f: FormeG, _ taille: CGFloat) -> some View {
    AnneauxActiviteG(taille: taille, valeurs: anneaux(f).map { (part: $0.part, teinte: $0.teinte) })
  }

  // MARK: Tuiles

  @ViewBuilder
  private func recup(_ f: FormeG, gros: Bool) -> some View {
    if let r = f.recup {
      HStack(spacing: 12) {
        AnneauG(part: Double(r.score) / 100, taille: gros ? 92 : 70, epaisseur: gros ? 10 : 8, couleur: t.vert, fond: t.carte) {
          VStack(spacing: 0) {
            Text("\(r.score)").font(.ag(gros ? 30 : 22, .noir))
            Text(gL("sur 100")).font(.ag(11, .extra)).foregroundStyle(t.doux)
          }
        }
        VStack(alignment: .leading, spacing: 1) {
          Text(gL("Récupération")).gTl(t.menthe.texte)
          Text(r.titre).font(.ag(gros ? 22 : 18, .noir)).lineLimit(1).minimumScaleFactor(0.7)
          if gros {
            Text(r.conseil).font(.ag(13, .gras)).foregroundStyle(t.menthe.texte).lineLimit(3)
          }
        }
        Spacer(minLength: 0)
      }
      .padding(.vertical, 10)
      .padding(.horizontal, 12)
      .frame(maxWidth: .infinity)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.menthe.fond))
    } else {
      HStack(spacing: 12) {
        StickerG(nom: "sommeil", taille: 34)
        VStack(alignment: .leading, spacing: 1) {
          Text(gL("Récupération")).gTl(t.menthe.texte)
          Text(gL("Pas encore assez de mesures")).font(.ag(15, .noir)).lineLimit(2)
        }
        Spacer(minLength: 0)
      }
      .padding(12)
      .frame(maxWidth: .infinity)
      .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.menthe.fond))
    }
  }

  private func sommeil(_ f: FormeG) -> some View {
    TuileG(
      pastel: t.lilas,
      libelle: gL("Sommeil"),
      valeur: f.sommeil.map { FmtG.heures($0.minutes) } ?? gL("aucune nuit"),
      sous: f.sommeilObjectifMin.map { "\(gL("objectif")) \(FmtG.heures($0))" },
      sticker: "sommeil"
    )
  }

  private func coeur(_ f: FormeG, court: Bool) -> some View {
    TuileG(
      pastel: t.peche,
      libelle: gL("FC repos"),
      valeur: f.fcRepos.map { court ? "\($0.bpm)" : "\($0.bpm) bpm" } ?? gL("aucune"),
      sous: court ? (f.fcRepos != nil ? "bpm" : nil) : f.fcRepos?.moyenne.map { "\(gL("ta moyenne")) : \($0)" },
      sticker: "coeur"
    )
  }

  private func eauGrande() -> some View {
    let objVerres = eauObjectif.map { Int(($0 / 0.25).rounded()) } ?? 8
    let cases = max(10, min(12, objVerres))
    return VStack(alignment: .leading, spacing: 0) {
      Text(gL("Eau")).gTl(t.bleu.texte)
      Text(litres(eauLitres)).font(.ag(22, .noir)).padding(.top, 4)
      Text(eauObjectif.map { "\(gL("sur")) \(litres($0)), \(verres) \(verres > 1 ? gL("verres") : gL("verre"))" } ?? "\(verres) \(verres > 1 ? gL("verres") : gL("verre"))")
        .font(.ag(11.5, .extra)).foregroundStyle(t.bleu.texte).lineLimit(2).padding(.top, 3)
      VStack(spacing: 5) {
        ForEach(0..<((cases + 4) / 5), id: \.self) { r in
          HStack(spacing: 5) {
            ForEach(0..<5, id: \.self) { k in
              let i = r * 5 + k
              UnevenRoundedRectangle(topLeadingRadius: 4, bottomLeadingRadius: 7, bottomTrailingRadius: 7, topTrailingRadius: 4)
                .fill(i < cases ? (i < verres ? t.detail : t.anneauFond) : Color.clear)
                .frame(height: 20)
            }
          }
        }
      }
      .padding(.top, 10)
      Spacer(minLength: 6)
      Button(intent: AjouterVerreIntent()) {
        Text(gL("+ 1 verre")).font(.ag(13, .noir)).foregroundStyle(t.bleu.texte)
          .frame(maxWidth: .infinity)
          .padding(7)
          .background(Capsule().fill(t.carte))
      }
      .buttonStyle(.plain)
    }
    .padding(.vertical, 11)
    .padding(.horizontal, 12)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(t.bleu.fond))
  }

  // MARK: Dispositions

  private func tresGrand(_ f: FormeG) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center) {
        HStack(spacing: 8) {
          StickerG(nom: "energie", taille: 30)
          VStack(alignment: .leading, spacing: 0) {
            Text(gL("Ma forme du jour")).gSur(t.detail)
            Text(dateHeure()).font(.ag(13, .gras)).foregroundStyle(t.doux)
          }
        }
        Spacer(minLength: 6)
        if let r = f.recup, r.score >= 60, let s = entree.inst?.seance, s.aujourdhui {
          PastilleG(texte: "\(gL("Prêt pour ta séance")) \(s.titre)", sticker: "objectif_semaine", fond: t.menthe.fond, couleur: t.menthe.texte, stickerTaille: 20)
        }
      }
      HStack(alignment: .top, spacing: 14) {
        HStack(spacing: 12) {
          cercles(f, 140)
          legende(f, gap: 9)
        }
        .frame(width: 290, alignment: .leading)
        .frame(maxHeight: .infinity)
        VStack(spacing: 10) {
          recup(f, gros: true)
          HStack(spacing: 10) {
            sommeil(f)
            coeur(f, court: false)
          }
        }
        eauGrande().frame(width: 150)
      }
      .padding(.top, 10)
      HStack(spacing: 8) {
        if let s = f.sommeil, let c = FmtG.heure(s.coucher), let l = FmtG.heure(s.lever) {
          PuceG(texte: "\(gL("Couché")) \(c), \(gL("levé")) \(l)", sticker: "sommeil", fond: t.tuile, couleur: t.encre)
        }
        if let h = f.hier {
          PuceG(texte: "\(gL("Hier")) : \(h.nom), \(h.minutes) min", sticker: "musculation", fond: t.tuile, couleur: t.encre)
        }
        if let n = f.seances7 {
          PuceG(texte: "\(n) \(n > 1 ? gL("séances") : gL("séance")) \(gL("en 7 jours"))", sticker: "activite", fond: t.tuile, couleur: t.encre)
        }
        Spacer(minLength: 0)
      }
      .padding(.top, 10)
    }
  }

  private func grand(_ f: FormeG) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 8) {
        StickerG(nom: "energie", taille: 26)
        Text(gL("Ma forme du jour")).gSur(t.detail)
      }
      HStack(spacing: 12) {
        cercles(f, 118)
        legende(f, gap: 7)
        Spacer(minLength: 0)
      }
      .padding(.top, 8)
      recup(f, gros: false).padding(.top, 10)
      Spacer(minLength: 8)
      HStack(spacing: 9) {
        sommeil(f)
        coeur(f, court: true)
        Link(destination: LiensGrands.eau) {
          TuileG(pastel: t.bleu, libelle: gL("Eau"), valeur: litres(eauLitres), sous: eauObjectif.map { "\(gL("sur")) \(litres($0))" }, sticker: "vague", valeurTaille: 18)
        }
      }
      .frame(height: 96)
    }
  }

  /// « Vendredi 30 octobre, 17 h »
  private func dateHeure() -> String {
    let iso = FmtG.iso(entree.date)
    let h = Calendar.current.component(.hour, from: entree.date)
    return "\(FmtG.capitale(FmtG.jourSemaine(iso))) \(FmtG.jourMoisLong(iso)), \(h) h"
  }
}
