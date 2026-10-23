/**
 * Ta forme du jour (vague 36) : quatre petites tuiles en grille 2 x 2, chacune avec sa vraie valeur
 * et une mini-indication, chacune ouvre son ecran. Recuperation (score et mot), Sommeil (derniere nuit),
 * Eau (avec la jauge), Mensurations (tour de taille et ecart depuis le debut).
 * Une tuile sans donnee dit « Ajouter » et ouvre la saisie : plus aucun faux exemple grise sur l'accueil.
 * Memes sources que les anciens blocs (lib/v2/accueil/forme, sleepService, hydration, progres/measures).
 * Vague 37 : la tuile Eau ouvre une feuille pour ajouter ET retirer (FeuilleEau), le detail reste a un toucher.
 */
import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { SleepEntry } from '@/lib/sleepService';
import type { FormeResult } from '@/lib/v2/accueil/forme';
import { formatMinutes } from '@/lib/v2/accueil/forme';
import { formatLiters } from '@/lib/v2/accueil/hydration';
import { relativeDay } from '@/lib/v2/accueil/home';
import { useMeasuresData } from '@/lib/v2/progres/useProgresData';
import { viewSeries } from '@/lib/v2/progres/measures';
import { Icon, P, Press, useAccent } from './kit';
import { FeuilleEau } from './EauFeuille';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { DECIMAL } from '@/lib/i18n/tr';

type IconKey = 'bolt' | 'moon' | 'drop' | 'body';

// mensurations : toujours 1 decimale, comme Progres (vague 32)
const cm = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);

function Tuile({ width, icon, iconColor, label, value, unit, hint, hintColor, gauge, empty, onPress, a11y }: {
  width: number;
  icon: IconKey;
  iconColor: string;
  label: string;
  value?: string;
  unit?: string;
  hint?: string;
  hintColor?: string;
  gauge?: number;
  empty?: string;
  onPress: () => void;
  a11y: string;
}) {
  const { accent } = useAccent();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}>
      <View style={{ width, minHeight: 104, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 14, paddingVertical: 12, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={icon} size={15} color={iconColor} width={2.4} />
          <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
            {label}
          </Ink>
        </View>
        {empty ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={14} color={accent} width={3} />
              </View>
              <Ink size={15} weight="black" color={accent}>
                Ajouter
              </Ink>
            </View>
            <Ink size={12} weight="medium" color={P.muted} numberOfLines={2} style={{ marginTop: 4 }}>
              {empty}
            </Ink>
          </View>
        ) : (
          <>
            <Ink size={24} weight="black" tight numberOfLines={1}>
              {value}
              {unit ? (
                <Ink size={13} weight="bold" color={P.muted}>
                  {unit}
                </Ink>
              ) : null}
            </Ink>
            {gauge !== undefined ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: P.line2, overflow: 'hidden', marginTop: 2 }}>
                <View style={{ width: `${Math.round(Math.max(0, Math.min(1, gauge)) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: P.water }} />
              </View>
            ) : null}
            {hint ? (
              <Ink size={12} weight="extraBold" color={hintColor ?? P.ink2} numberOfLines={1}>
                {hint}
              </Ink>
            ) : null}
          </>
        )}
      </View>
    </Press>
  );
}

export function FormeDuJour({ forme, sleep, sleepGoal, water, waterGoal }: { forme: FormeResult | null; sleep: SleepEntry[]; sleepGoal: number; water: number; waterGoal: number }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const w = Math.floor((width - 44 - 10) / 2);
  const { points } = useMeasuresData();
  const taille = useMemo(() => viewSeries(points, 'waist'), [points]);
  const [eauOuverte, setEauOuverte] = useState(false);

  const hasForme = !!(forme && forme.score !== null && forme.level);
  const night = sleep[0];
  const reachedSleep = night ? night.duration >= sleepGoal : false;
  const reachedWater = waterGoal > 0 && water >= waterGoal;
  const lastT = taille[taille.length - 1];
  const dT = taille.length > 1 ? taille[taille.length - 1].value - taille[0].value : null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
      {hasForme && forme && forme.level ? (
        <Tuile
          width={w}
          icon="bolt"
          iconColor={forme.level.color}
          label="Récupération"
          value={String(forme.score)}
          unit=" / 100"
          hint={forme.level.label}
          hintColor={forme.level.color}
          onPress={() => router.push('/readiness-detail' as any)}
          a11y={`Ta récupération : ${forme.score} sur 100, ${forme.level.label}. Voir le détail`}
        />
      ) : (
        <Tuile width={w} icon="bolt" iconColor={P.muted} label="Récupération" empty="note ta nuit pour la voir" onPress={() => router.push('/sleep-input' as any)} a11y="Récupération : ajouter ta nuit pour la calculer" />
      )}

      {night ? (
        <Tuile
          width={w}
          icon="moon"
          iconColor={P.indigo}
          label="Sommeil"
          value={formatMinutes(night.duration)}
          hint={reachedSleep ? 'objectif atteint' : `il manque ${formatMinutes(sleepGoal - night.duration)}`}
          hintColor={reachedSleep ? P.mossText : P.ink2}
          onPress={() => router.push('/sleep' as any)}
          a11y={`Ton sommeil, ${relativeDay(night.date)} : ${formatMinutes(night.duration)}. Voir le détail`}
        />
      ) : (
        <Tuile width={w} icon="moon" iconColor={P.muted} label="Sommeil" empty="ta dernière nuit" onPress={() => router.push('/sleep-input' as any)} a11y="Sommeil : ajouter ta nuit" />
      )}

      <TourAnchor id="accueil.eau">
      <Tuile
        width={w}
        icon="drop"
        iconColor={P.water}
        label="Eau du jour"
        value={`${formatLiters(water)} L`}
        unit={` / ${formatLiters(waterGoal)} L`}
        gauge={waterGoal > 0 ? water / waterGoal : 0}
        hint={reachedWater ? 'objectif atteint' : `encore ${formatLiters(Math.max(0, waterGoal - water))} L`}
        hintColor={reachedWater ? P.mossText : P.ink2}
        onPress={() => setEauOuverte(true)}
        a11y={`Ton eau du jour : ${formatLiters(water)} litre sur ${formatLiters(waterGoal)}. Touche pour ajouter ou retirer de l’eau`}
      />
      </TourAnchor>

      {lastT ? (
        <Tuile
          width={w}
          icon="body"
          iconColor={P.ink2}
          label="Tour de taille"
          value={cm(lastT.value)}
          unit=" cm"
          hint={dT === null ? 'ta première mesure' : Math.abs(dT) < 0.05 ? 'stable' : `${dT < 0 ? '−' : '+'}${cm(Math.abs(dT))} cm au total`}
          hintColor={dT !== null && dT < -0.05 ? P.mossText : P.ink2}
          onPress={() => router.push({ pathname: '/measurements-detail', params: { field: 'waist' } } as any)}
          a11y={`Tour de taille : ${cm(lastT.value)} centimètres. Voir tes mensurations`}
        />
      ) : (
        <Tuile width={w} icon="body" iconColor={P.muted} label="Mensurations" empty="ton tour de taille" onPress={() => router.push('/add-measurement' as any)} a11y="Mensurations : ajouter ton tour de taille" />
      )}
      <FeuilleEau visible={eauOuverte} onClose={() => setEauOuverte(false)} water={water} waterGoal={waterGoal} />
    </View>
  );
}
