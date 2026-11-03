/**
 * TOUT VALIDER (3 novembre 2026) : valider d'un coup les dates de l'import IA (lib/v2/balance/toutValider.ts).
 */
import { boutonsLot, douteDe, enregistrerLot, messageFinal, preparerLot, questionLot, resumeLot, texteBouton, titreAVerifier } from '@/lib/v2/balance/toutValider';
import type { LigneLot } from '@/lib/v2/balance/toutValider';
import { planBlock } from '@/lib/v2/balance/multi';

const ligne = (index: number, date: string, extra: Partial<LigneLot> = {}): LigneLot => ({
  index,
  date,
  include: true,
  done: false,
  dateLue: true,
  deuxDates: false,
  horsNorme: [],
  alertes: [],
  doublon: false,
  pesee: true,
  tourTaille: false,
  ...extra,
});

/** 25 dates du 3 mars au 1er novembre, une sur deux avec un tour de taille */
const vingtCinq = (): LigneLot[] => {
  const out: LigneLot[] = [];
  const d0 = Date.UTC(2026, 2, 3);
  const pas = (Date.UTC(2026, 10, 1) - d0) / 24;
  for (let i = 0; i < 25; i++) {
    const iso = new Date(d0 + Math.round((i * pas) / 86400000) * 86400000).toISOString().slice(0, 10);
    out.push(ligne(i, iso, { tourTaille: i % 2 === 0 && i < 24 }));
  }
  return out;
};

