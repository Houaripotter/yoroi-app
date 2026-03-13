import Foundation
import WatchConnectivity
import WatchKit
import AVFoundation
import SwiftUI
import HealthKit
import ClockKit
import UserNotifications

class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {

  static let shared = WatchSessionManager()

  // MARK: - Theme Colors (synced from iPhone)
  @Published var themeAccentHex: String = "#D4AF37" {
    didSet { UserDefaults.standard.set(themeAccentHex, forKey: "themeAccentHex") }
  }
  @Published var themeCompanionHex: String = "#FFFFFF" {
    didSet { UserDefaults.standard.set(themeCompanionHex, forKey: "themeCompanionHex") }
  }
  @Published var themeMode: String = "dark" {
    didSet { UserDefaults.standard.set(themeMode, forKey: "themeMode") }
  }
  @Published var themeBgHex: String = "#000000" {
    didSet { UserDefaults.standard.set(themeBgHex, forKey: "themeBgHex") }
  }
  @Published var themeCardBgHex: String = "#151515" {
    didSet { UserDefaults.standard.set(themeCardBgHex, forKey: "themeCardBgHex") }
  }
  @Published var themeTextPrimaryHex: String = "#FFFFFF" {
    didSet { UserDefaults.standard.set(themeTextPrimaryHex, forKey: "themeTextPrimaryHex") }
  }
  @Published var themeTextSecondaryHex: String = "#E0E0E0" {
    didSet { UserDefaults.standard.set(themeTextSecondaryHex, forKey: "themeTextSecondaryHex") }
  }
  @Published var themeDividerHex: String = "#2A2A2A" {
    didSet { UserDefaults.standard.set(themeDividerHex, forKey: "themeDividerHex") }
  }
  @Published var themeTextOnAccentHex: String = "#FFFFFF" {
    didSet { UserDefaults.standard.set(themeTextOnAccentHex, forKey: "themeTextOnAccentHex") }
  }

  var accentColor: Color {
    Color(hex: themeAccentHex) ?? Color(red: 0.831, green: 0.686, blue: 0.216)
  }
  var companionColor: Color {
    Color(hex: themeCompanionHex) ?? .white
  }
  var isDarkMode: Bool { themeMode != "light" }
  var bgColor: Color { Color(hex: themeBgHex) ?? (isDarkMode ? Color.black : Color.white) }
  var cardBg: Color { Color(hex: themeCardBgHex) ?? (isDarkMode ? Color.white.opacity(0.05) : Color.black.opacity(0.04)) }
  var textPrimary: Color { Color(hex: themeTextPrimaryHex) ?? (isDarkMode ? .white : Color(red: 0.1, green: 0.1, blue: 0.1)) }
  var textSecondary: Color { Color(hex: themeTextSecondaryHex) ?? (isDarkMode ? .gray : Color(red: 0.45, green: 0.45, blue: 0.45)) }
  var dividerColor: Color { Color(hex: themeDividerHex) ?? (isDarkMode ? Color.white.opacity(0.12) : Color.black.opacity(0.08)) }
  var textOnAccent: Color { Color(hex: themeTextOnAccentHex) ?? .white }

  // MARK: - Weight
  @Published var currentWeight: Double = 0.0 {
    didSet { UserDefaults.standard.set(currentWeight, forKey: "yoroi_weight"); reloadComplications() }
  }
  @Published var targetWeight: Double = 0.0 {
    didSet { UserDefaults.standard.set(targetWeight, forKey: "yoroi_targetWeight") }
  }
  @Published var startWeight: Double = 0.0 {
    didSet { UserDefaults.standard.set(startWeight, forKey: "yoroi_startWeight") }
  }
  @Published var weightHistory: [WeightEntry] = []
  @Published var bmi: Double = 0.0
  @Published var bodyFat: Double = 0.0
  @Published var muscleMass: Double = 0.0
  @Published var waterPercent: Double = 0.0
  @Published var userHeight: Double = 0.0 // cm - from Apple Health

  // MARK: - Hydration
  @Published var hydrationCurrent: Int = 0 {
    didSet { UserDefaults.standard.set(hydrationCurrent, forKey: "yoroi_hydration"); reloadComplications() }
  }
  @Published var hydrationGoal: Int = 3000 {
    didSet { UserDefaults.standard.set(hydrationGoal, forKey: "yoroi_hydrationGoal") }
  }
  @Published var hydrationWeekly: [DayHydration] = []

  // MARK: - Sleep
  @Published var sleepDuration: Int = 0 {
    didSet { UserDefaults.standard.set(sleepDuration, forKey: "yoroi_sleepMinutes"); reloadComplications() }
  }
  @Published var sleepQuality: Int = 0 {
    didSet { UserDefaults.standard.set(sleepQuality, forKey: "yoroi_sleepQuality") }
  }
  @Published var sleepBedTime: String = "--:--"
  @Published var sleepWakeTime: String = "--:--"
  @Published var sleepGoalMinutes: Int = 480 {
    didSet { UserDefaults.standard.set(sleepGoalMinutes, forKey: "yoroi_sleepGoal") }
  }
  @Published var sleepDebt: Double = 0.0
  @Published var sleepScore: Int = 0

  // MARK: - Steps & Health
  @Published var stepsGoal: Int = 8000 {
    didSet { UserDefaults.standard.set(stepsGoal, forKey: "yoroi_stepsGoal"); reloadComplications() }
  }
  // Données santé reçues de l'iPhone (fallback si HealthKit local indisponible)
  @Published var heartRate: Int = 0 {
    didSet {
      if localHeartRate == 0 {
        UserDefaults.standard.set(heartRate, forKey: "yoroi_heartRate")
        reloadComplications()
      }
    }
  }
  @Published var heartRateMin: Int = 0 {
    didSet {
      if localHeartRateMin == 0 {
        UserDefaults.standard.set(heartRateMin, forKey: "yoroi_heartRateMin")
      }
    }
  }
  @Published var heartRateMax: Int = 0 {
    didSet {
      if localHeartRateMax == 0 {
        UserDefaults.standard.set(heartRateMax, forKey: "yoroi_heartRateMax")
      }
    }
  }
  @Published var restingHeartRate: Int = 0 {
    didSet {
      if localRestingHR == 0 {
        UserDefaults.standard.set(restingHeartRate, forKey: "yoroi_restingHR")
        reloadComplications()
      }
    }
  }
  @Published var spo2: Int = 0 {
    didSet {
      if localSpo2 == 0 {
        UserDefaults.standard.set(spo2, forKey: "yoroi_spo2")
        reloadComplications()
      }
    }
  }
  @Published var respiratoryRate: Int = 0 {
    didSet {
      if localRespiratoryRate == 0 {
        UserDefaults.standard.set(respiratoryRate, forKey: "yoroi_respiratoryRate")
        reloadComplications()
      }
    }
  }
  @Published var activeCalories: Int = 0 {
    didSet {
      if localActiveCalories == 0 {
        UserDefaults.standard.set(activeCalories, forKey: "yoroi_calories")
        reloadComplications()
      }
    }
  }
  @Published var exerciseMinutes: Int = 0
  @Published var standHours: Int = 0
  @Published var distance: Double = 0.0 {
    didSet {
      if localDistance == 0.0 {
        UserDefaults.standard.set(distance, forKey: "yoroi_distance")
        reloadComplications()
      }
    }
  }

  // MARK: - Profile
  @Published var userName: String = ""
  @Published var level: Int = 1 {
    didSet { UserDefaults.standard.set(level, forKey: "yoroi_level"); reloadComplications() }
  }
  @Published var rank: String = "" {
    didSet { UserDefaults.standard.set(rank, forKey: "yoroi_rank"); reloadComplications() }
  }
  @Published var streak: Int = 0 {
    didSet { UserDefaults.standard.set(streak, forKey: "yoroi_streak"); reloadComplications() }
  }
  @Published var profileImageData: Data? = nil

