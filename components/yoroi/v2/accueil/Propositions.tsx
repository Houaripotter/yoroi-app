/**
 * Briques des propositions B et C de l'accueil (lib/v2/accueil/proposition.ts), 17 octobre 2026 nuit.
 *   TitreSection    : B, un chapitre titre en grand, beaucoup d'air
 *   TableauDuJour   : C, un seul grand tableau « Aujourd'hui » : anneaux (pas, calories, exercice), recuperation en
 *                     arc, sommeil, eau, puis tes autres mesures de Sante en une ligne
 *   Carrousel       : C, tes tuiles d'entrainement et de corps en defilement horizontal
 * Memes donnees que la grille A, rien d'invente : une mesure absente n'apparait pas.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { paletteSombre, paperA } from '@/components/yoroi/livePalette';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import { formatMinutes } from '@/lib/v2/accueil/forme';
import { messageScoreIncomplet, phraseRecup, scoreRecupFiable } from '@/lib/v2/recuperation';
import { GLASS_L, formatLiters, localISO, saveHydrationAmount } from '@/lib/v2/accueil/hydration';
import { objectifMesure, septNuits, texteMesureSante } from '@/lib/v2/accueil/enPlus';
import type { MesureSanteJour, ObjectifsSante } from '@/lib/v2/accueil/enPlus';
import type { SleepEntry } from '@/lib/sleepService';
import { carteNeutre, teinte } from './domaines';
import { Icon, P, tap } from './kit';
import { AnneauxConcentriques, Barres7, Bouteille, ChiffreAnime, FLECHE_ACTIVITE, JaugeRecup, ORDRE_ACTIVITE, couleurActivite, useCompteur } from './Visus';
import { MESURE_SANTE } from './SanteJour';
import { useStyleContour, useStyleValeurs } from '@/lib/v2/accueil/proposition';
import type { Training } from '@/lib/database';
import type { HydrationDay } from '@/lib/v2/accueil/hydration';
import { aUneDonnee, eauDuJour, jourA11y, mesuresDuJour, nuitDuJour, retenirSeriesAccueil, semaineAnneaux, titreJour } from '@/lib/v2/sante/anneauxJours';
import type { SeriesJour } from '@/lib/v2/sante/anneauxJours';
import { RangeeSemaine } from './AnneauxSemaine';
import type { StyleValeurs } from '@/lib/v2/accueil/proposition';
import { traduire, LOCALE } from '@/lib/i18n/tr';

export function TitreSection({ titre, sous }: { titre: string; sous?: string }) {
  return (
    <View style={{ paddingTop: 14, paddingHorizontal: 2, gap: 1 }}>
      <Ink size={21} weight="black" tight accessibilityRole="header">
        {titre}
      </Ink>
      {sous ? (
        <Ink size={12.5} weight="bold" color={P.ink2}>
          {sous}
        </Ink>
      ) : null}
    </View>
  );
}


function Ligne({ icone, couleur, titre, valeur, sous, onPress, a11y, visuel }: { icone: React.ComponentProps<typeof Icon>['name']; couleur: string; titre: string; valeur: React.ReactNode; sous?: string; onPress: () => void; a11y: string; visuel?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
      {visuel ?? (
        <View style={{ width: 34, alignItems: 'center' }}>
          <Icon name={icone} size={18} color={couleur} width={2.4} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ink size={11.5} weight="extraBold" color={P.ink2} numberOfLines={1}>
          {titre}
        </Ink>
        {valeur}
      </View>
      {sous ? (
        <Ink size={11.5} weight="bold" color={couleur} numberOfLines={1} style={{ maxWidth: 92, textAlign: 'right' }}>
          {sous}
        </Ink>
      ) : null}
    </Pressable>
  );
}

export function TableauDuJour({
  mesures,
  objectifs,
  forme,
  sleep,
  sleepGoal,
  water,
  waterGoal,
  onEau,
  series,
  trainings,
  eauHistorique,
}: {
  mesures: MesureSanteJour[];
  objectifs: ObjectifsSante | null;
  forme: FormeResult | null;
  sleep: SleepEntry[];
  sleepGoal: number;
  water: number;
  waterGoal: number;
  onEau: () => void;
  /** 19 octobre : les series de Sante deja lues par l'accueil (30 jours) ; absentes, pas de rangee de la semaine */
  series?: SeriesJour | null;
  /** tes seances notees (l'exercice de chaque jour les compte, comme aujourd'hui) */
  trainings?: Training[] | null;
  /** l'eau des jours passes */
  eauHistorique?: HydrationDay[] | null;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // ecran etroit (375) : anneaux et chiffres un cran plus petits, rien ne se coupe
  const etroit = width < 385;
  // 17 octobre nuit (planche C5) : carte claire ; seul le disque des anneaux est noir. A gauche, tes trois valeurs
  // (pastille de la couleur exacte, valeur dans sa teinte lisible sur blanc) ; dessous, trois mini cartes riches
  // 19 octobre 2026 (Houari, « comme Apple Forme ») : une rangee de 7 petits anneaux, lundi a dimanche ; toucher un jour
  // affiche ses donnees dans la carte (anneaux, sommeil, eau, autres mesures), rien n'est relu dans Sante
  // (les 30 jours deja lus par l'accueil) ; toucher le gros anneau ouvre l'historique (app/sante/anneaux.tsx)
  const aujourdhui = localISO();
  const [choisi, setChoisi] = useState(aujourdhui);
  const dernierJour = useRef(aujourdhui);
  useEffect(() => {
    // le lendemain (minuit passe, retour sur l'app), la carte revient sur le nouveau jour
    if (dernierJour.current !== aujourdhui) {
      dernierJour.current = aujourdhui;
      setChoisi(aujourdhui);
    }
  }, [aujourdhui]);
  useEffect(() => {
    retenirSeriesAccueil(series);
  }, [series]);
  const estAujourdhui = choisi === aujourdhui;
  const mesuresJour = useMemo(() => (estAujourdhui ? mesures : mesuresDuJour(series, trainings, choisi, aujourdhui)), [estAujourdhui, mesures, series, trainings, choisi, aujourdhui]);
  const semaine = useMemo(() => (series ? semaineAnneaux(series, trainings, aujourdhui, mesures) : null), [series, trainings, aujourdhui, mesures]);
  const avecSemaine = !!semaine && semaine.some(aUneDonnee);
  const trois = ORDRE_ACTIVITE.map((k) => ({ cle: k, m: mesuresJour.find((x) => x.cle === k) ?? null }));
  const avecAnneaux = avecSemaine || trois.some((x) => x.m);
  const autres = mesuresJour.filter((m) => !['pas', 'energie-active', 'exercice', 'sommeil'].includes(m.cle));
  const nombre = (n: number) => Math.round(n).toLocaleString(LOCALE).replace(/[  ]/g, ' ');
  // 17 octobre nuit : deux solutions de lisibilite, A (pastille noire, retenue) ou B (encre et barre), reglage interne
  const styleValeurs = useStyleValeurs();
  const styleContour = useStyleContour();
  const [feuille, setFeuille] = useState(false);
  const unites: Record<string, string> = { pas: 'pas', exercice: 'min', 'energie-active': 'kcal' };
  return (
    <View style={[{ borderRadius: 26, padding: 16, gap: 14 }, carteNeutre()]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Ink size={21} weight="black" tight accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>
          {titreJour(choisi, aujourdhui)}
        </Ink>
        <Pressable onPress={() => router.push('/sante' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ouvrir Santé")} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ink size={12.5} weight="extraBold" color={P.accent}>
            Santé
          </Ink>
          <Icon name="chevron" size={13} color={P.accent} width={2.6} />
        </Pressable>
      </View>

      {avecSemaine && semaine ? <RangeeSemaine jours={semaine} choisi={choisi} aujourdhui={aujourdhui} objectifs={objectifs} onChoisir={setChoisi} /> : null}

      {avecAnneaux ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 9 }}>
            {trois.map(({ cle, m }) => {
              const c = couleurActivite(cle);
              const o = objectifMesure(cle, objectifs);
              const cible = o ? nombre(o.cible) : null;
              const vide = !m || !(m.valeur > 0);
              const part = m && o && o.cible > 0 ? Math.min(1, m.valeur / o.cible) : 0;
              const texteValeur = `${m ? texteMesureSante(m).valeur : '0'}${cible ? `/${cible}` : ''}`;
              return (
                <Pressable key={cle} onPress={() => router.push(`/sante/${cle}` as any)} accessibilityRole="button" accessibilityLabel={vide ? traduire("{0} : pas de donnée", MESURE_SANTE[cle].nom) : `${MESURE_SANTE[cle].nom} : ${m ? texteMesureSante(m).valeur : ''}${o ? `, ${o.texte}` : ''}`} style={{ gap: 3 }}>
                  <Ink size={12} weight="extraBold" color={P.ink} numberOfLines={1}>
                    {traduire(MESURE_SANTE[cle].nom)}
                    {o?.repere ? (
                      <Ink size={11} weight="bold" color={P.ink2}>
                        {traduire('  repère')}
                      </Ink>
                    ) : null}
                  </Ink>
                  {vide ? (
                    // 19 octobre : sans donnee ce jour-la, on le dit (avant : « 0/8 000 » en gris)
                    <Ink size={etroit ? 14 : 15} weight="extraBold" color={P.ink2} numberOfLines={1} style={{ paddingVertical: 3 }}>
                      {traduire("Pas de donnée")}</Ink>
                  ) : styleValeurs !== 'barre' ? (
                    // pastille noire (retenue) ou l'un des trois traitements legers a l'essai, dans la couleur exacte de l'anneau
                    <ValeurLegere style={styleValeurs} couleur={vide ? (styleValeurs === 'pastille' ? 'rgba(255,255,255,0.6)' : P.ink2) : c.anneau} size={etroit ? 16 : 17.5} rayon={10} valeur={texteValeur} unite={` ${unites[cle]}`} />
                  ) : (
                    // B : la valeur en encre, une barre fine dessous dans la couleur exacte de l'anneau
                    <View style={{ gap: 4 }}>
                      <Ink size={etroit ? 17 : 19} weight="black" tight color={vide ? P.ink2 : P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>
                        {texteValeur}
                        <Ink size={11} weight="extraBold" color={P.ink2}>
                          {` ${unites[cle]}`}
                        </Ink>
                      </Ink>
                      <View style={{ height: 5, borderRadius: 3, backgroundColor: P.line, overflow: 'hidden', marginRight: 6 }}>
                        <View style={{ width: `${Math.round(part * 100)}%`, height: 5, borderRadius: 3, backgroundColor: c.anneau }} />
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => router.push(`/sante/anneaux?jour=${choisi}` as any)}
            accessibilityRole="button"
            accessibilityLabel={traduire("Tes anneaux, {0}. Ouvrir l’historique", estAujourdhui ? 'aujourd’hui' : jourA11y(choisi))}
            hitSlop={6}
          >
            <AnneauxConcentriques
              cle="tableau"
              cadran
              contour={styleContour === 'avec'}
              taille={etroit ? 132 : 146}
              epaisseur={etroit ? 13 : 14}
              ecart={3}
              anneaux={trois.map(({ cle, m }) => {
                const o = objectifMesure(cle, objectifs);
                // au-dela de l'objectif, l'anneau continue un second tour (deux tours au plus) ; sans donnee, la piste
                return { part: m && o && o.cible > 0 ? Math.min(2, m.valeur / o.cible) : 0, couleurs: couleurActivite(cle), fleche: FLECHE_ACTIVITE[cle] };
              })}
            />
          </Pressable>
        </View>
      ) : null}

      {/* recuperation, sommeil, eau : trois mini cartes riches, meme hauteur */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
        <MiniRecup forme={forme} passe={!estAujourdhui} />
        <MiniSommeil sleep={sleep} sleepGoal={sleepGoal} jour={estAujourdhui ? null : choisi} />
        {estAujourdhui ? <MiniEau water={water} waterGoal={waterGoal} onOuvrir={onEau} /> : <MiniEauPassee eau={eauDuJour(eauHistorique, choisi)} goal={waterGoal} />}
      </View>

      {/* 17 octobre nuit (Houari : « Respiration est coupé », puis « toutes sur une seule ligne ») : libelles courts,
          une seule ligne de colonnes egales, rien ne passe a la ligne ni ne se coupe a 375 ; toucher une mesure ouvre la
          feuille qui donne les noms complets */}
      {autres.length ? (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: P.line2, paddingTop: 12 }}>
          {autres.map((m) => {
            const { valeur, unite } = texteMesureSante(m);
            const court = COURT[m.cle] ?? { nom: MESURE_SANTE[m.cle].nom, unite };
            return (
              <Pressable key={m.cle} onPress={() => setFeuille(true)} accessibilityRole="button" accessibilityLabel={traduire("{0} : {1} {2}. Voir le détail de tes mesures", MESURE_SANTE[m.cle].nom, valeur, unite)} style={{ flex: 1, minWidth: 0, gap: 2, paddingRight: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COULEUR_AUTRE[m.cle] ?? P.ink2 }} />
                  <Ink size={10} weight="extraBold" color={P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1 }}>
                    {m.hier ? traduire("{0}, hier", court.nom) : court.nom}
                  </Ink>
                </View>
                <Ink size={15} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontVariant: ['tabular-nums'] }}>
                  {valeur}
                  {court.unite ? (
                    <Ink size={10} weight="bold" color={P.ink2}>
                      {court.unite.startsWith('/') ? court.unite : ` ${court.unite}`}
                    </Ink>
                  ) : null}
                </Ink>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {!autres.length && !estAujourdhui && avecSemaine ? (
        <View style={{ borderTopWidth: 1, borderTopColor: P.line2, paddingTop: 12 }}>
          <Ink size={11.5} weight="bold" color={P.ink2}>
            {traduire("Pas d’autre mesure de Santé ce jour-là")}</Ink>
        </View>
      ) : null}
      <FeuilleMesures visible={feuille} onFermer={() => setFeuille(false)} mesures={autres} titre={estAujourdhui ? traduire('Tes autres mesures du jour') : traduire("Tes autres mesures, {0}", jourA11y(choisi))} />
    </View>
  );
}

/**
 * Les autres mesures de Sante, dans la palette des anneaux : le coeur en rose, la distance et la respiration en vert,
 * l'oxygene en cyan. La couleur exacte va dans la pastille devant le libelle (en encre) : lisible sur blanc.
 */
const COULEUR_AUTRE: Partial<Record<string, string>> = {
  'frequence-cardiaque': '#FA114F',
  'fc-repos': '#FA114F',
  distance: '#92E82A',
  respiration: '#92E82A',
  debout: '#92E82A',
  oxygene: '#1EEAEF',
};

/** Libelles et unites courts de la ligne du bas (les noms complets sont dans la feuille) */
const COURT: Partial<Record<string, { nom: string; unite: string }>> = {
  distance: { nom: 'Dist.', unite: 'km' },
  'frequence-cardiaque': { nom: 'FC', unite: 'bpm' },
  'fc-repos': { nom: traduire('FC repos'), unite: 'bpm' },
  oxygene: { nom: traduire('SpO2'), unite: '%' },
  respiration: { nom: 'FR', unite: '/min' },
  debout: { nom: 'Debout', unite: 'h' },
};

/** Le nom complet et une phrase simple pour chaque mesure de la ligne du bas */
const EXPLICATION: Partial<Record<string, { nom: string; phrase: string }>> = {
  distance: { nom: 'Distance', phrase: traduire('distance parcourue aujourd’hui') },
  'frequence-cardiaque': { nom: traduire('FC du jour'), phrase: traduire('fréquence cardiaque moyenne aujourd’hui') },
  'fc-repos': { nom: traduire('FC repos'), phrase: traduire('fréquence cardiaque au repos') },
  oxygene: { nom: traduire('SpO2'), phrase: traduire('saturation en oxygène du sang') },
  respiration: { nom: 'FR', phrase: traduire('fréquence respiratoire, respirations par minute') },
  debout: { nom: 'Debout', phrase: traduire('heures où tu as bougé au moins une minute') },
};

/** La petite feuille des mesures : noms complets, une phrase, la valeur, un lien vers le detail Sante de chacune */
function FeuilleMesures({ visible, onFermer, mesures, titre = traduire('Tes autres mesures du jour') }: { visible: boolean; onFermer: () => void; mesures: MesureSanteJour[]; titre?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <Pressable onPress={onFermer} style={{ flex: 1, backgroundColor: 'rgba(16,19,27,0.45)', justifyContent: 'flex-end' }} accessibilityLabel={traduire("Fermer")}>
        <Pressable onPress={() => {}} style={{ backgroundColor: P.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 6 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line, marginBottom: 8 }} />
          <Ink size={20} weight="black" tight accessibilityRole="header">
            {titre}
          </Ink>
          <View style={[{ borderRadius: 20, paddingHorizontal: 14, marginTop: 6 }, carteNeutre()]}>
            {mesures.map((m, i) => {
              const e = EXPLICATION[m.cle] ?? { nom: MESURE_SANTE[m.cle].nom, phrase: MESURE_SANTE[m.cle].nom };
              const { valeur, unite } = texteMesureSante(m);
              return (
                <Pressable
                  key={m.cle}
                  onPress={() => {
                    onFermer();
                    router.push(`/sante/${m.cle}` as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={traduire("{0} : {1}. {2} {3}{4}. Voir le détail", e.nom, e.phrase, valeur, unite, m.hier ? ', mesure d’hier' : '')}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: P.line2, opacity: pressed ? 0.6 : 1 })}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COULEUR_AUTRE[m.cle] ?? P.ink2 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Ink size={14.5} weight="black" numberOfLines={1}>
                      {traduire(e.nom)}
                    </Ink>
                    <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={2}>
                      {traduire(e.phrase)}
                    </Ink>
                  </View>
                  <Ink size={16} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>
                    {valeur}
                    <Ink size={11} weight="bold" color={P.ink2}>{` ${unite}`}</Ink>
                    {m.hier ? <Ink size={11} weight="bold" color={P.ink2}>{traduire(', hier')}</Ink> : null}
                  </Ink>
                  <Icon name="chevron" size={14} color={P.ink2} width={2.6} />
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const HAUTEUR_MINI = 168;

function CadreMini({ onPress, a11y, titre, couleur, children, titreAGauche }: { onPress: () => void; a11y: string; titre: string; couleur: string; children: React.ReactNode; titreAGauche?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: HAUTEUR_MINI, borderRadius: 18, borderWidth: 1, borderColor: P.line2, backgroundColor: pressed ? P.paper : P.white, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 4 })}>
      <Ink size={10.5} weight="extraBold" color={couleur} numberOfLines={1} style={titreAGauche ? { alignSelf: 'flex-start', paddingLeft: 2, lineHeight: 24 } : { lineHeight: 24 }}>
        {titre}
      </Ink>
      {children}
    </Pressable>
  );
}

// audit 18 octobre : la phrase courte (phraseRecup) suit les seuils des niveaux, lib/v2/recuperation.ts

function MiniRecup({ forme, passe = false }: { forme: FormeResult | null; passe?: boolean }) {
  const router = useRouter();
  const score = forme && forme.score !== null && forme.level ? forme.score : null;
  const t = teinte('forme');
  // 19 octobre : le score de recuperation se calcule pour aujourd'hui seulement, aucun score n'est garde par jour
  if (passe) {
    return (
      <CadreMini onPress={() => router.push('/readiness-detail' as any)} a11y={traduire("Récupération : pas de score ce jour-là, le score se calcule pour aujourd’hui")} titre={traduire("Récupération")} couleur={t.texte}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ink size={11.5} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
            {traduire("Pas de score ce jour-là")}</Ink>
        </View>
      </CadreMini>
    );
  }
  // audit 18 octobre : meme regle que l'ecran detail, pas de score sur 100 avec un seul element mesure
  if (score !== null && forme && !scoreRecupFiable(score, forme.factors.length)) {
    const manqueNuit = forme.missing.includes('sommeil');
    const message = messageScoreIncomplet(manqueNuit);
    return (
      <CadreMini onPress={() => router.push((manqueNuit ? '/sleep-input' : '/readiness-detail') as any)} a11y={traduire("Récupération : {0}. {1}", message, manqueNuit ? 'Note ta nuit' : 'Voir le détail')} titre={traduire("Récupération")} couleur={t.texte}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ink size={11.5} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
            {message}
          </Ink>
        </View>
      </CadreMini>
    );
  }
  if (score === null) {
    return (
      <CadreMini onPress={() => router.push('/sleep-input' as any)} a11y={traduire("Récupération : note ta nuit pour la voir")} titre={traduire("Récupération")} couleur={t.texte}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ink size={11.5} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
            {traduire("Note ta nuit pour la voir")}</Ink>
        </View>
      </CadreMini>
    );
  }
  return (
    <CadreMini onPress={() => router.push('/readiness-detail' as any)} a11y={traduire("Récupération : {0} sur 100, {1}. {2}", score, forme!.level!.label, phraseRecup(score))} titre={traduire("Récupération")} couleur={t.texte}>
      <JaugeRecup score={score} taille={84} epaisseur={8} cle="mini:recup" />
      <Ink size={13} weight="black" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center' }}>
        {traduire(forme!.level!.label)}
      </Ink>
      <Ink size={10} weight="bold" color={P.ink2} numberOfLines={2} style={{ textAlign: 'center' }}>
        {phraseRecup(score)}
      </Ink>
    </CadreMini>
  );
}

function MiniSommeil({ sleep, sleepGoal, jour = null }: { sleep: SleepEntry[]; sleepGoal: number; jour?: string | null }) {
  const router = useRouter();
  // 19 octobre : un jour passe montre sa nuit (datee du matin du reveil), sinon « Pas de nuit notée »
  const nuit = jour ? nuitDuJour(sleep, jour) : sleep[0];
  const t = teinte('poids');
  const nuits = useMemo(() => septNuits(sleep, jour ?? localISO()), [sleep, jour]);
  if (!nuit && jour) {
    return (
      <CadreMini onPress={() => router.push('/sleep' as any)} a11y={traduire("Sommeil : pas de nuit notée ce jour-là")} titre={traduire("Sommeil")} couleur={t.texte}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ink size={11.5} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
            {traduire("Pas de nuit notée ce jour-là")}</Ink>
        </View>
      </CadreMini>
    );
  }
  if (!nuit) {
    return (
      <CadreMini onPress={() => router.push('/sleep-input' as any)} a11y={traduire("Sommeil : ajoute ta dernière nuit")} titre={traduire("Sommeil")} couleur={t.texte}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Ink size={11.5} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
            {traduire("Ajoute ta dernière nuit")}</Ink>
        </View>
      </CadreMini>
    );
  }
  const heures = nuit.bedTime && nuit.wakeTime ? traduire("{0} à {1}", nuit.bedTime.replace(':', ' h '), nuit.wakeTime.replace(':', ' h ')) : null;
  return (
    <CadreMini onPress={() => router.push('/sleep' as any)} a11y={traduire("Sommeil : {0}{1}", formatMinutes(nuit.duration), heures ? `, de ${heures}` : '')} titre={traduire("Sommeil")} couleur={t.texte}>
      <ChiffreAnime valeur={nuit.duration} format={(x) => formatMinutes(Math.round(x))} cle={jour ? `mini:sommeil:${jour}` : 'mini:sommeil'} taille={18} />
      <View style={{ alignSelf: 'stretch', paddingHorizontal: 2, marginTop: 2 }}>
        <Barres7 valeurs={nuits} objectif={sleepGoal} couleur={t.plein} douce={t.bord} hauteur={44} cle="mini:sommeil" derniere />
      </View>
      {heures ? (
        <Ink size={9.5} weight="bold" color={P.ink2} numberOfLines={2} style={{ textAlign: 'center', marginTop: 2 }}>
          {heures}
        </Ink>
      ) : null}
    </CadreMini>
  );
}

function MiniEau({ water, waterGoal, onOuvrir }: { water: number; waterGoal: number; onOuvrir: () => void }) {
  // 17 octobre nuit (Houari : « l'eau doit utiliser le bleu de l'anneau ») : le cyan de l'anneau Calories partout ;
  // en clair, un liseré cyan plus sombre pour le contour, le titre et le chiffre (lisibles sur blanc)
  const c = couleurActivite('energie-active');
  const trait = c.ombre ?? c.anneau;
  const styleValeurs = useStyleValeurs();
  // audit 18 octobre : deux appuis rapproches sur le + comptent deux verres (avant, le second relisait l'ancien
  // total, encore en cours d'enregistrement, et un verre se perdait). Meme principe que la feuille de l'eau.
  const [affiche, setAffiche] = useState(water);
  const base = useRef(water);
  const enCours = useRef(0);
  useEffect(() => {
    if (enCours.current > 0) return;
    base.current = water;
    setAffiche(water);
  }, [water]);
  const quantite = useCompteur(affiche, 'mini:eau');
  const ok = waterGoal > 0 && affiche >= waterGoal;
  const reste = Math.max(0, waterGoal - affiche);
  // le + : un verre de plus, comme dans la feuille de l'eau (meme enregistrement)
  const verre = () => {
    const avant = base.current;
    const apres = Math.min(15, Math.round((avant + GLASS_L) * 100) / 100);
    base.current = apres;
    setAffiche(apres);
    tap(avant < waterGoal && apres >= waterGoal ? 'success' : 'light');
    enCours.current += 1;
    saveHydrationAmount(apres, waterGoal)
      .catch(() => {})
      .finally(() => {
        enCours.current = Math.max(0, enCours.current - 1);
      });
  };
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <CadreMini onPress={onOuvrir} a11y={traduire("Eau : {0} litre sur {1}. Ouvrir l’eau du jour", formatLiters(affiche), formatLiters(waterGoal))} titre="Eau" couleur={trait} titreAGauche>
        <Bouteille part={waterGoal > 0 ? affiche / waterGoal : 0} couleur={c.anneau} vague={c.fin} contour={trait} largeur={30} hauteur={56} cle="mini:eau" />
        {/* la quantite dans le cyan exact de l'anneau, sur la meme pastille noire que les valeurs des anneaux (AA) */}
        <ValeurLegere style={styleValeurs === 'barre' ? 'pastille' : styleValeurs} couleur={c.anneau} size={15} rayon={9} centre valeur={`${formatLiters(quantite)} L`} />
        <Ink size={9.5} weight="bold" color={ok ? P.mossText : P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center', alignSelf: 'stretch', marginHorizontal: -4 }}>
          {ok ? traduire('objectif atteint') : traduire("encore {0} L", formatLiters(reste))}
        </Ink>
      </CadreMini>
      <Pressable onPress={verre} accessibilityRole="button" accessibilityLabel={traduire("Ajouter un verre d’eau")} hitSlop={8} style={({ pressed }) => ({ position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: trait, backgroundColor: P.white, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
        <Icon name="plus" size={14} color={trait} width={3} />
      </Pressable>
    </View>
  );
}

/** 19 octobre : l'eau d'un jour passe, lue dans l'historique de l'eau ; en lecture seule, sans bouton + */
function MiniEauPassee({ eau, goal }: { eau: { amount: number; goal: number | null } | null; goal: number }) {
  const router = useRouter();
  const ouvrir = () => router.push('/hydration' as any);
  const c = couleurActivite('energie-active');
  const trait = c.ombre ?? c.anneau;
  const g = eau?.goal ?? goal;
  if (!eau) {
    return (
      <View style={{ flex: 1, minWidth: 0 }}>
        <CadreMini onPress={ouvrir} a11y={traduire("Eau : pas de donnée ce jour-là. Ouvrir l’eau")} titre="Eau" couleur={trait} titreAGauche>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Ink size={11.5} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
              {traduire("Pas de donnée")}</Ink>
          </View>
        </CadreMini>
      </View>
    );
  }
  const ok = g > 0 && eau.amount >= g;
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <CadreMini onPress={ouvrir} a11y={traduire("Eau : {0} litre{1} ce jour-là. Ouvrir l’eau", formatLiters(eau.amount), g > 0 ? ` sur ${formatLiters(g)}` : '')} titre="Eau" couleur={trait} titreAGauche>
        <Bouteille part={g > 0 ? eau.amount / g : 0} couleur={c.anneau} vague={c.fin} contour={trait} largeur={30} hauteur={56} cle="mini:eau:passee" />
        <Ink size={15} weight="black" color={trait} style={{ textAlign: 'center' }}>
          {`${formatLiters(eau.amount)} L`}
        </Ink>
        <Ink size={9.5} weight="bold" color={ok ? P.mossText : P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center', alignSelf: 'stretch', marginHorizontal: -4 }}>
          {ok ? traduire('objectif atteint') : g > 0 ? traduire("sur {0} L", formatLiters(g)) : ' '}
        </Ink>
      </CadreMini>
    </View>
  );
}

/** Proposition C : les tuiles en defilement horizontal, largeur fixe, meme hauteur */
export function Carrousel({ titre, items }: { titre: string; items: { cle: string; contenu: React.ReactNode }[] }) {
  const { width } = useWindowDimensions();
  if (!items.length) return null;
  // deux tuiles et le bord de la suivante : la tuile coupee a droite dit qu'on peut faire defiler ;
  // une seule tuile : toute la largeur, rien a faire defiler
  const plein = Math.min(width, 560) - 44;
  const L = items.length === 1 ? plein : Math.round((Math.min(width, 560) - 22 - 12 - 26) / 2);
  const defile = items.length > 2;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <TitreSection titre={titre} />
        {defile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 3 }} accessible={false} importantForAccessibility="no-hide-descendants">
            <Ink size={12} weight="bold" color={P.ink2}>
              {`${items.length} tuiles`}
            </Ink>
            <Icon name="chevron" size={12} color={P.ink2} width={2.6} />
          </View>
        ) : null}
      </View>
      <View style={{ marginHorizontal: -22 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}
          decelerationRate="fast"
          snapToInterval={L + 12}
          snapToAlignment="start"
          disableIntervalMomentum
          scrollEventThrottle={16}
          accessibilityLabel={traduire("{0}, {1} tuiles, fais glisser pour voir la suite", titre, items.length)}
        >
          {items.map((x) => (
            <View key={x.cle} style={{ width: L, minHeight: 150 }}>
              {x.contenu}
            </View>
          ))}
        </ScrollView>
        {defile ? <LinearGradient pointerEvents="none" colors={[paperA(0), paperA(0.85)]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 26 }} /> : null}
      </View>
    </View>
  );
}

/* ============ Valeur dans la couleur exacte de l'anneau : pastille noire ou traitement leger ============ */

/** La meme teinte, plus sombre (canaux multiplies par 1 - f) */
export function assombrir(hex: string, f: number): string {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const v = (k: number) => Math.round(parseInt(h.slice(k, k + 2), 16) * (1 - f)).toString(16).padStart(2, '0');
  return `#${v(0)}${v(2)}${v(4)}`;
}

/** hex + opacite en rgba (les 8 chiffres sortent opaques sur iOS) */
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
}

const DECALAGES_TRAIT: [number, number][] = [[-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6], [-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]];

function ValeurLegere({ style, couleur, size, rayon, centre = false, valeur, unite }: { style: Exclude<StyleValeurs, 'barre'>; couleur: string; size: number; rayon: number; centre?: boolean; valeur: string; unite?: string }) {
  const texte = (extra?: object, couleurTexte = couleur) => (
    <Ink size={size} weight="black" tight color={couleurTexte} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[{ fontVariant: ['tabular-nums'] }, extra]}>
      {valeur}
      {unite ? (
        <Ink size={11} weight="black" color={couleurTexte} style={extra}>
          {unite}
        </Ink>
      ) : null}
    </Ink>
  );
  const cadre = { alignSelf: centre ? ('center' as const) : ('flex-start' as const), maxWidth: '100%' as const };
  if (style === 'pastille') {
    return <View style={[cadre, { backgroundColor: '#0B0D12', borderRadius: rayon, paddingHorizontal: 8, paddingVertical: 3 }]}>{texte()}</View>;
  }
  if (style === 'surlignage') {
    // le choix de Houari : un surlignage pale de la teinte exacte, arrondi, sans bord. En clair, fond a 17 % et, pour le
    // vert et le cyan seulement, le chiffre un peu plus sombre (meme teinte, 15 % de luminosite en moins, toujours fluo) ;
    // en sombre, le chiffre garde la couleur exacte sur un fond a 18 %
    const sombre = paletteSombre();
    const fluo = couleur === '#92E82A' || couleur === '#1EEAEF';
    const chiffre = !sombre && fluo ? assombrir(couleur, 0.15) : couleur;
    return <View style={[cadre, { backgroundColor: rgba(couleur, sombre ? 0.18 : 0.17), borderRadius: rayon, paddingHorizontal: 8, paddingVertical: 3 }]}>{texte(undefined, chiffre)}</View>;
  }
  if (style === 'ombre') {
    // une ombre portee tres douce, de la meme teinte plus sombre, a 35 % (0, 1, 2)
    return <View style={[cadre, { paddingVertical: 3 }]}>{texte({ textShadowColor: rgba(assombrir(couleur, 0.55), 0.35), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 })}</View>;
  }
  // trait : un contour tres fin (0,6) de la meme teinte plus sombre, fait de huit copies decalees, identique sur iOS, Android et web
  const sombre = assombrir(couleur, 0.45);
  return (
    <View style={[cadre, { paddingVertical: 3 }]}>
      {DECALAGES_TRAIT.map(([x, y], i) => (
        <View key={i} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: x, top: 3 + y, right: -x }}>
          {texte(undefined, sombre)}
        </View>
      ))}
      {texte()}
    </View>
  );
}
