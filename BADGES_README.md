# 🏆 Système de Badges et Achievements - Yoroi

Ce document explique comment fonctionne le système de badges et achievements dans l'application Yoroi.

## 📋 Table des matières

1. [Liste des badges](#liste-des-badges)
2. [Configuration](#configuration)
3. [Fonctionnement](#fonctionnement)
4. [Architecture](#architecture)
5. [Personnalisation](#personnalisation)

---

## 🎖️ Liste des badges

### **DÉBUTANT** 🌱

| Badge | Nom | Description | Condition |
|-------|-----|-------------|-----------|
| 🎯 | Première pesée | Enregistrer sa première mesure | Ajouter votre première mesure de poids |
| 💪 | Premier entraînement | Enregistrer son premier entraînement | Enregistrer votre premier entraînement |
| 👤 | Profil complet | Remplir toutes les infos du profil | Remplir votre profil (nom, taille, objectif) |

### **RÉGULARITÉ** 🔥

| Badge | Nom | Description | Condition |
|-------|-----|-------------|-----------|
| 🔥 | 7 jours consécutifs | Se peser 7 jours de suite | Se peser pendant 7 jours consécutifs |
| ⭐ | 30 jours consécutifs | Se peser 30 jours de suite | Se peser pendant 30 jours consécutifs |
| 🏅 | Sportif du mois | 20 entraînements dans le mois | Effectuer 20 entraînements dans un mois |

### **PROGRESSION** 📈

| Badge | Nom | Description | Condition |
|-------|-----|-------------|-----------|
| 📉 | Premier kilo perdu | Perdre 1 kg | Perdre au moins 1 kg par rapport à votre poids initial |
| 🎉 | 5 kilos perdus | Perdre 5 kg | Perdre au moins 5 kg par rapport à votre poids initial |
| 🏆 | Objectif atteint | Atteindre son poids cible | Atteindre votre poids objectif |

---

## ⚙️ Configuration

### Étape 1 : Créer la table dans Supabase

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez le script `supabase_badges_setup.sql`

Le script créera :
- La table `user_badges`
- Les index nécessaires
- Les policies RLS (Row Level Security)
- Une fonction utilitaire `unlock_badge()`

### Étape 2 : Vérifier les policies

Les policies suivantes sont automatiquement créées :
- ✅ Les utilisateurs peuvent voir leurs propres badges
- ✅ Les utilisateurs peuvent débloquer leurs badges
- ❌ Les badges ne peuvent pas être supprimés (optionnel)

---

## 🔧 Fonctionnement

### Déblocage automatique

Le système vérifie automatiquement les conditions de déblocage après chaque action :

#### **Après une mesure de poids** (app/(tabs)/entry.tsx)
```typescript
checkWeightBadges();
```

Vérifie :
- ✅ Badge "Première pesée"
- ✅ Badge "7 jours consécutifs"
- ✅ Badge "30 jours consécutifs"
- ✅ Badge "Premier kilo perdu"
- ✅ Badge "5 kilos perdus"
- ✅ Badge "Objectif atteint"

#### **Après un entraînement** (app/(tabs)/sport.tsx)
```typescript
checkWorkoutBadges();
```

Vérifie :
- ✅ Badge "Premier entraînement"
- ✅ Badge "Sportif du mois"

### Notification

Quand un badge est débloqué :
1. 🎉 **Animation** : Le badge s'anime avec un effet de rotation
2. 📳 **Feedback haptique** (iOS/Android uniquement)
3. 🔔 **Alert** : "🏆 Félicitations ! Nouveau badge débloqué : [Nom du badge] 🎉"

### Affichage

Les badges sont accessibles depuis :
- **Réglages** > Section "ACHIEVEMENTS" > **Mes badges**

L'écran des badges affiche :
- Une barre de progression (X / 9 badges débloqués)
- Les badges organisés par catégorie
- Badge débloqué : **Couleur dorée** avec animation
- Badge verrouillé : **Grisé** avec opacité 0.5 et icône 🔒

---

## 🏗️ Architecture

### Fichiers créés

```
types/badges.ts                    # Types et configuration des badges
components/BadgeItem.tsx            # Composant d'affichage d'un badge
components/BadgesScreen.tsx         # Écran principal des badges
lib/badgeService.ts                 # Logique de déblocage
supabase_badges_setup.sql          # Script de création de la table
BADGES_README.md                   # Documentation
```

### Structure de la table `user_badges`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| user_id | UUID | Référence vers l'utilisateur |
| badge_id | TEXT | ID du badge (ex: 'first_weight') |
| unlocked_at | TIMESTAMP | Date de déblocage |

**Contrainte** : Un utilisateur ne peut débloquer qu'une fois chaque badge (UNIQUE constraint)

### Flux de déblocage

```
1. Action utilisateur (mesure, entraînement)
   ↓
2. Appel à checkWeightBadges() ou checkWorkoutBadges()
   ↓
3. Vérification des conditions
   ↓
4. Appel à unlockBadge(badgeId)
   ↓
5. Insertion dans la table (si non déjà débloqué)
   ↓
6. Notification + Animation
```

---

## 🎨 Personnalisation

### Ajouter un nouveau badge

#### 1. Ajouter le type dans `types/badges.ts`

```typescript
export type BadgeId =
  // ... badges existants
  | 'nouveau_badge';

export const BADGES: Record<BadgeId, Badge> = {
  // ... badges existants
  nouveau_badge: {
    id: 'nouveau_badge',
    name: 'Nom du badge',
    description: 'Description courte',
    icon: '🎊', // Emoji
    category: 'progress',
    color: '#10B981',
    requirement: 'Condition détaillée',
  },
};
```

#### 2. Ajouter la logique de vérification dans `lib/badgeService.ts`

```typescript
// Dans checkWeightBadges() ou checkWorkoutBadges()
if (/* condition */) {
  const unlocked = await unlockBadge('nouveau_badge');
  if (unlocked) unlockedBadges.push('nouveau_badge');
}
```

#### 3. Ajouter le nom dans `showBadgeNotification()`

```typescript
switch (id) {
  // ... cas existants
  case 'nouveau_badge': return 'Nom du badge';
}
```

### Personnaliser les couleurs

Les couleurs des badges sont définies dans `types/badges.ts` :

```typescript
color: '#34D399', // Vert menthe
color: '#3B82F6', // Bleu
color: '#8B5CF6', // Violet
color: '#F59E0B', // Orange
color: '#FFD700', // Or
```

### Personnaliser les animations

Les animations sont définies dans `components/BadgeItem.tsx` :

```typescript
// Animation de célébration lors du déblocage
Animated.sequence([
  Animated.parallel([
    Animated.spring(scale, {
      toValue: 1.2, // Échelle
      useNativeDriver: true,
    }),
    Animated.timing(rotation, {
      toValue: 1,
      duration: 600, // Durée
      useNativeDriver: true,
    }),
  ]),
  // ...
]).start();
```

---

## 🐛 Dépannage

### Les badges ne se débloquent pas

1. **Vérifiez la table** : `SELECT * FROM user_badges WHERE user_id = auth.uid();`
2. **Vérifiez les policies** : Les policies RLS sont-elles actives ?
3. **Vérifiez les logs** : Regardez la console pour les erreurs
4. **Vérifiez l'authentification** : L'utilisateur est-il connecté ?

### Les badges s'affichent mal

1. **Rafraîchissez** : Pull-to-refresh sur l'écran des badges
2. **Vérifiez les données** : Les emojis s'affichent-ils correctement ?
3. **Vérifiez le theme** : Les couleurs sont-elles définies ?

### Notification ne s'affiche pas

1. **Vérifiez Haptics** : Les permissions sont-elles accordées ?
2. **Vérifiez Platform** : Le code est-il exécuté sur web ?

---

## 📊 Statistiques

Le système peut être étendu pour afficher des statistiques :
- Taux de complétion (X / 9 badges)
- Badges par catégorie
- Dernier badge débloqué
- Badges les plus rares

---

## 🚀 Améliorations futures

Idées pour étendre le système :
- 🎁 Récompenses pour les badges (ex: débloque un thème)
- 📱 Notifications push pour les badges
- 👥 Classement entre amis
- 🏆 Badges saisonniers (ex: badge Halloween)
- 🎯 Défis personnalisés

---

## ✅ C'est terminé !

Votre système de badges est maintenant opérationnel ! Les utilisateurs peuvent débloquer des badges en utilisant l'application normalement. 🎉
