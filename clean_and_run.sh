#!/bin/bash

echo "🧹 Nettoyage du cache Python..."

# Supprimer tous les fichiers cache Python
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
find . -type f -name "*.pyo" -delete 2>/dev/null

echo "✅ Cache nettoyé"
echo ""
echo "🚀 Lancement du scraper..."
echo ""

# Lancer le scraper
python3 main.py

echo ""
echo "✅ Terminé ! Vérifier output/events.json"
