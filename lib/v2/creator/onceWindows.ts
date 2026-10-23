/**
 * Fenetres vues une seule fois, a rearmer depuis le Studio : chaque entree efface ses cles
 * (ou remet a zero ses reperes dans la meta de l'armure) pour que la fenetre se remontre.
 * Aucune XP n'est touchee.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { ARMURE_CHANGED_EVENT, syncArmure } from '@/lib/v2/armure';

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
  { id: 'nouveautes', label: 'Nouveautés de la version', sub: 'La fenêtre montrée après une mise à jour', reset: removeKeys(['WHATS_NEW_LAST_SEEN_VERSION']) },
  { id: 'presentation', label: 'Visite guidée', sub: 'Une fois après l’onboarding ou la mise à jour', reset: removeKeys(['@yoroi_tour_v2_seen', '@yoroi_visite_guidee_v3_done']) },
  { id: 'tour', label: 'Tour de découverte', sub: 'Celui qui suit la fin de l’onboarding', reset: removeKeys(['@yoroi_onboarding_tour_done']) },
  { id: 'brouillon', label: 'Brouillon de l’onboarding', sub: 'Réponses gardées et conditions acceptées', reset: removeKeys(['@yoroi_onboarding_draft_v3', '@yoroi_legal_accepted']) },
  {
    id: 'bienvenue',
    label: 'Bienvenue des anciens',
    sub: 'Le résumé de reprise, dans le Dojo (s’il existe)',
    reset: () => patchMeta((m) => { m.welcomeSeen = false; }),
  },
  {
    id: 'rang',
    label: 'Passage de rang et plaques',
    sub: 'La célébration du rang actuel, dans le Dojo',
    reset: () => patchMeta((m) => { m.rankSeen = 0; m.danSeen = 0; m.plateSeen = 0; }),
  },
  {
    id: 'sceaux',
    label: 'Sceaux à fêter',
    sub: 'Le récapitulatif des sceaux déjà gagnés',
    reset: () =>
      patchMeta((m) => {
        const seals = m.seals && typeof m.seals === 'object' ? Object.keys(m.seals as Record<string, string>) : [];
        m.pendingSeals = seals;
        m.recap = seals.length > 0;
      }),
  },
  { id: 'avis', label: 'Demande d’avis', sub: 'Compteurs et refus de notation', reset: removeKeys(['yoroi_review_asked', 'yoroi_review_count', '@yoroi_avis_version_demandee', '@yoroi_review_last_prompt', '@yoroi_rating_action_count', '@yoroi_rating_has_rated', '@yoroi_rating_last_prompt', '@yoroi_rating_dismissed_count']) },
  { id: 'rappels', label: 'Proposition de rappels', sub: 'Fenêtre qui explique les notifications, après une pesée ou une séance', reset: removeKeys(['@yoroi_notif_permission_v1']) },
  { id: 'sante', label: 'Connexion santé', sub: 'Apple Santé ou Health Connect', reset: removeKeys(['@yoroi_healthkit_asked', '@yoroi_health_extended_asked_v2']) },
  { id: 'coach', label: 'Conseil du jour', sub: 'Le conseil de l’accueil, une fois par jour', reset: removeKeys(['@yoroi_coach_seen_date']) },
  { id: 'aides', label: 'Petites aides', sub: 'Conseils d’affichage, photos, batterie, créneaux', reset: removeKeys(['@yoroi_privacy_challenge_shown', '@yoroi_view_mode_hint_shown', '@yoroi_battery_popup_shown', '@yoroi_slots_suggestion_dismissed']) },
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
