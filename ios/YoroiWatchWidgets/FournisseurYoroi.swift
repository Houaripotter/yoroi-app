import WidgetKit
import Foundation

// Lit le contexte affiche par l'app montre dans l'App Group group.com.houari.yoroi.watch
// (fichier contexte.json en premier, puis UserDefaults partages).

struct EntreeYoroi: TimelineEntry {
  let date: Date
  let contexte: Contexte?
  let dernierChrono: String?

  static let apercu = EntreeYoroi(date: Date(), contexte: nil, dernierChrono: nil)
}

struct FournisseurYoroi: TimelineProvider {
  func placeholder(in context: Context) -> EntreeYoroi { .apercu }

  func getSnapshot(in context: Context, completion: @escaping (EntreeYoroi) -> Void) {
    let maintenant = Date()
    let lue = entree(a: maintenant)
    // Dans la galerie, avant la premiere synchro avec l'iPhone, on montre la forme avec un exemple.
    if context.isPreview && lue.contexte == nil {
      completion(EntreeYoroi(date: maintenant, contexte: FournisseurYoroi.exemple(maintenant), dernierChrono: nil))
    } else {
      completion(lue)
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<EntreeYoroi>) -> Void) {
    let maintenant = Date()
    let cal = Calendar.current
    let minuit = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: maintenant) ?? maintenant)
    // Une entree maintenant, une a minuit (l'eau repart a zero, le compte a rebours du combat avance).
    let entrees = [entree(a: maintenant), entree(a: minuit.addingTimeInterval(1))]
    let prochaine = min(minuit.addingTimeInterval(60), maintenant.addingTimeInterval(3 * 3600))
    completion(Timeline(entries: entrees, policy: .after(prochaine)))
  }

  private func entree(a date: Date) -> EntreeYoroi {
    var c = Partage.lireContexteAffiche()
    // Contexte vide ecrit par la montre avant le premier envoi de l'iPhone : on affiche l'invitation,
    // pas des zeros qui ne viennent de nulle part.
    if let lu = c, lu.genere.isEmpty { c = nil }
    c?.ramenerAujourdhui(date)
    let nom = Partage.defaults.string(forKey: "yoroi.dernierChronoNom")
    return EntreeYoroi(date: date, contexte: c, dernierChrono: nom)
  }

  /// Apercu de la galerie seulement, jamais affiche comme une vraie donnee.
  static func exemple(_ maintenant: Date) -> Contexte {
    let cal = Calendar.current
    var c = Contexte()
    c.genere = DatesISO.ecrireInstant(maintenant)
    let jour = DatesISO.ecrireJour(maintenant)
    let valeurs: [Double] = [74.6, 74.4, 74.5, 74.1, 73.9, 74.0, 73.6, 73.4, 73.5, 73.1, 72.9, 72.8, 72.4]
    var serie: [PointPoids] = []
    var ligne: [PointPoids] = []
    for (i, kg) in valeurs.enumerated() {
      let d = cal.date(byAdding: .day, value: (i - valeurs.count + 1) * 2, to: maintenant) ?? maintenant
      let iso = DatesISO.ecrireJour(d)
      serie.append(PointPoids(d: iso, kg: kg))
      ligne.append(PointPoids(d: iso, kg: 74.8 - Double(i) * 0.2))
    }
    c.poids = PoidsCtx(
      dernier: DernierPoids(kg: 72.4, date: jour), rythmeAujourdhui: 72.4, ecart: 0, statut: "allure",
      phrase: nil, arrivee: nil, cap: nil, serie30: serie, ligne30: ligne
    )
    c.semaine = SemaineCtx(
      objectif: 4, faites: 2, jours: [true, false, true, false, false, false, false],
      lundi: DatesISO.ecrireJour(Contexte.lundiCourant(maintenant))
    )
    c.eau = EauCtx(ml: 1250, objectif: 2500, verre: 250)
    let dateCombat = DatesISO.ecrireJour(cal.date(byAdding: .day, value: 21, to: maintenant) ?? maintenant)
    let texteCombat = "{\"date\":\"\(dateCombat)\",\"categorieKg\":70,\"ecartKg\":2.4}"
    c.combat = try? JSONDecoder().decode(CombatCtx.self, from: Data(texteCombat.utf8))
    return c
  }
}
