# 🏃 Scrapers Yoroi - Courses Running/Trail

Ce dossier contient les scrapers pour récupérer les événements sportifs.

## Installation

```bash
# Installer les dépendances
pip3 install -r requirements.txt

# Installer Playwright browsers (si besoin)
playwright install chromium
```

## Utilisation

### Scraper Simple (BeautifulSoup)
```bash
python3 running_scraper.py
```

Ce scraper récupère les courses depuis :
- Finishers.com
- Jogging-Plus.com
- BeTrail.run

Génère un fichier `running_races.json` avec toutes les courses.

### Format de sortie

```json
{
  "id": "finishers_0",
  "title": "Marathon de Paris 2026",
  "date_start": "2026-04-05",
  "location": {
    "city": "Paris",
    "country": "France",
    "full_address": ""
  },
  "category": "endurance",
  "sport_tag": "marathon",
  "registration_link": "https://...",
  "federation": "Finishers",
  "image_logo_url": null
}
```

## Ajouter les données dans l'app

1. Lancer le scraper pour générer `running_races.json`
2. Copier le contenu dans `src/data/events.json` (merger avec les événements existants)
3. Relancer l'app - les nouveaux événements seront importés automatiquement

## Notes

- Le scraper respecte un délai de 1 seconde entre chaque site (rate limiting)
- Les erreurs sont gérées - si un site est down, les autres continuent
- Pour des sites avec JavaScript dynamique, utiliser Playwright (script avancé à venir)
