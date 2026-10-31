import SwiftUI
import UIKit
import WidgetKit

// Grands widgets iPad et Mac (31 octobre 2026) : une entree par heure, et une a minuit pour changer de jour.
// L'app ecrit l'instantane puis demande a WidgetKit de tout redessiner (reloadAllTimelines) apres chaque changement.

struct EntreeGrands: TimelineEntry {
  let date: Date
  /// nil : l'app n'a encore rien ecrit
  let inst: InstantaneG?
  /// l'instantane date d'aujourd'hui (sinon : la forme, l'eau et la seance du jour ne s'affichent pas)
  let frais: Bool
  /// eau du jour vue par les autres widgets (verres ajoutes depuis un widget compris), en litres
  let eauLitres: Double?
  let scene: UIImage?
  let personnage: UIImage?

  static func exemple(_ date: Date = Date()) -> EntreeGrands {
    EntreeGrands(date: date, inst: ExempleGrands.instantane, frais: true, eauLitres: nil, scene: UIImage(named: "yg_exemple_scene"), personnage: UIImage(named: "yg_exemple_personnage"))
  }
}

struct FournisseurGrands: TimelineProvider {
  init() {
    PolicesG.enregistrer()
  }

  func placeholder(in context: Context) -> EntreeGrands {
    .exemple()
  }

  func getSnapshot(in context: Context, completion: @escaping (EntreeGrands) -> Void) {
    // dans la galerie : l'exemple tant que l'app n'a rien ecrit
    let e = lire(Date())
    completion(context.isPreview && e.inst == nil ? .exemple() : e)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<EntreeGrands>) -> Void) {
    let maintenant = Date()
    let e = lire(maintenant)
    let cal = Calendar.current
    let minuit = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: maintenant) ?? maintenant.addingTimeInterval(86_400))
    let dansUneHeure = maintenant.addingTimeInterval(3600)
    var entrees = [e]
    // a minuit : la meme photo, mais plus « fraiche » (forme et eau d'hier retirees)
    if minuit < dansUneHeure {
      entrees.append(EntreeGrands(date: minuit, inst: e.inst, frais: false, eauLitres: nil, scene: e.scene, personnage: e.personnage))
    }
    completion(Timeline(entries: entrees, policy: .after(min(dansUneHeure, minuit.addingTimeInterval(60)))))
  }

  private func lire(_ maintenant: Date) -> EntreeGrands {
    PolicesG.enregistrer()
    let inst = GroupeGrands.lire()
    let frais = inst?.jour == FmtG.iso(maintenant)
    // les verres ajoutes depuis un widget (file d'actions) sont deja comptes par EtatYoroi
    let etat = EtatYoroi.lire(maintenant)
    let eau: Double? = etat.present ? etat.eauMl / 1000 : nil
    return EntreeGrands(
      date: maintenant,
      inst: inst,
      frais: frais,
      eauLitres: eau,
      scene: GroupeGrands.image(GroupeGrands.fichierScene),
      personnage: GroupeGrands.image(GroupeGrands.fichierPersonnage)
    )
  }
}

/// Liens profonds vers l'app (lib/v2/widgets/liens.ts)
enum LiensGrands {
  static let semaine = URL(string: "yoroi://w/semaine")!
  static let poids = URL(string: "yoroi://w/poids")!
  static let pesee = URL(string: "yoroi://w/pesee")!
  static let accueil = URL(string: "yoroi://w/accueil")!
  static let eau = URL(string: "yoroi://w/eau")!
  static let dojo = URL(string: "yoroi://w/dojo")!
  static let coach = URL(string: "yoroi://w/coach")!
  static let seance = URL(string: "yoroi://w/seance")!
}

/// Racine commune : palette du mode (clair, sombre, atténué), fond, marges
struct RacineG<Contenu: View>: View {
  let entree: EntreeGrands
  let lien: URL
  @ViewBuilder let contenu: (InstantaneG?) -> Contenu

  @Environment(\.colorScheme) var schema
  @Environment(\.widgetRenderingMode) var mode

  var body: some View {
    let _ = PolicesG.enregistrer()
    let t = PaletteG.pour(schema, mode)
    contenu(entree.inst)
      .environment(\.paletteG, t)
      .foregroundStyle(t.encre)
      .widgetURL(lien)
      .containerBackground(for: .widget) { t.fond }
  }
}

extension WidgetConfiguration {
  /// Grand et tres grand seulement ; le tres grand n'existe pas sur iPhone, iOS ne le propose alors pas
  func grandsSeulement() -> some WidgetConfiguration {
    self.supportedFamilies([.systemLarge, .systemExtraLarge]).contentMarginsDisabled()
  }
}
