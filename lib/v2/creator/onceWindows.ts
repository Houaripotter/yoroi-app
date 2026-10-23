/**
 * Fenetres vues une seule fois, a rearmer depuis le Studio : chaque entree efface ses cles
 * (ou remet a zero ses reperes dans la meta de l'armure) pour que la fenetre se remontre.
 * Aucune XP n'est touchee.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { ARMURE_CHANGED_EVENT, syncArmure } from '@/lib/v2/armure';
import { traduire } from '@/lib/i18n/tr';

const META_KEY = 'yoroi_armure_meta_v1';

export type OnceWindow = { id: string; label: string; sub: string; reset: () => Promise<void> };

const removeKeys = (keys: string[]) => async () => {
  await AsyncStorage.multiRemove(keys);
};

async function patchMeta(fn: (m: Record<string, unknown>) => void): Promise<void> {
  await syncArmure(true).catch(() => undefined);
  const raw = await AsyncStorage.getItem(META_KEY);
  if (!raw) return;
  const meta = JSON.parse(raw) as Record<string, unknown>;
  fn(meta);
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  const snap = await syncArmure(true).catch(() => null);
  if (snap) DeviceEventEmitter.emit(ARMURE_CHANGED_EVENT, snap.state);
}

export const ONCE_WINDOWS: OnceWindow[] = [
  { id: 'nouveautes', label: traduire('Nouveautés de la version'), sub: traduire('La fenêtre montrée après une mise à jour'), reset: removeKeys(['WHATS_NEW_LAST_SEEN_VERSION']) },
  { id: 'presentation', label: traduire('Visite guidée'), sub: traduire('Une fois après l’onboarding ou la mise à jour'), reset: removeKeys(['@yoroi_tour_v2_seen', '@yoroi_visite_guidee_v3_done']) },
  { id: 'tour', label: traduire('Tour de découverte'), sub: traduire('Celui qui suit la fin de l’onboarding'), reset: removeKeys(['@yoroi_onboarding_tour_done']) },
  { id: 'brouillon', label: traduire('Brouillon de l’onboarding'), sub: traduire('Réponses gardées et conditions acceptées'), reset: removeKeys(['@yoroi_onboarding_draft_v3', '@yoroi_legal_accepted']) },
  {
    id: 'bienvenue',
    label: traduire('Bienvenue des anciens'),
    sub: traduire('Le résumé de reprise, dans le Dojo (s’il existe)'),
    reset: () => patchMeta((m) => { m.welcomeSeen = false; }),
  },
  {
    id: 'rang',
    label: traduire('Passage de rang et plaques'),
    sub: traduire('La célébration du rang actuel, dans le Dojo'),
    reset: () => patchMeta((m) => { m.rankSeen = 0; m.danSeen = 0; m.plateSeen = 0; }),
  },
  {
    id: 'sceaux',
    label: traduire('Sceaux à fêter'),
    sub: traduire('Le récapitulatif des sceaux déjà gagnés'),
    reset: () =>
      patchMeta((m) => {
        const seals = m.seals && typeof m.seals === 'object' ? Object.keys(m.seals as Record<string, string>) : [];
        m.pendingSeals = seals;
        m.recap = seals.length > 0;
      }),
  },
  { id: 'avis', label: traduire('Demande d’avis'), sub: traduire('Compteurs et refus de notation'), reset: removeKeys(['yoroi_review_asked', 'yoroi_review_count', '@yoroi_avis_version_demandee', '@yoroi_review_last_prompt', '@yoroi_rating_action_count', '@yoroi_rating_has_rated', '@yoroi_rating_last_prompt', '@yoroi_rating_dismissed_count']) },
  { id: 'rappels', label: traduire('Proposition de rappels'), sub: traduire('Fenêtre qui explique les notifications, après une pesée ou une séance'), reset: removeKeys(['@yoroi_notif_permission_v1']) },
  { id: 'sante', label: traduire('Connexion santé'), sub: traduire('Apple Santé ou Health Connect'), reset: removeKeys(['@yoroi_healthkit_asked', '@yoroi_health_extended_asked_v2']) },
  { id: 'coach', label: traduire('Conseil du jour'), sub: traduire('Le conseil de l’accueil, une fois par jour'), reset: removeKeys(['@yoroi_coach_seen_date']) },
  { id: 'aides', label: traduire('Petites aides'), sub: traduire('Conseils d’affichage, photos, batterie, créneaux'), reset: removeKeys(['@yoroi_privacy_challenge_shown', '@yoroi_view_mode_hint_shown', '@yoroi_battery_popup_shown', '@yoroi_slots_suggestion_dismissed']) },
];

export async function resetAllOnceWindows(): Promise<void> {
  for (const w of ONCE_WINDOWS) {
    try {
      await w.reset();
    } catch {
      // on continue avec les suivantes
    }
  }
}
