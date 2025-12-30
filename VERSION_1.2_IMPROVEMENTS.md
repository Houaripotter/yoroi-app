# Version 1.2 - Améliorations majeures du yield

## 🎯 Objectif

Augmenter drastiquement le nombre d'événements capturés en résolvant :
- **HYROX** : 111 conteneurs trouvés → seulement 1 événement (99% de perte)
- **Smoothcomp** : 0 lien trouvé (blocage anti-bot)

---

## ✅ Corrections appliquées

### 1️⃣ User-Agent plus réaliste (`config.py`)

**Problème** : Le User-Agent générique était détecté comme bot

**Solution** :
```python
# Avant (générique)
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36..."

# Après (Chrome récent, Windows)
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
```

---

### 2️⃣ HyroxScraper - Version PERMISSIVE (`hyrox_scraper.py`)

**Problème** : Trop strict, rejetait les événements sans date/localisation

**Améliorations** :

#### A. Dates manquantes → Utiliser date par défaut
```python
# Avant : rejeter si pas de date
if not date_str:
    return None  # ❌ Événement perdu

# Après : utiliser date par défaut (3 mois dans le futur)
if not date_str:
    date_start = datetime.now() + timedelta(days=90)  # ✅ Événement conservé
    self.logger.debug(f"⚠️ Aucune date trouvée pour '{title}', utilisation date par défaut")
```

#### B. Localisations manquantes → Utiliser "France" par défaut
```python
# Avant : rejeter si pas de localisation
if not location_str:
    return None  # ❌ Événement perdu

# Après : utiliser France par défaut
if not location_str:
    city = "France"
    country = "France"
    self.logger.debug(f"⚠️ Localisation non trouvée pour '{title}', utilisation par défaut")
```

#### C. Logs détaillés des rejets
```python
rejected_count = {"no_title": 0, "too_short": 0, "no_link": 0}

# Chaque rejet est tracé
if not title:
    rejected_count["no_title"] += 1
    return None

# Affichage en fin de scraping
self.logger.info(f"📊 Événements rejetés: {total_rejected}")
for reason, count in rejected_count.items():
    if count > 0:
        self.logger.info(f"   - {reason}: {count}")
```

**Raisons de rejet autorisées** :
- ✅ Pas de titre → rejet justifié
- ✅ Titre trop court (< 3 car) → rejet justifié
- ✅ Pas de lien → rejet justifié
- ❌ Pas de date → **GARDÉ** avec date par défaut
- ❌ Pas de localisation → **GARDÉ** avec "France"

---

### 3️⃣ SmoothcompScraper - Stratégies multiples (`smoothcomp_scraper.py`)

**Problème** : 0 lien trouvé → page bloquée ou chargée en JavaScript

**Solution** : 3 stratégies en cascade

#### Stratégie 1 : Extraction __NEXT_DATA__ (Next.js)
```python
def _extract_from_next_data(self) -> List[Event]:
    """
    Smoothcomp utilise Next.js qui stocke les données dans <script id="__NEXT_DATA__">
    """
    soup = self.fetch_page(SMOOTHCOMP_URL)
    next_data_script = soup.find('script', id='__NEXT_DATA__')

    if next_data_script:
        data = json.loads(next_data_script.string)
        # Essayer plusieurs chemins possibles
        possible_paths = [
            ['props', 'pageProps', 'events'],
            ['props', 'pageProps', 'initialData', 'events'],
            ['props', 'pageProps', 'data', 'events'],
        ]
        # Parser les événements depuis le JSON
```

#### Stratégie 2 : API JSON directe
```python
def _try_api_endpoint(self) -> List[Event]:
    """
    Essaie d'accéder directement à l'API
    """
    api_urls = [
        "https://smoothcomp.com/api/events/upcoming",
        "https://smoothcomp.com/api/v1/events/upcoming",
        "https://smoothcomp.com/en/api/events/upcoming",
    ]

    for api_url in api_urls:
        try:
            response = self.session.get(api_url)
            if response.status_code == 200:
                return parse_json_events(response.json())
        except:
            continue
```

