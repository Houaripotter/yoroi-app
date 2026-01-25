# 📦 AJOUTER LES NOUVEAUX FICHIERS À XCODE

## Fichiers à ajouter au target YoroiWatch Watch App

### 1. WatchNotificationManager.swift
**Chemin:** `ios/YoroiWatch Watch App/Services/WatchNotificationManager.swift`
**Groupe:** Services

### 2. TimerComplication.swift
**Chemin:** `ios/YoroiWatch Watch App/Complications/TimerComplication.swift`
**Groupe:** Complications (à créer)

### 3. RecordsComplication.swift
**Chemin:** `ios/YoroiWatch Watch App/Complications/RecordsComplication.swift`
**Groupe:** Complications

### 4. YoroiComplicationsBundle.swift
**Chemin:** `ios/YoroiWatch Watch App/Complications/YoroiComplicationsBundle.swift`
**Groupe:** Complications

### 5. ComplicationUpdateManager.swift
**Chemin:** `ios/YoroiWatch Watch App/Services/ComplicationUpdateManager.swift`
**Groupe:** Services

---

## 📝 INSTRUCTIONS RAPIDES

### Méthode 1: Drag & Drop dans Xcode (RECOMMANDÉE)

1. Ouvre `Yoroi.xcworkspace` dans Xcode
2. Dans le navigateur de fichiers (gauche), trouve "YoroiWatch Watch App"
3. Drag & drop les fichiers depuis le Finder:
   - `WatchNotificationManager.swift` → dans le dossier "Services"
   - `ComplicationUpdateManager.swift` → dans le dossier "Services"
   - `TimerComplication.swift` → créer dossier "Complications"
   - `RecordsComplication.swift` → dans le dossier "Complications"
   - `YoroiComplicationsBundle.swift` → dans le dossier "Complications"

4. **IMPORTANT:** Quand la popup apparaît:
   - ✅ Coche "Copy items if needed"
   - ✅ Coche "Create groups"
   - ✅ Sélectionne target "YoroiWatch Watch App"
   - Clique "Finish"

### Méthode 2: Add Files manuellement

1. Right-click sur "YoroiWatch Watch App" dans Xcode
2. "Add Files to Yoroi"
3. Navigue vers chaque fichier
4. Coche "Copy items if needed"
5. Sélectionne target "YoroiWatch Watch App"
6. Clique "Add"

---

## ⚠️ VÉRIFICATIONS IMPORTANTES

Après avoir ajouté les fichiers:

### 1. Vérifier que les fichiers sont dans le target

1. Clique sur le fichier dans Xcode
2. Ouvre l'inspecteur de fichiers (panneau droit)
3. Vérifie que "Target Membership" contient "YoroiWatch Watch App" ✅

### 2. Vérifier Build Phases

1. Sélectionne target "YoroiWatch Watch App"
2. Onglet "Build Phases"
3. Ouvre "Compile Sources"
4. Les 5 fichiers .swift DOIVENT apparaître dans la liste

### 3. Créer le dossier Complications

Si le dossier "Complications" n'existe pas:
1. Right-click sur "YoroiWatch Watch App"
2. "New Group"
3. Nomme "Complications"
4. Drag & drop les 3 fichiers de complications dedans

---

## 🛠️ BUILD ET TEST

### 1. Clean Build Folder

```
Product → Clean Build Folder (Cmd+Shift+K)
```

### 2. Build

```
Product → Build (Cmd+B)
```

### 3. Si erreurs de compilation

Les erreurs suivantes sont NORMALES jusqu'à ce que tout soit ajouté:
- `Cannot find 'TimerComplication' in scope`
- `Cannot find 'RecordsComplication' in scope`
- `'main' attribute cannot be used in a module that contains top-level code`

Une fois TOUS les fichiers ajoutés, ces erreurs disparaissent.

---

## 🎯 TESTER LES COMPLICATIONS

### Ajouter une complication au cadran:

1. Sur ta Watch, long press sur le cadran
2. "Modifier"
3. Swipe pour sélectionner un slot de complication
4. Cherche "Yoroi Timer" ou "Yoroi Records"
5. Sélectionne

### Mettre à jour les complications:

Les complications se mettent à jour automatiquement quand:
- Le timer démarre/arrête
- Un nouveau record est enregistré
- Données synchronisées depuis l'iPhone

---

## 📞 SI ÇA NE MARCHE PAS

Copie-moi:
1. Les erreurs de build exactes
2. Screenshot de "Target Membership" pour un des fichiers
3. Screenshot de "Compile Sources" dans Build Phases

Je corrigerai le problème précis! 💪
