import SwiftUI
import UIKit
import WidgetKit

/// Quel widget demande ses donnees : decide des images a lire (scene, personnage)
enum GenreW {
  case poids
  case semaine
  case eau
  case combat
  case chrono
  case tableau
  /// 28 octobre 2026 : seance du jour du Coach et ton personnage (direction B)
  case seanceJour
  case personnage
}

struct EntreeYoroi: TimelineEntry {
  let date: Date
  let etat: EtatYoroi
  /// style A, B ou C de ce widget
  let style: StyleW
  /// ta scene d'Accueil reduite par l'app (fond du style A, fenetre du style B), nil sinon
  let scene: UIImage?
  /// ton personnage, la meme image que l'Accueil (style C), nil sinon
  let personnage: UIImage?
}

/// Lit l'instantane de l'App Group. Une entree maintenant, une a minuit (l'eau et la semaine repartent,
/// le J moins X du combat avance), puis WidgetKit redemande. L'app force aussi un rafraichissement a chaque synchro
/// et quand tu changes le style des widgets.
struct FournisseurYoroi: AppIntentTimelineProvider {
  var genre: GenreW

  func placeholder(in context: Context) -> EntreeYoroi {
    EntreeYoroi(date: Date(), etat: .vide, style: StyleW.depuis(GroupeYoroi.lireStyle()), scene: nil, personnage: nil)
  }

  func snapshot(for configuration: ConfigStyleIntent, in context: Context) async -> EntreeYoroi {
    entree(Date(), configuration.style.style, context.family)
  }

  func timeline(for configuration: ConfigStyleIntent, in context: Context) async -> Timeline<EntreeYoroi> {
    let maintenant = Date()
    let minuit = Jours.minuitSuivant(maintenant).addingTimeInterval(5)
    let style = configuration.style.style
    let entrees = [entree(maintenant, style, context.family), entree(minuit, style, context.family)]
    return Timeline(entries: entrees, policy: .atEnd)
  }

  private func entree(_ d: Date, _ style: StyleW, _ famille: WidgetFamily) -> EntreeYoroi {
    let verrou = famille.estVerrou
    // A : ta scene sur tous les widgets ; B : dans la fenetre du Tableau du jour
    // Seance du jour et Ton personnage : ta scene dans tous les styles ; D : aussi en fond du Tableau du jour
    let sceneD = style == .d && genre == .tableau
    let veutScene = !verrou && (style == .a || (style == .b && genre == .tableau) || sceneD || genre == .seanceJour || genre == .personnage)
    // C : ton personnage dans le Tableau du jour et le Chrono ; D : sur le chemin du poids et le Tableau du jour
    let persoD = style == .d && (genre == .tableau || genre == .poids)
    let veutPerso = !verrou && ((style == .c && (genre == .tableau || genre == .chrono)) || persoD || genre == .seanceJour || genre == .personnage)
    let grand = famille == .systemLarge || famille == .systemExtraLarge
    return EntreeYoroi(
      date: d,
      etat: EtatYoroi.lire(d),
      style: style,
      scene: veutScene ? ImagesW.charger(GroupeYoroi.urlScene, maxPixels: grand ? 1000 : 820) : nil,
      personnage: veutPerso ? ImagesW.charger(GroupeYoroi.urlPersonnage, maxPixels: genre == .poids ? 160 : 600) : nil
    )
  }
}
