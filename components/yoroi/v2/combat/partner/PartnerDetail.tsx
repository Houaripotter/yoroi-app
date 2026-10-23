/**
 * Fiche partenaire v2 (carnet tactique) : carte de guerrier, quatre onglets
 * (fiche, bilan, profil, carnet), briefing plein ecran, note rapide.
 * Toutes les modifications sont enregistrees automatiquement.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ink } from '@/components/yoroi/v2/Ink';
import { logger } from '@/lib/security/logger';
import { exportPartnerPDF } from '@/lib/partnerPdfService';
import { usePremium } from '@/context/PremiumContext';
import { checkAndUnlockPartnerBadges } from '@/lib/partnerBadgesService';
import { BELTS, makeId, shortDate } from '@/lib/v2/combat/rounds';
import { upsertPartner } from '@/lib/v2/combat/partners';
import type { Partner, SessionEntry, TacticalNote } from '@/lib/v2/combat/partners';
import { analyzePartner } from '@/lib/v2/combat/partnerInsights';
import { BigButton, Card, Chip, CIcon, D, Field, FormSheet, IconBtn, N, P, Press, Section, sportLabel, TagEditor, tap, V } from '../ui';
import { ActiveGoal, Arsenal, GamePlanFlash, LongTermGoal, MissionCard, Patterns, Predictor, Progression, RatingCard, SessionHistory, StreaksAndBadges, TaleOfTape, Timeline, WarriorCard, YearTrend, ZoneMap } from './sections';
import { FighterProfile } from './FighterProfile';
import { AudioNotes, FaceoffShare, MediaGallery } from './MediaAudio';
import { Briefing } from './Briefing';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { traduire } from '@/lib/i18n/tr';

type Tab = 'fiche' | 'bilan' | 'profil' | 'carnet';
const TABS: { key: Tab; label: string }[] = [
  { key: 'fiche', label: 'Fiche' },
  { key: 'bilan', label: 'Bilan' },
  { key: 'profil', label: traduire('Profil') },
  { key: 'carnet', label: 'Carnet' },
];
const SPORTS = ['JJB', 'No-gi', 'MMA', 'Grappling', 'Lutte', 'Judo', 'Boxe', 'Kick-boxing', 'Muay-thaï'];

async function saveImagePermanently(tempUri: string): Promise<string> {
  try {
    const ext = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const dest = `${FileSystem.documentDirectory}sparring_photo_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch (e) {
    logger.warn('Copie de la photo partenaire impossible', e);
    return tempUri;
  }
}

export function PartnerDetail({ partner, entries, loaded, onClose, onDeleted }: { partner: Partner; entries: SessionEntry[]; loaded: boolean; onClose: () => void; onDeleted: (id: string) => void }) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<Partner>(partner);
  const [tab, setTab] = useState<Tab>('fiche');
  const [briefing, setBriefing] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(p);

  useEffect(() => {
    latest.current = partner;
    setP(partner);
  }, [partner.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    upsertPartner(latest.current).catch((e) => logger.warn('Enregistrement du partenaire impossible', e));
  }, []);

  useEffect(() => () => {
    if (timer.current) flush();
  }, [flush]);

  const update = useCallback((patch: Partial<Partner>, now = false) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setP(next);
    if (timer.current) clearTimeout(timer.current);
    if (now) flush();
    else timer.current = setTimeout(flush, 600);
  }, [flush]);

  const ins = useMemo(() => analyzePartner(p, entries), [p, entries]);

  // Sceaux du partenaire : verifies a chaque chargement de l'historique
  useEffect(() => {
    if (!loaded) return;
    checkAndUnlockPartnerBadges(p.id, {
      wins: ins.wins,
      losses: ins.losses,
      draws: ins.draws,
      total: ins.total,
      streakWins: ins.streaks.longestWinStreak,
      streakNoTap: ins.streaks.longestNoTapStreak,
      roundsWithPartner: ins.total,
      weeksInARow: ins.weeksInARow,
    })
      .then((fresh) => {
        if (fresh.length > 0) {
          const prev = latest.current;
          const merged = { ...prev, unlockedBadges: [...(prev.unlockedBadges ?? []), ...fresh.filter((b) => !(prev.unlockedBadges ?? []).some((x) => x.id === b.id))] };
          latest.current = merged;
          setP(merged);
          tap('success');
        }
      })
      .catch(() => {});
  }, [loaded, ins.wins, ins.losses, ins.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      let res: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          appAlert(traduire('Caméra non autorisée'), traduire("Autorise la caméra pour Yoroi dans les réglages de ton téléphone."));
          return;
        }
        res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1], selectionLimit: 1 });
      }
      if (!res.canceled && res.assets?.[0]?.uri) {
        const uri = await saveImagePermanently(res.assets[0].uri);
        update({ photoUri: uri }, true);
        tap('medium');
      }
    } catch (e) {
      logger.error('Choix de photo impossible', e);
    }
  };
  const choosePhoto = () => {
    appAlert(traduire("Photo de {0}", p.name), traduire('Choisis une source'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Caméra'), onPress: () => pickPhoto('camera') },
      { text: 'Galerie', onPress: () => pickPhoto('library') },
      ...(p.photoUri ? [{ text: traduire('Retirer la photo'), style: 'destructive' as const, onPress: () => update({ photoUri: undefined }, true) }] : []),
    ]);
  };

  const addNote = (content: string) => {
    const note: TacticalNote = { id: makeId(), date: new Date().toISOString(), content };
    update({ notes: [note, ...p.notes] }, true);
    tap('success');
  };

  const confirmDelete = () => {
    appAlert(traduire("Supprimer {0} ?", p.name), traduire('Sa fiche, ses notes et ses médias seront effacés. Tes séances restent intactes.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          onDeleted(p.id);
        },
      },
    ]);
  };

  const newSession = () => router.push('/seance/combat' as any);
  const openPlan = () => router.push(`/game-plan?partnerName=${encodeURIComponent(p.name)}` as any);
  const shareDuel = () => router.push(`/social-share/duel-card?partnerName=${encodeURIComponent(p.name)}&partnerBelt=${encodeURIComponent(p.belt ?? '')}` as any);
  const back = () => {
    flush();
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -6, minHeight: 44 }}>
          <IconBtn icon="back" label={traduire("Retour à la liste")} onPress={back} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconBtn icon="target" label={traduire("Plan de jeu contre lui")} onPress={openPlan} />
            <IconBtn icon="share" label={traduire("Partager la carte duel")} onPress={shareDuel} />
            <IconBtn icon="trash" label={traduire("Supprimer {0}", p.name)} onPress={confirmDelete} />
          </View>
        </View>

        <WarriorCard p={p} ins={ins} onPhoto={choosePhoto} />

        <Press onPress={() => setBriefing(true)} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Ouvrir le briefing avant le combat")}>
          <View style={{ height: 60, borderRadius: 20, backgroundColor: P.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: P.accent, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
            <CIcon name="flag" size={20} color={P.white} />
            <Ink size={17} weight="extraBold" color={P.white}>
              {traduire("Briefing avant le combat")}</Ink>
          </View>
        </Press>

        <View style={{ flexDirection: 'row', backgroundColor: '#E6E4DD', borderRadius: 18, padding: 4 }}>
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <Press key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1 }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
                <View style={{ height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.white : 'transparent' }}>
                  <Ink size={14} weight={on ? 'black' : 'bold'} color={on ? P.ink : P.ink2}>
                    {t.label}
                  </Ink>
                </View>
              </Press>
            );
          })}
        </View>

        {tab === 'fiche' ? (
          <>
            <Predictor ins={ins} />
            <GamePlanFlash p={p} ins={ins} onOpenPlan={openPlan} />
            <ActiveGoal
              p={p}
              onSet={(text) => update({ activeGoal: { text, createdAt: new Date().toISOString() } }, true)}
              onAchieved={() => {
                const done: TacticalNote = { id: makeId(), date: new Date().toISOString(), content: traduire("Objectif atteint : {0}", p.activeGoal?.text ?? '') };
                update({ activeGoal: undefined, notes: [done, ...p.notes] }, true);
                tap('success');
              }}
            />
            <MissionCard partnerId={p.id} entries={entries} />
            <StreaksAndBadges ins={ins} p={p} />
            <LongTermGoal
              p={p}
              winRate={ins.winRate}
              onSet={(g) => update({ longTermGoal: { ...g, createdAt: new Date().toISOString() } }, true)}
              onClear={() => {
                update({ longTermGoal: undefined }, true);
                tap('success');
              }}
            />
          </>
        ) : null}

        {tab === 'bilan' ? (
          <>
            {!loaded ? (
              <Card>
                <Ink size={14} color={P.ink2}>
                  {traduire("Lecture de tes rounds")}</Ink>
              </Card>
            ) : null}
            <Timeline ins={ins} name={p.name} />
            <TaleOfTape ins={ins} name={p.name} />
            <Progression ins={ins} />
            <YearTrend ins={ins} />
            <Arsenal ins={ins} name={p.name} />
            <ZoneMap ins={ins} />
            <RatingCard ins={ins} />
            <Patterns ins={ins} />
            <Section title={traduire("Historique des séances")} sub={entries.length > 0 ? traduire("{0} séances avec lui", entries.length) : undefined} />
            <SessionHistory entries={entries} name={p.name} onNew={newSession} />
          </>
        ) : null}

        {tab === 'profil' ? (
          <>
            <Card style={{ gap: 12 }}>
              <Ink size={18} weight="black" tight>
                {traduire("Identité")}</Ink>
              <Ink size={13} weight="bold" color={P.ink2}>
                {traduire("Ceinture")}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {BELTS.map((b) => {
                  const on = (p.belt ?? '').toLowerCase() === b.key;
                  return (
                    <Press key={b.key} onPress={() => update({ belt: on ? undefined : b.key })} accessibilityRole="button" accessibilityLabel={traduire("Ceinture {0}", b.label)} accessibilityState={{ selected: on }}>
                      <View style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                        <View style={{ width: 22, height: 9, borderRadius: 3, backgroundColor: b.color, borderWidth: 1, borderColor: b.edge }} />
                        <Ink size={14} weight="bold" color={on ? P.white : P.ink2}>
                          {b.label}
                        </Ink>
                      </View>
                    </Press>
                  );
                })}
              </View>
              <Ink size={13} weight="bold" color={P.ink2}>
                Sport
              </Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SPORTS.map((s) => (
                  <Chip key={s} label={sportLabel(s)} on={(p.sport ?? '').toLowerCase() === s.toLowerCase()} onPress={() => update({ sport: (p.sport ?? '').toLowerCase() === s.toLowerCase() ? undefined : s })} />
                ))}
              </View>
              <Field label={traduire("Catégorie de poids")} defaultValue={p.weight ?? ''} onEndEditing={(e) => update({ weight: e.nativeEvent.text.trim() || undefined })} placeholder={traduire("Moins de 77 kg, lourds")} />
            </Card>
            <Card style={{ gap: 10 }}>
              <Ink size={18} weight="black" tight>
                Ses points forts
              </Ink>
              <Ink size={13} color={P.ink2}>
                {traduire("Ce dont tu dois te méfier")}</Ink>
              <TagEditor items={p.strengths} color={D} onChange={(next) => update({ strengths: next })} />
            </Card>
            <Card style={{ gap: 10 }}>
              <Ink size={18} weight="black" tight>
                Ses points faibles
              </Ink>
              <Ink size={13} color={P.ink2}>
                {traduire("Tes ouvertures")}</Ink>
              <TagEditor items={p.weaknesses} color={N} onChange={(next) => update({ weaknesses: next })} />
            </Card>
            <Card style={{ gap: 10 }}>
              <Ink size={18} weight="black" tight>
                {traduire("Ce qui marche contre lui")}</Ink>
              <TagEditor items={p.whatWorks} color={V} onChange={(next) => update({ whatWorks: next })} />
            </Card>
            <Section title="Carte combattant" />
            <FighterProfile p={p} ins={ins} onChange={(patch) => update(patch)} />
          </>
        ) : null}

        {tab === 'carnet' ? (
          <>
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Ink size={18} weight="black" tight>
                  Notes tactiques
                </Ink>
                <IconBtn icon="plus" label={traduire("Ajouter une note")} tone="ink" onPress={() => { setNoteDraft(''); setNoteOpen(true); }} />
              </View>
              {p.notes.length === 0 ? (
                <Ink size={14} color={P.muted}>
                  {traduire("Aucune note pour l'instant. Écris ce que tu as vu pendant que c'est frais.")}</Ink>
              ) : (
                p.notes.map((n) => (
                  <View key={n.id} style={{ padding: 12, borderRadius: 16, backgroundColor: P.paper, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Ink size={12} weight="bold" color={P.muted}>
                        {shortDate(n.date, true)}
                      </Ink>
                      <IconBtn
                        icon="trash"
                        size={36}
                        label={traduire("Supprimer la note")}
                        onPress={() =>
                          appAlert(traduire('Supprimer cette note ?'), undefined, [
                            { text: traduire('Annuler'), style: 'cancel' },
                            { text: traduire('Supprimer'), style: 'destructive', onPress: () => update({ notes: p.notes.filter((x) => x.id !== n.id) }, true) },
                          ])
                        }
                      />
                    </View>
                    <Ink size={15}>{n.content}</Ink>
                  </View>
                ))
              )}
            </Card>
            <AudioNotes notes={p.audioNotes ?? []} onChange={(n) => update({ audioNotes: n }, true)} />
            <MediaGallery media={p.media ?? []} onChange={(m) => update({ media: m }, true)} />
            <FaceoffShare p={p} wins={ins.wins} losses={ins.losses} draws={ins.draws} />
            <Press
              onPress={async () => {
                // Le bilan PDF reste Premium
                if (!isPremium) {
                  ouvrirPaywall('partenaire_pdf');
                  return;
                }
                flush();
                await exportPartnerPDF(p.id, { wins: ins.wins, losses: ins.losses, draws: ins.draws, total: ins.total });
              }}
              accessibilityRole="button"
              accessibilityLabel={traduire("Exporter la fiche en PDF")}
            >
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: P.indigoSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <CIcon name="file" size={22} color={P.indigo} />
                </View>
                <View style={{ flex: 1 }}>
                  <Ink size={16} weight="black">
                    {traduire("Exporter la fiche en PDF")}</Ink>
                  <Ink size={13} color={P.ink2}>
                    {traduire("Envoie tout à ton coach en un geste")}</Ink>
                </View>
                <CIcon name="chevron" size={16} color={P.muted} />
              </Card>
            </Press>
          </>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', right: 16, bottom: insets.bottom + 18 }}>
        <Press onPress={() => { setNoteDraft(''); setNoteOpen(true); }} haptic="medium" accessibilityRole="button" accessibilityLabel="Note rapide">
          <View style={{ width: 60, height: 60, borderRadius: 22, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center', shadowColor: P.ink, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
            <CIcon name="edit" size={24} color={P.white} />
          </View>
        </Press>
      </View>

      <FormSheet visible={noteOpen} onClose={() => setNoteOpen(false)} title={traduire("Note sur {0}", p.name)} sub={traduire("Tape ou dicte avec le micro du clavier, pendant que c'est frais.")}>
        <Field value={noteDraft} onChangeText={setNoteDraft} multiline autoFocus placeholder={traduire("Qu'est-ce qui s'est passé contre {0} aujourd'hui ?", p.name)} />
        <BigButton
          label={traduire("Enregistrer la note")}
          onPress={() => {
            if (!noteDraft.trim()) return;
            addNote(noteDraft.trim());
            setNoteDraft('');
            setNoteOpen(false);
          }}
        />
      </FormSheet>

      <Briefing visible={briefing} onClose={() => setBriefing(false)} p={p} ins={ins} />
    </View>
  );
}
