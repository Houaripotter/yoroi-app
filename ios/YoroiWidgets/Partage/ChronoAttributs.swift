import Foundation
import ActivityKit

// Live Activity du chrono rounds (ecran verrouille et Dynamic Island).
// Partage entre l'app iPhone (demarrage, mise a jour, arret par le module natif YoroiWidgets)
// et l'extension de widgets (affichage).

@available(iOS 16.1, *)
struct ChronoAttributs: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// "prepa", "effort", "repos"
    var phase: String
    /// "Round 2 sur 5", "Repos", "Préparation"
    var libelle: String
    /// numero du round (0 si sans objet)
    var round: Int
    /// nombre de rounds (0 si sans objet)
    var rounds: Int
    /// debut et fin de la phase en cours (compte a rebours natif)
    var debut: Date
    var fin: Date
    /// en pause : le temps fige a afficher
    var enPause: Bool
    var figeS: Int
    /// le chrono monte au lieu de descendre
    var monte: Bool
  }

  /// "Rounds", "Tabata"...
  var titre: String
}
