/**
 * Onglet des objectifs dates (competition, poids, examen, voyage, personnalise) :
 * compte a rebours en direct, sablier en plaques, epingle, atteint (tampon), suppression, ajout guide.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { GlyphKind } from '@/components/yoroi/v2/ornements/Glyph';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { DeviceEventEmitter, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, Icon, KozaneBar, P, Press, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { EmptyState, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Chip, ChipScroll, DateField, Field, Label, XIcon } from './ui';
import { SPORTS } from '@/lib/sports';
import type { Objective } from '@/lib/database.native';
import { addObjective, checkExpiredObjectives, completeObjective, deleteObjective, getActiveObjectives, getCompletedObjectives, getCountdownInfo, getTypeConfig, OBJECTIVE_TYPES, togglePinObjective } from '@/lib/objectivesService';
import type { CountdownInfo, ObjectiveType } from '@/lib/objectivesService';
import { addDays, isoLocal, mediumDate, parseLocalDate, startOfToday } from '@/lib/v2/competition/dates';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

export const TYPE_V2: Record<ObjectiveType, { label: string; glyph: GlyphKind; color: string; soft: string; text: string }> = {
  competition: { label: 'Compétition', glyph: 'eventail', color: P.accent, soft: P.accentSoft, text: 'Un tournoi, un championnat' },
  weight: { label: 'Objectif de poids', glyph: 'etoile', color: P.indigo, soft: P.indigoSoft, text: 'Un poids à atteindre' },
  exam: { label: 'Examen', glyph: 'laurier', color: P.goldDark, soft: P.goldSoft, text: 'Un passage de grade' },
  travel: { label: 'Voyage ou stage', glyph: 'vague', color: P.mossText, soft: P.mossSoft, text: 'Un camp, un séjour' },
  custom: { label: 'Personnalisé', glyph: 'sakura', color: P.ink, soft: P.paper, text: 'Ce que tu veux' },
};

const pad = (n: number) => String(n).padStart(2, '0');

function Countdown({ c, color }: { c: CountdownInfo; color: string }) {
  if (c.isExpired) {
    return (
      <Ink size={28} weight="black" tight color={P.ink2}>
        Terminé
      </Ink>
    );
  }
  const frac = c.hours + c.minutes + c.seconds > 0;
  const days = frac ? c.daysRemaining - 1 : c.daysRemaining;
  const blocks = days > 0 ? [[String(days), days > 1 ? 'jours' : 'jour'], [pad(c.hours), 'h'], [pad(c.minutes), 'min']] : [[pad(c.hours), 'h'], [pad(c.minutes), 'min'], [pad(c.seconds), 's']];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
      {blocks.map(([v, u], i) => (
        <View key={u} style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Ink size={i === 0 ? 52 : 30} weight="black" tight color={i === 0 ? color : P.ink}>
            {v}
          </Ink>
          <Ink size={13} weight="extraBold" color={P.muted}>
            {` ${u}`}
          </Ink>
        </View>
      ))}
    </View>
  );
}

export function ObjectivesTab() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [completed, setCompleted] = useState<Objective[]>([]);
  const [now, setNow] = useState(Date.now());
  const [showDone, setShowDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ObjectiveType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(addDays(startOfToday(), 30));
  const [sportId, setSportId] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [location, setLocation] = useState('');

  const load = useCallback(async () => {
    try {
      await checkExpiredObjectives();
      const [a, c] = await Promise.all([getActiveObjectives(), getCompletedObjectives()]);
      setObjectives(a);
      setCompleted(c);
    } catch (error) {
      logger.error('Erreur chargement objectifs:', error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (objectives.length === 0) return;
      const t = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(t);
    }, [objectives.length]),
  );

  const reset = () => {
    setOpen(false);
    setType(null);
    setTitle('');
    setDescription('');
    setDate(addDays(startOfToday(), 30));
    setSportId('');
    setTargetWeight('');
    setLocation('');
  };

  const add = async () => {
    if (!type || !title.trim()) return;
    try {
      await addObjective({
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        target_date: isoLocal(date),
        created_date: isoLocal(startOfToday()),
        sport_id: sportId || undefined,
        target_weight: targetWeight ? parseFloat(targetWeight.replace(',', '.')) : undefined,
        location: location.trim() || undefined,
        color: getTypeConfig(type).defaultColor,
        completed_at: undefined,
      });
      tap('success');
      reset();
      await load();
    } catch (error) {
      appAlert('Ajout impossible', "L'objectif n'a pas pu être ajouté. Réessaie.");
    }
  };

  const remove = (o: Objective) => {
    appAlert('Supprimer', `Supprimer « ${o.title} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteObjective(o.id!);
          await load();
        },
      },
    ]);
  };

  const complete = async (o: Objective) => {
    tap('success');
    await completeObjective(o.id!);
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    await load();
  };

  const pin = async (o: Objective) => {
    tap();
    await togglePinObjective(o.id!, !o.is_pinned);
    await load();
  };

  void now;
  const main = objectives[0] ?? null;
  const mainC = main ? getCountdownInfo(main) : null;
  const mainT = main ? TYPE_V2[main.type] : null;
  const combatSports = SPORTS.filter((s) => ['combat_grappling', 'combat_striking'].includes(s.category));

  return (
    <View style={{ gap: 14 }}>
      {main && mainC && mainT ? (
        <Enter i={0}>
          <Glass style={{ gap: 12, overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ position: 'absolute', right: -10, top: -18 }}>
              <Glyph kind={mainT.glyph} size={120} color="#F1EEE8" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 9, backgroundColor: mainT.color, justifyContent: 'center' }}>
                <Ink size={12} weight="extraBold" color={P.white}>
                  {mainT.label}
                </Ink>
              </View>
              {main.is_pinned ? <XIcon name="pin" size={16} color={P.accent} /> : null}
            </View>
            <Ink size={24} weight="black" tight numberOfLines={2}>
              {main.title}
            </Ink>
            <Countdown c={mainC} color={mainT.color} />
            {main.location ? (
              <Ink size={13} weight="bold" color={P.ink2}>
                {main.location}
              </Ink>
            ) : null}
            <KozaneBar progress={mainC.progress} count={10} w={24} h={30} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Ink size={12} weight="bold" color={P.muted}>
                {`${mainC.daysElapsed} jours passés`}
              </Ink>
              <Ink size={12} weight="extraBold" color={mainT.color}>
                {`${mainC.daysRemaining} jours restants`}
              </Ink>
            </View>
          </Glass>
        </Enter>
      ) : null}

      {objectives.length > 0 ? (
        <Enter i={1} style={{ gap: 10 }}>
          <SectionTitle>{`Objectifs en cours, ${objectives.length}`}</SectionTitle>
          {objectives.map((o) => {
            const t = TYPE_V2[o.type];
            const c = getCountdownInfo(o);
            return (
              <Card key={o.id} style={{ gap: 10, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph kind={t.glyph} size={24} color={t.color} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Ink size={16} weight="black" tight numberOfLines={1}>
                      {o.title}
                    </Ink>
                    <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1}>
                      {[mediumDate(parseLocalDate(o.target_date)), o.location, o.target_weight ? `${String(o.target_weight).replace('.', ',')} kg` : null].filter(Boolean).join(', ')}
                    </Ink>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Ink size={22} weight="black" tight color={t.color}>
                      {String(c.daysRemaining)}
                    </Ink>
                    <Ink size={11} weight="bold" color={P.muted}>
                      jours
                    </Ink>
                  </View>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: P.line, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, c.progress * 100)}%`, height: 8, borderRadius: 4, backgroundColor: t.color }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Press onPress={() => pin(o)} accessibilityRole="button" accessibilityLabel={o.is_pinned ? 'Désépingler' : 'Épingler en premier'} style={{ flex: 1 }}>
                    <View style={{ minHeight: 44, borderRadius: 14, backgroundColor: o.is_pinned ? P.accentSoft : P.paper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <XIcon name="pin" size={16} color={o.is_pinned ? P.accent : P.ink2} />
                      <Ink size={13} weight="extraBold" color={o.is_pinned ? P.accent : P.ink2}>
                        {o.is_pinned ? 'Épinglé' : 'Épingler'}
                      </Ink>
                    </View>
                  </Press>
                  <Press onPress={() => complete(o)} accessibilityRole="button" accessibilityLabel={`Marquer ${o.title} comme atteint`} style={{ flex: 1.3 }}>
                    <View style={{ minHeight: 44, borderRadius: 14, backgroundColor: P.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon name="check" size={16} color={P.white} width={3} />
                      <Ink size={13} weight="extraBold" color={P.white}>
                        Atteint
                      </Ink>
                    </View>
                  </Press>
                  <Press onPress={() => remove(o)} accessibilityRole="button" accessibilityLabel={`Supprimer ${o.title}`}>
                    <View style={{ width: 44, minHeight: 44, borderRadius: 14, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="trash" size={17} color={P.muted} />
                    </View>
                  </Press>
                </View>
              </Card>
            );
          })}
        </Enter>
      ) : (
        <EmptyState title="Aucun objectif daté" text="Fixe une date : une compétition, un poids, un passage de grade. Tu verras chaque jour qui t'en sépare." action="Ajouter un objectif" onAction={() => setOpen(true)} />
      )}

      {objectives.length > 0 ? <BigButton label="Ajouter un objectif" icon="plus" onPress={() => setOpen(true)} /> : null}

      {completed.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Press onPress={() => setShowDone(!showDone)} accessibilityRole="button" accessibilityLabel={showDone ? 'Masquer les objectifs terminés' : 'Voir les objectifs terminés'}>
            <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <Ink size={19} weight="black" tight>
                {`Terminés ou passés, ${completed.length}`}
              </Ink>
              <View style={{ transform: [{ rotate: showDone ? '-90deg' : '90deg' }] }}>
                <Icon name="chevron" size={18} color={P.muted} />
              </View>
            </View>
          </Press>
          {showDone
            ? completed.map((o, i) => {
                const ok = o.status === 'completed';
                return (
                  <Card key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                    {ok ? <Hanko size={40} rotate={i % 2 ? 6 : -8} /> : (
                      <View style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: P.line, alignItems: 'center', justifyContent: 'center' }}>
                        <Glyph kind="vague" size={20} color={P.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Ink size={15} weight="extraBold" color={ok ? P.ink : P.ink2} numberOfLines={1}>
                        {o.title}
                      </Ink>
                      <Ink size={12} weight="bold" color={ok ? P.accent : P.muted}>
                        {`${ok ? 'Atteint' : 'Date passée'}, ${mediumDate(parseLocalDate(o.target_date))}`}
                      </Ink>
                    </View>
                    <Press onPress={() => remove(o)} accessibilityRole="button" accessibilityLabel={`Supprimer ${o.title}`}>
                      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="trash" size={17} color={P.muted} />
                      </View>
                    </Press>
                  </Card>
                );
              })
            : null}
        </View>
      ) : null}

      <Sheet visible={open} onClose={reset} title={type ? TYPE_V2[type].label : "Type d'objectif"} scroll>
        {!type ? (
          <View style={{ gap: 8 }}>
            {OBJECTIVE_TYPES.map((o) => {
              const t = TYPE_V2[o.type];
              return (
                <Press key={o.type} onPress={() => setType(o.type)} accessibilityRole="button" accessibilityLabel={t.label}>
                  <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}>
                      <Glyph kind={t.glyph} size={22} color={t.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Ink size={16} weight="extraBold">
                        {t.label}
                      </Ink>
                      <Ink size={12} weight="bold" color={P.muted}>
                        {t.text}
                      </Ink>
                    </View>
                    <Icon name="chevron" size={18} color={P.muted} />
                  </View>
                </Press>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Field value={title} onChangeText={setTitle} placeholder={type === 'competition' ? 'Ex : Championnat de France' : type === 'weight' ? 'Ex : Atteindre 75 kg' : "Titre de l'objectif"} icon="flag" maxLength={80} />
            <DateField label="Date visée" value={date} onChange={setDate} minimumDate={addDays(startOfToday(), 1)} />
            {type === 'competition' || type === 'exam' ? (
              <View style={{ gap: 8 }}>
                <Label>Sport</Label>
                <ChipScroll>
                  {combatSports.map((s) => (
                    <Chip key={s.id} label={s.name} active={sportId === s.id} onPress={() => setSportId(sportId === s.id ? '' : s.id)} />
                  ))}
                </ChipScroll>
              </View>
            ) : null}
            {type === 'competition' || type === 'travel' ? <Field label="Lieu" value={location} onChangeText={setLocation} placeholder={type === 'travel' ? 'Ex : Tokyo, Japon' : 'Ville, pays'} icon="flag" maxLength={80} /> : null}
            {type === 'weight' ? <Field label="Poids visé" value={targetWeight} onChangeText={setTargetWeight} placeholder="Ex : 75" keyboardType="decimal-pad" suffix="kg" icon="scale" /> : null}
            <Field label="Notes" value={description} onChangeText={setDescription} placeholder="Détails, motivation" multiline maxLength={300} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <BigButton label="Retour" tone="light" onPress={() => setType(null)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <BigButton label="Ajouter" icon="check" onPress={add} disabled={!title.trim()} />
              </View>
            </View>
          </View>
        )}
      </Sheet>
    </View>
  );
}
