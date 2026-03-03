import Foundation
import WatchConnectivity
import WatchKit

class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {

  static let shared = WatchSessionManager()

  // MARK: - Weight
  @Published var currentWeight: Double = 0.0
  @Published var targetWeight: Double = 0.0
  @Published var startWeight: Double = 0.0
  @Published var weightHistory: [WeightEntry] = []
  @Published var bmi: Double = 0.0
  @Published var bodyFat: Double = 0.0
  @Published var muscleMass: Double = 0.0
  @Published var waterPercent: Double = 0.0
  @Published var userHeight: Double = 0.0 // cm - from Apple Health

  // MARK: - Hydration
  @Published var hydrationCurrent: Int = 0
  @Published var hydrationGoal: Int = 3000
  @Published var hydrationWeekly: [DayHydration] = []

  // MARK: - Sleep
  @Published var sleepDuration: Int = 0
  @Published var sleepQuality: Int = 0
  @Published var sleepBedTime: String = "--:--"
  @Published var sleepWakeTime: String = "--:--"
  @Published var sleepGoalMinutes: Int = 480
  @Published var sleepDebt: Double = 0.0

  // MARK: - Steps & Health
  @Published var stepsGoal: Int = 8000
  @Published var heartRate: Int = 0
  @Published var heartRateMin: Int = 0
  @Published var heartRateMax: Int = 0
  @Published var restingHeartRate: Int = 0
  @Published var spo2: Int = 0
  @Published var respiratoryRate: Int = 0
  @Published var activeCalories: Int = 0
  @Published var exerciseMinutes: Int = 0
  @Published var standHours: Int = 0
  @Published var distance: Double = 0.0 // km

  // MARK: - Profile
  @Published var userName: String = ""
  @Published var level: Int = 1
  @Published var rank: String = ""
  @Published var streak: Int = 0
  @Published var profileImageData: Data? = nil

  // MARK: - Timer (countdown minuteur)
  @Published var timerTotalSeconds: Int = 90 // preset
  @Published var timerRemainingSeconds: Int = 90
  @Published var timerIsRunning: Bool = false
  @Published var timerMode: String = "Repos" // Repos, Combat, Tabata
  @Published var timerFavorites: [Int] = [] // user saved presets in seconds

  // MARK: - Carnet (Training Journal)
  @Published var benchmarks: [BenchmarkRecord] = []
  @Published var recentWorkouts: [WorkoutEntry] = []

  // MARK: - Connection
  @Published var isConnected: Bool = false
  @Published var lastSyncDate: Date? = nil

  private var session: WCSession?
  private var timer: Timer?

  override init() {
    super.init()
    loadTimerFavorites()
    if WCSession.isSupported() {
      session = WCSession.default
      session?.delegate = self
      session?.activate()
    }
  }

  // MARK: - Timer (Countdown)

  func setTimer(seconds: Int, mode: String? = nil) {
    timerTotalSeconds = seconds
    timerRemainingSeconds = seconds
    if let m = mode { timerMode = m }
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

  func startTimer() {
    timerIsRunning = true
    timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
      DispatchQueue.main.async {
        guard let self = self else { return }
        if self.timerRemainingSeconds > 0 {
          self.timerRemainingSeconds -= 1
        } else {
          self.timerIsRunning = false
          self.timer?.invalidate()
          self.timer = nil
          // Haptic when done
          WKInterfaceDevice.current().play(.success)
        }
      }
    }
    sendAction("timerStarted", data: ["seconds": timerTotalSeconds])
  }

  func pauseTimer() {
    timerIsRunning = false
    timer?.invalidate()
    timer = nil
  }

  func resetTimer() {
    timerIsRunning = false
    timer?.invalidate()
    timer = nil
    timerRemainingSeconds = timerTotalSeconds
  }

  func formattedTime(_ totalSeconds: Int) -> String {
    let m = totalSeconds / 60
    let s = totalSeconds % 60
    return String(format: "%d:%02d", m, s)
  }

