# 🏝️ SETUP DYNAMIC ISLAND (Live Activities)

Ce guide explique comment activer le Dynamic Island pour le Timer dans Yoroi.

## ⚠️ PRÉREQUIS

- **iOS 16.1+** minimum
- **iPhone 14 Pro ou iPhone 15 Pro** (Dynamic Island)
- **Xcode 14.1+**
- **macOS Ventura 13.0+**

---

## 📋 ÉTAPE 1: Ajouter le Native Module

### 1.1. Ouvrir le projet dans Xcode

```bash
cd ios
open Yoroi.xcworkspace
```

### 1.2. Ajouter les fichiers Swift

1. Dans Xcode, clic droit sur le dossier **"Yoroi"** (icône bleue)
2. Sélectionner **"Add Files to Yoroi..."**
3. Naviguer vers `/ios` et sélectionner ces 2 fichiers:
   - `YoroiLiveActivityManager.swift`
   - `YoroiLiveActivityManager.m`
4. ✅ Cocher **"Copy items if needed"**
5. ✅ Cocher **"Yoroi"** dans "Add to targets"
6. Cliquer **"Add"**

### 1.3. Créer le Bridging Header (si demandé)

Si Xcode demande de créer un "Bridging Header", cliquer **"Create Bridging Header"**.

---

## 📋 ÉTAPE 2: Créer le Widget Extension Target

### 2.1. Ajouter un nouveau Target

1. Dans Xcode, menu **File → New → Target...**
2. Choisir **"Widget Extension"**
3. Cliquer **"Next"**

### 2.2. Configurer le Widget

| Champ | Valeur |
|-------|--------|
| **Product Name** | `YoroiTimerWidget` |
| **Bundle Identifier** | `com.yoroi.app.YoroiTimerWidget` |
| **Language** | Swift |
| **Include Configuration Intent** | ❌ Décocher |

4. Cliquer **"Finish"**
5. Si demandé, cliquer **"Activate"** pour activer le scheme

### 2.3. Supprimer le fichier généré automatiquement

1. Supprimer le fichier `YoroiTimerWidget.swift` généré automatiquement
2. ⚠️ **IMPORTANT:** Choisir **"Move to Trash"** (pas juste "Remove Reference")

---

## 📋 ÉTAPE 3: Ajouter le fichier Widget

### 3.1. Copier le fichier Widget

