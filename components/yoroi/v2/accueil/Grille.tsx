/**
 * Grille de l'accueil (16 octobre 2026). Houari : « mon accueil faut qu'il soit grave intuitif, facile à comprendre,
 * la couleur etc. [...] un truc beau, carré, facile à comprendre ».
 *
 * Sous la carte Ton poids, des tuiles regulieres en 2 colonnes (meme rayon 22, meme espace 12 que le reste de l'accueil, demi tuiles de meme
 * hauteur). Chaque tuile : une icone et un titre court dans la couleur de son domaine (domaines.ts), un grand chiffre,
 * une ligne d'explication, et « Ajouter » quand il n'y a rien. Un toucher ouvre directement l'ecran cible.
 *
 * Ordre : aujourd'hui (ta prochaine seance en grand avec les suivantes dessous, qui remplace « À venir » ; ta semaine
 * en anneau ; ta derniere seance), ta forme du jour (recuperation, sommeil, eau, mensurations), ta competition,
 * puis ton mois en calendrier complet (logo du club sur chaque jour de seance, jours prevus en pointilles).
 * 16 octobre soir : le conseil du jour passe en une seule ligne sous tes outils (LigneConseil), masquable pour la
 * journee ; la tuile competition dit d'ou vient la competition et propose d'en ajouter ou d'en retirer une.
 * 16 octobre nuit (Houari : « si y a rien, tu ne l'affiches pas », « je voulais un truc léger ») : la tuile competition
 * n'existe que s'il y a une competition a venir, et ne dit « Ajoutée par toi » que pour tes saisies ; le conseil
 * devient une ligne de texte en italique, sans carte ni fond (la bande etait vide sur iPhone : le bouton prenait
 * height 100 % d'un parent sans hauteur, son contenu tombait a 0 de haut). Blocs en plus, caches par defaut :
 * Pas et coeur au repos, Records et regularite, Ta prochaine pesee, Avant apres (lib/v2/accueil/enPlus.ts).
 * Memes sources qu'avant : useAccueil (seances, prochaine seance, forme, sommeil, eau, competition), le planning
 * (getWeeklyPlan, comme « À venir »), useMeasuresData (tour de taille), conseilDuJour. Aucun chiffre invente.
 * La grille se recompose sans trou quand un bloc est cache ou vide (lib/v2/accueil/grille.ts).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { DeviceEventEmitter, Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { deleteCompetition, getPhotos, getWeeklyPlan } from '@/lib/database';
import type { Photo, Training, WeeklyPlan } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import type { SleepEntry } from '@/lib/sleepService';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import { formatMinutes, levelFor } from '@/lib/v2/accueil/forme';
import { messageScoreIncomplet, scoreRecupFiable } from '@/lib/v2/recuperation';
import { formatLiters, localISO } from '@/lib/v2/accueil/hydration';
import { longDate, relativeDay } from '@/lib/v2/accueil/home';
import type { NextCompetition, NextSession } from '@/lib/v2/accueil/home';
import { conseilDuJour } from '@/lib/v2/accueil/conseil';
import { citationDuJour } from '@/lib/v2/accueil/citations';
import { useStyleCitation } from '@/lib/v2/accueil/styleCitation';
import { rangees } from '@/lib/v2/accueil/grille';
import type { TuileGrille } from '@/lib/v2/accueil/grille';
import { durationOf, formatDuration, trainingsThisWeek } from '@/lib/v2/trainingWeek';
import { activiteDuJour, avantApres, coeurAuRepos, dernierRecord, joursDeLaSemaine, pasDuJour, prochainePesee, santeDuJour, semainesRecentes, semainesTenues, septNuits } from '@/lib/v2/accueil/enPlus';
import { getHabitudePesee, heureDe } from '@/lib/v2/pesee/rappelHabitude';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { useMeasuresData } from '@/lib/v2/progres/useProgresData';
import { VIEW_FIELDS, viewSeries } from '@/lib/v2/progres/measures';
import type { ViewKey } from '@/lib/v2/progres/measures';
import { devNow } from '@/lib/v2/creator/devClock';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { DayMarks, SessionMark, groupByDay, monthCells } from '@/components/yoroi/v2/seances/MonthMarks';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { seancesAVenir } from './BlocMois';
import { FeuilleEau } from './EauFeuille';
import { Apparition, ArcJauge, Barres7, ChiffreAnime, Courbe, RangeeSemaines, Trophee, Verre } from './Visus';
import { CitationDuJour } from './Citation';
import { FeuilleConseil } from './FeuilleConseil';
import { Icon, P, Press } from './kit';
import { carteNeutre, teinte, domaineDuLien } from './domaines';
import type { Domaine } from './domaines';
import { traduire, traduirePluriel, DECIMAL, LOCALE } from '@/lib/i18n/tr';

type IconName = React.ComponentProps<typeof Icon>['name'];

export const ESPACE_GRILLE = 12;
export const RAYON_TUILE = 22;
/** hauteur commune des demi tuiles : deux tuiles voisines ont toujours la meme taille */
const HAUTEUR_DEMI = 138;

const JOURS_LETTRE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

// mensurations : toujours 1 decimale, comme Progres (vague 32)
const cm = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);

/* ============ La grille ============ */

/** Range les tuiles deux par deux (demi) ou seules (pleine), sans trou */
export function GrilleAccueil({ tuiles }: { tuiles: (TuileGrille<React.ReactNode> | null | false | undefined)[] }) {
  const lignes = rangees(tuiles);
  return (
    <View style={{ gap: ESPACE_GRILLE }}>
      {/* 17 octobre soir : les rangees entrent en cascade legere, une seule fois (montage) */}
      {lignes.map((r, i) => (
        <Apparition key={r.cle} i={i} cle={r.cle} style={{ flexDirection: 'row', gap: ESPACE_GRILLE, alignItems: 'stretch' }}>
          {r.tuiles.map((t) => (
            <View key={t.cle} style={{ flex: 1, minWidth: 0 }}>
              {t.contenu}
            </View>
          ))}
        </Apparition>
      ))}
    </View>
  );
}

/* ============ Briques communes ============ */

/** Le cadre d'une tuile : pastel du domaine (ou plein pour la tuile mise en avant), un toucher ouvre l'ecran */
function Cadre({ domaine, plein, demi, onPress, a11y, children, style }: { domaine: Domaine; plein?: boolean; demi?: boolean; onPress?: () => void; a11y: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = teinte(domaine);
  // sans onPress : un simple cadre (ses mesures se touchent une a une, jamais un bouton dans un bouton)
  if (!onPress) {
    return (
      <View accessibilityLabel={a11y} style={[{ flex: 1, borderRadius: RAYON_TUILE, padding: 14, gap: 4 }, plein ? { backgroundColor: t.plein } : carteNeutre(), demi ? { minHeight: HAUTEUR_DEMI } : null, style]}>
        {children}
      </View>
    );
  }
  return (
    <Press onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel={a11y} style={{ flex: 1 }}>
      <View
        style={[
          { flex: 1, borderRadius: RAYON_TUILE, padding: 14, gap: 4 },
          // 17 octobre soir : fond neutre partout, la couleur du domaine en accent seulement
          plein ? { backgroundColor: t.plein } : carteNeutre(),
          demi ? { minHeight: HAUTEUR_DEMI } : null,
          style,
        ]}
      >
        {children}
      </View>
    </Press>
  );
}

/** Icone et titre court, dans la couleur du domaine ; droite : un lien ou un petit visuel */
function Entete({ domaine, icone, titre, plein, droite }: { domaine: Domaine; icone: IconName; titre: string; plein?: boolean; droite?: React.ReactNode }) {
  const t = teinte(domaine);
  const c = plein ? t.surPlein : t.texte;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 22 }}>
      <Icon name={icone} size={16} color={c} width={2.5} />
      <Ink size={13} weight="extraBold" color={c} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flex: 1 }}>
        {titre}
      </Ink>
      {droite}
    </View>
  );
}

