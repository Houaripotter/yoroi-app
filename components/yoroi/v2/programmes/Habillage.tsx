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

/** La liste entière, une idée par bloc, aérée */
export function FeuillePrincipes({ visible, principes, onClose }: { visible: boolean; principes: string[]; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Comment le suivre')}>
      <View style={{ gap: 16, paddingHorizontal: 4 }}>
        {principes.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.darkCard, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Ink size={13} weight="black" color={c.onDark}>{String(i + 1)}</Ink>
            </View>
            <Ink size={15} style={{ flex: 1, lineHeight: 22 }}>{traduire(t)}</Ink>
          </View>
        ))}
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
