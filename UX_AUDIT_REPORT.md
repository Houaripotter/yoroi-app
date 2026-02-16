# 🎯 RAPPORT D'AUDIT UX - YOROI APP
## Date: 23 janvier 2026

**MISSION:** S'assurer que l'utilisateur n'est JAMAIS bloqué ou perdu dans YOROI.

---

## 📊 RÉSUMÉ EXÉCUTIF

**SCORE UX GLOBAL: 6.5/10**

| Catégorie | Score | Problèmes Critiques |
|-----------|-------|---------------------|
| 1. États de chargement | 4/10 | 16 fichiers |
| 2. États vides | 5/10 | 10 écrans |
| 3. Gestion des erreurs | 5/10 | 40+ violations |
| 4. Navigation cohérente | 3/10 | 12 catégories |
| 5. Formulaires et validation | 4/10 | 7 fichiers |
| 6. Accessibilité de base | 3/10 | Nombreux problèmes |
| 7. Onboarding | 6/10 | 9 points de friction |

**PROBLÈMES BLOQUANTS IDENTIFIÉS:** 47 problèmes critiques
**IMPACT:** Utilisateurs peuvent se sentir perdus, bloqués ou frustrés

---

# 1. ÉTATS DE CHARGEMENT - 16 FICHIERS PROBLÉMATIQUES

## 🎯 ÉCRAN: Page d'accueil (app/(tabs)/index.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
L'écran d'accueil charge 13+ données en parallèle (profil, poids, historique, streak, entraînements, sommeil, hydratation, défis, etc.) SANS aucun indicateur de chargement. L'utilisateur voit un écran figé ou ancien pendant plusieurs secondes à chaque fois qu'il revient sur l'accueil.

😊 **SOLUTION:**
Ajouter un état `isLoading` global et afficher un skeleton screen ou ActivityIndicator pendant le chargement initial.

📱 **CODE:**
```tsx
// AJOUTER en haut du composant (ligne ~108)
const [isLoading, setIsLoading] = useState(true);

// MODIFIER loadData (ligne 465)
const loadData = useCallback(async () => {
  setIsLoading(true); // ← AJOUTER
  try {
    const [profileData, weight, history, ...] = await Promise.all([
      getProfile(),
      getLatestWeight(),
      // ... 13 requêtes
    ]);
    // ... traitement
  } catch (error) {
    logger.error('Erreur:', error);
  } finally {
    setIsLoading(false); // ← AJOUTER
  }
}, []);

// AJOUTER avant le return principal
if (isLoading) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
```

---

## 🎯 ÉCRAN: Planning (app/(tabs)/planning.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Le planning charge 3 sources de données (entraînements, clubs, compétitions) sans feedback visuel. La variable `catalogLoading` existe (ligne 177) mais n'est JAMAIS utilisée pour afficher un spinner.

😊 **SOLUTION:**
Utiliser l'état `catalogLoading` existant pour afficher un ActivityIndicator pendant le chargement.

📱 **CODE:**
```tsx
// MODIFIER loadData (ligne 359)
const loadData = useCallback(async () => {
  setCatalogLoading(true); // ← AJOUTER
  try {
    const [trainingsData, clubsData, competitionsData] = await Promise.all([
      getTrainings(),
      getClubs(),
      getCompetitions(),
    ]);
    // ... traitement
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    setCatalogLoading(false); // ← AJOUTER
  }
}, []);

// AJOUTER dans le render (avant la FlatList, ligne ~700)
{catalogLoading && (
  <View style={{ padding: 20, alignItems: 'center' }}>
    <ActivityIndicator size="large" color={colors.accent} />
  </View>
)}
```

---

## 🎯 COMPOSANT: Bouton de sauvegarde clubs (app/clubs.tsx)
**Sévérité:** 🟠 HAUTE

😤 **PROBLÈME UX:**
Le bouton "Sauvegarder" n'a pas d'état `isSubmitting`. L'utilisateur peut cliquer plusieurs fois rapidement et créer des clubs en double. Aucun feedback visuel pendant la sauvegarde.

😊 **SOLUTION:**
Ajouter un état `isSubmitting` et désactiver le bouton pendant la sauvegarde (copier le pattern de add-club.tsx).

📱 **CODE:**
```tsx
// AJOUTER en haut du composant
const [isSubmitting, setIsSubmitting] = useState(false);

// MODIFIER handleSave (ligne 165)
const handleSave = async () => {
  if (!name.trim()) {
    showPopup(t('common.error'), t('screens.clubs.nameRequired'), [...]);
    return;
  }

  setIsSubmitting(true); // ← AJOUTER
  try {
    if (editingClub) {
      await updateClub(editingClub.id!, { /* ... */ });
    } else {
      await addClub({ /* ... */ });
    }
    await loadClubs();
    handleCloseModal();
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showPopup(t('common.error'), t('screens.clubs.saveError'), [...]);
  } finally {
    setIsSubmitting(false); // ← AJOUTER
  }
};

// MODIFIER le bouton (dans la modale)
<TouchableOpacity
  disabled={!name.trim() || !selectedSport || isSubmitting} // ← MODIFIER
  onPress={handleSave}
  style={[
    styles.saveButton,
    { opacity: (!name.trim() || !selectedSport || isSubmitting) ? 0.5 : 1 } // ← AJOUTER
  ]}
>
  {isSubmitting ? (
    <ActivityIndicator size="small" color="#FFF" />
  ) : (
    <Text style={styles.saveButtonText}>Sauvegarder</Text>
  )}
</TouchableOpacity>
```

