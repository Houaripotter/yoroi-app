/**
 * Bilan plein ecran (16 octobre 2026) : apres une pesee, une composition, des mensurations ou une seance,
 * une seule page qui raconte ce qui a bouge, ecrite a partir de tes vraies donnees (lib/v2/bilan/texte.ts).
 * En haut le chiffre et le verdict, puis le topo phrase par phrase, ce qui a bouge, ta tendance lissee,
 * ta composition, tes mensurations, ton objectif et ta ligne. En bas : Partager ma carte, Terminé.
 * Seance : BilanSeanceSections (le topo, tes compteurs, ton cœur, la comparaison, tes techniques).
 * 16 octobre (agent BILAN COULEURS) : le topo en couleur. Chaque phrase arrive en morceaux (lib/v2/bilan/texte.ts,
 * PhraseRiche) : chiffres cles en gras et dans la couleur du domaine (indigo seances, vert objectif atteint,
 * rouge seulement pour un record, violet le poids, ocre les mensurations), la phrase phare plus grande,
 * une petite icone en tete de ligne. Couleurs de components/yoroi/v2/accueil/domaines.ts, AA en clair et en sombre.
 * Le bouton du bas devient « Créer ma carte », plus visible.
 */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { StampButton } from '@/components/yoroi/v2/progres/ui';
import type { BilanCorps, BilanSeance, IconeBilan, LigneCompo, PeseeJ, PhraseRiche, RoleSegment } from '@/lib/v2/bilan/texte';
import { teinte } from '@/components/yoroi/v2/accueil/domaines';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import type { IconName } from '@/components/yoroi/v2/seance/Icon';
import { Hanko } from '@/components/yoroi/v2/seance/Hanko';
import { dateCourte, kg1, nb, signe } from '@/lib/v2/bilan/texte';

const GUT = 20;

function useC() {
  return useYoroiTheme().theme.colors;
}

function Carte({ children, gap = 10, tint }: { children: React.ReactNode; gap?: number; tint?: boolean }) {
  const c = useC();
  return <View style={{ borderRadius: 22, padding: 16, gap, backgroundColor: tint ? c.indigoTint : c.surface, borderWidth: tint ? 0 : 1, borderColor: c.border }}>{children}</View>;
}

function Titre({ children }: { children: string }) {
  const c = useC();
  return (
    <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }} accessibilityRole="header">
      {children}
    </Ink>
  );
}

type Ton = 'seance' | 'objectif' | 'record' | 'poids' | 'mesure' | 'neutre';

/** La couleur d'un morceau mis en avant */
export function couleurRole(c: ReturnType<typeof useC>, role: RoleSegment): string {
  switch (role) {
    case 'seance':
      return teinte('seances').texte;
    case 'objectif':
      return c.successText;
    case 'record':
      return c.record;
    case 'poids':
      return teinte('poids').texte;
    case 'mesure':
      return teinte('mensurations').texte;
    default:
      return c.ink;
  }
}

const ICONES: Record<IconeBilan, { nom: IconName | 'hanko'; ton: Ton }> = {
  compteur: { nom: 'calendar', ton: 'seance' },
  objectif: { nom: 'check', ton: 'objectif' },
  annee: { nom: 'route', ton: 'seance' },
  comparaison: { nom: 'swap', ton: 'seance' },
  ressenti: { nom: 'flame', ton: 'seance' },
  coeur: { nom: 'heart', ton: 'seance' },
  record: { nom: 'hanko', ton: 'record' },
  technique: { nom: 'bolt', ton: 'seance' },
  regularite: { nom: 'clock', ton: 'seance' },
  poids: { nom: 'check', ton: 'poids' },
  tendance: { nom: 'route', ton: 'poids' },
  composition: { nom: 'swap', ton: 'poids' },
  mesure: { nom: 'route', ton: 'mesure' },
  ligne: { nom: 'route', ton: 'objectif' },
  repas: { nom: 'flame', ton: 'neutre' },
  conseil: { nom: 'clock', ton: 'neutre' },
};

