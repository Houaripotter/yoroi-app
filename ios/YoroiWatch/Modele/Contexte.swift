import Foundation

// Contrat de synchro v1, iPhone vers montre.
// Le JSON arrive dans applicationContext["yoroi"] sous forme de chaine.
// Chaque champ est lu avec une valeur de repli : un champ manquant ou mal forme
// ne doit jamais faire tomber tout le contexte.

extension KeyedDecodingContainer {
  func lire<T: Decodable>(_ cle: Key, _ repli: T) -> T {
    (try? decodeIfPresent(T.self, forKey: cle)) ?? repli
  }
  func lireOpt<T: Decodable>(_ cle: Key) -> T? {
    (try? decodeIfPresent(T.self, forKey: cle)) ?? nil
  }
}

struct Contexte: Codable, Equatable {
  var v: Int
  var genere: String
  var profil: ProfilCtx
  var poids: PoidsCtx
  var semaine: SemaineCtx
  var eau: EauCtx
  var chronos: [ChronoPreset]
  var combat: CombatCtx?

  enum CodingKeys: String, CodingKey {
    case v, genere, profil, poids, semaine, eau, chronos, combat
  }

  /// Contexte vide, avant le premier envoi de l'iPhone.
  init() {
    v = 1
    genere = ""
    profil = ProfilCtx.vide
    poids = PoidsCtx.vide
    semaine = SemaineCtx.vide
    eau = EauCtx.vide
    chronos = []
    combat = nil
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    v = c.lire(.v, 1)
    genere = c.lire(.genere, "")
    profil = c.lire(.profil, ProfilCtx.vide)
    poids = c.lire(.poids, PoidsCtx.vide)
    semaine = c.lire(.semaine, SemaineCtx.vide)
    eau = c.lire(.eau, EauCtx.vide)
    chronos = c.lire(.chronos, [ChronoPreset]())
    combat = c.lireOpt(.combat)
  }

  /// Date de generation lue depuis le champ ISO (nil si illisible).
  var dateGeneree: Date? { DatesISO.lireInstant(genere) }

  static func depuisJSON(_ texte: String) -> Contexte? {
    guard let data = texte.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Contexte.self, from: data)
  }
}

struct SportCtx: Codable, Equatable, Hashable, Identifiable {
  var id: String
  var nom: String

  enum CodingKeys: String, CodingKey { case id, nom }

  init(id: String, nom: String) {
    self.id = id
    self.nom = nom
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = c.lire(.id, "")
    nom = c.lire(.nom, "")
  }
}

struct ProfilCtx: Codable, Equatable {
  var prenom: String
  var unite: String
  var sports: [SportCtx]

  static let vide = ProfilCtx(prenom: "", unite: "kg", sports: [])

  enum CodingKeys: String, CodingKey { case prenom, unite, sports }

  init(prenom: String, unite: String, sports: [SportCtx]) {
    self.prenom = prenom
    self.unite = unite
    self.sports = sports
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    prenom = c.lire(.prenom, "")
    unite = c.lire(.unite, "kg")
    sports = c.lire(.sports, [SportCtx]())
  }

  var enLivres: Bool { unite == "lb" }
}

struct PointPoids: Codable, Equatable {
  var d: String
  var kg: Double
}

struct DernierPoids: Codable, Equatable {
  var kg: Double
  var date: String
}

struct PeriodeArrivee: Codable, Equatable {
  var du: String
  var au: String
}

struct PoidsCtx: Codable, Equatable {
  var dernier: DernierPoids?
  var rythmeAujourdhui: Double?
  var ecart: Double?
  var statut: String
  var phrase: String?
  var arrivee: PeriodeArrivee?
  var cap: Double?
  var serie30: [PointPoids]
  var ligne30: [PointPoids]

  static let vide = PoidsCtx(dernier: nil, rythmeAujourdhui: nil, ecart: nil, statut: "aucun", phrase: nil, arrivee: nil, cap: nil, serie30: [], ligne30: [])

  enum CodingKeys: String, CodingKey {
    case dernier, rythmeAujourdhui, ecart, statut, phrase, arrivee, cap, serie30, ligne30
  }

  init(dernier: DernierPoids?, rythmeAujourdhui: Double?, ecart: Double?, statut: String, phrase: String?, arrivee: PeriodeArrivee?, cap: Double?, serie30: [PointPoids], ligne30: [PointPoids]) {
    self.dernier = dernier
    self.rythmeAujourdhui = rythmeAujourdhui
    self.ecart = ecart
    self.statut = statut
    self.phrase = phrase
    self.arrivee = arrivee
    self.cap = cap
    self.serie30 = serie30
    self.ligne30 = ligne30
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    dernier = c.lireOpt(.dernier)
    rythmeAujourdhui = c.lireOpt(.rythmeAujourdhui)
    ecart = c.lireOpt(.ecart)
    statut = c.lire(.statut, "aucun")
    phrase = c.lireOpt(.phrase)
    arrivee = c.lireOpt(.arrivee)
    cap = c.lireOpt(.cap)
    serie30 = c.lire(.serie30, [PointPoids]())
    ligne30 = c.lire(.ligne30, [PointPoids]())
  }
}

