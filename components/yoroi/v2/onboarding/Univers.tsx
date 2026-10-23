/**
 * Vague 45 : ecran 4 « Ton univers », juste apres le choix du genre. Trois grandes cartes illustrees :
 * Japon (le Guerrier ou la Guerriere au premier rang, dans le Dojo), Classique (le Sportif ou la Sportive
 * au premier rang, dans la salle de sport) et Sans personnage (la scene seule). Japon est preselectionne.
 * Le choix est garde dans le brouillon et enregistre a la fin avec le reste (lib/v2/onboarding/save.ts).
 */
import React from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { guerrierImage, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { CLASSIQUE_IMAGES } from '@/lib/v2/dojo/personnages';
import { UNIVERS_CHOIX } from '@/lib/v2/dojo/univers';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { ChoiceCard, MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

/** Decor et personnage de chaque carte */
export function illustrationUnivers(choix: ChoixUnivers, genre: 'h' | 'f'): { scene: ImageSourcePropType; perso: ImageSourcePropType | null } {
  if (choix === 'japon') return { scene: sceneMeta('dojo').image, perso: guerrierImage(genre, 0) };
  if (choix === 'classique') return { scene: sceneMeta('classique_salle_jour').image, perso: CLASSIQUE_IMAGES[genre][0] };
  return { scene: sceneMeta('classique_salle_jour').image, perso: null };
}

function Carte({ choix, nom, phrase, genre, selected, onPress, height }: { choix: ChoixUnivers; nom: string; phrase: string; genre: 'h' | 'f'; selected: boolean; onPress: () => void; height: number }) {
  const c = useColors();
  const { scene, perso } = illustrationUnivers(choix, genre);
  return (
    <View style={{ gap: 6 }}>
      <ChoiceCard selected={selected} onPress={onPress} label={`${nom}. ${phrase}`} height={height}>
        <Image source={scene} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
        {perso ? (
          <Image source={perso} resizeMode="contain" style={{ position: 'absolute', right: 10, bottom: 0, width: Math.round(height * 0.78), height: height - 8 }} accessibilityIgnoresInvertColors />
        ) : null}
        <View style={{ position: 'absolute', left: 12, bottom: 12, backgroundColor: selected ? c.accent : c.surface, borderWidth: selected ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 16, minHeight: 36, justifyContent: 'center' }}>
          <Ink size={15} weight="extraBold" color={selected ? c.onAccent : c.ink}>{nom}</Ink>
        </View>
      </ChoiceCard>
      <Ink size={13} weight={selected ? 'bold' : 'medium'} color={selected ? c.ink : c.textSecondary} style={{ paddingHorizontal: 4, lineHeight: 18 }}>{phrase}</Ink>
    </View>
  );
}

export function Univers({ nav, genre, value, onPick, onNext }: { nav: Nav; genre: 'h' | 'f'; value: ChoixUnivers; onPick: (v: ChoixUnivers) => void; onNext: () => void }) {
  const { height } = useWindowDimensions();
  const cardH = Math.max(112, Math.min(150, Math.round((height - 400) / 3)));
  return (
    <Shell {...nav} title={traduire("Ton **univers**")} sub={traduire("Le décor et le personnage qui t’accompagnent. Tu pourras changer dans Réglages, Personnaliser.")} gap={14} footer={<MainButton label="Continuer" onPress={onNext} />}>
      {UNIVERS_CHOIX.map((u) => (
        <Carte key={u.id} choix={u.id} nom={u.nom} phrase={u.phrase} genre={genre} selected={value === u.id} onPress={() => onPick(u.id)} height={cardH} />
      ))}
    </Shell>
  );
}

export default Univers;
