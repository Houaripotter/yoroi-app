import Foundation

// Donnees d'exemple des maquettes (vendredi 30 octobre 2026, 17 h, programme Push Pull + Upper Lower) :
// la galerie des widgets tant que l'app n'a rien ecrit, et les apercus #Preview de Xcode.
// Jamais montrees a la place de tes vraies donnees.

enum ExempleGrands {
  static let instantane: InstantaneG = {
    let jour = "2026-10-30"
    let semaine = SemaineG(
      lundi: "2026-10-26",
      jours: [
        JourSemG(date: "2026-10-26", index: 0, fait: true, aujourdhui: false, futur: false, sticker: "musculation", nom: "Push", minutes: 62),
        JourSemG(date: "2026-10-27", index: 1, fait: true, aujourdhui: false, futur: false, sticker: "musculation", nom: "Pull", minutes: 58),
        JourSemG(date: "2026-10-28", index: 2, fait: true, aujourdhui: false, futur: false, sticker: "jjb", nom: "Jiu jitsu brésilien", minutes: 90),
        JourSemG(date: "2026-10-29", index: 3, fait: true, aujourdhui: false, futur: false, sticker: "musculation", nom: "Upper", minutes: 65),
        JourSemG(date: "2026-10-30", index: 4, fait: false, aujourdhui: true, futur: false, sticker: "musculation", prevu: "Lower"),
        JourSemG(date: "2026-10-31", index: 5, fait: false, aujourdhui: false, futur: true),
        JourSemG(date: "2026-11-01", index: 6, fait: false, aujourdhui: false, futur: true),
      ],
      faites: 4, objectif: 5, minutes: 275, kilosKg: 10_200, series: 54, rounds: 6, serieSemaines: 6,
      minutesParJour: [MinJourG(index: 0, minutes: 62), MinJourG(index: 1, minutes: 58), MinJourG(index: 2, minutes: 90), MinJourG(index: 3, minutes: 65)],
      kilosParSeance: [KgSeanceG(nom: "Push", kg: 3900), KgSeanceG(nom: "Pull", kg: 2800), KgSeanceG(nom: "Upper", kg: 3500)],
      combat: CombatSemG(nom: "JJB", date: "2026-10-28", minutes: 90)
    )
    let brut: [(Int, Double)] = [
      (0, 87.0), (3, 86.8), (7, 86.9), (10, 86.6), (14, 86.4), (17, 86.5), (21, 86.2), (24, 86.1), (28, 86.3),
      (31, 85.9), (35, 85.8), (38, 86.0), (42, 85.7), (45, 85.6), (49, 85.8), (52, 85.5), (56, 85.4), (59, 85.6),
      (63, 85.3), (66, 85.5), (68, 85.4), (71, 85.1), (74, 84.6), (78, 85.0), (82, 85.3), (85, 84.9), (89, 84.6),
    ]
    var tendance = brut[0].1
    let points = brut.map { p -> PointG in
      tendance += 0.3 * (p.1 - tendance)
      return PointG(d: p.0, kg: p.1, t: (tendance * 100).rounded() / 100)
    }
    let corps = CorpsG(
      dernierKg: 84.6, derniereDate: "2026-10-29", departKg: 91.2, departDate: "2026-03-02", objectifKg: 80, part: 0.59,
      paliers: [PalierG(kg: 88.4, franchi: true), PalierG(kg: 85.6, franchi: true), PalierG(kg: 82.8, franchi: false), PalierG(kg: 80, franchi: false)],
      tendance7: -0.7, ecart90: -2.4, pesees: 38, points: points, debutFenetre: "2026-08-01", arrivee: "2027-04-15"
    )
    let forme = FormeG(
      pas: 6240, pasObjectif: 8000, exercice: 22, exerciceObjectif: 30, kcal: 310, kcalObjectif: 500,
      sommeil: SommeilG(minutes: 432, coucher: "23:40", lever: "06:52"), sommeilObjectifMin: 480,
      recup: RecupG(score: 78, titre: "En forme", conseil: "Tu peux t’entraîner normalement."),
      fcRepos: FcG(bpm: 54, moyenne: 56), seances7: 4, hier: HierG(nom: "Upper", minutes: 65)
    )
    let dojo = DojoG(
      rang: "Rōnin", rangIndex: 3, rangs: ["Ashigaru", "Bushi", "Samouraï", "Rōnin", "Shōgun"], xp: 9420, suivant: "Shōgun", xpSuivant: 18000,
      xpRestant: 8580, part: 0.22, serieJours: 12, semainesTenues: 6, coffre: CoffreG(etat: "pret", grand: false, grandDans: 2),
      recompense: RecompenseG(piece: "Armure d’apparat noir et or", rang: "Shōgun"), xpSemaine: 120, recordsMois: 3, personnage: true
    )
    let seance = SeanceG(
      titre: "Lower : jambes", programme: "Push Pull + Upper Lower", aujourdhui: true, genre: "muscu", minutes: 60,
      muscles: ["Quadriceps", "Ischios", "Fessiers", "Mollets", "Abdos"],
      exos: [
        ExoG(nom: "Squat Barre Libre", series: 4, repsMin: 6, repsMax: 10, secondes: false, chargeKg: 105, monte: true),
        ExoG(nom: "Deadlift Roumain", series: 3, repsMin: 8, repsMax: 10, secondes: false, chargeKg: 80, monte: false),
        ExoG(nom: "Leg Curl Assis", series: 3, repsMin: 10, repsMax: 12, secondes: false, chargeKg: 40, monte: false),
        ExoG(nom: "Leg Extension", series: 2, repsMin: 10, repsMax: 15, secondes: false, chargeKg: 45, monte: false),
        ExoG(nom: "Mollets Debout (Machine)", series: 3, repsMin: 10, repsMax: 15, secondes: false, chargeKg: 60, monte: false),
        ExoG(nom: "Pallof Press", series: 2, repsMin: 10, repsMax: 12, secondes: false, chargeKg: 15, monte: false),
      ],
      cardio: CardioG(type: "marche_inclinee", minutes: 30, texte: "30 min de marche inclinée", sticker: "sport_marche"),
      derniere: DerniereG(date: "2026-10-23", minutes: 62, kilosKg: 10_300),
      seriesParGroupe: [GroupeSeriesG(nom: "Jambes", series: 12), GroupeSeriesG(nom: "Abdos", series: 2)]
    )
    let records = [
      RecordG(titre: "Développé couché", kind: "force", valeur: 100, avant: 95, date: "2026-10-14", sticker: "record_force", serie: SerieRecG(kg: 85, reps: 5)),
      RecordG(titre: "Tractions", kind: "reps", valeur: 12, avant: 9, date: "2026-10-13", sticker: "record", serie: nil),
      RecordG(titre: "Plus longue distance", kind: "distance", valeur: 21.1, avant: 15.4, date: "2026-10-11", sticker: "record_endurance", serie: nil),
      RecordG(titre: "Meilleure allure", kind: "allure", valeur: 292, avant: 306, date: "2026-10-11", sticker: "record", serie: nil),
    ]
    var cal: [String: [String]] = [:]
    for d in [2, 7, 14, 19, 21, 26, 27, 29] { cal[String(d), default: []].append("musculation") }
    for d in [7, 8, 13, 14, 20, 22, 28] { cal[String(d), default: []].append("jjb") }
    for d in [4, 11, 18, 25] { cal[String(d), default: []].append("course") }
    let mois = MoisG(
      annee: 2026, mois: 10, premier: 3, jours: 31, aujourdhui: 30, calendrier: cal, seances: 19, joursActifs: 17, minutes: 1410,
      sports: [SportMoisG(sticker: "musculation", nom: "Musculation", seances: 8), SportMoisG(sticker: "jjb", nom: "Jiu jitsu brésilien", seances: 7), SportMoisG(sticker: "course", nom: "Course à pied", seances: 4)],
      distanceKm: 38.4, kilosKg: 96_400, rounds: 42, ecartMoisPrecedent: 1
    )
    let muscles = MusclesG(
      groupes: [
        GroupeMuscleG(nom: "Dos", series: 17, calques: ["dos_dos", "dos_trapezes", "face_trapezes"]),
        GroupeMuscleG(nom: "Pectoraux", series: 12, calques: ["face_pectoraux"]),
        GroupeMuscleG(nom: "Épaules", series: 11, calques: ["face_epaules", "dos_epaules"]),
        GroupeMuscleG(nom: "Bras", series: 14, calques: ["face_bras", "dos_bras", "face_avantbras", "dos_avantbras"]),
        GroupeMuscleG(nom: "Jambes", series: 0, calques: ["face_quadriceps", "dos_ischios", "dos_fessiers", "face_mollets", "dos_mollets"]),
        GroupeMuscleG(nom: "Abdos", series: 0, calques: ["face_abdos"]),
      ],
      total: 54, seances: 3,
      parSeance: [SeanceMuscleG(nom: "Push", date: "2026-10-26", series: 18), SeanceMuscleG(nom: "Pull", date: "2026-10-27", series: 16), SeanceMuscleG(nom: "Upper", date: "2026-10-29", series: 20)]
    )
    return InstantaneG(
      v: 1, genere: "2026-10-30T16:00:00.000Z", jour: jour, unite: "kg", semaine: semaine, corps: corps, forme: forme,
      eau: EauG(litres: 1.5, objectif: 2.5, verres: 6, verresObjectif: 10), dojo: dojo, seance: seance, records: records, mois: mois, muscles: muscles
    )
  }()
}
