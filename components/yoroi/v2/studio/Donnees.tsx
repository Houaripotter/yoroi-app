/**
 * Studio, rubrique Donnees et sante : etat d'Apple Sante ou de Health Connect, derniere synchro,
 * ce qui a ete importe, relance de la synchro ; etat des migrations (nettoyage des doublons, reprise
 * des rangs v3, autres) avec leurs dates, et le retour des seances effacees par le nettoyage
 * (restoreDedupeBackup) derriere une double confirmation. Rien ne se lance pendant une demo :
 * la base contient alors Heny, pas tes donnees.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Row } from '@/components/yoroi/v2/espace/ui';
import { healthConnect } from '@/lib/healthConnect';
import { openDatabase } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { restoreDedupeBackup } from '@/lib/v2/seances/dedupeMigration';
import { readDedupeBackup, readMigrations, type DedupeBackupInfo, type MigrationRow } from '@/lib/v2/creator/migrations';
import { formatDateTime } from '@/lib/v2/creator/deviceInfo';
import { KV, Note, StudioSection, SubTitle, confirmTwice, useStudio } from './parts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Health = { provider: string; connected: boolean; lastSync: string | null };
type Imported = { trainings: { source: string; n: number }[]; weights: { source: string; n: number }[]; health: number } | null;

const SOURCE_LABELS: Record<string, string> = {
  manual: traduire('Notées dans YOROI'),
  apple_health: 'Apple Santé',
  healthkit: 'Apple Santé',
  health_connect: 'Health Connect',
  watch: 'Montre',
  garmin: 'Garmin',
  withings: 'Withings',
  demo: traduire('Démo'),
};
const srcLabel = (s: string) => SOURCE_LABELS[s] ?? (s || traduire('Sans source'));

/** Une lecture qui ne repond pas (base fermee sur le web) ne bloque pas la rubrique */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

async function readImported(): Promise<Imported> {
  try {
    const db = await openDatabase();
    const trainings = await db.getAllAsync<{ source: string | null; n: number }>("SELECT COALESCE(source, '') AS source, COUNT(*) AS n FROM trainings GROUP BY COALESCE(source, '') ORDER BY n DESC");
    const weights = await db.getAllAsync<{ source: string | null; n: number }>("SELECT COALESCE(source, '') AS source, COUNT(*) AS n FROM weights GROUP BY COALESCE(source, '') ORDER BY n DESC");
    let health = 0;
    try {
      const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM health_data');
      health = Number(row?.n ?? 0);
    } catch {
      health = 0;
    }
    return {
      trainings: trainings.map((r) => ({ source: String(r.source ?? ''), n: Number(r.n) })),
      weights: weights.map((r) => ({ source: String(r.source ?? ''), n: Number(r.n) })),
      health,
    };
  } catch {
    return null;
  }
}

