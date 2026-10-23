import SwiftUI

// Pages verticales (Digital Crown) dans une NavigationStack.
// La seance en direct (chrono ou seance libre) passe en plein ecran par-dessus.
// La fin d'un minuteur s'affiche en calque par-dessus tout (pas de presentation modale :
// elle se battait avec le retour en arriere de l'ecran du minuteur et bloquait Arreter).

struct RacineVue: View {
  @State private var routeur = Routeur.shared
  @State private var synchro = Synchro.shared
  @State private var minuteurs = MinuteurMoteur.shared
  @Environment(\.scenePhase) private var phaseScene
  /// Au lancement, l'interface reste noire un quart de seconde : le temps de recevoir le lien
  /// d'une complication et d'ouvrir directement son ecran, sans montrer l'Accueil avant.
  @State private var pret = false

  private var sonnerieVisible: Bool { minuteurs.sonnerie != nil && routeur.live == nil }

  var body: some View {
    NavigationStack(path: $routeur.chemin) {
      TabView(selection: $routeur.page) {
        AujourdhuiVue()
          .tag(Page.aujourdhui)
          .containerBackground(Teinte.fond, for: .tabView)
        EntrainementVue()
          .tag(Page.entrainement)
          .containerBackground(Teinte.fond, for: .tabView)
        SemaineVue()
          .tag(Page.semaine)
          .containerBackground(Teinte.fond, for: .tabView)
        EauVue()
          .tag(Page.eau)
          .containerBackground(Teinte.fond, for: .tabView)
        CardioVue()
          .tag(Page.cardio)
          .containerBackground(Teinte.fond, for: .tabView)
        if synchro.contexte.combat != nil {
          CombatVue()
            .tag(Page.combat)
            .containerBackground(Teinte.fond, for: .tabView)
        }
        ReglagesVue()
          .tag(Page.reglages)
          .containerBackground(Teinte.fond, for: .tabView)
      }
      .tabViewStyle(.verticalPage)
      .navigationDestination(for: Ecran.self) { ecran in
        switch ecran {
        case .peser: PeserVue()
        case .chronos: ChronoListeVue()
        case .chronoPrepa(let p): ChronoPrepaVue(preset: p)
        case .seanceLibre: SeanceLibreChoixVue()
        case .noter: NoterSeanceVue()
        case .minuteurs: MinuteursVue()
        case .minuteur(let id): MinuteurVue(id: id)
        case .minuteurLibre: MinuteurLibreVue()
        case .coeur: CoeurVue()
        case .oxygene: OxygeneVue()
        }
      }
    }
    .id(routeur.generation)
    .opacity(pret ? 1 : 0)
    .disabled(sonnerieVisible)
    .overlay {
      if sonnerieVisible {
        AlarmeMinuteurVue()
          .transition(.opacity)
      }
    }
    .animation(.easeOut(duration: 0.2), value: sonnerieVisible)
    .tint(Teinte.accent)
    .foregroundStyle(Teinte.texte)
    .fullScreenCover(isPresented: Binding(
      get: { routeur.live != nil },
      set: { if !$0 { routeur.live = nil } }
    )) {
      LiveVue()
    }
    .onOpenURL { url in
      routeur.recevoir(url: url)
      pret = true
    }
    .liensComplications(routeur)
    .onChange(of: minuteurs.etat.actifs.map(\.id)) { _, ids in
      routeur.retirerMinuteurs(sauf: ids)
    }
    .onChange(of: phaseScene) { _, nouvelle in
      if nouvelle == .active {
        synchro.rafraichir()
        ChronoMoteur.shared.resynchroniser()
        MinuteurMoteur.shared.entrerPremierPlan()
        Task { await SanteCardio.shared.actualiser() }
      } else {
        MinuteurMoteur.shared.quitterPremierPlan()
      }
    }
    .task {
      try? await Task.sleep(nanoseconds: 250_000_000)
      pret = true
    }
    .task { await SanteCardio.shared.preparer() }
    .onChange(of: synchro.contexte.combat == nil) { _, sansCombat in
      if sansCombat && routeur.page == .combat { routeur.page = .aujourdhui }
    }
  }
}

private extension View {
  /// Toucher une complication sans lien (ou si watchOS passe par une activite) :
  /// l'activite porte le nom du widget, on l'envoie vers le meme ecran que son lien.
  func liensComplications(_ routeur: Routeur) -> some View {
    self
      .onContinueUserActivity(GenreWidget.minuteurs) { _ in routeur.recevoir(lien: "minuteurs") }
      .onContinueUserActivity(GenreWidget.coeur) { _ in routeur.recevoir(lien: "coeur") }
      .onContinueUserActivity(GenreWidget.oxygene) { _ in routeur.recevoir(lien: "oxygene") }
      .onContinueUserActivity(GenreWidget.cardio) { _ in routeur.recevoir(lien: "cardio") }
      .onContinueUserActivity(GenreWidget.repos) { _ in routeur.recevoir(lien: "repos") }
      .onContinueUserActivity(GenreWidget.respiration) { _ in routeur.recevoir(lien: "respiration") }
      .onContinueUserActivity(GenreWidget.poids) { _ in routeur.recevoir(lien: "aujourdhui") }
      .onContinueUserActivity(GenreWidget.semaine) { _ in routeur.recevoir(lien: "semaine") }
      .onContinueUserActivity(GenreWidget.eau) { _ in routeur.recevoir(lien: "eau") }
      .onContinueUserActivity(GenreWidget.chrono) { _ in routeur.recevoir(lien: "chrono") }
      .onContinueUserActivity(GenreWidget.combat) { _ in routeur.recevoir(lien: "combat") }
  }
}

/// Plein ecran de la seance en direct, puis du bilan.
struct LiveVue: View {
  @State private var routeur = Routeur.shared
  @State private var seance = Seance.shared

  var body: some View {
    Group {
      switch routeur.live {
      case .chrono(let p):
        if seance.etat == .terminee {
          BilanVue(source: .chrono, sportPropose: sportPropose(pour: p.nom))
        } else {
          ChronoVue(preset: p)
        }
      case .libre(let sport):
        if seance.etat == .terminee {
          BilanVue(source: .libre, sportPropose: sport)
        } else {
          SeanceLibreVue(sport: sport)
        }
      case .none:
        EmptyView()
      }
    }
    .background(Teinte.fond.ignoresSafeArea())
    .toolbar(.hidden, for: .navigationBar)
  }

  /// Sport de l'utilisateur dont le nom ressemble au chrono choisi.
  private func sportPropose(pour nom: String) -> SportCtx? {
    let sports = Synchro.shared.sports
    let n = nom.lowercased()
    return sports.first { $0.nom.lowercased() == n }
      ?? sports.first { n.contains($0.nom.lowercased()) || $0.nom.lowercased().contains(n) }
      ?? (sports.count == 1 ? sports.first : nil)
  }
}
