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
  /// 28 octobre 2026 (champs facultatifs, contrat toujours v1) : la seance du jour du Coach, ton rang du Dojo
  /// et ta seance de musculation en cours. Absents : un iPhone d'avant, rien a montrer.
  var coach: CoachCtx?
  var dojo: DojoCtx?
  var seance: SeanceCtx?

  enum CodingKeys: String, CodingKey {
    case v, genere, profil, poids, semaine, eau, chronos, combat, coach, dojo, seance
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
    coach = nil
    dojo = nil
    seance = nil
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
    coach = c.lireOpt(.coach)
    dojo = c.lireOpt(.dojo)
    seance = c.lireOpt(.seance)
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
  /// 28 octobre 2026 : le prochain palier du chemin vers ton cap (25, 50, 75 et 100 %), calcule par l'iPhone
  var palier: PalierCtx?

  static let vide = PoidsCtx(dernier: nil, rythmeAujourdhui: nil, ecart: nil, statut: "aucun", phrase: nil, arrivee: nil, cap: nil, serie30: [], ligne30: [])

  enum CodingKeys: String, CodingKey {
    case dernier, rythmeAujourdhui, ecart, statut, phrase, arrivee, cap, serie30, ligne30, palier
  }

  init(dernier: DernierPoids?, rythmeAujourdhui: Double?, ecart: Double?, statut: String, phrase: String?, arrivee: PeriodeArrivee?, cap: Double?, serie30: [PointPoids], ligne30: [PointPoids], palier: PalierCtx? = nil) {
    self.dernier = dernier
    self.rythmeAujourdhui = rythmeAujourdhui
    self.ecart = ecart
    self.statut = statut
    self.phrase = phrase
    self.arrivee = arrivee
    self.cap = cap
    self.serie30 = serie30
    self.ligne30 = ligne30
    self.palier = palier
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
    palier = c.lireOpt(.palier)
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

// MARK: - Direction B (28 octobre 2026) : palier, Coach, Dojo, seance guidee

struct PalierCtx: Codable, Equatable {
  /// Poids du palier, en kg.
  var kg: Double
  /// Ce qu'il reste jusqu'a lui, en kg.
  var reste: Double
  /// Ce palier est ton cap.
  var dernier: Bool
  /// Ta part du chemin deja faite (0 a 1).
  var part: Double = 0

  enum CodingKeys: String, CodingKey { case kg, reste, dernier, part }

  init(kg: Double, reste: Double, dernier: Bool, part: Double = 0) {
    self.kg = kg
    self.reste = reste
    self.dernier = dernier
    self.part = part
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    kg = c.lire(.kg, 0)
    reste = max(0, c.lire(.reste, 0))
    dernier = c.lire(.dernier, false)
    part = min(1, max(0, c.lire(.part, 0)))
  }
}

/// La seance du jour de ton Coach. Les textes arrivent traduits par l'iPhone.
struct CoachCtx: Codable, Equatable {
  var titre: String
  var programme: String
  var exos: Int
  var minutes: Int
  var muscles: [String]
  /// Vrai si c'est la seance a faire aujourd'hui (sinon jour de repos ou seance deja faite).
  var aujourdhui: Bool
  /// debut, aujourdhui, fait, repos, rattrape
  var etat: String
  var ensuite: String
  /// muscu, cardio ou rounds
  var genre: String

  enum CodingKeys: String, CodingKey { case titre, programme, exos, minutes, muscles, aujourdhui, etat, ensuite, genre }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    titre = c.lire(.titre, "")
    programme = c.lire(.programme, "")
    let e: Double = c.lire(.exos, 0)
    exos = max(0, Int(e.rounded()))
    let m: Double = c.lire(.minutes, 0)
    minutes = max(0, Int(m.rounded()))
    muscles = c.lire(.muscles, [String]())
    aujourdhui = c.lire(.aujourdhui, false)
    etat = c.lire(.etat, "")
    ensuite = c.lire(.ensuite, "")
    genre = c.lire(.genre, "muscu")
  }

  /// "6 exos, 45 min", "45 min" pour une seance sans exercice
  var resume: String {
    if exos > 0 && minutes > 0 { return String(format: NSLocalizedString("%@ exos, %@ min", comment: ""), "\(exos)", "\(minutes)") }
    if exos > 0 { return String(format: NSLocalizedString("%@ exos", comment: ""), "\(exos)") }
    return minutes > 0 ? "\(minutes) min" : programme
  }
}

/// Ton rang du Dojo et ton XP.
struct DojoCtx: Codable, Equatable {
  var rang: String
  var rangIndex: Int
  var rangs: Int
  var xp: Int
  var suivant: String?
  var xpSuivant: Int?
  /// 0 a 1 vers le palier suivant
  var part: Double
  /// id du personnage choisi, nil « Sans personnage »
  var personnage: String?

  enum CodingKeys: String, CodingKey { case rang, rangIndex, rangs, xp, suivant, xpSuivant, part, personnage }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    rang = c.lire(.rang, "")
    let i: Double = c.lire(.rangIndex, 0)
    rangIndex = max(0, Int(i.rounded()))
    let n: Double = c.lire(.rangs, 5)
    rangs = max(1, Int(n.rounded()))
    let x: Double = c.lire(.xp, 0)
    xp = max(0, Int(x.rounded()))
    suivant = c.lireOpt(.suivant)
    if let s: Double = c.lireOpt(.xpSuivant) { xpSuivant = Int(s.rounded()) } else { xpSuivant = nil }
    part = min(1, max(0, c.lire(.part, 0)))
    personnage = c.lireOpt(.personnage)
  }
}

