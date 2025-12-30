"""
Scraper pour les événements IBJJF (International Brazilian Jiu-Jitsu Federation)
Source: https://ibjjf.com/events/calendar
Utilise Playwright pour gérer le rendu JavaScript
"""
from typing import List, Optional
from datetime import datetime
import re

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper
from models.event import Event, EventLocation
from utils.helpers import parse_date, extract_city_country


class IbjjfScraper(BaseScraper):
    """
    Scraper pour IBJJF (Fédération Internationale de Jiu-Jitsu Brésilien)
    Site officiel avec événements mondiaux de JJB
    """

    BASE_URL = "https://ibjjf.com"
    CALENDAR_URL = "https://ibjjf.com/events/calendar"

    def scrape(self) -> List[Event]:
        """
        Scrape les événements IBJJF depuis le calendrier officiel
        """
        events = []

        try:
            with sync_playwright() as p:
                # Lancer Chromium en mode headless
                self.logger.info("Lancement du navigateur Playwright...")
                browser = p.chromium.launch(headless=True)

                # Créer un contexte avec User-Agent réaliste
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    viewport={'width': 1920, 'height': 1080},
                    locale='en-US',
                )

                page = context.new_page()

                # Naviguer vers le calendrier
                self.logger.info(f"Navigation vers {self.CALENDAR_URL}...")
                page.goto(self.CALENDAR_URL, wait_until='networkidle', timeout=30000)

                # Attendre que le contenu soit chargé
                self.logger.info("Attente du chargement du contenu JavaScript...")
                page.wait_for_timeout(3000)  # 3 secondes pour le rendu complet

                # Récupérer le HTML final
                html_content = page.content()

                # Fermer le navigateur
                browser.close()

                # Parser avec BeautifulSoup
                soup = BeautifulSoup(html_content, 'lxml')

                # Chercher tous les événements
                # Structure IBJJF: <div class="row no-gutters event ...">
                event_divs = soup.find_all('div', class_=lambda x: x and 'event' in str(x).split())

                # Filtrer les vraies events (pas les conteneurs)
                event_divs = [div for div in event_divs if 'event-row' not in div.get('class', [])]

                self.logger.info(f"Trouvé {len(event_divs)} événements IBJJF")

                # Parser chaque événement
                for event_div in event_divs:
                    try:
                        event = self._parse_event_div(event_div)
                        if event:
                            events.append(event)
                            self.logger.debug(f"Événement ajouté: {event.title}")
                    except Exception as e:
                        self.logger.debug(f"Erreur parsing événement: {e}")
                        continue

                self.logger.info(f"✅ {len(events)} événements IBJJF extraits")

        except Exception as e:
            self.logger.error(f"Erreur scraping IBJJF: {e}")

        return events

    def _parse_event_div(self, event_div) -> Optional[Event]:
        """
        Parse un div d'événement IBJJF

        Structure HTML:
        <div class="row no-gutters event ...">
            <div class="col-12 event-row">
                <div class="date">Jan 10 - Jan 11</div>
                <div class="name">Rio Summer International Open IBJJF Jiu-Jitsu No-Gi Championship 2025</div>
                <div class="local">Arena Cel. Wenceslau Malta, Rio de Janeiro</div>
            </div>
        </div>
        """
        try:
            # Trouver le conteneur event-row
            event_row = event_div.find('div', class_='event-row')
            if not event_row:
                return None

            # Extraire le titre
            name_elem = event_row.find('div', class_='name')
            if not name_elem:
                return None

            title = name_elem.get_text(strip=True)
            if not title or len(title) < 5:
                return None

            # Extraire la date
            date_elem = event_row.find('div', class_='date')
            date_str = date_elem.get_text(strip=True) if date_elem else None

            # Parser la date
            if date_str:
                date_start = self._parse_ibjjf_date(date_str)
            else:
                date_start = datetime.now()

            # Extraire la localisation
            local_elem = event_row.find('div', class_='local')
            location_str = local_elem.get_text(strip=True) if local_elem else "Unknown"

            # Nettoyer la localisation (enlever l'icône)
            location_str = re.sub(r'^\s*\n\s*', '', location_str)

            # Parser ville et pays
            city, country = extract_city_country(location_str)

            # Si pas de ville trouvée, essayer de parser manuellement
            if city == "Unknown":
                # Format typique: "Arena Name, City"
                parts = location_str.split(',')
                if len(parts) >= 2:
                    city = parts[-1].strip()
                    if len(parts) >= 3:
                        country_candidate = parts[-1].strip()
                        city = parts[-2].strip()
                        # Vérifier si c'est un pays connu
                        if len(country_candidate) > 2:
                            country = country_candidate

            # URL de l'événement (pas disponible directement, utiliser l'URL du calendrier)
            registration_link = self.CALENDAR_URL

            # Chercher un lien spécifique dans le div
            link_elem = event_div.find('a', href=True)
            if link_elem:
                href = link_elem.get('href', '')
                if href.startswith('/'):
                    registration_link = f"{self.BASE_URL}{href}"
                elif href.startswith('http'):
                    registration_link = href

            return Event(
                title=title,
                date_start=date_start.date(),
                location=EventLocation(
                    city=city,
                    country=country,
                    full_address=location_str
                ),
                category="combat",
                sport_tag="jjb",
                federation="IBJJF",
                registration_link=registration_link,
                image_logo_url=None  # IBJJF n'affiche pas d'images dans le calendrier
            )

        except Exception as e:
            self.logger.debug(f"Erreur parsing événement IBJJF: {e}")
            return None

    def _parse_ibjjf_date(self, date_str: str) -> datetime:
        """
        Parse une date au format IBJJF

        Formats:
        - "Jan 10 - Jan 11" (plage)
        - "Jan 10" (jour unique)
        - "Jan 10 - Jan 11, 2025" (avec année)
        """
        try:
            # Nettoyer la chaîne
            date_str = date_str.strip()

            # Détecter si c'est une plage
            if ' - ' in date_str:
                # Prendre la date de début
                start_part = date_str.split(' - ')[0].strip()
            else:
                start_part = date_str

            # Vérifier si l'année est présente
            if ',' in start_part:
                # Format: "Jan 10, 2025"
                parsed = parse_date(start_part)
            else:
                # Pas d'année, ajouter l'année courante ou prochaine
                current_year = datetime.now().year

                # Essayer avec l'année courante
                test_date_str = f"{start_part}, {current_year}"
                parsed = parse_date(test_date_str)

                # Si la date est dans le passé, essayer l'année prochaine
                if parsed and parsed < datetime.now():
                    test_date_str = f"{start_part}, {current_year + 1}"
                    parsed = parse_date(test_date_str)

            return parsed if parsed else datetime.now()

        except Exception as e:
            self.logger.warning(f"Impossible de parser la date IBJJF '{date_str}': {e}")
            return datetime.now()
