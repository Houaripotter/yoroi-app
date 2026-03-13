import WidgetKit
import SwiftUI

// ============================================================
// YOROI WIDGETS — WidgetKit iOS
// 3 widgets : Dashboard, Hydratation, Streak
// ============================================================

private let APP_GROUP = "group.com.houari.yoroi"

// MARK: - Shared Data

struct YoroiWidgetData {
  var weight: Double  = 0
  var streak: Int     = 0
  var rank: String    = "Recrue"
  var waterCups: Int  = 0
  var waterGoal: Int  = 8
  var calories: Int   = 0
  var steps: Int      = 0
  var nextSession: String     = ""
  var nextSessionTime: String = ""

  static func load() -> YoroiWidgetData {
    let d = UserDefaults(suiteName: APP_GROUP)
    var data = YoroiWidgetData()
    data.weight       = d?.double(forKey: "weight")         ?? 0
    data.streak       = d?.integer(forKey: "streak")        ?? 0
    data.rank         = d?.string(forKey: "rank")           ?? "Recrue"
    data.waterCups    = d?.integer(forKey: "waterCups")     ?? 0
    data.waterGoal    = d?.integer(forKey: "waterGoal")     ?? 8
    data.calories     = d?.integer(forKey: "calories")      ?? 0
    data.steps        = d?.integer(forKey: "steps")         ?? 0
    data.nextSession  = d?.string(forKey: "nextSession")    ?? ""
    data.nextSessionTime = d?.string(forKey: "nextSessionTime") ?? ""
    return data
  }
}

// MARK: - Timeline Provider

struct YoroiProvider: TimelineProvider {
  func placeholder(in context: Context) -> YoroiEntry {
    YoroiEntry(date: Date(), data: YoroiWidgetData())
  }
  func getSnapshot(in context: Context, completion: @escaping (YoroiEntry) -> Void) {
    completion(YoroiEntry(date: Date(), data: YoroiWidgetData.load()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<YoroiEntry>) -> Void) {
    let entry = YoroiEntry(date: Date(), data: YoroiWidgetData.load())
    let next  = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct YoroiEntry: TimelineEntry {
  let date: Date
  let data: YoroiWidgetData
}

// MARK: - Design Tokens

private let gold    = Color(red: 0.831, green: 0.686, blue: 0.216)
private let bgDark  = Color(red: 0.05,  green: 0.05,  blue: 0.05)
private let card    = Color(red: 0.12,  green: 0.12,  blue: 0.12)

// MARK: - Helper: widgetBackground (iOS 17 compat)

extension View {
  @ViewBuilder
  func yoroiWidgetBg() -> some View {
    if #available(iOS 17.0, *) {
      self.containerBackground(bgDark, for: .widget)
    } else {
      self.background(bgDark)
    }
  }
}

// ============================================================
// MARK: - DASHBOARD WIDGET
// ============================================================

struct DashboardView: View {
  var entry: YoroiEntry
  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .systemSmall:  SmallDash(d: entry.data)
    case .systemLarge:  LargeDash(d: entry.data)
    default:            MediumDash(d: entry.data)
    }
  }
}

// Small — 2×2
struct SmallDash: View {
  var d: YoroiWidgetData
  var body: some View {
    ZStack {
      bgDark
      VStack(alignment: .leading, spacing: 0) {
        HStack {
          Text("YOROI")
            .font(.system(size: 10, weight: .black)).foregroundColor(gold).tracking(2)
          Spacer()
        }
        Spacer()
        if d.weight > 0 {
          Text(String(format: "%.1f", d.weight))
            .font(.system(size: 26, weight: .black, design: .rounded)).foregroundColor(.white)
          Text("kg").font(.system(size: 10)).foregroundColor(.gray)
        }
        Spacer()
        HStack {
          Image(systemName: "flame.fill").font(.system(size: 10)).foregroundColor(.orange)
          Text("\(d.streak)j").font(.system(size: 12, weight: .bold)).foregroundColor(.white)
          Spacer()
          Text(d.rank).font(.system(size: 9, weight: .semibold)).foregroundColor(gold).lineLimit(1)
        }
      }
      .padding(12)
    }
    .yoroiWidgetBg()
  }
}

