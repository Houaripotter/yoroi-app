/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : les icones au trait des cartes, une seule famille,
 * grille 24 x 24, bouts et angles arrondis. Copie exacte de _propositions/cartes_v10_2026-11-02/html/icones.js.
 * Elles remplacent les stickers sur les cartes du nouveau moteur (les stickers restent ailleurs dans l'app).
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { IconeId } from '@/lib/v2/cartes/moteur/familles';

type Trait = ['p', string] | ['r', number, number, number, number, number] | ['c', number, number, number];

export const ICONES: Record<IconeId, Trait[]> = {
  musculation: [['p', 'M6.5 6v12M17.5 6v12M3.5 9v6M20.5 9v6M6.5 12h11']],
  course: [['p', 'M3 15.5h12.5l3.6.9a2.3 2.3 0 0 1 1.7 2.2v.4H3z'], ['p', 'M3 15.5l1-5.5 3 .8 1.6-3.3h2.8l2.2 4.2 3.4.8'], ['p', 'M9.6 10.6l1.4 1.4M11.4 9.6l1.4 1.4']],
  jjb: [['p', 'M8 3.5 12 8l4-4.5'], ['p', 'M8 3.5 4 6.5v14h16v-14l-4-3'], ['p', 'M12 8v12.5'], ['p', 'M4 13h16'], ['p', 'M10.5 13l-1.5 4M13.5 13l1.5 4']],
  boxe: [['p', 'M6.5 12V8a5 5 0 0 1 5-5h1.5a5 5 0 0 1 5 5v4.5a5 5 0 0 1-5 5h-3a3.5 3.5 0 0 1-3.5-3.5z'], ['p', 'M6.5 12a2.2 2.2 0 0 0 0 4.4'], ['p', 'M9.5 17.5v3.5h7v-3.5'], ['p', 'M11 3.4V8h7']],
  mma: [['p', 'M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z'], ['p', 'M9.5 8.5h5v7h-5z']],
  marche: [['p', 'M3 19 18 15'], ['p', 'M18 15l1.3-10'], ['p', 'M17 5h4.5'], ['p', 'M19 8.5l-6 1.2'], ['c', 4.6, 18.6, 1.4], ['c', 16.4, 15.4, 1.4]],
  cardio: [['p', 'M20.5 9.2A4.7 4.7 0 0 0 12 6.4a4.7 4.7 0 0 0-8.5 2.8c0 5.3 8.5 11 8.5 11s8.5-5.7 8.5-11z'], ['p', 'M3.5 12.5h4l1.6-3 2.8 5.5 1.6-2.5h7']],
  pesee: [['r', 3.5, 3.5, 17, 17, 4], ['p', 'M8 10a4 4 0 0 1 8 0'], ['p', 'M12 10l1.6-2.2']],
  record: [['p', 'M8 4h8v5a4 4 0 0 1-8 0z'], ['p', 'M8 5.5H5v1.2A3.3 3.3 0 0 0 8.3 10M16 5.5h3v1.2a3.3 3.3 0 0 1-3.3 3.3'], ['p', 'M12 13v3.5'], ['p', 'M8.5 20.5h7l-.8-4h-5.4z']],
  serie: [['p', 'M12 3c.6 3.3 4.8 5.3 4.8 10.2a4.8 4.8 0 1 1-9.6 0c0-2.1.9-3.6 2-4.6.3 1.6.9 2.6 1.9 3.1-.1-3 .3-5.8.9-8.7z']],
  semaine: [['r', 3.5, 5, 17, 15.5, 3], ['p', 'M3.5 10h17M8 3v4M16 3v4'], ['p', 'M8 14h2M14 14h2M8 17h2']],
  annee: [['c', 12, 14.5, 5.5], ['p', 'M8.5 3l2.6 6.2M15.5 3l-2.6 6.2M7 3h3.2M13.8 3H17'], ['p', 'M12 12.3v4.4']],
  muscles: [['p', 'M4 19.5c2-1.2 3.1-3.6 3.6-6.6L9 7.2l3-1.2 1.2 2.1-2.1 1.1-.5 3c2.1-1.6 5.1-1.7 7.1.1 1.6 1.5 1.7 4 .3 5.6-2.3 2.4-8.9 2.5-14 1.6z']],
  avant_apres: [['r', 3, 4, 7.5, 16, 2], ['r', 13.5, 4, 7.5, 16, 2], ['p', 'M11 12h2']],
  duree: [['c', 12, 13.5, 7.5], ['p', 'M12 9.5v4l2.5 2'], ['p', 'M10 2.5h4M18.2 6l1.4-1.4']],
  distance: [['p', 'M6 20.5a3 3 0 0 1 0-6h12a3 3 0 0 0 0-6h-6'], ['p', 'M6 3.5a2.5 2.5 0 0 1 2.5 2.5c0 2-2.5 4.5-2.5 4.5S3.5 8 3.5 6A2.5 2.5 0 0 1 6 3.5z']],
  allure: [['p', 'M4 17a8 8 0 1 1 16 0'], ['p', 'M12 17l3.8-4.6'], ['p', 'M6.5 17h1M16.5 17h1M12 9v1']],
  vitesse: [['p', 'M5 6l6 6-6 6M12.5 6l6 6-6 6']],
  pente: [['p', 'M3 19.5h18V8z'], ['p', 'M15 19.5a6 6 0 0 0-.8-3']],
  zone2: [['p', 'M2.5 12h4l2-5 3 10 2-5h8']],
  kcal: [['p', 'M12 2.8s6 5.8 6 10.7a6 6 0 0 1-12 0c0-4.9 6-10.7 6-10.7z'], ['p', 'M12 20v-4.5']],
  series: [['p', 'M12 3.5 20.5 8 12 12.5 3.5 8z'], ['p', 'M3.5 12 12 16.5 20.5 12'], ['p', 'M3.5 16 12 20.5 20.5 16']],
  kilos: [['r', 3, 8.5, 3, 7, 1], ['r', 6, 5, 3.5, 14, 1.2], ['p', 'M9.5 12H21']],
  rounds: [['p', 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z'], ['p', 'M10 20.5a2 2 0 0 0 4 0']],
  intensite: [['p', 'M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z']],
  ceinture: [['p', 'M2.5 10.5h7M14.5 10.5h7M2.5 13.5h7M14.5 13.5h7'], ['r', 9.5, 8.8, 5, 6.4, 1.2], ['p', 'M10.6 15.2c-.6 2-1.6 3.6-3 5M13.4 15.2c.6 2 1.6 3.6 3 5']],
  objectif: [['c', 12, 12, 8.5], ['c', 12, 12, 4.5], ['c', 12, 12, 1]],
  photo: [['p', 'M3.5 8.5a2 2 0 0 1 2-2h2l1.5-2.5h6l1.5 2.5h2a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z'], ['c', 12, 13, 3.5]],
  partager: [['p', 'M12 15V3.5M7.5 8 12 3.5 16.5 8'], ['p', 'M5 12v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V12']],
};

/** Une icone au trait : taille en points, couleur du trait, epaisseur (2 sur les cartes) */
export function Icone({ nom, taille, couleur, trait = 2 }: { nom: IconeId; taille: number; couleur: string; trait?: number }) {
  const t = ICONES[nom] ?? ICONES.objectif;
  const p = { fill: 'none', stroke: couleur, strokeWidth: trait, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      {t.map((x, i) =>
        x[0] === 'p' ? <Path key={i} d={x[1]} {...p} /> : x[0] === 'r' ? <Rect key={i} x={x[1]} y={x[2]} width={x[3]} height={x[4]} rx={x[5]} {...p} /> : <Circle key={i} cx={x[1]} cy={x[2]} r={x[3]} {...p} />,
      )}
    </Svg>
  );
}
