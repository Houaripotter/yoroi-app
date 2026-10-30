/**
 * Briques communes de l'espace Sante (refonte v2) : etat de la source,
 * periodes, blocs d'explication, lignes d'action, etapes, accordeons.
 */
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Press, shadow } from '@/components/yoroi/v2/accueil/kit';
import { relativeSync } from '@/lib/v2/sante/stats';
import type { SanteSource } from '@/lib/v2/sante/data';
import { SanteIcon } from './SanteIcon';
import type { SanteIconName } from './SanteIcon';
import { P, P_CLAIR, P_SOMBRE, paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

/**
 * Palette des ecrans Sante. Audit 43 : elle suit le theme (memes valeurs qu'avant en clair,
 * celles de la palette de nuit en sombre), lue a chaque rendu.
 */
export const S = {
  get paper() { return paletteSombre() ? P_SOMBRE.paper : P_CLAIR.paper; },
  get ink() { return paletteSombre() ? P_SOMBRE.ink : P_CLAIR.ink; },
  get ink2() { return paletteSombre() ? P_SOMBRE.ink2 : P_CLAIR.ink2; },
  get muted() { return paletteSombre() ? P_SOMBRE.muted : P_CLAIR.muted; },
  get line() { return paletteSombre() ? P_SOMBRE.line : P_CLAIR.line; },
  get line2() { return paletteSombre() ? P_SOMBRE.line2 : P_CLAIR.line2; },
  get accent() { return paletteSombre() ? P_SOMBRE.accent : P_CLAIR.accent; },
  get accentDark() { return paletteSombre() ? P_SOMBRE.accentDark : P_CLAIR.accentDark; },
  get accentSoft() { return paletteSombre() ? P_SOMBRE.accentSoft : P_CLAIR.accentSoft; },
  get accentText() { return paletteSombre() ? P_SOMBRE.accentText : P_CLAIR.accentText; },
  get danger() { return paletteSombre() ? P_SOMBRE.danger : '#B0282E'; },
  get dangerSoft() { return paletteSombre() ? P_SOMBRE.dangerSoft : '#F6E3E1'; },
  get record() { return paletteSombre() ? P_SOMBRE.record : '#B0282E'; },
  get heart() { return paletteSombre() ? P_SOMBRE.heart : '#7B3B63'; },
  get red() { return paletteSombre() ? P_SOMBRE.red : '#B0282E'; },
  get redSoft() { return paletteSombre() ? P_SOMBRE.redSoft : '#F6E3E1'; },
  get indigo() { return paletteSombre() ? P_SOMBRE.indigo : P_CLAIR.indigo; },
  get indigoSoft() { return paletteSombre() ? P_SOMBRE.indigoSoft : P_CLAIR.indigoSoft; },
  get gold() { return paletteSombre() ? P_SOMBRE.gold : '#A8832F'; },
  get goldSoft() { return paletteSombre() ? P_SOMBRE.goldSoft : '#F5ECD6'; },
  get moss() { return paletteSombre() ? P_SOMBRE.moss : '#6E8C3A'; },
  get mossText() { return paletteSombre() ? P_SOMBRE.mossText : '#4F6B28'; },
  get mossSoft() { return paletteSombre() ? P_SOMBRE.mossSoft : '#E8EEDC'; },
  get glass() { return paletteSombre() ? P_SOMBRE.carte : 'rgba(255,255,255,0.9)'; },
};

export function GlassBox({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderRadius: 26, backgroundColor: S.glass, borderWidth: 1, borderColor: P.tuileBord, padding: 18 }, shadow, style]}>{children}</View>;
}

export function Label({ children, aside }: { children: string; aside?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 10 }}>
      <Ink size={19} weight="black" tight>
        {children}
      </Ink>
      {aside ? (
        <Ink size={12} weight="bold" color={S.muted}>
          {aside}
        </Ink>
      ) : null}
    </View>
  );
}