---

## 🎯 AUTRES FICHIERS SANS ÉTAT DE CHARGEMENT

### app/competitor-profile.tsx
😤 Les boutons genre/catégorie/ceinture appellent `saveProfile()` sans `isSubmitting`
😊 Ajouter état loading + disable boutons pendant save

### app/measurements.tsx
😤 `setIsSubmitting` existe mais pas d'ActivityIndicator sur le bouton
😊 Afficher spinner dans le bouton pendant soumission

### app/body-composition.tsx
😤 Même problème que measurements.tsx
😊 Même solution - afficher ActivityIndicator

### app/sleep.tsx
😤 `handleSave` lance `addSleepEntry()` sans état loading
😊 Ajouter `isSubmitting` + disable button

### app/fasting.tsx
😤 2 fonctions de sauvegarde sans `isSubmitting`
😊 Ajouter loading state aux 2 boutons

### app/injury-detail.tsx
😤 `handleUpdateEva` et `handleDelete` async sans loading
😊 Ajouter spinner pendant suppression (critique!)

---

# 2. ÉTATS VIDES - 10 ÉCRANS AVEC ÉCRAN BLANC

## 🎯 ÉCRAN: Planning vide (app/(tabs)/planning.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Au premier lancement ou si l'utilisateur n'a aucun événement planifié, la FlatList affiche un écran complètement blanc. L'utilisateur pense que l'app est cassée ou ne sait pas quoi faire.

😊 **SOLUTION:**
Ajouter un `ListEmptyComponent` avec icône, message explicatif et bouton pour créer un événement.

📱 **CODE:**
```tsx
// AJOUTER la fonction renderEmptyState (ligne ~500)
const renderEmptyState = useCallback(() => (
  <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
    <View style={[styles.emptyIcon, { backgroundColor: colors.accent + '20' }]}>
      <Calendar size={56} color={colors.accent} strokeWidth={2} />
    </View>
    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
      Aucun événement planifié
    </Text>
    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
      Commence par planifier ton premier entraînement ou compétition
    </Text>
    <TouchableOpacity
      style={[styles.emptyCTA, { backgroundColor: colors.accent }]}
      onPress={() => setShowAddSessionModal(true)}
    >
      <Plus size={20} color={colors.textOnAccent} />
      <Text style={[styles.emptyCTAText, { color: colors.textOnAccent }]}>
        Ajouter un événement
      </Text>
    </TouchableOpacity>
  </View>
), [colors]);

// MODIFIER la FlatList (ligne ~720)
<FlatList
  data={events}
  renderItem={renderEventItem}
  ListEmptyComponent={renderEmptyState} // ← AJOUTER
  // ... autres props
/>

// AJOUTER les styles
const styles = StyleSheet.create({
  // ... styles existants
  emptyState: {
    marginTop: 60,
    marginHorizontal: 20,
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCTAText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
```

---

## 🎯 ÉCRAN: Journal d'entraînement vide (app/training-journal.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Au premier lancement, l'utilisateur voit un écran blanc sans aucun entraînement. Aucun message n'explique ce qu'il doit faire.

😊 **SOLUTION:**
Vérifier si `trainings.length === 0` et afficher un empty state avec message + CTA.

📱 **CODE:**
```tsx
// AJOUTER après le chargement des données (ligne ~400)
if (!isLoading && trainings.length === 0) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.emptyState}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.accent + '20' }]}>
          <Dumbbell size={56} color={colors.accent} strokeWidth={2} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Ton journal est vide
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Commence par enregistrer ton premier entraînement pour suivre ta progression
        </Text>
        <TouchableOpacity
          style={[styles.emptyCTA, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/add-training')}
        >
          <Plus size={20} color="#FFF" />
          <Text style={styles.emptyCTAText}>
            Ajouter un entraînement
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

---

## 🎯 COMPOSANT: Graphique de poids (components/home/pages/Page1Monitoring.tsx)
**Sévérité:** 🟠 HAUTE

😤 **PROBLÈME UX:**
Le graphique de poids affiche un espace blanc si l'utilisateur n'a enregistré aucun poids. Aucune indication pour ajouter une pesée.

😊 **SOLUTION:**
Ajouter `ListEmptyComponent` à la FlatList du graphique avec message "Ajoutez votre premier poids".

📱 **CODE:**
```tsx
// AJOUTER (ligne ~850)
const renderWeightChartEmpty = useCallback(() => (
  <View style={{ padding: 20, alignItems: 'center' }}>
    <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
      Aucune pesée enregistrée
    </Text>
    <TouchableOpacity
      onPress={() => router.push('/profile')}
      style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.accent, borderRadius: 8 }}
    >
      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>
        Ajouter ma première pesée
      </Text>
    </TouchableOpacity>
  </View>
), [colors, router]);

// MODIFIER FlatList (ligne 865)
<FlatList
  horizontal
  data={last30Weights}
  renderItem={renderWeightBar}
  ListEmptyComponent={renderWeightChartEmpty} // ← AJOUTER
  // ... autres props
