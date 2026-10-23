/**
 * Icones de l'espace Sante, dessinees en SVG (trait arrondi, style v2).
 */
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { traduire } from '@/lib/i18n/tr';

export type SanteIconName =
  | 'steps'
  | 'route'
  | 'stairs'
  | 'timer'
  | 'stand'
  | 'flame'
  | 'battery'
  | 'heart'
  | 'pulse'
  | 'wave'
  | 'gauge'
  | 'drop'
  | 'lungs'
  | 'wind'
  | 'moon'
  | 'thermo'
  | 'lotus'
  | 'scale'
  | 'body'
  | 'muscle'
  | 'sugar'
  | 'watch'
  | 'phone'
  | 'tablet'
  | 'link'
  | 'sync'
  | 'lock'
  | 'shield'
  | 'history'
  | 'chevron'
  | 'down'
  | 'up'
  | 'check'
  | 'close'
  | 'info'
  | 'download'
  | 'search'
  | 'wifi'
  | 'cloud'
  | 'save'
  | 'upload'
  | 'restore'
  | 'trash'
  | 'zones'
  | 'external'
  | 'spark'
  | 'sun'
  | 'bike'
  | 'swim'
  | 'mountain'
  | 'bolt'
  | 'speed'
  | 'cadence'
  | 'food'
  | 'cup'
  | 'ruler'
  | 'bone'
  | 'walk'
  | 'skin'
  | 'ear'
  | 'alert'
  | 'mood'
  | 'pill'
  | 'glass'
  | 'wheel'
  | 'leaf';

