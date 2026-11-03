/**
 * La carte a partager, rendue a 360 de large (capture en 1080).
 * 31 octobre 2026 (cartes de partage v2) : les 10 directions (components/yoroi/v2/cartes/Directions.tsx)
 * remplacent les 6 modeles Affiche, Bandeau, Neon nuit, Ticket, Medaille et Tableau de score, archives dans
 * _archive_ancien_design_2026-10-09/cartes_6_modeles_2026-10-31. On garde ici : les vraies donnees, le fond
 * « Ta photo » ou « Couleur », les 3 formats, le pied (logo et badges officiels) et la carte Avant apres.
 * Les autocollants (net, chrome, stickers) se dessinent aussi sans fond : le PNG garde la transparence.
 */
import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import type { ImageSourcePropType } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { chiffresAffiches, titreCarte } from '@/lib/v2/cartes/chiffres';
import { exploitVisible } from '@/lib/v2/cartes/exploits';
import type { CarteData, DirectionId, FormatId, ModeleId, OptionsCarte, StatValue } from '@/lib/v2/cartes/types';
import { BADGES } from './fonds';
import { AvantApresVue } from './AvantApresVue';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { donneesEnUnite, exploitEnUnite, statsEnUnite } from '@/lib/v2/cartes/unite';
import { couleurDe } from '@/lib/v2/cartes/couleurs';
import type { CouleurCarte } from '@/lib/v2/cartes/couleurs';
import type { Placement } from '@/lib/v2/cartes/zoneVisage';
import { DIRECTIONS, directionDispo, directionEffective, directionsPour, estAutocollant, estDirection, ORDRE_CARROUSEL } from '@/lib/v2/cartes/directions';
import { chargeTexte } from '@/lib/v2/unitePoids';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire } from '@/lib/i18n/tr';
import { Dessin, fondDe } from './Directions';
import type { CtxDirection } from './Directions';
import { ambiancePour } from './ambiance';
// 2 novembre 2026 (cartes v10) : le nouveau moteur ; depuis le studio unique (meme jour), le seul, pour tout le monde
import { CARTES_REGLAGE_EVENT, formatDuMoteur, lireMoteur, moteurCourant } from '@/lib/v2/cartes/store';
import type { MoteurCartes } from '@/lib/v2/cartes/store';
import { compositionEffective, contenuDe, famillesPour } from '@/lib/v2/cartes/moteur/familles';
import { formatMoteur } from '@/lib/v2/cartes/moteur/grille';
import { cleBloc, positionValide } from '@/lib/v2/cartes/moteur/deplacement';
import { mettreEnPage } from '@/lib/v2/cartes/moteur/miseEnPage';
import type { Plan } from '@/lib/v2/cartes/moteur/miseEnPage';
import { photoMesuree, taillePhoto } from '@/lib/v2/cartes/moteur/analysePhoto';
import type { AnalysePhoto } from '@/lib/v2/cartes/moteur/analysePhoto';
import type { Recadrage } from '@/lib/v2/cartes/moteur/protection';
import { CarteMoteur } from './moteur/CarteMoteur';

export const CARTE_W = 360;
export const HAUTEURS: Record<FormatId, number> = { story: 640, post: 450, carre: 360 };
/** Taille d'export en pixels */
export const EXPORT: Record<FormatId, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
  carre: { w: 1080, h: 1080 },
};
/** En Story, le pied reste a 270 pixels du bas (90 points) pour ne pas passer sous la barre de reponse */
export const REMONTEE_PIED_STORY = 70;
/** Marges du haut et du bas de chaque format, pied compris */
export const MARGES: Record<FormatId, { haut: number; bas: number }> = {
  story: { haut: 50, bas: 16 + REMONTEE_PIED_STORY },
  post: { haut: 22, bas: 16 },
  carre: { haut: 18, bas: 14 },
};

const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');
const BLANC = '#FFFFFF';
const ENCRE_PAPIER = '#14161C';
const FOIS = '×';

