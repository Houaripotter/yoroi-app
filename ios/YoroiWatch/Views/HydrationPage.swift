import SwiftUI

// ============================================================
// PAGE 3: HYDRATATION - Single vertical scroll with ALL sections
// ============================================================

struct HydrationPage: View {

  @EnvironmentObject var session: WatchSessionManager
  @State private var waveOffset: Double = 0
  @State private var showToast = false
  @State private var toastText = ""

  private let CYAN = Color(red: 0.024, green: 0.714, blue: 0.831)
  private let GREEN = Color(red: 0.063, green: 0.725, blue: 0.506)

  private var accentColor: Color { goalReached ? GREEN : CYAN }

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {

        // ── SECTION 1: Bottle + Value + Buttons ──
        VStack(spacing: 6) {
          // Header
          HStack(spacing: 4) {
            Image(systemName: "drop.fill")
              .font(.system(size: 10))
              .foregroundColor(accentColor)
            Text("Hydratation")
              .font(.system(size: 11, weight: .semibold))
              .foregroundColor(.white.opacity(0.7))
            Spacer()
          }
          .padding(.horizontal, 2)

          // Bottle
          ZStack {
            BottleView(
              fillPercent: fillPercent,
              waveOffset: waveOffset,
              accentColor: accentColor,
              goalLiters: goalLiters
            )
            .frame(width: 90, height: 84)

            VStack(spacing: 0) {
              Text("\(session.hydrationCurrent)")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
              Text("ml")
                .font(.system(size: 7))
                .foregroundColor(.white.opacity(0.7))
            }
          }
          .frame(height: 88)

          // Value
          HStack(spacing: 2) {
            Text(hydrationDisplay)
              .font(.system(size: 12, weight: .heavy))
              .foregroundColor(goalReached ? GREEN : .white)
            Text("/ \(String(format: "%.1f", goalLiters))L")
              .font(.system(size: 9, weight: .semibold))
              .foregroundColor(.gray)
          }

          // Progress bar
          GeometryReader { geo in
            ZStack(alignment: .leading) {
              RoundedRectangle(cornerRadius: 3).fill(CYAN.opacity(0.1))
              RoundedRectangle(cornerRadius: 3).fill(accentColor)
                .frame(width: geo.size.width * min(1, fillPercent))
            }
          }
          .frame(height: 4)
          .padding(.horizontal, 4)

          Text("\(Int(fillPercent * 100))%")
            .font(.system(size: 9, weight: .bold))
            .foregroundColor(accentColor)

          // Buttons
          HStack(spacing: 4) {
            Button(action: { addWater(-250) }) {
              Image(systemName: "minus")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.red)
                .frame(width: 28, height: 28)
                .background(Color.red.opacity(0.15))
                .cornerRadius(6)
            }.buttonStyle(.plain)

            QuickBtn(label: "+250", color: CYAN, opacity: 0.08) { addWater(250) }
            QuickBtn(label: "+500", color: CYAN, opacity: 0.12) { addWater(500) }
            QuickBtn(label: "+1L", color: CYAN, opacity: 0.16) { addWater(1000) }
          }
        }
        .overlay(
          Group {
            if showToast {
              Text(toastText)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(toastText.contains("-") ? .red : GREEN)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background(Color.black.opacity(0.9))
                .cornerRadius(8)
                .transition(.opacity)
            }
          }, alignment: .top
        )

        Divider().background(Color.gray.opacity(0.15))

