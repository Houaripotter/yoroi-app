/**
 * Pastels des ecrans Seance, Mes seances et Programmes (refonte du 27 octobre 2026, maquettes Pastel Seance et
 * Pastel Seances) : fond gris bleute, cartes blanches fines a ombre douce, pastilles numerotees pastel, aucun grand
 * fond bleu sature. Chaque ton a son fond clair, son encre lisible et sa version sombre, plus sourde.
 */
import { paletteSombre } from '@/components/yoroi/livePalette';

export type TonSeance = 'ciel' | 'creme' | 'lilas' | 'menthe' | 'peche';

const TONS: Record<TonSeance, { fond: string; encre: string; fondSombre: string; encreSombre: string }> = {
  ciel: { fond: '#DCE3FF', encre: '#23358F', fondSombre: '#2A3557', encreSombre: '#DCE3FF' },
  creme: { fond: '#F6EEDD', encre: '#7A5200', fondSombre: '#3A3428', encreSombre: '#E8C66A' },
  lilas: { fond: '#EFE6F3', encre: '#8A3F78', fondSombre: '#352B3D', encreSombre: '#E3A3CB' },
  menthe: { fond: '#E3F2EA', encre: '#1C6B45', fondSombre: '#22362D', encreSombre: '#8FD9B6' },
  peche: { fond: '#FFE1D6', encre: '#8A3A18', fondSombre: '#3A2622', encreSombre: '#F0A58C' },
};

/** Fond et encre d'un ton, suivant le mode clair ou sombre en cours */
export function ton(t: TonSeance): { fond: string; encre: string } {
  const p = TONS[t];
  return paletteSombre() ? { fond: p.fondSombre, encre: p.encreSombre } : { fond: p.fond, encre: p.encre };
}

/** L'ordre des pastilles numerotees d'une liste d'exercices (maquette : peche, menthe, creme, puis lilas et ciel) */
const CYCLE: TonSeance[] = ['peche', 'menthe', 'creme', 'lilas', 'ciel'];
export function tonDuRang(i: number): { fond: string; encre: string } {
  return ton(CYCLE[((i % CYCLE.length) + CYCLE.length) % CYCLE.length]);
}

/** Ombre douce des cartes blanches (maquette : 0 4px 14px a 5 %) */
export const OMBRE_CARTE = {
  shadowColor: '#1D2033',
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

/** Style d'une carte blanche fine : coins de 22, ombre douce, sans bordure en clair (un filet en sombre) */
export function carteBlanche(fond: string, filet: string) {
  return { backgroundColor: fond, borderRadius: 22, borderWidth: paletteSombre() ? 1 : 0, borderColor: filet, ...OMBRE_CARTE };
}
