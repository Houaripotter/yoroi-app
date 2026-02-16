// ============================================
// YOROI WATCH - Navigation principale
// Swipe horizontal entre les pages principales
// ============================================

import SwiftUI

struct ContentView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var selectedTab = 0
    @State private var showBetaAlert = true
    @AppStorage("hasSeenBetaAlert") private var hasSeenBetaAlert = false

    // Couleurs par page pour les indicateurs
    // ORDRE: Records, Timer, Dashboard, Hydratation, Poids, Résumé, Profil+Dojo, Réglages
    private let tabColors: [Color] = [
        .yellow,  // 0. Records (PREMIER)
        .red,     // 1. Timer (DEUXIÈME)
        .green,   // 2. Dashboard
        .blue,    // 3. Hydratation
        .orange,  // 4. Poids
        .cyan,    // 5. Résumé Stats
        .purple,  // 6. Profil + Dojo
        .gray     // 7. Réglages
    ]

    var body: some View {
        ZStack(alignment: .top) {
            TabView(selection: $selectedTab) {
                // 0. RECORDS - PREMIÈRE PAGE
                RecordsView()
                    .tag(0)

                // 1. TIMER - DEUXIÈME PAGE
                TimerView()
                    .tag(1)

                // 2. Dashboard
                DashboardView(selectedTab: $selectedTab)
                    .tag(2)

                // 3. Hydratation
                HydrationView()
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
            // Afficher l'alerte beta si pas encore vue
            if !hasSeenBetaAlert {
                showBetaAlert = true
            }
        }
        .alert("⚠️ Version BETA", isPresented: $showBetaAlert) {
            Button("J'ai compris") {
                hasSeenBetaAlert = true
                showBetaAlert = false
            }
        } message: {
            Text("Cette app Apple Watch est en cours de développement.\n\n• Aucune donnée n'est synchronisée avec l'iPhone\n• Les fonctionnalités sont limitées\n• Des bugs peuvent survenir\n\nMerci de ta patience !")
        }
    }
}

#Preview {
    ContentView()
}