describe('Tout valider', () => {
  it('le nombre sur le bouton est celui des dates qui partent vraiment', () => {
    const lignes = vingtCinq();
    expect(preparerLot(lignes).aValider).toHaveLength(25);
    expect(texteBouton(25)).toBe('Tout valider (25 dates)');
    expect(texteBouton(1)).toBe('Tout valider (1 date)');
    // deux decochees, une deja enregistree, une douteuse : 21
    lignes[3].include = false;
    lignes[4].include = false;
    lignes[5].done = true;
    lignes[6].dateLue = false;
    const lot = preparerLot(lignes);
    expect(lot.aValider).toHaveLength(21);
    expect(texteBouton(lot.aValider.length)).toBe('Tout valider (21 dates)');
    expect(questionLot(21)).toBe('Tu valides les 21 dates d’un coup ?');
  });

  it('le resume dit la periode, les pesees et les tours de taille', () => {
    const lot = preparerLot(vingtCinq());
    expect(resumeLot(lot)).toBe('du 3 mars au 1er novembre, 25 pesées, 12 mesures de tour de taille');
  });

  it('tout valider enregistre toutes les lignes cochees, et seulement elles', async () => {
    const lignes = vingtCinq();
    lignes[10].include = false;
    lignes[11].include = false;
    const lot = preparerLot(lignes);
    const appels: number[] = [];
    const progres: string[] = [];
    const bilan = await enregistrerLot(lot, async (i) => {
      appels.push(i);
      return 'new';
    }, (f, t) => progres.push(`${f}/${t}`));
    expect(appels).toEqual(lignes.filter((l) => l.include).map((l) => l.index));
    expect(appels).not.toContain(10);
    expect(appels).not.toContain(11);
    expect(bilan.ajoutees).toBe(23);
    expect(progres[progres.length - 1]).toBe('23/23');
    expect(messageFinal(bilan)).toBe('23 dates ajoutées.');
  });

  it('les doublons ne sont pas ecrits et sont comptes', async () => {
    const lignes = vingtCinq();
    lignes[0].doublon = true;
    lignes[1].doublon = true;
    const lot = preparerLot(lignes);
    expect(lot.aValider).toHaveLength(25);
    expect(lot.doublons.map((l) => l.index)).toEqual([0, 1]);
    const appels: number[] = [];
    // une date que l'enregistrement trouve deja a jour (meme date deux fois dans le texte) compte aussi
    const bilan = await enregistrerLot(lot, async (i) => {
      appels.push(i);
      return i === 2 ? 'same' : 'new';
    });
    expect(appels).not.toContain(0);
    expect(appels).not.toContain(1);
    expect(bilan.ignorees).toBe(3);
    expect(bilan.ajoutees).toBe(22);
    expect(resumeLot(lot)).toContain('2 dates déjà notées seront ignorées.');
    expect(messageFinal(bilan)).toBe('22 dates ajoutées. 3 lignes ignorées, déjà notées.');
  });

  it('la regle de l import decide du doublon : meme date et meme valeur, rien a ecrire', () => {
    // valeur identique : rien a ecrire
    const same = planBlock({ poids_kg: 82.4 }, [], { poids_kg: 82.4 }, new Map(), new Set(['poids_kg']));
    expect(Object.keys(same.write)).toHaveLength(0);
    expect(same.same).toEqual(['poids_kg']);
    // tour de taille different, Remplacer pas coche : l'ancien est garde, rien n'est ecrit
    const kept = planBlock({ tour_de_taille_cm: 85 }, [], { tour_de_taille_cm: 84 }, new Map(), new Set());
    expect(Object.keys(kept.write)).toHaveLength(0);
    expect(kept.kept).toEqual(['tour_de_taille_cm']);
    // le poids de la balance fait foi : il est ecrit, ce n'est pas un doublon
    const poids = planBlock({ poids_kg: 83 }, [], { poids_kg: 82.4 }, new Map(), new Set(['poids_kg']));
    expect(poids.write.poids_kg).toBe(83);
  });

  it('les lignes douteuses ne sont jamais validees en silence', async () => {
    const lignes = vingtCinq();
    lignes[7] = ligne(7, '', { dateLue: false });
    lignes[8].horsNorme = ['poids'];
    lignes[9].deuxDates = true;
    lignes[12].alertes = ['Ce poids semble loin de tes dernières pesées (89,0 kg) : vérifie la photo.'];
    const lot = preparerLot(lignes);
    expect(lot.aVerifier.map((d) => [d.ligne.index, d.raison])).toEqual([
      [7, 'date'],
      [8, 'hors_norme'],
      [9, 'deux_dates'],
      [12, 'alerte'],
    ]);
    expect(lot.aValider).toHaveLength(21);
    const appels: number[] = [];
    const bilan = await enregistrerLot(lot, async (i) => {
      appels.push(i);
      return 'new';
    });
    for (const i of [7, 8, 9, 12]) expect(appels).not.toContain(i);
    expect(bilan.aVerifier).toBe(4);
    expect(titreAVerifier(2)).toBe('Ces 2 lignes sont à vérifier');
    expect(resumeLot(lot)).toContain('4 lignes à vérifier restent de côté.');
    expect(messageFinal(bilan)).toContain('4 lignes à vérifier, plus haut.');
    expect(douteDe(ligne(0, '2026-03-03'))).toBeUndefined();
  });

  it('une date que l IA n a pas lue mais que tu as choisie part avec le lot', () => {
    expect(douteDe(ligne(0, '2026-03-03', { dateLue: true }))).toBeUndefined();
    expect(douteDe(ligne(0, '2026-03-03', { dateLue: false }))?.raison).toBe('date');
  });

  it('une date qui echoue est comptee, les autres continuent', async () => {
    const lot = preparerLot(vingtCinq().slice(0, 3));
    const bilan = await enregistrerLot(lot, async (i) => {
      if (i === 1) throw new Error('base');
      return i === 2 ? 'merged' : 'new';
    });
    expect(bilan).toMatchObject({ ajoutees: 1, completees: 1, echecs: [1] });
    expect(messageFinal(bilan)).toBe('1 date ajoutée, 1 date complétée. 1 date n’a pas pu être enregistrée, sa carte est ouverte.');
  });

  it('annuler ne change rien : Verifier une par une n a aucune action', () => {
    const oui = jest.fn();
    const enregistrer = jest.fn();
    const boutons = boutonsLot(oui);
    expect(boutons.map((b) => b.text)).toEqual(['Vérifier une par une', 'Oui, tout valider']);
    const annuler = boutons.find((b) => b.style === 'cancel');
    expect(annuler?.onPress).toBeUndefined();
    annuler?.onPress?.();
    expect(oui).not.toHaveBeenCalled();
    expect(enregistrer).not.toHaveBeenCalled();
    // preparer le lot ne modifie aucune ligne
    const lignes = vingtCinq();
    const avant = JSON.stringify(lignes);
    preparerLot(lignes);
    expect(JSON.stringify(lignes)).toBe(avant);
    boutons.find((b) => b.style === 'primary')?.onPress?.();
    expect(oui).toHaveBeenCalledTimes(1);
  });
});
