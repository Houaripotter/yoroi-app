"""
Smoothcomp Event Scraper with STRICT filtering for grappling events only.
Filters out striking sports and keeps only grappling/wrestling related events.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re
import json
from typing import Optional, List
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SmoothcompScraper:
    """Scraper for Smoothcomp with strict sport filtering."""

    BASE_URL = "https://smoothcomp.com"
    EVENTS_URL = f"{BASE_URL}/en/events/upcoming/search"

    # Sports to REJECT (striking/non-grappling)
    REJECTED_KEYWORDS = [
        "mma",
        "sambo",
        "combat sambo",
        "pancrace",
        "kenpo",
        "kung fu",
        "kungfu",
        "karate",
        "karaté",
        "taekwondo",
        "tkd",
        "boxing",
        "boxe",
        "kickboxing",
        "kick boxing",
        "kick-boxing",
        "muay thai",
        "muaythai",
        "k-1",
        "k1",
        "sanda",
        "savate",
        "full contact",
        "lethwei",
        "judo",  # Separate sport
        "kendo",
        "fencing",
        "kyokushin",
        "wushu",
        "capoeira",
    ]

    # Sports to KEEP (grappling + endurance)
    ACCEPTED_KEYWORDS = [
        # Grappling/JJB
        "jiu-jitsu",
        "jiu jitsu",
        "jiujitsu",
        "jjb",
        "bjj",
        "brazilian",
        "grappling",
        "no-gi",
        "nogi",
        "no gi",
        "adcc",
        "wrestling",
        "lutte",
        "catch",
        "submission",
        "sub only",
        "submission only",
        "ibjjf",
        "uaejjf",
        "sjjif",
        "cbjj",
        "luta livre",
        # Endurance
        "hyrox",
        "marathon",
        "semi-marathon",
        "half marathon",
        "trail",
        "ultra trail",
        "running",
        "course",
        "10km",
        "10k",
        "20km",
        "triathlon",
    ]

    # European countries and major cities for location filtering
    EUROPE_LOCATIONS = [
        # Countries
        "france", "french", "francia",
        "germany", "deutschland", "allemagne",
        "spain", "españa", "espagne",
        "italy", "italia", "italie",
        "portugal",
        "netherlands", "holland", "pays-bas",
        "belgium", "belgique", "belgie",
        "switzerland", "suisse", "schweiz",
        "austria", "österreich", "autriche",
        "poland", "polska", "pologne",
        "czech", "czechia",
        "hungary", "hongrie",
        "romania", "roumanie",
        "bulgaria", "bulgarie",
        "croatia", "croatie",
        "serbia", "serbie",
        "slovenia", "slovénie",
        "slovakia", "slovaquie",
        "greece", "grèce",
        "ireland", "irlande",
        "scotland", "écosse",
        "wales", "pays de galles",
        "england", "angleterre",
        "united kingdom", "uk", "royaume-uni",
        "sweden", "suède", "sverige",
        "norway", "norvège", "norge",
        "denmark", "danemark", "danmark",
        "finland", "finlande",
        "iceland", "islande",
        "lithuania", "lituanie",
        "latvia", "lettonie",
        "estonia", "estonie",
        "ukraine",
        "luxembourg",
        "monaco",
        # French cities
        "paris", "lyon", "marseille", "toulouse", "nice", "nantes",
        "strasbourg", "montpellier", "bordeaux", "lille", "rennes",
        "reims", "toulon", "grenoble", "dijon", "angers", "nîmes",
        "clermont", "le havre", "aix", "brest", "tours", "amiens",
        "limoges", "perpignan", "metz", "besançon", "orléans",
        "rouen", "caen", "nancy", "saint-étienne", "avignon",
        # Major European cities
        "london", "manchester", "birmingham", "leeds", "liverpool",
        "berlin", "munich", "hamburg", "frankfurt", "cologne", "düsseldorf",
        "madrid", "barcelona", "valencia", "seville", "bilbao", "malaga",
        "rome", "milan", "naples", "turin", "florence", "venice", "bologna",
        "lisbon", "porto", "braga",
        "amsterdam", "rotterdam", "utrecht", "hague",
        "brussels", "antwerp", "ghent", "bruges",
        "zurich", "geneva", "basel", "bern", "lausanne",
        "vienna", "salzburg", "innsbruck",
        "warsaw", "krakow", "gdansk", "wroclaw", "poznan",
        "prague", "brno",
        "budapest",
        "bucharest", "cluj",
        "sofia",
        "zagreb",
        "belgrade",
        "ljubljana",
        "bratislava",
        "athens", "thessaloniki",
        "dublin", "cork", "galway", "belfast",
        "stockholm", "gothenburg", "malmö",
        "oslo", "bergen",
        "copenhagen", "aarhus",
        "helsinki",
        "vilnius", "kaunas",
        "riga",
        "tallinn",
        "kyiv", "lviv", "odessa",
    ]

    def __init__(self, europe_only: bool = False):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        })
        self.rejected_count = 0
        self.accepted_count = 0
        self.location_rejected_count = 0
        self.europe_only = europe_only

    def _is_european_location(self, location: str, title: str) -> bool:
        """Check if event location or title indicates a European location."""
        # Combine location and title for checking
        text_to_check = f"{location} {title}".lower()

        for loc in self.EUROPE_LOCATIONS:
            if loc in text_to_check:
                return True
        return False

    def _is_rejected_sport(self, title: str) -> bool:
        """Check if the event title contains a rejected sport keyword."""
        title_lower = title.lower()
        for keyword in self.REJECTED_KEYWORDS:
            if keyword in title_lower:
                logger.info(f"REJECTED (contains '{keyword}'): {title}")
                return True
        return False

    def _is_accepted_sport(self, title: str) -> bool:
        """Check if the event title contains an accepted grappling keyword."""
        title_lower = title.lower()
        for keyword in self.ACCEPTED_KEYWORDS:
            if keyword in title_lower:
                return True
        return False

    def _should_keep_event(self, title: str) -> bool:
        """
        Determine if an event should be kept based on strict filtering.

        Logic:
        1. If title contains any REJECTED keyword -> REJECT
        2. If title contains any ACCEPTED keyword -> KEEP
        3. Otherwise -> REJECT (strict mode)
        """
        # First check for rejected keywords (takes priority)
        if self._is_rejected_sport(title):
            self.rejected_count += 1
            return False

        # Then check for accepted keywords
        if self._is_accepted_sport(title):
            self.accepted_count += 1
            return True

        # If no match, reject by default (strict filtering)
        logger.info(f"REJECTED (no grappling keyword found): {title}")
        self.rejected_count += 1
        return False

    def _determine_sport_type(self, title: str) -> str:
        """Determine the specific sport type from title."""
        title_lower = title.lower()

        if any(kw in title_lower for kw in ["no-gi", "nogi", "no gi"]):
            return "No-Gi"
        if any(kw in title_lower for kw in ["adcc"]):
            return "ADCC/Grappling"
        if any(kw in title_lower for kw in ["wrestling", "lutte"]):
            return "Wrestling"
        if any(kw in title_lower for kw in ["grappling"]):
            return "Grappling"
        if any(kw in title_lower for kw in ["jiu-jitsu", "jiu jitsu", "jiujitsu", "jjb", "bjj", "brazilian", "ibjjf"]):
            return "Jiu-Jitsu"
        if any(kw in title_lower for kw in ["submission", "sub only"]):
            return "Submission Wrestling"
        if any(kw in title_lower for kw in ["luta livre"]):
            return "Luta Livre"

        return "Grappling"

    def _get_sport_tag(self, title: str) -> str:
        """Get sport tag for app compatibility (jjb or grappling)."""
        title_lower = title.lower()

        # JJB keywords
        if any(kw in title_lower for kw in ["jiu-jitsu", "jiu jitsu", "jiujitsu", "jjb", "bjj", "brazilian", "ibjjf"]):
            return "jjb"

        # Everything else is grappling
        return "grappling"

    def _parse_location(self, location: str, title: str) -> tuple:
        """Parse location string and title to extract city and country."""
        # City detection from title (common pattern: "Event CITY")
        city_mappings = {
            "london": ("London", "United Kingdom"),
            "manchester": ("Manchester", "United Kingdom"),
            "birmingham": ("Birmingham", "United Kingdom"),
            "leeds": ("Leeds", "United Kingdom"),
            "liverpool": ("Liverpool", "United Kingdom"),
            "belfast": ("Belfast", "United Kingdom"),
            "scotland": ("Glasgow", "United Kingdom"),
            "dublin": ("Dublin", "Ireland"),
            "cork": ("Cork", "Ireland"),
            "galway": ("Galway", "Ireland"),
            "paris": ("Paris", "France"),
            "lyon": ("Lyon", "France"),
            "marseille": ("Marseille", "France"),
            "bordeaux": ("Bordeaux", "France"),
            "toulouse": ("Toulouse", "France"),
            "nice": ("Nice", "France"),
            "nantes": ("Nantes", "France"),
            "strasbourg": ("Strasbourg", "France"),
            "lille": ("Lille", "France"),
            "berlin": ("Berlin", "Germany"),
            "munich": ("Munich", "Germany"),
            "hamburg": ("Hamburg", "Germany"),
            "frankfurt": ("Frankfurt", "Germany"),
            "cologne": ("Cologne", "Germany"),
            "madrid": ("Madrid", "Spain"),
            "barcelona": ("Barcelona", "Spain"),
            "valencia": ("Valencia", "Spain"),
            "seville": ("Seville", "Spain"),
            "bilbao": ("Bilbao", "Spain"),
            "rome": ("Rome", "Italy"),
            "milan": ("Milan", "Italy"),
            "naples": ("Naples", "Italy"),
            "florence": ("Florence", "Italy"),
            "lisbon": ("Lisbon", "Portugal"),
            "porto": ("Porto", "Portugal"),
            "amsterdam": ("Amsterdam", "Netherlands"),
            "rotterdam": ("Rotterdam", "Netherlands"),
            "brussels": ("Brussels", "Belgium"),
            "antwerp": ("Antwerp", "Belgium"),
            "zurich": ("Zurich", "Switzerland"),
            "geneva": ("Geneva", "Switzerland"),
            "vienna": ("Vienna", "Austria"),
            "warsaw": ("Warsaw", "Poland"),
            "krakow": ("Krakow", "Poland"),
            "prague": ("Prague", "Czech Republic"),
            "budapest": ("Budapest", "Hungary"),
            "bucharest": ("Bucharest", "Romania"),
            "sofia": ("Sofia", "Bulgaria"),
            "zagreb": ("Zagreb", "Croatia"),
            "belgrade": ("Belgrade", "Serbia"),
            "ljubljana": ("Ljubljana", "Slovenia"),
            "athens": ("Athens", "Greece"),
            "stockholm": ("Stockholm", "Sweden"),
            "gothenburg": ("Gothenburg", "Sweden"),
            "oslo": ("Oslo", "Norway"),
            "copenhagen": ("Copenhagen", "Denmark"),
            "helsinki": ("Helsinki", "Finland"),
            "vilnius": ("Vilnius", "Lithuania"),
            "riga": ("Riga", "Latvia"),
            "tallinn": ("Tallinn", "Estonia"),
            "kyiv": ("Kyiv", "Ukraine"),
            "lviv": ("Lviv", "Ukraine"),
            # French regions
            "france": ("Paris", "France"),
            "french": ("Paris", "France"),
            "cataluña": ("Barcelona", "Spain"),
            "northern ireland": ("Belfast", "United Kingdom"),
            "ireland": ("Dublin", "Ireland"),
            "uk": ("London", "United Kingdom"),
            "morocco": ("Casablanca", "Morocco"),
        }

        text_to_check = f"{title} {location}".lower()

        for keyword, (city, country) in city_mappings.items():
            if keyword in text_to_check:
                return (city, country)

        # Default to Europe
        return ("Europe", "Europe")

    def _parse_date(self, date_str: str) -> str:
        """Parse date string to ISO format."""
        import re
        from datetime import datetime

        if not date_str:
            return datetime.now().strftime("%Y-%m-%d")

        # Try to extract date from various formats
        # Format: "31 Jan" or "31 Jan - 01 Feb"
        match = re.search(r'(\d{1,2})\s*([A-Za-z]+)', date_str)
        if match:
            day = int(match.group(1))
            month_str = match.group(2).lower()[:3]
            months = {
                'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
            }
            month = months.get(month_str, 1)
            year = 2026 if month >= 1 else 2025  # Assume upcoming events
            try:
                return f"{year}-{month:02d}-{day:02d}"
            except:
                pass

        # Try ISO format
        if re.match(r'\d{4}-\d{2}-\d{2}', date_str):
            return date_str[:10]

        # Default to current date
        return datetime.now().strftime("%Y-%m-%d")

    def _generate_id(self, title: str, url: str) -> str:
        """Generate a unique ID for the event."""
        # Extract event ID from URL if present
        match = re.search(r'/event/(\d+)', url)
        if match:
            return f"sc_{match.group(1)}"
        clean_title = re.sub(r'[^a-zA-Z0-9]', '', title.lower())[:30]
        return f"sc_{clean_title}"

    def _extract_events_from_jsonld(self, html: str) -> List[str]:
        """Extract event URLs from JSON-LD structured data."""
        soup = BeautifulSoup(html, "html.parser")
        script_tags = soup.find_all("script", type="application/ld+json")

        event_urls = []
        for script in script_tags:
            try:
                data = json.loads(script.string)
                if data.get("@type") == "ItemList" and "itemListElement" in data:
                    for item in data["itemListElement"]:
                        if "url" in item:
                            event_urls.append(item["url"])
            except (json.JSONDecodeError, TypeError):
                continue

        return event_urls

    def _fetch_event_details(self, url: str) -> Optional[dict]:
        """Fetch and parse individual event details."""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract title - prioritize og:title as it's most reliable
            title = ""
            og_title = soup.find("meta", property="og:title")
            if og_title:
                title = og_title.get("content", "")

            # Fallback to h1
            if not title:
                h1_elem = soup.select_one("h1")
                if h1_elem:
                    title = h1_elem.get_text(strip=True)

            if not title:
                return None

            # STRICT FILTERING
            if not self._should_keep_event(title):
                return None

            # Extract date and location from JSON-LD first (most reliable)
            date_str = ""
            location = ""
            country = ""

            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string)
                    if data.get("@type") == "Event":
                        if "startDate" in data:
                            date_str = data["startDate"]
                        if "location" in data:
                            loc_data = data["location"]
                            if isinstance(loc_data, dict):
                                if "name" in loc_data:
                                    location = loc_data["name"]
                                if "address" in loc_data:
                                    addr = loc_data["address"]
                                    if isinstance(addr, dict):
                                        country = addr.get("addressCountry", "")
                                        city = addr.get("addressLocality", "")
                                        if city:
                                            location = f"{city}, {country}" if country else city
                                    elif isinstance(addr, str):
                                        location = addr
                            elif isinstance(loc_data, str):
                                location = loc_data
                        break
                except (json.JSONDecodeError, TypeError):
                    continue

            # Fallback date extraction
            if not date_str:
                date_elem = soup.select_one("time, [datetime], .event-date, .date")
                if date_elem:
                    date_str = date_elem.get("datetime") or date_elem.get_text(strip=True)

            # Fallback location extraction
            if not location:
                location_elem = soup.select_one(".location, .venue, [class*='location'], [class*='venue']")
                if location_elem:
                    location = location_elem.get_text(strip=True)

            # Apply Europe filter if enabled
            if self.europe_only:
                if not self._is_european_location(location + " " + country, title):
                    logger.info(f"REJECTED (not in Europe): {title} [{location}]")
                    self.location_rejected_count += 1
                    return None

            sport = self._determine_sport_type(title)
            sport_tag = self._get_sport_tag(title)

            # Parse city and country from location
            city, country_name = self._parse_location(location, title)

            # Parse date to ISO format
            date_iso = self._parse_date(date_str)

            event_data = {
                "id": self._generate_id(title, url),
                "title": title,
                "date_start": date_iso,
                "location": {
                    "city": city,
                    "country": country_name,
                    "full_address": location,
                },
                "category": "combat",  # All grappling is combat
                "sport_tag": sport_tag,
                "registration_link": url,
                "federation": sport,
                "image_logo_url": None,
            }

            logger.info(f"ACCEPTED: {title} [{sport_tag}] - {city}, {country_name}")
            return event_data

        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

    def scrape_events(self, max_events: int = 300) -> list:
        """
        Scrape events from Smoothcomp with strict filtering.

        Args:
            max_events: Maximum number of events to process

        Returns:
            List of filtered event dictionaries (grappling only)
        """
        all_events = []
        self.rejected_count = 0
        self.accepted_count = 0

        logger.info("Fetching event list from Smoothcomp...")

        try:
            response = self.session.get(self.EVENTS_URL, timeout=30)
            response.raise_for_status()

            # Extract event URLs from JSON-LD
            event_urls = self._extract_events_from_jsonld(response.text)
            logger.info(f"Found {len(event_urls)} event URLs")

            # Limit to max_events
            event_urls = event_urls[:max_events]

            # Process each event
            for i, url in enumerate(event_urls):
                if i > 0 and i % 10 == 0:
                    logger.info(f"Processed {i}/{len(event_urls)} events...")
                    time.sleep(0.5)  # Be nice to the server

                event_data = self._fetch_event_details(url)
                if event_data:
                    all_events.append(event_data)

        except requests.RequestException as e:
            logger.error(f"Error fetching events: {e}")

        logger.info(f"\n{'='*50}")
        logger.info(f"SCRAPING COMPLETE")
        logger.info(f"Total ACCEPTED: {len(all_events)}")
        logger.info(f"Sport filter rejected: {self.rejected_count}")
        if self.europe_only:
            logger.info(f"Location filter rejected: {self.location_rejected_count}")
        logger.info(f"{'='*50}\n")

        return all_events


# For testing
if __name__ == "__main__":
    scraper = SmoothcompScraper()
    events = scraper.scrape_events(max_events=50)

    print(f"\nFound {len(events)} grappling events:")
    for event in events:
        print(f"  - {event['title']} ({event['sport']})")