/>
```

---

## 🎯 AUTRES ÉCRANS AVEC EMPTY STATES MANQUANTS

### app/quick-log-muscu.tsx
😤 Si `existingExercises.length === 0`, aucun message explicatif
😊 Afficher "Aucun exercice enregistré - Enregistrez d'abord un exercice"

### app/competitions.tsx
😤 Si aucune compétition à venir, section invisible sans message
😊 Ajouter "Aucune compétition prochaine - Ajoute ta première compétition"

### components/planning/pages/PlanningPage2TimeTable.tsx
😤 Si aucune séance ce jour, case vide sans message
😊 Ajouter "Aucune séance planifiée"

---

# 3. GESTION DES ERREURS - 40+ VIOLATIONS

## 🎯 COMPOSANT: Export de sauvegarde (app/social-share/backup-step.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
L'export de sauvegarde (fonction CRITIQUE) peut échouer silencieusement. L'utilisateur pense que sa sauvegarde s'est faite alors qu'elle a échoué. Ligne 48: juste un `console.error(error)` sans aucune alerte.

😊 **SOLUTION:**
Afficher une alerte claire si l'export échoue avec possibilité de réessayer.

📱 **CODE:**
```tsx
// MODIFIER le catch (ligne 47-50)
} catch (error) {
  console.error('Erreur export:', error);
  Alert.alert(
    'Erreur de sauvegarde',
    'Impossible d\'exporter tes données. Vérifie que tu as autorisé l\'accès à tes photos et réessaye.',
    [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réessayer', onPress: handleExport }, // ← AJOUTER retry
    ]
  );
}
```

---

## 🎯 ÉCRAN: Chargement objectifs (app/training-goals.tsx)
**Sévérité:** 🟠 HAUTE

😤 **PROBLÈME UX:**
Si le chargement des objectifs échoue (ligne 80), aucun feedback à l'utilisateur. L'écran reste vide et l'utilisateur ne comprend pas pourquoi.

😊 **SOLUTION:**
Afficher une alerte avec possibilité de recharger.

📱 **CODE:**
```tsx
// MODIFIER le catch (ligne 78-81)
} catch (error) {
  console.error('Erreur chargement objectifs:', error);
  Alert.alert(
    'Erreur',
    'Impossible de charger tes objectifs. Vérifie ta connexion et réessaye.',
    [
      { text: 'OK' },
      { text: 'Réessayer', onPress: loadGoals },
    ]
  );
}
```

---

## 🎯 ÉCRAN: Chargement clubs (app/clubs.tsx)
**Sévérité:** 🟠 HAUTE

😤 **PROBLÈME UX:**
Si le chargement des clubs échoue (ligne 66), erreur silencieuse. L'utilisateur voit une liste vide et pense qu'il n'a pas de clubs.

😊 **SOLUTION:**
Afficher un message d'erreur avec retry.

📱 **CODE:**
```tsx
// MODIFIER le catch (ligne 64-67)
} catch (error) {
  console.error('Erreur chargement clubs:', error);
  showPopup(
    'Erreur',
    'Impossible de charger tes clubs. Réessaye dans quelques instants.',
    [
      { text: 'OK', style: 'default' },
      { text: 'Réessayer', style: 'default', onPress: loadClubs },
    ]
  );
}
```

---

## 🎯 PATTERN: Messages en anglais dans console

😤 **PROBLÈME UX:**
16 occurrences de messages d'erreur en anglais dans la console (training-journal.tsx, planning.tsx). Incohérence avec le reste de l'app en français.

😊 **SOLUTION:**
Uniformiser tous les console.error en français.

📱 **EXEMPLES À CORRIGER:**
```tsx
// AVANT
console.error('Error loading user prefs:', e);
console.error('Error checking onboarding status:', error);
console.error('Error loading events:', error);

// APRÈS
console.error('Erreur chargement préférences utilisateur:', e);
console.error('Erreur vérification statut onboarding:', error);
console.error('Erreur chargement événements:', error);
```

---

## 🎯 PATTERN: Popups sans bouton "Réessayer"

😤 **PROBLÈME UX:**
Plusieurs erreurs critiques (training-journal.tsx lignes 529, 787, 840, 966) affichent un popup avec seulement "OK". L'utilisateur ne peut pas réessayer l'action qui a échoué.

😊 **SOLUTION:**
Ajouter un bouton "Réessayer" à tous les popups d'erreur.

📱 **CODE:**
```tsx
// AVANT (ligne 529)
showPopup({
  title: 'Erreur',
  message: 'Impossible de créer le suivi',
  buttons: [{ text: 'OK', style: 'default' }]
});

// APRÈS
showPopup({
  title: 'Erreur',
  message: 'Impossible de créer le suivi',
  buttons: [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Réessayer', style: 'default', onPress: handleCreateBenchmark },
  ]
});
```

---

# 4. NAVIGATION COHÉRENTE - 12 PROBLÈMES CRITIQUES

## 🎯 ÉCRAN: Bouton retour cassé (app/sleep.tsx)
**Sévérité:** 🔴 CRITIQUE - BLOQUANT

😤 **PROBLÈME UX:**
Le bouton retour ne fonctionne PAS correctement. Pattern bugué avec double vérification `if (!isNavigating)` (ligne 172). Une fois cliqué, `isNavigating` reste `true` et le bouton se désactive définitivement. L'utilisateur est BLOQUÉ dans l'écran.

😊 **SOLUTION:**
Supprimer la double vérification et utiliser le pattern correct de protection anti-double-clic.

📱 **CODE:**
```tsx
// AVANT (ligne 172-182) - BUGUÉ
const [isNavigating, setIsNavigating] = useState(false);

<TouchableOpacity onPress={() => {
  if (!isNavigating) {
    setIsNavigating(true);
    if (!isNavigating) {  // ← JAMAIS TRUE !!!
      setIsNavigating(true);
      router.back();
    }
  }
}}>

