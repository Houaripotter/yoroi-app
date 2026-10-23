/**
 * Connexion sante (refonte v2) : relier YOROI a Apple Sante (iPhone) ou Health Connect (Android),
 * synchroniser, reimporter les seances, diagnostiquer, envoyer les donnees a l'Apple Watch,
 * voir ce qui est lu, guides des montres, reinitialiser la liaison.
 * Vague 14 : reprend aussi l'ancien ecran Appareils et sources (/connected-devices, redirige ici) :
 * appareils detectes sur 30 jours, verification de la connexion, ce que chaque appareil envoie.
 * Les guides par marque vivent dans Ta montre et YOROI (/sante/montre), une seule ligne y mene.
 */
import { setProprietes, track } from '@/utils/telemetry';
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DataBridge } from '@/components/yoroi/v2/sante/Bridge';
import { DataMatrix, LinesSheet } from '@/components/yoroi/v2/sante/Devices';
import type { SheetAction } from '@/components/yoroi/v2/sante/Devices';
import { DATA_TYPE_LABELS, SOURCE_DISPLAY } from '@/components/yoroi/v2/sante/brands';
import { Accordion, ActionRow, BrandMark, CardBox, GlassBox, Label, Notice, S, SmallButton, SourceCard, Steps } from '@/components/yoroi/v2/sante/ui';
import { IconDot, METRIC_ICON, SanteIcon } from '@/components/yoroi/v2/sante/SanteIcon';
import { healthConnect, getConnectionInstructions } from '@/lib/healthConnect';
import type { HealthPermissions } from '@/lib/healthConnect';
import { etatMontre } from '@/lib/v2/montre/pont';
import type { EtatMontre } from '@/lib/v2/montre/pont';
import { envoyerContexteMontre } from '@/lib/v2/montre/synchro';
import HealthService from '@/lib/healthService';
import { getDetectedSources, getDetectedWeightSources } from '@/lib/database';
import type { DetectedSource } from '@/lib/database';
import { whenLabel } from '@/lib/v2/sante/stats';
import { safeOpenURL } from '@/lib/security/validators';
import { logger } from '@/lib/security/logger';
import { askExtendedAccess, getSanteSource } from '@/lib/v2/sante/data';
import type { SanteSource } from '@/lib/v2/sante/data';
import { diagnoseWorkouts, forceReimport } from '@/lib/v2/sante/diagnostic';
import { FAMILY, FAMILY_ORDER, METRICS, availableOn } from '@/lib/v2/sante/metrics';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { connecterSanteSuivi } from '@/lib/v2/onboarding/save';
import { montrerIssueSante } from '@/lib/v2/sante/demandeActions';
import { resumeDemande } from '@/lib/v2/sante/typesSante';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

const PERM_LABELS: { key: keyof HealthPermissions; label: string }[] = [
  { key: 'weight', label: 'Poids' },
  { key: 'steps', label: traduire('Pas') },
  { key: 'sleep', label: traduire('Sommeil') },
  { key: 'heartRate', label: traduire('Fréquence cardiaque') },
  { key: 'restingHeartRate', label: traduire('Fréquence au repos') },
  { key: 'heartRateVariability', label: traduire('Variabilité cardiaque') },
  { key: 'calories', label: traduire('Calories') },
  { key: 'distance', label: 'Distance' },
  { key: 'oxygenSaturation', label: traduire('Oxygène') },
  { key: 'bodyComposition', label: 'Composition' },
  { key: 'workouts', label: traduire('Séances') },
];

/** Ce que la ligne Apple Watch dit, sans rien de plus : jumelee ou non, app installee ou non */
function texteMontre(m: EtatMontre): string {
  if (!m.jumelee) return traduire('Aucune Apple Watch jumelée à cet iPhone');
  return m.installee ? traduire('Jumelée, l’app YOROI est installée') : traduire('Jumelée, l’app YOROI n’est pas encore installée');
}

type Diag = { available: boolean; permissions: boolean; hasWeight: boolean; weightValue?: number; weightDate?: string };

