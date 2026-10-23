import Foundation

// Partage entre l'app iPhone (module natif YoroiWidgets) et l'extension de widgets.
// App Group group.com.houari.yoroi :
//  - l'instantane (meme JSON v1 que la montre) ecrit par l'app a chaque synchro ;
//  - la file des actions faites depuis un widget (+ 1 verre, retrait), lue puis videe par l'app ;
//  - l'image reduite de la scene d'Accueil choisie (fond du style A, fenetre du style B, bandeau du Tableau du jour) ;
//  - le style des widgets choisi dans l'app (A Nuit de lanternes par defaut, B Rouleau et encre, C Armure laquee) ;
//  - l'image de ton personnage, la meme que l'Accueil, sans rang ni XP (style C) ;
//  - la decoration de saison (halloween, noel ou vide), calculee par l'app (18 octobre 2026).

enum GroupeYoroi {
  static let id = "group.com.houari.yoroi"
  static let cleInstantane = "yoroi.widgets.instantane.v1"
  static let cleActions = "yoroi.widgets.actions.v1"
  static let cleLien = "yoroi.widgets.lien.v1"
  /// Un lien plus vieux n'est plus ouvert (l'utilisateur est passe a autre chose)
  static let dureeLien: TimeInterval = 120
  static let fichierScene = "yoroi_widget_scene.jpg"
  static let fichierPersonnage = "yoroi_widget_personnage.png"
  static let cleStyle = "yoroi.widgets.style.v1"
  static let cleSaison = "yoroi.widgets.saison.v1"
  static let maxActions = 200

  static var defauts: UserDefaults? { UserDefaults(suiteName: id) }

  static var dossier: URL? { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id) }

  static var urlScene: URL? { dossier?.appendingPathComponent(fichierScene) }

  static var urlPersonnage: URL? { dossier?.appendingPathComponent(fichierPersonnage) }

  // MARK: Style des widgets

  /// "A", "B" ou "C" ; A tant que rien n'a ete choisi
  static func lireStyle() -> String {
    let s = (defauts?.string(forKey: cleStyle) ?? "A").uppercased()
    return s == "B" || s == "C" ? s : "A"
  }

  static func ecrireStyle(_ s: String) {
    let v = s.uppercased()
    defauts?.set(v == "B" || v == "C" ? v : "A", forKey: cleStyle)
  }

  // MARK: Decoration de saison (Halloween, Noel)

  /// "halloween", "noel" ou "" : calculee par l'app (lib/v2/widgets/saison.ts), vide si les decorations sont coupees
  static func ecrireSaison(_ s: String) {
    let v = s.lowercased()
    defauts?.set(v == "halloween" || v == "noel" ? v : "", forKey: cleSaison)
  }

  /// La saison envoyee par l'app, gardee seulement tant que la date tombe dans sa fenetre (memes dates que
  /// lib/v2/saisons/calendrier.ts : Halloween du 1er octobre au 1er novembre, Noel du 25 novembre au 1er janvier).
  /// Le 2 novembre, la citrouille s'en va sans que l'app soit ouverte.
  static func lireSaison(_ d: Date) -> String {
    let s = defauts?.string(forKey: cleSaison) ?? ""
    let parts = Calendar.current.dateComponents([.month, .day], from: d)
    let r = (parts.month ?? 0) * 100 + (parts.day ?? 0)
    if s == "halloween" && r >= 1001 && r <= 1101 { return s }
    if s == "noel" && r > 0 && (r >= 1125 || r <= 101) { return s }
    return ""
  }

  // MARK: Instantane

  static func lireInstantaneJSON() -> String? {
    defauts?.string(forKey: cleInstantane)
  }

  static func ecrireInstantaneJSON(_ json: String) {
    defauts?.set(json, forKey: cleInstantane)
  }

  // MARK: Actions en attente (contrat v1 des actions montre, source "widget")

  static func lireActions() -> [[String: Any]] {
    guard let texte = defauts?.string(forKey: cleActions), let data = texte.data(using: .utf8) else { return [] }
    guard let objet = try? JSONSerialization.jsonObject(with: data, options: []) else { return [] }
    return (objet as? [[String: Any]]) ?? []
  }

  static func ecrireActions(_ liste: [[String: Any]]) {
    guard JSONSerialization.isValidJSONObject(liste),
          let data = try? JSONSerialization.data(withJSONObject: liste, options: []),
          let texte = String(data: data, encoding: .utf8) else { return }
    defauts?.set(texte, forKey: cleActions)
  }

  static func ajouterAction(_ action: [String: Any]) {
    var liste = lireActions()
    liste.append(action)
    if liste.count > maxActions { liste.removeFirst(liste.count - maxActions) }
    ecrireActions(liste)
  }

  static func retirerActions(_ ids: Set<String>) {
    guard !ids.isEmpty else { return }
    let reste = lireActions().filter { a in
      guard let id = a["id"] as? String else { return false }
      return !ids.contains(id)
    }
    ecrireActions(reste)
  }

  // MARK: Lien a ouvrir dans l'app

  /// Lien laisse pour l'app : demarrage a froid (SceneDelegate) ou controle « Chrono combat » du Centre de controle.
  /// L'app le lit au premier plan par le module natif (getPendingLink), puis l'efface.
  static func deposerLien(_ url: String) {
    let valeur: [String: Any] = ["url": url, "at": Date().timeIntervalSince1970]
    defauts?.set(valeur, forKey: cleLien)
  }

  static func prendreLien() -> String? {
    guard let d = defauts, let o = d.dictionary(forKey: cleLien) else { return nil }
    d.removeObject(forKey: cleLien)
    guard let url = o["url"] as? String else { return nil }
    let at = (o["at"] as? Double) ?? (o["at"] as? NSNumber)?.doubleValue ?? 0
    return Date().timeIntervalSince1970 - at <= dureeLien ? url : nil
  }

  // MARK: Dates

  private static let instant: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
  }()

  private static let instantSimple: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
  }()

  static func ecrireInstant(_ d: Date) -> String { instant.string(from: d) }

  static func lireInstant(_ s: String) -> Date? { instant.date(from: s) ?? instantSimple.date(from: s) }

  /// Action eau du contrat v1 : deltaMl positif (un verre) ou negatif (retrait)
  static func actionEau(deltaMl: Double, quand: Date = Date()) -> [String: Any] {
    [
      "v": 1,
      "id": UUID().uuidString.lowercased(),
      "type": "eau",
      "at": ecrireInstant(quand),
      "deltaMl": deltaMl,
      "source": "widget",
    ]
  }
}
