/**
 * Habillage commun des pages Programmes et Coach (26 octobre 2026).
 * Houari : « Je veux vraiment un beau design. » Le modèle est la carte « Note ta séance » (app/ajouter.tsx) :
 * fond indigo (c.darkCard), grand titre, puces, personnage illustré à droite. Ici :
 *  - CarteIllustree : la grande carte indigo, avec ses puces claires ;
 *  - Pastille : la petite puce des cartes claires (niveau, minutes, repos, muscles) ;
 *  - BlocReglages : plusieurs réglages dans une seule carte, séparés par un trait ;
 *  - TuilesPrincipes et FeuillePrincipes : « Comment le suivre » en trois tuiles, la liste entière dans une feuille ;
 *  - CarteEtudes : « Prouvé par N études », repliée en bas de page.
 * Aucun texte nouveau sur la science : les principes et les études viennent du catalogue et de sources.ts.
 */
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glass, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { musclesDeExo } from '@/lib/v2/programmes/musclesExos';
import { indexGarde, seancesAVenir } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';

/** La grande carte indigo, comme « Note ta séance » : texte à gauche, personnage à droite. onPress : l'appelant fait le retour haptique. */
export function CarteIllustree({ surtitre, titre, texte, puces, image, children, onPress, label, style }: {
  surtitre?: string;
  titre: string;
  texte?: string;
  puces?: { icone?: IconName; t: string }[];
  image?: ImageSourcePropType | null;
  children?: React.ReactNode;
  onPress?: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const contenu = (
    <>
      <Cercles />
      {image ? <Image source={image} style={{ position: 'absolute', right: -8, bottom: -54, width: 138, height: 190 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ maxWidth: image ? '64%' : '100%', gap: 6 }}>
        {surtitre ? <Ink size={12} weight="black" color={c.onDarkSecondary} style={{ letterSpacing: 0.6 }}>{surtitre.toLocaleUpperCase()}</Ink> : null}
        <Ink size={24} weight="black" tight color={c.onDark}>{titre}</Ink>
        {texte ? <Ink size={14} weight="bold" color={c.onDarkSecondary} style={{ lineHeight: 20 }}>{texte}</Ink> : null}
      </View>
      {puces?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: image ? '66%' : '100%', marginTop: 4 }}>
          {puces.map((x) => <PuceClaire key={x.t} icone={x.icone} texte={x.t} />)}
        </View>
      ) : null}
      {children}
    </>
  );
  const base: ViewStyle = { borderRadius: 26, backgroundColor: c.darkCard, overflow: 'hidden', padding: 20, gap: 12, minHeight: 170 };
  if (!onPress) return <View style={[base, style]}>{contenu}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label ?? titre} style={({ pressed }) => [base, style, { opacity: pressed ? 0.92 : 1 }]}>
      {contenu}
    </Pressable>
  );
}

/** Puce claire posée sur l'indigo */
export function PuceClaire({ icone, texte }: { icone?: IconName; texte: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)' }}>
      {icone ? <Icon name={icone} size={14} color={c.onDark} /> : null}
      <Ink size={13} weight="extraBold" color={c.onDark}>{texte}</Ink>
    </View>
  );
}

/** Bouton blanc de la carte indigo (Commencer) et bouton discret à côté. Le retour haptique est à l'appelant. */
export function BoutonIllustre({ label, onPress, icone, discret, accessibilityLabel }: { label: string; onPress: () => void; icone?: IconName; discret?: boolean; accessibilityLabel?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: discret ? (pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.16)') : pressed ? c.onDarkSecondary : c.onDark,
      })}
    >
      {icone ? <Icon name={icone} size={18} color={discret ? c.onDark : c.darkCard} /> : null}
      <Ink size={15} weight="extraBold" color={discret ? c.onDark : c.darkCard}>{label}</Ink>
    </Pressable>
  );
}

/** Petite puce des cartes claires */
export function Pastille({ texte, accent, icone, danger }: { texte: string; accent?: boolean; icone?: IconName; danger?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const fg = danger ? c.danger : accent ? c.accent : c.textSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: danger ? c.dangerTint : accent ? c.accentTint : c.fillSubtle }}>
      {icone ? <Icon name={icone} size={12} color={fg} /> : null}
      <Ink size={12} weight={accent || danger ? 'extraBold' : 'bold'} color={fg}>{texte}</Ink>
    </View>
  );
}