function GrandChiffre({ valeur, unite, couleur, taille = 28 }: { valeur: string; unite?: string; couleur?: string; taille?: number }) {
  return (
    <Ink size={taille} weight="black" tight color={couleur ?? P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>
      {valeur}
      {unite ? (
        <Ink size={14} weight="bold" color={P.ink2}>
          {unite}
        </Ink>
      ) : null}
    </Ink>
  );
}

function Explication({ children, couleur, lignes = 2 }: { children: React.ReactNode; couleur?: string; lignes?: number }) {
  return (
    <Ink size={12.5} weight="bold" color={couleur ?? P.ink2} numberOfLines={lignes}>
      {children}
    </Ink>
  );
}

/** Etat vide : un « Ajouter » franc dans la couleur du domaine, puis ce qu'on ajoute */
function Ajouter({ domaine, aide, libelle = traduire('Ajouter') }: { domaine: Domaine; aide: string; libelle?: string }) {
  const t = teinte(domaine);
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', gap: 6 }}>
      <Explication>{aide}</Explication>
      {/* 17 octobre soir : en contour, dans l'accent du domaine, plus de gros aplat */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 36, paddingLeft: 6, paddingRight: 14, borderRadius: 18, borderWidth: 1.5, borderColor: t.texte }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={16} color={t.texte} width={3} />
        </View>
        <Ink size={14} weight="extraBold" color={t.texte}>
          {libelle}
        </Ink>
      </View>
    </View>
  );
}

/** Pousse le grand chiffre et sa ligne en bas de la tuile : les tuiles voisines s'alignent */
function Bas({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>{children}</View>;
}

/* ============ Le planning de la semaine (prochaine seance, jours prevus) ============ */

function usePlanSemaine(): WeeklyPlan[] {
  const [plan, setPlan] = useState<WeeklyPlan[]>([]);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = () => {
        getWeeklyPlan()
          .then((p) => alive && setPlan(p ?? []))
          .catch(() => {});
      };
      load();
      const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
      return () => {
        alive = false;
        sub.remove();
      };
    }, []),
  );
  return plan;
}

const marqueCreneau = (s: WeeklyPlan) =>
  ({ sport: s.sport, club_id: s.club_id, club_name: s.club_name, club_logo: s.club_logo, club_color: s.club_color, date: '' }) as unknown as Training;

/* ============ Aujourd'hui : ta prochaine seance (et les suivantes, ex « À venir ») ============ */

/** plan : pour un apercu seulement (Studio) ; sinon ton planning, recharge a chaque retour sur l'accueil */
export function TuileProchaine({ next, trainings, plan: planFixe }: { next: NextSession | null; trainings: Training[]; plan?: WeeklyPlan[] }) {
  const router = useRouter();
  const planCharge = usePlanSemaine();
  const plan = planFixe ?? planCharge;
  const t = teinte('seances');
  const sombre = paletteSombre();
  const avenir = useMemo(() => seancesAVenir(plan, trainings, 3), [plan, trainings]);
  const ouvrir = () => router.push('/planning' as any);

  if (!next || !next.sportId) {
    return (
      <Cadre domaine="seances" onPress={ouvrir} a11y={traduire("Ta prochaine séance : rien de prévu. Ouvre ton planning pour ajouter tes créneaux")} style={{ minHeight: HAUTEUR_DEMI }}>
        <Entete domaine="seances" icone="calendar" titre={traduire("Ta prochaine séance")} />
        <Ink size={22} weight="black" tight numberOfLines={1}>
          {traduire("Rien de prévu")}</Ink>
        <Ajouter domaine="seances" aide={traduire("Ajoute tes créneaux de la semaine, ta prochaine séance s’affichera ici.")} libelle="Planifier" />
      </Cadre>
    );
  }

  const slot = plan.find((p) => p.id === next.slotId) ?? null;
  const ensuite = avenir.filter((s) => s.slot.id !== next.slotId).slice(0, 2);
  const quand = `${next.when}${next.time ? ` ${next.time}` : ''}`;
  const ou = next.club ?? (next.title !== next.sport ? next.sport : '');
  const doux = paletteDouce(sombre);
  const a11y = traduire("Ta prochaine séance : {0}, {1}{2}.{3} Ouvrir ton planning", quand, next.title, ou ? `, ${ou}` : '', ensuite.length ? ` Ensuite : ${ensuite.map((s) => `${s.quand}, ${s.titre}`).join(' ; ')}.` : '');

  return (
    <Cadre domaine="seances" plein onPress={ouvrir} a11y={a11y} style={{ padding: 16, gap: 6 }}>
      <Entete domaine="seances" icone="calendar" titre={traduire("Ta prochaine séance")} plein />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 0 }}>
          <Ink size={30} weight="black" tight color={t.surPlein} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {quand}
          </Ink>
          <Ink size={17} weight="extraBold" tight color={t.surPlein} numberOfLines={1}>
            {next.title}
          </Ink>
          {ou ? (
            <Ink size={13} weight="bold" color={doux} numberOfLines={1}>
              {ou}
            </Ink>
          ) : null}
        </View>
        {slot ? <SessionMark t={marqueCreneau(slot)} size={52} ring={t.surPlein} /> : null}
      </View>
      {ensuite.length ? (
        <View style={{ marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderColor: sombre ? 'rgba(26,30,41,0.18)' : 'rgba(255,255,255,0.22)', gap: 6 }}>
          <Ink size={12} weight="extraBold" color={doux}>
            Ensuite
          </Ink>
          {ensuite.map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SessionMark t={marqueCreneau(s.slot)} size={22} ring={t.surPlein} />
              <Ink size={13.5} weight="extraBold" color={t.surPlein} numberOfLines={1} style={{ flex: 1 }}>
                {`${s.quand}, ${s.titre}`}
              </Ink>
            </View>
          ))}
        </View>
      ) : null}
    </Cadre>
  );
}

/** Texte secondaire pose sur la tuile pleine (5,9:1 en clair, 5,4:1 en sombre) */
function paletteDouce(sombre: boolean): string {
  return sombre ? '#24324F' : '#C9D6F2';
}

/* ============ Ta semaine, en anneau ============ */

