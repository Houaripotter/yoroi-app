"""
Configuration du logging
"""
import logging
import sys

def setup_logger(name: str = "yoroi-scraper") -> logging.Logger:
    """Configure et retourne un logger"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Handler console
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)

    # Format
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    return logger
