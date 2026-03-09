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
  @Published var heartRate: Int = 0
  @Published var heartRateMin: Int = 0
  @Published var heartRateMax: Int = 0
  @Published var restingHeartRate: Int = 0
  @Published var spo2: Int = 0
  @Published var respiratoryRate: Int = 0
  @Published var activeCalories: Int = 0
  @Published var exerciseMinutes: Int = 0
  @Published var standHours: Int = 0
  @Published var distance: Double = 0.0

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
  @Published var requestedTab: Int = 0

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

  // MARK: - Notifications locales (vibration + son en veille)

  private func scheduleTimerNotification(fireDate: Date, seconds: Int) {
    let center = UNUserNotificationCenter.current()
    center.removeAllPendingNotificationRequests()

    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
      guard granted else { return }

      let content = UNMutableNotificationContent()
      content.title             = "Timer YOROI"
      content.body              = "Ton timer est terminé !"
      content.sound             = UNNotificationSound.defaultCritical
      if #available(watchOS 8.0, *) {
        content.interruptionLevel = .timeSensitive
      }

      let delay = max(1, seconds)
      let trigger = UNTimeIntervalNotificationTrigger(timeInterval: Double(delay), repeats: false)
      let request = UNNotificationRequest(identifier: "yoroi.timer.end", content: content, trigger: trigger)
      center.add(request)
    }
  }

  private func cancelTimerNotification() {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["yoroi.timer.end"])
  }

  // MARK: - Alarm (looping sound + vibration until stopped)

  private func startAlarm() {
    timerAlarmRinging = true
    playWizzSoundLooping()
    // Première vibration immédiate
    WKInterfaceDevice.current().play(.notification)
    // Vibrations répétées — mode .common pour rester actif même si le RunLoop bascule
    let ht = Timer(timeInterval: 1.5, repeats: true) { [weak self] _ in
      DispatchQueue.main.async {
        guard let self = self, self.timerAlarmRinging else { return }
        WKInterfaceDevice.current().play(.notification)
      }
    }
    RunLoop.main.add(ht, forMode: .common)
    hapticTimer = ht
    // Notifications toutes les 15s pendant 15 min
    scheduleAlarmRepeatNotifications()
    // Background refresh dans 12 min pour replanifier → boucle infinie
    scheduleAlarmBackgroundRefresh()
    // Notifier l'iPhone que le timer est terminé (notification locale iPhone)
    sendAction("timerFinished")
  }

  func stopAlarm() {
    timerAlarmRinging = false
    // Stop looping sound
    audioPlayer?.stop()
    audioPlayer = nil
    // Stop haptic loop
    hapticTimer?.invalidate()
    hapticTimer = nil
    // Cancel repeat alarm notifications
    cancelAlarmRepeatNotifications()
    // Now stop extended session
    stopExtendedSession()
  }

  /// Planifie des notifications toutes les 15s pendant 15 min — puis un background refresh replanifie
  private func scheduleAlarmRepeatNotifications() {
    let center = UNUserNotificationCenter.current()
    // Nettoyer les anciennes
    let oldIds = (1...60).map { "yoroi.alarm.repeat.\($0)" }
    center.removePendingNotificationRequests(withIdentifiers: oldIds)

    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
      guard granted else { return }
      for i in 1...60 {
        let content = UNMutableNotificationContent()
        content.title = "Timer YOROI"
        content.body  = "Ouvre l'app pour arrêter !"
        content.sound = .defaultCritical
        content.categoryIdentifier = "yoroi.timer.alarm"
        if #available(watchOS 8.0, *) {
          content.interruptionLevel = .timeSensitive
        }
        // 15s entre chaque notification → 60 × 15 = 15 minutes
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: Double(i * 15), repeats: false)
        let request = UNNotificationRequest(identifier: "yoroi.alarm.repeat.\(i)", content: content, trigger: trigger)
        center.add(request)
      }
    }
  }

  private func cancelAlarmRepeatNotifications() {
    let ids = (1...60).map { "yoroi.alarm.repeat.\($0)" }
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
  }

  // MARK: - Background refresh (replanifie l'alarme avant épuisement des notifications)

  func scheduleAlarmBackgroundRefresh() {
    // Se déclenche dans 12 min (avant que les 15 min de notifications se terminent)
    let fireDate = Date().addingTimeInterval(12 * 60)
    WKExtension.shared().scheduleBackgroundRefresh(
      withPreferredDate: fireDate,
      userInfo: "yoroi.alarm.refresh" as NSString
    ) { _ in }
  }

  /// Appelé par le background task handler dans YoroiWatchApp
  func handleAlarmBackgroundRefresh() {
    guard timerAlarmRinging else { return }
    // Replanifier un nouveau lot de 60 notifications + vibration + nouveau refresh
    scheduleAlarmRepeatNotifications()
    scheduleAlarmBackgroundRefresh()
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

  private func playWizzSoundLooping() {
    // Configure audio session for playback (keeps audio alive in background)
    do {
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.playback, mode: .default, options: [])
      try audioSession.setActive(true)
    } catch {
      // audio session error ignored
    }

    // Try to play the bundled wizz sound in loop
    if let url = Bundle.main.url(forResource: "wizz-made-with-Voicemod", withExtension: "mp3") {
      do {
        audioPlayer = try AVAudioPlayer(contentsOf: url)
        audioPlayer?.numberOfLoops = -1  // Loop forever until stopped
        audioPlayer?.volume = 1.0
        audioPlayer?.play()
      } catch {
        // sound error ignored
      }
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
    // PECTORAUX (14 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "dc", name: "Developpe couche", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "di", name: "Developpe incline", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dd", name: "Developpe decline", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dc_halt", name: "Developpe couche halteres", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "di_halt", name: "Developpe incline halteres", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dips_pec", name: "Dips pectoraux", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ecarte", name: "Ecarte halteres", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ecarte_inc", name: "Ecarte incline", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pec_deck", name: "Pec deck (butterfly)", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cable_cross", name: "Cable crossover", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pompes", name: "Pompes", muscleGroup: "Pectoraux", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pompes_dia", name: "Pompes diamant", muscleGroup: "Pectoraux", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pullover", name: "Pullover", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "smith_bench", name: "Smith machine couche", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // DOS (16 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "tractions", name: "Tractions", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tractions_l", name: "Tractions lestees", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tractions_s", name: "Tractions supination", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rowing_barre", name: "Rowing barre", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rowing_halt", name: "Rowing haltere", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rowing_t", name: "Rowing T-bar", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tirage_vert", name: "Tirage vertical", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tirage_hor", name: "Tirage horizontal", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tirage_serr", name: "Tirage prise serree", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "sdt", name: "Souleve de terre", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "sdt_roum", name: "Souleve de terre roumain", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "sdt_sumo", name: "Souleve de terre sumo", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "good_morning", name: "Good morning", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pulldown", name: "Pulldown", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "meadow_row", name: "Meadows row", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hyper_ext", name: "Hyperextension", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // EPAULES (14 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "dev_mil", name: "Developpe militaire", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dev_halt", name: "Developpe halteres assis", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "arnold", name: "Arnold press", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "elev_lat", name: "Elevations laterales", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "elev_lat_c", name: "Elevations laterales cable", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "elev_front", name: "Elevations frontales", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "oiseau", name: "Oiseau (rear delt fly)", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "oiseau_mach", name: "Reverse pec deck", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "face_pull", name: "Face pull", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "shrug", name: "Shrugs halteres", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "shrug_bar", name: "Shrugs barre", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "upright_row", name: "Rowing menton", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "push_press", name: "Push press", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "landmine_pr", name: "Landmine press", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // BRAS (16 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "curl_bic", name: "Curl biceps barre", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_halt", name: "Curl halteres", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_mart", name: "Curl marteau", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_ez", name: "Curl barre EZ", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_inc", name: "Curl incline", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_conc", name: "Curl concentration", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_larry", name: "Larry Scott curl", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_cable", name: "Curl cable", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ext_tri", name: "Extension triceps poulie", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ext_tri_co", name: "Extension triceps corde", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dips_tri", name: "Dips triceps", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "skull", name: "Skull crusher", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "kickback", name: "Kickback triceps", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ext_over", name: "Extension overhead", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "barre_front", name: "Barre au front", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_avant", name: "Curl avant-bras", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // JAMBES (18 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "squat", name: "Squat barre", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "squat_front", name: "Front squat", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "squat_gob", name: "Goblet squat", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "squat_bulg", name: "Bulgarian split squat", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "squat_sumo", name: "Squat sumo", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "presse", name: "Presse a cuisses", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "presse_45", name: "Presse 45 degres", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "hack_squat", name: "Hack squat", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "fentes", name: "Fentes", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "fentes_mar", name: "Fentes marchees", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg_ext", name: "Leg extension", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg_curl", name: "Leg curl", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg_curl_d", name: "Leg curl debout", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip_thrust", name: "Hip thrust", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip_abd", name: "Hip abduction machine", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip_add", name: "Hip adduction machine", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets", name: "Mollets debout", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets_a", name: "Mollets assis", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // ABDOS (10 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "crunch", name: "Crunch", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "crunch_cable", name: "Crunch cable", muscleGroup: "Abdos", category: "Musculation", unit: "kg", icon: "figure.core.training"),
    ExerciseTemplate(id: "planche", name: "Gainage planche", muscleGroup: "Abdos", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "planche_lat", name: "Gainage lateral", muscleGroup: "Abdos", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "releve_j", name: "Releve de jambes", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "releve_j_s", name: "Releve de jambes suspendu", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "russian", name: "Russian twist", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "ab_wheel", name: "Ab wheel rollout", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "dragon_flag", name: "Dragon flag", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "sit_up", name: "Sit-up", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),

    // ═══════════════════════════════════════
    // HALTEROPHILIE / OLYMPIQUE (10 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "clean", name: "Clean (epauler)", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "clean_jerk", name: "Clean & Jerk", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "snatch", name: "Snatch (arrache)", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "power_clean", name: "Power clean", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "power_snatch", name: "Power snatch", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "hang_clean", name: "Hang clean", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "hang_snatch", name: "Hang snatch", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "jerk", name: "Jerk (epauler-jeter)", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "thruster", name: "Thruster", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "overhead_sq", name: "Overhead squat", muscleGroup: "Olympique", category: "Halterophilie", unit: "kg", icon: "scalemass.fill"),

    // ═══════════════════════════════════════
    // CROSSFIT (20 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "cf_fran", name: "Fran (21-15-9)", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_grace", name: "Grace (30 C&J)", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_isabel", name: "Isabel (30 Snatch)", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_helen", name: "Helen", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_diane", name: "Diane", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_jackie", name: "Jackie", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_murph", name: "Murph", muscleGroup: "CrossFit", category: "CrossFit", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_cindy", name: "Cindy (AMRAP 20)", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "flame.fill"),
    ExerciseTemplate(id: "cf_burpee", name: "Burpees", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.jumprope"),
    ExerciseTemplate(id: "cf_box_jump", name: "Box jumps", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.jumprope"),
    ExerciseTemplate(id: "cf_du", name: "Double unders", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.jumprope"),
    ExerciseTemplate(id: "cf_mu", name: "Muscle-ups", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cf_ring_mu", name: "Ring muscle-ups", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cf_hspu", name: "Handstand push-ups", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cf_t2b", name: "Toes to bar", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cf_kbs", name: "Kettlebell swing", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "cf_kb_snatch", name: "Kettlebell snatch", muscleGroup: "CrossFit", category: "CrossFit", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "cf_wall_walk", name: "Wall walks", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cf_pistol", name: "Pistol squat", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "cf_rope_climb", name: "Rope climb", muscleGroup: "CrossFit", category: "CrossFit", unit: "reps", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // HYROX (12 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "hyrox_full", name: "HYROX complet", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "skierg", name: "SkiErg 1000m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.skiing.downhill"),
    ExerciseTemplate(id: "sled_push", name: "Sled Push 50m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "sled_pull", name: "Sled Pull 50m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "burpee_bj", name: "Burpee Broad Jump 80m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.jumprope"),
    ExerciseTemplate(id: "hyrox_row", name: "Rowing 1000m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "farmers", name: "Farmers Carry 200m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "sandbag", name: "Sandbag Lunges 100m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "wall_ball", name: "Wall Balls 100x", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "hyrox_run", name: "HYROX Run 1km", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "hyrox_pro", name: "HYROX Pro complet", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "flame.fill"),
    ExerciseTemplate(id: "hyrox_doubles", name: "HYROX Doubles", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "flame.fill"),

    // ═══════════════════════════════════════
    // RUNNING (12 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "run_400", name: "400m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_800", name: "800m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_1k", name: "1 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_1500", name: "1500m", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_3k", name: "3 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_5k", name: "5 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_10k", name: "10 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_15k", name: "15 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_semi", name: "Semi-marathon", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_mara", name: "Marathon", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_ultra", name: "Ultra-trail", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_cooper", name: "Test Cooper 12min", muscleGroup: "Running", category: "Running", unit: "km", icon: "figure.run"),

    // ═══════════════════════════════════════
    // CARDIO / MACHINES (14 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "rameur_500", name: "Rameur 500m", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "rameur_1k", name: "Rameur 1000m", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "rameur_2k", name: "Rameur 2000m", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "rameur_5k", name: "Rameur 5000m", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "assault", name: "Assault Bike (cal)", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "echo_bike", name: "Echo Bike (cal)", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "velo_int", name: "Velo interieur", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "skierg_gen", name: "SkiErg", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.skiing.downhill"),
    ExerciseTemplate(id: "elliptique", name: "Elliptique", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.elliptical"),
    ExerciseTemplate(id: "stairmaster", name: "Stairmaster", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.stair.stepper"),
    ExerciseTemplate(id: "corde", name: "Corde a sauter", muscleGroup: "Cardio", category: "Cardio", unit: "reps", icon: "figure.jumprope"),
    ExerciseTemplate(id: "battle_rope", name: "Battle ropes", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "tapis", name: "Tapis de course", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "natation", name: "Natation", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.pool.swim"),

    // ═══════════════════════════════════════
    // COMBAT / MARTIAL ARTS (10 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "sac_round", name: "Sac de frappe (rounds)", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "sparring", name: "Sparring", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "shadow", name: "Shadow boxing", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "pads", name: "Pattes d'ours", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "randori", name: "Randori (judo/jjb)", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "rolling", name: "Rolling (jjb)", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "combat_cond", name: "Conditioning combat", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "kata", name: "Kata", muscleGroup: "Combat", category: "Combat", unit: "reps", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "clinch", name: "Clinch work", muscleGroup: "Combat", category: "Combat", unit: "time", icon: "figure.martial.arts"),
    ExerciseTemplate(id: "takedown", name: "Takedown drill", muscleGroup: "Combat", category: "Combat", unit: "reps", icon: "figure.martial.arts"),

    // ═══════════════════════════════════════
    // STRONGMAN (8 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "atlas_stone", name: "Atlas stones", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "log_press", name: "Log press", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "yoke_walk", name: "Yoke walk", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "tire_flip", name: "Tire flip", muscleGroup: "Strongman", category: "Strongman", unit: "reps", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "axle_press", name: "Axle press", muscleGroup: "Strongman", category: "Strongman", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "car_deadlift", name: "Car deadlift", muscleGroup: "Strongman", category: "Strongman", unit: "reps", icon: "scalemass.fill"),
    ExerciseTemplate(id: "sandbag_carry", name: "Sandbag carry", muscleGroup: "Strongman", category: "Strongman", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "keg_toss", name: "Keg toss", muscleGroup: "Strongman", category: "Strongman", unit: "reps", icon: "figure.strengthtraining.functional"),

    // ═══════════════════════════════════════
    // FESSIERS (18 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "hip_thrust_b", name: "Hip thrust barre", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip_thrust_h", name: "Hip thrust haltere", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip_thrust_m", name: "Hip thrust machine", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "glute_bridge", name: "Glute bridge", muscleGroup: "Fessiers", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "glute_bridge_u", name: "Glute bridge unilateral", muscleGroup: "Fessiers", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "kickback_c", name: "Cable kickback", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "abduction", name: "Abduction hanche", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "abduction_m", name: "Machine abduction", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "fentes_l", name: "Fentes laterales", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "step_up", name: "Step up (boite)", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rdl_uni", name: "RDL unilateral", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "donkey_kick", name: "Donkey kick", muscleGroup: "Fessiers", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "quadruped_ext", name: "Extension quadrupedie", muscleGroup: "Fessiers", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "sumo_squat", name: "Squat sumo leste", muscleGroup: "Fessiers", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "pistol_glute", name: "Pistol squat", muscleGroup: "Fessiers", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "monster_walk", name: "Monster walk elastique", muscleGroup: "Fessiers", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "clamshell", name: "Clamshell", muscleGroup: "Fessiers", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "squat_wall", name: "Squat isometrique (mur)", muscleGroup: "Fessiers", category: "Musculation", unit: "time", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // ISCHIOS & MOLLETS (16 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "nordic_curl", name: "Nordic curl", muscleGroup: "Ischios", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg_curl_c", name: "Leg curl couche", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg_curl_s", name: "Leg curl assis", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rdl_isch", name: "Soulevé de terre roumain", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "rdl_halt", name: "RDL halteres", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "good_morn", name: "Good morning", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pull_thr", name: "Cable pull through", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "glute_ham", name: "Glute ham raise", muscleGroup: "Ischios", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "inertie_isch", name: "Curl ischio elastique", muscleGroup: "Ischios", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets_d", name: "Mollets debout machine", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets_as", name: "Mollets assis machine", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets_uni", name: "Mollets unilateral", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets_donkey", name: "Donkey calf raise", muscleGroup: "Ischios", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets_saut", name: "Jump rope mollets", muscleGroup: "Ischios", category: "Musculation", unit: "time", icon: "figure.jumprope"),
    ExerciseTemplate(id: "tibialis", name: "Tibialis raise", muscleGroup: "Ischios", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ankle_circle", name: "Cercles chevilles", muscleGroup: "Ischios", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),

    // ═══════════════════════════════════════
    // MOBILITE & GAINAGE (14 exercices)
    // ═══════════════════════════════════════
    ExerciseTemplate(id: "planche", name: "Planche", muscleGroup: "Mobilite", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "planche_lat", name: "Planche laterale", muscleGroup: "Mobilite", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "planche_dyn", name: "Planche dynamique", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "hollow_body", name: "Hollow body hold", muscleGroup: "Mobilite", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "dead_bug", name: "Dead bug", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "bird_dog", name: "Bird dog", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "hip_90_90", name: "Hip 90/90 stretch", muscleGroup: "Mobilite", category: "Musculation", unit: "time", icon: "figure.flexibility"),
    ExerciseTemplate(id: "pigeon_pose", name: "Pigeon pose", muscleGroup: "Mobilite", category: "Musculation", unit: "time", icon: "figure.flexibility"),
    ExerciseTemplate(id: "jefferson_curl", name: "Jefferson curl", muscleGroup: "Mobilite", category: "Musculation", unit: "kg", icon: "figure.flexibility"),
    ExerciseTemplate(id: "cossack_squat", name: "Cossack squat", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "world_greatest", name: "World's greatest stretch", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.flexibility"),
    ExerciseTemplate(id: "cat_cow", name: "Cat cow", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.flexibility"),
    ExerciseTemplate(id: "thoracic_rot", name: "Rotation thoracique", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.flexibility"),
    ExerciseTemplate(id: "ankle_mob", name: "Mobilite cheville", muscleGroup: "Mobilite", category: "Musculation", unit: "reps", icon: "figure.flexibility"),
  ]

  static var muscleGroups: [String] {
    let order = ["Pectoraux", "Dos", "Epaules", "Bras", "Jambes", "Fessiers", "Ischios", "Abdos", "Mobilite", "Olympique", "CrossFit", "Hyrox", "Running", "Cardio", "Combat", "Strongman"]
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