export function TuileSemaine({ trainings, goal }: { trainings: Training[]; goal: number }) {
  const router = useRouter();
  const t = teinte('seances');
  const jour = localISO();
  const n = trainingsThisWeek(trainings, jour).length;
  // 17 octobre soir : les 7 jours de la semaine, la pastille du sport fait sur chaque jour de seance
  const jours = useMemo(() => joursDeLaSemaine(trainings, jour), [trainings, jour]);
  const reached = goal > 0 && n >= goal;
  const ligne = goal <= 0 ? traduire('Choisis ton objectif') : n > goal ? traduire("objectif de {0} dépassé", goal) : reached ? traduire('objectif tenu') : n === 0 ? traduire('ta première t’attend') : traduire("encore {0} pour l’objectif", goal - n);
  return (
    <Cadre
      domaine="seances"
      demi
      onPress={() => router.push((goal <= 0 ? '/settings?objectif=1' : '/seances') as any)}
      a11y={goal <= 0 ? traduirePluriel(n, n > 1, "Ta semaine : {0} séance depuis lundi. Choisir un objectif", "Ta semaine : {0} séances depuis lundi. Choisir un objectif", n) : traduirePluriel(n, n > 1, "Ta semaine : {0} séance sur {1}, {2}. Voir tes séances", "Ta semaine : {0} séances sur {1}, {2}. Voir tes séances", n, goal, ligne)}
    >
      <Entete domaine="seances" icone="check" titre={traduire("Ta semaine")} />
      <Bas>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <ChiffreAnime valeur={n} format={(x) => String(Math.round(x))} cle="semaine" couleur={reached ? P.mossText : P.ink} unite={goal > 0 ? ` / ${goal}` : n > 1 ? traduire(' séances') : traduire(' séance')} />
          {n > goal && goal > 0 ? (
            <View style={{ paddingHorizontal: 6, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: P.mossText, justifyContent: 'center' }}>
              <Ink size={11.5} weight="black" color={P.mossText}>{`+${n - goal}`}</Ink>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }} accessible={false} importantForAccessibility="no-hide-descendants">
          {jours.map((j, i) => (
            <View key={j.iso} style={{ alignItems: 'center', gap: 3 }}>
              {j.seances.length ? (
                <SessionMark t={j.seances[0] as Training} size={16} />
              ) : (
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: j.aujourdhui ? t.texte : P.line, borderStyle: j.futur ? 'dashed' : 'solid' }} />
              )}
              <Ink size={9.5} weight={j.aujourdhui ? 'black' : 'bold'} color={j.aujourdhui ? t.texte : P.muted}>
                {JOURS_LETTRE[i]}
              </Ink>
            </View>
          ))}
        </View>
        <Explication couleur={reached ? P.mossText : goal <= 0 ? t.texte : P.ink2} lignes={1}>{ligne}</Explication>
      </Bas>
    </Cadre>
  );
}

/* ============ Ta derniere seance ============ */

/** null sans aucune seance : la tuile Ta semaine prend alors toute la largeur */
export function derniereSeance(trainings: Training[]): Training | null {
  return [...trainings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)))[0] ?? null;
}

