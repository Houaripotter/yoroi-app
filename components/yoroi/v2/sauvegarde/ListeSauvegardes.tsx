/**
 * « Retrouver une sauvegarde » (7 novembre 2026, Houari : « importer une sauvegarde, c'est l'enfer, il faut aller
 * dans des endroits de fou »). Plus de dossiers a fouiller : les copies du coffre iCloud de l'app (iPhone) ou du
 * dossier relie (Android) sont listees ici, la plus recente d'abord, avec une date humaine, l'appareil et un petit
 * resume. Toucher une ligne : une question, puis Retrouver. Une copie de securite de tes donnees actuelles est faite
 * avant, sur ce telephone (lib/v2/sauvegarde/restaurerListe.ts).
 * « Importer un fichier » reste en bas, en petit, pour une sauvegarde venue d'ailleurs (export fait a la main).
 * Utilise par app/settings/retrouver.tsx et par l'onboarding (« J'ai déjà une sauvegarde »).
 * Meme langage que Seances et Progres : cartes blanches, carres pastel avec leur sticker, pastilles vives (kitA).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { CarreSticker, Pastille, Petites, useCarteA, useTeinte } from '@/components/yoroi/v2/seances/kitA';
import type { TeinteA } from '@/components/yoroi/v2/seances/kitA';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { miroirSiRTL } from '@/lib/v2/rtl';
import { apresLecture, dateConfirmation, dateHumaine, libelleAppareil, libelleResume, lignesDepuisListe, peutRemettre, type LigneListe } from '@/lib/v2/sauvegarde/listeSauvegardes';
import { lireCopie, outilsReels, restaurerTexte, sourceDuTelephone, type Raison } from '@/lib/v2/sauvegarde/restaurerListe';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

type Phase = 'chargement' | 'indispo' | 'vide' | 'liste';
type Fenetre = { type: 'confirmer'; ligne: LigneListe } | { type: 'en_cours'; ligne: LigneListe } | { type: 'succes' } | { type: 'erreur'; raison: Raison };

export type DemoListe = { phase: Phase; lignes?: LigneListe[]; fenetre?: Fenetre; os?: 'ios' | 'android' };

const MAX_LIGNES = 20;

const STICKER: Record<LigneListe['appareil'], { nom: NomSticker; teinte: TeinteA }> = {
  ce: { nom: 'telephone', teinte: 'menthe' },
  autre: { nom: 'donnees_telephone', teinte: 'lilas' },
  ancien: { nom: 'carnet', teinte: 'creme' },
};

/** Le contenu de l'ecran, dans son cadre (titre, retour) */
export function ListeSauvegardes({ onRestauree, onRetour, demo }: { onRestauree: () => void; onRetour?: () => void; demo?: DemoListe }) {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const unite = useUnitePoids();
  const os = demo?.os ?? (Platform.OS === 'android' ? 'android' : 'ios');
  const [phase, setPhase] = useState<Phase>(demo?.phase ?? 'chargement');
  const [lignes, setLignes] = useState<LigneListe[]>(demo?.lignes ?? []);
  const [fenetre, setFenetre] = useState<Fenetre | null>(demo?.fenetre ?? null);
  const [importEnCours, setImportEnCours] = useState(false);
  const vivant = useRef(true);
  useEffect(() => () => { vivant.current = false; }, []);
  const lieu = os === 'ios' ? 'iCloud' : traduire('ton dossier relié');

  const charger = useCallback(async () => {
    if (demo) return;
    const src = sourceDuTelephone();
    if (!src) return setPhase('indispo');
    setPhase('chargement');
    try {
      if (!(await src.disponible())) return vivant.current && setPhase('indispo');
      const monId = await (await import('@/lib/v2/sauvegarde/appareil')).idAppareil().catch(() => null);
      const l = lignesDepuisListe(await src.lister(), monId).slice(0, MAX_LIGNES);
      if (!vivant.current) return;
      setLignes(l);
      setPhase(l.length ? 'liste' : 'vide');
      // les resumes arrivent un par un, la plus recente d'abord
      const { digestStringAsync, CryptoDigestAlgorithm } = await import('expo-crypto');
      const sha = (s: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, s);
      for (const x of l) {
        if (!vivant.current) return;
        const lu = await lireCopie(await src.lireTexte(x.nom).catch(() => null), sha).catch(() => ({ etat: 'nuage' as const }));
        if (vivant.current) setLignes((avant) => apresLecture(avant, x.nom, lu.etat, 'resume' in lu ? lu.resume : undefined));
      }
    } catch (e) {
      logger.warn('[Retrouver] liste impossible', e);
      if (vivant.current) setPhase('indispo');
    }
  }, [demo]);
  useEffect(() => { void charger(); }, [charger]);

  const importerFichier = async () => {
    if (importEnCours || demo) return;
    setImportEnCours(true);
    try {
      const { importDataFromJSON } = await import('@/lib/exportService');
      if (await importDataFromJSON()) setFenetre({ type: 'succes' });
    } catch (e) {
      logger.error('[Retrouver] import d un fichier', e);
    } finally {
      if (vivant.current) setImportEnCours(false);
    }
  };

  const retrouver = async (ligne: LigneListe) => {
    if (demo) return;
    setFenetre({ type: 'en_cours', ligne });
    const src = sourceDuTelephone();
    try {
      if (!src) throw new Error('pas de source');
      const texte = await src.lireTexte(ligne.nom).catch(() => null);
      let r = await restaurerTexte(texte, await outilsReels());
      if (!r.ok && r.raison === 'protegee') {
        // mot de passe : l'import habituel le demande, avec sa propre copie de securite
        const chemin = await src.chemin(ligne.nom).catch(() => null);
        setFenetre(null);
        const { importDataFromJSON } = await import('@/lib/exportService');
        if (chemin && (await importDataFromJSON(chemin))) r = { ok: true };
        else return;
      }
      if (!vivant.current) return;
      if (r.ok) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        setFenetre({ type: 'succes' });
      } else {
        notificationAsync(NotificationFeedbackType.Error).catch(() => {});
        if (r.raison === 'abimee') setLignes((avant) => apresLecture(avant, ligne.nom, 'abimee'));
        setFenetre({ type: 'erreur', raison: r.raison });
      }
    } catch (e) {
      logger.error('[Retrouver] restauration', e);
      if (vivant.current) setFenetre({ type: 'erreur', raison: 'echec' });
    }
  };

  const lienImporter = (
    <Pressable onPress={() => void importerFichier()} accessibilityRole="button" hitSlop={6} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {importEnCours ? <ActivityIndicator size="small" color={c.accentText} /> : <MaterialCommunityIcons name="file-upload-outline" size={17} color={c.accentText} />}
        <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Importer un fichier')}</Ink>
      </View>
      <Ink size={12} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire('Pour une sauvegarde venue d’ailleurs, comme un export fait à la main.')}</Ink>
    </Pressable>
  );

  let contenu: React.ReactNode;
  if (phase === 'chargement') {
    contenu = (
      <View style={[carte, { alignItems: 'center', gap: 12, paddingVertical: 28 }]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={c.accent} />
        <Ink size={14.5} weight="bold" color={c.textSecondary}>{traduire('Je cherche tes sauvegardes dans {0}…', lieu)}</Ink>
      </View>
    );
  } else if (phase === 'indispo') {
    contenu = (
      <>
        <Etat
          sticker="nuage_alerte"
          teinte="peche"
          titre={os === 'ios' ? traduire('iCloud n’est pas disponible') : traduire('Aucun dossier relié')}
          texte={os === 'ios'
            ? traduire('Connecte-toi à iCloud et active iCloud Drive dans les Réglages de l’iPhone. Tes copies automatiques apparaîtront ici, sans rien chercher.')
            : traduire('Relie un dossier (Google Drive, par exemple) pour que tes copies automatiques y partent. Elles apparaîtront ici.')}
        />
        {os === 'android' ? <BoutonPrincipal label={traduire('Relier un dossier')} onPress={() => router.push('/backup-history' as any)} /> : null}
        <BoutonPrincipal label={traduire('Importer un fichier')} onPress={() => void importerFichier()} loading={importEnCours} />
      </>
    );
  } else if (phase === 'vide') {
    contenu = (
      <>
        <Etat sticker="recherche" teinte="bleu" titre={traduire('Aucune sauvegarde trouvée')} texte={traduire('Rien dans {0} pour l’instant. La première copie automatique part toute seule, puis elle apparaît ici.', lieu)} />
        {lienImporter}
      </>
    );
  } else {
    contenu = (
      <>
        <Petites texte={os === 'ios' ? traduire('Dans ton iCloud') : traduire('Dans ton dossier relié')} teinte="bleu" />
        <View style={{ gap: 10 }}>
          {lignes.map((l) => (
            <Ligne key={l.nom} l={l} os={os} unite={unite} onPress={() => setFenetre({ type: 'confirmer', ligne: l })} />
          ))}
        </View>
        {lienImporter}
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <EspaceScreen title={traduire('Retrouver une sauvegarde')} subtitle={traduire('Touche celle que tu veux remettre')} gap={14} onBack={onRetour}>
        {contenu}
      </EspaceScreen>
      {fenetre ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => fenetre.type !== 'en_cours' && setFenetre(null)}>
          {fenetre.type === 'succes' ? (
            <Succes onContinuer={onRestauree} />
          ) : (
            <Feuille
              fenetre={fenetre}
              onFermer={() => setFenetre(null)}
              onRetrouver={() => fenetre.type === 'confirmer' && void retrouver(fenetre.ligne)}
              onImporter={() => { setFenetre(null); void importerFichier(); }}
            />
          )}
        </Modal>
      ) : null}
    </View>
  );
}

