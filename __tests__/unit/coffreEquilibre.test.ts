/**
 * 2 novembre 2026 : le coffre rééquilibré (lib/v2/armure.ts, coffreXp) et le point d'or de l'onglet Dojo.
 */
import { COFFRE, coffreXp } from '@/lib/v2/armure';
import { coffreEstPret } from '@/components/yoroi/v2/dojo/useCoffrePret';

describe('coffre du jour', () => {
  it('le bonus de série plafonne à 5', () => {
    expect(COFFRE.bonusMax).toBe(5);
    expect(coffreXp(1).xp).toBe(5);
    expect(coffreXp(6).xp).toBe(10);
    expect(coffreXp(20).xp).toBe(10);
  });
  it('le grand coffre ajoute 25 les jours forts', () => {
    expect(coffreXp(7)).toEqual({ xp: 35, grand: true, chance: false });
  });
  it('un jour avec seulement de l’eau : la base, sans bonus', () => {
    expect(coffreXp(30, false, false).xp).toBe(5);
    expect(coffreXp(14, false, false)).toEqual({ xp: 5, grand: true, chance: false });
    expect(coffreXp(14, true, false).xp).toBe(10);
  });
  it('le point d’or seulement quand le coffre attend', () => {
    expect(coffreEstPret({ coffre: { etat: 'pret', xp: 5, grand: false, grandDans: 3 } } as never)).toBe(true);
    expect(coffreEstPret({ coffre: { etat: 'ouvert', xp: 5, grand: false, grandDans: 3 } } as never)).toBe(false);
    expect(coffreEstPret(null)).toBe(false);
  });
});