export function TuileDerniere({ last }: { last: Training }) {
  const router = useRouter();
  const sport = getSportName(last.sport.split(',')[0].trim());
  const min = durationOf(last);
  const quand = relativeDay(last.date);
  return (
    <Cadre
      domaine="seances"
      demi
      onPress={() => router.push((last.id ? { pathname: '/workout-detail', params: { id: String(last.id) } } : '/seances') as any)}
      a11y={traduire("Ta dernière séance : {0}, {1}{2}. Voir le détail", sport, quand, min > 0 ? `, ${formatDuration(min)}` : '')}
    >
      <Entete domaine="seances" icone="clock" titre={traduire("Dernière séance")} />
      <Bas>
        {/* 17 octobre soir : le logo du club ou le pictogramme du sport en grand, comme une illustration */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SessionMark t={last} size={40} ring={P.line2} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {min > 0 ? <ChiffreAnime valeur={min} format={(x) => formatDuration(Math.round(x))} cle="derniere" taille={24} /> : <GrandChiffre valeur={sport} taille={18} />}
          </View>
        </View>
        <Explication lignes={2}>{min > 0 ? `${sport}, ${quand}` : quand}</Explication>
      </Bas>
    </Cadre>
  );
}

/* ============ Ta forme du jour ============ */

export function TuileRecup({ forme }: { forme: FormeResult | null }) {
  const router = useRouter();
  if (!(forme && forme.score !== null && forme.level)) {
    return (
      <Cadre domaine="forme" demi onPress={() => router.push('/sleep-input' as any)} a11y={traduire("Récupération : ajoute ta nuit pour la calculer")}>
        <Entete domaine="forme" icone="bolt" titre={traduire("Récupération")} />
        <Ajouter domaine="forme" aide={traduire("Note ta nuit pour la voir")} />
      </Cadre>
    );
  }
  // audit 18 octobre : meme regle que l'ecran detail, pas de score sur 100 avec un seul element mesure
  if (!scoreRecupFiable(forme.score, forme.factors.length)) {
    const manqueNuit = forme.missing.includes('sommeil');
    const message = messageScoreIncomplet(manqueNuit);
    return (
      <Cadre domaine="forme" demi onPress={() => router.push((manqueNuit ? '/sleep-input' : '/readiness-detail') as any)} a11y={traduire("Récupération : {0}. {1}", message, manqueNuit ? 'Note ta nuit' : 'Voir le détail')}>
        <Entete domaine="forme" icone="bolt" titre={traduire("Récupération")} />
        {manqueNuit ? (
          <Ajouter domaine="forme" aide={message} libelle={traduire("Ma nuit")} />
        ) : (
          <Bas>
            <Explication lignes={3}>{message}</Explication>
          </Bas>
        )}
      </Cadre>
    );
  }
  // la couleur du niveau est relue au rendu : elle suit le mode clair ou sombre en cours
  const couleur = levelFor(forme.score).color;
  return (
    <Cadre domaine="forme" demi onPress={() => router.push('/readiness-detail' as any)} a11y={traduire("Ta récupération : {0} sur 100, {1}. Voir le détail", forme.score, forme.level.label)}>
      <Entete domaine="forme" icone="bolt" titre={traduire("Récupération")} />
      {/* 17 octobre soir : une jauge en arc, le score qui compte au centre */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <ArcJauge part={forme.score / 100} couleur={couleur} piste={P.line} taille={70} epaisseur={7} cle="recup">
          <ChiffreAnime valeur={forme.score} format={(x) => String(Math.round(x))} cle="recup" taille={22} />
        </ArcJauge>
        <View style={{ flex: 1, minWidth: 0, paddingBottom: 6, gap: 1 }}>
          <Ink size={13.5} weight="black" color={P.ink} numberOfLines={2}>
            {forme.level.label}
          </Ink>
          <Ink size={11.5} weight="bold" color={P.ink2}>
            {traduire("sur 100")}</Ink>
        </View>
      </View>
    </Cadre>
  );
}

export function TuileSommeil({ sleep, sleepGoal }: { sleep: SleepEntry[]; sleepGoal: number }) {
  const router = useRouter();
  const t = teinte('poids');
  const night = sleep[0];
  const nuits = useMemo(() => septNuits(sleep, localISO()), [sleep]);
  if (!night) {
    return (
      <Cadre domaine="forme" demi onPress={() => router.push('/sleep-input' as any)} a11y={traduire("Sommeil : ajoute ta dernière nuit")}>
        <Entete domaine="forme" icone="moon" titre={traduire("Sommeil")} />
        <Ajouter domaine="forme" aide={traduire("Ta dernière nuit")} />
      </Cadre>
    );
  }
  const ok = night.duration >= sleepGoal;
  const notees = nuits.filter((x) => x !== null).length;
  return (
    <Cadre domaine="forme" demi onPress={() => router.push('/sleep' as any)} a11y={traduire("Ton sommeil, {0} : {1}. Voir le détail", relativeDay(night.date), formatMinutes(night.duration))}>
      <Entete domaine="forme" icone="moon" titre={traduire("Sommeil")} />
      <Bas>
        <ChiffreAnime valeur={night.duration} format={(x) => formatMinutes(Math.round(x))} cle="sommeil" taille={24} />
        {/* 17 octobre soir : tes 7 dernieres nuits et la ligne de ton objectif ; une seule nuit notee : la phrase seule */}
        {notees >= 2 ? <Barres7 valeurs={nuits} objectif={sleepGoal} couleur={t.plein} douce={t.bord} hauteur={30} cle="sommeil" /> : null}
        <Explication couleur={ok ? P.mossText : P.ink2} lignes={1}>
          {ok ? traduire('objectif atteint') : traduire("il manque {0}", formatMinutes(sleepGoal - night.duration))}
        </Explication>
      </Bas>
    </Cadre>
  );
}

export function TuileEau({ water, waterGoal }: { water: number; waterGoal: number }) {
  const [ouverte, setOuverte] = useState(false);
  const t = teinte('eau');
  const ok = waterGoal > 0 && water >= waterGoal;
  const g = waterGoal > 0 ? Math.max(0, Math.min(1, water / waterGoal)) : 0;
  return (
    <TourAnchor id="accueil.eau" style={{ flex: 1 }}>
      <Cadre domaine="eau" demi onPress={() => setOuverte(true)} a11y={traduire("Ton eau du jour : {0} litre sur {1}. Touche pour ajouter ou retirer de l’eau", formatLiters(water), formatLiters(waterGoal))}>
        <Entete domaine="eau" icone="drop" titre={traduire("Eau du jour")} />
        {/* 17 octobre soir : un verre qui se remplit jusqu'a ta part du jour */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <ChiffreAnime valeur={water} format={(x) => formatLiters(x)} cle="eau" taille={22} unite={` / ${formatLiters(waterGoal)} L`} />
            <Explication couleur={ok ? P.mossText : P.ink2} lignes={1}>
              {ok ? traduire('objectif atteint') : water > 0 ? traduire("encore {0} L", formatLiters(Math.max(0, waterGoal - water))) : traduire('ajoute un verre')}
            </Explication>
          </View>
          <Verre part={g} couleur={t.plein} largeur={28} hauteur={42} cle="eau" />
        </View>
      </Cadre>
      <FeuilleEau visible={ouverte} onClose={() => setOuverte(false)} water={water} waterGoal={waterGoal} />
    </TourAnchor>
  );
}

/** tailleFixe : pour un apercu seulement (Studio) ; sinon tes mensurations (meme source que Progres) */
export function TuileMensurations({ tailleFixe }: { tailleFixe?: { value: number }[] } = {}) {
  const router = useRouter();
  const t = teinte('mensurations');
  const { points } = useMeasuresData();
  const lues = useMemo(() => viewSeries(points, 'waist'), [points]);
  const taille = tailleFixe ?? lues;
  const last = taille[taille.length - 1];
  const valeurs = useMemo(() => taille.map((x) => x.value), [taille]);
  if (!last) {
    return (
      <Cadre domaine="mensurations" demi onPress={() => router.push('/add-measurement' as any)} a11y={traduire("Mensurations : ajoute ton tour de taille")}>
        <Entete domaine="mensurations" icone="body" titre="Mensurations" />
        <Ajouter domaine="mensurations" aide={traduire("Ton tour de taille")} />
      </Cadre>
    );
  }
  const d = taille.length > 1 ? taille[taille.length - 1].value - taille[0].value : null;
  return (
    <Cadre domaine="mensurations" demi onPress={() => router.push({ pathname: '/measurements-detail', params: { field: 'waist' } } as any)} a11y={traduire("Tour de taille : {0} centimètres. Voir tes mensurations", cm(last.value))}>
      <Entete domaine="mensurations" icone="body" titre="Tour de taille" />
      <Bas>
        <ChiffreAnime valeur={last.value} format={(x) => cm(x)} cle="taille" taille={24} unite=" cm" />
        {/* 17 octobre soir : ta tendance, seulement avec deux mesures au moins */}
        {valeurs.length >= 2 ? <Courbe valeurs={valeurs} couleur={t.plein} largeur={124} hauteur={28} cle="taille" /> : null}
        <Explication couleur={d !== null && d < -0.05 ? P.mossText : P.ink2} lignes={1}>
          {d === null ? traduire('ta première mesure') : Math.abs(d) < 0.05 ? 'stable' : traduire("{0}{1} cm au total", d < 0 ? '−' : '+', cm(Math.abs(d)))}
        </Explication>
      </Bas>
    </Cadre>
  );
}

/* ============ Tes mensurations : une carte qui defile, une mini carte par mesure (17 octobre nuit) ============ */

/** L'ordre le plus utile : le ventre d'abord, puis le haut et le bas du corps */
const ORDRE_MENSURATIONS: ViewKey[] = ['waist', 'navel', 'hips', 'chest', 'arm', 'thigh', 'shoulders', 'calf', 'neck'];
/** Libelles de la carte (Houari : « Tour de nombril ») */
const NOM_MENSURATION: Partial<Record<ViewKey, string>> = { navel: traduire('Tour de nombril') };

/**
 * Houari : « ajouter le tour de nombril, et pouvoir faire défiler dans ce rectangle pour voir les autres
 * mensurations ». Une mini carte par mensuration notee au moins une fois : la valeur en grand, la mini courbe (deux
 * mesures au moins) et l'ecart depuis la premiere ; deux mini cartes visibles, accrochage, points de pagination ;
 * une derniere carte « Ajouter une mesure ». Toucher une mini carte ouvre le detail de cette mesure.
 */
export function TuileMensurationsDefile() {
  const router = useRouter();
  const t = teinte('mensurations');
  const { points } = useMeasuresData();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const mesures = useMemo(
    () =>
      ORDRE_MENSURATIONS.map((k) => {
        const f = VIEW_FIELDS.find((x) => x.key === k);
        const serie = viewSeries(points, k);
        return f && serie.length ? { cle: k, nom: NOM_MENSURATION[k] ?? f.long, good: f.good, serie } : null;
      }).filter(Boolean) as { cle: ViewKey; nom: string; good: 'up' | 'down' | 'none'; serie: { date: string; value: number }[] }[],
    [points],
  );
  // deux mini cartes visibles dans la carte (l'ecran moins les marges de l'accueil, le padding de la carte et l'espace)
  const [interieur, setInterieur] = useState(Math.min(width, 560) - 44 - 30);
  const L = Math.floor((interieur - 10) / 2);
  const total = mesures.length + 1;
  const pages = Math.max(1, Math.ceil(total / 2));
  return (
    <Cadre domaine="mensurations" a11y={traduirePluriel(mesures.length, mesures.length > 1, "Tes mensurations, {0} mesure", "Tes mensurations, {0} mesures", mesures.length)} style={{ gap: 10 }}>
      <Pressable onPress={() => router.push('/measurements-detail' as any)} accessibilityRole="button" accessibilityLabel={traduire("Tes mensurations. Voir le détail")} hitSlop={6}>
        <Entete domaine="mensurations" icone="body" titre="Tes mensurations" droite={<Icon name="chevron" size={14} color={t.texte} width={2.6} />} />
      </Pressable>
      <ScrollView
        horizontal
        onLayout={(e) => setInterieur(e.nativeEvent.layout.width)}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={(L + 10) * 2}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ gap: 10 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / ((L + 10) * 2)))}
        onScrollEndDrag={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / ((L + 10) * 2)))}
      >
        {mesures.map((m) => {
          const last = m.serie[m.serie.length - 1];
          const d = m.serie.length > 1 ? last.value - m.serie[0].value : null;
          const bien = d !== null && Math.abs(d) >= 0.05 && ((m.good === 'down' && d < 0) || (m.good === 'up' && d > 0));
          return (
            <Pressable
              key={m.cle}
              onPress={() => router.push({ pathname: '/measurements-detail', params: { field: m.cle } } as any)}
              accessibilityRole="button"
              accessibilityLabel={traduire("{0} : {1} centimètres{2}. Voir le détail", m.nom, cm(last.value), d !== null ? `, ${d < 0 ? 'moins' : 'plus'} ${cm(Math.abs(d))} au total` : '')}
              style={({ pressed }) => ({ width: L, minHeight: 124, borderRadius: 16, borderWidth: 1, borderColor: P.line2, backgroundColor: pressed ? P.paper : P.white, padding: 10, gap: 3 })}
            >
              <Ink size={11.5} weight="extraBold" color={t.texte} numberOfLines={1}>
                {m.nom}
              </Ink>
              <ChiffreAnime valeur={last.value} format={(x) => cm(x)} cle={`mens:${m.cle}`} taille={22} unite=" cm" />
              {m.serie.length >= 2 ? <Courbe valeurs={m.serie.map((x) => x.value)} couleur={t.plein} largeur={L - 20} hauteur={26} cle={`mens:${m.cle}`} /> : <View style={{ height: 26 }} />}
              <Ink size={11} weight="bold" color={bien ? P.mossText : P.ink2} numberOfLines={1}>
                {d === null ? traduire('ta première mesure') : Math.abs(d) < 0.05 ? 'stable' : traduire("{0}{1} cm au total", d < 0 ? '−' : '+', cm(Math.abs(d)))}
              </Ink>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push('/add-measurement' as any)}
          accessibilityRole="button"
          accessibilityLabel={traduire("Ajouter une mesure")}
          style={({ pressed }) => ({ width: L, minHeight: 124, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.texte, backgroundColor: pressed ? P.paper : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 })}
        >
          <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: t.texte, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={18} color={t.texte} width={3} />
          </View>
          <Ink size={12.5} weight="extraBold" color={t.texte} style={{ textAlign: 'center' }}>
            {traduire("Ajouter une mesure")}</Ink>
        </Pressable>
      </ScrollView>
      {pages > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessible={false} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: pages }, (_, i) => (
            <View key={i} style={{ width: i === page ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? t.plein : P.line }} />
          ))}
        </View>
      ) : null}
    </Cadre>
  );
}