function Ligne({ l, os, unite, onPress }: { l: LigneListe; os: string; unite: 'kg' | 'lb'; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const menthe = useTeinte('menthe');
  const bleu = useTeinte('bleu');
  const peche = useTeinte('peche');
  const creme = useTeinte('creme');
  const s = STICKER[l.appareil];
  const actif = peutRemettre(l);
  const quand = dateHumaine(l.modifiedAt);
  const appareil = libelleAppareil(l.appareil, os);
  const resume = libelleResume(l.resume, unite);
  const etat = l.etat === 'abimee' ? traduire('Abîmée') : l.etat === 'nuage' ? (os === 'ios' ? traduire('Encore dans iCloud') : traduire('Pas encore lue')) : l.etat === 'protegee' ? traduire('Mot de passe') : null;
  return (
    <Pressable
      onPress={actif ? onPress : undefined}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityState={{ disabled: !actif }}
      accessibilityLabel={[quand, appareil, resume, l.plusRecente ? traduire('La plus récente') : null, etat].filter(Boolean).join(', ')}
      style={({ pressed }) => [carte, { flexDirection: 'row', alignItems: 'center', gap: 12, opacity: actif ? (pressed ? 0.85 : 1) : 0.7 }]}
    >
      <CarreSticker nom={l.etat === 'abimee' ? 'nuage_alerte' : s.nom} teinte={l.etat === 'abimee' ? 'peche' : s.teinte} taille={52} rayon={16} />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ gap: 1 }}>
          <Ink size={16} weight="extraBold" numberOfLines={1}>{quand}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>{appareil}</Ink>
        </View>
        {resume ? <Ink size={13} weight="bold" color={c.ink} numberOfLines={2}>{resume}</Ink> : l.etat === 'lecture' ? <Ink size={12.5} color={c.textSecondary}>{traduire('Lecture…')}</Ink> : null}
        {l.plusRecente || etat ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {l.plusRecente ? <Pastille texte={traduire('La plus récente')} fond={menthe.fond} couleur={menthe.texte} icone={<MaterialCommunityIcons name="star-four-points" size={12} color={menthe.texte} />} /> : null}
            {etat ? <Pastille texte={etat} fond={l.etat === 'abimee' ? peche.fond : l.etat === 'nuage' ? bleu.fond : creme.fond} couleur={l.etat === 'abimee' ? peche.texte : l.etat === 'nuage' ? bleu.texte : creme.texte} /> : null}
          </View>
        ) : null}
      </View>
      {actif ? <View style={miroirSiRTL}><MaterialCommunityIcons name="chevron-right" size={22} color={c.textSecondary} /></View> : null}
    </Pressable>
  );
}

