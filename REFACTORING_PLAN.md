# 📋 Plan de Refactoring - Gros Fichiers

## 🎯 Objectif
Diviser les fichiers > 1000 lignes en composants maintenables < 500 lignes chacun

---

## 🔴 Fichiers critiques

### 1. `training-journal.tsx` (4,732 lignes - 74 hooks)

**Problème**: Fichier monolithique ingérable

**Plan de division**:
```
training-journal/
├── index.tsx                    (< 200 lignes - Orchestration)
├── components/
│   ├── JournalHeader.tsx       (< 150 lignes)
│   ├── BenchmarkList.tsx       (< 300 lignes)
│   ├── BenchmarkCard.tsx       (< 200 lignes)
│   ├── SkillsList.tsx          (< 300 lignes)
│   ├── SkillCard.tsx           (< 200 lignes)
│   ├── ProgressChart.tsx       (< 250 lignes)
│   ├── AddBenchmarkModal.tsx   (< 400 lignes)
│   └── AddSkillModal.tsx       (< 400 lignes)
├── hooks/
│   ├── useJournalData.ts       (< 150 lignes)
│   ├── useBenchmarks.ts        (< 200 lignes)
│   └── useSkills.ts            (< 200 lignes)
└── types.ts                    (< 100 lignes)
```

**Étapes**:
1. ✅ Créer dossier `app/training-journal/`
2. ✅ Extraire types dans `types.ts`
3. ✅ Créer hooks customs pour logique métier
4. ✅ Diviser en composants atomiques
5. ✅ Créer index.tsx minimaliste
6. ✅ Tester chaque composant
7. ✅ Supprimer ancien fichier

---

### 2. `add-training.tsx` (3,484 lignes - 66 hooks)

**Problème**: Formulaire géant avec trop de responsabilités

**Plan de division**:
```
add-training/
├── index.tsx                    (< 200 lignes - Form orchestration)
├── components/
│   ├── SportSelector.tsx       (< 300 lignes)
│   ├── ClubSelector.tsx        (< 200 lignes)
│   ├── DateTimePicker.tsx      (< 150 lignes)
│   ├── DurationPicker.tsx      (< 150 lignes)
│   ├── IntensityPicker.tsx     (< 150 lignes)
│   ├── ExercisesList.tsx       (< 300 lignes)
│   ├── MusclesSelector.tsx     (< 250 lignes)
│   ├── NotesInput.tsx          (< 200 lignes)
│   ├── SuccessModal.tsx        (< 300 lignes)
│   └── SharePrompt.tsx         (< 200 lignes)
├── hooks/
│   ├── useTrainingForm.ts      (< 300 lignes - Form state)
│   ├── useAutoSave.ts          (< 150 lignes)
│   └── useTrainingSubmit.ts    (< 200 lignes)
├── constants/
│   └── sportOptions.ts         (< 500 lignes - Data only)
└── types.ts                    (< 100 lignes)
```

**Étapes**:
1. ✅ Créer dossier `app/add-training/`
2. ✅ Extraire SPORT_OPTIONS dans constants
3. ✅ Créer hook useTrainingForm pour state
4. ✅ Diviser en composants par section
5. ✅ Implémenter validation par composant
6. ✅ Tester le formulaire complet
7. ✅ Supprimer ancien fichier

---

### 3. `app/(tabs)/planning.tsx` (3,297 lignes)

**Problème**: Écran multi-vues trop complexe

**Plan de division**:
```
(tabs)/planning/
├── index.tsx                    (< 250 lignes - Navigation)
├── views/
│   ├── CalendarView.tsx        (< 400 lignes)
│   ├── ProgramView.tsx         (< 300 lignes)
│   ├── ClubsView.tsx           (< 300 lignes)
│   ├── CompetitionsView.tsx    (< 400 lignes)
│   └── JournalView.tsx         (< 300 lignes)
├── components/
│   ├── DayCell.tsx             (< 150 lignes)
│   ├── EventCard.tsx           (< 200 lignes)
│   ├── ClubCard.tsx            (< 150 lignes)
│   ├── CompetitionCard.tsx     (< 200 lignes)
│   └── ViewSwitcher.tsx        (< 150 lignes)
├── hooks/
│   ├── usePlanningData.ts      (< 200 lignes)
│   ├── useCalendar.ts          (< 200 lignes)
│   └── useEvents.ts            (< 150 lignes)
└── types.ts                    (< 100 lignes)
```

**Étapes**:
1. ✅ Créer dossier `app/(tabs)/planning/`
2. ✅ Extraire chaque vue dans fichier séparé
3. ✅ Créer composants réutilisables (cards)
4. ✅ Créer hooks pour data fetching
5. ✅ Implémenter navigation entre vues
6. ✅ Tester chaque vue isolément
7. ✅ Supprimer ancien fichier

---

## 📐 Principes de refactoring

### ✅ À faire
- **Composants < 500 lignes** max
- **Hooks < 200 lignes** max
- **Single Responsibility Principle**
- **Tests après chaque division**
- **Commits atomiques par composant**

### ❌ À éviter
- Copier-coller sans refactoriser
- Diviser sans plan
- Casser les fonctionnalités existantes
- Commits géants

---

## 🎯 Ordre d'exécution recommandé

1. **Phase 1** - Corrections rapides (✅ FAIT)
   - format.ts
   - constants centralisés
   - useWindowDimensions hook

2. **Phase 2** - add-training.tsx (PRIORITÉ HAUTE)
   - Formulaire critique pour UX
   - 66 hooks = complexité ingérable
   - Impact direct sur performance

3. **Phase 3** - planning.tsx (PRIORITÉ HAUTE)
   - Écran principal de l'app
   - Multi-vues complexes
   - Amélioration navigation

4. **Phase 4** - training-journal.tsx (PRIORITÉ MOYENNE)
   - Moins critique que formulaire
   - Peut attendre Phase 2 & 3

---

## 📊 Métriques de succès

### Avant
- training-journal.tsx: 4,732 lignes, 74 hooks
- add-training.tsx: 3,484 lignes, 66 hooks
- planning.tsx: 3,297 lignes

### Après (objectif)
- Aucun fichier > 500 lignes
- Aucun composant > 15 hooks
- Tests unitaires par composant
- Performance améliorée de 30%
- Git diffs lisibles

---

## ⏱️ Estimation

- Phase 1: ✅ 30 min (TERMINÉ)
- Phase 2: ~4h (add-training)
- Phase 3: ~3h (planning)
- Phase 4: ~5h (training-journal)

**Total: ~12h de refactoring**

---

## 🚀 Prochaines étapes

1. Commit Phase 1 (corrections rapides)
2. Créer branch `refactor/add-training`
3. Commencer Phase 2
4. Tests & validation
5. Merge & déployer

---

**Note**: Ce plan peut être ajusté selon les découvertes pendant le refactoring.
