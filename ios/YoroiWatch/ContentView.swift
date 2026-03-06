import SwiftUI

struct ContentView: View {

  @EnvironmentObject var session: WatchSessionManager
  @State private var selectedTab = 0

  var body: some View {
    TabView(selection: $selectedTab) {

      // Tab 0 : Dashboard (Timer, Pas, Profil)
      DashboardPage()
        .tag(0)
        .containerBackground(session.bgColor, for: .tabView)

      // Tab 1 : Poids
      WeightPage()
        .tag(1)
        .containerBackground(session.bgColor, for: .tabView)

      // Tab 2 : Hydratation
      HydrationPage()
        .tag(2)
        .containerBackground(session.bgColor, for: .tabView)

      // Tab 3 : Sommeil
      SleepPage()
        .tag(3)
        .containerBackground(session.bgColor, for: .tabView)

      // Tab 4 : Réglages
      SettingsPage()
        .tag(4)
        .containerBackground(session.bgColor, for: .tabView)

      // Tab 5 : Carnet d'entraînement & Records
      NavigationStack {
        CarnetPage()
      }
      .tag(5)
      .containerBackground(session.bgColor, for: .tabView)
    }
    .tabViewStyle(.page)
    .onAppear {
      session.requestSync()
    }
    // Deep link depuis une complication : navigation automatique vers le bon onglet
    .onChange(of: session.requestedTab) {
      guard session.requestedTab > 0 else { return }
      withAnimation { selectedTab = session.requestedTab }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        session.requestedTab = 0
      }
    }
  }
}