const P: Record<SanteIconName, string> = {
  steps: 'M8 3c1.7 0 2.6 1.8 2.4 4.2-.2 2.2-1 3.6-2.6 3.6S5.4 9.4 5.4 7.2C5.4 4.8 6.3 3 8 3zM5.8 13.2h4.2l-.4 2.6a2 2 0 0 1-3.6.4zM16 8c1.7 0 2.6 1.8 2.4 4.2-.2 2.2-1 3.6-2.6 3.6s-2.4-1.4-2.4-3.6C13.4 9.8 14.3 8 16 8zM13.8 18.2H18l-.4 2a2 2 0 0 1-3.6.4z',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9.5A3.5 3.5 0 0 1 9.5 6H11M18 9v5.5a3.5 3.5 0 0 1-3.5 3.5H13',
  stairs: 'M3 20h5v-5h5v-5h5V5h3',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M10 2h4M19 5l1.5 1.5',
  stand: 'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8v7M8 10l4-2 4 2M12 15l-2.5 6M12 15l2.5 6',
  flame: 'M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.4-5.2 3.6-8.4.4 2 1.6 3 2.6 3.5-.2-2.8 1-5.2 3-7 .3 3.4 4.3 5.7 4.3 11.4C19 18.4 15.9 21 12 21z',
  battery: 'M4 8h13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM21 11v2M7 11v2M10 11v2',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  wave: 'M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0 2 0 2 0',
  gauge: 'M4 16a8 8 0 1 1 16 0M12 16l4-5M4 20h16',
  drop: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11zM9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
  lungs: 'M12 4v8M12 12c-1-1-2.5-1.5-3.5-1M12 12c1-1 2.5-1.5 3.5-1M8.5 7C6 7 4 11 4 15.5 4 18 5 20 7 20c2 0 3-1.5 3-4V9.5C10 8 9.5 7 8.5 7zM15.5 7C18 7 20 11 20 15.5c0 2.5-1 4.5-3 4.5-2 0-3-1.5-3-4V9.5C14 8 14.5 7 15.5 7z',
  wind: 'M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  thermo: 'M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0zM12 9v7',
  lotus: 'M12 19c-4 0-8-2-9-6 3 0 6 1 9 4 3-3 6-4 9-4-1 4-5 6-9 6zM12 17c-2-2-3-5-3-8 1 0 2.5 1 3 2 .5-1 2-2 3-2 0 3-1 6-3 8z',
  scale: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8.5 10a3.5 3.5 0 0 1 7 0M12 10l1.5-2',
  body: traduire('M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 8h14M12 8v6M12 14l-3 7M12 14l3 7'),
  muscle: 'M4 15c0-4 3-6 5-6l1-4h3l-1 4c3 0 4 2 4 3 2-1 4 0 4 2s-2 4-6 4H8c-2 0-4-1-4-3z',
  sugar: 'M12 3l7 4v8l-7 4-7-4V7zM12 11l7-4M12 11L5 7M12 11v8',
  watch: 'M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2.5l1.5 1',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  tablet: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  sync: 'M20 11a8 8 0 0 0-14.3-4.3M4 4v4h4M4 13a8 8 0 0 0 14.3 4.3M20 20v-4h-4',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM9 12l2 2 4-4',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2',
  chevron: 'M9 5l7 7-7 7',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  wifi: 'M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 19.5h.01',
  cloud: 'M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  restore: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  zones: 'M4 20V14M9 20V10M14 20V7M19 20V4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  spark: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  bike: 'M6 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM6 14.5l4-6h5l3 6M10 8.5l2 6h-6M14 5h2.5',
  swim: 'M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M7 13l4-4 3 3M16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  mountain: 'M3 20l6-10 4 6 3-4 5 8zM8.5 11l1.5 1.5L11.5 11',
  bolt: 'M13 2L5 13h6l-1 9 8-11h-6z',
  speed: 'M4 16a8 8 0 1 1 16 0M12 16l5-6M8 20h8',
  cadence: 'M4 12h3l2-6 3 12 2-6h6M20 6v12',
  food: 'M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M16 21V3c2 1 3 4 3 7s-1 4-3 4',
  cup: 'M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M11 3v2M14 3v2',
  ruler: 'M3 16L16 3l5 5L8 21zM7 12l2 2M10 9l2 2M13 6l2 2',
  bone: 'M7 7a2.5 2.5 0 1 1 2-4 2.5 2.5 0 0 1 2 4l6 6a2.5 2.5 0 1 1 4 2 2.5 2.5 0 1 1-4 2l-6-6a2.5 2.5 0 1 1-4-2z',
  walk: 'M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 22l2-7 3 3v4M7 12l3-4 4 1 2 4h3M12 15l-2-7',
  skin: 'M12 3c3 0 7 2 7 7 0 6-4 11-7 11s-7-5-7-11c0-5 4-7 7-7zM9 10c1 1 2 1 3 0s2-1 3 0M9 14c1 1 2 1 3 0s2-1 3 0',
  ear: 'M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0M10 9.5a2 2 0 0 1 4 0c0 1.2-1 1.6-1.5 2.5',
  alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5h.01',
  mood: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14.5c1.8 2 5.2 2 7 0M9 9.5h.01M15 9.5h.01',
  pill: 'M9.2 4.8a4 4 0 0 1 5.7 5.7l-4.4 4.4a4 4 0 0 1-5.7-5.7zM7 7l5.6 5.6M14 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  glass: 'M7 3h10l-1 8a4 4 0 0 1-8 0zM12 15v6M8.5 21h7M7.5 7h9',
  wheel: 'M10 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM10 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 7v8h6l2 4',
  leaf: 'M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8',
};

