/**
 * Studio, rubrique Ambiance : la scene et le personnage, l'horloge de developpement (devNow,
 * en memoire seulement) avec ses prereglages, et la taille du texte.
 * L'horloge ne se regle que sur Heny : le moteur d'XP lit le jour courant et le registre ne
 * redescend jamais, tes vraies XP ne doivent donc jamais voir une fausse date.
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Row } from '@/components/yoroi/v2/espace/ui';
import { useTheme } from '@/lib/ThemeContext';
import type { FontSizeLevel } from '@/lib/fontScaleManager';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { DEV_CLOCK_CHANGED, devNowMs, getDevClockOffset, setDevClockOffset } from '@/lib/v2/creator/devClock';
import { formatDateTime } from '@/lib/v2/creator/deviceInfo';
import { Chip, ChipWrap, Note, StudioSection, useStudio } from './parts';
import { traduire } from '@/lib/i18n/tr';

const H = 3600 * 1000;
const D = 24 * H;
export const CLOCK_PRESETS: { label: string; ms: number; a11y: string }[] = [
  { label: traduire('Maintenant'), ms: 0, a11y: traduire('Revenir à l’heure réelle') },
  { label: traduire('moins 3 h'), ms: -3 * H, a11y: traduire('Reculer de 3 heures') },
  { label: '+3 h', ms: 3 * H, a11y: traduire('Avancer de 3 heures') },
  { label: '+12 h', ms: 12 * H, a11y: traduire('Avancer de 12 heures') },
  { label: traduire('Demain'), ms: D, a11y: traduire('Avancer d’un jour') },
  { label: traduire('+3 jours'), ms: 3 * D, a11y: traduire('Avancer de 3 jours') },
  { label: traduire('+7 jours'), ms: 7 * D, a11y: traduire('Avancer de 7 jours') },
];

const TEXT_SIZES: { level: FontSizeLevel; label: string }[] = [
  { level: 1, label: traduire('Petite') },
  { level: 2, label: traduire('Normale') },
  { level: 3, label: traduire('Grande') },
  { level: 4, label: traduire('Très grande') },
];

function offsetText(ms: number): string {
  if (ms === 0) return traduire('Heure réelle');
  const sign = ms > 0 ? traduire('En avance de') : traduire('En retard de');
  const abs = Math.abs(ms);
  const days = Math.floor(abs / D);
  const hours = Math.round((abs % D) / H);
  const parts = [days ? `${days} jour${days > 1 ? 's' : ''}` : '', hours ? `${hours} h` : ''].filter(Boolean);
  return `${sign} ${parts.join(' et ')}`;
}

export function Ambiance() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { demoActive, openSection } = useStudio();
  const { fontSizeLevel, setFontSizeLevel } = useTheme();
  const [offset, setOffset] = useState(getDevClockOffset());
  const [now, setNow] = useState(devNowMs());

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DEV_CLOCK_CHANGED, () => {
      setOffset(getDevClockOffset());
      setNow(devNowMs());
    });
    const t = setInterval(() => setNow(devNowMs()), 15000);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, []);

  // sans demo, l'horloge revient a l'heure reelle
  useEffect(() => {
    if (!demoActive && getDevClockOffset() !== 0) setDevClockOffset(0);
  }, [demoActive]);

  const apply = (ms: number) => {
    if (!demoActive) return;
    setDevClockOffset(ms);
    setOffset(getDevClockOffset());
    setNow(devNowMs());
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  };

  return (
    <StudioSection id="ambiance" icon="sun" title={traduire("Ambiance")} sub={traduire("Scène, personnage, horloge de test, taille du texte")} keywords="scene decor personnage avatar horloge heure date devnow demain taille texte police">
      <Card>
        <Row first icon="image" label={traduire("Scène")} sub={traduire("Le décor de ton accueil")} onPress={() => router.push('/themes' as never)} />
        <Row icon="user" label={traduire("Personnage")} sub={traduire("Guerrier, guerrière et personnages du monde")} onPress={() => router.push('/avatar-selection' as never)} />
      </Card>

      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Ink size={15} weight="extraBold">{traduire("Horloge de test")}</Ink>
          <Ink size={22} weight="black" tight>{formatDateTime(now)}</Ink>
          <Ink size={13} weight="bold" color={offset === 0 ? c.textMuted : c.accent}>{offsetText(offset)}</Ink>
        </View>
        {demoActive ? (
          <ChipWrap>
            {CLOCK_PRESETS.map((s) => (
              <Chip key={s.label} label={traduire(s.label)} accessibilityLabel={s.a11y} on={s.ms === offset} onPress={() => apply(s.ms)} />
            ))}
          </ChipWrap>
        ) : (
          <View style={{ gap: 8 }}>
            <Ink size={13} color={c.textSecondary}>{traduire("Charge Heny pour décaler l’heure. Le moteur d’XP lit la date du jour : tes vraies XP ne verront jamais une fausse date.")}</Ink>
            <Chip label={traduire("Aller à Démo et captures")} onPress={() => openSection('demo')} />
          </View>
        )}
      </Card>
      <Note>{traduire("Le jour de l’armure, les semaines, la semaine des séances et l’accueil suivent cette horloge. Le reste de l’app garde l’heure réelle. Elle revient à l’heure réelle à la fermeture de l’app ou quand tu remets tes vraies données.")}</Note>

      <Card style={{ padding: 14, gap: 10 }}>
        <Ink size={15} weight="extraBold">{traduire("Taille du texte")}</Ink>
        <ChipWrap>
          {TEXT_SIZES.map((t) => (
            <Chip key={t.level} label={traduire(t.label)} on={(fontSizeLevel ?? 2) === t.level} onPress={() => void setFontSizeLevel(t.level)} />
          ))}
        </ChipWrap>
        <Note>{traduire("Pour vérifier qu’aucun écran ne se casse. C’est le vrai réglage de l’app, remets Normale après.")}</Note>
      </Card>
    </StudioSection>
  );
}

export default Ambiance;
