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
    
    var id: String { self.rawValue }
    
    var icon: String {
        switch self {
        case .rest: return "timer"
        case .combat: return "figure.martial.arts"
        case .tabata: return "bolt.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .rest: return .yellow
        case .combat: return .red
        case .tabata: return .orange
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
    
    @State private var timer: Timer?
    let durations = [30, 60, 90, 120, 180]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // SÉLECTEUR DE MODE
                HStack(spacing: 4) {
                    ForEach(TimerMode.allCases) { mode in
                        Button(action: { 
                            if !isRunning {
                                currentMode = mode
                                setupModeDefaults()
                            }
                        }) {
                            VStack(spacing: 2) {
                                Image(systemName: mode.icon)
                                    .font(.system(size: 14))
                                Text(mode.rawValue)
                                    .font(.system(size: 8, weight: .bold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(currentMode == mode ? mode.color : Color.gray.opacity(0.15))
                            .foregroundColor(currentMode == mode ? .black : .gray)
                            .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 4)
                .padding(.top, 4)
                
                // CERCLE PRINCIPAL AVEC CONTRÔLES INTÉGRÉS
                HStack(spacing: 10) {
                    // BOUTON MOINS (Gauche)
                    Button(action: { 
                        remainingTime = max(0, remainingTime - 10) 
                        WKInterfaceDevice.current().play(.click)
                    }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.gray.opacity(0.6))
                    }
                    .buttonStyle(.plain)
                    .disabled(isRunning && currentMode != .rest)
                    
                    ZStack {
                        Circle()
                            .stroke(currentMode.color.opacity(0.2), lineWidth: 6)
                            .frame(width: 100, height: 100)
                        
                        Circle()
                            .trim(from: 0, to: CGFloat(Double(remainingTime) / Double(max(1, selectedDuration))))
                            .stroke(currentMode.color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                            .frame(width: 100, height: 100)
                            .rotationEffect(.degrees(-90))
                            .animation(.linear, value: remainingTime)
                        
                        VStack(spacing: 2) {
                            if currentMode != .rest {
                                Text("R\(currentRound)/\(totalRounds)")
                                    .font(.system(size: 10, weight: .black))
                                    .foregroundColor(currentMode.color)
                            }
                            
                            Text(formatTime(remainingTime))
                                .font(.system(size: 24, weight: .bold, design: .monospaced))
                                .foregroundColor(.white)
                            
                            // BOUTON PLAY/STOP AU MILIEU
                            Button(action: toggleTimer) {
                                Image(systemName: isRunning ? "pause.circle.fill" : "play.circle.fill")
                                    .font(.system(size: 32))
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
                            .font(.system(size: 24))
                            .foregroundColor(.gray.opacity(0.6))
                    }
                    .buttonStyle(.plain)
                    .disabled(isRunning && currentMode != .rest)
                }
                .padding(.vertical, 4)
                
                // CONTRÔLES DURÉE (Seulement si mode repos et pas lancé)
                if currentMode == .rest && !isRunning {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(durations, id: \.self) { d in
                                Button(action: {
                                    selectedDuration = d
                                    remainingTime = d
                                    WKInterfaceDevice.current().play(.click)
                                }) {
                                    Text(d < 60 ? "\(d)s" : "\(d/60)m")
                                        .font(.system(size: 11, weight: .bold))
                                        .frame(width: 38, height: 38)
                                        .background(selectedDuration == d ? Color.yellow : Color.gray.opacity(0.2))
                                        .foregroundColor(selectedDuration == d ? .black : .white)
                                        .clipShape(Circle())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 8)
                    }
                }
            }
            .padding(.bottom, 20)
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
        if currentMode == .rest {
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

#Preview {
    TimerView()
}