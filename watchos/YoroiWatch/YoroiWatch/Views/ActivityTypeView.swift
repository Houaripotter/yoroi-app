// ============================================
// YOROI WATCH - Types d'activité
// Muscu, Cardio, HIIT, Yoga, Boxe, CrossFit
// ============================================

import SwiftUI

struct ActivityTypeView: View {
    @State private var selectedActivity: String?

    let activities: [(name: String, icon: String, color: Color, isHighlighted: Bool)] = [
        ("Muscu", "dumbbell.fill", .green, true),
        ("Cardio", "figure.run", Color(red: 1.0, green: 0.42, blue: 0.21), false),
        ("HIIT", "bolt.fill", Color(red: 0.55, green: 0.27, blue: 0.07), false),
        ("Yoga", "figure.mind.and.body", .purple, false),
        ("Boxe", "figure.boxing", Color(red: 0.42, green: 0.56, blue: 0.14), false),
        ("CrossFit", "figure.strengthtraining.functional", Color(red: 0.6, green: 0.2, blue: 0.8), false),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Titre
                Text("TYPE D'ACTIVITÉ")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.gray)
                    .padding(.top, 4)

                // Grille 2x3
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 6),
                    GridItem(.flexible(), spacing: 6)
                ], spacing: 6) {
                    ForEach(activities, id: \.name) { activity in
                        ActivityButton(
                            name: activity.name,
                            icon: activity.icon,
                            color: activity.color,
                            isHighlighted: activity.isHighlighted
                        ) {
                            selectedActivity = activity.name
                        }
                    }
                }
                .padding(.horizontal, 8)

                // Pagination
                HStack(spacing: 6) {
                    Circle().fill(Color.white).frame(width: 6, height: 6)
                    ForEach(0..<4, id: \.self) { _ in
                        Circle().fill(Color.gray.opacity(0.5)).frame(width: 6, height: 6)
                    }
                }
                .padding(.top, 8)
            }
        }
        .background(Color.black)
    }
}

struct ActivityButton: View {
    let name: String
    let icon: String
    let color: Color
    let isHighlighted: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(isHighlighted ? .black : color)

                Text(name)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(isHighlighted ? .black : .white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isHighlighted ? color : color.opacity(0.3))
            .cornerRadius(14)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ActivityTypeView()
}
