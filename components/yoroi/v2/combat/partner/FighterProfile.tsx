/**
 * Carte combattant v2 : style de combat, niveau, ADN de jeu (radar), surnom,
 * gardes preferees, ecarts physiques, attaques dangereuses, joueur de reference.
 */
import React, { useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Pressable, TextInput, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { ARCHETYPE_META, EXPERIENCE_LEVEL_META } from '@/lib/partnerModel';
import type { Archetype, ExperienceLevel } from '@/lib/partnerModel';
import type { Partner, StyleStats } from '@/lib/v2/combat/partners';
import { DEFAULT_STYLE, STYLE_AXES } from '@/lib/v2/combat/partnerInsights';
import type { PartnerInsights } from '@/lib/v2/combat/partnerInsights';
import { StyleRadar } from '../charts';
import { Card, Chip, CIcon, D, Field, FormSheet, P, Press, TagEditor, tap } from '../ui';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

/** Sigle du style de combat, en lettres latines */
const ARCH_MARK: Record<Archetype, string> = { gardien: 'GA', passeur: 'PA', striker: 'ST', bagarreur: 'BA', takedown: 'TD', polyvalent: 'PO' };
const ARCH_COLOR: Record<Archetype, string> = { gardien: '#2C4A84', passeur: '#A8832F', striker: '#3D5D9E', bagarreur: '#8C6A3F', takedown: '#4F6B28', polyvalent: '#454A58' };
const ARCH_DESC: Record<Archetype, string> = {
  gardien: traduire('Joue la garde, triangle, attaques du dessous.'),
  passeur: traduire('Jeu du dessus, pression, passage de garde.'),
  striker: traduire('Debout, poings, pieds, distance.'),
  bagarreur: traduire('Volume, corps à corps, usure, physique.'),
  takedown: traduire('Lutteur ou judoka, il t\'amène au sol.'),
  polyvalent: traduire('Style équilibré, il s\'adapte.'),
};
const LEVEL_LABEL: Record<ExperienceLevel, string> = { debutant: 'Débutant', experimente: traduire('Expérimenté'), competiteur: traduire('Compétiteur'), pro: 'Professionnel' };
const GARDES = ['Fermée', 'De La Riva', 'X-Guard', 'Spider', 'Lasso', '50/50', 'Demi-garde', 'Papillon', 'Debout'];

export function FighterProfile({ p, ins, onChange }: { p: Partner; ins: PartnerInsights; onChange: (patch: Partial<Partner>) => void }) {
  const [archOpen, setArchOpen] = useState(false);
  const [lvlOpen, setLvlOpen] = useState(false);
  const stats = p.styleStats ?? DEFAULT_STYLE;
  const arch = p.archetype;
  const color = arch ? ARCH_COLOR[arch] : P.accent;
  // couleur de style fixe (foncee dans les deux modes) : textes blancs ; sans style, l'accent suit le mode
  const surFixe = !!arch;
  const fg = surFixe ? P.pureWhite : P.white;
  const gardes = p.gardePreferred ?? [];
  return (
    <View style={{ gap: 12 }}>
      <Press onPress={() => setArchOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Choisir son style de combat")}>
        <View style={{ borderRadius: 24, padding: 18, backgroundColor: color, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -10, top: -26 }} pointerEvents="none">
            <Glyph kind="sakura" size={130} color="rgba(255,255,255,0.12)" />
          </View>
          <View style={{ width: 58, height: 58, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            {arch ? (
              <Ink weight="black" size={20} color={fg} allowFontScaling={false}>
                {ARCH_MARK[arch]}
              </Ink>
            ) : (
              <Glyph kind="sakura" size={28} color={P.white} />
            )}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={13} weight="bold" color={surFixe || !paletteSombre() ? 'rgba(255,255,255,0.8)' : 'rgba(29,32,41,0.8)'}>
              {traduire("Style de combat")}</Ink>
            <Ink size={24} weight="black" tight color={fg}>
              {arch ? ARCHETYPE_META[arch].label : traduire('À définir')}
            </Ink>
            <Ink size={13} color={surFixe || !paletteSombre() ? 'rgba(255,255,255,0.88)' : 'rgba(29,32,41,0.88)'} numberOfLines={2}>
              {arch ? ARCH_DESC[arch] : traduire('Touche pour choisir son style dominant')}
            </Ink>
          </View>
          <CIcon name="chevron" size={18} color={surFixe || !paletteSombre() ? 'rgba(255,255,255,0.8)' : 'rgba(29,32,41,0.8)'} />
        </View>
      </Press>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Press onPress={() => setLvlOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Choisir son niveau")} style={{ flex: 1 }}>
          <Card style={{ padding: 14, gap: 2 }}>
            <Ink size={12} weight="bold" color={P.ink2}>
              {traduire("Niveau")}</Ink>
            <Ink size={17} weight="black" tight>
              {p.experienceLevel ? LEVEL_LABEL[p.experienceLevel] : traduire('À choisir')}
            </Ink>
          </Card>
        </Press>
        <Card style={{ flex: 1, padding: 14, gap: 2, borderColor: `${ins.fighterThreat.color}55` }}>
          <Ink size={12} weight="bold" color={P.ink2}>
            {traduire("Menace")}</Ink>
          <Ink size={17} weight="black" tight color={ins.fighterThreat.color}>
            {traduire("{0} sur 10", String(ins.fighterThreat.score).replace('.', DECIMAL))}
          </Ink>
          <Ink size={12} weight="bold" color={ins.fighterThreat.color}>
            {traduire(ins.fighterThreat.label)}
          </Ink>
        </Card>
      </View>

      <Card style={{ gap: 12 }}>
        <View>
          <Ink size={18} weight="black" tight>
            {traduire("ADN de jeu")}</Ink>
          <Ink size={13} color={P.ink2}>
            {traduire("Touche les plaques pour noter chaque qualité de 1 à 5")}</Ink>
        </View>
        <View style={{ alignItems: 'center' }}>
          <StyleRadar axes={STYLE_AXES.map((a) => a.label)} values={STYLE_AXES.map((a) => stats[a.key] ?? 0)} color={color} size={250} />
        </View>
        {STYLE_AXES.map((ax) => {
          const v = stats[ax.key] ?? 0;
          return (
            <View key={ax.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ink size={14} weight="bold" style={{ width: 92 }}>
                {traduire(ax.label)}
              </Ink>
              <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      tap();
                      const next: StyleStats = { ...stats, [ax.key]: n };
                      onChange({ styleStats: next });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={traduire("{0} {1} sur 5", ax.label, n)}
                    hitSlop={4}
                    style={{ flex: 1, height: 36, borderRadius: 10, backgroundColor: n <= v ? color : P.line2, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 20, height: 3, backgroundColor: n <= v ? P.accent : P.line }} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 12 }}>
        <Field
          label={traduire("Son surnom de combat")}
          defaultValue={p.nickname ?? ''}
          onEndEditing={(e) => {
            const v = e.nativeEvent.text.trim();
            if (v !== (p.nickname ?? '')) onChange({ nickname: v || undefined });
          }}
          placeholder={traduire("Par exemple : le sorcier du triangle")}
        />
        <View style={{ gap: 8 }}>
          <Ink size={13} weight="bold" color={P.ink2}>
            {traduire("Ses gardes et positions préférées")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GARDES.map((g) => {
              const on = gardes.includes(g);
              return <Chip key={g} label={traduire(g)} on={on} color={color} onPress={() => onChange({ gardePreferred: on ? gardes.filter((x) => x !== g) : [...gardes, g] })} />;
            })}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 14 }}>
        <View>
          <Ink size={18} weight="black" tight>
            {traduire("Comparaison physique")}</Ink>
          <Ink size={13} color={P.ink2}>
            {traduire("Écart par rapport à toi : plus, il est plus lourd ou plus grand")}</Ink>
        </View>
        <Physical label="Poids" unit="kg" value={p.weightDeltaKg} onChange={(v) => onChange({ weightDeltaKg: v })} />
        <Physical label="Taille" unit="cm" value={p.heightDeltaCm} onChange={(v) => onChange({ heightDeltaCm: v })} />
        <Physical label={traduire("Allonge")} unit="cm" value={p.reachDeltaCm} onChange={(v) => onChange({ reachDeltaCm: v })} />
      </Card>

      <Card style={{ gap: 10, borderColor: '#EBC9C7' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CIcon name="shield" size={18} color={D} />
          <Ink size={18} weight="black" tight>
            {traduire("Attention à")}</Ink>
        </View>
        <Ink size={13} color={P.ink2}>
          {traduire("Les attaques qu'il place souvent")}</Ink>
        <TagEditor items={p.dangerousMoves ?? []} color={D} onChange={(next) => onChange({ dangerousMoves: next })} placeholder={traduire("Triangle, clé de bras, kimura")} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Field
          label={traduire("Il ressemble à quel combattant connu ?")}
          defaultValue={p.similarTo ?? ''}
          onEndEditing={(e) => {
            const v = e.nativeEvent.text.trim();
            if (v !== (p.similarTo ?? '')) onChange({ similarTo: v || undefined });
          }}
          placeholder={traduire("Un combattant qui a le même jeu")}
        />
      </Card>

      <FormSheet visible={archOpen} onClose={() => setArchOpen(false)} title={traduire("Style de {0}", p.name)}>
        {(Object.keys(ARCHETYPE_META) as Archetype[]).map((a) => {
          const on = arch === a;
          return (
            <Press
              key={a}
              onPress={() => {
                onChange({ archetype: a });
                setArchOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={traduire(ARCHETYPE_META[a].label)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: on ? `${ARCH_COLOR[a]}14` : P.white, borderWidth: 1.5, borderColor: on ? ARCH_COLOR[a] : P.line2 }}>
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: ARCH_COLOR[a], alignItems: 'center', justifyContent: 'center' }}>
                  <Ink weight="black" size={16} color={P.white} allowFontScaling={false}>
                    {ARCH_MARK[a]}
                  </Ink>
                </View>
                <View style={{ flex: 1 }}>
                  <Ink size={16} weight="black">
                    {traduire(ARCHETYPE_META[a].label)}
                  </Ink>
                  <Ink size={13} color={P.ink2}>
                    {ARCH_DESC[a]}
                  </Ink>
                </View>
              </View>
            </Press>
          );
        })}
      </FormSheet>

      <FormSheet visible={lvlOpen} onClose={() => setLvlOpen(false)} title={traduire("Son niveau")}>
        {(Object.keys(EXPERIENCE_LEVEL_META) as ExperienceLevel[]).map((l) => {
          const on = p.experienceLevel === l;
          return (
            <Press
              key={l}
              onPress={() => {
                onChange({ experienceLevel: l });
                setLvlOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={LEVEL_LABEL[l]}
            >
              <View style={{ minHeight: 56, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                <Ink size={16} weight="extraBold" color={on ? P.white : P.ink}>
                  {LEVEL_LABEL[l]}
                </Ink>
              </View>
            </Press>
          );
        })}
      </FormSheet>
    </View>
  );
}

function Physical({ label, unit, value, onChange }: { label: string; unit: string; value?: number; onChange: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState(value != null ? String(value) : '');
  const delta = value ?? 0;
  const pct = (Math.min(Math.abs(delta), 30) / 30) * 100;
  const color = delta > 0 ? D : delta < 0 ? '#6E8C3A' : P.muted;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ink size={14} weight="bold">
          {label}
        </Ink>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onEndEditing={() => {
            const v = draft.trim().replace(',', '.');
            if (v === '' || v === '-' || v === '+') {
              onChange(undefined);
              setDraft('');
              return;
            }
            const n = Number(v);
            onChange(isNaN(n) ? undefined : n);
          }}
          keyboardType="numbers-and-punctuation"
          placeholder={traduire("écart en {0}", unit)}
          placeholderTextColor={P.muted}
          accessibilityLabel={traduire("Écart de {0} en {1}", label.toLowerCase(), unit)}
          style={{ minWidth: 110, height: 44, borderRadius: 12, borderWidth: 1, borderColor: P.line, backgroundColor: P.white, paddingHorizontal: 10, textAlign: 'right', fontSize: 15, fontWeight: '800', color }}
        />
      </View>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: P.line2 }}>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{delta < 0 ? <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#6E8C3A' }} /> : null}</View>
        <View style={{ width: 3, backgroundColor: P.ink }} />
        <View style={{ flex: 1 }}>{delta > 0 ? <View style={{ width: `${pct}%`, height: '100%', backgroundColor: D }} /> : null}</View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Ink size={11} weight="bold" color={P.muted}>
          {traduire("Avantage pour toi")}</Ink>
        <Ink size={11} weight="bold" color={P.muted}>
          {traduire("Avantage pour lui")}</Ink>
      </View>
    </View>
  );
}

