"""
Fonctions utilitaires
"""
from datetime import datetime
from dateutil import parser
from typing import Optional


def parse_date(date_string: str) -> Optional[datetime]:
    """
    Parse une date depuis différents formats
    Exemples: "March 15, 2024", "15/03/2024", "2024-03-15"
    """
    try:
        return parser.parse(date_string, fuzzy=True)
    except (ValueError, TypeError):
        return None


def normalize_country_name(country: str) -> str:
    """
    Normalise les noms de pays
    Ex: "USA" -> "United States", "UK" -> "United Kingdom"
    """
    country_mapping = {
        "USA": "United States",
        "US": "United States",
        "UK": "United Kingdom",
        "UAE": "United Arab Emirates",
        "NL": "Netherlands",
        "FR": "France",
        "ES": "Spain",
        "IT": "Italy",
        "DE": "Germany",
        "PT": "Portugal",
        "BE": "Belgium",
    }
    country_clean = country.strip()
    return country_mapping.get(country_clean, country_clean)


def extract_city_country(location_string: str) -> tuple[str, str]:
    """
    Extrait ville et pays depuis une chaîne
    Ex: "Paris, France" -> ("Paris", "France")
    Ex: "New York, NY, USA" -> ("New York", "United States")
    """
    parts = [p.strip() for p in location_string.split(',')]

    if len(parts) >= 2:
        city = parts[0]
        country = normalize_country_name(parts[-1])
        return city, country

    return location_string, "Unknown"
