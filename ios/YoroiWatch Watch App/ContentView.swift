// ============================================
// YOROI WATCH - Navigation principale
// Swipe horizontal entre les pages principales
// ============================================

import SwiftUI

struct ContentView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var selectedTab = 0
    
    // Couleurs par page pour les indicateurs
    private let tabColors: [Color] = [
        .green,   // 0. Dashboard
        .blue,    // 1. Hydratation
        .orange,  // 2. Poids
        .cyan,    // 3. Résumé Stats
        .red,     // 4. Timer
        .yellow,  // 5. Carnet
        .orange,  // 6. Dojo
        .purple,  // 7. Profil
        .gray     // 8. Réglages
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
                
                // 2. Poids (Graphique)
                WeightView()
                    .tag(2)
                
                // 3. Résumé Stats
                SummaryStatsView()
                    .tag(3)

                // 4. Timer
                TimerView()
                    .tag(4)

                // 5. Carnet (Records)
                RecordsView()
                    .tag(5)
                
                // 6. Dojo (Avatar)
                DojoView()
                    .tag(6)

                // 7. Profil (Badges)
                ProfileView()
                    .tag(7)

                // 8. Réglages
                SettingsView()
                    .tag(8)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            
            // INDICATEUR DE PAGE EN HAUT
            HStack(spacing: 4) {
                ForEach(0..<9) { index in
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
