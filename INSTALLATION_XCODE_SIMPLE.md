# ⚡ INSTALLATION RAPIDE - DYNAMIC ISLAND & APPLE WATCH

## 🏝️ DYNAMIC ISLAND (5 MINUTES)

### Tous les fichiers existent déjà!
- ✅ `TimerAttributes.swift` (Structure des données)
- ✅ `YoroiLiveActivityManager.swift` (Module natif)
- ✅ `YoroiTimerWidget.swift` (UI Dynamic Island)

### ÉTAPE 1: Ouvrir Xcode
```bash
cd /Users/houari/Desktop/APP_Houari/yoroi_app/ios
open Yoroi.xcworkspace
```

### ÉTAPE 2: Ajouter le Widget Target (SI PAS DÉJÀ FAIT)

**Vérifier d'abord si YoroiTimerWidget existe:**
1. Dans la barre de gauche (Project Navigator), regarde sous "Yoroi"
2. Si tu vois un dossier "YoroiTimerWidget" → **C'EST BON, PASSE À ÉTAPE 3**
3. Si tu ne le vois PAS:

**Créer le Widget Target:**
1. Menu **File → New → Target**
2. Cherche **"Widget Extension"**
3. Clique **Next**
4. Product Name: `YoroiTimerWidget`
5. ❌ DÉCO CHE "Include Configuration Intent"
6. Clique **Finish**
7. Popup "Activate scheme?" → Clique **Cancel**

### ÉTAPE 3: Ajouter les fichiers au Target

**A. Ajouter TimerAttributes.swift:**

1. Dans Project Navigator (gauche), trouve **TimerAttributes.swift** (dans le dossier ios/)
2. Clique dessus
3. Dans le panneau de droite (File Inspector), cherche **"Target Membership"**
4. ✅ Coche **Yoroi**
5. ✅ Coche **YoroiTimerWidget**

**B. Ajouter YoroiLiveActivityManager.swift:**

1. Trouve **YoroiLiveActivityManager.swift** (dans le dossier ios/)
2. Clique dessus
3. Target Membership à droite:
4. ✅ Coche **Yoroi** seulement (PAS le widget)

**C. Vérifier YoroiTimerWidget.swift:**

1. Trouve **YoroiTimerWidget.swift** (dans ios/YoroiTimerWidget/)
2. Target Membership:
3. ✅ Coche **YoroiTimerWidget** seulement

### ÉTAPE 4: Ajouter les Capabilities

**Pour le target Yoroi (app principale):**
1. Clique sur le projet **Yoroi** (icône bleue en haut du Project Navigator)
2. Onglet **Signing & Capabilities**
3. Target: **Yoroi** (en haut)
4. Clique **+ Capability**
5. Cherche **"Push Notifications"** → Ajoute
6. Clique **+ Capability** encore
7. Cherche **"Background Modes"** → Ajoute
8. Dans Background Modes, ✅ coche **"Remote notifications"**

**Pour le target YoroiTimerWidget:**
1. Change le target vers **YoroiTimerWidget** (menu en haut)
2. Vérifie que **Signing** est OK (même Team que l'app)

### ÉTAPE 5: Modifier Info.plist du Widget

1. Dans Project Navigator, trouve **YoroiTimerWidget → Info.plist**
2. Clic droit → **Open As → Source Code**
3. Cherche cette ligne:
```xml
<key>NSExtensionPointIdentifier</key>
<string>com.apple.widgetkit-extension</string>
```
4. JUSTE APRÈS, ajoute:
```xml
<key>NSSupportsLiveActivities</key>
<true/>
```
5. Sauvegarde (Cmd+S)

### ÉTAPE 6: Build et Test

1. Sélectionne le schéma **Yoroi** (en haut à gauche)
2. Device: **Ton iPhone physique** (PAS simulateur)
3. Product → Clean Build Folder (Cmd+Shift+K)
4. Product → Build (Cmd+B)
5. Si ça build sans erreurs: Product → Run (Cmd+R)

### ÉTAPE 7: Tester Dynamic Island

1. Ouvre l'app Yoroi sur ton iPhone
2. Va dans **Timer**
3. Choisis **Musculation** ou **Combat**
4. Configure (ex: 60s)
5. Appuie sur **Start**
6. Appuie sur le bouton Home
7. 🎉 **Dynamic Island devrait afficher le timer!**

---

## ⌚ APPLE WATCH (2 MINUTES)

### L'app existe déjà!

Fichiers dans `/ios/YoroiWatch Watch App/`:
- ✅ YoroiWatchApp.swift (App principale)
- ✅ ContentView.swift (UI principale)
- ✅ DashboardView.swift (Dashboard avec stats)
- ✅ Services/ (HealthManager, WatchConnectivity, etc.)

### ÉTAPE 1: Build sur la Watch

1. Dans Xcode, schéma **Yoroi** (en haut)
2. À côté du schéma, clique sur le device
3. Sélectionne **"Ton Apple Watch"** (elle doit être appairée et au poignet)
4. Product → Run (Cmd+R)
5. L'app s'installe automatiquement sur la Watch

### ÉTAPE 2: Tester la Synchronisation

1. Lance Yoroi sur **iPhone**
2. Lance Yoroi sur **Apple Watch**
3. Sur iPhone: Ajoute une pesée
4. Sur Watch: Attends 2-3 secondes → Le poids devrait se mettre à jour
5. Sur iPhone: Ajoute une séance d'entraînement
6. Sur Watch: Le compteur "Séances cette semaine" devrait augmenter

### ÉTAPE 3: Debug si ça ne sync pas

Si la sync ne marche pas:
1. Vérifie que les deux apps sont **ouvertes** (foreground)
2. Dans Xcode console, cherche "Watch Connectivity"
3. Sur la Watch: Réglages → Yoroi → Vérifier les permissions

---

## 🐛 TROUBLESHOOTING

### Erreur: "Target integrity"
→ Supprime les fichiers Swift du widget et ré-ajoute-les avec "Copy items if needed"

### Erreur: "Provisioning profile"
1. Va sur **developer.apple.com**
2. Certificates, Identifiers & Profiles
3. Identifiers → + (Nouveau)
4. Bundle ID: `ton.bundle.id.YoroiTimerWidget`
5. Capabilities: Push Notifications
6. Register
7. Profiles → + (Nouveau)
8. Development → Sélectionne YoroiTimerWidget
9. Download et double-clique

### Dynamic Island ne s'affiche pas
→ Vérifie:
- iPhone 14 Pro ou plus récent
- iOS 16.1 minimum
- App en foreground quand tu lances le timer

### Apple Watch ne build pas
→ Vérifie:
- Watch appairée avec l'iPhone
- Watch déverrouillée
- watchOS 9.0 minimum

---

## ✅ CHECKLIST FINALE

Avant de dire que c'est fini:

- [ ] Build Yoroi réussit sans erreurs
- [ ] App se lance sur iPhone
- [ ] Timer fonctionne (compte à rebours)
- [ ] Dynamic Island s'affiche quand timer actif (iPhone 14 Pro+)
- [ ] Apple Watch build réussit
- [ ] App Watch s'affiche
- [ ] Sync iPhone ↔ Watch fonctionne

---

**TU ES PRÊT!** 🚀

Si tu as des erreurs, regarde les logs Xcode et cherche le message d'erreur exact.