  // MARK: - Timer (countdown minuteur)
  @Published var timerTotalSeconds: Int = 90 {
    didSet { UserDefaults.standard.set(timerTotalSeconds, forKey: "yoroi_timerTotal") }
  }
  @Published var timerRemainingSeconds: Int = 90 {
    didSet { UserDefaults.standard.set(timerRemainingSeconds, forKey: "yoroi_timerRemaining"); reloadComplications() }
  }
  @Published var timerIsRunning: Bool = false {
    didSet { UserDefaults.standard.set(timerIsRunning, forKey: "yoroi_timerRunning"); reloadComplications() }
  }
  @Published var timerAlarmRinging: Bool = false
  @Published var timerFavorites: [Int] = []

  // MARK: - Carnet (Training Journal)
  @Published var benchmarks: [BenchmarkRecord] = []
  @Published var recentWorkouts: [WorkoutEntry] = []

  // MARK: - Navigation (deep link depuis complications)
  // -1 = aucun deep link en cours ; >= 0 = onglet cible
  @Published var requestedTab: Int = -1

  // MARK: - Connection
  @Published var isConnected: Bool = false
  @Published var lastSyncDate: Date? = nil

  // MARK: - HealthKit (direct Watch readings)
  private let healthStore = HKHealthStore()
  @Published var localSteps: Int = 0 {
    didSet { UserDefaults.standard.set(localSteps, forKey: "yoroi_steps"); reloadComplications() }
  }
  @Published var localHeartRate: Int = 0 {
    didSet { UserDefaults.standard.set(localHeartRate, forKey: "yoroi_heartRate"); reloadComplications() }
  }
  @Published var localActiveCalories: Int = 0 {
    didSet { UserDefaults.standard.set(localActiveCalories, forKey: "yoroi_calories"); reloadComplications() }
  }
  @Published var localDistance: Double = 0.0 {
    didSet { UserDefaults.standard.set(localDistance, forKey: "yoroi_distance"); reloadComplications() }
  }
  @Published var localExerciseMinutes: Int = 0
  @Published var localStandHours: Int = 0
  @Published var localSpo2: Int = 0 {
    didSet { UserDefaults.standard.set(localSpo2, forKey: "yoroi_spo2"); reloadComplications() }
  }
  @Published var localHeartRateMin: Int = 0 {
    didSet { UserDefaults.standard.set(localHeartRateMin, forKey: "yoroi_heartRateMin"); reloadComplications() }
  }
  @Published var localHeartRateMax: Int = 0 {
    didSet { UserDefaults.standard.set(localHeartRateMax, forKey: "yoroi_heartRateMax"); reloadComplications() }
  }
  @Published var localSpo2Min: Int = 0 {
    didSet { UserDefaults.standard.set(localSpo2Min, forKey: "yoroi_spo2Min"); reloadComplications() }
  }
  @Published var localSpo2Max: Int = 0 {
    didSet { UserDefaults.standard.set(localSpo2Max, forKey: "yoroi_spo2Max"); reloadComplications() }
  }
  @Published var localRestingHR: Int = 0 {
    didSet { UserDefaults.standard.set(localRestingHR, forKey: "yoroi_restingHR"); reloadComplications() }
  }
  @Published var localRespiratoryRate: Int = 0 {
    didSet { UserDefaults.standard.set(localRespiratoryRate, forKey: "yoroi_respiratoryRate"); reloadComplications() }
  }

  private var session: WCSession?
  private var timer: Timer?
  private var extendedSession: WKExtendedRuntimeSession?
  private var audioPlayer: AVAudioPlayer?
  private var hapticTimer: Timer?

  // MARK: - Complications

  func reloadComplications() {
    let server = CLKComplicationServer.sharedInstance()
    guard let active = server.activeComplications, !active.isEmpty else { return }
    for complication in active {
      server.reloadTimeline(for: complication)
    }
  }

  override init() {
    super.init()
    loadTimerFavorites()
    loadLocalHistory()
    // Load saved theme colors
    themeAccentHex = UserDefaults.standard.string(forKey: "themeAccentHex") ?? "#D4AF37"
    themeCompanionHex = UserDefaults.standard.string(forKey: "themeCompanionHex") ?? "#FFFFFF"
    themeMode = UserDefaults.standard.string(forKey: "themeMode") ?? "dark"
    themeBgHex = UserDefaults.standard.string(forKey: "themeBgHex") ?? "#000000"
    themeCardBgHex = UserDefaults.standard.string(forKey: "themeCardBgHex") ?? "#151515"
    themeTextPrimaryHex = UserDefaults.standard.string(forKey: "themeTextPrimaryHex") ?? "#FFFFFF"
    themeTextSecondaryHex = UserDefaults.standard.string(forKey: "themeTextSecondaryHex") ?? "#E0E0E0"
    themeDividerHex = UserDefaults.standard.string(forKey: "themeDividerHex") ?? "#2A2A2A"
    themeTextOnAccentHex = UserDefaults.standard.string(forKey: "themeTextOnAccentHex") ?? "#FFFFFF"
    if WCSession.isSupported() {
      session = WCSession.default
      session?.delegate = self
      session?.activate()
    }
    // Request HealthKit authorization and fetch data
    authorizeAndFetchHealth()
  }

  // MARK: - HealthKit Authorization & Fetching

  func authorizeAndFetchHealth() {
    guard HKHealthStore.isHealthDataAvailable() else { return }

    let readTypes: Set<HKObjectType> = [
      HKQuantityType.quantityType(forIdentifier: .stepCount)!,
      HKQuantityType.quantityType(forIdentifier: .heartRate)!,
      HKQuantityType.quantityType(forIdentifier: .restingHeartRate)!,
      HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
      HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
      HKQuantityType.quantityType(forIdentifier: .appleExerciseTime)!,
      HKQuantityType.quantityType(forIdentifier: .oxygenSaturation)!,
      HKQuantityType.quantityType(forIdentifier: .respiratoryRate)!,
      HKCategoryType.categoryType(forIdentifier: .appleStandHour)!,
    ]

    healthStore.requestAuthorization(toShare: [], read: readTypes) { [weak self] ok, _ in
      if ok {
        self?.fetchAllHealthData()
        self?.startHealthObservers()
      }
    }
  }

  func fetchAllHealthData() {
    fetchSteps()
    fetchHeartRate()
    fetchActiveCalories()
    fetchDistance()
    fetchExerciseMinutes()
    fetchStandHours()
    fetchSpO2()
    fetchRestingHeartRate()
    fetchRespiratoryRate()
  }

  private func fetchSteps() {
    let type = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    fetchTodayCumulativeStat(type: type, unit: .count()) { [weak self] val in
      self?.localSteps = Int(val)
    }
  }

