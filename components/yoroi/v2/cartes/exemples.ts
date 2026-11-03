/**
 * 3 novembre 2026 (photos d'exemple) : les images d'exemple des cartes (assets/images/cartes_exemple/, webp 1080 de
 * large, moins de 300 Ko chacune) et leur adresse pour la carte. Les regles sont dans lib/v2/cartes/exemples.ts.
 * Jamais dans un export : seuls les apercus (vignettes de Mes cartes, apercu du studio) les montrent.
 */
import { Image } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { carteAvantApresExemple, visuelsAvecExemple } from '@/lib/v2/cartes/exemples';
import type { ExempleId } from '@/lib/v2/cartes/exemples';
import type { CarteData } from '@/lib/v2/cartes/types';
import type { VisuelsCarte } from './CarteRendu';

export const SOURCES_EXEMPLE: Record<ExempleId, ImageSourcePropType> = {
  muscu_homme: require('@/assets/images/cartes_exemple/exemple_muscu_homme.webp'),
  muscu_femme: require('@/assets/images/cartes_exemple/exemple_muscu_femme.webp'),
  course: require('@/assets/images/cartes_exemple/exemple_course.webp'),
  jjb: require('@/assets/images/cartes_exemple/exemple_jjb.webp'),
  marche: require('@/assets/images/cartes_exemple/exemple_marche.webp'),
  record: require('@/assets/images/cartes_exemple/exemple_record.webp'),
  avant: require('@/assets/images/cartes_exemple/exemple_avant.webp'),
  apres: require('@/assets/images/cartes_exemple/exemple_apres.webp'),
};

/** L'adresse de l'image pour la carte (qui dessine ta photo par son adresse) ; jamais vide */
export function uriExemple(id: ExempleId): string {
  const s = SOURCES_EXEMPLE[id] as unknown;
  try {
    const r = (Image as unknown as { resolveAssetSource?: (x: unknown) => { uri?: string } | null }).resolveAssetSource?.(s);
    if (r?.uri) return r.uri;
  } catch {
    // le web n'a pas resolveAssetSource : l'adresse est deja la
  }
  if (typeof s === 'string' && s) return s;
  if (s && typeof s === 'object' && typeof (s as { uri?: unknown }).uri === 'string') return (s as { uri: string }).uri;
  return `exemple:${id}`;
}

/** Les visuels d'une carte avec la photo d'exemple */
export function visuelsExemple(v: VisuelsCarte, id: ExempleId): VisuelsCarte {
  return visuelsAvecExemple(v, id, uriExemple(id));
}

/** La carte avant apres d'exemple, avec ses deux photos */
export function avantApresExemple(): CarteData {
  return carteAvantApresExemple({ avant: uriExemple('avant'), apres: uriExemple('apres') });
}
