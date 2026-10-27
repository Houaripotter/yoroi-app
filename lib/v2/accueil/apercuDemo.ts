/**
 * Donnees d'exemple de l'apercu de « Ton accueil » (27 octobre 2026, Houari : « le bloc Aperçu montre juste des
 * barres de couleur, il n'y a rien »). L'apercu montre tes vrais blocs ; un bloc qui n'a encore aucune donnee prend
 * ces valeurs d'exemple, calquees sur la demo Heny du Studio (JJB lundi, mardi et jeudi a midi, musculation lundi,
 * mardi, jeudi et vendredi a 18 h). Tout reste en memoire, rien n'est ecrit, le mode demo n'est jamais active.
 * Aucun import React Native : tout se teste avec jest.
 */
import type { Training } from '@/lib/database';
import type { SleepEntry } from '@/lib/sleepService';
import type { MesureSanteJour } from '@/lib/v2/accueil/enPlus';
import { traduire } from '@/lib/i18n/tr';

const p2 = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Les seances des 28 derniers jours, aujourd'hui compris */
export function seancesExemple(aujourdhui: Date = new Date()): Training[] {
  const out: Training[] = [];
  let id = -1;
  for (let k = 27; k >= 0; k--) {
    const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - k, 12);
    const dow = d.getDay();
    if (dow === 1 || dow === 2 || dow === 4) out.push({ id: id--, sport: 'jjb', date: iso(d), start_time: '12:00', duration_minutes: 75, club_name: traduire('Club de JJB'), club_color: '#1D2029' } as Training);
    if ((dow === 1 || dow === 2 || dow === 4 || dow === 5) && k > 0) out.push({ id: id--, sport: 'musculation', date: iso(d), start_time: '18:00', duration_minutes: 60, club_color: '#2C4A84' } as Training);
  }
  return out;
}

/** Sept nuits, entre 6 h 50 et 7 h 50 */
export function nuitsExemple(aujourdhui: Date = new Date()): SleepEntry[] {
  const durees = [425, 470, 410, 455, 440, 465, 445];
  return durees.map((duration, k) => {
    const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - (durees.length - 1 - k), 12);
    return { id: `exemple-${k}`, date: iso(d), bedTime: '23:15', wakeTime: '06:45', duration, quality: 4 } as SleepEntry;
  });
}

export const EAU_EXEMPLE = { water: 1.5, waterGoal: 2.5 } as const;

export const SANTE_EXEMPLE: MesureSanteJour[] = [
  { cle: 'pas', valeur: 7420, hier: false },
  { cle: 'energie-active', valeur: 480, hier: false },
  { cle: 'exercice', valeur: 52, hier: false },
  { cle: 'sommeil', valeur: 445, hier: true },
  { cle: 'frequence-cardiaque', valeur: 64, hier: false },
];

export function recordExemple(aujourdhui: Date = new Date()): { titre: string; valeur: string; date: string; ecart: string | null } {
  const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - 3, 12);
  return { titre: traduire('Développé couché'), valeur: '90 kg', date: iso(d), ecart: '+2,5 kg' };
}

export const SERIE_EXEMPLE = {
  semaines: 6,
  goal: 4,
  recentes: [true, true, false, true, true, true, true, true].map((tenue, i, a) => ({ tenue, enCours: i === a.length - 1 })),
};
