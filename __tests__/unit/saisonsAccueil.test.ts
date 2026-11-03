/**
 * Halloween et Noel v3 : la mise en page de l'accueil est exactement celle d'avant les saisons, et la citrouille
 * (ou le kadomatsu) ne cache ni le texte de la citation ni tes outils. Calcul dans lib/v2/saisons/geometrie.ts,
 * verifie ici contre le code de l'accueil.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  ACCUEIL,
  ARAIGNEE_CARTE,
  CARTE,
  CHIFFRE,
  GUIRLANDE_CARTE,
  LIGNE,
  LIGNE_SOUS_OUTILS,
  OUTILS,
  RONDS_AU_DESSUS,
  TOILE_CARTE,
  BAS_CALQUE,
  BANDEAU_SALUT,
  SOUS_SCENE,
  DEBUT_TEXTE_MIN,
  HAUT_CALQUE,
  LIBELLES_AU_DESSUS,
  LIBELLE_GAUCHE,
  ORIGINE_OUTILS,
  PREMIER_ROND,
  ZOMBIE_V5,
  ACCUEIL_PASTEL,
  CARTE_PASTEL,
  DECOR_PASTEL,
  ENTETE_PASTEL,
  HAUT_VOL_CARTE,
  SCENE_CARTE,
  boitesCartePastel,
  CARTE_PALIERS,
  PESEE_CARTE_POIDS,
  LIGNE_DEPUIS_Y,
  hauteurSceneCarte,
  remonteeScene,
  boiteCitrouille,
  boiteKadomatsu,
  boitesCarte,
  decorGaucheHalloween,
  decorGaucheNoel,
  finTexteMax,
  RETRAIT_COIN_CARTE,
} from '@/lib/v2/saisons/geometrie';
import { APERCU_CHEMIN, BARRE_PIERRES, ETATS_CHEMIN, PIERRES_CHEMIN, TORII_CHEMIN, couleurEtape, etatsPierres, largeurChiffre, melange, paliersDuChemin, pierreEnCours, placerTuEsIci, poidsSurChemin, texteEtatsChemin } from '@/lib/v2/pesee/cheminPierres';
import { BAS_VOL, MARGE_HAUT_VOL, zoneDeVol } from '@/lib/v2/saisons/vols';
import { lignesLibelleOutil, tailleLibelleOutil } from '@/lib/v2/accueil/libelleOutil';
import { placerPersonnage, SOL_SCENES } from '@/lib/v2/espace/sol';

const lire = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', f), 'utf8');

describe('les mesures reprises sont celles du code', () => {
  it('accueil Pastel (27 octobre 2026) : marge 16, ecart 12', () => {
    expect(lire('app/(tabs)/index.tsx')).toContain(`paddingHorizontal: ${ACCUEIL_PASTEL.marge}, gap: ${ACCUEIL_PASTEL.ecart}`);
    expect(ACCUEIL.marge).toBe(22);
  });
  it('ligne de la citation : 20 de haut, remonte de 18, retrait 2', () => {
    const g = lire('components/yoroi/v2/accueil/Grille.tsx');
    expect(g).toContain(`HAUTEUR_LIGNE_CONSEIL = ${LIGNE.hauteur}`);
    expect(g).toContain(`MARGE_HAUT_CONSEIL = -${LIGNE.remonte}`);
    expect(g).toMatch(/marginTop: MARGE_HAUT_CONSEIL, marginBottom: MARGE_BAS_CONSEIL, justifyContent: 'center', paddingHorizontal: 2 \}/);
  });
  it('citation : trait de pinceau d au moins 18, ecart de 9 (les autres styles laissent plus de place)', () => {
    const c = lire('components/yoroi/v2/accueil/Citation.tsx');
    expect(c).toContain(`minWidth: ${LIGNE.traitMin}`);
    expect(c).toContain(`gap: style === 'pinceau' ? ${LIGNE.ecartTexte} : 7`);
    // sceau et takeda : filet d'au moins 14, motif de 9, deux ecarts de 7 = 37 > 27
    expect(c).toContain('minWidth: 14');
  });
  it('tes outils : haut 4, bas 2, petit titre sur 2 lignes au plus', () => {
    // 27 octobre 2026 (refonte Ciel) : les ronds deviennent des cartes apercu de 150 sur 170 ; le haut et le bas de la rangee ne bougent pas
    const r = lire('components/yoroi/v2/accueil/Raccourcis.tsx');
    // 27 octobre 2026 soir (maquette Pastel) : cartes de 150 sur 132, la place de leur ombre sous la rangee
    // 28 octobre 2026 : 16 points en haut de la rangee pour la pastille Beta a cheval sur le bord, la rangee remonte d'autant
    expect(r).toContain('paddingTop: HAUT_RANGEE, paddingBottom: 8');
    expect(r).toContain('marginTop: 6 - HAUT_RANGEE');
    expect(r).toContain('const HAUT_RANGEE = 16;');
    // 28 octobre 2026 (Houari : « trop grandes ») : cartes de 148 sur 112, sticker de 52 (avant 172 sur 140, sticker de 64) ; le soir, 148 sur 96, meme sticker
    expect(r).toContain('const CARTE_L = 148;');
    expect(r).toContain('const CARTE_H = 96;');
    expect(r).toContain('const STICKER = 52;');
    expect(r).toContain('numberOfLines={lignesLibelleOutil(o.title)}');
    expect(lignesLibelleOutil('Combat et compétition')).toBeLessThanOrEqual(OUTILS.lignesMax);
  });
});

describe('rien ne cache la citation ni tes outils', () => {
  it('le trait de pinceau est 4 points sous le bas de tes outils, les ronds finissent 38 au dessus', () => {
    expect(LIGNE_SOUS_OUTILS).toBe(4);
    expect(RONDS_AU_DESSUS).toBe(38);
  });
  for (const L of [320, 375, 390, 393, 402, 430, 440, 768]) {
    it(`ecran de ${L} : la citrouille et le kadomatsu restent a droite du texte et sous les ronds`, () => {
      const c = boiteCitrouille(L);
      expect(c.x).toBeGreaterThan(finTexteMax(L));
      expect(c.x + c.w).toBeLessThanOrEqual(L);
      expect(c.sousOutils).toBeLessThan(RONDS_AU_DESSUS);
      const k = boiteKadomatsu(L);
      expect(k.x).toBeGreaterThan(finTexteMax(L));
      expect(k.sousOutils).toBeLessThanOrEqual(RONDS_AU_DESSUS);
    });
  }
});

describe('la mise en page de l accueil ne change pas', () => {
  const avant = lire('_archive_ancien_design_2026-10-09/saisons_2026-10-18/app/(tabs)/index.tsx');
  const maintenant = lire('app/(tabs)/index.tsx');
  const bloc = (t: string) => {
    const i = t.indexOf("{blocs.includes('conseil') ? (");
    return t.slice(i, t.indexOf(') : null}', i));
  };
  it('24 octobre : plus de ligne de citation sur l accueil, et aucun espace ajoute', () => {
    expect(bloc(avant)).toContain('<LigneConseil');
    expect(maintenant).not.toContain('<LigneConseil');
    expect(maintenant).not.toContain('RESERVE_CITATION');
  });
  it('les decors sont en position absolue', () => {
    const d = lire('components/yoroi/v2/saisons/DecorSaison.tsx');
    expect(d).toContain("const calque = { position: 'absolute' as const, left: 0, bottom: -BAS_CALQUE, height: HAUT_CALQUE }");
    expect(d).toMatch(/pointerEvents="none" style=\{\[\{ position: 'absolute', left: 0, top: 0, width: largeur, height: hauteur/);
  });
});

describe('v5 : au debut du trait de gauche de la citation', () => {
  const bas = (b: { y: number; h: number }) => ORIGINE_OUTILS - (b.y + b.h);
  const haut = (b: { y: number }) => ORIGINE_OUTILS - b.y;
  /** une boite ne touche ni le premier rond, ni le libelle « Chrono », ni le texte de la citation, ni le bord */
  const libre = (b: { x: number; y: number; w: number; h: number }) => {
    expect(b.x).toBeGreaterThanOrEqual(0);
    if (haut(b) > LIBELLES_AU_DESSUS) expect(b.x + b.w).toBeLessThanOrEqual(LIBELLE_GAUCHE);
    if (haut(b) > RONDS_AU_DESSUS) expect(b.x + b.w).toBeLessThanOrEqual(PREMIER_ROND + 0.5);
    if (bas(b) < LIGNE.hauteur / 2 - LIGNE_SOUS_OUTILS) expect(b.x + b.w).toBeLessThan(DEBUT_TEXTE_MIN);
  };
  it('les mesures des outils : premier rond a 25, libelle Chrono pas avant 32', () => {
    const r = lire('components/yoroi/v2/accueil/Raccourcis.tsx');
    // 27 octobre 2026 (refonte Ciel) : la premiere carte apercu commence a LIBELLE_GAUCHE (32), a droite de tout le decor de gauche
    // 27 octobre 2026 soir (maquette Pastel) : plus de decor de saison au debut de la rangee, elle commence a 16 comme les cartes
    expect(r).toContain('contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingTop: HAUT_RANGEE, paddingBottom: 8, gap: 10 }}');
    expect(lire('app/(tabs)/index.tsx')).not.toContain('<DecorOutils');
    expect(LIBELLE_GAUCHE).toBeGreaterThanOrEqual(PREMIER_ROND);
    // 23 octobre 2026 : le libellé passe par traduire(), le français ne change pas
    expect(r).toMatch(/\{ key: 'chrono', title: (traduire\()?'Chrono'/);
    expect(tailleLibelleOutil('Chrono')).toBe(12.5);
    expect(PREMIER_ROND).toBe(25);
    // « Chrono » en Archivo 12,5 extra gras fait 46,1 de large (mesure sur la police), centre a 56
    expect(56 - 46.2 / 2).toBeGreaterThanOrEqual(LIBELLE_GAUCHE);
  });
  it('Halloween : tombe et chat de 34 a 40 de haut, poses sur le trait, rien ne touche', () => {
    const d = decorGaucheHalloween();
    const groupe = Math.max(haut(d.tombe), haut(d.chat)) + LIGNE_SOUS_OUTILS;
    expect(groupe).toBeGreaterThanOrEqual(34);
    expect(groupe).toBeLessThanOrEqual(40.5);
    for (const b of [d.tombe, d.chat, d.squelette]) libre(b);
    expect(d.squelette.h).toBeGreaterThanOrEqual(30);
    expect(d.squelette.h).toBeLessThanOrEqual(36);
    // le squelette depasse bien de la tombe une fois sorti
    expect(d.tombe.y - d.squelette.y).toBeGreaterThan(20);
    expect(d.fenetre.x + d.fenetre.w).toBeLessThanOrEqual(LIBELLE_GAUCHE + 1);
  });
  it('Noel : kadomatsu de 40, cadeaux et bonhomme, rien ne touche', () => {
    const d = decorGaucheNoel();
    expect(d.kadomatsu.h).toBe(40);
    for (const b of [d.kadomatsu, d.grand, d.petit, d.bonhomme]) libre(b);
    expect(d.kadomatsu.y - d.bonhomme.y).toBeGreaterThan(14);
  });
  it('le zombie marche sur le trait, la tete sous les libelles', () => {
    expect(ORIGINE_OUTILS - (ZOMBIE_V5.pieds - ZOMBIE_V5.h)).toBeLessThanOrEqual(LIBELLES_AU_DESSUS);
    expect(ZOMBIE_V5.pieds - ORIGINE_OUTILS).toBeLessThanOrEqual(LIGNE_SOUS_OUTILS + 2.5);
  });
  it('le calque reste dans la hauteur de tes outils', () => {
    expect(HAUT_CALQUE - BAS_CALQUE).toBeLessThan(OUTILS.haut + OUTILS.rond + OUTILS.ecartLibelle + OUTILS.ligneLibelle * OUTILS.lignesMax + OUTILS.bas);
  });
});

