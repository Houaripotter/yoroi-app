/**
 * Confirmation avant de quitter un ecran avec des changements non enregistres (28 octobre 2026).
 * Couvre les trois sorties : le bouton retour de l'en-tete, le glissement retour de l'iPhone
 * (la pile native le bloque tant que des changements sont en attente) et le bouton retour d'Android.
 *
 *   const { laisserPartir } = useConfirmerSortie(modifie);
 *   // apres un enregistrement reussi : laisserPartir(); router.back();
 */
import { useCallback, useEffect, useRef } from 'react';
import { usePreventRemove, useNavigation } from '@react-navigation/native';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

export type OptionsSortie = {
  titre?: string;
  message?: string;
  /** propose aussi « Enregistrer » dans la fenetre */
  enregistrer?: () => unknown;
};

/** Les boutons de la fenetre, a part pour etre testes sans ecran */
export function boutonsSortie(partir: () => void, enregistrer?: () => unknown) {
  return [
    { text: traduire('Rester'), style: 'cancel' as const },
    ...(enregistrer ? [{ text: traduire('Enregistrer'), style: 'primary' as const, onPress: () => void enregistrer() }] : []),
    { text: traduire('Quitter sans enregistrer'), style: 'destructive' as const, onPress: partir },
  ];
}

export function useConfirmerSortie(modifie: boolean, options?: OptionsSortie) {
  const navigation = useNavigation();
  const libre = useRef(false);
  const opts = useRef(options);
  opts.current = options;
  // plus rien a enregistrer : la prochaine modification redemandera confirmation
  useEffect(() => {
    if (!modifie) libre.current = false;
  }, [modifie]);

  usePreventRemove(modifie, ({ data }) => {
    const partir = () => {
      libre.current = true;
      navigation.dispatch(data.action);
    };
    // juste apres un enregistrement, avant que l'ecran ait vu « plus rien a enregistrer »
    if (libre.current) {
      navigation.dispatch(data.action);
      return;
    }
    appAlert(
      opts.current?.titre ?? traduire('Quitter sans enregistrer ?'),
      opts.current?.message ?? traduire('Tes changements seront perdus.'),
      boutonsSortie(partir, opts.current?.enregistrer),
    );
  });

  /** A appeler juste avant de quitter volontairement (apres un enregistrement reussi) */
  const laisserPartir = useCallback(() => {
    libre.current = true;
  }, []);

  return { laisserPartir };
}
