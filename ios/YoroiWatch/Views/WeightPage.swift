import SwiftUI

// ============================================================
// PAGE 2: POIDS - Pull-to-refresh + theme-aware colors
// ============================================================

struct WeightPage: View {

  @EnvironmentObject var session: WatchSessionManager
  @State private var showInput = false
  @State private var inputWeight: Double = 0.0

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {

        // ── SECTION 1: Arc 10 pill-segments + Weight ──
        VStack(spacing: 6) {
          HStack(spacing: 4) {
            Image(systemName: "scalemass.fill")
              .font(.system(size: 9))
              .foregroundColor(session.accentColor)
            Text("Poids")
              .font(.system(size: 11, weight: .semibold))
              .foregroundColor(session.textPrimary.opacity(0.7))
            Spacer()
            Text(userGoalLabel)
              .font(.system(size: 7, weight: .heavy))
              .foregroundColor(session.accentColor)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(session.accentColor.opacity(0.15))
              .cornerRadius(4)
          }
          .padding(.horizontal, 2)

          ZStack {
            PillArcView(
              progress: weightProgress,
              segments: 10,
              accentColor: session.accentColor,
              emptyColor: session.dividerColor
            )
            .frame(width: WatchScreen.s(140), height: WatchScreen.s(78))

            VStack(spacing: 0) {
              HStack(alignment: .firstTextBaseline, spacing: 1) {
                Text(session.currentWeight > 0 ? String(format: "%.1f", session.currentWeight) : "--")
                  .font(.system(size: WatchScreen.bigNumberSize, weight: .black))
                  .foregroundColor(session.textPrimary)
                Text("kg")
                  .font(.system(size: WatchScreen.labelSize, weight: .semibold))
                  .foregroundColor(session.textSecondary)
              }
              Text(progressText)
                .font(.system(size: WatchScreen.fs(8), weight: .semibold))
                .foregroundColor(session.textSecondary)
            }
            .offset(y: WatchScreen.s(18))
          }

          // 3 stats
          HStack(spacing: 0) {
            StatCol(label: "PERDU", value: String(format: "%.1f", lostKg), unit: "kg",
                    labelColor: .green, valueColor: .green, icon: "arrow.down.right", textPrimary: session.textPrimary, textSecondary: session.textSecondary)
            Rectangle().fill(session.dividerColor).frame(width: 1, height: 30)
            StatCol(label: "OBJECTIF", value: session.targetWeight > 0 ? String(format: "%.1f", session.targetWeight) : "--", unit: "kg",
                    labelColor: session.accentColor, valueColor: session.textPrimary, icon: "target", textPrimary: session.textPrimary, textSecondary: session.textSecondary)
            Rectangle().fill(session.dividerColor).frame(width: 1, height: 30)
            StatCol(label: "RESTE", value: String(format: "%.1f", remainingKg), unit: "kg",
                    labelColor: .red, valueColor: .red, icon: "arrow.up.right", textPrimary: session.textPrimary, textSecondary: session.textSecondary)
          }

          // Log button
          Button(action: {
            inputWeight = session.currentWeight > 0 ? session.currentWeight : 70.0
            showInput = true
          }) {
            HStack(spacing: 4) {
              Image(systemName: "plus.circle.fill").font(.system(size: 10))
              Text("Nouvelle pesee").font(.system(size: 10, weight: .semibold))
            }
            .foregroundColor(session.textOnAccent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(session.accentColor)
            .cornerRadius(8)
          }
          .buttonStyle(.plain)
        }

        Divider().background(session.dividerColor)

        // ── SECTION 2: Composition (Muscle/Fat/Water) ──
        VStack(spacing: 6) {
          Text("COMPOSITION")
            .font(.system(size: 8, weight: .heavy))
            .foregroundColor(session.textSecondary)
            .tracking(1)

          HStack(spacing: 8) {
            CompoMetric(label: "Muscle", value: session.muscleMass, color: Color(red: 0.94, green: 0.27, blue: 0.27), textPrimary: session.textSecondary)
            CompoMetric(label: "Graisse", value: session.bodyFat, color: Color(red: 0.96, green: 0.62, blue: 0.04), textPrimary: session.textSecondary)
            CompoMetric(label: "Eau", value: session.waterPercent, color: Color(red: 0.23, green: 0.51, blue: 0.96), textPrimary: session.textSecondary)
          }
        }

        // ── SECTION 3: Weight Chart ──
        if !session.weightHistory.isEmpty {
          VStack(alignment: .leading, spacing: 4) {
            Text("EVOLUTION")
              .font(.system(size: 7, weight: .heavy))
              .foregroundColor(session.textSecondary)
              .tracking(0.5)

            MiniBarChart(entries: Array(session.weightHistory.prefix(10)), accentColor: session.accentColor, textColor: session.textPrimary)
              .frame(height: 50)
          }
        }

        Divider().background(session.dividerColor)

        // ── SECTION 4: BMI Gauge ──
        VStack(spacing: 4) {
          Text("IMC")
            .font(.system(size: 8, weight: .heavy))
            .foregroundColor(session.textSecondary)
            .tracking(1)

          BMIGaugeView2(bmi: session.bmi, needleColor: session.textPrimary, labelColor: session.textSecondary)
            .frame(width: WatchScreen.s(130), height: WatchScreen.s(78))

          Text(String(format: "%.1f", session.bmi))
            .font(.system(size: WatchScreen.bigNumberSize, weight: .black))
            .foregroundColor(session.textPrimary)

          Text(bmiCategory)
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(bmiColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 3)
            .background(bmiColor.opacity(0.15))
            .cornerRadius(6)

          HStack(spacing: 0) {
            VStack(spacing: 1) {
              Text(String(format: "%.0f cm", session.userHeight))
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(session.textPrimary)
              Text("Taille")
                .font(.system(size: 7))
                .foregroundColor(session.textSecondary)
            }
            .frame(maxWidth: .infinity)
            Rectangle().fill(session.dividerColor).frame(width: 1, height: 24)
            VStack(spacing: 1) {
              Text(String(format: "%.1f kg", session.currentWeight))
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(session.textPrimary)
              Text("Poids")
                .font(.system(size: 7))
                .foregroundColor(session.textSecondary)
            }
            .frame(maxWidth: .infinity)
          }

          HStack(spacing: 6) {
            BMILegend(label: "Maigreur", color: .orange, textColor: session.textSecondary)
            BMILegend(label: "Normal", color: .green, textColor: session.textSecondary)
            BMILegend(label: "Surpoids", color: .orange, textColor: session.textSecondary)
            BMILegend(label: "Obesite", color: .red, textColor: session.textSecondary)
          }
          .padding(.top, 2)
        }

        Divider().background(session.dividerColor)

        // ── SECTION 5: Predictions ──
        VStack(spacing: 6) {
          HStack(spacing: 4) {
            Image(systemName: "chart.line.uptrend.xyaxis")
              .font(.system(size: 9))
              .foregroundColor(Color(red: 0.545, green: 0.361, blue: 0.965))
            Text("PREDICTIONS")
              .font(.system(size: 8, weight: .heavy))
              .foregroundColor(Color(red: 0.545, green: 0.361, blue: 0.965))
              .tracking(1)
          }

          if monthlyLoss > 0 {
            PredRow(period: "30 jours", value: predict(1), textPrimary: session.textPrimary, textSecondary: session.textSecondary, cardBg: session.cardBg)
            PredRow(period: "90 jours", value: predict(3), textPrimary: session.textPrimary, textSecondary: session.textSecondary, cardBg: session.cardBg)
            PredRow(period: "6 mois", value: predict(6), textPrimary: session.textPrimary, textSecondary: session.textSecondary, cardBg: session.cardBg)
            PredRow(period: "1 an", value: predict(12), textPrimary: session.textPrimary, textSecondary: session.textSecondary, cardBg: session.cardBg)
          } else {
            VStack(spacing: 4) {
              Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 16))
                .foregroundColor(session.textSecondary)
              Text("Pas assez de donnees")
                .font(.system(size: 9))
                .foregroundColor(session.textSecondary)
            }
            .padding(.vertical, 8)
          }
        }
      }
      .padding(.horizontal, 4)
    }
    .refreshable {
      session.requestSync()
      try? await Task.sleep(nanoseconds: 1_500_000_000)
    }
    .sheet(isPresented: $showInput) {
      WeightInputSheet(weight: $inputWeight, session: session) { w in
        session.logWeight(w)
        showInput = false
      }
    }
  }

  // MARK: - Computed

  private var weightProgress: Double {
    guard session.startWeight > session.targetWeight, session.targetWeight > 0 else { return 0 }
    let total = session.startWeight - session.targetWeight
    let lost = session.startWeight - session.currentWeight
    return min(1.0, max(0, lost / total))
  }

  private var lostKg: Double { max(0, session.startWeight - session.currentWeight) }
  private var remainingKg: Double { max(0, session.currentWeight - session.targetWeight) }

  private var progressText: String {
    guard session.targetWeight > 0 else { return "Definis ton objectif" }
    let pct = Int(weightProgress * 100)
    return pct > 0 ? "\(pct)% atteint" : "Debut du parcours"
  }

  private var userGoalLabel: String {
    guard session.targetWeight > 0, session.startWeight > 0 else { return "OBJECTIF POIDS" }
    if session.startWeight > session.targetWeight { return "PERTE DE POIDS" }
    if session.startWeight < session.targetWeight { return "PRISE DE MASSE" }
    return "MAINTIEN"
  }

  private var monthlyLoss: Double {
    guard session.weightHistory.count >= 2 else { return 0 }
    let first = session.weightHistory.last?.weight ?? session.currentWeight
    return max(0, first - session.currentWeight)
  }

  private func predict(_ months: Double) -> Double {
    max(session.targetWeight, session.currentWeight - monthlyLoss * months)
  }

  private var bmiCategory: String {
    if session.bmi < 16 { return "Denutrition" }
    if session.bmi < 18.5 { return "Maigreur" }
    if session.bmi < 25 { return "Normal" }
    if session.bmi < 30 { return "Surpoids" }
    if session.bmi < 35 { return "Obesite I" }
    return "Obesite II"
  }

  private var bmiColor: Color {
    if session.bmi < 16 { return .red }
    if session.bmi < 18.5 { return .orange }
    if session.bmi < 25 { return .green }
    if session.bmi < 30 { return .orange }
    return .red
  }
}