// APRÈS - CORRECT
const [isNavigating, setIsNavigating] = useState(false);

<TouchableOpacity
  disabled={isNavigating}
  onPress={() => {
    if (!isNavigating) {
      setIsNavigating(true);
      setTimeout(() => setIsNavigating(false), 1000); // Reset après 1s
      router.back();
    }
  }}
>
```

---

## 🎯 ÉCRANS: Même bug dans events.tsx et legal.tsx
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Exactement le même bug de navigation cassée dans app/events.tsx et app/legal.tsx. Les boutons retour ne fonctionnent pas.

😊 **SOLUTION:**
Appliquer la même correction que pour sleep.tsx.

---

## 🎯 BUG: États useState entrelacés (app/sleep.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Les déclarations `useState` pour `entries` et `stats` sont ENTRELACÉES avec `isNavigating` (lignes 64-80). Code corrompu qui cause des initialisations incorrectes.

😊 **SOLUTION:**
Corriger les déclarations useState.

📱 **CODE:**
```tsx
// AVANT (lignes 64-80) - BUGUÉ
const [entries, setEntries] = useState
const [isNavigating, setIsNavigating] = useState(false);<SleepEntry[]>([]);
const [stats, setStats] = useState
const [isNavigating, setIsNavigating] = useState(false);<SleepStats | null>(null);

// APRÈS - CORRECT
const [entries, setEntries] = useState<SleepEntry[]>([]);
const [stats, setStats] = useState<SleepStats | null>(null);
const [isNavigating, setIsNavigating] = useState(false);
```

---

## 🎯 FLOW: Onboarding 100% router.replace (app/legal.tsx → setup.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Tout le flow d'onboarding utilise `router.replace()` au lieu de `router.push()`. L'utilisateur NE PEUT PAS revenir en arrière s'il change d'avis ou s'il fait une erreur. Une fois passé le legal disclaimer, impossible de revenir.

😊 **SOLUTION:**
Remplacer `router.replace()` par `router.push()` dans le flow onboarding et ajouter des boutons "Précédent".

📱 **CODE:**
```tsx
// legal.tsx (ligne ~45)
// AVANT
router.replace('/onboarding');

// APRÈS
router.push('/onboarding');

// onboarding.tsx (ligne ~580)
// AVANT
router.replace('/mode-selection');

// APRÈS
router.push('/mode-selection');

// mode-selection.tsx (lignes ~120, ~135)
// AVANT
router.replace('/sport-selection'); // pour compétiteur
router.replace('/setup'); // pour loisir

// APRÈS
router.push('/sport-selection');
router.push('/setup');

// AJOUTER bouton "Précédent" dans mode-selection.tsx
<TouchableOpacity
  style={styles.backButton}
  onPress={() => router.back()}
>
  <ChevronLeft size={24} color={colors.accent} />
  <Text style={{ color: colors.accent }}>Retour</Text>
</TouchableOpacity>
```

---

## 🎯 ÉCRAN: Paramètres d'URL non validés (app/combat-detail.tsx)
**Sévérité:** 🟠 HAUTE

😤 **PROBLÈME UX:**
Le composant utilise directement `params.id` sans vérifier s'il existe. Si l'ID est manquant (deep link cassé), l'app crash.

😊 **SOLUTION:**
Valider les paramètres et rediriger si manquants.

📱 **CODE:**
```tsx
// AJOUTER au début du composant
const params = useLocalSearchParams<{ id?: string }>();

