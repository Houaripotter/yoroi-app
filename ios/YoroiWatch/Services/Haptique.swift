import Foundation
import WatchKit

// Haptiques distincts pour le chrono, le minuteur et les validations. Reglage : haptique fort ou normal.
//
// Aucun son par AVAudioSession ni AVAudioPlayer sur la montre : une session audio de lecture
// envoie le son vers les AirPods relies a la montre, watchOS les fait basculer de l'iPhone vers
// la montre et la musique de l'iPhone se coupe. Le son vient seulement de WKInterfaceDevice.play :
// chaque haptique joue son petit son systeme par le haut parleur de la montre (rien en mode
// silence), sans session audio, donc sans toucher aux AirPods.

enum Haptique {
  static var fort: Bool { Partage.defaults.bool(forKey: Partage.Cle.hapticFort) }

  private static func jouer(_ type: WKHapticType) {
    WKInterfaceDevice.current().play(type)
  }

  /// Numero de serie des suites programmees : couper() l'augmente, les haptiques deja programmes ne jouent plus.
  private static var generation = 0

  /// Joue une suite d'haptiques espaces (watchOS ignore ceux qui se suivent de trop pres).
  private static func suite(_ types: [WKHapticType], ecart: Double = 0.22) {
    let g = generation
    for (i, t) in types.enumerated() {
      DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * ecart) {
        guard g == generation else { return }
        jouer(t)
      }
    }
  }

  /// Annule les haptiques encore programmes (fin de la sonnerie d'un minuteur).
  static func couper() { generation &+= 1 }

  /// Cran de la couronne a chaque kg entier.
  static func cran() { jouer(.click) }

  static func validation() {
    if fort { suite([.success, .success]) } else { jouer(.success) }
  }

  static func debutRound() {
    if fort { suite([.start, .directionUp, .start]) } else { suite([.start, .directionUp]) }
  }

  /// Claquettes, 10 s avant la fin du round.
  static func alerteFinRound() {
    suite(fort ? [.click, .click, .click, .click] : [.click, .click, .click], ecart: 0.18)
  }

  static func finRound() {
    if fort { suite([.stop, .directionDown, .stop]) } else { suite([.stop, .directionDown]) }
  }

  /// Dernieres secondes de la preparation ou du repos.
  static func decompte() { jouer(.click) }

  static func finChrono() {
    suite(fort ? [.success, .notification, .success] : [.success, .notification], ecart: 0.35)
  }

  /// Minuteur : un cran a 3, 2 et 1 seconde de la fin.
  static func decompteMinuteur() { jouer(.click) }

  /// Minuteur termine, app au premier plan : les vibrations les plus marquees de watchOS
  /// (notification, echec, nouvel essai) avec leur son systeme, rejouees toutes les 2 s pendant
  /// 2 min au plus. Toujours fort, quel que soit le reglage : c'est une alarme.
  /// WKInterfaceDevice.play ne joue que app active : ecran eteint, c'est la session d'alarme
  /// (notifyUser) qui vibre.
  static func alarmeMinuteur() {
    suite([.notification, .failure, .retry], ecart: 0.45)
  }

  static func pause() { jouer(.stop) }
  static func reprise() { jouer(.start) }
  static func erreur() { jouer(.failure) }
}