1. Clic droit sur le dossier **"YoroiTimerWidget"** (créé à l'étape 2)
2. Sélectionner **"Add Files to YoroiTimerWidget..."**
3. Naviguer vers `/ios/YoroiTimerWidget/`
4. Sélectionner **`YoroiTimerWidget.swift`**
5. ✅ Cocher **"Copy items if needed"**
6. ✅ Cocher **"YoroiTimerWidget"** dans "Add to targets"
7. Cliquer **"Add"**

---

## 📋 ÉTAPE 4: Configurer Info.plist

### 4.1. Ajouter NSSupportsLiveActivities

1. Dans Xcode, sélectionner le fichier **`Info.plist`** de l'app principale (dans le dossier Yoroi)
2. Clic droit → **"Open As" → "Source Code"**
3. Ajouter cette ligne AVANT `</dict>`:

```xml
<key>NSSupportsLiveActivities</key>
<true/>
```

### 4.2. Résultat attendu

Le Info.plist devrait ressembler à ça:

```xml
<dict>
  <!-- ... autres clés ... -->
  <key>NSSupportsLiveActivities</key>
  <true/>
</dict>
```

---

## 📋 ÉTAPE 5: Configurer les Capabilities

### 5.1. Target principal (Yoroi)

1. Sélectionner le projet **"Yoroi"** (icône bleue en haut)
2. Sélectionner le target **"Yoroi"**
3. Onglet **"Signing & Capabilities"**
4. Cliquer **"+ Capability"**
5. Chercher et ajouter **"Push Notifications"** (si pas déjà présent)

### 5.2. Target Widget (YoroiTimerWidget)

1. Sélectionner le target **"YoroiTimerWidget"**
2. Onglet **"Signing & Capabilities"**
3. ✅ Vérifier que **"App Groups"** est présent
4. Cliquer **"+"** et ajouter un App Group:
   - Format: `group.com.yoroi.app`
5. ⚠️ **IMPORTANT:** Ajouter le MÊME App Group au target principal "Yoroi"

---

## 📋 ÉTAPE 6: Build & Run

### 6.1. Sélectionner le scheme

1. Dans la barre d'outils Xcode, sélectionner **"Yoroi"** (pas YoroiTimerWidget)
2. Sélectionner votre iPhone physique (pas le simulateur)

### 6.2. Build

```bash
# Nettoyer
Product → Clean Build Folder (Cmd+Shift+K)

# Build
Product → Build (Cmd+B)
```

### 6.3. Installer

```bash
# Installer sur iPhone
Product → Run (Cmd+R)
```

---

## 📋 ÉTAPE 7: Tester

### 7.1. Lancer un timer

1. Ouvrir Yoroi
2. Aller dans **Timer**
3. Configurer un timer (Combat, Musculation, etc.)
4. Appuyer sur **START**

### 7.2. Vérifier le Dynamic Island

Sur **iPhone 14 Pro / 15 Pro**, tu devrais voir:
- ✅ Icône du mode + temps restant dans le Dynamic Island
- ✅ Appuyer dessus affiche la vue étendue avec barre de progression
- ✅ Sur le Lock Screen, affichage du timer

---

## 🐛 TROUBLESHOOTING

### Erreur: "No such module 'React'"

**Solution:**
1. Dans Xcode, sélectionner le target **"Yoroi"**
2. Onglet **"Build Settings"**
3. Chercher **"Swift Compiler - Search Paths"**
4. Ajouter dans **"Import Paths"**:
   ```
   $(SRCROOT)/../node_modules/react-native/React
   ```

### Erreur: "Live Activity not showing"

**Vérifications:**
1. ✅ iPhone 14 Pro ou 15 Pro (Dynamic Island requis)
2. ✅ iOS 16.1+ minimum
3. ✅ `NSSupportsLiveActivities` dans Info.plist
4. ✅ App Groups configurés identiquement sur les 2 targets
5. ✅ Widget Extension installé sur l'iPhone

### Erreur: "Activity.request failed"

**Solution:**
1. Vérifier que le Widget Extension est bien installé:
   ```bash
   # Dans Xcode
   Product → Scheme → YoroiTimerWidget
   Product → Run
   ```
2. Après installation du Widget, relancer l'app principale

---

## 📚 RESSOURCES

- [Apple Documentation - Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [WWDC 2022 - Meet ActivityKit](https://developer.apple.com/videos/play/wwdc2022/10170/)
- [Dynamic Island Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/live-activities)

---

## ✅ CHECKLIST FINALE

- [ ] YoroiLiveActivityManager.swift ajouté au target Yoroi
- [ ] YoroiLiveActivityManager.m ajouté au target Yoroi
- [ ] Widget Extension "YoroiTimerWidget" créé
- [ ] YoroiTimerWidget.swift ajouté au target YoroiTimerWidget
- [ ] NSSupportsLiveActivities dans Info.plist
- [ ] App Groups configurés sur les 2 targets
- [ ] Build réussi sans erreur
- [ ] Testé sur iPhone 14 Pro ou 15 Pro avec iOS 16.1+

---

## 🎯 RÉSULTAT ATTENDU

Quand tu lances un timer, tu verras:

**Dynamic Island (iPhone fermé):**
```
┌─────────────────────┐
│ 🥊  12:45           │ ← Vue compacte
└─────────────────────┘
```

**Dynamic Island (appui long):**
```
┌─────────────────────────────┐
│ 🥊 Combat Timer   Round 2/5 │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░       │
│       12:45     [TRAVAIL]   │
└─────────────────────────────┘
```

**Lock Screen:**
```
┌─────────────────────┐
│ 🥊 Combat Timer     │
│ 12:45        2/5    │
└─────────────────────┘
```

🎉 **C'est terminé!** Le Dynamic Island devrait fonctionner maintenant.
