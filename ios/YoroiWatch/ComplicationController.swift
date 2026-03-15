// ============================================
// YOROI WATCH - COMPLICATIONS CADRAN
// ============================================
// 13 complications disponibles :
//   • Fréquence Cardiaque (FC)        → jauge dégradé bleu marine → rose
//   • SpO2 – Oxygène Sang             → jauge dégradé bleu marine → bleu ciel
//   • Timer YOROI                     → décompte natif OS (sans code en veille)
//   • Carnet – Série consécutive      → streak d'entraînement
//   • Pas du Jour                     → progression jauge
//   • Hydratation                     → litre / objectif
//   • Sommeil                         → heures + qualité
//   • Poids                           → progression objectif
//   • Calories Actives                → kcal / objectif
//   • Distance                        → km / objectif
//   • Rang YOROI                      → niveau + titre
//   • FC au Repos                     → jauge dégradé bleu → vert
//   • Fréquence Respiratoire (FR)     → rpm zone normale
// Familles supportées :
//   graphicCircular, graphicCorner,
//   graphicRectangular, utilitarianSmall, modularSmall
//
// Navigation : chaque complication ouvre l'onglet dédié au tap.
// Palette : dégradés bi-couleurs élégants — pas de couleurs criardes.
// ============================================

import ClockKit
import SwiftUI

// MARK: - Palette de couleurs Yoroi
// Dégradés bi-couleurs : foncé (début) → clair (fin)
private extension UIColor {

  // Rouge / FC (fréquence cardiaque, calories)
  static let crimson   = UIColor(red: 0.72, green: 0.05, blue: 0.10, alpha: 1)  // rouge cramoisi
  static let coral     = UIColor(red: 1.00, green: 0.42, blue: 0.22, alpha: 1)  // corail chaud

  // Bleu-violet / SpO2 (le dégradé préféré)
  static let deepPurple   = UIColor(red: 0.22, green: 0.08, blue: 0.65, alpha: 1)  // violet foncé
  static let electricBlue = UIColor(red: 0.48, green: 0.62, blue: 1.00, alpha: 1)  // bleu électrique

  // Bleu / Timer, Hydratation
  static let navyBlue  = UIColor(red: 0.06, green: 0.18, blue: 0.55, alpha: 1)  // bleu profond
  static let royalBlue = UIColor(red: 0.20, green: 0.50, blue: 1.00, alpha: 1)  // bleu royal
  static let cyan      = UIColor(red: 0.25, green: 0.85, blue: 1.00, alpha: 1)  // cyan vif
  static let oceanBlue = UIColor(red: 0.05, green: 0.32, blue: 0.65, alpha: 1)  // bleu océan
  static let aqua      = UIColor(red: 0.20, green: 0.90, blue: 0.95, alpha: 1)  // aqua

  // Bleu nuit / Sommeil
  static let midnightBlue = UIColor(red: 0.08, green: 0.06, blue: 0.38, alpha: 1) // bleu nuit
  static let lavender     = UIColor(red: 0.68, green: 0.55, blue: 1.00, alpha: 1) // lavande douce

  // Vert / Pas, Distance, FR, FC repos
  static let forestGreen = UIColor(red: 0.04, green: 0.38, blue: 0.22, alpha: 1)  // vert forêt
  static let mint        = UIColor(red: 0.28, green: 0.95, blue: 0.65, alpha: 1)  // menthe vive
  static let limeGreen   = UIColor(red: 0.30, green: 0.88, blue: 0.35, alpha: 1)  // lime
  static let tealBlue    = UIColor(red: 0.05, green: 0.48, blue: 0.52, alpha: 1)  // teal

  // Orange / Haltère, Poids, Carnet, Rang
  static let deepOrange = UIColor(red: 0.72, green: 0.28, blue: 0.04, alpha: 1)  // orange brûlé
  static let orange     = UIColor(red: 1.00, green: 0.55, blue: 0.12, alpha: 1)  // orange vif
  static let amber      = UIColor(red: 1.00, green: 0.75, blue: 0.12, alpha: 1)  // ambre / or

  // Acier (timer pause)
  static let steel  = UIColor(red: 0.30, green: 0.35, blue: 0.55, alpha: 1)
  static let silver = UIColor(red: 0.60, green: 0.65, blue: 0.78, alpha: 1)

  // Aliases supprimés (garde compatibilité)
  static let deepIndigo = UIColor(red: 0.22, green: 0.08, blue: 0.65, alpha: 1)  // = deepPurple
  static let deepCoral  = UIColor(red: 0.72, green: 0.05, blue: 0.10, alpha: 1)  // = crimson
  static let skyBlue    = UIColor(red: 0.48, green: 0.62, blue: 1.00, alpha: 1)  // = electricBlue
  static let blushPink  = UIColor(red: 1.00, green: 0.42, blue: 0.22, alpha: 1)  // = coral
  static let deepRose   = UIColor(red: 0.72, green: 0.05, blue: 0.10, alpha: 1)  // = crimson
}

// MARK: - Controller

class ComplicationController: NSObject, CLKComplicationDataSource {

  // MARK: - Clés UserDefaults (synchronisées depuis WatchSessionManager)

