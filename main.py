"""
Point d'entrée du scraper Yoroi Events
"""
import json
from typing import List

from scrapers.hyrox_scraper import HyroxScraper
from scrapers.smoothcomp_scraper import SmoothcompScraper
from scrapers.running_scraper import RunningScraper
from scrapers.ibjjf_scraper import IbjjfScraper
from scrapers.cfjjb_scraper import CfjjbScraper
from models.event import Event
from utils.logger import setup_logger
from config import OUTPUT_FILE


def main():
    """
    Exécute tous les scrapers et génère le JSON final
    """
    logger = setup_logger("main")
    all_events: List[Event] = []

    # Liste des scrapers à exécuter
    scrapers = [
        HyroxScraper(),
        SmoothcompScraper(),
        IbjjfScraper(),
        CfjjbScraper(),  # Note: Actuellement inactif (calendrier indisponible)
        RunningScraper(),
    ]

    # Exécuter chaque scraper
    for scraper in scrapers:
        try:
            events = scraper.get_events()
            all_events.extend(events)
        except Exception as e:
            logger.error(f"Erreur avec {scraper.__class__.__name__}: {e}")

    # Trier par date
    all_events.sort(key=lambda e: e.date_start)

    # Sauvegarder en JSON
    logger.info(f"📦 Total: {len(all_events)} événements")

    events_dict = [event.to_dict() for event in all_events]

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(events_dict, f, indent=2, ensure_ascii=False)

    logger.info(f"✅ JSON généré: {OUTPUT_FILE}")
    logger.info(f"📊 Résumé par catégorie:")

    # Statistiques
    combat_count = len([e for e in all_events if e.category == "combat"])
    endurance_count = len([e for e in all_events if e.category == "endurance"])

    logger.info(f"   - Combat: {combat_count} événements")
    logger.info(f"   - Endurance: {endurance_count} événements")

    # Statistiques par sport
    logger.info(f"📊 Résumé par sport:")
    from collections import Counter
    sport_counts = Counter(e.sport_tag for e in all_events)
    for sport, count in sorted(sport_counts.items(), key=lambda x: x[1], reverse=True):
        logger.info(f"   - {sport.upper()}: {count} événements")


if __name__ == "__main__":
    main()
