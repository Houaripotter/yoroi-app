# Guide de dépannage - Yoroi Events Scraper

## 🔍 Diagnostiquer les problèmes

### 1. Lancer le mode debug

```bash
# Activer les logs détaillés
python test_scraper.py
```

### 2. Vérifier manuellement les sites

**HYROX France :**
```bash
curl -A "Mozilla/5.0" https://hyroxfrance.com/fr/trouve-ta-course/
```

**Smoothcomp :**
```bash
curl -A "Mozilla/5.0" https://smoothcomp.com/en/events/upcoming
```

## 🐛 Problèmes courants

### Problème : "Aucun événement trouvé"

**Diagnostic :**
- Le scraper affiche "Échantillon HTML: ..." dans les logs
- Vérifier si le site charge le contenu via JavaScript

**Solution :**
1. Inspecter le HTML échantillon dans les logs
2. Ouvrir le site dans un navigateur et inspecter le code source
3. Si le site utilise JS pour charger les événements :
   - Installer Selenium : `pip install selenium`
   - Remplacer `fetch_page()` par un navigateur headless

**Exemple avec Selenium :**
```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_argument("--headless")
driver = webdriver.Chrome(options=chrome_options)
driver.get(url)
html = driver.page_source
soup = BeautifulSoup(html, 'lxml')
driver.quit()
```

### Problème : "Titre manquant, ignoré"

**Diagnostic :**
- Les liens sont trouvés mais le texte est vide
- Logs : "Titre manquant pour le lien: ..."

**Solution :**
1. Vérifier la structure HTML du lien
2. Modifier `_parse_event_link()` pour chercher dans d'autres éléments :

```python
# Chercher dans les siblings
for sibling in link.next_siblings:
    if sibling.name and sibling.get_text(strip=True):
        title = sibling.get_text(strip=True)
        break
```

### Problème : 404 / 403 Error

**Diagnostic :**
- `requests.exceptions.HTTPError: 404 Client Error`
- Le site bloque les bots

**Solutions :**

1. **Changer le User-Agent** (`config.py`) :
```python
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

2. **Ajouter des headers** (`base_scraper.py`) :
```python
self.session.headers.update({
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Referer': 'https://www.google.com/',
})
```

3. **Utiliser un proxy** si le site bloque l'IP

### Problème : Dates incorrectes

**Diagnostic :**
- Les dates sont toutes à aujourd'hui
- Logs : "Impossible de parser la date '...'"

**Solution :**
1. Inspecter le format de date sur le site
2. Ajouter le pattern dans `_parse_event_date()` :

```python
# Exemple pour "15 janvier 2024"
french_months = {
    'janvier': 'January', 'février': 'February',
    'mars': 'March', 'avril': 'April',
    # ... etc
}
```

### Problème : Doublons d'événements

**Diagnostic :**
- Le même événement apparaît plusieurs fois

**Solution :**
- Déjà implémenté avec `seen_urls` set
- Vérifier que la déduplication fonctionne dans les logs

## 🧪 Tests manuels

### Test 1 : Vérifier qu'une URL fonctionne

```python
from scrapers.smoothcomp_scraper import SmoothcompScraper
scraper = SmoothcompScraper()
soup = scraper.fetch_page("https://smoothcomp.com/en/events/upcoming")
print(len(soup.find_all('a', href=True)))  # Nombre de liens
```

### Test 2 : Tester le parsing d'une date

```python
from utils.helpers import parse_date
date = parse_date("12-14 Oct 2024")
print(date)  # Doit afficher une date
```

### Test 3 : Vérifier les événements générés

```python
import json
with open('output/events.json', 'r') as f:
    events = json.load(f)
    print(f"Total: {len(events)} événements")
    print(f"Premier: {events[0]['title']}")
```

## 📊 Interpréter les logs

### Logs normaux (succès)

```
HyroxScraper - Démarrage du scraping HyroxScraper
HyroxScraper - Trouvé 15 conteneurs potentiels d'événements
HyroxScraper - Trouvé 23 liens pertinents
HyroxScraper - ✅ 8 événements récupérés

SmoothcompScraper - Démarrage du scraping SmoothcompScraper
SmoothcompScraper - Trouvé 45 liens d'événements Smoothcomp
SmoothcompScraper - Événement ajouté: European Championship 2024
SmoothcompScraper - ✅ 42 événements récupérés

main - 📦 Total: 50 événements
main - ✅ JSON généré: output/events.json
```

### Logs problématiques

```
⚠️ HyroxScraper - Aucun événement trouvé. Échantillon HTML:
<!DOCTYPE html><html>...

❌ SmoothcompScraper - Erreur lors de la récupération: 403 Forbidden
```

## 🔧 Modifications rapides

### Changer l'URL source

`config.py` :
```python
SMOOTHCOMP_URL = "https://smoothcomp.com/en/find-tournaments"
```

### Augmenter le timeout

`config.py` :
```python
REQUEST_TIMEOUT = 30  # 30 secondes au lieu de 10
```

### Activer le mode debug pour tous les logs

`utils/logger.py` :
```python
logger.setLevel(logging.DEBUG)  # Au lieu de INFO
```

## 📞 Besoin d'aide ?

1. Vérifier les logs dans la console
2. Consulter `CHANGELOG.md` pour les dernières modifications
3. Tester manuellement avec `test_scraper.py`
4. Inspecter le HTML des sites sources avec un navigateur
