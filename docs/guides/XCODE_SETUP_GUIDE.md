# 🚀 Guide de configuration Xcode - Dynamic Island

## ✅ Fichiers créés et prêts

Les 4 fichiers Swift sont prêts dans ton projet :

### Widget Extension (YoroiWidget)
- ✅ `ios/YoroiWidget/YoroiWidgetLiveActivity.swift` - UI Dynamic Island
- ✅ `ios/YoroiWidget/YoroiWidgetBundle.swift` - Point d'entrée

### App principale (Yoroi)
- ✅ `ios/Yoroi/YoroiLiveActivityManager.swift` - Module natif Swift
- ✅ `ios/Yoroi/YoroiLiveActivityManager.m` - Bridge Objective-C

---

## 📋 Étapes dans Xcode (5 minutes)

### 1. Ouvrir le projet

```bash
cd ios
open Yoroi.xcworkspace
```

### 2. Ajouter les fichiers Swift au projet

**Pour YoroiLiveActivityManager** :

1. Dans Xcode, fais **clic droit** sur le dossier `Yoroi` dans le navigateur
2. Sélectionne **"Add Files to Yoroi..."**
3. Navigue vers `ios/Yoroi/`
4. Sélectionne ces 2 fichiers :
   - `YoroiLiveActivityManager.swift`
   - `YoroiLiveActivityManager.m`
5. **IMPORTANT** : Coche **"Add to targets: Yoroi"** (PAS YoroiWidget)
6. Clique sur **"Add"**

Si Xcode te demande de créer un **Bridging Header**, clique **"Create Bridging Header"**.

### 3. Vérifier les Target Memberships

**YoroiLiveActivityManager.swift et .m** :
- Sélectionne le fichier dans Xcode
- Inspecteur de fichiers (panneau de droite) > Target Membership
- ✅ Yoroi coché
- ❌ YoroiWidget NON coché

**YoroiWidgetLiveActivity.swift** :
- ✅ YoroiWidget coché
- ❌ Yoroi NON coché

### 4. Vérifier le Bridging Header

Target **Yoroi** > Build Settings > Recherche "Bridging Header" :
- **Objective-C Bridging Header** : `Yoroi/Yoroi-Bridging-Header.h`

Si vide, définis cette valeur manuellement.

### 5. Vérifier App Groups

**Target Yoroi** :
- Onglet **"Signing & Capabilities"**
- Vérifie que **"App Groups"** est présent
- Vérifie que `group.com.houari.yoroi` est coché

**Target YoroiWidget** :
- Onglet **"Signing & Capabilities"**
- Vérifie que **"App Groups"** est présent
- Vérifie que `group.com.houari.yoroi` est coché

### 6. Build Settings (Optionnel mais recommandé)

**Target YoroiWidget** > Build Settings :
- **iOS Deployment Target** : 16.1 (ou supérieur)

### 7. Clean & Build

1. **Product** > **Clean Build Folder** (⇧⌘K)
2. **Product** > **Build** (⌘B)
3. Vérifie qu'il n'y a pas d'erreurs de compilation

---

## 🧪 Test rapide

### Test dans React Native

Crée un fichier de test `TestLiveActivity.tsx` :

```typescript
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useLiveActivity } from '@/lib/hooks/useLiveActivity';

export default function TestLiveActivity() {
  const {
    isAvailable,
    isRunning,
    startActivity,
    stopActivity,
    elapsedSeconds,
  } = useLiveActivity();

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text>Live Activity: {isAvailable ? '✅ Disponible' : '❌ Non disponible'}</Text>
      <Text>Timer: {elapsedSeconds}s</Text>

      {!isRunning ? (
        <Button
          title="Démarrer Timer"
          onPress={() => startActivity('Test')}
        />
      ) : (
        <Button
          title="Arrêter"
          onPress={stopActivity}
        />
      )}
    </View>
  );
}
```

### Lancer l'app

```bash
npm run ios
# ou
npx expo run:ios
```

### Tester

1. Lance l'app sur un **iPhone 14 Pro ou supérieur** (ou simulateur)
2. Appuie sur **"Démarrer Timer"**
3. Vérifie que le timer apparaît dans la **Dynamic Island**
4. Appuie longuement sur la Dynamic Island pour voir la vue étendue
5. Appuie sur **"Arrêter"** pour terminer

---

## 🐛 Dépannage

### Erreur : "Use of unresolved identifier 'YoroiWidgetAttributes'"

**Solution** :
1. Dans Xcode, sélectionne `YoroiLiveActivityManager.swift`
2. Target Membership > **Décocher YoroiWidget**
3. Clean Build (⇧⌘K)
4. Rebuild (⌘B)

### Erreur : "Module 'YoroiLiveActivityManager' not found"

**Solution** :
1. Vérifie que `YoroiLiveActivityManager.m` est bien dans la target **Yoroi**
2. Clean Build (⇧⌘K)
3. Rebuild (⌘B)
4. Relance Metro : `npm start -- --reset-cache`

### Erreur : "No such module 'React'"

**Solution** :
1. Assure-toi d'ouvrir `Yoroi.xcworkspace` (PAS `Yoroi.xcodeproj`)
2. Si le problème persiste, fais `pod install` dans le dossier `ios/`

### La Dynamic Island n'apparaît pas

**Solution** :
1. Vérifie que tu es sur **iOS 16.1+**
2. Vérifie dans `ios/Yoroi/Info.plist` : `NSSupportsLiveActivities = true`
3. Vérifie les logs Xcode pour voir les erreurs

### Erreur de compilation du Widget

**Solution** :
1. Target YoroiWidget > Build Settings > iOS Deployment Target : **16.1**
2. Clean Build
3. Rebuild

---

## 📝 Structure finale dans Xcode

Ton navigateur Xcode devrait ressembler à ceci :

```
Yoroi/
├── Yoroi/
│   ├── AppDelegate.swift
│   ├── YoroiLiveActivityManager.swift  ← Ajouté (Target: Yoroi)
│   ├── YoroiLiveActivityManager.m      ← Ajouté (Target: Yoroi)
│   ├── Yoroi-Bridging-Header.h
│   └── ...
└── YoroiWidget/
    ├── YoroiWidgetBundle.swift         ← Modifié (Target: YoroiWidget)
    ├── YoroiWidgetLiveActivity.swift   ← Modifié (Target: YoroiWidget)
    └── ...
```

---

## ✅ Checklist finale

- [ ] Target YoroiWidget créée dans Xcode
- [ ] App Groups configurés (group.com.houari.yoroi)
- [ ] YoroiLiveActivityManager.swift ajouté à Target Yoroi
- [ ] YoroiLiveActivityManager.m ajouté à Target Yoroi
- [ ] Bridging Header configuré
- [ ] Clean Build réussi
- [ ] Build réussi sans erreurs
- [ ] App lancée sur iPhone 14 Pro ou supérieur
- [ ] Timer démarre dans la Dynamic Island
- [ ] Timer se met à jour chaque seconde

---

## 🎉 Prêt !

Si tout compile et que le test fonctionne, tu as réussi l'intégration ! 🚀

**Prochaines étapes** :
1. Intègre `useLiveActivity` dans ton écran d'entraînement
2. Connecte avec HealthKit pour afficher la FC en temps réel
3. Personnalise les couleurs et icônes

---

## 📞 Support

Si tu rencontres un problème :
1. Vérifie les logs Xcode (⌘Y pour ouvrir la console)
2. Vérifie les Target Memberships
3. Nettoie et rebuild
4. Relance Metro avec `--reset-cache`

**Bon courage !** 💪