export type VisuelsCarte = {
  /** image de la scene d'accueil (plus dessinee depuis le 31 octobre 2026, gardee pour les appels existants) */
  scene?: ImageSourcePropType | null;
  sceneId?: string | null;
  /** photo personnelle (uri) */
  photo?: string | null;
  /** personnage de l'utilisateur : la Retrospective le pose en grand */
  personnage?: ImageSourcePropType | null;
  /**
   * 31 octobre 2026 (cartes v2) : sans photo personnelle, une photo d'ambiance (mode demo et apercus du carrousel).
   * Jamais pour la carte enregistree ou partagee.
   */
  ambiance?: boolean;
  /** 2 novembre 2026 (nouveau moteur) : l'analyse de ta photo (vide sans module photo), ton recadrage au doigt, et le geste en cours */
  analyse?: AnalysePhoto | null;
  recadrage?: Recadrage | null;
  enveloppePhoto?: (photo: React.ReactNode) => React.ReactNode;
  /** 2 novembre 2026 (bloc deplacable) : enveloppe le bloc des chiffres (le studio y pose le geste qui le deplace) */
  enveloppeBloc?: (bloc: React.ReactNode) => React.ReactNode;
  /** 2 novembre 2026 (nouveau moteur) : la vue de l'autocollant seul, capturee pour Copier et Enregistrer */
  refAutocollant?: React.RefObject<View | null>;
  /** 3 novembre 2026 (photos d'exemple) : la taille de la photo quand elle est deja connue (exemples), sans la lire */
  taillePhoto?: { w: number; h: number } | null;
  /**
   * 3 novembre 2026 (photos d'exemple) : la photo est une photo d'EXEMPLE (lib/v2/cartes/exemples.ts), pour les
   * apercus seulement. Jamais dans un export : visuelsSansExemple() la retire avant toute capture.
   */
  exemple?: boolean;
};

type Props = {
  data: CarteData;
  options: OptionsCarte;
  visuels: VisuelsCarte;
  /** 31 octobre 2026 : le bloc des chiffres deplace et redimensionne au doigt dans l'atelier (session d'edition seulement) */
  placement?: Placement | null;
  /** 2 novembre 2026 : force un moteur (Studio createur, mode comparer) ; absent, celui de l'interrupteur */
  moteur?: MoteurCartes;
};

/** Taille de police pour que le texte tienne sur une ligne dans la largeur donnee */
export function fit(text: string, largeur: number, max: number, k = 0.6): number {
  const n = Math.max(1, text.length);
  return Math.max(9, Math.min(max, Math.floor(largeur / (n * k))));
}

/** Initiales d'un club sans logo : « Team Marseille » donne « TM » */
export function initialesClub(nom: string): string {
  const mots = nom.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return (mots.length > 1 ? mots[0][0] + mots[1][0] : (mots[0] ?? '').slice(0, 2)).toUpperCase();
}

const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((j) => traduire(j.charAt(0).toUpperCase() + j.slice(1)).toLowerCase());

/** « Mardi 13 octobre » devient « 13 octobre » */
export function dateSansJour(sousTitre: string): string {
  const [premier, ...reste] = sousTitre.split(' ');
  return reste.length && JOURS_SEMAINE.includes((premier ?? '').toLowerCase()) ? reste.join(' ') : sousTitre;
}

/** Le pied de la carte Avant apres : le logo YOROI, le mot YOROI et les deux badges officiels des stores */
export function Pied({ ink, compact }: { ink: string; compact?: boolean }) {
  const logo = compact ? 26 : 30;
  const bh = compact ? 17 : 20;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }} accessibilityLabel={traduire('YOROI, sur iPhone et Android')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Image source={LOGO} style={{ width: logo, height: logo, borderRadius: logo * 0.24 }} />
        <Ink size={compact ? 17 : 20} weight="black" color={ink} allowFontScaling={false} style={{ letterSpacing: 1.6 }}>YOROI</Ink>
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        <Image source={BADGES.apple.image} style={{ width: Math.round(bh * BADGES.apple.ratio), height: bh }} resizeMode="contain" />
        <Image source={BADGES.google.image} style={{ width: Math.round(bh * BADGES.google.ratio), height: bh }} resizeMode="contain" />
      </View>
    </View>
  );
}

// ============================================
// LE CHOIX DES MODELES (les 10 directions)
// ============================================

export type ModeleInfo = { id: ModeleId; nom: string; explication: string; num?: string; autocollant?: boolean };

/** Les 10 directions, dans l'ordre du carrousel */
export const MODELES: ModeleInfo[] = ORDRE_CARROUSEL.map((id) => DIRECTIONS.find((x) => x.id === id)!);
/** Gardee pour les appels existants : les ids proposes, dans l'ordre du carrousel */
export const MODELES_SIX: ModeleId[] = MODELES.map((m) => m.id);

export function modeleDispo(d: CarteData, id: ModeleId): boolean {
  if (d.moment === 'avant_apres') return id === MODELES[0].id;
  return estDirection(id) && directionDispo(d, id);
}

