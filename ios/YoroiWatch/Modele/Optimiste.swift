import Foundation

// Affichage optimiste : on part du dernier contexte de l'iPhone,
// on le remet a la date du jour, puis on rejoue les actions pas encore prises en compte.

extension Contexte {
  /// Lundi de la semaine en cours (calendrier francais, lundi d'abord).
  static func lundiCourant(_ maintenant: Date = Date()) -> Date {
    var cal = Calendar(identifier: .gregorian)
    cal.firstWeekday = 2
    cal.timeZone = TimeZone.current
    let jour = cal.startOfDay(for: maintenant)
    let jourSemaine = cal.component(.weekday, from: jour)
    let recul = (jourSemaine + 5) % 7
    return cal.date(byAdding: .day, value: -recul, to: jour) ?? jour
  }

  /// Remet a zero ce qui appartient a un jour ou une semaine passes.
  mutating func ramenerAujourdhui(_ maintenant: Date = Date()) {
    let aujourdhui = DatesISO.ecrireJour(maintenant)
    if let g = dateGeneree, DatesISO.ecrireJour(g) != aujourdhui {
      eau.ml = 0
    }
    let lundi = DatesISO.ecrireJour(Contexte.lundiCourant(maintenant))
    if !semaine.lundi.isEmpty && semaine.lundi != lundi {
      semaine.lundi = lundi
      semaine.faites = 0
      semaine.jours = Array(repeating: false, count: 7)
    }
  }

  mutating func appliquer(_ a: ActionMontre, maintenant: Date = Date()) {
    let jourAction = DatesISO.ecrireJour(a.date)
    switch a.type {
    case .poids:
      guard let kg = a.kg else { return }
      if let d = poids.dernier, d.date > jourAction { return }
      poids.dernier = DernierPoids(kg: kg, date: jourAction)
      poids.serie30.removeAll { $0.d == jourAction }
      poids.serie30.append(PointPoids(d: jourAction, kg: kg))
      if let rythme = poids.rythmeAujourdhui, jourAction == DatesISO.ecrireJour(maintenant) {
        poids.ecart = kg - rythme
      } else {
        poids.ecart = nil
      }
      // Le statut et la phrase sont recalcules par l'iPhone.
      poids.statut = "aucun"
      poids.phrase = nil

    case .eau:
      guard let delta = a.deltaMl, jourAction == DatesISO.ecrireJour(maintenant) else { return }
      eau.ml = max(0, eau.ml + delta)

    case .seance:
      let lundi = Contexte.lundiCourant(maintenant)
      let cal = Calendar.current
      guard let n = cal.dateComponents([.day], from: lundi, to: cal.startOfDay(for: a.date)).day, n >= 0, n < 7 else { return }
      if semaine.lundi.isEmpty { semaine.lundi = DatesISO.ecrireJour(lundi) }
      if semaine.jours.count < 7 { semaine.jours += Array(repeating: false, count: 7 - semaine.jours.count) }
      semaine.jours[n] = true
      semaine.faites += 1
    }
  }
}
