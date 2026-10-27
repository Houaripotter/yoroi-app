/**
 * Pieces de l'onglet Sparring v2 : podium, ligne de partenaire, fiche detaillee d'un partenaire,
 * edition du nom et de la photo, objectif de rounds par semaine.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { getSportName } from '@/lib/sports';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import type { PartnerStats } from '@/lib/v2/carnet/sparring';
import { longDate, relative, shortDate } from '@/lib/v2/carnet/format';
import { P, Press, CIcon, Avatar, BigButton, Field, ResultDot, BrushBar, IconBtn, winColor } from '../ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export function levelTone(r: number): string {
  if (r <= 3) return P.mossText;
  if (r <= 6) return P.goldDark;
  if (r <= 8) return P.accent;
  return P.ink;
}

/** Podium des 3 premiers partenaires (2e, 1er, 3e) */
export function Podium({ partners, photos, metric, onSelect }: { partners: PartnerStats[]; photos: Record<string, string>; metric: (p: PartnerStats) => string; onSelect: (p: PartnerStats) => void }) {
  const order = [partners[1], partners[0], partners[2]];
  const heights = [84, 112, 64];
  const tones = ['#A7A9B0', P.gold, '#B07A45'];
  const ranks = ['2', '1', '3'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      {order.map((p, i) =>
        p ? (
          <View key={p.name} style={{ flex: 1 }}>
            <Press onPress={() => onSelect(p)} accessibilityRole="button" accessibilityLabel={`${p.name}, place ${ranks[i]}`}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Avatar name={p.name} uri={photos[p.name.trim().toLowerCase()]} size={i === 1 ? 58 : 48} ring={tones[i]} />
                <Ink size={13} weight="extraBold" numberOfLines={1} style={{ textAlign: 'center' }}>{traduire(p.name)}</Ink>
                <Ink size={11} weight="bold" color={P.ink2} numberOfLines={1}>{metric(p)}</Ink>
                <View style={{ alignSelf: 'stretch', height: heights[i], borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: i === 1 ? P.ink : '#EEF0F7', alignItems: 'center', paddingTop: 10, borderTopWidth: 4, borderTopColor: tones[i] }}>
                  <Ink size={26} weight="black" color={i === 1 ? P.goldLight : P.ink2}>{ranks[i]}</Ink>
                </View>
              </View>
            </Press>
          </View>
        ) : (
          <View key={`vide-${i}`} style={{ flex: 1 }} />
        ),
      )}
    </View>
  );
}