/* ============ Ta competition : d'ou elle vient, l'ajouter, la retirer ============ */

/** Meme cle que DEMO_ACTIVE_KEY de lib/demoDataService.ts (verifie par un test) */
export const CLE_DEMO_ACTIVE = '@yoroi_demo_data_active';

/** Le mode demo est-il actif : la competition n'est alors pas une saisie de l'utilisateur, aucun libelle de source */
function useDemoActive(): boolean | null {
  const [demo, setDemo] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem(CLE_DEMO_ACTIVE)
        .then((v) => alive && setDemo(v === 'true'))
        .catch(() => alive && setDemo(false));
      return () => {
        alive = false;
      };
    }, []),
  );
  return demo;
}

/** Petit bouton de la tuile competition : zone d'appui a part, jamais un appui dans un appui */
function PetitBouton({ libelle, icone, onPress, a11y, plein }: { libelle: string; icone: IconName; onPress: () => void; a11y: string; plein?: boolean }) {
  const t = teinte('competition');
  return (
    <Press onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}>
      <View style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18, borderWidth: plein ? 1.5 : 1, borderColor: plein ? t.texte : P.line }}>
        <Icon name={icone} size={14} color={plein ? t.texte : P.ink2} width={2.8} />
        <Ink size={13} weight="extraBold" color={plein ? t.texte : P.ink2} numberOfLines={1}>
          {libelle}
        </Ink>
      </View>
    </Press>
  );
}

/** Seulement quand une competition est a venir : sans competition, rien sur l'accueil (16 octobre nuit) */
export function TuileCompetition({ c }: { c: NextCompetition | null }) {
  const router = useRouter();
  const t = teinte('competition');
  const demo = useDemoActive();
  const ajouter = () => router.push('/add-competition' as any);

  if (!c) return null;

  const lieu = [c.place, c.category].filter(Boolean).join(', ');
  // libelle de source : seulement pour tes saisies (jamais en mode demo, jamais avant d'avoir lu le mode)
  const origine = demo === false ? traduire('Ajoutée par toi') : null;
  const retirer = () => {
    if (!c.id) {
      router.push('/competitions' as any);
      return;
    }
    appAlert(traduire('Retirer cette compétition ?'), traduire("{0}, le {1}. Elle disparaît de ton accueil et de tes compétitions.", c.name, longDate(c.date)), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => {
          deleteCompetition(c.id as number)
            .then(() => DeviceEventEmitter.emit(DATA_CHANGED_EVENT))
            .catch(() => appAlert(traduire('Impossible de retirer la compétition'), traduire('Réessaie depuis l’écran Compétitions.')));
        },
      },
    ]);
  };

  return (
    <View style={[{ borderRadius: RAYON_TUILE, overflow: 'hidden' }, carteNeutre()]}>
      <Press
        onPress={() => router.push((c.id ? { pathname: '/competition-detail', params: { id: String(c.id) } } : '/competitions') as any)}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={traduire("Ta compétition : {0}, le {1}, {2}.{3} Voir le détail", c.name, longDate(c.date), c.days === 0 ? 'c’est aujourd’hui' : `dans ${c.days} jour${c.days > 1 ? 's' : ''}`, origine ? ` ${origine}.` : '')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingBottom: 10 }}>
          <View style={{ width: 76, height: 76, borderRadius: 18, backgroundColor: t.plein, alignItems: 'center', justifyContent: 'center' }}>
            {c.days === 0 ? (
              <Ink size={17} weight="black" color={t.surPlein}>
                {traduire("Jour J")}</Ink>
            ) : (
              <>
                <Ink size={30} weight="black" tight color={t.surPlein} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {String(c.days)}
                </Ink>
                <Ink size={12} weight="extraBold" color={t.surPlein} style={{ marginTop: -4 }}>
                  {c.days > 1 ? 'jours' : 'jour'}
                </Ink>
              </>
            )}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="flag" size={15} color={t.texte} width={2.5} />
              <Ink size={13} weight="extraBold" color={t.texte} numberOfLines={1} style={{ flex: 1 }}>
                {traduire("Compétition, le {0}", longDate(c.date))}
              </Ink>
            </View>
            <Ink size={17} weight="black" tight numberOfLines={2}>
              {c.name}
            </Ink>
            {lieu ? <Explication lignes={2}>{lieu}</Explication> : null}
          </View>
        </View>
      </Press>
      {origine ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 2 }}>
          <Icon name="user" size={13} color={P.ink2} width={2.4} />
          <Ink size={12} weight="bold" color={P.ink2} numberOfLines={2} style={{ flex: 1 }}>
            {origine}
          </Ink>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 8 }}>
        <PetitBouton libelle="Retirer" icone="close" onPress={retirer} a11y={`Retirer ${c.name}`} />
        <PetitBouton libelle={traduire("Ajouter")} icone="plus" plein onPress={ajouter} a11y={traduire("Ajouter une autre compétition")} />
      </View>
    </View>
  );
}

/* ============ Le conseil du jour : la citation sous tes outils, masquable pour la journee ============ */

const CLE_CONSEIL_MASQUE = 'yoroi.accueil.conseil.masque';
/** hauteur de la ligne de la citation : une ligne de texte, sans carte ni fond ni bordure (Citation.tsx) */
export const HAUTEUR_LIGNE_CONSEIL = 20;
/**
 * 17 octobre (Houari : « mets-la vraiment entre les outils et Ton poids, là ça colle à Ton poids ») : la ligne monte
 * de 12 points sans que rien d'autre ne bouge. Les deux marges gardent la meme somme qu'avant (- 6 - 10 = - 18 + 2) :
 * Ton poids reste a sa place, au pixel. Mesure au pixel a 390 et 375 points (planche6) : le dessin de la citation est
 * centre entre le bas des libelles des outils et le haut de la carte Ton poids.
 */
const MARGE_HAUT_CONSEIL = -18;
const MARGE_BAS_CONSEIL = 2;

