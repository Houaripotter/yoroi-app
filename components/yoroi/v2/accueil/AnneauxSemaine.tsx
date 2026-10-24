/**
 * Petits anneaux jour par jour (19 octobre 2026), a la facon d'Apple Forme.
 *   MiniAnneaux    : trois anneaux fixes (pas, exercice, calories) poses sur un petit disque noir, sans animation
 *                    (7 sur l'accueil, 35 par page dans l'historique)
 *   RangeeSemaine  : la rangee L M M J V S D de la carte « Aujourd'hui » ; chaque jour est une grande zone de
 *                    toucher (au moins 44 x 60 points) autour d'un anneau de 28 points ; le jour choisi a un fond
 *                    indigo pale, aujourd'hui un point sous la lettre, les jours a venir sont grises et inactifs
 *   CarrouselSemaines (24 octobre 2026, Houari) : la meme rangee, glissable une semaine par page (lundi a dimanche),
 *                    la semaine en cours par defaut, rien dans le futur ; sur une semaine passee, un repere
 *                    « 12 au 18 oct. » et un bouton pour revenir a aujourd'hui. Sous chaque anneau, le numero du jour
 *                    (aujourd'hui sur une pastille indigo) ; les lettres suivent la langue de l'app.
 * Donnees : lib/v2/sante/anneauxJours.ts (rien d'invente, un jour sans donnee garde ses pistes vides).
 */
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CLES_ANNEAUX, LETTRES_JOURS, aUneDonnee, borneSemaine, jourA11y, libelleSemaine, numeroJour, partsAnneaux } from '@/lib/v2/sante/anneauxJours';
import type { AnneauxJour } from '@/lib/v2/sante/anneauxJours';
import type { ObjectifsSante } from '@/lib/v2/accueil/enPlus';
import { Icon, P, tap } from './kit';
import { couleurActivite } from './Visus';
import { traduire, LOCALE } from '@/lib/i18n/tr';

