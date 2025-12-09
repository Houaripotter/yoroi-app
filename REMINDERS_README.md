# 🔔 Système de Rappels - Yoroi

Ce document explique comment fonctionne le système de rappels et notifications dans l'application Yoroi.

## 📋 Table des matières

1. [Fonctionnalités](#fonctionnalités)
2. [Configuration](#configuration)
3. [Architecture](#architecture)
4. [Permissions](#permissions)
5. [Personnalisation](#personnalisation)
6. [Dépannage](#dépannage)

---

## ✨ Fonctionnalités

### **1. Configuration flexible**

- ✅ **Toggle ON/OFF** : Activer/désactiver les rappels facilement
- ⏰ **Sélecteur d'heure** : Choisir l'heure précise (ex: 07:00, 08:00)
- 📅 **Choix des jours** : Personnaliser les jours de la semaine
  - Tous les jours
  - Jours de semaine (Lun-Ven)
  - Personnalisé
- 🎯 **Type de rappel** :
  - Pesée ⚖️
  - Entraînement 💪
  - Les deux 🛡️

### **2. Notifications intelligentes**

- 📱 **Notifications locales** via expo-notifications
- 🔔 **Messages personnalisés** :
  - Pesée : "Bonjour Houari ! N'oublie pas de te peser 🛡️"
  - Entraînement : "C'est l'heure de s'entraîner ! Garde l'armure en forme 🛡️"
  - Les deux : "N'oublie pas de te peser et de t'entraîner aujourd'hui !"
- 🔊 **Son discret** par défaut
- 📳 **Vibration** (Android uniquement)

### **3. Stockage**

- 💾 **AsyncStorage** : Stockage local pour une réponse rapide
- ☁️ **Supabase** (optionnel) : Synchronisation entre appareils

---

## ⚙️ Configuration

### Étape 1 : Installer les packages

Les packages sont déjà installés :
- ✅ `expo-notifications`
- ✅ `@react-native-community/datetimepicker`

### Étape 2 : Configurer les permissions

#### **iOS** (ios/Podfile)

Le projet utilise Expo, les permissions sont automatiquement gérées via `app.json` :

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserNotificationsUsageDescription": "Yoroi a besoin de vous envoyer des rappels pour vos pesées et entraînements"
      }
    }
  }
}
```

#### **Android** (app.json)

```json
{
  "expo": {
    "android": {
      "permissions": [
        "NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM"
      ]
    },
    "notification": {
      "icon": "./assets/images/icon.png",
      "color": "#34D399"
    }
  }
}
```

### Étape 3 : Créer la table Supabase (Optionnel)

Si vous voulez synchroniser les préférences entre appareils :

1. Ouvrez Supabase SQL Editor
2. Exécutez `supabase_reminders_setup.sql`

---

## 🏗️ Architecture

### Fichiers créés

```
lib/notificationService.ts              # Service de gestion des notifications
components/ReminderSettings.tsx         # Composant UI des réglages
supabase_reminders_setup.sql           # Script SQL (optionnel)
REMINDERS_README.md                    # Documentation
```

### Structure du service (`lib/notificationService.ts`)

#### **Types**

```typescript
type ReminderType = 'weight' | 'workout' | 'both';
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:mm"
  days: DayOfWeek[];
  type: ReminderType;
}
```

#### **Fonctions principales**

| Fonction | Description |
|----------|-------------|
| `requestNotificationPermissions()` | Demande les permissions |
| `checkNotificationPermissions()` | Vérifie si les permissions sont accordées |
| `scheduleNotifications(settings)` | Planifie les notifications |
| `cancelAllNotifications()` | Annule toutes les notifications |
| `testNotification(type)` | Envoie une notification de test |

### Flux de fonctionnement

```
1. Utilisateur active les rappels
   ↓
2. Demande de permission (si nécessaire)
   ↓
3. Utilisateur configure (heure, jours, type)
   ↓
4. Sauvegarde dans AsyncStorage
   ↓
5. Planification des notifications
   ↓
6. Notifications envoyées automatiquement
```

---

## 🔐 Permissions

### Demande de permission

La permission est demandée automatiquement lors de l'activation des rappels.

**États possibles** :
- ✅ **granted** : Permission accordée
- ❌ **denied** : Permission refusée
- ⏳ **undetermined** : Pas encore demandée

### Si la permission est refusée

1. Un message s'affiche : *"Les notifications sont nécessaires pour les rappels. Veuillez autoriser les notifications dans les paramètres de votre appareil."*
2. L'utilisateur doit aller dans les paramètres de son téléphone :
   - **iOS** : Réglages > Yoroi > Notifications
   - **Android** : Paramètres > Applications > Yoroi > Notifications

---

## 🎨 Personnalisation

### Modifier les messages de notification

Dans `lib/notificationService.ts` :

```typescript
const getNotificationMessage = (type: ReminderType) => {
  const messages = {
    weight: {
      title: '⚖️ Rappel de pesée',
      body: "Bonjour Houari ! N'oublie pas de te peser 🛡️",
    },
    workout: {
      title: '💪 Rappel d\'entraînement',
      body: "C'est l'heure de s'entraîner ! Garde l'armure en forme 🛡️",
    },
    both: {
      title: '🛡️ Rappel Yoroi',
      body: "N'oublie pas de te peser et de t'entraîner aujourd'hui !",
    },
  };

  return messages[type];
};
```

### Modifier le son de notification

Dans `lib/notificationService.ts` :

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Modifier ici
    shouldSetBadge: false,
  }),
});
```

### Modifier le canal Android

```typescript
await Notifications.setNotificationChannelAsync('reminders', {
  name: 'Rappels',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250], // Modifier ici
  lightColor: '#34D399', // Modifier ici
  sound: 'default', // Modifier ici
});
```

---

## 🐛 Dépannage

### Les notifications ne s'affichent pas

**Problème** : Les notifications ne sont pas reçues

**Solutions** :
1. ✅ Vérifier que les rappels sont activés dans les Réglages
2. ✅ Vérifier les permissions de notification
3. ✅ Utiliser le bouton "Tester la notification"
4. ✅ Vérifier les logs : `await getAllScheduledNotifications()`

### Permission refusée

**Problème** : L'utilisateur a refusé les permissions

**Solutions** :
1. Afficher un message explicatif
2. Rediriger vers les paramètres du téléphone
3. Proposer de réactiver plus tard

### iOS : Notifications en arrière-plan

**Problème** : Les notifications ne fonctionnent pas quand l'app est fermée

**Solution** :
- Les notifications locales fonctionnent même en arrière-plan
- Vérifier que l'app n'a pas été supprimée de la mémoire par le système

### Android : Son personnalisé

**Problème** : Le son personnalisé ne fonctionne pas

**Solution** :
1. Placer le fichier son dans `android/app/src/main/res/raw/`
2. Utiliser le nom du fichier (sans extension) dans le canal :
```typescript
sound: 'custom_sound' // Pour custom_sound.mp3
```

---

## 📊 Utilisation

### Activer les rappels

1. Ouvrez **Réglages**
2. Section **RAPPELS**
3. Activez le toggle "Activer les rappels"
4. Accordez les permissions si demandé

### Configurer l'heure

1. Tapez sur l'heure affichée (ex: "07:00")
2. Sélectionnez l'heure souhaitée
3. Validez

### Choisir les jours

**Raccourcis** :
- **Tous les jours** : 7 jours / 7
- **Semaine** : Lundi à Vendredi

**Personnalisé** :
- Tapez sur les jours souhaités (Dim, Lun, Mar, etc.)
- Les jours sélectionnés sont en vert

### Changer le type

Tapez sur le type souhaité :
- ⚖️ **Pesée** : Rappel uniquement pour la pesée
- 💪 **Entraînement** : Rappel uniquement pour l'entraînement
- 🛡️ **Les deux** : Rappel pour pesée ET entraînement

### Tester

Tapez sur **"Tester la notification"** pour recevoir une notification de test dans 2 secondes.

---

## 🚀 Améliorations futures

Idées pour étendre le système :
- 🔄 **Rappels intelligents** : Adapter l'heure selon l'historique
- 📈 **Statistiques** : Taux de complétion des rappels
- 🎯 **Rappels contextuels** : "Vous n'avez pas fait d'entraînement depuis 3 jours"
- 🌙 **Mode Ne pas déranger** : Pause temporaire
- 🏆 **Gamification** : Badge "Toujours à l'heure"

---

## ✅ C'est terminé !

Votre système de rappels est maintenant opérationnel ! Les utilisateurs peuvent configurer leurs rappels personnalisés pour ne jamais oublier de se peser ou de s'entraîner. 🛡️