  private func fetchHeartRate() {
    let type = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    let bpmUnit = HKUnit.count().unitDivided(by: .minute())
    // Dernière mesure
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    let latestQ = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
      if let sample = samples?.first as? HKQuantitySample {
        let bpm = Int(sample.quantity.doubleValue(for: bpmUnit))
        DispatchQueue.main.async { self?.localHeartRate = bpm }
      }
    }
    healthStore.execute(latestQ)
    // Min/max du jour
    let start = Calendar.current.startOfDay(for: Date())
    let pred = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
    let statsQ = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: pred, options: [.discreteMin, .discreteMax]) { [weak self] _, result, _ in
      let minBpm = result?.minimumQuantity()?.doubleValue(for: bpmUnit)
      let maxBpm = result?.maximumQuantity()?.doubleValue(for: bpmUnit)
      DispatchQueue.main.async {
        if let v = minBpm { self?.localHeartRateMin = Int(v) }
        if let v = maxBpm { self?.localHeartRateMax = Int(v) }
      }
    }
    healthStore.execute(statsQ)
  }

  private func fetchActiveCalories() {
    let type = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
    fetchTodayCumulativeStat(type: type, unit: .kilocalorie()) { [weak self] val in
      self?.localActiveCalories = Int(val)
    }
  }

  private func fetchDistance() {
    let type = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!
    fetchTodayCumulativeStat(type: type, unit: .meterUnit(with: .kilo)) { [weak self] val in
      self?.localDistance = val
    }
  }

  private func fetchExerciseMinutes() {
    let type = HKQuantityType.quantityType(forIdentifier: .appleExerciseTime)!
    fetchTodayCumulativeStat(type: type, unit: .minute()) { [weak self] val in
      self?.localExerciseMinutes = Int(val)
    }
  }

  private func fetchStandHours() {
    let type = HKCategoryType.categoryType(forIdentifier: .appleStandHour)!
    let start = Calendar.current.startOfDay(for: Date())
    let pred = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
    let q = HKSampleQuery(sampleType: type, predicate: pred, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, _ in
      let stood = (samples ?? []).filter { ($0 as? HKCategorySample)?.value == HKCategoryValueAppleStandHour.stood.rawValue }.count
      DispatchQueue.main.async { self?.localStandHours = stood }
    }
    healthStore.execute(q)
  }

  private func fetchSpO2() {
    let type = HKQuantityType.quantityType(forIdentifier: .oxygenSaturation)!
    // Dernière mesure
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    let latestQ = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
      if let sample = samples?.first as? HKQuantitySample {
        let pct = Int(sample.quantity.doubleValue(for: .percent()) * 100)
        DispatchQueue.main.async { self?.localSpo2 = pct }
      }
    }
    healthStore.execute(latestQ)
    // Min/max du jour
    let start = Calendar.current.startOfDay(for: Date())
    let pred = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
    let statsQ = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: pred, options: [.discreteMin, .discreteMax]) { [weak self] _, result, _ in
      let minPct = result?.minimumQuantity()?.doubleValue(for: .percent())
      let maxPct = result?.maximumQuantity()?.doubleValue(for: .percent())
      DispatchQueue.main.async {
        if let v = minPct { self?.localSpo2Min = Int(v * 100) }
        if let v = maxPct { self?.localSpo2Max = Int(v * 100) }
      }
    }
    healthStore.execute(statsQ)
  }

  private func fetchRestingHeartRate() {
    let type = HKQuantityType.quantityType(forIdentifier: .restingHeartRate)!
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    let q = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
      if let sample = samples?.first as? HKQuantitySample {
        let bpm = Int(sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())))
        DispatchQueue.main.async { self?.localRestingHR = bpm }
      }
    }
    healthStore.execute(q)
  }

  private func fetchRespiratoryRate() {
    let type = HKQuantityType.quantityType(forIdentifier: .respiratoryRate)!
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    let q = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
      if let sample = samples?.first as? HKQuantitySample {
        let rpm = Int(sample.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())))
        DispatchQueue.main.async { self?.localRespiratoryRate = rpm }
      }
    }
    healthStore.execute(q)
  }

  private func startHealthObservers() {
    let ids: [HKQuantityTypeIdentifier] = [
      .heartRate, .restingHeartRate, .oxygenSaturation, .respiratoryRate,
      .stepCount, .activeEnergyBurned, .distanceWalkingRunning,
    ]
    for id in ids {
      guard let type = HKQuantityType.quantityType(forIdentifier: id) else { continue }
      let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, _, error in
        guard error == nil else { return }
        self?.fetchAllHealthData()
      }
      healthStore.execute(query)
      healthStore.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }
  }

  /// Helper: fetch today's cumulative stat for a quantity type
  private func fetchTodayCumulativeStat(type: HKQuantityType, unit: HKUnit, completion: @escaping (Double) -> Void) {
    let start = Calendar.current.startOfDay(for: Date())
    let pred = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
    let q = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: pred, options: .cumulativeSum) { _, result, _ in
      let val = result?.sumQuantity()?.doubleValue(for: unit) ?? 0
      DispatchQueue.main.async { completion(val) }
    }
    healthStore.execute(q)
  }

  // MARK: - Timer (Countdown)

  func setTimer(seconds: Int) {
    timerTotalSeconds = seconds
    timerRemainingSeconds = seconds
  }

  func addTimerFavorite(_ seconds: Int) {
    if !timerFavorites.contains(seconds) {
      timerFavorites.append(seconds)
      timerFavorites.sort()
      saveTimerFavorites()
    }
  }

  func removeTimerFavorite(_ seconds: Int) {
    timerFavorites.removeAll { $0 == seconds }
    saveTimerFavorites()
  }

  private func saveTimerFavorites() {
    UserDefaults.standard.set(timerFavorites, forKey: "timerFavorites")
  }

  func loadTimerFavorites() {
    timerFavorites = UserDefaults.standard.array(forKey: "timerFavorites") as? [Int] ?? []
  }

  // Source de vérité : date de fin absolue
  private var timerEndDate: Date? {
    get { UserDefaults.standard.object(forKey: "yoroi_timerEndDate") as? Date }
    set { UserDefaults.standard.set(newValue, forKey: "yoroi_timerEndDate") }
  }

  func startTimer() {
    timerAlarmRinging = false
    timerIsRunning = true

    // 1. Sauvegarder la date de fin absolue (source de vérité)
    let endDate = Date().addingTimeInterval(Double(timerRemainingSeconds))
    timerEndDate = endDate

    // 2. Notification locale — se déclenche même en veille complète
    scheduleTimerNotification(fireDate: endDate, seconds: timerRemainingSeconds)

    // 3. Session étendue — garde l'app en vie en arrière-plan
    startExtendedSession()

    // 4. Timer UI — calcule depuis endDate (pas de décrément simple)
    //    Mode .common = fire même si le RunLoop est dans un autre mode
    let t = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
      DispatchQueue.main.async { self?.tickFromEndDate() }
    }
    RunLoop.main.add(t, forMode: .common)
    timer = t

    sendAction("timerStarted", data: ["seconds": timerTotalSeconds])
  }

  private func tickFromEndDate() {
    guard let endDate = timerEndDate else { return }
    let remaining = max(0, Int(endDate.timeIntervalSinceNow.rounded()))
    timerRemainingSeconds = remaining
    if remaining <= 0 {
      timerIsRunning = false
      timer?.invalidate()
      timer = nil
      timerEndDate = nil
      startAlarm()
    }
  }

  // Appelé quand l'app revient au premier plan : resynchronise depuis endDate
  func resyncTimerIfNeeded() {
    guard timerIsRunning, let endDate = timerEndDate else { return }
    let remaining = max(0, Int(endDate.timeIntervalSinceNow.rounded()))
    if remaining <= 0 {
      // Le timer a expiré pendant la veille
      timerIsRunning = false
      timer?.invalidate()
      timer = nil
      timerEndDate = nil
      timerRemainingSeconds = 0
      startAlarm()
    } else {
      timerRemainingSeconds = remaining
    }
  }

  func pauseTimer() {
    timerIsRunning = false
    timer?.invalidate()
    timer = nil
    timerEndDate = nil
    cancelTimerNotification()
    stopExtendedSession()
  }

  func resetTimer() {
    stopAlarm()
    timerIsRunning = false
    timer?.invalidate()
    timer = nil
    timerEndDate = nil
    cancelTimerNotification()
    stopExtendedSession()
    timerRemainingSeconds = timerTotalSeconds
  }

  // MARK: - Notifications locales

  /// Planifie TOUTES les notifications dès le départ du timer :
  /// - 1 notification à l'heure exacte de fin
  /// - 40 répétitions toutes les 15s (= 10 minutes d'alarme)
  /// Ainsi même si l'app ne tourne pas en background, les notifications arrivent.
  private func scheduleTimerNotification(fireDate: Date, seconds: Int) {
    let center = UNUserNotificationCenter.current()
    center.removeAllPendingNotificationRequests()

    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
      guard granted else { return }

      let wizzSound = UNNotificationSound(named: UNNotificationSoundName("wizz.mp3"))

      // — Notification principale à la fin exacte du timer
      let main = UNMutableNotificationContent()
      main.title              = "TIMER TERMINÉ"
      main.body               = "Appuie pour arrêter l'alarme"
      main.sound              = wizzSound
      main.categoryIdentifier = "yoroi.timer.alarm"
      if #available(watchOS 8.0, *) { main.interruptionLevel = .timeSensitive }
      let delay = max(1, seconds)
      center.add(UNNotificationRequest(
        identifier: "yoroi.timer.end",
        content: main,
        trigger: UNTimeIntervalNotificationTrigger(timeInterval: Double(delay), repeats: false)
      ))

      // — 40 répétitions toutes les 15s après la fin = 10 minutes d'alarme en boucle
      for i in 1...40 {
        let rep = UNMutableNotificationContent()
        rep.title              = "TIMER TERMINÉ"
        rep.body               = "Appuie pour arrêter l'alarme"
        rep.sound              = wizzSound
        rep.categoryIdentifier = "yoroi.timer.alarm"
        if #available(watchOS 8.0, *) { rep.interruptionLevel = .timeSensitive }
        center.add(UNNotificationRequest(
          identifier: "yoroi.timer.repeat.\(i)",
          content: rep,
          trigger: UNTimeIntervalNotificationTrigger(
            timeInterval: Double(delay) + Double(i * 15),
            repeats: false
          )
        ))
      }
    }
  }

  private func cancelTimerNotification() {
    var ids = ["yoroi.timer.end"]
    ids += (1...40).map { "yoroi.timer.repeat.\($0)" }
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
  }

  // MARK: - Alarm (son wizz illimité + haptics)

  private func startAlarm() {
    timerAlarmRinging = true

    // Session étendue pour garder le son en vie
    startExtendedSession()

    // Son wizz en boucle illimitée
    playWizzSoundLooping()

    // Double tap immédiat + haptic toutes les 1.2s
    WKInterfaceDevice.current().play(.notification)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
      WKInterfaceDevice.current().play(.notification)
    }
    let ht = Timer(timeInterval: 1.2, repeats: true) { [weak self] _ in
      DispatchQueue.main.async {
        guard let self = self, self.timerAlarmRinging else { return }
        WKInterfaceDevice.current().play(.notification)
      }
    }
    RunLoop.main.add(ht, forMode: .common)
    hapticTimer = ht

    sendAction("timerFinished")
  }

  func stopAlarm() {
    timerAlarmRinging = false
    audioPlayer?.stop()
    audioPlayer = nil
    hapticTimer?.invalidate()
    hapticTimer = nil
    UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    stopExtendedSession()
  }

  /// Appelé par le background task handler dans YoroiWatchApp
  func handleAlarmBackgroundRefresh() {
    guard timerAlarmRinging else { return }
    WKInterfaceDevice.current().play(.notification)
  }

  // MARK: - Extended Runtime Session (keeps timer alive in background)

  private func startExtendedSession() {
    stopExtendedSession()
    let session = WKExtendedRuntimeSession()
    session.delegate = self
    session.start()
    extendedSession = session
  }

  private func stopExtendedSession() {
    if extendedSession?.state == .running {
      extendedSession?.invalidate()
    }
    extendedSession = nil
  }

  // MARK: - Wizz Sound (looping)

  /// Appelable depuis le contrôleur de notification (app en background)
  func startAlarmAudio() {
    playWizzSoundLooping()
  }

  private func playWizzSoundLooping() {
    // Activer la catégorie .playback pour permettre l'audio en arrière-plan
    // sur watchOS avec une session étendue active
    let audioSession = AVAudioSession.sharedInstance()
    try? audioSession.setCategory(.playback, mode: .default)
    try? audioSession.setActive(true)

    guard let url = Bundle.main.url(forResource: "wizz", withExtension: "mp3") else {
      WKInterfaceDevice.current().play(.notification)
      return
    }
    do {
      audioPlayer = try AVAudioPlayer(contentsOf: url)
      audioPlayer?.numberOfLoops = -1
      audioPlayer?.volume = 1.0
      audioPlayer?.prepareToPlay()
      audioPlayer?.play()
    } catch {
      // Fallback vibration si le fichier son ne se charge pas
      WKInterfaceDevice.current().play(.notification)
    }
  }

  // MARK: - Weekly Stats

  var weeklyWorkoutCount: Int {
    let calendar = Calendar.current
    let now = Date()
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    return recentWorkouts.filter { entry in
      guard let d = fmt.date(from: entry.date) else { return false }
      return calendar.isDate(d, equalTo: now, toGranularity: .weekOfYear)
    }.count
  }

  var weeklyCaloriesBurned: Int {
    let calendar = Calendar.current
    let now = Date()
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    return recentWorkouts.filter { entry in
      guard let d = fmt.date(from: entry.date) else { return false }
      return calendar.isDate(d, equalTo: now, toGranularity: .weekOfYear)
    }.reduce(0) { $0 + $1.calories }
  }

  /// Delta poids vs il y a 7 jours (positif = prise, négatif = perte)
  var weightTrendDelta: Double? {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    let sorted = weightHistory.compactMap { entry -> (Double, Date)? in
      guard let d = fmt.date(from: entry.date) else { return nil }
      return (entry.weight, d)
    }.sorted { $0.1 > $1.1 }
    guard let latest = sorted.first else { return nil }
    let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    guard let prev = sorted.first(where: { $0.1 <= weekAgo }) else { return nil }
    return latest.0 - prev.0
  }

  func formattedTime(_ totalSeconds: Int) -> String {
    let h = totalSeconds / 3600
    let m = (totalSeconds % 3600) / 60
    let s = totalSeconds % 60
    if h > 0 {
      return String(format: "%d:%02d:%02d", h, m, s)
    }
    return String(format: "%d:%02d", m, s)
  }

  // MARK: - Goals (synced back to phone)

  func updateStepsGoal(_ goal: Int) {
    stepsGoal = goal
    sendAction("updateStepsGoal", data: ["stepsGoal": goal])
  }

  func updateHydrationGoal(_ goal: Int) {
    hydrationGoal = goal
    sendAction("updateHydrationGoal", data: ["hydrationGoal": goal])
  }

  // MARK: - Hydration

  func addHydration(_ amount: Int) {
    hydrationCurrent = max(0, hydrationCurrent + amount)
    sendAction("addHydration", data: [
      "amount": amount,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])
  }

  // MARK: - Weight

  func logWeight(_ weight: Double) {
    currentWeight = weight
    sendAction("addWeight", data: [
      "weight": weight,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])
  }

  // MARK: - Carnet / Benchmarks

  @Published var localLogHistory: [LocalLogEntry] = []

  func logBenchmarkEntry(benchmarkId: String, exerciseName: String, value: Double, reps: Int, rpe: Int) {
    // Sauvegarde locale immédiate (visible sans attendre l'iPhone)
    let entry = LocalLogEntry(
      id: UUID(),
      benchmarkId: benchmarkId,
      exerciseName: exerciseName,
      value: value,
      reps: reps,
      rpe: rpe,
      date: Date()
    )
    localLogHistory.insert(entry, at: 0)
    if localLogHistory.count > 100 { localLogHistory = Array(localLogHistory.prefix(100)) }
    saveLocalHistory()

    // Envoi vers l'iPhone
    sendAction("addBenchmarkEntry", data: [
      "benchmarkId": benchmarkId,
      "exerciseName": exerciseName,
      "value": value,
      "reps": reps,
      "rpe": rpe,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])
  }

  private func saveLocalHistory() {
    if let data = try? JSONEncoder().encode(localLogHistory) {
      UserDefaults.standard.set(data, forKey: "yoroi_localLogHistory")
    }
  }

  func loadLocalHistory() {
    if let data = UserDefaults.standard.data(forKey: "yoroi_localLogHistory"),
       let entries = try? JSONDecoder().decode([LocalLogEntry].self, from: data) {
      localLogHistory = entries
    }
  }

  // MARK: - Theme (synced back to phone)

  func changeThemeMode(_ mode: String) {
    themeMode = mode
    // Appliquer les couleurs immédiatement sans attendre l'iPhone
    applyDefaultThemeColors(for: mode)
    sendAction("changeThemeMode", data: ["themeMode": mode])
    // Sync avec l'iPhone pour récupérer les vraies couleurs personnalisées
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
      self.requestSync()
    }
  }

  private func applyDefaultThemeColors(for mode: String) {
    if mode == "light" {
      themeBgHex          = "#FFFFFF"
      themeCardBgHex      = "#F2F2F7"
      themeTextPrimaryHex = "#1A1A1A"
      themeTextSecondaryHex = "#6B6B6B"
      themeDividerHex     = "#D1D1D6"
      themeTextOnAccentHex = "#FFFFFF"
    } else {
      themeBgHex          = "#000000"
      themeCardBgHex      = "#151515"
      themeTextPrimaryHex = "#FFFFFF"
      themeTextSecondaryHex = "#E0E0E0"
      themeDividerHex     = "#2A2A2A"
      themeTextOnAccentHex = "#FFFFFF"
    }
  }

  // MARK: - Units (synced back to phone)

  func changeUnitSystem(_ unit: String) {
    sendAction("changeUnitSystem", data: ["unitSystem": unit])
  }

  // MARK: - Timer preset (synced back to phone)

  func changeTimerPreset(_ seconds: Int) {
    sendAction("changeTimerPreset", data: ["timerSeconds": seconds])
  }

  // MARK: - Send to iPhone

  private func sendAction(_ action: String, data: [String: Any] = [:]) {
    guard let session = session else { return }

    var message = data
    message["action"] = action
    message["watchAppVersion"] = "2.0.0"

    if session.isReachable {
      session.sendMessage(message, replyHandler: nil) { _ in }
    } else {
      var context = session.applicationContext
      context["pendingAction"] = action
      context["pendingData"] = data
      context["watchAppVersion"] = "2.0.0"
      try? session.updateApplicationContext(context)
    }
  }

  func requestSync() {
    sendAction("syncRequest")
  }

  // MARK: - WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async {
      self.isConnected = activationState == .activated
    }
    if activationState == .activated { requestSync() }
  }

  func session(_ session: WCSession, didReceiveApplicationContext ctx: [String: Any]) {
    DispatchQueue.main.async { self.processData(ctx) }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    DispatchQueue.main.async { self.processData(message) }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    DispatchQueue.main.async { self.processData(message) }
    replyHandler(["status": "received"])
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    DispatchQueue.main.async { self.processData(userInfo) }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async { self.isConnected = session.isReachable }
    if session.isReachable { requestSync() }
  }

  // MARK: - File Transfer (large profile photos)

  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    let metadata = file.metadata ?? [:]
    let fileType = metadata["type"] as? String ?? ""

    if fileType == "profilePhoto" {
      do {
        let data = try Data(contentsOf: file.fileURL)
        DispatchQueue.main.async {
          self.profileImageData = data
        }
      } catch {
        // file transfer error ignored
      }
    }
  }

  // MARK: - Process Incoming Data

  private func processData(_ data: [String: Any]) {
    lastSyncDate = Date()
    isConnected = true

    // Helper: JS numbers arrive as NSNumber which can be Double or Int
    func intVal(_ key: String) -> Int? {
      if let v = data[key] as? Int { return v }
      if let v = data[key] as? Double { return Int(v) }
      return nil
    }

    // -- MegaPack compact keys --
    if let w = data["w"] as? Double { currentWeight = w }
    if let wi = data["wi"] as? Double { hydrationCurrent = Int(wi) }
    if let un = data["un"] as? String { userName = un }
    if let lv = intVal("lv") { level = lv }
    if let rk = data["rk"] as? String { rank = rk }
    if let s = intVal("s") { streak = s }

    // -- Full format keys --
    if let w = data["currentWeight"] as? Double { currentWeight = w }
    if let tw = data["targetWeight"] as? Double { targetWeight = tw }
    if let sw = data["startWeight"] as? Double { startWeight = sw }
    if let h = data["height"] as? Double { userHeight = h }
    if let hc = intVal("hydrationCurrent") { hydrationCurrent = hc }
    if let hg = intVal("hydrationGoal") { hydrationGoal = hg }
    if let sd = intVal("sleepDuration") { sleepDuration = sd }
    if let sq = intVal("sleepQuality") { sleepQuality = sq }
    if let sbt = data["sleepBedTime"] as? String { sleepBedTime = sbt }
    if let swt = data["sleepWakeTime"] as? String { sleepWakeTime = swt }
    if let sg = intVal("sleepGoal") { sleepGoalMinutes = sg }
    if let sdb = data["sleepDebt"] as? Double { sleepDebt = sdb }
    if let ss = intVal("sleepScore") { sleepScore = ss }
    if let sg = intVal("stepsGoal") { stepsGoal = sg }

    // Body composition
    if let bf = data["bodyFat"] as? Double { bodyFat = bf }
    if let mm = data["muscleMass"] as? Double { muscleMass = mm }
    if let wp = data["waterPercent"] as? Double { waterPercent = wp }

    // Health metrics
    if let hr = intVal("heartRate") { heartRate = hr }
    if let hrMin = intVal("heartRateMin") { heartRateMin = hrMin }
    if let hrMax = intVal("heartRateMax") { heartRateMax = hrMax }
    if let rhr = intVal("restingHeartRate") { restingHeartRate = rhr }
    if let sp = intVal("spo2") { spo2 = sp }
    if let rr = intVal("respiratoryRate") { respiratoryRate = rr }
    if let ac = intVal("activeCalories") { activeCalories = ac }
    if let em = intVal("exerciseMinutes") { exerciseMinutes = em }
    if let sh = intVal("standHours") { standHours = sh }
    if let dist = data["distance"] as? Double { distance = dist }

    // Profile extras
    if let st = intVal("streak") { streak = st }
    if let imgBase64 = data["profileImage"] as? String,
       let imgData = Data(base64Encoded: imgBase64) {
      profileImageData = imgData
    }

    // Préférences (unités + timer)
    if let us = data["unitSystem"] as? String {
      UserDefaults.standard.set(us, forKey: "unitSystem")
    }
    if let dts = intVal("defaultTimerSeconds"), dts >= 10 {
      UserDefaults.standard.set(dts, forKey: "defaultTimerSeconds")
    }

    // Theme colors + mode
    if let ta = data["themeAccent"] as? String { themeAccentHex = ta }
    if let tc = data["themeCompanion"] as? String { themeCompanionHex = tc }
    if let tm = data["themeMode"] as? String { themeMode = tm }
    if let tb = data["themeBg"] as? String { themeBgHex = tb }
    if let tcb = data["themeCardBg"] as? String { themeCardBgHex = tcb }
    if let ttp = data["themeTextPrimary"] as? String { themeTextPrimaryHex = ttp }
    if let tts = data["themeTextSecondary"] as? String { themeTextSecondaryHex = tts }
    if let td = data["themeDivider"] as? String { themeDividerHex = td }
    if let ttoa = data["themeTextOnAccent"] as? String { themeTextOnAccentHex = ttoa }

    // BMI calculation
    if currentWeight > 0 && userHeight > 0 {
      let hm = userHeight / 100.0
      bmi = currentWeight / (hm * hm)
    }

    // Weight updates
    if let wu = data["weightUpdate"] as? [String: Any] {
      if let w = wu["weight"] as? Double { currentWeight = w }
    }

    // Hydration updates
    if let hu = data["hydrationUpdate"] as? [String: Any] {
      if let wi = hu["waterIntake"] as? Double { hydrationCurrent = Int(wi) }
    }

    // Weight history
    if let history = data["weightHistory"] as? [[String: Any]] {
      weightHistory = history.compactMap { dict in
        guard let weight = dict["weight"] as? Double,
              let date = dict["date"] as? String else { return nil }
        return WeightEntry(weight: weight, date: date)
      }
    }

    // Hydration weekly
    if let weekly = data["hydrationWeekly"] as? [[String: Any]] {
      hydrationWeekly = weekly.compactMap { dict in
        guard let day = dict["day"] as? String,
              let amount = dict["amount"] as? Int else { return nil }
        let goal = dict["goal"] as? Int ?? hydrationGoal
        return DayHydration(day: day, amount: amount, goal: goal)
      }
    }

    // Benchmarks (Carnet / Records)
    if let records = data["benchmarks"] as? [[String: Any]] {
      benchmarks = records.compactMap { dict in
        guard let id = dict["id"] as? String,
              let name = dict["name"] as? String else { return nil }
        return BenchmarkRecord(
          id: id,
          name: name,
          category: dict["category"] as? String ?? "Force",
          sport: dict["sport"] as? String ?? "",
          unit: dict["unit"] as? String ?? "kg",
          pr: dict["pr"] as? Double ?? 0,
          prReps: dict["prReps"] as? Int ?? 0,
          prDate: dict["prDate"] as? String ?? "",
          lastValue: dict["lastValue"] as? Double ?? 0,
          entryCount: dict["entryCount"] as? Int ?? 0
        )
      }
      // Persist Carnet summary for complications
      let withPR = benchmarks.filter { $0.pr > 0 }
      UserDefaults.standard.set(withPR.count, forKey: "yoroi_carnet_totalPRs")
      if let top = withPR.sorted(by: { $0.entryCount > $1.entryCount }).first {
        UserDefaults.standard.set(top.name, forKey: "yoroi_carnet_lastExercise")
        UserDefaults.standard.set(top.pr, forKey: "yoroi_carnet_lastPR")
        UserDefaults.standard.set(top.unit, forKey: "yoroi_carnet_lastUnit")
      }
      reloadComplications()
    }

    // Recent workouts
    if let workouts = data["recentWorkouts"] as? [[String: Any]] {
      recentWorkouts = workouts.compactMap { dict in
        guard let type = dict["type"] as? String,
              let duration = dict["duration"] as? Int else { return nil }
        return WorkoutEntry(
          type: type,
          duration: duration,
          calories: dict["calories"] as? Int ?? 0,
          date: dict["date"] as? String ?? ""
        )
      }
    }

    if data["pong"] != nil { isConnected = true }
  }
}