export function LigneConseil({ trainings, lastWeighIso, goal, freins, semaineVisible }: { trainings: Training[]; lastWeighIso: string | null; goal: number; freins?: string[]; semaineVisible: boolean }) {
  const router = useRouter();
  const jourIso = localISO();
  const [masqueLe, setMasqueLe] = useState<string | null | undefined>(undefined);
  const [ouvert, setOuvert] = useState(false);
  const { style } = useStyleCitation();
  const freinsCle = (freins ?? []).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const c = useMemo(() => conseilDuJour({ trainings, lastWeighIso, goal, now: devNow(), freins, semaineVisible }), [trainings, lastWeighIso, goal, jourIso, freinsCle, semaineVisible]);
  // 16 octobre : la ligne montre une citation courte du jour (lib/v2/accueil/citations.ts), qui tient en une ligne ;
  // le toucher ouvre toujours le conseil du jour complet
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const citation = useMemo(() => citationDuJour(devNow()), [jourIso]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AsyncStorage.getItem(CLE_CONSEIL_MASQUE)
        .then((v) => alive && setMasqueLe(v ?? null))
        .catch(() => alive && setMasqueLe(null));
      return () => {
        alive = false;
      };
    }, []),
  );

  // tant que la memoire n'a pas repondu, rien (pas d'apparition puis disparition) ; masque aujourd'hui : rien
  if (masqueLe === undefined || masqueLe === jourIso) return null;

  const masquer = () => {
    setOuvert(false);
    setMasqueLe(jourIso);
    AsyncStorage.setItem(CLE_CONSEIL_MASQUE, jourIso).catch(() => {});
  };

  return (
    <>
      {/* un simple texte touchable : pas de bouton en height 100 % (la cause de la bande vide sur iPhone) */}
      <Pressable
        onPress={() => setOuvert(true)}
        accessibilityRole="button"
        accessibilityLabel={traduire("{0} Touche pour lire le conseil du jour : {1}", citation, c.title)}
        hitSlop={{ top: 4, bottom: 8 }}
        style={{ height: HAUTEUR_LIGNE_CONSEIL, marginTop: MARGE_HAUT_CONSEIL, marginBottom: MARGE_BAS_CONSEIL, justifyContent: 'center', paddingHorizontal: 2 }}
      >
        <CitationDuJour texte={citation} style={style} />
      </Pressable>

      <Modal visible={ouvert} transparent animationType="none" statusBarTranslucent onRequestClose={() => setOuvert(false)}>
        <FeuilleConseil
          conseil={c}
          citation={citation}
          style={style}
          onFermer={() => setOuvert(false)}
          onMasquer={masquer}
          onAller={(href) => {
            setOuvert(false);
            router.push(href as any);
          }}
        />
      </Modal>
    </>
  );
}

/* ============ Ton mois : le calendrier complet, le logo du club sur chaque jour de seance ============ */

export function TuileMois({ trainings, plannedDays, competitionDate }: { trainings: Training[]; plannedDays: number[]; competitionDate: string | null }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const t = teinte('seances');
  const tc = teinte('competition');
  const now = devNow();
  const today = localISO();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const cases = useMemo(() => monthCells(y, mo), [y, mo]);
  const parJour = useMemo(() => groupByDay(trainings), [trainings]);
  // largeur d'une colonne : ecran moins les marges (22 x 2) et l'interieur de la tuile (14 x 2 et les bords)
  const col = Math.max(34, (Math.min(width, 520) - 44 - 30) / 7);
  const logo = Math.round(Math.min(32, col - 11));
  const duMois = trainings.filter((x) => {
    const d = new Date((x.date ?? '').slice(0, 10) + 'T12:00:00');
    return d.getFullYear() === y && d.getMonth() === mo;
  });
  const minutes = duMois.reduce((s, x) => s + durationOf(x), 0);
  const nJours = new Set(duMois.map((x) => x.date.slice(0, 10))).size;
  const mois = `${MOIS[mo].charAt(0).toUpperCase()}${MOIS[mo].slice(1)}`;
  const resume = duMois.length
    ? [`${duMois.length} séance${duMois.length > 1 ? 's' : ''}`, nJours !== duMois.length ? `${nJours} jours` : '', minutes ? formatDuration(minutes) : ''].filter(Boolean).join(', ')
    : traduire('pas encore de séance');
  const estPrevu = (iso: string) => iso >= today && !(parJour.get(iso) ?? []).length && plannedDays.includes((new Date(iso + 'T12:00:00').getDay() + 6) % 7);
  const unPrevu = cases.some((iso) => !!iso && estPrevu(iso));
  const compet = !!competitionDate && cases.includes(competitionDate);

  return (
    <TourAnchor id="accueil.mois">
      <Cadre domaine="seances" onPress={() => router.push('/planning?tab=mois' as any)} a11y={traduire("Ton mois, {0} : {1}. Ouvrir le calendrier", mois, resume)} style={{ gap: 8, paddingHorizontal: 14 }}>
        <Entete
          domaine="seances"
          icone="calendar"
          titre={traduire("Ton mois")}
          droite={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ink size={13} weight="extraBold" color={t.texte}>
                Calendrier
              </Ink>
              <Icon name="chevron" size={14} color={t.texte} width={2.8} />
            </View>
          }
        />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Ink size={17} weight="black" tight numberOfLines={1}>
            {mois}
          </Ink>
          <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1} style={{ flex: 1 }}>
            {resume}
          </Ink>
        </View>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <View style={{ flexDirection: 'row' }}>
            {JOURS_LETTRE.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 2 }}>
                <Ink size={11} weight="bold" color={P.muted}>
                  {d}
                </Ink>
              </View>
            ))}
          </View>
          {Array.from({ length: cases.length / 7 }, (_, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {cases.slice(r * 7, r * 7 + 7).map((iso, k) => {
                if (!iso) return <View key={k} style={{ flex: 1 }} />;
                const liste = parJour.get(iso) ?? [];
                const aujourdhui = iso === today;
                const prevu = estPrevu(iso);
                const jourCompet = iso === competitionDate;
                const futur = iso > today;
                return (
                  <View key={k} style={{ flex: 1, alignItems: 'center', paddingVertical: 3, gap: 2 }}>
                    <View style={{ minWidth: 22, height: 18, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: aujourdhui ? t.plein : 'transparent' }}>
                      <Ink size={11.5} weight={aujourdhui || liste.length ? 'black' : 'bold'} color={aujourdhui ? t.surPlein : futur ? P.muted : liste.length ? P.ink : P.ink2}>
                        {String(Number(iso.slice(8, 10)))}
                      </Ink>
                    </View>
                    <View style={{ width: logo + 4, height: logo + 4, alignItems: 'center', justifyContent: 'center' }}>
                      {liste.length ? (
                        <DayMarks list={liste} size={liste.length > 1 ? Math.round(logo * 0.82) : logo} ring={P.white} />
                      ) : prevu || jourCompet || aujourdhui ? (
                        <View
                          style={{
                            width: logo,
                            height: logo,
                            borderRadius: logo / 2,
                            borderWidth: jourCompet ? 2 : 1.5,
                            borderStyle: prevu && !jourCompet ? 'dashed' : 'solid',
                            borderColor: jourCompet ? tc.plein : t.texte,
                            backgroundColor: jourCompet ? tc.fond : 'transparent',
                          }}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        {unPrevu || compet ? <Legende prevu={unPrevu} compet={compet} /> : null}
      </Cadre>
    </TourAnchor>
  );
}

/** Une ligne pour lire le calendrier : seulement ce qui y est dessine */
function Legende({ prevu, compet }: { prevu: boolean; compet: boolean }) {
  const t = teinte('seances');
  const tc = teinte('competition');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 }}>
      {prevu ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.texte }} />
          <Ink size={12} weight="bold" color={P.ink2}>
            {traduire("prévu dans ton planning")}</Ink>
        </View>
      ) : null}
      {compet ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: tc.plein, backgroundColor: tc.fond }} />
          <Ink size={12} weight="bold" color={P.ink2}>
            {traduire("ta compétition")}</Ink>
        </View>
      ) : null}
    </View>
  );
}

