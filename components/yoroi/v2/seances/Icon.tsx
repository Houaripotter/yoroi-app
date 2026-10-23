/**
 * Icones dessinees au trait (react-native-svg), meme style que la barre d'onglets.
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'back' | 'chevron' | 'chevronLeft' | 'plus' | 'search' | 'trash' | 'edit' | 'share' | 'check' | 'close'
  | 'calendar' | 'clock' | 'flame' | 'heart' | 'pin' | 'trophy' | 'timer' | 'book' | 'users' | 'target'
  | 'mountain' | 'dumbbell' | 'glove' | 'belt' | 'map' | 'medal' | 'chart' | 'moon' | 'link' | 'bookmark'
  | 'bookmarkOn' | 'filter' | 'repeat' | 'bolt' | 'drop' | 'wind' | 'steps' | 'gauge' | 'list' | 'refresh' | 'scale' | 'star' | 'tape' | 'history' | 'play' | 'body' | 'watch' | 'download' | 'more';

const PATHS: Record<IconName, string[]> = {
  back: ['M15 5l-7 7 7 7'],
  chevron: ['M9 5l7 7-7 7'],
  chevronLeft: ['M15 5l-7 7 7 7'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  share: ['M12 15V3', 'M7 8l5-5 5 5', 'M5 13v7h14v-7'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v5', 'M16 3v5'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  flame: ['M12 21c4 0 7-3 7-7 0-5-5-7-5-11-3 2-4 5-4 7-1-1-2-2-2-3-2 2-3 4-3 7 0 4 3 7 7 7z'],
  heart: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'],
  pin: ['M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  trophy: ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H5a3 3 0 0 0 3 4', 'M16 6h3a3 3 0 0 1-3 4', 'M12 13v4', 'M8 20h8', 'M10 17h4v3h-4z'],
  timer: ['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 9v4', 'M10 2h4', 'M18.5 6.5l1.5-1.5'],
  book: ['M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M5 17a3 3 0 0 1 3-3h11'],
  users: ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M2 21a7 7 0 0 1 14 0', 'M16 3.5a4 4 0 0 1 0 7.5', 'M18 14a6 6 0 0 1 4 7'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 12h.01'],
  mountain: ['M3 20l6-10 4 6 3-4 5 8z'],
  dumbbell: ['M6.5 6.5v11', 'M3.5 9v6', 'M17.5 6.5v11', 'M20.5 9v6', 'M6.5 12h11'],
  glove: ['M7 4h7a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4H9a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1z', 'M6 11h8', 'M9 17v3h6v-3'],
  belt: ['M3 10h18v4H3z', 'M10 9h4v6h-4z', 'M11 15l-2 6', 'M13 15l2 6'],
  map: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14', 'M15 6v14'],
  medal: ['M8 3l4 7 4-7', 'M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
  chart: ['M3 17l5-5 4 3 8-8', 'M15 7h5v5'],
  moon: ['M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z'],
  link: ['M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1', 'M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1'],
  bookmark: ['M6 3h12v18l-6-4-6 4z'],
  bookmarkOn: ['M6 3h12v18l-6-4-6 4z', 'M9 9.5l2 2 4-4'],
  filter: ['M4 5h16', 'M7 12h10', 'M10 19h4'],
  repeat: ['M4 12a7 7 0 0 1 12-5l2 2', 'M18 4v5h-5', 'M20 12a7 7 0 0 1-12 5l-2-2', 'M6 20v-5h5'],
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  drop: ['M12 21a6 6 0 0 0 6-6c0-4-6-11-6-11S6 11 6 15a6 6 0 0 0 6 6z'],
  wind: ['M3 9h12a3 3 0 1 0-3-3', 'M3 15h16a3 3 0 1 1-3 3'],
  steps: ['M8 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z', 'M5 17h6', 'M16 9c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z'],
  gauge: ['M4 17a8 8 0 1 1 16 0', 'M12 17l4-5'],
  list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  refresh: ['M20 11a8 8 0 0 0-14-5l-2 2', 'M4 3v5h5', 'M4 13a8 8 0 0 0 14 5l2-2', 'M20 21v-5h-5'],
  scale: ['M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z', 'M7.5 10a4.5 4.5 0 0 1 9 0z', 'M12 10l1.8-2.6'],
  tape: ['M10 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z', 'M10 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M10 19h11v-4h-4', 'M14 19v-2', 'M18 19v-2'],
  history: ['M3.5 12a8.5 8.5 0 1 0 2.5-6', 'M3 4v4.5h4.5', 'M12 7.5V12l3 2'],
  play: ['M7 4.5v15l12.5-7.5z'],
  body: ['M12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M5 9l7 1.5L19 9', 'M12 10.5V15', 'M9 22l3-7 3 7'],
  // 16 octobre (SEANCES AVATAR) : importer, et le menu de l'onglet Seances
  download: ['M12 4v11', 'M7 10.5l5 5 5-5', 'M5 20h14'],
  more: ['M5.5 12h.01', 'M12 12h.01', 'M18.5 12h.01'],
  watch: ['M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M9 6l.6-3h4.8l.6 3', 'M9 18l.6 3h4.8l.6-3', 'M12 9.5V12l1.6 1.2'],
  star: ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'],
};

export function Icon({ name, size = 22, color = '#1D2029', strokeWidth = 2.2, fill }: { name: IconName; size?: number; color?: string; strokeWidth?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill && i === 0 ? fill : 'none'} />
      ))}
    </Svg>
  );
}

export function Dot({ size = 8, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
    </Svg>
  );
}
