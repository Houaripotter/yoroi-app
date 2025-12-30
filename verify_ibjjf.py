import json

with open('output/events.json', 'r') as f:
    data = json.load(f)

# Count IBJJF events
ibjjf_events = [e for e in data if e.get('federation') == 'IBJJF']
print(f'IBJJF Events: {len(ibjjf_events)}')

# Check data quality
with_images = sum(1 for e in ibjjf_events if e.get('image_logo_url'))
with_links = sum(1 for e in ibjjf_events if e.get('registration_link'))
with_location = sum(1 for e in ibjjf_events if e.get('location', {}).get('city') != 'Unknown')

print(f'With images: {with_images}/{len(ibjjf_events)}')
print(f'With links: {with_links}/{len(ibjjf_events)}')
print(f'With location: {with_location}/{len(ibjjf_events)}')

# Sample first event
if ibjjf_events:
    print('\nSample IBJJF event:')
    sample = ibjjf_events[0]
    print(f'Title: {sample["title"]}')
    print(f'Date: {sample["date_start"]}')
    print(f'Location: {sample["location"]["city"]}, {sample["location"]["country"]}')
    print(f'Sport: {sample["sport_tag"]}')
    print(f'Federation: {sample["federation"]}')

# Check all sources
print('\n' + '='*50)
print('COMPLETE STATISTICS BY SOURCE:')
print('='*50)

sources = {
    'HYROX': [e for e in data if e.get('sport_tag') == 'hyrox'],
    'Smoothcomp': [e for e in data if e.get('federation') != 'IBJJF' and e.get('sport_tag') in ['jjb', 'grappling']],
    'IBJJF': [e for e in data if e.get('federation') == 'IBJJF'],
    'CFJJB': [e for e in data if e.get('federation') == 'CFJJB'],
    'Running/Trail': [e for e in data if e.get('sport_tag') in ['marathon', 'running', 'trail']],
}

for source, events in sources.items():
    print(f'\n{source}: {len(events)} events')

# Check by sport tag
print('\n' + '='*50)
print('STATISTICS BY SPORT TAG:')
print('='*50)

from collections import Counter
sport_counts = Counter(e['sport_tag'] for e in data)
for sport, count in sorted(sport_counts.items(), key=lambda x: x[1], reverse=True):
    print(f'{sport.upper()}: {count} events')

print(f'\n{"="*50}')
print(f'TOTAL: {len(data)} events')
print(f'{"="*50}')