export function modelesPour(d: CarteData): ModeleInfo[] {
  if (d.moment === 'avant_apres') return [];
  return directionsPour(d);
}

/** La direction dessinee : celle choisie si elle est proposee, sinon la premiere du carrousel (anciens reglages compris) */
export function modeleEffectif(d: CarteData, id: ModeleId): DirectionId {
  return directionEffective(d, id);
}

export function explicationModele(m: ModeleInfo, _d?: CarteData): string {
  return m.explication;
}

/** Plus de choix Clair ou Sombre depuis les 10 directions (seulement la carte Avant apres) */
export function aClairSombre(_id: ModeleId): boolean {
  return false;
}

/** Ce qui est dessine : ta photo (sauf « Que mes données » ou personne retiree) et la couleur choisie */
export function optionsDessinees(o: OptionsCarte, v: VisuelsCarte): { photo: string | null; coul: CouleurCarte } {
  const photo = o.fond === 'photo' && !!v.photo && !o.epure && !o.sansPersonne ? v.photo : null;
  return { photo, coul: couleurDe(o.couleur) };
}

/** La carte sort en autocollant transparent : seulement pour net, chrome et stickers */
export function sortieTransparente(d: CarteData, o: OptionsCarte): boolean {
  return o.sortie === 'autocollant' && d.moment !== 'avant_apres' && estAutocollant(modeleEffectif(d, o.modele));
}

/** Le chiffre vedette et les autres chiffres d'une carte (exploit : le chiffre de l'exploit et ses cotes) */
export function chiffresDeCarte(brut: CarteData, data: CarteData, o: OptionsCarte, u: ReturnType<typeof useUnitePoids>): { hero: StatValue | null; stats: StatValue[]; titre: string } {
  if (data.moment === 'exploit' && data.exploit) {
    const e = exploitEnUnite(exploitVisible(data.exploit, o.masque), u);
    const hero: StatValue | null = e.hero.value ? { key: 'exploit', label: e.accroche, value: e.hero.value, unit: e.hero.unit || undefined } : null;
    const stats = (e.cotes ?? []).slice(0, 3).map((x) => ({ key: 'exploit' as const, label: x.label, value: x.value, unit: x.unit }));
    return { hero, stats, titre: e.surtitre };
  }
  const all = statsEnUnite(chiffresAffiches(brut, o.chiffres, o.masque), u);
  return { hero: all[0] ?? null, stats: all.slice(1, 4), titre: titreCarte(brut, o.masque) };
}

// ============================================
// LE NOUVEAU MOTEUR (cartes v10, 2 novembre 2026)
// ============================================

/** Le moteur des cartes : le nouveau, pour tout le monde depuis le 2 novembre 2026 (studio unique) */
export function useMoteurCartes(): MoteurCartes {
  const [m, setM] = useState<MoteurCartes>(moteurCourant());
  useEffect(() => {
    let vivant = true;
    lireMoteur().then((x) => vivant && setM(x)).catch(() => undefined);
    const sub = DeviceEventEmitter.addListener(CARTES_REGLAGE_EVENT, (e: unknown) => {
      const x = e && typeof e === 'object' ? (e as { moteur?: unknown }).moteur : undefined;
      if (x === 'ancien' || x === 'nouveau') setM(x);
    });
    return () => {
      vivant = false;
      sub.remove();
    };
  }, []);
  return m;
}

/** Vrai si le nouveau moteur dessine cette carte (sinon l'ancien, pour les cartes qu'il ne connait pas encore) */
export function nouveauMoteurPour(d: CarteData | null | undefined, m: MoteurCartes): boolean {
  return m === 'nouveau' && famillesPour(d).length > 0;
}

/** Le format dessine : le carre s'ouvre en 4:5 dans le nouveau moteur */
export function formatDessine(d: CarteData | null | undefined, o: OptionsCarte, m: MoteurCartes): FormatId {
  return formatDuMoteur(o.format, nouveauMoteurPour(d, m));
}

