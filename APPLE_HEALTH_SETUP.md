# 🍎 Synchronisation Apple Health - Yoroi

Ce document explique comment configurer et utiliser la synchronisation avec Apple Health dans l'application Yoroi.

## 📋 Table des matières

1. [Fonctionnalités](#fonctionnalités)
2. [Configuration Xcode](#configuration-xcode)
3. [Permissions](#permissions)
4. [Architecture](#architecture)
5. [Utilisation](#utilisation)
6. [Tests](#tests)
7. [Dépannage](#dépannage)

---

## ✨ Fonctionnalités

### **Import depuis Apple Health**
- ✅ Récupération de l'historique de poids (365 derniers jours)
- ✅ Détection automatique des doublons par date
- ✅ Insertion en masse dans Supabase
- ✅ Affichage du nombre de mesures importées

### **Export vers Apple Health**
- ✅ **Export automatique** (optionnel, toggle dans Réglages)
- ✅ Export du **poids** après chaque nouvelle mesure
- ✅ Export de l'**IMC** (si renseigné)
- ✅ Export du **taux de masse grasse** (si renseigné)
- ✅ Respect de la date de la mesure

### **Synchronisation**
- ✅ Synchronisation manuelle depuis l'interface
- ✅ Récupération uniquement des nouvelles données
- ✅ Suivi de la dernière synchronisation
- ✅ Gestion d'état (permission, dernière sync, etc.)

---

## ⚙️ Configuration Xcode

### Prérequis

L'application doit être buildée avec Xcode (pas de support Expo Go).

```bash
# Générer le projet iOS natif
npx expo prebuild --platform ios

# Ou faire un build de développement
eas build --profile development --platform ios
```

### Étape 1 : Activer HealthKit

1. Ouvrez le workspace dans Xcode :
   ```bash
   open ios/Yoroi.xcworkspace
   ```

2. Sélectionnez le projet Yoroi dans le navigateur

3. Sélectionnez la cible "Yoroi"

4. Onglet **"Signing & Capabilities"**

5. Cliquez sur **"+ Capability"**

6. Recherchez et ajoutez **"HealthKit"**

### Étape 2 : Configurer les permissions

Le fichier `Info.plist` doit contenir les descriptions d'utilisation.

#### Via Xcode (recommandé) :
1. Ouvrez `Info.plist` dans Xcode
2. Ajoutez les clés suivantes :

| Clé | Type | Valeur |
|-----|------|--------|
| `NSHealthShareUsageDescription` | String | "Yoroi a besoin d'accéder à vos données de santé pour afficher votre historique de poids" |
| `NSHealthUpdateUsageDescription` | String | "Yoroi a besoin de mettre à jour vos données de santé pour enregistrer votre poids" |

#### Via fichier texte :
Ajoutez dans `ios/Yoroi/Info.plist` :

```xml
<key>NSHealthShareUsageDescription</key>
<string>Yoroi a besoin d'accéder à vos données de santé pour afficher votre historique de poids</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Yoroi a besoin de mettre à jour vos données de santé pour enregistrer votre poids</string>
```

### Étape 3 : Vérifier le bundle identifier

HealthKit nécessite un bundle identifier valide :
- Format : `com.votredomaine.yoroi` (ex: `com.houari.yoroi`)
- Doit correspondre au provisioning profile

### Étape 4 : Configuration app.json

Ajoutez dans `app.json` :

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.houari.yoroi",
      "infoPlist": {
        "NSHealthShareUsageDescription": "Yoroi a besoin d'accéder à vos données de santé pour afficher votre historique de poids",
        "NSHealthUpdateUsageDescription": "Yoroi a besoin de mettre à jour vos données de santé pour enregistrer votre poids"
      }
    },
    "plugins": [
      [
        "react-native-health",
        {
          "healthSharePermission": "Yoroi a besoin d'accéder à vos données de santé pour afficher votre historique de poids"
        }
      ]
    ]
  }
}
```

### Étape 5 : Build et test

```bash
# Reconstruire le projet avec les nouvelles permissions
npx expo prebuild --platform ios --clean

# Installer les pods
cd ios && pod install && cd ..

# Lancer l'app sur un appareil physique (simulateur non supporté)
npx expo run:ios --device
```

**IMPORTANT** : HealthKit ne fonctionne **PAS** sur simulateur, vous devez tester sur un **appareil physique**.

---

## 🔐 Permissions

### Permissions demandées

Le service demande les permissions suivantes :

#### **Lecture** (Read)
- `Weight` - Poids
- `BodyMassIndex` - IMC
- `BodyFatPercentage` - Taux de masse grasse
- `LeanBodyMass` - Masse musculaire

#### **Écriture** (Write)
- `Weight` - Poids
- `BodyMassIndex` - IMC
- `BodyFatPercentage` - Taux de masse grasse

### Demande de permission

La permission est demandée automatiquement lors de :
1. Activation de l'export automatique dans Réglages
2. Premier import depuis Apple Health
3. Première synchronisation

### États de permission

```typescript
// Vérifier si les permissions sont accordées
const hasPermission = await checkHealthPermissions();

// Demander les permissions
const granted = await initializeAppleHealth();
```

### Si la permission est refusée

1. Un message s'affiche : *"L'accès à Apple Health est nécessaire pour l'export automatique. Veuillez autoriser l'accès dans Réglages > Confidentialité > Santé > Yoroi"*

2. L'utilisateur doit aller dans :
   - **Réglages iOS** > **Confidentialité** > **Santé** > **Yoroi**
   - Activer les permissions pour Poids, IMC, etc.

---

## 🏗️ Architecture

### Fichiers créés

```
lib/appleHealthService.ts              # Service de synchronisation Apple Health (383 lignes)
components/HealthSyncSettings.tsx      # Composant UI dans Réglages (200+ lignes)
app/(tabs)/entry.tsx                   # Intégration export automatique
app/(tabs)/settings.tsx                # Intégration UI
APPLE_HEALTH_SETUP.md                  # Documentation (ce fichier)
```

### Structure du service (`lib/appleHealthService.ts`)

#### **Fonctions principales**

| Fonction | Description | Retour |
|----------|-------------|--------|
| `isAppleHealthAvailable()` | Vérifie si Apple Health est disponible (iOS uniquement) | `boolean` |
| `initializeAppleHealth()` | Initialise HealthKit et demande les permissions | `Promise<boolean>` |
| `checkHealthPermissions()` | Vérifie si les permissions sont accordées | `Promise<boolean>` |
| `importWeightFromAppleHealth()` | Importe l'historique de poids (365 jours) | `Promise<number>` |
| `exportWeightToAppleHealth(weight, date)` | Exporte une mesure de poids | `Promise<boolean>` |
| `exportBMIToAppleHealth(bmi, date)` | Exporte l'IMC | `Promise<boolean>` |
| `exportBodyFatToAppleHealth(bodyFat, date)` | Exporte le taux de masse grasse | `Promise<boolean>` |
| `syncFromAppleHealth()` | Synchronise uniquement les nouvelles données | `Promise<number>` |
| `setAppleHealthAutoExport(enabled)` | Active/désactive l'export automatique | `Promise<void>` |
| `isAppleHealthAutoExportEnabled()` | Vérifie si l'export automatique est activé | `Promise<boolean>` |

#### **Stockage local**

Utilise AsyncStorage pour :
- `@yoroi_apple_health_enabled` : État du toggle auto-export
- `@yoroi_last_health_sync` : Timestamp de la dernière synchronisation

### Flux de fonctionnement

```
┌─────────────────────────────────────────────────────┐
│  Utilisateur entre un nouveau poids dans entry.tsx  │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Sauvegarde Supabase OK  │
         └────────┬───────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │ Export automatique activé ?  │
    └─────┬───────────────┬────────┘
          │ NON           │ OUI
          │               │
          ▼               ▼
       [Fin]    ┌──────────────────────┐
                │ exportWeightToAppleHealth │
                └─────────┬────────────┘
                          │
                          ▼
                   ┌────────────────┐
                   │ IMC renseigné ? │
                   └─────┬─────┬────┘
                         │ NON │ OUI
                         │     ▼
                         │  exportBMIToAppleHealth
                         │
                         ▼
                  ┌──────────────────────┐
                  │ Masse grasse renseignée ? │
                  └──────┬──────┬────────┘
                         │ NON  │ OUI
                         │      ▼
                         │  exportBodyFatToAppleHealth
                         │
                         ▼
                       [Fin]
```

### Composant UI (`components/HealthSyncSettings.tsx`)

Le composant affiche :
1. **Statut de permission** : Autorisé / Permission requise
2. **Toggle Export automatique** : Active/désactive l'export auto
3. **Bouton Import** : Importe l'historique (365 jours)
4. **Bouton Synchroniser** : Sync uniquement nouvelles données
5. **Dernière sync** : Affiche "Il y a X jours/heures"

États gérés :
- `autoExportEnabled` : État du toggle
- `hasPermission` : Permission accordée ou non
- `lastSync` : Date de la dernière synchronisation
- `loading` / `syncing` : États de chargement

---

## 📱 Utilisation

### Pour l'utilisateur

#### **Activer l'export automatique**

1. Ouvrir **Réglages**
2. Section **APPLE HEALTH**
3. Activer le toggle **"Export automatique"**
4. Accorder les permissions si demandé
5. Chaque nouvelle mesure sera envoyée automatiquement

#### **Importer l'historique**

1. Ouvrir **Réglages**
2. Section **APPLE HEALTH**
3. Appuyer sur **"Importer depuis Apple Health"**
4. Attendre la fin de l'import
5. Un message indique le nombre de mesures importées

#### **Synchroniser manuellement**

1. Ouvrir **Réglages**
2. Section **APPLE HEALTH**
3. Appuyer sur **"Synchroniser"**
4. Seules les nouvelles données depuis la dernière sync sont importées

### Pour le développeur

#### **Tester l'import**

```typescript
import { importWeightFromAppleHealth } from '@/lib/appleHealthService';

const count = await importWeightFromAppleHealth();
console.log(`${count} mesures importées`);
```

#### **Tester l'export**

```typescript
import { exportWeightToAppleHealth } from '@/lib/appleHealthService';

const success = await exportWeightToAppleHealth(75.5, new Date());
console.log('Export:', success ? 'Réussi' : 'Échoué');
```

#### **Activer l'export auto par code**

```typescript
import { setAppleHealthAutoExport } from '@/lib/appleHealthService';

await setAppleHealthAutoExport(true);
```

---

## 🧪 Tests

### Prérequis pour tester

1. ✅ **Appareil iOS physique** (pas simulateur)
2. ✅ App **Santé** (Apple Health) installée
3. ✅ Données de poids dans l'app Santé
4. ✅ Build natif (pas Expo Go)

### Scénario 1 : Import d'historique

1. Ajouter des mesures de poids dans l'app Santé iOS :
   - Ouvrir **Santé**
   - **Parcourir** > **Mesures corporelles** > **Poids**
   - Appuyer sur **+** pour ajouter des données

2. Dans Yoroi :
   - Aller dans **Réglages** > **APPLE HEALTH**
   - Appuyer sur **"Importer depuis Apple Health"**

3. Vérifier :
   - Message de succès avec le nombre de mesures
   - Poids visible dans le Dashboard
   - Graphique mis à jour

### Scénario 2 : Export automatique

1. Dans Yoroi :
   - Aller dans **Réglages** > **APPLE HEALTH**
   - Activer **"Export automatique"**
   - Accorder les permissions

2. Ajouter une nouvelle mesure :
   - Aller dans **Entrée**
   - Saisir un poids (ex: 75.5 kg)
   - **Enregistrer**

3. Vérifier dans l'app Santé :
   - Ouvrir **Santé**
   - **Parcourir** > **Mesures corporelles** > **Poids**
   - La nouvelle mesure doit apparaître avec la source "Yoroi"

### Scénario 3 : Synchronisation

1. Ajouter une nouvelle mesure dans l'app Santé

2. Dans Yoroi :
   - Aller dans **Réglages** > **APPLE HEALTH**
   - Appuyer sur **"Synchroniser"**

3. Vérifier :
   - Message "1 nouvelle mesure synchronisée"
   - Poids visible dans le Dashboard

### Tests de permission

1. **Refuser la permission** :
   - Supprimer l'app et la réinstaller
   - Activer l'export auto
   - Appuyer sur "Ne pas autoriser"
   - Vérifier le message d'erreur

2. **Accorder la permission après refus** :
   - Réglages iOS > Confidentialité > Santé > Yoroi
   - Activer les permissions
   - Retourner dans Yoroi
   - Réactiver l'export auto (devrait fonctionner)

### Tests sur simulateur

⚠️ **Apple Health ne fonctionne PAS sur simulateur**.

Si vous exécutez sur simulateur :
- Le composant affiche : "Apple Health n'est disponible que sur iOS"
- Les fonctions retournent `false` ou `0`
- Aucune erreur n'est levée

---

## 🐛 Dépannage

### Problème : "Apple Health n'est disponible que sur iOS"

**Cause** : Vous utilisez Android, le web, ou un simulateur iOS

**Solution** :
- Utiliser un **appareil iOS physique** (iPhone/iPad)
- HealthKit ne fonctionne pas sur simulateur

---

### Problème : Les permissions ne sont pas demandées

**Causes possibles** :
1. HealthKit capability pas activée dans Xcode
2. Info.plist manquant les descriptions
3. Build pas à jour

**Solutions** :
1. Vérifier dans Xcode : Signing & Capabilities > HealthKit ✓
2. Vérifier `Info.plist` contient `NSHealthShareUsageDescription` et `NSHealthUpdateUsageDescription`
3. Reconstruire l'app :
   ```bash
   npx expo prebuild --platform ios --clean
   cd ios && pod install && cd ..
   npx expo run:ios --device
   ```

---

### Problème : Import ne trouve aucune donnée

**Causes possibles** :
1. Aucune donnée de poids dans Apple Health
2. Données plus anciennes que 365 jours
3. Permissions non accordées

**Solutions** :
1. Ajouter des données de poids dans l'app Santé :
   - Santé > Parcourir > Mesures corporelles > Poids > +
2. Vérifier les permissions :
   - Réglages iOS > Confidentialité > Santé > Yoroi
   - Activer "Poids"
3. Vérifier les logs console pour les erreurs

---

### Problème : Export automatique ne fonctionne pas

**Causes possibles** :
1. Toggle désactivé
2. Permissions d'écriture non accordées
3. Erreur silencieuse

**Solutions** :
1. Vérifier le toggle dans Réglages > APPLE HEALTH
2. Vérifier les permissions d'écriture :
   - Réglages iOS > Confidentialité > Santé > Yoroi
   - Activer "Autoriser 'Yoroi' à mettre à jour" pour Poids, IMC, etc.
3. Activer les logs dans `lib/appleHealthService.ts` :
   ```typescript
   console.log('✅ Poids exporté vers Apple Health:', weight);
   ```

---

### Problème : Erreur "AppleHealthKit.initHealthKit is not a function"

**Cause** : Le package `react-native-health` n'est pas correctement lié

**Solution** :
```bash
# Désinstaller
npm uninstall react-native-health

# Réinstaller
npm install react-native-health

# Reconstruire
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..

# Rebuild
npx expo run:ios --device
```

---

### Problème : Données dupliquées

**Cause** : Import multiple sans vérification

**Solution** :
Le service vérifie automatiquement les doublons par date. Si le problème persiste :
1. Supprimer les doublons manuellement dans Supabase
2. Vérifier la logique de filtrage dans `importWeightFromAppleHealth()`

---

### Problème : Synchronisation ne trouve pas les nouvelles données

**Cause** : La dernière sync est trop récente ou date incorrecte

**Solution** :
Réinitialiser la dernière sync :
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.removeItem('@yoroi_last_health_sync');
```

Ou manuellement dans le code :
```typescript
// Dans lib/appleHealthService.ts, modifier syncFromAppleHealth()
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours
```

---

### Logs utiles

Activer les logs détaillés :

```typescript
// Dans lib/appleHealthService.ts

export const importWeightFromAppleHealth = async () => {
  console.log('🔍 Début import...');

  AppleHealthKit.getWeightSamples(options, async (error, results) => {
    console.log('📊 Résultats bruts:', results);
    console.log('📊 Nombre de résultats:', results?.length);

    // ... reste du code
  });
};
```

Pour voir les logs dans le terminal :
```bash
npx expo run:ios --device
```

Les logs apparaissent avec les préfixes :
- `✅` : Succès
- `❌` : Erreur
- `ℹ️` : Information
- `📊` : Données

---

## 🚀 Améliorations futures

Idées pour étendre le système :

1. **Synchronisation bidirectionnelle automatique**
   - Background fetch pour sync périodique
   - Notification quand nouvelles données disponibles

2. **Import d'autres métriques**
   - Fréquence cardiaque
   - Pas quotidiens
   - Calories brûlées
   - Sommeil

3. **Export de plus de données**
   - Masse musculaire
   - Masse osseuse
   - Eau corporelle

4. **Graphiques avancés**
   - Comparaison Yoroi vs Apple Health
   - Détection de divergences
   - Corrections automatiques

5. **Résolution de conflits**
   - Si données différentes pour même date
   - Choix : Apple Health prioritaire ou Yoroi prioritaire

---

## 📚 Ressources

### Documentation officielle

- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [react-native-health GitHub](https://github.com/agencyenterprise/react-native-health)
- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)

### Liens utiles

- [HealthKit Data Types](https://developer.apple.com/documentation/healthkit/data_types)
- [HealthKit Sample Code](https://developer.apple.com/documentation/healthkit/samples)
- [React Native Health Examples](https://github.com/agencyenterprise/react-native-health/tree/master/example)

---

## ✅ Checklist de déploiement

Avant de publier sur l'App Store :

- [ ] HealthKit capability activée dans Xcode
- [ ] Info.plist contient les descriptions de permission
- [ ] Bundle identifier configuré correctement
- [ ] Tests réussis sur appareil physique
- [ ] Import d'historique fonctionne
- [ ] Export automatique fonctionne
- [ ] Synchronisation fonctionne
- [ ] Gestion des erreurs testée
- [ ] Messages utilisateur clairs et en français
- [ ] Logs de débogage désactivés en production
- [ ] Documentation complète pour les utilisateurs

---

## 🎉 C'est terminé !

Votre intégration Apple Health est maintenant complète ! Les utilisateurs peuvent importer leur historique, activer l'export automatique, et synchroniser leurs données entre Yoroi et Apple Health. 🛡️
