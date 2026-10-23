/**
 * Icones de la saisie de seance, dessinees au trait (aucune dependance d'icones).
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'close' | 'check' | 'plus' | 'minus' | 'trash' | 'up' | 'down' | 'clock' | 'pencil' | 'pause' | 'play'
  | 'search' | 'more' | 'chevron' | 'back' | 'swap' | 'flame' | 'heart' | 'route' | 'calendar' | 'bolt';

export function Icon({ name, size = 22, color = '#1D2029', strokeWidth = 2.2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let body: React.ReactNode = null;
  switch (name) {
    case 'close': body = <Path d="M6 6l12 12M18 6L6 18" {...p} />; break;
    case 'check': body = <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />; break;
    case 'plus': body = <Path d="M12 5v14M5 12h14" {...p} />; break;
    case 'minus': body = <Path d="M5 12h14" {...p} />; break;
    case 'trash': body = <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...p} />; break;
    case 'up': body = <Path d="M6 15l6-6 6 6" {...p} />; break;
    case 'down': body = <Path d="M6 9l6 6 6-6" {...p} />; break;
    case 'chevron': body = <Path d="M9 6l6 6-6 6" {...p} />; break;
    case 'back': body = <Path d="M15 6l-6 6 6 6" {...p} />; break;
    case 'clock': body = <><Circle cx={12} cy={12} r={9} {...p} /><Path d="M12 7v5l3 2" {...p} /></>; break;
    case 'pencil': body = <Path d="M4 20h4L19 9l-4-4L4 16z" {...p} />; break;
    case 'pause': body = <><Rect x={6} y={5} width={4} height={14} rx={1.5} fill={color} /><Rect x={14} y={5} width={4} height={14} rx={1.5} fill={color} /></>; break;
    case 'play': body = <Path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" fill={color} />; break;
    case 'search': body = <><Circle cx={11} cy={11} r={6.5} {...p} /><Path d="M16 16l4 4" {...p} /></>; break;
    case 'more': body = <><Circle cx={5.5} cy={12} r={1.8} fill={color} /><Circle cx={12} cy={12} r={1.8} fill={color} /><Circle cx={18.5} cy={12} r={1.8} fill={color} /></>; break;
    case 'swap': body = <Path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" {...p} />; break;
    case 'flame': body = <Path d="M12 21c4 0 6.5-2.6 6.5-6.2 0-3.6-2.8-5.6-3.6-9.3-1.9 1.5-2.7 3.5-2.6 5.3-1.2-.9-1.9-2.2-2-3.6C8 9 5.5 11.6 5.5 14.8 5.5 18.4 8 21 12 21z" {...p} />; break;
    case 'heart': body = <Path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" {...p} />; break;
    case 'route': body = <><Circle cx={6} cy={18} r={2.4} {...p} /><Circle cx={18} cy={6} r={2.4} {...p} /><Path d="M8.4 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.6" {...p} /></>; break;
    case 'calendar': body = <><Rect x={4} y={5.5} width={16} height={15} rx={3} {...p} /><Path d="M4 10h16M9 3.5v4M15 3.5v4" {...p} /></>; break;
    case 'bolt': body = <Path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" {...p} />; break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
