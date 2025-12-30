"""
Classe abstraite pour tous les scrapers
"""
from abc import ABC, abstractmethod
from typing import List
import requests
from bs4 import BeautifulSoup

from models.event import Event
from utils.logger import setup_logger
from config import USER_AGENT, REQUEST_TIMEOUT


class BaseScraper(ABC):
    """Classe de base pour tous les scrapers"""

    def __init__(self):
        self.logger = setup_logger(self.__class__.__name__)
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': USER_AGENT})

    def fetch_page(self, url: str) -> BeautifulSoup:
        """
        Récupère et parse une page HTML
        """
        try:
            response = self.session.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'lxml')
        except requests.RequestException as e:
            self.logger.error(f"Erreur lors de la récupération de {url}: {e}")
            raise

    @abstractmethod
    def scrape(self) -> List[Event]:
        """
        Méthode principale de scraping
        Doit être implémentée par chaque scraper
        """
        pass

    def get_events(self) -> List[Event]:
        """
        Point d'entrée public pour récupérer les événements
        """
        self.logger.info(f"Démarrage du scraping {self.__class__.__name__}")
        events = self.scrape()
        self.logger.info(f"✅ {len(events)} événements récupérés")
        return events