/** Bouton compact (44 points mini) */
export function SmallButton({ label, onPress, tone = 'ink', icon, busy, disabled }: { label: string; onPress: () => void; tone?: 'ink' | 'red' | 'light'; icon?: SanteIconName; busy?: boolean; disabled?: boolean }) {
  // 27 octobre 2026 (refonte Pastel) : le bouton principal en pastel, texte bleu nuit
  const bg = tone === 'red' ? P.primary : tone === 'ink' ? S.ink : P.white;
  const fg = tone === 'light' ? S.ink : tone === 'red' ? P.onPrimary : paletteSombre() ? P_SOMBRE.paper : '#FFFFFF';
  return (
    <Press onPress={busy || disabled ? undefined : onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={label} disabled={busy || disabled}>
      <View style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 16, backgroundColor: bg, borderWidth: tone === 'light' ? 1 : 0, borderColor: S.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : 1 }}>
        {busy ? <ActivityIndicator size="small" color={fg} /> : icon ? <SanteIcon name={icon} size={17} color={fg} width={2.3} /> : null}
        <Ink size={14} weight="extraBold" color={fg}>
          {label}
        </Ink>
      </View>
    </Press>
  );
}

/** Etat de la liaison avec Apple Sante ou Health Connect */
export function SourceCard({ source, onConnect, onSync, syncing, connecting }: { source: SanteSource | null; onConnect?: () => void; onSync?: () => void; syncing?: boolean; connecting?: boolean }) {
  if (!source) return null;
  const p = source.provider;
  if (source.mode === 'expoGo' || source.mode === 'web' || source.mode === 'indisponible') {
    // 30 octobre 2026 : sur Mac, toujours les textes de l'app installee (jamais ceux du mode test)
    const dev = __DEV__ && source.mode !== 'indisponible';
    return (
      <GlassBox style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <SanteIcon name="phone" size={24} color={S.indigo} />
          </View>
          <View style={{ flex: 1 }}>
            <Ink size={17} weight="black" tight>
              {dev ? traduire('Disponible dans l’app installée') : traduire('Lecture santé indisponible ici')}
            </Ink>
            <Ink size={13} weight="bold" color={S.ink2}>
              {dev ? (source.mode === 'web' ? traduire('Mode test\u00A0: pas de lecture santé sur le web') : traduire("Mode test : {0} ne s’ouvre pas dans Expo Go", p)) : traduire("{0} n’est pas joignable sur cet appareil", p)}
            </Ink>
          </View>
        </View>
        <Ink size={14} weight="medium" color={S.ink2}>
          {!dev
            ? traduire('Tu vois ici ce qui est déjà enregistré dans YOROI. Ouvre l’app sur ton téléphone pour lire tes données de santé en direct.')
            : source.mode === 'web'
            ? traduire('Ouvre YOROI sur ton téléphone pour lire tes données de santé.')
            : source.platform === 'android'
            ? traduire("Installe YOROI depuis le Play Store pour lire {0} en direct. Ici, tu vois ce qui est déjà enregistré sur ton téléphone.", p)
            : traduire("Installe YOROI depuis l'App Store ou TestFlight pour lire {0} en direct. Ici, tu vois ce qui est déjà enregistré sur ton téléphone.", p)}
        </Ink>
      </GlassBox>
    );
  }
  if (source.mode === 'off') {
    return (
      <GlassBox style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <SanteIcon name="link" size={24} color={S.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Ink size={17} weight="black" tight>
              {`Relie ${p}`}
            </Ink>
            <Ink size={13} weight="bold" color={S.ink2}>
              {traduire("Ta montre et ta balance remplissent cet écran toutes seules")}</Ink>
          </View>
        </View>
        {onConnect ? <SmallButton label={connecting ? traduire('Connexion') : `Connecter ${p}`} tone="red" icon="link" busy={connecting} onPress={onConnect} /> : null}
      </GlassBox>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: S.moss }} />
      <Ink size={13} weight="bold" color={S.ink2} style={{ flex: 1 }} numberOfLines={2}>
        {traduire("{0} relié, {1}", p, relativeSync(source.lastSync))}
      </Ink>
      {onSync ? (
        <Press onPress={syncing ? undefined : onSync} accessibilityRole="button" accessibilityLabel={traduire("Synchroniser maintenant")} hitSlop={8}>
          <View style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {syncing ? <ActivityIndicator size="small" color={S.ink} /> : <SanteIcon name="sync" size={15} color={S.ink} width={2.3} />}
            <Ink size={12} weight="extraBold">
              {syncing ? traduire('En cours') : 'Synchroniser'}
            </Ink>
          </View>
        </Press>
      ) : null}
    </View>
  );
}

