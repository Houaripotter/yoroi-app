import AVFoundation
import Foundation
import WatchKit

// Haptiques distincts pour le chrono, le minuteur et les validations. Reglage : haptique fort ou normal.
//
// Son : les haptiques jouent leur petit son systeme par WKInterfaceDevice.play (rien en mode silence).
// Seule exception, la fin d'un minuteur : le son wizz.mp3 (celui d'avant la refonte d'octobre 2026)
// rejoue en boucle, volume au maximum, par AVAudioPlayer. Session audio en categorie ambiante,
// melangee aux autres sons et sans politique long format : elle sort par le haut parleur de la
// montre et ne reclame pas les AirPods (c'est la categorie lecture qui les faisait basculer).

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

  /// Suite d'haptiques a des instants choisis (en secondes depuis maintenant).
  private static func suiteAux(_ pas: [(WKHapticType, Double)]) {
    let g = generation
    for (t, instant) in pas {
      DispatchQueue.main.asyncAfter(deadline: .now() + instant) {
        guard g == generation else { return }
        jouer(t)
      }
    }
  }

  /// Annule les haptiques encore programmes et coupe le son wizz (fin de la sonnerie d'un minuteur).
  static func couper() {
    generation &+= 1
    arreterWizz()
  }

  // MARK: Son wizz de fin de minuteur

  private static var lecteurWizz: AVAudioPlayer?

  /// Lance le wizz en boucle, volume au maximum. Sans effet s'il tourne deja : un nouveau tour de
  /// sonnerie ne le recoupe jamais en plein milieu.
  static func demarrerWizz() {
    if let l = lecteurWizz, l.isPlaying { return }
    guard let url = Bundle.main.url(forResource: "wizz", withExtension: "mp3") else { return }
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
    try? session.setActive(true)
    guard let l = try? AVAudioPlayer(contentsOf: url) else { return }
    l.numberOfLoops = -1
    l.volume = 1.0
    l.prepareToPlay()
    l.play()
    lecteurWizz = l
  }

  static func arreterWizz() {
    guard let l = lecteurWizz else { return }
    l.stop()
    lecteurWizz = nil
    try? AVAudioSession.sharedInstance().setActive(false)
  }

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

  /// Minuteur termine, app au premier plan : une salve forte, toujours forte quel que soit le
  /// reglage (c'est une alarme). La notification d'abord, puis trois fleches montantes.
  /// 26 octobre 2026 : avant, notification, echec et nouvel essai partaient toutes les 0,35 s et la
  /// salve suivante repartait 1,2 s apres. Chaque WKInterfaceDevice.play coupe l'haptique et le son
  /// en cours : on entendait un debut de sonnerie coupe net. Ici chaque haptique a le temps de finir
  /// (0,55 s apres la notification, puis 0,35 s), la salve dure 1,6 s et la suivante part a 1,8 s.
  /// WKInterfaceDevice.play ne joue que app active : ecran eteint, c'est la session d'alarme
  /// (notifyUser) qui vibre.
  static func alarmeMinuteur() {
    suiteAux([(.notification, 0), (.directionUp, 0.55), (.directionUp, 0.9), (.directionUp, 1.25)])
  }

  static func pause() { jouer(.stop) }
  static func reprise() { jouer(.start) }
  static func erreur() { jouer(.failure) }
}
