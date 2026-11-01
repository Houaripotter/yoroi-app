/**
 * Indices du corps dans Progres Corps (1er novembre 2026, demandes AT point 4 et AU point 2) :
 * moyenne de ton poids sur 7 jours (bien visible), tour de taille sur taille (WHtR) avec son repere 0,5,
 * FFMI et FFMI normalise, rapport epaules sur taille. Seulement avec tes vraies mesures ; la formule et la source
 * sont dans la petite aide (lib/v2/mesures/indices.ts). Une carte sans donnee n'apparait que si ton niveau
 * (« Ce que tu suis ») la prevoit, comme invitation a mesurer.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { toDailySeries } from '@/lib/v2/weightStats';
import { epaulesSurTaille, ffmi, masseMaigre, moyenne7Jours, SEUIL_WHTR, whtr } from '@/lib/v2/mesures/indices';
import { parseScaleJson } from '@/lib/v2/balance/format';
import type { Weight } from '@/lib/database';
import type { MeasurePoint } from '@/lib/v2/progres/measures';
import { voirBloc } from '@/lib/v2/mesures/niveauSuivi';
import type { NiveauSuivi } from '@/lib/v2/mesures/niveauSuivi';
import { dayShort } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';
import { Aide, Carte, Lien, nb, TitreCarte } from './kit';

function derniere(points: MeasurePoint[], k: 'waist' | 'shoulders'): { v: number; date: string } | undefined {
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i][k];
    if (v && v > 0) return { v, date: points[i].date };
  }
  return undefined;
}

/** Bouton « ? » qui deplie l'aide (formule et source) */
function AideRepliee({ texte }: { texte: string }) {
  const { theme } = useYoroiTheme();
  const [ouvert, setOuvert] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Pressable onPress={() => setOuvert((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: ouvert }} hitSlop={6} style={{ minHeight: 32, justifyContent: 'center' }}>
        <Ink size={12.5} weight="extraBold" color={theme.colors.accent}>{ouvert ? traduire('Masquer le calcul') : traduire('Le calcul et sa source')}</Ink>
      </Pressable>
      {ouvert ? <Aide>{texte}</Aide> : null}
    </View>
  );
}