struct SemaineCtx: Codable, Equatable {
  var objectif: Int?
  var faites: Int
  var jours: [Bool]
  var lundi: String

  static let vide = SemaineCtx(objectif: nil, faites: 0, jours: Array(repeating: false, count: 7), lundi: "")

  enum CodingKeys: String, CodingKey { case objectif, faites, jours, lundi }

  init(objectif: Int?, faites: Int, jours: [Bool], lundi: String) {
    self.objectif = objectif
    self.faites = faites
    self.jours = jours
    self.lundi = lundi
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    if let o: Double = c.lireOpt(.objectif) { objectif = Int(o.rounded()) } else { objectif = nil }
    let f: Double = c.lire(.faites, 0)
    faites = Int(f.rounded())
    var j: [Bool] = c.lire(.jours, [Bool]())
    if j.count < 7 { j += Array(repeating: false, count: 7 - j.count) }
    jours = Array(j.prefix(7))
    lundi = c.lire(.lundi, "")
  }
}

struct EauCtx: Codable, Equatable {
  var ml: Double
  var objectif: Double?
  var verre: Double

  static let vide = EauCtx(ml: 0, objectif: nil, verre: 250)

  enum CodingKeys: String, CodingKey { case ml, objectif, verre }

  init(ml: Double, objectif: Double?, verre: Double) {
    self.ml = ml
    self.objectif = objectif
    self.verre = verre
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    ml = c.lire(.ml, 0)
    objectif = c.lireOpt(.objectif)
    let v: Double = c.lire(.verre, 250)
    verre = v > 0 ? v : 250
  }
}

struct ChronoPreset: Codable, Equatable, Hashable, Identifiable {
  var id: String
  var nom: String
  var rounds: Int
  var roundS: Int
  var reposS: Int
  var prepaS: Int
  var alerteS: Int

  enum CodingKeys: String, CodingKey { case id, nom, rounds, roundS, reposS, prepaS, alerteS }

  init(id: String, nom: String, rounds: Int, roundS: Int, reposS: Int, prepaS: Int, alerteS: Int) {
    self.id = id
    self.nom = nom
    self.rounds = rounds
    self.roundS = roundS
    self.reposS = reposS
    self.prepaS = prepaS
    self.alerteS = alerteS
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    func entier(_ k: CodingKeys, _ repli: Int) -> Int {
      let d: Double = c.lire(k, Double(repli))
      return max(0, Int(d.rounded()))
    }
    id = c.lire(.id, UUID().uuidString)
    nom = c.lire(.nom, "Chrono")
    rounds = max(1, entier(.rounds, 3))
    roundS = max(5, entier(.roundS, 180))
    reposS = entier(.reposS, 60)
    prepaS = entier(.prepaS, 10)
    alerteS = entier(.alerteS, 10)
  }

  /// Duree totale du chrono, preparation comprise.
  var dureeTotaleS: Int { prepaS + rounds * roundS + max(0, rounds - 1) * reposS }

  /// Chronos proposes meme sans iPhone.
  static let defauts: [ChronoPreset] = [
    ChronoPreset(id: "defaut.boxe", nom: "Boxe", rounds: 3, roundS: 180, reposS: 60, prepaS: 10, alerteS: 10),
    ChronoPreset(id: "defaut.mma", nom: "MMA", rounds: 5, roundS: 300, reposS: 60, prepaS: 10, alerteS: 10),
    // 15 octobre 2026 : open mat, 4 rounds de 5 min, 1 min de repos, comme le chrono JJB de l'iPhone.
    // Un chrono perso envoye par l'iPhone (Synchro.chronos) passe toujours devant ce defaut.
    ChronoPreset(id: "defaut.jjb", nom: "Jiu-jitsu", rounds: 4, roundS: 300, reposS: 60, prepaS: 10, alerteS: 10),
    ChronoPreset(id: "defaut.muaythai", nom: "Muay thaï", rounds: 5, roundS: 180, reposS: 120, prepaS: 10, alerteS: 10),
    ChronoPreset(id: "defaut.tabata", nom: "Tabata", rounds: 8, roundS: 20, reposS: 10, prepaS: 10, alerteS: 0),
  ]
}

struct CombatCtx: Codable, Equatable {
  var date: String
  var categorieKg: Double?
  var ecartKg: Double?

  enum CodingKeys: String, CodingKey { case date, categorieKg, ecartKg }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    date = c.lire(.date, "")
    categorieKg = c.lireOpt(.categorieKg)
    ecartKg = c.lireOpt(.ecartKg)
  }

  /// Nombre de jours avant le combat (0 le jour meme), nil si la date est illisible.
  func joursRestants(depuis maintenant: Date = Date()) -> Int? {
    guard let jour = DatesISO.lireJour(date) else { return nil }
    let cal = Calendar.current
    let a = cal.startOfDay(for: maintenant)
    let b = cal.startOfDay(for: jour)
    return cal.dateComponents([.day], from: a, to: b).day
  }
}
