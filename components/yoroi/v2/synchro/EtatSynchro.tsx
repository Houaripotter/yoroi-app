/**
 * Etat de la synchro avec tes autres telephones (28 octobre 2026), en haut de l'ecran de synchro :
 * dernier echange recu et envoye (quand, avec quel appareil, combien d'elements de chaque type), erreurs eventuelles.
 * Lit le journal de lib/v2/synchro/journal.ts, tenu par lib/peerSyncService.ts.
 */
import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DATE_FNS_LOCALE } from '@/lib/i18n/dateLocale';
import { ActionRow, CardBox, Notice, S } from '@/components/yoroi/v2/sante/ui';
import { libelleType, suivreJournal, type Echange, type Journal } from '@/lib/v2/synchro/journal';
import { SPEC_PAR_CLE } from '@/lib/v2/synchro/cles';
import { traduire } from '@/lib/i18n/tr';

const quand = (iso: string): string => {
  try {
    return format(parseISO(iso), traduire("d MMM yyyy 'à' HH:mm"), { locale: DATE_FNS_LOCALE });
  } catch {
    return iso;
  }
};

/** « 3 Partenaires, 12 Carnet » : les types les plus nombreux d'abord */
export function resumeCompte(compte: Record<string, number>): string {
  const parts = Object.entries(compte)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${libelleType(type)} : ${n}`);
  return parts.length ? parts.join(', ') : traduire('Rien de nouveau, tout était déjà à jour');
}

function Ligne({ e, sens, first }: { e: Echange; sens: 'recu' | 'envoye'; first?: boolean }) {
  const titre = sens === 'recu' ? traduire('Reçu de {0}, {1}', e.appareil, quand(e.quand)) : traduire('Envoyé à {0}, {1}', e.appareil, quand(e.quand));
  return (
    <ActionRow
      first={first}
      icon={sens === 'recu' ? 'download' : 'upload'}
      title={titre}
      sub={resumeCompte(e.compte)}
      color={e.erreurs.length ? S.danger : S.mossText}
      tint={e.erreurs.length ? S.dangerSoft : S.mossSoft}
    />
  );
}

export default function EtatSynchro() {
  const [journal, setJournal] = useState<Journal>({});
  useEffect(() => suivreJournal((j) => setJournal({ ...j })), []);

  // une cle en erreur s'affiche par son type (« Carnet »), pas par son nom technique
  const erreurs = [...new Set([...(journal.recu?.erreurs ?? []), ...(journal.envoye?.erreurs ?? [])].map((e) => {
    const spec = SPEC_PAR_CLE.get(e);
    return spec ? libelleType(spec.type) : e;
  }))];
  const derniereErreur = journal.erreur && (!journal.recu || journal.erreur.quand > journal.recu.quand) ? journal.erreur : null;

  if (!journal.recu && !journal.envoye) {
    return <Notice text={traduire('Aucun échange pour le moment. Au premier échange, tu verras ici ce qui est parti et arrivé, type par type.')} />;
  }
  return (
    <>
      <CardBox>
        {journal.recu ? <Ligne e={journal.recu} sens="recu" first /> : null}
        {journal.envoye ? <Ligne e={journal.envoye} sens="envoye" first={!journal.recu} /> : null}
      </CardBox>
      {erreurs.length ? <Notice tone="bad" text={traduire('À reprendre : {0}', erreurs.join(', '))} /> : null}
      {/* 30 octobre 2026 : le message technique reste dans le journal, l'ecran dit seulement ce qui va se passer */}
      {derniereErreur ? <Notice tone="bad" text={traduire('Échange interrompu, {0}. Il reprendra à la prochaine synchro, rien n’est perdu.', quand(derniereErreur.quand))} /> : null}
    </>
  );
}
