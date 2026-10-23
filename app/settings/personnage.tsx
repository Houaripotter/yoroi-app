/**
 * Ton personnage (vague 41) : un apercu de ton accueil (scene, personnage, rond de profil), puis
 * le personnage (/avatar-selection), sa silhouette selon ton corps, ce que montre le rond de profil
 * et le contour du rond (Aucun, Fin par defaut, Or, Indigo), applique a l'accueil, aux Reglages et au profil.
 * Reprend la partie personnage de l'ancienne page Apparence.
 * Vague 45 : « Ton univers » en haut (Japon, Classique ou Sans personnage, via choisirUnivers). Sans personnage,
 * la silhouette disparait et le rond montre ta photo ou tes initiales.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen, Icon } from '@/components/yoroi/v2/espace/ui';
import { personnageImage, personnageNom, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { ChoiceSheet, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { markIdentiteChoisie, syncIdentite } from '@/components/yoroi/v2/espace/identite';
import { CONTOURS, RondCadre, contourDe, type ContourRond } from '@/components/yoroi/v2/reglages/contour';
import { Groupe, TUILE } from '@/components/yoroi/v2/reglages/kit';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { CLASSIQUE_IMAGES, classiqueImage, guerrierImage } from '@/lib/v2/dojo/personnages';
import { UNIVERS_CHOIX } from '@/lib/v2/dojo/univers';
import { choisirUnivers, choixUniversDe, genreDuPersonnage, type ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { RondInitiales } from '@/components/yoroi/v2/espace/RondInitiales';
import { SILHOUETTES, calculerSilhouetteAuto, silhouetteActive, silhouetteNom, type SilhouetteId, type SilhouetteMode } from '@/lib/v2/silhouette';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';
import { traduire } from '@/lib/i18n/tr';

export default function TonPersonnage() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { espace, update } = useEspace();
  const { profile, armure } = useIdentite();
  const [picker, setPicker] = useState<null | 'univers' | 'silhouette' | 'rond'>(null);
  const go = (href: string) => router.push(href as any);

  useEffect(() => {
    syncIdentite(profile?.profile_photo ?? null).catch(() => {});
  }, [profile?.profile_photo]);

  const rankIndex = armure?.rank.index ?? 0;
  // vague 45 : le genre de la cle (Guerrier ou Sportif), sinon celui du profil (garde aussi sans personnage)
  const genre: 'h' | 'f' = genreDuPersonnage(espace.personnage, profile?.avatar_gender);
  const choixUnivers = choixUniversDe(espace);
  const sansPerso = choixUnivers === 'aucun';
  const universNom = UNIVERS_CHOIX.find((u) => u.id === choixUnivers)?.nom ?? 'Japon';
  const perso = personnageImage(espace.personnage, rankIndex, genre);
  const scene = sceneMeta(espace.scene);
  const hasPhoto = !!profile?.profile_photo;
  // sans personnage, la photo des qu'elle existe, sinon tes initiales (meme regle que l'accueil)
  const identite = (espace.identite === 'photo' || sansPerso) && hasPhoto ? 'photo' : 'personnage';
  const rondInitiales = identite !== 'photo' && sansPerso;
  const contour = contourDe(espace);

  // silhouette : jamais de chiffre ni de mot blessant
  const silMode: SilhouetteMode = espace.silhouette ?? 'classique';
  const silActive = silhouetteActive(silMode, espace.silhouetteAuto);
  // vague 45 : la silhouette vaut pour le Guerrier et pour le Sportif (memes regles)
  const estClassique = espace.personnage === 'classique_h' || espace.personnage === 'classique_f';
  const estGuerrier = espace.personnage === 'guerrier_h' || espace.personnage === 'guerrier_f' || estClassique;
  const silValue = silMode === 'classique' ? traduire('Non') : silMode === 'auto' ? (silActive ? `Auto, ${silhouetteNom(silActive)}` : 'Auto') : silhouetteNom(silMode as SilhouetteId);
  const silSub = !estGuerrier ? traduire('Pour le Guerrier et le Sportif') : silMode === 'auto' && !silActive ? traduire('Ajoute ta taille et une pesée') : undefined;
  const miniGuerrier = (sil: SilhouetteId | null) => (
    <Image source={estClassique ? classiqueImage(genre, rankIndex, sil) : guerrierImage(genre, rankIndex, sil)} style={{ width: 66, height: 88 }} resizeMode="contain" accessibilityIgnoresInvertColors />
  );
  /** vignette de chaque univers : la scene et, sauf sans personnage, la figure du premier rang */
  const miniUnivers = (id: ChoixUnivers) => (
    <View style={{ width: 64, height: 64, borderRadius: 14, overflow: 'hidden', backgroundColor: c.fillSoft }}>
      <Image source={sceneMeta(id === 'japon' ? 'dojo' : 'classique_salle_jour').image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
      {id !== 'aucun' ? (
        <Image source={id === 'japon' ? guerrierImage(genre, 0, null) : CLASSIQUE_IMAGES[genre][0]} style={{ position: 'absolute', right: 0, bottom: 0, width: 46, height: 60 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : null}
    </View>
  );

  /** le contenu du rond : ta photo ou ton personnage */
  const contenuRond = (S: number) =>
    identite === 'photo' ? (
      <Image source={{ uri: profile!.profile_photo! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
    ) : rondInitiales ? (
      <RondInitiales size={S} nom={profile?.name} />
    ) : (
      <BusteRond source={perso} />
    );

  return (
    <EspaceScreen title={traduire("Ton personnage")} subtitle={traduire("Ton univers, ton personnage et ton rond de profil")} gap={14}>
      {/* apercu : le haut de ton accueil */}
      <View style={{ height: 170, borderRadius: 24, overflow: 'hidden', backgroundColor: c.fillSoft, borderWidth: 1, borderColor: c.border }}>
        <Image source={scene.image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        {!sansPerso ? (
          <Image source={perso} style={{ position: 'absolute', right: 6, bottom: 0, width: 120, height: 160 }} resizeMode="contain" accessibilityLabel={traduire("Ton personnage, {0}", personnageNom(espace.personnage))} />
        ) : null}
        <View style={{ position: 'absolute', left: 16, bottom: 16 }}>
          <RondCadre size={72} contour={contour} fond="scene" fill="#F2F1EC">
            {contenuRond(64)}
          </RondCadre>
        </View>
      </View>

      {/* vague 45 : l'univers en premier, il decide du personnage et des scenes */}
      <Card>
        <ValueRow first tint={TUILE.or} icon="globe" label={traduire("Ton univers")} value={universNom} onPress={() => setPicker('univers')} />
      </Card>
      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4, marginTop: -6 }}>
        {traduire("{0}. Ton XP et ton rang restent les mêmes.", UNIVERS_CHOIX.find((u) => u.id === choixUnivers)?.phrase ?? '')}
      </Ink>

      <Card>
        <ValueRow first tint={TUILE.indigo} icon="user" label="Personnage" value={personnageNom(espace.personnage)} thumb={sansPerso ? undefined : perso} thumbFull onPress={() => go('/avatar-selection')} />
        {/* vague 45 : la silhouette existe seulement pour le Guerrier et le Sportif, la ligne disparait sinon */}
        {!sansPerso && estGuerrier ? <ValueRow tint={TUILE.bleu} icon="shield" label={traduire("Silhouette selon ton corps")} value={silValue} sub={silSub} onPress={() => setPicker('silhouette')} /> : null}
        {sansPerso ? (
          // sans personnage, le rond montre ta photo des qu'elle existe, sinon tes initiales
          <ValueRow tint={TUILE.mousse} icon="camera" label={traduire("Rond de profil")} value={hasPhoto ? traduire('Ta photo') : traduire('Tes initiales')} sub={hasPhoto ? undefined : traduire('Ajoute ta photo')} onPress={() => go('/settings/photo')} />
        ) : (
          <ValueRow tint={TUILE.mousse} icon="camera" label={traduire("Rond de profil")} value={identite === 'photo' ? traduire('Ta photo') : 'Personnage'} onPress={() => setPicker('rond')} />
        )}
      </Card>

      <Groupe title={traduire("Contour du rond")} sub={traduire("À l’accueil, dans Réglages et sur ton profil")} />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingVertical: 14, rowGap: 8 }}>
          {CONTOURS.map((o) => {
            const on = o.id === contour;
            return (
              <Pressable
                key={o.id}
                onPress={() => { selectionAsync().catch(() => {}); update({ contourRond: o.id as ContourRond }).catch(() => {}); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Contour ${o.nom}`}
                style={({ pressed }) => ({ width: '25%', alignItems: 'center', gap: 8, paddingVertical: 6, borderRadius: 16, backgroundColor: on ? c.accentTint : pressed ? c.fillSoft : 'transparent' })}
              >
                <View style={{ width: 62, height: 62, borderRadius: 31, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={scene.image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                  <RondCadre size={52} contour={o.id} fond="scene" fill="#F2F1EC">
                    {contenuRond(46)}
                  </RondCadre>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {on ? <Icon name="check" size={13} color={c.accent} stroke={3} /> : null}
                  <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? c.accent : c.textSecondary}>{o.nom}</Ink>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
        {traduire("{0}. Un simple choix de style, sans lien avec ton rang.", CONTOURS.find((x) => x.id === contour)?.sub ?? '')}
      </Ink>

      <ChoiceSheet
        visible={picker === 'univers'}
        onClose={() => setPicker(null)}
        title={traduire("Ton univers")}
        subtitle={traduire("Ton XP et ton rang restent les mêmes")}
        options={UNIVERS_CHOIX.map((u) => ({ key: u.id as ChoixUnivers, label: u.nom, sub: u.phrase, preview: miniUnivers(u.id) }))}
        value={choixUnivers}
        onChange={(v) => {
          if (v !== choixUnivers) choisirUnivers(v, genre).catch(() => {});
        }}
      />
      <ChoiceSheet
        visible={picker === 'silhouette'}
        onClose={() => setPicker(null)}
        title={traduire("Silhouette selon ton corps")}
        subtitle={estClassique ? traduire('Même tenue, même personnage : seule la silhouette change') : traduire('Même armure, même personnage : seule la silhouette change')}
        options={[
          { key: 'classique' as SilhouetteMode, label: 'Dessin classique', sub: traduire('Le personnage d’origine'), preview: miniGuerrier(null) },
          { key: 'auto' as SilhouetteMode, label: 'Automatique', sub: traduire('Il suit tes pesées et évolue avec toi'), preview: miniGuerrier(silMode === 'auto' ? silActive : null) },
          // equilibree est le dessin classique : pas deux choix pour la meme image
          ...SILHOUETTES.filter((sil) => sil.id !== 'equilibree').map((sil) => ({ key: sil.id as SilhouetteMode, label: sil.nom, sub: sil.phrase, preview: miniGuerrier(sil.id) })),
        ]}
        value={silMode === 'equilibree' ? 'classique' : silMode}
        onChange={(v) => {
          if (v === 'auto') {
            calculerSilhouetteAuto(genre)
              .then((auto) => update(auto ? { silhouette: 'auto', silhouetteAuto: auto } : { silhouette: 'auto' }))
              .catch(() => {});
          } else {
            update({ silhouette: v }).catch(() => {});
          }
        }}
      />
      <ChoiceSheet
        visible={picker === 'rond'}
        onClose={() => setPicker(null)}
        title={traduire("Rond de profil")}
        subtitle={traduire("Ce qui s’affiche en haut de l’accueil")}
        options={[
          { key: 'personnage', label: traduire('Ton personnage') },
          { key: 'photo', label: traduire('Ta photo'), sub: hasPhoto ? undefined : traduire('Ajoute-la d’abord dans ton profil') },
        ]}
        value={identite}
        onChange={(v) => {
          // le choix est note avant l'enregistrement : le rattrapage automatique le respecte
          markIdentiteChoisie()
            .then(() => update({ identite: v as 'photo' | 'personnage' }))
            .catch(() => {});
          // 16 octobre 2026 : sans photo, Photo et contour pour l'ajouter
          if (v === 'photo' && !hasPhoto) setTimeout(() => go('/settings/photo'), 350);
        }}
      />
    </EspaceScreen>
  );
}
