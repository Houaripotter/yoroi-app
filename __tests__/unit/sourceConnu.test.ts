/**
 * « Où as-tu entendu parler de YOROI ? » (31 octobre 2026) : liste fermee, magasin selon le telephone,
 * reponse gardee dans le brouillon (une valeur inconnue est ecartee).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOURCES_CONNU, isSourceConnu, sourcesPour } from '@/lib/v2/onboarding/sourceConnu';
import { DRAFT_KEY, EMPTY_DRAFT, loadDraft } from '@/lib/v2/onboarding/draft';

describe('sourceConnu', () => {
  it('reconnait seulement la liste fermee', () => {
    expect(isSourceConnu('tiktok')).toBe(true);
    expect(isSourceConnu('amis')).toBe(true);
    expect(isSourceConnu('https://exemple.fr')).toBe(false);
    expect(isSourceConnu(null)).toBe(false);
  });

  it('montre App Store sur iPhone et Google Play sur Android, jamais les deux', () => {
    const ios = sourcesPour('ios');
    const android = sourcesPour('android');
    expect(ios).toContain('app_store');
    expect(ios).not.toContain('google_play');
    expect(android).toContain('google_play');
    expect(android).not.toContain('app_store');
    expect(ios).toHaveLength(SOURCES_CONNU.length - 1);
    expect(ios[ios.length - 1]).toBe('autre');
  });

  it('le brouillon garde la reponse et ecarte une valeur inconnue', async () => {
    const lire = AsyncStorage.getItem as jest.Mock;
    lire.mockImplementationOnce((k: string) => Promise.resolve(k === DRAFT_KEY ? JSON.stringify({ ...EMPTY_DRAFT, source: 'instagram', page: 22 }) : null));
    const d = await loadDraft();
    expect(d?.source).toBe('instagram');
    expect(d?.page).toBe(22);
    lire.mockImplementationOnce(() => Promise.resolve(JSON.stringify({ ...EMPTY_DRAFT, source: 'pub_inconnue' })));
    expect((await loadDraft())?.source).toBeNull();
  });
});
