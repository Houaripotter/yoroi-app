/**
 * Versions sans ecriture japonaise des briques d'ecran : DetailScreen sans filigrane,
 * EmptyState avec un ornement illustre choisi selon le contexte (torii par defaut), Hanko avec un pictogramme.
 * Le prop kanji reste accepte pour les anciens appels, il est ignore.
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, DetailScreen as KitDetailScreen, P } from '@/components/yoroi/v2/accueil/kit';
import type { GlyphKind } from './Glyph';
import { Ornement } from './Ornement';
import { ornementPour } from './images';
import type { OrnementKey } from './images';
import { RecordSeal } from './RecordSeal';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';

type KitDetailProps = React.ComponentProps<typeof KitDetailScreen>;

/** Ecran de detail : bouton retour rond, grand titre. Plus de filigrane. */
export function DetailScreen(props: KitDetailProps & { kanji?: string }) {
  const { kanji: _ignored, ...rest } = props;
  void _ignored;
  return <KitDetailScreen {...rest} />;
}

/** Etat vide engageant, avec un ornement illustre adapte au contexte (ornement force, sinon deduit du titre et du texte) */
export function EmptyState({ title, text, action, onAction, ornament, ornement }: { kanji?: string; title: string; text: string; action?: string; onAction?: () => void; ornament?: GlyphKind; ornement?: OrnementKey }) {
  const o: OrnementKey = ornement ?? (ornament === 'vague' ? 'vague' : ornament === 'eventail' ? 'eventail' : ornementPour(title, text));
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 10 }}>
      <Ornement name={o} size={88} />
      <Ink size={19} weight="black" tight style={{ textAlign: 'center' }}>
        {title}
      </Ink>
      <Ink size={14} weight="medium" color={P.ink2} style={{ textAlign: 'center', paddingHorizontal: 10 }}>
        {text}
      </Ink>
      {action && onAction ? (
        <View style={{ marginTop: 6, alignSelf: 'stretch' }}>
          <BigButton label={action} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

/** Tampon rouge incline : pictogramme dessine, plus de kanji (char accepte et ignore) */
export function Hanko({ size = 44, rotate = -6, tampon }: { char?: string; size?: number; rotate?: number; tampon?: TamponId }) {
  return <RecordSeal size={size} rotate={rotate} tampon={tampon} />;
}
