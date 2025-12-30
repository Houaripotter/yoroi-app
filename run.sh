#!/bin/bash

# Script pour exécuter le scraper Yoroi Events

echo "🏃 Yoroi Events Scraper"
echo "======================="
echo ""

# Vérifier si l'environnement virtuel existe
if [ ! -d "venv" ]; then
    echo "📦 Création de l'environnement virtuel..."
    python3 -m venv venv
fi

# Activer l'environnement virtuel
echo "🔌 Activation de l'environnement virtuel..."
source venv/bin/activate

# Installer les dépendances
echo "📚 Installation des dépendances..."
pip install -q -r requirements.txt

# Lancer le scraper
echo ""
echo "🚀 Lancement du scraping..."
echo ""
python main.py

echo ""
echo "✅ Terminé ! Vérifier output/events.json"
