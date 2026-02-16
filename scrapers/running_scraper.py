#!/usr/bin/env python3
"""
YOROI - Scraper de Courses Running/Trail
Extrait les courses depuis les principaux sites français
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
from typing import List, Dict
import re

class RunningScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        self.races = []

    def clean_text(self, text: str) -> str:
        """Nettoie le texte extrait"""
        return ' '.join(text.split()).strip() if text else ''

    def parse_date(self, date_str: str) -> str:
        """Convertit une date en format ISO (YYYY-MM-DD)"""
        try:
            # Essayer plusieurs formats
            for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d']:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime('%Y-%m-%d')
                except:
                    continue
            return date_str
        except:
            return date_str

    def scrape_finishers(self) -> List[Dict]:
        """Scrape https://www.finishers.com/"""
        print("🏃 Scraping Finishers.com...")
        races = []

        try:
            url = "https://www.finishers.com/course/running"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Chercher les cartes de courses
            race_cards = soup.find_all('div', class_=['race-card', 'event-card'])

            for card in race_cards[:50]:  # Limiter à 50 courses
                try:
                    title_elem = card.find(['h2', 'h3', 'h4'], class_=re.compile('title|name'))
                    date_elem = card.find(['span', 'div', 'time'], class_=re.compile('date'))
                    location_elem = card.find(['span', 'div'], class_=re.compile('location|city|place'))
                    link_elem = card.find('a', href=True)

                    if title_elem and date_elem:
                        race = {
                            'id': f"finishers_{len(races)}",
                            'title': self.clean_text(title_elem.get_text()),
                            'date_start': self.parse_date(self.clean_text(date_elem.get_text())),
                            'location': {
                                'city': self.clean_text(location_elem.get_text()) if location_elem else 'France',
                                'country': 'France',
                                'full_address': ''
                            },
                            'category': 'endurance',
                            'sport_tag': 'running',
                            'registration_link': link_elem['href'] if link_elem else url,
                            'federation': 'Finishers',
                            'image_logo_url': None
                        }
                        races.append(race)
                except Exception as e:
                    print(f"  ⚠️ Erreur parsing course: {e}")
                    continue

            print(f"  ✅ {len(races)} courses trouvées sur Finishers")

        except Exception as e:
            print(f"  ❌ Erreur Finishers: {e}")

        time.sleep(1)  # Rate limiting
        return races

    def scrape_jogging_plus(self) -> List[Dict]:
        """Scrape https://www.jogging-plus.com/"""
        print("🏃 Scraping Jogging-Plus.com...")
        races = []

        try:
            url = "https://www.jogging-plus.com/calendrier"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Chercher les courses
            race_items = soup.find_all(['div', 'li'], class_=re.compile('race|event|course'))

            for item in race_items[:50]:
                try:
                    title = item.find(['h2', 'h3', 'h4', 'a'])
                    date = item.find(['time', 'span'], class_=re.compile('date'))
                    location = item.find(['span', 'div'], class_=re.compile('ville|city|lieu'))
                    link = item.find('a', href=True)

                    if title and date:
                        race = {
                            'id': f"joggingplus_{len(races)}",
                            'title': self.clean_text(title.get_text()),
                            'date_start': self.parse_date(self.clean_text(date.get_text())),
                            'location': {
                                'city': self.clean_text(location.get_text()) if location else 'France',
                                'country': 'France',
                                'full_address': ''
                            },
                            'category': 'endurance',
                            'sport_tag': 'running',
                            'registration_link': link['href'] if link else url,
                            'federation': 'Jogging Plus',
                            'image_logo_url': None
                        }
                        races.append(race)
                except Exception as e:
                    continue

            print(f"  ✅ {len(races)} courses trouvées sur Jogging-Plus")

        except Exception as e:
            print(f"  ❌ Erreur Jogging-Plus: {e}")

        time.sleep(1)
        return races

    def scrape_betrail(self) -> List[Dict]:
        """Scrape https://www.betrail.run/"""
        print("🏃 Scraping BeTrail.run...")
        races = []

        try:
            url = "https://www.betrail.run/calendrier"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            race_cards = soup.find_all(['div', 'article'], class_=re.compile('trail|race|event'))

            for card in race_cards[:50]:
                try:
                    title = card.find(['h2', 'h3', 'h4'])
                    date = card.find(['time', 'span'], class_=re.compile('date'))
                    location = card.find(['span', 'div'], class_=re.compile('location|lieu'))
                    link = card.find('a', href=True)

                    if title and date:
                        race = {
                            'id': f"betrail_{len(races)}",
                            'title': self.clean_text(title.get_text()),
                            'date_start': self.parse_date(self.clean_text(date.get_text())),
                            'location': {
                                'city': self.clean_text(location.get_text()) if location else 'France',
                                'country': 'France',
                                'full_address': ''
                            },
                            'category': 'nature',
                            'sport_tag': 'trail',
                            'registration_link': link['href'] if link else url,
                            'federation': 'BeTrail',
                            'image_logo_url': None
                        }
                        races.append(race)
                except Exception as e:
                    continue

            print(f"  ✅ {len(races)} trails trouvés sur BeTrail")

        except Exception as e:
            print(f"  ❌ Erreur BeTrail: {e}")

        time.sleep(1)
        return races

    def scrape_all(self) -> List[Dict]:
        """Lance tous les scrapers"""
        print("\n🚀 Démarrage du scraping...\n")

        all_races = []
        all_races.extend(self.scrape_finishers())
        all_races.extend(self.scrape_jogging_plus())
        all_races.extend(self.scrape_betrail())

        print(f"\n✅ Total: {len(all_races)} courses extraites")
        return all_races

    def save_to_json(self, races: List[Dict], filename: str = 'running_races.json'):
        """Sauvegarde en JSON"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(races, f, ensure_ascii=False, indent=2)
            print(f"💾 Données sauvegardées dans {filename}")
        except Exception as e:
            print(f"❌ Erreur sauvegarde: {e}")

if __name__ == "__main__":
    scraper = RunningScraper()
    races = scraper.scrape_all()
    scraper.save_to_json(races, '../src/data/running_races.json')
    print("\n✨ Scraping terminé !")
