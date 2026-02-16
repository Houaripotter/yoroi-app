// ============================================
// YOROI WATCH - Vue Jeûne Intermittent
// Suivi du temps de jeûne en temps réel
// ============================================

import SwiftUI
import Combine

struct FastingView: View {
    @StateObject private var healthManager = HealthManager.shared
    
    // États pour le timer
    @State private var isFasting = false
    @State private var startTime = Date()
    @State private var targetHours: Double = 16
    @State private var elapsedSeconds: TimeInterval = 0
    
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Header
                HStack(spacing: 6) {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.orange)
                    Text("JEÛNE")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.orange)
                }
                .padding(.top, 8)
                
                // Cercle de progression
                ZStack {
                    Circle()
                        .stroke(Color.orange.opacity(0.2), lineWidth: 8)
                        .frame(width: 100, height: 100)
                    
                    Circle()
                        .trim(from: 0, to: min(1.0, elapsedSeconds / (targetHours * 3600)))
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [.orange, .yellow]),
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .frame(width: 100, height: 100)
                        .rotationEffect(.degrees(-90))
                        .animation(.linear, value: elapsedSeconds)
                    
                    VStack(spacing: 0) {
                        Text(formatTime(elapsedSeconds))
                            .font(.system(size: 20, weight: .bold, design: .monospaced))
                        
                        Text("\(Int(targetHours))H")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                }
                .padding(.vertical, 4)
                
                // Infos
                VStack(spacing: 4) {
                    HStack {
                        Text("Début")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                        Spacer()
                        Text(formatDate(startTime))
                            .font(.system(size: 11, weight: .semibold))
                    }
                    
                    HStack {
                        Text("Fin estimée")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                        Spacer()
                        Text(formatDate(startTime.addingTimeInterval(targetHours * 3600)))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.green)
                    }
                }
                .padding(10)
                .background(Color.gray.opacity(0.15))
                .cornerRadius(12)
                .padding(.horizontal, 8)
                
                // Bouton d'action
                Button(action: {
                    isFasting.toggle()
                    if isFasting {
                        startTime = Date()
                    }
                }) {
                    Text(isFasting ? "Arrêter" : "Démarrer")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(isFasting ? Color.red.opacity(0.8) : Color.orange)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)
            }
            .padding(.bottom, 16)
        }
        .background(Color.black)
        .onAppear {
            updateElapsed()
        }
        .onReceive(timer) { _ in
            if isFasting {
                updateElapsed()
            }
        }
    }
    
    private func updateElapsed() {
        elapsedSeconds = Date().timeIntervalSince(startTime)
    }
    
    private func formatTime(_ seconds: TimeInterval) -> String {
        let h = Int(seconds) / 3600
        let m = Int(seconds) % 3600 / 60
        let s = Int(seconds) % 60
        return String(format: "%02d:%02d:%02d", h, m, s)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

#Preview {
    FastingView()
}
