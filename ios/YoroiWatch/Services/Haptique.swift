import AVFoundation
import Foundation
import WatchKit

// Haptiques distincts pour le chrono, le minuteur et les validations. Reglage : haptique fort ou normal.
//
// Son : les haptiques jouent leur petit son systeme par WKInterfaceDevice.play (rien en mode silence).
// Seule exception, la fin d'un minuteur, rejouee en boucle par AVAudioPlayer, volume au maximum :
// - reglage Son fort (actif par defaut) : alarme.wav, bips aigus synthetises pour YOROI (2,9 et
//   3,4 kHz, la ou le petit haut parleur de la montre porte le plus), environ 14 dB plus fort que
//   wizz.mp3 (niveau moyen -6 dB contre -20 dB). Categorie lecture, politique par defaut (audio
//   court, donc haut parleur de la montre : seule la politique long format exige un casque
//   Bluetooth), melangee aux autres sons. Le mode silence et l'ecran eteint ne la coupent pas,
//   mais watchOS peut faire basculer des AirPods proches : c'est dit sous le reglage ;
// - Son fort coupe : wizz.mp3 (celui d'avant la refonte d'octobre 2026) en categorie ambiante,
//   qui ne reclame jamais les AirPods mais se tait en mode silence et ecran eteint.
// 28 octobre 2026 (Houari : l'alarme actuelle est « moche », il veut le wizz) : avec Son fort, le son se
// choisit dans les Reglages, Wizz (par defaut) ou Alarme. wizz_fort.wav est le wizz de l'app (assets/sounds/
// wizz.mp3) refait pour le haut parleur de la montre : graves coupes sous 400 Hz (il ne les joue pas),
// presence montee vers 1,3 et 2,5 kHz, compresse et normalise. Niveau moyen -8 dBFS contre -21,5 pour
// wizz.mp3 (environ 13 dB de plus, 20 dB dans la bande que le haut parleur rend). alarme.wav (-6,4 dBFS,
// tout entre 2 et 4 kHz) reste le plus fort des deux.

enum Haptique {
  static var fort: Bool { Partage.defaults.bool(forKey: Partage.Cle.hapticFort) }
  /// Son fort de fin de minuteur, actif tant que l'utilisateur ne l'a pas coupe.
  static var sonFort: Bool { Partage.defaults.object(forKey: Partage.Cle.sonFort) as? Bool ?? true }

  /// 7 novembre 2026 : claquettes a 10 s de la fin, actives tant que l'utilisateur ne les a pas coupees.
  static var claquettesActives: Bool { Partage.defaults.object(forKey: Partage.Cle.claquettes) as? Bool ?? true }

  /// Son de fin choisi avec Son fort : "wizz" (par defaut) ou "alarme".
  static var sonFin: String { Partage.defaults.string(forKey: Partage.Cle.sonFin) == "alarme" ? "alarme" : "wizz" }

  /// Le fichier du son fort choisi, alarme.wav en secours.
  private static var fichierSonFort: URL? {
    if sonFin == "wizz", let u = Bundle.main.url(forResource: "wizz_fort", withExtension: "wav") { return u }
    return Bundle.main.url(forResource: "alarme", withExtension: "wav")
  }

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

  /// Annule les haptiques encore programmes et coupe le son (fin de la sonnerie d'un minuteur).
  static func couper() {
    generation &+= 1
    arreterSonnerie()
  }

  // MARK: Son de fin de minuteur

  private static var lecteurSonnerie: AVAudioPlayer?

  /// Lance le son de fin en boucle, volume au maximum. Sans effet s'il tourne deja : un nouveau
  /// tour de sonnerie ne le recoupe jamais en plein milieu.
  static func demarrerSonnerie() {
    if let l = lecteurSonnerie, l.isPlaying { return }
    let session = AVAudioSession.sharedInstance()
    var url: URL?
    if sonFort, let fichier = fichierSonFort,
       (try? session.setCategory(.playback, mode: .default, policy: .default, options: [.mixWithOthers])) != nil {
      url = fichier
    } else {
      // Son fort coupe, fichier absent ou categorie refusee : le wizz en ambiant, comme avant.
      try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
      url = Bundle.main.url(forResource: "wizz", withExtension: "mp3")
    }
    guard let url else { return }
    try? session.setActive(true)
    guard let l = try? AVAudioPlayer(contentsOf: url) else { return }
    l.numberOfLoops = -1
    l.volume = 1.0
    l.prepareToPlay()
    l.play()
    lecteurSonnerie = l
  }

