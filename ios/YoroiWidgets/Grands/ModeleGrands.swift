import Foundation
import UIKit

// Grands widgets iPad et Mac (31 octobre 2026) : l'instantane dedie, ecrit par l'app dans l'App Group
// (lib/v2/widgetsGrands/instantane.ts et synchro.ts, contrat v1), fichier yoroi_widgets_grands_v1.json.
// Une donnee absente reste absente (nil) : le widget montre un etat vide propre, jamais un chiffre invente.
// Chaque bloc se lit seul : un bloc illisible n'empeche pas les autres de s'afficher.

enum GroupeGrands {
  static let id = "group.com.houari.yoroi"
  static let fichier = "yoroi_widgets_grands_v1.json"
  static let fichierScene = "yoroi_widget_scene.jpg"
  static let fichierPersonnage = "yoroi_widget_personnage.png"

  static var dossier: URL? { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id) }

  static func lire() -> InstantaneG? {
    guard let url = dossier?.appendingPathComponent(fichier), let data = try? Data(contentsOf: url) else { return nil }
    guard let i = try? JSONDecoder().decode(InstantaneG.self, from: data), i.v == 1 else { return nil }
    return i
  }

  static func image(_ nom: String) -> UIImage? {
    guard let url = dossier?.appendingPathComponent(nom), FileManager.default.fileExists(atPath: url.path) else { return nil }
    return UIImage(contentsOfFile: url.path)
  }
}

struct JourSemG: Codable, Hashable {
  var date: String
  var index: Int
  var fait: Bool
  var aujourdhui: Bool
  var futur: Bool
  var sticker: String?
  var nom: String?
  var minutes: Int?
  var prevu: String?
}

struct MinJourG: Codable, Hashable { var index: Int; var minutes: Int }
struct KgSeanceG: Codable, Hashable { var nom: String; var kg: Double }
struct CombatSemG: Codable, Hashable { var nom: String; var date: String; var minutes: Int }

struct SemaineG: Codable {
  var lundi: String
  var jours: [JourSemG]
  var faites: Int
  var objectif: Int?
  var minutes: Int
  var kilosKg: Double
  var series: Int
  var rounds: Int
  var serieSemaines: Int?
  var minutesParJour: [MinJourG]
  var kilosParSeance: [KgSeanceG]
  var combat: CombatSemG?
}

struct PalierG: Codable, Hashable { var kg: Double; var franchi: Bool }
struct PointG: Codable, Hashable { var d: Int; var kg: Double; var t: Double }

struct CorpsG: Codable {
  var dernierKg: Double
  var derniereDate: String
  var departKg: Double?
  var departDate: String?
  var objectifKg: Double?
  var part: Double?
  var paliers: [PalierG]
  var tendance7: Double?
  var ecart90: Double?
  var pesees: Int
  var points: [PointG]
  var debutFenetre: String
  var arrivee: String?
}

struct SommeilG: Codable { var minutes: Int; var coucher: String?; var lever: String? }
struct RecupG: Codable { var score: Int; var titre: String; var conseil: String }
struct FcG: Codable { var bpm: Int; var moyenne: Int? }
struct HierG: Codable { var nom: String; var minutes: Int }

struct FormeG: Codable {
  var pas: Int?
  var pasObjectif: Int
  var exercice: Int?
  var exerciceObjectif: Int
  var kcal: Int?
  var kcalObjectif: Int
  var sommeil: SommeilG?
  var sommeilObjectifMin: Int?
  var recup: RecupG?
  var fcRepos: FcG?
  var seances7: Int?
  var hier: HierG?
}

struct EauG: Codable { var litres: Double; var objectif: Double?; var verres: Int; var verresObjectif: Int? }

struct CoffreG: Codable { var etat: String; var grand: Bool; var grandDans: Int }
struct RecompenseG: Codable { var piece: String; var rang: String }

struct DojoG: Codable {
  var rang: String
  var rangIndex: Int
  var rangs: [String]
  var xp: Int
  var suivant: String?
  var xpSuivant: Int?
  var xpRestant: Int?
  var part: Double?
  var serieJours: Int?
  var semainesTenues: Int?
  var coffre: CoffreG?
  var recompense: RecompenseG?
  var xpSemaine: Int?
  var recordsMois: Int
  var personnage: Bool
}

struct ExoG: Codable, Hashable {
  var nom: String
  var series: Int
  var repsMin: Int
  var repsMax: Int
  var secondes: Bool
  var chargeKg: Double?
  var monte: Bool
}

struct CardioG: Codable { var type: String; var minutes: Int; var texte: String; var sticker: String }
struct DerniereG: Codable { var date: String; var minutes: Int; var kilosKg: Double }
struct GroupeSeriesG: Codable, Hashable { var nom: String; var series: Int }

struct SeanceG: Codable {
  var titre: String
  var programme: String
  var aujourdhui: Bool
  var genre: String
  var minutes: Int
  var muscles: [String]
  var exos: [ExoG]
  var cardio: CardioG?
  var derniere: DerniereG?
  var seriesParGroupe: [GroupeSeriesG]
}