/** La taille de ta photo, lue une fois par photo */
export function useTaillePhoto(uri: string | null | undefined): { w: number; h: number } | null {
  const [t, setT] = useState<{ uri: string; w: number; h: number } | null>(null);
  useEffect(() => {
    let vivant = true;
    if (!uri) return;
    taillePhoto(uri).then((x) => vivant && x && setT({ uri, ...x })).catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, [uri]);
  return t && t.uri === uri ? { w: t.w, h: t.h } : null;
}

/**
 * 2 novembre 2026 (studio unique) : les chiffres que tu caches dans le studio (« Chiffres à afficher ») disparaissent du
 * panneau et de l'autocollant. Il en reste toujours au moins un ; le chiffre heros du panneau ne se cache pas.
 */
export function sansChiffresCaches<T extends { stats: { l: string }[]; lignesAuto?: { l: string }[] }>(c: T, cache: string[] | null | undefined): T {
  if (!cache?.length) return c;
  const stats = c.stats.filter((x) => !cache.includes(x.l));
  const garde = stats.length || !c.stats.length ? stats : c.stats.slice(0, 1);
  const auto = c.lignesAuto ? c.lignesAuto.filter((x) => !cache.includes(x.l)) : undefined;
  const lignesAuto = c.lignesAuto ? (auto?.length ? auto : c.lignesAuto.slice(0, 1)) : c.lignesAuto;
  return { ...c, stats: garde, lignesAuto };
}

/** Le plan du nouveau moteur pour une carte ; null si le nouveau moteur ne la dessine pas */
export function planNouveauMoteur(data: CarteData, o: OptionsCarte, v: VisuelsCarte, u: ReturnType<typeof useUnitePoids>, taille: { w: number; h: number } | null): { plan: Plan; photo: string | null } | null {
  const fams = famillesPour(data);
  if (!fams.length) return null;
  const famille = o.familleMoteur && fams.includes(o.familleMoteur) ? o.familleMoteur : fams[0];
  const brut = contenuDe(data, famille, u, o.masque);
  if (!brut) return null;
  const contenu = sansChiffresCaches(brut, o.cacheMoteur);
  const photo = optionsDessinees(o, v).photo;
  const aPhoto = !!photo && !!taille;
  const compo = compositionEffective(data, famille, o.compo ?? (photo ? 'A' : null), aPhoto);
  const mesure = compo === 'A' && photo && taille ? photoMesuree(v.analyse, taille.w, taille.h) : null;
  const format = formatMoteur(o.format);
  // 2 novembre 2026 (bloc deplacable) : ta place du bloc des chiffres, pour cette carte et ce format
  const positionBloc = positionValide(o.positionsBloc?.[cleBloc(famille, compo, format)]);
  const plan = mettreEnPage({ contenu, compo, format, style: o.styleCarte, photo: mesure, recadrage: v.recadrage ?? null, lumiere: v.analyse?.lumiere ?? null, positionBloc });
  return { plan, photo: mesure ? photo : null };
}

function RenduNouveau({ data, options, visuels, u, W }: { data: CarteData; options: OptionsCarte; visuels: VisuelsCarte; u: ReturnType<typeof useUnitePoids>; W: number }) {
  const photo = optionsDessinees(options, visuels).photo;
  // une photo d'exemple donne sa taille : rien a lire
  const lue = useTaillePhoto(visuels.taillePhoto ? null : photo);
  const taille = (photo && visuels.taillePhoto) || lue;
  const r = useMemo(() => planNouveauMoteur(data, options, visuels, u, taille), [data, options, visuels, u, taille]);
  if (!r) return null;
  const aa = data.avantApres;
  const duo = r.plan.type === 'duo' && aa ? { avant: aa.avant.uri, apres: aa.apres.uri, flou: !!options.flou, poids: { avant: r.plan.contenu.poids?.avant ?? null, apres: r.plan.contenu.poids?.apres ?? null } } : null;
  return <CarteMoteur plan={r.plan} largeur={W} photo={r.photo} taillePhoto={taille} duo={duo} enveloppePhoto={visuels.enveloppePhoto} enveloppeBloc={visuels.enveloppeBloc} refAutocollant={visuels.refAutocollant} />;
}

/**
 * La carte. Rendue a 360 de large ; l'apercu la reduit avec une echelle, la capture la prend a sa taille.
 * 2 novembre 2026 (cartes v10) : selon l'interrupteur du Studio createur, l'ancien moteur (Directions.tsx) ou le nouveau
 * (CarteMoteur.tsx) ; une carte que le nouveau moteur ne connait pas reste sur l'ancien.
 */
export const CarteRendu = forwardRef<View, Props>(({ data: brut, options, visuels, placement, moteur }, ref) => {
  // 18 octobre 2026 : charges calculees en kilos, dessinees dans l'unite du reglage (kg ou lb)
  const u = useUnitePoids();
  const moteurLu = useMoteurCartes();
  const m = moteur ?? moteurLu;
  const data = donneesEnUnite(brut, u);
  const W = CARTE_W;
  if (nouveauMoteurPour(brut, m)) {
    const Hn = HAUTEURS[formatDessine(brut, options, m)];
    return (
      <View ref={ref} collapsable={false} testID={visuels.exemple ? 'carte-avec-exemple' : undefined} style={{ width: W, height: Hn, overflow: 'hidden' }}>
        <RenduNouveau data={brut} options={{ ...options, format: formatDessine(brut, options, m) }} visuels={visuels} u={u} W={W} />
      </View>
    );
  }
  const H = HAUTEURS[options.format];
  if (data.moment === 'avant_apres') {
    return (
      <View ref={ref} collapsable={false} style={{ width: W, height: H, overflow: 'hidden', backgroundColor: options.sombre ? '#14161F' : '#F2F1EC' }}>
        <AvantApresVue d={data} o={options} H={H} signature={<Pied ink={options.sombre ? BLANC : ENCRE_PAPIER} compact={options.format !== 'story'} />} />
      </View>
    );
  }
  const { photo, coul } = optionsDessinees(options, visuels);
  const id = modeleEffectif(data, options.modele);
  const transparent = sortieTransparente(data, options);
  const { hero, stats, titre } = chiffresDeCarte(brut, data, options, u);
  const r = data.seance?.records?.[0];
  const record = r?.nom ? { nom: sansTiret(r.nom), court: r.poids && r.reps ? `${chargeTexte(r.poids, u)} ${FOIS} ${r.reps}` : r.texte } : null;
  const ambiance = !photo && !!visuels.ambiance && !visuels.photo ? ambiancePour(id, data.famille) : null;
  const c: CtxDirection = {
    d: data,
    o: options,
    format: options.format,
    W,
    H,
    hero,
    stats,
    titre,
    date: data.sousTitre,
    record,
    photo: transparent ? null : photo ? { uri: photo } : ambiance,
    coul,
    transparent,
    personnage: visuels.personnage ?? null,
    u,
    placement: placement ?? null,
  };
  return (
    <View ref={ref} collapsable={false} style={{ width: W, height: H, overflow: 'hidden', backgroundColor: fondDe(id, c) }}>
      <Dessin id={id} c={c} />
    </View>
  );
});
CarteRendu.displayName = 'CarteRendu';

/** Apercu reduit : la carte garde sa taille de 360 pour la capture, une echelle la fait tenir dans la largeur voulue */
/**
 * dessous (2 novembre 2026, autocollant du nouveau moteur) : ce qui est montre sous la carte transparente, pour l'apercu
 * seulement (damier ou ta photo) ; jamais dans la capture. Sans dessous, rien ne change.
 */
export const CarteApercu = forwardRef<View, Props & { largeur: number; damier?: boolean; dessous?: React.ReactNode }>(({ largeur, damier, dessous, ...p }, ref) => {
  const moteurLu = useMoteurCartes();
  const m = p.moteur ?? moteurLu;
  const H = HAUTEURS[formatDessine(p.data, p.options, m)];
  const s = largeur / CARTE_W;
  const transparent = !nouveauMoteurPour(p.data, m) && sortieTransparente(p.data, p.options);
  return (
    <View style={{ width: largeur, height: H * s, borderRadius: 18 * s + 4, overflow: 'hidden', backgroundColor: dessous ? '#C9CBD1' : transparent && damier !== false ? '#C9CBD1' : '#121318' }}>
      {dessous ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: largeur, height: H * s }}>{dessous}</View> : null}
      {/* l'autocollant seul : un damier dessous montre la transparence (il n'est pas dans la capture) */}
      {!dessous && transparent && damier !== false ? <Damier w={largeur} h={H * s} /> : null}
      <View style={{ width: CARTE_W, height: H, transform: [{ scale: s }], transformOrigin: 'top left' } as object}>
        <CarteRendu ref={ref} {...p} />
      </View>
    </View>
  );
});
CarteApercu.displayName = 'CarteApercu';

export function Damier({ w, h }: { w: number; h: number }) {
  return (
    <Svg pointerEvents="none" width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <Pattern id="damier" width="24" height="24" patternUnits="userSpaceOnUse">
          <Rect width="24" height="24" fill="#E4E6EA" />
          <Rect width="12" height="12" fill="#C9CBD1" />
          <Rect x="12" y="12" width="12" height="12" fill="#C9CBD1" />
        </Pattern>
      </Defs>
      <Rect width={w} height={h} fill="url(#damier)" />
    </Svg>
  );
}
