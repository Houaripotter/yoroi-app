/**
 * onboarding-neuf/kit.tsx
 *
 * Les briques communes du nouvel onboarding, copiees du kit d'INRO (components/onboarding-nuit/kit.tsx) :
 * l'ecran, la barre de progression continue, le titre avec un mot en couleur, les choix, le bouton, la petite
 * ligne avec un oeil au-dessus du bouton, la fenetre d'alerte centree. Aucun emoji, aucun rebond.
 *
 * Les textes arrivent deja traduits (traduire() a l'appel, pour que le catalogue des langues les trouve).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { sticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';
import { FONT, useNuit, type Palette } from './theme';

export const ND = Platform.OS !== 'web';

/** Retour haptique, sans jamais planter (web, simulateur) */
export const vibre = {
  choix: () => {
    try {
      void Haptics.selectionAsync().catch(() => undefined);
    } catch {
      // rien
    }
  },
  bouton: () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } catch {
      // rien
    }
  },
  alerte: () => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } catch {
      // rien
    }
  },
  succes: () => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch {
      // rien
    }
  },
};

/** La navigation que recoit chaque ecran a questions */
export type Nav = {
  etape: number;
  total: number;
  /** 0 a 1 : la barre de progression continue */
  progres?: number;
  onNext: () => void;
  onBack: () => void;
  /** apercu du Studio : la croix ferme l'apercu */
  onClose?: () => void;
};

/** Ajoute une transparence (0 a 1) a une couleur #RRGGBB */
export function alpha(hex: string, a: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  return `${hex}${v}`;
}

/** Le texte du nouvel onboarding : Archivo, agrandissement du systeme plafonne (l'ecran tient sans defiler) */
export function Txt({ style, maxFontSizeMultiplier = 1.3, ...rest }: TextProps & { style?: StyleProp<TextStyle> }) {
  return <Text allowFontScaling maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={style} />;
}

/** Un sticker de YOROI (assets/avatars/app/stickers) */
export function Sticker({ nom, taille, style }: { nom: Parameters<typeof sticker>[0]; taille: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Image source={sticker(nom)} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Les styles du kit pour une palette donnee */
export function fabriqueK(T: Palette) {
  return StyleSheet.create({
    ecran: { flex: 1, backgroundColor: T.bg },
    haut: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 22, height: 64 },
    hautBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    barre: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', marginHorizontal: 10 },
    barreRemplie: { height: 6, borderRadius: 3 },
    titreBloc: { paddingHorizontal: 20, paddingTop: 20 },
    titre: { fontFamily: FONT.titre, fontSize: 26, lineHeight: 31, letterSpacing: -0.4, color: T.ink },
    sous: { fontFamily: FONT.texte, fontSize: 13.5, lineHeight: 19, color: T.sub, marginTop: 7 },
    corps: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 40 },
    corpsCentre: { flexGrow: 1, justifyContent: 'center', paddingTop: 16 },
    choix: {
      minHeight: 54, borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.line,
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10,
    },
    choixOn: { borderColor: T.acc, borderWidth: 1.5, backgroundColor: alpha(T.acc, 0.06), paddingHorizontal: 15.5 },
    choixTxt: { fontFamily: FONT.texteMedium, fontSize: 15.5, color: T.ink },
    choixTxtFort: { fontFamily: FONT.titreBold, fontSize: 15.5, letterSpacing: -0.2, color: T.ink },
    choixSous: { fontFamily: FONT.texte, fontSize: 12.5, lineHeight: 17, color: T.sub, marginTop: 3 },
    rond: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: alpha(T.sub, 0.55), marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
    rondOn: { borderColor: T.acc },
    rondPoint: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.acc },
    caseBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: alpha(T.sub, 0.55), marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
    caseOn: { backgroundColor: T.acc, borderColor: T.acc },
    pastille: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: T.card, borderWidth: 1, borderColor: T.line },
    pastilleOn: { borderColor: T.acc, borderWidth: 1.5, backgroundColor: alpha(T.acc, 0.08), paddingHorizontal: 13.5, paddingVertical: 9.5 },
    pastilleTxt: { fontFamily: FONT.texteMedium, fontSize: 14, color: T.ink },
    famille: { fontFamily: FONT.titreBold, fontSize: 10.5, letterSpacing: 1.2, color: T.acc, marginBottom: 9 },
    bas: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: T.bg },
    oeil: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12, paddingHorizontal: 8 },
    oeilTxt: { flex: 1, fontFamily: FONT.texte, fontSize: 12, color: T.sub },
    lienBas: { fontFamily: FONT.texteMedium, fontSize: 13.5, color: T.sub, textDecorationLine: 'underline' },
    bouton: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    boutonTxt: { fontFamily: FONT.titreBold, fontSize: 16.5, letterSpacing: -0.2 },
  });
}

