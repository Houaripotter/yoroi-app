/**
 * Carte d'athlete du haut de Ton profil (28 octobre 2026, maquette validee « le melange », haut de A) :
 * ta scene, ton sport principal en pastille, Decorer (photo, forme, contour et badge du rond), ton rond decore
 * (le vrai cadre partage, contour.tsx) avec l'appareil photo, ton prenom, « Membre depuis », le bandeau de ta ceinture
 * (sport principal, degres ou dan), les tuiles age, taille et IMC, et ton club principal.
 */
import React from 'react';
import { Image, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { SceneId } from '@/lib/v2/espace';
import { RondCadre, type StyleRond } from '@/components/yoroi/v2/reglages/contour';
import { STICKERS, useIllustrations } from '@/components/yoroi/v2/stickers';
import { stickerDuSport } from '@/components/yoroi/v2/seances/MonthMarks';
import { gammeDe, regleGrade, texteGrade, titreCeinture } from '@/lib/v2/profil/gammes';
import type { Pratique } from '@/lib/v2/profil/pratiques';
import { traduire } from '@/lib/i18n/tr';
import { CeintureNouee, PetiteBarrette } from './CeintureNouee';
import { SceneImage } from './SceneImage';
import { StickerOuIcone } from './Rubriques';
import { nomSport } from './TapisPratiques';

export const MARGE = 16;
const BOUTON = '#DCE3FF';
const BOUTON_TEXTE = '#23358F';

/** Le bandeau de ta ceinture (sport principal) */
function BandeauCeinture({ p, onPress }: { p: Pratique | null; onPress: () => void }) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const g = p ? gammeDe(p.sport) : null;
  const regle = p ? regleGrade(p.sport, p.ceinture) : null;
  const n = p?.degres ?? 0;
  const grade = p?.ceinture ? texteGrade(p.sport, p.ceinture, n) : null;
  const titre = p?.ceinture ? titreCeinture(p.ceinture) : traduire('Ta ceinture');
  return (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={[titre, grade, p ? nomSport(p.sport) : null].filter(Boolean).join(', ')}
      style={({ pressed }) => ({ marginTop: 20, marginHorizontal: 14, minHeight: 64, borderRadius: 20, backgroundColor: isDark ? c.fillSoft : '#E6ECF8', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6, paddingRight: 12, opacity: pressed ? 0.85 : 1 })}
    >
      <CeintureNouee ceinture={p?.ceinture ?? 'blanche'} vide={!p?.ceinture} degres={regle?.type === 'degres' ? n : 0} barrette={!!g?.barrette} width={86} ombre={false} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Ink size={16} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{titre}</Ink>
        {p?.ceinture && grade ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {regle?.type === 'degres' && g?.barrette ? <PetiteBarrette n={n} cases={regle.max} rouge={p.ceinture === 'noire'} /> : null}
            <Ink size={12} weight="bold" color="#3557D9" numberOfLines={1}>{grade}</Ink>
          </View>
        ) : (
          <Ink size={12} weight="bold" color="#3557D9" numberOfLines={1}>{p ? traduire('À choisir sur le tapis') : traduire('Ajoute ton sport sur le tapis')}</Ink>
        )}
      </View>
      <Icon name="chevron" size={15} color={c.textMuted} stroke={2.4} />
    </Pressable>
  );
}

