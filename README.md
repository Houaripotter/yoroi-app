# Yoroi Events Scraper

Scraper automatique d'événements sportifs pour l'application mobile **Yoroi**.

Extrait les événements de **Combat** (JJB, Grappling) et **Endurance** (HYROX, Marathon, Running, Trail) depuis 5 sources mondiales.

---

## 🎯 Vue d'ensemble

**Version** : 1.6 (Production-Ready - FINAL)

**Total événements** : **1,873** événements mondiaux

**Couverture** : 83+ pays/régions

**Performance** : ~20 secondes

---

## 📊 Sources et statistiques

| Source | Événements | Sports | Yield | Technologie |
|--------|-----------|--------|-------|-------------|
| **Smoothcomp** | 1,467 | JJB, Grappling | ~100% | Playwright |
| **IBJJF** | 282 | JJB | 100% | Playwright |
| **HYROX France** | 55 | HYROX | 100% | requests |
| **Ahotu** | 69 | Marathon, Running, Trail | 100% | Playwright |
| **CFJJB** | 0 | JJB | Inactive | Placeholder |
| **TOTAL** | **1,873** | **6 sports** | **100%** | Mixed |

---

## 🏆 Sports couverts

### Combat (1,749 événements)

- 🥋 **JJB** (Jiu-Jitsu Brésilien) : 1,264 événements (Smoothcomp: 982, IBJJF: 282)
- 🤼 **Grappling** : 485 événements

### Endurance (124 événements)

- 🏃 **HYROX** : 55 événements
- 🏃 **Running** (5k, 10k, Semi) : 39 événements
- 🏃 **Marathon** : 25 événements
- ⛰️ **Trail** : 5 événements

---

## 🚀 Installation rapide

### Prérequis

- Python 3.8+
- pip

### Étapes

```bash
# 1. Cloner/Accéder au dossier
cd /Users/houari/Desktop/APP_Houari/yoroi-events-scraper

# 2. Installer les dépendances (Playwright + Chromium)
./install_playwright.sh

# 3. Lancer le scraper
./clean_and_run.sh
```

**Résultat** : `output/events.json` avec 1,594 événements

---

## 📦 Structure du projet

```
yoroi-events-scraper/
├── scrapers/
│   ├── base_scraper.py          # Classe abstraite
│   ├── hyrox_scraper.py         # HYROX France (requests)
│   ├── smoothcomp_scraper.py    # JJB/Grappling (Playwright)
│   ├── ibjjf_scraper.py         # IBJJF JJB (Playwright) ✨ NEW v1.6
│   ├── cfjjb_scraper.py         # CFJJB placeholder ✨ NEW v1.6
│   └── running_scraper.py       # Marathon/Running/Trail (Playwright)
├── models/
│   └── event.py                 # Modèle Pydantic
├── utils/
│   ├── logger.py                # Logging
│   └── helpers.py               # Utilitaires
├── output/
│   └── events.json              # JSON généré (1,873 événements)
├── config.py                    # Configuration
├── main.py                      # Point d'entrée
├── requirements.txt             # Dépendances Python
├── install_playwright.sh        # Script d'installation
├── clean_and_run.sh             # Nettoyage cache + lancement
└── verify_ibjjf.py              # Script de vérification ✨ NEW v1.6
```

---

## 📄 Format JSON

Chaque événement suit ce format (compatible app Yoroi) :

```json
{
  "id": "uuid",
  "title": "HYROX Paris",
  "date_start": "2025-03-15",
  "location": {
    "city": "Paris",
    "country": "France",
    "full_address": "Paris, France"
  },
  "category": "endurance",
  "sport_tag": "hyrox",
  "registration_link": "https://hyroxfrance.com/fr/event/hyrox-paris/",
  "federation": "HYROX",
  "image_logo_url": "https://hyroxfrance.com/.../paris.jpg"
}
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Identifiant unique |
| `title` | string | Nom de l'événement |
| `date_start` | string (ISO) | Date de début (YYYY-MM-DD) |
| `location` | object | Ville, pays, adresse complète |
| `category` | "combat" \| "endurance" \| "force" | Catégorie principale |
| `sport_tag` | "jjb" \| "grappling" \| "hyrox" \| "marathon" \| "running" \| "trail" | Tag pour filtres app |
| `registration_link` | string (URL) | Lien d'inscription |
| `federation` | string \| null | Fédération organisatrice (optionnel) |
| `image_logo_url` | string (URL) \| null | Logo de l'événement (optionnel) |

---

## ⚙️ Configuration

### `config.py`

```python
# URLs des sources
HYROX_URL = "https://hyroxfrance.com/fr/trouve-ta-course/"
SMOOTHCOMP_URL = "https://smoothcomp.com/en/events/upcoming"
# Ahotu URL est dans running_scraper.py

# User-Agent
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."

# Output
OUTPUT_FILE = "output/events.json"
```

---

## 🔧 Architecture technique

### 1. HYROX Scraper (requests)

- **Technologie** : requests + BeautifulSoup
- **Vitesse** : ~1 seconde
- **Stratégie** : Parsing direct des liens `/event/`
- **Extraction** : Titre, ville (depuis titre), pays (mapping), images
- **Limitation** : Dates par défaut (+90 jours) - dates réelles nécessitent scraping page par page

### 2. Smoothcomp Scraper (Playwright)

- **Technologie** : Playwright (headless Chromium) + BeautifulSoup
- **Vitesse** : ~8 secondes
- **Raison Playwright** : Bypass Cloudflare anti-bot
- **Stratégies** :
  1. Extraction `__NEXT_DATA__` (Next.js)
  2. Parsing HTML après rendu JavaScript
- **Couverture** : 1,470 événements JJB/Grappling mondiaux

### 3. Running Scraper (Playwright)

- **Technologie** : Playwright + BeautifulSoup
- **Vitesse** : ~5 secondes
- **Source** : Ahotu.com (calendrier mondial)
- **Catégorisation intelligente** :
  - "Trail" si titre contient "trail"
  - "Marathon" si "marathon" (sans "half"/"semi")
  - "Running" si "half", "semi", "10k", "5k"
- **Couverture** : 69 événements (Marathon, Running, Trail)

---

## 🎨 Catégorisation des événements

### Logique `sport_tag`

```python
# Trail (priorité absolue)
if 'trail' in title.lower():
    sport_tag = "trail"

