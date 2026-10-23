import Foundation

// Dernieres mesures cardio lues par l'app montre dans Apple Sante, ecrites dans l'App Group
// pour les complications. L'extension de widgets ne lit jamais Sante elle meme.
// Juste les chiffres : aucun diagnostic, aucun seuil d'alerte.

enum GenreWidget {
  static let minuteurs = "yoroi.montre.minuteurs"
  static let coeur = "yoroi.montre.coeur"
  static let oxygene = "yoroi.montre.oxygene"
  static let cardio = "yoroi.montre.cardio"
  static let repos = "yoroi.montre.repos"
  static let respiration = "yoroi.montre.respiration"
  // Complications plus anciennes (memes noms que dans WidgetsMontre.swift).
  static let poids = "yoroi.montre.poids"
  static let semaine = "yoroi.montre.semaine"
  static let eau = "yoroi.montre.eau"
  static let chrono = "yoroi.montre.chrono"
  static let combat = "yoroi.montre.combat"
}

/// Combien de temps une mesure reste "fraiche" (chiffre blanc et jauge en couleur).
enum FenetreMesure {
  /// La FC est mesuree toutes les quelques minutes : au dela de 2 h, c'est une vieille valeur.
  static let coeur: TimeInterval = 2 * 3600
  /// L'oxygene n'est mesure que quelques fois par jour (souvent la nuit) : 12 h.
  static let oxygene: TimeInterval = 12 * 3600
  /// FC au repos et respiration : une valeur par jour environ.
  static let journaliere: TimeInterval = 36 * 3600
}

/// Un point de la petite courbe du jour : minutes depuis minuit, valeur.
struct PointJour: Codable, Equatable {
  var t: Int
  var v: Double
}

struct ValeurDatee: Codable, Equatable {
  var valeur: Double
  var date: Date
}

struct MesureJour: Codable, Equatable {
  /// Derniere valeur connue (bpm, ou pourcentage de 0 a 100 pour l'oxygene).
  var valeur: Double
  /// Heure de cette derniere mesure.
  var date: Date
  /// Jour "YYYY-MM-DD" auquel mini, maxi et serie ont ete calcules.
  var jour: String
  var mini: Double?
  var maxi: Double?
  var serie: [PointJour]

  /// Mesure encore fraiche : 2 h par defaut (frequence cardiaque). L'oxygene est mesure par la montre
  /// quelques fois par jour seulement : il passe une fenetre plus longue (voir FenetreMesure).
  func estRecente(a maintenant: Date, fenetre: TimeInterval = 2 * 3600) -> Bool {
    maintenant.timeIntervalSince(date) <= fenetre
  }

  /// Mini, maxi et courbe ne valent que pour le jour ou ils ont ete calcules.
  func estDuJour(_ maintenant: Date) -> Bool {
    jour == DatesISO.ecrireJour(maintenant)
  }

  func miniDuJour(_ maintenant: Date) -> Double? { estDuJour(maintenant) ? mini : nil }
  func maxiDuJour(_ maintenant: Date) -> Double? { estDuJour(maintenant) ? maxi : nil }
  func serieDuJour(_ maintenant: Date) -> [PointJour] { estDuJour(maintenant) ? serie : [] }
}

struct EtatCardio: Codable, Equatable {
  var fc: MesureJour?
  var oxygene: MesureJour?
  var repos: ValeurDatee?
  var variabilite: ValeurDatee?
  /// Frequence respiratoire (respirations par minute), mesuree par la montre pendant le sommeil.
  /// Optionnelle : un ancien fichier sans ce champ se lit toujours.
  var respiration: ValeurDatee? = nil
  var maj: Date

  /// Meme contenu affiche (on ignore l'heure de mise a jour) : pas besoin de recharger les complications.
  func memeAffichage(que autre: EtatCardio) -> Bool {
    fc == autre.fc && oxygene == autre.oxygene && repos == autre.repos && variabilite == autre.variabilite
      && respiration == autre.respiration
  }
}

enum StockCardio {
  static let cle = "yoroi.cardio.etat"
  /// Meme contenu en fichier dans l'App Group : c'est lui que les complications lisent en premier.
  static let fichier = "cardio.json"

  static func lire() -> EtatCardio? {
    guard let data = Partage.lireFichier(fichier) ?? Partage.defaults.data(forKey: cle) else { return nil }
    return try? JSONDecoder().decode(EtatCardio.self, from: data)
  }

  static func ecrire(_ e: EtatCardio) {
    guard let data = try? JSONEncoder().encode(e) else { return }
    Partage.ecrireFichier(fichier, data)
    Partage.defaults.set(data, forKey: cle)
  }
}
