# YOROI Watch App

Application Apple Watch pour Yoroi - Suivi du poids & sport.

## Structure

```
watchos/
└── YoroiWatch/
    └── YoroiWatch/
        ├── YoroiWatchApp.swift    # Point d'entrée
        ├── ContentView.swift       # Vue principale avec tabs
        ├── Info.plist              # Configuration
        ├── Views/
        │   ├── DashboardView.swift   # Dashboard avec poids/série
        │   ├── TimerView.swift       # Timer d'entraînement
        │   └── QuickStatsView.swift  # Stats rapides
        ├── Models/
        │   └── WorkoutData.swift     # Modèles de données
        ├── Services/
        │   └── WatchConnectivityService.swift  # Sync avec iPhone
        └── Assets.xcassets/          # Images et icônes
```

## Fonctionnalités

1. **Dashboard** - Affiche le poids actuel, la série et si entraîné aujourd'hui
2. **Timer** - Chronomètre pour les séances avec bouton start/pause/stop
3. **Stats** - Stats rapides de la semaine et du mois

## Comment créer le projet Xcode

1. Ouvrir Xcode
2. File > New > Project
3. Choisir "watchOS" > "App"
4. Nom: YoroiWatch
5. Bundle Identifier: com.yoroi.watchapp
6. Cocher "Include Notification Scene" si besoin
7. Copier les fichiers Swift dans le projet
8. Configurer le Companion App Bundle ID: com.yoroi.app

## Synchronisation avec l'iPhone

Le `WatchConnectivityService` gère la communication entre la montre et l'iPhone via WatchConnectivity:
- Envoi des séances à l'iPhone
- Réception des stats (poids, série, etc.)
