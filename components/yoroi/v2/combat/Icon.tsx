/**
 * Icones de l'espace Combat, dessinees au trait (react-native-svg).
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type CIconName =
  | 'back' | 'chevron' | 'plus' | 'minus' | 'close' | 'check' | 'trash' | 'edit' | 'share' | 'camera' | 'mic' | 'play' | 'pause' | 'stop'
  | 'target' | 'swords' | 'shield' | 'flag' | 'trophy' | 'crown' | 'flame' | 'book' | 'user' | 'users' | 'file' | 'video' | 'link'
  | 'pin' | 'phone' | 'globe' | 'mail' | 'clock' | 'undo' | 'star' | 'grid' | 'chart' | 'map' | 'bolt' | 'leaf' | 'refresh' | 'calendar' | 'up' | 'down' | 'flat' | 'eye' | 'search';

const PATHS: Record<CIconName, string[]> = {
  back: ['M15 5l-7 7 7 7'],
  chevron: ['M9 5l7 7-7 7'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  share: ['M12 15V3', 'M7 8l5-5 5 5', 'M5 13v7h14v-7'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  mic: ['M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z', 'M5 11a7 7 0 0 0 14 0', 'M12 18v3'],
  play: ['M7 4.5v15l13-7.5z'],
  pause: ['M7 5v14', 'M17 5v14'],
  stop: ['M6 6h12v12H6z'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 12h.01'],
  swords: ['M14.5 17.5L3 6V3h3l11.5 11.5', 'M13 19l6-6', 'M16 16l4 4', 'M19 21l2-2', 'M9.5 6.5L18 3h3v3l-3.5 8.5', 'M5 14l4 4', 'M3 19l2 2'],
  shield: ['M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z'],
  flag: ['M5 21V4', 'M5 4h11l-2 4 2 4H5'],
  trophy: ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H5a3 3 0 0 0 3 4', 'M16 6h3a3 3 0 0 1-3 4', 'M12 13v4', 'M8 20h8', 'M10 17h4v3h-4z'],
  crown: ['M3 8l4 4 5-7 5 7 4-4-2 11H5z'],
  flame: ['M12 21c4 0 7-3 7-7 0-5-5-7-5-11-3 2-4 5-4 7-1-1-2-2-2-3-2 2-3 4-3 7 0 4 3 7 7 7z'],
  book: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 19V5', 'M8 7h7'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  users: ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M2 21a7 7 0 0 1 14 0', 'M16 3.5a4 4 0 0 1 0 7.5', 'M18 14a6 6 0 0 1 4 7'],
  file: ['M6 3h8l5 5v13H6z', 'M14 3v5h5', 'M9 13h7', 'M9 17h7'],
  video: ['M3 7h12v10H3z', 'M15 10l6-3v10l-6-3'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  pin: ['M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  undo: ['M9 14L4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-3'],
  star: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  map: ['M9 4l6 2 6-2v16l-6 2-6-2-6 2V6z', 'M9 4v16', 'M15 6v16'],
  bolt: ['M13 3L5 13.5h6L10 21l8-10.5h-6z'],
  leaf: ['M5 19c0-8 5-14 15-15-1 10-7 15-15 15z', 'M5 19l7-7'],
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 4v7h-7'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v5', 'M16 3v5'],
  up: ['M4 17l6-6 4 4 6-7', 'M14 8h6v6'],
  down: ['M4 7l6 6 4-4 6 7', 'M14 16h6v-6'],
  flat: ['M4 12h16', 'M16 8l4 4-4 4'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
};

export function CIcon({ name, size = 22, color = '#1D2029', width = 2.2, fill }: { name: CIconName; size?: number; color?: string; width?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill={i === 0 && fill ? fill : 'none'} />
      ))}
    </Svg>
  );
}
