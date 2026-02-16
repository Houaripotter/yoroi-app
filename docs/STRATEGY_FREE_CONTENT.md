# 🎁 Stratégie Marketing : Contenu Gratuit

## Vue d'ensemble

Tous les contenus premium sont actuellement **débloqués gratuitement** pour créer l'engagement et donner envie aux utilisateurs. Cette stratégie permet de :

✅ Faire découvrir toutes les fonctionnalités
✅ Créer l'habitude et l'engagement
✅ Augmenter la rétention utilisateur
✅ Faciliter la transition vers l'abonnement premium ultérieur

---

## 🎨 Contenus Débloqués

### 1. **Avatars (16 packs)**
- **Fichier** : `lib/avatarSystem.ts`
- **Fonction modifiée** : `isPackUnlocked()` et `getAllPacksWithUnlockStatus()`
- **Lignes** : 653-660 et 678-690
- **Total** : 80 avatars/personnages (16 packs × 5 variations)

**Packs disponibles :**
- Niveau 1 : Ninja, Samouraï, Boxeur, Judoka
- Niveau 2 : Karatéka, Catcheur, Combattant MMA
- Niveau 3 : Champion, Rōnin, Spectre
- Niveau 4 : Maîtres Arts Martiaux, Légendes Guerrières, Créatures Mythiques
- Niveau 5 : Empereur, Shōgun, Oni Légendaire

### 2. **Thèmes**
- **Fichier** : `lib/themeUnlocks.ts`
- **Fonctions** : `getUnlockedThemes()` ligne 119-122, `isThemeUnlocked()` ligne 340-342
- **Statut** : Tous les thèmes débloqués par défaut

### 3. **Thèmes Guerriers**
- **Fichier** : `lib/appearanceService.ts`
- **Fonction** : `isWarriorThemeUnlocked()` ligne 184-188
- **Total** : 10 thèmes (2 gratuits + 8 premium débloqués)

---

## 🔐 Réactivation du système de déblocage (futur)

### Pour les Avatars

Dans `lib/avatarSystem.ts`, remplacer :

```typescript
// Ligne 653-660
export async function isPackUnlocked(pack: AvatarPack): Promise<boolean> {
  const metadata = PACK_METADATA.find((p) => p.id === pack);
  if (!metadata) {
    logger.warn(`[AvatarSystem] Pack inconnu: ${pack}`);
    return false;
  }

  // ⚠️ ACTIVER CETTE LIGNE pour l'abonnement :
  const unlockedLevel = await getUnlockedLevel();
  return unlockedLevel >= metadata.requiredRankLevel;

  // ET SUPPRIMER CETTE LIGNE :
  // return true;
}
```

Et dans `getAllPacksWithUnlockStatus()` ligne 678-690 :

```typescript
export async function getAllPacksWithUnlockStatus() {
  // ACTIVER CE CODE :
  const unlockedLevel = await getUnlockedLevel();
  return PACK_METADATA.map((pack) => ({
    ...pack,
    isUnlocked: unlockedLevel >= pack.requiredRankLevel,
  }));

  // ET SUPPRIMER CE CODE :
  // return PACK_METADATA.map((pack) => ({
  //   ...pack,
  //   isUnlocked: true,
  // }));
}
```

### Pour les Thèmes

Dans `lib/themeUnlocks.ts` :

```typescript
// Ligne 119-122
export const getUnlockedThemes = async (): Promise<FullThemeKey[]> => {
  // ACTIVER CE CODE :
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_UNLOCKED_THEMES);
    return data ? JSON.parse(data) : ['default'];
  } catch (error) {
    return ['default'];
  }

  // ET SUPPRIMER CE CODE :
  // return Object.keys(FULL_THEMES) as FullThemeKey[];
};

// Ligne 340-342
export const isThemeUnlocked = async (themeId: FullThemeKey): Promise<boolean> => {
  // ACTIVER CE CODE :
  const unlocked = await getUnlockedThemes();
  return unlocked.includes(themeId);

  // ET SUPPRIMER CE CODE :
  // return true;
};
```

### Pour les Thèmes Guerriers

Dans `lib/appearanceService.ts` ligne 184-188 :

```typescript
isWarriorThemeUnlocked(themeId: string, userXP: number): boolean {
  // ACTIVER CE CODE :
  const theme = WARRIOR_THEMES.find(t => t.id === themeId);
  return theme ? userXP >= theme.unlockXP : false;

  // ET SUPPRIMER CE CODE :
  // return true;
}
```

---

## 📊 Métriques à Suivre

Avant d'activer l'abonnement, surveiller :

1. **Taux d'utilisation** des différents avatars/thèmes
2. **Fréquence de changement** d'avatar/thème
3. **Engagement utilisateur** (durée de session, rétention)
4. **Contenus les plus populaires** (pour définir le premium)

---

## 🚀 Plan de Migration vers Abonnement

### Phase 1 : Gratuit (Actuel)
- ✅ Tout débloqué
- ✅ Créer l'engagement
- ✅ Habituer les utilisateurs

### Phase 2 : Freemium (Futur)
- 🔒 Bloquer certains packs niveau 4-5
- 🔒 Bloquer thèmes premium (XP > 3000)
- 🆓 Garder niveaux 1-3 gratuits

### Phase 3 : Premium (Abonnement)
- 💎 Débloquer tout avec abonnement
- 🎁 Offres spéciales
- 🏆 Avantages exclusifs

---

## 📝 Notes Importantes

- ⚠️ **Ne pas oublier** : Tous les commentaires TODO dans le code indiquent les lignes à modifier
- 🔍 **Rechercher** : `TODO: Réactiver` ou `TEMPORAIRE` dans le code
- 📍 **Fichiers principaux** :
  - `lib/avatarSystem.ts`
  - `lib/themeUnlocks.ts`
  - `lib/appearanceService.ts`

---

**Date de création** : 2026-01-13
**Auteur** : Système de gestion Yoroi
**Statut** : Actif - Contenu gratuit pour tous
