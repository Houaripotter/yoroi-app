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

      // Tab 4 : Séances récentes
      WorkoutPage()
        .tag(4)
        .containerBackground(session.bgColor, for: .tabView)

      // Tab 5 : Carnet d'entraînement & Records
      NavigationStack {
        CarnetPage()
      }
      .tag(5)
      .containerBackground(session.bgColor, for: .tabView)

      // Tab 6 : Sparring (rounds semaine, winrate, V/D)
      // TEMPORAIREMENT COMMENTE · SparringPage.swift a ajouter manuellement
      // via Xcode dans le target YoroiWatch pour reactiver ce tab.
      // NavigationStack {
      //   SparringPage()
      // }
      // .tag(6)
      // .containerBackground(session.bgColor, for: .tabView)

      // Tab 7 : Compétition (rang, corps, PRs)
      CompetitionPage()
        .tag(7)
        .containerBackground(session.bgColor, for: .tabView)

      // Tab 8 : Réglages
      SettingsPage()
        .tag(8)
        .containerBackground(session.bgColor, for: .tabView)
    }
    .tabViewStyle(.page)
    .onAppear {
      session.requestSync()
    }
    // Deep link depuis une complication : navigation automatique vers le bon onglet
    .onChange(of: session.requestedTab) {
      guard session.requestedTab >= 0 else { return }
      withAnimation { selectedTab = session.requestedTab }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        session.requestedTab = -1
      }
    }
  }
}
