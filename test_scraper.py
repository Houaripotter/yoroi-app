"""
Script de test pour vérifier le fonctionnement des scrapers
"""
from scrapers.hyrox_scraper import HyroxScraper
from scrapers.smoothcomp_scraper import SmoothcompScraper
from utils.logger import setup_logger

def test_hyrox():
    """Test du scraper HYROX"""
    logger = setup_logger("test_hyrox")
    logger.info("🧪 Test du scraper HYROX...")

    scraper = HyroxScraper()
    events = scraper.get_events()

    if events:
        logger.info(f"✅ {len(events)} événements trouvés")
        logger.info(f"Premier événement: {events[0].title}")
    else:
        logger.warning("⚠️ Aucun événement trouvé (vérifier les sélecteurs CSS)")

    return events

def test_smoothcomp():
    """Test du scraper Smoothcomp"""
    logger = setup_logger("test_smoothcomp")
    logger.info("🧪 Test du scraper Smoothcomp...")

    scraper = SmoothcompScraper()
    events = scraper.get_events()

    if events:
        logger.info(f"✅ {len(events)} événements trouvés")
        logger.info(f"Premier événement: {events[0].title}")
        logger.info(f"Sport tag: {events[0].sport_tag}")
    else:
        logger.warning("⚠️ Aucun événement trouvé (vérifier les sélecteurs CSS)")

    return events

if __name__ == "__main__":
    print("\n" + "="*60)
    print("TEST DES SCRAPERS YOROI")
    print("="*60 + "\n")

    # Test HYROX
    hyrox_events = test_hyrox()

    print("\n" + "-"*60 + "\n")

    # Test Smoothcomp
    smoothcomp_events = test_smoothcomp()

    print("\n" + "="*60)
    print(f"TOTAL: {len(hyrox_events) + len(smoothcomp_events)} événements")
    print("="*60 + "\n")