function PastilleIcone({ icone }: { icone: IconeBilan }) {
  const c = useC();
  const d = ICONES[icone];
  if (d.nom === 'hanko') {
    return (
      <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginTop: -1 }}>
        <Hanko size={24} rotate={-6} color={c.record} tampon="record" />
      </View>
    );
  }
  const t =
    d.ton === 'seance' ? teinte('seances') : d.ton === 'poids' ? teinte('poids') : d.ton === 'mesure' ? teinte('mensurations') : null;
  const fond = t ? t.fond : d.ton === 'objectif' ? c.successTint : c.fillSubtle;
  const trait = t ? t.texte : d.ton === 'objectif' ? c.successText : c.textSecondary;
  return (
    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: fond, alignItems: 'center', justifyContent: 'center', marginTop: -1 }}>
      <Icon name={d.nom} size={15} color={trait} strokeWidth={2.4} />
    </View>
  );
}

/** Une phrase en morceaux : les morceaux mis en avant en gras et en couleur */
export function PhraseVue({ p }: { p: PhraseRiche }) {
  const c = useC();
  const size = p.phare ? 19 : 16;
  const lh = p.phare ? 27 : 24;
  const texte = (
    <Ink size={size} weight={p.phare ? 'extraBold' : 'medium'} color={c.ink} style={{ lineHeight: lh, flex: p.icone && !p.phare ? 1 : undefined }}>
      {p.segments.map((sg, i) =>
        sg.role ? (
          <Ink key={i} size={size} weight="black" color={couleurRole(c, sg.role)} style={{ lineHeight: lh }}>
            {sg.texte}
          </Ink>
        ) : (
          <React.Fragment key={i}>{sg.texte}</React.Fragment>
        ),
      )}
    </Ink>
  );
  if (!p.icone || p.phare) return texte;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <PastilleIcone icone={p.icone} />
      {texte}
    </View>
  );
}

/** Le topo : une phrase par ligne, aere ; en couleur quand les morceaux sont la */
export function Topo({ phrases, riche }: { phrases: string[]; riche?: PhraseRiche[] }) {
  const c = useC();
  if (!phrases.length) return null;
  return (
    <Carte gap={14}>
      <Titre>Ton bilan</Titre>
      {riche && riche.length === phrases.length
        ? riche.map((p, i) => <PhraseVue key={i} p={p} />)
        : phrases.map((p, i) => (
            <Ink key={i} size={16} weight={i === 0 ? 'extraBold' : 'medium'} color={c.ink} style={{ lineHeight: 24 }}>
              {p}
            </Ink>
          ))}
    </Carte>
  );
}

/** Petite icone de partage (fleche qui sort d'une boite) */
export function IconePartage({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** « Créer ma carte » : le bouton secondaire bien visible, teinte indigo */
export function BoutonCarte({ onPress }: { onPress: () => void }) {
  const t = teinte('seances');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Créer ma carte"
      accessibilityHint="Une image de ce bilan, à partager ou à garder"
      style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: t.fond, borderWidth: 1.5, borderColor: t.texte, opacity: pressed ? 0.75 : 1 })}
    >
      <IconePartage color={t.texte} />
      <Ink size={16} weight="extraBold" color={t.texte}>Créer ma carte</Ink>
    </Pressable>
  );
}

/** Couleur d'un ecart : vert quand ca va dans ton sens, jamais de rouge (le rouge est reserve aux records) */
function couleurEcart(c: ReturnType<typeof useC>, bon: boolean | null, bruit: boolean) {
  if (bruit) return c.textSecondary;
  return bon === true ? c.successText : c.ink;
}

function Rangee({ label, sous, valeur, couleur, last }: { label: string; sous?: string | null; valeur: string; couleur: string; last?: boolean }) {
  const c = useC();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderColor: c.divider }}>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="bold">{label}</Ink>
        {sous ? <Ink size={12} color={c.textMuted}>{sous}</Ink> : null}
      </View>
      <Ink size={17} weight="black" color={couleur} style={{ fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 }}>{valeur}</Ink>
    </View>
  );
}

