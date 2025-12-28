# 🛡️ PACK CHEVALIER - PLANIFICATION COMPLÈTE

## 📋 OBJECTIF
Créer un pack thématique "Chevalier" pour diversifier la gamification de Yoroi avec une esthétique médiévale européenne, en complément des thèmes asiatiques (Samouraï, Ninja, etc.).

---

## 🎨 COMPOSANTES DU PACK

### 1. 🏆 BADGES CHEVALIER (10 badges)

#### Badges Honneur & Courage
- **Écuyer** (5 entraînements combat)
  - Icon: Shield
  - Description: "Premiers pas sur le chemin de la chevalerie"
  - XP: 50

- **Chevalier** (50 entraînements combat)
  - Icon: Sword (ou Swords)
  - Description: "Adoubé comme chevalier du royaume"
  - XP: 250

- **Chevalier d'Or** (100 entraînements combat)
  - Icon: Crown
  - Description: "Élite des chevaliers, armure dorée"
  - XP: 500

- **Paladin** (200 entraînements combat)
  - Icon: Award
  - Description: "Champion de la justice et de l'honneur"
  - XP: 1000

#### Badges Quête & Endurance
- **Croisé** (7 jours d'entraînement consécutifs)
  - Icon: Flame
  - Description: "En croisade pour ta transformation"
  - XP: 150

- **Gardien** (30 jours de streak)
  - Icon: Shield
  - Description: "Gardien inébranlable de tes objectifs"
  - XP: 300

- **Templier** (50 entraînements + 5kg perdus)
  - Icon: Star
  - Description: "Discipline de fer, corps d'acier"
  - XP: 400

#### Badges Conquête
- **Conquérant** (Atteindre objectif poids)
  - Icon: Trophy
  - Description: "Tu as conquis ton objectif"
  - XP: 750

- **Seigneur** (100 jours utilisation app)
  - Icon: Crown
  - Description: "Seigneur de ton domaine"
  - XP: 500

- **Roi Légendaire** (365 jours + objectif atteint)
  - Icon: Gem
  - Description: "Règne absolu sur ta transformation"
  - XP: 2000

---

### 2. 🎭 AVATARS CHEVALIER (8 variations)

#### Dossier: `/assets/avatars/knight/`

**Liste des avatars à créer:**
1. `squire.png` - Écuyer (débutant)
2. `knight.png` - Chevalier (bronze)
3. `knight_silver.png` - Chevalier d'Argent
4. `knight_gold.png` - Chevalier d'Or
5. `paladin.png` - Paladin
6. `crusader.png` - Croisé
7. `templar.png` - Templier
8. `king.png` - Roi

**Spécifications:**
- Format: PNG transparent
- Taille: 512x512px
- Style: Minimaliste, moderne, silhouette
- Couleurs: Argent/Or/Bronze selon le rang

---

### 3. 🎖️ RANG CHEVALIER

Ajouter dans le système de rangs existant:

```typescript
{
  id: 'knight',
  name: 'Chevalier',
  nameEn: 'Knight',
  minXP: 5000,
  maxXP: 9999,
  color: '#C0C0C0', // Argent
  icon: '🛡️',
  description: 'Noble guerrier médiéval',
  avatar: 'knight'
}
```

Position suggérée: Entre "Judoka" (3000 XP) et "Karateka" (10000 XP)

---

### 4. 💎 RÉCOMPENSES VISUELLES

#### Animation de déblocage
- Animation de type "épée qui sort du rocher"
- Effet de lumière dorée
- Son de métal (clank)

#### Fond d'écran déblocable
- Château médiéval au lever du soleil
- Accessible après déblocage du badge "Chevalier d'Or"

#### Thème couleur spécial
- Nom: "Royal" ou "Medieval"
- Couleur principale: Or (#FFD700)
- Couleur secondaire: Argent (#C0C0C0)
- Background: Bleu royal (#002147)

---

## 📁 STRUCTURE FICHIERS

```
lib/
├── badges.ts (ajouter KNIGHT_BADGES)
├── ranks.ts (ajouter rang Knight)
└── avatars.ts (ajouter avatars knight)

assets/
└── avatars/
    └── knight/
        ├── squire.png
        ├── knight.png
        ├── knight_silver.png
        ├── knight_gold.png
        ├── paladin.png
        ├── crusader.png
        ├── templar.png
        └── king.png

components/
└── AchievementCelebration.tsx (ajouter animation knight)
```

---

## 🔧 IMPLÉMENTATION TECHNIQUE

### Étape 1: Badges
```typescript
// Dans lib/badges.ts
export const KNIGHT_BADGES: Badge[] = [
  {
    id: 'squire',
    name: 'Écuyer',
    iconComponent: Shield,
    description: 'Premiers pas sur le chemin de la chevalerie',
    category: 'training',
    requirement: 5,
    xpReward: 50,
  },
  // ... autres badges
];

// Ajouter à ALL_BADGES
export const ALL_BADGES = [
  ...STREAK_BADGES,
  ...WEIGHT_BADGES,
  ...TRAINING_BADGES,
  ...SPECIAL_BADGES,
  ...TIME_BADGES,
  ...KNIGHT_BADGES, // NOUVEAU
];
```

### Étape 2: Logique de vérification
```typescript
// Dans checkAndUnlockBadges()
case 'squire':
  shouldUnlock = stats.totalWorkouts >= 5;
  break;
case 'knight':
  shouldUnlock = stats.totalWorkouts >= 50;
  break;
case 'knight_gold':
  shouldUnlock = stats.totalWorkouts >= 100;
  break;
// ... etc
```

### Étape 3: Progression
```typescript
// Dans getAllBadgesProgress()
case 'squire':
case 'knight':
case 'knight_gold':
case 'paladin':
  currentProgress = stats.totalWorkouts;
  break;
```

---

## 🎯 CRITÈRES DE SUCCÈS

- [ ] 10 nouveaux badges fonctionnels
- [ ] 8 avatars créés et intégrés
- [ ] 1 nouveau rang dans le système
- [ ] Animations de déblocage
- [ ] Tests de progression
- [ ] Documentation mise à jour

---

## 📊 IMPACT

**Badges:** 52 → 62 badges totaux (+19%)
**Avatars:** ~56 → 64 avatars (+14%)
**Rangs:** 8 → 9 rangs (+12.5%)

**Engagement attendu:**
- Nouveaux objectifs pour les utilisateurs
- Diversification culturelle (Asie + Europe)
- Motivation supplémentaire pour les arts martiaux occidentaux (Boxe, MMA, etc.)

---

## ⏱️ ESTIMATION TEMPS

1. **Badges (code):** 2h
2. **Avatars (design):** 4-6h (si création manuelle) ou 1h (si AI)
3. **Rang (code):** 1h
4. **Animations:** 2h
5. **Tests:** 1h
6. **Total:** ~10-12h

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Créer ce plan
2. ⏳ Valider les icônes (Shield, Sword, Crown, etc.)
3. ⏳ Créer/générer les avatars
4. ⏳ Implémenter les badges
5. ⏳ Ajouter le rang
6. ⏳ Tester et valider
7. ⏳ Commit et push

---

## 💡 NOTES & IDÉES

- **Extension future:** Pack Viking, Pack Spartiate
- **Synergies:** Combiner badges asiatiques + européens pour débloquer "Guerrier Universel"
- **Events:** Tournoi mensuel "Joutes Royales" avec classement

---

**Date de création:** 2025-12-28
**Status:** 📋 Planifié
**Priorité:** Moyenne
