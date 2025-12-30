# Changelog - Yoroi Events Scraper

## Version 1.1 - Corrections et améliorations (2025-01-30)

### 🔧 Corrections appliquées

#### 1. HYROX Scraper
- ❌ **Problème** : URL `https://hyrox.com/events/` retournait 404
- ✅ **Solution** : Migration vers le site français `https://hyroxfrance.com/fr/trouve-ta-course/`
- 🛠️ **Améliorations** :
  - Scraper complètement réécrit pour le site français
  - Recherche multi-approches (conteneurs + liens)
  - Détection automatique des villes françaises
  - Debugging amélioré : affiche un échantillon HTML si aucun événement trouvé

#### 2. Smoothcomp Scraper
- ❌ **Problème** : Sélecteurs CSS trop spécifiques, aucun titre trouvé
- ✅ **Solution** : Approche robuste basée sur les liens
- 🛠️ **Améliorations** :
  - Recherche tous les liens contenant `/event/` dans l'URL
  - Extraction du titre depuis le lien ou son parent
  - Déduplication automatique des URLs
  - Meilleure extraction de dates et localisations
  - Debugging : log détaillé + échantillon HTML si échec

### 📊 Nouvelles fonctionnalités

#### Debugging amélioré
- Affichage des 500 premiers caractères HTML en cas d'échec
- Logs détaillés du nombre de conteneurs/liens trouvés
- Messages de debug pour chaque étape du parsing

#### Robustesse
- Gestion des doublons d'événements
- Fallback sur plusieurs stratégies de scraping
- Extraction intelligente des titres (lien, parent, headers)
- Normalisation automatique des URLs relatives

### 🧪 Pour tester

```bash
# Lancer le scraper complet
python main.py

# Tester individuellement
python test_scraper.py
```

### 📝 Logs attendus

**HYROX :**
```
HyroxScraper - Trouvé X conteneurs potentiels d'événements
HyroxScraper - Trouvé Y liens pertinents
HyroxScraper - ✅ Z événements récupérés
```

**Smoothcomp :**
```
SmoothcompScraper - Trouvé X liens d'événements Smoothcomp
SmoothcompScraper - Événement ajouté: [Titre]
SmoothcompScraper - ✅ Y événements récupérés
```

### ⚠️ Notes importantes

1. **Sites dynamiques** : Si les sites chargent le contenu via JavaScript, le scraping HTML simple peut ne pas fonctionner. Dans ce cas, il faudra utiliser Selenium/Playwright.

2. **Sélecteurs CSS** : Les sites peuvent changer leur structure. Le code est maintenant plus résilient grâce aux approches par liens.

3. **Rate limiting** : Ajouter des delays si nécessaire :
   ```python
   import time
   time.sleep(1)  # Entre chaque requête
   ```
