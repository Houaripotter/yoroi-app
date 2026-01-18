// ============================================
// YOROI WATCH - Vue principale avec onglets
// ============================================

import SwiftUI

struct ContentView: View {
    @StateObject private var healthKit = HealthKitService.shared
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Onglet 1: Dashboard (Poids + Série)
            DashboardView()
                .tag(0)

            // Onglet 2: Hydratation
            HydrationView()
                .tag(1)

            // Onglet 3: Sommeil
            SleepView()
                .tag(2)

            // Onglet 4: Charge d'entraînement
            TrainingLoadView()
                .tag(3)

            // Onglet 5: Timer d'entraînement
            TimerView()
                .tag(4)

            // Onglet 6: Records / Carnet
            RecordsView()
                .tag(5)

            // Onglet 7: Stats rapides
            QuickStatsView()
                .tag(6)
        }
        .tabViewStyle(.verticalPage)
        .onAppear {
            healthKit.requestAuthorization()
        }
    }
}

#Preview {
    ContentView()
}
