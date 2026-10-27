/**
 * Formulaire de competition (ajout et modification) : nom, date, lieu, sport, categorie de poids,
 * ceinture, jour de la pesee, site officiel, type et rappels.
 * La categorie conseillee est calculee depuis ta derniere pesee.
 */
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Switch, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Card, Icon, P, Press } from '@/components/yoroi/v2/accueil/kit';
import { Chip, ChipScroll, DateField, Field, Label } from './ui';
import { findWeightCategory, getWeightCategories, SPORT_LABELS } from '@/lib/fighterMode';
import type { Sport, WeightCategory } from '@/lib/fighterMode';
import { formatKg } from '@/lib/v2/weightStats';
import { getSportName } from '@/lib/sports';
import { sportArt } from '@/lib/v2/seances/illustrations';
import type { Gender } from '@/lib/v2/competition/athlete';
import { BELTS } from '@/lib/v2/combat/rounds';
import type { PeseeMoment } from '@/lib/v2/competition/extras';
import { traduire } from '@/lib/i18n/tr';

export const TYPE_SUGGESTIONS = ['Combat', 'Match', 'Course', 'Compétition', 'Tournoi', 'Championnat'];

export const ALL_SPORTS: Sport[] = ['jjb', 'mma', 'boxe', 'muay_thai', 'judo', 'karate', 'taekwondo', 'tennis', 'football', 'basket', 'handball', 'trail', 'running', 'cyclisme', 'natation', 'rugby', 'volleyball', 'escalade', 'crossfit', 'hyrox', 'musculation', 'autre'];

export type CompetitionDraft = {
  nom: string;
  lieu: string;
  typeEvenement: string;
  date: Date;
  sport: Sport;
  categorieId: string;
  ceinture: string;
  url: string;
  pesee: PeseeMoment | '';
  rappels: boolean;
};

/** Ceintures proposees selon le sport (aucune pour les sports sans grade) */
const BELTS_BY_SPORT: Partial<Record<Sport, string[]>> = {
  jjb: ['blanche', 'bleue', 'violette', 'marron', 'noire'],
  judo: ['blanche', 'jaune', 'orange', 'verte', 'bleue', 'marron', 'noire'],
  karate: ['blanche', 'jaune', 'orange', 'verte', 'bleue', 'marron', 'noire'],
  taekwondo: ['blanche', 'jaune', 'verte', 'bleue', 'rouge', 'noire'],
};
export function beltsFor(sport: Sport) {
  const keys = BELTS_BY_SPORT[sport] ?? [];
  return BELTS.filter((b) => keys.includes(b.key));
}
export function beltLabel(key?: string): string {
  return BELTS.find((b) => b.key === key)?.label ?? '';
}

/** Nom du sport : celui de l'app (getSportName), sinon le libelle de la fiche competition */
export function competitionSportName(s: Sport): string {
  const n = getSportName(s);
  return n === 'Autre' && s !== 'autre' ? SPORT_LABELS[s] : n;
}

/** Categorie choisie ; pour le JJB, le genre donne la liste IBJJF hommes ou femmes */
export function selectedCategory(d: CompetitionDraft, gender?: Gender): WeightCategory | undefined {
  return getWeightCategories(d.sport, gender).find((c) => c.id === d.categorieId);
}

