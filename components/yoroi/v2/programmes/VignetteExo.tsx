/**
 * La vignette d'un exercice dans une liste (1er novembre 2026). L'ordre vient de lib/v2/programmes/visuelExo.ts
 * (ordreVisuels) : en mode créateur le GIF Gym visual, sinon notre animation maison, sinon Everkinetic en fondu,
 * sinon l'illustration de sa machine, sinon le sticker de son groupe musculaire ; hors mode créateur, la même suite
 * sans Gym visual. Aucune logique d'ordre ici.
 * Jamais de case vide. `numero` : le rang de l'exercice, posé en petite pastille sur le coin.
 */
import React from 'react';
import { DeviceEventEmitter, Image, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DemoPaire, FOND_DEMO } from '@/components/yoroi/v2/seance/ExoDemo';
import { CarreSticker } from '@/components/yoroi/v2/seances/kitA';
import { DEMOS_CHANGEES, sourceDemosChoisie } from '@/lib/v2/programmes/demosTest';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { visuelExo } from '@/lib/v2/programmes/visuelExo';
import { traduire } from '@/lib/i18n/tr';

/**
 * Les GIF Gym visual autorisés ici ? Le mode créateur est lu avec useCreatorMode, le même drapeau que le Studio
 * (app/creator-mode.tsx) et le Premium créateur, plus le choix « Animations de test » du Studio. Avant (1er novembre
 * 2026), les vignettes lisaient seulement le drapeau interne de demosTest.ts : s'il ne suivait pas le mode créateur,
 * aucune animation ne sortait alors que le Studio était ouvert.
 */
export function useAnimationsTest(): boolean {
  const { isCreator } = useCreatorMode();
  // le choix du Studio, relu à chaque changement (même quand le drapeau interne reste fermé)
  const [choix, setChoix] = React.useState(sourceDemosChoisie());
  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DEMOS_CHANGEES, () => setChoix(sourceDemosChoisie()));
    setChoix(sourceDemosChoisie());
    return () => sub.remove();
  }, []);
  return isCreator && choix !== 'aucune';
}

export function VignetteExo({ nom, muscle, cardio = false, taille = 56, arrondi, numero }: {
  nom: string;
  muscle?: string | null;
  cardio?: boolean;
  taille?: number;
  arrondi?: number;
  numero?: number;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const test = useAnimationsTest();
  const v = React.useMemo(() => visuelExo(nom, muscle, cardio, test), [nom, muscle, cardio, test]);
  const r = arrondi ?? Math.round(taille * 0.3);
  let dessin: React.ReactNode;
  if (v.type === 'animation') {
    dessin = <DemoPaire images={v.images} label={traduire('Animation de l’exercice {0}', traduire(nom))} taille={taille} arrondi={r} bordure={false} contenir />;
  } else if (v.type === 'machine') {
    dessin = (
      <View style={{ width: taille, height: taille, borderRadius: r, backgroundColor: FOND_DEMO, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Image source={v.image} style={{ width: taille * 0.92, height: taille * 0.92 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  } else {
    dessin = <CarreSticker nom={v.sticker} teinte={v.teinte} taille={taille} rayon={r} />;
  }
  return (
    <View style={{ width: taille, height: taille }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {dessin}
      {numero !== undefined ? (
        <View style={{ position: 'absolute', top: -5, left: -5, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: c.primary, borderWidth: 2, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={11} weight="black" color={c.onPrimary} style={{ fontVariant: ['tabular-nums'] }}>{String(numero)}</Ink>
        </View>
      ) : null}
    </View>
  );
}
