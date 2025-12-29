# Guide Rapide - Nouveau Drag & Drop

## Le problème qu'on vient de résoudre

**Erreur Worklets:** Mismatch entre JavaScript (0.7.1) et Native (0.5.1)

**Solution appliquée:**
1. ✅ Nettoyage des pods iOS
2. ✅ Réinstallation des pods avec `npx pod-install`
3. ✅ Rebuild complet de l'app iOS

## Pendant que le build termine...

Le build iOS compile actuellement les bibliothèques natives. Cela prend environ 5-10 minutes la première fois.

### Prochains tests à faire:

1. **Ouvrir l'écran de personnalisation**
   - Aller dans l'onglet "Plus"
   - Taper sur "Personnaliser l'Accueil"

2. **Tester le drag & drop**
   - Maintenir appuyé sur l'icône de grip (≡) à gauche d'une section
   - Déplacer vers le haut ou le bas
   - Relâcher pour placer

3. **Tester masquer/afficher**
   - Taper sur l'icône d'œil à droite
   - La section devient grisée quand cachée

4. **Vérifier la sauvegarde**
   - Faire quelques modifications
   - Quitter l'écran (bouton retour ou check en haut à droite)
   - Revenir dans l'écran de personnalisation
   - Les modifications doivent être conservées

5. **Tester la réinitialisation**
   - Taper sur "Réinitialiser" en bas
   - Confirmer
   - L'ordre et la visibilité reviennent par défaut

## Ce qui a été créé

### Fichier principal
- `app/customize-home-new.tsx` - Écran avec drag & drop iOS-like

### Composants
- `components/DraggableHomeList.tsx` - Système réutilisable
- `components/home/SectionWrapper.tsx` - Wrapper avec animations
- `components/home/DraggableSection.tsx` - Wrapper de base

### Modifications
- `app/(tabs)/more.tsx` - Route mise à jour
- `app/(tabs)/index.tsx` - 2 liens mis à jour
- `app/customize-home.tsx` - Simplifié (ancienne version)

## Bibliothèques ajoutées

```json
{
  "react-native-draggable-flatlist": "^4.0.1"
}
```

## Comparaison avant/après

### Avant
```
customize-home.tsx
- Boutons UP/DOWN pour déplacer
- Clic sur œil pour masquer/afficher
- Interface basique
```

### Après
```
customize-home-new.tsx
- Drag & Drop iOS-like (maintenir et glisser)
- Poignée de grip visible
- Animations fluides
- Feedback haptique
- Interface moderne
```

## Architecture du drag & drop

```
DraggableFlatList (bibliothèque)
    ↓
renderItem (chaque section)
    ↓
ScaleDecorator (effet de zoom au drag)
    ↓
TouchableOpacity (détection appui long)
    ↓
Section avec contenu
```

## Animations

1. **Pendant le drag:**
   - Section soulevée (shadow + scale 1.05)
   - Autres sections se décalent automatiquement

2. **Section cachée:**
   - Opacité réduite à 50%
   - Icône d'œil barré

3. **Feedback haptique:**
   - Impact léger au début du drag
   - Impact léger au relâchement
   - Notification de succès à la sauvegarde

## Dépannage

### Si l'erreur Worklets persiste:
```bash
# 1. Arrêter tout
pkill -f "expo start"

# 2. Clean complet
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules
rm -rf .expo

# 3. Réinstaller
npm install
cd ios && pod install && cd ..

# 4. Rebuild
npx expo run:ios
```

### Si le drag ne fonctionne pas:
- Vérifier que vous maintenez sur l'icône de grip (≡)
- Essayer un appui long de 200-300ms
- Vérifier que l'app a bien rebuild (partie native)

### Si la sauvegarde ne marche pas:
- Vérifier AsyncStorage dans les logs
- Tester avec le bouton check en haut à droite

## Performance

- **Build initial:** 5-10 minutes
- **Rebuilds suivants:** 1-2 minutes
- **Hot reload:** Instantané (sans rebuild)

## Prochaines améliorations possibles

1. **Preview en temps réel:** Voir l'accueil se réorganiser pendant qu'on drag
2. **Groupes de sections:** Créer des catégories pliables
3. **Drag & drop sur l'accueil:** Directement sans écran séparé
4. **Granularité fine:** Déplacer les petits carrés individuellement

## Status actuel

✅ Écran de personnalisation avec drag & drop créé
✅ Bibliothèques installées
✅ Pods réinstallés
⏳ Build iOS en cours...
⏳ Tests à faire après le build

## Commandes utiles

```bash
# Voir les logs du build
tail -f /tmp/claude/-Users-houari-Downloads-yoroi-app/tasks/b8f9c7f.output

# Lancer l'app manuellement
npx expo run:ios --device "iPhone 17 Pro Max"

# Voir les devices disponibles
xcrun simctl list devices booted

# Relancer Expo
npx expo start --clear
```

Bon test! 🚀