/// Un exercice de la seance en cours.
struct ExoSeanceCtx: Codable, Equatable, Hashable {
  var id: String
  var nom: String
  var faites: Int
  var total: Int
  /// repos apres une serie, en secondes
  var repos: Int
  /// charge de la prochaine serie (0 : poids du corps ou inconnue)
  var kg: Double
  var reps: Int

  enum CodingKeys: String, CodingKey { case id, nom, faites, total, repos, kg, reps }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = c.lire(.id, "")
    nom = c.lire(.nom, "")
    let f: Double = c.lire(.faites, 0)
    faites = max(0, Int(f.rounded()))
    let t: Double = c.lire(.total, 0)
    total = max(0, Int(t.rounded()))
    let r: Double = c.lire(.repos, 90)
    repos = max(15, Int(r.rounded()))
    kg = max(0, c.lire(.kg, 0))
    let n: Double = c.lire(.reps, 0)
    reps = max(0, Int(n.rounded()))
  }

  var fini: Bool { faites >= total }
}

/// Ta seance de musculation en cours sur l'iPhone, guidee sur la montre.
struct SeanceCtx: Codable, Equatable {
  var titre: String
  var debutMs: Double
  /// fin du repos en cours, en ms depuis 1970 (nil pendant l'effort)
  var finReposMs: Double?
  var reposTotalS: Int
  var cur: Int
  var exos: [ExoSeanceCtx]

  enum CodingKeys: String, CodingKey { case titre, debutMs, finReposMs, reposTotalS, cur, exos }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    titre = c.lire(.titre, "")
    debutMs = c.lire(.debutMs, 0)
    finReposMs = c.lireOpt(.finReposMs)
    let r: Double = c.lire(.reposTotalS, 0)
    reposTotalS = max(0, Int(r.rounded()))
    let i: Double = c.lire(.cur, 0)
    cur = max(0, Int(i.rounded()))
    exos = c.lire(.exos, [ExoSeanceCtx]())
  }

  var debut: Date { Date(timeIntervalSince1970: debutMs / 1000) }

  var finRepos: Date? { finReposMs.map { Date(timeIntervalSince1970: $0 / 1000) } }

  /// L'exercice en cours, ou nil (plan vide).
  var exoCourant: ExoSeanceCtx? {
    guard !exos.isEmpty else { return nil }
    return exos[min(max(0, cur), exos.count - 1)]
  }

  /// Toutes les series sont faites.
  var bouclee: Bool { !exos.isEmpty && exos.allSatisfy { $0.fini } }

  /// Prochain exercice avec une serie a faire apres l'index i (puis depuis le debut), comme l'ile de l'iPhone.
  func prochain(apres i: Int) -> Int? {
    guard !exos.isEmpty else { return nil }
    for k in 1...exos.count {
      let j = (i + k) % exos.count
      if !exos[j].fini { return j }
    }
    return nil
  }
}