        // ── SECTION 2: Weekly Stats ──
        VStack(spacing: 8) {
          HStack(spacing: 4) {
            Image(systemName: "calendar")
              .font(.system(size: 10))
              .foregroundColor(Color(red: 0.545, green: 0.361, blue: 0.965))
            Text("Cette semaine")
              .font(.system(size: 10, weight: .semibold))
              .foregroundColor(.gray)
          }

          HStack(spacing: 0) {
            WeekStatItem(icon: "chart.line.uptrend.xyaxis", iconColor: GREEN,
                         value: "\(weeklySuccessRate)%", label: "Reussite")
            Rectangle().fill(Color.gray.opacity(0.3)).frame(width: 1, height: 32)
            WeekStatItem(icon: "drop.fill", iconColor: CYAN,
                         value: String(format: "%.1fL", weeklyAvg / 1000), label: "Moy/jour")
            Rectangle().fill(Color.gray.opacity(0.3)).frame(width: 1, height: 32)
            WeekStatItem(icon: "checkmark", iconColor: Color(red: 0.545, green: 0.361, blue: 0.965),
                         value: "\(weeklyCompletedDays)/7", label: "Reussis")
          }

          // Bar chart
          if !session.hydrationWeekly.isEmpty {
            HStack(alignment: .bottom, spacing: 4) {
              ForEach(session.hydrationWeekly.prefix(7)) { day in
                VStack(spacing: 2) {
                  ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 3)
                      .fill(Color.white.opacity(0.06))
                      .frame(width: 14, height: 40)
                    RoundedRectangle(cornerRadius: 3)
                      .fill(day.progress >= 1.0 ? GREEN : CYAN)
                      .frame(width: 14, height: max(4, CGFloat(40.0 * day.progress)))
                  }
                  Text(day.day).font(.system(size: 7)).foregroundColor(.gray)
                }
              }
            }
            .frame(height: 56)
          }
        }

        Divider().background(Color.gray.opacity(0.15))

        // ── SECTION 3: Goal Settings ──
        VStack(spacing: 8) {
          HStack(spacing: 4) {
            Image(systemName: "target")
              .font(.system(size: 10))
              .foregroundColor(Color(red: 0.961, green: 0.620, blue: 0.043))
            Text("Objectif quotidien")
              .font(.system(size: 10, weight: .semibold))
              .foregroundColor(.gray)
          }

          Text(String(format: "%.1f L", Double(session.hydrationGoal) / 1000))
            .font(.system(size: 24, weight: .bold))
            .foregroundColor(.white)

          HStack(spacing: 20) {
            Button(action: { session.hydrationGoal = max(500, session.hydrationGoal - 250) }) {
              Image(systemName: "minus")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 32, height: 32)
                .background(Color.white.opacity(0.1))
                .cornerRadius(8)
            }.buttonStyle(.plain)

            Button(action: { session.hydrationGoal = min(6000, session.hydrationGoal + 250) }) {
              Image(systemName: "plus")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 32, height: 32)
                .background(Color.white.opacity(0.1))
                .cornerRadius(8)
            }.buttonStyle(.plain)
          }

          Text("Ajuste par pas de 250ml")
            .font(.system(size: 8))
            .foregroundColor(.gray)
        }
      }
      .padding(.horizontal, 4)
    }
    .onAppear {
      withAnimation(.linear(duration: 2.5).repeatForever(autoreverses: false)) {
        waveOffset = Double.pi * 2
      }
    }
  }

  // MARK: - Computed

  private var fillPercent: Double {
    guard session.hydrationGoal > 0 else { return 0 }
    return min(1.0, Double(session.hydrationCurrent) / Double(session.hydrationGoal))
  }

  private var goalReached: Bool { fillPercent >= 1.0 }
  private var goalLiters: Double { Double(session.hydrationGoal) / 1000 }

  private var hydrationDisplay: String {
    if session.hydrationCurrent < 1000 { return "\(session.hydrationCurrent)ml" }
    return String(format: "%.1fL", Double(session.hydrationCurrent) / 1000)
  }

  private var weeklySuccessRate: Int {
    guard !session.hydrationWeekly.isEmpty else { return 0 }
    let success = session.hydrationWeekly.filter { $0.progress >= 1.0 }.count
    let rate = Double(success) / Double(session.hydrationWeekly.count)
    return Int(rate * 100)
  }

  private var weeklyAvg: Double {
    guard !session.hydrationWeekly.isEmpty else { return 0 }
    let total = session.hydrationWeekly.reduce(0) { $0 + $1.amount }
    return Double(total) / Double(session.hydrationWeekly.count)
  }

  private var weeklyCompletedDays: Int {
    session.hydrationWeekly.filter { $0.progress >= 1.0 }.count
  }

  private func addWater(_ amount: Int) {
    session.addHydration(amount)
    toastText = amount > 0 ? "+\(amount)ml" : "\(amount)ml"
    withAnimation { showToast = true }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
      withAnimation { showToast = false }
    }
  }
}

// MARK: - Sub-Components

struct QuickBtn: View {
  let label: String
  let color: Color
  let opacity: Double
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(label)
        .font(.system(size: 9, weight: .medium))
        .foregroundColor(color)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 7)
        .background(color.opacity(opacity))
        .cornerRadius(6)
    }.buttonStyle(.plain)
  }
}

struct WeekStatItem: View {
  let icon: String
  let iconColor: Color
  let value: String
  let label: String
  var body: some View {
    VStack(spacing: 2) {
      Image(systemName: icon).font(.system(size: 11)).foregroundColor(iconColor)
      Text(value).font(.system(size: 12, weight: .bold)).foregroundColor(.white)
      Text(label).font(.system(size: 7)).foregroundColor(.gray)
    }.frame(maxWidth: .infinity)
  }
}

struct BottleView: View {
  let fillPercent: Double
  let waveOffset: Double
  let accentColor: Color
  let goalLiters: Double

