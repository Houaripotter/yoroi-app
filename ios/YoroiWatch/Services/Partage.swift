import Foundation
import UIKit

// Stockage partage par App Group entre l'app montre et l'extension de widgets.

enum Partage {
  static let groupe = "group.com.houari.yoroi.watch"

  enum Cle {
    static let contexteRecu = "yoroi.contexte.recu"
    static let contexteAffiche = "yoroi.contexte.affiche"
    static let file = "yoroi.file.actions"
    static let hapticFort = "yoroi.reglage.hapticFort"
    /// Son fort de fin de minuteur (absent = actif).
    static let sonFort = "yoroi.reglage.sonFort"
    static let sons = "yoroi.reglage.sons"
    /// 28 octobre 2026 : son de fin de minuteur, "wizz" (absent = wizz) ou "alarme" (les bips aigus d'avant).
    static let sonFin = "yoroi.reglage.sonFin"
    static let idsEcritsSante = "yoroi.sante.ids"
  }

  static var defaults: UserDefaults {
    UserDefaults(suiteName: groupe) ?? .standard
  }

  /// Dossier partage de l'App Group. Un fichier est relu sur le disque a chaque lecture :
  /// l'extension de widgets voit toujours la derniere version, sans cache de UserDefaults.
  static var dossier: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupe)
  }

  static func ecrireFichier(_ nom: String, _ data: Data) {
    guard let url = dossier?.appendingPathComponent(nom) else { return }
    try? data.write(to: url, options: .atomic)
  }

  static func lireFichier(_ nom: String) -> Data? {
    guard let url = dossier?.appendingPathComponent(nom) else { return nil }
    return try? Data(contentsOf: url)
  }

  /// Meme contenu que Cle.contexteAffiche, en fichier : c'est lui que les complications lisent en premier
  /// (watchOS peut servir a l'extension une copie en cache des UserDefaults partages).
  static let fichierContexte = "contexte.json"

  /// Contexte tel qu'affiche (dernier contexte de l'iPhone plus les actions en attente).
  static func lireContexteAffiche() -> Contexte? {
    if let data = lireFichier(fichierContexte), let c = try? JSONDecoder().decode(Contexte.self, from: data) {
      return c
    }
    guard let texte = defaults.string(forKey: Cle.contexteAffiche) else { return nil }
    return Contexte.depuisJSON(texte)
  }

  static func ecrireContexteAffiche(_ c: Contexte?) {
    guard let c, let data = try? JSONEncoder().encode(c), let texte = String(data: data, encoding: .utf8) else {
      defaults.removeObject(forKey: Cle.contexteAffiche)
      if let url = dossier?.appendingPathComponent(fichierContexte) { try? FileManager.default.removeItem(at: url) }
      return
    }
    ecrireFichier(fichierContexte, data)
    defaults.set(texte, forKey: Cle.contexteAffiche)
  }

  static func lireContexteRecu() -> String? { defaults.string(forKey: Cle.contexteRecu) }

  static func ecrireContexteRecu(_ texte: String) { defaults.set(texte, forKey: Cle.contexteRecu) }

  static func lireFile() -> [ActionEnAttente] {
    guard let data = defaults.data(forKey: Cle.file),
          let file = try? JSONDecoder().decode([ActionEnAttente].self, from: data) else { return [] }
    return file
  }

  static func ecrireFile(_ file: [ActionEnAttente]) {
    if let data = try? JSONEncoder().encode(file) { defaults.set(data, forKey: Cle.file) }
  }

  // MARK: Images de l'iPhone (28 octobre 2026)

  /// Ton personnage (png transparent) et ta scene (jpg), reduits par l'iPhone et recus par WatchConnectivity
  /// (Synchro, didReceive file). Gardes dans le dossier de l'App Group : les complications les lisent aussi.
  static let fichierPersonnage = "montre_personnage.png"
  static let fichierScene = "montre_scene.jpg"

  static func urlImage(_ nom: String) -> URL? { dossier?.appendingPathComponent(nom) }

  /// Range un fichier recu (deplace depuis son emplacement temporaire, qui disparait au retour de la methode).
  static func rangerImage(depuis source: URL, nom: String) -> Bool {
    guard let cible = urlImage(nom) else { return false }
    let fm = FileManager.default
    let temp = cible.appendingPathExtension("tmp")
    try? fm.removeItem(at: temp)
    do {
      try fm.copyItem(at: source, to: temp)
      if fm.fileExists(atPath: cible.path) {
        _ = try fm.replaceItemAt(cible, withItemAt: temp)
      } else {
        try fm.moveItem(at: temp, to: cible)
      }
      return true
    } catch {
      try? fm.removeItem(at: temp)
      return false
    }
  }

  static func image(_ nom: String) -> UIImage? {
    guard let url = urlImage(nom), FileManager.default.fileExists(atPath: url.path) else { return nil }
    return UIImage(contentsOfFile: url.path)
  }
}
