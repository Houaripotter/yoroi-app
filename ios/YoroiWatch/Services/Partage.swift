import Foundation

// Stockage partage par App Group entre l'app montre et l'extension de widgets.

enum Partage {
  static let groupe = "group.com.houari.yoroi.watch"

  enum Cle {
    static let contexteRecu = "yoroi.contexte.recu"
    static let contexteAffiche = "yoroi.contexte.affiche"
    static let file = "yoroi.file.actions"
    static let hapticFort = "yoroi.reglage.hapticFort"
    static let sons = "yoroi.reglage.sons"
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
}
