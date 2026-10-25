import ActivityKit
import AppIntents
import Foundation
import UserNotifications

// Boutons de la seance de musculation dans la Dynamic Island et sur l'ecran verrouille (25 octobre 2026).
// Partage entre l'app iPhone et l'extension de widgets :
//  - l'extension affiche les boutons (Button(intent:), ActiviteChrono.swift) ;
//  - l'app execute l'appui (LiveActivityIntent : iOS lance l'app en arriere plan, sans l'ouvrir).
// Un appui avance tout de suite l'affichage a partir du plan envoye par l'app (lib/v2/seance/actionsIle.ts),
// puis va dans la file partagee de l'App Group (meme file que le « + 1 verre » des widgets) :
// l'app l'applique au brouillon de la seance a son retour au premier plan.

/// Un exercice du plan
struct ExoIle: Codable, Hashable {
  var id: String
  var nom: String
  var faites: Int
  var total: Int
  var repos: Int
}

/// Textes deja traduits par l'app ; {0} {1} {2} remplaces ici
struct TextesIle: Codable, Hashable {
  var serie: String
  var ensuite: String
  var ensuiteExo: String
  var fini: String
  var bouton: String
  var plus15: String
  var reposFini: String
}

struct PlanIle: Codable, Hashable {
  var exos: [ExoIle]
  var cur: Int
  var debutMs: Double
  var t: TextesIle
  /// le rappel de fin de repos est autorise (notifications permises, « Repos terminé » actif)
  var rappel: Bool?
  /// date du dernier appui pris en compte (ms) : une mise a jour plus ancienne venue de l'app est ignoree
  var maj: Double?

  static func lire(_ texte: String?) -> PlanIle? {
    guard let texte, let data = texte.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(PlanIle.self, from: data)
  }

  var texte: String? {
    guard let data = try? JSONEncoder().encode(self) else { return nil }
    return String(data: data, encoding: .utf8)
  }

  /// Prochain exercice avec une serie a faire apres l'index i (puis depuis le debut), ou nil : tout est fait
  func prochain(apres i: Int) -> Int? {
    guard !exos.isEmpty else { return nil }
    for k in 1...exos.count {
      let j = (i + k) % exos.count
      if exos[j].faites < exos[j].total { return j }
    }
    return nil
  }

  /// Vrai quand toutes les series sont faites
  var fini: Bool { exos.allSatisfy { $0.faites >= $0.total } }

  /// Libelle de l'effort en cours (« Squat, série 3 sur 4 »), ou « Séance bouclée »
  var libelleEffort: String {
    guard !exos.isEmpty else { return t.fini }
    let e = exos[min(max(cur, 0), exos.count - 1)]
    if e.faites >= e.total { return t.fini }
    return TexteIle.remplir(t.serie, [e.nom, String(e.faites + 1), String(e.total)])
  }
}

/// Ce que l'ile affiche : un repos fini (date passee ou activite perimee) redevient l'effort de la seance
@available(iOS 16.1, *)
enum AfficheIle {
  static func etat(_ s: ChronoAttributs.ContentState, perime: Bool) -> ChronoAttributs.ContentState {
    guard s.phase == "repos", perime || s.fin <= Date(), let plan = PlanIle.lire(s.plan) else { return s }
    var r = s
    let debut = Date(timeIntervalSince1970: plan.debutMs / 1000)
    r.phase = "effort"
    r.libelle = plan.libelleEffort
    r.debut = debut
    r.fin = debut.addingTimeInterval(6 * 3600)
    r.monte = true
    r.enPause = false
    r.figeS = max(0, Int(Date().timeIntervalSince(debut)))
    return r
  }
}

enum TexteIle {
  static func remplir(_ modele: String, _ valeurs: [String]) -> String {
    var r = modele
    for (i, v) in valeurs.enumerated() { r = r.replacingOccurrences(of: "{\(i)}", with: v) }
    return r
  }
}

@available(iOS 16.2, *)
enum SeanceIle {
  /// Notification de fin de repos programmee ici (l'app la retire a son retour, lib/v2/seance/rappelRepos.ts)
  static let idRappel = "yoroi.seance.ile.repos"