function Etat({ sticker, teinte, titre, texte }: { sticker: NomSticker; teinte: TeinteA; titre: string; texte: string }) {
  const { theme } = useYoroiTheme();
  const t = useTeinte(teinte);
  return (
    <View style={{ borderRadius: 24, backgroundColor: t.fond, padding: 18, gap: 12, alignItems: 'center' }}>
      <CarreSticker nom={sticker} teinte={teinte} taille={84} rayon={26} />
      <Ink size={20} weight="black" tight color={t.texte} style={{ textAlign: 'center' }} accessibilityRole="header">{titre}</Ink>
      <Ink size={14} color={theme.colors.ink} style={{ textAlign: 'center', lineHeight: 20 }}>{texte}</Ink>
    </View>
  );
}

const TEXTE_ERREUR: Record<Raison, string> = {
  nuage: 'Elle n’a pas pu arriver sur ce téléphone. Vérifie ta connexion, puis réessaie dans un instant.',
  abimee: 'Cette copie est abîmée. Choisis une autre copie dans la liste.',
  protegee: 'Cette copie est protégée par un mot de passe. Réessaie et tape ton mot de passe.',
  copie: 'La copie de sécurité de tes données actuelles n’a pas pu être faite. Libère un peu de place, puis réessaie.',
  echec: 'La restauration n’a pas abouti. Réessaie, ou choisis une autre copie.',
};

