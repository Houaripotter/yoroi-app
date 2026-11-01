/**
 * Montre « Quoi de neuf dans YOROI 3.0.2 » une seule fois, au lancement, sur les onglets (1er novembre 2026).
 * Monte dans app/(tabs)/_layout.tsx : les onglets n'apparaissent qu'apres l'ecran de chargement et apres
 * l'onboarding (app/index.tsx). Un nouvel utilisateur est marque « vu » a la fin de son onboarding
 * (markWhatsNewSeen) : il ne la voit jamais. Pendant une seance en direct, la visite guidee ou la demo : on attend.
 * Decision : lib/v2/nouveautes/quoiDeNeuf.ts (testee).
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuoiDeNeuf } from './QuoiDeNeuf';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { APP_VERSION } from '@/components/yoroi/v2/espace/reglages/version';
import { loadDraft } from '@/lib/v2/seance/model';
import { decisionQuoiDeNeuf, estOnglet, lireVersionVue, marquerQuoiDeNeufVu } from '@/lib/v2/nouveautes/quoiDeNeuf';

const ports = { getItem: (k: string) => AsyncStorage.getItem(k), setItem: (k: string, v: string) => AsyncStorage.setItem(k, v) };
/** Le temps de laisser l'accueil s'installer apres l'ecran de chargement */
const DELAI_MS = 1600;

export function QuoiDeNeufGate() {
  const pathname = usePathname();
  const visite = useVisiteEnCours();
  const [visible, setVisible] = useState(false);
  const fini = useRef(false);

  useEffect(() => {
    if (fini.current || visible) return;
    let alive = true;
    const decider = async () => {
      const versionVue = await lireVersionVue(ports);
      let seance = false;
      try {
        seance = !!(await loadDraft());
      } catch {
        seance = false;
      }
      let demo = false;
      try {
        demo = await (await import('@/lib/demoDataService')).isDemoDataActive();
      } catch {
        demo = false;
      }
      return decisionQuoiDeNeuf({ versionApp: APP_VERSION, versionVue, surOnglet: estOnglet(pathname), seanceEnCours: seance, visiteEnCours: visite, demo });
    };
    const t = setTimeout(async () => {
      if (!alive || AppState.currentState !== 'active') return;
      const d = await decider();
      if (!alive) return;
      if (d === 'rien') fini.current = true;
      else if (d === 'montrer') setVisible(true);
      // 'attendre' : on reessaie au prochain changement d'onglet ou a la fin de la visite
    }, DELAI_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [pathname, visite, visible]);

  const fermer = () => {
    fini.current = true;
    setVisible(false);
    marquerQuoiDeNeufVu(ports).catch(() => {});
  };

  return <QuoiDeNeuf visible={visible} onClose={fermer} />;
}

export default QuoiDeNeufGate;
