/**
 * Photo et contour (16 octobre 2026). Houari : « je ne trouve plus l'endroit pour ajouter un contour a ma photo,
 * les utilisateurs vont pas le trouver ». Le contour existait toujours (vague 41), mais seulement au fond de
 * Ton personnage. Ici, tout le rond de profil au meme endroit, avec un apercu en direct :
 *  - ta photo : la prendre, la choisir, la retirer ;
 *  - ce que montre le rond : ta photo ou ton personnage ;
 *  - le contour : Aucun, Fin (par defaut), Or, Indigo, et depuis le 16 octobre Noir, Blanc, Rouge, Vert, Bleu ciel,
 *    Violet, Rose, Orange (quatre par ligne), applique a l'accueil, aux Reglages et au profil.
 * Acces directs : le crayon sur la photo de la carte profil des Reglages, la tuile Photo et contour de Personnaliser,
 * et l'ancienne route /frame-selection (lib/v2/nav/direct.ts).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, View, useWindowDimensions } from 'react-native';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen, GUTTER, Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { personnageImage } from '@/components/yoroi/v2/espace/assets';
import { imageDeTaScene } from '@/components/yoroi/v2/espace/apercuScene';
import { markIdentiteChoisie } from '@/components/yoroi/v2/espace/identite';
import { CONTOURS, RondCadre, contourDe, styleRondDe, type ContourRond } from '@/components/yoroi/v2/reglages/contour';
import { Groupe } from '@/components/yoroi/v2/reglages/kit';
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
  const { width } = useWindowDimensions();
  const { espace, update } = useEspace();
  const { profile, armure, reload } = useIdentite();
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_PROFILE_CHANGED', reload);
    return () => sub.remove();
  }, [reload]);

  const W = Math.min(560, width) - GUTTER * 2;
  const rankIndex = armure?.rank.index ?? 0;
  const genre = genreDuPersonnage(espace.personnage, profile?.avatar_gender);
  const perso = personnageImage(espace.personnage, rankIndex, genre);
  const avecPerso = aUnPersonnage(espace.personnage);
  const photo = profile?.profile_photo || null;
  // meme regle que l'accueil : la photo si elle est choisie (ou sans personnage), sinon le personnage ou tes initiales
  const montrePhoto = !!photo && (espace.identite === 'photo' || !avecPerso);
  const contour = contourDe(espace);
  // 28 octobre 2026 : la forme, l'epaisseur et le badge choisis dans Ton personnage suivent aussi ici
  const styleRond = styleRondDe(espace);
  // 27 octobre 2026 : ta vraie scene, comme sur l'accueil (avant : le Dojo pour les scenes recentes)
  const scene = { image: imageDeTaScene(espace.scene) };
  const prenom = profile?.name?.trim() || traduire('Ton prénom');

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

  const choisirContour = (id: ContourRond) => {
    if (id === contour) return;
    selectionAsync().catch(() => {});
    update({ contourRond: id }).catch(() => {});
  };

  const colContour = Math.floor((W - 20 - 3 * 6) / 4);

  return (
    <EspaceScreen title={traduire("Photo et contour")} subtitle={traduire("Ton rond de profil, à l’accueil, dans Réglages et sur ton profil")} gap={14}>
      {/* apercu en direct : sur ta scene (accueil) et sur le papier (Reglages) */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1.15, height: 160, borderRadius: 22, overflow: 'hidden', backgroundColor: c.fillSoft, borderWidth: 1, borderColor: c.border, justifyContent: 'flex-end', padding: 14 }}>
          <Image source={scene.image} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
          <RondCadre size={84} {...styleRond} fond="scene" fill="#F5F6FB">{contenu(84)}</RondCadre>
        </View>
        <View style={{ flex: 1, height: 160, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}>
          <RondCadre size={84} {...styleRond} fond="papier" fill="#F5F6FB">{contenu(84)}</RondCadre>
          <Ink size={14} weight="black" numberOfLines={1}>{prenom}</Ink>
        </View>
      </View>

      <Groupe title={traduire("Ta photo")} sub={photo ? traduire('Change-la quand tu veux') : traduire('Ajoute-la pour la voir dans ton rond')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <BoutonPhoto icon="camera" label={traduire("Prendre")} onPress={() => prendre('camera')} disabled={occupe} principal={!photo} />
        <BoutonPhoto icon="image" label={traduire("Galerie")} onPress={() => prendre('galerie')} disabled={occupe} />
      </View>
      {photo ? (
        <Pressable onPress={retirer} accessibilityRole="button" style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}>
          <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Retirer la photo")}</Ink>
        </Pressable>
      ) : null}

      {avecPerso ? (
        <>
          <Groupe title={traduire("Dans le rond")} sub={traduire("Ta photo ou ton personnage")} />
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
                  style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent', opacity: off ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                  <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textSecondary}>{v === 'photo' ? traduire('Ta photo') : traduire('Ton personnage')}</Ink>
                </Pressable>
              );
            })}
          </View>
          {!photo ? <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4, marginTop: -6 }}>{traduire("Ajoute d’abord une photo pour la choisir.")}</Ink> : null}
        </>
      ) : null}

      <Groupe title={traduire("Contour")} sub={traduire("Un simple choix de style, sans lien avec ton rang")} />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6, padding: 10 }}>
          {CONTOURS.map((o) => {
            const on = o.id === contour;
            return (
              <Pressable
                key={o.id}
                onPress={() => choisirContour(o.id as ContourRond)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Contour ${o.nom}, ${o.sub}`}
                style={({ pressed }) => ({ width: colContour, alignItems: 'center', gap: 8, paddingVertical: 10, borderRadius: 16, borderWidth: 2, borderColor: on ? c.accent : 'transparent', backgroundColor: on ? c.accentTint : pressed ? c.fillSoft : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={scene.image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                  <RondCadre size={50} contour={o.id as ContourRond} forme={styleRond.forme} epaisseur={styleRond.epaisseur} fond="scene" fill="#F5F6FB">{contenu(44)}</RondCadre>
                </View>
                <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? c.accent : c.textSecondary} numberOfLines={1}>{traduire(o.nom)}</Ink>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4, marginTop: -6 }}>{CONTOURS.find((x) => x.id === contour)?.sub ?? ''}</Ink>
    </EspaceScreen>
  );
}