// Medium — 4×2
struct MediumDash: View {
  var d: YoroiWidgetData
  var body: some View {
    ZStack {
      bgDark
      HStack(spacing: 0) {
        // Colonne gauche
        VStack(alignment: .leading, spacing: 10) {
          Text("YOROI").font(.system(size: 9, weight: .black)).foregroundColor(gold).tracking(2)
          if d.weight > 0 {
            row(sf: "scalemass.fill", v: String(format: "%.1f kg", d.weight), c: gold)
          }
          row(sf: "flame.fill",    v: "\(d.streak) jour\(d.streak > 1 ? "s" : "")", c: .orange)
          row(sf: "star.fill",     v: d.rank, c: gold)
        }
        .frame(maxWidth: .infinity, alignment: .leading).padding(14)

        Rectangle().fill(Color.white.opacity(0.08)).frame(width: 1).padding(.vertical, 10)

        // Colonne droite
        VStack(alignment: .leading, spacing: 10) {
          row(sf: "drop.fill",    v: "\(d.waterCups)/\(d.waterGoal) verres", c: .cyan)
          row(sf: "flame.fill",   v: "\(d.calories) kcal", c: .red)
          row(sf: "figure.walk",  v: "\(d.steps) pas", c: .green)
        }
        .frame(maxWidth: .infinity, alignment: .leading).padding(14)
      }
    }
    .yoroiWidgetBg()
  }

  func row(sf: String, v: String, c: Color) -> some View {
    HStack(spacing: 6) {
      Image(systemName: sf).font(.system(size: 11)).foregroundColor(c).frame(width: 14)
      Text(v).font(.system(size: 11, weight: .semibold)).foregroundColor(.white).lineLimit(1)
    }
  }
}

