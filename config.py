"""
Configuration centralisée du scraper
"""
from pathlib import Path

# Dossiers
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_FILE = OUTPUT_DIR / "events.json"

# Assurer que le dossier output existe
OUTPUT_DIR.mkdir(exist_ok=True)

# URLs des sources
HYROX_URL = "https://hyroxfrance.com/fr/trouve-ta-course/"
SMOOTHCOMP_URL = "https://smoothcomp.com/en/events/upcoming"

# User-Agent pour éviter les blocages (Chrome récent, réaliste)
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Timeout pour les requêtes HTTP
REQUEST_TIMEOUT = 10

# Mapping catégories/tags
CATEGORY_MAPPING = {
    "hyrox": {"category": "endurance", "sport_tag": "hyrox", "federation": "HYROX"},
    "jjb": {"category": "combat", "sport_tag": "jjb", "federation": None},
    "grappling": {"category": "combat", "sport_tag": "grappling", "federation": None},
    "mma": {"category": "combat", "sport_tag": "mma", "federation": None},
}
