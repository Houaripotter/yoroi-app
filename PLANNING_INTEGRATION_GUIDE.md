# Guide d'intégration du nouveau Planning

## Ce qui a été fait

### 1. Base de données
- Ajout de 2 nouvelles colonnes à la table `trainings` :
  - `session_types` (TEXT) : Stocke un JSON array avec plusieurs types de séance
  - `technical_theme` (TEXT) : Thème technique pour JJB/MMA

### 2. Nouveaux composants créés

#### `hooks/useWeekSchedule.ts`
Hook qui récupère les entraînements groupés par jour de la semaine avec tous les détails :
- Heure de début et durée
- Types de séance (multi)
- Muscles travaillés ou thème technique
- Note personnalisée

#### `components/planning/ProgrammeView.tsx`
Vue "Emploi du Temps" professionnelle qui affiche :
- Toutes les séances de la semaine avec TOUS les détails visibles
- Heure + durée (ex: "18:00 - 19:30")
- Badge moment de la journée (MATIN/MIDI/SOIR)
- Nom du club + logo
- Types de séance (tags colorés)
- Muscles travaillés ou thème technique
- Note personnalisée
- Bouton REPOS rapide sur chaque jour
- Résumé hebdomadaire (X séances, ~Xh prévues)

#### `components/planning/EnhancedAddSessionModal.tsx`
Modal d'ajout amélioré avec :
- **Multi-sélection des muscles** (pour musculation)
- **Multi-sélection des types de séance** (pour JJB/MMA)
- **Champ personnalisé** pour ajouter ses propres muscles
- **Thème technique** avec suggestions (pour JJB/MMA)
- **Durée personnalisée** avec présets + option perso
- Détection automatique du sport pour adapter les options

#### `components/planning/EnhancedCalendarView.tsx`
Vue calendrier améliorée avec :
- **Cases plus grandes** (minHeight: 60)
- **Fond coloré selon l'intensité** (nombre de séances)
- **Logos clubs plus visibles**
- **Badge +N** si plus de 3 séances
- **Indicateur repos** (lune)
- **Bouton +** pour ajouter sur les jours vides

### 3. Fichier d'export
`components/planning/index.ts` : Exporte tous les composants

## Comment intégrer dans planning.tsx

### Étape 1 : Remplacer la vue calendrier

Trouver la section `viewMode === 'calendar'` (lignes 396-524) et remplacer par :

```tsx
{viewMode === 'calendar' ? (
  <>
    {/* MONTHLY STATS BY CLUB - COMPACT */}
    {monthlyClubStats.length > 0 && (
      <View style={[styles.monthlyStatsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <View style={styles.monthlyStatsHeader}>
          <TrendingUp size={16} color={colors.accent} />
          <Text style={[styles.monthlyStatsTitle, { color: colors.textPrimary }]}>Ce mois</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthlyStatsScroll}>
          {monthlyClubStats.map(({ count, club }) => {
            const display = getClubDisplay(club);
            return (
              <View key={club.id} style={styles.monthlyStatItem}>
                <View style={[styles.monthlyStatIcon, { backgroundColor: display.type === 'color' ? `${display.color}20` : colors.backgroundElevated }]}>
                  {display.type === 'image' ? (
                    <Image source={display.source} style={styles.clubLogoSmall} />
                  ) : (
                    <View style={[styles.clubColorDot, { backgroundColor: display.color }]} />
                  )}
                </View>
                <Text style={[styles.monthlyStatCount, { color: club.color || colors.accent }]}>{count}</Text>
                <Text style={[styles.monthlyStatName, { color: colors.textSecondary }]} numberOfLines={1}>{club.name}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    )}

    {/* NOUVEAU CALENDRIER AMÉLIORÉ */}
    <EnhancedCalendarView
      currentMonth={currentMonth}
      workouts={workouts}
      clubs={clubs}
      onMonthChange={setCurrentMonth}
      onDayPress={handleDayPress}
      selectedDate={selectedDate}
    />
  </>
) : viewMode === 'programme' ? (
```

### Étape 2 : Remplacer la vue programme

Trouver la section `viewMode === 'programme'` (lignes 525-623) et remplacer par :

