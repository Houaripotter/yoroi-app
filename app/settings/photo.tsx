/**
 * Photo et contour (16 octobre 2026). Houari : « je ne trouve plus l'endroit pour ajouter un contour a ma photo,
 * les utilisateurs vont pas le trouver ». Ici, tout le rond de profil au meme endroit.
 * 28 octobre 2026 (Houari : « fais en un beau truc ») : un vrai editeur (components/yoroi/v2/reglages/EditeurRond.tsx).
 * En haut ton rond en grand sur ta scene, en direct ; dessous quatre onglets : Photo (la prendre, la choisir, la retirer,
 * et ce que montre le rond), Forme, Contour (pastilles, puis Fine ou Epaisse), Deco (badge sticker).
 * Le meme style suit a l'accueil, dans Reglages et sur ton profil. Le reglage n'est plus dans Ton personnage
 * (une ligne y ouvre cet ecran). Ancienne version : _archive_ancien_design_2026-10-09/editeur_rond_2026-10-28/.
 * Acces directs : le crayon sur la photo de la carte profil des Reglages, la tuile Photo et contour de Personnaliser,
 * la ligne Ton rond de profil de Ton personnage, et l'ancienne route /frame-selection (lib/v2/nav/direct.ts).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, View } from 'react-native';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { P } from '@/components/yoroi/livePalette';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EspaceScreen, Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { personnageImage } from '@/components/yoroi/v2/espace/assets';
import { imageDeTaScene } from '@/components/yoroi/v2/espace/apercuScene';
import { markIdentiteChoisie } from '@/components/yoroi/v2/espace/identite';
import { resumeRond, styleRondDe } from '@/components/yoroi/v2/reglages/contour';
import { EditeurRond } from '@/components/yoroi/v2/reglages/EditeurRond';
import { RondInitiales } from '@/components/yoroi/v2/espace/RondInitiales';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { genreDuPersonnage } from '@/lib/v2/dojo/choisirUnivers';
import { choisirPhoto, ouvrirReglagesTelephone, retirerPhoto } from '@/lib/v2/espace/photoProfil';
import { traduire } from '@/lib/i18n/tr';

function BoutonPhoto({ icon, label, onPress, disabled, principal }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; principal?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 10,
        backgroundColor: principal ? (pressed ? c.primaryPressed : c.primary) : c.surface,
        borderWidth: principal ? 0 : 1,
        borderColor: c.border,
        opacity: disabled ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Icon name={icon} size={18} color={principal ? c.onPrimary : c.ink} />
      <Ink size={14} weight="extraBold" color={principal ? c.onPrimary : c.ink} numberOfLines={1}>{label}</Ink>
    </Pressable>
  );
}

export default function PhotoEtContour() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { espace, update } = useEspace();
  const { profile, armure, reload } = useIdentite();
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_PROFILE_CHANGED', reload);
    return () => sub.remove();
  }, [reload]);

  const rankIndex = armure?.rank.index ?? 0;
  const genre = genreDuPersonnage(espace.personnage, profile?.avatar_gender);
  const perso = personnageImage(espace.personnage, rankIndex, genre);
  const avecPerso = aUnPersonnage(espace.personnage);
  const photo = profile?.profile_photo || null;
  // meme regle que l'accueil : la photo si elle est choisie (ou sans personnage), sinon le personnage ou tes initiales
  const montrePhoto = !!photo && (espace.identite === 'photo' || !avecPerso);
  const styleRond = styleRondDe(espace);
  const prenom = profile?.name?.trim() || traduire('Ton prénom');
  const resume = resumeRond(styleRond, montrePhoto ? 'photo' : avecPerso ? 'personnage' : 'initiales');

  const contenu = (S: number) =>
    montrePhoto ? (
      <Image source={{ uri: photo as string }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
    ) : avecPerso ? (
      <BusteRond source={perso} />
    ) : (
      <RondInitiales size={S} nom={profile?.name} />
    );

  const prendre = async (source: 'camera' | 'galerie') => {
    if (occupe) return;
    selectionAsync().catch(() => {});
    setOccupe(true);
    try {
      const r = await choisirPhoto(source);
      if (r === 'ok') {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        reload();
      } else if (r === 'refuse') {
        appAlert(source === 'camera' ? traduire('Caméra') : 'Photos', source === 'camera' ? traduire('Autorise la caméra dans les réglages du téléphone pour prendre une photo.') : traduire('Autorise l’accès aux photos dans les réglages du téléphone.'), [
          { text: traduire('Ouvrir les réglages'), style: 'primary', onPress: ouvrirReglagesTelephone },
          { text: traduire('Annuler'), style: 'cancel' },
        ]);
      } else if (r === 'erreur') {
        appAlert(traduire('Photo indisponible'), source === 'camera' ? traduire('Choisis plutôt une photo dans ta galerie.') : traduire('La photo n’a pas pu être chargée. Réessaie.'));
      }
    } finally {
      setOccupe(false);
    }
  };

  const retirer = () => {
    appAlert(traduire('Retirer ta photo ?'), avecPerso ? traduire('Le rond montrera ton personnage.') : traduire('Le rond montrera tes initiales.'), [
      { text: traduire('Retirer'), style: 'destructive', onPress: () => { retirerPhoto().then(reload).catch(() => {}); } },
      { text: traduire('Annuler'), style: 'cancel' },
    ]);
  };

  const choisirRond = (v: 'photo' | 'personnage') => {
    if ((v === 'photo') === montrePhoto) return;
    selectionAsync().catch(() => {});
    // le choix est note avant l'enregistrement : le rattrapage automatique le respecte
    markIdentiteChoisie().then(() => update({ identite: v })).catch(() => {});
  };

  // l'onglet Photo : sa logique reste ici, l'editeur ne fait que l'afficher
  const ongletPhoto = (
    <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 14, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Ink size={11.5} weight="extraBold" color={P.etiquettePrune} accessibilityRole="header" style={{ letterSpacing: 1.6, textTransform: 'uppercase' }}>{traduire('Ta photo')}</Ink>
        <Ink size={12} color={c.textMuted}>{photo ? traduire('Change-la quand tu veux') : traduire('Ajoute-la pour la voir dans ton rond')}</Ink>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BoutonPhoto icon="camera" label={traduire('Prendre')} onPress={() => prendre('camera')} disabled={occupe} principal={!photo} />
        <BoutonPhoto icon="image" label={traduire('Galerie')} onPress={() => prendre('galerie')} disabled={occupe} />
      </View>
      {photo ? (
        <Pressable onPress={retirer} accessibilityRole="button" style={({ pressed }) => ({ alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 8, opacity: pressed ? 0.6 : 1 })}>
          <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Retirer la photo')}</Ink>
        </Pressable>
      ) : null}

      {avecPerso ? (
        <>
          <View style={{ height: 1, backgroundColor: c.divider }} />
          <View style={{ gap: 2 }}>
            <Ink size={11.5} weight="extraBold" color={P.tuileMentheTexte} accessibilityRole="header" style={{ letterSpacing: 1.6, textTransform: 'uppercase' }}>{traduire('Dans le rond')}</Ink>
            <Ink size={12} color={c.textMuted}>{photo ? traduire('Ta photo ou ton personnage') : traduire('Ajoute d’abord une photo pour la choisir.')}</Ink>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: c.fillSubtle, borderRadius: 16, padding: 4 }}>
            {(['photo', 'personnage'] as const).map((v) => {
              const on = (v === 'photo') === montrePhoto;
              const off = v === 'photo' && !photo;
              return (
                <Pressable
                  key={v}
                  disabled={off}
                  onPress={() => choisirRond(v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: off }}
                  style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.primary : 'transparent', opacity: off ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                  <Ink size={14} weight="extraBold" color={on ? P.onPrimary : c.textSecondary}>{v === 'photo' ? traduire('Ta photo') : traduire('Ton personnage')}</Ink>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <EspaceScreen title={traduire('Photo et contour')} subtitle={traduire('Ton rond de profil, à l’accueil, dans Réglages et sur ton profil')} gap={14}>
      <EditeurRond
        style={styleRond}
        onChange={(patch) => update(patch).catch(() => {})}
        contenu={contenu}
        scene={imageDeTaScene(espace.scene)}
        prenom={prenom}
        resume={resume}
        photo={ongletPhoto}
        // sans photo, on commence par l'onglet Photo pour l'ajouter
        ongletInitial={photo ? 'forme' : 'photo'}
      />
      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire('Un simple choix de style, sans lien avec ton rang.')}</Ink>
    </EspaceScreen>
  );
}
