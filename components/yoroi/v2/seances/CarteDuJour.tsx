/**
 * La carte du jour, en haut de l'onglet Séances (28 octobre 2026, maquette A « Aujourd'hui d'abord », validée par
 * Houari). Trois cas, dans cet ordre :
 *  1. un programme en cours (le Coach) : la séance du jour (ou la suivante), où tu en es, les trois premiers exercices
 *     illustrés, et le grand bouton « Commencer la séance ». Emprunt à la maquette C : la ligne « la charge monte »
 *     tirée de la vraie règle de progression (lib/v2/seances/carteDuJour.ts), et ta série de semaines d'affilée ;
 *  2. sinon, un créneau prévu aujourd'hui dans ton planning : il se lance comme depuis le bouton + ;
 *  3. sinon, un appel clair vers le Coach (et toujours les zones et la liste des programmes).
 * Remplace la carte « Ton programme » (ProgrammeCard.tsx, gardée telle quelle, et archivée dans
 * _archive_ancien_design_2026-10-09/seances_A_2026-10-28).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { Icon } from './Icon';
import { tap } from './ui';
import { CarreSticker, Pastille, useTeinte } from './kitA';
import type { NextSlot } from './NextUp';
import type { Training } from '@/lib/database';
import { getActiveInjuries } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { formatDuration } from '@/lib/v2/trainingWeek';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { demoDe, demoSlug } from '@/lib/v2/programmes/demos';
import { machineArt } from '@/lib/v2/seance/machinesArt';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { jourPourToi } from '@/lib/v2/programmes/perso';
import { regionsDesBlessures, unirRegions } from '@/lib/v2/programmes/blessures';
import type { Region } from '@/lib/v2/programmes/blessures';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { estProgrammePerso } from '@/lib/v2/programmes/registrePerso';
import { chargerProgrammesPerso } from '@/lib/v2/programmes/monProgramme';
import { messageCoach } from '@/lib/v2/programmes/coach';
import { infosHero, nomDuProgramme, pourquoiDuJour } from '@/lib/v2/programmes/heroJour';
import { PROGRAMME_CHANGED_EVENT, chargerMachines, chargerMateriel, chargerProgrammeActif, estSemaineLegere, joursDuProgramme, planEffectif, prochainJour, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { routeDuCreneau } from '@/lib/v2/programmes/agenda';
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { localISO } from '@/lib/v2/accueil/hydration';
import { ligneProgression, semainesDAffilee } from '@/lib/v2/seances/carteDuJour';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { chargeTexte } from '@/lib/v2/unitePoids';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Contexte = { materiel: Equipement[] | null; machines: string[] | null; regions: Region[] };

/** Le cadre pastel de la carte (dégradé lilas vers bleu, comme la maquette) */
function Cadre({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const sombre = theme.isDark;
  return (
    <View style={{ borderRadius: 30, shadowColor: '#23358F', shadowOpacity: sombre ? 0 : 0.1, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 3 }}>
      <LinearGradient
        colors={sombre ? ['#2A2433', '#1E2538'] : ['#EFE6F3', '#E6ECF8']}
        locations={[0, 0.62]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{ borderRadius: 30, overflow: 'hidden', padding: 16 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

/** La série de semaines d'affilée, en pastille blanche en haut à droite */
function Serie({ n }: { n: number }) {
  const { theme } = useYoroiTheme();
  const illus = useIllustrations();
  const p = useTeinte('peche');
  return (
    <View
      accessible
      accessibilityLabel={traduire('{0} semaines d’affilée avec ton objectif tenu', n)}
      style={{ minHeight: 30, borderRadius: 15, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)', paddingLeft: 6, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}
    >
      {illus.stickers ? <Image source={illus.img('flamme')} style={{ width: 18, height: 18 }} resizeMode="contain" /> : <Icon name="flame" size={16} color={p.texte} strokeWidth={2.4} />}
      <Ink size={12.5} weight="extraBold" color={p.texte}>{traduire('{0} semaines d’affilée', n)}</Ink>
    </View>
  );
}

/** Le titre de la carte, à gauche de l'illustration */
function EnTete({ kicker, titre, sous, serie, art }: { kicker: string; titre: string; sous?: string; serie: number; art: ReturnType<typeof sportImage> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const lilas = useTeinte('lilas');
  return (
    <>
      {art ? <Image source={art} style={{ position: 'absolute', right: -30, top: 44, width: 150, height: 206 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, rowGap: 6 }}>
        <Ink size={11} weight="extraBold" color={lilas.texte} style={{ letterSpacing: 1.4, flexShrink: 1 }}>{kicker.toLocaleUpperCase()}</Ink>
        {serie >= 2 ? <Serie n={serie} /> : null}
      </View>
      <View style={{ marginTop: 6, marginRight: art ? 104 : 0, gap: 6 }}>
        <Ink size={27} weight="black" tight numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.75} style={{ lineHeight: 30, letterSpacing: -0.6 }} accessibilityRole="header">{titre}</Ink>
        {sous ? <Ink size={13} weight="bold" color={c.textSecondary} style={{ lineHeight: 18 }}>{sous}</Ink> : null}
      </View>
    </>
  );
}

/**
 * L'illustration d'un exercice : son animation quand elle existe (mode createur), sinon le dessin de sa machine
 * (assets/exercices/machines, meme nom exact), sinon le sticker de son materiel ou de son muscle.
 */
function stickerExo(e: ExoProgramme): NomSticker {
  const n = e.nom.toLowerCase();
  if (/kettlebell/.test(n)) return 'kettlebell';
  if (/barre|deadlift|souleve|squat/.test(n)) return 'barre';
  const m = e.muscle.toUpperCase();
  if (m.startsWith('PECTO')) return 'pecs';
  if (m.startsWith('ABDO')) return 'abdos';
  if (m.startsWith('FESS')) return 'fessiers';
  if (/BRAS|BICEPS|TRICEPS/.test(m)) return 'bras';
  if (m.startsWith('DOS')) return 'force';
  return 'musculation';
}

function VisuelExo({ e, teinte }: { e: ExoProgramme; teinte: 'bleu' | 'creme' | 'lilas' }) {
  const t = useTeinte(teinte);
  const { theme } = useYoroiTheme();
  const bord = theme.isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF';
  if (demoDe(e.nom)) return <ExoDemo nom={e.nom} taille={64} arrondi={18} />;
  const art = machineArt(demoSlug(e.nom));
  if (art) {
    return (
      <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: t.fond, borderWidth: 3, borderColor: bord, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Image source={art} style={{ width: 54, height: 54 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  return (
    <View style={{ borderRadius: 18, borderWidth: 3, borderColor: bord }}>
      <CarreSticker nom={stickerExo(e)} teinte={teinte} taille={58} rayon={15} />
    </View>
  );
}

/** Les trois premiers exercices, illustres */
function TroisExos({ exos, pied }: { exos: ExoProgramme[]; pied?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const teintes = ['bleu', 'creme', 'lilas'] as const;
  return (
    <View style={{ marginTop: 14, borderRadius: 22, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)', paddingTop: 12, paddingBottom: 10, paddingHorizontal: 8, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {exos.map((e, k) => (
          <View key={`${e.nom}${k}`} style={{ flex: 1, alignItems: 'center', gap: 6, minWidth: 0 }}>
            <VisuelExo e={e} teinte={teintes[k % 3]} />
            <Ink size={11.5} weight="bold" color={c.textSecondary} numberOfLines={3} style={{ textAlign: 'center', lineHeight: 15 }}>{sansTiret(traduire(nomFr(e.nom)))}</Ink>
          </View>
        ))}
      </View>
      {pied}
    </View>
  );
}

function Commencer({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <BoutonPrincipal
      label={label}
      onPress={onPress}
      hauteur={60}
      rayon={30}
      tailleTexte={17}
      lignes={1}
      style={{ marginTop: 14 }}
      icone={(col) => (
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="play" size={13} color={col} fill={col} />
        </View>
      )}
    />
  );
}

/** Ligne du bas : un lien à gauche, une précision à droite (elle passe dessous si la place manque) */
function Pied({ lien, onLien, note, lien2, onLien2 }: { lien: string; onLien: () => void; note?: string; lien2?: string; onLien2?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, paddingHorizontal: 6 }}>
      <Pressable onPress={() => { tap(); onLien(); }} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Ink size={13.5} weight="extraBold" color={c.accentText}>{lien}</Ink>
      </Pressable>
      {lien2 && onLien2 ? (
        <Pressable onPress={() => { tap(); onLien2(); }} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Ink size={13.5} weight="extraBold" color={c.accentText}>{lien2}</Ink>
        </Pressable>
      ) : note ? (
        <Ink size={12.5} weight="bold" color={c.textSecondary} style={{ flexShrink: 1, paddingVertical: 4 }}>{note}</Ink>
      ) : null}
    </View>
  );
}

export function CarteDuJour({ trainings, weeklyGoal, femme, next, onCoach }: {
  trainings: Training[];
  weeklyGoal: number;
  femme: boolean;
  /** le prochain créneau du planning (findNextSlot) */
  next: NextSlot | null;
  onCoach?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const unite = useUnitePoids();
  const menthe = useTeinte('menthe');
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [pret, setPret] = useState(false);
  const [ctx, setCtx] = useState<Contexte>({ materiel: null, machines: null, regions: [] });

  useEffect(() => {
    let vivant = true;
    const charger = async () => {
      try {
        const a = await chargerProgrammeActif();
        // ton programme construit (« Je construis le mien ») est lu avant d'être cherché, comme dans la séance
        if (a && estProgrammePerso(a.id)) await chargerProgrammesPerso().catch(() => []);
        const [materiel, machines, blessures] = await Promise.all([chargerMateriel().catch(() => null), chargerMachines().catch(() => null), getActiveInjuries().catch(() => [])]);
        if (!vivant) return;
        setCtx({ materiel, machines, regions: regionsDesBlessures((blessures ?? []) as { zone_id: string; status?: string }[]) });
        setActif(a);
      } catch {
        if (vivant) setActif(null);
      }
      if (vivant) setPret(true);
    };
    void charger();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, () => void charger());
    return () => {
      vivant = false;
      sub.remove();
    };
  }, []);

  const aujourdhui = localISO();
  const serie = useMemo(() => semainesDAffilee(trainings, aujourdhui, weeklyGoal), [trainings, aujourdhui, weeklyGoal]);
  const suite = actif ? prochainJour(actif) : null;

  // la séance du jour, comme la page du programme et la séance la préparent : ton matériel, tes douleurs, tes
  // exercices changés, ta fin de séance (lib/v2/programmes/perso.ts)
  const vue = useMemo(() => {
    if (!actif || !suite) return null;
    const p = suite.programme;
    const jour = jourPourToi(p.jours[suite.index], ctx.materiel, unirRegions(ctx.regions, actif.douleurs), ctx.machines, actif.remplacements, { fin: actif.fin, materiel: p.materiel });
    const semaine = semaineDuProgramme(actif);
    const jours = joursDuProgramme(actif, p);
    const message = messageCoach({ programme: p, actif, jours, prochaineSeance: traduire(jour.titre), femme, fixe: !!planEffectif(actif, p) });
    const hero = infosHero({ programme: p, actif, jour, jours, message, semaine });
    const muscu = jour.exos.length > 0 && !jour.rounds && !jour.cardio;
    const monte = muscu ? ligneProgression(jour.exos, trainings, { legeres: actif.legeres, legere: estSemaineLegere(actif) }) : null;
    return { p, jour, semaine, message, hero, muscu, monte, index: suite.index };
  }, [actif, suite, ctx, femme, trainings]);

  if (!pret) return <View style={{ height: 0 }} />;

  // 1. le programme en cours
  if (vue) {
    const { p, jour, semaine, message, hero, muscu, monte } = vue;
    const kicker =
      message.etat === 'rattrape' ? traduire('On rattrape aujourd’hui')
        : message.seanceDuJour ? traduire('Aujourd’hui')
          : message.etat === 'fait' ? traduire('Séance faite, la suivante')
            : traduire('Jour de repos, la suivante');
    const sem = semaine <= p.semaines ? traduire('semaine {0} sur {1}', semaine, p.semaines) : traduire('semaine {0}', semaine);
    const sous = `${nomDuProgramme(traduire(p.titre))}, ${sem}, ${traduire('jour {0}', vue.index + 1)}`;
    const nSeries = jour.exos.reduce((n, e) => n + e.series, 0);
    const commencer = () => {
      const r = routeDuJour(p, jour, semaine);
      router.push({ pathname: r.pathname as any, params: r.params });
    };
    const note = message.seanceDuJour ? hero.ensuite : message.ensuite;
    return (
      <Cadre>
        <EnTete kicker={kicker} titre={sansTiret(traduire(jour.titre))} sous={sansTiret(sous)} serie={serie} art={sportImage(sportDuProgramme(p), femme, 1)} />
        <View style={{ marginTop: 10, marginRight: 104, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {muscu ? (
            <>
              <Pastille texte={traduirePluriel(jour.exos.length, jour.exos.length > 1, '{0} exercice', '{0} exercices', jour.exos.length)} fond={c.surface} couleur={c.ink} />
              <Pastille texte={traduirePluriel(nSeries, nSeries > 1, '{0} série', '{0} séries', nSeries)} fond={c.surface} couleur={c.ink} />
              {hero.ajouts.map((a) => <Pastille key={a} texte={a} fond={theme.isDark ? menthe.fond : 'rgba(255,255,255,0.65)'} couleur={menthe.texte} />)}
            </>
          ) : (
            <Pastille texte={resumeDuJour(jour, semaine)} fond={c.surface} couleur={c.ink} />
          )}
        </View>
        {!message.seanceDuJour && message.texte ? <Ink size={13} weight="bold" color={c.textSecondary} style={{ marginTop: 10, marginRight: 104 }}>{message.texte}</Ink> : null}
        {muscu ? (
          <TroisExos
            exos={jour.exos.slice(0, 3)}
            pied={monte ? (
          <View style={{ alignSelf: 'center', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: menthe.fond, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M6 15l6-6 6 6" stroke={menthe.texte} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
            <Ink size={12.5} weight="extraBold" color={menthe.texte} style={{ flexShrink: 1 }}>
              {traduire('{0} : la charge monte à {1}', sansTiret(traduire(nomFr(monte.nom))), chargeTexte(monte.kg, unite, unite === 'kg' ? 2 : 1))}
            </Ink>
          </View>
                    ) : null}
          />
        ) : (
          <View style={{ marginTop: 14, borderRadius: 22, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)', padding: 12 }}>
            <Ink size={13} weight="bold" color={c.textSecondary}>{pourquoiDuJour(jour, semaine)}</Ink>
          </View>
        )}
        <Commencer label={traduire('Commencer la séance')} onPress={commencer} />
        <Pied lien={traduire('Voir le programme')} onLien={() => router.push({ pathname: '/programmes/[id]' as any, params: { id: p.id } })} note={sansTiret(note) || traduire('Ton coach a tout prévu')} />
      </Cadre>
    );
  }

  // 2. un créneau prévu aujourd'hui dans ton planning
  if (next && next.dayOffset === 0) {
    const s = next.slot;
    const titre = sansTiret(s.label || getSportName(s.sport));
    const sous = [s.time ? traduire('à {0}', s.time.slice(0, 5).replace(':', ' h ')) : '', s.duration_minutes ? formatDuration(s.duration_minutes) : '', s.club_name].filter(Boolean).join(', ');
    const sousPropre = sansTiret(sous);
    const lancer = () => {
      // même lancement que « Prévu aujourd'hui » dans le bouton + (app/ajouter.tsx)
      const params: Record<string, string> = { slotId: String(s.id), prefillSport: s.sport, date: localISO(), form: '1' };
      if (s.club_id) params.prefillClubId = String(s.club_id);
      if (s.time) params.prefillTime = s.time;
      if (s.duration_minutes) params.prefillDuration = String(s.duration_minutes);
      void routeDuCreneau(s.id).then((r) => {
        if (r) return router.push({ pathname: r.pathname as any, params: { ...params, ...r.params } });
        const d = saisieDirecte(s.sport, params);
        if (d) router.push({ pathname: d.pathname as any, params: d.params });
        else router.push({ pathname: '/seance' as any, params });
      });
    };
    return (
      <Cadre>
        <EnTete kicker={traduire('Aujourd’hui, dans ton planning')} titre={titre} sous={sousPropre} serie={serie} art={sportImage(s.sport, femme, 1)} />
        <View style={{ height: 96 }} />
        <Commencer label={traduire('Commencer la séance')} onPress={lancer} />
        <Pied lien={traduire('Ouvrir le planning')} onLien={() => router.push('/planning' as any)} lien2={traduire('Demander au Coach')} onLien2={() => (onCoach ? onCoach() : router.push('/coach' as any))} />
      </Cadre>
    );
  }

  // 3. pas de programme : le Coach
  return (
    <Cadre>
      <EnTete kicker={traduire('Ta séance du jour')} titre={traduire('Ton Coach te prépare tes séances')} sous={traduire('4 questions, et YOROI te dit quoi faire chaque jour. Programmes basés sur des études.')} serie={serie} art={sportImage('musculation', femme, 1)} />
      <View style={{ height: 34 }} />
      <Commencer label={traduire('Demander au Coach')} onPress={() => (onCoach ? onCoach() : router.push('/coach' as any))} />
      <Pied lien={traduire('Je choisis mes zones')} onLien={() => router.push('/programmes/zones' as any)} lien2={traduire('Tous les programmes')} onLien2={() => router.push('/programmes' as any)} />
    </Cadre>
  );
}
