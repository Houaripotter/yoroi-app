/**
 * Etat d'une carte a partager : habillage (memorise d'une fois sur l'autre), chiffres choisis,
 * scene d'accueil, personnage de l'utilisateur et photo de fond.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageSourcePropType, View } from 'react-native';
import { sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { devNow } from '@/lib/v2/creator/devClock';
import { figureFor } from '@/components/yoroi/v2/partage/cardKit';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { getEspace } from '@/lib/v2/espace';
import type { SceneId } from '@/lib/v2/espace';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { pickCardPhoto } from '@/lib/v2/partage/capture';
import { chiffresParDefaut } from '@/lib/v2/cartes/chiffres';
import { ecrireStyle, lireStyle, STYLE_DEFAUT } from '@/lib/v2/cartes/store';
import type { StyleMemorise } from '@/lib/v2/cartes/store';
import { copierAutocollant, enregistrerCarte, partagerCarte, partagerStory } from '@/lib/v2/cartes/export';
import type { CarteData, OptionsCarte, StatKey } from '@/lib/v2/cartes/types';
import type { VisuelsCarte } from './CarteRendu';
import { formatDessine, useMoteurCartes } from './CarteRendu';
import { analyserPhoto } from '@/lib/v2/cartes/moteur/analysePhoto';
import type { AnalysePhoto } from '@/lib/v2/cartes/moteur/analysePhoto';
import type { Recadrage } from '@/lib/v2/cartes/moteur/protection';
import { traduire } from '@/lib/i18n/tr';
import { effacerCopieCarte } from '@/lib/v2/cartes/tmp';

export function useCarte(data: CarteData | null, initial?: Partial<OptionsCarte>) {
  const ref = useRef<View>(null);
  const id = useCardIdentity();
  const [style, setStyleState] = useState<StyleMemorise>({ ...STYLE_DEFAUT, ...initial });
  const [chiffres, setChiffres] = useState<StatKey[]>(initial?.chiffres ?? []);
  const [scene, setScene] = useState<ImageSourcePropType | null>(null);
  const [sceneId, setSceneId] = useState<SceneId | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  /** Photo choisie, reduction en cours (26 octobre 2026) : l'ecran le dit au lieu de sembler fige */
  const [photoEnCours, setPhotoEnCours] = useState(false);
  const [busy, setBusy] = useState<'save' | 'share' | 'story' | 'copie' | null>(null);
  /** 31 octobre 2026 (cartes v2) : l'autocollant vient d'etre copie */
  const [copie, setCopie] = useState(false);
  const [saved, setSaved] = useState(false);
  const styleLu = useRef(!!initial);
  /**
   * 2 novembre 2026 (confidentialite) : la copie de la photo de cette carte, pour l'effacer quand elle est
   * remplacee, enlevee, ou quand tu quittes la carte. Seul un fichier de cacheDirectory/cartes_tmp/ est efface.
   */
  const photoTmp = useRef<string | null>(null);
  /**
   * 2 novembre 2026 (cartes v10, nouveau moteur) : l'analyse de ta photo (visages, silhouette ; vide tant qu'il n'y a pas
   * de module photo) et ton recadrage au doigt, propres a cette photo et a cette edition (jamais memorises).
   */
  const [analyse, setAnalyse] = useState<AnalysePhoto | null>(null);
  const [recadrage, setRecadrage] = useState<Recadrage | null>(null);
  const moteur = useMoteurCartes();
  const changerPhoto = useCallback((uri: string | null) => {
    const avant = photoTmp.current;
    photoTmp.current = uri;
    setPhoto(uri);
    setRecadrage(null);
    setAnalyse(null);
    if (uri) analyserPhoto(uri).then((a) => photoTmp.current === uri && setAnalyse(a)).catch(() => undefined);
    if (avant && avant !== uri) void effacerCopieCarte(avant);
  }, []);
  useEffect(() => () => {
    void effacerCopieCarte(photoTmp.current);
    photoTmp.current = null;
  }, []);

  useEffect(() => {
    let alive = true;
    if (!styleLu.current) {
      lireStyle().then((s) => alive && setStyleState(s)).catch(() => {});
    }
    getEspace()
      // 24 octobre 2026 : la vraie scene de l'accueil (voyages, packs, saisons compris), comme Scene.tsx.
      // sceneMeta ne connaissait que les premieres scenes et retombait sur la premiere pour les autres.
      .then((e) => {
        if (!alive) return;
        setScene(sceneForNow(e.scene, devNow()));
        setSceneId(e.scene);
      })
      .catch(() => alive && setScene(sceneForNow('dojo', devNow())));
    return () => {
      alive = false;
    };
  }, []);

  // chiffres par defaut selon le sport, des que les donnees sont la
  useEffect(() => {
    // 31 octobre 2026 : le chiffre enorme et 3 stats (4 chiffres) quand la seance les a
    if (data && chiffres.length === 0) setChiffres(chiffresParDefaut(data, style.masque, 4));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const personnage = useMemo<ImageSourcePropType | null>(() => {
    if (!id.ready && !id.personnage) return null;
    if (!aUnPersonnage(id.personnage)) return null;
    return figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre, sport: data?.sport ?? null });
  }, [id.ready, id.personnage, id.rankIndex, id.genre, data?.sport]);

  const setStyle = useCallback((patch: Partial<StyleMemorise>) => {
    setStyleState((s) => {
      const next = { ...s, ...patch };
      ecrireStyle(next).catch(() => {});
      return next;
    });
    setSaved(false);
    setCopie(false);
  }, []);

  const choisirPhoto = useCallback(async (src: 'gallery' | 'camera') => {
    const res = await pickCardPhoto(src, { onPreparation: setPhotoEnCours });
    if (res) {
      changerPhoto(res.uri);
      // ta photo en plein fond : le personnage se retire, tu peux le remettre
      setStyle({ fond: 'photo', personnage: false, sansPersonne: false, epure: false });
    }
  }, [setStyle, changerPhoto]);

  /**
   * 31 octobre 2026 : deux fonds seulement, ta photo ou une couleur franche. Les scenes ne sont plus proposees
   * (fichiers gardes dans lib/v2/cartes/scenesFond.ts) ; un ancien fond de scene retombe sur la couleur.
   */
  const fondEffectif = style.fond === 'photo' && photo ? 'photo' : 'couleur';
  const options0: OptionsCarte = { ...style, fond: fondEffectif, chiffres };
  // 2 novembre 2026 (cartes v10) : le nouveau moteur n'a pas de carre, il s'ouvre en 4:5 (et la capture aussi)
  const options: OptionsCarte = { ...options0, format: formatDessine(data, options0, moteur) };
  const visuels: VisuelsCarte = { scene, sceneId, photo, personnage, analyse, recadrage };
  /** « Recadrer automatiquement » : ton recadrage au doigt est oublie, la regle automatique reprend */
  const recadrerAuto = useCallback(() => setRecadrage(null), []);

  /** Enleve ta photo de fond : la carte revient sur ta couleur */
  const enleverPhoto = useCallback(() => {
    changerPhoto(null);
    setStyle({ fond: 'couleur' });
  }, [setStyle, changerPhoto]);

  /**
   * Les visuels d'une autre carte que celle de ce hook (vignettes, 17 octobre 2026) : meme scene, meme photo,
   * et le personnage dans la tenue du sport de CETTE carte, comme quand elle est ouverte en grand.
   */
  const visuelsPour = useCallback((d: CarteData): VisuelsCarte => {
    if (!personnage) return visuels;
    const fig = figureFor({ personnage: id.personnage!, rankIndex: id.rankIndex, genre: id.genre, sport: d.sport ?? null });
    return { scene, sceneId, photo, personnage: fig, analyse, recadrage };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, sceneId, photo, personnage, id.personnage, id.rankIndex, id.genre, analyse, recadrage]);

  const enregistrer = useCallback(async (onErreur?: (titre: string, texte: string) => void) => {
    if (busy || !data) return false;
    setBusy('save');
    try {
      const ok = await enregistrerCarte(ref, options.format, onErreur);
      if (ok) setSaved(true);
      return ok;
    } finally {
      setBusy(null);
    }
  }, [busy, data, options.format]);

  const partager = useCallback(async (onErreur?: (titre: string, texte: string) => void) => {
    if (busy || !data) return false;
    setBusy('share');
    try {
      return await partagerCarte(ref, options.format, data.moment, onErreur, data.exploit?.type);
    } finally {
      setBusy(null);
    }
  }, [busy, data, options.format]);

  /** 31 octobre 2026 (cartes v2) : « Partager en story », la feuille du systeme avec l'image en PNG */
  const partagerEnStory = useCallback(async (onErreur?: (titre: string, texte: string) => void) => {
    if (busy || !data) return false;
    setBusy('story');
    try {
      return await partagerStory(ref, options.format, data.moment, onErreur, data.exploit?.type);
    } finally {
      setBusy(null);
    }
  }, [busy, data, options.format]);

  /** 31 octobre 2026 (cartes v2) : l'autocollant transparent copie, a coller dans ta story */
  const copier = useCallback(async (onErreur?: (titre: string, texte: string) => void) => {
    if (busy || !data) return false;
    setBusy('copie');
    try {
      const ok = await copierAutocollant(ref, options.format, data.moment, onErreur);
      setCopie(ok);
      return ok;
    } finally {
      setBusy(null);
    }
  }, [busy, data, options.format]);

  /**
   * Interrupteur de la personne sur la carte (17 octobre 2026) : ton personnage, ou ta photo si elle est en fond.
   * Eteint (memorise) : ni personnage ni photo, seulement les chiffres, le titre et la signature.
   */
  const photoEnFond = style.fond === 'photo' && !!photo;
  const persoVoulu = !!personnage && (style.personnage || !photoEnFond);
  const personne = {
    /** il y a une personne a retirer : un personnage choisi ou ta photo en fond */
    possible: !!personnage || photoEnFond,
    visible: !style.sansPersonne && !style.epure && (photoEnFond || (!!personnage && style.personnage)),
    libelle: photoEnFond && !!personnage && style.personnage ? traduire('Ma photo et mon personnage sur la carte') : photoEnFond ? traduire('Ma photo sur la carte') : traduire('Mon personnage sur la carte'),
    icone: (photoEnFond ? 'image' : 'user') as 'image' | 'user',
  };
  const basculerPersonne = useCallback(() => {
    if (personne.visible) setStyle({ sansPersonne: true });
    else setStyle({ sansPersonne: false, epure: false, personnage: persoVoulu });
  }, [personne.visible, persoVoulu, setStyle]);

  return { ref, options, visuels, visuelsPour, style, setStyle, chiffres, setChiffres, photo, photoEnCours, choisirPhoto, enleverPhoto, enregistrer, partager, partagerEnStory, copier, copie, busy, saved, aPersonnage: !!personnage, personne, basculerPersonne, moteur, analyse, recadrage, setRecadrage, recadrerAuto };
}
