/**
 * « Composition détaillée » (1er novembre 2026, demande AT, point 2), dans Progres Corps et dans le detail d'une
 * pesee : une carte par donnee presente (masse maigre, eau en kg et en L, muscle squelettique, proteines, poids cible,
 * champs de scale_extras et du sac des mesures), avec sa courbe des 3 points. Une donnee absente n'est pas affichee.
 * Plusieurs balances : la note « Les balances ne se comparent pas entre elles », un choix d'appareil, et une courbe
 * qui ne melange jamais deux appareils (lib/v2/mesures/compositionDetaillee.ts, pointsCourbe).
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { appareilsDe, donneesComposition, eauEnLitres, pointsCourbe } from '@/lib/v2/mesures/compositionDetaillee';
import type { DonneeCompo } from '@/lib/v2/mesures/compositionDetaillee';
import type { ContextePesee } from '@/lib/v2/mesures/contextePesee';
import type { MesureBrute } from '@/lib/v2/mesures/sac';
import type { Weight } from '@/lib/database';
import { sourceOf } from '@/lib/v2/seance/corps';
import { voirBloc } from '@/lib/v2/mesures/niveauSuivi';
import type { NiveauSuivi } from '@/lib/v2/mesures/niveauSuivi';
import { dayShort } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';
import { Aide, Carte, Lien, MiniCourbe, nb, Puce, TitreCarte } from './kit';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

const STICKER: Record<string, NomSticker> = {
  masse_maigre_kg: 'muscle',
  graisse_kg: 'pourcentage',
  muscle_squelettique_kg: 'force',
  muscle_squelettique_pct: 'force',
  eau_kg: 'vague',
  proteines_kg: 'nutrition',
  proteines_pct: 'nutrition',
  mineraux_kg: 'rocher',
  graisse_sous_cutanee_pct: 'pourcentage',
  ratio_eau_extracellulaire: 'vague',
  angle_de_phase: 'jauge',
  age_corporel: 'sablier',
  score_corporel: 'etoile',
  fc_repos: 'coeur',
  poids_ideal_kg: 'objectifs',
};

export function appareilLisible(source: string): string | null {
  return sourceOf(source).label ?? null;
}

function CarteDonnee({ d, appareil, focus }: { d: DonneeCompo; appareil: string | null; focus?: { date: string; peseeId?: number | null } }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const cible = focus ? d.points.find((x) => (focus.peseeId && x.peseeId === focus.peseeId) || x.date === focus.date) : undefined;
  const { points, appareil: app } = pointsCourbe(d, cible ? cible.appareil : appareil);
  if (!points.length) return null;
  const vise = focus ? points.find((p) => (focus.peseeId && p.peseeId === focus.peseeId) || p.date === focus.date) : undefined;
  if (focus && !vise) return null;
  const p = vise ?? points[points.length - 1];
  const eau = d.cle === 'eau_kg' ? traduire('soit {0} L', nb(eauEnLitres(p.valeur), 1)) : null;
  const unite = d.unite && d.unite !== 'niveau' ? ` ${traduire(d.unite)}` : '';
  const premier = points[0];
  const ecart = points.length >= 2 && !focus ? p.valeur - premier.valeur : null;
  const sous = [vise ? null : dayShort(p.date), app ? traduire('par {0}', app) : null, eau].filter(Boolean).join(', ');
  return (
    <Carte style={{ gap: 8 }}>
      <TitreCarte sticker={STICKER[d.cle] ?? (d.segment ? 'zones_corps' : 'donnees')} titre={traduire(d.label)} sous={sous || null} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Ink size={28} weight="black" tight>{`${nb(p.valeur, d.digits)}${unite}`}</Ink>
        {ecart !== null && Math.abs(ecart) >= 10 ** -d.digits ? (
          <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('{0} depuis le {1}', `${ecart > 0 ? '+' : '−'} ${nb(Math.abs(ecart), d.digits)}${unite}`, dayShort(premier.date))}</Ink>
        ) : null}
      </View>
      <MiniCourbe points={points.map((x) => ({ date: x.date, value: x.valeur }))} label={traduire(d.label)} digits={d.digits} />
      {points.length > 0 && points.length < 3 && !focus ? <Aide>{traduire('La courbe se dessine dès la troisième mesure.')}</Aide> : null}
    </Carte>
  );
}

export function CompositionDetaillee({
  pesees,
  contextes,
  brutes,
  niveau,
  focus,
}: {
  pesees: Weight[];
  contextes: ContextePesee[];
  brutes: MesureBrute[];
  niveau: NiveauSuivi;
  /** detail d'une pesee : seulement ses valeurs (la courbe garde tout l'historique du meme appareil) */
  focus?: { date: string; peseeId?: number | null };
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const donnees = useMemo(() => donneesComposition(pesees, contextes, brutes, appareilLisible), [pesees, contextes, brutes]);
  const appareils = useMemo(() => appareilsDe(donnees), [donnees]);
  const [choix, setChoix] = useState<string | null>(null);
  const plusieurs = appareils.length > 1;
  const visibles = focus ? donnees.filter((d) => d.points.some((p) => (focus.peseeId && p.peseeId === focus.peseeId) || p.date === focus.date)) : donnees;

  if (!visibles.length) {
    if (focus || !voirBloc(niveau, 'composition_detaillee', false)) return null;
    return (
      <Carte>
        <TitreCarte sticker="balance" titre={traduire('Composition détaillée')} sous={traduire('Masse maigre, eau, muscle squelettique, protéines : si ta balance les affiche, importe sa photo et YOROI les garde ici.')} />
        <Lien label={traduire('Importer une photo de balance')} onPress={() => router.push('/balance-photo' as never)} />
      </Carte>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Ink size={11} weight="black" color={c.textSecondary} style={{ letterSpacing: 1.4 }}>{traduire('Composition détaillée').toUpperCase()}</Ink>
      {plusieurs ? (
        <View style={{ gap: 8 }}>
          <Aide>{traduire('Les balances ne se comparent pas entre elles : chaque courbe reste sur un seul appareil.')}</Aide>
          {!focus ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Puce label={traduire('Le plus fourni')} on={choix === null} onPress={() => setChoix(null)} />
              {appareils.map((a) => (
                <Puce key={a} label={a} on={choix === a} onPress={() => setChoix(choix === a ? null : a)} />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}
      {visibles.map((d) => (
        <CarteDonnee key={d.cle} d={d} appareil={choix} focus={focus} />
      ))}
    </View>
  );
}
