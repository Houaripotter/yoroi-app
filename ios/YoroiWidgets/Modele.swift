import Foundation

// Instantane ecrit par l'app (le meme JSON v1 que celui de la montre, lib/v2/montre/contexte.ts).
// Chaque champ a une valeur de repli : un champ manquant ne fait jamais tomber tout l'instantane.

extension KeyedDecodingContainer {
  func lire<T: Decodable>(_ cle: Key, _ repli: T) -> T {
    (try? decodeIfPresent(T.self, forKey: cle)) ?? repli
  }

  func lireOpt<T: Decodable>(_ cle: Key) -> T? {
    (try? decodeIfPresent(T.self, forKey: cle)) ?? nil
  }
}

struct PointI: Decodable, Equatable {
  var d: String
  var kg: Double
}

struct DernierI: Decodable, Equatable {
  var kg: Double
  var date: String
}

struct ArriveeI: Decodable, Equatable {
  var du: String
  var au: String
}

struct PoidsI: Decodable, Equatable {
  var dernier: DernierI? = nil
  var ecart: Double? = nil
  var statut: String = "aucun"
  var phrase: String? = nil
  var arrivee: ArriveeI? = nil
  var cap: Double? = nil
  var serie30: [PointI] = []
  var ligne30: [PointI] = []

  enum K: String, CodingKey { case dernier, ecart, statut, phrase, arrivee, cap, serie30, ligne30 }

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: K.self)
    dernier = c.lireOpt(.dernier)
    ecart = c.lireOpt(.ecart)
    statut = c.lire(.statut, "aucun")
    phrase = c.lireOpt(.phrase)
    arrivee = c.lireOpt(.arrivee)
    cap = c.lireOpt(.cap)
    serie30 = c.lire(.serie30, [PointI]())
    ligne30 = c.lire(.ligne30, [PointI]())
  }
}

struct SemaineI: Decodable, Equatable {
  var objectif: Int? = nil
  var faites: Int = 0
  var jours: [Bool] = Array(repeating: false, count: 7)
  var lundi: String = ""

  enum K: String, CodingKey { case objectif, faites, jours, lundi }

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: K.self)
    if let o: Double = c.lireOpt(.objectif), o > 0 { objectif = Int(o.rounded()) } else { objectif = nil }
    let f: Double = c.lire(.faites, 0)
    faites = max(0, Int(f.rounded()))
    var j: [Bool] = c.lire(.jours, [Bool]())
    if j.count < 7 { j += Array(repeating: false, count: 7 - j.count) }
    jours = Array(j.prefix(7))
    lundi = c.lire(.lundi, "")
  }
}

struct EauI: Decodable, Equatable {
  var ml: Double = 0
  var objectif: Double? = nil
  var verre: Double = 250

  enum K: String, CodingKey { case ml, objectif, verre }

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: K.self)
    ml = max(0, c.lire(.ml, 0.0))
    if let o: Double = c.lireOpt(.objectif), o > 0 { objectif = o } else { objectif = nil }
    let v: Double = c.lire(.verre, 250.0)
    verre = v > 0 ? v : 250
  }
}

struct ChronoI: Decodable, Equatable {
  var id: String = ""
  var nom: String = "Chrono"
  var rounds: Int = 0
  var roundS: Int = 0
  var reposS: Int = 0

  enum K: String, CodingKey { case id, nom, rounds, roundS, reposS }

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: K.self)
    id = c.lire(.id, "")
    nom = c.lire(.nom, "Chrono")
    rounds = max(0, Int(c.lire(.rounds, 0.0).rounded()))
    roundS = max(0, Int(c.lire(.roundS, 0.0).rounded()))
    reposS = max(0, Int(c.lire(.reposS, 0.0).rounded()))
  }
}

struct CombatI: Decodable, Equatable {
  var date: String = ""
  var categorieKg: Double? = nil
  var ecartKg: Double? = nil

  enum K: String, CodingKey { case date, categorieKg, ecartKg }

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: K.self)
    date = c.lire(.date, "")
    categorieKg = c.lireOpt(.categorieKg)
    ecartKg = c.lireOpt(.ecartKg)
  }
}

struct Instantane: Decodable, Equatable {
  var genere: String = ""
  var prenom: String = ""
  var unite: String = "kg"
  var poids = PoidsI()
  var semaine = SemaineI()
  var eau = EauI()
  var chronos: [ChronoI] = []
  var combat: CombatI? = nil

  enum K: String, CodingKey { case genere, profil, poids, semaine, eau, chronos, combat }
  enum KP: String, CodingKey { case prenom, unite }

  init() {}

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: K.self)
    genere = c.lire(.genere, "")
    if let p = try? c.nestedContainer(keyedBy: KP.self, forKey: .profil) {
      prenom = p.lire(.prenom, "")
      unite = p.lire(.unite, "kg")
    }
    poids = c.lire(.poids, PoidsI())
    semaine = c.lire(.semaine, SemaineI())
    eau = c.lire(.eau, EauI())
    chronos = c.lire(.chronos, [ChronoI]())
    combat = c.lireOpt(.combat)
  }

  static func depuisJSON(_ texte: String) -> Instantane? {
    guard let data = texte.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Instantane.self, from: data)
  }
}

