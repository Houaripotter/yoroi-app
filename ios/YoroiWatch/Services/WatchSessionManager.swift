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

  // MARK: - Steps
  @Published var stepsGoal: Int = 8000

  // MARK: - Profile
  @Published var userName: String = ""
  @Published var level: Int = 1
  @Published var rank: String = ""

  // MARK: - Timer (countdown minuteur)
  @Published var timerTotalSeconds: Int = 90 // preset
  @Published var timerRemainingSeconds: Int = 90
  @Published var timerIsRunning: Bool = false
  @Published var timerMode: String = "Repos" // Repos, Combat, Tabata

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
    if WCSession.isSupported() {
      session = WCSession.default
      session?.delegate = self
      session?.activate()
    }
  }

  // MARK: - Timer (Countdown)

  func setTimer(seconds: Int) {
    timerTotalSeconds = seconds
    timerRemainingSeconds = seconds
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
    // PECTORAUX
    ExerciseTemplate(id: "dc", name: "Developpe couche", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "di", name: "Developpe incline", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dips_pec", name: "Dips", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ecarte", name: "Ecarte halteres", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pompes", name: "Pompes", muscleGroup: "Pectoraux", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "pullover", name: "Pullover", muscleGroup: "Pectoraux", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // DOS
    ExerciseTemplate(id: "tractions", name: "Tractions", muscleGroup: "Dos", category: "Musculation", unit: "reps", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "rowing_barre", name: "Rowing barre", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tirage_vert", name: "Tirage vertical", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "sdt", name: "Souleve de terre", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "rowing_halt", name: "Rowing haltere", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "tirage_hor", name: "Tirage horizontal", muscleGroup: "Dos", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // EPAULES
    ExerciseTemplate(id: "dev_mil", name: "Developpe militaire", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "elev_lat", name: "Elevations laterales", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "oiseau", name: "Oiseau", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "face_pull", name: "Face pull", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "arnold", name: "Arnold press", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "shrug", name: "Shrugs", muscleGroup: "Epaules", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // BRAS
    ExerciseTemplate(id: "curl_bic", name: "Curl biceps", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_mart", name: "Curl marteau", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "curl_ez", name: "Curl barre EZ", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "ext_tri", name: "Extension triceps", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "dips_tri", name: "Dips triceps", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "skull", name: "Skull crusher", muscleGroup: "Bras", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // JAMBES
    ExerciseTemplate(id: "squat", name: "Squat", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "presse", name: "Presse a cuisses", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "scalemass.fill"),
    ExerciseTemplate(id: "fentes", name: "Fentes", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg_ext", name: "Leg extension", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "leg_curl", name: "Leg curl", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "mollets", name: "Mollets", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),
    ExerciseTemplate(id: "hip_thrust", name: "Hip thrust", muscleGroup: "Jambes", category: "Musculation", unit: "kg", icon: "figure.strengthtraining.traditional"),

    // ABDOS
    ExerciseTemplate(id: "crunch", name: "Crunch", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "planche", name: "Gainage planche", muscleGroup: "Abdos", category: "Musculation", unit: "time", icon: "figure.core.training"),
    ExerciseTemplate(id: "releve_j", name: "Releve de jambes", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),
    ExerciseTemplate(id: "russian", name: "Russian twist", muscleGroup: "Abdos", category: "Musculation", unit: "reps", icon: "figure.core.training"),

    // HYROX
    ExerciseTemplate(id: "skierg", name: "SkiErg 1000m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.skiing.downhill"),
    ExerciseTemplate(id: "sled_push", name: "Sled Push", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "sled_pull", name: "Sled Pull", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "burpee_bj", name: "Burpee Broad Jump", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.jumprope"),
    ExerciseTemplate(id: "hyrox_row", name: "Rowing 1000m", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "farmers", name: "Farmers Carry", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "sandbag", name: "Sandbag Lunges", muscleGroup: "Hyrox", category: "Hyrox", unit: "time", icon: "figure.strengthtraining.functional"),
    ExerciseTemplate(id: "wall_ball", name: "Wall Balls", muscleGroup: "Hyrox", category: "Hyrox", unit: "reps", icon: "figure.strengthtraining.functional"),

    // RUNNING
    ExerciseTemplate(id: "run_1k", name: "1 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_5k", name: "5 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_10k", name: "10 km", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_semi", name: "Semi-marathon", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),
    ExerciseTemplate(id: "run_mara", name: "Marathon", muscleGroup: "Running", category: "Running", unit: "time", icon: "figure.run"),

    // CARDIO
    ExerciseTemplate(id: "rameur", name: "Rameur 2000m", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.rower"),
    ExerciseTemplate(id: "assault", name: "Assault Bike", muscleGroup: "Cardio", category: "Cardio", unit: "time", icon: "figure.outdoor.cycle"),
    ExerciseTemplate(id: "corde", name: "Corde a sauter", muscleGroup: "Cardio", category: "Cardio", unit: "reps", icon: "figure.jumprope"),
  ]

  static var muscleGroups: [String] {
    let order = ["Pectoraux", "Dos", "Epaules", "Bras", "Jambes", "Abdos", "Hyrox", "Running", "Cardio"]
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
