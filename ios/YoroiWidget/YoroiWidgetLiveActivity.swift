//
//  YoroiWidgetLiveActivity.swift
//  YoroiWidget
//
//  YOROI - Live Activity pour Dynamic Island
//  Affiche un Timer d'entraînement dans la Dynamic Island
//

import ActivityKit
import WidgetKit
import SwiftUI

// ============================================
// ATTRIBUTES - Données de la Live Activity
// ============================================
struct YoroiWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedSeconds: Int
        var isRunning: Bool
        var heartRate: Int?
    }

    var activityName: String
    var startTime: Date
}

// ============================================
// LIVE ACTIVITY WIDGET
// ============================================
struct YoroiWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: YoroiWidgetAttributes.self) { context in
            // ========================================
            // LOCK SCREEN / BANNER UI
            // ========================================
            HStack(spacing: 12) {
                Image(systemName: context.state.isRunning ? "figure.run" : "pause.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.white)

                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.activityName)
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .monospacedDigit()

                    if let hr = context.state.heartRate {
                        HStack(spacing: 4) {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                            Text("\(hr) BPM")
                                .font(.caption)
                                .foregroundColor(.white)
                        }
                    }
                }

                Spacer()

                Text(context.state.isRunning ? "EN COURS" : "PAUSE")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(16)
            .activityBackgroundTint(Color.black.opacity(0.8))
            .activitySystemActionForegroundColor(Color.white)

        } dynamicIsland: { context in
            DynamicIsland {
                // ========================================
                // EXPANDED VIEW (Dynamic Island étendue)
                // ========================================
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: "figure.run")
                            .font(.title2)
                            .foregroundColor(.green)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.activityName)
                                .font(.caption)
                                .fontWeight(.semibold)

                            Text(context.state.isRunning ? "En cours" : "En pause")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    if let hr = context.state.heartRate {
                        VStack(alignment: .trailing, spacing: 2) {
                            HStack(spacing: 4) {
                                Image(systemName: "heart.fill")
                                    .foregroundColor(.red)
                                Text("\(hr)")
                                    .font(.title3)
                                    .fontWeight(.bold)
                            }
                            Text("BPM")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        Text(formatTime(context.state.elapsedSeconds))
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundColor(.white)

                        if context.state.isRunning {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .green))
                                .scaleEffect(0.8)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }

            } compactLeading: {
                // ========================================
                // COMPACT LEADING (gauche de la pilule)
                // ========================================
                Image(systemName: context.state.isRunning ? "figure.run" : "pause.fill")
                    .foregroundColor(context.state.isRunning ? .green : .orange)

            } compactTrailing: {
                // ========================================
                // COMPACT TRAILING (droite de la pilule)
                // ========================================
                Text(formatTimeCompact(context.state.elapsedSeconds))
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(.white)

            } minimal: {
                // ========================================
                // MINIMAL (vue ultra-compacte)
                // ========================================
                Image(systemName: context.state.isRunning ? "figure.run" : "pause.fill")
                    .foregroundColor(context.state.isRunning ? .green : .orange)
            }
            .widgetURL(URL(string: "yoroi://training"))
            .keylineTint(.green)
        }
    }

    // ========================================
    // HELPERS
    // ========================================

    private func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }

    private func formatTimeCompact(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", minutes, secs)
    }
}

// ============================================
// PREVIEWS
// ============================================
extension YoroiWidgetAttributes {
    fileprivate static var preview: YoroiWidgetAttributes {
        YoroiWidgetAttributes(
            activityName: "Course",
            startTime: Date()
        )
    }
}

extension YoroiWidgetAttributes.ContentState {
    fileprivate static var running: YoroiWidgetAttributes.ContentState {
        YoroiWidgetAttributes.ContentState(
            elapsedSeconds: 1245,
            isRunning: true,
            heartRate: 158
        )
    }

    fileprivate static var paused: YoroiWidgetAttributes.ContentState {
        YoroiWidgetAttributes.ContentState(
            elapsedSeconds: 720,
            isRunning: false,
            heartRate: 120
        )
    }
}

#Preview("Notification", as: .content, using: YoroiWidgetAttributes.preview) {
    YoroiWidgetLiveActivity()
} contentStates: {
    YoroiWidgetAttributes.ContentState.running
    YoroiWidgetAttributes.ContentState.paused
}