/* ============ Blocs en plus (17 octobre : affiches par defaut, etat vide utile sans donnee, jamais de chiffre invente) ============ */

const nb = (n: number) => Math.round(n).toLocaleString(LOCALE).replace(/ | /g, ' ');

/**
 * Activite du jour (16 octobre, affichee par defaut) : tes pas en grand, tes calories actives et tes minutes
 * d'exercice en petit dessous. Seulement ce que Sante a note aujourd'hui (activiteDuJour, enPlus.ts).
 */
export function TuileActivite({ a }: { a: NonNullable<ReturnType<typeof activiteDuJour>> }) {
  const router = useRouter();
  const t = teinte('forme');
  // le grand chiffre : tes pas ; sans pas notes aujourd'hui, la premiere valeur qui existe
  const valeurs = [
    a.pas !== null ? { grand: nb(a.pas), unite: ' pas', petit: `${nb(a.pas)} pas` } : null,
    a.kcal !== null ? { grand: nb(a.kcal), unite: ' kcal', petit: `${nb(a.kcal)} kcal actives` } : null,
    a.minutes !== null ? { grand: nb(a.minutes), unite: ' min', petit: `${nb(a.minutes)} min d’exercice` } : null,
  ].filter(Boolean) as { grand: string; unite: string; petit: string }[];
  const [tete, ...petits] = valeurs;
  return (
    <Cadre domaine="forme" demi onPress={() => router.push((a.pas !== null ? '/sante/pas' : '/sante') as any)} a11y={traduire("Ton activité du jour : {0}. Voir le détail", valeurs.map((v) => v.petit).join(', '))}>
      <Entete domaine="forme" icone="sun" titre={traduire("Activité")} />
      <Bas>
        <GrandChiffre valeur={tete.grand} unite={tete.unite} />
        {petits.map((x) => (
          <View key={x.unite} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.texte }} />
            <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
              {x.petit}
            </Ink>
          </View>
        ))}
      </Bas>
    </Cadre>
  );
}

/** Tes pas du jour et tes calories actives (Sante) ; null sans pas notes aujourd'hui */
export function TuilePas({ pas }: { pas: { pas: number; kcal: number | null } }) {
  const router = useRouter();
  return (
    <Cadre domaine="forme" demi onPress={() => router.push('/sante/pas' as any)} a11y={traduire("Tes pas du jour : {0}{1}. Voir le détail", nb(pas.pas), pas.kcal !== null ? `, ${nb(pas.kcal)} kilocalories actives` : '')}>
      <Entete domaine="forme" icone="sun" titre={traduire("Pas du jour")} />
      <Bas>
        <GrandChiffre valeur={nb(pas.pas)} />
        <Explication>{pas.kcal !== null ? `${nb(pas.kcal)} kcal actives` : traduire('aujourd’hui')}</Explication>
      </Bas>
    </Cadre>
  );
}

/** Ta frequence cardiaque au repos la plus recente (Sante) */
export function TuileCoeur({ coeur }: { coeur: { bpm: number; date: string; moyenne: number | null } }) {
  const router = useRouter();
  const quand = relativeDay(coeur.date);
  return (
    <Cadre domaine="forme" demi onPress={() => router.push('/sante/fc-repos' as any)} a11y={traduire("Ton cœur au repos : {0} battements par minute, {1}{2}. Voir le détail", coeur.bpm, quand, coeur.moyenne !== null ? `, moyenne sur 30 jours ${coeur.moyenne}` : '')}>
      <Entete domaine="forme" icone="heart" titre={traduire("Cœur au repos")} />
      <Bas>
        <GrandChiffre valeur={String(coeur.bpm)} unite=" bpm" />
        <Explication>{coeur.moyenne !== null ? traduire("moyenne 30 jours : {0}", coeur.moyenne) : quand}</Explication>
      </Bas>
    </Cadre>
  );
}

/** Ton dernier record battu en seance (30 jours au plus) : le trophee dore et l'ecart avec le record d'avant */
export function TuileRecord({ record }: { record: { titre: string; valeur: string; date: string; ecart?: string | null } }) {
  const router = useRouter();
  const quand = relativeDay(record.date);
  return (
    <Cadre domaine="seances" demi onPress={() => router.push('/records' as any)} a11y={traduire("Ton dernier record : {0}, {1}{2}, {3}. Voir tes records", record.titre, record.valeur, record.ecart ? `, ${record.ecart} sur le précédent` : '', quand)}>
      <Entete domaine="seances" icone="star" titre="Dernier record" />
      <Bas>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Trophee taille={30} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <GrandChiffre valeur={record.valeur} taille={22} />
          </View>
        </View>
        {record.ecart ? (
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: P.mossText, justifyContent: 'center' }}>
            <Ink size={11.5} weight="black" color={P.mossText}>{record.ecart}</Ink>
          </View>
        ) : null}
        <Explication lignes={2}>{`${record.titre}, ${quand}`}</Explication>
      </Bas>
    </Cadre>
  );
}

/** Tes semaines d'affilee a l'objectif, et la rangee de tes dernieres semaines (tenue, ratee, en cours) */
export function TuileSerie({ semaines, goal, recentes }: { semaines: number; goal: number; recentes?: { tenue: boolean; enCours: boolean }[] }) {
  const router = useRouter();
  const t = teinte('seances');
  return (
    <Cadre domaine="seances" demi onPress={() => router.push('/records' as any)} a11y={traduirePluriel(semaines, semaines > 1, "{0} semaine d’affilée à ton objectif de {1} séances. Voir ta régularité", "{0} semaines d’affilée à ton objectif de {1} séances. Voir ta régularité", semaines, goal)}>
      <Entete domaine="seances" icone="trophy" titre={traduire("Régularité")} />
      <Bas>
        <ChiffreAnime valeur={semaines} format={(x) => String(Math.round(x))} cle="serie" unite={semaines > 1 ? ' semaines' : ' semaine'} taille={24} />
        {recentes && recentes.length ? <RangeeSemaines semaines={recentes} couleur={P.moss} /> : null}
        <Explication couleur={t.texte} lignes={1}>{traduirePluriel(goal, goal > 1, "d’affilée à {0} séance", "d’affilée à {0} séances", goal)}</Explication>
      </Bas>
    </Cadre>
  );
}

/** Tes jours de pesee (onboarding ou Notifications), relus a chaque retour sur l'accueil */
export function usePeseePrevue(derniereIso: string | null): ReturnType<typeof prochainePesee> | undefined {
  const [hab, setHab] = useState<{ jours?: number[]; heure: [number, number] | null } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getHabitudePesee()
        .then((h) => alive && setHab({ jours: h.jours, heure: heureDe(h) }))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );
  const jour = localISO();
  // undefined tant que la memoire n'a pas repondu (pas d'etat vide qui clignote), null sans jours choisis
  return useMemo(() => (hab ? prochainePesee(hab.jours, hab.heure, (derniereIso ?? '').slice(0, 10) === jour, devNow()) : undefined), [hab, derniereIso, jour]);
}