// Valider l'ID
useEffect(() => {
  if (!params.id) {
    Alert.alert(
      'Erreur',
      'Combat introuvable',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }
}, [params.id]);

if (!params.id) {
  return null; // ou écran d'erreur
}
```

---

## 🎯 PATTERN: Même validation manquante dans 5+ écrans

😤 Fichiers concernés:
- app/competition-detail.tsx
- app/composition-detail.tsx
- app/social-share/last-session.tsx
- app/edit-competition.tsx
- app/ideas.tsx

😊 **SOLUTION:** Appliquer la même validation de params à tous ces écrans.

---

## 🎯 COMPOSANT: Header fallback dangereux (components/ui/Header.tsx)
**Sévérité:** 🟡 MOYENNE

😤 **PROBLÈME UX:**
Si `router.canGoBack()` retourne false, le Header redirect automatiquement vers `/(tabs)`. Mais on est peut-être DÉJÀ sur un tab → boucle infinie possible.

😊 **SOLUTION:**
Vérifier qu'on n'est pas déjà sur tabs avant de rediriger.

📱 **CODE:**
```tsx
// MODIFIER handleBack (ligne 33-50)
const handleBack = () => {
  if (onBack) {
    onBack();
  } else if (router.canGoBack()) {
    router.back();
  } else {
    // Vérifier qu'on n'est pas déjà sur tabs
    const segments = useSegments();
    if (!segments.includes('(tabs)')) {
      router.replace('/(tabs)');
    }
  }
};
```

---

# 5. FORMULAIRES ET VALIDATION - 7 FICHIERS

## 🎯 FORMULAIRE: Ajout de club (app/add-club.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Les erreurs de validation sont affichées via `Alert.alert()` (modale bloquante). Aucun champ n'est surligné en rouge. L'utilisateur doit fermer l'alerte, puis chercher quel champ est incorrect. Le clavier ne se ferme pas après soumission.

😊 **SOLUTION:**
1. Remplacer Alert.alert par messages inline avec borderColor rouge
2. Ajouter Keyboard.dismiss() après soumission
3. Afficher les erreurs sous les champs

📱 **CODE:**
```tsx
// AJOUTER états d'erreur
const [nameError, setNameError] = useState('');
const [sportError, setSportError] = useState('');

// MODIFIER handleSave (ligne 53-80)
const handleSave = async () => {
  Keyboard.dismiss(); // ← AJOUTER IMMÉDIATEMENT

  // Validation
  setNameError('');
  setSportError('');

  if (!name.trim()) {
    setNameError('Le nom du club est obligatoire');
    return;
  }
  if (!selectedSport) {
    setSportError('Veuillez choisir un sport');
    return;
  }

  setIsSubmitting(true);
  try {
    await addClub({
      name: name.trim(),
      sport: selectedSport,
      logo_uri: logo || undefined,
      color: selectedColor,
      sessions_per_week: sessionsPerWeek,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  } catch (error) {
    console.error('Erreur création club:', error);
    Alert.alert('Erreur', "Impossible de créer le club");
  } finally {
    setIsSubmitting(false);
  }
};

// MODIFIER le TextInput du nom (ligne 166-173)
<View>
  <TextInput
    style={[
      { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
      nameError && { borderColor: colors.error, borderWidth: 1 } // ← AJOUTER
    ]}
    placeholder="Ex: Gracie Barra, Basic-Fit..."
    placeholderTextColor={colors.textMuted}
    value={name}
    onChangeText={(text) => {
      setName(text);
      if (nameError) setNameError(''); // Clear error on change
    }}
    maxLength={100}
  />
  {nameError && (
    <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
      {nameError}
    </Text>
  )}
</View>
```

---

## 🎯 FORMULAIRE: Profil utilisateur (app/profile.tsx)
**Sévérité:** 🟠 HAUTE

😤 **PROBLÈME UX:**
Aucune indication visuelle des champs en erreur. Validation uniquement sur le nom, pas sur les autres champs (taille, poids, date). Pas de Keyboard.dismiss().

😊 **SOLUTION:**
Ajouter validation sur tous les champs + borderColor rouge + Keyboard.dismiss().

📱 **CODE:**
```tsx
// AJOUTER états d'erreur
const [nameError, setNameError] = useState('');
const [heightError, setHeightError] = useState('');
const [weightError, setWeightError] = useState('');

// MODIFIER handleSave (ligne 292)
const handleSave = async () => {
  Keyboard.dismiss(); // ← AJOUTER

  // Validation
  setNameError('');
  setHeightError('');
  setWeightError('');

  if (!name.trim()) {
    setNameError('Le nom est requis');
    return;
  }
  if (height && (height < 100 || height > 250)) {
    setHeightError('La taille doit être entre 100 et 250 cm');
    return;
  }
  if (weight && (weight < 30 || weight > 300)) {
    setWeightError('Le poids doit être entre 30 et 300 kg');
    return;
  }

  setIsSubmitting(true);
  try {
    await updateProfile({
      name: name.trim(),
      gender,
      height: height || undefined,
      weight: weight || undefined,
      birthdate: birthdate || undefined,
      avatar_url: avatarUrl || undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  } catch (error) {
    console.error('Erreur sauvegarde profil:', error);
    showPopup(t('common.error'), t('screens.profile.saveError'), [
      { text: t('common.ok'), style: 'default' }
    ]);
  } finally {
    setIsSubmitting(false);
  }
};

// AJOUTER borderColor rouge aux TextInput avec erreurs
<TextInput
  style={[
    styles.input,
    nameError && { borderColor: colors.error, borderWidth: 2 }
  ]}
  value={name}
  onChangeText={(text) => {
    setName(text);
    if (nameError) setNameError('');
  }}
/>
{nameError && <Text style={styles.errorText}>{nameError}</Text>}
```

---

## 🎯 PATTERN: Keyboard.dismiss manquant dans 6 formulaires

😤 **FICHIERS CONCERNÉS:**
- app/add-club.tsx
- app/add-competition.tsx
- app/add-combat.tsx
- app/profile.tsx
- app/entry.tsx
- app/measurements.tsx

😊 **SOLUTION:**
Ajouter `Keyboard.dismiss()` au début de chaque fonction handleSave/handleSubmit.

📱 **CODE:**
```tsx
import { Keyboard } from 'react-native'; // En haut du fichier

const handleSave = async () => {
  Keyboard.dismiss(); // ← AJOUTER EN PREMIÈRE LIGNE
  // ... reste du code
};
```

---

# 6. ACCESSIBILITÉ DE BASE

## 🎯 COMPOSANTS: Tous les boutons UI (DarkButton, GlassButton, GoldButton)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
AUCUN bouton de l'app n'a d'`accessibilityLabel` ou `accessibilityRole`. Les utilisateurs avec VoiceOver (malvoyants) ne peuvent pas utiliser l'app. 300+ composants sans labels.

😊 **SOLUTION:**
Ajouter accessibilityLabel et accessibilityRole à tous les composants boutons.

📱 **CODE:**
```tsx
// components/ui/DarkButton.tsx
export const DarkButton = ({
  onPress,
  children,
  disabled,
  accessibilityLabel, // ← AJOUTER
  ...props
}: Props) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button" // ← AJOUTER
      accessibilityLabel={accessibilityLabel || children} // ← AJOUTER
      accessibilityState={{ disabled }} // ← AJOUTER
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

// Même pattern pour GlassButton.tsx et GoldButton.tsx
```

---

## 🎯 COMPOSANT: Grille d'outils (components/home/pages/Page2ActionGrid.tsx)
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
16 boutons d'outils sur la page d'accueil SANS aucun accessibilityLabel. Utilisateurs VoiceOver ne peuvent pas naviguer les outils.

😊 **SOLUTION:**
Ajouter accessibilityLabel à chaque bouton de la grille.

📱 **CODE:**
```tsx
// MODIFIER les TouchableOpacity de la grille (ligne ~200+)
<TouchableOpacity
  onPress={() => router.push('/sleep')}
  accessibilityRole="button" // ← AJOUTER
  accessibilityLabel="Sommeil - Enregistrer mes heures de sommeil" // ← AJOUTER
  accessibilityHint="Ouvre l'écran de suivi du sommeil" // ← AJOUTER
  style={styles.actionCard}
>
  {/* ... contenu */}
</TouchableOpacity>

// Répéter pour tous les 16 boutons avec des labels descriptifs
```

---

## 🎯 PATTERN: Boutons X de fermeture trop petits

😤 **PROBLÈME UX:**
21+ modales ont des boutons "X" de fermeture avec `size={10}` ou `size={14}` (trop petits) et SANS `hitSlop`. Utilisateurs ne peuvent pas fermer les modales facilement.

😊 **SOLUTION:**
1. Augmenter taille icône X à minimum 20px
2. Ajouter hitSlop de 8-10px sur tous les boutons X

📱 **CODE:**
```tsx
// PATTERN CORRECT (Page1Monitoring.tsx:1199)
<TouchableOpacity
  onPress={handleClose}
  accessibilityRole="button"
  accessibilityLabel="Fermer"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // ← AJOUTER
  style={styles.closeButton}
>
  <X size={20} color={colors.textMuted} strokeWidth={3} /> // ← Minimum 20
</TouchableOpacity>

// Appliquer ce pattern dans:
// - NotificationApologyModal.tsx (ligne 94)
// - RatingPopup.tsx (ligne 177)
// - BatteryReadyPopup.tsx
// - PartnerDetailModal.tsx
// - ExercisePickerModal.tsx
// - ZoomableImage.tsx
// - AvatarViewerModal.tsx
// + 15 autres modales
```

---

## 🎯 COMPOSANT: Tab bar inactive (components/AnimatedTabBar.tsx)
**Sévérité:** 🟡 MOYENNE

😤 **PROBLÈME UX:**
Couleur des onglets inactifs: `rgba(255,255,255,0.45)` (45% opacity). Contraste insuffisant pour la lecture, surtout sur fonds clairs.

😊 **SOLUTION:**
Augmenter l'opacity à minimum 60%.

📱 **CODE:**
```tsx
// MODIFIER (ligne ~50)
// AVANT
tabBarInactiveColor: 'rgba(255,255,255,0.45)'

// APRÈS
tabBarInactiveColor: 'rgba(255,255,255,0.65)' // 65% opacity minimum
```

---

## 🎯 PATTERN: Textes gris (#9CA3AF) sur fond sombre

😤 **FICHIERS CONCERNÉS:**
- components/home/HomeEssentielContent.tsx
- components/home/pages/Page2ActionGrid.tsx
- components/WellnessCards.tsx

😊 **SOLUTION:**
Remplacer les gris clairs (#9CA3AF) par des couleurs avec meilleur contraste (#B4B8BF ou utiliser colors.textSecondary du thème).

📱 **CODE:**
```tsx
// AVANT
sectionTitle: {
  color: '#9CA3AF', // Gris trop clair
}

// APRÈS
sectionTitle: {
  color: colors.textSecondary, // Utiliser le thème
}
```

---

# 7. ONBOARDING ET PREMIER LANCEMENT

## 🎯 FLOW: Permissions HealthKit non demandées
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Le slide #8 d'onboarding promet la "Synchronisation Apple Health" mais les permissions ne sont JAMAIS demandées durant l'onboarding. L'utilisateur pense que c'est configuré, découvre plus tard que non, et doit aller dans Settings → Connexion Santé manuellement.

😊 **SOLUTION:**
Ajouter un écran de connexion HealthKit juste avant setup.tsx dans le flow d'onboarding.

📱 **CODE:**
```tsx
// CRÉER nouveau fichier: app/onboarding-health.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { Heart, ChevronRight, X } from 'lucide-react-native';
import { requestHealthPermissions } from '@/lib/healthKit';

export default function OnboardingHealthScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleConnect = async () => {
    try {
      await requestHealthPermissions();
      router.push('/setup');
    } catch (error) {
      // Si erreur, continuer quand même
      router.push('/setup');
    }
  };

  const handleSkip = () => {
    router.push('/setup');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: colors.accent + '20' }]}>
          <Heart size={64} color={colors.accent} fill={colors.accent} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Synchroniser avec Apple Santé
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          YOROI peut synchroniser tes données de poids, sommeil, pas et entraînements
          avec Apple Santé pour suivre ta progression sur tous tes appareils.
        </Text>

        <View style={styles.features}>
          <Text style={[styles.feature, { color: colors.textSecondary }]}>
            ✓ Synchronisation automatique des pesées
          </Text>
          <Text style={[styles.feature, { color: colors.textSecondary }]}>
            ✓ Import des données de sommeil
          </Text>
          <Text style={[styles.feature, { color: colors.textSecondary }]}>
            ✓ Export des entraînements vers Apple Watch
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: colors.accent }]}
          onPress={handleConnect}
        >
          <Text style={styles.connectButtonText}>
            Connecter à Apple Santé
          </Text>
          <ChevronRight size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>
            Plus tard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  icon: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  features: { gap: 12, marginBottom: 40 },
  feature: { fontSize: 14, lineHeight: 20 },
  buttons: { gap: 12, marginBottom: 20 },
  connectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  connectButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  skipButton: { alignItems: 'center', padding: 12 },
  skipButtonText: { fontSize: 14, fontWeight: '600' },
});
```

```tsx
// MODIFIER onboarding.tsx (ligne ~580)
// AVANT
router.replace('/mode-selection');