/** Petite courbe des 30 derniers jours : tes pesees en points, la tendance lissee en trait */
function MiniCourbe({ serie }: { serie: PeseeJ[] }) {
  const c = useC();
  if (serie.length < 3) return null;
  const W = 300;
  const H = 86;
  const vals = serie.flatMap((p) => [p.value, p.trend ?? p.value]);
  const min = Math.min(...vals) - 0.2;
  const max = Math.max(...vals) + 0.2;
  const t0 = new Date(`${serie[0].date}T12:00:00`).getTime();
  const t1 = new Date(`${serie[serie.length - 1].date}T12:00:00`).getTime();
  const x = (d: string) => (t1 === t0 ? W / 2 : 6 + ((new Date(`${d}T12:00:00`).getTime() - t0) / (t1 - t0)) * (W - 12));
  const y = (v: number) => 6 + (1 - (v - min) / (max - min || 1)) * (H - 12);
  const trend = serie.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.trend ?? p.value).toFixed(1)}`).join(' ');
  const last = serie[serie.length - 1];
  return (
    <View accessibilityLabel="Tes pesées des 30 derniers jours et ta tendance lissée" style={{ alignItems: 'center' }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {serie.map((p) => (
          <Circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.6} fill={c.textMuted} opacity={0.55} />
        ))}
        <Path d={trend} stroke={c.indigo} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={x(last.date)} cy={y(last.trend ?? last.value)} r={5} fill={c.indigo} stroke={c.background} strokeWidth={2} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
        <Ink size={11} weight="bold" color={c.textMuted}>{dateCourte(serie[0].date)}</Ink>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.textMuted }} />
            <Ink size={11} weight="bold" color={c.textMuted}>pesées</Ink>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: c.indigo }} />
            <Ink size={11} weight="bold" color={c.textMuted}>tendance</Ink>
          </View>
        </View>
        <Ink size={11} weight="bold" color={c.textMuted}>{dateCourte(last.date)}</Ink>
      </View>
    </View>
  );
}

function TuileCompo({ l }: { l: LigneCompo }) {
  const c = useC();
  return (
    <View style={{ flexGrow: 1, flexBasis: '30%', minWidth: 96, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: c.background, borderWidth: 1, borderColor: c.divider, gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{l.label}</Ink>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Ink size={22} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{l.valeur}</Ink>
        {l.unite ? <Ink size={12} weight="bold" color={c.textSecondary}>{l.unite}</Ink> : null}
      </View>
      {l.ecartTexte ? (
        <Ink size={12} weight="extraBold" color={couleurEcart(c, l.bon, l.bruit)} numberOfLines={1}>{l.ecartTexte}</Ink>
      ) : (
        <Ink size={12} color={c.textMuted}>première mesure</Ink>
      )}
    </View>
  );
}

function Pied({ onShare, onDone, partage }: { onShare?: () => void; onDone: () => void; partage: boolean }) {
  const c = useC();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUT, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.divider, flexDirection: 'row', gap: 10 }}>
      {partage && onShare ? <BoutonCarte onPress={onShare} /> : null}
      <View style={{ flex: 1 }}>
        <StampButton label="Terminé" onPress={onDone} />
      </View>
    </View>
  );
}

/** La jauge de l'ancienne fin de pesee : ton poids au centre d'un arc vers ton objectif */
const JW = 264;
const JR = 112;
const JS = 16;
function Jauge({ poids, pct, depart, cap, atteint }: { poids: number; pct: number; depart: number; cap: number; atteint: boolean }) {
  const c = useC();
  const cx = JW / 2;
  const cy = JR + JS / 2 + 2;
  const arc = `M ${cx - JR} ${cy} A ${JR} ${JR} 0 0 1 ${cx + JR} ${cy}`;
  const len = Math.PI * JR;
  const ang = Math.PI * (1 - pct);
  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${nb(poids)} kilos, ${atteint ? 'objectif atteint' : `${Math.round(pct * 100)} pour cent du chemin vers ton objectif`}`}>
      <View style={{ width: JW, height: cy + 8 }}>
        <Svg width={JW} height={cy + 8}>
          <Path d={arc} stroke={c.fillSubtle} strokeWidth={JS} strokeLinecap="round" fill="none" />
          {pct > 0.005 ? <Path d={arc} stroke={atteint ? c.successText : c.accent} strokeWidth={JS} strokeLinecap="round" fill="none" strokeDasharray={`${len * pct} ${len}`} /> : null}
          <Circle cx={cx + JR * Math.cos(ang)} cy={cy - JR * Math.sin(ang)} r={JS / 2 + 3} fill={c.background} stroke={atteint ? c.successText : c.accent} strokeWidth={3} />
        </Svg>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 4, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Ink size={56} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{kg1(poids)}</Ink>
            <Ink size={17} weight="bold" color={c.textSecondary}>kg</Ink>
          </View>
        </View>
      </View>
      <View style={{ width: JW + 16, flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Ink size={12} weight="bold" color={c.textMuted}>{`départ ${kg1(depart)}`}</Ink>
        <Ink size={12} weight="bold" color={c.textMuted}>{`objectif ${nb(cap)}`}</Ink>
      </View>
    </View>
  );
}