/** Trois anneaux fixes sur un disque noir ; parts de 0 a 2 (au-dela d'un tour, l'anneau est plein) */
export function MiniAnneaux({ parts, taille = 28, futur = false }: { parts: [number, number, number]; taille?: number; futur?: boolean }) {
  const m = taille / 2;
  const bord = Math.max(1.2, taille * 0.05);
  const ep = Math.max(2.4, taille * 0.115);
  const ecart = Math.max(0.6, taille * 0.03);
  if (futur) {
    return (
      <Svg width={taille} height={taille}>
        <Circle cx={m} cy={m} r={m - 1} stroke={P.line} strokeWidth={1.5} strokeDasharray="2.5 3" fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={taille} height={taille}>
      <Circle cx={m} cy={m} r={m} fill="#0B0D12" />
      {CLES_ANNEAUX.map((cle, i) => {
        const c = couleurActivite(cle);
        const r = m - bord - ep / 2 - i * (ep + ecart);
        if (r <= 0) return null;
        const tour = 2 * Math.PI * r;
        const p = Math.max(0, Math.min(1, parts[i] ?? 0));
        return (
          <React.Fragment key={cle}>
            <Circle cx={m} cy={m} r={r} stroke={c.piste} strokeWidth={ep} fill="none" />
            {p > 0 ? (
              <Circle
                cx={m}
                cy={m}
                r={r}
                stroke={c.anneau}
                strokeWidth={ep}
                fill="none"
                strokeLinecap={p >= 1 ? 'butt' : 'round'}
                strokeDasharray={`${tour * p} ${tour}`}
                transform={`rotate(-90 ${m} ${m})`}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const entier = (n: number) => Math.round(n).toLocaleString(LOCALE).replace(/[   ]/g, ' ');

/** Ce que dit le lecteur d'ecran pour un jour : ses trois valeurs, ou « pas de donnée » */
export function a11yJourAnneaux(a: AnneauxJour, aujourdhui: string): string {
  const nom = a.date === aujourdhui ? traduire("Aujourd’hui, {0}", jourA11y(a.date)) : jourA11y(a.date);
  if (a.futur) return traduire("{0} : jour à venir", nom);
  if (!aUneDonnee(a)) return traduire("{0} : pas de donnée", nom);
  const pas = a.pas !== null ? traduire("{0} pas", entier(a.pas)) : traduire('pas : pas de donnée');
  const ex = a.exercice !== null ? traduire("{0} minutes d’exercice", entier(a.exercice)) : traduire('exercice : pas de donnée');
  const kcal = a.kcal !== null ? `${entier(a.kcal)} kilocalories` : traduire('calories : pas de donnée');
  return `${nom} : ${pas}, ${ex}, ${kcal}`;
}

/** Hauteur d'une rangee : lettre, anneau de 28 points, numero du jour (4 points de plus qu'avant le numero) */
export const HAUTEUR_RANGEE = 66;

export function RangeeSemaine({ jours, choisi, aujourdhui, objectifs, onChoisir, largeur }: { jours: AnneauxJour[]; choisi: string; aujourdhui: string; objectifs: ObjectifsSante | null | undefined; onChoisir: (iso: string) => void; /** dans le carrousel : la largeur de la page (sans marge negative) */ largeur?: number }) {
  return (
    <View style={largeur ? { flexDirection: 'row', width: largeur } : { flexDirection: 'row', marginHorizontal: -6 }} accessibilityRole="tablist">
      {jours.map((a, i) => {
        const sel = a.date === choisi;
        const auj = a.date === aujourdhui;
        return (
          <Pressable
            key={a.date}
            disabled={a.futur}
            onPress={() => {
              if (sel) return;
              tap('light');
              onChoisir(a.date);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel, disabled: a.futur }}
            accessibilityLabel={a11yJourAnneaux(a, aujourdhui)}
            accessibilityHint={a.futur ? undefined : traduire('Affiche les données de ce jour dans la carte')}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 44,
              minHeight: HAUTEUR_RANGEE,
              marginHorizontal: 1,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              backgroundColor: sel ? P.accentSoft : pressed ? P.paper : 'transparent',
              opacity: a.futur ? 0.4 : 1,
            })}
          >
            <Ink size={11} weight={sel ? 'black' : 'extraBold'} color={sel ? P.accent : P.ink2}>
              {LETTRES_JOURS[i] ?? ''}
            </Ink>
            <MiniAnneaux parts={partsAnneaux(a, objectifs)} taille={28} futur={a.futur} />
            {/* le numero du jour en tout petit ; aujourd'hui sur une pastille indigo (remplace l'ancien point) */}
            <View style={{ minWidth: 18, height: 14, paddingHorizontal: 3, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: auj ? P.accent : 'transparent' }}>
              <Ink size={9.5} weight={auj || sel ? 'black' : 'bold'} color={auj ? '#FFFFFF' : sel ? P.accent : P.ink2} style={{ lineHeight: 12, fontVariant: ['tabular-nums'] }}>
                {numeroJour(a.date)}
              </Ink>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export type SemaineRangee = { lundi: string; jours: AnneauxJour[] };

/**
 * La rangee glissable : semaines[0] est la semaine en cours (a droite), les suivantes remontent le temps.
 * Liste horizontale inversee et paginee, comme l'historique de app/sante/anneaux.tsx : balayer vers la droite
 * montre la semaine d'avant. Seul un glisse horizontal sur la rangee change de semaine (le defilement vertical
 * de l'accueil passe au-dessus). onSemaine : appele a chaque nouvelle semaine affichee (lecture de l'historique).
 */
export function CarrouselSemaines({
  semaines,
  choisi,
  aujourdhui,
  objectifs,
  onChoisir,
  onSemaine,
  onRetour,
}: {
  semaines: SemaineRangee[];
  choisi: string;
  aujourdhui: string;
  objectifs: ObjectifsSante | null | undefined;
  onChoisir: (iso: string) => void;
  onSemaine?: (index: number) => void;
  /** retour a la semaine en cours par le bouton : la carte revient sur aujourd'hui */
  onRetour?: () => void;
}) {
  const [largeur, setLargeur] = useState(0);
  const [page, setPage] = useState(0);
  const liste = useRef<FlatList<SemaineRangee>>(null);
  const n = semaines.length;
  const p = borneSemaine(page, n);

  const changer = useCallback(
    (k: number) => {
      setPage(k);
      onSemaine?.(k);
    },
    [onSemaine],
  );

  const finDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!largeur) return;
    const k = borneSemaine(e.nativeEvent.contentOffset.x / largeur, n);
    if (k === p) return;
    tap('light');
    changer(k);
  };

  const revenir = () => {
    tap('light');
    changer(0);
    liste.current?.scrollToIndex({ index: 0, animated: true });
    onRetour?.();
  };

  if (!n) return null;
  const vue = semaines[p];
  return (
    <View style={{ gap: 6 }}>
      {p > 0 && vue ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 22 }}>
          <Ink size={11.5} weight="extraBold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }} accessibilityRole="header">
            {libelleSemaine(vue.lundi)}
          </Ink>
          <Pressable
            onPress={revenir}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={traduire('Revenir à aujourd’hui')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, height: 22, paddingLeft: 9, paddingRight: 6, borderRadius: 11, backgroundColor: P.accentSoft, opacity: pressed ? 0.6 : 1 })}
          >
            <Ink size={11} weight="extraBold" color={P.accent} numberOfLines={1}>
              {traduire('Aujourd’hui')}
            </Ink>
            <Icon name="chevron" size={11} color={P.accent} width={2.6} />
          </Pressable>
        </View>
      ) : null}
      <View style={{ marginHorizontal: -6, minHeight: HAUTEUR_RANGEE }} onLayout={(e) => setLargeur(Math.floor(e.nativeEvent.layout.width))}>
        {largeur > 0 ? (
          <FlatList
            ref={liste}
            data={semaines}
            keyExtractor={(s) => s.lundi}
            horizontal
            inverted
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            directionalLockEnabled
            getItemLayout={(_, i) => ({ length: largeur, offset: largeur * i, index: i })}
            onMomentumScrollEnd={finDefilement}
            initialNumToRender={2}
            windowSize={3}
            style={{ width: largeur }}
            extraData={choisi}
            renderItem={({ item }) => <RangeeSemaine jours={item.jours} choisi={choisi} aujourdhui={aujourdhui} objectifs={objectifs} onChoisir={onChoisir} largeur={largeur} />}
          />
        ) : null}
      </View>
    </View>
  );
}
