// ============================================
// YOROI WATCH - COMPLICATIONS CADRAN
// ============================================
// 12 complications disponibles :
//   • Fréquence Cardiaque (FC)
//   • SpO2
//   • Timer
//   • Carnet d'entraînement (Série)
//   • Pas du jour
//   • Hydratation
//   • Sommeil
//   • Poids
//   • Calories actives
//   • Distance
//   • Rang YOROI
//   • FC au repos
// Familles supportées :
//   graphicCircular, graphicCorner,
//   graphicRectangular, utilitarianSmall, modularSmall
// ============================================

import ClockKit
import SwiftUI

// watchOS : les couleurs système UIKit n'existent pas, on les redéfinit
private extension UIColor {
  static let yBlue   = UIColor(red: 0.0,  green: 0.48, blue: 1.0,  alpha: 1)
  static let yGreen  = UIColor(red: 0.2,  green: 0.78, blue: 0.35, alpha: 1)
  static let yOrange = UIColor(red: 1.0,  green: 0.58, blue: 0.0,  alpha: 1)
  static let yRed    = UIColor(red: 1.0,  green: 0.23, blue: 0.19, alpha: 1)
  static let yCyan   = UIColor(red: 0.20, green: 0.67, blue: 0.90, alpha: 1)
  static let yYellow = UIColor(red: 1.0,  green: 0.80, blue: 0.0,  alpha: 1)
  static let yIndigo = UIColor(red: 0.35, green: 0.34, blue: 0.84, alpha: 1)
  static let yPurple = UIColor(red: 0.69, green: 0.32, blue: 0.87, alpha: 1)
  static let yGray   = UIColor(red: 0.56, green: 0.56, blue: 0.58, alpha: 1)
  static let yTeal   = UIColor(red: 0.35, green: 0.78, blue: 0.98, alpha: 1)
}

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
  private var distance: Double    { ud.double(forKey: "yoroi_distance") }
  private var userLevel: Int      { let v = ud.integer(forKey: "yoroi_level"); return v > 0 ? v : 1 }
  private var userRank: String    { ud.string(forKey: "yoroi_rank") ?? "Recrue" }

  // MARK: - Descripteurs (liste des complications disponibles)

  func getComplicationDescriptors(handler: @escaping ([CLKComplicationDescriptor]) -> Void) {
    let descriptors: [CLKComplicationDescriptor] = [
      CLKComplicationDescriptor(
        identifier: "yoroi.heartrate",
        displayName: "FC – Fréquence Cardiaque",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.spo2",
        displayName: "SpO2 – Oxygène Sang",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.timer",
        displayName: "Timer YOROI",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.carnet",
        displayName: "Carnet – Série",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .modularSmall],
        userInfo: ["tabIndex": 5] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.steps",
        displayName: "Pas du Jour",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.hydration",
        displayName: "Hydratation",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.sleep",
        displayName: "Sommeil",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .modularSmall],
        userInfo: ["tabIndex": 3] as [AnyHashable: Any]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.weight",
        displayName: "Poids",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.calories",
        displayName: "Calories Actives",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.distance",
        displayName: "Distance",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.rank",
        displayName: "Rang YOROI",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .modularSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.restinghr",
        displayName: "FC au Repos",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall]
      ),
      CLKComplicationDescriptor(
        identifier: "yoroi.respiratory",
        displayName: "FR – Fréquence Respiratoire",
        supportedFamilies: [.graphicCircular, .graphicCorner, .graphicRectangular, .utilitarianSmall, .modularSmall]
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

  // MARK: - Routeur principal

  private func makeTemplate(for complication: CLKComplication) -> CLKComplicationTemplate? {
    switch complication.identifier {
    case "yoroi.heartrate": return heartRateTemplate(family: complication.family)
    case "yoroi.spo2":      return spo2Template(family: complication.family)
    case "yoroi.timer":     return timerTemplate(family: complication.family)
    case "yoroi.carnet":    return carnetTemplate(family: complication.family)
    case "yoroi.steps":     return stepsTemplate(family: complication.family)
    case "yoroi.hydration": return hydrationTemplate(family: complication.family)
    case "yoroi.sleep":     return sleepTemplate(family: complication.family)
    case "yoroi.weight":    return weightTemplate(family: complication.family)
    case "yoroi.calories":  return caloriesTemplate(family: complication.family)
    case "yoroi.distance":  return distanceTemplate(family: complication.family)
    case "yoroi.rank":      return rankTemplate(family: complication.family)
    case "yoroi.restinghr":   return restingHRTemplate(family: complication.family)
    case "yoroi.respiratory": return respiratoryTemplate(family: complication.family)
    default:                  return nil
    }
  }

  // MARK: - ♥ Fréquence Cardiaque

  private func heartRateTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let bpm   = heartRate
    let text  = bpm > 0 ? "\(bpm)" : "--"
    // Jauge : 40 BPM = 0 %, 200 BPM = 100 %
    let frac  = bpm > 0 ? Float(max(0, min(bpm - 40, 160))) / 160.0 : 0.0
    // Couleur : vert si normal (60-100), orange si élevé, rouge si très élevé
    let gaugeColor: UIColor = bpm < 60 ? .yBlue : (bpm <= 100 ? .yGreen : (bpm <= 140 ? .yOrange : .yRed))

    switch family {

    case .graphicCircular:
      // Zone color: blue=bradycardie, vert=normal, orange=élevé, rouge=danger
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: text)
      t.bottomTextProvider = CLKSimpleTextProvider(text: "bpm")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yGreen, .yOrange, .yRed],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "FC  \(text) bpm", shortText: "FC")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yGreen, .yRed],
        gaugeColorLocations: [0, 1],
        fillFraction: frac
      )
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Fréquence Cardiaque")
      t.body1TextProvider  = CLKSimpleTextProvider(text: bpm > 0 ? "\(bpm) BPM" : "-- BPM")
      t.body2TextProvider  = CLKSimpleTextProvider(text: bpm < 60 ? "Bradycardie" : (bpm <= 100 ? "Normal" : "Élevé"))
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "\(text) ♥", shortText: text)
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "FC")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t

    default: return nil
    }
  }

  // MARK: - 🫁 SpO2

  private func spo2Template(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let val   = spo2
    let text  = val > 0 ? "\(val)%" : "--%"
    // Jauge : 90 % = 0, 100 % = 1
    let frac  = val > 0 ? Float(max(0, val - 90)) / 10.0 : 0.0
    let color: UIColor = val >= 95 ? .yCyan : (val >= 90 ? .yOrange : .yRed)

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: val > 0 ? "\(val)" : "--")
      t.bottomTextProvider = CLKSimpleTextProvider(text: "% SpO2")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yRed, .yOrange, .yGreen],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "SpO2  \(text)", shortText: "SpO2")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yCyan, .yBlue],
        gaugeColorLocations: [0, 1],
        fillFraction: frac
      )
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Oxygène Sanguin")
      t.body1TextProvider  = CLKSimpleTextProvider(text: val > 0 ? "\(val) %" : "-- %")
      t.body2TextProvider  = CLKSimpleTextProvider(text: val >= 95 ? "Normal" : (val >= 90 ? "Faible" : "Critique"))
      return t

    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: text, shortText: text)
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "SpO2")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t

    default: return nil
    }
  }

  // MARK: - Timer

  private func timerTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let remaining  = timerRemaining
    let total      = timerTotal
    let running    = timerRunning
    let endDate    = timerEndDate ?? Date().addingTimeInterval(Double(remaining))
    // La date de début = fin - durée totale (pour la jauge)
    let startDate  = endDate.addingTimeInterval(-Double(total))
    let mins       = remaining / 60
    let secs       = remaining % 60
    let timeText   = remaining > 0 ? String(format: "%d:%02d", mins, secs) : "0:00"
    let frac       = total > 0 ? Float(remaining) / Float(total) : 0.0
    let statusText = running ? "EN COURS" : (remaining > 0 ? "PAUSE" : "TIMER")
    let timerColor: UIColor = running ? .yOrange : .yGray
    let totalMins  = total / 60

    // Quand le timer tourne : providers natifs watchOS — décompte SANS code, même en veille
    let centerProvider: CLKTextProvider
    let gaugeProvider: CLKGaugeProvider

    if running {
      // CLKRelativeDateTextProvider : l'OS met à jour le chiffre tout seul (0:00, 1:23, ...)
      centerProvider = CLKRelativeDateTextProvider(date: endDate, style: .timer, units: [.minute, .second])
      // CLKTimeIntervalGaugeProvider : la jauge se vide toute seule entre startDate et endDate
      gaugeProvider = CLKTimeIntervalGaugeProvider(
        style: .fill,
        gaugeColors: [timerColor, .yRed],
        gaugeColorLocations: [NSNumber(value: 0), NSNumber(value: 1)],
        start: startDate,
        end: endDate
      )
    } else {
      centerProvider = CLKSimpleTextProvider(text: timeText)
      gaugeProvider  = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [timerColor, .yGray],
        gaugeColorLocations: [0, 1],
        fillFraction: frac
      )
    }

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = centerProvider
      t.bottomTextProvider = CLKSimpleTextProvider(text: running ? "min" : statusText)
      t.gaugeProvider      = gaugeProvider
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

  // MARK: - 📓 Carnet d'entraînement

  private func carnetTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let days   = streak
    let text   = days > 0 ? "\(days)j" : "0j"
    let header = days == 0 ? "Commence ta série !" : (days == 1 ? "1 jour de suite" : "\(days) jours de suite")

    switch family {

    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "SÉRIE")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: text)
      t.outerTextProvider = CLKSimpleTextProvider(text: "Carnet YOROI", shortText: "Carnet")
      return t

    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Carnet YOROI")
      t.body1TextProvider  = CLKSimpleTextProvider(text: header)
      t.body2TextProvider  = CLKSimpleTextProvider(text: "Ouvre l'app pour logger")
      return t

    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "SÉRIE")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t

    default: return nil
    }
  }

  // MARK: - 👟 Pas du jour

  private func stepsTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let steps = localSteps
    let goal  = stepsGoal
    let frac  = goal > 0 ? Float(min(steps, goal)) / Float(goal) : 0.0
    let text  = steps >= 1000 ? String(format: "%.1fk", Double(steps) / 1000.0) : "\(steps)"
    let color: UIColor = frac >= 1.0 ? .yGreen : (frac >= 0.5 ? .yOrange : .yBlue)

    switch family {

    case .graphicCircular:
      let goalLabel = stepsGoal >= 1000 ? "/\(stepsGoal / 1000)k" : "/\(stepsGoal)"
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: text)
      t.bottomTextProvider = CLKSimpleTextProvider(text: "\(goalLabel) pas")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yRed, .yOrange, .yGreen],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Pas  \(text)", shortText: "Pas")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yBlue, .yGreen],
        gaugeColorLocations: [0, 1],
        fillFraction: frac
      )
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

  // MARK: - 💧 Hydratation

  private func hydrationTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let current = hydration
    let goal    = hydrationGoal
    let frac    = goal > 0 ? Float(min(current, goal)) / Float(goal) : 0.0
    let text    = current >= 1000 ? String(format: "%.1fL", Double(current) / 1000.0) : "\(current)ml"
    let color: UIColor = frac >= 1.0 ? .yGreen : (frac >= 0.5 ? .yCyan : .yBlue)

    switch family {

    case .graphicCircular:
      let centerVal = current > 0 ? (current >= 1000 ? String(format: "%.1f", Double(current) / 1000.0) : "\(current)") : "--"
      let goalLitres = goal >= 1000 ? String(format: "%.1f", Double(goal) / 1000.0) : "\(goal)"
      let unitLabel  = current >= 1000 || goal >= 1000 ? "L" : "ml"
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: centerVal)
      t.bottomTextProvider = CLKSimpleTextProvider(text: "/\(goalLitres)\(unitLabel)")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yRed, .yOrange, .yGreen],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t

    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Eau  \(text)", shortText: "Eau")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yBlue, .yCyan],
        gaugeColorLocations: [0, 1],
        fillFraction: frac
      )
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

  // MARK: - 🌙 Sommeil

  private func sleepTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let mins    = sleepMinutes
    let goal    = sleepGoal
    let quality = sleepQuality
    let hours   = mins / 60
    let rem     = mins % 60
    let text    = mins > 0 ? String(format: "%dh%02d", hours, rem) : "--"
    let frac    = goal > 0 ? Float(min(mins, goal)) / Float(goal) : 0.0
    let color: UIColor = frac >= 0.9 ? .yIndigo : (frac >= 0.6 ? .yPurple : .yGray)

    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: mins > 0 ? "\(hours)h\(rem > 0 ? "\(rem)" : "")" : "--")
      t.bottomTextProvider = CLKSimpleTextProvider(text: "/\(goal / 60)h sommeil")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yRed, .yOrange, .yIndigo],
        gaugeColorLocations: [0, 0.6, 1.0],
        fillFraction: frac
      )
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Sommeil  \(text)", shortText: "Sommeil")
      t.gaugeProvider = CLKSimpleGaugeProvider(style: .fill, gaugeColors: [.yPurple, .yIndigo], gaugeColorLocations: [0, 1], fillFraction: frac)
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Sommeil")
      t.body1TextProvider  = CLKSimpleTextProvider(text: mins > 0 ? "\(text)  ·  Qualité \(quality > 0 ? "\(quality)/5" : "--")" : "Pas de donnée")
      t.body2TextProvider  = CLKSimpleTextProvider(text: frac >= 0.9 ? "Récup. excellente" : (frac >= 0.6 ? "Récup. correcte" : "Récup. insuffisante"))
      return t
    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "SOMMEIL")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t
    default: return nil
    }
  }

  // MARK: - ⚖️ Poids

  private func weightTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let w      = currentWeight
    let target = targetWeight
    let start  = startWeight
    let text   = w > 0 ? String(format: "%.1f", w) : "--"
    // Progression : 0 % = pas bougé, 100 % = objectif atteint
    let totalDiff = start > 0 && target > 0 ? abs(start - target) : 1.0
    let done      = start > 0 && w > 0 ? abs(start - w) : 0.0
    let frac      = totalDiff > 0 ? Float(min(done / totalDiff, 1.0)) : 0.0

    switch family {
    case .graphicCircular:
      let objLabel = target > 0 ? "/\(Int(target))kg" : "kg"
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: w > 0 ? "\(text)" : "--")
      t.bottomTextProvider = CLKSimpleTextProvider(text: objLabel)
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yOrange, .yTeal, .yGreen],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: "\(text) kg")
      t.outerTextProvider = CLKSimpleTextProvider(text: target > 0 ? "Obj. \(String(format: "%.1f", target)) kg" : "Poids YOROI", shortText: "Poids")
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Poids")
      t.body1TextProvider  = CLKSimpleTextProvider(text: w > 0 ? "\(text) kg" : "-- kg")
      t.body2TextProvider  = CLKSimpleTextProvider(text: target > 0 ? "Objectif : \(String(format: "%.1f", target)) kg" : "Ouvre l'app pour saisir")
      return t
    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "\(text)kg", shortText: text)
      return t
    default: return nil
    }
  }

  // MARK: - 🔥 Calories actives

  private func caloriesTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let kcal  = calories
    let text  = kcal > 0 ? "\(kcal)" : "--"
    let goal  = 500 // objectif par défaut calories actives
    let frac  = Float(min(kcal, goal)) / Float(goal)
    let color: UIColor = frac >= 1.0 ? .yGreen : (frac >= 0.5 ? .yOrange : .yRed)

    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: kcal > 0 ? "\(kcal)" : "--")
      t.bottomTextProvider = CLKSimpleTextProvider(text: "/\(goal) kcal")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yRed, .yOrange, .yGreen],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "Cal  \(text)", shortText: "Cal")
      t.gaugeProvider = CLKSimpleGaugeProvider(style: .fill, gaugeColors: [.yOrange, .yRed], gaugeColorLocations: [0, 1], fillFraction: frac)
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Calories Actives")
      t.body1TextProvider  = CLKSimpleTextProvider(text: kcal > 0 ? "\(kcal) kcal" : "-- kcal")
      t.body2TextProvider  = CLKSimpleTextProvider(text: "Objectif : \(goal) kcal")
      return t
    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "\(text)k", shortText: text)
      return t
    default: return nil
    }
  }

  // MARK: - 📍 Distance

  private func distanceTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let km    = distance
    let text  = km > 0 ? String(format: km >= 10 ? "%.1f" : "%.2f", km) : "--"
    let unit  = "km"
    let goal  = 5.0 // objectif par défaut 5 km
    let frac  = Float(min(km / goal, 1.0))
    let color: UIColor = frac >= 1.0 ? .yGreen : (frac >= 0.5 ? .yYellow : .yBlue)

    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: km > 0 ? "\(text)" : "--")
      t.bottomTextProvider = CLKSimpleTextProvider(text: "/\(String(format: "%.0f", goal)) km")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yRed, .yOrange, .yGreen],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "\(text) \(unit)", shortText: text)
      t.gaugeProvider = CLKSimpleGaugeProvider(style: .fill, gaugeColors: [.yBlue, .yGreen], gaugeColorLocations: [0, 1], fillFraction: frac)
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

  // MARK: - 🏆 Rang YOROI

  private func rankTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let lvl  = userLevel
    let rank = userRank
    let lvlText = "Niv.\(lvl)"

    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: lvlText)
      t.line2TextProvider = CLKSimpleTextProvider(text: rank)
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerStackText()
      t.innerTextProvider = CLKSimpleTextProvider(text: rank)
      t.outerTextProvider = CLKSimpleTextProvider(text: "YOROI  \(lvlText)", shortText: lvlText)
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Rang YOROI")
      t.body1TextProvider  = CLKSimpleTextProvider(text: rank)
      t.body2TextProvider  = CLKSimpleTextProvider(text: lvlText)
      return t
    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: lvlText)
      t.line2TextProvider = CLKSimpleTextProvider(text: rank)
      return t
    default: return nil
    }
  }

  // MARK: - FR Fréquence Respiratoire

  private func respiratoryTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let rpm  = respiratoryRate
    let text = rpm > 0 ? "\(rpm)" : "--"
    // Jauge : 12 rpm = 0 %, 25 rpm = 100 %
    let frac: Float = rpm > 0 ? Float(max(0, min(rpm - 12, 13))) / 13.0 : 0.0
    let color: UIColor = rpm >= 12 && rpm <= 20 ? .yTeal : (rpm < 12 ? .yBlue : .yOrange)

    switch family {
    case .graphicCircular:
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: text)
      t.bottomTextProvider = CLKSimpleTextProvider(text: "12-20 rpm")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yOrange, .yGreen, .yOrange],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "FR  \(text) rpm", shortText: "FR")
      t.gaugeProvider = CLKSimpleGaugeProvider(style: .fill, gaugeColors: [.yTeal, .yCyan], gaugeColorLocations: [0, 1], fillFraction: frac)
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "Fréquence Respiratoire")
      t.body1TextProvider  = CLKSimpleTextProvider(text: rpm > 0 ? "\(text) rpm" : "-- rpm")
      t.body2TextProvider  = CLKSimpleTextProvider(text: rpm >= 12 && rpm <= 20 ? "Normal" : (rpm < 12 ? "Lente" : "Rapide"))
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

  // MARK: - FC au repos

  private func restingHRTemplate(family: CLKComplicationFamily) -> CLKComplicationTemplate? {
    let bpm  = restingHR
    let text = bpm > 0 ? "\(bpm)" : "--"
    // Jauge : 40-80 BPM, plus bas = meilleure forme
    let frac: Float = bpm > 0 ? Float(max(0, 80 - bpm)) / 40.0 : 0.0
    let color: UIColor = bpm < 60 ? .yGreen : (bpm <= 70 ? .yYellow : .yOrange)

    switch family {
    case .graphicCircular:
      // Plus la FC repos est basse, mieux c'est — frac inverse (80→0%, 40→100%)
      let t = CLKComplicationTemplateGraphicCircularOpenGaugeSimpleText()
      t.centerTextProvider = CLKSimpleTextProvider(text: text)
      t.bottomTextProvider = CLKSimpleTextProvider(text: "bpm repos")
      t.gaugeProvider = CLKSimpleGaugeProvider(
        style: .fill,
        gaugeColors: [.yRed, .yOrange, .yGreen],
        gaugeColorLocations: [0, 0.5, 1.0],
        fillFraction: frac
      )
      return t
    case .graphicCorner:
      let t = CLKComplicationTemplateGraphicCornerGaugeText()
      t.outerTextProvider = CLKSimpleTextProvider(text: "FC repos  \(text)", shortText: "FCR")
      t.gaugeProvider = CLKSimpleGaugeProvider(style: .fill, gaugeColors: [.yGreen, .yOrange], gaugeColorLocations: [0, 1], fillFraction: frac)
      return t
    case .graphicRectangular:
      let t = CLKComplicationTemplateGraphicRectangularStandardBody()
      t.headerTextProvider = CLKSimpleTextProvider(text: "FC au Repos")
      t.body1TextProvider  = CLKSimpleTextProvider(text: bpm > 0 ? "\(text) BPM" : "-- BPM")
      t.body2TextProvider  = CLKSimpleTextProvider(text: bpm < 60 ? "Excellente forme" : (bpm <= 70 ? "Bonne forme" : "Normal"))
      return t
    case .utilitarianSmall:
      let t = CLKComplicationTemplateUtilitarianSmallFlat()
      t.textProvider = CLKSimpleTextProvider(text: "\(text) ♡", shortText: text)
      return t
    case .modularSmall:
      let t = CLKComplicationTemplateModularSmallStackText()
      t.line1TextProvider = CLKSimpleTextProvider(text: "FCR")
      t.line2TextProvider = CLKSimpleTextProvider(text: text)
      return t
    default: return nil
    }
  }
}
