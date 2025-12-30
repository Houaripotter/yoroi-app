"""
Script de vérification de la configuration
Vérifie que les URLs et modules sont correctement configurés
"""
import sys
from config import HYROX_URL, SMOOTHCOMP_URL
from scrapers.hyrox_scraper import HyroxScraper
from scrapers.smoothcomp_scraper import SmoothcompScraper

print("🔍 Vérification de la configuration")
print("=" * 60)

# Vérifier les URLs
print(f"\n📍 URLs configurées:")
print(f"   HYROX: {HYROX_URL}")
print(f"   Smoothcomp: {SMOOTHCOMP_URL}")

# Vérifier que l'URL HYROX est la bonne
if HYROX_URL == "https://hyroxfrance.com/fr/trouve-ta-course/":
    print("   ✅ URL HYROX correcte (site français)")
elif HYROX_URL == "https://hyrox.com/events/":
    print("   ❌ URL HYROX INCORRECTE (ancienne URL morte)")
    print("   💡 Changer pour: https://hyroxfrance.com/fr/trouve-ta-course/")
    sys.exit(1)
else:
    print(f"   ⚠️  URL HYROX inattendue: {HYROX_URL}")

# Vérifier les classes de scrapers
print(f"\n🔧 Classes de scrapers:")
print(f"   HyroxScraper: {HyroxScraper.__doc__.strip()}")
print(f"   SmoothcompScraper: {SmoothcompScraper.__doc__.strip()}")

# Vérifier que Smoothcomp utilise l'approche robuste
import inspect
smoothcomp_source = inspect.getsource(SmoothcompScraper.scrape)
if "/event/" in smoothcomp_source:
    print("   ✅ Smoothcomp utilise la recherche par liens /event/")
else:
    print("   ❌ Smoothcomp n'utilise pas la bonne approche")
    print("   💡 Vérifier que le code recherche les liens contenant '/event/'")

print("\n" + "=" * 60)
print("✅ Configuration vérifiée !")
print("\n💡 Pour lancer le scraper: python main.py")
print("💡 Pour nettoyer le cache: ./clean_and_run.sh")
