// ============================================
// YOROI WATCH - Timer Multi-Modes
// Repos, Combat (Gong), Tabata (Beep)
// ============================================

import SwiftUI
import Combine

enum TimerMode: String, CaseIterable, Identifiable {
    case rest = "REPOS"
    case combat = "COMBAT"
    case tabata = "TABATA"
    case breathing = "RESPIRATION"
    case stretching = "STRETCH"
    
    var id: String { self.rawValue }
    
    var icon: String {
        switch self {
        case .rest: return "timer"
        case .combat: return "figure.martial.arts"
        case .tabata: return "bolt.fill"
        case .breathing: return "lungs.fill"
        case .stretching: return "figure.flexibility"
        }
    }
    
    var color: Color {
        switch self {
        case .rest: return .yellow
        case .combat: return .red
        case .tabata: return .orange
        case .breathing: return .cyan
        case .stretching: return .green
        }
    }
}

struct TimerView: View {
    @State private var currentMode: TimerMode = .rest
    @State private var remainingTime: Int = 90
    @State private var selectedDuration: Int = 90
    @State private var isRunning = false
    @State private var currentRound = 1
    @State private var totalRounds = 5
    @State private var isWorkPhase = true // Pour Tabata/Combat
    @State private var showCustomDurationPicker = false
    @State private var customMinutes = 1
    @State private var customSeconds = 30
    
    @State private var timer: Timer?
    let durations = [30, 60, 90, 120, 180, 300, 600]
    
