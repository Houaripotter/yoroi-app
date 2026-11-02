/**
 * 2 novembre 2026 : masquage des chemins de fichiers avant Sentry (utils/masquageChemins.ts et les filtres
 * beforeSend et beforeBreadcrumb de utils/telemetryTransport.ts).
 */
import { masquerChemins, masquerCheminsProfond, CHEMIN_MASQUE } from '@/utils/masquageChemins';

describe('masquerChemins, plusieurs formats', () => {
  it.each([
    ["ENOENT 'file:///var/mobile/Containers/Data/Application/AB-12/Library/Caches/cartes_tmp/photo_1.jpg'", "ENOENT '[chemin]'"],
    ['Could not open content://media/external/images/media/1234 for reading', 'Could not open [chemin] for reading'],
    ['asset ph://ED7AC36B-A150-4C38-BB8C-B6D696F4F2ED/L0/001 missing', 'asset [chemin] missing'],
    ['assets-library://asset/asset.JPG?id=1&ext=JPG', '[chemin]'],
    ['File /data/user/0/com.houari.yoroi/cache/ImagePicker/x.jpeg not found', 'File [chemin] not found'],
    ['at /private/var/mobile/Containers/Data/Application/X/Library/Application Support/photos/p.jpg', 'at [chemin]'],
    ['file:///storage/emulated/0/DCIM/Camera/IMG%2020.jpg', '[chemin]'],
    ['/storage/emulated/0/Pictures/a.png', '[chemin]'],
    ['FILE:///var/x.jpg', '[chemin]'],
    ['file%3A%2F%2F%2Fvar%2Fmobile%2Fx.jpg', '[chemin]'],
    ['deux : file:///a/b.jpg et content://c/d', 'deux : [chemin] et [chemin]'],
  ])('%s', (entree, attendu) => {
    expect(masquerChemins(entree)).toBe(attendu);
  });

  it.each([
    'url=https://example.com/data/x',
    'app:///index.android.bundle:12:34',
    'Network request failed',
    'ratio 3/4 et 12/10',
  ])('laisse intact ce qui n’est pas un chemin : %s', (s) => {
    expect(masquerChemins(s)).toBe(s);
  });

  it('accepte les valeurs non texte', () => {
    expect(masquerChemins(undefined)).toBeUndefined();
    expect(masquerChemins(42 as unknown as string)).toBe(42);
  });

  it('masque en profondeur les donnees d’un fil d’ariane', () => {
    const d = masquerCheminsProfond({ uri: 'file:///var/x.jpg', liste: ['content://a/1', 'ok'], n: 3, sous: { p: '/data/user/0/y.png' } });
    expect(d).toEqual({ uri: CHEMIN_MASQUE, liste: [CHEMIN_MASQUE, 'ok'], n: 3, sous: { p: CHEMIN_MASQUE } });
  });
});

describe('filtres Sentry (beforeSend, beforeBreadcrumb)', () => {
  function filtres() {
    let f: any;
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' }, TurboModuleRegistry: { get: () => null }, NativeModules: {} }));
      jest.doMock('expo-modules-core', () => ({ requireOptionalNativeModule: () => null }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      f = require('@/utils/telemetryTransport').__filtresSentry;
    });
    return f as { filtrerEvenement: (e: any) => any; filtrerFilAriane: (b: any) => any };
  }

  it('beforeSend masque message, logentry, exceptions et fil d’ariane', () => {
    const { filtrerEvenement } = filtres();
    const e = filtrerEvenement({
      message: 'echec file:///var/mobile/Containers/Data/Application/A/Library/Caches/cartes_tmp/photo.jpg',
      logentry: { message: 'lecture content://media/external/images/media/9', params: ['ph://ABC/L0/001'] },
      exception: { values: [{ type: 'Error', value: "Impossible d'ouvrir /data/user/0/com.houari.yoroi/cache/cartes_tmp/export.png", mechanism: { data: { uri: 'file:///x/y.png' } } }] },
      breadcrumbs: [
        { category: 'mesure', message: 'share_tap', data: { source: 'record' } },
        { category: 'navigation', data: { from: '/carte?photo=file:///var/a.jpg', to: '/accueil' } },
        { category: 'console', message: 'file:///var/a.jpg' },
      ],
      user: { id: 'x' },
    });
    const texte = JSON.stringify(e);
    expect(texte).not.toMatch(/file:|content:|ph:\/\/|\/data\/user|\/var\/mobile/);
    expect(e.message).toBe('echec [chemin]');
    expect(e.exception.values[0].value).toBe("Impossible d'ouvrir [chemin]");
    expect(e.breadcrumbs).toHaveLength(2);
    expect(e.breadcrumbs[0].data).toEqual({ source: 'record' });
    expect(e.user).toBeUndefined();
  });

  it('beforeBreadcrumb masque message et donnees', () => {
    const { filtrerFilAriane } = filtres();
    const b = filtrerFilAriane({ category: 'mesure', message: 'photo file:///var/a.jpg', data: { u: 'content://x/1' } });
    expect(b.message).toBe('photo [chemin]');
    expect(b.data.u).toBe(CHEMIN_MASQUE);
  });
});