// Large — 4×4
struct LargeDash: View {
  var d: YoroiWidgetData
  var body: some View {
    ZStack {
      bgDark
      VStack(alignment: .leading, spacing: 12) {
        // Header
        HStack {
          Text("YOROI").font(.system(size: 13, weight: .black)).foregroundColor(gold).tracking(3)
          Spacer()
          Text(todayStr()).font(.system(size: 10)).foregroundColor(.gray)
        }
        Divider().background(Color.white.opacity(0.1))

        // Grid stats
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
          if d.weight > 0 {
            statCard("scalemass.fill", "Poids", String(format: "%.1f kg", d.weight), gold)
          }
          statCard("flame.fill",   "Streak",    "\(d.streak) jours",          .orange)
          statCard("drop.fill",    "Eau",        "\(d.waterCups)/\(d.waterGoal) verres", .cyan)
          statCard("flame.fill",   "Calories",  "\(d.calories) kcal",          .red)
        }

        Divider().background(Color.white.opacity(0.1))

        // Prochaine séance
        if !d.nextSession.isEmpty {
          HStack(spacing: 8) {
            Image(systemName: "calendar").foregroundColor(gold)
            VStack(alignment: .leading, spacing: 1) {
              Text("Prochaine séance").font(.system(size: 9)).foregroundColor(.gray)
              Text(d.nextSession).font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
            }
            Spacer()
            if !d.nextSessionTime.isEmpty {
              Text(d.nextSessionTime).font(.system(size: 12, weight: .bold)).foregroundColor(gold)
            }
          }
        }

        // Pas + Rang
        HStack {
          Image(systemName: "figure.walk").foregroundColor(.green)
          Text("\(d.steps) pas").font(.system(size: 11, weight: .semibold)).foregroundColor(.white)
          Spacer()
          Image(systemName: "star.fill").foregroundColor(gold)
          Text(d.rank).font(.system(size: 11, weight: .bold)).foregroundColor(gold)
        }
      }
      .padding(16)
    }
    .yoroiWidgetBg()
  }

  func statCard(_ sf: String, _ label: String, _ value: String, _ c: Color) -> some View {
    HStack(spacing: 8) {
      Image(systemName: sf).font(.system(size: 16)).foregroundColor(c)
      VStack(alignment: .leading, spacing: 2) {
        Text(label).font(.system(size: 9)).foregroundColor(.gray)
        Text(value).font(.system(size: 12, weight: .bold)).foregroundColor(.white).lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(8).background(card).cornerRadius(10)
  }

  func todayStr() -> String {
    let f = DateFormatter(); f.locale = Locale(identifier: "fr_FR")
    f.dateFormat = "EEEE d MMM"; return f.string(from: Date())
  }
}

// ============================================================
// MARK: - HYDRATATION WIDGET (small)
// ============================================================

struct HydrationView: View {
  var entry: YoroiEntry
  var body: some View {
    let d = entry.data
    let pct = d.waterGoal > 0 ? min(1.0, Double(d.waterCups) / Double(d.waterGoal)) : 0
    ZStack {
      bgDark
      VStack(spacing: 6) {
        Text("EAU").font(.system(size: 8, weight: .heavy)).foregroundColor(.cyan).tracking(2)
        ZStack {
          Circle().stroke(Color.cyan.opacity(0.2), lineWidth: 7)
          Circle()
            .trim(from: 0, to: pct)
            .stroke(Color.cyan, style: StrokeStyle(lineWidth: 7, lineCap: .round))
            .rotationEffect(.degrees(-90))
          VStack(spacing: 1) {
            Text("\(d.waterCups)").font(.system(size: 20, weight: .black)).foregroundColor(.white)
            Text("/ \(d.waterGoal)").font(.system(size: 9)).foregroundColor(.gray)
          }
        }
        .frame(width: 78, height: 78)
        Text("verres").font(.system(size: 9)).foregroundColor(.gray)
      }
      .padding(10)
    }
    .yoroiWidgetBg()
  }
}

// ============================================================
// MARK: - STREAK WIDGET (small)
// ============================================================

struct StreakView: View {
  var entry: YoroiEntry
  var body: some View {
    let d = entry.data
    ZStack {
      bgDark
      VStack(spacing: 4) {
        Text("STREAK").font(.system(size: 8, weight: .heavy)).foregroundColor(gold).tracking(1.5)
        Image(systemName: "flame.fill").font(.system(size: 26)).foregroundColor(.orange)
        Text("\(d.streak)")
          .font(.system(size: 30, weight: .black, design: .rounded)).foregroundColor(.white)
        Text("JOUR\(d.streak > 1 ? "S" : "")")
          .font(.system(size: 8, weight: .bold)).foregroundColor(.gray).tracking(1)
        Text(d.rank)
          .font(.system(size: 9, weight: .semibold)).foregroundColor(gold)
          .padding(.horizontal, 7).padding(.vertical, 2)
          .background(gold.opacity(0.15)).cornerRadius(5)
      }
      .padding(10)
    }
    .yoroiWidgetBg()
  }
}

// ============================================================
// MARK: - WIDGET CONFIGURATIONS
// ============================================================

struct YoroiDashboardWidget: Widget {
  let kind = "YoroiDashboardWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: YoroiProvider()) { DashboardView(entry: $0) }
      .configurationDisplayName("YOROI Dashboard")
      .description("Tes stats clés en un coup d'œil.")
      .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

struct YoroiHydrationWidget: Widget {
  let kind = "YoroiHydrationWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: YoroiProvider()) { HydrationView(entry: $0) }
      .configurationDisplayName("YOROI Hydratation")
      .description("Suis ta consommation d'eau quotidienne.")
      .supportedFamilies([.systemSmall])
  }
}

struct YoroiStreakWidget: Widget {
  let kind = "YoroiStreakWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: YoroiProvider()) { StreakView(entry: $0) }
      .configurationDisplayName("YOROI Streak")
      .description("Ta série d'entraînements consécutifs.")
      .supportedFamilies([.systemSmall])
  }
}

// ============================================================
// MARK: - BUNDLE
// ============================================================

@main
struct YoroiWidgetBundle: WidgetBundle {
  var body: some Widget {
    YoroiDashboardWidget()
    YoroiHydrationWidget()
    YoroiStreakWidget()
  }
}