  private let ud = UserDefaults.standard
  private var heartRate: Int        { ud.integer(forKey: "yoroi_heartRate") }
  private var heartRateMin: Int     { ud.integer(forKey: "yoroi_heartRateMin") }
  private var heartRateMax: Int     { ud.integer(forKey: "yoroi_heartRateMax") }
  private var restingHR: Int        { ud.integer(forKey: "yoroi_restingHR") }
  private var spo2: Int             { ud.integer(forKey: "yoroi_spo2") }
  private var spo2Min: Int          { ud.integer(forKey: "yoroi_spo2Min") }
  private var spo2Max: Int          { ud.integer(forKey: "yoroi_spo2Max") }
  private var respiratoryRate: Int  { ud.integer(forKey: "yoroi_respiratoryRate") }
  private var localSteps: Int     { ud.integer(forKey: "yoroi_steps") }
  private var stepsGoal: Int      { let v = ud.integer(forKey: "yoroi_stepsGoal"); return v > 0 ? v : 8000 }
  private var hydration: Int      { ud.integer(forKey: "yoroi_hydration") }
  private var hydrationGoal: Int  { let v = ud.integer(forKey: "yoroi_hydrationGoal"); return v > 0 ? v : 3000 }
  private var streak: Int         { ud.integer(forKey: "yoroi_streak") }
  private var timerRemaining: Int  { ud.integer(forKey: "yoroi_timerRemaining") }
  private var timerTotal: Int      { let v = ud.integer(forKey: "yoroi_timerTotal"); return v > 0 ? v : 90 }
  private var timerRunning: Bool   { ud.bool(forKey: "yoroi_timerRunning") }
  private var timerEndDate: Date?  { ud.object(forKey: "yoroi_timerEndDate") as? Date }
  private var sleepMinutes: Int   { ud.integer(forKey: "yoroi_sleepMinutes") }
  private var sleepGoal: Int      { let v = ud.integer(forKey: "yoroi_sleepGoal"); return v > 0 ? v : 480 }
  private var sleepQuality: Int   { ud.integer(forKey: "yoroi_sleepQuality") }
  private var currentWeight: Double { ud.double(forKey: "yoroi_weight") }
  private var targetWeight: Double  { ud.double(forKey: "yoroi_targetWeight") }
  private var startWeight: Double   { ud.double(forKey: "yoroi_startWeight") }
  private var calories: Int       { ud.integer(forKey: "yoroi_calories") }
  private var caloriesGoal: Int   { let v = ud.integer(forKey: "yoroi_caloriesGoal"); return v > 0 ? v : 500 }
  private var distance: Double    { ud.double(forKey: "yoroi_distance") }
  private var distanceGoal: Double { let v = ud.double(forKey: "yoroi_distanceGoal"); return v > 0 ? v : 5.0 }
  private var userLevel: Int      { let v = ud.integer(forKey: "yoroi_level"); return v > 0 ? v : 1 }
  private var userRank: String    { ud.string(forKey: "yoroi_rank") ?? "Recrue" }
  private var carnetTotalPRs: Int   { ud.integer(forKey: "yoroi_carnet_totalPRs") }
  private var carnetLastExercise: String { ud.string(forKey: "yoroi_carnet_lastExercise") ?? "" }
  private var carnetLastPR: Double  { ud.double(forKey: "yoroi_carnet_lastPR") }
  private var carnetLastUnit: String { ud.string(forKey: "yoroi_carnet_lastUnit") ?? "kg" }

  // MARK: - Onglets de navigation
  // Tab 0: Dashboard  Tab 1: Poids  Tab 2: Hydratation  Tab 3: Sommeil
  // Tab 4: Séances    Tab 5: Carnet Tab 6: Compétition  Tab 7: Réglages
  private enum Tab {
    static let dashboard   = 0
    static let weight      = 1
    static let hydration   = 2
    static let sleep       = 3
    static let workout     = 4
    static let carnet      = 5
    static let competition = 6
  }

  // MARK: - Descripteurs