/** Ligne de partenaire : photo ou initiales, rounds, bilan, niveau percu, acces a la fiche */
export function PartnerRow({ p, top, photo, hasFiche, maxRounds, onOpen, onEdit, onPhoto }: { p: PartnerStats; top: boolean; photo?: string; hasFiche: boolean; maxRounds: number; onOpen: () => void; onEdit: () => void; onPhoto: () => void }) {
  const router = useRouter();
  const decided = p.wins + p.losses;
  const wr = decided > 0 ? Math.round((p.wins / decided) * 100) : null;
  let diff = 0;
  if (p.ratingHistory && p.ratingHistory.length >= 2) diff = p.ratingHistory[p.ratingHistory.length - 1].rating - p.ratingHistory[0].rating;
  return (
    <Press onPress={onOpen} onLongPress={onEdit} delayLongPress={450} accessibilityRole="button" accessibilityLabel={traduire("{0}, {1} rounds", p.name, p.totalRounds)} accessibilityHint={traduire("Garde appuyé pour modifier le nom ou la photo")}>
      <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 22, backgroundColor: P.white, borderWidth: top ? 1.5 : 1, borderColor: top ? P.gold : P.line2 }}>
        <Press onPress={onPhoto} accessibilityRole="button" accessibilityLabel={traduire("Photo de {0}", p.name)}>
          <Avatar name={p.name} uri={photo} size={50} ring={top ? P.gold : undefined} />
        </Press>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ink size={16} weight="extraBold" numberOfLines={1} style={{ flex: 1 }}>{traduire(p.name)}</Ink>
            {wr !== null ? <Ink size={14} weight="black" color={winColor(wr)}>{`${wr} %`}</Ink> : null}
            <Ink size={13} weight="bold" color={P.ink2}>{traduirePluriel(p.totalRounds, p.totalRounds > 1, "{0} round", "{0} rounds", p.totalRounds)}</Ink>
          </View>
          <BrushBar value={p.totalRounds / Math.max(1, maxRounds)} color={P.ink} height={7} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {p.wins > 0 ? <Tag text={`${p.wins} V`} color={P.mossText} /> : null}
            {p.losses > 0 ? <Tag text={`${p.losses} D`} color={P.danger} /> : null}
            {p.draws > 0 ? <Tag text={`${p.draws} N`} color={P.goldDark} /> : null}
            {p.submissionsGiven > 0 ? <Tag text={traduire("{0} soumissions données", p.submissionsGiven)} color={P.mossText} /> : null}
            {p.submissionsTaken > 0 ? <Tag text={`${p.submissionsTaken} subies`} color={P.danger} /> : null}
            {p.avgRating != null ? <Tag text={traduire("niveau {0} sur 10{1}", String(p.avgRating).replace('.', DECIMAL), diff > 0 ? `, +${diff}` : diff < 0 ? `, ${diff}` : '')} color={levelTone(p.avgRating)} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {p.lastSession ? <Ink size={12} weight="bold" color={P.muted}>{`Dernier sparring ${relative(p.lastSession)}`}</Ink> : <View />}
            <Press onPress={() => router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any)} accessibilityRole="button" accessibilityLabel={hasFiche ? traduire("Voir la fiche de {0}", p.name) : traduire("Créer la fiche de {0}", p.name)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: hasFiche ? P.indigoSoft : P.accentSoft }}>
                <CIcon name={hasFiche ? 'note' : 'plus'} size={13} color={hasFiche ? P.indigo : P.accent} />
                <Ink size={12} weight="extraBold" color={hasFiche ? P.indigo : P.accent}>{hasFiche ? traduire('Voir la fiche') : traduire('Créer la fiche')}</Ink>
              </View>
            </Press>
          </View>
        </View>
      </View>
    </Press>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 8, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: '#F5F6FB' }}>
      <Ink size={11} weight="extraBold" color={color}>{text}</Ink>
    </View>
  );
}