export function CompetitionForm({ draft, onChange, lastWeight, gender, minimumDate }: { draft: CompetitionDraft; onChange: (d: CompetitionDraft) => void; lastWeight?: number | null; gender: Gender; minimumDate?: Date }) {
  const [sportOpen, setSportOpen] = useState(false);
  const isCustomType = !!draft.typeEvenement && !TYPE_SUGGESTIONS.includes(draft.typeEvenement);
  const [customOpen, setCustomOpen] = useState(isCustomType);
  const set = (p: Partial<CompetitionDraft>) => onChange({ ...draft, ...p });
  const categories = useMemo(() => getWeightCategories(draft.sport, gender), [draft.sport, gender]);
  const advised = lastWeight ? findWeightCategory(draft.sport, lastWeight, gender) : null;

  return (
    <View style={{ gap: 18 }}>
      <Field label={traduire("Nom de la compétition")} value={draft.nom} onChangeText={(nom) => set({ nom })} placeholder={traduire("Ex : Open de Paris")} icon="trophy" maxLength={100} />
      <DateField label="Date" value={draft.date} onChange={(date) => set({ date })} minimumDate={minimumDate} />
      <Field label={traduire("Lieu")} value={draft.lieu} onChangeText={(lieu) => set({ lieu })} placeholder={traduire("Ex : Paris, France")} icon="flag" maxLength={100} />

      <View style={{ gap: 6 }}>
        <Label>{traduire("Sport")}</Label>
        <Press onPress={() => setSportOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Sport : {0}. Changer", competitionSportName(draft.sport))}>
          <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 76, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingLeft: 8, paddingRight: 16, overflow: 'hidden' }}>
            <Image source={sportArt(draft.sport, gender, 1)} style={{ width: 64, height: 84, marginBottom: -14 }} resizeMode="contain" />
            <View style={{ flex: 1, paddingLeft: 6 }}>
              <Ink size={17} weight="black" tight numberOfLines={2}>
                {competitionSportName(draft.sport)}
              </Ink>
              <Ink size={12} weight="bold" color={P.muted}>
                {traduire("Appuie pour changer")}</Ink>
            </View>
            <Icon name="chevron" size={18} color={P.muted} />
          </View>
        </Press>
      </View>

      {categories.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Label>{traduire("Catégorie de poids")}</Label>
          {draft.sport === 'jjb' ? (
            <Ink size={13} color={P.muted} style={{ paddingHorizontal: 4 }}>
              {traduire("Les catégories de poids du JJB gardent leurs noms portugais, de Galo, la plus légère, à Pesadíssimo, sans limite. Choisis celle dont le maximum couvre ton poids le jour de la pesée.")}</Ink>
          ) : null}
          {advised && lastWeight ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: P.goldSoft, borderColor: P.goldLight }}>
              <Icon name="scale" size={20} color={P.goldDark} />
              <Ink size={13} weight="bold" color={P.ink} style={{ flex: 1 }}>
                {traduire("Ta dernière pesée : {0} kg. Catégorie qui te correspond : {1}.", formatKg(lastWeight), advised.name)}
              </Ink>
              {draft.categorieId !== advised.id ? (
                <Press onPress={() => set({ categorieId: advised.id })} accessibilityRole="button" accessibilityLabel={traduire("Choisir {0}", advised.name)}>
                  <View style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: P.primary, justifyContent: 'center' }}>
                    <Ink size={13} weight="extraBold" color={P.onPrimary}>
                      {traduire("Choisir")}</Ink>
                  </View>
                </Press>
              ) : null}
            </Card>
          ) : null}
          <ChipScroll>
            {categories.map((cat) => (
              <Chip key={cat.id} label={traduire(cat.name)} sub={cat.open ? traduire('toutes catégories') : cat.maxWeight >= 900 ? traduire('sans limite') : `${formatKg(cat.maxWeight)} kg max`} active={draft.categorieId === cat.id} accent={P.accent} onPress={() => set({ categorieId: draft.categorieId === cat.id ? '' : cat.id })} />
            ))}
          </ChipScroll>
        </View>
      ) : null}

      {beltsFor(draft.sport).length ? (
        <View style={{ gap: 8 }}>
          <Label>{traduire("Ta ceinture")}</Label>
          <ChipScroll>
            {beltsFor(draft.sport).map((b) => (
              <Chip key={b.key} label={traduire(b.label)} active={draft.ceinture === b.key} accent={P.accent} onPress={() => set({ ceinture: draft.ceinture === b.key ? '' : b.key })} />
            ))}
          </ChipScroll>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Label>{traduire("Pesée officielle")}</Label>
        <ChipScroll>
          {([['veille', 'La veille'], ['jour', 'Le jour même']] as const).map(([k, l]) => (
            <Chip key={k} label={l} active={draft.pesee === k} accent={P.accent} onPress={() => set({ pesee: draft.pesee === k ? '' : k })} />
          ))}
        </ChipScroll>
      </View>

      <Field label={traduire("Site de l’événement")} value={draft.url} onChangeText={(url) => set({ url })} placeholder={traduire("Ex : www.exemple.fr")} icon="flag" keyboardType="url" maxLength={300} />

      <View style={{ gap: 8 }}>
        <Label>{traduire("Type d’événement")}</Label>
        <ChipScroll>
          {TYPE_SUGGESTIONS.map((s) => (
            <Chip key={s} label={traduire(s)} active={!customOpen && draft.typeEvenement === s} onPress={() => { setCustomOpen(false); set({ typeEvenement: draft.typeEvenement === s ? '' : s }); }} />
          ))}
          <Chip label="Autre" active={customOpen} onPress={() => { setCustomOpen(!customOpen); if (!customOpen && TYPE_SUGGESTIONS.includes(draft.typeEvenement)) set({ typeEvenement: '' }); }} />
        </ChipScroll>
        {customOpen ? (
          <Field label={traduire("Ton type d’événement")} value={draft.typeEvenement} onChangeText={(typeEvenement) => set({ typeEvenement })} placeholder={traduire("Ex : Open, Interclubs")} icon="star" maxLength={50} />
        ) : null}
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={21} color={P.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold">{traduire("Me rappeler la compétition")}</Ink>
          <Ink size={12} weight="bold" color={P.ink2}>{traduire("Un mois avant, une semaine avant, la veille et le jour de la pesée")}</Ink>
        </View>
        <Switch value={draft.rappels} onValueChange={(rappels) => set({ rappels })} trackColor={{ true: P.accent, false: P.line }} thumbColor={P.white} accessibilityLabel={traduire("Me rappeler la compétition")} />
      </Card>

      <Sheet visible={sportOpen} onClose={() => setSportOpen(false)} title={traduire("Ton sport")} scroll>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALL_SPORTS.map((s) => (
            <Chip
              key={s}
              label={competitionSportName(s)}
              active={draft.sport === s}
              onPress={() => {
                set({ sport: s, categorieId: s === draft.sport ? draft.categorieId : '' });
                setSportOpen(false);
              }}
            />
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}
