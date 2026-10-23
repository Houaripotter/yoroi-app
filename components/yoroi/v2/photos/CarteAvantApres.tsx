/**
 * Carte avant et apres a partager (vague 39) : les deux photos, leurs dates,
 * l'ecart de poids et la duree, la marque YOROI discrete et la ligne d'adresse commune.
 * Dessinee sur le telephone et capturee en image : rien n'est envoye en ligne.
 * Toujours sur papier clair, quel que soit le theme, pour une image propre partout.
 * NUIT 14 : chaque photo garde le cadrage regle dans la comparaison (meme proportion que le comparateur).
 */
import React, { forwardRef } from 'react';
import { Image, View } from 'react-native';
import { Ink } from '../Ink';
import { SignatureCarte } from '../partage/SignatureCarte';
import type { Shot } from '../progres/BeforeAfter';
import { PhotoCadreeFixe } from './ComparateurCadre';
import type { Taille } from './ComparateurCadre';
import type { Cadre } from '@/lib/v2/photos/cadrage';
import { dateComplete, dureeTexte, ecartTexte, kg } from '@/lib/v2/photos/outils';
import { daysDiff } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';

const PAPIER = '#F2F1EC';
const ENCRE = '#1D2029';
const GRIS = '#6B6E78';
const INDIGO = '#2C4A84';

type Props = { before: Shot; after: Shot; width: number; cadres?: { avant: Cadre; apres: Cadre }; sizes?: { avant: Taille; apres: Taille } };

export const CarteAvantApres = forwardRef<View, Props>(function CarteAvantApres({ before, after, width, cadres, sizes }, ref) {
  const pad = Math.round(width * 0.055);
  const gap = Math.round(width * 0.025);
  const photoW = (width - pad * 2 - gap) / 2;
  // avec un cadrage : la proportion du comparateur (1,3), pour que la carte montre ce que tu as regle
  const photoH = photoW * (cadres ? 1.3 : 1.33);
  const days = Math.abs(daysDiff(before.date.slice(0, 10), after.date.slice(0, 10)));
  const diff = before.weight && after.weight && days > 0 ? after.weight - before.weight : null;
  const f = width / 340;

  return (
    <View ref={ref} collapsable={false} style={{ width, backgroundColor: PAPIER, padding: pad, borderRadius: 18 }}>
      <View style={{ flexDirection: 'row', gap }}>
        {[
          { s: before, word: traduire('Avant'), k: 'avant' as const },
          { s: after, word: traduire('Après'), k: 'apres' as const },
        ].map(({ s, word, k }) => (
          <View key={word} style={{ width: photoW, gap: 6 * f }}>
            {cadres && sizes ? (
              <PhotoCadreeFixe uri={s.uri} w={photoW} h={photoH} size={sizes[k]} cadre={cadres[k]} radius={12 * f} bg="#E2DFD8" />
            ) : (
              <Image source={{ uri: s.uri }} style={{ width: photoW, height: photoH, borderRadius: 12 * f, backgroundColor: '#E2DFD8' }} resizeMode="cover" />
            )}
            <View>
              <Ink size={11 * f} weight="extraBold" color={INDIGO}>{word}</Ink>
              <Ink size={12 * f} weight="bold" color={ENCRE} numberOfLines={1}>{dateComplete(s.date.slice(0, 10))}</Ink>
              {s.weight ? <Ink size={12 * f} color={GRIS} numberOfLines={1}>{kg(s.weight)}</Ink> : null}
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 * f }}>
        <View style={{ flexShrink: 1 }}>
          {diff !== null ? (
            <Ink size={30 * f} weight="black" tight color={ENCRE}>{ecartTexte(diff)}</Ink>
          ) : null}
          <Ink size={13 * f} weight="bold" color={GRIS}>{days === 0 ? traduire('le même jour') : `en ${dureeTexte(days)}`}</Ink>
        </View>
        <Ink size={12 * f} weight="extraBold" color={GRIS} style={{ letterSpacing: 2 * f }}>YOROI</Ink>
      </View>
      <SignatureCarte size={9 * f} color={GRIS} align="right" style={{ marginTop: 6 * f }} />
    </View>
  );
});
