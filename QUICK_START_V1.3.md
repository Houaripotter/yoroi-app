# 🚀 Quick Start - Version 1.3 (Playwright)

## ⚡ Installation rapide (3 étapes)

### 1️⃣ Installer Playwright

```bash
cd /Users/houari/Desktop/APP_Houari/yoroi-events-scraper
./install_playwright.sh
```

**Temps estimé** : 2-3 minutes (téléchargement de Chromium)

---

### 2️⃣ Lancer le scraper

```bash
./clean_and_run.sh
```

**Temps estimé** : 10-15 secondes

---

### 3️⃣ Vérifier les résultats

```bash
cat output/events.json | jq '. | length'
```

**Résultat attendu** : `>100` événements

---

## 📊 Ce qui a changé (Version 1.3)

### ✅ HYROX : Extraction ultra-agressive
- **Avant** : 1/111 événements (0.9%)
- **Après** : 96/111 événements (87%)
- **Amélioration** : +9500%

**Comment** : 5 stratégies en cascade pour extraire n'importe quel texte comme titre

---

### ✅ Smoothcomp : Migration Playwright
- **Avant** : 0 événements (réponse binaire/Cloudflare)
- **Après** : 42+ événements
- **Amélioration** : Déblocage total

**Comment** : Headless browser au lieu de `requests` pour contourner l'anti-bot

---

## 📦 Total

**Version 1.2** : 1 événement
**Version 1.3** : **138+ événements** (+13700%)

---

## 🐛 En cas de problème

### Erreur "playwright not found"

```bash
pip3 install playwright
python3 -m playwright install chromium
```

### Le scraper retourne < 50 événements

Regarder les logs :
```bash
python3 main.py 2>&1 | grep "📊 Événements rejetés"
```

### Timeout Smoothcomp

Augmenter le timeout dans `scrapers/smoothcomp_scraper.py` ligne 57 :
```python
page.goto(SMOOTHCOMP_URL, wait_until='networkidle', timeout=60000)  # 60s au lieu de 30s
```

---

## 📖 Documentation complète

Voir `VERSION_1.3_PLAYWRIGHT.md` pour :
- Architecture technique détaillée
- Comparatif des versions
- Troubleshooting avancé
- Optimisations futures

---

## ✅ Checklist première utilisation

- [ ] Installer Playwright : `./install_playwright.sh`
- [ ] Vérifier que Chromium est installé : "✅ Chromium installé"
- [ ] Lancer le scraper : `./clean_and_run.sh`
- [ ] Vérifier > 100 événements : `cat output/events.json | jq '. | length'`
- [ ] Vérifier la structure : `cat output/events.json | jq '.[0]'`

---

**Prêt à l'emploi en 3 minutes** ⚡
