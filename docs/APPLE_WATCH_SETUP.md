# 🎯 Configuration Apple Watch App YOROI

Guide complet pour configurer et compiler l'app Apple Watch.

---

## 📋 PRÉ-REQUIS

- ✅ Xcode 15+ installé
- ✅ Apple Watch (Series 4+) avec watchOS 9+
- ✅ iPhone couplé avec l'Apple Watch
- ✅ Compte développeur Apple (gratuit ou payant)

---

## 🚀 ÉTAPES DE CONFIGURATION

### 1. Ouvrir le projet dans Xcode

```bash
cd ios
open Yoroi.xcworkspace
```

⚠️ **IMPORTANT** : Ouvre bien le `.xcworkspace` et PAS le `.xcodeproj` !

---

### 2. Créer le Target watchOS

1. Dans Xcode, clique sur **File > New > Target**
2. Sélectionne **watchOS > App**
3. Configure :
   - **Product Name**: `YoroiWatch`
   - **Organization**: Ton nom/entreprise
   - **Bundle Identifier**: `com.yoroi.app.watch` (ou ton bundle ID + `.watch`)
   - **Interface**: SwiftUI
   - **Language**: Swift
   - **Include Notification Scene**: ❌ Décoche (pas besoin)

4. Clique sur **Finish**

---

### 3. Supprimer les fichiers générés par défaut

Xcode va créer un dossier `YoroiWatch` avec des fichiers par défaut. **Supprime-les tous** :
- `YoroiWatchApp.swift` (on a déjà le nôtre)
- `ContentView.swift` (on a déjà le nôtre)
- `Assets.xcassets` (garde juste celui-là vide)

---

### 4. Ajouter nos fichiers au Target

1. Dans le **Project Navigator** (à gauche), sélectionne le dossier `YoroiWatch` que j'ai créé
2. Glisse-dépose ce dossier dans Xcode
3. **IMPORTANT** : Coche **"Add to targets"** et sélectionne `YoroiWatch`

Ou bien :
1. Clique droit sur le target `YoroiWatch` dans Xcode
2. **Add Files to "YoroiWatch"**
3. Navigue vers `ios/YoroiWatch` et sélectionne tous les fichiers
4. Coche **"Copy items if needed"**
5. Coche **"Create groups"**
6. Target membership : `YoroiWatch` ✅

---

### 5. Configurer les Capabilities

#### Pour le target `YoroiWatch` :

1. Sélectionne le target `YoroiWatch` dans le Project Navigator
2. Onglet **Signing & Capabilities**
3. Ajoute les capabilities suivantes (bouton **+ Capability**) :
   - ✅ **HealthKit**
   - ✅ **Background Modes** (coche "Background fetch" et "Remote notifications")

#### Pour le target principal `Yoroi` (iPhone) :

1. Sélectionne le target `Yoroi`
2. Onglet **Signing & Capabilities**
3. Ajoute :
   - ✅ **WatchConnectivity** (devrait déjà être là)

---

### 6. Configurer les Entitlements

#### YoroiWatch.entitlements

Créer le fichier `ios/YoroiWatch.entitlements` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.healthkit</key>
	<true/>
	<key>com.apple.developer.healthkit.access</key>
	<array>
		<string>health-records</string>
	</array>
</dict>
</plist>
```

Puis dans Xcode :
1. Target `YoroiWatch` > **Build Settings**
2. Cherche "Code Signing Entitlements"
3. Mets : `YoroiWatch.entitlements`

---

### 7. Configurer Info.plist

Le fichier `ios/YoroiWatch/Info.plist` est déjà créé. Vérifie juste qu'il contient :
- `NSHealthShareUsageDescription` ✅
- `NSHealthUpdateUsageDescription` ✅
- `WKApplication = true` ✅
- `WKWatchOnly = true` ✅

---

### 8. Compiler et tester

#### Compiler l'app watch :

1. Dans Xcode, sélectionne le scheme **YoroiWatch**
2. Sélectionne ta vraie Apple Watch (ou simulateur si tu testes)
3. Clique sur **Run** (⌘R)

#### Si tu as une vraie Apple Watch :
- L'app va s'installer automatiquement
- Tu la trouveras dans le dock ou la liste d'apps

#### En simulateur :
- Tu peux tester sans vraie montre
- Mais pas d'accès à HealthKit réel (données simulées)

---

## 🔗 COMMUNICATION IPHONE ↔ WATCH

### Côté iPhone (React Native)

Je vais créer un module natif `WatchBridge.swift` qui :
- Envoie les données (hydratation, poids, sommeil, etc.) à la watch
- Reçoit les actions de la watch (ajout hydratation, pesée)
- Synchronise automatiquement

### Côté Watch (SwiftUI)

Déjà fait ! Les managers sont prêts :
- ✅ `WatchConnectivityManager` : Communication
- ✅ `HealthKitManager` : Lecture HealthKit

---

## 📱 STRUCTURE DES PAGES

### Page 1 - Dashboard
- Hydratation, Poids, Sommeil, Pas, FC

### Page 2 - Hydratation
- Boutons +250ml, +500ml, +1L
- Progress bar interactive

### Page 3 - Poids rapide
- Digital Crown pour ajuster
- Boutons +/- 0.5kg
- Enregistrer

### Page 4 - Sommeil
- Durée + qualité (étoiles)
- Heures coucher/réveil

### Page 5 - Activité
- Pas (HealthKit temps réel)
- FC actuelle, repos, max

---

## 🔍 TROUBLESHOOTING

### Erreur "No such module 'WatchConnectivity'"
➡️ Le target watchOS n'est pas configuré. Suis les étapes ci-dessus.

### L'app ne s'installe pas sur la watch
➡️ Vérifie que :
- L'iPhone et la watch sont couplés
- La watch est déverrouillée
- Le bundle ID est correct

### HealthKit ne marche pas
➡️ Vérifie :
- Les entitlements sont bien configurés
- Info.plist contient les descriptions d'usage
- Tu as autorisé HealthKit dans les réglages de la watch

### La communication iPhone ↔ Watch ne marche pas
➡️ Vérifie :
- WatchConnectivity est activé des 2 côtés
- L'iPhone et la watch sont à proximité
- Les 2 apps sont lancées

---

## 📦 PROCHAINES ÉTAPES

1. ✅ Configuration Xcode (ce guide)
2. ⏳ Créer le bridge React Native (iPhone)
3. ⏳ Tester la synchronisation complète
4. ⏳ Ajouter les complications (widgets cadran)
5. ⏳ Publier sur l'App Store

---

## 💡 ASTUCES

### Tester rapidement
- Utilise le simulateur watchOS pour développer vite
- Test sur vraie montre pour HealthKit et notifications

### Debug
- Console Xcode affiche les logs des 2 côtés (iPhone + Watch)
- Filtre par "📩" ou "✅" pour voir les messages de sync

### Performance
- La watch a peu de batterie et mémoire
- Évite les animations lourdes
- Refresh seulement quand nécessaire

---

**🎉 Bravo ! L'app Apple Watch YOROI est prête à être configurée !**

Si tu as des questions ou erreurs, regarde la section Troubleshooting ci-dessus.