  // MARK: - Hydration

  func addHydration(_ amount: Int) {
    hydrationCurrent += amount
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

  func logBenchmarkEntry(benchmarkId: String, value: Double, reps: Int, rpe: Int) {
    sendAction("addBenchmarkEntry", data: [
      "benchmarkId": benchmarkId,
      "value": value,
      "reps": reps,
      "rpe": rpe,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])
  }

  // MARK: - Send to iPhone

  private func sendAction(_ action: String, data: [String: Any] = [:]) {
    guard let session = session else { return }

    var message = data
    message["action"] = action
    message["watchAppVersion"] = "2.0.0"

    if session.isReachable {
      session.sendMessage(message, replyHandler: nil) { error in
        print("[YoroiWatch] Send error: \(error.localizedDescription)")
      }
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

  // MARK: - Process Incoming Data

  private func processData(_ data: [String: Any]) {
    lastSyncDate = Date()
    isConnected = true

    // -- MegaPack compact keys --
    if let w = data["w"] as? Double { currentWeight = w }
    if let wi = data["wi"] as? Double { hydrationCurrent = Int(wi) }
    if let un = data["un"] as? String { userName = un }
    if let lv = data["lv"] as? Int { level = lv }
    if let rk = data["rk"] as? String { rank = rk }

    // -- Full format keys --
    if let w = data["currentWeight"] as? Double { currentWeight = w }
    if let tw = data["targetWeight"] as? Double { targetWeight = tw }
    if let sw = data["startWeight"] as? Double { startWeight = sw }
    if let h = data["height"] as? Double { userHeight = h }
    if let hc = data["hydrationCurrent"] as? Int { hydrationCurrent = hc }
    if let hg = data["hydrationGoal"] as? Int { hydrationGoal = hg }
    if let sd = data["sleepDuration"] as? Int { sleepDuration = sd }
    if let sq = data["sleepQuality"] as? Int { sleepQuality = sq }
    if let sbt = data["sleepBedTime"] as? String { sleepBedTime = sbt }
    if let swt = data["sleepWakeTime"] as? String { sleepWakeTime = swt }
    if let sg = data["sleepGoal"] as? Int { sleepGoalMinutes = sg }
    if let sdb = data["sleepDebt"] as? Double { sleepDebt = sdb }
    if let sg = data["stepsGoal"] as? Int { stepsGoal = sg }

    // Body composition
    if let bf = data["bodyFat"] as? Double { bodyFat = bf }
    if let mm = data["muscleMass"] as? Double { muscleMass = mm }
    if let wp = data["waterPercent"] as? Double { waterPercent = wp }

    // Health metrics
    if let hr = data["heartRate"] as? Int { heartRate = hr }
    if let hrMin = data["heartRateMin"] as? Int { heartRateMin = hrMin }
    if let hrMax = data["heartRateMax"] as? Int { heartRateMax = hrMax }
    if let rhr = data["restingHeartRate"] as? Int { restingHeartRate = rhr }
    if let sp = data["spo2"] as? Int { spo2 = sp }
    if let rr = data["respiratoryRate"] as? Int { respiratoryRate = rr }
    if let ac = data["activeCalories"] as? Int { activeCalories = ac }
    if let em = data["exerciseMinutes"] as? Int { exerciseMinutes = em }
    if let sh = data["standHours"] as? Int { standHours = sh }
    if let dist = data["distance"] as? Double { distance = dist }

    // Profile extras
    if let st = data["streak"] as? Int { streak = st }
    if let imgBase64 = data["profileImage"] as? String,
       let imgData = Data(base64Encoded: imgBase64) {
      profileImageData = imgData
    }

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
  ]

  static var muscleGroups: [String] {
    let order = ["Pectoraux", "Dos", "Epaules", "Bras", "Jambes", "Abdos", "Olympique", "CrossFit", "Hyrox", "Running", "Cardio", "Combat", "Strongman"]
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
