/**
 * Fenetres plein ecran du Studio, par-dessus tout : ecran de chargement (rejouable), passage de
 * chaque rang, dan, plaque, sceaux, Lune du mois, bienvenue des anciens. Donnees fictives : rien
 * n'est ecrit, ni XP, ni sceau, ni repere de fenetre vue.
 */
import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { RoundButton } from '@/components/yoroi/v2/espace/ui';
import { personnageImage, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { EcranChargement } from '@/components/yoroi/v2/chargement/Chargement';
import { Celebration } from '@/components/yoroi/v2/dojo/Celebration';
import { Bienvenue } from '@/components/yoroi/v2/dojo/Bienvenue';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { DAN_STEP, RANKS, rankFor, todayIso } from '@/lib/v2/armure';
import type { SealView, WelcomeSummary } from '@/lib/v2/armure';
import { LUNE, SEALS } from '@/lib/v2/dojo/seals';
import type { StudioOverlay } from './parts';

/** Chiffres fictifs, pour voir l'ecran rempli */
export const FAKE_WELCOME: WelcomeSummary = {
  seances: 128,
  pesees: 64,
  records: 9,
  semaines: 22,
  quetesXp: 400,
  badges: 6,
  badgesXp: 300,
  rankTitle: 'Samouraï',
  rankIndex: 2,
  seals: 7,
  mainSport: { name: 'Jiu-jitsu brésilien', level: 'Ceinture bleue', count: 74 },
  xp: 3400,
};

function fakeSeals(n: number): SealView[] {
  return SEALS.slice(0, n).map((d) => ({ id: d.id, family: d.family, name: d.name, kanji: '', condition: d.condition, earned: true, earnedAt: todayIso(), current: 1, target: 1 }));
}

const LUNE_VIEW: SealView = { id: LUNE.id, family: 'regularite', name: LUNE.name, kanji: '', condition: LUNE.condition, earned: true, earnedAt: todayIso(), current: LUNE.weeks, target: LUNE.weeks };

export function StudioOverlays({ overlay, onClose }: { overlay: StudioOverlay | null; onClose: () => void }) {
  const { espace } = useEspace();
  const image = (i: number) => personnageImage(espace.personnage, i);
  const kind = overlay?.kind ?? null;

  const rankUp =
    overlay?.kind === 'rang'
      ? rankFor(RANKS[Math.max(0, Math.min(RANKS.length - 1, overlay.rankIndex))].minXp)
      : overlay?.kind === 'dan'
        ? rankFor(RANKS[RANKS.length - 1].minXp + DAN_STEP * 2)
        : null;
  const celebration = kind === 'rang' || kind === 'dan' || kind === 'plaque' || kind === 'sceaux' || kind === 'lune';

  return (
    <>
      <Celebration
        visible={celebration}
        rankUp={rankUp}
        seals={kind === 'sceaux' ? fakeSeals(3) : kind === 'lune' ? [LUNE_VIEW] : []}
        recap={false}
        plate={kind === 'plaque' ? { index: 2, earned: 2, total: 3 } : null}
        xp={kind === 'plaque' ? RANKS[1].minXp + 1200 : rankUp?.minXp ?? 0}
        image={image(rankUp ? rankUp.index : 1)}
        onClose={onClose}
      />
      <Bienvenue visible={kind === 'bienvenue'} summary={kind === 'bienvenue' ? FAKE_WELCOME : null} image={image(2)} scene={sceneMeta(espace.scene).image} onClose={onClose} />
      <ChargementPlein visible={kind === 'chargement'} onClose={onClose} />
    </>
  );
}

/** EcranChargement en plein ecran : touche l'ecran pour le rejouer, la croix ferme */
function ChargementPlein({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [run, setRun] = useState(0);
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Pressable style={{ flex: 1 }} onPress={() => setRun((n) => n + 1)} accessibilityRole="button" accessibilityLabel="Rejouer l’écran de chargement">
          <EcranChargement key={run} />
        </Pressable>
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundButton icon="close" label="Fermer" onPress={onClose} />
          <View style={{ backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Ink size={12} weight="extraBold" color={c.background}>Touche l’écran pour rejouer</Ink>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default StudioOverlays;