export function MoyenneSeptJours({ pesees }: { pesees: Weight[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const m = useMemo(() => moyenne7Jours(toDailySeries(pesees)), [pesees]);
  if (!m) return null;
  return (
    <Carte>
      <TitreCarte sticker="balance" titre={traduire('Moyenne sur 7 jours')} sous={traduire('{0} pesées, du {1} au {2}', m.n, dayShort(m.depuis), dayShort(m.jusqua))} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Ink size={34} weight="black" tight>{`${nb(m.valeur, 1)} kg`}</Ink>
        {m.ecart !== undefined ? (
          <Ink size={14} weight="bold" color={c.textSecondary}>
            {Math.abs(m.ecart) < 0.05 ? traduire('stable sur la semaine d’avant') : traduire('{0} kg sur la semaine d’avant', `${m.ecart > 0 ? '+' : '−'} ${nb(Math.abs(m.ecart), 1)}`)}
          </Ink>
        ) : null}
      </View>
      <Aide>{traduire('La moyenne lisse l’eau du jour : c’est elle qu’il faut regarder, plus que la pesée du matin.')}</Aide>
    </Carte>
  );
}

export function IndicesCorps({ pesees, mensurations, tailleCm, niveau }: { pesees: Weight[]; mensurations: MeasurePoint[]; tailleCm?: number | null; niveau: NiveauSuivi }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const tour = derniere(mensurations, 'waist');
  const ep = derniere(mensurations, 'shoulders');
  const w = whtr(tour?.v, tailleCm);
  const maigre = useMemo(() => {
    const tri = [...pesees].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));
    for (const p of tri) {
      const j = parseScaleJson(p.scale_extras);
      const m = masseMaigre({ masseMaigreKg: j?.mesures?.masse_maigre_kg, poidsKg: p.weight, graissePct: p.fat_percent });
      if (m) return { ...m, date: String(p.date).slice(0, 10) };
    }
    return undefined;
  }, [pesees]);
  const f = ffmi(maigre?.kg, tailleCm);
  const est = epaulesSurTaille(ep?.v, tour?.v);

  const cartes: React.ReactNode[] = [];
  if (w) {
    cartes.push(
      <Carte key="whtr">
        <TitreCarte sticker="metre_ruban" titre={traduire('Tour de taille sur taille')} sous={traduire('{0} cm de tour de taille le {1}, pour {2} cm', nb(tour!.v, 1), dayShort(tour!.date), Math.round(tailleCm!))} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <Ink size={30} weight="black" tight>{nb(w.valeur, 2)}</Ink>
          <View style={{ paddingHorizontal: 10, minHeight: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: w.sain ? c.successTint : c.fillSubtle }}>
            <Ink size={12.5} weight="extraBold" color={w.sain ? c.successText : c.ink}>{w.sain ? traduire('sous 0,5, zone saine') : traduire('au-dessus de 0,5')}</Ink>
          </View>
        </View>
        <Aide>{traduire('Repère : garde ton tour de taille sous la moitié de ta taille. En dessous de {0}, c’est la zone saine couramment citée.', nb(SEUIL_WHTR, 1))}</Aide>
        <AideRepliee texte={traduire('Calcul : tour de taille en cm divisé par ta taille en cm. Sources : Ashwell, Gunn et Gibson, Obesity Reviews 2012 (méta-analyse) ; NICE, guide sur l’obésité CG189, mis à jour en 2022.')} />
      </Carte>,
    );
  } else if (voirBloc(niveau, 'whtr', false)) {
    cartes.push(
      <Carte key="whtr">
        <TitreCarte sticker="metre_ruban" titre={traduire('Tour de taille sur taille')} sous={!tailleCm ? traduire('Il faut ta taille dans ton profil et un tour de taille.') : traduire('Il manque un tour de taille.')} />
        <Lien label={!tailleCm ? traduire('Ajouter ma taille') : traduire('Mesurer mon tour de taille')} onPress={() => router.push((!tailleCm ? '/profile' : '/measurements') as never)} />
      </Carte>,
    );
  }
  if (f) {
    cartes.push(
      <Carte key="ffmi">
        <TitreCarte sticker="muscle" titre={traduire('Indice de masse maigre (FFMI)')} sous={traduire('{0} kg de masse maigre le {1}, {2}', nb(maigre!.kg, 1), dayShort(maigre!.date), maigre!.mesuree ? traduire('mesurée par ta balance') : traduire('calculée avec ta masse grasse'))} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <Ink size={30} weight="black" tight>{nb(f.ffmi, 1)}</Ink>
          <Ink size={14} weight="bold" color={c.textSecondary}>{traduire('{0} ramené à 1,80 m', nb(f.normalise, 1))}</Ink>
        </View>
        <AideRepliee texte={traduire('Calcul : masse maigre en kg divisée par ta taille en mètres au carré. Version normalisée : FFMI + 6,1 × (1,8 − ta taille en m). Source : Kouri, Pope, Katz et Oliva, Clinical Journal of Sport Medicine 1995.')} />
      </Carte>,
    );
  } else if (voirBloc(niveau, 'ffmi', false)) {
    cartes.push(
      <Carte key="ffmi">
        <TitreCarte sticker="muscle" titre={traduire('Indice de masse maigre (FFMI)')} sous={traduire('Il faut ta taille et une pesée avec ta masse grasse ou ta masse maigre.')} />
      </Carte>,
    );
  }
  if (est) {
    cartes.push(
      <Carte key="ep">
        <TitreCarte sticker="pecs" titre={traduire('Épaules sur taille')} sous={traduire('{0} cm d’épaules, {1} cm de taille', nb(ep!.v, 1), nb(tour!.v, 1))} />
        <Ink size={30} weight="black" tight>{nb(est, 2)}</Ink>
        <AideRepliee texte={traduire('Calcul : tour d’épaules divisé par tour de taille. Un simple rapport de silhouette, sans seuil de santé.')} />
      </Carte>,
    );
  }
  if (!cartes.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <Ink size={11} weight="black" color={c.textSecondary} style={{ letterSpacing: 1.4 }}>{traduire('Tes repères').toUpperCase()}</Ink>
      {cartes}
    </View>
  );
}