/** Fiche detaillee d'un partenaire */
export function PartnerSheet({ partner, onClose }: { partner: PartnerStats | null; onClose: () => void }) {
  const router = useRouter();
  if (!partner) return null;
  const decided = partner.wins + partner.losses;
  const wr = decided > 0 ? Math.round((partner.wins / decided) * 100) : null;
  const subs: Record<string, { name: string; given: number; taken: number }> = {};
  const add = (raw: string, win: boolean) => {
    const d = getMethodDisplayName(raw.trim());
    const k = d.toLowerCase();
    if (!subs[k]) subs[k] = { name: d, given: 0, taken: 0 };
    if (win) subs[k].given++;
    else subs[k].taken++;
  };
  for (const s of partner.sessions) {
    for (const r of s.rounds) {
      const win = r.result === 'win';
      const loss = r.result === 'loss';
      if (r.method?.trim()) add(r.method, win);
      if (win) r.methodsGiven?.forEach((m) => add(m, true));
      if (loss) r.methodsTaken?.forEach((m) => add(m, false));
    }
  }
  const topSubs = Object.values(subs).sort((a, b) => b.given + b.taken - (a.given + a.taken)).slice(0, 5);
  // navigation directe : l'ecran s'ouvre sous la feuille, sans attente
  const go = (path: string) => {
    router.push(path as any);
    onClose();
  };
  const hist = partner.ratingHistory ?? [];
  const diff = hist.length >= 2 ? hist[hist.length - 1].rating - hist[0].rating : 0;

  return (
    <Sheet visible onClose={onClose} scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={partner.name} size={56} />
        <View style={{ flex: 1 }}>
          <Ink size={24} weight="black" tight numberOfLines={1}>{traduire(partner.name)}</Ink>
          <Ink size={13} weight="bold" color={P.ink2}>{traduirePluriel(partner.sessions.length, partner.sessions.length > 1, "{0} séance ensemble", "{0} séances ensemble", partner.sessions.length)}</Ink>
        </View>
        <IconBtn name="close" label={traduire("Fermer")} onPress={onClose} tone="soft" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><BigButton label={traduire("Partager le duel")} tone="light" icon="share" onPress={() => go(`/social-share/duel-card?partnerName=${encodeURIComponent(partner.name)}`)} /></View>
        <View style={{ flex: 1 }}><BigButton label={traduire("Profil tactique")} tone="ink" onPress={() => go(`/sparring-partners?partnerName=${encodeURIComponent(partner.name)}`)} /></View>
      </View>
      <View style={{ flexDirection: 'row', borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingVertical: 12 }}>
        {[
          { v: String(partner.totalRounds), l: 'rounds', c: P.ink },
          { v: String(partner.wins), l: 'victoires', c: P.mossText },
          { v: String(partner.losses), l: traduire('défaites'), c: P.danger },
          ...(wr !== null ? [{ v: `${wr} %`, l: 'taux', c: winColor(wr) }] : []),
          ...(partner.avgRating != null ? [{ v: String(partner.avgRating).replace('.', DECIMAL), l: 'niveau', c: levelTone(partner.avgRating) }] : []),
        ].map((x) => (
          <View key={x.l} style={{ flex: 1, alignItems: 'center' }}>
            <Ink size={20} weight="black" tight color={x.c}>{x.v}</Ink>
            <Ink size={11} weight="bold" color={P.ink2}>{x.l}</Ink>
          </View>
        ))}
      </View>
      {hist.length >= 2 ? (
        <View style={{ gap: 8 }}>
          <Ink size={14} weight="bold" color={P.ink2}>{traduire("Niveau perçu, round après round")}</Ink>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 70 }}>
            {hist.slice(-16).map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <Ink size={10} weight="bold" color={P.muted}>{String(h.rating)}</Ink>
                <View style={{ width: '100%', height: (h.rating / 10) * 46, borderRadius: 5, backgroundColor: levelTone(h.rating) }} />
              </View>
            ))}
          </View>
          <Ink size={13} weight="extraBold" color={diff > 0 ? P.accent : diff < 0 ? P.mossText : P.ink2}>
            {diff > 0 ? traduire("Il te paraît plus fort de {0} points qu’au début.", diff) : diff < 0 ? traduire("Tu progresses : il te paraît {0} points moins dur.", Math.abs(diff)) : traduire('Niveau stable.')}
          </Ink>
        </View>
      ) : null}
      {topSubs.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Ink size={14} weight="bold" color={P.ink2}>{traduire("Finitions entre vous")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {topSubs.map((s) => (
              <View key={s.name} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: s.given > s.taken ? P.mossSoft : s.taken > s.given ? P.dangerSoft : '#F5F6FB' }}>
                <Ink size={13} weight="extraBold">{traduire(s.name)}</Ink>
                <Ink size={11} weight="bold" color={P.ink2}>{[s.given > 0 ? `${s.given} donnée${s.given > 1 ? 's' : ''}` : '', s.taken > 0 ? `${s.taken} subie${s.taken > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ')}</Ink>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Ink size={14} weight="bold" color={P.ink2}>{traduire("Historique")}</Ink>
      {partner.sessions.map((s, si) => (
        <View key={`${s.date}-${si}`} style={{ gap: 8, padding: 12, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Ink size={13} weight="extraBold" color={P.indigo}>{longDate(s.date)}</Ink>
            <Ink size={12} weight="bold" color={P.muted}>{getSportName(s.sport)}</Ink>
          </View>
          {s.technicalTheme ? <Ink size={13} weight="bold" color={P.goldDark}>{s.technicalTheme}</Ink> : null}
          {s.rounds.map((r, ri) => {
            const given = r.methodsGiven?.length ? r.methodsGiven : r.method && r.result === 'win' ? [r.method] : [];
            const taken = r.methodsTaken?.length ? r.methodsTaken : r.method && r.result === 'loss' ? [r.method] : [];
            return (
              <View key={ri} style={{ gap: 4, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: r.result === 'win' ? P.moss : r.result === 'loss' ? P.danger : P.gold }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ResultDot result={r.result ?? null} size={22} />
                  <Ink size={13} weight="bold">{traduire("Round {0}", r.number ?? ri + 1)}</Ink>
                  {r.partnerRating != null ? <Ink size={12} weight="extraBold" color={levelTone(r.partnerRating)}>{traduire("niveau {0} sur 10", r.partnerRating)}</Ink> : null}
                </View>
                {given.length > 0 ? <Ink size={12} weight="bold" color={P.mossText}>{traduire("Données : {0}", given.map((m) => getMethodDisplayName(m)).join(', '))}</Ink> : null}
                {taken.length > 0 ? <Ink size={12} weight="bold" color={P.danger}>{traduire("Subies : {0}", taken.map((m) => getMethodDisplayName(m)).join(', '))}</Ink> : null}
                {r.notes?.trim() ? <Ink size={12} weight="medium" color={P.ink2} numberOfLines={3}>{r.notes}</Ink> : null}
              </View>
            );
          })}
        </View>
      ))}
      <Ink size={11} weight="medium" color={P.muted} style={{ textAlign: 'center' }}>{partner.lastSession ? traduire("Dernier sparring le {0}", shortDate(partner.lastSession)) : ''}</Ink>
    </Sheet>
  );
}

/** Edition du nom et de la photo d'un partenaire */
export function EditPartnerSheet({ name, onClose, editName, setEditName, editPhoto, onPickPhoto, onRemovePhoto, saving, onSave, onDelete }: { name: string | null; onClose: () => void; editName: string; setEditName: (v: string) => void; editPhoto: string | null; onPickPhoto: () => void; onRemovePhoto: () => void; saving: boolean; onSave: () => void; onDelete: () => void }) {
  return (
    <Sheet visible={name !== null} onClose={onClose} title={traduire("Modifier le partenaire")} scroll>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Press onPress={onPickPhoto} accessibilityRole="button" accessibilityLabel={traduire("Choisir une photo")}>
          <Avatar name={editName || name || '?'} uri={editPhoto ?? undefined} size={92} ring={P.gold} />
        </Press>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Press onPress={onPickPhoto} accessibilityRole="button" accessibilityLabel={editPhoto ? traduire('Changer la photo') : traduire('Ajouter une photo')}>
            <View style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: '#EEF0F7' }}>
              <Ink size={13} weight="extraBold">{editPhoto ? traduire('Changer la photo') : traduire('Ajouter une photo')}</Ink>
            </View>
          </Press>
          {editPhoto ? (
            <Press onPress={onRemovePhoto} accessibilityRole="button" accessibilityLabel={traduire("Retirer la photo")}>
              <View style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: P.dangerSoft }}>
                <Ink size={13} weight="extraBold" color={P.danger}>{traduire("Retirer")}</Ink>
              </View>
            </Press>
          ) : null}
        </View>
      </View>
      <Field label={traduire("Nom")} value={editName} onChangeText={setEditName} placeholder={traduire("Nom du partenaire")} maxLength={40} />
      <Ink size={12} weight="medium" color={P.muted}>{traduire("Changer le nom met à jour tout l’historique de vos rounds.")}</Ink>
      <BigButton label={saving ? 'Enregistrement...' : traduire('Enregistrer')} icon="check" disabled={saving || !editName.trim()} onPress={onSave} />
      <BigButton
        label={traduire("Supprimer la fiche")}
        tone="light"
        icon="trash"
        onPress={() =>
          appAlert(traduire('Supprimer la fiche ?'), traduire("La fiche de {0} sera supprimée. Son historique de combats est conservé.", name), [
            { text: traduire('Annuler'), style: 'cancel' },
            { text: traduire('Supprimer'), style: 'destructive', onPress: onDelete },
          ])
        }
      />
    </Sheet>
  );
}

/** Objectif de rounds par semaine */
export function GoalSheet({ visible, value, onChange, onSave, onClose }: { visible: boolean; value: number; onChange: (v: number) => void; onSave: () => void; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire("Objectif de la semaine")}>
      <Ink size={14} weight="medium" color={P.ink2}>{traduire("Combien de rounds de sparring veux-tu faire chaque semaine ?")}</Ink>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Stepper value={value} step={1} min={1} max={100} onChange={onChange} unit={traduire('rounds')} size={44} format={(v) => traduire("{0} rounds", v)} />
      </View>
      <BigButton label={traduire("Valider")} icon="check" onPress={onSave} />
    </Sheet>
  );
}
