import Foundation

// Contrat de synchro v1, montre vers iPhone.
// Envoye par transferUserInfo(["yoroi": json]) et aussi par sendMessage si l'iPhone est joignable.
// Les champs absents ne sont pas ecrits dans le JSON.

enum TypeAction: String, Codable {
  case poids
  case seance
  case eau
}

enum SourceSeance: String, Codable {
  case chrono
  case libre
  case note
}

struct ActionMontre: Codable, Equatable, Identifiable {
  var v: Int = 1
  var id: String
  var type: TypeAction
  var at: String
  var kg: Double?
  var sportId: String?
  var dureeS: Int?
  var rpe: Int?
  var rounds: Int?
  var fcMoy: Int?
  var fcMax: Int?
  var kcal: Int?
  var source: SourceSeance?
  var deltaMl: Double?
  var dansSante: Bool?

  init(type: TypeAction, id: String = UUID().uuidString, quand: Date = Date()) {
    self.id = id
    self.type = type
    self.at = DatesISO.ecrireInstant(quand)
  }

  var date: Date { DatesISO.lireInstant(at) ?? Date() }

  func json() -> String? {
    guard let data = try? JSONEncoder().encode(self) else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static func poids(kg: Double, id: String, dansSante: Bool) -> ActionMontre {
    var a = ActionMontre(type: .poids, id: id)
    a.kg = (kg * 100).rounded() / 100
    a.dansSante = dansSante
    return a
  }

  /// id : le meme que HKMetadataKeyExternalUUID quand la montre a ecrit le verre dans Apple Sante.
  /// dansSante : true si la montre a deja ecrit (ou retire) le verre dans Apple Sante, l'iPhone n'y touche pas.
  static func eau(deltaMl: Double, id: String = UUID().uuidString, quand: Date = Date(), dansSante: Bool = false) -> ActionMontre {
    var a = ActionMontre(type: .eau, id: id, quand: quand)
    a.deltaMl = deltaMl
    a.dansSante = dansSante
    return a
  }
}

/// Une action gardee dans la file locale tant que l'iPhone ne l'a pas prise en compte.
struct ActionEnAttente: Codable, Equatable, Identifiable {
  var action: ActionMontre
  /// Moment ou watchOS a confirme la livraison a l'iPhone (didFinish sans erreur).
  var livreeLe: Date?
  var essais: Int = 0

  var id: String { action.id }
}
