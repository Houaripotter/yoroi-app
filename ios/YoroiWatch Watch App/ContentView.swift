// ============================================
// YOROI WATCH - Navigation principale
// Swipe horizontal entre les pages principales
// ============================================

import SwiftUI

struct ContentView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var selectedTab = 0
    
    // Couleurs par page pour les indicateurs
    // ORDRE: Dashboard, Hydratation, Records, Timer, Poids, Résumé, Profil+Dojo, Réglages
    private let tabColors: [Color] = [
        .green,   // 0. Dashboard
        .blue,    // 1. Hydratation
        .yellow,  // 2. Records
        .red,     // 3. Timer
        .orange,  // 4. Poids
        .cyan,    // 5. Résumé Stats
        .purple,  // 6. Profil + Dojo
        .gray     // 7. Réglages
    ]

    var body: some View {
        ZStack(alignment: .top) {
            TabView(selection: $selectedTab) {
                // 0. Dashboard
                DashboardView(selectedTab: $selectedTab)
                    .tag(0)

                // 1. Hydratation
                HydrationView()
                    .tag(1)

                // 2. Records - 3ÈME POSITION
                RecordsView()
                    .tag(2)

                // 3. Timer
                TimerView()
                    .tag(3)

                // 4. Poids (Graphique)
                WeightView()
                    .tag(4)

                // 5. Résumé Stats
                SummaryStatsView()
                    .tag(5)

                // 6. Profil + Dojo combinés (scrollable)
                ProfileDojoView()
                    .tag(6)

                // 7. Réglages
                SettingsView()
                    .tag(7)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // INDICATEUR DE PAGE EN HAUT
            HStack(spacing: 4) {
                ForEach(0..<8) { index in
                    Capsule()
                        .fill(selectedTab == index ? tabColors[index] : Color.white.opacity(0.2))
                        .frame(width: selectedTab == index ? 8 : 3, height: 3)
                        .animation(.spring(), value: selectedTab)
                }
            }
            .padding(.top, 2)
            .zIndex(10)
        }
        .onAppear {
            healthManager.requestAuthorization()
        }
    }
}

#Preview {
    ContentView()
}