export function Donnees() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { demoActive } = useStudio();
  const [health, setHealth] = useState<Health | null>(null);
  const [imported, setImported] = useState<Imported | undefined>(undefined);
  const [migrations, setMigrations] = useState<MigrationRow[] | null>(null);
  const [dedupe, setDedupe] = useState<DedupeBackupInfo | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = healthConnect.getSyncStatus();
      const stored = await AsyncStorage.getItem('@yoroi_last_health_sync').catch(() => null);
      const last = s.lastSync ?? stored;
      setHealth({ provider: Platform.OS === 'ios' ? 'Apple Santé' : Platform.OS === 'android' ? 'Health Connect' : traduire('Aucune sur le web'), connected: s.isConnected, lastSync: last ? formatDateTime(Date.parse(last)) : null });
    } catch {
      setHealth({ provider: traduire('Indisponible ici'), connected: false, lastSync: null });
    }
    const [imp, mig, ded] = await Promise.all([withTimeout(readImported(), 5000, null), withTimeout(readMigrations(), 5000, [] as MigrationRow[]), withTimeout(readDedupeBackup(), 5000, null)]);
    setImported(imp);
    setMigrations(mig);
    setDedupe(ded);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    if (demoActive) {
      appAlert(traduire('Démo chargée'), traduire('Remets d’abord tes vraies données : sinon la synchro écrirait dans la démo de Heny.'));
      return;
    }
    setSyncing(true);
    try {
      await healthConnect.syncAll();
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } catch {
      appAlert(traduire('Synchro impossible'), traduire('La synchro n’a pas abouti. Vérifie la connexion santé dans Réglages.'));
    } finally {
      setSyncing(false);
      void load();
    }
  };

  const restoreDedupe = () => {
    if (demoActive) {
      appAlert(traduire('Démo chargée'), traduire('Remets d’abord tes vraies données : les séances reviendraient dans la démo.'));
      return;
    }
    if (!dedupe?.exists || dedupe.restoredAt || !dedupe.rows) {
      appAlert(traduire('Rien à remettre'), dedupe?.restoredAt ? traduire("Les séances ont déjà été remises le {0}.", dedupe.restoredAt) : traduire('Le nettoyage n’a rien mis de côté sur ce téléphone.'));
      return;
    }
    confirmTwice(
      { title: traduire('Remettre les séances effacées ?'), message: traduirePluriel(dedupe.rows, dedupe.rows > 1, "{0} séance effacée par le nettoyage des doublons reviennent dans ton historique. Les doublons d’Apple Santé peuvent réapparaître.", "{0} séances effacées par le nettoyage des doublons reviennent dans ton historique. Les doublons d’Apple Santé peuvent réapparaître.", dedupe.rows), ok: 'Continuer' },
      { title: 'Vraiment ?', message: traduire('Les séances remises restent dans ton historique. Tu pourras les supprimer une par une.'), ok: 'Remettre' },
      () => {
        restoreDedupeBackup()
          .then((n) => {
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            appAlert(traduire('C’est fait'), traduirePluriel(n, n > 1, "{0} séance remise en place.", "{0} séances remises en place.", n));
            void load();
          })
          .catch(() => appAlert('Oups', traduire('Le retour des séances n’a pas abouti. Rien n’a été perdu, réessaie plus tard.')));
      },
    );
  };

  const total = (list: { n: number }[]) => list.reduce((s, r) => s + r.n, 0);

  return (
    <StudioSection id="donnees" icon="pulse" title={traduire("Données et santé")} sub={traduire("Apple Santé, imports, migrations")} keywords="sante apple health connect synchro import montre migration doublons dedupe reprise rangs v3 armure">
      <Card>
        <KV first label="Source" value={health?.provider ?? 'Lecture'} />
        <KV label="Connexion" value={health ? (health.connected ? traduire('Connectée') : traduire('Pas connectée')) : ''} />
        <KV label={traduire("Dernière synchro")} value={health?.lastSync ?? 'Jamais'} />
      </Card>
      <Card>
        <Row first icon="sync" label={syncing ? 'Synchro en cours' : traduire('Relancer la synchro')} sub={traduire("Lit les nouvelles données de la santé du téléphone")} onPress={syncing ? undefined : () => void sync()} />
        <Row icon="heart" label={traduire("Connexion santé")} sub={traduire("Autorisations et sources")} onPress={() => router.push('/health-connect' as never)} />
      </Card>

      <SubTitle>{demoActive ? traduire('Dans la base (la démo de Heny)') : traduire('Dans la base')}</SubTitle>
      <Card>
        {imported === undefined ? (
          <KV first label="Lecture en cours" value="" />
        ) : imported === null ? (
          <View style={{ padding: 14 }}>
            <Ink size={13} color={c.textSecondary}>{traduire("La base ne s’ouvre pas ici (web ou aperçu). Sur le téléphone, tu verras chaque source.")}</Ink>
          </View>
        ) : (
          <>
            <KV first label={traduire("Séances")} value={String(total(imported.trainings))} />
            {imported.trainings.map((r) => (
              <KV key={`t${r.source}`} label={`  ${srcLabel(r.source)}`} value={String(r.n)} />
            ))}
            <KV label={traduire("Pesées")} value={String(total(imported.weights))} />
            {imported.weights.map((r) => (
              <KV key={`w${r.source}`} label={`  ${srcLabel(r.source)}`} value={String(r.n)} />
            ))}
            <KV label={traduire("Mesures santé importées")} value={String(imported.health)} />
          </>
        )}
      </Card>

      <SubTitle>Migrations</SubTitle>
      <Card>
        {(migrations ?? []).map((m, i) => (
          <Row key={m.id} first={i === 0} icon={m.done ? 'check' : 'timer'} iconTint={m.done ? c.successText : c.textMuted} label={m.label} sub={m.detail ? `${m.state}, ${m.detail}` : m.state} chevron={false} />
        ))}
        {migrations === null ? <KV first label="Lecture en cours" value="" /> : null}
      </Card>
      <Card>
        <Row
          first
          danger
          icon="restore"
          label={traduire("Annuler le nettoyage")}
          sub={dedupe?.exists ? (dedupe.restoredAt ? traduire("Déjà remises le {0}", dedupe.restoredAt) : traduirePluriel(dedupe.rows, dedupe.rows > 1, "{0} séance gardée de côté", "{0} séances gardées de côté", dedupe.rows)) : traduire('Rien de mis de côté')}
          onPress={restoreDedupe}
        />
      </Card>
      <Note>{traduire("Deux confirmations. Les XP du Dojo ne bougent pas : leur registre ne redescend jamais.")}</Note>
    </StudioSection>
  );
}

export default Donnees;
