/**
 * Etat d'une carte a partager : habillage (memorise d'une fois sur l'autre), chiffres choisis,
 * scene d'accueil, personnage de l'utilisateur et photo de fond.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageSourcePropType, View } from 'react-native';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { figureFor } from '@/components/yoroi/v2/partage/cardKit';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { getEspace } from '@/lib/v2/espace';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { pickCardPhoto } from '@/lib/v2/partage/capture';
import { chiffresParDefaut } from '@/lib/v2/cartes/chiffres';
import { ecrireStyle, lireStyle, STYLE_DEFAUT } from '@/lib/v2/cartes/store';
import type { StyleMemorise } from '@/lib/v2/cartes/store';
import { enregistrerCarte, partagerCarte } from '@/lib/v2/cartes/export';
import type { CarteData, OptionsCarte, StatKey } from '@/lib/v2/cartes/types';
import type { VisuelsCarte } from './CarteRendu';
import { traduire } from '@/lib/i18n/tr';

export function useCarte(data: CarteData | null, initial?: Partial<OptionsCarte>) {
  const ref = useRef<View>(null);
  const id = useCardIdentity();
  const [style, setStyleState] = useState<StyleMemorise>({ ...STYLE_DEFAUT, ...initial });
  const [chiffres, setChiffres] = useState<StatKey[]>(initial?.chiffres ?? []);
  const [scene, setScene] = useState<ImageSourcePropType | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [saved, setSaved] = useState(false);
  const styleLu = useRef(!!initial);

  useEffect(() => {
    let alive = true;
    if (!styleLu.current) {
      lireStyle().then((s) => alive && setStyleState(s)).catch(() => {});
    }
    getEspace()
      .then((e) => alive && setScene(sceneMeta(e.scene).image))
      .catch(() => alive && setScene(sceneMeta('dojo').image));
    return () => {
      alive = false;
    };
  }, []);

  // chiffres par defaut selon le sport, des que les donnees sont la
  useEffect(() => {
    if (data && chiffres.length === 0) setChiffres(chiffresParDefaut(data, style.masque));
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
  }, []);

  const choisirPhoto = useCallback(async (src: 'gallery' | 'camera') => {
    const res = await pickCardPhoto(src);
    if (res) {
      setPhoto(res.uri);
      // ta photo en plein fond : le personnage se retire, tu peux le remettre
      setStyle({ fond: 'photo', personnage: false, sansPersonne: false, epure: false });
    }
  }, [setStyle]);

  const options: OptionsCarte = { ...style, fond: style.fond === 'photo' && !photo ? 'scene' : style.fond, chiffres };
  const visuels: VisuelsCarte = { scene, photo, personnage };

  /**
   * Les visuels d'une autre carte que celle de ce hook (vignettes, 17 octobre 2026) : meme scene, meme photo,
   * et le personnage dans la tenue du sport de CETTE carte, comme quand elle est ouverte en grand.
   */
  const visuelsPour = useCallback((d: CarteData): VisuelsCarte => {
    if (!personnage) return visuels;
    const fig = figureFor({ personnage: id.personnage!, rankIndex: id.rankIndex, genre: id.genre, sport: d.sport ?? null });
    return { scene, photo, personnage: fig };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, photo, personnage, id.personnage, id.rankIndex, id.genre]);

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

  return { ref, options, visuels, visuelsPour, style, setStyle, chiffres, setChiffres, photo, choisirPhoto, enregistrer, partager, busy, saved, aPersonnage: !!personnage, personne, basculerPersonne };
}