  /// Fait entendre une fois le son choisi (Reglages), sans boucle.
  static func essayerSon() {
    couper()
    demarrerSonnerie()
    lecteurSonnerie?.numberOfLoops = 0
    let g = generation
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
      guard g == generation else { return }
      arreterSonnerie()
    }
  }

  static func arreterSonnerie() {
    guard let l = lecteurSonnerie else { return }
    l.stop()
    lecteurSonnerie = nil
    // Rend la main aux autres sons (musique de l'iPhone sur les AirPods, s'ils avaient bascule).
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }

  /// Cran de la couronne a chaque kg entier.
  static func cran() { jouer(.click) }

  static func validation() {
    if fort { suite([.success, .success]) } else { jouer(.success) }
  }

  static func debutRound() {
    if fort { suite([.start, .directionUp, .start]) } else { suite([.start, .directionUp]) }
  }

  // MARK: Claquettes des 10 s (7 novembre 2026)

  /// Lecteur a part : jamais celui de la sonnerie de fin, qui tourne en boucle.
  private static var lecteurClaquettes: AVAudioPlayer?
  private static var finClaquettes: DispatchWorkItem?

  /// Clac clac clac, 10 s avant la fin d'un round, d'un repos, d'une preparation ou d'un minuteur :
  /// trois tapotements .click a 0,18 s d'ecart et le son des claquettes (claquettes_10s.mp3 s'il a ete ajoute
  /// a la cible de la montre, sinon clap10.mp3 deja dans l'app).
  /// Son : categorie ambiante melangee aux autres sons (tes AirPods et ta musique restent sur l'iPhone, rien en
  /// mode silence), lecture seulement avec Son fort, comme la sonnerie. Le tapotement joue toujours.
  /// App suspendue (aucune seance ni minuteur qui la garde vivante) : rien ne joue, la fin sonne quand meme.
  static func claquettes10s() {
    suite([.click, .click, .click], ecart: 0.18)
    jouerSonClaquettes()
  }

  private static func jouerSonClaquettes() {
    guard let url = Bundle.main.url(forResource: "claquettes_10s", withExtension: "mp3")
      ?? Bundle.main.url(forResource: "clap10", withExtension: "mp3") else { return }
    // la sonnerie de fin tourne deja : elle garde sa categorie et sa session audio
    if lecteurSonnerie?.isPlaying != true {
      let session = AVAudioSession.sharedInstance()
      var lecture = false
      if sonFort {
        lecture = (try? session.setCategory(.playback, mode: .default, policy: .default, options: [.mixWithOthers])) != nil
      }
      if !lecture {
        try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
      }
      try? session.setActive(true)
    }
    guard let l = try? AVAudioPlayer(contentsOf: url) else { return }
    l.numberOfLoops = 0
    l.volume = 1.0
    l.prepareToPlay()
    l.play()
    lecteurClaquettes = l
    finClaquettes?.cancel()
    let fin = DispatchWorkItem {
      lecteurClaquettes?.stop()
      lecteurClaquettes = nil
      finClaquettes = nil
      // la sonnerie de fin a pu demarrer entre temps : on ne lui retire pas la session audio
      if lecteurSonnerie?.isPlaying != true {
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
      }
    }
    finClaquettes = fin
    DispatchQueue.main.asyncAfter(deadline: .now() + max(0.8, l.duration + 0.4), execute: fin)
  }

  /// Claquettes, 10 s avant la fin du round (vibrations seules, reglage Claquettes coupe).
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
  /// reglage (c'est une alarme).
  /// 27 octobre 2026 (Houari, sur sa montre : « vibration nulle, pas forte ») : les fleches
  /// montantes (.directionUp) sont des tapotements legers. La salve n'utilise plus que les trois
  /// vibrations les plus longues et les plus appuyees de watchOS : notification, echec, nouvel
  /// essai, chacune 0,6 s apres la precedente pour qu'aucune ne coupe la suivante. Salve de 1,8 s,
  /// la suivante part juste derriere (ecartSonnerie 1,8 s) : la montre vibre sans trou.
  /// Avant (26 octobre) : notification puis trois fleches montantes.
  /// 26 octobre 2026 : avant, notification, echec et nouvel essai partaient toutes les 0,35 s et la
  /// salve suivante repartait 1,2 s apres. Chaque WKInterfaceDevice.play coupe l'haptique et le son
  /// en cours : on entendait un debut de sonnerie coupe net. Ici chaque haptique a le temps de finir
  /// (0,55 s apres la notification, puis 0,35 s), la salve dure 1,6 s et la suivante part a 1,8 s.
  /// WKInterfaceDevice.play ne joue que app active : ecran eteint, c'est la session d'alarme
  /// (notifyUser) qui vibre.
  static func alarmeMinuteur() {
    suiteAux([(.notification, 0), (.failure, 0.6), (.retry, 1.2)])
  }

  static func pause() { jouer(.stop) }
  static func reprise() { jouer(.start) }
  static func erreur() { jouer(.failure) }
}
