import Foundation
import Observation
import SwiftUI
import WidgetKit

// Navigation de l'app : pile d'ecrans, page verticale, seance en direct.
// Les App Intents, les notifications et les complications passent par ici.

enum Ecran: Hashable {
  case peser
  case chronos
  case chronoPrepa(ChronoPreset)
  case seanceLibre
  case noter
  case minuteurs
  case minuteur(String)
  case minuteurLibre
  case coeur
  case oxygene
}

enum ModeLive: Equatable {
  case chrono(ChronoPreset)
  case libre(SportCtx?)
}

enum Page: Int, Hashable {
  case aujourdhui = 0
  case entrainement
  case semaine
  case eau
  case cardio
  case combat
  case reglages
}

@Observable
final class Routeur {
  static let shared = Routeur()

  var chemin: [Ecran] = []
  var page: Page = .aujourdhui
  /// Seance en direct affichee en plein ecran (chrono ou seance libre).
  var live: ModeLive?

  /// Change a chaque ouverture par un lien : RacineVue reconstruit la pile et les pages
  /// directement sur l'ecran vise (pas de defilement depuis l'Accueil, pas d'ecran pousse anime).
  private(set) var generation = 0

  private let cleDernierChrono = "yoroi.dernierChrono"

  func ouvrir(_ e: Ecran) {
    guard live == nil else { return }
    chemin = [e]
  }

  func allerA(_ p: Page) {
    guard live == nil else { return }
    chemin = []
    page = p
  }

  /// Ouvre l'ecran de depart du dernier chrono utilise (ou du premier).
  func ouvrirChrono() {
    guard live == nil else { return }
    chemin = pileChrono()
  }

  /// Ecran Minuteurs, ou directement le minuteur en cours s'il y en a un.
  func ouvrirMinuteurs() {
    guard live == nil else { return }
    chemin = pileMinuteurs()
  }

  /// Lance un minuteur et affiche son ecran.
  func lancerMinuteur(secondes: Int) {
    let id = MinuteurMoteur.shared.lancer(secondes: secondes)
    guard live == nil else { return }
    chemin = [.minuteurs, .minuteur(id)]
  }

  func lancerChrono(_ p: ChronoPreset) {
    UserDefaults.standard.set(p.id, forKey: cleDernierChrono)
    if Partage.defaults.string(forKey: "yoroi.dernierChronoNom") != p.nom {
      Partage.defaults.set(p.nom, forKey: "yoroi.dernierChronoNom")
      // La complication Chrono affiche le nom du dernier chrono : on la recharge.
      WidgetCenter.shared.reloadTimelines(ofKind: GenreWidget.chrono)
    }
    live = .chrono(p)
  }

  func lancerSeanceLibre(_ sport: SportCtx?) {
    live = .libre(sport)
  }

  func fermerLive() {
    live = nil
    chemin = []
  }

  /// Retire de la pile les ecrans de minuteurs qui n'existent plus (fini ou annule).
  /// Un seul endroit fait ce retour en arriere : pas de double fermeture pendant la sonnerie.
  func retirerMinuteurs(sauf ids: [String]) {
    let apres = chemin.filter { e in
      if case .minuteur(let id) = e { return ids.contains(id) }
      return true
    }
    if apres != chemin { chemin = apres }
  }

  // MARK: Liens des complications

  /// Liens des complications : yoroimontre://minuteurs, minuteur, coeur, oxygene, cardio, repos,
  /// respiration, chrono, peser, aujourdhui, eau, semaine, combat.
  func ouvrir(url: URL) { recevoir(url: url) }

  func recevoir(url: URL) {
    guard url.scheme?.lowercased() == "yoroimontre" else { return }
    let cle = url.host ?? url.pathComponents.first(where: { $0 != "/" }) ?? ""
    recevoir(lien: cle.lowercased())
  }

  /// Applique le lien tout de suite, dans une transaction sans animation : la page verticale
  /// et la pile d'ecrans sont posees ensemble, et la nouvelle generation fait repartir
  /// la NavigationStack et la TabView directement sur la cible (premier rendu deja au bon endroit).
  func recevoir(lien: String) {
    // Une seance en direct reste au premier plan : on ne la quitte pas pour une complication.
    guard live == nil else { return }
    let (cible, pile) = destination(lien)
    if page == cible && chemin == pile { return }
    var t = Transaction()
    t.disablesAnimations = true
    withTransaction(t) {
      page = cible
      chemin = pile
      generation &+= 1
    }
  }

  private func destination(_ lien: String) -> (Page, [Ecran]) {
    switch lien {
    case "minuteurs", "minuteur": return (.entrainement, pileMinuteurs())
    case "chrono": return (.entrainement, pileChrono())
    case "coeur": return (.cardio, [.coeur])
    case "repos", "respiration": return (.cardio, [.coeur])
    case "oxygene": return (.cardio, [.oxygene])
    case "cardio": return (.cardio, [])
    case "peser": return (.aujourdhui, [.peser])
    case "eau": return (.eau, [])
    case "semaine": return (.semaine, [])
    case "combat": return (Synchro.shared.contexte.combat != nil ? .combat : .aujourdhui, [])
    default: return (.aujourdhui, [])
    }
  }

  private func pileChrono() -> [Ecran] {
    let liste = Synchro.shared.chronos
    let id = UserDefaults.standard.string(forKey: cleDernierChrono)
    if let p = liste.first(where: { $0.id == id }) ?? liste.first {
      return [.chronos, .chronoPrepa(p)]
    }
    return [.chronos]
  }

  private func pileMinuteurs() -> [Ecran] {
    if let a = MinuteurMoteur.shared.principal { return [.minuteurs, .minuteur(a.id)] }
    return [.minuteurs]
  }
}
