/**
 * « Tes anneaux » (19 octobre 2026), ouvert en touchant le gros anneau de la carte « Aujourd'hui » de l'accueil,
 * a la facon du calendrier d'Apple Forme :
 *   en haut, le jour choisi en detail : le gros anneau, tes pas, ton exercice et tes calories face a tes objectifs ;
 *   dessous, l'historique : 5 semaines par page (lundi a dimanche) en petits anneaux ; balayer vers la droite (ou
 *   la fleche de gauche) montre les semaines d'avant ; toucher un jour affiche son detail en haut.
 * Parametre facultatif : jour=AAAA-MM-JJ (le jour choisi sur l'accueil). Donnees : useAnneauxHistorique (cache,
 * rien d'invente : « Pas de donnée » quand Sante et tes seances n'ont rien pour ce jour).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Icon, P, tap } from '@/components/yoroi/v2/accueil/kit';
import { carteNeutre } from '@/components/yoroi/v2/accueil/domaines';
import { AnneauxConcentriques, FLECHE_ACTIVITE, couleurActivite } from '@/components/yoroi/v2/accueil/Visus';
import { MiniAnneaux, a11yJourAnneaux } from '@/components/yoroi/v2/accueil/AnneauxSemaine';
import { localISO } from '@/lib/v2/accueil/hydration';
import { objectifMesure } from '@/lib/v2/accueil/enPlus';
import type { ObjectifsSante } from '@/lib/v2/accueil/enPlus';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import {
  CLES_ANNEAUX,
  LETTRES_JOURS,
  aUneDonnee,
  anneauxDuJour,
  jourLong,
  joursPourPages,
  libellePeriode,
  pageDuJour,
  pagesCalendrier,
  partsAnneaux,
} from '@/lib/v2/sante/anneauxJours';
import type { AnneauxJour, CleAnneau, PageCalendrier } from '@/lib/v2/sante/anneauxJours';
import { useAnneauxHistorique } from '@/lib/v2/sante/useAnneauxHistorique';
import { traduire, LOCALE } from '@/lib/i18n/tr';

const NOM: Record<CleAnneau, string> = { pas: traduire('Pas'), exercice: traduire('Exercice'), 'energie-active': traduire('Calories') };
const UNITE: Record<CleAnneau, string> = { pas: 'pas', exercice: 'min', 'energie-active': 'kcal' };
const MAX_PAGES = 10;
const entier = (n: number) => Math.round(n).toLocaleString(LOCALE).replace(/[   ]/g, ' ');

function valeurDe(a: AnneauxJour, cle: CleAnneau): number | null {
  return cle === 'pas' ? a.pas : cle === 'exercice' ? a.exercice : a.kcal;
}

function LigneAnneau({ cle, a, o }: { cle: CleAnneau; a: AnneauxJour; o: ObjectifsSante }) {
  const c = couleurActivite(cle);
  const v = valeurDe(a, cle);
  const obj = objectifMesure(cle, o);
  const pct = v !== null && obj && obj.cible > 0 ? Math.round((v / obj.cible) * 100) : null;
  const label = v === null ? traduire("{0} : pas de donnée", NOM[cle]) : `${NOM[cle]} : ${entier(v)} ${UNITE[cle]}${obj ? traduire(" sur {0}, {1} pour cent", entier(obj.cible), pct) : ''}`;
  return (
    <View accessible accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, borderTopWidth: cle === 'pas' ? 0 : 1, borderTopColor: P.line2 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.anneau }} />
      <Ink size={13.5} weight="extraBold" color={P.ink2} style={{ flex: 1 }} numberOfLines={1}>
        {NOM[cle]}
        {cle === 'pas' && obj?.repere ? (
          <Ink size={11} weight="bold" color={P.ink2}>
            {traduire('  repère')}
          </Ink>
        ) : null}
      </Ink>
      {v === null ? (
        <Ink size={14} weight="extraBold" color={P.ink2}>
          {traduire("Pas de donnée")}</Ink>
      ) : (
        <Ink size={19} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontVariant: ['tabular-nums'], flexShrink: 1 }}>
          {entier(v)}
          <Ink size={11.5} weight="bold" color={P.ink2}>
            {obj ? ` / ${entier(obj.cible)} ${UNITE[cle]}, ${pct} %` : ` ${UNITE[cle]}`}
          </Ink>
        </Ink>
      )}
      {pct !== null && pct >= 100 ? <Icon name="check" size={14} color={P.mossText} width={3} /> : null}
    </View>
  );
}

function PageGrille({ page, largeur, jours, choisi, aujourdhui, o, onChoisir }: { page: PageCalendrier; largeur: number; jours: Map<string, AnneauxJour>; choisi: string; aujourdhui: string; o: ObjectifsSante; onChoisir: (iso: string) => void }) {
  const cote = Math.floor(largeur / 7);
  return (
    <View style={{ width: largeur, flexDirection: 'row', flexWrap: 'wrap' }}>
      {page.jours.map((iso) => {
        const a = jours.get(iso) ?? { date: iso, pas: null, exercice: null, kcal: null, futur: iso > aujourdhui };
        const sel = iso === choisi;
        const auj = iso === aujourdhui;
        return (
          <Pressable
            key={iso}
            disabled={a.futur}
            onPress={() => {
              tap('light');
              onChoisir(iso);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: sel, disabled: a.futur }}
            accessibilityLabel={a11yJourAnneaux(a, aujourdhui)}
            accessibilityHint={a.futur ? undefined : traduire('Affiche le détail de ce jour')}
            style={({ pressed }) => ({
              width: cote,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              borderRadius: 14,
              backgroundColor: sel ? P.accentSoft : pressed ? P.paper : 'transparent',
              opacity: a.futur ? 0.35 : 1,
            })}
          >
            <MiniAnneaux parts={partsAnneaux(a, o)} taille={30} futur={a.futur} />
            <Ink size={10.5} weight={sel || auj ? 'black' : 'extraBold'} color={sel || auj ? P.accent : P.ink2}>
              {String(Number(iso.slice(8, 10)))}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TesAnneaux() {
  useYoroiTheme();
  const params = useLocalSearchParams<{ jour?: string }>();
  const aujourdhui = localISO();
  const depart = typeof params.jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.jour) && params.jour <= aujourdhui ? params.jour : aujourdhui;
  const [jour, setJour] = useState(depart);
  const [nbPages, setNbPages] = useState(() => Math.min(MAX_PAGES, pageDuJour(aujourdhui, depart) + 2));
  const [page, setPage] = useState(() => pageDuJour(aujourdhui, depart));
  const [largeur, setLargeur] = useState(0);
  const [tire, setTire] = useState(false);
  const liste = useRef<FlatList<PageCalendrier>>(null);
  const defilement = useRef<ScrollView>(null);

  const h = useAnneauxHistorique(joursPourPages(nbPages - 1));
  const o: ObjectifsSante = useMemo(() => ({ kcal: h.goals.move, exercice: h.goals.exercise }), [h.goals]);
  const pages = useMemo(() => pagesCalendrier(aujourdhui, nbPages), [aujourdhui, nbPages]);
  const parJour = useMemo(() => {
    const m = new Map<string, AnneauxJour>();
    let t = h.trainings;
    try {
      t = dedupeTrainings(h.trainings);
    } catch {
      // liste deja propre
    }
    pages.forEach((p) => p.jours.forEach((iso) => m.set(iso, anneauxDuJour(h.series, t, iso, aujourdhui))));
    return m;
  }, [pages, h.series, h.trainings, aujourdhui]);
  const a = parJour.get(jour) ?? anneauxDuJour(h.series, h.trainings, jour, aujourdhui);
  const parts = partsAnneaux(a, o);
  const seancesDuJour = useMemo(() => h.trainings.filter((t) => (t?.date ?? '').slice(0, 10) === jour).length, [h.trainings, jour]);

  const allerPage = useCallback(
    (i: number) => {
      const k = Math.max(0, Math.min(MAX_PAGES - 1, i));
      if (k >= nbPages - 1) setNbPages((n) => Math.min(MAX_PAGES, Math.max(n, k + 2)));
      setPage(k);
      requestAnimationFrame(() => liste.current?.scrollToIndex({ index: Math.min(k, pages.length - 1), animated: true }));
    },
    [nbPages, pages.length],
  );

  const finDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!largeur) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / largeur);
    setPage(i);
    if (i >= nbPages - 1) setNbPages((n) => Math.min(MAX_PAGES, n + 1));
  };

  // le jour choisi dans la grille s'affiche en haut : on remonte
  const choisir = (iso: string) => {
    setJour(iso);
    defilement.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    if (largeur && page > 0) requestAnimationFrame(() => liste.current?.scrollToIndex({ index: page, animated: false }));
    // seulement a la premiere mesure de la largeur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [largeur]);

  const android = Platform.OS === 'android';
  const sourceTexte = h.direct
    ? traduire("Pas et calories : {0}. Exercice : {1}{2}.", android ? 'Health Connect' : 'Apple Santé', android ? 'tes séances Health Connect' : 'Apple Santé', seancesDuJour ? ` et ${seancesDuJour > 1 ? `tes ${seancesDuJour} séances notées` : 'ta séance notée'} dans YOROI ce jour-là` : ' et tes séances YOROI')
    : traduire("Exercice : tes séances notées dans YOROI. Relie {0} pour tes pas et tes calories.", android ? 'Health Connect' : 'Apple Santé');

  return (
    <DetailScreen title={traduire("Tes anneaux")} subtitle={jour === aujourdhui ? traduire('Aujourd’hui') : jourLong(jour, aujourdhui)} scroll={false}>
      <ScrollView
        ref={defilement}
        style={{ marginHorizontal: -22 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 48, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={tire}
            onRefresh={async () => {
              setTire(true);
              await h.actualiser();
              setTire(false);
            }}
          />
        }
      >
        {/* le jour choisi */}
        <View style={[{ borderRadius: 26, padding: 16, gap: 10 }, carteNeutre()]}>
          <Ink size={15} weight="black" style={{ textAlign: 'center' }} accessibilityRole="header">
            {jourLong(jour, aujourdhui)}
          </Ink>
          <View style={{ alignItems: 'center', paddingVertical: 4 }} accessible accessibilityLabel={a11yJourAnneaux(a, aujourdhui)}>
            <AnneauxConcentriques
              cle={`detail:${jour}`}
              cadran
              taille={176}
              epaisseur={17}
              ecart={3}
              anneaux={CLES_ANNEAUX.map((cle, i) => ({ part: parts[i], couleurs: couleurActivite(cle), fleche: FLECHE_ACTIVITE[cle] }))}
            />
          </View>
          {!aUneDonnee(a) && !h.chargement ? (
            <Ink size={13} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
              {traduire("Pas de donnée ce jour-là")}</Ink>
          ) : null}
          <View>
            {CLES_ANNEAUX.map((cle) => (
              <LigneAnneau key={cle} cle={cle} a={a} o={o} />
            ))}
          </View>
          <Ink size={11.5} weight="bold" color={P.ink2} style={{ lineHeight: 16 }}>
            {sourceTexte}
          </Ink>
        </View>

        {/* l'historique */}
        <View style={[{ borderRadius: 26, paddingVertical: 12, paddingHorizontal: 12, gap: 6 }, carteNeutre()]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => allerPage(page + 1)}
              disabled={page >= MAX_PAGES - 1}
              accessibilityRole="button"
              accessibilityLabel={traduire("Semaines d’avant")}
              style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? P.paper : 'transparent', opacity: page >= MAX_PAGES - 1 ? 0.3 : 1 })}
            >
              <Icon name="back" size={18} color={P.accent} width={2.8} />
            </Pressable>
            <Ink size={14} weight="black" accessibilityRole="header">
              {pages[page] ? libellePeriode(pages[page].debut, pages[page].fin > aujourdhui ? aujourdhui : pages[page].fin) : ''}
            </Ink>
            <Pressable
              onPress={() => allerPage(page - 1)}
              disabled={page === 0}
              accessibilityRole="button"
              accessibilityLabel={traduire("Semaines suivantes")}
              style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? P.paper : 'transparent', opacity: page === 0 ? 0.3 : 1 })}
            >
              <Icon name="chevron" size={18} color={P.accent} width={2.8} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }} onLayout={(e) => setLargeur(Math.floor(e.nativeEvent.layout.width))} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {LETTRES_JOURS.map((l, i) => (
              <Ink key={i} size={10.5} weight="extraBold" color={P.muted} style={{ flex: 1, textAlign: 'center' }}>
                {l}
              </Ink>
            ))}
          </View>
          {largeur > 0 ? (
            <FlatList
              ref={liste}
              data={pages}
              keyExtractor={(p) => p.debut}
              horizontal
              inverted
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, i) => ({ length: largeur, offset: largeur * i, index: i })}
              onMomentumScrollEnd={finDefilement}
              initialNumToRender={2}
              windowSize={3}
              style={{ width: largeur }}
              renderItem={({ item }) => <PageGrille page={item} largeur={largeur} jours={parJour} choisi={jour} aujourdhui={aujourdhui} o={o} onChoisir={choisir} />}
              extraData={{ jour, parJour }}
            />
          ) : null}
          <Ink size={11.5} weight="bold" color={P.ink2} style={{ textAlign: 'center', lineHeight: 16 }}>
            {h.chargement ? traduire('Lecture de ton historique…') : traduire('Balaye vers la droite pour les semaines d’avant. Touche un jour pour voir son détail.')}
          </Ink>
        </View>
      </ScrollView>
    </DetailScreen>
  );
}
