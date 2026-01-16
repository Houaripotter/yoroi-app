//
//  ContentView.swift
//  YoroiWatch Watch App
//
//  Navigation horizontale - Optimisé pour toutes tailles d'écran
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager
    @EnvironmentObject var workoutSessionManager: WorkoutSessionManager

    var body: some View {
        TabView {
            HomePageView()
            TimerPageView()
            HydrationPageView()
            WeightPageView()
            WorkoutHistoryPageView()
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .background(Color.black)
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - PAGE 1: ACCUEIL
// MARK: - ═══════════════════════════════════════════════════════════════

struct HomePageView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    var body: some View {
        GeometryReader { geo in
            let isLarge = geo.size.width > 180 // Ultra ou grande Watch
            let padding: CGFloat = isLarge ? 8 : 4
            let spacing: CGFloat = isLarge ? 10 : 6

            VStack(spacing: spacing) {
                // Header avec logo
                HStack(spacing: 6) {
                    Image("YoroiLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: isLarge ? 32 : 24, height: isLarge ? 32 : 24)
                        .clipShape(RoundedRectangle(cornerRadius: 6))

                    Text("YOROI")
                        .font(.system(size: isLarge ? 20 : 16, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                }

                // Stats Grid - prend toute la largeur
                VStack(spacing: spacing) {
                    // Row 1
                    HStack(spacing: spacing) {
                        StatBox(
                            icon: "heart.fill",
                            value: healthKitManager.currentHeartRate > 0 ? "\(healthKitManager.currentHeartRate)" : "--",
                            label: "BPM",
                            color: .red,
                            geo: geo
                        )
                        StatBox(
                            icon: "waveform.path.ecg",
                            value: "98",
                            label: "SpO2",
                            color: .cyan,
                            geo: geo
                        )
                    }

                    // Row 2
                    HStack(spacing: spacing) {
                        StatBox(
                            icon: "figure.walk",
                            value: formatSteps(healthKitManager.todaySteps),
                            label: "PAS",
                            color: .green,
                            geo: geo
                        )
                        StatBox(
                            icon: "moon.fill",
                            value: connectivityManager.watchData.sleepDurationFormatted,
                            label: "SOMMEIL",
                            color: .purple,
                            geo: geo
                        )
                    }

                    // Row 3
                    HStack(spacing: spacing) {
                        StatBox(
                            icon: "flame.fill",
                            value: "\(healthKitManager.todayCalories)",
                            label: "KCAL",
                            color: .orange,
                            geo: geo
                        )

                        // Hydratation spéciale
                        HydrationBox(
                            current: connectivityManager.watchData.hydrationCurrent,
                            goal: connectivityManager.watchData.hydrationGoal,
                            progress: connectivityManager.watchData.hydrationProgress,
                            geo: geo
                        )
                    }
                }
                .padding(.horizontal, padding)

                // Poids en bas
                HStack {
                    Image(systemName: "scalemass.fill")
                        .foregroundColor(.orange)
                        .font(.system(size: isLarge ? 14 : 11))

                    Text(String(format: "%.1f", connectivityManager.watchData.currentWeight))
                        .font(.system(size: isLarge ? 18 : 14, weight: .bold, design: .rounded))

                    Text("kg")
                        .font(.system(size: isLarge ? 12 : 10))
                        .foregroundColor(.secondary)

                    Spacer()

                    Text("→ \(String(format: "%.1f", connectivityManager.watchData.targetWeight))")
                        .font(.system(size: isLarge ? 12 : 10))
                        .foregroundColor(.orange)
                }
                .padding(.horizontal, isLarge ? 14 : 10)
                .padding(.vertical, isLarge ? 8 : 5)
                .background(Color.orange.opacity(0.15))
                .cornerRadius(isLarge ? 12 : 8)
                .padding(.horizontal, padding)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    func formatSteps(_ s: Int) -> String {
        if s >= 10000 { return String(format: "%.0fk", Double(s)/1000) }
        if s >= 1000 { return String(format: "%.1fk", Double(s)/1000) }
        return "\(s)"
    }
}

// Box de stat adaptive
struct StatBox: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    let geo: GeometryProxy

    var isLarge: Bool { geo.size.width > 180 }

    var body: some View {
        VStack(spacing: isLarge ? 4 : 2) {
            Image(systemName: icon)
                .font(.system(size: isLarge ? 14 : 10))
                .foregroundColor(color)

            Text(value)
                .font(.system(size: isLarge ? 24 : 18, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text(label)
                .font(.system(size: isLarge ? 9 : 7, weight: .medium))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(color.opacity(0.15))
        .cornerRadius(isLarge ? 14 : 10)
    }
}

// Box hydratation
struct HydrationBox: View {
    let current: Int
    let goal: Int
    let progress: Double
    let geo: GeometryProxy

    var isLarge: Bool { geo.size.width > 180 }

    var body: some View {
        HStack(spacing: isLarge ? 8 : 4) {
            ZStack {
                Circle()
                    .stroke(Color.cyan.opacity(0.3), lineWidth: isLarge ? 4 : 3)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.cyan, style: StrokeStyle(lineWidth: isLarge ? 4 : 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Image(systemName: "drop.fill")
                    .font(.system(size: isLarge ? 12 : 9))
                    .foregroundColor(.cyan)
            }
            .frame(width: isLarge ? 36 : 26, height: isLarge ? 36 : 26)

            VStack(alignment: .leading, spacing: 0) {
                Text("\(current)")
                    .font(.system(size: isLarge ? 18 : 14, weight: .bold, design: .rounded))
                Text("/ \(goal)")
                    .font(.system(size: isLarge ? 9 : 7))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.cyan.opacity(0.15))
        .cornerRadius(isLarge ? 14 : 10)
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - PAGE 2: TIMER
// MARK: - ═══════════════════════════════════════════════════════════════

struct TimerPageView: View {
    @State private var selectedDuration: Int = 90
    @State private var remainingTime: Int = 0
    @State private var isRunning: Bool = false
    @State private var isPaused: Bool = false
    @State private var timer: Timer?
    @State private var totalDuration: Int = 0
    @State private var selectedSport: Sport = .musculation

    private let haptics = HapticsManager.shared
    let presets = [30, 60, 90, 120, 180]

    var body: some View {
        GeometryReader { geo in
            let isLarge = geo.size.width > 180

            ScrollView {
                VStack(spacing: isLarge ? 12 : 8) {
                    if isRunning || isPaused {
                        activeTimerView(geo: geo, isLarge: isLarge)
                    } else {
                        selectionView(geo: geo, isLarge: isLarge)

                        Divider().background(Color.white.opacity(0.2))
                            .padding(.vertical, isLarge ? 8 : 4)

                        sportsView(geo: geo, isLarge: isLarge)
                    }
                }
                .padding(.horizontal, isLarge ? 8 : 4)
            }
        }
    }

    func activeTimerView(geo: GeometryProxy, isLarge: Bool) -> some View {
        VStack(spacing: isLarge ? 12 : 8) {
            // Sport
            HStack(spacing: 4) {
                Image(systemName: selectedSport.icon)
                Text(selectedSport.name)
                    .font(.system(size: isLarge ? 14 : 11, weight: .semibold))
            }
            .foregroundColor(selectedSport.color)

            // Cercle timer
            ZStack {
                Circle()
                    .stroke(Color.yellow.opacity(0.2), lineWidth: isLarge ? 10 : 6)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        remainingTime <= 10 ? Color.red : Color.yellow,
                        style: StrokeStyle(lineWidth: isLarge ? 10 : 6, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: remainingTime)

                VStack(spacing: 0) {
                    Text(timeString)
                        .font(.system(size: isLarge ? 42 : 32, weight: .bold, design: .rounded))
                        .foregroundColor(remainingTime <= 10 ? .red : .yellow)

                    if remainingTime <= 10 && remainingTime > 0 {
                        Text("GO!")
                            .font(.system(size: isLarge ? 16 : 12, weight: .bold))
                            .foregroundColor(.orange)
                    }
                }
            }
            .frame(width: geo.size.width * 0.7, height: geo.size.width * 0.7)

            // Boutons
            HStack(spacing: isLarge ? 24 : 16) {
                Button(action: togglePause) {
                    Image(systemName: isPaused ? "play.fill" : "pause.fill")
                        .font(.system(size: isLarge ? 22 : 18))
                        .frame(width: isLarge ? 54 : 44, height: isLarge ? 54 : 44)
                        .background(Color.white.opacity(0.15))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Button(action: stopTimer) {
                    Image(systemName: "stop.fill")
                        .font(.system(size: isLarge ? 22 : 18))
                        .frame(width: isLarge ? 54 : 44, height: isLarge ? 54 : 44)
                        .background(Color.red.opacity(0.4))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    func selectionView(geo: GeometryProxy, isLarge: Bool) -> some View {
        VStack(spacing: isLarge ? 10 : 6) {
            HStack(spacing: 4) {
                Image(systemName: "timer")
                    .foregroundColor(.yellow)
                Text("REPOS")
                    .font(.system(size: isLarge ? 14 : 11, weight: .bold))
                    .foregroundColor(.yellow)
            }

            Text(formatDuration(selectedDuration))
                .font(.system(size: isLarge ? 52 : 40, weight: .bold, design: .rounded))
                .foregroundColor(.yellow)
                .focusable(true)
                .digitalCrownRotation(
                    Binding(get: { Double(selectedDuration) }, set: { selectedDuration = max(10, min(Int($0), 300)) }),
                    from: 10, through: 300, by: 5,
                    sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true
                )

            // Presets
            HStack(spacing: isLarge ? 6 : 4) {
                ForEach(presets, id: \.self) { p in
                    Button(action: { selectedDuration = p; haptics.playCrownTick() }) {
                        Text(formatPreset(p))
                            .font(.system(size: isLarge ? 12 : 10, weight: selectedDuration == p ? .bold : .regular))
                            .foregroundColor(selectedDuration == p ? .black : .yellow)
                            .padding(.horizontal, isLarge ? 8 : 5)
                            .padding(.vertical, isLarge ? 6 : 4)
                            .background(selectedDuration == p ? Color.yellow : Color.yellow.opacity(0.2))
                            .cornerRadius(isLarge ? 8 : 6)
                    }
                    .buttonStyle(.plain)
                }
            }

            Button(action: startTimer) {
                HStack(spacing: 6) {
                    Image(systemName: "play.fill")
                    Text("GO")
                        .fontWeight(.bold)
                }
                .font(.system(size: isLarge ? 18 : 15))
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, isLarge ? 14 : 10)
                .background(Color.yellow)
                .cornerRadius(isLarge ? 14 : 10)
            }
            .buttonStyle(.plain)
        }
    }

    func sportsView(geo: GeometryProxy, isLarge: Bool) -> some View {
        VStack(spacing: isLarge ? 10 : 6) {
            Text("TYPE D'ACTIVITÉ")
                .font(.system(size: isLarge ? 11 : 9, weight: .semibold))
                .foregroundColor(.secondary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: isLarge ? 10 : 6) {
                ForEach(Sport.allCases, id: \.self) { sport in
                    Button(action: { selectedSport = sport; haptics.playCrownTick() }) {
                        VStack(spacing: isLarge ? 6 : 4) {
                            Image(systemName: sport.icon)
                                .font(.system(size: isLarge ? 22 : 16))
                                .foregroundColor(selectedSport == sport ? .black : sport.color)
                            Text(sport.name)
                                .font(.system(size: isLarge ? 11 : 9))
                                .foregroundColor(selectedSport == sport ? .black : .white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, isLarge ? 14 : 10)
                        .background(selectedSport == sport ? sport.color : sport.color.opacity(0.2))
                        .cornerRadius(isLarge ? 12 : 8)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // Logic
    func startTimer() {
        remainingTime = selectedDuration
        totalDuration = selectedDuration
        isRunning = true
        isPaused = false
        haptics.playWorkoutStarted()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in tick() }
    }

    func tick() {
        guard isRunning && !isPaused else { return }
        if remainingTime > 0 {
            remainingTime -= 1
            if remainingTime == totalDuration/2 && totalDuration >= 30 { haptics.playHalfwayHaptic() }
            if remainingTime == 10 { haptics.playTenSecondsWarning() }
            if remainingTime <= 3 && remainingTime > 0 { haptics.playCrownTick() }
        } else {
            haptics.playRestComplete()
            stopTimer()
        }
    }

    func togglePause() { isPaused.toggle(); haptics.playCrownTick() }
    func stopTimer() { timer?.invalidate(); timer = nil; isRunning = false; isPaused = false; remainingTime = 0 }

    var progress: Double { totalDuration > 0 ? Double(remainingTime)/Double(totalDuration) : 0 }
    var timeString: String { String(format: "%d:%02d", remainingTime/60, remainingTime%60) }
    func formatDuration(_ s: Int) -> String {
        let m = s/60, sec = s%60
        if m > 0 && sec > 0 { return String(format: "%d:%02d", m, sec) }
        if m > 0 { return "\(m)m" }
        return "\(sec)s"
    }
    func formatPreset(_ s: Int) -> String {
        if s >= 60 { let m = s/60, sec = s%60; return sec > 0 ? "\(m):\(String(format: "%02d", sec))" : "\(m)m" }
        return "\(s)s"
    }
}

enum Sport: CaseIterable {
    case musculation, cardio, hiit, yoga, boxing, crossfit
    var name: String {
        switch self {
        case .musculation: return "Muscu"
        case .cardio: return "Cardio"
        case .hiit: return "HIIT"
        case .yoga: return "Yoga"
        case .boxing: return "Boxe"
        case .crossfit: return "CrossFit"
        }
    }
    var icon: String {
        switch self {
        case .musculation: return "dumbbell.fill"
        case .cardio: return "figure.run"
        case .hiit: return "bolt.fill"
        case .yoga: return "figure.mind.and.body"
        case .boxing: return "figure.boxing"
        case .crossfit: return "figure.strengthtraining.functional"
        }
    }
    var color: Color {
        switch self {
        case .musculation: return .green
        case .cardio: return .red
        case .hiit: return .orange
        case .yoga: return .purple
        case .boxing: return .blue
        case .crossfit: return .yellow
        }
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - PAGE 3: HYDRATATION
// MARK: - ═══════════════════════════════════════════════════════════════

struct HydrationPageView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager
    @State private var animateWave = false
    @State private var showToast = false
    @State private var lastAmount = 0

    private let haptics = HapticsManager.shared

    var body: some View {
        GeometryReader { geo in
            let isLarge = geo.size.width > 180

            VStack(spacing: isLarge ? 8 : 4) {
                // Titre
                HStack(spacing: 4) {
                    Image(systemName: "drop.fill")
                        .foregroundColor(.cyan)
                    Text("HYDRATATION")
                        .font(.system(size: isLarge ? 13 : 10, weight: .bold))
                        .foregroundColor(.cyan)
                }

                // Bouteille - prend plus de place
                WaterBottleView(progress: connectivityManager.watchData.hydrationProgress, animate: animateWave)
                    .frame(height: geo.size.height * 0.45)
                    .padding(.horizontal, isLarge ? 20 : 10)

                // Valeur
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(connectivityManager.watchData.hydrationCurrent)")
                        .font(.system(size: isLarge ? 36 : 28, weight: .bold, design: .rounded))
                        .foregroundColor(.cyan)
                    Text("/ \(connectivityManager.watchData.hydrationGoal) ml")
                        .font(.system(size: isLarge ? 14 : 11))
                        .foregroundColor(.secondary)
                }

                // Boutons
                HStack(spacing: isLarge ? 10 : 6) {
                    Button(action: { remove() }) {
                        Text("-")
                            .font(.system(size: isLarge ? 24 : 18, weight: .bold))
                            .frame(width: isLarge ? 50 : 38, height: isLarge ? 44 : 34)
                            .background(Color.red.opacity(0.6))
                            .cornerRadius(isLarge ? 10 : 8)
                    }
                    .buttonStyle(.plain)

                    Button(action: { add(250) }) {
                        Text("+250")
                            .font(.system(size: isLarge ? 16 : 13, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: isLarge ? 44 : 34)
                            .background(Color.cyan)
                            .foregroundColor(.black)
                            .cornerRadius(isLarge ? 10 : 8)
                    }
                    .buttonStyle(.plain)

                    Button(action: { add(500) }) {
                        Text("+500")
                            .font(.system(size: isLarge ? 16 : 13, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: isLarge ? 44 : 34)
                            .background(Color.cyan.opacity(0.7))
                            .foregroundColor(.black)
                            .cornerRadius(isLarge ? 10 : 8)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, isLarge ? 8 : 4)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .overlay(toast)
        }
    }

    var toast: some View {
        VStack {
            if showToast {
                HStack {
                    Image(systemName: lastAmount > 0 ? "checkmark.circle.fill" : "minus.circle.fill")
                        .foregroundColor(lastAmount > 0 ? .green : .red)
                    Text(lastAmount > 0 ? "+\(lastAmount)ml" : "\(lastAmount)ml")
                }
                .padding(10)
                .background(Color(white: 0.15))
                .cornerRadius(20)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
            Spacer()
        }
        .animation(.spring(), value: showToast)
    }

    func add(_ amount: Int) {
        haptics.playConfirmation()
        connectivityManager.sendHydrationAdded(amount: amount)
        healthKitManager.saveWaterIntake(amount)
        lastAmount = amount
        animate()
    }

    func remove() {
        let amt = min(250, connectivityManager.watchData.hydrationCurrent)
        guard amt > 0 else { return }
        haptics.playCrownTick()
        connectivityManager.watchData.hydrationCurrent -= amt
        lastAmount = -amt
        animate()
    }

    func animate() {
        withAnimation { animateWave = true }
        showToast = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { animateWave = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { showToast = false }
    }
}

struct WaterBottleView: View {
    let progress: Double
    let animate: Bool
    @State private var wave: Double = 0

    var body: some View {
        GeometryReader { geo in
            ZStack {
                BottleShape().stroke(Color.cyan.opacity(0.4), lineWidth: 2)
                WaterShape(progress: progress, wave: wave)
                    .fill(LinearGradient(colors: [.cyan, .cyan.opacity(0.5)], startPoint: .top, endPoint: .bottom))
                    .clipShape(BottleShape())
                if animate {
                    ForEach(0..<6, id: \.self) { _ in
                        Circle().fill(Color.white.opacity(0.5))
                            .frame(width: .random(in: 4...10))
                            .position(x: .random(in: geo.size.width*0.3...geo.size.width*0.7),
                                      y: .random(in: geo.size.height*0.4...geo.size.height*0.9))
                    }
                }
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) { wave = .pi * 2 }
        }
    }
}

struct BottleShape: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let w = r.width, h = r.height
        let nw = w * 0.35, nh = h * 0.12, nx = (w - nw) / 2, cr = w * 0.12
        p.move(to: CGPoint(x: nx, y: nh))
        p.addLine(to: CGPoint(x: nx, y: 0))
        p.addLine(to: CGPoint(x: nx + nw, y: 0))
        p.addLine(to: CGPoint(x: nx + nw, y: nh))
        p.addQuadCurve(to: CGPoint(x: w - cr, y: nh + cr), control: CGPoint(x: w, y: nh))
        p.addLine(to: CGPoint(x: w - cr, y: h - cr))
        p.addQuadCurve(to: CGPoint(x: w - cr*2, y: h), control: CGPoint(x: w - cr, y: h))
        p.addLine(to: CGPoint(x: cr*2, y: h))
        p.addQuadCurve(to: CGPoint(x: cr, y: h - cr), control: CGPoint(x: cr, y: h))
        p.addLine(to: CGPoint(x: cr, y: nh + cr))
        p.addQuadCurve(to: CGPoint(x: nx, y: nh), control: CGPoint(x: 0, y: nh))
        p.closeSubpath()
        return p
    }
}

struct WaterShape: Shape {
    var progress: Double, wave: Double
    var animatableData: Double { get { wave } set { wave = newValue } }
    func path(in r: CGRect) -> Path {
        var p = Path()
        let wh = r.height * (1 - min(progress, 1))
        p.move(to: CGPoint(x: 0, y: r.height))
        p.addLine(to: CGPoint(x: 0, y: wh))
        for x in stride(from: 0, through: r.width, by: 1) {
            p.addLine(to: CGPoint(x: x, y: wh + sin(x/r.width * .pi * 2 + wave) * 4))
        }
        p.addLine(to: CGPoint(x: r.width, y: r.height))
        p.closeSubpath()
        return p
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - PAGE 4: POIDS
// MARK: - ═══════════════════════════════════════════════════════════════

struct WeightPageView: View {
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var healthKitManager: HealthKitManager
    @State private var showInput = false

    let data: [(String, Double)] = [("L", 78.5), ("M", 78.3), ("M", 78.1), ("J", 78.4), ("V", 78.0), ("S", 77.8), ("D", 77.6)]

    var body: some View {
        GeometryReader { geo in
            let isLarge = geo.size.width > 180

            VStack(spacing: isLarge ? 8 : 4) {
                // Header
                HStack(spacing: 4) {
                    Image(systemName: "scalemass.fill").foregroundColor(.orange)
                    Text("POIDS")
                        .font(.system(size: isLarge ? 13 : 10, weight: .bold))
                        .foregroundColor(.orange)
                }

                // Poids actuel
                HStack(alignment: .firstTextBaseline) {
                    Text(String(format: "%.1f", connectivityManager.watchData.currentWeight))
                        .font(.system(size: isLarge ? 44 : 34, weight: .bold, design: .rounded))
                    Text("kg")
                        .font(.system(size: isLarge ? 16 : 12))
                        .foregroundColor(.secondary)

                    Spacer()

                    let diff = connectivityManager.watchData.currentWeight - connectivityManager.watchData.targetWeight
                    VStack(alignment: .trailing, spacing: 2) {
                        HStack(spacing: 2) {
                            Image(systemName: diff <= 0 ? "arrow.down.right" : "arrow.up.right")
                                .font(.system(size: isLarge ? 12 : 10))
                            Text(String(format: "%+.1f", diff))
                                .font(.system(size: isLarge ? 14 : 11, weight: .semibold))
                        }
                        .foregroundColor(diff <= 0 ? .green : .orange)

                        Text("obj: \(String(format: "%.1f", connectivityManager.watchData.targetWeight))")
                            .font(.system(size: isLarge ? 10 : 8))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal, isLarge ? 8 : 4)

                // Graphique
                WeightGraph(data: data, target: connectivityManager.watchData.targetWeight, isLarge: isLarge)
                    .frame(height: geo.size.height * 0.4)
                    .padding(.horizontal, isLarge ? 4 : 2)

                // Bouton
                Button(action: { showInput = true }) {
                    HStack {
                        Image(systemName: "plus")
                        Text("Ajouter")
                    }
                    .font(.system(size: isLarge ? 15 : 12, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, isLarge ? 12 : 8)
                    .background(Color.orange)
                    .foregroundColor(.black)
                    .cornerRadius(isLarge ? 12 : 8)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, isLarge ? 8 : 4)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .sheet(isPresented: $showInput) {
            WeightInput(current: connectivityManager.watchData.currentWeight) { w in
                connectivityManager.sendWeightAdded(weight: w)
                healthKitManager.saveWeight(w)
                showInput = false
            }
        }
    }
}

struct WeightGraph: View {
    let data: [(String, Double)]
    let target: Double
    let isLarge: Bool

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let minW = (data.map { $0.1 }.min() ?? 70) - 0.5
            let maxW = (data.map { $0.1 }.max() ?? 80) + 0.5
            let range = maxW - minW

            ZStack {
                // Ligne objectif
                let ty = h * (1 - (target - minW) / range)
                Path { p in p.move(to: CGPoint(x: 0, y: ty)); p.addLine(to: CGPoint(x: w, y: ty)) }
                    .stroke(Color.orange.opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [4, 3]))

                // Courbe
                Path { p in
                    for (i, d) in data.enumerated() {
                        let x = w * CGFloat(i) / CGFloat(data.count - 1)
                        let y = h * (1 - (d.1 - minW) / range)
                        if i == 0 { p.move(to: CGPoint(x: x, y: y)) }
                        else { p.addLine(to: CGPoint(x: x, y: y)) }
                    }
                }
                .stroke(Color.orange, style: StrokeStyle(lineWidth: isLarge ? 3 : 2, lineCap: .round, lineJoin: .round))

                // Points + valeurs
                ForEach(Array(data.enumerated()), id: \.0) { i, d in
                    let x = w * CGFloat(i) / CGFloat(data.count - 1)
                    let y = h * (1 - (d.1 - minW) / range)

                    VStack(spacing: 2) {
                        Text(String(format: "%.1f", d.1))
                            .font(.system(size: isLarge ? 10 : 8, weight: .bold))
                            .foregroundColor(.orange)

                        Circle().fill(Color.orange)
                            .frame(width: isLarge ? 10 : 7, height: isLarge ? 10 : 7)
                            .overlay(Circle().fill(Color.black).frame(width: isLarge ? 5 : 3))

                        Text(d.0)
                            .font(.system(size: isLarge ? 9 : 7))
                            .foregroundColor(.secondary)
                    }
                    .position(x: x, y: y)
                }
            }
            .padding(.top, 15)
            .padding(.bottom, 10)
        }
    }
}

struct WeightInput: View {
    let current: Double
    let onSave: (Double) -> Void
    @State private var w: Double
    @Environment(\.dismiss) var dismiss

    init(current: Double, onSave: @escaping (Double) -> Void) {
        self.current = current; self.onSave = onSave; _w = State(initialValue: current)
    }

    var body: some View {
        VStack(spacing: 12) {
            Text("Pesée").font(.headline)
            Text(String(format: "%.1f", w))
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundColor(.orange)
                .focusable(true)
                .digitalCrownRotation($w, from: 40, through: 200, by: 0.1, sensitivity: .medium, isContinuous: false, isHapticFeedbackEnabled: true)
            Text("kg").foregroundColor(.secondary)

            HStack(spacing: 16) {
                Button(action: { w -= 0.1 }) {
                    Image(systemName: "minus").frame(width: 44, height: 44).background(Color.gray.opacity(0.3)).cornerRadius(22)
                }.buttonStyle(.plain)
                Button(action: { w += 0.1 }) {
                    Image(systemName: "plus").frame(width: 44, height: 44).background(Color.gray.opacity(0.3)).cornerRadius(22)
                }.buttonStyle(.plain)
            }

            Button(action: { onSave(w) }) {
                Text("OK").fontWeight(.bold).frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(Color.orange).foregroundColor(.black).cornerRadius(10)
            }.buttonStyle(.plain)
        }
        .padding()
    }
}

// MARK: - ═══════════════════════════════════════════════════════════════
// MARK: - PAGE 5: CARNET / RECORDS
// MARK: - ═══════════════════════════════════════════════════════════════

struct WorkoutHistoryPageView: View {
    let records: [PR] = [
        PR(ex: "Développé couché", w: 90, r: 6, d: "16/01"),
        PR(ex: "Squat", w: 110, r: 6, d: "16/01"),
        PR(ex: "Soulevé de terre", w: 130, r: 3, d: "15/01"),
        PR(ex: "Rowing barre", w: 70, r: 10, d: "14/01")
    ]

    let history: [Workout] = [
        Workout(date: "Aujourd'hui", ex: [
            Ex(name: "Développé couché", sets: [(80, 10, false), (85, 8, false), (90, 6, true)]),
            Ex(name: "Squat", sets: [(100, 8, false), (110, 6, true)])
        ]),
        Workout(date: "Hier", ex: [
            Ex(name: "Soulevé de terre", sets: [(120, 5, false), (130, 3, true)])
        ])
    ]

    var body: some View {
        GeometryReader { geo in
            let isLarge = geo.size.width > 180

            ScrollView {
                VStack(spacing: isLarge ? 12 : 8) {
                    // Header
                    HStack(spacing: 4) {
                        Image(systemName: "book.fill").foregroundColor(.blue)
                        Text("CARNET")
                            .font(.system(size: isLarge ? 13 : 10, weight: .bold))
                            .foregroundColor(.blue)
                    }

                    // Records
                    VStack(alignment: .leading, spacing: isLarge ? 8 : 6) {
                        HStack(spacing: 4) {
                            Image(systemName: "trophy.fill")
                                .font(.system(size: isLarge ? 14 : 11))
                                .foregroundColor(.yellow)
                            Text("MES RECORDS")
                                .font(.system(size: isLarge ? 12 : 9, weight: .bold))
                                .foregroundColor(.yellow)
                        }

                        ForEach(records.prefix(4), id: \.ex) { pr in
                            HStack {
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(pr.ex)
                                        .font(.system(size: isLarge ? 12 : 10, weight: .semibold))
                                        .lineLimit(1)
                                    Text(pr.d)
                                        .font(.system(size: isLarge ? 9 : 7))
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                HStack(spacing: 3) {
                                    Text("\(Int(pr.w))")
                                        .font(.system(size: isLarge ? 18 : 14, weight: .bold, design: .rounded))
                                        .foregroundColor(.yellow)
                                    Text("kg ×")
                                        .font(.system(size: isLarge ? 10 : 8))
                                        .foregroundColor(.secondary)
                                    Text("\(pr.r)")
                                        .font(.system(size: isLarge ? 18 : 14, weight: .bold, design: .rounded))
                                        .foregroundColor(.yellow)
                                }
                            }
                            .padding(.vertical, isLarge ? 4 : 2)
                        }
                    }
                    .padding(isLarge ? 12 : 8)
                    .background(Color.yellow.opacity(0.1))
                    .cornerRadius(isLarge ? 14 : 10)

                    Divider().background(Color.white.opacity(0.2))

                    // Historique
                    VStack(alignment: .leading, spacing: isLarge ? 8 : 6) {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.system(size: isLarge ? 11 : 9))
                                .foregroundColor(.secondary)
                            Text("HISTORIQUE")
                                .font(.system(size: isLarge ? 11 : 9, weight: .bold))
                                .foregroundColor(.secondary)
                        }

                        ForEach(history, id: \.date) { workout in
                            VStack(alignment: .leading, spacing: isLarge ? 6 : 4) {
                                Text(workout.date)
                                    .font(.system(size: isLarge ? 12 : 10, weight: .bold))

                                ForEach(workout.ex, id: \.name) { ex in
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(ex.name)
                                            .font(.system(size: isLarge ? 11 : 9))
                                            .foregroundColor(.blue)

                                        HStack(spacing: 4) {
                                            ForEach(Array(ex.sets.enumerated()), id: \.0) { _, s in
                                                HStack(spacing: 2) {
                                                    if s.2 {
                                                        Image(systemName: "star.fill")
                                                            .font(.system(size: isLarge ? 8 : 6))
                                                            .foregroundColor(.yellow)
                                                    }
                                                    Text("\(Int(s.0))×\(s.1)")
                                                        .font(.system(size: isLarge ? 11 : 9, weight: s.2 ? .bold : .regular))
                                                        .foregroundColor(s.2 ? .yellow : .white)
                                                }
                                                .padding(.horizontal, isLarge ? 6 : 4)
                                                .padding(.vertical, isLarge ? 4 : 2)
                                                .background(s.2 ? Color.yellow.opacity(0.2) : Color.gray.opacity(0.2))
                                                .cornerRadius(isLarge ? 6 : 4)
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(isLarge ? 10 : 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(isLarge ? 12 : 8)
                        }
                    }

                    Spacer(minLength: 20)
                }
                .padding(.horizontal, isLarge ? 8 : 6)
            }
        }
    }
}

struct PR { let ex: String; let w: Double; let r: Int; let d: String }
struct Workout { let date: String; let ex: [Ex] }
struct Ex { let name: String; let sets: [(Double, Int, Bool)] }

// MARK: - Preview

#Preview {
    ContentView()
        .environmentObject(WatchConnectivityManager.shared)
        .environmentObject(HealthKitManager.shared)
        .environmentObject(WorkoutSessionManager.shared)
}