// APRÈS
router.push('/onboarding-health');
```

```tsx
// MODIFIER mode-selection.tsx (lignes ~120, ~135)
// Ajouter onboarding-health AVANT setup
router.push('/onboarding-health'); // Au lieu de /setup
```

---

## 🎯 FLOW: Genre obligatoire sans justification
**Sévérité:** 🟠 HAUTE

😤 **PROBLÈME UX:**
L'utilisateur DOIT choisir un genre (homme/femme) dans le setup d'onboarding mais aucune explication n'est donnée sur POURQUOI c'est nécessaire. Pas d'option "Autre" ou "Préfère ne pas dire".

😊 **SOLUTION:**
Ajouter un texte explicatif sous les boutons genre.

📱 **CODE:**
```tsx
// AJOUTER dans onboarding.tsx, étape 1 (ligne ~450)
<View style={styles.genderSection}>
  <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
    Ton genre
  </Text>

  <Text style={[styles.helpText, { color: colors.textMuted }]}> // ← AJOUTER
    Nécessaire pour personnaliser les calculs de composition corporelle,
    catégories de poids et objectifs nutritionnels.
  </Text>

  <View style={styles.genderButtons}>
    {/* Boutons homme/femme */}
  </View>
</View>

const styles = StyleSheet.create({
  // ... styles existants
  helpText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
});
```

---

## 🎯 FLOW: Pas de bouton "Retour" après mode-selection
**Sévérité:** 🔴 CRITIQUE

😤 **PROBLÈME UX:**
Une fois que l'utilisateur choisit "Mode Compétiteur" dans mode-selection.tsx, il NE PEUT PLUS revenir en arrière. S'il change d'avis ou réalise qu'il voulait "Mode Loisir", il doit compléter TOUT le flow (sport + catégorie + setup) avant de pouvoir changer en settings.

😊 **SOLUTION:**
Ajouter un bouton "Précédent" dans mode-selection.tsx, sport-selection.tsx et weight-category-selection.tsx.

📱 **CODE:**
```tsx
// AJOUTER dans mode-selection.tsx (ligne ~40)
<View style={styles.header}>
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => router.back()}
  >
    <ChevronLeft size={24} color={colors.accent} />
    <Text style={[styles.backText, { color: colors.accent }]}>
      Retour
    </Text>
  </TouchableOpacity>
