/**
 * Monte une seule fois dans app/_layout.tsx : demarre la synchro avec l'Apple Watch (iOS seulement)
 * et celle des widgets (iOS et Android).
 * N'affiche rien.
 */
import { useEffect } from 'react';
import { demarrerSynchroMontre } from './synchro';
import { demarrerSynchroWidgets } from '@/lib/v2/widgets/synchro';

export function SynchroMontre(): null {
  useEffect(() => demarrerSynchroMontre(), []);
  // widgets iPhone, iPad et Android : meme instantane, memes actions (lib/v2/widgets)
  useEffect(() => demarrerSynchroWidgets(), []);
  return null;
}