/** Pastille ronde d'icône, la même partout (réglages, questions, tuiles) */
export function RondIcone({ icone, plein }: { icone: IconName; plein?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: plein ? c.darkCard : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icone} size={20} color={plein ? c.onDark : c.accent} />
    </View>
  );
}

/** Plusieurs réglages dans une seule carte, un trait fin entre chacun */
export function BlocReglages({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const enfants = React.Children.toArray(children).filter(Boolean);
  return (
    <Glass style={{ padding: 0, overflow: 'hidden' }}>
      {enfants.map((x, i) => (
        <View key={i} style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}>{x}</View>
      ))}
    </Glass>
  );
}

/** Une ligne de réglage qui ouvre quelque chose (Ma salle, une question). Le retour haptique est à l'appelant. */
export function LigneReglage({ titre, sous, icone, onPress, plein }: { titre: string; sous?: string; icone: IconName; onPress: () => void; plein?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sous ? `${titre}. ${sous}` : titre}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, opacity: pressed ? 0.7 : 1 })}
    >
      <RondIcone icone={icone} plein={plein} />
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={16} weight="black" tight>{titre}</Ink>
        {sous ? <Ink size={13} color={c.textSecondary} numberOfLines={2}>{sous}</Ink> : null}
      </View>
      <Icon name="chevron" size={18} color={c.textMuted} />
    </Pressable>
  );
}

/**
 * Le début d'un principe, coupé à la première fin de proposition (« : » ou « . »), sans réécrire.
 * Les morceaux trop courts (« Ordre : ») gardent la suite jusqu'à la coupure suivante.
 * Coupé après traduction : la tuile suit la langue de l'app.
 */
export function debutDuPrincipe(t: string): string {
  const coupes = /\s?[:;]\s|\.\s/g;
  let fin = -1;
  let m: RegExpExecArray | null;
  while ((m = coupes.exec(t)) !== null) {
    if (m.index >= 22) {
      fin = m.index;
      break;
    }
  }
  const court = (fin >= 0 ? t.slice(0, fin) : t).trim();
  return court.replace(/[.\s]+$/, '');
}

/** Une icône qui parle, d'après le principe en français */
function iconeDuPrincipe(fr: string): IconName {
  const t = fr.toLowerCase();
  if (/réserve|échec/.test(t)) return 'gauge';
  if (/charge|fourchette|%/.test(t)) return 'chart';
  if (/légère|fatigue|repos|récup/.test(t)) return 'moon';
  if (/ordre|alterne|semaine|jour|lundi/.test(t)) return 'calendar';
  if (/round|frappe|sac|coup/.test(t)) return 'glove';
  if (/cours|course|allure|sortie/.test(t)) return 'steps';
  if (/mange|calori|déficit|surplus|poids/.test(t)) return 'scale';
  if (/série|muscle/.test(t)) return 'dumbbell';
  return 'target';
}

/** « Comment le suivre » : les trois premiers principes en tuiles, la liste entière à un toucher */
export function TuilesPrincipes({ principes }: { principes: string[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [tout, setTout] = useState(false);
  if (!principes.length) return null;
  return (
    <>
      <View style={{ gap: 8 }}>
        {principes.slice(0, 3).map((fr, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: c.accentTint }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.darkCard, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={iconeDuPrincipe(fr)} size={19} color={c.onDark} />
            </View>
            <Ink size={15} weight="bold" style={{ flex: 1, lineHeight: 21 }}>{debutDuPrincipe(traduire(fr))}</Ink>
          </View>
        ))}
        <Pressable
          onPress={() => { tap(); setTout(true); }}
          accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: c.accent, opacity: pressed ? 0.7 : 1 })}
        >
          <Ink size={14} weight="extraBold" color={c.accent}>{traduirePluriel(principes.length, principes.length > 1, 'Lire le conseil', 'Lire les {0} conseils', principes.length)}</Ink>
          <Icon name="chevron" size={15} color={c.accent} />
        </Pressable>
      </View>
      <FeuillePrincipes visible={tout} principes={principes} onClose={() => setTout(false)} />
    </>
  );
}

/** Ce qui reste d'un principe après son début (debutDuPrincipe), avec une majuscule ; vide s'il n'y a rien de plus */
export function suiteDuPrincipe(t: string): string {
  const court = debutDuPrincipe(t);
  const reste = t.slice(court.length).replace(/^[\s.:;]+/, '').trim();
  return reste ? reste.charAt(0).toLocaleUpperCase() + reste.slice(1) : '';
}

