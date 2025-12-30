"""
Scraper pour les événements Running & Trail
Source: https://www.ahotu.com/calendar
Utilise Playwright pour contourner les protections anti-bot
"""
from typing import List, Optional
from datetime import datetime
import re

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

from scrapers.base_scraper import BaseScraper
from models.event import Event, EventLocation
from utils.helpers import parse_date, extract_city_country


class RunningScraper(BaseScraper):
    """
    Scraper pour Ahotu (Running & Trail)
    Couvre : Marathons, Semi-Marathons, 10k, 5k, Trail
    Utilise Playwright (headless browser) pour le scraping
    """

    BASE_URL = "https://www.ahotu.com"
    CALENDAR_URL = "https://www.ahotu.com/calendar"

    def scrape(self) -> List[Event]:
        """
        Scrape les événements de course à pied depuis Ahotu
        """
        events = []
        seen_urls = set()

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

                # Naviguer vers la page calendrier
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

                # Chercher tous les liens vers des événements
                all_links = soup.find_all('a', href=True)

                event_links = []
                for link in all_links:
                    href = link.get('href', '')
                    # Chercher les liens d'événements Ahotu
                    if '/event/' in href:
                        event_links.append(link)

                self.logger.info(f"Trouvé {len(event_links)} liens d'événements Running")

                # Parser chaque lien d'événement
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

                self.logger.info(f"✅ {len(events)} événements Running extraits")

        except Exception as e:
            self.logger.error(f"Erreur scraping Running: {e}")

        return events

    def _parse_event_link(self, link) -> Optional[Event]:
        """
        Parse un lien d'événement Ahotu

        Structure Ahotu:
        - Le lien contient le titre de l'événement dans le texte
        - Le texte du lien peut être concaténé avec location/date
        - Il faut séparer ces éléments
        """
        try:
            # Récupérer le texte complet du lien
            full_text = link.get_text(strip=True)

            # Le href
            href = link.get('href', '')

            # Rendre le lien absolu
            if href.startswith('/'):
                registration_link = f"{self.BASE_URL}{href}"
            elif not href.startswith('http'):
                registration_link = f"{self.BASE_URL}/{href}"
            else:
                registration_link = href

            # Parser le parent pour extraire les informations structurées
            parent = link.parent
            if not parent:
                return None

            # Chercher le titre (généralement dans un h3 ou div avec classe spécifique)
            title_elem = parent.find(['h3', 'h2', 'h1'])
            if title_elem:
                title = title_elem.get_text(strip=True)
            else:
                # Fallback: extraire le titre du texte du lien
                # Le format typique est: "TitleLocationDateType"
                # On prend la première partie avant la première majuscule suivie de minuscules
                title = self._extract_title_from_text(full_text)

            if not title or len(title) < 3:
                return None

            # Chercher la date
            date_str = None
            date_elem = parent.find(class_=lambda x: x and 'date' in str(x).lower())
            if date_elem:
                date_str = date_elem.get_text(strip=True)

            # Parser la date
            if date_str:
                date_start = parse_date(date_str)
                if not date_start:
                    date_start = datetime.now()
            else:
                date_start = datetime.now()

            # Chercher la localisation
            location_str = None
            location_elem = parent.find(class_=lambda x: x and ('location' in str(x).lower() or 'place' in str(x).lower()))

            if location_elem:
                location_str = location_elem.get_text(strip=True)
            else:
                # Essayer d'extraire depuis le texte
                location_str = self._extract_location_from_text(full_text)

            # Parser la localisation
            if location_str:
                city, country = extract_city_country(location_str)
            else:
                # Essayer d'extraire depuis le texte complet
                city, country = self._parse_location_from_full_text(full_text)

            # Chercher l'image
            image_url = None
            img_elem = parent.find('img')
            if img_elem:
                image_url = img_elem.get('src') or img_elem.get('data-src')
                if image_url and image_url.startswith('/'):
                    image_url = f"{self.BASE_URL}{image_url}"

            # Déterminer le sport_tag selon la logique définie
            sport_tag = self._determine_sport_tag(title)

            return Event(
                title=title,
                date_start=date_start.date(),
                location=EventLocation(
                    city=city,
                    country=country,
                    full_address=f"{city}, {country}" if country != "Unknown" else city
                ),
                category="endurance",
                sport_tag=sport_tag,
                federation=None,  # Ahotu n'a pas de fédérations
                registration_link=registration_link,
                image_logo_url=image_url
            )

        except Exception as e:
            self.logger.debug(f"Erreur parsing événement Running: {e}")
            return None

    def _extract_title_from_text(self, text: str) -> str:
        """
        Extrait le titre depuis le texte complet du lien

        Format typique Ahotu: "TitleLocationDateType"
        Exemples:
        - "Corrida de Noël - Bagnols-sur-CèzeBagnols-sur-Cèze, France30 Dec..."
        - "Marathon de ParisRisParis, France06 Apr, 2025..."
        """
        # Essayer de détecter où le titre se termine
        # Souvent avant une ville (majuscule suivie de minuscules)

        # Pattern 1: Titre jusqu'à la première virgule (souvent avant le pays)
        if ',' in text:
            parts = text.split(',')
            # Prendre tout avant la virgule et nettoyer
            before_comma = parts[0]

            # Enlever les distances (10k, 5k, etc.) et les jours
            before_comma = re.sub(r'\d+\s*km.*$', '', before_comma, flags=re.IGNORECASE)
            before_comma = re.sub(r'\(Mon\)|\(Tue\)|\(Wed\)|\(Thu\)|\(Fri\)|\(Sat\)|\(Sun\)', '', before_comma)

            # Si c'est trop long, c'est probablement concatené avec la ville
            if len(before_comma) > 60:
                # Essayer de trouver le dernier mot en majuscule qui pourrait être une ville
                words = before_comma.split()
                for i in range(len(words)-1, -1, -1):
                    if words[i][0].isupper() and i > 0:
                        # Potentiellement une ville, prendre tout avant
                        title = ' '.join(words[:i])
                        if len(title) > 3:
                            return title.strip()

            return before_comma.strip()

        # Pattern 2: Prendre les premiers mots (max 60 caractères)
        if len(text) > 60:
            return text[:60].strip()

        return text.strip()

    def _extract_location_from_text(self, text: str) -> Optional[str]:
        """
        Extrait la localisation depuis le texte

        Format: "...City, Country..."
        """
        # Chercher pattern "City, Country"
        pattern = r'([A-ZÀ-Ü][a-zà-ü\-]+(?:\s+[A-ZÀ-Ü][a-zà-ü\-]+)*),\s*([A-ZÀ-Ü][a-zà-ü\-]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)'
        match = re.search(pattern, text)
        if match:
            return f"{match.group(1)}, {match.group(2)}"

        return None

    def _parse_location_from_full_text(self, text: str) -> tuple:
        """
        Parse la localisation depuis le texte complet
        Retourne (city, country)
        """
        location = self._extract_location_from_text(text)
        if location:
            return extract_city_country(location)
        return ("Unknown", "Unknown")

    def _determine_sport_tag(self, title: str) -> str:
        """
        Détermine le sport_tag selon la logique définie:
        - "trail" si le titre contient "Trail"
        - "marathon" si le titre contient "Marathon" (mais pas "Half" ou "Semi")
        - "running" si le titre contient "Half", "Semi", "10k", "5k"
        - "running" par défaut pour tout le reste
        """
        title_lower = title.lower()

        # Priorité 1: Trail
        if 'trail' in title_lower:
            return "trail"

        # Priorité 2: Marathon (mais pas semi/half)
        if 'marathon' in title_lower:
            # Vérifier qu'il n'y a pas "half" ou "semi"
            if 'half' not in title_lower and 'semi' not in title_lower:
                return "marathon"

        # Priorité 3: Half/Semi Marathon ou 10k/5k
        if any(keyword in title_lower for keyword in ['half', 'semi', '10k', '5k', '10 k', '5 k']):
            return "running"

        # Par défaut: running
        return "running"