function Feuille({ fenetre, onFermer, onRetrouver, onImporter }: { fenetre: Exclude<Fenetre, { type: 'succes' }>; onFermer: () => void; onRetrouver: () => void; onImporter: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const illus = useIllustrations();
  const peche = useTeinte('peche');
  const erreur = fenetre.type === 'erreur';
  const enCours = fenetre.type === 'en_cours';
  const date = !erreur ? dateConfirmation(fenetre.ligne.modifiedAt) : '';
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,22,40,0.38)' }} accessibilityViewIsModal>
      <Pressable style={{ flex: 1 }} onPress={enCours ? undefined : onFermer} accessibilityLabel={traduire('Fermer')} />
      <View style={{ backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: 20, paddingBottom: insets.bottom + 18, gap: 14 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          {erreur ? (
            <CarreSticker nom="nuage_alerte" teinte="peche" taille={84} rayon={26} />
          ) : (
            <Image source={illus.img('sauvegarde')} style={{ width: 84, height: 84 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          )}
          <Ink size={22} weight="black" tight color={erreur ? peche.texte : c.ink} style={{ textAlign: 'center', lineHeight: 27 }} accessibilityRole="header">
            {erreur ? traduire('La sauvegarde n’a pas pu être remise') : traduire('Remettre tes données du {0} ?', date)}
          </Ink>
          <Ink size={14} color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 20 }}>
            {erreur
              ? `${traduire(TEXTE_ERREUR[fenetre.raison])}\n${traduire('Tes données actuelles n’ont pas bougé.')}`
              : traduire('Ce qui manque sur ce téléphone revient, rien n’est effacé. Une copie de sécurité de tes données actuelles est faite avant.')}
          </Ink>
        </View>
        {erreur ? (
          <>
            <BoutonPrincipal label={traduire('Fermer')} onPress={onFermer} />
            <Pressable onPress={onImporter} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Importer un fichier')}</Ink>
            </Pressable>
          </>
        ) : (
          <>
            <BoutonPrincipal label={enCours ? traduire('Je remets tes données…') : traduire('Retrouver')} onPress={onRetrouver} loading={enCours} />
            <Pressable onPress={enCours ? undefined : onFermer} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: enCours ? 0.4 : 1 }}>
              <Ink size={15} weight="extraBold" color={c.textSecondary}>{traduire('Annuler')}</Ink>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function Succes({ onContinuer }: { onContinuer: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const menthe = useTeinte('menthe');
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 18, paddingHorizontal: 20, justifyContent: 'space-between' }} accessibilityViewIsModal>
      <View style={{ alignItems: 'center', gap: 16, paddingTop: 40 }}>
        <View style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: menthe.fond, alignItems: 'center', justifyContent: 'center' }}>
          <CarreSticker nom="coffre_ouvert" teinte="menthe" taille={124} rayon={40} />
        </View>
        <Ink size={28} weight="black" tight color={menthe.texte} style={{ textAlign: 'center', lineHeight: 33 }} accessibilityRole="header">{traduire('Tes données sont revenues')}</Ink>
        <Ink size={15} color={c.ink} style={{ textAlign: 'center', lineHeight: 21 }}>{traduire('Tes séances, tes pesées et ton Dojo sont de nouveau sur ce téléphone. La copie de sécurité de tes données d’avant reste gardée ici.')}</Ink>
      </View>
      <BoutonPrincipal label={traduire('Continuer')} onPress={onContinuer} />
    </View>
  );
}

export default ListeSauvegardes;
