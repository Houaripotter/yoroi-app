#!/usr/bin/env python3
"""
Main script to run the Smoothcomp scraper and generate clean events.json.
Only grappling events are kept (Jiu-Jitsu, BJJ, Wrestling, Grappling, No-Gi).
"""

import json
import os
from datetime import datetime
from smoothcomp_scraper import SmoothcompScraper

# Output paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "src", "data", "events.json")


def main():
    print("=" * 60)
    print("SMOOTHCOMP SCRAPER - GRAPPLING EVENTS (EUROPE ONLY)")
    print("=" * 60)
    print()
    print("REJECTED sports: MMA, Sambo, Pancrace, Kenpo, Kung Fu,")
    print("                 Karate, Taekwondo, Boxing, Kickboxing, Muay Thai")
    print()
    print("ACCEPTED sports: Jiu-Jitsu, JJB, BJJ, Grappling, No-Gi,")
    print("                 ADCC, Wrestling, Lutte")
    print()
    print("LOCATION FILTER: France & Europe ONLY")
    print("=" * 60)
    print()

    # Initialize scraper with Europe filter
    scraper = SmoothcompScraper(europe_only=True)

    # Scrape events (up to 500 to get more European events)
    print("Starting scrape...")
    events = scraper.scrape_events(max_events=500)

    if not events:
        print("\nNo events found. The website structure may have changed.")
        print("Creating empty events.json...")
        events = []

    # Sort by date (earliest first for upcoming events)
    events.sort(key=lambda x: x.get("date_start", ""))

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    # Write events as a simple array (app expects this format)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"SUCCESS! Generated {OUTPUT_PATH}")
    print(f"Total clean events: {len(events)}")
    print(f"{'=' * 60}")

    # Print summary of events by sport
    sport_counts = {}
    for event in events:
        sport = event.get("sport", "Unknown")
        sport_counts[sport] = sport_counts.get(sport, 0) + 1

    if sport_counts:
        print("\nEvents by sport:")
        for sport, count in sorted(sport_counts.items(), key=lambda x: -x[1]):
            print(f"  {sport}: {count}")


if __name__ == "__main__":
    main()
