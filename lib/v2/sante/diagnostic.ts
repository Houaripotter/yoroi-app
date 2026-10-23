/**
 * Diagnostic des seances Apple Sante (iPhone) : relance l'autorisation de lecture
 * via le module Swift, puis lit le rapport de healthConnect.diagnoseWorkouts.
 * Renvoie des lignes lisibles et ce qu'on peut proposer ensuite.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnect } from '@/lib/healthConnect';
import { requestWorkoutReadAuthNative } from '@/lib/yoroiHealthKit';

export type DiagReport = {
  lines: string[];
  canImport: boolean;
  suggestSettings: boolean;
  unavailable?: string;
};

export async function diagnoseWorkouts(): Promise<DiagReport> {
  const svc = healthConnect as unknown as Record<string, any>;
  if (Platform.OS !== 'ios' || typeof svc.diagnoseWorkouts !== 'function') {
    return { lines: [], canImport: false, suggestSettings: false, unavailable: "Ce diagnostic lit Apple Santé : il fonctionne sur iPhone, dans l'app installée." };
  }
  const authResult: string = await requestWorkoutReadAuthNative();
  const diag: any = await svc.diagnoseWorkouts();
  const lines: string[] = [];

  lines.push('Autorisation de lecture');
  if (String(authResult).startsWith('error:')) {
    lines.push(`Module natif : ${String(authResult).replace('error:', '')}`);
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
    if (status) lines.push(`Accès système : ${status === '2' ? 'autorisé' : status === '1' ? 'refusé' : 'pas encore demandé'}`);
    lines.push(`Séances lisibles : ${count}`);
    if (parts.sources) lines.push(`Sources visibles : ${parts.sources}`);
    if (count === '0') lines.push('Les séances de la montre ne sont pas accessibles, même après la demande.');
  }
  lines.push('');

  lines.push('Module Swift');
  const nm = diag.nativeModuleTest;
  if (nm === -1) lines.push('Lecture native : non testée');
  else if (nm === -2) lines.push('Lecture native : absente ou en erreur');
  else lines.push(`Lecture native : ${nm} séance(s) sur 365 jours`);

  const nd = diag.nativeDiag;
  if (nd) {
    const authMap: Record<number, string> = { 0: 'pas encore demandé', 1: 'refusé', 2: 'autorisé' };
    lines.push(`Accès système (Swift) : ${authMap[nd.authStatus] ?? nd.authStatus}`);
    if (nd.sourceError) lines.push(`Test A, sources : erreur ${nd.sourceError}`);
    else lines.push(`Test A, sources : ${nd.sources?.length ? nd.sources.join(', ') : 'aucune'}`);
    if (nd.nuclearError) lines.push(`Test B, sans filtre : erreur ${nd.nuclearError}`);
    else lines.push(`Test B, sans filtre : ${nd.nuclearTest?.count ?? 0} séance(s)${nd.nuclearTest?.found ? `, source ${nd.nuclearTest.sourceName || '?'}` : ''}`);
    if (nd.predicateError) lines.push(`Test C, 365 jours : erreur ${nd.predicateError}`);
    else lines.push(`Test C, 365 jours : ${nd.predicateTest?.count ?? 0} séance(s)`);
    if (nd.externalError) lines.push(`Test D, hors YOROI : erreur ${nd.externalError}`);
    else if (nd.externalTest !== undefined) lines.push(`Test D, hors YOROI : ${nd.externalTest?.count ?? 0} séance(s)${nd.externalTest?.found ? `, ${nd.externalTest.sourceName}` : ''}`);

    const sources: string[] = nd.sources ?? [];
    const nuclear: number = nd.nuclearTest?.count ?? 0;
    const external: number = nd.externalTest?.count ?? 0;
    lines.push('');
    if (nuclear > 0 && external === 0) lines.push("Cause : iOS ne laisse lire que les séances créées par YOROI. Celles de l'Apple Watch ou de Forme restent bloquées.");
    else if (nuclear > 0 && nd.predicateTest?.count === 0) lines.push('Cause : séances trouvées sans date mais aucune avec date. Problème de conversion des dates.');
    else if (nuclear === 0 && sources.length > 0) lines.push("Cause : sources connues mais aucune séance accessible. L'accès est refusé dans les réglages.");
    else if (nuclear === 0 && sources.length === 0) lines.push('Cause : aucune séance et aucune source. Active Entraînements dans Réglages, Santé, YOROI.');
    else if (external > 0) lines.push("Les séances des autres apps sont visibles : l'accès est bon.");
  } else if (nm !== -2) {
    lines.push('Diagnostic approfondi indisponible dans cette version.');
  }
  lines.push('');

  lines.push('Lecture Apple Santé');
  lines.push(`Module : ${diag.moduleLoaded ? 'chargé' : 'non chargé'}`);
  lines.push(`Connexion : ${diag.isConnected ? 'oui' : 'non'}`);
  if (diag.authStatus) lines.push(`Autorisation séances : ${diag.authStatus}`);
  if (diag.rawApiTest === -2) lines.push(`Requête simple : erreur ${diag.rawApiError}`);
  else if (diag.rawApiTest >= 0) lines.push(`Requête simple : ${diag.rawApiTest} séance(s)`);
  if (diag.anchorApiTest === -2) lines.push(`Requête ancrée : erreur ${diag.anchorApiError}`);
  else if (diag.anchorApiTest >= 0) lines.push(`Requête ancrée : ${diag.anchorApiTest} séance(s)`);
  if (diag.healthkit30d >= 0) lines.push(`Séances sur 365 jours : ${diag.healthkit30d}`);
  if (diag.activityTypes?.length) lines.push(`Types : ${diag.activityTypes.join(', ')}`);
  lines.push('');

  lines.push('Base YOROI');
  lines.push(`Séances enregistrées : ${diag.dbCount} (dont ${diag.dbFromHealthkit} venues d'Apple Santé)`);
  lines.push(`Empreintes en mémoire : ${diag.cacheSize}`);

  const hasWorkouts = nm > 0 || diag.healthkit30d > 0 || diag.rawApiTest > 0 || diag.anchorApiTest > 0;
  if (diag.moduleLoaded && !hasWorkouts) {
    lines.push('');
    lines.push("Cause probable : l'accès Entraînements n'est pas activé pour YOROI dans Apple Santé.");
  }
  if (diag.error) lines.push(`Erreur : ${diag.error}`);
  return { lines, canImport: hasWorkouts, suggestSettings: !hasWorkouts && (diag.moduleLoaded || nm >= 0) };
}

/** Efface les empreintes pour forcer une vraie reimportation, puis lance l'import complet */
export async function forceReimport(onProgress?: (step: string, current: number, total: number) => void) {
  await AsyncStorage.multiRemove(['@yoroi_imported_workouts', '@yoroi_full_history_imported', '@yoroi_import_version']);
  return healthConnect.importFullHistory(onProgress);
}