export type StylesKit = ReturnType<typeof fabriqueK>;

export function useK(): StylesKit {
  const T = useNuit();
  return useMemo(() => fabriqueK(T), [T]);
}

/** Le fond de tous les ecrans a questions. Le bas remonte au-dessus du clavier. */
export function Ecran({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const K = useK();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[K.ecran, { paddingTop: insets.top }, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}

/** La derniere valeur de la barre, pour que l'ecran suivant parte de la */
let dernierProgres = 0;

/**
 * La fleche retour a gauche, la barre au centre, la croix de l'apercu a droite.
 * Une barre continue qui se remplit en 420 ms depuis la valeur de l'ecran d'avant. Sans progres : pas de barre.
 */
export function Haut({ total, progres, onBack, onClose }: { etape?: number; total: number; progres?: number; onBack?: () => void; onClose?: () => void }) {
  const T = useNuit();
  const K = useK();
  const rempli = useRef(new Animated.Value(dernierProgres)).current;
  useEffect(() => {
    if (progres == null) return;
    Animated.timing(rempli, { toValue: progres, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    dernierProgres = progres;
  }, [progres, rempli]);
  return (
    <View style={K.haut}>
      <Pressable onPress={onBack} disabled={!onBack} hitSlop={12} style={[K.hautBtn, !onBack && { opacity: 0 }]} accessibilityRole="button" accessibilityLabel={traduire('Retour')}>
        <Ionicons name="arrow-back" size={24} color={T.ink} />
      </Pressable>
      {progres != null && total > 0 ? (
        <View style={[K.barre, { backgroundColor: T.line }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progres * 100) }}>
          <Animated.View style={[K.barreRemplie, { backgroundColor: T.acc, width: rempli.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Pressable onPress={onClose} disabled={!onClose} hitSlop={12} style={[K.hautBtn, !onClose && { opacity: 0 }]} accessibilityRole="button" accessibilityLabel={traduire('Fermer l’aperçu')}>
        <Ionicons name="close" size={21} color={T.sub} />
      </Pressable>
    </View>
  );
}

/**
 * Le mot cle de la phrase en couleur. La phrase et le mot arrivent traduits ; si le mot n'est pas dans la phrase
 * (une langue l'ecrit autrement), la phrase s'affiche simplement, sans couleur.
 */
export function PhraseColoree({ phrase: brute, mot, couleur, style }: { phrase: string; mot?: string | null; couleur: string; style: StyleProp<TextStyle> }) {
  // « combien ? » : le point d'interrogation ne part jamais seul a la ligne
  const phrase = insecables(brute);
  const i = mot ? phrase.toLocaleLowerCase().indexOf(mot.toLocaleLowerCase()) : -1;
  if (!mot || i < 0) return <Txt style={style}>{phrase}</Txt>;
  return (
    <Txt style={style}>
      {phrase.slice(0, i)}
      <Txt style={{ color: couleur }}>{phrase.slice(i, i + mot.length)}</Txt>
      {phrase.slice(i + mot.length)}
    </Txt>
  );
}

/** Espace insecable avant ? ! : ; (le signe ne part jamais seul a la ligne) */
export function insecables(t: string): string {
  return t.replace(/ ([?!:;»])/g, '\u00A0$1').replace(/« /g, '«\u00A0');
}

/** Le titre d'une question, un mot cle en couleur d'action, le sous-titre gris */
export function Titre({ children, sous, mot }: { children: string; sous?: string; mot?: string }) {
  const K = useK();
  const T = useNuit();
  return (
    <Apparait>
      <View style={K.titreBloc}>
        <PhraseColoree phrase={children} mot={mot} couleur={T.acc} style={K.titre} />
        {sous ? <Txt style={K.sous}>{sous}</Txt> : null}
      </View>
    </Apparait>
  );
}

/** Le contenu d'un ecran a questions : defile si besoin, le bouton reste en bas. `centre` : a hauteur du pouce. */
export function Corps({ children, centre, style }: { children: React.ReactNode; centre?: boolean; style?: StyleProp<ViewStyle> }) {
  const K = useK();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[K.corps, centre && K.corpsCentre, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** Fondu et legere montee (8 points, 320 ms), decalee de 45 ms par rang : les cartes arrivent l'une apres l'autre */
export function Apparait({ children, rang = 0, style }: { children: React.ReactNode; rang?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 320, delay: Math.min(rang, 10) * 45, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, [v, rang]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}

/** Un choix unique sur une carte, un rond a droite */
export function Choix({ label, on, onPress, sous, gauche }: { label: string; on: boolean; onPress: () => void; sous?: string; gauche?: React.ReactNode }) {
  const K = useK();
  const T = useNuit();
  return (
    <Pressable
      onPress={() => {
        vibre.choix();
        onPress();
      }}
      style={({ pressed }) => [K.choix, on && K.choixOn, gauche ? { paddingVertical: 9 } : null, sous ? { minHeight: 68 } : null, pressed && { opacity: 0.85 }]}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={sous ? `${label}. ${sous}` : label}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {gauche}
        <View style={{ flex: 1 }}>
          <Txt style={[sous ? K.choixTxtFort : K.choixTxt, on && !sous ? { fontFamily: FONT.texteSemi, color: T.ink } : null]}>{label}</Txt>
          {sous ? <Txt style={K.choixSous}>{sous}</Txt> : null}
        </View>
      </View>
      <View style={[K.rond, on && K.rondOn]}>{on ? <View style={K.rondPoint} /> : null}</View>
    </Pressable>
  );
}

/** Un choix parmi plusieurs : une case a coins doux, cochee. `bloque` grise le choix quand le maximum est atteint. */
export function ChoixMultiple({ label, on, onPress, sous, bloque, gauche }: { label: string; on: boolean; onPress: () => void; sous?: string; bloque?: boolean; gauche?: React.ReactNode }) {
  const T = useNuit();
  const K = useK();
  return (
    <Pressable
      onPress={() => {
        if (bloque) {
          vibre.alerte();
          return;
        }
        vibre.choix();
        onPress();
      }}
      style={({ pressed }) => [K.choix, on && K.choixOn, gauche ? { paddingVertical: 9 } : null, bloque && { opacity: 0.45 }, pressed && !bloque && { opacity: 0.85 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: !!bloque }}
      accessibilityLabel={sous ? `${label}. ${sous}` : label}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {gauche}
        <View style={{ flex: 1 }}>
          <Txt style={sous ? K.choixTxtFort : K.choixTxt}>{label}</Txt>
          {sous ? <Txt style={K.choixSous}>{sous}</Txt> : null}
        </View>
      </View>
      <View style={[K.caseBox, on && K.caseOn]}>{on ? <Ionicons name="checkmark" size={16} color={T.accInk} /> : null}</View>
    </Pressable>
  );
}

/** Une pastille, pour les longues listes */
export function Pastille({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const K = useK();
  return (
    <Pressable
      onPress={() => {
        vibre.choix();
        onPress();
      }}
      style={({ pressed }) => [K.pastille, on && K.pastilleOn, pressed && { opacity: 0.85 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
    >
      <Txt style={[K.pastilleTxt, on && { fontFamily: FONT.texteSemi }]}>{label}</Txt>
    </Pressable>
  );
}

/** Le bas de l'ecran : la petite ligne avec un oeil, un lien discret, puis le bouton */
export function Bas({ label, onPress, oeil, actif = true, lienBas, onLienBas, chargement }: {
  label: string;
  onPress: () => void;
  oeil?: string;
  actif?: boolean;
  lienBas?: string;
  onLienBas?: () => void;
  chargement?: boolean;
}) {
  const T = useNuit();
  const K = useK();
  const insets = useSafeAreaInsets();
  return (
    <View style={[K.bas, { paddingBottom: Math.max(insets.bottom, 14) + 4 }]}>
      {oeil ? (
        <View style={K.oeil}>
          <Ionicons name="eye-outline" size={14} color={T.sub} />
          <Txt style={K.oeilTxt}>{oeil}</Txt>
        </View>
      ) : null}
      {lienBas ? (
        <Pressable onPress={onLienBas} disabled={!onLienBas} hitSlop={10} style={{ alignSelf: 'center', marginBottom: 14 }} accessibilityRole="button">
          <Txt style={K.lienBas}>{lienBas}</Txt>
        </Pressable>
      ) : null}
      <Bouton label={label} onPress={onPress} actif={actif} chargement={chargement} />
    </View>
  );
}

/** Le bouton principal : eteint (le pastel de l'app) tant que la reponse manque, puis bleu nuit plein */
export function Bouton({ label, onPress, actif = true, fond, encre, chargement }: { label: string; onPress: () => void; actif?: boolean; fond?: string; encre?: string; chargement?: boolean }) {
  const T = useNuit();
  const K = useK();
  return (
    <Pressable
      onPress={() => {
        if (!actif || chargement) return;
        vibre.bouton();
        onPress();
      }}
      style={({ pressed }) => [K.bouton, { backgroundColor: actif ? fond ?? T.acc : T.mute }, pressed && actif && { opacity: 0.88 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !actif, busy: !!chargement }}
    >
      {chargement ? (
        <Points couleur={encre ?? T.accInk} />
      ) : (
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[K.boutonTxt, { color: actif ? encre ?? T.accInk : alpha(T.ink, 0.36) }]}>{label}</Txt>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ alerte */

export type BoutonAlerte = { label: string; onPress?: () => void; principal?: boolean };

/** Une alerte centree : fond assombri, carte au milieu, boutons en pilule. Apparition en fondu, sans rebond. */
export function Alerte({ visible, titre, texte, boutons, onFerme, children, illustration }: {
  visible: boolean;
  /** au-dessus du titre (un sticker) */
  illustration?: React.ReactNode;
  titre: string;
  texte?: string;
  boutons: BoutonAlerte[];
  onFerme: () => void;
  children?: React.ReactNode;
}) {
  const T = useNuit();
  const st = useMemo(
    () =>
      StyleSheet.create({
        voile: { flex: 1, backgroundColor: 'rgba(14,21,37,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
        carte: { width: '100%', maxWidth: 340, backgroundColor: T.bg, borderRadius: 24, borderWidth: 1, borderColor: T.line, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 },
        titre: { fontFamily: FONT.titre, fontSize: 19, lineHeight: 24, letterSpacing: -0.5, color: T.ink, textAlign: 'center' },
        texte: { fontFamily: FONT.texte, fontSize: 14, lineHeight: 20, color: T.sub, textAlign: 'center', marginTop: 10 },
        boutons: { flexDirection: 'row', gap: 10, marginTop: 20 },
        btn: { flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: T.line, paddingHorizontal: 10 },
        btnTxt: { fontFamily: FONT.titreBold, fontSize: 15, color: T.ink, textAlign: 'center' },
      }),
    [T],
  );
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onFerme}>
      <Pressable style={st.voile} onPress={onFerme} accessibilityLabel={traduire('Fermer')}>
        <Pressable style={st.carte} onPress={() => undefined} accessibilityRole="alert">
          {illustration}
          <Txt style={st.titre}>{titre}</Txt>
          {texte ? <Txt style={st.texte}>{texte}</Txt> : null}
          {children}
          <View style={st.boutons}>
            {boutons.map((b) => (
              <Pressable
                key={b.label}
                onPress={() => {
                  vibre.choix();
                  onFerme();
                  b.onPress?.();
                }}
                style={({ pressed }) => [st.btn, b.principal && { backgroundColor: T.acc }, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                <Txt style={[st.btnTxt, b.principal && { color: T.accInk }]}>{b.label}</Txt>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Trois points qui pulsent doucement, pendant une attente (aucun rebond) */
export function Points({ couleur }: { couleur: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: ND }));
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: couleur, opacity: v.interpolate({ inputRange: [0, (i + 0.5) / 3, 1], outputRange: [0.3, 1, 0.3] }) }}
        />
      ))}
    </View>
  );
}
