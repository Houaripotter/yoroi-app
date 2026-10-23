/**
 * Bibliotheque d'effets de scene (18 octobre 2026) : un calque par effet de la config
 * (lib/v2/scenes/animations.ts), tous pilotes par la meme horloge.
 * Les objets qui bougent vraiment (balancoire, bateau, passant...) sont des calques mobiles a part :
 * components/yoroi/v2/scenes/CalquesMobiles.tsx.
 */
import React from 'react';
import type { Effet } from '@/lib/v2/scenes/animations';
import type { ProprietesEffet } from './commun';
import { Eclaboussures, Pluie } from './Pluie';
import { Flocons } from './Flocons';
import { Etoiles } from './Etoiles';
import { Brume } from './Brume';
import { Lueur } from './Lueur';
import { Train } from './Train';
import { Reflets } from './Reflets';

export type { Cadre } from './commun';
export { Eclaboussures, Pluie, Flocons, Etoiles, Brume, Lueur, Train, Reflets };

/** Le bon calque pour un effet */
export function CalqueEffet({ effet, ...p }: ProprietesEffet<Effet>) {
  switch (effet.type) {
    case 'pluie':
      return <Pluie effet={effet} {...p} />;
    case 'eclaboussures':
      return <Eclaboussures effet={effet} {...p} />;
    case 'neige':
    case 'braises':
      return <Flocons effet={effet} {...p} />;
    case 'etoiles':
      return <Etoiles effet={effet} {...p} />;
    case 'brume':
      return <Brume effet={effet} {...p} />;
    case 'lueur':
      return <Lueur effet={effet} {...p} />;
    case 'train':
      return <Train effet={effet} {...p} />;
    case 'reflets':
      return <Reflets effet={effet} {...p} />;
    default:
      return null;
  }
}