```tsx
) : viewMode === 'programme' ? (
  <ProgrammeView
    onAddSession={handleAddSessionFromProgramme}
    onSessionPress={handleSessionPress}
    onToggleRest={handleToggleRest}
  />
) : viewMode === 'clubs' ? (
```

### Étape 3 : Utiliser le nouveau modal (OPTIONNEL)

Si tu veux utiliser le nouveau modal d'ajout amélioré, remplace dans la section des modals (ligne 1010+) :

```tsx
{/* ANCIEN MODAL */}
<AddSessionModal
  visible={showAddModal}
  date={selectedDate}
  clubs={clubs}
  onClose={() => setShowAddModal(false)}
  onSave={handleSaveSession}
/>

{/* PAR LE NOUVEAU MODAL AMÉLIORÉ */}
<EnhancedAddSessionModal
  visible={showAddModal}
  date={selectedDate}
  clubs={clubs}
  onClose={() => setShowAddModal(false)}
  onSave={handleSaveSession}
/>
```

## Points à tester

### 1. Vue Programme
- [ ] Affichage de toutes les séances avec détails complets
- [ ] Badge moment de la journée (MATIN/MIDI/SOIR)
- [ ] Logos des clubs visibles
- [ ] Résumé hebdomadaire correct (nombre de séances + heures)
- [ ] Bouton repos (alerte pour l'instant, à implémenter complètement)

### 2. Vue Calendrier
- [ ] Cases plus grandes et lisibles
- [ ] Fond coloré selon l'intensité (1 séance = vert léger, 3+ = vert fort)
- [ ] Logos clubs visibles
- [ ] Badge +N si plus de 3 séances
- [ ] Navigation entre les mois

### 3. Modal d'ajout amélioré
- [ ] Multi-sélection des muscles (musculation)
- [ ] Multi-sélection des types de séance (combat)
- [ ] Champ personnalisé pour ajouter un muscle
- [ ] Thème technique avec suggestions (JJB/MMA)
- [ ] Présets de durée + option personnalisée
- [ ] Sauvegarde correcte dans la base de données

### 4. Affichage des données
- [ ] Les anciennes séances s'affichent correctement
- [ ] Les nouvelles séances avec muscles multiples s'affichent
- [ ] Les séances avec thème technique s'affichent

## Améliorations futures

1. **Fonction Repos**
   - Créer une table `rest_days` pour stocker les jours de repos
   - Ajouter un indicateur visuel sur le calendrier et la vue programme

2. **Slider personnalisé**
   - Installer `@react-native-community/slider`
   - Intégrer dans le modal pour la durée personnalisée

3. **Édition de séance**
   - Créer un modal d'édition basé sur le modal d'ajout
   - Permettre de modifier une séance existante

4. **Filtres**
   - Filtrer par club
   - Filtrer par type de séance
   - Recherche de thème technique

## Notes techniques

- Tous les composants utilisent le `ThemeContext` pour les couleurs
- Les animations utilisent `react-native-reanimated`
- Les icônes proviennent de `lucide-react-native`
- Le hook `useWeekSchedule` centralise la logique de récupération des données
- Les nouvelles colonnes sont compatibles avec les anciennes données (migration automatique)

## En cas de problème

1. **Erreur d'import** : Vérifier que le fichier `components/planning/index.ts` existe
2. **Données non affichées** : Vérifier que la base de données a bien été mise à jour (relancer l'app)
3. **Types TypeScript** : Vérifier que l'interface `Training` dans `lib/database.ts` a bien les nouveaux champs
4. **Hook non trouvé** : Vérifier que `hooks/useWeekSchedule.ts` existe

## Structure des fichiers créés

```
/Users/houari/Downloads/yoroi_app/
├── hooks/
│   └── useWeekSchedule.ts                      ← Hook de gestion des données
├── components/
│   └── planning/
│       ├── index.ts                            ← Export des composants
│       ├── ProgrammeView.tsx                   ← Vue Emploi du Temps
│       ├── EnhancedAddSessionModal.tsx         ← Modal d'ajout amélioré
│       └── EnhancedCalendarView.tsx            ← Vue Calendrier améliorée
└── lib/
    └── database.ts                             ← Mis à jour avec nouvelles colonnes
```

Tout est prêt ! Il suffit maintenant de tester et d'ajuster si nécessaire.
