/**
 * 27 octobre 2026 (Houari : « les logos de marques seulement en mode démo ») : le mode demo (profil Heny du Studio)
 * en lecture synchrone pour l'affichage. Une seule lecture partagee par tous les ecrans (lib/v2/demo/garde.ts), relue
 * quand le Studio charge ou retire la demo (il emet les evenements de donnees). Tant que rien n'est lu : faux, donc
 * jamais un logo de marque chez un vrai utilisateur, meme une fraction de seconde.
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { demoActive } from './garde';

/** Les evenements emis par le Studio quand la demo est chargee ou retiree (components/yoroi/v2/studio/Demo.tsx) */
export const EVENEMENTS_DEMO = ['YOROI_DEMO_CHANGED', 'YOROI_DATA_CHANGED'] as const;

let etat: boolean | null = null;
let enLecture = false;
let ecoute = false;
const abonnes = new Set<(v: boolean) => void>();

function relire(): void {
  if (enLecture) return;
  enLecture = true;
  demoActive()
    .then((v) => {
      enLecture = false;
      if (v === etat) return;
      etat = v;
      abonnes.forEach((f) => f(v));
    })
    .catch(() => {
      enLecture = false;
    });
}

function ecouter(): void {
  if (ecoute) return;
  ecoute = true;
  for (const ev of EVENEMENTS_DEMO) DeviceEventEmitter.addListener(ev, relire);
}

/** Vrai seulement quand la demo est chargee */
export function useModeDemo(): boolean {
  const [demo, setDemo] = useState<boolean>(etat === true);
  useEffect(() => {
    ecouter();
    abonnes.add(setDemo);
    if (etat === null) relire();
    else setDemo(etat);
    return () => {
      abonnes.delete(setDemo);
    };
  }, []);
  return demo;
}
