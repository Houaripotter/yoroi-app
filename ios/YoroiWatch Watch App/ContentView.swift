// ============================================
// YOROI WATCH - Navigation principale
// Swipe horizontal entre les pages principales
// ============================================

import SwiftUI

struct ContentView: View {
    @StateObject private var healthManager = HealthManager.shared
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Page 1: Dashboard (stats santé)
            DashboardView()
                .tag(0)

            // Page 2: Timer de repos
            TimerView()
                .tag(1)

            // Page 3: Hydratation
            HydrationView()
                .tag(2)

            // Page 4: Poids
            WeightView()
                .tag(3)

            // Page 5: Entraînements
            WorkoutView()
                .tag(4)

            // Page 6: Records
            RecordsView()
                .tag(5)

            // Page 7: Historique
            HistoryView()
                .tag(6)
        }
        .tabViewStyle(.carousel)
        .onAppear {
            healthManager.requestAuthorization()
        }
    }
}

#Preview {
    ContentView()
}