export type PeriodItem<T extends string> = { key: T; label: string; locked?: boolean };

/** Segments de periode, avec cadenas pour les periodes Premium */
export function PeriodSegments<T extends string>({ items, value, onChange, accent = S.ink }: { items: PeriodItem<T>[]; value: T; onChange: (k: T) => void; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: paletteSombre() ? P_SOMBRE.line : '#E9E6DF', borderRadius: 18, padding: 4, gap: 4 }}>
      {items.map((it) => {
        const on = it.key === value;
        const onSeg = paletteSombre() ? P_SOMBRE.paper : '#FFFFFF';
        return (
          <View key={it.key} style={{ flex: 1 }}>
          <Press onPress={() => onChange(it.key)} accessibilityRole="button" accessibilityLabel={it.locked ? traduire("{0}, réservé Premium", it.label) : it.label} accessibilityState={{ selected: on }}>
            <View style={{ minHeight: 44, borderRadius: 14, backgroundColor: on ? accent : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
              {it.locked ? <SanteIcon name="lock" size={12} color={on ? onSeg : S.muted} width={2.4} /> : null}
              <Ink size={14} weight="extraBold" color={on ? onSeg : S.ink2}>
                {traduire(it.label)}
              </Ink>
            </View>
          </Press>
          </View>
        );
      })}
    </View>
  );
}

/** Bloc d'explication avec pastille d'icone */
export function InfoBlock({ icon, title, color = S.ink, tint = S.line2, children, footnote }: { icon: SanteIconName; title: string; color?: string; tint?: string; children: React.ReactNode; footnote?: string }) {
  return (
    <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          <SanteIcon name={icon} size={18} color={color} />
        </View>
        <Ink size={16} weight="black" tight style={{ flex: 1 }}>
          {title}
        </Ink>
      </View>
      {typeof children === 'string' ? (
        <Ink size={14} weight="medium" color={S.ink2}>
          {children}
        </Ink>
      ) : (
        children
      )}
      {footnote ? (
        <Ink size={12} weight="bold" color={S.muted}>
          {footnote}
        </Ink>
      ) : null}
    </View>
  );
}

/** Ligne d'action dans une carte : icone, titre, sous-titre, chevron ou etat */
export function ActionRow({ icon, title, sub, onPress, color = S.ink, tint = S.line2, busy, right, first }: { icon: SanteIconName; title: string; sub?: string; onPress?: () => void; color?: string; tint?: string; busy?: boolean; right?: React.ReactNode; first?: boolean }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: S.line2 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <SanteIcon name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="extraBold">
          {title}
        </Ink>
        {sub ? (
          <Ink size={12} weight="bold" color={S.ink2}>
            {sub}
          </Ink>
        ) : null}
      </View>
      {busy ? <ActivityIndicator size="small" color={color} /> : right ?? (onPress ? <SanteIcon name="chevron" size={16} color={S.muted} /> : null)}
    </View>
  );
  if (!onPress) return body;
  return (
    <Press onPress={busy ? undefined : onPress} accessibilityRole="button" accessibilityLabel={sub ? `${title}, ${sub}` : title}>
      {body}
    </Press>
  );
}

export function CardBox({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, paddingHorizontal: 16, paddingVertical: 6 }, style]}>{children}</View>;
}

/** Etapes numerotees */
export function Steps({ steps, color = S.accent }: { steps: string[]; color?: string }) {
  return (
    <View style={{ gap: 10 }}>
      {steps.map((st, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Ink size={12} weight="black" color={paletteSombre() ? P_SOMBRE.paper : '#FFFFFF'}>
              {String(i + 1)}
            </Ink>
          </View>
          <Ink size={14} weight="medium" color={S.ink2} style={{ flex: 1 }}>
            {st}
          </Ink>
        </View>
      ))}
    </View>
  );
}

