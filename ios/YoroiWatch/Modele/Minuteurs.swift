import Foundation

// Minuteurs de repos d'entrainement. Partage entre l'app montre et l'extension de widgets.
// Rien n'est envoye a l'iPhone ni ecrit dans Apple Sante : tout reste dans l'App Group de la montre.

struct MinuteurActif: Codable, Equatable, Identifiable {
  var id: String
  /// Duree choisie au depart, en secondes (pour l'affichage et pour relancer).
  var dureeS: Int
  /// Duree totale, les +30 s compris.
  var totalS: Double
  /// Heure de fin quand il tourne, nil quand il est en pause.
  var fin: Date?
  /// Secondes restantes quand il est en pause.
  var restantPause: Double?

  var enPause: Bool { fin == nil }

  func restant(_ maintenant: Date = Date()) -> Double {
    if let f = fin { return max(0, f.timeIntervalSince(maintenant)) }
    return max(0, restantPause ?? 0)
  }

  /// Debut de l'intervalle affiche par Text(timerInterval:) et ProgressView(timerInterval:).
  /// Toujours avant la fin, donc l'intervalle est valide.
  var debutIntervalle: Date? {
    guard let f = fin else { return nil }
    return f.addingTimeInterval(-max(1, totalS))
  }

  /// Part restante, de 1 au depart a 0 a la fin.
  func progression(_ maintenant: Date = Date()) -> Double {
    guard totalS > 0 else { return 0 }
    return min(1, max(0, restant(maintenant) / totalS))
  }

  func tourne(a maintenant: Date) -> Bool {
    guard let f = fin else { return false }
    return f > maintenant
  }
}

struct EtatMinuteurs: Codable, Equatable {
  var epingles: [Int]
  var recents: [Int]
  var actifs: [MinuteurActif]

  enum CodingKeys: String, CodingKey { case epingles, recents, actifs }

  init(epingles: [Int], recents: [Int], actifs: [MinuteurActif]) {
    self.epingles = epingles
    self.recents = recents
    self.actifs = actifs
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    epingles = c.lire(.epingles, EtatMinuteurs.initial.epingles)
    recents = c.lire(.recents, [Int]())
    actifs = c.lire(.actifs, [MinuteurActif]())
  }

  /// Avant le premier reglage : trois durees de repos courantes, a modifier dans l'app.
  static let initial = EtatMinuteurs(epingles: [60, 90, 180], recents: [], actifs: [])

  /// Durees proposees dans la section Tous.
  static let tous: [Int] = [15, 30, 45, 60, 90, 120, 180, 300, 600]

  /// Minuteur a montrer en premier : celui qui finit le plus tot, sinon le premier en pause.
  func principal(a maintenant: Date = Date()) -> MinuteurActif? {
    let enMarche = actifs.filter { $0.tourne(a: maintenant) }.sorted { ($0.fin ?? maintenant) < ($1.fin ?? maintenant) }
    if let m = enMarche.first { return m }
    return actifs.first { $0.enPause && ($0.restantPause ?? 0) > 0 }
  }

  /// Nombre de minuteurs encore utiles (en marche ou en pause) a cet instant.
  func nombreUtiles(a maintenant: Date = Date()) -> Int {
    actifs.filter { $0.tourne(a: maintenant) || ($0.enPause && ($0.restantPause ?? 0) > 0) }.count
  }
}

enum StockMinuteurs {
  static let cle = "yoroi.minuteurs.etat"
  /// Meme contenu en fichier dans l'App Group : c'est lui que la complication lit en premier.
  static let fichier = "minuteurs.json"

  static func lire() -> EtatMinuteurs {
    guard let data = Partage.lireFichier(fichier) ?? Partage.defaults.data(forKey: cle),
          let e = try? JSONDecoder().decode(EtatMinuteurs.self, from: data) else { return .initial }
    return e
  }

  static func ecrire(_ e: EtatMinuteurs) {
    guard let data = try? JSONEncoder().encode(e) else { return }
    Partage.ecrireFichier(fichier, data)
    Partage.defaults.set(data, forKey: cle)
  }
}