// MARK: - Extended Runtime Session Delegate

extension WatchSessionManager: WKExtendedRuntimeSessionDelegate {
  func extendedRuntimeSessionDidStart(_ extendedRuntimeSession: WKExtendedRuntimeSession) {
  }

  func extendedRuntimeSessionWillExpire(_ extendedRuntimeSession: WKExtendedRuntimeSession) {
    // If timer or alarm still active, fire a last burst of haptics
    if timerIsRunning || timerAlarmRinging {
      WKInterfaceDevice.current().play(.notification)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        WKInterfaceDevice.current().play(.notification)
      }
    }
  }

  func extendedRuntimeSession(_ extendedRuntimeSession: WKExtendedRuntimeSession, didInvalidateWith reason: WKExtendedRuntimeSessionInvalidationReason, error: Error?) {
    // If timer or alarm is still active, try to restart extended session
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      if self.timerIsRunning || self.timerAlarmRinging {
        self.startExtendedSession()
      }
    }
  }
}

// MARK: - Color Hex Extension

extension Color {
  init?(hex: String) {
    var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if h.hasPrefix("#") { h.removeFirst() }
    guard h.count == 6, let val = UInt64(h, radix: 16) else { return nil }
    self.init(
      red: Double((val >> 16) & 0xFF) / 255.0,
      green: Double((val >> 8) & 0xFF) / 255.0,
      blue: Double(val & 0xFF) / 255.0
    )
  }
}