/** Carte repliable */
export function Accordion({ title, sub, badge, color = S.ink, initiallyOpen, children, mark }: { title: string; sub?: string; badge?: string; color?: string; initiallyOpen?: boolean; children: React.ReactNode; mark?: React.ReactNode }) {
  const [open, setOpen] = useState(!!initiallyOpen);
  return (
    <View style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: open ? color : S.line2, overflow: 'hidden' }}>
      <Press onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 12 }}>
          {mark}
          <View style={{ flex: 1 }}>
            <Ink size={15} weight="extraBold">
              {title}
            </Ink>
            {sub ? (
              <Ink size={12} weight="bold" color={S.ink2} numberOfLines={2}>
                {sub}
              </Ink>
            ) : null}
          </View>
          {badge ? (
            <View style={{ paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: S.mossSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={11} weight="extraBold" color={S.mossText}>
                {badge}
              </Ink>
            </View>
          ) : null}
          <SanteIcon name={open ? 'up' : 'down'} size={18} color={S.muted} />
        </View>
      </Press>
      {open ? <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>{children}</View> : null}
    </View>
  );
}

/** Pastille de marque (lettre sur fond colore) */
/**
 * Pastille d'appareil : neutre et identique pour toutes les marques (pas de logo copie,
 * pas de couleur au hasard). Le dessin dit seulement le type : montre, bague, bracelet ou balance.
 * text et color restent acceptes pour les anciens appels ; un ancien kanji devient une etoile dessinee.
 */
export function BrandMark({ text, color, size = 40, kind }: { text: string; color?: string; size?: number; kind?: string }) {
  void color;
  const isKanji = !!text && /[\u3000-\u9fff]/.test(text);
  const k = (kind ?? '').toLowerCase();
  const shape: 'ring' | 'band' | 'scale' | 'watch' = k.startsWith('bague') ? 'ring' : k.startsWith('bracelet') ? 'band' : k.startsWith('balance') ? 'scale' : 'watch';
  const icon = Math.round(size * 0.56);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: S.paper, borderWidth: 1, borderColor: S.line, alignItems: 'center', justifyContent: 'center' }}>
      {isKanji ? (
        <Glyph kind="etoile" size={Math.round(size * 0.46)} color={S.accent} />
      ) : (
        <Svg width={icon} height={icon} viewBox="0 0 24 24" fill="none">
          {shape === 'ring' ? (
            <>
              <Circle cx={12} cy={13} r={7} stroke={S.ink} strokeWidth={2.2} />
              <Path d="M9 6.5l1.2-2.5h3.6L15 6.5" stroke={S.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : shape === 'band' ? (
            <>
              <Path d="M8 3v4M16 3v4M8 17v4M16 17v4" stroke={S.ink} strokeWidth={2.2} strokeLinecap="round" />
              <Rect x={6.5} y={7} width={11} height={10} rx={4} stroke={S.ink} strokeWidth={2.2} />
              <Path d="M10 12h4" stroke={S.ink} strokeWidth={2.2} strokeLinecap="round" />
            </>
          ) : shape === 'scale' ? (
            <>
              <Rect x={4} y={4} width={16} height={16} rx={4} stroke={S.ink} strokeWidth={2.2} />
              <Path d="M9 9.5a4 4 0 0 1 6 0M12 12l1.5-2" stroke={S.ink} strokeWidth={2.2} strokeLinecap="round" />
            </>
          ) : (
            <>
              <Rect x={6} y={6} width={12} height={12} rx={3} stroke={S.ink} strokeWidth={2.2} />
              <Path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 9.5V12l1.6 1" stroke={S.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

/** Message d'etat sous un bouton */
export function Notice({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'good' | 'bad' }) {
  const bg = tone === 'good' ? S.mossSoft : tone === 'bad' ? S.dangerSoft : paletteSombre() ? P_SOMBRE.line : '#ECE9E2';
  const fg = tone === 'good' ? S.mossText : tone === 'bad' ? S.danger : S.ink2;
  return (
    <View style={{ borderRadius: 16, backgroundColor: bg, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <SanteIcon name={tone === 'good' ? 'check' : 'info'} size={16} color={fg} width={2.4} />
      <Ink size={13} weight="bold" color={fg} style={{ flex: 1 }}>
        {text}
      </Ink>
    </View>
  );
}
