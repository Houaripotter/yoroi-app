/**
 * Atelier de partage (refonte v2) : apercu de la carte, choix de l'habillage
 * (papier de riz, laque, photo), photo de fond, puis partager ou enregistrer.
 */
import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Icon, P, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { Icon as EIcon } from '@/components/yoroi/v2/espace/ui';
import type { CardVariant } from './cardKit';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { traduire } from '@/lib/i18n/tr';

export type StudioStyle = CardVariant;

const STYLES: { key: StudioStyle; label: string }[] = [
  { key: 'papier', label: 'Papier' },
  { key: 'laque', label: 'Laque' },
  { key: 'photo', label: 'Photo' },
];

function Swatch({ k }: { k: StudioStyle }) {
  if (k === 'photo') {
    return (
      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: P.indigoSoft, alignItems: 'center', justifyContent: 'center' }}>
        <EIcon name="camera" size={16} color={P.indigo} />
      </View>
    );
  }
  return (
    <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: k === 'papier' ? '#F2F1EC' : '#1D2029', borderWidth: 1, borderColor: k === 'papier' ? P.line : '#1D2029', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: P.accent }} />
      <Glyph kind="sakura" size={16} color={k === 'papier' ? '#D9D5CB' : 'rgba(255,255,255,0.3)'} style={{ position: 'absolute', right: 2, top: 3 }} />
    </View>
  );
}

export function StylePicker({ value, onChange }: { value: StudioStyle; onChange: (s: StudioStyle) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {STYLES.map((s) => {
        const on = s.key === value;
        return (
          <View key={s.key} style={{ flex: 1 }}>
            <Press onPress={() => onChange(s.key)} accessibilityRole="button" accessibilityLabel={`Habillage ${s.label}`} accessibilityState={{ selected: on }}>
              <View style={{ minHeight: 56, borderRadius: 18, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 }}>
                <Swatch k={s.key} />
                <Ink size={14} weight="extraBold" color={on ? P.white : P.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{s.label}</Ink>
              </View>
            </Press>
          </View>
        );
      })}
    </View>
  );
}

export function PhotoButtons({ hasPhoto, onPick }: { hasPhoto: boolean; onPick: (src: 'gallery' | 'camera') => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
      <Press onPress={() => onPick('gallery')} accessibilityRole="button" accessibilityLabel={hasPhoto ? traduire('Changer de photo') : traduire('Choisir une photo')}>
        <View style={{ minHeight: 48, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <EIcon name="image" size={18} />
          <Ink size={14} weight="bold">{hasPhoto ? traduire('Changer de photo') : 'Galerie'}</Ink>
        </View>
      </Press>
      </View>
      <View style={{ flex: 1 }}>
      <Press onPress={() => onPick('camera')} accessibilityRole="button" accessibilityLabel={traduire("Prendre une photo")}>
        <View style={{ minHeight: 48, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <EIcon name="camera" size={18} />
          <Ink size={14} weight="bold">Appareil photo</Ink>
        </View>
      </Press>
      </View>
    </View>
  );
}

export function ShareStudio({
  title,
  subtitle,
  loading,
  empty,
  style,
  onStyle,
  hasPhoto,
  onPickPhoto,
  onShare,
  onSave,
  busy,
  extras,
  secondary,
  children,
  onBack,
}: {
  title: string;
  subtitle?: string;
  kanji?: string;
  loading?: boolean;
  empty?: { title: string; text: string; action?: string; onAction?: () => void; kanji?: string } | null;
  style: StudioStyle;
  onStyle: (s: StudioStyle) => void;
  hasPhoto: boolean;
  onPickPhoto: (src: 'gallery' | 'camera') => void;
  onShare: () => void;
  onSave: () => void;
  busy?: boolean;
  extras?: React.ReactNode;
  secondary?: { label: string; onPress: () => void };
  children?: React.ReactNode;
  onBack?: () => void;
}) {
  if (loading) {
    return (
      <DetailScreen title={title} subtitle={subtitle} onBack={onBack}>
        <View style={{ paddingVertical: 80, alignItems: 'center', gap: 12 }}>
          <ChargementPetit />
          <Ink size={14} weight="bold" color={P.ink2}>{traduire("Ta carte se prépare")}</Ink>
        </View>
      </DetailScreen>
    );
  }
  if (empty) {
    return (
      <DetailScreen title={title} subtitle={subtitle} onBack={onBack}>
        <EmptyState title={empty.title} text={empty.text} action={empty.action} onAction={empty.onAction} />
      </DetailScreen>
    );
  }
  return (
    <DetailScreen
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <BigButton label={busy ? traduire('Un instant') : traduire('Partager')} icon="share" onPress={onShare} disabled={busy} />
          </View>
          <Press onPress={onSave} accessibilityRole="button" accessibilityLabel={traduire("Enregistrer dans la galerie")}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, alignItems: 'center', justifyContent: 'center' }}>
              <EIcon name="download" size={22} />
            </View>
          </Press>
        </View>
      }
    >
      <View style={{ alignItems: 'center', shadowColor: P.ink, shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 }}>
        {children}
      </View>
      <View style={{ gap: 10, marginTop: 6 }}>
        <Ink size={17} weight="black" tight style={{ paddingHorizontal: 4 }}>Habillage</Ink>
        <StylePicker value={style} onChange={onStyle} />
        {style === 'photo' ? <PhotoButtons hasPhoto={hasPhoto} onPick={onPickPhoto} /> : null}
      </View>
      {extras}
      {secondary ? (
        <Press onPress={secondary.onPress} accessibilityRole="button" accessibilityLabel={secondary.label}>
          <View style={{ minHeight: 52, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ink size={15} weight="extraBold">{secondary.label}</Ink>
            <Icon name="chevron" size={16} />
          </View>
        </Press>
      ) : null}
      <View style={{ height: 30 }} />
    </DetailScreen>
  );
}
