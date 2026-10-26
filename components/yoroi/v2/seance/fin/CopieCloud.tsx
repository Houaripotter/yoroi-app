/**
 * Fin de seance : ta seance mise a l'abri dans ton cloud (26 octobre 2026).
 * Houari : « a la fin de seance on lui propose de tout sauvegarder sur son cloud, sans perdre aucune donnee ».
 *
 * - copie automatique deja reliee : une copie part tout de suite, en silence, et on le dit en une ligne ;
 * - pas encore reliee (ou en panne) : une carte propose de l'activer, un seul geste (lib/v2/sauvegarde/copieAuto.ts) ;
 * - pas de module natif (web) : la copie a la main.
 * La sauvegarde ajoute une copie : elle n'efface ni ne remplace rien sur le telephone.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { activerCopieAuto, copierMaintenant, etatProtection, lireProtection, nomDuCloud } from '@/lib/v2/sauvegarde/copieAuto';
import type { EtatProtection } from '@/lib/v2/sauvegarde/copieAuto';
import { traduire } from '@/lib/i18n/tr';

type Etat = 'lecture' | EtatProtection | 'copie' | 'copiee' | 'echec';

export function CopieCloud() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [etat, setEtat] = useState<Etat>('lecture');
  const cloud = nomDuCloud();

  useEffect(() => {
    let vivant = true;
    (async () => {
      const e = etatProtection(await lireProtection());
      if (!vivant) return;
      if (e === 'protege') {
        setEtat('copie');
        const ok = await copierMaintenant();
        if (vivant) setEtat(ok ? 'copiee' : 'en_panne');
      } else setEtat(e);
    })().catch(() => vivant && setEtat('non_dispo'));
    return () => {
      vivant = false;
    };
  }, []);

  const activer = async () => {
    setEtat('copie');
    const r = await activerCopieAuto();
    setEtat(r === 'ok' ? 'copiee' : r === 'annule' ? 'a_activer' : r === 'non_dispo' ? 'non_dispo' : 'echec');
  };
  const manuel = async () => {
    try {
      const { exportDataToJSON } = await import('@/lib/exportService');
      if (await exportDataToJSON()) setEtat('copiee');
    } catch {
      setEtat('echec');
    }
  };

  if (etat === 'lecture') return null;
  const texte =
    etat === 'copiee' ? traduire('Ta séance est à l’abri dans ton {0}.', cloud)
    : etat === 'copie' ? traduire('Copie de ta séance dans ton {0}…', cloud)
    : etat === 'echec' ? traduire('La copie n’a pas pu partir. Ta séance reste bien sur ton téléphone, réessaie.')
    : etat === 'en_panne' ? traduire('Ta copie automatique ne passe plus. Relie de nouveau ton {0} pour ne rien perdre.', cloud)
    : etat === 'non_dispo' ? traduire('Tes séances restent sur ton téléphone. Une copie de temps en temps et rien ne se perd.')
    : traduire('Mets tes séances à l’abri : une copie dans ton {0}, chaque jour, sans rien faire.', cloud);
  const action =
    etat === 'a_activer' ? traduire('Activer la copie automatique')
    : etat === 'en_panne' || etat === 'echec' ? traduire('Relier mon {0}', cloud)
    : etat === 'non_dispo' ? traduire('Sauvegarder mes données')
    : null;

  return (
    <View style={{ marginHorizontal: 22, marginTop: 12, borderRadius: 22, paddingTop: 14, paddingBottom: action ? 4 : 14, paddingHorizontal: 16, backgroundColor: c.indigoTint, gap: 2 }} accessibilityLiveRegion="polite">
      <Ink size={14} weight={etat === 'copiee' ? 'bold' : 'medium'} color={etat === 'copiee' ? c.ink : c.textSecondary}>{texte}</Ink>
      {action ? (
        <Pressable onPress={() => void (etat === 'non_dispo' ? manuel() : activer())} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Ink size={14} weight="extraBold" color={c.indigo}>{action}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}
