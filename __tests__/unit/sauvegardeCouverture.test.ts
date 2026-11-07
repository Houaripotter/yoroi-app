/**
 * Couverture de la sauvegarde (28 octobre 2026) : chaque cle de l'app trouvee dans le code
 * part dans la sauvegarde (allStorage), sauf celles mises de cote expres (cache, abonnement,
 * appareil, synchro, mot de passe, demo). Une nouvelle cle ecartee par erreur fait echouer ce test.
 */
import * as fs from 'fs';
import * as path from 'path';
import { isStorageKeySkipped, SECURE_DATA_KEYS } from '@/lib/v2/sauvegarde/fusion';
import { CLES_VOLUMINEUSES } from '@/lib/v2/coffre/migrationCoffre';

const racine = path.resolve(__dirname, '../..');
const DOSSIERS = ['lib', 'app', 'components', 'hooks', 'context', 'constants'];

function fichiers(d: string, out: string[] = []): string[] {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules' || e.name === 'i18n') continue;
      fichiers(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Cles ecartees expres : propres au telephone, a l'abonnement, a la synchro, caches, demo, mots de passe */
const ECARTEES_EXPRES = new Set([
  '@yoroi_backup_encryption_enabled', '@yoroi_backup_encryption_password', '@yoroi_cache_', '@yoroi_cloud_sync_notified_fp',
  '@yoroi_creator_mode', '@yoroi_data_version', '@yoroi_demo_backup_async', '@yoroi_demo_backup_sqlite', '@yoroi_demo_backup_tables',
  '@yoroi_demo_data_active', '@yoroi_demo_period', '@yoroi_demo_profile_key', '@yoroi_demo_snapshot_', '@yoroi_health_sync_status',
  '@yoroi_healthconnect_connected', '@yoroi_healthkit_asked', '@yoroi_install_date', '@yoroi_is_premium', '@yoroi_journal_data_cache_v1',
  '@yoroi_last_auto_backup', '@yoroi_last_auto_backup_attempt', '@yoroi_last_cloud_sync_failure', '@yoroi_last_cloud_sync_success',
  '@yoroi_last_full_import_ts', '@yoroi_last_full_import_ts_android', '@yoroi_last_known_cloud_backup', '@yoroi_last_known_cloud_fingerprint',
  '@yoroi_migration_echec', '@yoroi_peer_device_id', '@yoroi_peer_had_v2', '@yoroi_peer_last_sync', '@yoroi_peer_since_v3',
  '@yoroi_premium_expires', '@yoroi_premium_expires_at', '@yoroi_premium_source', '@yoroi_purchased_avatars', '@yoroi_purchased_packs',
  '@yoroi_records_cache_v1', '@yoroi_rehyd_notif_ids', '@yoroi_safety_snapshot_last', '@yoroi_sync_history', '@yoroi_trial_reminder',
  '@yoroi_watch_cache', 'yoroi_creator_attempts_v1', 'yoroi_creator_token_v1', 'yoroi_dedupe_v1_backup', 'yoroi_encrypted',
  'yoroi_paywall_vitrine_v1', 'yoroi_peer_pairs_v1', 'yoroi_premium_annual', 'yoroi_premium_cache_v1', 'yoroi_premium_choix_v1',
  'yoroi_premium_fin_vue_v1', 'yoroi_premium_monthly', 'yoroi_premium_product_v1', 'yoroi_studio_demos_v1',
  // 28 octobre 2026 : etat de la synchro par element et effacement en attente, propres a ce telephone
  '@yoroi_peer_elements_v1:', '@yoroi_peer_horloge_v1', '@yoroi_peer_journal_v1', '@yoroi_peer_since_x_v1',
  // 30 octobre 2026 : relais des reglages entre plus de deux appareils, propre a chaque appareil
  '@yoroi_peer_kv_relais_v1',
  '@yoroi_safety_coffre_efface:',
  // 31 octobre 2026 : instantane des grands widgets iPad et Mac, un cache recalcule par l'app (lib/v2/widgetsGrands)
  'yoroi_widgets_grands_v1.json',
  // 7 novembre 2026 : sauvegarde automatique, propre a ce telephone (identifiant pour le nom des copies iCloud,
  // dates de la derniere copie, du dernier echec et du premier essai)
  '@yoroi_cloud_sync_appareil', 'yoroi_cloud_sync_appareil', '@yoroi_cloud_sync_icloud_echec', '@yoroi_cloud_sync_icloud_premier_essai',
  '@yoroi_last_icloud_success',
]);

function clesDuCode(): Set<string> {
  const cles = new Set<string>();
  const litteral = /['"`](@?yoroi[_a-zA-Z0-9:.-]*|@[a-z_]+[a-zA-Z0-9_:.-]*)['"`]/g;
  const constante = /(?:KEY|CLE|Key|Cle)[A-Za-z0-9_]* *[:=] *['"]([^'"]+)['"]/g;
  for (const d of DOSSIERS) {
    for (const f of fichiers(path.join(racine, d))) {
      const t = fs.readFileSync(f, 'utf8');
      for (const m of t.matchAll(litteral)) cles.add(m[1]);
      for (const m of t.matchAll(constante)) cles.add(m[1]);
    }
  }
  return cles;
}

describe('sauvegarde : aucune donnee saisie oubliee', () => {
  const cles = clesDuCode();

  it('le code contient bien des cles (le scan marche)', () => {
    expect(cles.size).toBeGreaterThan(300);
    expect(cles.has('@yoroi_pratiques')).toBe(true);
  });

  it('toute cle ecartee de la sauvegarde l est expres', () => {
    const ecarteesParErreur = [...cles].filter((k) => isStorageKeySkipped(k) && !ECARTEES_EXPRES.has(k)).sort();
    expect(ecarteesParErreur).toEqual([]);
  });

  it('les donnees saisies importantes partent dans la sauvegarde', () => {
    for (const k of [
      '@yoroi_pratiques', 'yoroi_benchmarks_v2', 'yoroi_skills_v2', '@yoroi_sparring_partners', '@yoroi_photo_history',
      '@yoroi_personal_records', '@yoroi_training_loads', 'yoroi_widgets_style_v1', '@yoroi_avatar_config', '@yoroi_belt',
    ]) {
      expect(isStorageKeySkipped(k)).toBe(false);
    }
  });

  it('les donnees du coffre (mesures, blessures, nuits, humeur, jeune, eau) sont sauvegardees', () => {
    for (const k of ['@yoroi_measurements', '@yoroi_injuries', '@yoroi_sleep_entries', '@yoroi_mood_log', '@yoroi_fasting_history', '@yoroi_water_intake', '@yoroi_body_composition', '@yoroi_user_settings']) {
      expect(SECURE_DATA_KEYS as readonly string[]).toContain(k);
    }
  });

  it('les donnees ajoutees a la synchro le 28 octobre partent aussi dans la sauvegarde', () => {
    for (const k of [
      'yoroi_mes_seances_v1', 'yoroi_programmes_perso_v1', 'yoroi_programme_actif_v1', 'yoroi_programmes_favoris_v1',
      'yoroi_espace_v1', '@yoroi_scenes_gagnees_v1', '@yoroi_user_goals', '@yoroi_v2_sante_ring_goals', '@yoroi_hydration_goal',
      '@yoroi_hydration_history', '@yoroi_notification_settings', '@yoroi_smart_reminders_settings', '@yoroi_photos_v2',
      '@yoroi_photos_autres_telephones_v1', 'yoroi_materiel_v1', 'yoroi_salle_machines_v1',
    ]) {
      expect(isStorageKeySkipped(k)).toBe(false);
    }
  });

  it('les listes sorties du coffre (base a part) sont toujours dans la liste sauvegardee du coffre', () => {
    for (const k of CLES_VOLUMINEUSES) expect(SECURE_DATA_KEYS as readonly string[]).toContain(k);
  });

  it('chaque cle du coffre ecrite par le code est dans la liste sauvegardee', () => {
    const ecrites = new Set<string>();
    for (const d of DOSSIERS) {
      for (const f of fichiers(path.join(racine, d))) {
        const t = fs.readFileSync(f, 'utf8');
        for (const m of t.matchAll(/secureStorage\.setItem\(\s*['"]([^'"]+)['"]/g)) ecrites.add(m[1]);
      }
    }
    const horsListe = [...ecrites].filter((k) => !(SECURE_DATA_KEYS as readonly string[]).includes(k) && !/password|encrypt|token/i.test(k));
    expect(horsListe).toEqual([]);
  });
});
