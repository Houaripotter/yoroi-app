/**
 * Briques de l'ecran Savoir : fiche en carte, liseuse en feuille du bas, protocoles a cocher,
 * echelle d'hydratation. Couleurs ramenees a la palette v2.
 */
import React, { useEffect, useState } from 'react';
import type { GlyphKind } from '@/components/yoroi/v2/ornements/Glyph';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Icon, P, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { Hanko } from '@/components/yoroi/v2/ornements/screens';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { CheckDot, InkBar, XIcon } from './ui';
import type { LabProtocol } from '@/data/labProtocols';
import { sentenceCase } from '@/lib/v2/competition/dates';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

/**
 * Vague 47 : couleurs des categories lues au moment du rendu (la palette P change avec le mode sombre ;
 * figees au chargement du fichier, les encadres restaient pastel clair en sombre).
 */
const neutreDoux = () => (paletteSombre() ? '#242935' : '#EEF0F7');
export function categories(): Record<string, { color: string; soft: string; glyph: GlyphKind }> {
  return {
    Cardio: { color: P.indigo, soft: P.indigoSoft, glyph: 'vague' },
    Endurance: { color: P.indigo, soft: P.indigoSoft, glyph: 'vague' },
    Nutrition: { color: P.mossText, soft: P.mossSoft, glyph: 'sakura' },
    Récupération: { color: P.indigo, soft: P.indigoSoft, glyph: 'sakura' },
    Métabolisme: { color: P.goldDark, soft: P.goldSoft, glyph: 'etoile' },
    Activité: { color: P.goldDark, soft: P.goldSoft, glyph: 'vague' },
    Force: { color: P.accent, soft: P.accentSoft, glyph: 'etoile' },
    Supplémentation: { color: P.mossText, soft: P.mossSoft, glyph: 'sakura' },
    Performance: { color: P.goldDark, soft: P.goldSoft, glyph: 'laurier' },
    Mobilité: { color: P.water, soft: P.indigoSoft, glyph: 'sakura' },
    Mental: { color: P.ink, soft: neutreDoux(), glyph: 'eventail' },
    Combat: { color: P.accent, soft: P.accentSoft, glyph: 'eventail' },
  };
}
export const catMeta = (c: string): { color: string; soft: string; glyph: GlyphKind } => categories()[c] ?? { color: P.ink2, soft: neutreDoux(), glyph: 'sakura' };

const diffCouleur = (d: string): string | undefined => ({ Débutant: P.mossText, Intermédiaire: P.goldDark, Avancé: P.accent } as Record<string, string>)[d];