export default function HealthConnectScreen() {
  const router = useRouter();
  const [montre, setMontre] = useState<EtatMontre | null>(null);
  const [source, setSource] = useState<SanteSource | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [watchSyncing, setWatchSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [diagnosing, setDiagnosing] = useState(false);
  const [report, setReport] = useState<{ title: string; lines: string[]; actions: SheetAction[] } | null>(null);
  const [askingMore, setAskingMore] = useState(false);
  const [perms, setPerms] = useState<HealthPermissions | null>(null);
  const [detected, setDetected] = useState<DetectedSource[]>([]);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<Diag | null>(null);

  const provider = Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé';
  const isLive = source?.mode === 'live';
  const native = source?.mode === 'live' || source?.mode === 'off';

  const loadStatus = useCallback(async () => {
    const s = await getSanteSource();
    setSource(s);
    try {
      setPerms(healthConnect.getSyncStatus().permissions);
    } catch {
      setPerms(null);
    }
    try {
      const [h, w] = await Promise.all([getDetectedSources(30), getDetectedWeightSources(30)]);
      const map = new Map<string, DetectedSource>();
      [...h, ...w].forEach((d) => {
        const e = map.get(d.source);
        if (!e || d.last_date > e.last_date) map.set(d.source, d);
      });
      setDetected(Array.from(map.values()));
    } catch (e) {
      logger.warn('[HealthConnect v2] sources', e);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const connect = async () => {
    if (connecting) {
      logger.warn('[HealthConnect v2] connexion deja en cours');
      return;
    }
    tap('medium');
    setConnecting(true);
    try {
      const available = await healthConnect.isAvailable();
      if (!available) {
        appAlert(
          traduire('Non disponible'),
          Platform.OS === 'ios'
            ? __DEV__
              ? traduire("Mode test\u00A0: l'app Santé n'est pas disponible (simulateur, tablette, ou Expo Go). Teste dans l'app installée.")
              : traduire("L'app Santé n'est pas disponible sur cet appareil.")
            : traduire("Health Connect n'est pas disponible sur cet appareil. Installe-le depuis le Play Store."),
        );
        return;
      }
      // 14 octobre 2026 (SANTÉ CONNEXION) : une seule demande, délai de sécurité, retour des Réglages revérifié,
      // « relié » seulement si une vraie lecture renvoie des données. L'import part en arrière-plan.
      const issue = await connecterSanteSuivi();
      const st = healthConnect.getSyncStatus();
      if (issue === 'connecte') {
        tap('success');
        appAlert(traduire('C’est relié'), traduire("YOROI lit bien {0}. Import en cours : tes pesées et tes séances arrivent, le compte s’affiche en haut de l’Accueil.", healthConnect.getProviderName()));
        const fin = DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', () => {
          fin.remove();
          DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
          void loadStatus();
        });
      } else if (issue !== 'indisponible' && !['MODULE_NOT_LOADED', 'HEALTH_CONNECT_NOT_INSTALLED', 'DEVICE_NOT_SUPPORTED'].includes(String(st.failureReason ?? ''))) {
        montrerIssueSante(issue);
      } else {
        switch (st.failureReason as string) {
          case 'USER_DENIED':
            appAlert(
              traduire('Accès refusé'),
              Platform.OS === 'ios'
                ? traduire("Tu as refusé l'accès à l'app Santé. Va dans Réglages, Santé, Partage de données, YOROI et active toutes les autorisations.")
                : traduire("Tu as refusé l'accès à Health Connect. Autorise l'accès dans les paramètres de l'app."),
              [
                { text: traduire('Annuler'), style: 'cancel' },
                { text: traduire('Ouvrir Réglages'), onPress: () => (Platform.OS === 'ios' ? safeOpenURL('App-Prefs:HEALTH') : Linking.openSettings()) },
              ],
            );
            break;
          case 'MODULE_NOT_LOADED':
            appAlert(
              traduire('Santé indisponible'),
              __DEV__
                ? traduire("Mode test\u00A0: le module Santé n'est pas chargé (simulateur, Expo Go, ou app compilée sans lui).")
                : traduire("La lecture santé n'est pas disponible sur cet appareil pour l'instant."),
            );
            break;
          case 'DEVICE_NOT_SUPPORTED':
            appAlert(
              traduire('Appareil non compatible'),
              Platform.OS === 'ios' ? traduire("L'app Santé n'est pas disponible sur cet appareil (tablette ou ancien modèle).") : traduire("Health Connect n'est pas disponible ici. Il faut Android 9 ou plus récent."),
            );
            break;
          case 'HEALTH_CONNECT_NOT_INSTALLED':
            appAlert('Health Connect absent', traduire("Health Connect n'est pas installé. C'est l'app de Google qui rassemble tes données de santé. Installe-la depuis le Play Store pour continuer."), [
              { text: traduire('Plus tard'), style: 'cancel' },
              { text: traduire('Installer'), onPress: () => safeOpenURL('market://details?id=com.google.android.apps.healthdata') },
            ]);
            break;
          default:
            appAlert(traduire('Connexion impossible'), traduire("Impossible de se connecter à {0}. Vérifie que l'app est installée et réessaie.", healthConnect.getProviderName()));
        }
      }
      await loadStatus();
    } catch (e) {
      logger.error('[HealthConnect v2] connexion', e);
      appAlert('Oups', traduire('Ça n’a pas marché. Réessaie plus tard.'));
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    tap('medium');
    appAlert(traduire('Déconnecter ?'), traduire("Veux-tu vraiment déconnecter YOROI de {0} ? Tes données ne seront plus synchronisées automatiquement.", healthConnect.getProviderName()), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Déconnecter'),
        style: 'destructive',
        onPress: async () => {
          await healthConnect.disconnect();
          await loadStatus();
        },
      },
    ]);
  };

  const sync = async () => {
    if (syncing) return;
    tap('medium');
    setSyncing(true);
    try {
      await healthConnect.syncAll();
      await loadStatus();
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      tap('success');
      appAlert(traduire('Synchronisé'), traduire('Tes données de santé ont été mises à jour.'));
    } catch (e) {
      logger.error('[HealthConnect v2] synchro', e);
    } finally {
      setSyncing(false);
    }
  };

  const reimport = async () => {
    if (importing) return;
    tap('light');
    setImporting(true);
    setProgress(traduire('Démarrage'));
    try {
      const r = await forceReimport((step, cur, tot) => setProgress(`${step} (${cur}/${tot})`));
      setProgress('');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      const s = (n: number) => (n > 1 ? 's' : '');
      if (r.healthkitFound === 0) {
        // audit 18 octobre : sur Android, le chemin et le bouton menent a Health Connect (avant : Reglages, Sante et un lien iOS)
        const hcSettings = (healthConnect as unknown as { openHealthConnectSettings?: () => Promise<void> }).openHealthConnectSettings;
        appAlert(
          traduire('Aucune séance trouvée'),
          Platform.OS === 'android'
            ? traduire("Health Connect n'a renvoyé aucune séance. Cause la plus fréquente : l'accès Exercice n'est pas autorisé pour YOROI. Ouvre Health Connect, Autorisations des applis, YOROI, et active Exercice.")
            : traduire("{0} n'a renvoyé aucune séance. Cause la plus fréquente : l'accès Entraînements n'est pas activé pour YOROI. Va dans Réglages, Santé, Accès aux données et appareils, YOROI, et active Entraînements.", provider),
          [
            { text: traduire('Annuler'), style: 'cancel' },
            Platform.OS === 'android'
              ? {
                  text: 'Ouvrir Health Connect',
                  onPress: () => {
                    if (typeof hcSettings === 'function') Promise.resolve(hcSettings.call(healthConnect)).catch(() => Linking.openSettings());
                    else Linking.openSettings();
                  },
                }
              : { text: traduire('Ouvrir Réglages'), onPress: () => safeOpenURL('app-settings:') },
          ],
        );
      } else if (r.workouts === 0 && r.insertErrors > 0) {
        appAlert(traduire('Import impossible'), traduirePluriel(r.healthkitFound, (s(r.healthkitFound)) !== '', "{0} a trouvé {1} séance mais aucune n'a pu être enregistrée. Redémarre l'app et réimporte.", "{0} a trouvé {1} séances mais aucune n'a pu être enregistrée. Redémarre l'app et réimporte.", provider, r.healthkitFound));
      } else if (r.workouts === 0) {
        appAlert(traduire('Déjà à jour'), traduirePluriel(r.healthkitFound, (s(r.healthkitFound)) !== '', "{0} a trouvé {1} séance, toutes déjà présentes dans YOROI.", "{0} a trouvé {1} séances, toutes déjà présentes dans YOROI.", provider, r.healthkitFound));
      } else {
        tap('success');
        appAlert(traduire('Import terminé'), `${r.workouts} séance${s(r.workouts)} importée${s(r.workouts)} depuis ${provider} (${r.healthkitFound} trouvée${s(r.healthkitFound)} au total).`);
      }
    } catch {
      setProgress('');
      appAlert(traduire('Import impossible'), traduire("Les séances n’ont pas pu être importées. Vérifie ta connexion à {0}.", provider));
    } finally {
      setImporting(false);
    }
  };

  const diagnose = async () => {
    if (diagnosing) return;
    tap('light');
    setDiagnosing(true);
    try {
      const r = await diagnoseWorkouts();
      if (r.unavailable) {
        appAlert('Diagnostic', r.unavailable);
        return;
      }
      const actions: SheetAction[] = [];
      if (r.suggestSettings) actions.push({ label: traduire('Ouvrir les réglages'), tone: 'red', onPress: () => safeOpenURL('App-Prefs:Privacy&path=HEALTH') });
      if (r.canImport)
        actions.push({
          label: traduire('Importer maintenant'),
          tone: 'red',
          onPress: () => {
            setReport(null);
            forceReimport().then(() => DeviceEventEmitter.emit(DATA_CHANGED_EVENT)).catch(() => {});
          },
        });
      setReport({ title: traduire('Diagnostic des séances'), lines: r.lines, actions });
    } catch (e: any) {
      appAlert(traduire('Diagnostic impossible'), traduire('Le diagnostic n’a pas pu se faire. Réessaie.'));
    } finally {
      setDiagnosing(false);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    etatMontre().then((m) => alive && setMontre(m)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const watchSync = async () => {
    if (watchSyncing) return;
    tap('light');
    setWatchSyncing(true);
    try {
      const m = await etatMontre();
      if (m) setMontre(m);
      if (!m || !m.jumelee || !m.installee) {
        appAlert('Apple Watch', m && m.jumelee ? traduire('Installe l’app YOROI sur ta montre depuis l’app Watch de ton iPhone, puis réessaie.') : traduire('Jumelle ton Apple Watch à cet iPhone, puis réessaie.'));
        return;
      }
      const ok = await envoyerContexteMontre(true);
      if (ok) {
        tap('success');
        appAlert('Apple Watch', traduire('C’est envoyé. Ta montre affiche tes chiffres dès qu’elle est près de ton iPhone.'));
      } else {
        appAlert(traduire('Envoi impossible'), traduire('Ouvre YOROI sur ta montre, puis réessaie.'));
      }
    } finally {
      setWatchSyncing(false);
    }
  };

  const reset = () => {
    appAlert(traduire('Réinitialiser la liaison'), traduire("Si la fenêtre de l'app Santé ne s'affiche pas, YOROI va oublier l'ancienne connexion et la redemander. Continuer ?"), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Oui, réinitialiser'),
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('@yoroi_health_sync_status');
          connect();
        },
      },
    ]);
  };

  const askMore = async () => {
    setAskingMore(true);
    try {
      const ok = await askExtendedAccess();
      if (ok) {
        tap('success');
        await sync();
      }
    } finally {
      setAskingMore(false);
    }
  };

  const verify = async () => {
    if (checking) return;
    tap('medium');
    setChecking(true);
    setCheck(null);
    try {
      const available = HealthService.isAvailable();
      const permissions = available ? await HealthService.checkPermissions() : false;
      let hasWeight = false;
      let weightValue: number | undefined;
      let weightDate: string | undefined;
      if (permissions) {
        const ws = await HealthService.getWeight(7);
        if (ws && ws.length > 0) {
          hasWeight = true;
          weightValue = ws[0].value;
          weightDate = ws[0].date;
        }
      }
      setCheck({ available, permissions, hasWeight, weightValue, weightDate });
    } catch (e) {
      logger.error('[HealthConnect v2] verification', e);
      setCheck({ available: false, permissions: false, hasWeight: false });
    } finally {
      setChecking(false);
    }
  };

  const openApp = () => safeOpenURL(Platform.OS === 'ios' ? 'x-apple-health://' : 'market://details?id=com.google.android.apps.healthdata');

  const instructions = getConnectionInstructions().map((s) => s.replace(/^\d+\.\s*/, ''));
  const anyPerm = perms ? Object.values(perms).some(Boolean) : false;

  return (
    <DetailScreen title={traduire("Connexion santé")} subtitle={provider}>
      <SourceCard source={source} onConnect={connect} connecting={connecting} onSync={sync} syncing={syncing} />

      {isLive ? (
        <CardBox>
          <ActionRow first icon="sync" title={importing ? progress || 'Import en cours' : traduire('Réimporter toutes mes séances')} sub={importing ? traduire('Patiente, ça peut prendre quelques minutes') : traduire("Tout l'historique depuis {0}", provider)} onPress={reimport} busy={importing} color={S.mossText} tint={S.mossSoft} />
          {Platform.OS === 'ios' ? <ActionRow icon="search" title={diagnosing ? 'Diagnostic en cours' : traduire('Diagnostiquer mes séances')} sub={traduire("Comprendre pourquoi les séances ne s'importent pas")} onPress={diagnose} busy={diagnosing} color={S.indigo} tint={S.indigoSoft} /> : null}
          <ActionRow icon="spark" title={askingMore ? 'Autorisation en cours' : traduire('Autoriser les nouvelles mesures')} sub={Platform.OS === 'android' ? traduire('Tension, nutrition, puissance, historique complet') : traduire('Poignet, lumière du jour, nutrition, récupération')} onPress={askMore} busy={askingMore} color={S.gold} tint={S.goldSoft} />
          <ActionRow icon="close" title={traduire("Déconnecter")} sub={traduire("Arrêter la synchronisation")} onPress={disconnect} color={S.danger} tint={S.dangerSoft} />
        </CardBox>
      ) : null}

      {Platform.OS === 'ios' && montre ? (
        <CardBox>
          <ActionRow first icon="watch" title="Apple Watch" sub={texteMontre(montre)} color={S.accent} tint={S.accentSoft} />
          <ActionRow icon="sync" title={watchSyncing ? 'Envoi en cours' : traduire('Envoyer à la montre maintenant')} onPress={watchSync} busy={watchSyncing} color={S.accent} tint={S.accentSoft} />
        </CardBox>
      ) : null}

      {!isLive ? (
        <>
          <Label>{traduire("Comment ça marche")}</Label>
          <DataBridge />
          <CardBox style={{ paddingVertical: 16 }}>
            <Steps steps={instructions} />
          </CardBox>
        </>
      ) : null}

      {/* 14 octobre 2026 : le même compte que Réglages, Santé, Accès aux données (lecture et écriture séparées) */}
      <Label aside={traduire("{0} en lecture, {1} en écriture", resumeDemande(Platform.OS).lecture, resumeDemande(Platform.OS).ecriture)}>{traduire("Ce que YOROI lit")}</Label>
      <GlassBox style={{ gap: 12 }}>
        {FAMILY_ORDER.map((f) => {
          const defs = METRICS.filter((m) => m.family === f && availableOn(m, Platform.OS === 'android'));
          if (defs.length === 0) return null;
          return (
            <View key={f} style={{ gap: 6 }}>
              <Ink size={12} weight="extraBold" color={S.ink2}>
                {FAMILY[f].label}
              </Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {defs.map((m) => (
                  <Press key={m.key} onPress={() => router.push(`/sante/${m.key}` as any)} accessibilityRole="button" accessibilityLabel={m.label}>
                    <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 10, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2 }}>
                      <IconDot name={METRIC_ICON[m.key] ?? 'pulse'} color={FAMILY[f].color} tint={FAMILY[f].tint} size={28} />
                      <Ink size={12} weight="bold">
                        {m.label}
                      </Ink>
                    </View>
                  </Press>
                ))}
              </View>
            </View>
          );
        })}
        <Ink size={12} weight="bold" color={S.muted}>
          {Platform.OS === 'ios'
            ? traduire("Apple ne dit pas à YOROI ce que tu as coché. Pour changer un accès : Réglages, Santé, Accès aux données et appareils, YOROI.")
            : traduire('Pour changer un accès : ouvre Health Connect, Autorisations des applis, YOROI.')}
        </Ink>
      </GlassBox>

      {Platform.OS === 'android' && isLive && perms && anyPerm ? (
        <CardBox>
          {PERM_LABELS.map((p, i) => (
            <ActionRow key={p.key} first={i === 0} icon={perms[p.key] ? 'check' : 'close'} title={p.label} sub={perms[p.key] ? traduire('Autorisé') : traduire('Non autorisé')} color={perms[p.key] ? S.mossText : S.muted} tint={perms[p.key] ? S.mossSoft : S.line2} />
          ))}
        </CardBox>
      ) : null}

      <Label aside={detected.length ? traduire("{0} sur 30 jours", detected.length) : undefined}>{traduire("Tes appareils")}</Label>
      {detected.length > 0 ? (
        <CardBox>
          {detected.map((d, i) => {
            const show = SOURCE_DISPLAY[d.source] ?? { name: d.source, color: S.ink, emoji: String(d.source ?? '?').slice(0, 1).toUpperCase() };
            return (
              <View key={d.source} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: S.line2 }}>
                <BrandMark text={show.emoji} color={show.color} size={38} />
                <View style={{ flex: 1 }}>
                  <Ink size={15} weight="extraBold">
                    {show.name}
                  </Ink>
                  <Ink size={12} weight="bold" color={S.ink2}>
                    {[d.last_type ? DATA_TYPE_LABELS[d.last_type] ?? d.last_type : null, d.last_date ? whenLabel(d.last_date) : null].filter(Boolean).join(', ') || traduire('Reçu récemment')}
                  </Ink>
                </View>
                <View style={{ minWidth: 36, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: S.paper, alignItems: 'center', justifyContent: 'center' }}>
                  <Ink size={12} weight="black">
                    {String(d.record_count)}
                  </Ink>
                </View>
              </View>
            );
          })}
        </CardBox>
      ) : (
        <Notice text={native ? traduire(`Aucun appareil n'a encore envoyé de mesure. Configure ta montre ou ta balance, puis synchronise.`) : traduire("Les appareils détectés s'affichent dans l'app installée, une fois Santé ou Health Connect relié.")} />
      )}
      <CardBox>
        <ActionRow first icon="watch" title={traduire("Configurer ta montre ou ta balance")} sub={traduire("Le guide de ta marque, pas à pas, vers {0}", provider)} onPress={() => router.push('/sante/montre' as any)} color={S.accent} tint={S.accentSoft} />
        {native ? <ActionRow icon="external" title={`Ouvrir ${provider}`} sub={traduire("Vérifier les autorisations de YOROI")} onPress={openApp} /> : null}
      </CardBox>

      <Accordion title={traduire("Ce que chaque appareil envoie")} sub={traduire("Poids, cœur, sommeil, pas, calories, VO2 max")} mark={<BrandMark text="" kind="montre" color={S.accent} size={38} />}>
        <DataMatrix />
      </Accordion>

      {!isLive ? (
        <CardBox>
          <ActionRow first icon="spark" title="Automatique" sub={traduire("Plus besoin de tout saisir à la main")} color={S.accent} tint={S.accentSoft} />
          <ActionRow icon="shield" title={traduire("Privé")} sub={traduire("Tes données restent sur ton téléphone")} color={S.indigo} tint={S.indigoSoft} />
          <ActionRow icon="watch" title="Compatible" sub={traduire("Toute marque qui partage avec {0}", provider)} color={S.mossText} tint={S.mossSoft} />
        </CardBox>
      ) : null}

      <Label>{traduire("Un souci de liaison")}</Label>
      <CardBox style={{ paddingVertical: 14, gap: 12 }}>
        <SmallButton label={checking ? traduire('Vérification') : traduire('Vérifier la connexion')} icon="search" busy={checking} onPress={verify} />
        {check ? (
          <View>
            {[
              { label: `${provider} disponible`, ok: check.available },
              { label: traduire('Autorisations accordées'), ok: check.permissions },
              { label: check.hasWeight && check.weightValue ? traduire("Dernier poids : {0} kg", check.weightValue.toFixed(1).replace('.', DECIMAL)) : traduire('Poids reçu'), ok: check.hasWeight },
            ].map((it, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: S.line2 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: it.ok ? S.mossSoft : S.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <SanteIcon name={it.ok ? 'check' : 'close'} size={14} color={it.ok ? S.mossText : S.danger} width={2.6} />
                </View>
                <Ink size={14} weight="bold" style={{ flex: 1 }}>
                  {it.label}
                </Ink>
              </View>
            ))}
          </View>
        ) : null}
        {check && !check.hasWeight ? (
          <Notice
            tone="bad"
            text={
              !check.available
                ? Platform.OS === 'android'
                  ? traduire('Installe Health Connect depuis le Play Store, puis reviens ici.')
                  : source?.mode === 'expoGo' && __DEV__
                    ? traduire("Mode test\u00A0: dans Expo Go, Apple Santé n'est pas accessible. Teste dans l'app installée.")
                    : traduire("L'app Santé n'est pas disponible sur cet appareil.")
                : !check.permissions
                  ? traduire("Autorise YOROI à accéder à {0} avec le bouton Connecter plus haut.", provider)
                  : traduire("Vérifie que ton appareil partage bien ses données avec {0} dans son app (Garmin Connect, Withings, Fitbit). La synchro peut prendre quelques minutes.", provider)
            }
          />
        ) : null}
        {native ? <SmallButton label={traduire("Réinitialiser la liaison")} tone="light" icon="restore" onPress={reset} /> : null}
      </CardBox>

      <LinesSheet visible={!!report} title={report?.title ?? ''} lines={report?.lines ?? []} actions={report?.actions} onClose={() => setReport(null)} />
    </DetailScreen>
  );
}