const tonCouleur = (c: ReturnType<typeof useC>, ton: 'vert' | 'bleu' | 'orange' | 'gris') => (ton === 'vert' ? c.successText : ton === 'bleu' ? c.indigo : ton === 'orange' ? c.accent : c.textSecondary);

/** Le bilan du corps, en page entiere */
export function BilanCorpsVue({ b, onDone, onShare, enTete }: { b: BilanCorps; onDone: () => void; onShare?: () => void; enTete?: string }) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const v = b.verdict;
  const mensurationsSeules = b.titre === 'Tes mensurations';
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: insets.bottom + 136, paddingHorizontal: GUT, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ENTREE} style={{ gap: 14 }}>
          <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.successTint, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.successText} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
              </View>
              <Ink size={13} weight="extraBold" color={c.successText}>{enTete ?? 'Enregistré'}</Ink>
            </View>
            <Ink size={30} weight="black" tight accessibilityRole="header">{b.titre}</Ink>
            <Ink size={14} weight="bold" color={c.textSecondary}>{b.sousTitre}</Ink>
          </View>

          {b.poids !== null && !mensurationsSeules ? (
            <View style={{ alignItems: 'center', paddingVertical: 6, gap: 6 }}>
              {b.objectif && b.objectif.pct !== null ? (
                <Jauge poids={b.poids} pct={b.objectif.pct} depart={b.objectif.depart} cap={b.objectif.cap} atteint={b.objectif.atteint} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Ink size={76} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{kg1(b.poids)}</Ink>
                  <Ink size={20} weight="bold" color={c.textSecondary}>kg</Ink>
                </View>
              )}
              {!b.peseeDuJour ? <Ink size={12} color={c.textMuted}>ta dernière pesée</Ink> : null}
              {v ? (
                <View style={{ alignItems: 'center', gap: 2, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16, backgroundColor: v.bon === true ? c.successTint : c.indigoTint }}>
                  <Ink size={17} weight="black" color={v.bon === true ? c.successText : c.indigo} style={{ textAlign: 'center' }}>{v.titre}</Ink>
                  <Ink size={13} weight="bold" color={c.textSecondary} style={{ textAlign: 'center' }}>{v.texte}</Ink>
                </View>
              ) : null}
            </View>
          ) : null}

          <Topo phrases={b.paragraphe} riche={b.riche} />

          {b.comparaisons.length && !mensurationsSeules ? (
            <Carte gap={0}>
              <Titre>Ton poids</Titre>
              <View style={{ height: 4 }} />
              {b.comparaisons.map((x, i) => (
                <Rangee
                  key={x.id}
                  label={x.label}
                  sous={x.bruit ? `depuis le ${dateCourte(x.depuis)}, dans la marge normale` : `depuis le ${dateCourte(x.depuis)}`}
                  valeur={`${signe(x.ecart)} kg`}
                  couleur={couleurEcart(c, x.bon, x.bruit)}
                  last={i === b.comparaisons.length - 1}
                />
              ))}
            </Carte>
          ) : null}

          {b.tendance && b.serie.length >= 3 ? (
            <Carte>
              <Titre>Ta tendance lissée</Titre>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Ink size={28} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{kg1(b.tendance.valeur)}</Ink>
                <Ink size={14} weight="bold" color={c.textSecondary}>kg</Ink>
                {b.tendance.parSemaine !== null ? (
                  <Ink size={14} weight="extraBold" color={c.indigo} style={{ marginLeft: 6 }}>
                    {Math.abs(b.tendance.parSemaine) < 0.1 ? 'stable' : `${signe(b.tendance.parSemaine)} kg par semaine`}
                  </Ink>
                ) : null}
              </View>
              <MiniCourbe serie={b.serie} />
              <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>Une moyenne qui gomme l’eau, le sel et les repas d’un jour à l’autre.</Ink>
            </Carte>
          ) : null}

          {b.compo ? (
            <Carte>
              <Titre>Ta composition</Titre>
              {b.compo.depuis ? <Ink size={13} color={c.textSecondary}>{`Écarts depuis ta mesure du ${dateCourte(b.compo.depuis)}`}</Ink> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {b.compo.lignes.map((l) => (
                  <TuileCompo key={l.id} l={l} />
                ))}
              </View>
              <Ink size={12} color={c.textMuted} style={{ lineHeight: 17 }}>En gris, l’écart reste dans la précision de ta balance. Une balance à impédance donne une estimation : compare des mesures prises dans les mêmes conditions.</Ink>
            </Carte>
          ) : null}

          {b.mesures && b.mesures.lignes.length ? (
            <Carte gap={0}>
              <Titre>Tes mensurations</Titre>
              <View style={{ height: 4 }} />
              {b.mesures.lignes.map((l, i) => (
                <Rangee
                  key={l.key}
                  label={l.label.charAt(0).toUpperCase() + l.label.slice(1)}
                  sous={l.ecart === null ? 'première mesure' : `${signe(l.ecart)} cm depuis le ${dateCourte(l.depuis as string)}${l.bruit ? ', stable' : ''}`}
                  valeur={`${nb(l.valeur)} cm`}
                  couleur={couleurEcart(c, l.bon, l.bruit)}
                  last={i === b.mesures!.lignes.length - 1}
                />
              ))}
            </Carte>
          ) : null}

          {b.objectif || b.ligne || b.prevision ? (
            <Carte tint>
              <Titre>Ton objectif</Titre>
              {b.objectif && b.objectif.pct !== null ? (
                <View style={{ gap: 6 }}>
                  <View style={{ height: 10, borderRadius: 5, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round(b.objectif.pct * 100)}%`, height: 10, borderRadius: 5, backgroundColor: b.objectif.atteint ? c.successText : c.indigo }} />
                  </View>
                  <Ink size={13} weight="extraBold" color={c.indigo}>{b.objectif.atteint ? 'Objectif atteint' : `${Math.round(b.objectif.pct * 100)} % du chemin`}</Ink>
                </View>
              ) : null}
              {b.ligne ? <Ink size={15} weight="extraBold" color={tonCouleur(c, b.ligne.ton)}>{b.ligne.texte}</Ink> : null}
              {b.prevision ? <Ink size={14} color={c.ink} style={{ lineHeight: 20 }}>{b.prevision}</Ink> : null}
            </Carte>
          ) : null}
        </Animated.View>
      </ScrollView>
      <Pied onShare={onShare} onDone={onDone} partage={!!b.carte} />
    </View>
  );
}

// ============================================
// SEANCE
// ============================================

export function BilanSeanceChiffres({ b }: { b: BilanSeance }) {
  const c = useC();
  if (!b.chiffres.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {b.chiffres.map((s) => (
        <View key={s.label} style={{ flexGrow: 1, flexBasis: '30%', minWidth: 96, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Ink size={26} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{s.value}</Ink>
            {s.unit ? <Ink size={12} weight="bold" color={c.textSecondary}>{s.unit}</Ink> : null}
          </View>
          <Ink size={12} weight="bold" color={c.textMuted}>{s.label}</Ink>
        </View>
      ))}
    </View>
  );
}

const ZONE_TEINTES = [0.25, 0.4, 0.58, 0.78, 1];

/** Le bilan d'une seance, sans l'en-tete (la fin de seance a deja le sien) */
export function BilanSeanceSections({ b }: { b: BilanSeance }) {
  const c = useC();
  return (
    <View style={{ gap: 12 }}>
      <Topo phrases={b.paragraphe} riche={b.riche} />

      <Carte>
        <Titre>Ton compteur</Titre>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {b.compteurs.map((k) => (
            <View key={k.label} style={{ flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 10, borderRadius: 16, backgroundColor: c.background, borderWidth: 1, borderColor: c.divider }}>
              <Ink size={26} weight="black" tight numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{k.value}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{k.label}</Ink>
            </View>
          ))}
        </View>
        {b.objectifSemaine ? <Ink size={14} weight="extraBold" color={b.objectifSemaine.fait >= b.objectifSemaine.total ? c.successText : c.textSecondary}>{b.objectifSemaine.texte}</Ink> : null}
        {b.annee ? (
          <View style={{ gap: 6 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, Math.round((b.annee.fait / b.annee.total) * 100))}%`, height: 8, borderRadius: 4, backgroundColor: c.indigo }} />
            </View>
            <Ink size={13} color={c.textSecondary}>{b.annee.texte}</Ink>
          </View>
        ) : null}
        {b.regularite ? <Ink size={13} color={c.textSecondary}>{b.regularite}</Ink> : null}
      </Carte>

      {b.coeur ? (
        <Carte>
          <Titre>Ton cœur</Titre>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            {b.coeur.fcMoy ? (
              <View>
                <Ink size={26} weight="black" tight>{String(b.coeur.fcMoy)}</Ink>
                <Ink size={12} weight="bold" color={c.textMuted}>bpm moyen</Ink>
              </View>
            ) : null}
            {b.coeur.fcMax ? (
              <View>
                <Ink size={26} weight="black" tight>{String(b.coeur.fcMax)}</Ink>
                <Ink size={12} weight="bold" color={c.textMuted}>bpm max</Ink>
              </View>
            ) : null}
            {b.intensite ? (
              <View>
                <Ink size={26} weight="black" tight>{`${b.intensite.valeur}/10`}</Ink>
                <Ink size={12} weight="bold" color={c.textMuted}>{b.intensite.mot}</Ink>
              </View>
            ) : null}
          </View>
          {b.coeur.zones ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: c.fillSubtle }}>
                {b.coeur.zones.map((z) => (z.part > 0 ? <View key={z.zone} style={{ flex: z.part, backgroundColor: c.indigo, opacity: ZONE_TEINTES[z.zone - 1] }} /> : null))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {b.coeur.zones.map((z) => (
                  <Ink key={z.zone} size={11} weight="bold" color={c.textMuted}>{`Z${z.zone} ${Math.round(z.part * 100)} %`}</Ink>
                ))}
              </View>
            </View>
          ) : null}
        </Carte>
      ) : b.intensite ? (
        <Carte>
          <Titre>Ton ressenti</Titre>
          <Ink size={22} weight="black">{`${b.intensite.valeur}/10, ${b.intensite.mot}`}</Ink>
        </Carte>
      ) : null}

      {b.comparaison && b.comparaison.lignes.length ? (
        <Carte gap={0}>
          <Titre>{`Par rapport au ${dateCourte(b.comparaison.depuis)}`}</Titre>
          <View style={{ height: 4 }} />
          {b.comparaison.lignes.map((l, i) => (
            <View key={l} style={{ paddingVertical: 10, borderBottomWidth: i === b.comparaison!.lignes.length - 1 ? 0 : 1, borderColor: c.divider }}>
              <Ink size={15} weight="bold">{l}</Ink>
            </View>
          ))}
        </Carte>
      ) : null}

      {b.techniques.length ? (
        <Carte>
          <Titre>{b.techniquesTitre ?? 'Techniques'}</Titre>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {b.techniques.map((t) => (
              <View key={t} style={{ paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', borderRadius: 17, backgroundColor: c.indigoTint }}>
                <Ink size={14} weight="extraBold" color={c.indigo}>{t}</Ink>
              </View>
            ))}
          </View>
        </Carte>
      ) : null}
    </View>
  );
}

/** Le bilan d'une seance en page entiere (detail d'une seance, montre) */
export function BilanSeanceVue({ b, onDone, onShare, records }: { b: BilanSeance; onDone: () => void; onShare?: () => void; records?: React.ReactNode }) {
  const c = useC();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: insets.bottom + 136, paddingHorizontal: GUT, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ENTREE} style={{ gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Ink size={14} weight="bold" color={c.textSecondary}>{b.sousTitre}</Ink>
            <Ink size={30} weight="black" tight accessibilityRole="header">{b.titre}</Ink>
          </View>
          <BilanSeanceChiffres b={b} />
          {records}
          <BilanSeanceSections b={b} />
        </Animated.View>
      </ScrollView>
      <Pied onShare={onShare} onDone={onDone} partage={!!b.carte} />
    </View>
  );
}