/**
 * « Comment le suivre » (26 octobre 2026, Houari : « les pages comme ça ne donnent pas envie, n'utilise pas ce design ») :
 * plus de liste numérotée. La carte indigo du titre, puis une carte par règle : son icône colorée, une ligne courte ;
 * le détail s'ouvre d'un toucher.
 */
export function FeuillePrincipes({ visible, principes, onClose }: { visible: boolean; principes: string[]; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const [ouvert, setOuvert] = useState<number | null>(null);
  return (
    <Sheet visible={visible} onClose={() => { setOuvert(null); onClose(); }}>
      <View style={{ gap: 10 }}>
        <View style={{ borderRadius: 24, backgroundColor: pal.indigo, overflow: 'hidden', padding: 18, gap: 8, minHeight: 120, justifyContent: 'flex-end' }}>
          <Cercles />
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="target" size={23} color="#FFFFFF" />
          </View>
          <Ink size={24} weight="black" tight color={c.onDark} accessibilityRole="header">{traduire('Comment le suivre')}</Ink>
          <Ink size={13} weight="bold" color={c.onDarkSecondary}>{traduirePluriel(principes.length, principes.length > 1, '{0} règle simple. Touche pour le détail.', '{0} règles simples. Touche pour le détail.', principes.length)}</Ink>
        </View>
        {principes.map((fr, i) => {
          const tr = traduire(fr);
          const court = debutDuPrincipe(tr);
          const suite = suiteDuPrincipe(tr);
          const t2 = teinteExo(pal, i);
          const deplie = ouvert === i && !!suite;
          return (
            <Pressable
              key={i}
              onPress={suite ? () => { tap(); setOuvert((o) => (o === i ? null : i)); } : undefined}
              disabled={!suite}
              accessibilityRole={suite ? 'button' : 'text'}
              accessibilityState={suite ? { expanded: deplie } : undefined}
              accessibilityLabel={tr}
              style={({ pressed }) => ({ borderRadius: 22, padding: 14, gap: 10, backgroundColor: pressed ? pal.teinte : pal.carte })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: t2.fond, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={iconeDuPrincipe(fr)} size={22} color={t2.encre} />
                </View>
                <Ink size={15} weight="extraBold" color={pal.texte} style={{ flex: 1, lineHeight: 20 }}>{court}</Ink>
                {suite ? (
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: pal.teinte, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: deplie ? '-90deg' : '90deg' }] }}>
                    <Icon name="chevron" size={14} color={pal.accent} />
                  </View>
                ) : null}
              </View>
              {deplie ? <Ink size={14} weight="bold" color={pal.texte2} style={{ lineHeight: 20, paddingLeft: 60 }}>{suite}</Ink> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** « Prouvé par N études », replié : le détail de chaque étude s'ouvre d'un toucher */
export function CarteEtudes({ sources }: { sources: string[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  const liste = sources.map((id) => ({ id, s: sourceParId(id) })).filter((x) => !!x.s);
  if (!liste.length) return null;
  return (
    <Glass style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable
        onPress={() => { tap(); setOuvert((o) => !o); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={traduire('Prouvé par les études')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}
      >
        <RondIcone icone="book" />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={16} weight="black" tight>{traduirePluriel(liste.length, liste.length > 1, '{0} étude', '{0} études', liste.length)}</Ink>
          <Ink size={13} color={c.textSecondary}>{traduire('Les études sur lesquelles repose ce programme')}</Ink>
        </View>
        <View style={{ transform: [{ rotate: ouvert ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={18} color={c.textMuted} /></View>
      </Pressable>
      {ouvert
        ? liste.map(({ id, s }) => (
            <Pressable
              key={id}
              onPress={() => { tap(); void safeOpenURL(s!.lien); }}
              accessibilityRole="link"
              accessibilityLabel={s!.titre}
              style={({ pressed }) => ({ gap: 4, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: c.divider, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
            >
              <Ink size={13} weight="extraBold">{`${s!.auteurs}, ${s!.annee}`}</Ink>
              <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(s!.apport)}</Ink>
              <Ink size={11} color={c.textMuted} numberOfLines={2}>{`${s!.titre}. ${s!.revue}.`}</Ink>
            </Pressable>
          ))
        : null}
    </Glass>
  );
}

/** Petite tuile de guide, deux par ligne (choisir sa charge, poids de départ) */
export function TuileGuide({ icone, titre, sous, onPress }: { icone: IconName; titre: string; sous: string; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`${titre}. ${sous}`}
      style={({ pressed }) => ({ flex: 1, minHeight: 128, borderRadius: 22, padding: 14, gap: 10, justifyContent: 'space-between', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.divider })}
    >
      <RondIcone icone={icone} />
      <View style={{ gap: 3 }}>
        <Ink size={15} weight="black" tight>{titre}</Ink>
        <Ink size={12} color={c.textSecondary} numberOfLines={2}>{sous}</Ink>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Maquette D aux couleurs de E (26 octobre 2026). Houari : « Je préfère D mais avec les couleurs de E.
 * La tuile charge +5 % est vraiment top, ça attire beaucoup. »
 * En clair (thème dojo) : fond bleu doux, cartes blanches, indigo de l'app, orange et vert de la maquette E.
 * En sombre et sur les autres thèmes : les couleurs du thème (tokens.ts), rien n'est forcé.
 * Chaque chiffre affiché vient de tes données (suivi.ts, progres.ts) : rien n'est inventé.
 * ---------------------------------------------------------------------------------------------- */

export type PaletteProgramme = {
  page: string;
  carte: string;
  indigo: string;
  /** le grand cercle plus clair de la carte indigo */
  cercle: string;
  teinte: string;
  anneau: string;
  texte: string;
  texte2: string;
  texte3: string;
  accent: string;
  orange: string;
  orangeTint: string;
  vert: string;
  vertTint: string;
};

/** Les couleurs des pages Programme et Coach */
export function usePaletteProgramme(): PaletteProgramme {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const maquetteE = theme.name === 'dojo' && !theme.isDark;
  if (maquetteE) {
    return {
      page: '#EDF1FA',
      carte: c.surface,
      indigo: c.darkCard,
      cercle: '#3A5BA0',
      teinte: '#DCE5FA',
      anneau: '#C9D5F0',
      texte: '#18203A',
      texte2: '#5D6785',
      texte3: '#8A93AE',
      accent: c.accent,
      orange: '#E07A2E',
      orangeTint: '#FCE7D6',
      vert: '#239A62',
      vertTint: '#E6F7EF',
    };
  }
  return {
    page: c.background,
    carte: c.surface,
    indigo: c.darkCard,
    cercle: 'rgba(255,255,255,0.07)',
    teinte: c.accentTint,
    anneau: c.border,
    texte: c.ink,
    texte2: c.textSecondary,
    texte3: c.textMuted,
    accent: c.accent,
    orange: c.gold,
    orangeTint: c.goldTint,
    vert: c.successText,
    vertTint: c.successTint,
  };
}

/** Les cercles décoratifs de la carte indigo : un grand plus clair en bas, un voile en haut */
export function Cercles() {
  const pal = usePaletteProgramme();
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -40, bottom: -80, width: 230, height: 230, borderRadius: 115, backgroundColor: pal.cercle }} />
    </>
  );
}

const ombreDouce = (couleur: string): ViewStyle => ({ shadowColor: couleur, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 });

/** « Bonjour Houari », selon l'heure */
export function salutation(nom?: string | null): string {
  const h = new Date().getHours();
  const mot = h < 5 ? traduire('Bonne nuit') : h < 18 ? traduire('Bonjour') : traduire('Bonsoir');
  const prenom = (nom ?? '').trim().split(/\s+/)[0];
  return prenom ? `${mot} ${prenom}` : mot;
}

/** En-tête de la maquette D : retour rond blanc, petite salutation et titre, bouton rond à droite */
export function EnTeteRond({ titre, salut, droite, repli = '/(tabs)' }: { titre: string; salut?: string; droite?: React.ReactNode; repli?: string }) {
  const pal = usePaletteProgramme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
      <Pressable
        onPress={() => {
          tap();
          if (router.canGoBack()) router.back();
          else router.replace(repli as never);
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire('Retour')}
        style={({ pressed }) => [{ width: 46, height: 46, borderRadius: 23, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, ombreDouce(pal.indigo)]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M15 5l-7 7 7 7" stroke={pal.texte} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        {salut ? <Ink size={13} weight="bold" color={pal.texte2} numberOfLines={1}>{salut}</Ink> : null}
        <Ink size={19} weight="black" tight color={pal.texte} numberOfLines={2} accessibilityRole="header">{titre}</Ink>
      </View>
      {droite}
    </View>
  );
}

/** Bouton rond indigo de l'en-tête (favori) */
export function BoutonRond({ icone, onPress, label, actif }: { icone: IconName; onPress: () => void; label: string; actif?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={actif === undefined ? undefined : { selected: actif }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: actif === false ? pal.carte : pal.indigo, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <Icon name={icone} size={20} color={actif === false ? pal.indigo : c.onDark} fill={actif === false ? undefined : c.onDark} />
    </Pressable>
  );
}

/** « Push A, force : pectoraux, épaules, triceps » devient « Push A » (texte déjà traduit) */
export function nomCourt(titre: string): string {
  const avant = titre.split(/\s?:\s/)[0];
  return avant.split(',')[0].trim() || titre;
}

/** La ligne des muscles d'un jour : la fin du titre (« pectoraux, épaules, triceps »), sinon les muscles des exercices */
export function musclesDuJour(titre: string, exos: readonly { nom: string }[]): string {
  const m = /\s?:\s(.+)$/.exec(titre);
  const brut = m
    ? m[1]
    : Array.from(new Set(exos.map((e) => musclesDeExo(e.nom)?.principaux[0]).filter((x): x is string => !!x).map((x) => traduire(x))))
        .slice(0, 3)
        .join(', ');
  return brut ? brut.charAt(0).toLocaleUpperCase() + brut.slice(1) : '';
}

/** La grande carte indigo de la maquette D : la séance du jour en très grand, le personnage à droite */
export function HeroJour({ pastille, nom, muscles, infos, texte, image, bouton, children, petitNom, ligne, pourquoi, ensuite, ajouts }: {
  pastille: string;
  /** 26 octobre 2026 : quel programme et où tu en es (lib/v2/programmes/heroJour.ts) */
  ligne?: string;
  /** pourquoi cette séance, une ligne */
  pourquoi?: string;
  /** « Puis ensuite : Push B, jeudi » */
  ensuite?: string;
  /** « + Abdos », « + 20 min de marche » */
  ajouts?: string[];
  nom: string;
  muscles?: string;
  infos?: string;
  /** un mot du coach (jour de repos, séance faite) */
  texte?: string;
  image?: ImageSourcePropType | null;
  bouton?: { label: string; onPress: () => void; icone?: IconName; discret?: boolean; accessibilityLabel?: string };
  children?: React.ReactNode;
  /** nom long (titre d'un programme) : plus petit */
  petitNom?: boolean;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <View style={[{ borderRadius: 30, backgroundColor: pal.indigo, overflow: 'hidden', paddingVertical: 22, paddingHorizontal: 20, minHeight: 236, gap: 14 }, ombreDouce(pal.indigo)]}>
      <Cercles />
      {image ? <Image source={image} style={{ position: 'absolute', right: -6, bottom: 0, width: 150, height: 204 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ maxWidth: image ? '60%' : '100%', gap: 8 }} accessible accessibilityLabel={[pastille, ligne, nom, muscles, infos, pourquoi, ensuite, ...(ajouts ?? []), texte].filter(Boolean).join('. ')}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 }}>
          <Ink size={12} weight="extraBold" color={c.onDark} numberOfLines={1}>{pastille}</Ink>
        </View>
        {ligne ? <Ink size={12} weight="bold" color={c.onDarkSecondary} numberOfLines={2}>{ligne}</Ink> : null}
        <Ink size={petitNom ? 24 : 34} weight="black" tight color={c.onDark} numberOfLines={petitNom ? 3 : 2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ lineHeight: petitNom ? 28 : 37 }}>{nom}</Ink>
        {muscles ? <Ink size={14} weight="bold" color={c.onDarkSecondary} numberOfLines={2}>{muscles}</Ink> : null}
        {infos ? <Ink size={13} weight="bold" color={c.onDarkSecondary} numberOfLines={2}>{infos}</Ink> : null}
        {pourquoi ? <Ink size={13} weight="bold" color={c.onDark} style={{ lineHeight: 18 }} numberOfLines={3}>{pourquoi}</Ink> : null}
        {ajouts?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ajouts.map((a) => (
              <View key={a} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <Ink size={12} weight="extraBold" color={c.onDark} numberOfLines={1}>{a}</Ink>
              </View>
            ))}
          </View>
        ) : null}
        {texte ? <Ink size={13} weight="bold" color={c.onDark} style={{ lineHeight: 18 }} numberOfLines={4}>{texte}</Ink> : null}
        {ensuite ? <Ink size={12} weight="extraBold" color={c.onDarkSecondary} numberOfLines={2}>{ensuite}</Ink> : null}
      </View>
      {bouton ? (
        <Pressable
          onPress={bouton.onPress}
          accessibilityRole="button"
          accessibilityLabel={bouton.accessibilityLabel ?? bouton.label}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            maxWidth: image ? '62%' : '100%',
            minHeight: 48,
            paddingHorizontal: 20,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: bouton.discret ? (pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.18)') : pressed ? c.onDarkSecondary : c.onDark,
          })}
        >
          <Icon name={bouton.icone ?? 'play'} size={14} color={bouton.discret ? c.onDark : pal.indigo} fill={bouton.icone && bouton.icone !== 'play' ? undefined : bouton.discret ? c.onDark : pal.indigo} />
          <Ink size={15} weight="black" color={bouton.discret ? c.onDark : pal.indigo} numberOfLines={1} style={{ flexShrink: 1 }}>{bouton.label}</Ink>
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}

export type Tuile = {
  label: string;
  /** null : pas encore de donnée, `vide` s'affiche en petit */
  valeur: string | null;
  sur?: string;
  unite?: string;
  vide?: string;
  couleur?: string;
  /** petite courbe qui descend devant le chiffre (baisse), sans signe moins */
  baisse?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Les trois tuiles de chiffres (Semaine, Séances, Charge) */
export function TuilesStats({ tuiles }: { tuiles: Tuile[] }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {tuiles.map((t) => {
        const contenu = (
          <>
            <Ink size={12} weight="bold" color={pal.texte2} numberOfLines={1}>{t.label}</Ink>
            {t.valeur === null ? (
              <Ink size={15} weight="extraBold" color={pal.texte2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ marginTop: 8 }}>{t.vide ?? ''}</Ink>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {t.baisse ? <View style={{ transform: [{ scaleY: -1 }] }}><Icon name="chart" size={16} color={t.couleur ?? pal.texte2} /></View> : null}
                <Ink size={28} weight="black" tight color={t.couleur ?? pal.texte} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1 }}>
                  {t.valeur}
                  {t.sur ? <Ink size={14} weight="extraBold" color={pal.texte3}>{`/${t.sur}`}</Ink> : null}
                  {t.unite ? <Ink size={14} weight="extraBold" color={t.couleur ?? pal.texte}>{` ${t.unite}`}</Ink> : null}
                </Ink>
              </View>
            )}
          </>
        );
        const base: ViewStyle = { flex: 1, minHeight: 78, backgroundColor: pal.carte, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 12, gap: 2 };
        const label = t.accessibilityLabel ?? `${t.label}, ${t.valeur === null ? t.vide ?? '' : `${t.valeur}${t.sur ? ` / ${t.sur}` : ''}${t.unite ? ` ${t.unite}` : ''}`}`;
        return t.onPress ? (
          <Pressable key={t.label} onPress={() => { tap(); t.onPress!(); }} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [base, ombreDouce(pal.indigo), { opacity: pressed ? 0.8 : 1 }]}>
            {contenu}
          </Pressable>
        ) : (
          <View key={t.label} accessible accessibilityLabel={label} style={[base, ombreDouce(pal.indigo)]}>{contenu}</View>
        );
      })}
    </View>
  );
}

/** La tuile « Charge » : la moyenne réelle des gains depuis le début du programme (progres.ts, gainMoyen) */
export function tuileCharge(gain: number | null, couleurs: { vert: string }, onPress?: () => void): Tuile {
  if (gain === null) return { label: traduire('Charge'), valeur: null, vide: traduire('À venir'), onPress, accessibilityLabel: `${traduire('Charge')}, ${traduire('À venir')}` };
  if (gain > 0) return { label: traduire('Charge'), valeur: `+${gain}`, unite: '%', couleur: couleurs.vert, onPress, accessibilityLabel: traduire('Charge : {0} % de plus depuis le début du programme', gain) };
  if (gain < 0) return { label: traduire('Charge'), valeur: `${Math.abs(gain)}`, unite: '%', baisse: true, onPress, accessibilityLabel: traduire('Charge : {0} % de moins depuis le début du programme', Math.abs(gain)) };
  return { label: traduire('Charge'), valeur: '0', unite: '%', onPress };
}

export type RondJour = { lettre: string; nomJour: string; etat: 'fait' | 'prochain' | 'prevu' | 'passe' | 'rate' | 'repos'; libelle: string };

const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Ta semaine, du lundi au dimanche : la séance faite chaque jour (suivi.ts, faits), puis les prochaines séances
 * du programme posées sur tes jours choisis, dans l'ordre (seancesAVenir). Sans programme en cours : le plan
 * à partir d'aujourd'hui, rien n'est marqué fait.
 */
export function rondsDeLaSemaine(p: Programme, actif: ProgrammeActif | null, jours: readonly number[], aujourdhui = new Date()): RondJour[] {
  const t = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate(), 12);
  const kAuj = (t.getDay() + 6) % 7;
  const aujIso = isoLocal(t);
  const enCours = !!actif && actif.id === p.id;
  const faitAuj = enCours && actif!.faits.some((f) => f.date === aujIso);
  const suite: { titre: string }[] = [];
  if (enCours) suite.push(...seancesAVenir(actif!, 7).map((x) => x.jour));
  else {
    let i = indexGarde(p, null, 0);
    for (let k = 0; k < 7; k++) {
      suite.push(p.jours[i]);
      i = indexGarde(p, null, i + 1);
    }
  }
  let n = 0;
  let prochainVu = false;
  return NOMS.map((nomFr, k) => {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - kAuj + k, 12);
    const di = isoLocal(d);
    // la lettre vient du nom du jour traduit (L, M, M en français ; M, T, W en anglais)
    const nomJour = traduire(nomFr);
    const base = { lettre: nomJour.charAt(0).toLocaleUpperCase(), nomJour };
    const fait = enCours ? actif!.faits.find((f) => f.date === di && f.date >= actif!.debut) : undefined;
    if (fait) {
      const j = p.jours.find((x) => x.id === fait.jourId);
      return { ...base, etat: 'fait', libelle: j ? nomCourt(traduire(j.titre)) : traduire('Faite') };
    }
    if (!jours.includes(k)) return { ...base, etat: 'repos', libelle: traduire('Repos') };
    const aVenir = di > aujIso || (di === aujIso && !faitAuj);
    if (!aVenir) return { ...base, etat: enCours && di >= actif!.debut ? 'rate' : 'passe', libelle: enCours && di >= actif!.debut ? traduire('À rattraper') : '' };
    const j = suite[n++];
    const etat = prochainVu ? 'prevu' : 'prochain';
    prochainVu = true;
    return { ...base, etat, libelle: j ? nomCourt(traduire(j.titre)) : '' };
  });
}

/** « Ta semaine » : sept ronds, plein avec une coche si c'est fait, cerclé d'indigo pour la prochaine séance */
export function SemaineRonds({ ronds, titre }: { ronds: RondJour[]; titre?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const etatLu: Record<RondJour['etat'], string> = {
    fait: traduire('faite'),
    prochain: traduire('prochaine séance'),
    prevu: traduire('prévue'),
    passe: '',
    rate: traduire('ratée'),
    repos: traduire('repos'),
  };
  return (
    <View style={{ gap: 10 }}>
      <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header">{titre ?? traduire('Ta semaine')}</Ink>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {ronds.map((r, k) => {
          const plein = r.etat === 'fait';
          const fond = plein ? pal.indigo : r.etat === 'repos' ? pal.teinte : pal.carte;
          const bord = r.etat === 'prochain' ? pal.indigo : r.etat === 'prevu' || r.etat === 'rate' || r.etat === 'passe' ? pal.anneau : 'transparent';
          return (
            <View
              key={k}
              accessible
              accessibilityLabel={[r.nomJour, r.etat === 'repos' ? '' : r.libelle, etatLu[r.etat]].filter(Boolean).join(', ')}
              style={{ flex: 1, alignItems: 'center', gap: 6 }}
            >
              <Ink size={11} weight="extraBold" color={pal.texte2}>{r.lettre}</Ink>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: fond, borderWidth: bord === 'transparent' ? 0 : 2, borderColor: bord, alignItems: 'center', justifyContent: 'center' }}>
                {plein ? <Icon name="check" size={16} color={c.onDark} strokeWidth={3} /> : null}
              </View>
              <Ink size={11} weight={r.etat === 'repos' || r.etat === 'rate' ? 'bold' : 'extraBold'} color={r.etat === 'repos' || r.etat === 'rate' ? pal.texte3 : pal.texte} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {r.libelle || ' '}
              </Ink>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Les teintes des carrés d'icône des exercices, dans l'ordre : indigo, orange, vert */
export function teinteExo(pal: PaletteProgramme, k: number): { fond: string; encre: string } {
  const l = [
    { fond: pal.teinte, encre: pal.accent },
    { fond: pal.orangeTint, encre: pal.orange },
    { fond: pal.vertTint, encre: pal.vert },
  ];
  return l[((k % 3) + 3) % 3];
}

/** Titre de section de la maquette D, avec son lien à droite (« Tout voir ») */
export function TitreSection({ titre, action, onAction }: { titre: string; action?: string; onAction?: () => void }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
      <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header" style={{ flex: 1 }}>{titre}</Ink>
      {action && onAction ? (
        <Pressable onPress={() => { tap(); onAction(); }} accessibilityRole="button" hitSlop={10} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 10 }}>
          <Ink size={13} weight="extraBold" color={pal.accent}>{action}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/** « Le conseil du coach » : la règle de progression, coupée à sa première proposition. Toucher ouvre « Comment le suivre » */
export function CarteConseil({ principes }: { principes: string[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const [ouvert, setOuvert] = useState(false);
  if (!principes.length) return null;
  const regle = principes.find((fr) => /fourchette|charge|%/i.test(fr)) ?? principes[0];
  const court = debutDuPrincipe(traduire(regle));
  return (
    <>
      <Pressable
        onPress={() => { tap(); setOuvert(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${traduire('Le conseil du coach')}. ${court}. ${traduire('Comment le suivre')}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, padding: 16, backgroundColor: pal.indigo, opacity: pressed ? 0.9 : 1 })}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chart" size={22} color={c.onDark} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="black" color={c.onDark}>{traduire('Le conseil du coach')}</Ink>
          <Ink size={13} color={c.onDarkSecondary} style={{ lineHeight: 18 }}>{court}</Ink>
        </View>
        <Icon name="chevron" size={16} color={c.onDark} />
      </Pressable>
      <FeuillePrincipes visible={ouvert} principes={principes} onClose={() => setOuvert(false)} />
    </>
  );
}

/** En bas de page, une ligne discrète « Prouvé par N études », « Voir » ouvre le détail de chaque étude */
export function LigneEtudes({ sources }: { sources: string[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const [ouvert, setOuvert] = useState(false);
  const liste = sources.map((id) => ({ id, s: sourceParId(id) })).filter((x) => !!x.s);
  if (!liste.length) return null;
  const titre = traduirePluriel(liste.length, liste.length > 1, 'Prouvé par {0} étude', 'Prouvé par {0} études', liste.length);
  return (
    <>
      <Pressable
        onPress={() => { tap(); setOuvert(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${titre}. ${traduire('Voir')}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 6, opacity: pressed ? 0.7 : 1 })}
      >
        <Ink size={13} weight="bold" color={pal.texte2}>{titre}</Ink>
        <Ink size={13} weight="extraBold" color={pal.accent}>{traduire('Voir')}</Ink>
      </Pressable>
      <Sheet visible={ouvert} onClose={() => setOuvert(false)} title={traduire('Prouvé par les études')}>
        <View style={{ gap: 4 }}>
          <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4, marginBottom: 6 }}>{traduire('Les études sur lesquelles repose ce programme')}</Ink>
          {liste.map(({ id, s }) => (
            <Pressable
              key={id}
              onPress={() => { tap(); void safeOpenURL(s!.lien); }}
              accessibilityRole="link"
              accessibilityLabel={s!.titre}
              style={({ pressed }) => ({ gap: 4, paddingHorizontal: 4, paddingVertical: 12, borderTopWidth: 1, borderColor: c.divider, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
            >
              <Ink size={13} weight="extraBold">{`${s!.auteurs}, ${s!.annee}`}</Ink>
              <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(s!.apport)}</Ink>
              <Ink size={11} color={c.textMuted} numberOfLines={2}>{`${s!.titre}. ${s!.revue}.`}</Ink>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}
