import SwiftUI

struct ContentView: View {

  @EnvironmentObject var session: WatchSessionManager
  @State private var selectedTab = 0

  var body: some View {
    TabView(selection: $selectedTab) {
      // Page 1: Dashboard (Timer, Pas, Carnet, Profil)
      DashboardPage()
        .tag(0)

      // Page 2: Poids (tout en scroll vertical)
      WeightPage()
        .tag(1)

      // Page 3: Hydratation (tout en scroll vertical)
      HydrationPage()
        .tag(2)

      // Page 4: Sommeil (tout en scroll vertical)
      SleepPage()
        .tag(3)

      // Page 5: Reglages
      SettingsPage()
        .tag(4)
    }
    .tabViewStyle(.page)
    .onAppear {
      session.requestSync()
    }
  }
}
