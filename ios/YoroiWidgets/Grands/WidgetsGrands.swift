import SwiftUI
import WidgetKit

// Les 8 grands widgets YOROI (31 octobre 2026), en grand et tres grand seulement : pense pour le bureau du Mac
// (app iPad sur Mac Apple Silicon) et l'iPad. Sur iPhone, seul le grand existe (le tres grand n'y est pas propose).
// Donnees : lib/v2/widgetsGrands (app) vers yoroi_widgets_grands_v1.json (App Group), lu par ModeleGrands.swift.
// Declares dans le bundle GrandsYoroi, a brancher une fois dans YoroiWidgetsBundle (voir ETAPES_XCODE.md).

struct WidgetGrandSemaine: Widget {
  let kind = "YoroiGrandSemaine"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.semaine) { _ in VueSemaineG(entree: e) }
    }
    .configurationDisplayName(gL("Ma semaine"))
    .description(gL("Tes 7 jours, tes séances validées, tes chiffres et ta séance du jour."))
    .grandsSeulement()
  }
}

struct WidgetGrandCorps: Widget {
  let kind = "YoroiGrandCorps"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.poids) { _ in VueCorpsG(entree: e) }
    }
    .configurationDisplayName(gL("Mon corps"))
    .description(gL("Ta dernière pesée, ta courbe des 3 derniers mois et le chemin vers ton objectif."))
    .grandsSeulement()
  }
}

struct WidgetGrandForme: Widget {
  let kind = "YoroiGrandForme"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.accueil) { _ in VueFormeG(entree: e) }
    }
    .configurationDisplayName(gL("Ma forme du jour"))
    .description(gL("Tes anneaux, ta récupération, ton sommeil, ta fréquence cardiaque au repos et ton eau."))
    .grandsSeulement()
  }
}

struct WidgetGrandDojo: Widget {
  let kind = "YoroiGrandDojo"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.dojo) { _ in VueDojoG(entree: e) }
    }
    .configurationDisplayName(gL("Mon dojo"))
    .description(gL("Ton personnage, ton rang, ton XP, ta série et ton coffre du jour."))
    .grandsSeulement()
  }
}

struct WidgetGrandSeance: Widget {
  let kind = "YoroiGrandSeance"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.coach) { _ in VueSeanceG(entree: e) }
    }
    .configurationDisplayName(gL("Ma prochaine séance"))
    .description(gL("La séance de ton programme, ses exercices, ses charges et ton cardio."))
    .grandsSeulement()
  }
}

struct WidgetGrandRecords: Widget {
  let kind = "YoroiGrandRecords"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.semaine) { _ in VueRecordsG(entree: e) }
    }
    .configurationDisplayName(gL("Mes records"))
    .description(gL("Tes 4 derniers records, la marque d’avant et ce que tu as gagné."))
    .grandsSeulement()
  }
}

struct WidgetGrandMois: Widget {
  let kind = "YoroiGrandMois"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.semaine) { _ in VueMoisG(entree: e) }
    }
    .configurationDisplayName(gL("Mon mois"))
    .description(gL("Ton calendrier du mois, un sticker par séance, et tes chiffres."))
    .grandsSeulement()
  }
}

struct WidgetGrandMuscles: Widget {
  let kind = "YoroiGrandMuscles"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FournisseurGrands()) { e in
      RacineG(entree: e, lien: LiensGrands.semaine) { _ in VueMusclesG(entree: e) }
    }
    .configurationDisplayName(gL("Muscles de la semaine"))
    .description(gL("Tes séries par groupe de muscles, exercice par exercice, et le repère des 10 séries."))
    .grandsSeulement()
  }
}

/// Les 8 grands widgets. Pas de @main ici : YoroiWidgetsBundle les ajoute avec GrandsYoroi().body
struct GrandsYoroi: WidgetBundle {
  var body: some Widget {
    WidgetGrandSemaine()
    WidgetGrandCorps()
    WidgetGrandForme()
    WidgetGrandDojo()
    WidgetGrandSeance()
    WidgetGrandRecords()
    WidgetGrandMois()
    WidgetGrandMuscles()
  }
}

// MARK: - Apercus Xcode (donnees d'exemple des maquettes, puis l'etat vide)

private let videG = EntreeGrands(date: Date(), inst: nil, frais: false, eauLitres: nil, scene: nil, personnage: nil)

#Preview("Ma semaine, très grand", as: .systemExtraLarge) { WidgetGrandSemaine() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Ma semaine, grand", as: .systemLarge) { WidgetGrandSemaine() } timeline: { EntreeGrands.exemple() }
#Preview("Mon corps, très grand", as: .systemExtraLarge) { WidgetGrandCorps() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Mon corps, grand", as: .systemLarge) { WidgetGrandCorps() } timeline: { EntreeGrands.exemple() }
#Preview("Ma forme du jour, très grand", as: .systemExtraLarge) { WidgetGrandForme() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Ma forme du jour, grand", as: .systemLarge) { WidgetGrandForme() } timeline: { EntreeGrands.exemple() }
#Preview("Mon dojo, très grand", as: .systemExtraLarge) { WidgetGrandDojo() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Mon dojo, grand", as: .systemLarge) { WidgetGrandDojo() } timeline: { EntreeGrands.exemple() }
#Preview("Ma prochaine séance, très grand", as: .systemExtraLarge) { WidgetGrandSeance() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Ma prochaine séance, grand", as: .systemLarge) { WidgetGrandSeance() } timeline: { EntreeGrands.exemple() }
#Preview("Mes records, très grand", as: .systemExtraLarge) { WidgetGrandRecords() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Mes records, grand", as: .systemLarge) { WidgetGrandRecords() } timeline: { EntreeGrands.exemple() }
#Preview("Mon mois, très grand", as: .systemExtraLarge) { WidgetGrandMois() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Mon mois, grand", as: .systemLarge) { WidgetGrandMois() } timeline: { EntreeGrands.exemple() }
#Preview("Muscles de la semaine, très grand", as: .systemExtraLarge) { WidgetGrandMuscles() } timeline: { EntreeGrands.exemple(); videG }
#Preview("Muscles de la semaine, grand", as: .systemLarge) { WidgetGrandMuscles() } timeline: { EntreeGrands.exemple() }
