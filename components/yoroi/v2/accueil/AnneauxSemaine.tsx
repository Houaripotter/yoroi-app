/**
 * Petits anneaux jour par jour (19 octobre 2026), a la facon d'Apple Forme.
 *   MiniAnneaux    : trois anneaux fixes (pas, exercice, calories) poses sur un petit disque noir, sans animation
 *                    (7 sur l'accueil, 35 par page dans l'historique)
 *   RangeeSemaine  : la rangee L M M J V S D de la carte « Aujourd'hui » ; chaque jour est une grande zone de
 *                    toucher (au moins 44 x 60 points) autour d'un anneau de 28 points ; le jour choisi a un fond
 *                    indigo pale, aujourd'hui un point sous la lettre, les jours a venir sont grises et inactifs
 * Donnees : lib/v2/sante/anneauxJours.ts (rien d'invente, un jour sans donnee garde ses pistes vides).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CLES_ANNEAUX, LETTRES_JOURS, aUneDonnee, jourA11y, partsAnneaux } from '@/lib/v2/sante/anneauxJours';
import type { AnneauxJour } from '@/lib/v2/sante/anneauxJours';
import type { ObjectifsSante } from '@/lib/v2/accueil/enPlus';
import { P, tap } from './kit';
import { couleurActivite } from './Visus';

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

const entier = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[   ]/g, ' ');

/** Ce que dit le lecteur d'ecran pour un jour : ses trois valeurs, ou « pas de donnée » */
export function a11yJourAnneaux(a: AnneauxJour, aujourdhui: string): string {
  const nom = a.date === aujourdhui ? `Aujourd’hui, ${jourA11y(a.date)}` : jourA11y(a.date);
  if (a.futur) return `${nom} : jour à venir`;
  if (!aUneDonnee(a)) return `${nom} : pas de donnée`;
  const pas = a.pas !== null ? `${entier(a.pas)} pas` : 'pas : pas de donnée';
  const ex = a.exercice !== null ? `${entier(a.exercice)} minutes d’exercice` : 'exercice : pas de donnée';
  const kcal = a.kcal !== null ? `${entier(a.kcal)} kilocalories` : 'calories : pas de donnée';
  return `${nom} : ${pas}, ${ex}, ${kcal}`;
}

export function RangeeSemaine({ jours, choisi, aujourdhui, objectifs, onChoisir }: { jours: AnneauxJour[]; choisi: string; aujourdhui: string; objectifs: ObjectifsSante | null | undefined; onChoisir: (iso: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', marginHorizontal: -6 }} accessibilityRole="tablist">
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
            accessibilityHint={a.futur ? undefined : 'Affiche les données de ce jour dans la carte'}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 44,
              minHeight: 62,
              marginHorizontal: 1,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              backgroundColor: sel ? P.accentSoft : pressed ? P.paper : 'transparent',
              opacity: a.futur ? 0.4 : 1,
            })}
          >
            <Ink size={11} weight={sel ? 'black' : 'extraBold'} color={sel ? P.accent : P.ink2}>
              {LETTRES_JOURS[i] ?? ''}
            </Ink>
            <MiniAnneaux parts={partsAnneaux(a, objectifs)} taille={28} futur={a.futur} />
            {/* aujourd'hui : un point sous l'anneau (reserve aussi pour les autres jours, tout reste aligne) */}
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: auj ? P.accent : 'transparent' }} />
          </Pressable>
        );
      })}
    </View>
  );
}
