"""
Scraper pour les événements Smoothcomp (JJB/Grappling)
Source: https://smoothcomp.com/en/events/upcoming
Version Playwright - Bypass anti-bot Cloudflare
"""
from typing import List, Optional
from datetime import datetime
import re
import json

from playwright.sync_api import sync_playwright, Page, Browser
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper
from models.event import Event, EventLocation
from utils.helpers import parse_date, extract_city_country
from config import SMOOTHCOMP_URL


class SmoothcompScraper(BaseScraper):
    """
    Scraper pour Smoothcomp
    Spécialisé dans les événements de JJB et Grappling
    Utilise Playwright (headless browser) pour contourner Cloudflare
    """

    # Mots-clés pour déterminer le type de sport
    JJB_KEYWORDS = ['jiu-jitsu', 'jiu jitsu', 'bjj', 'ibjjf', 'cfjjb', 'brazilian', 'gi', 'no-gi', 'nogi']
    GRAPPLING_KEYWORDS = ['grappling', 'adcc', 'submission', 'wrestling']

    def scrape(self) -> List[Event]:
        """
        Scrape les événements Smoothcomp avec Playwright
        Stratégies multiples :
        1. Extraction depuis __NEXT_DATA__ (Next.js)
        2. Scraping HTML après rendu JavaScript
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

                # Naviguer vers la page des événements
                self.logger.info(f"Navigation vers {SMOOTHCOMP_URL}...")
                page.goto(SMOOTHCOMP_URL, wait_until='networkidle', timeout=30000)

                # Attendre que le contenu soit chargé
                self.logger.info("Attente du chargement du contenu JavaScript...")
                page.wait_for_timeout(3000)  # 3 secondes pour le rendu complet

                # Récupérer le HTML final
                html_content = page.content()

                # Fermer le navigateur
                browser.close()

                # Parser avec BeautifulSoup
                soup = BeautifulSoup(html_content, 'lxml')

                # Stratégie 1 : Essayer d'extraire les données depuis __NEXT_DATA__
                self.logger.info("Tentative extraction __NEXT_DATA__...")
                events = self._extract_from_next_data(soup)

                if events:
                    self.logger.info(f"✅ {len(events)} événements extraits depuis __NEXT_DATA__")
                    return events

                # Stratégie 2 : Scraping HTML classique
                self.logger.info("__NEXT_DATA__ vide, scraping HTML...")
                events = self._scrape_html(soup)

                if events:
                    self.logger.info(f"✅ {len(events)} événements extraits depuis HTML")
                    return events

                # Aucune stratégie n'a fonctionné
                self.logger.warning("⚠️ Aucune stratégie n'a permis d'extraire des événements")

        except Exception as e:
            self.logger.error(f"Erreur scraping Smoothcomp: {e}")

        return events

    def _extract_from_next_data(self, soup: BeautifulSoup) -> List[Event]:
        """
        Extrait les événements depuis le script __NEXT_DATA__ (Next.js)
        Smoothcomp utilise Next.js qui stocke les données initiales dans un script JSON
        """
        events = []

        try:
            # Chercher le script __NEXT_DATA__
            next_data_script = soup.find('script', id='__NEXT_DATA__')

            if not next_data_script:
                self.logger.debug("Script __NEXT_DATA__ non trouvé")
                return events

            # Parser le JSON
            data = json.loads(next_data_script.string)

            # Navigation dans la structure Next.js
            # La structure peut varier, essayer plusieurs chemins
            possible_paths = [
                ['props', 'pageProps', 'events'],
                ['props', 'pageProps', 'initialData', 'events'],
                ['props', 'pageProps', 'data', 'events'],
                ['props', 'initialProps', 'events'],
                ['props', 'pageProps', 'upcomingEvents'],
                ['props', 'pageProps', 'tournaments'],
            ]

            events_data = None
            for path in possible_paths:
                try:
                    current = data
                    for key in path:
                        current = current[key]
                    events_data = current
                    self.logger.info(f"Données trouvées dans: {' -> '.join(path)}")
                    break
                except (KeyError, TypeError):
                    continue

            if not events_data:
                self.logger.debug("Structure __NEXT_DATA__ inconnue")
                # Afficher la structure pour debugging
                self.logger.debug(f"Clés disponibles: {list(data.keys())}")
                if 'props' in data:
                    self.logger.debug(f"Props clés: {list(data['props'].keys())}")
                    if 'pageProps' in data['props']:
                        self.logger.debug(f"PageProps clés: {list(data['props']['pageProps'].keys())}")
                return events

            # Parser les événements
            for event_data in events_data:
                event = self._parse_json_event(event_data)
                if event:
                    events.append(event)

        except json.JSONDecodeError as e:
            self.logger.debug(f"Erreur parsing JSON __NEXT_DATA__: {e}")
        except Exception as e:
            self.logger.debug(f"Erreur extraction __NEXT_DATA__: {e}")

        return events

    def _scrape_html(self, soup: BeautifulSoup) -> List[Event]:
        """
        Scraping HTML classique (après rendu JavaScript)
        """
        events = []

        try:
            # Chercher tous les liens pointant vers des événements
            all_links = soup.find_all('a', href=True)

            event_links = []
            for link in all_links:
                href = link.get('href', '')
                # Chercher les liens d'événements Smoothcomp
                if '/event/' in href and ('smoothcomp.com' in href or href.startswith('/')):
                    event_links.append(link)

            self.logger.info(f"Trouvé {len(event_links)} liens d'événements Smoothcomp")

            # Si aucun lien trouvé, afficher un échantillon du HTML pour debugging
            if not event_links:
                html_sample = str(soup)[:500]
                self.logger.warning(f"Aucun événement trouvé. Échantillon HTML:\n{html_sample}")
                return events

            # Parser chaque lien d'événement
            seen_urls = set()
            for link in event_links:
                try:
                    href = link.get('href', '')

                    # Éviter les doublons
                    if href in seen_urls:
                        continue
                    seen_urls.add(href)

                    event = self._parse_event_link(link)
                    if event:
                        events.append(event)
                        self.logger.debug(f"Événement ajouté: {event.title}")
                except Exception as e:
                    self.logger.debug(f"Erreur parsing lien: {e}")
                    continue

        except Exception as e:
            self.logger.error(f"Erreur scraping HTML: {e}")

        return events

    def _parse_json_event(self, event_data: dict) -> Optional[Event]:
        """
        Parse un événement depuis des données JSON (__NEXT_DATA__)
        """
        try:
            # Extraire les champs (les noms peuvent varier)
            title = (
                event_data.get('name') or
                event_data.get('title') or
                event_data.get('eventName') or
                event_data.get('tournamentName')
            )

            if not title or len(title) < 3:
                return None

            # Date
            date_str = (
                event_data.get('startDate') or
                event_data.get('date') or
                event_data.get('eventDate') or
                event_data.get('startTime')
            )
            date_start = parse_date(date_str) if date_str else datetime.now()

            # Localisation
            location_data = event_data.get('location') or event_data.get('venue') or {}

            if isinstance(location_data, str):
                city, country = extract_city_country(location_data)
                location_str = location_data
            else:
                city = location_data.get('city') or 'Unknown'
                country = location_data.get('country') or 'Unknown'
                location_str = f"{city}, {country}"

            # URL
            event_id = event_data.get('id') or event_data.get('eventId')
            slug = event_data.get('slug') or event_data.get('url')

            if slug:
                registration_link = f"https://smoothcomp.com{slug}" if slug.startswith('/') else slug
            elif event_id:
                registration_link = f"https://smoothcomp.com/en/event/{event_id}"
            else:
                return None

            # Image
            image_url = event_data.get('image') or event_data.get('imageUrl') or event_data.get('logo')

            # Sport tag
            sport_tag = self._determine_sport_tag(title)

            # Fédération
            federation = self._extract_federation(title)

            return Event(
                title=title,
                date_start=date_start.date(),
                location=EventLocation(
                    city=city,
                    country=country,
                    full_address=location_str
                ),
                category="combat",
                sport_tag=sport_tag,
                federation=federation,
                registration_link=registration_link,
                image_logo_url=image_url
            )

        except Exception as e:
            self.logger.debug(f"Erreur parsing JSON event: {e}")
            return None

    def _parse_event_link(self, link) -> Optional[Event]:
        """
        Parse un lien d'événement Smoothcomp (scraping HTML)
        """
        # Extraire le titre depuis le texte du lien
        title = link.get_text(strip=True)

        # Si pas de titre, essayer de l'extraire depuis le parent
        if not title or len(title) < 3:
            parent = link.parent
            if parent:
                title_elem = parent.find(['h1', 'h2', 'h3', 'h4', 'strong'])
                if title_elem:
                    title = title_elem.get_text(strip=True)

        # Si toujours pas de titre, ignorer
        if not title or len(title) < 3:
            self.logger.debug(f"Titre manquant pour le lien: {link.get('href')}")
            return None

        # Extraire l'URL
        href = link.get('href', '')

        # Rendre le lien absolu si nécessaire
        if href.startswith('/'):
            registration_link = f"https://smoothcomp.com{href}"
        elif not href.startswith('http'):
            registration_link = f"https://smoothcomp.com/{href}"
        else:
            registration_link = href

        # Chercher la date dans le parent du lien
        date_str = None
        parent = link.parent
        if parent:
            date_elem = (
                parent.find('time') or
                parent.find(class_=re.compile(r'date', re.I)) or
                parent.find('span', class_=re.compile(r'date', re.I))
            )
            if date_elem:
                date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)

            if not date_str:
                parent_text = parent.get_text()
                date_match = re.search(r'\d{1,2}[-–]\d{1,2}\s+\w+\s+\d{4}|\d{1,2}\s+\w+\s+\d{4}', parent_text)
                if date_match:
                    date_str = date_match.group()

        date_start = self._parse_event_date(date_str) if date_str else datetime.now()

        # Chercher la localisation dans le parent
        location_str = "Unknown, Unknown"
        if parent:
            location_elem = (
                parent.find(class_=re.compile(r'location|venue|city|country', re.I)) or
                parent.find('address')
            )
            if location_elem:
                location_str = location_elem.get_text(strip=True)
            else:
                parent_text = parent.get_text()
                location_match = re.search(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)', parent_text)
                if location_match:
                    location_str = location_match.group()

        city, country = extract_city_country(location_str)

        # Chercher l'image dans le parent
        image_url = None
        if parent:
            img_elem = parent.find('img')
            if img_elem:
                image_url = img_elem.get('src') or img_elem.get('data-src')
                if image_url and image_url.startswith('/'):
                    image_url = f"https://smoothcomp.com{image_url}"

        # Sport tag
        sport_tag = self._determine_sport_tag(title)

        # Fédération
        federation = self._extract_federation(title)

        return Event(
            title=title,
            date_start=date_start.date(),
            location=EventLocation(
                city=city,
                country=country,
                full_address=location_str
            ),
            category="combat",
            sport_tag=sport_tag,
            federation=federation,
            registration_link=registration_link,
            image_logo_url=image_url
        )

    def _parse_event_date(self, date_str: str) -> datetime:
        """
        Parse la date d'un événement Smoothcomp
        """
        try:
            # Détecter les plages de dates
            range_pattern = r'(\d+)[-–](\d+)\s+(\w+)\s*(\d{4})?'
            match = re.search(range_pattern, date_str)

            if match:
                start_day = match.group(1)
                month = match.group(3)
                year = match.group(4) or datetime.now().year
                start_date_str = f"{start_day} {month} {year}"
                return parse_date(start_date_str) or datetime.now()

            parsed = parse_date(date_str)
            return parsed if parsed else datetime.now()

        except Exception as e:
            self.logger.warning(f"Impossible de parser la date '{date_str}': {e}")
            return datetime.now()

    def _determine_sport_tag(self, title: str) -> str:
        """Détermine JJB vs Grappling"""
        title_lower = title.lower()

        if any(keyword in title_lower for keyword in self.GRAPPLING_KEYWORDS):
            return "grappling"

        return "jjb"

    def _extract_federation(self, title: str) -> Optional[str]:
        """Extrait la fédération depuis le titre"""
        federations = ['IBJJF', 'CFJJB', 'ADCC', 'UAEJJF', 'AJP', 'SJJIF', 'NAGA']

        for fed in federations:
            if fed.lower() in title.lower():
                return fed

        return None
