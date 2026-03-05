import SwiftUI

// ============================================================
// PAGE 4: SOMMEIL - Pull-to-refresh + theme-aware
// ============================================================

struct SleepPage: View {

  @EnvironmentObject var session: WatchSessionManager

  // Animations
  @State private var moonFloat: CGFloat = 0
  @State private var star1Op: Double = 0.3
  @State private var star2Op: Double = 0.8
  @State private var star3Op: Double = 0.5
  @State private var zzz1Y: CGFloat = 0
  @State private var zzz2Y: CGFloat = 0
  @State private var zzz3Y: CGFloat = 0
  @State private var zzz1Op: Double = 0
  @State private var zzz2Op: Double = 0
  @State private var zzz3Op: Double = 0
  @State private var breatheScale: CGFloat = 1.0

  // Night colors (intentionally not theme-dependent)
  private let NIGHT = Color(red: 0.118, green: 0.227, blue: 0.373)
  private let NIGHT_MID = Color(red: 0.145, green: 0.388, blue: 0.933)
  private let NIGHT_LIGHT = Color(red: 0.376, green: 0.647, blue: 0.980)
  private let NIGHT_SOFT = Color(red: 0.576, green: 0.773, blue: 0.988)
  private let STAR_COLOR = Color(red: 0.992, green: 0.910, blue: 0.545)
  private let MOON_COLOR = Color(red: 0.984, green: 0.749, blue: 0.141)
  private let NIGHT_BG = Color(red: 0.059, green: 0.090, blue: 0.165)

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {

        // ── SECTION 1: Starry Night Scene ──
        VStack(spacing: 4) {
          HStack(spacing: 4) {
            Image(systemName: "moon.fill")
              .font(.system(size: 10))
              .foregroundColor(NIGHT_MID)
            Text("Sommeil")
              .font(.system(size: 11, weight: .semibold))
              .foregroundColor(session.textPrimary.opacity(0.7))
            Spacer()
          }
          .padding(.horizontal, 2)

          // Night sky
          ZStack {
            LinearGradient(colors: [NIGHT_BG, NIGHT], startPoint: .top, endPoint: .bottom)
              .cornerRadius(10)

            GeometryReader { geo in
              let w = geo.size.width
              let h = geo.size.height
              Text("\u{2726}").font(.system(size: 4)).foregroundColor(STAR_COLOR).opacity(star1Op).position(x: w * 0.08, y: h * 0.08)
              Text("\u{2726}").font(.system(size: 3)).foregroundColor(STAR_COLOR).opacity(star2Op).position(x: w * 0.19, y: h * 0.20)
              Text("\u{2726}").font(.system(size: 3.5)).foregroundColor(STAR_COLOR).opacity(star3Op).position(x: w * 0.34, y: h * 0.06)
              Text("\u{2726}").font(.system(size: 4)).foregroundColor(STAR_COLOR).opacity(star1Op).position(x: w * 0.88, y: h * 0.14)
              Text("\u{2726}").font(.system(size: 3)).foregroundColor(Color(red: 0.886, green: 0.910, blue: 0.941)).opacity(star2Op).position(x: w * 0.79, y: h * 0.26)
              Text("\u{2726}").font(.system(size: 3.5)).foregroundColor(STAR_COLOR).opacity(star3Op).position(x: w * 0.68, y: h * 0.08)
            }

            MoonShape().fill(MOON_COLOR).frame(width: 16, height: 16).offset(x: 40, y: -20 + moonFloat)

            BedSceneView(nightLight: NIGHT_LIGHT, nightMid: NIGHT_MID, nightSoft: NIGHT_SOFT)
              .scaleEffect(breatheScale).offset(y: 8)

            ZStack {
              Text("z").font(.system(size: 6, weight: .heavy)).italic().foregroundColor(NIGHT_SOFT).opacity(zzz1Op).offset(y: zzz1Y)
              Text("Z").font(.system(size: 8, weight: .heavy)).italic().foregroundColor(NIGHT_LIGHT).opacity(zzz2Op).offset(x: 5, y: -4 + zzz2Y)
              Text("Z").font(.system(size: 10, weight: .heavy)).italic().foregroundColor(NIGHT_MID).opacity(zzz3Op).offset(x: 11, y: -9 + zzz3Y)
            }
            .offset(x: 18, y: 18)
          }
          .frame(height: 80)

          // Duration + status
          VStack(spacing: 2) {
            if session.sleepDuration > 0 {
              Text("\(sleepH)h\(String(format: "%02d", sleepM))")
                .font(.system(size: 22, weight: .black)).foregroundColor(session.textPrimary).tracking(-1)
            } else {
              Text("--").font(.system(size: 22, weight: .black)).foregroundColor(session.textPrimary)
            }
            HStack(spacing: 6) {
              Text(statusText).font(.system(size: 9, weight: .bold)).foregroundColor(statusColor)
                .padding(.horizontal, 8).padding(.vertical, 2)
                .background(statusColor.opacity(0.09)).cornerRadius(6)
              if session.sleepGoalMinutes > 0 {
                Text("Objectif \(session.sleepGoalMinutes / 60)h")
                  .font(.system(size: 9, weight: .medium)).foregroundColor(session.textSecondary)
              }
            }
          }

          // Bed/Wake times
          HStack(spacing: 0) {
            VStack(spacing: 2) {
              Image(systemName: "bed.double.fill").font(.system(size: 10)).foregroundColor(NIGHT_MID)
              Text(session.sleepBedTime).font(.system(size: 14, weight: .bold)).foregroundColor(session.textPrimary)
            }.frame(maxWidth: .infinity)
            Rectangle().fill(session.dividerColor).frame(width: 1, height: 28)
            VStack(spacing: 2) {
              Image(systemName: "sun.max.fill").font(.system(size: 10)).foregroundColor(.yellow)
              Text(session.sleepWakeTime).font(.system(size: 14, weight: .bold)).foregroundColor(session.textPrimary)
            }.frame(maxWidth: .infinity)
          }
        }

        Divider().background(session.dividerColor)

        // ── SECTION 2: Detailed Metrics ──
        VStack(spacing: 8) {
          HStack(spacing: 6) {
            Image(systemName: session.sleepDebt > 0 ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
              .font(.system(size: 12))
              .foregroundColor(session.sleepDebt > 0 ? .red : .green)
            Text("Dette").font(.system(size: 11, weight: .semibold)).foregroundColor(session.textSecondary)
            Spacer()
            Text(session.sleepDebt > 0 ? String(format: "%.1fh", session.sleepDebt) : "0h")
              .font(.system(size: 13, weight: .heavy))
              .foregroundColor(session.sleepDebt > 0 ? .red : .green)
          }.padding(.horizontal, 6)

          HStack(spacing: 6) {
            Image(systemName: "moon.fill").font(.system(size: 12)).foregroundColor(NIGHT_MID)
            Text("Qualite").font(.system(size: 11, weight: .semibold)).foregroundColor(session.textSecondary)
            Spacer()
            Text("\(Int(qualityPercent))%")
              .font(.system(size: 13, weight: .heavy))
              .foregroundColor(qualityPercent >= 80 ? .green : qualityPercent >= 60 ? .yellow : .red)
          }.padding(.horizontal, 6)

          HStack(spacing: 6) {
            Image(systemName: "target").font(.system(size: 12)).foregroundColor(NIGHT_MID)
            Text("Objectif").font(.system(size: 11, weight: .semibold)).foregroundColor(session.textSecondary)
            Spacer()
            Text("\(session.sleepGoalMinutes / 60)h")
              .font(.system(size: 10, weight: .bold))
              .foregroundColor(sleepProgress >= 1.0 ? .green : .yellow)
              .padding(.horizontal, 6).padding(.vertical, 2)
              .background((sleepProgress >= 1.0 ? Color.green : Color.yellow).opacity(0.12))
              .cornerRadius(4)
          }.padding(.horizontal, 6)

          GeometryReader { geo in
            ZStack(alignment: .leading) {
              RoundedRectangle(cornerRadius: 3).fill(NIGHT_MID.opacity(0.15))
              RoundedRectangle(cornerRadius: 3)
                .fill(LinearGradient(colors: [NIGHT_MID, NIGHT], startPoint: .leading, endPoint: .trailing))
                .frame(width: geo.size.width * min(1, qualityPercent / 100))
            }
          }
          .frame(height: 6).padding(.horizontal, 6)

          HStack(spacing: 4) {
            ForEach(1...5, id: \.self) { star in
              Image(systemName: star <= session.sleepQuality ? "star.fill" : "star")
                .font(.system(size: 13))
                .foregroundColor(star <= session.sleepQuality ? MOON_COLOR : session.textSecondary.opacity(0.3))
            }
          }
        }

        Divider().background(session.dividerColor)

        // ── SECTION 3: Progress Ring ──
        VStack(spacing: 6) {
          ZStack {
            Circle().stroke(NIGHT_MID.opacity(0.15), lineWidth: 5)
            Circle().trim(from: 0, to: sleepProgress)
              .stroke(NIGHT_MID, style: StrokeStyle(lineWidth: 5, lineCap: .round))
              .rotationEffect(.degrees(-90))
            Text("\(Int(qualityPercent))%")
              .font(.system(size: 13, weight: .black)).foregroundColor(NIGHT_MID)
          }
          .frame(width: 56, height: 56)

          if sleepProgress >= 1.0 {
            HStack(spacing: 4) {
              Image(systemName: "checkmark.circle.fill").font(.system(size: 10))
              Text("Objectif atteint !").font(.system(size: 10, weight: .semibold))
            }.foregroundColor(.green)
          } else if session.sleepDuration > 0 {
            let remaining = max(0, session.sleepGoalMinutes - session.sleepDuration)
            Text("Encore \(remaining / 60)h\(String(format: "%02d", remaining % 60))")
              .font(.system(size: 10, weight: .semibold)).foregroundColor(session.textSecondary)
          }
        }

        Divider().background(session.dividerColor)

        // ── SECTION 4: Tips ──
        VStack(alignment: .leading, spacing: 6) {
          Text("CONSEILS")
            .font(.system(size: 8, weight: .heavy)).foregroundColor(session.textSecondary).tracking(1)

          if session.sleepDuration > 0 && session.sleepDuration < 420 {
            TipRow2(icon: "exclamationmark.triangle.fill", color: .orange, text: "Sommeil insuffisant. Vise 7-9h pour une bonne recuperation.", textColor: session.textPrimary)
          } else if session.sleepDuration >= 420 {
            TipRow2(icon: "checkmark.circle.fill", color: .green, text: "Bonne duree de sommeil !", textColor: session.textPrimary)
          }
          if session.sleepQuality > 0 && session.sleepQuality <= 2 {
            TipRow2(icon: "moon.zzz.fill", color: .indigo, text: "Reduis les ecrans 1h avant le coucher.", textColor: session.textPrimary)
          }
          if session.sleepDebt > 2 {
            TipRow2(icon: "bed.double.fill", color: .red, text: "Rattrape ta dette en dormant 30min de plus.", textColor: session.textPrimary)
          }
        }
      }
      .padding(.horizontal, 4)
    }
    .refreshable {
      session.requestSync()
      try? await Task.sleep(nanoseconds: 1_500_000_000)
    }
    .onAppear { startAnimations() }
    .onDisappear { resetAnimations() }
    .background(NIGHT_BG.ignoresSafeArea())
  }

  // MARK: - Computed

  private var sleepH: Int { session.sleepDuration / 60 }
  private var sleepM: Int { session.sleepDuration % 60 }

  private var sleepProgress: Double {
    guard session.sleepGoalMinutes > 0 else { return 0 }
    return min(1.0, Double(session.sleepDuration) / Double(session.sleepGoalMinutes))
  }

  private var qualityPercent: Double {
    guard session.sleepGoalMinutes > 0 else { return 0 }
    return min(100, Double(session.sleepDuration) / Double(session.sleepGoalMinutes) * 100)
  }

  private var statusText: String {
    if session.sleepDuration == 0 { return "Aucune donnee" }
    let hours = Double(session.sleepDuration) / 60.0
    if hours >= 7 { return "Excellent" }
    if hours >= 5 { return "Correct" }
    return "Insuffisant"
  }

  private var statusColor: Color {
    if session.sleepDuration == 0 { return .gray }
    let hours = Double(session.sleepDuration) / 60.0
    if hours >= 7 { return .green }
    if hours >= 5 { return .yellow }
    return .red
  }

  // MARK: - Animations

  private func resetAnimations() {
    moonFloat = 0
    star1Op = 0.3; star2Op = 0.8; star3Op = 0.5
    zzz1Y = 0; zzz2Y = 0; zzz3Y = 0
    zzz1Op = 0; zzz2Op = 0; zzz3Op = 0
    breatheScale = 1.0
  }

  private func startAnimations() {
    withAnimation(.easeInOut(duration: 3.0).repeatForever(autoreverses: true)) { moonFloat = -4 }
    withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) { star1Op = 1.0 }
    withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true).delay(0.3)) { star2Op = 0.2 }
    withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true).delay(0.6)) { star3Op = 1.0 }
    withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false)) { zzz1Y = -12; zzz1Op = 1 }
    withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false).delay(0.5)) { zzz2Y = -12; zzz2Op = 1 }
    withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false).delay(1.0)) { zzz3Y = -12; zzz3Op = 1 }
    withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true).delay(0.4)) { breatheScale = 1.02 }
  }
}