    var body: some View {
        TimelineView(.periodic(from: .now, by: isRunning ? 1.0 : 10.0)) { context in
            ScrollView {
                VStack(spacing: 8) {
                    // CERCLE PRINCIPAL AVEC CONTRÔLES INTÉGRÉS
                    HStack(spacing: 10) {
                        // BOUTON MOINS (Gauche)
                        Button(action: { 
                            if remainingTime > 10 {
                                remainingTime -= 10 
                                WKInterfaceDevice.current().play(.click)
                            }
                        }) {
                            Image(systemName: "minus.circle.fill")
                                .font(.system(size: 28))
                                .foregroundColor(.gray.opacity(0.6))
                        }
                        .buttonStyle(.plain)
                        .disabled(isRunning)
                        
                        ZStack {
                            Circle()
                                .stroke(currentMode.color.opacity(0.2), lineWidth: 8)
                                .frame(width: 110, height: 110)
                            
                            Circle()
                                .trim(from: 0, to: CGFloat(Double(remainingTime) / Double(max(1, selectedDuration))))
                                .stroke(currentMode.color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                                .frame(width: 110, height: 110)
                                .rotationEffect(.degrees(-90))
                                .animation(.linear, value: remainingTime)
                            
                            VStack(spacing: 2) {
                                if currentMode != .rest && currentMode != .breathing && currentMode != .stretching {
                                    Text("R\(currentRound)/\(totalRounds)")
                                        .font(.system(size: 12, weight: .black))
                                        .foregroundColor(currentMode.color)
                                }
                                
                                Text(formatTime(remainingTime))
                                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                                    .foregroundColor(.white)
                                
                                // BOUTON PLAY/STOP AU MILIEU
                                Button(action: toggleTimer) {
                                    Image(systemName: isRunning ? "pause.fill" : "play.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(isRunning ? .orange : currentMode.color)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        
                        // BOUTON PLUS (Droite)
                        Button(action: { 
                            remainingTime += 10 
                            if !isRunning { selectedDuration = remainingTime }
                            WKInterfaceDevice.current().play(.click)
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 28))
                                .foregroundColor(.gray.opacity(0.6))
                        }
                        .buttonStyle(.plain)
                        .disabled(isRunning)
                    }
                    .padding(.vertical, 8)
                    
                    // SÉLECTEUR DE MODE
                    // ... reste du code identique ...
                VStack(alignment: .leading, spacing: 4) {
                    Text("MODE")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.gray)
                        .padding(.leading, 4)
                        
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(TimerMode.allCases) { mode in
                                Button(action: { 
                                    if !isRunning {
                                        currentMode = mode
                                        setupModeDefaults()
                                        WKInterfaceDevice.current().play(.click)
                                    }
                                }) {
                                    VStack(spacing: 4) {
                                        Image(systemName: mode.icon)
                                            .font(.system(size: 16))
                                        Text(mode.rawValue)
                                            .font(.system(size: 9, weight: .bold))
                                    }
                                    .frame(width: 70, height: 50)
                                    .background(currentMode == mode ? mode.color : Color.gray.opacity(0.15))
                                    .foregroundColor(currentMode == mode ? .black : .white)
                                    .cornerRadius(12)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                
                // SÉLECTEUR DE DURÉE RAPIDE
                if !isRunning {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("DURÉE RAPIDE")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.gray)
                            .padding(.leading, 4)
                            
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(durations, id: \.self) { d in
                                    Button(action: {
                                        selectedDuration = d
                                        remainingTime = d
                                        WKInterfaceDevice.current().play(.click)
                                    }) {
                                        Text(d < 60 ? "\(d)s" : "\(d/60)m")
                                            .font(.system(size: 12, weight: .bold))
                                            .frame(width: 44, height: 44)
                                            .background(selectedDuration == d ? Color.white : Color.gray.opacity(0.2))
                                            .foregroundColor(selectedDuration == d ? .black : .white)
                                            .clipShape(Circle())
                                    }
                                    .buttonStyle(.plain)
                                }
                                
                                // BOUTON CUSTOM
                                Button(action: {
                                    showCustomDurationPicker = true
                                }) {
                                    Image(systemName: "slider.horizontal.3")
                                        .font(.system(size: 16))
                                        .frame(width: 44, height: 44)
                                        .background(Color.gray.opacity(0.2))
                                        .foregroundColor(.white)
                                        .clipShape(Circle())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                
                // PARAMÈTRES AVANCÉS (ROUNDS)
                if (currentMode == .combat || currentMode == .tabata) && !isRunning {
                    HStack {
                        Text("Rounds")
                            .font(.system(size: 12))
                        Spacer()
                        Button(action: { if totalRounds > 1 { totalRounds -= 1 } }) {
                            Image(systemName: "minus.circle.fill").foregroundColor(.gray)
                        }
                        Text("\(totalRounds)")
                            .font(.system(size: 14, weight: .bold))
                            .frame(minWidth: 20)
                        Button(action: { if totalRounds < 20 { totalRounds += 1 } }) {
                            Image(systemName: "plus.circle.fill").foregroundColor(.gray)
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(10)
                }
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 20)
        }
        .sheet(isPresented: $showCustomDurationPicker) {
            VStack {
                Text("Durée personnalisée")
                    .font(.headline)
                
                HStack {
                    Picker("Min", selection: $customMinutes) {
                        ForEach(0..<60) { i in Text("\(i)m").tag(i) }
                    }
                    .labelsHidden()
                    .frame(width: 60, height: 80)
                    
                    Picker("Sec", selection: $customSeconds) {
                        ForEach(0..<60) { i in Text("\(i)s").tag(i) }
                    }
                    .labelsHidden()
                    .frame(width: 60, height: 80)
                }
                
                Button("Valider") {
                    let totalSeconds = (customMinutes * 60) + customSeconds
                    if totalSeconds > 0 {
                        selectedDuration = totalSeconds
                        remainingTime = totalSeconds
                    }
                    showCustomDurationPicker = false
                }
                .padding()
                .background(Color.green)
                .cornerRadius(20)
            }
        }
        .background(Color.black)
        .onDisappear { stopTimer() }
    }
    
    private func setupModeDefaults() {
        switch currentMode {
        case .rest:
            selectedDuration = 90
            remainingTime = 90
        case .combat:
            selectedDuration = 300 // 5 min
            remainingTime = 300
            totalRounds = 3
            isWorkPhase = true
        case .tabata:
            selectedDuration = 20 // 20 sec work
            remainingTime = 20
            totalRounds = 8
            isWorkPhase = true
        case .breathing:
            selectedDuration = 60
            remainingTime = 60
        case .stretching:
            selectedDuration = 30
            remainingTime = 30
        }
    }
    
    private func toggleTimer() {
        if isRunning {
            stopTimer()
        } else {
            startTimer()
            if currentMode == .combat { SoundManager.shared.playSound(named: "gong") }
            else { SoundManager.shared.playSound(named: "beep") }
        }
    }
    
    private func startTimer() {
        isRunning = true
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if remainingTime > 0 {
                remainingTime -= 1
                // Beep d'avertissement les 3 dernières secondes
                if remainingTime <= 3 && remainingTime > 0 {
                    SoundManager.shared.playSound(named: "beep")
                }
            } else {
                handlePhaseEnd()
            }
        }
    }
    
    private func handlePhaseEnd() {
        if currentMode == .rest || currentMode == .breathing || currentMode == .stretching {
            SoundManager.shared.playSound(named: "beep")
            stopTimer()
            return
        }
        
        // Logique Rounds (Combat / Tabata)
        if isWorkPhase {
            // Fin du travail -> Repos
            isWorkPhase = false
            remainingTime = currentMode == .combat ? 60 : 10
            selectedDuration = remainingTime
            SoundManager.shared.playSound(named: currentMode == .combat ? "gong" : "beep")
        } else {
            // Fin du repos -> Nouveau Round
            if currentRound < totalRounds {
                currentRound += 1
                isWorkPhase = true
                remainingTime = currentMode == .combat ? 300 : 20
                selectedDuration = remainingTime
                SoundManager.shared.playSound(named: currentMode == .combat ? "gong" : "beep")
            } else {
                // Fin de session
                SoundManager.shared.playSound(named: currentMode == .combat ? "gong" : "beep")
                stopTimer()
            }
        }
    }
    
    private func stopTimer() {
        isRunning = false
        timer?.invalidate()
        timer = nil
        currentRound = 1
        isWorkPhase = true
        setupModeDefaults()
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }
}