  func getComplicationDescriptors(handler: @escaping ([CLKComplicationDescriptor]) -> Void) {
    let descriptors: [CLKComplicationDescriptor] = [
      CLKComplicationDescriptor(
        identifier: "yoroi.heartrate",
        displayName: "FC – Fréquence Cardiaque",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall],
        userInfo: ["tabIndex": Tab.dashboard] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.spo2",
        displayName: "SpO2 – Oxygène Sang",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall],
        userInfo: ["tabIndex": Tab.dashboard] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.timer",
        displayName: "Timer YOROI",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall],
        userInfo: ["tabIndex": Tab.dashboard, "openTimer": true] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.carnet",
        displayName: "Carnet – Série",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .modularSmall],
        userInfo: ["tabIndex": Tab.carnet] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.steps",
        displayName: "Pas du Jour",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall],
        userInfo: ["tabIndex": Tab.dashboard] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.hydration",
        displayName: "Hydratation",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall],
        userInfo: ["tabIndex": Tab.hydration] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.sleep",
        displayName: "Sommeil",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .modularSmall],
        userInfo: ["tabIndex": Tab.sleep] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.weight",
        displayName: "Poids",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall],
        userInfo: ["tabIndex": Tab.weight] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.calories",
        displayName: "Calories Actives",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall],
        userInfo: ["tabIndex": Tab.workout] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.distance",
        displayName: "Distance",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall],
        userInfo: ["tabIndex": Tab.workout] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.rank",
        displayName: "Rang YOROI",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .modularSmall],
        userInfo: ["tabIndex": Tab.competition] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.restinghr",
        displayName: "FC au Repos",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall],
        userInfo: ["tabIndex": Tab.dashboard] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.respiratory",
        displayName: "FR – Fréquence Respiratoire",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall],
        userInfo: ["tabIndex": Tab.dashboard] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.addexercice",
        displayName: "Carnet – Ajouter une série",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall],
        userInfo: ["tabIndex": Tab.carnet] as [AnyHashable: Any]
      ),
    ]
    handler(descriptors)
  }

  // MARK: - Timeline

  func getCurrentTimelineEntry(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void
  ) {
    if let template = makeTemplate(for: complication) {
      handler(CLKComplicationTimelineEntry(date: Date(), complicationTemplate: template))
    } else {
      handler(nil)
    }
  }

  func getTimelineEndDate(
    for complication: CLKComplication,
    withHandler handler: @escaping (Date?) -> Void
  ) {
    handler(nil)
  }

  func getPrivacyBehavior(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationPrivacyBehavior) -> Void
  ) {
    handler(.showOnLockScreen)
  }

  // Aperçu dans l'éditeur de cadran — données d'exemple
  func getLocalizableSampleTemplate(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationTemplate?) -> Void
  ) {
    handler(makeSampleTemplate(for: complication))
  }

  private func makeSampleTemplate(for complication: CLKComplication) -> CLKComplicationTemplate? {
    let family = complication.family
    switch complication.identifier {
    case "yoroi.heartrate":
      return sampleCircularGauge(family: family, center: "72", bottom: "BPM",
                                  start: .crimson, end: .coral, fill: 0.4,
                                  body1: "72 BPM", body2: "Zone normale",
                                  flatText: "72 bpm", header: "Fréquence Cardiaque")
    case "yoroi.spo2":
      return sampleCircularGauge(family: family, center: "98", bottom: "%",
                                  start: .deepPurple, end: .electricBlue, fill: 0.8,
                                  body1: "98 %", body2: "Normal",
                                  flatText: "98%", header: "Oxygène Sanguin")
    case "yoroi.steps":
      return sampleCircularGauge(family: family, center: "5.2k", bottom: "/8k PAS",
                                  start: .forestGreen, end: .mint, fill: 0.65,
                                  body1: "5 200 pas", body2: "65 % de l'objectif",
                                  flatText: "5.2k", header: "Pas du Jour")
    case "yoroi.hydration":
      return sampleCircularGauge(family: family, center: "1.5", bottom: "/3.0L",
                                  start: .oceanBlue, end: .aqua, fill: 0.5,
                                  body1: "1.5L", body2: "50 % de l'objectif",
                                  flatText: "1.5L", header: "Hydratation")
    case "yoroi.sleep":
      return sampleSleepTemplate(family: family)
    case "yoroi.weight":
      return sampleWeightTemplate(family: family)
    case "yoroi.calories":
      return sampleCircularGauge(family: family, center: "312", bottom: "/500 kcal",
                                  start: .crimson, end: .orange, fill: 0.62,
                                  body1: "312 kcal", body2: "62 % de l'objectif",
                                  flatText: "312 kcal", header: "Calories Actives")
    case "yoroi.distance":
      return sampleCircularGauge(family: family, center: "3.2", bottom: "/5 km",
                                  start: .forestGreen, end: .mint, fill: 0.64,
                                  body1: "3.2 km", body2: "64 % de l'objectif",
                                  flatText: "3.2 km", header: "Distance")
    case "yoroi.rank":
      return sampleRankTemplate(family: family)
    case "yoroi.carnet":
      return sampleCarnetTemplate(family: family)
    case "yoroi.restinghr":
      return sampleCircularGauge(family: family, center: "58", bottom: "bpm",
                                  start: .tealBlue, end: .mint, fill: 0.45,
                                  body1: "58 BPM", body2: "Normal",
                                  flatText: "58 bpm", header: "FC au Repos")
    case "yoroi.respiratory":
      return sampleCircularGauge(family: family, center: "15", bottom: "rpm",
                                  start: .forestGreen, end: .limeGreen, fill: 0.55,
                                  body1: "15 rpm", body2: "Zone normale",
                                  flatText: "15 rpm", header: "Fréquence Respiratoire")
    case "yoroi.timer":
      return sampleTimerTemplate(family: family)
    case "yoroi.addexercice":
      return sampleAddExerciceTemplate(family: family)
    default:
      return nil
    }
  }

  // Helper générique pour les jauges circulaires avec données d'exemple
  private func sampleCircularGauge(
    family: CLKComplicationFamily,
    center: String, bottom: String,
    start: UIColor, end: UIColor, fill: Float,
    body1: String, body2: String,
    flatText: String, header: String
  ) -> CLKComplicationTemplate? {
    let gauge = elegantGauge(from: start, to: end, fill: fill)
    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: center, icon: "circle.fill", fill: CGFloat(fill)))
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "\(header)  \(center)", shortText: header)
      t.gaugeProvider = gauge
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: header)
      t.body1TextProvider = CLKSimpleTextProvider(text: body1)
      t.body2TextProvider = CLKSimpleTextProvider(text: body2)
      return t
    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: flatText, shortText: center)
      return t
    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: header)
      t.line2TextProvider = CLKSimpleTextProvider(text: center)
      return t
    default: return nil
    }
  }

  private func sampleSleepTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let gauge = elegantGauge(from: .midnightBlue, to: .lavender, fill: 0.875)
    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: "7h", icon: "moon.fill", fill: 0.875))
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Sommeil  7h", shortText: "Sommeil")
      t.gaugeProvider = gauge
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Sommeil")
      t.body1TextProvider = CLKSimpleTextProvider(text: "7h 00 · Qualité 82%")
      t.body2TextProvider = CLKSimpleTextProvider(text: "23:00 → 06:00")
      return t
    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "SOMMEIL")
      t.line2TextProvider = CLKSimpleTextProvider(text: "7h")
      return t
    default: return nil
    }
  }

  private func sampleWeightTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let gauge = elegantGauge(from: .deepOrange, to: .amber, fill: 0.6)
    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: "75", icon: "scalemass.fill", fill: 0.6))
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Poids  75 kg", shortText: "Poids")
      t.gaugeProvider = gauge
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Poids")
      t.body1TextProvider = CLKSimpleTextProvider(text: "75.0 kg")
      t.body2TextProvider = CLKSimpleTextProvider(text: "Objectif : 70 kg (60 %)")
      return t
    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "75 kg", shortText: "75")
      return t
    default: return nil
    }
  }

  private func sampleRankTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let gauge = elegantGauge(from: .deepOrange, to: .amber, fill: 0.3)
    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: "Nv5", icon: "star.fill", fill: 0.3))
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: "Niveau 5", shortText: "Niv.5")
      t.outerTextProvider = CLKSimpleTextProvider(text: "Rang YOROI", shortText: "YOROI")
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Rang YOROI")
      t.body1TextProvider = CLKSimpleTextProvider(text: "Niveau 5")
      t.body2TextProvider = CLKSimpleTextProvider(text: "Guerrier")
      return t
    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "NIV.")
      t.line2TextProvider = CLKSimpleTextProvider(text: "5")
      return t
    default: return nil
    }
  }

  private func sampleCarnetTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let gauge = elegantGauge(from: .deepOrange, to: .amber, fill: 0.5)
    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: "7j", icon: "dumbbell.fill", fill: 0.5))
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: "PR 120 kg", shortText: "7j")
      t.outerTextProvider = CLKSimpleTextProvider(text: "Squat", shortText: "Carnet")
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Carnet YOROI")
      t.body1TextProvider = CLKSimpleTextProvider(text: "PR 120 kg")
      t.body2TextProvider = CLKSimpleTextProvider(text: "7 jours de suite")
      return t
    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "CARNET")
      t.line2TextProvider = CLKSimpleTextProvider(text: "7j")
      return t
    default: return nil
    }
  }

  private func sampleTimerTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let gauge = elegantGauge(from: .navyBlue, to: .cyan, fill: 0.5)
    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: "1:30", icon: "timer", fill: 0.5))
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "TIMER", shortText: "TMR")
      t.gaugeProvider = gauge
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Timer YOROI")
      t.body1TextProvider = CLKSimpleTextProvider(text: "1:30")
      t.body2TextProvider = CLKSimpleTextProvider(text: "PAUSE")
      return t
    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "1:30", shortText: "1:30")
      return t
    default: return nil
    }
  }

  private func sampleAddExerciceTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let gauge = elegantGauge(from: .deepOrange, to: .orange, fill: 0.5)
    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeCarnetAddImage())
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Ajouter série", shortText: "+Série")
      t.gaugeProvider = gauge
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Carnet YOROI")
      t.body1TextProvider = CLKSimpleTextProvider(text: "+ Ajouter une série")
      t.body2TextProvider = CLKSimpleTextProvider(text: "Enregistre ton effort")
      return t
    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "+Série", shortText: "+")
      return t
    default: return nil
    }
  }

  // MARK: - Routeur principal

  private func makeTemplate(for complication: CLKComplication) -> CLKComplicationTemplate? {
    switch complication.identifier {
    case "yoroi.heartrate":  return heartRateTemplate(family: complication.family)
    case "yoroi.spo2":       return spo2Template(family: complication.family)
    case "yoroi.timer":      return timerTemplate(family: complication.family)
    case "yoroi.carnet":     return carnetTemplate(family: complication.family)
    case "yoroi.steps":      return stepsTemplate(family: complication.family)
    case "yoroi.hydration":  return hydrationTemplate(family: complication.family)
    case "yoroi.sleep":      return sleepTemplate(family: complication.family)
    case "yoroi.weight":     return weightTemplate(family: complication.family)
    case "yoroi.calories":   return caloriesTemplate(family: complication.family)
    case "yoroi.distance":   return distanceTemplate(family: complication.family)
    case "yoroi.rank":       return rankTemplate(family: complication.family)
    case "yoroi.restinghr":  return restingHRTemplate(family: complication.family)
    case "yoroi.respiratory": return respiratoryTemplate(family: complication.family)
    case "yoroi.addexercice": return addExerciceTemplate(family: complication.family)
    default:                  return nil
    }
  }

  // MARK: - Helper : jauge dégradé bi-couleur

  /// Construit un CLKSimpleGaugeProvider avec dégradé en dégradé des couleurs passées.
  private func elegantGauge(from startColor: UIColor, to endColor: UIColor, fill: Float) -> CLKSimpleGaugeProvider {
    let dark = UIColor(red: 0.07, green: 0.07, blue: 0.07, alpha: 1)
    return CLKSimpleGaugeProvider(
      style: .fill,
      gaugeColors: [dark, startColor, endColor],
      gaugeColorLocations: [0.0, 0.35, 1.0],
      fillFraction: max(0.02, fill)
    )
  }

  // MARK: - Fréquence Cardiaque
  // Dégradé : rouge cramoisi → corail

  private func heartRateTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let bpm    = heartRate
    let bpmMin = heartRateMin
    let bpmMax = heartRateMax
    let valStr = bpm > 0 ? "\(bpm)" : "--"
    let frac   = bpm > 0 ? Float(max(0, min(bpm - 40, 160))) / 160.0 : 0.0
    let zone   = bpm == 0 ? "En attente"
               : bpm < 60  ? "Bradycardie"
               : bpm <= 100 ? "Zone normale"
               : bpm <= 140 ? "Cardio"
               : "Effort max"
    let gauge  = elegantGauge(from: .crimson, to: .coral, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: valStr, icon: "heart.fill", fill: CGFloat(frac),
          valueColor:    UIColor(red: 1.00, green: 0.25, blue: 0.25, alpha: 1),
          arcStartColor: UIColor(red: 0.70, green: 0.04, blue: 0.04, alpha: 1),
          arcEndColor:   UIColor(red: 1.00, green: 0.35, blue: 0.35, alpha: 1),
          iconColor:     UIColor(red: 1.00, green: 0.18, blue: 0.18, alpha: 1)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(
        text: bpm > 0 ? "\(valStr) BPM" : "FC --",
        shortText: "FC"
      )
      t.gaugeProvider = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Fréquence Cardiaque")
      t.body1TextProvider  = CLKSimpleTextProvider(text: bpm > 0 ? "\(bpm) BPM" : "-- BPM")
      let rangeText = (bpmMin > 0 && bpmMax > 0)
        ? "Min \(bpmMin)  ·  Max \(bpmMax)"
        : zone
      t.body2TextProvider = CLKSimpleTextProvider(text: rangeText)
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: bpm > 0 ? "\(valStr) bpm" : "-- bpm", shortText: valStr)
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "FC")
      t.line2TextProvider = CLKSimpleTextProvider(text: valStr)
      return t

    default: return nil
    }
  }

  // MARK: - SpO2
  // Dégradé : violet foncé → bleu électrique

  private func spo2Template(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let val   = spo2
    let valStr = val > 0 ? "\(val)" : "--"
    let fullStr = val > 0 ? "\(val)%" : "--%"
    // Jauge : 90 % = 0, 100 % = 1
    let frac  = val > 0 ? Float(max(0, val - 90)) / 10.0 : 0.0
    let gauge = elegantGauge(from: .deepPurple, to: .electricBlue, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: valStr, icon: "lungs.fill", fill: CGFloat(frac),
          valueColor:    UIColor(red: 0.45, green: 0.75, blue: 1.00, alpha: 1),
          arcStartColor: UIColor(red: 0.04, green: 0.18, blue: 0.65, alpha: 1),
          arcEndColor:   UIColor(red: 0.20, green: 0.65, blue: 1.00, alpha: 1),
          iconColor:     UIColor(red: 0.30, green: 0.65, blue: 1.00, alpha: 1)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "SpO2  \(fullStr)", shortText: "SpO2")
      t.gaugeProvider     = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Oxygène Sanguin")
      t.body1TextProvider  = CLKSimpleTextProvider(text: val > 0 ? "\(val) %" : "-- %")
      t.body2TextProvider  = CLKSimpleTextProvider(
        text: val >= 95 ? "Normal" : val >= 90 ? "Faible" : "Critique"
      )
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: fullStr, shortText: fullStr)
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "SpO2")
      t.line2TextProvider = CLKSimpleTextProvider(text: fullStr)
      return t

    default: return nil
    }
  }

  // MARK: - Timer
  // Dégradé : bleu marine → bleu royal (en cours) / acier → argent (pause)

  private func timerTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let remaining  = timerRemaining
    let total      = timerTotal
    let running    = timerRunning
    let endDate    = timerEndDate ?? Date().addingTimeInterval(Double(remaining))
    let startDate  = endDate.addingTimeInterval(-Double(total))
    let mins       = remaining / 60
    let secs       = remaining % 60
    let timeText   = remaining > 0 ? String(format: "%d:%02d", mins, secs) : "0:00"
    let frac       = total > 0 ? Float(remaining) / Float(total) : 0.0
    let statusText = running ? "EN COURS" : (remaining > 0 ? "PAUSE" : "TIMER")

    let centerProvider: CLKTextProvider
    let gaugeProvider:  CLKGaugeProvider

    if running {
      centerProvider = CLKRelativeDateTextProvider(date: endDate, style: .timer, units: [.minute, .second])
      gaugeProvider  = CLKTimeIntervalGaugeProvider(
        style: .fill,
        gaugeColors: [.navyBlue, .cyan],
        gaugeColorLocations: [NSNumber(value: 0), NSNumber(value: 1)],
        start: startDate,
        end: endDate
      )
    } else {
      centerProvider = CLKSimpleTextProvider(text: timeText)
      gaugeProvider  = elegantGauge(from: .steel, to: .cyan, fill: frac)
    }

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: timeText, icon: "timer", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = running
        ? CLKRelativeDateTextProvider(date: endDate, style: .timer, units: [.minute, .second])
        : CLKSimpleTextProvider(text: statusText, shortText: "TMR")
      t.gaugeProvider = gaugeProvider
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Timer YOROI")
      t.body1TextProvider  = centerProvider
      t.body2TextProvider  = CLKSimpleTextProvider(text: statusText)
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = running
        ? CLKRelativeDateTextProvider(date: endDate, style: .timer, units: [.minute, .second])
        : CLKSimpleTextProvider(text: timeText, shortText: timeText)
      return t

    default: return nil
    }
  }

  // MARK: - Carnet d'entraînement
  // Dégradé : bleu marine → ambre (réussite / série)

  private func carnetTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let days         = streak
    let totalPRs     = carnetTotalPRs
    let lastExercise = carnetLastExercise
    let lastPR       = carnetLastPR
    let lastUnit     = carnetLastUnit

    // Textes adaptés selon données disponibles
    let streakShort  = days > 0 ? "\(days)j" : (totalPRs > 0 ? "\(totalPRs)" : "--")
    let streakLabel  = days > 0
      ? (days == 1 ? "1 jour de suite" : "\(days) jours de suite")
      : (totalPRs > 0 ? "\(totalPRs) exercices" : "Lance-toi !")

    // Dernier exercice : nom tronqué si trop long
    let exerciseName: String = {
      if lastExercise.isEmpty { return "Carnet" }
      let words = lastExercise.split(separator: " ")
      return words.count > 2
        ? words.prefix(2).joined(separator: " ")
        : lastExercise
    }()

    let prLabel: String = lastPR > 0
      ? String(format: lastPR.truncatingRemainder(dividingBy: 1) == 0
        ? "%.0f %@" : "%.1f %@", lastPR, lastUnit)
      : "Aucun PR"

    let frac = totalPRs > 0 ? Float(min(totalPRs, 50)) / 50.0 : 0.05
    let gauge = elegantGauge(from: .deepOrange, to: .amber, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: streakShort, icon: "dumbbell.fill", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      // Dernier exercice en outer, PR en inner
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: prLabel, shortText: streakShort)
      t.outerTextProvider = CLKSimpleTextProvider(
        text: lastExercise.isEmpty ? "Carnet YOROI" : exerciseName,
        shortText: "Carnet"
      )
      return t

    case .graphicRectangular:
      // Header : nom exercice / Body : PR + streak
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(
        text: lastExercise.isEmpty ? "Carnet YOROI" : exerciseName
      )
      t.body1TextProvider = CLKSimpleTextProvider(text: prLabel)
      t.body2TextProvider = CLKSimpleTextProvider(text: streakLabel)
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "CARNET")
      t.line2TextProvider = CLKSimpleTextProvider(text: streakShort)
      return t

    default: return nil
    }
  }

  // MARK: - Pas du Jour
  // Dégradé : bleu royal → menthe (activité / mouvement)

  private func stepsTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let steps = localSteps
    let goal  = stepsGoal
    let frac  = goal > 0 ? Float(min(steps, goal)) / Float(goal) : 0.0
    let text  = steps >= 1000 ? String(format: "%.1fk", Double(steps) / 1000.0) : "\(steps)"
    let gauge = elegantGauge(from: .forestGreen, to: .mint, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: text, icon: "figure.walk", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Pas  \(text)", shortText: "Pas")
      t.gaugeProvider     = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Pas du Jour")
      t.body1TextProvider  = CLKSimpleTextProvider(text: "\(steps) pas")
      let pct = goal > 0 ? Int(frac * 100) : 0
      t.body2TextProvider  = CLKSimpleTextProvider(text: "\(pct) % de l'objectif (\(goal))")
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: text, shortText: text)
      return t

    default: return nil
    }
  }

  // MARK: - Hydratation
  // Dégradé : bleu marine → bleu ciel (eau)

  private func hydrationTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let current = hydration
    let goal    = hydrationGoal
    let frac    = goal > 0 ? Float(min(current, goal)) / Float(goal) : 0.0
    let text    = current >= 1000 ? String(format: "%.1fL", Double(current) / 1000.0) : "\(current)ml"
    let gauge   = elegantGauge(from: .oceanBlue, to: .aqua, fill: frac)

    switch family {

    case .graphicCircular:
      let centerVal = current > 0
        ? (current >= 1000 ? String(format: "%.1f", Double(current) / 1000.0) : "\(current)")
        : "--"
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: centerVal, icon: "drop.fill", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Eau  \(text)", shortText: "Eau")
      t.gaugeProvider     = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Hydratation")
      t.body1TextProvider  = CLKSimpleTextProvider(text: text)
      let pct = goal > 0 ? Int(frac * 100) : 0
      t.body2TextProvider  = CLKSimpleTextProvider(text: "\(pct) % de l'objectif")
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: text, shortText: text)
      return t

    default: return nil
    }
  }

  // MARK: - Sommeil
  // Dégradé : indigo foncé → lavande (nuit / récupération)

  private func sleepTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let mins    = sleepMinutes
    let goal    = sleepGoal
    let quality = sleepQuality
    let hours   = mins / 60
    let rem     = mins % 60
    let text    = mins > 0 ? String(format: "%dh%02d", hours, rem) : "--"
    let frac    = goal > 0 ? Float(min(mins, goal)) / Float(goal) : 0.0
    let gauge   = elegantGauge(from: .midnightBlue, to: .lavender, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(
          value: mins > 0 ? "\(hours)h\(rem > 0 ? "\(rem)" : "")" : "--",
          icon: "moon.fill",
          fill: CGFloat(frac),
          valueColor: UIColor(red: 0.68, green: 0.45, blue: 1.00, alpha: 1)
        ))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Sommeil  \(text)", shortText: "Sommeil")
      t.gaugeProvider     = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Sommeil")
      t.body1TextProvider  = CLKSimpleTextProvider(
        text: mins > 0 ? "\(text)  ·  Qualité \(quality > 0 ? "\(quality)/5" : "--")" : "Pas de donnée"
      )
      t.body2TextProvider = CLKSimpleTextProvider(
        text: frac >= 0.9 ? "Récup. excellente" : frac >= 0.6 ? "Récup. correcte" : "Récup. insuffisante"
      )
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "SOMMEIL")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t

    default: return nil
    }
  }

  // MARK: - Poids
  // Dégradé : indigo foncé → lavande (transformation corporelle)

  private func weightTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let w      = currentWeight
    let target = targetWeight
    let start  = startWeight
    let text   = w > 0 ? String(format: "%.1f", w) : "--"
    let totalDiff = start > 0 && target > 0 ? abs(start - target) : 1.0
    let done      = start > 0 && w > 0 ? abs(start - w) : 0.0
    let frac      = totalDiff > 0 ? Float(min(done / totalDiff, 1.0)) : 0.0
    let gauge     = elegantGauge(from: .deepOrange, to: .amber, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: w > 0 ? text : "--", icon: "scalemass.fill", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: "\(text) kg")
      t.outerTextProvider = CLKSimpleTextProvider(
        text: target > 0 ? "Obj. \(String(format: "%.1f", target)) kg" : "Poids YOROI",
        shortText: "Poids"
      )
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Poids")
      t.body1TextProvider  = CLKSimpleTextProvider(text: w > 0 ? "\(text) kg" : "-- kg")
      t.body2TextProvider  = CLKSimpleTextProvider(
        text: target > 0 ? "Objectif : \(String(format: "%.1f", target)) kg" : "Ouvre l'app pour saisir"
      )
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "\(text)kg", shortText: text)
      return t

    default: return nil
    }
  }

  // MARK: - Calories Actives
  // Dégradé : bleu marine → corail (énergie dépensée)

  private func caloriesTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let kcal  = calories
    let goal  = caloriesGoal
    let frac  = goal > 0 ? Float(min(kcal, goal)) / Float(goal) : 0.0
    let gauge = elegantGauge(from: .crimson, to: .orange, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: kcal > 0 ? "\(kcal)" : "--", icon: "flame.fill", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(
        text: kcal > 0 ? "\(kcal) kcal" : "-- kcal",
        shortText: "Cal"
      )
      t.gaugeProvider = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Calories Actives")
      t.body1TextProvider  = CLKSimpleTextProvider(text: kcal > 0 ? "\(kcal) kcal" : "-- kcal")
      t.body2TextProvider  = CLKSimpleTextProvider(text: "Objectif : \(goal) kcal")
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(
        text: kcal > 0 ? "\(kcal) kcal" : "-- kcal",
        shortText: kcal > 0 ? "\(kcal)" : "--"
      )
      return t

    default: return nil
    }
  }

  // MARK: - Distance
  // Dégradé : bleu royal → menthe (course / déplacement)

  private func distanceTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let km    = distance
    let goal  = distanceGoal
    let text  = km > 0 ? String(format: km >= 10 ? "%.1f" : "%.2f", km) : "--"
    let frac  = goal > 0 ? Float(min(km / goal, 1.0)) : 0.0
    let gauge = elegantGauge(from: .forestGreen, to: .mint, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: text, icon: "figure.run", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "\(text) km", shortText: text)
      t.gaugeProvider     = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Distance")
      t.body1TextProvider  = CLKSimpleTextProvider(text: km > 0 ? "\(text) km" : "-- km")
      t.body2TextProvider  = CLKSimpleTextProvider(text: "Objectif : \(String(format: "%.0f", goal)) km")
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "\(text)km", shortText: text)
      return t

    default: return nil
    }
  }

  // MARK: - Rang YOROI
  // Dégradé : bleu marine → ambre (prestige / titre)

  private func rankTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let lvl   = userLevel
    let rank  = userRank
    let days  = streak
    let lvlText = "Niv. \(lvl)"
    let shortRank: String = {
      let words = rank.split(separator: " ")
      if words.count > 2 { return words.prefix(2).joined(separator: " ") }
      return rank
    }()

    let rankFrac = Float(min(lvl, 20)) / 20.0

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: "Nv\(lvl)", icon: "star.fill", fill: CGFloat(rankFrac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: shortRank)
      t.outerTextProvider = CLKSimpleTextProvider(text: "YOROI  \(lvlText)", shortText: lvlText)
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Rang YOROI")
      t.body1TextProvider  = CLKSimpleTextProvider(text: "\(rank)  ·  \(lvlText)")
      t.body2TextProvider  = CLKSimpleTextProvider(
        text: days > 0 ? "\(days) jour\(days > 1 ? "s" : "") de série" : "Continue l'effort !"
      )
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: lvlText)
      t.line2TextProvider = CLKSimpleTextProvider(text: shortRank)
      return t

    default: return nil
    }
  }

  // MARK: - FC au Repos
  // Dégradé : bleu marine → menthe (bonne forme = basse FC)

  private func restingHRTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let bpm  = restingHR
    let text = bpm > 0 ? "\(bpm)" : "--"
    // Plus la FC repos est basse, mieux c'est — jauge inversée (80→0 %, 40→100 %)
    let frac: Float = bpm > 0 ? Float(max(0, 80 - bpm)) / 40.0 : 0.0
    let gauge = elegantGauge(from: .tealBlue, to: .mint, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: text, icon: "heart.fill", fill: CGFloat(frac)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "FC repos  \(text)", shortText: "FCR")
      t.gaugeProvider     = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "FC au Repos")
      t.body1TextProvider  = CLKSimpleTextProvider(text: bpm > 0 ? "\(text) BPM" : "-- BPM")
      t.body2TextProvider  = CLKSimpleTextProvider(
        text: bpm < 60 ? "Excellente forme" : bpm <= 70 ? "Bonne forme" : "Normal"
      )
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: bpm > 0 ? "\(text) bpm" : "--", shortText: text)
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "FCR")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t

    default: return nil
    }
  }

  // MARK: - Fréquence Respiratoire
  // Dégradé : bleu marine → bleu ciel (respiration / calme)

  private func respiratoryTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let rpm  = respiratoryRate
    let text = rpm > 0 ? "\(rpm)" : "--"
    // Jauge : 12 rpm = 0 %, 25 rpm = 100 %
    let frac: Float = rpm > 0 ? Float(max(0, min(rpm - 12, 13))) / 13.0 : 0.0
    let gauge = elegantGauge(from: .forestGreen, to: .limeGreen, fill: frac)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeYoroiCircularImage(value: text, icon: "lungs.fill", fill: CGFloat(frac),
          valueColor:    UIColor(red: 0.35, green: 0.95, blue: 0.50, alpha: 1),
          arcStartColor: UIColor(red: 0.04, green: 0.38, blue: 0.22, alpha: 1),
          arcEndColor:   UIColor(red: 0.30, green: 0.88, blue: 0.35, alpha: 1),
          iconColor:     UIColor(red: 0.25, green: 0.90, blue: 0.40, alpha: 1)))
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "FR  \(text) rpm", shortText: "FR")
      t.gaugeProvider     = gauge
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Fréquence Respiratoire")
      t.body1TextProvider  = CLKSimpleTextProvider(text: rpm > 0 ? "\(text) rpm" : "-- rpm")
      t.body2TextProvider  = CLKSimpleTextProvider(
        text: rpm >= 12 && rpm <= 20 ? "Normal" : rpm < 12 ? "Lente" : "Rapide"
      )
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "\(text) FR", shortText: text)
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "FR")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t

    default: return nil
    }
  }

  // MARK: - Images circulaires custom (design unifié Yoroi)

  /// Dessin unifié : fond noir + arc dégradé couleur propre à chaque complication + valeur + icône SF Symbol
  /// Les points min/max sont dessinés sur la piste pour repère visuel.
  private func makeYoroiCircularImage(
    value: String,
    icon: String,
    fill: CGFloat,
    unit: String = "",
    valueColor: UIColor = .white,
    arcStartColor: UIColor = UIColor(red: 0.24, green: 0.48, blue: 0.98, alpha: 1),
    arcEndColor:   UIColor = UIColor(red: 0.54, green: 0.25, blue: 0.95, alpha: 1),
    iconColor:     UIColor? = nil
  ) -> UIImage {
    let size  = CGSize(width: 44, height: 44)
    UIGraphicsBeginImageContextWithOptions(size, false, 0)
    defer { UIGraphicsEndImageContext() }
    guard let ctx = UIGraphicsGetCurrentContext() else { return UIImage() }

    let center      = CGPoint(x: 22, y: 22)
    let radius: CGFloat = 18.5
    let trackW: CGFloat = 3.2
    let effectiveIconColor = iconColor ?? arcEndColor
    let bgColor = UIColor(red: 0.07, green: 0.07, blue: 0.07, alpha: 1)

    // 1. Fond noir
    bgColor.setFill()
    UIBezierPath(ovalIn: CGRect(origin: .zero, size: size)).fill()

    // Arc : -135° → +135° (270° sweep)
    let startAngle: CGFloat = -.pi * 0.75
    let sweepAngle: CGFloat =  .pi * 1.5
    let endAngle   = startAngle + sweepAngle

    // 2. Piste grise (arrière-plan de l'arc)
    ctx.saveGState()
    ctx.setLineWidth(trackW)
    ctx.setLineCap(.butt)
    ctx.setStrokeColor(UIColor(white: 0.20, alpha: 1).cgColor)
    ctx.addArc(center: center, radius: radius,
               startAngle: startAngle, endAngle: endAngle, clockwise: false)
    ctx.strokePath()
    ctx.restoreGState()

    // 3. Points min / max sur la piste (repères visuels)
    let dotRadius: CGFloat = 2.0
    let dotColor = UIColor(white: 0.55, alpha: 1)
    // Point MIN (début de la piste = startAngle)
    let minDotX = center.x + radius * cos(startAngle)
    let minDotY = center.y + radius * sin(startAngle)
    ctx.saveGState()
    ctx.setFillColor(dotColor.cgColor)
    ctx.fillEllipse(in: CGRect(x: minDotX - dotRadius, y: minDotY - dotRadius,
                               width: dotRadius * 2, height: dotRadius * 2))
    ctx.restoreGState()
    // Point MAX (fin de la piste = endAngle)
    let maxDotX = center.x + radius * cos(endAngle)
    let maxDotY = center.y + radius * sin(endAngle)
    ctx.saveGState()
    ctx.setFillColor(dotColor.cgColor)
    ctx.fillEllipse(in: CGRect(x: maxDotX - dotRadius, y: maxDotY - dotRadius,
                               width: dotRadius * 2, height: dotRadius * 2))
    ctx.restoreGState()

    // 4. Arc de progression avec dégradé propre à chaque complication
    let clampedFill = min(max(fill, 0), 1)
    if clampedFill > 0.01 {
      let progressEnd = startAngle + sweepAngle * clampedFill
      ctx.saveGState()
      ctx.setLineWidth(trackW + 0.5)
      ctx.setLineCap(.round)
      ctx.addArc(center: center, radius: radius,
                 startAngle: startAngle, endAngle: progressEnd, clockwise: false)
      ctx.replacePathWithStrokedPath()
      ctx.clip()
      let colors = [arcStartColor.cgColor, arcEndColor.cgColor] as CFArray
      let locs: [CGFloat] = [0, 1]
      let cs = CGColorSpaceCreateDeviceRGB()
      if let grad = CGGradient(colorsSpace: cs, colors: colors, locations: locs) {
        ctx.drawLinearGradient(
          grad,
          start: CGPoint(x: center.x - radius - trackW, y: center.y),
          end:   CGPoint(x: center.x + radius + trackW, y: center.y),
          options: []
        )
      }
      ctx.restoreGState()
    }

    // 5. Valeur centrée (légèrement vers le haut)
    let fontSize: CGFloat = value.count > 3 ? 11 : (value.count == 3 ? 13 : 15)
    let valueAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: fontSize, weight: .bold),
      .foregroundColor: valueColor,
    ]
    let valueStr = NSAttributedString(string: value, attributes: valueAttrs)
    let valueSz  = valueStr.size()
    let valueY: CGFloat = center.y - valueSz.height / 2 - 4
    valueStr.draw(at: CGPoint(x: center.x - valueSz.width / 2, y: valueY))

    // 6. Icône SF Symbol colorée sous la valeur
    let iconCfg = UIImage.SymbolConfiguration(pointSize: 9, weight: .semibold)
    if let iconImg = UIImage(systemName: icon, withConfiguration: iconCfg)?
           .withTintColor(effectiveIconColor, renderingMode: .alwaysOriginal) {
      let iw = iconImg.size.width, ih = iconImg.size.height
      iconImg.draw(in: CGRect(
        x: center.x - iw / 2,
        y: valueY + valueSz.height + 1,
        width: iw, height: ih
      ))
    }

    return UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
  }

  /// Image spéciale Carnet : grand haltère centré + badge "+" en blanc en bas
  private func makeCarnetAddImage() -> UIImage {
    let size = CGSize(width: 44, height: 44)
    UIGraphicsBeginImageContextWithOptions(size, false, 0)
    defer { UIGraphicsEndImageContext() }
    guard let ctx = UIGraphicsGetCurrentContext() else { return UIImage() }

    let center = CGPoint(x: 22, y: 22)
    let bgColor  = UIColor(red: 0.07, green: 0.07, blue: 0.07, alpha: 1)
    let orange   = UIColor(red: 1.00, green: 0.55, blue: 0.12, alpha: 1)

    // Fond noir
    bgColor.setFill()
    UIBezierPath(ovalIn: CGRect(origin: .zero, size: size)).fill()

    // Grand haltère centré (légèrement vers le haut)
    let dumbellCfg = UIImage.SymbolConfiguration(pointSize: 20, weight: .black)
    if let img = UIImage(systemName: "dumbbell.fill", withConfiguration: dumbellCfg)?
        .withTintColor(orange, renderingMode: .alwaysOriginal) {
      let iw = img.size.width, ih = img.size.height
      img.draw(in: CGRect(x: center.x - iw / 2, y: center.y - ih / 2 - 3, width: iw, height: ih))
    }

    // Badge "+" blanc en bas à droite
    let plusCfg = UIImage.SymbolConfiguration(pointSize: 10, weight: .black)
    if let plusImg = UIImage(systemName: "plus.circle.fill", withConfiguration: plusCfg)?
        .withTintColor(.white, renderingMode: .alwaysOriginal) {
      let pw = plusImg.size.width, ph = plusImg.size.height
      // Petit fond noir derrière le badge pour lisibilité
      ctx.saveGState()
      ctx.setFillColor(bgColor.cgColor)
      ctx.fillEllipse(in: CGRect(x: 28 - 1, y: 29 - 1, width: pw + 2, height: ph + 2))
      ctx.restoreGState()
      plusImg.draw(in: CGRect(x: 28, y: 29, width: pw, height: ph))
    }

    return UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
  }

  // MARK: - Ajouter Exercice
  // Complication dédiée pour ouvrir le Carnet et logger une série rapidement

  private func addExerciceTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let prCount = carnetTotalPRs
    let lastEx  = carnetLastExercise

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularImage()
      t.imageProvider = CLKFullColorImageProvider(fullColorImage:
        makeCarnetAddImage())
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: prCount > 0 ? "\(prCount) PRs" : "Logger")
      t.outerTextProvider = CLKSimpleTextProvider(
        text: lastEx.isEmpty ? "Carnet YOROI" : lastEx,
        shortText: "Carnet"
      )
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Carnet YOROI")
      t.body1TextProvider  = CLKSimpleTextProvider(text: "Logger une série")
      t.body2TextProvider  = CLKSimpleTextProvider(
        text: prCount > 0 ? "\(prCount) exercices logués" : "Démarre ta séance !"
      )
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "+ Série", shortText: "+")
      return t

    default: return nil
    }
  }
}