</View>

// AJOUTER dans sport-selection.tsx
// Même pattern de bouton "Retour"

// AJOUTER dans weight-category-selection.tsx
// Même pattern de bouton "Retour"

const styles = StyleSheet.create({
  // ... styles existants
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 🎯 FLOW: Flow trop long pour compétiteurs (10+ écrans)
**Sévérité:** 🟡 MOYENNE

😤 **PROBLÈME UX:**
Un utilisateur "Compétiteur" doit passer par 10+ écrans avant d'arriver à l'app:
Legal → Onboarding (9 slides) → Mode → Sport → Catégorie Poids → Setup (Goal) → Setup (Welcome) → App

😊 **SOLUTION:**
Fusionner certaines étapes ou permettre de skip plus facilement.

📱 **SUGGESTION:**
```
Option 1 (Recommandé):
Legal → Onboarding (skip possible) → Mode + Sport (même écran) → Setup → App

Option 2:
Legal → Setup Express (nom + genre + mode + sport en 1 écran) → App
```

---

## 🎯 FLOW: Loading states manquants dans onboarding
**Sévérité:** 🟡 MOYENNE

😤 **PROBLÈME UX:**
Quand l'utilisateur sauvegarde son mode/sport, aucun feedback visuel. L'utilisateur peut taper le bouton plusieurs fois.

😊 **SOLUTION:**
Ajouter `isSubmitting` state avec ActivityIndicator sur les boutons de navigation.

📱 **CODE:**
```tsx
// mode-selection.tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSelectMode = async (mode: 'loisir' | 'competiteur') => {
  if (isSubmitting) return;

  setIsSubmitting(true);
  try {
    await setUserMode(mode);
    if (mode === 'competiteur') {
      router.push('/sport-selection');
    } else {
      router.push('/onboarding-health');
    }
  } catch (error) {
    Alert.alert('Erreur', 'Impossible de sauvegarder ton choix');
  } finally {
    setIsSubmitting(false);
  }
};

// Bouton avec loading
<TouchableOpacity
  disabled={isSubmitting}
  onPress={() => handleSelectMode('competiteur')}
>
  {isSubmitting ? (
    <ActivityIndicator size="small" color="#FFF" />
  ) : (
    <Text>Continuer</Text>
  )}
</TouchableOpacity>
```

---

# 📊 RÉSUMÉ DES PRIORITÉS

## 🔴 URGENT - À CORRIGER IMMÉDIATEMENT (Bloquants)

| # | Problème | Fichier | Impact | Temps |
|---|----------|---------|--------|-------|
| 1 | Boutons retour cassés (double if) | sleep.tsx, events.tsx, legal.tsx | Utilisateur bloqué | 15 min |
| 2 | useState entrelacés bugés | sleep.tsx | États corrompus | 5 min |
| 3 | Export sauvegarde silencieux | social-share/backup-step.tsx | Perte de données | 10 min |
| 4 | Onboarding 100% replace | legal→setup | Pas de retour | 30 min |
| 5 | Écran blanc planning | (tabs)/planning.tsx | UX cassée | 20 min |
| 6 | Écran blanc journal | training-journal.tsx | UX cassée | 20 min |
| 7 | Permissions HealthKit manquantes | onboarding flow | Promesse non tenue | 45 min |

**Total temps urgent:** ~2h30

---

## 🟠 IMPORTANT - À CORRIGER RAPIDEMENT

| # | Problème | Fichiers | Impact | Temps |
|---|----------|----------|--------|-------|
| 8 | Loading states manquants | 16 fichiers | Écrans figés | 2h |
| 9 | Keyboard.dismiss manquant | 6 formulaires | Clavier reste ouvert | 30 min |
| 10 | Boutons sans accessibilityLabel | 300+ composants | Inaccessible | 3h |
| 11 | Validation formulaires | 7 fichiers | Mauvaise UX | 2h |
| 12 | Messages erreur sans retry | 40+ occurrences | Frustration | 1h30 |
| 13 | Paramètres URL non validés | 5 écrans | Crashes possibles | 45 min |
| 14 | Boutons X trop petits | 21+ modales | Difficile à fermer | 1h |

**Total temps important:** ~11h

---

## 🟡 SOUHAITABLE - Améliorations UX

| # | Problème | Impact | Temps |
|---|----------|--------|-------|
| 15 | Genre sans justification | Confusion | 10 min |
| 16 | Flow onboarding trop long | Friction | 1h |
| 17 | Contrastes insuffisants | Lisibilité | 30 min |
| 18 | Messages en anglais (console) | Incohérence | 30 min |
| 19 | Empty states améliorer design | UX moyenne | 1h |

**Total temps souhaitable:** ~3h

---

# 🎯 PLAN D'ACTION RECOMMANDÉ

## Phase 1 - Correctifs Critiques (1 semaine)
1. Corriger les 3 bugs de navigation bloquants (sleep, events, legal)
2. Ajouter empty states aux 3 écrans critiques (planning, journal, graphique poids)
3. Corriger l'export de sauvegarde silencieux
4. Ajouter permissions HealthKit dans onboarding
5. Remplacer router.replace par router.push dans onboarding

## Phase 2 - Loading & Validation (1 semaine)
1. Ajouter loading states aux 16 fichiers problématiques
2. Ajouter Keyboard.dismiss aux 6 formulaires
3. Améliorer validation avec borderColor rouge + messages inline
4. Ajouter boutons "Réessayer" aux popups d'erreur

## Phase 3 - Accessibilité (1 semaine)
1. Ajouter accessibilityLabel aux composants UI de base
2. Ajouter hitSlop aux petits boutons
3. Augmenter taille des boutons X
4. Améliorer contrastes

## Phase 4 - Polish (optionnel)
1. Uniformiser messages console en français
2. Améliorer design des empty states
3. Optimiser flow onboarding
4. Valider tous les paramètres d'URL

---

# 📝 FICHIERS À CORRIGER (LISTE COMPLÈTE)

## Priorité 1 - Critiques
- app/sleep.tsx
- app/events.tsx
- app/legal.tsx
- app/(tabs)/planning.tsx
- app/training-journal.tsx
- app/social-share/backup-step.tsx
- app/onboarding.tsx
- app/mode-selection.tsx
- app/sport-selection.tsx
- app/weight-category-selection.tsx

## Priorité 2 - Importants
- app/(tabs)/index.tsx
- app/clubs.tsx
- app/add-club.tsx
- app/profile.tsx
- app/add-competition.tsx
- app/add-combat.tsx
- app/competitor-profile.tsx
- app/measurements.tsx
- app/body-composition.tsx
- app/fasting.tsx
- app/injury-detail.tsx
- app/training-goals.tsx
- app/combat-detail.tsx
- app/competition-detail.tsx
- app/composition-detail.tsx
- components/ui/DarkButton.tsx
- components/ui/GlassButton.tsx
- components/ui/GoldButton.tsx
- components/home/pages/Page1Monitoring.tsx
- components/home/pages/Page2ActionGrid.tsx
- components/AnimatedTabBar.tsx

---

**Audit réalisé par: Claude Sonnet 4.5**
**Date: 23 janvier 2026**
**Version app: 2.0.0**

---

## 🏁 CONCLUSION

L'application YOROI a une base solide mais présente **47 problèmes UX critiques** qui peuvent bloquer ou frustrer les utilisateurs. Les problèmes les plus graves sont:

1. **Navigation cassée** (3 écrans avec boutons retour non fonctionnels)
2. **Empty states manquants** (10 écrans blancs au premier lancement)
3. **Loading states absents** (16 fichiers sans feedback visuel)
4. **Accessibilité zéro** (300+ composants sans labels)

**Score actuel: 6.5/10**
**Score cible après corrections: 9/10**

Avec les corrections des phases 1 et 2 (environ 2 semaines de travail), l'app atteindra un niveau de qualité UX excellent et sera vraiment prête pour l'App Store.
