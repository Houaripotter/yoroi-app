/**
 * « Importer mes séances » (16 octobre 2026, SEANCES AVATAR) : la feuille de l'onglet Séances.
 * 1. tu choisis la période (30 jours, 3 mois, 1 an, tout) ;
 * 2. l'accès est demandé si besoin (connecterSante), puis la lecture, l'ajout et les détails avancent à l'écran ;
 * 3. le résultat : « 12 séances importées, 3 déjà présentes », avec les séances reliées à celles de YOROI.
 * Sur le web le bouton n'existe pas (importSeancesDisponible). Règles : lib/v2/seances/importPlan.ts.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import healthConnect from '@/lib/healthConnect';
import { importerSeancesSante, nomSourceSante } from '@/lib/v2/seances/importSeances';
import type { EtapeImport, IssueImport } from '@/lib/v2/seances/importSeances';
import { PERIODES_IMPORT, texteResultat } from '@/lib/v2/seances/importPlan';
import type { PeriodeImport } from '@/lib/v2/seances/importPlan';
import { ETAPES_REGLAGES_ANDROID, ETAPES_REGLAGES_IOS, messageConnexion } from '@/lib/v2/sante/connexion';
import { ouvrirReglagesSante } from '@/lib/v2/sante/demande';
import { BigButton, Chip, ChipRow, Glass, Sheet } from './ui';
import { Icon } from './Icon';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type Vue =
  | { k: 'choix' }
  | { k: 'en_cours'; etape: EtapeImport | null }
  | { k: 'fini'; titre: string; detail: string }
  | { k: 'souci'; titre: string; texte: string; reglages: boolean };

function texteEtape(e: EtapeImport | null, source: string): { ligne: string; part: number | null } {
  if (!e) return { ligne: traduire('Préparation'), part: null };
  switch (e.phase) {
    case 'acces':
      return { ligne: traduire("Autorise YOROI dans la fenêtre de {0}", source), part: null };
    case 'attente':
      return { ligne: traduire('Fin de l’import de tes données en cours'), part: null };
    case 'lecture':
      return { ligne: traduire("Lecture de tes séances dans {0}", source), part: null };
    case 'ajout':
      return { ligne: traduire("Ajout des séances : {0} sur {1}", e.fait, e.total), part: e.total ? e.fait / e.total : null };
    case 'details':
      return { ligne: traduire("Fréquence cardiaque et tracés : {0} sur {1}", e.fait, e.total), part: e.total ? e.fait / e.total : null };
  }
}

function vueDe(r: IssueImport, source: string): Vue {
  if (r.ok) return { k: 'fini', ...texteResultat(r.resultat, source) };
  const android = Platform.OS === 'android';
  const etapes = (android ? ETAPES_REGLAGES_ANDROID : ETAPES_REGLAGES_IOS).map((e, i) => `${i + 1}. ${e}`).join('\n');
  switch (r.raison) {
    case 'acces': {
      const m = messageConnexion(r.issue, Platform.OS);
      return { k: 'souci', titre: m.titre, texte: m.texte, reglages: m.reglages };
    }
    case 'rien_lu':
      return {
        k: 'souci',
        titre: traduire("Aucune séance lue dans {0}", source),
        texte: android
          ? traduire("L’accès aux séances n’est pas ouvert, ou Health Connect n’en a aucune sur cette période. Pour l’ouvrir :\n{0}", etapes)
          : traduire("Soit l’accès aux entraînements est coupé, soit il n’y en a aucun sur cette période. Apple ne dit pas lequel. Pour vérifier :\n{0}", etapes),
        reglages: true,
      };
    case 'indisponible':
      return { k: 'souci', titre: `${source} indisponible`, texte: android ? traduire('Installe Health Connect depuis le Play Store, puis réessaie.') : traduire('L’app Santé n’existe pas sur cet appareil.'), reglages: false };
    case 'en_cours':
      return { k: 'souci', titre: traduire('Un import est déjà en cours'), texte: traduire('Attends qu’il se termine, puis relance si besoin.'), reglages: false };
    default:
      return { k: 'souci', titre: traduire('Import impossible'), texte: traduire('Réessaie dans un instant. Rien n’a été ajouté en double.'), reglages: false };
  }
}

export function ImportSeancesSheet({ visible, onClose, onFini }: { visible: boolean; onClose: () => void; onFini?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const source = nomSourceSante();
  const [periode, setPeriode] = useState<PeriodeImport>('3m');
  const [vue, setVue] = useState<Vue>({ k: 'choix' });
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);
  useEffect(() => {
    if (visible && vue.k !== 'en_cours') setVue({ k: 'choix' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const lancer = async () => {
    setVue({ k: 'en_cours', etape: null });
    const r = await importerSeancesSante(periode, (e) => monte.current && setVue({ k: 'en_cours', etape: e }));
    if (!monte.current) return;
    notificationAsync(r.ok ? NotificationFeedbackType.Success : NotificationFeedbackType.Warning).catch(() => {});
    setVue(vueDe(r, source));
    if (r.ok) onFini?.();
  };

  const fermer = () => {
    // pendant l'import la feuille reste ouverte : l'import continue, mais tu ne verrais pas le résultat
    if (vue.k === 'en_cours') return;
    onClose();
  };

  const ouvrirReglages = () => {
    const fn = (healthConnect as unknown as { openHealthConnectSettings?: () => Promise<void> }).openHealthConnectSettings;
    void ouvrirReglagesSante(Platform.OS === 'android' && typeof fn === 'function' ? () => fn.call(healthConnect) : undefined);
  };

  return (
    <Sheet visible={visible} onClose={fermer} title={traduire("Importer mes séances")}>
      {vue.k === 'choix' ? (
        <>
          <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
            {traduire("YOROI lit tes entraînements dans {0} et ajoute ceux qui manquent. Une séance déjà présente, ou notée dans YOROI, n’est jamais ajoutée deux fois.", source)}
          </Ink>
          <Ink size={13} weight="extraBold" color={c.textMuted} style={{ paddingHorizontal: 4, marginTop: 6 }}>{traduire("Période")}</Ink>
          <ChipRow>
            {PERIODES_IMPORT.map((p) => (
              <Chip key={p.key} label={p.label} on={periode === p.key} onPress={() => setPeriode(p.key)} />
            ))}
          </ChipRow>
          <BigButton label={traduire("Importer")} icon="download" onPress={lancer} style={{ marginTop: 6 }} />
        </>
      ) : vue.k === 'en_cours' ? (
        <Progression etape={vue.etape} source={source} />
      ) : vue.k === 'fini' ? (
        <>
          <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={22} color="#FFFFFF" strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Ink size={17} weight="black" tight accessibilityLiveRegion="polite">{vue.titre}</Ink>
              {vue.detail ? <Ink size={13} color={c.textSecondary}>{vue.detail}</Ink> : null}
            </View>
          </Glass>
          <BigButton label={traduire("Fermer")} tone="ink" onPress={onClose} />
        </>
      ) : (
        <>
          <Glass style={{ gap: 6 }}>
            <Ink size={17} weight="black" tight>{vue.titre}</Ink>
            <Ink size={14} color={c.textSecondary}>{vue.texte}</Ink>
          </Glass>
          {vue.reglages ? <BigButton label={Platform.OS === 'android' ? 'Ouvrir Health Connect' : traduire('Ouvrir Santé')} tone="ink" onPress={ouvrirReglages} /> : null}
          <BigButton label={traduire("Réessayer")} tone="soft" onPress={() => setVue({ k: 'choix' })} />
        </>
      )}
    </Sheet>
  );
}

function Progression({ etape, source }: { etape: EtapeImport | null; source: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = texteEtape(etape, source);
  return (
    <Glass style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ActivityIndicator color={c.accent} />
        <Ink size={15} weight="extraBold" style={{ flex: 1 }} accessibilityLiveRegion="polite">{t.ligne}</Ink>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round((t.part ?? 0.08) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: c.accent, opacity: t.part == null ? 0.5 : 1 }} />
      </View>
      <Ink size={12} color={c.textMuted}>{traduire("Garde YOROI ouvert pendant l’import.")}</Ink>
    </Glass>
  );
}

/** Carte visible en haut de l'onglet tant que rien n'a été importé de Santé */
export function CarteImportSeances({ onPress }: { onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const source = nomSourceSante();
  return (
    <Glass onPress={onPress} label={traduire("Importer mes séances depuis {0}", source)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: P.white, borderWidth: 1, borderColor: c.divider, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="download" size={22} color={c.accent} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="extraBold">{traduire("Importer mes séances")}</Ink>
        <Ink size={13} color={c.textSecondary}>{traduire("Depuis {0}, sans doublon", source)}</Ink>
      </View>
      <Icon name="chevron" size={18} color={c.textMuted} />
    </Glass>
  );
}
