/**
 * Briques des Reglages : en-tete du profil, lignes d'etat, lignes de reglage
 * avec la valeur actuelle a droite, feuille du bas et feuille de choix.
 * (La saisie du jeton createur vit dans components/yoroi/v2/studio/TokenSheet.tsx.)
 */
import React from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Profile } from '@/lib/database';
import type { Espace } from '@/lib/v2/espace';
import { RondCadre, styleRondDe } from '@/components/yoroi/v2/reglages/contour';
import { getSportName } from '@/lib/sports';
import { personnageImage } from '../assets';
import { RondInitiales } from '../RondInitiales';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';
import { Icon, RoundButton } from '../ui';
import type { IconName } from '../ui';
import { traduire, DECIMAL } from '@/lib/i18n/tr';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

// ============================================
// EN-TETE DU PROFIL (haut des Reglages)
// ============================================

/**
 * Le profil en haut des Reglages : photo ou personnage (decor, sans rang ni XP) dans le rond
 * au contour choisi, prenom, sports, taille et objectif de poids. Un appui ouvre le profil.
 */
export function ProfileHeader({ profile, espace, rankIndex, onPress, onEditPhoto }: { profile: Profile | null; espace: Espace; rankIndex: number; onPress: () => void; /** 16 octobre 2026 : le crayon sur la photo ouvre Photo et contour */ onEditPhoto?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const perso = personnageImage(espace.personnage, rankIndex, profile?.avatar_gender === 'femme' ? 'f' : 'h');
  const name = profile?.name?.trim() || '';
  // Vague 45 : « Sans personnage », la photo si elle existe, sinon les initiales (le rond n'est jamais vide)
  const sansPerso = !aUnPersonnage(espace.personnage);
  const showPhoto = (espace.identite === 'photo' || sansPerso) && !!profile?.profile_photo;
  const sports = espace.sportsFavoris.slice(0, 3).map((id) => getSportName(id));
  const taille = profile?.height_cm ? `${profile.height_cm} cm` : null;
  // 18 octobre 2026 : le poids du corps reste en kilos partout (la pesee se saisit en kilos)
  const cible = profile?.target_weight
    ? traduire("objectif {0} kg", String(Math.round(profile.target_weight * 10) / 10).replace('.', DECIMAL))
    : null;
  const details = [taille, cible].filter(Boolean).join(', ');

  const rond = (
    <RondCadre size={72} {...styleRondDe(espace)} fond="papier" fill="#F5F6FB">
      {showPhoto ? (
        <Image source={{ uri: profile!.profile_photo! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : sansPerso ? (
        <RondInitiales size={72} nom={name} />
      ) : (
        // 16 octobre : le buste cadre sur la marge mesuree de chaque image (avant, tete et bas coupes)
        <BusteRond source={perso} />
      )}
    </RondCadre>
  );
  const texte = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{name || traduire('Ton prénom')}</Ink>
        <Ink size={13} weight="bold" color={sports.length ? c.textSecondary : c.accent} numberOfLines={2}>
          {sports.length ? sports.join(', ') : traduire('Choisis tes sports')}
        </Ink>
        <Ink size={13} weight="medium" color={c.textMuted} numberOfLines={1}>{details || traduire('Ta taille et ton objectif de poids')}</Ink>
      </View>
      <Icon name="chevron" size={16} color={c.textMuted} stroke={2.4} />
    </>
  );

  if (!onEditPhoto) {
    return (
      <Pressable
        onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Ton profil, {0}. Modifier", name || traduire('à compléter'))}
        style={({ pressed }) => ({ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, transform: [{ scale: pressed ? 0.99 : 1 }] })}
      >
        {rond}
        {texte}
      </Pressable>
    );
  }

  // 16 octobre 2026 : la photo et son crayon ouvrent Photo et contour, le reste de la carte ouvre le profil
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
      <Pressable
        onPress={() => { selectionAsync().catch(() => {}); onEditPhoto(); }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Modifier ta photo et son contour")}
        style={({ pressed }) => ({ paddingLeft: 14, paddingVertical: 14, paddingRight: 4, transform: [{ scale: pressed ? 0.96 : 1 }] })}
      >
        {rond}
        <View pointerEvents="none" style={{ position: 'absolute', right: -2, bottom: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, borderWidth: 2.5, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pencil" size={14} color={c.onPrimary} stroke={2.4} />
        </View>
      </Pressable>
      <Pressable
        onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Ton profil, {0}. Modifier", name || traduire('à compléter'))}
        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 14, paddingLeft: 10, paddingRight: 14, alignSelf: 'stretch', transform: [{ scale: pressed ? 0.99 : 1 }] })}
      >
        {texte}
      </Pressable>
    </View>
  );
}

// ============================================
// LIGNES
// ============================================

export type Tone = 'ok' | 'warn' | 'todo' | 'neutral';

/** Ligne d'etat du tableau de bord : pastille de couleur, titre, detail, action a droite */
export function StatusRow({ icon, title, detail, tone = 'neutral', first, onPress, action }: {
  icon: IconName;
  title: string;
  detail?: string;
  tone?: Tone;
  first?: boolean;
  onPress?: () => void;
  action?: React.ReactNode;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const dot = tone === 'ok' ? c.success : tone === 'warn' ? c.gold : tone === 'todo' ? c.accent : c.border;
  return (
    <Pressable
      onPress={onPress ? () => { selectionAsync().catch(() => {}); onPress(); } : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      style={({ pressed }) => ({ minHeight: 62, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSoft : 'transparent', borderTopWidth: first ? 0 : 1, borderColor: c.divider })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={c.ink} />
        <View style={{ position: 'absolute', right: -3, top: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: dot, borderWidth: 2, borderColor: c.surface }} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="extraBold" numberOfLines={2}>{title}</Ink>
        {detail ? <Ink size={12} weight="medium" color={c.textSecondary} numberOfLines={2}>{detail}</Ink> : null}
      </View>
      {action ?? (onPress ? <Icon name="chevron" size={16} color={c.textMuted} stroke={2.4} /> : null)}
    </Pressable>
  );
}

/** Petit bouton d'action dans une ligne (44 points de haut) */
export function MiniAction({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: pressed ? c.primaryPressed : c.primary, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 })}
    >
      <Ink size={13} weight="extraBold" color={c.onPrimary} numberOfLines={1}>{busy ? traduire('En cours') : label}</Ink>
    </Pressable>
  );
}

/** Ligne de reglage : la valeur actuelle s'affiche a droite */
export function ValueRow({ icon, label, value, sub, thumb, thumbFull, onPress, first, danger, valueColor, action, tint, sticker }: {
  icon: IconName;
  /** 27 octobre 2026 : le sticker a la place de la petite tuile de couleur (reglage Illustrations) */
  sticker?: NomSticker;
  /** vague 41 : petite tuile de couleur sous l'icone (blanche), comme les Reglages d'iOS */
  tint?: string;
  /** vignette entiere (personnage en pied), jamais rognee */
  thumbFull?: boolean;
  label: string;
  value?: string;
  sub?: string;
  thumb?: ImageSourcePropType;
  onPress?: () => void;
  first?: boolean;
  danger?: boolean;
  valueColor?: string;
  /** petit bouton a droite (remplace le chevron) */
  action?: React.ReactNode;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const avecSticker = !!sticker && illus.stickers && !danger;
  // audit 43 : avec un petit bouton a droite, la ligne n'est plus un bouton qui en contient un autre :
  // la zone de gauche s'appuie, le bouton est pose a cote
  const rowStyle = { minHeight: tint ? 50 : 56, paddingHorizontal: 14, paddingVertical: tint ? 6 : 8, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
  const content = (
    <>
      {avecSticker ? (
        <Image source={illus.img(sticker!)} style={{ width: 36, height: 36, marginVertical: -2 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ width: tint ? 32 : 34, height: tint ? 32 : 34, borderRadius: tint ? 9 : 11, backgroundColor: danger ? c.dangerTint : tint ?? c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={tint ? 17 : 18} color={danger ? c.danger : tint ? '#FFFFFF' : c.ink} stroke={tint ? 2.4 : undefined} />
        </View>
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="bold" color={danger ? c.danger : c.ink} numberOfLines={2}>{label}</Ink>
        {sub ? <Ink size={12} color={c.textMuted} numberOfLines={2}>{sub}</Ink> : null}
      </View>
      {thumb ? (
        thumbFull ? (
          <View style={{ width: 34, height: 40, borderRadius: 9, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Image source={thumb} style={{ width: 30, height: 36 }} resizeMode="contain" />
          </View>
        ) : (
          <Image source={thumb} style={{ width: 30, height: 30, borderRadius: 8 }} resizeMode="cover" />
        )
      ) : null}
      {value ? (
        <Ink size={14} weight="bold" color={valueColor ?? c.textSecondary} numberOfLines={1} style={{ maxWidth: '42%', textAlign: 'right' }}>{value}</Ink>
      ) : null}
      {action ? null : onPress ? <Icon name="chevron" size={15} color={c.textMuted} stroke={2.4} /> : null}
    </>
  );
  const press = onPress ? () => { selectionAsync().catch(() => {}); onPress(); } : undefined;
  if (action) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 14, borderTopWidth: first ? 0 : 1, borderColor: c.divider }}>
        <Pressable
          onPress={press}
          disabled={!onPress}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={value ? `${label}, ${value}` : label}
          style={({ pressed }) => ({ ...rowStyle, flex: 1, paddingRight: 10, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
        >
          {content}
        </Pressable>
        {action}
      </View>
    );
  }
  return (
    <Pressable
      onPress={press}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => ({ ...rowStyle, backgroundColor: pressed ? c.fillSoft : 'transparent', borderTopWidth: first ? 0 : 1, borderColor: c.divider })}
    >
      {content}
    </Pressable>
  );
}

// ============================================
// FEUILLES
// ============================================

export function Sheet({ visible, onClose, title, subtitle, children }: { visible: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(29,32,41,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={traduire("Fermer")} />
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '88%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 10 }} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 22, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={22} weight="black" tight>{title}</Ink>
                {subtitle ? <Ink size={14} color={c.textSecondary}>{subtitle}</Ink> : null}
              </View>
              <RoundButton icon="close" label={traduire("Fermer")} onPress={onClose} />
            </View>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Feuille de choix : une option par ligne, coche sur la valeur actuelle, fermeture au choix */
export function ChoiceSheet<T extends string | number>({ visible, onClose, title, subtitle, options, value, onChange }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: { key: T; label: string; sub?: string; preview?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        {options.map((o, i) => {
          const on = o.key === value;
          return (
            <Pressable
              key={String(o.key)}
              onPress={() => { selectionAsync().catch(() => {}); onChange(o.key); onClose(); }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={traduire(o.label)}
              style={({ pressed }) => ({ minHeight: 58, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: i ? 1 : 0, borderColor: c.divider, backgroundColor: pressed ? c.fillSoft : on ? c.accentTint : 'transparent' })}
            >
              {o.preview ?? null}
              <View style={{ flex: 1, gap: 1 }}>
                <Ink size={16} weight={on ? 'extraBold' : 'bold'}>{traduire(o.label)}</Ink>
                {o.sub ? <Ink size={12} color={c.textMuted}>{traduire(o.sub)}</Ink> : null}
              </View>
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: on ? 0 : 2, borderColor: c.border, backgroundColor: on ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={15} color={c.onPrimary} stroke={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