// MARK: - Moon + Bed Scene + TipRow

struct MoonShape: Shape {
  func path(in rect: CGRect) -> Path {
    let scale = min(rect.width, rect.height) / 24
    var path = Path()
    let center = CGPoint(x: rect.midX, y: rect.midY)
    path.addArc(center: CGPoint(x: center.x - 2 * scale, y: center.y + 1 * scale), radius: 9 * scale,
                startAngle: .degrees(0), endAngle: .degrees(360), clockwise: false)
    path.addArc(center: CGPoint(x: center.x + 3 * scale, y: center.y - 3 * scale), radius: 7 * scale,
                startAngle: .degrees(0), endAngle: .degrees(360), clockwise: true)
    return path
  }
}

struct BedSceneView: View {
  let nightLight: Color
  let nightMid: Color
  let nightSoft: Color

  var body: some View {
    Canvas { context, size in
      let sc = min(size.width / 80, size.height / 50)
      let ox = (size.width - 80 * sc) / 2
      let oy = (size.height - 50 * sc) / 2

      var p1 = Path(); p1.move(to: pt(ox, oy, 5, 45, sc)); p1.addLine(to: pt(ox, oy, 5, 39, sc))
      context.stroke(p1, with: .color(nightSoft), style: StrokeStyle(lineWidth: 2 * sc, lineCap: .round))
      var p2 = Path(); p2.move(to: pt(ox, oy, 75, 45, sc)); p2.addLine(to: pt(ox, oy, 75, 39, sc))
      context.stroke(p2, with: .color(nightSoft), style: StrokeStyle(lineWidth: 2 * sc, lineCap: .round))
      var fr = Path(); fr.move(to: pt(ox, oy, 3, 39, sc)); fr.addLine(to: pt(ox, oy, 77, 39, sc))
      context.stroke(fr, with: .color(nightLight), style: StrokeStyle(lineWidth: 2.5 * sc, lineCap: .round))
      context.fill(Path(ellipseIn: CGRect(x: ox + 5 * sc, y: oy + 29 * sc, width: 70 * sc, height: 10 * sc)), with: .color(nightMid.opacity(0.6)))
      context.fill(Path(ellipseIn: CGRect(x: ox + 5 * sc, y: oy + 25.5 * sc, width: 18 * sc, height: 9 * sc)), with: .color(nightSoft.opacity(0.7)))
      context.fill(Path(ellipseIn: CGRect(x: ox + 7 * sc, y: oy + 25.5 * sc, width: 14 * sc, height: 7 * sc)), with: .color(Color(red: 0.859, green: 0.914, blue: 0.996)))
      var bl = Path()
      bl.move(to: pt(ox, oy, 8, 31, sc))
      bl.addQuadCurve(to: pt(ox, oy, 45, 29, sc), control: pt(ox, oy, 25, 24, sc))
      bl.addQuadCurve(to: pt(ox, oy, 70, 31, sc), control: pt(ox, oy, 60, 33, sc))
      bl.addLine(to: pt(ox, oy, 70, 36, sc))
      bl.addQuadCurve(to: pt(ox, oy, 30, 37, sc), control: pt(ox, oy, 50, 38, sc))
      bl.addQuadCurve(to: pt(ox, oy, 8, 36, sc), control: pt(ox, oy, 15, 35, sc))
      bl.closeSubpath()
      context.fill(bl, with: .color(nightLight.opacity(0.7)))
      context.fill(Path(ellipseIn: CGRect(x: ox + 11.5 * sc, y: oy + 17.5 * sc, width: 13 * sc, height: 13 * sc)),
                   with: .color(Color(red: 0.992, green: 0.910, blue: 0.545)))
      var eye = Path(); eye.move(to: pt(ox, oy, 13, 21, sc))
      eye.addQuadCurve(to: pt(ox, oy, 23, 21, sc), control: pt(ox, oy, 18, 17, sc))
      context.stroke(eye, with: .color(Color(red: 0.573, green: 0.251, blue: 0.055)), style: StrokeStyle(lineWidth: 2 * sc, lineCap: .round))
      var sm = Path(); sm.move(to: pt(ox, oy, 15, 24, sc))
      sm.addQuadCurve(to: pt(ox, oy, 19, 24, sc), control: pt(ox, oy, 17, 25, sc))
      context.stroke(sm, with: .color(Color(red: 0.471, green: 0.208, blue: 0.059)), style: StrokeStyle(lineWidth: 1 * sc, lineCap: .round))
      context.fill(Path(ellipseIn: CGRect(x: ox + 24.5 * sc, y: oy + 25 * sc, width: 7 * sc, height: 4 * sc)),
                   with: .color(Color(red: 0.992, green: 0.910, blue: 0.545)))
    }
    .frame(width: 60, height: 36)
  }

  private func pt(_ ox: CGFloat, _ oy: CGFloat, _ x: CGFloat, _ y: CGFloat, _ sc: CGFloat) -> CGPoint {
    CGPoint(x: ox + x * sc, y: oy + y * sc)
  }
}

struct TipRow2: View {
  let icon: String
  let color: Color
  let text: String
  var textColor: Color = .white
  var body: some View {
    HStack(alignment: .top, spacing: 6) {
      Image(systemName: icon).font(.system(size: 9)).foregroundColor(color).frame(width: 14)
      Text(text).font(.system(size: 9)).foregroundColor(textColor.opacity(0.8)).fixedSize(horizontal: false, vertical: true)
    }
  }
}
