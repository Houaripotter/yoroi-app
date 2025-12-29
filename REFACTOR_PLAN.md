# Plan de Refactoring pour le Tri Dynamique

## Approche simplifiée

Au lieu de migrer 1000+ lignes de code, on va :

1. **Créer un objet `sectionComponents`** qui mappe chaque ID de section à son JSX
2. **Rendre les sections dans l'ordre** en faisant `sortedSections.map(s => sectionComponents[s.id])`
3. **Garder tout le code existant** mais juste l'organiser différemment

## Étapes

1. Supprimer le mode guerrier actuel qui est cassé (lignes 678-1280 environ)
2. Créer l'objet sectionComponents avec toutes les sections
3. Faire le rendu dynamique: `sortedSections.map(s => sectionComponents[s.id])`
4. Tester !

## Estimation : 30 minutes de travail