struct SerieRecG: Codable { var kg: Double; var reps: Int }

struct RecordG: Codable, Hashable {
  var titre: String
  var kind: String
  var valeur: Double
  var avant: Double?
  var date: String
  var sticker: String
  var serie: SerieRecG?

  static func == (a: RecordG, b: RecordG) -> Bool { a.titre == b.titre && a.date == b.date && a.valeur == b.valeur }
  func hash(into h: inout Hasher) {
    h.combine(titre)
    h.combine(date)
    h.combine(valeur)
  }
}

struct SportMoisG: Codable, Hashable { var sticker: String; var nom: String; var seances: Int }

struct MoisG: Codable {
  var annee: Int
  var mois: Int
  var premier: Int
  var jours: Int
  var aujourdhui: Int
  var calendrier: [String: [String]]
  var seances: Int
  var joursActifs: Int
  var minutes: Int
  var sports: [SportMoisG]
  var distanceKm: Double
  var kilosKg: Double
  var rounds: Int
  var ecartMoisPrecedent: Int?
}

struct GroupeMuscleG: Codable, Hashable { var nom: String; var series: Int; var calques: [String] }
struct SeanceMuscleG: Codable, Hashable { var nom: String; var date: String; var series: Int }

struct MusclesG: Codable {
  var groupes: [GroupeMuscleG]
  var total: Int
  var seances: Int
  var parSeance: [SeanceMuscleG]
}

struct InstantaneG: Codable {
  var v: Int
  var genere: String?
  var jour: String
  var unite: String?
  var semaine: SemaineG?
  var corps: CorpsG?
  var forme: FormeG?
  var eau: EauG?
  var dojo: DojoG?
  var seance: SeanceG?
  var records: [RecordG]?
  var mois: MoisG?
  var muscles: MusclesG?

  enum CodingKeys: String, CodingKey {
    case v, genere, jour, unite, semaine, corps, forme, eau, dojo, seance, records, mois, muscles
  }

  init(v: Int = 1, genere: String? = nil, jour: String, unite: String? = "kg", semaine: SemaineG? = nil, corps: CorpsG? = nil, forme: FormeG? = nil, eau: EauG? = nil, dojo: DojoG? = nil, seance: SeanceG? = nil, records: [RecordG]? = nil, mois: MoisG? = nil, muscles: MusclesG? = nil) {
    self.v = v
    self.genere = genere
    self.jour = jour
    self.unite = unite
    self.semaine = semaine
    self.corps = corps
    self.forme = forme
    self.eau = eau
    self.dojo = dojo
    self.seance = seance
    self.records = records
    self.mois = mois
    self.muscles = muscles
  }

  /// Lecture tolerante : un bloc illisible devient nil, les autres restent
  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    v = try c.decode(Int.self, forKey: .v)
    jour = try c.decode(String.self, forKey: .jour)
    genere = try? c.decodeIfPresent(String.self, forKey: .genere)
    unite = try? c.decodeIfPresent(String.self, forKey: .unite)
    semaine = try? c.decodeIfPresent(SemaineG.self, forKey: .semaine)
    corps = try? c.decodeIfPresent(CorpsG.self, forKey: .corps)
    forme = try? c.decodeIfPresent(FormeG.self, forKey: .forme)
    eau = try? c.decodeIfPresent(EauG.self, forKey: .eau)
    dojo = try? c.decodeIfPresent(DojoG.self, forKey: .dojo)
    seance = try? c.decodeIfPresent(SeanceG.self, forKey: .seance)
    records = try? c.decodeIfPresent([RecordG].self, forKey: .records)
    mois = try? c.decodeIfPresent(MoisG.self, forKey: .mois)
    muscles = try? c.decodeIfPresent(MusclesG.self, forKey: .muscles)
  }

  var livres: Bool { unite == "lb" }
}

// MARK: - Formats (francais, virgule decimale, sans tiret)

enum FmtG {
  static let langue = Bundle.main.preferredLocalizations.first ?? "fr"
  static let locale = Locale(identifier: langue)
  static let kgParLivre = 0.45359237
  /// signe moins typographique (jamais un trait d'union)
  static let moins = "\u{2212}"

  private static func nf(_ min: Int, _ max: Int) -> NumberFormatter {
    let f = NumberFormatter()
    f.locale = locale
    f.numberStyle = .decimal
    f.minimumFractionDigits = min
    f.maximumFractionDigits = max
    f.groupingSeparator = "\u{202F}"
    return f
  }

  private static let un = nf(1, 1)
  private static let zeroUn = nf(0, 1)
  private static let zero = nf(0, 0)

  static func entier(_ x: Double) -> String { zero.string(from: NSNumber(value: x.rounded())) ?? "\(Int(x.rounded()))" }
  static func entier(_ x: Int) -> String { entier(Double(x)) }
  static func decimal(_ x: Double) -> String { un.string(from: NSNumber(value: x)) ?? String(format: "%.1f", x) }
  /// « 80 » ou « 82,8 »
  static func souple(_ x: Double) -> String { zeroUn.string(from: NSNumber(value: x)) ?? String(format: "%.1f", x) }