// MARK: - Stat Column

struct StatCol: View {
  let label: String
  let value: String
  let unit: String
  let labelColor: Color
  let valueColor: Color
  let icon: String
  var textPrimary: Color = .white
  var textSecondary: Color = .gray

  var body: some View {
    VStack(spacing: 2) {
      HStack(spacing: 2) {
        Image(systemName: icon).font(.system(size: 7)).foregroundColor(labelColor)
        Text(label).font(.system(size: 6, weight: .heavy)).foregroundColor(labelColor)
      }
      HStack(alignment: .firstTextBaseline, spacing: 1) {
        Text(value).font(.system(size: 13, weight: .heavy)).foregroundColor(valueColor)
        Text(unit).font(.system(size: 7, weight: .semibold)).foregroundColor(textSecondary)
      }
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - BMI Legend

struct BMILegend: View {
  let label: String
  let color: Color
  var textColor: Color = .gray
  var body: some View {
    HStack(spacing: 2) {
      RoundedRectangle(cornerRadius: 1.5).fill(color).frame(width: 10, height: 3)
      Text(label).font(.system(size: 6, weight: .bold)).foregroundColor(textColor)
    }
  }
}

// MARK: - Sub-Components

struct PillArcView: View {
  let progress: Double
  let segments: Int
  let accentColor: Color
  let emptyColor: Color

  var body: some View {
    Canvas { context, size in
      let cx = size.width / 2
      let cy = size.height
      let radius = min(size.width / 2, size.height) - 8
      let filled = Int(progress * Double(segments))
      let pillW: CGFloat = 7
      let pillH: CGFloat = 18
      let pillR: CGFloat = 3.5

      for i in 0..<segments {
        let denom = CGFloat(segments - 1)
        let angle = CGFloat.pi - (CGFloat(i) / denom) * CGFloat.pi
        let px = cx + radius * cos(angle)
        let py = cy - radius * Darwin.sin(Double(angle))
        let rotDeg = 90.0 - Double(angle) * 180.0 / Double.pi
        let isFilled = i < filled
        let rect = CGRect(x: -pillW / 2, y: -pillH / 2, width: pillW, height: pillH)
        let pill = Path(roundedRect: rect, cornerRadius: pillR)

        context.drawLayer { ctx in
          ctx.translateBy(x: px, y: CGFloat(py))
          ctx.rotate(by: Angle.degrees(rotDeg))
          ctx.fill(pill, with: .color(isFilled ? accentColor : emptyColor))
        }
      }
    }
  }
}

struct CompoMetric: View {
  let label: String
  let value: Double
  let color: Color
  var textPrimary: Color = .gray
  var body: some View {
    let ringSize = WatchScreen.s(32)
    VStack(spacing: 3) {
      ZStack {
        Circle().stroke(color.opacity(0.15), lineWidth: WatchScreen.s(3))
        Circle().trim(from: 0, to: min(1, value / 100))
          .stroke(color, style: StrokeStyle(lineWidth: WatchScreen.s(3), lineCap: .round))
          .rotationEffect(.degrees(-90))
      }
      .frame(width: ringSize, height: ringSize)
      Text(value > 0 ? String(format: "%.0f%%", value) : "--%")
        .font(.system(size: WatchScreen.fs(10), weight: .bold)).foregroundColor(color)
      Text(label).font(.system(size: WatchScreen.fs(7))).foregroundColor(textPrimary)
    }
  }
}

struct MiniBarChart: View {
  let entries: [WeightEntry]
  var accentColor: Color = Color(red: 0.831, green: 0.686, blue: 0.216)
  var textColor: Color = .white
  var body: some View {
    let vals = entries.map { $0.weight }
    let minW = (vals.min() ?? 0) - 0.5
    let maxW = (vals.max() ?? 0) + 0.5
    let range = max(1.0, maxW - minW)
    HStack(alignment: .bottom, spacing: 2) {
      ForEach(0..<entries.count, id: \.self) { i in
        let pct = (vals[i] - minW) / range
        VStack(spacing: 1) {
          Text(String(format: "%.0f", vals[i]))
            .font(.system(size: 6, weight: .bold)).foregroundColor(textColor)
          RoundedRectangle(cornerRadius: 2)
            .fill(LinearGradient(colors: [accentColor, accentColor.opacity(0.6)], startPoint: .top, endPoint: .bottom))
            .frame(width: 10, height: max(4, CGFloat(36.0 * pct)))
        }
      }
    }
  }
}

struct BMIGaugeView2: View {
  let bmi: Double
  var needleColor: Color = .white
  var labelColor: Color = .gray
  var body: some View {
    Canvas { context, size in
      let cx = size.width / 2
      let cy = size.height - 2
      let r = min(size.width / 2, size.height) - 12
      let sw: CGFloat = 10
      let zones: [(from: Double, to: Double, color: Color)] = [
        (0, 0.14, .orange), (0.14, 0.40, .green), (0.40, 0.60, .orange), (0.60, 1.0, .red),
      ]
      for zone in zones {
        let a1 = Double.pi * (1 - zone.from)
        let a2 = Double.pi * (1 - zone.to)
        var path = Path()
        path.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                    startAngle: Angle(radians: -a1), endAngle: Angle(radians: -a2), clockwise: false)
        context.stroke(path, with: .color(zone.color), style: StrokeStyle(lineWidth: sw, lineCap: .butt))
      }
      let clamped = min(40.0, max(15.0, bmi))
      let needlePct = (clamped - 15) / 25
      let needleAngle = Double.pi * (1 - needlePct)
      let needleLen = Double(r) - 8
      let nx = Double(cx) + needleLen * Darwin.cos(needleAngle)
      let ny = Double(cy) - needleLen * Darwin.sin(needleAngle)
      var needle = Path()
      needle.move(to: CGPoint(x: cx, y: cy))
      needle.addLine(to: CGPoint(x: nx, y: ny))
      context.stroke(needle, with: .color(needleColor), style: StrokeStyle(lineWidth: 2, lineCap: .round))
      let dot = Path(ellipseIn: CGRect(x: cx - 3, y: cy - 3, width: 6, height: 6))
      context.fill(dot, with: .color(needleColor))
      let labels: [Int] = [15, 18, 25, 30, 35, 40]
      let labelR = Double(r + sw / 2) + 8
      for v in labels {
        let p = Double(v - 15) / 25.0
        let a = Double.pi * (1 - p)
        let lx = Double(cx) + labelR * Darwin.cos(a)
        let ly = Double(cy) - labelR * Darwin.sin(a)
        context.draw(
          Text("\(v)").font(.system(size: 7, weight: .semibold)).foregroundColor(labelColor),
          at: CGPoint(x: lx, y: ly)
        )
      }
    }
  }
}

struct PredRow: View {
  let period: String
  let value: Double
  var textPrimary: Color = .white
  var textSecondary: Color = .gray
  var cardBg: Color = Color.white.opacity(0.06)
  var body: some View {
    HStack {
      Text(period).font(.system(size: 10)).foregroundColor(textSecondary)
      Spacer()
      Text(String(format: "%.1f kg", value)).font(.system(size: 12, weight: .bold)).foregroundColor(textPrimary)
    }
    .padding(.vertical, 5).padding(.horizontal, 6)
    .background(cardBg).cornerRadius(6)
  }
}

struct WeightInputSheet: View {
  @Binding var weight: Double
  var session: WatchSessionManager
  var onSave: (Double) -> Void
  @State private var crownWeight: Double = 0

  var body: some View {
    VStack(spacing: 10) {
      Text("PESEE").font(.system(size: 9, weight: .heavy)).foregroundColor(session.accentColor).tracking(2)
      Text(String(format: "%.1f kg", weight))
        .font(.system(size: 28, weight: .bold))
        .foregroundColor(session.textPrimary)
        .focusable()
        .digitalCrownRotation($crownWeight, from: 30, through: 250, by: 0.1,
                               sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
        .onChange(of: crownWeight) { weight = crownWeight.rounded(toPlaces: 1) }
      HStack(spacing: 16) {
        Button(action: { weight = max(30, (weight - 1.0).rounded(toPlaces: 1)); crownWeight = weight }) {
          Image(systemName: "minus.circle.fill").font(.system(size: 28)).foregroundColor(.red)
        }.buttonStyle(.plain)
        Button(action: { weight = min(250, (weight + 1.0).rounded(toPlaces: 1)); crownWeight = weight }) {
          Image(systemName: "plus.circle.fill").font(.system(size: 28)).foregroundColor(.green)
        }.buttonStyle(.plain)
      }
      Text("Tourne la couronne pour ajuster")
        .font(.system(size: 8)).foregroundColor(session.textSecondary)
      Button(action: { onSave(weight) }) {
        Text("Valider").font(.system(size: 12, weight: .bold)).foregroundColor(session.textOnAccent)
          .frame(maxWidth: .infinity).padding(.vertical, 8).background(session.accentColor).cornerRadius(8)
      }.buttonStyle(.plain)
    }
    .padding()
    .onAppear { crownWeight = weight }
  }
}

private extension Double {
  func rounded(toPlaces places: Int) -> Double {
    let divisor = pow(10.0, Double(places))
    return (self * divisor).rounded() / divisor
  }
}
