// ============================================
// YOROI WATCH - Vue principale
// Navigation entre toutes les vues
// ============================================

import SwiftUI

struct ContentView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // 1. Dashboard (Poids, BPM, SpO2, PAS, SOMMEIL)
            DashboardView()
                .tag(0)

            // 2. Types d'activité
            ActivityTypeView()
                .tag(1)

            // 3. Timer de repos
            TimerView()
                .tag(2)

            // 4. Hydratation
            HydrationView()
                .tag(3)

            // 5. Poids
            WeightView()
                .tag(4)

            // 6. Carnet / Records
            RecordsView()
                .tag(5)

            // 7. Historique
            HistoryView()
                .tag(6)
        }
        .tabViewStyle(.verticalPage)
        .onAppear {
            healthManager.requestAuthorization()
        }
    }
}

#Preview {
    ContentView()
}