describe('27 octobre 2026 : carte « Ton poids » Pastel', () => {
  it('les mesures reprises sont celles de CartePoids', () => {
    const c = lire('components/yoroi/v2/accueil/CartePoids.tsx');
    // 2 novembre 2026, proposition A « ligne de paliers » : « TON POIDS » en accent, ton poids en 40 et en noir,
    // le sticker balance a droite, une seule couleur d'accent (P.indigo), plus de voile lilas ni d'anneau de pierres
    expect(c).toContain("paddingHorizontal: 18, paddingTop: 16, paddingBottom: chemin ? 4 : 0, gap: 0");
    expect(c).toContain('<Ink size={11} weight="black" color={accent} numberOfLines={1} style={{ letterSpacing: 1.4, lineHeight: 14 }}>');
    expect(c).toContain("<Ink size={40} weight=\"black\" tight numberOfLines={1} color={fg} style={{ fontVariant: ['tabular-nums'], lineHeight: 44, letterSpacing: -1 }}>");
    expect(c).toContain("<Image source={illus.img('balance')}");
    expect(c).toContain('const accent = P.indigo;');
    expect(c).not.toContain('<AnneauPierres');
    expect(c).not.toContain('<LinearGradient');
    expect(c).not.toContain('VoileCartePoids');
    // la carte en blanc pur
    expect(c).toContain(`borderRadius: ${CARTE_PASTEL.rayon}, backgroundColor: P.white`);
    expect(c).toContain(`const CARTE_POIDS_RAYON = ${CARTE_PASTEL.rayon};`);
    expect(Math.round(30 * 1.1)).toBe(CARTE_PASTEL.ligneChiffre);
    expect(CARTE_PASTEL.anneau).toBe(38);
  });
  // 3 novembre 2026 : la carte « ligne de paliers » (poids a gauche, sticker balance a droite, pastille de pesee entre)
  it('la geometrie suit la carte Ton poids : marges, poids en 40 sur une ligne de 44, sticker de 60, pastille de pesee', () => {
    const c = lire('components/yoroi/v2/accueil/CartePoids.tsx');
    expect(c).toContain(`paddingHorizontal: ${CARTE_PALIERS.marge}, paddingTop: ${CARTE_PALIERS.haut},`);
    expect(c).toContain(`lineHeight: ${CARTE_PALIERS.titre}`);
    expect(c).toContain(`marginTop: ${CARTE_PALIERS.ecartTitre}`);
    expect(c).toContain(`<Ink size={40} weight="black" tight numberOfLines={1} color={fg} style={{ fontVariant: ['tabular-nums'], lineHeight: ${CARTE_PALIERS.ligneChiffre}`);
    expect(c).toContain(`style={{ width: ${CARTE_PALIERS.sticker}, height: ${CARTE_PALIERS.sticker}, marginTop: -${CARTE_PALIERS.decaleSticker}, marginRight: -${CARTE_PALIERS.decaleSticker} }}`);
    const p = PESEE_CARTE_POIDS;
    expect(c).toContain(`const PESEE_CARTE_POIDS = { droite: ${p.droite}, haut: ${p.haut}, hauteur: ${p.hauteur}, ecartPoids: ${p.ecartPoids}, largeurMin: ${p.largeurMin}, icone: ${p.icone} } as const;`);
    // 3 novembre 2026 soir : la pastille au moins 8 au dessus de la ligne « depuis ton début », centree au plus bas sur le poids
    expect(LIGNE_DEPUIS_Y - (p.haut + p.hauteur)).toBeGreaterThanOrEqual(8);
    const centrePoids = CARTE_PALIERS.haut + CARTE_PALIERS.titre + CARTE_PALIERS.ecartTitre + CARTE_PALIERS.ligneChiffre / 2;
    expect(p.haut + p.hauteur / 2).toBeLessThanOrEqual(centrePoids);
    // elle commence sous le titre « TON POIDS »
    expect(p.haut).toBeGreaterThanOrEqual(CARTE_PALIERS.haut + CARTE_PALIERS.titre);
    expect(c).toContain('right: PESEE_CARTE_POIDS.droite, top: PESEE_CARTE_POIDS.haut');
    expect(c).toContain('height: PESEE_CARTE_POIDS.hauteur');
  });
  for (const L of [320, 375, 390, 393, 430, 768]) {
    const w = L - 2 * ACCUEIL_PASTEL.marge;
    it(`carte de ${w} : le sapin ou la citrouille au dessus de la pastille de pesee, sans rien toucher`, () => {
      const b = boitesCartePastel(w);
      expect(b.cotes.length).toBe(1);
      const touche = (u: { x: number; y: number; w: number; h: number }, v: { x: number; y: number; w: number; h: number }) => u.x < v.x + v.w && v.x < u.x + u.w && u.y < v.y + v.h && v.y < u.y + u.h;
      for (const c of b.cotes) {
        expect(touche(c, b.titre)).toBe(false);
        expect(touche(c, b.chiffre)).toBe(false);
        expect(touche(c, b.anneau)).toBe(false);
        expect(touche(c, b.pesee)).toBe(false);
        // sous la guirlande, au dessus de la pastille
        expect(c.y).toBeGreaterThan(GUIRLANDE_CARTE.bas);
        expect(c.y + c.h).toBeLessThanOrEqual(b.pesee.y);
        expect(c.w).toBeLessThanOrEqual(DECOR_PASTEL.w);
        expect(c.w).toBeGreaterThanOrEqual(DECOR_PASTEL.min);
      }
      // la pastille finit avant le sticker, et sur ces largeurs elle a sa place a cote du poids le plus large
      expect(b.pesee.x + b.pesee.w).toBeLessThanOrEqual(b.anneau.x);
      if (L >= 375) expect(b.pesee.w).toBeGreaterThanOrEqual(PESEE_CARTE_POIDS.largeurMin);
    });
  }
  it('toiles, araignees et guirlande restent hors du titre, du chiffre et de l anneau', () => {
    expect(Math.hypot(CARTE_PASTEL.marge, CARTE_PASTEL.haut + 2)).toBeGreaterThan(TOILE_CARTE);
    expect(ARAIGNEE_CARTE.x + ARAIGNEE_CARTE.taille).toBeLessThan(CARTE_PASTEL.marge);
    // 28 octobre 2026 (Houari : l'araignee touchait le poids) : elle descend le long du bord, a droite de rien
    expect(RETRAIT_COIN_CARTE + ARAIGNEE_CARTE.x + ARAIGNEE_CARTE.taille).toBeLessThan(CARTE_PASTEL.marge);
    // la toile du coin ne touche ni le titre (cale en bas de la ligne, sous 2 lignes de 13) ni l'anneau
    expect(RETRAIT_COIN_CARTE + TOILE_CARTE).toBeLessThanOrEqual(CARTE_PASTEL.haut + CARTE_PASTEL.anneau - 2 * 13);
    const centreAnneau = { x: CARTE_PASTEL.marge + CARTE_PASTEL.anneau / 2, y: CARTE_PASTEL.haut + CARTE_PASTEL.anneau / 2 };
    const bout = RETRAIT_COIN_CARTE + TOILE_CARTE / Math.SQRT2;
    expect(Math.hypot(centreAnneau.x - bout, centreAnneau.y - bout)).toBeGreaterThan(CARTE_PASTEL.anneau * 0.445 + 1);
    expect(GUIRLANDE_CARTE.bas).toBeLessThan(CARTE_PASTEL.haut + 2);
    expect(GUIRLANDE_CARTE.debut).toBeGreaterThanOrEqual(CARTE.rayon);
    // le coin de la toile de droite reste loin de l'anneau (centre a 47 du coin, rayon 31)
    expect(Math.hypot(CARTE_PASTEL.marge + CARTE_PASTEL.anneau / 2, CARTE_PASTEL.haut + CARTE_PASTEL.anneau / 2) - CARTE_PASTEL.anneau / 2).toBeGreaterThan(TOILE_CARTE * Math.SQRT2);
    expect(CHIFFRE.h).toBeGreaterThan(0);
  });
  it('le decor de la carte est pose par dessus, sans toucher a CartePoids', () => {
    const i = lire('app/(tabs)/index.tsx');
    // 27 octobre 2026 (carrousel) : le decor ne se pose que sur la page 1 (ton poids et ton objectif), jamais sur la courbe
    expect(i).toMatch(/<CartePoids series=\{series\} targetWeight=\{data.targetWeight\} startWeight=\{data.startWeight\} rankIndex=\{rankIndex\} onPage=\{setPagePoids\} pesee=\{peseeCarte\} \/>\n\s*\{\/\*[^\n]*\*\/\}\n\s*\{saison && series.length && pagePoids === 0 \? <DecorCarte/);
    expect(lire('components/yoroi/v2/accueil/CartePoids.tsx')).not.toMatch(/saison|DecorCarte/i);
    // la page 1 porte ton poids en tete puis ton objectif ; la courbe est la page 2 ; deux pages au plus
    const c = lire('components/yoroi/v2/accueil/CartePoids.tsx');
    expect(c).toContain('const nbPages = 1 + (pageCourbe ? 1 : 0);');
    expect(c.indexOf('{pageUne}')).toBeGreaterThan(0);
    expect(c.indexOf('{pageDeLaCourbe}')).toBeGreaterThan(c.indexOf('{pageUne}'));
    expect(c).not.toContain('{pageDeLObjectif}');
    const une = c.slice(c.indexOf('const pageUne = ('), c.indexOf('const pageDeLaCourbe'));
    expect(une.indexOf("traduire('Ton poids')")).toBeLessThan(une.indexOf('<CheminPierres'));
    // 28 octobre 2026 (v3) : l'ancre de la visite est sur la pastille Objectif, posee sur la ligne du titre du chemin
    expect(c.slice(c.indexOf('const pastilleObjectif'), c.indexOf('const pageUne = ('))).toContain('<TourAnchor id="accueil.objectif">');
    expect(une).toContain('{pastilleObjectif}');
    expect(lire('components/yoroi/v2/saisons/DecorSaison.tsx')).toContain('const b = boitesCartePastel(largeur);');
  });
});

describe('27 octobre 2026 : la scene en carte, sous ton salut', () => {
  const scene = lire('components/yoroi/v2/accueil/Scene.tsx');
  const accueil = lire('app/(tabs)/index.tsx');
  it('l en-tete au dessus, la scene en carte dessous, le decor dans la carte', () => {
    expect(accueil).toContain('<EnTeteAccueil ');
    expect(accueil).toMatch(/<SceneHero\n\s*carte\n/);
    expect(accueil).toContain('haut={HAUT_VOL_CARTE} scrollY={scrollY} dansCarte />');
    expect(scene).toContain('borderRadius: SCENE_CARTE.rayon, overflow: \'hidden\'');
    expect(SCENE_CARTE.rayon).toBe(28);
    expect(ENTETE_PASTEL.rangee).toBe(48);
    // l'ancienne fenetre reste pour l'apercu de Ta scene
    expect(scene).toContain(`export const ECART_SOUS_SCENE = ${SOUS_SCENE};`);
    expect(scene).toContain(`export const BANDEAU = { photo: ${BANDEAU_SALUT.photo}, bas: ${BANDEAU_SALUT.bas},`);
  });
  it('les vols commencent 14 points sous le haut de la carte', () => {
    expect(HAUT_VOL_CARTE + MARGE_HAUT_VOL).toBe(14);
  });
  for (const L of [320, 375, 390, 430, 768]) {
    const w = L - 2 * ACCUEIL_PASTEL.marge;
    const H = hauteurSceneCarte(w);
    it(`carte de ${w} : ${H} de haut, les vols restent dans la carte`, () => {
      expect(H).toBeGreaterThanOrEqual(SCENE_CARTE.hMin);
      expect(H).toBeLessThanOrEqual(SCENE_CARTE.hMax);
      for (const hSprite of [30, 40]) {
        const z = zoneDeVol({ largeur: w, hauteur: H, haut: HAUT_VOL_CARTE, hSprite });
        expect(z.yMin).toBeGreaterThanOrEqual(10);
        expect(Math.max(z.yMax + hSprite, H * BAS_VOL)).toBeLessThanOrEqual(H);
      }
    });
    it(`carte de ${w} : le personnage pose les pieds dans la carte, sur chaque scene`, () => {
      const imgH = Math.max(H, w / (1200 / 670));
      for (const [id, s] of Object.entries(SOL_SCENES)) {
        const dy = remonteeScene({ H, imgH, sol: s.sol });
        expect([id, dy >= 0 && dy <= imgH - H]).toEqual([id, true]);
        const p = placerPersonnage({ H: H + dy, imgH, top: dy - 28, scene: id, personnage: 'guerrier_h', plancher: -8 });
        const pieds = p.pieds - dy;
        expect([id, pieds <= H - 8 + 0.5, pieds > H * 0.5]).toEqual([id, true, true]);
      }
    });
  }
});

describe('19 octobre : la scene fenetre (apercu de Ta scene)', () => {
  const scene = lire('components/yoroi/v2/accueil/Scene.tsx');
  const accueil = lire('app/(tabs)/index.tsx');
  it('les mesures reprises sont celles de Scene.tsx', () => {
    expect(scene).toContain(`export const ECART_SOUS_SCENE = ${SOUS_SCENE};`);
    expect(scene).toContain(`export const BANDEAU = { photo: ${BANDEAU_SALUT.photo}, bas: ${BANDEAU_SALUT.bas},`);
    expect(scene).toContain('export const DEBORD_SCENE = 0;');
  });
  for (const top of [20, 47, 59, 62]) {
    it(`encoche de ${top} : chauves souris, fantome et traineau passent au dessus du bandeau`, () => {
      const H = Math.max(220, Math.min(265, top + 191));
      const z = zoneDeVol({ largeur: 430, hauteur: H, haut: top, hSprite: 40 });
      expect(z.yMin).toBe(top + MARGE_HAUT_VOL);
      expect(Math.max(z.yMax + 40, H * BAS_VOL)).toBeLessThanOrEqual(H - BANDEAU_SALUT.bas - BANDEAU_SALUT.photo);
    });
  }
});

describe('28 octobre 2026 : accueil plus compact', () => {
  it('la scene perd environ 11 % de hauteur, toujours bornee', () => {
    expect(SCENE_CARTE.ratio).toBeCloseTo(150 / 358, 6);
    expect(hauteurSceneCarte(430 - 32)).toBe(167);
    expect(hauteurSceneCarte(375 - 32)).toBe(144);
    expect(hauteurSceneCarte(320 - 32)).toBe(SCENE_CARTE.hMin);
  });
  it('les cartes outils : la pastille Beta deborde du bord haut, hors du clip de la carte', () => {
    const r = lire('components/yoroi/v2/accueil/Raccourcis.tsx');
    const b = lire('components/yoroi/v2/accueil/PastilleBeta.tsx');
    // le clip est sur la boite interieure, la pastille est posee apres elle, dans la boite exterieure sans clip
    // 30 octobre 2026 : la taille vient de tailleCartes (CARTE_L sur CARTE_H sur iPhone, plus grande en grand ecran)
    expect(r).toContain("if (!largeurGrille) return { l: CARTE_L, h: CARTE_H, sticker: STICKER, titreL: TITRE_L, sousL: SOUS_L, titre: 10, ligne: 15 };");
    // 31 octobre 2026 : en gros carres (grand ecran) la carte prend sa largeur l et des coins de 24 ; sur iPhone, inchange
    const carte = r.indexOf('<View style={[{ width: l, height: tc.h, borderRadius: carres ? 24 : 20, backgroundColor: fond }, blanche ? ombreCarte : null]}>');
    const clip = r.indexOf("<View style={{ flex: 1, borderRadius: carres ? 24 : 20, overflow: 'hidden', paddingHorizontal: carres ? 16 : MARGE");
    const pastille = r.indexOf('{o.beta ? <PastilleBeta /> : null}');
    expect(carte).toBeGreaterThan(0);
    expect(clip).toBeGreaterThan(carte);
    expect(pastille).toBeGreaterThan(clip);
    expect(r.slice(carte, clip)).not.toContain('overflow');
    // a moitie dehors : 12 de ses 20 points depassent ; la rangee garde la place de ce qui depasse, et de son ombre
    expect(b).toContain('top: -PASTILLE_BETA.depasse,');
    expect(b).toContain('hauteur: 20,');
    expect(b).toContain('depasse: 12,');
    expect(b).toContain("fond: '#E9B44C', encre: '#1B2559'");
    const haut = Number(/const HAUT_RANGEE = (\d+);/.exec(r)?.[1]);
    expect(haut).toBeGreaterThanOrEqual(12 + 4);
    // le titre ne partage plus sa ligne : « COACH » n'est plus coupe
    expect(r).toContain("<View style={{ width: tc.titreL + (l - tc.l), minHeight: 14, flexDirection: 'row', alignItems: 'center' }}>");
  });
  it('la barre en chemin de pierres : un seul composant, couleurs C, torii dore, rien de coupe a 375', () => {
    const c = lire('components/yoroi/v2/accueil/CartePoids.tsx');
    const ch = lire('components/yoroi/v2/charts/CheminPierres.tsx');
    // l'accueil et Progres dessinent le chemin avec le meme composant, les couleurs ont une seule source
    // 2 novembre 2026 (proposition A) : l'accueil dessine sa ligne de paliers, Progres garde le chemin de pierres
    expect(c).toContain('<LigneDePaliers depart={start} ligne={ligne} accent={accent} sombre={sombre} />');
    expect(c).toContain('etatsLignePaliers(start, goal, last.value, chemin.part, atteint)');
    expect(lire('app/(tabs)/progres.tsx')).toContain('<CheminPierres ');
    expect(c).not.toMatch(/plein: '#/);
    expect(ch).not.toMatch(/plein: '#/);
    expect(ch).toContain("from '@/lib/v2/pesee/cheminPierres'");
    expect(PIERRES_CHEMIN.map((p) => p.plein)).toEqual(['#8C9BDE', '#C3A8F0', '#F8BE98', '#F6C83A']);
    // 28 octobre 2026 soir : le vrai torii de l'app partout (anneau, bout du chemin, courbe), gris doux tant que pas atteint
    expect(ch).toContain('<ToriiImage width={B.torii} eteint={!atteint} />');
    expect(ch).toContain('<ToriiImage width={Math.round(S * TORII_ANNEAU.largeur)} />');
    expect(ch).not.toContain('<ToriiDore');
    expect(TORII_CHEMIN.or).toBe('#F0B323');
    expect(ch).toContain('{p >= 1 && atteint ? <HaloTorii');
    // la lanterne depasse nettement de la pierre et tient dans la hauteur de la barre
    const B = BARRE_PIERRES;
    expect(B.lanterneH).toBeGreaterThanOrEqual(2 * B.pierre);
    expect(B.lanterneH).toBeLessThanOrEqual(B.hauteur);
    expect(B.torii).toBeLessThanOrEqual(B.hauteur);
    expect(B.lanterneL).toBeLessThanOrEqual(B.jour + 6);
    // a 375 : chaque chiffre de 60 tient dans son quart sans toucher le voisin, chaque pierre garde de la longueur
    const barre = 375 - 2 * ACCUEIL_PASTEL.marge - 2 * CARTE_PASTEL.marge - (B.torii - 2);
    expect(barre / 4).toBeGreaterThan(60);
    expect(barre / 4 - B.jour).toBeGreaterThan(40);
  });
  it('28 octobre : sans cap, une invitation compacte, l apercu du chemin et le bouton principal, sans vide', () => {
    const c = lire('components/yoroi/v2/accueil/CartePoids.tsx');
    const une = c.slice(c.indexOf('const pageUne = ('), c.indexOf('const pageDeLaCourbe'));
    const debutSansCap = une.indexOf(') : goal === null ? (');
    const sansCap = une.slice(debutSansCap, une.indexOf(') : objectifTxt ? (', debutSansCap));
    expect(sansCap).toContain('traduire("Fixe ton cap")');
    expect(sansCap).toContain('<CheminPierresApercu />');
    // le bouton principal partage, sous l'ancre de la visite, ouvre directement le choix de ton objectif
    expect(sansCap).toContain('<TourAnchor id="accueil.objectif">');
    expect(sansCap).toMatch(/<BoutonPrincipal style=\{\{ marginBottom: 4 \}\} label=\{traduire\("Choisir mon objectif"\)\} onPress=\{\(\) => setFeuille\(\{ quoi: 'objectif' \}\)\}/);
    expect(sansCap).not.toContain("router.push('/profile'");
    // ton poids reste au centre de la ligne du haut, comme avec un cap (la meme tete pour les deux etats)
    expect(une.indexOf("traduire('Ton poids')")).toBeLessThan(une.indexOf(') : goal === null ? ('));
    // la hauteur de la page 1 sans cap : tete 38, pastilles 5 + 22, puis 6 + 7 + titre 20 + sous titre 15, apercu 30,
    // bouton 44 et 4 sous lui pour son ombre, avec les ecarts de 6 : au moins la page de la courbe la plus basse (120 + 76), donc pas de vide dessous
    const page1 = CARTE_PASTEL.haut + CARTE_PASTEL.anneau + 5 + 22 + 6 + 7 + 20 + 15 + 6 + BARRE_PIERRES.hauteur + 6 + 44 + 4;
    expect(page1).toBeGreaterThanOrEqual(120 + 76);
    expect(page1).toBeLessThanOrEqual(120 + 196);
  });
  it('28 octobre : sans pesee, la carte pastel compacte (voile, liseré), l apercu et le bouton pour te peser', () => {
    const c = lire('components/yoroi/v2/accueil/CartePoids.tsx');
    const vide = c.slice(c.indexOf('  if (!last) {'), c.indexOf('  // ecart sur la periode affichee'));
    expect(vide).toContain('nativeID="carte-poids" testID="carte-poids"');
    expect(vide).toContain('<CheminPierresApercu />');
    expect(vide).toContain("<BoutonPrincipal label={traduire(\"Me peser\")} onPress={() => router.push('/pesee' as any)}");
    // 2 novembre 2026 (proposition A) : plus de voile lilas, ni sur la carte vide ni sur la carte normale
    expect(c).not.toMatch(/<LinearGradient/);
  });
  it('28 octobre : l apercu du chemin a la hauteur de la vraie barre, des points qui tiennent a 375', () => {
    const ch = lire('components/yoroi/v2/charts/CheminPierres.tsx');
    expect(ch).toContain('export function CheminPierresApercu()');
    expect(ch).toContain('<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: B.hauteur, marginHorizontal: marge }}>');
    expect(ch).toContain('<LanternePalier allumee={false}');
    const B = BARRE_PIERRES;
    const A = APERCU_CHEMIN;
    // a 375, chaque quart garde au moins 4 points entre deux lanternes
    const quart = (375 - 2 * ACCUEIL_PASTEL.marge - 2 * CARTE_PASTEL.marge - (B.torii - 2)) / 4 - B.jour;
    expect(Math.floor(quart / (A.pas + 0.1))).toBeGreaterThanOrEqual(4);
    expect(A.point).toBeLessThan(B.pierre);
    expect(A.point).toBeLessThan(A.pas);
    expect(A.opacite).toBeGreaterThan(0.3);
    expect(A.torii).toBeLessThan(1);
  });
  it('28 octobre soir : 3 etats de pierre impossibles a confondre (faite, en cours, a venir)', () => {
    // au tout debut, la premiere pierre est en cours : on voit qu'on commence
    expect(etatsPierres(0, false)).toEqual(['en_cours', 'a_venir', 'a_venir', 'a_venir']);
    expect(etatsPierres(0.2, false)).toEqual(['en_cours', 'a_venir', 'a_venir', 'a_venir']);
    expect(etatsPierres(0.25, false)).toEqual(['faite', 'en_cours', 'a_venir', 'a_venir']);
    expect(etatsPierres(0.6, false)).toEqual(['faite', 'faite', 'en_cours', 'a_venir']);
    expect(etatsPierres(0.89, false)).toEqual(['faite', 'faite', 'faite', 'en_cours']);
    // 100 % sans torii atteint : la derniere reste en cours ; torii atteint : les 4 faites
    expect(etatsPierres(1, false)).toEqual(['faite', 'faite', 'faite', 'en_cours']);
    expect(etatsPierres(0.4, true)).toEqual(['faite', 'faite', 'faite', 'faite']);
    expect(poidsSurChemin(90, 85, 0.2)).toBeCloseTo(89, 6);
    const ch = lire('components/yoroi/v2/charts/CheminPierres.tsx');
    // a venir : contour pointille gris bleu, sans remplissage ; en cours : pointilles de sa couleur sous la part faite
    expect(ch).toContain('fill="none" stroke={gris} strokeWidth={ep} strokeDasharray={dash}');
    // en cours : le reste garde un fond pale de sa pierre et un pointille de sa couleur franche, a venir reste vide et gris
    expect(ch).toContain('fill={sombre ? pierre.paleSombre : pierre.pale} stroke={sombre ? pierre.texteSombre : franc} strokeWidth={ep} strokeDasharray={dash}');
    // faite : la lanterne allumee porte une coche ; le torii reste gris jusqu'a ton objectif atteint
    expect(ch).toContain("allumee={etats[i] === 'faite'}");
    expect(ch).toContain('{p >= 1 && atteint ? <HaloTorii');
    // le marqueur pulse (Reanimated), sans pulsation si tu as reduit les animations
    expect(ch).toContain('useReducedMotion()');
    expect(ch).toContain('withRepeat(withTiming(1');
    // le lecteur d'ecran dit l'etat de chaque palier
    expect(ch).toContain('accessibilityLabel={texteEtatsChemin(depart, objectif, p, atteint)}');
    expect(lire('components/yoroi/v2/accueil/CartePoids.tsx')).toContain('texteEtatsChemin(start, goal, chemin.part, atteint)');
    // les couleurs franches restent celles de la palette C (meme teinte, un cran plus soutenues), le gris des pierres a venir est clair
    expect(ETATS_CHEMIN.franc).toHaveLength(4);
    expect(ETATS_CHEMIN.aVenir.clair).toBe('#B7C1DC');
    // le torii de l'anneau : le plus grand qui tient dans le rond interieur, lisible (20 points a 38)
    const { TORII_ANNEAU } = require('@/lib/v2/pesee/cheminPierres');
    expect(lire('components/yoroi/v2/charts/ToriiImage.tsx')).toContain('export const TORII_RATIO = 192 / 167;');
    const TORII_RATIO = 192 / 167;
    const S = CARTE_PASTEL.anneau;
    const interieur = 2 * (0.39 - 0.055) * S;
    const w = Math.round(S * TORII_ANNEAU.largeur);
    expect(w).toBeGreaterThanOrEqual(20);
    expect(w).toBeLessThanOrEqual(interieur * 0.82);
    expect(w / TORII_RATIO).toBeLessThanOrEqual(interieur * 0.72);
    // les deux versions grises existent (sticker et encre)
    for (const f of ['assets/avatars/app/stickers/torii_courbe_gris.webp', 'assets/avatars/app/ornements/torii_courbe_gris.webp']) expect(fs.existsSync(path.resolve(__dirname, '..', '..', f))).toBe(true);
  });
  it('28 octobre soir : ce que dit le lecteur d ecran, et « Tu es ici » seulement s il ne touche aucun chiffre', () => {
    const t = texteEtatsChemin(90, 85, 0.6, false);
    expect(t.startsWith('Palier 1 franchi, palier 2 franchi, palier 3 en cours, encore ')).toBe(true);
    expect(t.endsWith('ton objectif à venir')).toBe(true);
    expect(texteEtatsChemin(90, 85, 0, false)).toMatch(/^Palier 1 en cours, encore 1[,.]2 kg, palier 2 à venir/);
    expect(texteEtatsChemin(90, 85, 1, true)).toBe('Les 4 paliers franchis, torii atteint');
    // place libre : le libelle se pose ; contre un chiffre : rien
    expect(placerTuEsIci(300, 150, [[0, 28], [286, 300]])).toBe(150 - ETATS_CHEMIN.libelle.largeur / 2);
    expect(placerTuEsIci(300, 150, [[140, 168]])).toBeNull();
    expect(largeurChiffre('88,8')).toBeLessThanOrEqual(30);
    // a 430 le libelle tient au milieu d un quart (entre deux chiffres de 28) ; a 375 la place manque : rien plutot qu un chevauchement
    const B = BARRE_PIERRES;
    const barre = (L: number) => L - 2 * ACCUEIL_PASTEL.marge - 2 * CARTE_PASTEL.marge - (B.torii - 2);
    expect(ETATS_CHEMIN.libelle.largeur + 8).toBeLessThanOrEqual(barre(430) / 4 - largeurChiffre('88,8'));
    const W = barre(375);
    expect(placerTuEsIci(W + B.torii - 2, (W + B.torii - 2) / 2 - W / 8, [[0, 28], [W / 4 + 11 - 14, W / 4 + 11 + 14], [W / 2 + 11 - 14, W / 2 + 11 + 14]])).toBeNull();
    // le marqueur tient dans la hauteur de la barre, plus haut que la pierre pour se voir
    expect(ETATS_CHEMIN.marqueur.taille).toBeLessThanOrEqual(B.hauteur);
    expect(ETATS_CHEMIN.marqueur.taille).toBeGreaterThan(B.pierre);
  });
  it('la couleur de ton poids suit l etape en cours et reste lisible', () => {
    expect(pierreEnCours(0)).toBe(0);
    expect(pierreEnCours(0.25)).toBe(1);
    expect(pierreEnCours(0.6)).toBe(2);
    expect(pierreEnCours(0.88)).toBe(3);
    expect(pierreEnCours(1)).toBe(3);
    expect(couleurEtape(0.1, false, false)).toBe('#34449A');
    expect(couleurEtape(0.9, false, false)).toBe('#A87300');
    expect(couleurEtape(0.3, true, false)).toBe('#A87300');
    expect(couleurEtape(0.6, false, true)).toBe('#F9C7A6');
    // contraste sur le voile lilas de la carte (#E9E4FF) : au moins 3 a 1, le seuil AA du gros texte (le poids est en 30 gras)
    const lum = (h: string) => {
      const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    for (const part of [0, 0.3, 0.6, 0.9]) expect(ratio(couleurEtape(part, false, false), '#E9E4FF')).toBeGreaterThan(3);
    for (const part of [0, 0.3, 0.6, 0.9]) expect(ratio(couleurEtape(part, false, true), '#262449')).toBeGreaterThan(4.5);
    expect(melange('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(paliersDuChemin(86.4, 80, 85.1, 0.2).prochain).toEqual({ kg: 84.8, encore: 0.3, dernier: false });
  });
});