// MARK: - Jours

enum Jours {
  private static let format: DateFormatter = {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f
  }()

  static func ecrire(_ d: Date) -> String { format.string(from: d) }

  static func lire(_ s: String) -> Date? {
    guard s.count >= 10 else { return nil }
    return format.date(from: String(s.prefix(10)))
  }

  /// Lundi de la semaine du jour donne (lundi d'abord)
  static func lundi(_ d: Date) -> Date {
    let cal = Calendar.current
    let jour = cal.startOfDay(for: d)
    let js = cal.component(.weekday, from: jour) // 1 dimanche ... 7 samedi
    let recul = (js + 5) % 7
    return cal.date(byAdding: .day, value: -recul, to: jour) ?? jour
  }

  static func minuitSuivant(_ d: Date) -> Date {
    let cal = Calendar.current
    let debut = cal.startOfDay(for: d)
    return cal.date(byAdding: .day, value: 1, to: debut) ?? d.addingTimeInterval(86_400)
  }

  /// Jours entiers de a vers b (0 le meme jour)
  static func ecart(de a: Date, a b: Date) -> Int {
    let cal = Calendar.current
    return cal.dateComponents([.day], from: cal.startOfDay(for: a), to: cal.startOfDay(for: b)).day ?? 0
  }
}

// MARK: - Etat affiche

/// Ce que les widgets affichent : l'instantane remis a la date du jour, plus les actions
/// faites depuis un widget que l'app n'a pas encore appliquees (affichage optimiste).
struct EtatYoroi {
  var present: Bool
  var maintenant: Date
  var inst: Instantane
  var eauMl: Double
  var jours: [Bool]
  var faites: Int
  var joursAvantCombat: Int?

  var livres: Bool { inst.unite == "lb" }
  var objectifSemaine: Int? { inst.semaine.objectif }
  var eauObjectif: Double? { inst.eau.objectif }
  var verre: Double { inst.eau.verre }
  var poids: PoidsI { inst.poids }
  var combat: CombatI? { joursAvantCombat == nil ? nil : inst.combat }
  var chrono: ChronoI? { inst.chronos.first }

  /// Rang du jour dans la semaine (0 lundi ... 6 dimanche)
  var rangAujourdhui: Int { Jours.ecart(de: Jours.lundi(maintenant), a: maintenant) }

  /// Part de l'objectif d'eau (0 a 1), nil sans objectif
  var partEau: Double? {
    guard let o = eauObjectif, o > 0 else { return nil }
    return min(1, max(0, eauMl / o))
  }

  static let vide = EtatYoroi(present: false, maintenant: Date(), inst: Instantane(), eauMl: 0, jours: Array(repeating: false, count: 7), faites: 0, joursAvantCombat: nil)

  static func lire(_ maintenant: Date = Date()) -> EtatYoroi {
    guard let json = GroupeYoroi.lireInstantaneJSON(), let inst = Instantane.depuisJSON(json) else {
      var e = EtatYoroi.vide
      e.maintenant = maintenant
      return e
    }
    return depuis(inst, actions: GroupeYoroi.lireActions(), maintenant: maintenant)
  }

  static func depuis(_ inst: Instantane, actions: [[String: Any]], maintenant: Date) -> EtatYoroi {
    let aujourdhui = Jours.ecrire(maintenant)

    // Eau : le total du jour de l'instantane (0 s'il date d'un autre jour), plus les verres du widget
    var eau = 0.0
    if let g = GroupeYoroi.lireInstant(inst.genere) ?? Jours.lire(inst.genere), Jours.ecrire(g) == aujourdhui {
      eau = inst.eau.ml
    }
    for a in actions {
      guard (a["type"] as? String) == "eau", let at = a["at"] as? String, let quand = GroupeYoroi.lireInstant(at) else { continue }
      guard Jours.ecrire(quand) == aujourdhui else { continue }
      if let d = a["deltaMl"] as? Double { eau += d } else if let d = a["deltaMl"] as? Int { eau += Double(d) }
      eau = max(0, eau)
    }

    // Semaine : vide si l'instantane date d'une semaine passee
    var jours = inst.semaine.jours
    var faites = inst.semaine.faites
    let lundi = Jours.ecrire(Jours.lundi(maintenant))
    if !inst.semaine.lundi.isEmpty && inst.semaine.lundi != lundi {
      jours = Array(repeating: false, count: 7)
      faites = 0
    }

    // Combat : seulement s'il est aujourd'hui ou plus tard
    var jc: Int? = nil
    if let c = inst.combat, let d = Jours.lire(c.date) {
      let n = Jours.ecart(de: maintenant, a: d)
      if n >= 0 { jc = n }
    }

    return EtatYoroi(present: true, maintenant: maintenant, inst: inst, eauMl: eau, jours: jours, faites: faites, joursAvantCombat: jc)
  }
}