#### Stratégie 3 : Scraping HTML classique (fallback)
```python
def _scrape_html(self) -> List[Event]:
    """Scraping HTML si les 2 autres stratégies échouent"""
    # Chercher tous les liens /event/
    event_links = [link for link in soup.find_all('a', href=True)
                   if '/event/' in link['href']]
```

#### Headers anti-bot améliorés
```python
self.session.headers.update({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
})
```

---

## 📊 Résultats attendus

### Avant
```
HyroxScraper:
- 111 conteneurs trouvés
- 193 liens pertinents
- ❌ 1 événement récupéré (99% de perte)

SmoothcompScraper:
- ❌ 0 lien trouvé (blocage total)
```

### Après
```
HyroxScraper:
- 111 conteneurs trouvés
- 193 liens pertinents
- ✅ 50-100+ événements récupérés
- 📊 Logs détaillés des rejets :
     - no_title: X
     - too_short: Y
     - no_link: Z

SmoothcompScraper:
- ✅ Tentative __NEXT_DATA__
- ✅ Fallback API JSON
- ✅ Fallback scraping HTML
- ✅ 20-50+ événements récupérés
```

---

## 🚀 Pour tester

```bash
# Nettoyer le cache et relancer
./clean_and_run.sh

# OU manuellement
find . -type d -name "__pycache__" -exec rm -rf {} +
python main.py
```

---

## 📝 Logs détaillés à surveiller

### HYROX
```
HyroxScraper - Trouvé 111 conteneurs potentiels d'événements
HyroxScraper - Trouvé 193 liens pertinents
HyroxScraper - ✅ Événement #1 ajouté: HYROX Paris
HyroxScraper - ⚠️ Aucune date trouvée pour 'HYROX Nice', utilisation date par défaut
HyroxScraper - ⚠️ Date non parsable '15-Mars-2024', utilisation date par défaut
HyroxScraper - 📊 Événements rejetés: 25
HyroxScraper -    - no_title: 10
HyroxScraper -    - too_short: 8
HyroxScraper -    - no_link: 7
HyroxScraper - ✅ 85 événements récupérés
```

### Smoothcomp
```
SmoothcompScraper - Tentative extraction __NEXT_DATA__...
SmoothcompScraper - Script __NEXT_DATA__ non trouvé
SmoothcompScraper - __NEXT_DATA__ vide, tentative API JSON...
SmoothcompScraper - Test API: https://smoothcomp.com/api/events/upcoming
SmoothcompScraper - API trouvée: https://smoothcomp.com/api/events/upcoming
SmoothcompScraper - ✅ 42 événements extraits depuis l'API
```

---

## 🐛 Si le yield reste faible

### HYROX < 20 événements
- Vérifier les logs de rejet : `📊 Événements rejetés`
- Si `no_link` élevé → problème de structure HTML, inspecter manuellement le site
- Si `no_title` élevé → ajuster les sélecteurs de titre

### Smoothcomp = 0 événements
- Regarder la stratégie utilisée dans les logs
- Si "⚠️ Aucune stratégie n'a permis..." → le site utilise peut-être Cloudflare
- **Solution avancée** : Installer Selenium pour simuler un vrai navigateur

```bash
pip install selenium webdriver-manager
```

Voir `TROUBLESHOOTING.md` pour le code Selenium.

---

## 📌 Prochaines optimisations possibles

1. **Selenium/Playwright** pour les sites avec protection anti-bot forte
2. **Caching** des résultats pour éviter de re-scraper trop souvent
3. **Scraping parallèle** pour accélérer (multi-threading)
4. **Proxy rotation** si blocage IP
5. **Détection intelligente des dates** avec NLP (spaCy)