  static func serieFaite() async {
    guard let activite = Activity<ChronoAttributs>.activities.first else { return }
    var etat = activite.content.state
    guard var plan = PlanIle.lire(etat.plan), !plan.exos.isEmpty else { return }
    var i = min(max(plan.cur, 0), plan.exos.count - 1)
    if plan.exos[i].faites >= plan.exos[i].total {
      guard let j = plan.prochain(apres: i) else { return }
      i = j
    }
    plan.exos[i].faites += 1
    let maintenant = Date()
    plan.maj = (maintenant.timeIntervalSince1970 * 1000).rounded()
    GroupeYoroi.ajouterAction([
      "id": UUID().uuidString,
      "type": "serie",
      "exo": plan.exos[i].id,
      "at": plan.maj ?? 0,
      "source": "ile",
    ])
    let exo = plan.exos[i]
    if plan.fini {
      // seance bouclee : le temps de seance qui monte, plus de repos
      plan.cur = i
      let debut = Date(timeIntervalSince1970: plan.debutMs / 1000)
      etat.phase = "effort"
      etat.libelle = plan.t.fini
      etat.debut = debut
      etat.fin = debut.addingTimeInterval(6 * 3600)
      etat.monte = true
      etat.enPause = false
      etat.figeS = max(0, Int(maintenant.timeIntervalSince(debut)))
      etat.plan = plan.texte
      retirerRappels(titre: plan.t.reposFini)
    } else {
      let libelle: String
      if exo.faites < exo.total {
        plan.cur = i
        libelle = TexteIle.remplir(plan.t.ensuite, [exo.nom, String(exo.faites + 1)])
      } else if let j = plan.prochain(apres: i) {
        plan.cur = j
        libelle = TexteIle.remplir(plan.t.ensuiteExo, [plan.exos[j].nom])
      } else {
        libelle = plan.t.fini
      }
      let repos = TimeInterval(max(15, exo.repos))
      etat.phase = "repos"
      etat.libelle = libelle
      etat.debut = maintenant
      etat.fin = maintenant.addingTimeInterval(repos)
      etat.monte = false
      etat.enPause = false
      etat.figeS = Int(repos)
      etat.plan = plan.texte
      programmerRappel(dans: repos, titre: plan.t.reposFini, corps: libelle, plan: plan)
    }
    // repos : perime a sa fin, l'ile repasse alors sur l'effort toute seule (AfficheIle)
    await activite.update(ActivityContent(state: etat, staleDate: etat.phase == "repos" ? etat.fin : nil))
  }

  static func plus15() async {
    guard let activite = Activity<ChronoAttributs>.activities.first else { return }
    var etat = activite.content.state
    guard var plan = PlanIle.lire(etat.plan), etat.phase == "repos", etat.fin > Date() else { return }
    plan.maj = (Date().timeIntervalSince1970 * 1000).rounded()
    etat.plan = plan.texte
    GroupeYoroi.ajouterAction([
      "id": UUID().uuidString,
      "type": "repos15",
      "at": plan.maj ?? 0,
      "source": "ile",
    ])
    etat.fin = etat.fin.addingTimeInterval(15)
    etat.figeS += 15
    programmerRappel(dans: etat.fin.timeIntervalSinceNow, titre: plan.t.reposFini, corps: etat.libelle, plan: plan)
    await activite.update(ActivityContent(state: etat, staleDate: etat.fin))
  }

  /// Retire les rappels de fin de repos deja programmes (ceux de l'app ont le meme titre) puis programme le nouveau.
  /// Rien si l'app n'a pas autorise le rappel (plan.rappel : notifications permises, « Repos terminé » actif).
  private static func programmerRappel(dans secondes: TimeInterval, titre: String, corps: String, plan: PlanIle) {
    retirerRappels(titre: titre)
    guard plan.rappel == true, secondes >= 2 else { return }
    let contenu = UNMutableNotificationContent()
    contenu.title = titre
    contenu.body = corps
    contenu.sound = .default
    contenu.userInfo = ["type": "rest_finished"]
    let declencheur = UNTimeIntervalNotificationTrigger(timeInterval: secondes, repeats: false)
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: idRappel, content: contenu, trigger: declencheur), withCompletionHandler: nil)
  }

  private static func retirerRappels(titre: String) {
    let centre = UNUserNotificationCenter.current()
    centre.removePendingNotificationRequests(withIdentifiers: [idRappel])
    centre.getPendingNotificationRequests { liste in
      let ids = liste.filter { $0.content.title == titre && $0.identifier != idRappel }.map { $0.identifier }
      if !ids.isEmpty { centre.removePendingNotificationRequests(withIdentifiers: ids) }
    }
  }
}

@available(iOS 17.0, *)
struct SerieFaiteIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Série faite"
  static let description = IntentDescription("Valide la série en cours de ta séance Yoroi et lance le repos.")

  func perform() async throws -> some IntentResult {
    await SeanceIle.serieFaite()
    return .result()
  }
}

@available(iOS 17.0, *)
struct ReposPlus15Intent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Repos plus 15 secondes"
  static let description = IntentDescription("Ajoute 15 secondes au repos en cours de ta séance Yoroi.")

  func perform() async throws -> some IntentResult {
    await SeanceIle.plus15()
    return .result()
  }
}
