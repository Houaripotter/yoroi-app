# Yoroi Widget - Guide d'installation

## Prérequis
- Xcode 14+
- iOS 14+ (pour WidgetKit)

## Étapes d'installation dans Xcode

### 1. Ajouter le Widget Extension Target

1. Ouvrir `Yoroi.xcworkspace` dans Xcode
2. File > New > Target
3. Choisir "Widget Extension"
4. Nommer: "YoroiWidget"
5. Bundle Identifier: `com.houari.yoroi.widget`
6. **Décocher** "Include Configuration Intent"
7. Cliquer sur "Finish"

### 2. Remplacer les fichiers générés

Supprimer les fichiers générés automatiquement et copier:
- `YoroiWidget.swift`
- `YoroiWidgetBundle.swift`
- `Info.plist`
- `YoroiWidget.entitlements`

### 3. Configurer App Groups

#### Pour la cible principale (Yoroi):
1. Sélectionner le target "Yoroi"
2. Signing & Capabilities
3. Vérifier que "App Groups" contient: `group.com.houari.yoroi`

#### Pour la cible widget (YoroiWidget):
1. Sélectionner le target "YoroiWidget"
2. Signing & Capabilities > + Capability > App Groups
3. Ajouter: `group.com.houari.yoroi`

### 4. Configurer les Build Settings du Widget

1. Sélectionner le target "YoroiWidget"
2. Build Settings:
   - iOS Deployment Target: 14.0
   - Swift Language Version: 5.0

### 5. Vérifier les fichiers natifs

S'assurer que ces fichiers sont présents dans le target "Yoroi":
- `WidgetModule.swift`
- `WidgetModule.m`

### 6. Build et test

1. Sélectionner un appareil iOS 14+
2. Build le projet (Cmd+B)
3. Ajouter le widget sur l'écran d'accueil:
   - Appui long sur l'écran
   - "+" en haut à gauche
   - Rechercher "Yoroi"
   - Choisir la taille Small

## Fonctionnement

Le widget affiche:
- **Dernier poids** enregistré
- **Delta** par rapport au poids précédent (flèche verte = perte, rouge = gain)
- **Date** de la dernière pesée

Les données sont mises à jour automatiquement via App Groups lorsqu'un poids est sauvegardé dans l'app.

## Dépannage

### Le widget affiche "Aucune pesée"
- Vérifier que les App Groups sont correctement configurés
- Enregistrer un nouveau poids dans l'app

### Erreur de build
- Vérifier que WidgetKit est importé
- Vérifier les entitlements des deux targets

### Le widget ne se met pas à jour
- Vérifier que `WidgetCenter.shared.reloadAllTimelines()` est appelé
- Forcer le rafraîchissement en supprimant et re-ajoutant le widget
