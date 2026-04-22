// ============================================
// YOROI LIVE ACTIVITY — Dynamic Island pendant une séance
// Affiche un timer + sport en cours dans la Dynamic Island et l'écran verrouillé.
// Démarrée/arrêtée depuis le bridge React Native.
// ============================================

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Attributes (données statiques pour la durée de l'activité)

@available(iOS 16.1, *)
struct YoroiSessionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // État dynamique mis à jour pendant la session
        var elapsedSeconds: Int
        var heartRate: Int      // 0 si pas de capteur
        var calories: Int       // estimées
        var rounds: Int         // pour BJJ/boxe (0 si N/A)
    }
    // Données figées au démarrage
    var sportName: String
    var sportIcon: String       // SF Symbol name
    var sportColorHex: String   // ex. "3B82F6"
    var startedAt: Date
}

// MARK: - Vue Lock Screen / Banner

struct LiveActivityLockScreenView: View {
    let context: ActivityViewContext<YoroiSessionAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: context.attributes.sportIcon)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(Color(hex: context.attributes.sportColorHex))
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.sportName)
                        .font(.system(size: 16, weight: .black))
                    Text("Séance en cours")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.secondary)
                }
                Spacer()
                Text(formatDuration(context.state.elapsedSeconds))
                    .font(.system(size: 24, weight: .black, design: .monospaced))
                    .foregroundColor(Color(hex: context.attributes.sportColorHex))
            }
            HStack(spacing: 20) {
                if context.state.heartRate > 0 {
                    Label("\(context.state.heartRate) bpm", systemImage: "heart.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.red)
                }
                if context.state.calories > 0 {
                    Label("\(context.state.calories) kcal", systemImage: "flame.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.orange)
                }
                if context.state.rounds > 0 {
                    Label("\(context.state.rounds) rounds", systemImage: "figure.boxing")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.purple)
                }
                Spacer()
            }
        }
        .padding(14)
    }
}

// MARK: - Helpers

func formatDuration(_ s: Int) -> String {
    let h = s / 3600
    let m = (s % 3600) / 60
    let sec = s % 60
    if h > 0 {
        return String(format: "%d:%02d:%02d", h, m, sec)
    }
    return String(format: "%d:%02d", m, sec)
}

extension Color {
    init(hex: String) {
        let cleaned = hex.replacingOccurrences(of: "#", with: "")
        var int: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Widget configuration (Live Activity)

@available(iOS 16.1, *)
struct YoroiLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: YoroiSessionAttributes.self) { context in
            // Vue Lock Screen + Banner Notification
            LiveActivityLockScreenView(context: context)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded — visible quand l'utilisateur appuie longtemps
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: context.attributes.sportIcon)
                            .foregroundColor(Color(hex: context.attributes.sportColorHex))
                        Text(context.attributes.sportName)
                            .font(.system(size: 13, weight: .bold))
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatDuration(context.state.elapsedSeconds))
                        .font(.system(size: 17, weight: .black, design: .monospaced))
                        .foregroundColor(Color(hex: context.attributes.sportColorHex))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 16) {
                        if context.state.heartRate > 0 {
                            Label("\(context.state.heartRate)", systemImage: "heart.fill")
                                .foregroundColor(.red)
                                .font(.system(size: 12, weight: .semibold))
                        }
                        if context.state.calories > 0 {
                            Label("\(context.state.calories) kcal", systemImage: "flame.fill")
                                .foregroundColor(.orange)
                                .font(.system(size: 12, weight: .semibold))
                        }
                        Spacer()
                    }
                }
            } compactLeading: {
                Image(systemName: context.attributes.sportIcon)
                    .foregroundColor(Color(hex: context.attributes.sportColorHex))
            } compactTrailing: {
                Text(formatDuration(context.state.elapsedSeconds))
                    .font(.system(size: 12, weight: .heavy, design: .monospaced))
                    .foregroundColor(Color(hex: context.attributes.sportColorHex))
            } minimal: {
                Image(systemName: "figure.run")
                    .foregroundColor(Color(hex: context.attributes.sportColorHex))
            }
        }
    }
}
