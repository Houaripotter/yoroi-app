// ============================================
// YOROI WATCH - Navigation principale
// Swipe horizontal entre les pages principales
// ============================================

import SwiftUI

struct ContentView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var selectedTab = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                // 1. Dashboard (Vue d'ensemble + Poids)
                DashboardView()
                    .tag(0)

                // 2. Timer (Repos / Combat / Tabata)
                TimerView()
                    .tag(1)

                // 3. Carnet d'entraînement (Records et ajouts)
                RecordsView()
                    .tag(2)

                // 4. Poids de corps
                WeightView()
                    .tag(3)

                // 5. Séance en direct (Workout)
                WorkoutView()
                    .tag(4)

                // 6. Hydratation
                HydrationView()
                    .tag(5)

                // 7. Réglages
                SettingsView()
                    .tag(6)
            }
            .tabViewStyle(.page(indexDisplayMode: .never)) // Cacher l'index par défaut
            
            // INDICATEUR DE PAGE CUSTOM (En bas)
            HStack(spacing: 4) {
                ForEach(0..<7) { index in
                    Circle()
                        .fill(selectedTab == index ? Color.accentColor : Color.gray.opacity(0.3))
                        .frame(width: 4, height: 4)
                }
            }
            .padding(.bottom, 2)
        }
        .onAppear {
            healthManager.requestAuthorization()
        }
    }
}

#Preview {
    ContentView()
}