  var body: some View {
    Canvas { context, size in
      let bW = size.width * 0.5
      let bH = size.height * 0.92
      let ox = (size.width - bW) / 2
      let oy = size.height - bH
      let neckW = bW * 0.32
      let neckH = bH * 0.1
      let neckX = (bW - neckW) / 2
      let cR = bW * 0.12

      // Build bottle path
      var bottle = Path()
      bottle.move(to: CGPoint(x: ox + neckX, y: oy + neckH))
      bottle.addLine(to: CGPoint(x: ox + neckX, y: oy + 2))
      bottle.addQuadCurve(to: CGPoint(x: ox + neckX + 3, y: oy), control: CGPoint(x: ox + neckX, y: oy))
      bottle.addLine(to: CGPoint(x: ox + neckX + neckW - 3, y: oy))
      bottle.addQuadCurve(to: CGPoint(x: ox + neckX + neckW, y: oy + 2), control: CGPoint(x: ox + neckX + neckW, y: oy))
      bottle.addLine(to: CGPoint(x: ox + neckX + neckW, y: oy + neckH))
      bottle.addQuadCurve(to: CGPoint(x: ox + bW - cR, y: oy + neckH + cR), control: CGPoint(x: ox + bW, y: oy + neckH))
      bottle.addLine(to: CGPoint(x: ox + bW - cR, y: oy + bH - cR))
      bottle.addQuadCurve(to: CGPoint(x: ox + bW - cR * 2, y: oy + bH), control: CGPoint(x: ox + bW - cR, y: oy + bH))
      bottle.addLine(to: CGPoint(x: ox + cR * 2, y: oy + bH))
      bottle.addQuadCurve(to: CGPoint(x: ox + cR, y: oy + bH - cR), control: CGPoint(x: ox + cR, y: oy + bH))
      bottle.addLine(to: CGPoint(x: ox + cR, y: oy + neckH + cR))
      bottle.addQuadCurve(to: CGPoint(x: ox + neckX, y: oy + neckH), control: CGPoint(x: ox, y: oy + neckH))
      bottle.closeSubpath()

      context.fill(bottle, with: .color(accentColor.opacity(0.03)))

      let bodyH = bH - neckH
      let clampedFill = min(max(fillPercent, 0), 1.0)
      let waterTopY = oy + bH - (bodyH * clampedFill)

      // Water fill
      if clampedFill > 0 {
        var water = Path()
        water.move(to: CGPoint(x: ox, y: oy + bH))
        water.addLine(to: CGPoint(x: ox, y: waterTopY))
        var xPos: CGFloat = 0
        while xPos <= bW {
          let xRatio: Double = Double(xPos) / Double(bW)
          let angleD: Double = xRatio * Double.pi * 2.0 + waveOffset
          let sinVal: Double = Darwin.sin(angleD)
          let wy: CGFloat = waterTopY + CGFloat(sinVal * 2.0)
          water.addLine(to: CGPoint(x: ox + xPos, y: wy))
          xPos += 2
        }
        water.addLine(to: CGPoint(x: ox + bW, y: oy + bH))
        water.closeSubpath()

        context.drawLayer { ctx in
          ctx.clip(to: bottle)
          ctx.fill(water, with: .linearGradient(
            Gradient(colors: [accentColor, accentColor.opacity(0.45)]),
            startPoint: CGPoint(x: size.width / 2, y: waterTopY),
            endPoint: CGPoint(x: size.width / 2, y: oy + bH)
          ))
        }
      }

      // Graduation lines
      var step = 0.5
      while step <= goalLiters + 0.01 {
        let posY = oy + bH - ((step / goalLiters) * bodyH)
        if posY >= oy + neckH + 3 && posY <= oy + bH - 3 {
          let isInteger = step == step.rounded(.down)
          var line = Path()
          line.move(to: CGPoint(x: ox + cR + 3, y: posY))
          line.addLine(to: CGPoint(x: ox + bW - cR - 3, y: posY))
          context.drawLayer { ctx in
            ctx.clip(to: bottle)
            ctx.stroke(line, with: .color(accentColor.opacity(isInteger ? 0.3 : 0.15)),
                       style: StrokeStyle(lineWidth: isInteger ? 1 : 0.5, dash: isInteger ? [] : [3, 3]))
          }
        }
        step += 0.5
      }

      // Outline
      context.stroke(bottle, with: .color(accentColor.opacity(0.5)), style: StrokeStyle(lineWidth: 1.5))

      // Labels
      let leftEdge = ox + cR
      let rightEdge = ox + bW - cR
      var labelStep = 0.5
      while labelStep <= goalLiters + 0.01 {
        let posY = oy + bH - ((labelStep / goalLiters) * bodyH)
        if posY >= oy + neckH + 3 && posY <= oy + bH - 3 {
          let isInteger = labelStep == labelStep.rounded(.down)
          if isInteger {
            var tick = Path()
            tick.move(to: CGPoint(x: rightEdge, y: posY))
            tick.addLine(to: CGPoint(x: rightEdge + 5, y: posY))
            context.stroke(tick, with: .color(.white.opacity(0.6)), style: StrokeStyle(lineWidth: 1.5))
            context.draw(Text("\(Int(labelStep))L").font(.system(size: 7, weight: .medium)).foregroundColor(.gray),
                         at: CGPoint(x: rightEdge + 14, y: posY))
          } else {
            var tick = Path()
            tick.move(to: CGPoint(x: leftEdge - 5, y: posY))
            tick.addLine(to: CGPoint(x: leftEdge, y: posY))
            context.stroke(tick, with: .color(.white.opacity(0.4)), style: StrokeStyle(lineWidth: 1))
            context.draw(Text(String(format: "%.1fL", labelStep)).font(.system(size: 6, weight: .medium)).foregroundColor(.gray.opacity(0.7)),
                         at: CGPoint(x: leftEdge - 16, y: posY))
          }
        }
        labelStep += 0.5
      }
    }
  }
}