function Tuile({ label, value, unite, sub, fond, couleur, onPress, a11y }: { label: string; value: string | null; unite?: string; sub: string; fond: string; couleur: string; onPress?: () => void; a11y: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const contenu = (
    <>
      <Ink size={10} weight="extraBold" color={couleur} numberOfLines={1} style={{ letterSpacing: 1.2 }}>{label.toUpperCase()}</Ink>
      {value ? (
        <Ink size={19} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ lineHeight: 22 }}>
          {value}
          {unite ? <Ink size={14} weight="extraBold" color={c.textSecondary}>{` ${unite}`}</Ink> : null}
        </Ink>
      ) : (
        // vide : un plus, rien a lire de trop long dans les petites tuiles
        <View style={{ height: 22, justifyContent: 'center' }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: onPress ? BOUTON : 'rgba(29,32,51,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={onPress ? 'plus' : 'info'} size={13} color={onPress ? BOUTON_TEXTE : c.textMuted} stroke={2.6} />
          </View>
        </View>
      )}
      <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{sub}</Ink>
    </>
  );
  const style = { flex: 1, minWidth: 0, backgroundColor: fond, borderRadius: 18, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 9, gap: 2 };
  if (!onPress) return <View style={style} accessible accessibilityLabel={a11y}>{contenu}</View>;
  return (
    <Pressable onPress={() => { selectionAsync().catch(() => {}); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}>
      {contenu}
    </Pressable>
  );
}

export function CarteAthlete({ top, scene, rond, styleRond, name, onName, since, principale, ceinture, onDecorer, onPhoto, onCeinture, age, naissance, onAge, taille, onTaille, imc, club, onClub, montrerCeinture }: {
  top: number;
  scene: SceneId;
  /** le contenu du rond : photo, personnage ou initiales */
  rond: React.ReactNode;
  styleRond: StyleRond;
  name: string;
  onName: (v: string) => void;
  since: string | null;
  principale: Pratique | null;
  /** la pratique dont on montre la ceinture */
  ceinture: Pratique | null;
  montrerCeinture: boolean;
  onDecorer: () => void;
  onPhoto: () => void;
  onCeinture: () => void;
  age: number | null;
  naissance: string;
  onAge: () => void;
  taille: number | null;
  onTaille: () => void;
  imc: string | null;
  club: { nom: string; logo: unknown; sport: string } | null;
  onClub: () => void;
}) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const { width } = useWindowDimensions();
  const W = width - 2 * MARGE;
  const SCENE_H = 156;
  const R = 118;
  const sportPill = principale?.sport;
  const nomGrand = name.trim().length > 9 ? 26 : 32;

  return (
    <View style={{ marginTop: top + 56, marginHorizontal: MARGE, backgroundColor: c.surface, borderRadius: 30, shadowColor: c.ink, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
      <View style={{ borderRadius: 30, overflow: 'hidden', paddingBottom: 14 }}>
        <View style={{ height: SCENE_H, overflow: 'hidden' }}>
          <SceneImage scene={scene} w={W} h={SCENE_H} />
          <LinearGradient pointerEvents="none" colors={[isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)', c.surface]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 }} />
          {sportPill ? (
            <View style={{ position: 'absolute', left: 12, top: 12, maxWidth: W - 140, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, paddingLeft: 5, paddingRight: 10, paddingVertical: 4 }}>
              {illus.stickers ? <Image source={STICKERS[gammeDe(sportPill) ? 'kimono' : stickerDuSport(sportPill)]} style={{ width: 24, height: 24 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Icon name={gammeDe(sportPill) ? 'belt' : 'dumbbell'} size={16} color="#1D2033" />}
              <Ink size={12} weight="extraBold" color="#1D2033" numberOfLines={1} style={{ flexShrink: 1 }}>{nomSport(sportPill)}</Ink>
            </View>
          ) : null}
          <Pressable
            onPress={() => { selectionAsync().catch(() => {}); onDecorer(); }}
            accessibilityRole="button"
            accessibilityLabel={traduire('Décorer ton rond')}
            hitSlop={6}
            style={({ pressed }) => ({ position: 'absolute', right: 12, top: 12, height: 32, borderRadius: 16, backgroundColor: pressed ? '#C9D3FB' : BOUTON, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 })}
          >
            <Icon name="pencil" size={14} color={BOUTON_TEXTE} stroke={2.4} />
            <Ink size={12.5} weight="extraBold" color={BOUTON_TEXTE}>{traduire('Décorer')}</Ink>
          </Pressable>
        </View>

        <View style={{ marginTop: -(SCENE_H - 88), flexDirection: 'row' }}>
          <Pressable onPress={onPhoto} accessibilityRole="button" accessibilityLabel={traduire('Changer ta photo')} style={{ marginLeft: 16, width: R, height: R }}>
            <View style={{ width: R, height: R, borderRadius: styleRond.forme === 'rond' ? R / 2 : R * 0.3, shadowColor: c.ink, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }}>
              <RondCadre size={R} {...styleRond} fond="papier" fill="#E6ECF8">{rond}</RondCadre>
            </View>
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: c.surface, backgroundColor: BOUTON, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={17} color={BOUTON_TEXTE} stroke={2.4} />
            </View>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, marginLeft: 14, marginRight: 14, paddingTop: nomGrand === 32 ? 72 : 76 }}>
            <TextInput
              value={name}
              onChangeText={onName}
              placeholder={traduire('Ton prénom')}
              placeholderTextColor={c.textMuted}
              maxLength={40}
              accessibilityLabel={traduire('Ton prénom')}
              style={{ fontSize: nomGrand, fontWeight: '800', letterSpacing: -1, color: c.ink, padding: 0, margin: 0, height: nomGrand + 6, borderBottomWidth: name.trim() ? 0 : 2, borderColor: c.accent }}
            />
            {since ? <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ marginTop: 4 }}>{since}</Ink> : null}
          </View>
        </View>

        {montrerCeinture ? <BandeauCeinture p={ceinture} onPress={onCeinture} /> : null}

        <View style={{ marginTop: 12, marginHorizontal: 14, flexDirection: 'row', gap: 8 }}>
          <Tuile label={traduire('Âge')} value={age ? String(age) : null} unite={traduire('ans')} sub={naissance || traduire('ta naissance')} fond={isDark ? '#3A3222' : '#F6EEDD'} couleur={isDark ? '#E3C47B' : '#A57A1C'} onPress={onAge} a11y={age ? traduire('Âge, {0} ans. Modifier', age) : traduire('Âge, à remplir')} />
          <Tuile label={traduire('Taille')} value={taille ? String(taille) : null} unite="cm" sub={traduire('en centimètres')} fond={isDark ? '#30283A' : '#EFE6F3'} couleur={isDark ? '#D9A3CC' : '#8A3F78'} onPress={onTaille} a11y={taille ? traduire('Taille, {0} centimètres. Modifier', taille) : traduire('Taille, à remplir')} />
          <Tuile label={traduire('IMC')} value={imc} sub={imc ? traduire('calculé') : traduire('ta taille')} fond={isDark ? '#21332A' : '#E3F2EA'} couleur={isDark ? '#7CCFA2' : '#1C6B45'} a11y={imc ? traduire('Indice de masse corporelle, {0}', imc) : traduire('Indice de masse corporelle, il faut ta taille et une pesée')} />
        </View>

        <Pressable
          onPress={() => { selectionAsync().catch(() => {}); onClub(); }}
          accessibilityRole="button"
          accessibilityLabel={club ? traduire('Ton club, {0}', club.nom) : traduire('Ton club, à choisir')}
          style={({ pressed }) => ({ marginTop: 14, marginHorizontal: 14, minHeight: 44, paddingTop: 6, borderTopWidth: 1, borderColor: c.divider, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}
        >
          {club?.logo ? (
            <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: c.border }}>
              <Image source={club.logo as never} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : (
            <StickerOuIcone sticker="tapis" icon="home" size={28} />
          )}
          <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Ton club')}</Ink>
          <Ink size={14.5} weight="extraBold" color={club ? c.ink : c.textMuted} numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{club?.nom ?? traduire('À choisir')}</Ink>
          <Icon name="chevron" size={15} color={c.textMuted} stroke={2.4} />
        </Pressable>
      </View>
    </View>
  );
}
