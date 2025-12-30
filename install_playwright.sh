#!/bin/bash

echo "=== Installation de Playwright pour Yoroi Events Scraper ==="
echo ""

# Vérifier que Python est installé
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

echo "✅ Python 3 détecté: $(python3 --version)"
echo ""

# Installer les dépendances Python
echo "📦 Installation des dépendances Python..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances Python"
    exit 1
fi

echo "✅ Dépendances Python installées"
echo ""

# Installer les navigateurs Playwright
echo "🌐 Installation du navigateur Chromium pour Playwright..."
echo "   (cela peut prendre quelques minutes)"
python3 -m playwright install chromium

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation de Chromium"
    exit 1
fi

echo "✅ Chromium installé"
echo ""

# Vérifier l'installation
echo "🔍 Vérification de l'installation..."
python3 -c "from playwright.sync_api import sync_playwright; print('✅ Playwright importé avec succès')"

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la vérification de Playwright"
    exit 1
fi

echo ""
echo "✅ Installation terminée avec succès!"
echo ""
echo "Pour lancer le scraper:"
echo "  ./clean_and_run.sh"
echo ""
echo "Ou manuellement:"
echo "  python3 main.py"
