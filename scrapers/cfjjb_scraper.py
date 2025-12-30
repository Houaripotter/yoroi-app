"""
Scraper pour les événements CFJJB (Confédération Française de Jiu-Jitsu Brésilien)
Source: https://www.cfjjb.com/competitions/calendrier-competitions
NOTE: Le calendrier CFJJB est actuellement indisponible/vide (vérifié le 30/12/2024)
"""
from typing import List

from scrapers.base_scraper import BaseScraper
from models.event import Event


class CfjjbScraper(BaseScraper):
    """
    Scraper pour CFJJB (Confédération Française de JJB)

    NOTE IMPORTANTE:
    Le site CFJJB (www.cfjjb.com/competitions/calendrier-competitions)
    ne liste actuellement pas d'événements publics ou le calendrier est vide.

    Ce scraper est préparé pour une future activation si le calendrier
    devient disponible.
    """

    BASE_URL = "https://www.cfjjb.com"
    CALENDAR_URL = "https://www.cfjjb.com/competitions/calendrier-competitions"

    def scrape(self) -> List[Event]:
        """
        Scrape les événements CFJJB

        Pour l'instant, retourne une liste vide car le calendrier
        en ligne n'est pas disponible.
        """
        self.logger.warning(
            "⚠️ CFJJB: Calendrier actuellement indisponible. "
            "Le site www.cfjjb.com/competitions/calendrier-competitions "
            "ne liste pas d'événements publics. "
            "Vérifier manuellement si des événements sont disponibles."
        )

        return []

        # CODE POUR FUTURE ACTIVATION:
        # Une fois que le calendrier CFJJB sera disponible, décommenter
        # et adapter le code ci-dessous:

        """
        events = []

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(...)
                page = context.new_page()

                page.goto(self.CALENDAR_URL, wait_until='networkidle', timeout=30000)
                page.wait_for_timeout(3000)

                html_content = page.content()
                browser.close()

                soup = BeautifulSoup(html_content, 'lxml')

                # Parser les événements (structure à déterminer)
                # ...

        except Exception as e:
            self.logger.error(f"Erreur scraping CFJJB: {e}")

        return events
        """