/** Carte d'une fiche (article ou protocole) */
export function FicheCard({ title, category, read, difficulty, onOpen, onToggleRead }: { title: string; category: string; read: boolean; difficulty?: string; onOpen: () => void; onToggleRead: () => void }) {
  const m = catMeta(category);
  // audit 43 : la case « lue » n'est plus un bouton dans le bouton de la fiche : deux zones cote a cote,
  // et une coche indigo plutot que le tampon rouge (le rouge reste aux records)
  return (
    <View style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, flexDirection: 'row', overflow: 'hidden', minHeight: 92 }}>
      <View style={{ flex: 1 }}>
      <Press onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${title}, ${category}${read ? ', lue' : ''}`} style={{ flexDirection: 'row', minHeight: 92, flexGrow: 1 }}>
        <View style={{ width: 70, backgroundColor: m.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Glyph kind={m.glyph} size={34} color={m.color} />
        </View>
        <View style={{ flex: 1, padding: 14, paddingRight: 4, gap: 4, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ink size={12} weight="extraBold" color={m.color}>
              {category}
            </Ink>
            {difficulty ? (
              <Ink size={11} weight="bold" color={diffCouleur(difficulty) ?? P.muted}>
                {difficulty}
              </Ink>
            ) : null}
          </View>
          <Ink size={16} weight="black" tight color={read ? P.ink2 : P.ink}>
            {title}
          </Ink>
        </View>
      </Press>
      </View>
      <View style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}>
        <CheckDot on={read} onPress={onToggleRead} label={read ? traduire('Marquer comme non lue') : 'Marquer comme lue'} />
      </View>
    </View>
  );
}

function Block({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: color }} />
        <Ink size={13} weight="extraBold" color={color}>
          {label}
        </Ink>
      </View>
      {children}
    </View>
  );
}

const Body = ({ children }: { children: string }) => (
  <Ink size={16} weight="medium" color={P.ink} style={{ lineHeight: 25 }}>
    {children}
  </Ink>
);

export type ReaderContent =
  | { kind: 'article'; id: string; title: string; category: string; what: string; why: string; how: string; sourceName: string; sourceUrl: string }
  | { kind: 'protocol'; id: string; title: string; category: string; difficulty: string; objective: string; duration: string; protocol: string[]; frequency: string; notes: string };

/** Liseuse : la fiche en grand, bien espacee */
export function Reader({ content, read, onClose, onToggleRead, onSource }: { content: ReaderContent | null; read: boolean; onClose: () => void; onToggleRead: () => void; onSource: (url: string) => void }) {
  const m = content ? catMeta(content.category) : catMeta('');
  return (
    <Sheet visible={!!content} onClose={onClose} scroll>
      {content ? (
        <View style={{ gap: 18, paddingBottom: 8 }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Glyph kind={m.glyph} size={22} color={m.color} />
              </View>
              <Ink size={13} weight="extraBold" color={m.color} style={{ flex: 1 }}>
                {content.kind === 'protocol' ? `${content.category}, ${content.difficulty.toLowerCase()}` : content.category}
              </Ink>
              {read ? <Hanko size={36} /> : null}
            </View>
            <Ink size={26} weight="black" tight>
              {traduire(content.title)}
            </Ink>
          </View>
          {content.kind === 'article' ? (
            <>
              <Block label={traduire("C'est quoi")} color={m.color}>
                <Body>{content.what}</Body>
              </Block>
              <Block label={traduire("Pourquoi ça marche")} color={m.color}>
                <Body>{content.why}</Body>
              </Block>
              <Block label={traduire("Comment l'appliquer")} color={m.color}>
                <Body>{content.how}</Body>
              </Block>
              <Press onPress={() => onSource(content.sourceUrl)} accessibilityRole="link" accessibilityLabel={traduire("Ouvrir la source : {0}", content.sourceName)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: P.paper, padding: 14, minHeight: 56 }}>
                  <XIcon name="book" size={20} color={m.color} />
                  <Ink size={13} weight="bold" color={P.ink2} style={{ flex: 1 }}>
                    {content.sourceName}
                  </Ink>
                  <Icon name="share" size={18} color={P.muted} />
                </View>
              </Press>
            </>
          ) : (
            <>
              <Block label={traduire("Objectif")} color={m.color}>
                <Body>{content.objective}</Body>
              </Block>
              <Block label={traduire("Durée")} color={m.color}>
                <Body>{content.duration}</Body>
              </Block>
              <Block label={traduire("Le protocole")} color={m.color}>
                <View style={{ gap: 10 }}>
                  {content.protocol.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: m.soft, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={13} weight="black" color={m.color}>
                          {String(i + 1)}
                        </Ink>
                      </View>
                      <Ink size={15} weight="medium" style={{ flex: 1, lineHeight: 22 }}>
                        {s}
                      </Ink>
                    </View>
                  ))}
                </View>
              </Block>
              <Block label={traduire("Fréquence")} color={m.color}>
                <Body>{content.frequency}</Body>
              </Block>
              <View style={{ borderRadius: 18, backgroundColor: P.goldSoft, padding: 14 }}>
                <Ink size={14} weight="medium" color={P.ink} style={{ lineHeight: 21 }}>
                  {content.notes}
                </Ink>
              </View>
            </>
          )}
          <BigButton label={read ? traduire('Marquer comme non lue') : 'Marquer comme lue'} tone={read ? 'light' : 'ink'} icon="check" onPress={onToggleRead} />
        </View>
      ) : null}
    </Sheet>
  );
}

/** Protocole a cocher (meme stockage que l'ancien : protocol_<id>) */
export function ProtocolChecklist({ protocol }: { protocol: LabProtocol }) {
  const { id, items, references } = protocol;
  const [checked, setChecked] = useState<boolean[]>(new Array(items.length).fill(false));
  const [openRefs, setOpenRefs] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(`protocol_${id}`)
      .then((s) => {
        if (s) {
          const p = JSON.parse(s);
          if (Array.isArray(p)) setChecked(items.map((_, i) => !!p[i]));
        }
      })
      .catch((e) => logger.error('Erreur chargement progression protocole:', e));
  }, [id]);
  const toggle = async (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
    if (next.every(Boolean)) tap('success');
    try {
      await AsyncStorage.setItem(`protocol_${id}`, JSON.stringify(next));
    } catch (e) {
      logger.error('Erreur sauvegarde progression protocole:', e);
    }
  };
  const reset = async () => {
    setChecked(new Array(items.length).fill(false));
    try {
      await AsyncStorage.removeItem(`protocol_${id}`);
    } catch (e) {
      logger.error('Erreur reset progression protocole:', e);
    }
  };
  const done = checked.filter(Boolean).length;
  const all = done === items.length;
  const m = catMeta(sentenceCase(protocol.category) === 'Entraînement' ? 'Force' : sentenceCase(protocol.category));
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={12} weight="extraBold" color={m.color}>
            {sentenceCase(protocol.category)}
          </Ink>
          <Ink size={17} weight="black" tight>
            {sentenceCase(protocol.title)}
          </Ink>
        </View>
        {all ? <Hanko size={40} /> : (
          <Ink size={14} weight="black" color={P.ink2}>
            {traduire("{0} sur {1}", done, items.length)}
          </Ink>
        )}
      </View>
      <InkBar value={done / items.length} color={all ? P.accent : m.color} />
      <View>
        {items.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2, paddingVertical: 4 }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={14} weight="bold" color={checked[i] ? P.muted : P.ink} style={{ textDecorationLine: checked[i] ? 'line-through' : 'none' }}>
                {traduire(it.text)}
              </Ink>
              {it.source ? (
                <Ink size={11} weight="medium" color={P.muted}>
                  {`Source : ${it.source}`}
                </Ink>
              ) : null}
            </View>
            <CheckDot on={!!checked[i]} onPress={() => toggle(i)} label={traduire(it.text)} color={m.color} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {references.length ? (
          <Press onPress={() => setOpenRefs(!openRefs)} accessibilityRole="button" accessibilityLabel={openRefs ? traduire('Masquer les références') : traduire('Voir les références')} style={{ flex: 1 }}>
            <View style={{ minHeight: 44, borderRadius: 14, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={13} weight="extraBold" color={P.ink2}>
                {openRefs ? traduire('Masquer les références') : traduire("Références, {0}", references.length)}
              </Ink>
            </View>
          </Press>
        ) : null}
        {done > 0 ? (
          <Press onPress={reset} accessibilityRole="button" accessibilityLabel={traduire("Tout décocher")} style={{ flex: 1 }}>
            <View style={{ minHeight: 44, borderRadius: 14, backgroundColor: P.paper, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              <XIcon name="undo" size={16} color={P.ink2} />
              <Ink size={13} weight="extraBold" color={P.ink2}>
                {traduire("Tout décocher")}</Ink>
            </View>
          </Press>
        ) : null}
      </View>
      {openRefs
        ? references.map((r, i) => (
            <Ink key={i} size={12} weight="medium" color={P.ink2}>
              {`${i + 1}. ${r.author} (${r.year}). ${r.journal}.${r.doi ? ` DOI ${r.doi}` : ''}`}
            </Ink>
          ))
        : null}
    </Card>
  );
}

const HYDRATION = [
  { level: 1, color: '#F7F3E3', status: 'ok', label: traduire('Hydratation optimale'), advice: traduire('Jaune très pâle. État idéal, garde ce rythme.') },
  { level: 2, color: '#F5E6B3', status: 'ok', label: traduire('Bien hydraté'), advice: traduire('Jaune pâle. Hydratation correcte, continue ainsi.') },
  { level: 3, color: '#F0D870', status: 'ok', label: traduire('Hydratation normale'), advice: traduire('Jaune clair. Niveau acceptable, bois régulièrement.') },
  { level: 4, color: '#E8C547', status: 'warn', label: traduire('Début de déshydratation'), advice: traduire("Jaune foncé. Augmente l'apport en eau tout de suite.") },
  { level: 5, color: '#D4A520', status: 'warn', label: traduire('Déshydratation modérée'), advice: traduire("Jaune ambré. Bois 500 à 750 ml d'eau dans l'heure.") },
  { level: 6, color: '#B8860B', status: 'bad', label: traduire('Déshydratation sévère'), advice: traduire("Jaune brun foncé. Bois un litre d'eau peu à peu, avec des électrolytes.") },
  { level: 7, color: '#8B6914', status: 'bad', label: traduire('Déshydratation critique'), advice: traduire('Brun foncé. État dangereux, réhydratation urgente.') },
];

/** Echelle d'hydratation par la couleur des urines */
export function HydrationScale() {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Ink size={17} weight="black" tight>
          {traduire("Échelle d'hydratation")}</Ink>
        <Ink size={13} weight="medium" color={P.ink2}>
          {traduire("Regarde la couleur de tes urines pour estimer ton hydratation.")}</Ink>
      </View>
      <View style={{ flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden' }}>
        {HYDRATION.map((h) => (
          <View key={h.level} style={{ flex: 1, backgroundColor: h.color }} />
        ))}
      </View>
      {HYDRATION.map((h) => (
        <View key={h.level} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: h.color, borderWidth: 1, borderColor: P.line, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={13} weight="black" color={h.level > 4 ? P.white : P.ink}>
              {String(h.level)}
            </Ink>
          </View>
          <View style={{ flex: 1 }}>
            <Ink size={14} weight="extraBold" color={h.status === 'ok' ? P.mossText : h.status === 'warn' ? P.goldDark : P.danger}>
              {traduire(h.label)}
            </Ink>
            <Ink size={12} weight="medium" color={P.ink2}>
              {h.advice}
            </Ink>
          </View>
        </View>
      ))}
      <View style={{ borderRadius: 16, backgroundColor: P.paper, padding: 12, gap: 6 }}>
        <Ink size={13} weight="medium" color={P.ink} style={{ lineHeight: 19 }}>
          {traduire("Un jaune pâle (niveaux 1 à 3) indique une bonne hydratation. Au-delà du niveau 5, tes performances et ta concentration peuvent baisser.")}</Ink>
        <Ink size={11} weight="medium" color={P.muted}>
          {traduire("Armstrong et al. (1994). Urinary Indices of Hydration Status. Int J Sport Nutr 4(3) : 265 à 279. DOI 10.1123/ijsn.4.3.265")}</Ink>
      </View>
    </Card>
  );
}
