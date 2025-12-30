"""
Scraper pour les événements HYROX France
Source: https://hyroxfrance.com/fr/trouve-ta-course/
Version SIMPLIFIÉE basée sur la structure réelle du site
"""
from typing import List, Optional
from datetime import datetime, timedelta
import re

from scrapers.base_scraper import BaseScraper
from models.event import Event, EventLocation
from utils.helpers import parse_date, extract_city_country
from config import HYROX_URL


class HyroxScraper(BaseScraper):
    """
    Scraper pour HYROX France
    Site: https://hyroxfrance.com/fr/trouve-ta-course/

    Structure du site:
    - Liste d'événements dans une grille
    - Chaque événement = <h2><a href="/event/...">HYROX City</a></h2>
    - Pas de dates/localisations sur la page liste (faudrait scraper chaque page individuelle)
    """

    def scrape(self) -> List[Event]:
        """
        Scrape les événements HYROX France
        Stratégie simple : extraire tous les liens vers /event/
        """
        events = []
        seen_urls = set()

        try:
            soup = self.fetch_page(HYROX_URL)

            # Chercher tous les liens vers des événements
            # Structure: <h2 class="post_title"><a href="/event/...">Title</a></h2>
            all_links = soup.find_all('a', href=True)

            event_links = []
            for link in all_links:
                href = link.get('href', '')

                # Filtrer: doit contenir '/event/' et ne pas être un bouton
                if '/event/' in href and 'w-btn' not in str(link.get('class', [])):
                    # Vérifier que le lien a du texte (pas juste une image)
                    text = link.get_text(strip=True)
                    if text and len(text) > 3:
                        event_links.append(link)

            self.logger.info(f"Trouvé {len(event_links)} liens d'événements HYROX")

            # Parser chaque lien
            for i, link in enumerate(event_links):
                try:
                    href = link.get('href', '')

                    # Éviter les doublons
                    if href in seen_urls:
                        continue
                    seen_urls.add(href)

                    # Parser l'événement
                    event = self._parse_event_link(link)
                    if event:
                        events.append(event)
                        self.logger.debug(f"✅ Événement #{i+1}: {event.title}")
                    else:
                        self.logger.debug(f"⚠️ Événement #{i+1} ignoré (parsing échoué)")

                except Exception as e:
                    self.logger.debug(f"⚠️ Erreur événement #{i+1}: {e}")
                    continue

            self.logger.info(f"✅ {len(events)} événements HYROX récupérés (sur {len(event_links)} liens)")

        except Exception as e:
            self.logger.error(f"Erreur scraping HYROX: {e}")

        return events

    def _parse_event_link(self, link) -> Optional[Event]:
        """
        Parse un lien d'événement HYROX

        Structure:
        <a href="https://hyroxfrance.com/fr/event/hyrox-amsterdam/">HYROX Amsterdam</a>

        Informations disponibles:
        - Titre: dans le texte du lien
        - Ville: extraite du titre (dernier(s) mot(s))
        - URL: dans le href
        - Date: NON disponible sur la page liste (défaut = dans 90 jours)
        """
        try:
            # Titre
            title = link.get_text(strip=True)

            if not title or len(title) < 3:
                return None

            # Ajouter "HYROX" au début si absent
            if not title.upper().startswith('HYROX'):
                title = f"HYROX {title}"

            # URL
            href = link.get('href', '')

            # Rendre le lien absolu si nécessaire
            if href.startswith('/'):
                registration_link = f"https://hyroxfrance.com{href}"
            elif not href.startswith('http'):
                registration_link = f"https://hyroxfrance.com/{href}"
            else:
                registration_link = href

            # Extraire la ville depuis le titre
            # Format typique: "HYROX Amsterdam", "Myprotein HYROX Manchester", etc.
            city = self._extract_city_from_title(title)

            # Extraire le pays depuis l'URL slug (si possible)
            country = self._extract_country_from_slug(href)

            # Date: non disponible sur la page liste
            # Option 1: Utiliser une date par défaut (90 jours dans le futur)
            # Option 2: Scraper chaque page individuelle (trop lent)
            date_start = datetime.now() + timedelta(days=90)

            # Image: chercher dans le parent
            image_url = None
            parent = link.parent
            if parent:
                # Remonter jusqu'à trouver un conteneur d'événement
                for _ in range(3):  # Max 3 niveaux
                    if parent:
                        img = parent.find('img')
                        if img:
                            image_url = img.get('src') or img.get('data-src')
                            if image_url and image_url.startswith('/'):
                                image_url = f"https://hyroxfrance.com{image_url}"
                            break
                        parent = parent.parent

            return Event(
                title=title,
                date_start=date_start.date(),
                location=EventLocation(
                    city=city,
                    country=country,
                    full_address=f"{city}, {country}" if country != "Unknown" else city
                ),
                category="endurance",
                sport_tag="hyrox",
                federation="HYROX",
                registration_link=registration_link,
                image_logo_url=image_url
            )

        except Exception as e:
            self.logger.debug(f"Erreur parsing événement HYROX: {e}")
            return None

    def _extract_city_from_title(self, title: str) -> str:
        """
        Extrait le nom de la ville depuis le titre

        Exemples:
        - "HYROX Amsterdam" -> "Amsterdam"
        - "Myprotein HYROX Manchester" -> "Manchester"
        - "HYROX Paris Grand Palais" -> "Paris"
        - "well come FIT HYROX ST_GALLEN" -> "St Gallen"
        """
        # Nettoyer le titre
        title = title.replace('_', ' ').replace('-', ' ')

        # Mots à ignorer (sponsors, mots-clés, marques)
        ignore_words = [
            'HYROX', 'Myprotein', 'Smart', 'Fit', 'Legendz', 'Maybelline',
            'well', 'come', 'FIT', 'Championships', 'Championship',
            'EMEA', 'APAC', 'Youngstars', 'Grand', 'Palais',
            'BYD', 'CENTR', 'AirAsia', 'Creapure®', 'Creapure',
            'ST', 'D', 'C',  # Pour "Washington D.C."
        ]

        # Séparer en mots
        words = title.split()

        # Filtrer les mots ignorés (case-insensitive)
        ignore_words_lower = [w.lower() for w in ignore_words]
        city_words = [w for w in words if w.lower() not in ignore_words_lower and len(w) > 1]

        if not city_words:
            # Si rien trouvé, prendre le dernier mot du titre original
            return words[-1] if words else "Unknown"

        # Prendre le dernier mot (c'est généralement la ville)
        city = city_words[-1]

        # Cas spéciaux: villes à 2 mots
        two_word_cities = ['Las Vegas', 'Hong Kong', 'New York', 'San Francisco',
                          'Los Angeles', 'Miami Beach', 'St Gallen', 'Grand Palais']

        if len(city_words) >= 2:
            potential_city = f"{city_words[-2]} {city_words[-1]}"
            if potential_city in two_word_cities or city_words[-2].lower() in ['saint', 'st', 'san', 'new', 'los', 'las']:
                city = potential_city

        # Capitaliser correctement
        return city.title()

    def _extract_country_from_slug(self, url: str) -> str:
        """
        Extrait le pays depuis l'URL ou devine depuis la ville

        Pour l'instant, retourne "France" par défaut car c'est HYROX France
        TODO: Implémenter une logique plus sophistiquée avec un mapping ville->pays
        """
        # Mapping simple des villes connues
        city_to_country = {
            'paris': 'France',
            'toulouse': 'France',
            'nice': 'France',
            'amsterdam': 'Netherlands',
            'rotterdam': 'Netherlands',
            'heerenveen': 'Netherlands',
            'manchester': 'United Kingdom',
            'london': 'United Kingdom',
            'glasgow': 'United Kingdom',
            'cardiff': 'United Kingdom',
            'birmingham': 'United Kingdom',
            'berlin': 'Germany',
            'cologne': 'Germany',
            'hamburg': 'Germany',
            'munich': 'Germany',
            'vienna': 'Austria',
            'gallen': 'Switzerland',
            'st-gallen': 'Switzerland',
            'zurich': 'Switzerland',
            'copenhagen': 'Denmark',
            'barcelona': 'Spain',
            'bilbao': 'Spain',
            'malaga': 'Spain',
            'madrid': 'Spain',
            'lisboa': 'Portugal',
            'lisbon': 'Portugal',
            'istanbul': 'Turkey',
            'warsaw': 'Poland',
            'katowice': 'Poland',
            'singapore': 'Singapore',
            'hong-kong': 'Hong Kong',
            'hongkong': 'Hong Kong',
            'bangkok': 'Thailand',
            'taipei': 'Taiwan',
            'osaka': 'Japan',
            'tokyo': 'Japan',
            'auckland': 'New Zealand',
            'brisbane': 'Australia',
            'melbourne': 'Australia',
            'sydney': 'Australia',
            'miami': 'United States',
            'phoenix': 'United States',
            'las-vegas': 'United States',
            'vegas': 'United States',
            'houston': 'United States',
            'washington': 'United States',
            'chicago': 'United States',
            'new-york': 'United States',
            'dallas': 'United States',
            'guadalajara': 'Mexico',
            'monterrey': 'Mexico',
            'cancun': 'Mexico',
            'fortaleza': 'Brazil',
            'turin': 'Italy',
            'torino': 'Italy',
            'bologna': 'Italy',
            'rome': 'Italy',
            'milan': 'Italy',
            'mechelen': 'Belgium',
            'brussels': 'Belgium',
            'helsinki': 'Finland',
            'bengaluru': 'India',
            'bangalore': 'India',
            'incheon': 'South Korea',
            'seoul': 'South Korea',
        }

        # Extraire le slug de l'URL
        # https://hyroxfrance.com/fr/event/hyrox-amsterdam/ -> hyrox-amsterdam
        url_lower = url.lower()
        for city_slug, country in city_to_country.items():
            if city_slug in url_lower:
                return country

        # Par défaut, retourner "International" (car HYROX est mondial)
        return "International"