  static func poids(_ kg: Double, _ livres: Bool) -> Double { livres ? kg / kgParLivre : kg }
  static func unite(_ livres: Bool) -> String { livres ? "lb" : "kg" }

  /// « −0,7 » ou « +0,4 »
  static func ecart(_ v: Double) -> String {
    let s = decimal(abs(v))
    if abs(v) < 0.05 { return decimal(0) }
    return (v < 0 ? moins : "+") + s
  }

  /// Kilos souleves : « 850 kg » sous la tonne, « 10,2 t » au dessus ; en livres, le total entier
  static func kilos(_ kg: Double, _ livres: Bool) -> String {
    if livres { return "\(entier(kg / kgParLivre)) lb" }
    if kg >= 1000 { return "\(decimal((kg / 100).rounded() / 10)) t" }
    return "\(entier(kg)) kg"
  }

  /// « 4 h 35 », « 45 min »
  static func duree(_ minutes: Int) -> String {
    let m = max(0, minutes)
    if m < 60 { return "\(m) min" }
    let h = m / 60
    let r = m % 60
    return r == 0 ? "\(h) h" : "\(h) h \(String(format: "%02d", r))"
  }

  /// « 7 h 12 »
  static func heures(_ minutes: Int) -> String {
    let h = minutes / 60
    let r = minutes % 60
    return r == 0 ? "\(h) h" : "\(h) h \(String(format: "%02d", r))"
  }

  /// « 23:40 » devient « 23 h 40 »
  static func heure(_ hhmm: String?) -> String? {
    guard let s = hhmm, s.count >= 4 else { return nil }
    let p = s.split(separator: ":")
    guard p.count >= 2, let h = Int(p[0]), let m = Int(p[1]) else { return nil }
    return m == 0 ? "\(h) h" : "\(h) h \(String(format: "%02d", m))"
  }

  // MARK: Dates

  static func date(_ iso: String) -> Date? {
    let p = iso.prefix(10).split(separator: "-").compactMap { Int($0) }
    guard p.count == 3 else { return nil }
    var c = DateComponents()
    c.year = p[0]
    c.month = p[1]
    c.day = p[2]
    c.hour = 12
    return Calendar.current.date(from: c)
  }

  static func iso(_ d: Date) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }

  private static func formateur(_ modele: String) -> DateFormatter {
    let f = DateFormatter()
    f.locale = locale
    f.setLocalizedDateFormatFromTemplate(modele)
    return f
  }

  private static let fJourMois = formateur("d MMM")
  private static let fJourMoisLong = formateur("d MMMM")
  private static let fJourSemaine = formateur("EEEE")
  private static let fJourSemaineCourt = formateur("EEE")
  private static let fMoisAnnee = formateur("MMMM yyyy")
  private static let fMoisCourt = formateur("MMM")

  private static func premier(_ d: Date, _ texte: String) -> String {
    // « 1er novembre » en francais
    guard langue.hasPrefix("fr"), Calendar.current.component(.day, from: d) == 1 else { return texte }
    if texte.hasPrefix("1 ") { return "1er " + texte.dropFirst(2) }
    return texte
  }

  /// « 26 oct. », « 1er nov. »
  static func jourMois(_ iso: String) -> String {
    guard let d = date(iso) else { return "" }
    return premier(d, fJourMois.string(from: d))
  }

  /// « 29 octobre »
  static func jourMoisLong(_ iso: String) -> String {
    guard let d = date(iso) else { return "" }
    return premier(d, fJourMoisLong.string(from: d))
  }

  /// « jeudi »
  static func jourSemaine(_ iso: String) -> String {
    guard let d = date(iso) else { return "" }
    return fJourSemaine.string(from: d)
  }

  /// « jeu. 29 oct. »
  static func jourCourt(_ iso: String) -> String {
    guard let d = date(iso) else { return "" }
    return "\(fJourSemaineCourt.string(from: d)) \(jourMois(iso))"
  }

  /// « Octobre 2026 »
  static func moisAnnee(_ annee: Int, _ mois: Int) -> String {
    var c = DateComponents()
    c.year = annee
    c.month = mois
    c.day = 1
    c.hour = 12
    guard let d = Calendar.current.date(from: c) else { return "" }
    return fMoisAnnee.string(from: d).capitalized(with: locale)
  }

  /// « avril 2027 »
  static func moisDe(_ iso: String) -> String {
    guard let d = date(iso) else { return "" }
    return fMoisAnnee.string(from: d)
  }

  /// « août », « sept. »
  static func moisCourt(_ d: Date) -> String { fMoisCourt.string(from: d) }

  static func capitale(_ s: String) -> String {
    guard let p = s.first else { return s }
    return p.uppercased() + s.dropFirst()
  }

  static let lettres = ["L", "M", "M", "J", "V", "S", "D"]
}