# Marathon (mais pas semi)
elif 'marathon' in title.lower() and 'half' not in title.lower():
    sport_tag = "marathon"

# Running (semi, 10k, 5k)
elif any(kw in title.lower() for kw in ['half', 'semi', '10k', '5k']):
    sport_tag = "running"

# Grappling vs JJB
elif any(kw in title.lower() for kw in ['grappling', 'adcc', 'submission']):
    sport_tag = "grappling"

else:
    sport_tag = "jjb"  # Par défaut pour Smoothcomp
```

---

## 📊 Qualité des données

| Métrique | Valeur | Taux |
|----------|--------|------|
| **Images** | 1,651 / 1,873 | 88% |
| **Liens d'inscription** | 1,873 / 1,873 | 100% |
| **Données de localisation** | 1,873 / 1,873 | 100% |
| **Tags de fédération** | 337 / 1,873 | 18% |

---

## 🌍 Couverture géographique

**83 pays/régions** couverts

### Top 15 pays

| Rang | Pays | Événements |
|------|------|-----------|
| 1 | 🇺🇸 United States | 657 |
| 2 | 🇬🇧 United Kingdom | 121 |
| 3 | 🇦🇺 Australia | 117 |
| 4 | 🇨🇦 Canada | 66 |
| 5 | 🇸🇪 Sweden | 44 |
| 6 | 🇳🇿 New Zealand | 44 |
| 7 | 🇩🇪 Germany | 38 |
| 8 | 🇳🇴 Norway | 32 |
| 9 | 🇮🇪 Ireland | 29 |
| 10 | 🇵🇹 Portugal | 28 |
| 11 | 🇪🇸 Spain | 27 |
| 12 | 🇫🇷 France | 25 |
| 13 | 🇳🇱 Netherlands | 24 |
| 14 | 🇧🇷 Brazil | 22 |
| 15 | 🇧🇪 Belgium | 18 |

---

## 🚀 Utilisation

### Commande simple

```bash
./clean_and_run.sh
```

### Vérifier le résultat

```bash
# Compter les événements
cat output/events.json | jq '. | length'

# Événements par sport
cat output/events.json | jq 'group_by(.sport_tag) | map({sport: .[0].sport_tag, count: length})'

# Événements de Marathon uniquement
cat output/events.json | jq '[.[] | select(.sport_tag == "marathon")]'
```

---

## 📖 Documentation détaillée

| Document | Description |
|----------|-------------|
| `README.md` | Ce fichier (vue d'ensemble) |
| `QUICK_START_V1.3.md` | Guide rapide (3 minutes) |
| `VERSION_1.3_PLAYWRIGHT.md` | Migration Playwright (Smoothcomp) |
| `VERSION_1.4_FINAL.md` | Fix HYROX (55 événements) |
| `VERSION_1.5_RUNNING.md` | Integration Running/Trail (69 événements) |
| `VERSION_1.6_FINAL.md` | **Integration IBJJF/CFJJB (282 événements) - FINAL** |

---

## 🐛 Troubleshooting

### Erreur "playwright not found"

```bash
pip3 install --break-system-packages playwright
python3 -m playwright install chromium
```

### Le scraper retourne < 1000 événements

Vérifier les logs :

```bash
python3 main.py 2>&1 | grep -E "(ERROR|WARNING|✅)"
```

### Timeout Playwright

Augmenter le timeout dans les scrapers (ligne `page.goto(..., timeout=30000)`) :

```python
page.goto(URL, wait_until='networkidle', timeout=60000)  # 60s
```

---

## 🔮 Évolutions futures possibles

1. **Plus d'événements Ahotu** : Pagination pour obtenir 200-300 événements Running/Trail
2. **Dates réelles HYROX** : Scraper chaque page individuelle (actuellement : +90 jours par défaut)
3. **Nouvelles sources** :
   - CrossFit : CrossFit Games API
   - MMA : Tapology, Sherdog
   - Triathlon : Ironman.com
4. **API REST** : Flask/FastAPI wrapper pour l'app mobile
5. **Cron job** : Automatiser le scraping (1x/jour)
6. **Cache intelligent** : Ne scraper que les nouveaux événements
7. **Webhook** : Notifier l'app quand de nouveaux événements sont disponibles

---

## 📜 Licence

Privé - Usage interne pour l'application Yoroi

---

## 👤 Auteur

Développé pour l'application mobile **Yoroi** (React Native + Expo)

---

## ✅ Statut

```
┌────────────────────────────────────────────────┐
│  YOROI EVENTS SCRAPER - VERSION 1.6 FINAL      │
│  ✅ PRODUCTION-READY                           │
│  📊 1,873 événements                           │
│  🌍 83+ pays                                   │
│  ⚡ 20 secondes                                │
│  🏆 5 sources (HYROX, Smoothcomp, IBJJF,       │
│     CFJJB, Running/Trail)                      │
│  🎯 Prêt pour intégration app                  │
└────────────────────────────────────────────────┘
```

---

**Dernière mise à jour** : 30 Décembre 2024 (v1.6 FINAL)
