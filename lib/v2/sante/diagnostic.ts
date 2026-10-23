/**
 * Diagnostic des seances Apple Sante (iPhone) : relance l'autorisation de lecture
 * via le module Swift, puis lit le rapport de healthConnect.diagnoseWorkouts.
 * Renvoie des lignes lisibles et ce qu'on peut proposer ensuite.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnect } from '@/lib/healthConnect';
import { requestWorkoutReadAuthNative } from '@/lib/yoroiHealthKit';
import { traduire } from '@/lib/i18n/tr';

export type DiagReport = {
  lines: string[];
  canImport: boolean;
  suggestSettings: boolean;
  unavailable?: string;
};

export async function diagnoseWorkouts(): Promise<DiagReport> {
  const svc = healthConnect as unknown as Record<string, any>;
  if (Platform.OS !== 'ios' || typeof svc.diagnoseWorkouts !== 'function') {
    return { lines: [], canImport: false, suggestSettings: false, unavailable: traduire("Ce diagnostic lit l’app Santé de ton téléphone : il fonctionne sur iPhone, dans l'app installée.") };
  }
  const authResult: string = await requestWorkoutReadAuthNative();
  const diag: any = await svc.diagnoseWorkouts();
  const lines: string[] = [];

  lines.push(traduire('Autorisation de lecture'));
  if (String(authResult).startsWith('error:')) {
    lines.push(traduire("Module natif : {0}", String(authResult).replace('error:', '')));
  } else {
    const parts: Record<string, string> = {};
    String(authResult)
      .split('|')
      .forEach((p) => {
        const idx = p.indexOf(':');
        if (idx > 0) parts[p.slice(0, idx)] = p.slice(idx + 1);
      });
    const count = parts.count ?? '?';
    const status = parts.authStatus;
    if (status) lines.push(traduire("Accès système : {0}", status === '2' ? traduire('autorisé') : status === '1' ? traduire('refusé') : traduire('pas encore demandé')));
    lines.push(traduire("Séances lisibles : {0}", count));
    if (parts.sources) lines.push(traduire("Sources visibles : {0}", parts.sources));
    if (count === '0') lines.push(traduire('Les séances de la montre ne sont pas accessibles, même après la demande.'));
  }
  lines.push('');

  lines.push('Module Swift');
  const nm = diag.nativeModuleTest;
  if (nm === -1) lines.push(traduire('Lecture native : non testée'));
  else if (nm === -2) lines.push(traduire('Lecture native : absente ou en erreur'));
  else lines.push(traduire("Lecture native : {0} séance(s) sur 365 jours", nm));

  const nd = diag.nativeDiag;
  if (nd) {
    const authMap: Record<number, string> = { 0: traduire('pas encore demandé'), 1: traduire('refusé'), 2: traduire('autorisé') };
    lines.push(traduire("Accès système (Swift) : {0}", authMap[nd.authStatus] ?? nd.authStatus));
    if (nd.sourceError) lines.push(traduire("Test A, sources : erreur {0}", nd.sourceError));
    else lines.push(traduire("Test A, sources : {0}", nd.sources?.length ? nd.sources.join(', ') : traduire('aucune')));
    if (nd.nuclearError) lines.push(traduire("Test B, sans filtre : erreur {0}", nd.nuclearError));
    else lines.push(traduire("Test B, sans filtre : {0} séance(s){1}", nd.nuclearTest?.count ?? 0, nd.nuclearTest?.found ? `, source ${nd.nuclearTest.sourceName || '?'}` : ''));
    if (nd.predicateError) lines.push(traduire("Test C, 365 jours : erreur {0}", nd.predicateError));
    else lines.push(traduire("Test C, 365 jours : {0} séance(s)", nd.predicateTest?.count ?? 0));
    if (nd.externalError) lines.push(traduire("Test D, hors YOROI : erreur {0}", nd.externalError));
    else if (nd.externalTest !== undefined) lines.push(traduire("Test D, hors YOROI : {0} séance(s){1}", nd.externalTest?.count ?? 0, nd.externalTest?.found ? `, ${nd.externalTest.sourceName}` : ''));

    const sources: string[] = nd.sources ?? [];
    const nuclear: number = nd.nuclearTest?.count ?? 0;
    const external: number = nd.externalTest?.count ?? 0;
    lines.push('');
    if (nuclear > 0 && external === 0) lines.push(traduire("Cause : iOS ne laisse lire que les séances créées par YOROI. Celles de l'Apple Watch ou de Forme restent bloquées."));
    else if (nuclear > 0 && nd.predicateTest?.count === 0) lines.push(traduire('Cause : séances trouvées sans date mais aucune avec date. Problème de conversion des dates.'));
    else if (nuclear === 0 && sources.length > 0) lines.push(traduire("Cause : sources connues mais aucune séance accessible. L'accès est refusé dans les réglages."));
    else if (nuclear === 0 && sources.length === 0) lines.push(traduire('Cause : aucune séance et aucune source. Active Entraînements dans Réglages, Santé, YOROI.'));
    else if (external > 0) lines.push(traduire("Les séances des autres apps sont visibles : l'accès est bon."));
  } else if (nm !== -2) {
    lines.push(traduire('Diagnostic approfondi indisponible dans cette version.'));
  }
  lines.push('');

  lines.push(traduire('Lecture Apple Santé'));
  lines.push(`Module : ${diag.moduleLoaded ? traduire('chargé') : traduire('non chargé')}`);
  lines.push(traduire("Connexion : {0}", diag.isConnected ? traduire('oui') : traduire('non')));
  if (diag.authStatus) lines.push(traduire("Autorisation séances : {0}", diag.authStatus));
  if (diag.rawApiTest === -2) lines.push(traduire("Requête simple : erreur {0}", diag.rawApiError));
  else if (diag.rawApiTest >= 0) lines.push(traduire("Requête simple : {0} séance(s)", diag.rawApiTest));
  if (diag.anchorApiTest === -2) lines.push(traduire("Requête ancrée : erreur {0}", diag.anchorApiError));
  else if (diag.anchorApiTest >= 0) lines.push(traduire("Requête ancrée : {0} séance(s)", diag.anchorApiTest));
  if (diag.healthkit30d >= 0) lines.push(traduire("Séances sur 365 jours : {0}", diag.healthkit30d));
  if (diag.activityTypes?.length) lines.push(`Types : ${diag.activityTypes.join(', ')}`);
  lines.push('');

  lines.push('Base YOROI');
  lines.push(traduire("Séances enregistrées : {0} (dont {1} venues de l’app Santé de ton téléphone)", diag.dbCount, diag.dbFromHealthkit));
  lines.push(traduire("Empreintes en mémoire : {0}", diag.cacheSize));

  const hasWorkouts = nm > 0 || diag.healthkit30d > 0 || diag.rawApiTest > 0 || diag.anchorApiTest > 0;
  if (diag.moduleLoaded && !hasWorkouts) {
    lines.push('');
    lines.push(traduire("Cause probable : l'accès Entraînements n'est pas activé pour YOROI dans l’app Santé de ton téléphone."));
  }
  if (diag.error) lines.push(traduire("Erreur : {0}", diag.error));
  return { lines, canImport: hasWorkouts, suggestSettings: !hasWorkouts && (diag.moduleLoaded || nm >= 0) };
}

/** Efface les empreintes pour forcer une vraie reimportation, puis lance l'import complet */
export async function forceReimport(onProgress?: (step: string, current: number, total: number) => void) {
  await AsyncStorage.multiRemove(['@yoroi_imported_workouts', '@yoroi_full_history_imported', '@yoroi_import_version']);
  return healthConnect.importFullHistory(onProgress);
}
