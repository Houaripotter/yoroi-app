/**
 * onboarding-neuf/AncienneApp.tsx
 *
 * 22 novembre 2026, demande de Houari : la premiere question du parcours, juste apres « Commencer » :
 * « Tu utilises déjà une app pour tes séances ? ». Memes composants que les autres questions a tuiles (Question,
 * Choix, stickers de l'app), meme barre de progression. Les noms des apps viennent de lib/v2/import/apps.ts, en
 * texte seulement (aucun logo de marque) ; c'est le seul ecran de l'onboarding qui les montre.
 *
 * Une app : la tuile se coche, puis la reprise (components/yoroi/v2/import/RepriseHevy.tsx) s'ouvre directement sur
 * le guide de cette app. Fermee sans finir, on revient ici. « Non, je commence avec YOROI » passe a la suite.
 */

import React, { useEffect, useRef } from 'react';
import { APPS, type IdApp } from '@/lib/v2/import/apps';
import type { AncienneApp as Reponse } from '@/lib/v2/onboarding/draft';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';
import { Apparait, Choix, Sticker, type Nav } from './kit';
import { AVANCE_MS, Question, useAvance } from './Questions';

const STICKER: Record<Reponse, NomSticker> = {
  hevy: 'musculation',
  strong: 'force',
  fitnotes: 'carnet',
  autre: 'tableur',
  aucune: 'debuter',
};

/** Le libelle de chaque tuile : le nom de l'app tel quel (ce sont des noms propres), sinon une phrase traduite */
function libelle(id: Reponse): string {
  if (id === 'autre') return traduire('Autre app (fichier CSV)');
  if (id === 'aucune') return traduire('Non, je commence avec YOROI');
  return APPS.find((a) => a.id === id)?.nom ?? id;
}

export function AncienneApp({ nav, value, onChange, onOuvrir }: {
  nav: Nav;
  value: Reponse | null;
  onChange: (v: Reponse) => void;
  /** une app choisie : ouvre la reprise sur le guide de cette app */
  onOuvrir: (app: IdApp) => void;
}) {
  const avance = useAvance(nav);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);
  const ouvrir = (id: IdApp) => {
    onChange(id);
    if (t.current) clearTimeout(t.current);
    // le meme petit temps que les autres choix uniques : la tuile se coche, puis le guide s'ouvre
    t.current = setTimeout(() => {
      t.current = null;
      onOuvrir(id);
    }, AVANCE_MS);
  };
  const liste: Reponse[] = [...APPS.map((a) => a.id), 'aucune'];
  return (
    <Question
      nav={nav}
      titre={traduire('Tu utilises déjà une app pour tes séances ?')}
      mot={traduire('app')}
      sous={traduire('Tu récupères tout : séances, exercices, charges.')}
      actif={!!value}
      onBouton={() => {
        if (!value) return;
        if (value === 'aucune') nav.onNext();
        else onOuvrir(value);
      }}
    >
      {liste.map((id, n) => (
        <Apparait key={id} rang={n}>
          <Choix
            label={libelle(id)}
            on={value === id}
            onPress={() => (id === 'aucune' ? avance(() => onChange('aucune')) : ouvrir(id))}
            gauche={<Sticker nom={STICKER[id]} taille={34} />}
          />
        </Apparait>
      ))}
    </Question>
  );
}