export function TuilePesee({ prevue }: { prevue: NonNullable<ReturnType<typeof prochainePesee>> }) {
  const router = useRouter();
  const t = teinte('poids');
  const quand = `${prevue.quand}${prevue.heure ? `, ${prevue.heure}` : ''}`;
  return (
    <Cadre domaine="poids" onPress={() => router.push('/notifications' as any)} a11y={traduire("Ta prochaine pesée : {0}. Régler tes jours de pesée", quand)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: t.texte, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="scale" size={20} color={t.texte} width={2.4} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ink size={13} weight="extraBold" color={t.texte} numberOfLines={1}>
          {traduire("Ta prochaine pesée")}</Ink>
        <Ink size={18} weight="black" tight numberOfLines={1}>
          {quand}
        </Ink>
      </View>
    </Cadre>
  );
}

/** Tes photos, relues a chaque retour sur l'accueil (seulement si le bloc est coche) */
export function usePhotosAccueil(actif: boolean): { paire: { avant: Photo; apres: Photo } | null; nb: number; charge: boolean } {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!actif) return undefined;
      let alive = true;
      getPhotos()
        .then((p) => alive && setPhotos(p ?? []))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [actif]),
  );
  return useMemo(() => ({ paire: actif && photos ? avantApres(photos) : null, nb: photos?.length ?? 0, charge: photos !== null }), [actif, photos]);
}

const kg = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);

export function TuileAvantApres({ paire }: { paire: { avant: Photo; apres: Photo } }) {
  const router = useRouter();
  const vignette = (ph: Photo, libelle: string) => (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ aspectRatio: 4 / 5, borderRadius: 14, overflow: 'hidden', backgroundColor: P.line2 }}>
        <Image source={{ uri: ph.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" blurRadius={ph.is_blurred ? 18 : 0} accessibilityIgnoresInvertColors />
      </View>
      <View>
        <Ink size={12.5} weight="black" numberOfLines={1}>
          {libelle}
        </Ink>
        <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1}>
          {`${longDate(ph.date)}${ph.weight ? `, ${kg(ph.weight)} kg` : ''}`}
        </Ink>
      </View>
    </View>
  );
  return (
    <Cadre domaine="poids" onPress={() => router.push('/transformation' as any)} a11y={traduire("Avant, après : ta première photo du {0} et ta dernière du {1}. Ouvrir le comparateur", longDate(paire.avant.date), longDate(paire.apres.date))} style={{ gap: 8 }}>
      <Entete domaine="poids" icone="body" titre={traduire("Avant, après")} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {vignette(paire.avant, traduire('Avant'))}
        {vignette(paire.apres, traduire('Après'))}
      </View>
    </Cadre>
  );
}

/* ============ Etats vides des blocs affiches par defaut (17 octobre) ============ */

/**
 * Activite sans donnee du jour. Sante non reliee : « Connecte Santé pour voir tes pas » et un bouton Connecter
 * (l'ecran Sante explique et ouvre la fenetre du systeme). Reliee mais rien aujourd'hui : on le dit simplement.
 */
export function TuileActiviteVide({ relie }: { relie: boolean }) {
  const router = useRouter();
  return (
    <Cadre domaine="forme" demi onPress={() => router.push('/sante' as any)} a11y={relie ? traduire('Activité : Santé n’a pas encore noté de pas aujourd’hui. Ouvrir Santé') : traduire('Activité : connecte Santé pour voir tes pas. Connecter')}>
      <Entete domaine="forme" icone="sun" titre={traduire("Activité")} />
      {relie ? (
        <Bas>
          <Ink size={17} weight="black" tight numberOfLines={2}>
            {traduire("Pas encore de pas aujourd’hui")}</Ink>
          <Explication>{traduire("Ta montre ou ton téléphone les ajoutera ici")}</Explication>
        </Bas>
      ) : (
        <Ajouter domaine="forme" aide={traduire("Connecte Santé pour voir tes pas")} libelle="Connecter" />
      )}
    </Cadre>
  );
}

export function TuileCoeurVide({ relie }: { relie: boolean }) {
  const router = useRouter();
  return (
    <Cadre domaine="forme" demi onPress={() => router.push('/sante' as any)} a11y={relie ? traduire('Cœur au repos : pas de mesure ces 7 derniers jours. Ouvrir Santé') : traduire('Cœur au repos : connecte Santé pour le voir. Connecter')}>
      <Entete domaine="forme" icone="heart" titre={traduire("Cœur au repos")} />
      {relie ? (
        <Bas>
          <Ink size={17} weight="black" tight numberOfLines={2}>
            {traduire("Pas de mesure cette semaine")}</Ink>
          <Explication>{traduire("Porte ta montre la nuit pour le mesurer")}</Explication>
        </Bas>
      ) : (
        <Ajouter domaine="forme" aide={traduire("Connecte Santé pour le voir")} libelle="Connecter" />
      )}
    </Cadre>
  );
}

export function TuileRecordVide() {
  const router = useRouter();
  return (
    <Cadre domaine="seances" demi onPress={() => router.push('/records' as any)} a11y={traduire("Dernier record : aucun ces 30 derniers jours. Voir tes records")}>
      <Entete domaine="seances" icone="star" titre="Dernier record" />
      <Bas>
        <Ink size={17} weight="black" tight numberOfLines={2}>
          {traduire("Pas de record ce mois-ci")}</Ink>
        <Explication>{traduire("Ton prochain record s’affichera ici")}</Explication>
      </Bas>
    </Cadre>
  );
}

export function TuileSerieVide({ goal }: { goal: number }) {
  const router = useRouter();
  const t = teinte('seances');
  const aide = goal > 0 ? traduirePluriel(goal, goal > 1, "Tiens {0} séance cette semaine pour lancer ta série", "Tiens {0} séances cette semaine pour lancer ta série", goal) : traduire('Choisis ton objectif de la semaine pour lancer ta série');
  return (
    <Cadre domaine="seances" demi onPress={() => router.push('/records' as any)} a11y={traduire("Régularité : {0}", aide)}>
      <Entete domaine="seances" icone="trophy" titre={traduire("Régularité")} />
      <Bas>
        <Ink size={17} weight="black" tight numberOfLines={2}>
          {traduire("Pas encore de série")}</Ink>
        <Explication couleur={t.texte} lignes={3}>{aide}</Explication>
      </Bas>
    </Cadre>
  );
}

export function TuilePeseeVide() {
  const router = useRouter();
  const t = teinte('poids');
  return (
    <Cadre domaine="poids" onPress={() => router.push('/notifications' as any)} a11y={traduire("Ta prochaine pesée : choisis tes jours de pesée")} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: t.texte, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="scale" size={20} color={t.texte} width={2.4} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ink size={13} weight="extraBold" color={t.texte} numberOfLines={1}>
          {traduire("Ta prochaine pesée")}</Ink>
        <Ink size={16} weight="black" tight numberOfLines={2}>
          {traduire("Choisis tes jours de pesée")}</Ink>
      </View>
      <Icon name="chevron" size={15} color={t.texte} width={2.6} />
    </Cadre>
  );
}

/** Avant, apres avec moins de deux photos : on invite a la premiere (ou a la deuxieme) */
export function TuileAvantApresVide({ nb: n }: { nb: number }) {
  const router = useRouter();
  const aide = n === 0 ? traduire('Ajoute ta première photo') : traduire('Ajoute une autre photo, un autre jour, pour comparer');
  return (
    <Cadre domaine="poids" onPress={() => router.push('/photos' as any)} a11y={traduire("Avant, après : {0}", aide)} style={{ gap: 8 }}>
      <Entete domaine="poids" icone="body" titre={traduire("Avant, après")} />
      <Ajouter domaine="poids" aide={aide} libelle={n === 0 ? traduire('Ajouter une photo') : traduire('Ajouter')} />
    </Cadre>
  );
}

/* ============ Ta sante aujourd'hui (17 octobre) : la tuile vit dans SanteJour.tsx (trois traitements) ============ */

export { TuileSanteJour, TuileSanteJourVide } from './SanteJour';

export { activiteDuJour, coeurAuRepos, dernierRecord, pasDuJour, santeDuJour, semainesRecentes, semainesTenues };
