/**
 * Les modules d'un programme en grandes tuiles à cocher (26 octobre 2026), partagés par le questionnaire
 * (Questionnaire.tsx) et le départ avec ton coach (app/coach-depart.tsx). Les textes viennent de modules.ts.
 * Deux par ligne. 27 octobre 2026 (maquette Coach-Programme) : tuiles pastel, sticker ou petit carré, un interrupteur
 * dessiné ; cochée : bleu très pâle, bord doux, interrupteur menthe. Plus d'indigo plein.
 * 26 octobre 2026 : `onPourquoi` ajoute « Pourquoi ? » sous chaque tuile (la science du module, Pourquoi.tsx).
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { famillePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { BoutonPourquoi } from '@/components/yoroi/v2/programmes/Pourquoi';
import type { ModuleId, ModuleInfo } from '@/lib/v2/programmes/modules';
import { traduire } from '@/lib/i18n/tr';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

/** 27 octobre 2026 : le sticker de chaque module, a la place du carré d'icône (reglage Illustrations) */
const STICKER_MODULE: Record<string, NomSticker> = {
  force: 'force_eclair',
  grip: 'grip',
  cou: 'cou',
  abdos: 'abdos',
  cardio: 'cardio_zone2',
  mobilite: 'mobilite',
};

export function GrilleModules({ possibles, modules, onBasculer, onPourquoi }: { possibles: readonly ModuleInfo[]; modules: readonly ModuleId[]; onBasculer: (m: ModuleId) => void; onPourquoi?: (m: ModuleId) => void }) {
  const pa = usePastel();
  const illus = useIllustrations();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {possibles.map((m, k) => {
        const on = modules.includes(m.id);
        const f = famillePastel(pa, k + 2);
        const st = illus.stickers ? STICKER_MODULE[m.id] : undefined;
        return (
          <Pressable
            key={m.id}
            onPress={() => onBasculer(m.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${traduire(m.label)}, ${traduire(m.sous)}`}
            style={({ pressed }) => ({
              width: '47%',
              flexGrow: 1,
              minHeight: 124,
              borderRadius: 22,
              padding: 12,
              gap: 6,
              backgroundColor: on ? pa.choisi : f.fond,
              borderWidth: 1.5,
              borderColor: on ? pa.bordChoisi : 'transparent',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              {st ? (
                <Image source={illus.img(st)} style={{ width: 44, height: 44, marginTop: -3, marginLeft: -3 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={m.icone} size={18} color={f.titre} />
                </View>
              )}
              {/* l'interrupteur des maquettes, dessiné : la tuile entière reste la case à cocher */}
              <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: 44, height: 26, borderRadius: 13, padding: 3, backgroundColor: on ? pa.menthe.barre : pa.carte, alignItems: on ? 'flex-end' : 'flex-start' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: on ? pa.carte : pa.ligne }} />
              </View>
            </View>
            <Ink size={15} weight="black" tight color={pa.texte} numberOfLines={2}>{traduire(m.label)}</Ink>
            <Ink size={12} weight="bold" color={pa.texte2} numberOfLines={2}>{traduire(m.sous)}</Ink>
            {onPourquoi ? <View style={{ marginTop: 'auto', paddingTop: 2 }}><BoutonPourquoi label={traduire(m.label)} onPress={() => onPourquoi(m.id)} /></View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
