"""
Scrapers package
"""
from .base_scraper import BaseScraper
from .hyrox_scraper import HyroxScraper
from .smoothcomp_scraper import SmoothcompScraper

__all__ = ['BaseScraper', 'HyroxScraper', 'SmoothcompScraper']
