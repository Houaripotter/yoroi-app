import Foundation

// Partage entre l'app montre et l'extension de widgets.

enum DatesISO {
  private static let instantSimple: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
  }()

  private static let instantFin: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
  }()

  private static let jour: DateFormatter = {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f
  }()

  static func ecrireInstant(_ d: Date) -> String { instantFin.string(from: d) }

  static func lireInstant(_ s: String) -> Date? {
    instantFin.date(from: s) ?? instantSimple.date(from: s) ?? jour.date(from: String(s.prefix(10)))
  }

  /// "YYYY-MM-DD" dans le fuseau local.
  static func ecrireJour(_ d: Date) -> String { jour.string(from: d) }

  static func lireJour(_ s: String) -> Date? { jour.date(from: String(s.prefix(10))) }
}

enum Format {
  private static let francais = Locale(identifier: "fr_FR")

  private static let jourMois: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "fr_FR")
    f.setLocalizedDateFormatFromTemplate("d MMM")
    return f
  }()

  private static let jourSemaine: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "fr_FR")
    f.setLocalizedDateFormatFromTemplate("EEEE d MMM")
    return f
  }()

  /// Nombre avec une decimale et la virgule francaise : 72,4
  static func decimal(_ x: Double, chiffres: Int = 1) -> String {
    let f = NumberFormatter()
    f.locale = francais
    f.minimumFractionDigits = chiffres
    f.maximumFractionDigits = chiffres
    return f.string(from: NSNumber(value: x)) ?? String(format: "%.\(chiffres)f", x)
  }

  static func entier(_ x: Double) -> String {
    let f = NumberFormatter()
    f.locale = francais
    f.maximumFractionDigits = 0
    f.numberStyle = .decimal
    return f.string(from: NSNumber(value: x.rounded())) ?? "\(Int(x.rounded()))"
  }

  static let kgParLivre = 0.45359237

  /// Convertit un poids en kg vers l'unite d'affichage.
  static func versUnite(_ kg: Double, livres: Bool) -> Double { livres ? kg / kgParLivre : kg }

  static func versKg(_ valeur: Double, livres: Bool) -> Double { livres ? valeur * kgParLivre : valeur }

  static func symbole(livres: Bool) -> String { livres ? "lb" : "kg" }

  /// "72,4" dans l'unite choisie.
  static func poids(_ kg: Double, livres: Bool) -> String { decimal(versUnite(kg, livres: livres)) }

  /// Ecart signe : "+0,4" ou "-1,2" (le moins est un trait d'union simple).
  static func ecart(_ kg: Double, livres: Bool) -> String {
    let v = versUnite(kg, livres: livres)
    let s = decimal(abs(v))
    if abs(v) < 0.05 { return decimal(0) }
    return (v > 0 ? "+" : "-") + s
  }

  /// "12 oct."
  static func jourCourt(_ iso: String) -> String {
    guard let d = DatesISO.lireJour(iso) else { return iso }
    return jourMois.string(from: d)
  }

  /// "Aujourd'hui", "Hier" ou "lundi 12 oct."
  static func jourRelatif(_ iso: String, maintenant: Date = Date()) -> String {
    guard let d = DatesISO.lireJour(iso) else { return iso }
    let cal = Calendar.current
    if cal.isDate(d, inSameDayAs: maintenant) { return "Aujourd'hui" }
    if let hier = cal.date(byAdding: .day, value: -1, to: maintenant), cal.isDate(d, inSameDayAs: hier) { return "Hier" }
    return jourSemaine.string(from: d)
  }

  /// "12:05" ou "1:02:05"
  static func chrono(_ secondes: Int) -> String {
    let s = max(0, secondes)
    let h = s / 3600
    let m = (s % 3600) / 60
    let r = s % 60
    if h > 0 { return String(format: "%d:%02d:%02d", h, m, r) }
    return String(format: "%d:%02d", m, r)
  }

  /// "3 min", "45 s", "1 min 30"
  static func dureeCourte(_ secondes: Int) -> String {
    if secondes < 60 { return "\(secondes) s" }
    let m = secondes / 60
    let r = secondes % 60
    if r == 0 { return "\(m) min" }
    return "\(m) min \(r)"
  }

  /// "1 h 05" ou "45 min"
  static func dureeLongue(_ secondes: Int) -> String {
    let m = secondes / 60
    if m < 60 { return "\(m) min" }
    return String(format: "%d h %02d", m / 60, m % 60)
  }

  /// Rond de minuteur : gros chiffre et unite dessous. 15 et "s", 1 et "min", "1:30" et "min".
  static func rondMinuteurValeur(_ secondes: Int) -> String {
    let s = max(0, secondes)
    if s < 60 { return "\(s)" }
    if s % 60 == 0 { return "\(s / 60)" }
    return String(format: "%d:%02d", s / 60, s % 60)
  }

  static func rondMinuteurUnite(_ secondes: Int) -> String { secondes < 60 ? "s" : "min" }

  private static let heureMinute: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "fr_FR")
    f.dateFormat = "H:mm"
    return f
  }()

  /// "14:02"
  static func heure(_ d: Date) -> String { heureMinute.string(from: d) }

  /// "à 14:02", "hier à 22:10" ou "12 oct. à 9:00"
  static func quand(_ d: Date, maintenant: Date = Date()) -> String {
    let cal = Calendar.current
    if cal.isDate(d, inSameDayAs: maintenant) { return "à \(heure(d))" }
    if let hier = cal.date(byAdding: .day, value: -1, to: maintenant), cal.isDate(d, inSameDayAs: hier) {
      return "hier à \(heure(d))"
    }
    return "\(jourMois.string(from: d)) à \(heure(d))"
  }

  /// "1,5 L" ou "750 ml"
  static func eau(_ ml: Double) -> String {
    if ml >= 1000 { return decimal(ml / 1000) + " L" }
    return entier(ml) + " ml"
  }
}