export function SanteIcon({ name, size = 22, color = '#1D2029', width = 2 }: { name: SanteIconName; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={P[name]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Pastille d'icone sur fond teinte */
export function IconDot({ name, color, tint, size = 40 }: { name: SanteIconName; color: string; tint: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x={0} y={0} width={40} height={40} rx={13} fill={tint} />
      <Path d={P[name]} stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(8 8)" />
    </Svg>
  );
}

export const METRIC_ICON: Record<string, SanteIconName> = {
  pas: 'steps',
  distance: 'route',
  etages: 'stairs',
  exercice: 'timer',
  debout: 'stand',
  'energie-active': 'flame',
  'energie-repos': 'battery',
  'frequence-cardiaque': 'heart',
  'fc-repos': 'pulse',
  vfc: 'wave',
  tension: 'gauge',
  oxygene: 'drop',
  respiration: 'lungs',
  vo2max: 'wind',
  sommeil: 'moon',
  temperature: 'thermo',
  'pleine-conscience': 'lotus',
  poids: 'scale',
  'masse-grasse': 'body',
  'masse-maigre': 'muscle',
  glycemie: 'sugar',
  'lumiere-du-jour': 'sun',
  'distance-velo': 'bike',
  'distance-nage': 'swim',
  denivele: 'mountain',
  vitesse: 'speed',
  puissance: 'bolt',
  'puissance-course': 'bolt',
  'cadence-velo': 'cadence',
  'cadence-pas': 'cadence',
  effort: 'flame',
  'fc-marche': 'walk',
  'recuperation-cardiaque': 'pulse',
  'perturbations-respiratoires': 'wind',
  'temperature-poignet': 'thermo',
  electrodermale: 'skin',
  'masse-osseuse': 'bone',
  'eau-corporelle': 'drop',
  'tour-de-taille': 'ruler',
  imc: 'scale',
  eau: 'drop',
  'calories-mangees': 'food',
  proteines: 'muscle',
  glucides: 'food',
  lipides: 'food',
  cafeine: 'cup',
  // Ajouts du 10 octobre 2026 (vague 12)
  'temps-mouvement': 'timer',
  'vitesse-velo': 'bike',
  ftp: 'bolt',
  foulee: 'walk',
  oscillation: 'wave',
  'contact-sol': 'steps',
  'mouvements-nage': 'swim',
  profondeur: 'swim',
  'temperature-eau': 'thermo',
  'distance-rame': 'route',
  'vitesse-rame': 'speed',
  'distance-pagaie': 'route',
  'vitesse-pagaie': 'speed',
  'distance-ski': 'mountain',
  'distance-ski-fond': 'mountain',
  'vitesse-ski-fond': 'speed',
  'distance-glisse': 'route',
  'poussees-fauteuil': 'wheel',
  'distance-fauteuil': 'wheel',
  'effort-seance': 'flame',
  'effort-estime': 'flame',
  'vitesse-marche': 'walk',
  'longueur-pas': 'ruler',
  'asymetrie-marche': 'steps',
  'double-appui': 'steps',
  'stabilite-marche': 'body',
  'vitesse-montee': 'stairs',
  'vitesse-descente': 'stairs',
  'marche-6-min': 'timer',
  chutes: 'alert',
  'alerte-stabilite': 'alert',
  'fc-haute': 'alert',
  'fc-basse': 'alert',
  'rythme-irregulier': 'pulse',
  ecg: 'pulse',
  fibrillation: 'heart',
  perfusion: 'drop',
  'cardio-faible': 'alert',
  'capacite-vitale': 'lungs',
  'debit-expiratoire': 'wind',
  apnees: 'moon',
  humeur: 'mood',
  'son-casque': 'ear',
  'son-ambiant': 'ear',
  'alerte-son-casque': 'alert',
  'alerte-son-ambiant': 'alert',
  uv: 'sun',
  'alcool-sang': 'glass',
  insuline: 'drop',
  'boissons-alcool': 'glass',
  fibres: 'leaf',
  sucres: 'sugar',
  'graisses-saturees': 'food',
  'graisses-mono': 'food',
  'graisses-poly': 'food',
  cholesterol: 'food',
  sodium: 'pill',
  potassium: 'pill',
  calcium: 'bone',
  magnesium: 'pill',
  fer: 'pill',
  zinc: 'pill',
  phosphore: 'pill',
  iode: 'pill',
  selenium: 'pill',
  cuivre: 'pill',
  manganese: 'pill',
  chrome: 'pill',
  molybdene: 'pill',
  chlorure: 'pill',
  'vitamine-a': 'pill',
  'vitamine-b1': 'pill',
  'vitamine-b2': 'pill',
  'vitamine-b3': 'pill',
  'vitamine-b5': 'pill',
  'vitamine-b6': 'pill',
  'vitamine-b8': 'pill',
  'vitamine-b9': 'pill',
  'vitamine-b12': 'pill',
  'vitamine-c': 'pill',
  'vitamine-d': 'sun',
  'vitamine-e': 'pill',
  'vitamine-k': 'pill',
};