// MARK: - Exercise Library (pre-registered exercises by muscle group)

struct ExerciseTemplate: Identifiable {
  let id: String
  let name: String
  let muscleGroup: String
  let category: String
  let unit: String
  let icon: String

  static let library: [ExerciseTemplate] = [

    // ═══════════════════════════════════════
    // PECTORAUX (20)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "bench-press", name: "Développé Couché (Barre)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "incline-bench-press", name: "Développé Incliné (Barre)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "decline-bench-press", name: "Développé Décliné (Barre)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dumbbell-bench-press", name: "Développé Haltères", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "incline-dumbbell-press", name: "Développé Haltères Incliné", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "decline-dumbbell-press", name: "Développé Haltères Décliné", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "chest-fly", name: "Ecarté Couché (Haltères)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "incline-fly", name: "Ecarté Incliné (Haltères)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cable-crossover", name: "Croisé Câble Haut", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cable-crossover-low", name: "Croisé Câble Bas", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cable-crossover-mid", name: "Croisé Câble Milieu", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "chest-press-machine-pec", name: "Chest Press Machine", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pec-deck", name: "Pec Deck (Butterfly)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dips-chest", name: "Dips (Focus Pectoraux)", muscleGroup: "Pectoraux", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "weighted-push-up", name: "Pompes Lestées", muscleGroup: "Pectoraux", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pullover-dumbbell", name: "Pull-Over Haltère", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "floor-press", name: "Développé Sol (Floor Press)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "svend-press", name: "Compression Pecto (Svend Press)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "landmine-press-chest", name: "Landmine Press", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "push-up-standard", name: "Pompes (Poids de Corps)", muscleGroup: "Pectoraux", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // DOS (22)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "deadlift", name: "Soulevé de Terre", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "deadlift-romanian", name: "Deadlift Roumain", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "deadlift-sumo", name: "Deadlift Sumo", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "pull-up", name: "Tractions Pronation", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pull-up-supination", name: "Tractions Supination", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pull-up-wide", name: "Tractions Larges", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pull-up-neutral", name: "Tractions Prises Neutres", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "lat-pulldown", name: "Tirage Poulie Haute", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "lat-pulldown-close", name: "Tirage Serré V-Bar", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "lat-pulldown-neck", name: "Tirage Nuque", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "lat-pulldown-unilateral", name: "Tirage Unilatéral", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "barbell-row", name: "Rowing Barre", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pendlay-row", name: "Rowing Pendlay", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dumbbell-row", name: "Rowing Haltère (One Arm)", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "seated-cable-row", name: "Rowing Câble Assis", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "t-bar-row", name: "Rowing T-Bar", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "seal-row", name: "Rowing Plat-Ventre (Seal Row)", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "chest-supported-row", name: "Rowing Soutenu (Banc)", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "low-row-machine-dos", name: "Low Row Machine", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "face-pull", name: "Tirage Visage (Face Pull)", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hyperextensions", name: "Hyperextensions", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "good-morning", name: "Inclinaison Barre (Good Morning)", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // EPAULES (16)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "military-press", name: "Développé Militaire (Barre)", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dumbbell-shoulder-press", name: "Développé Haltères Assis", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dumbbell-shoulder-press-stand", name: "Développé Haltères Debout", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "arnold-press", name: "Arnold Press", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "lateral-raise", name: "Elévations Latérales", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cable-lateral-raise", name: "Elévations Latérales Câble", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "lateral-raise-machine", name: "Elévations Latérales Machine", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "front-raise", name: "Elévations Frontales", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rear-delt-fly", name: "Oiseau (Deltoïdes Postérieurs)", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rear-delt-machine", name: "Oiseau Machine", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "upright-row", name: "Rowing Menton", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "shoulder-press-machine", name: "Développé Epaules Machine", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "bradford-press", name: "Bradford Press", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "w-raise", name: "W-Raise (YTW)", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "band-pull-apart", name: "Ecartement Elastique (Band Pull-Apart)", muscleGroup: "Epaules", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pike-push-up", name: "Pompes Pike", muscleGroup: "Epaules", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // BRAS (18)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "barbell-curl", name: "Curl Barre", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dumbbell-curl", name: "Curl Haltères", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hammer-curl", name: "Curl Marteau", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "preacher-curl", name: "Curl Pupitre (Larry Scott)", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "concentration-curl", name: "Curl Concentré", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cable-curl", name: "Curl Câble Bas", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "incline-curl", name: "Curl Incliné (Haltères)", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "spider-curl", name: "Curl Araignée (Spider Curl)", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "reverse-curl", name: "Curl Inversé (Pronation)", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tricep-pushdown", name: "Extension Triceps Poulie", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tricep-pushdown-rope", name: "Extension Triceps Corde", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "skull-crusher", name: "Barre au Front (Skull Crusher)", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "close-grip-bench-press", name: "Développé Serré (Triceps)", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "overhead-tricep-extension", name: "Extension Triceps Nuque", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dips-triceps", name: "Dips (Focus Triceps)", muscleGroup: "Bras", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tricep-kickback", name: "Kickback Triceps", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "wrist-curl", name: "Curl Poignets", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl-21s", name: "21s Biceps", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // JAMBES (20)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "squat", name: "Squat (Barre)", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "front-squat", name: "Squat Avant", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "hack-squat", name: "Hack Squat (Machine)", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "goblet-squat", name: "Squat Coupe (Goblet Squat)", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "box-squat", name: "Squat sur Boîte (Box Squat)", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "bulgarian-split-squat", name: "Squat Bulgare", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg-press", name: "Presse à Cuisses", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "lunges", name: "Fentes Avant", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "reverse-lunges", name: "Fentes Arrière", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "walking-lunges", name: "Fentes Marchées", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg-extension", name: "Leg Extension", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg-curl", name: "Leg Curl Allongé", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg-curl-seated", name: "Leg Curl Assis", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "standing-calf-raise", name: "Mollets Debout", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "seated-calf-raise", name: "Mollets Assis", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip-thrust", name: "Poussée de Hanche (Hip Thrust)", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "glute-kickback", name: "Glute Kickback Câble", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip-abductor", name: "Abducteur Machine", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip-adductor", name: "Adducteur Machine", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "nordic-curl", name: "Curl Nordique (Ischio)", muscleGroup: "Jambes", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // ABDOS (14)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "crunch", name: "Crunch", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "crunch-decline", name: "Crunch Décliné", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "sit-up", name: "Sit-Up", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "plank", name: "Gainage (Planche)", muscleGroup: "Abdos", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "side-plank", name: "Gainage Latéral", muscleGroup: "Abdos", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "ab-wheel", name: "Roue Abdominale", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "hanging-leg-raise", name: "Relevé de Jambes Suspendu", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "hanging-knee-raise", name: "Relevé de Genoux Suspendu", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "russian-twist", name: "Rotation Russe", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "cable-crunch", name: "Crunch Câble", muscleGroup: "Abdos", category: "Musculation", unit: "kg", icon: "figure.core.training"),
    ExerciseTemplate(id: "bicycle-crunch", name: "Crunch Vélo", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "dragon-flag", name: "Dragon Flag", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "pallof-press", name: "Pallof Press", muscleGroup: "Abdos", category: "Musculation", unit: "kg", icon: "figure.core.training"),
    ExerciseTemplate(id: "dead-bug", name: "Gainage Sol (Dead Bug)", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),

    // ═══════════════════════════════════════
    // MACHINES (12)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "chest-press-machine", name: "Presse Pectoraux Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "shoulder-press-machine-m", name: "Développé Epaules Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "lat-pulldown-machine", name: "Tirage Dorsal Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "low-row-machine", name: "Rowing Bas Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg-press-machine", name: "Presse Jambes Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg-extension-machine", name: "Leg Extension Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg-curl-machine", name: "Leg Curl Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip-abductor-m", name: "Abducteur Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip-adductor-m", name: "Adducteur Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "back-extension-machine", name: "Extension Lombaires", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl-machine", name: "Curl Biceps Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tricep-machine", name: "Extension Triceps Machine", muscleGroup: "Machines", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // OLYMPIQUE (12)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "snatch", name: "Arraché", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "clean-and-jerk", name: "Epaulé-Jeté", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "power-clean", name: "Power Clean", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "hang-clean", name: "Hang Clean", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "hang-snatch", name: "Hang Snatch", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "power-snatch", name: "Power Snatch", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "push-press", name: "Push Press", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "push-jerk", name: "Push Jerk", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "split-jerk", name: "Split Jerk", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "clean-pull", name: "Tirage Epaulé", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "block-clean", name: "Clean sur Blocs", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "snatch-squat", name: "Squat Arraché", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),

    // ═══════════════════════════════════════
    // STRONGMAN (12)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "atlas-stone", name: "Pierre d\'Atlas (Atlas Stone)", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "tire-flip", name: "Retournement de Pneu (Tire Flip)", muscleGroup: "Strongman", category: "Strongman", unit: "reps", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "farmers-walk", name: "Marche du Fermier (Farmers Walk)", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "log-press", name: "Développé à la Bûche (Log Press)", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "yoke-walk", name: "Marche au Joug (Yoke Walk)", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "keg-toss", name: "Lancer de Tonneau", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "axle-deadlift", name: "Deadlift Axle", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "conan-wheel", name: "Roue de Conan", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "sandbag-carry", name: "Portée Sac de Sable", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "viking-press", name: "Viking Press", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "arm-over-arm-pull", name: "Tirage Bras-sur-Bras", muscleGroup: "Strongman", category: "Strongman", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "car-deadlift", name: "Deadlift Voiture", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),

    // ═══════════════════════════════════════
    // CROSSFIT WODs (20)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "murph", name: "Murph", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "fran", name: "Fran", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cindy", name: "Cindy", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "flame.fill"),
    ExerciseTemplate(id: "grace", name: "Grace", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "helen", name: "Helen", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "annie", name: "Annie", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "karen", name: "Karen", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "jackie", name: "Jackie", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "diane", name: "Diane", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "elizabeth", name: "Elizabeth", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "amanda", name: "Amanda", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "isabel", name: "Isabel", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "mary", name: "Mary", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "flame.fill"),
    ExerciseTemplate(id: "linda", name: "Linda", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "flame.fill"),
    ExerciseTemplate(id: "chelsea", name: "Chelsea", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "flame.fill"),
    ExerciseTemplate(id: "barbara", name: "Barbara", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "nancy", name: "Nancy", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "kelly", name: "Kelly", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "eva", name: "Eva", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "filthy-fifty", name: "Filthy Fifty", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    // CrossFit Mouvements (20)
    ExerciseTemplate(id: "thruster", name: "Thruster (Squat + Développé)", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "flame.fill"),
    ExerciseTemplate(id: "wall-ball", name: "Lancer au Mur (Wall Ball)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "flame.fill"),
    ExerciseTemplate(id: "box-jump", name: "Saut sur Boîte (Box Jump)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.jumprope"),
    ExerciseTemplate(id: "double-under", name: "Double Saut Corde (Double Under)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.jumprope"),
    ExerciseTemplate(id: "toes-to-bar", name: "Pieds à la Barre (Toes to Bar)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "kipping-pull-up", name: "Traction Kipping", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "butterfly-pull-up", name: "Traction Papillon (Butterfly)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "muscle-up", name: "Muscle Up Barre", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ring-muscle-up", name: "Muscle Up Anneaux", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "handstand-push-up", name: "Pompes en Equilibre (HSPU)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "handstand-walk", name: "Marche sur les Mains", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rope-climb", name: "Corde Lisse", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "burpee", name: "Burpee", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.jumprope"),
    ExerciseTemplate(id: "kettlebell-swing", name: "Kettlebell Swing Russe", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "american-kb-swing", name: "Balancé KB Américain", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "goblet-squat-kb", name: "Squat Coupe Kettlebell", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "devil-press", name: "Devil Press (Sol + Développé)", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "flame.fill"),
    ExerciseTemplate(id: "dumbbell-snatch", name: "Arraché Haltère", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "flame.fill"),
    ExerciseTemplate(id: "single-leg-deadlift", name: "Deadlift Unijambiste", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "assault-bike-cal", name: "Vélo Air (Calories)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.outdoor.cycle"),

    // ═══════════════════════════════════════
    // HYROX (12)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "hyrox-sled-push", name: "Poussée Traîneau (Sled Push)", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "hyrox-sled-pull", name: "Tirage Traîneau (Sled Pull)", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "hyrox-skierg", name: "SkiErg 1000m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.skiing.downhill"),
    ExerciseTemplate(id: "hyrox-row", name: "Rameur 1000m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "hyrox-farmers-carry", name: "Portée de Fermier (Farmers Carry)", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "hyrox-sandbag-lunges", name: "Fentes Sac de Sable", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "hyrox-wall-balls", name: "Lancers au Mur 100 reps", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "hyrox-burpees", name: "Burpees Grand Saut", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.jumprope"),
    ExerciseTemplate(id: "hyrox-run-1k", name: "Run 1km (entre stations)", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "hyrox-full", name: "Hyrox Complet", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "hyrox-simulator", name: "Hyrox Simul. 4 Stations", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "hyrox-open", name: "Hyrox Open (Solo)", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "flame.fill"),

    // ═══════════════════════════════════════
    // RUNNING (15)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "run-100m", name: "100m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-200m", name: "200m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-400m", name: "400m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-800m", name: "800m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-1500m", name: "1500m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-3k", name: "3km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-5k", name: "5km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-10k", name: "10km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run-15k", name: "15km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "half-marathon", name: "Semi-Marathon (21km)", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "marathon", name: "Marathon (42km)", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "vma-interval", name: "Fractionné VMA", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "tempo-run", name: "Allure au Seuil", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "long-run", name: "Sortie Longue", muscleGroup: "Running", category: "Running", unit: "km", icon: "figure.run"),
    ExerciseTemplate(id: "trail-run", name: "Trail", muscleGroup: "Running", category: "Running", unit: "km", icon: "figure.run"),

    // ═══════════════════════════════════════
    // CARDIO (14)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "bike-ergometer", name: "Vélo Ergomètre", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "spinning", name: "Spinning / Biking", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "assault-bike", name: "Assault Bike (AirBike)", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "ski-erg", name: "SkiErg Technogym", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.skiing.downhill"),
    ExerciseTemplate(id: "rowing-machine", name: "Rameur Concept2", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "treadmill", name: "Tapis Roulant", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "treadmill-incline", name: "Tapis Incliné (Marche)", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.walk"),
    ExerciseTemplate(id: "elliptical", name: "Elliptique / Vario", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.elliptical"),
    ExerciseTemplate(id: "stairmaster", name: "Stepper / Stairmaster", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.stair.stepper"),
    ExerciseTemplate(id: "jump-rope", name: "Corde à Sauter", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.jumprope"),
    ExerciseTemplate(id: "cycling", name: "Cyclisme (Vélo de Route)", muscleGroup: "Cardio", category: "Cardio", unit: "km", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "swimming", name: "Natation", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.pool.swim"),
    ExerciseTemplate(id: "swimming-50m", name: "Nage 50m", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.pool.swim"),
    ExerciseTemplate(id: "hiit-session", name: "Séance HIIT (Fractionné Intensif)", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "flame.fill"),

    // ═══════════════════════════════════════
    // COMBAT (15)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "bjj-gi", name: "BJJ Kimono", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "bjj-nogi", name: "BJJ No-Gi / Grappling", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "boxing", name: "Boxe Anglaise", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "muay-thai", name: "Muay Thai", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "savate", name: "Savate / Boxe Française", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "kickboxing", name: "Kickboxing / K-1", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "wrestling", name: "Lutte (Wrestling)", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "judo", name: "Judo", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "mma", name: "MMA", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "sparring", name: "Sparring (Assaut Libre)", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "padwork", name: "Travail aux Pattes", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "bag-work", name: "Sac de Frappe", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "shadow-boxing", name: "Boxe à l\'Ombre (Shadow Boxing)", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "catch-wrestling", name: "Lutte avec Soumissions (Catch)", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "competition", name: "Compétition", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),

    // ═══════════════════════════════════════
    // STREET WORKOUT (15)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "street-pull-up", name: "Tractions Max", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "street-pull-up-wide", name: "Tractions Larges", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "street-dips", name: "Dips Barres Parallèles", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "push-up-max", name: "Pompes Max en 1 set", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "muscle-up-bar", name: "Muscle Up Barre (Max)", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "muscle-up-rings", name: "Muscle Up Anneaux", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "front-lever", name: "Levier Avant (Front Lever)", muscleGroup: "Street Workout", category: "Street Workout", unit: "time", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "back-lever", name: "Levier Arrière (Back Lever)", muscleGroup: "Street Workout", category: "Street Workout", unit: "time", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "planche", name: "Planche Tenue", muscleGroup: "Street Workout", category: "Street Workout", unit: "time", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tuck-planche", name: "Planche Regroupée (Tuck Planche)", muscleGroup: "Street Workout", category: "Street Workout", unit: "time", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "human-flag", name: "Drapeau (Human Flag)", muscleGroup: "Street Workout", category: "Street Workout", unit: "time", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "l-sit", name: "L-Sit sur Barres", muscleGroup: "Street Workout", category: "Street Workout", unit: "time", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pistol-squat", name: "Squat Unijambiste (Max)", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "skin-the-cat", name: "Tour de Barre (Skin the Cat)", muscleGroup: "Street Workout", category: "Street Workout", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dead-hang", name: "Dead Hang (Suspension)", muscleGroup: "Street Workout", category: "Street Workout", unit: "time", icon: "figure.strengthtraining.traditional"),
  ]

  static var muscleGroups: [String] {
    let order = ["Pectoraux", "Dos", "Epaules", "Bras", "Jambes", "Abdos", "Machines", "Olympique", "Strongman", "CrossFit", "Hyrox", "Running", "Cardio", "Combat", "Street Workout"]
    return order
  }

  static func exercises(for group: String) -> [ExerciseTemplate] {
    library.filter { $0.muscleGroup == group }
  }
}

// MARK: - Models

struct WorkoutEntry: Identifiable {
  let id = UUID()
  let type: String
  let duration: Int
  let calories: Int
  let date: String

  var formattedDuration: String {
    let min = duration / 60
    return "\(min) min"
  }

  var icon: String {
    switch type.lowercased() {
    case "combat", "boxe", "mma", "jjb", "judo", "karate", "lutte":
      return "figure.martial.arts"
    case "muscu", "musculation", "force":
      return "figure.strengthtraining.traditional"
    case "cardio", "running", "course":
      return "figure.run"
    case "yoga", "stretching":
      return "figure.yoga"
    default:
      return "figure.mixed.cardio"
    }
  }
}

struct WeightEntry: Identifiable {
  let id = UUID()
  let weight: Double
  let date: String
}

struct DayHydration: Identifiable {
  let id = UUID()
  let day: String
  let amount: Int
  let goal: Int

  var progress: Double {
    guard goal > 0 else { return 0 }
    return min(1.0, Double(amount) / Double(goal))
  }
}

struct LocalLogEntry: Identifiable, Codable {
  let id: UUID
  let benchmarkId: String
  let exerciseName: String
  let value: Double
  let reps: Int
  let rpe: Int
  let date: Date

  var formattedValue: String {
    value > 0 ? String(format: value.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f kg" : "%.1f kg", value) : "--"
  }

  var shortDate: String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "fr_FR")
    f.dateFormat = "d MMM HH:mm"
    return f.string(from: date)
  }
}

struct BenchmarkRecord: Identifiable {
  let id: String
  let name: String
  let category: String // Force, Endurance, Speed, Power
  let sport: String
  let unit: String // kg, lbs, reps, time, km
  let pr: Double
  let prReps: Int
  let prDate: String
  let lastValue: Double
  let entryCount: Int

  var icon: String {
    switch category.lowercased() {
    case "force": return "scalemass.fill"
    case "endurance": return "heart.fill"
    case "speed", "vitesse": return "hare.fill"
    case "power", "puissance": return "bolt.fill"
    default: return "trophy.fill"
    }
  }

  var formattedPR: String {
    switch unit.lowercased() {
    case "kg", "lbs":
      return String(format: "%.1f %@", pr, unit)
    case "reps":
      return "\(Int(pr)) reps"
    case "time":
      let m = Int(pr) / 60
      let s = Int(pr) % 60
      return String(format: "%d:%02d", m, s)
    case "km":
      return String(format: "%.1f km", pr)
    default:
      return String(format: "%.1f %@", pr, unit)
    }
  }
}
