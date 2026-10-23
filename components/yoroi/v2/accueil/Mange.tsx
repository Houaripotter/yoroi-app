/**
 * « Mangé aujourd'hui » sur l'accueil (16 octobre 2026, agent MANGÉ). Une ligne discrète, seulement quand ton app
 * de repas (MyFitnessPal, Cronometer, Lifesum, MacroFactor...) a écrit des repas du jour dans Apple Santé ou
 * Health Connect. Aucune saisie de repas, aucun objectif de calories, aucun rouge, aucun jugement.
 * Un toucher ouvre le détail du jour : calories, protéines, glucides, lipides, les 7 derniers jours en barres,
 * et d'où viennent les chiffres. Données et doublons : lib/v2/nutrition/mange.ts.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { aideActivation, ligneMange, mentionSource, milliers } from '@/lib/v2/nutrition/mange';
import type { JourRepas, ResumeRepas } from '@/lib/v2/nutrition/mange';
import { Card, Icon, P, Press, useAccent } from './kit';
import { carteNeutre } from './domaines';
import { traduire } from '@/lib/i18n/tr';

const JOURS_COURTS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const jourCourt = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return JOURS_COURTS[new Date(y, m - 1, d, 12).getDay()];
};

/** Un bol, trait simple */
function Bol({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      <Path d="M9 7.5c0-1.4 1-1.6 1-3M13.5 7.5c0-1.4 1-1.6 1-3" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** La ligne de l'accueil. Rien du tout sans repas du jour. */
export function BlocMange({ resume }: { resume: ResumeRepas | null }) {
  const [open, setOpen] = useState(false);
  const { accent, accentTint } = useAccent();
  const j = resume?.aujourdhui;
  if (!resume || !j) return null;
  const texte = ligneMange(j);
  if (!texte) return null;
  return (
    <>
      <Press onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Mangé aujourd’hui : {0}, {1}. Ouvrir le détail", texte, mentionSource(resume))}>
        <Card style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }, carteNeutre()]}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: accentTint, alignItems: 'center', justifyContent: 'center' }}>
            <Bol color={accent} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={14.5} weight="extraBold" numberOfLines={2}>
              {traduire("Mangé aujourd’hui : {0}", texte)}
            </Ink>
            <Ink size={11.5} weight="medium" color={P.muted} numberOfLines={1}>
              {mentionSource(resume)}
            </Ink>
          </View>
          <Icon name="chevron" size={16} color={P.muted} width={2.4} />
        </Card>
      </Press>
      <FeuilleMange visible={open} onClose={() => setOpen(false)} resume={resume} />
    </>
  );
}

function Case({ label, valeur, unite }: { label: string; valeur: number | null; unite: string }) {
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, padding: 12, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, gap: 2 }}>
      <Ink size={12} weight="bold" color={P.ink2}>
        {label}
      </Ink>
      {valeur !== null && valeur > 0 ? (
        <Ink size={22} weight="black" tight>
          {unite === 'kcal' ? milliers(valeur) : String(Math.round(valeur))}
          <Ink size={13} weight="bold" color={P.ink2}>{` ${unite}`}</Ink>
        </Ink>
      ) : (
        <Ink size={14} weight="medium" color={P.muted} style={{ paddingVertical: 5 }}>
          {traduire("pas noté")}</Ink>
      )}
    </View>
  );
}

/** Les 7 derniers jours en barres simples, calories. Un jour sans rien : un petit trait. */
function Barres({ jours }: { jours: JourRepas[] }) {
  const { accent } = useAccent();
  const max = Math.max(1, ...jours.map((j) => j.kcal ?? 0));
  const H = 88;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: H + 40 }} accessibilityLabel={traduire("Calories des 7 derniers jours : {0}", jours.map((j) => `${jourCourt(j.date)} ${j.kcal ? `${Math.round(j.kcal)} kcal` : 'rien de noté'}`).join(', '))}>
      {jours.map((j, i) => {
        const v = j.kcal ?? 0;
        const auj = i === jours.length - 1;
        const h = v > 0 ? Math.max(6, Math.round((v / max) * H)) : 3;
        return (
          <View key={j.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Ink size={10} weight="bold" color={v > 0 ? P.ink2 : P.muted} numberOfLines={1}>
              {v > 0 ? milliers(v) : ''}
            </Ink>
            <View style={{ width: '100%', maxWidth: 30, height: h, borderRadius: 6, backgroundColor: v > 0 ? accent : P.line, opacity: v > 0 && !auj ? 0.55 : 1 }} />
            <Ink size={11} weight={auj ? 'extraBold' : 'medium'} color={auj ? P.ink : P.muted}>
              {auj ? 'auj.' : jourCourt(j.date)}
            </Ink>
          </View>
        );
      })}
    </View>
  );
}

export function FeuilleMange({ visible, onClose, resume }: { visible: boolean; onClose: () => void; resume: ResumeRepas }) {
  const insets = useSafeAreaInsets();
  const j = resume.aujourdhui;
  const m = resume.moyenne;
  const notes: string[] = [];
  if (j?.ecartees.length) notes.push(traduire("{0} {1} aussi écrit aujourd’hui : seul {2} est compté, pour ne pas additionner deux fois les mêmes repas.", j.ecartees.join(', '), j.ecartees.length > 1 ? 'ont' : 'a', j.source ?? 'la dernière app'));
  if (j && j.doublons > 0) notes.push(j.doublons === 1 ? traduire('Une entrée écrite deux fois à l’identique n’est comptée qu’une fois.') : traduire("{0} entrées écrites deux fois à l’identique ne sont comptées qu’une fois.", j.doublons));
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(16,19,27,0.45)', justifyContent: 'flex-end' }} accessibilityLabel={traduire("Fermer")}>
        <Pressable onPress={() => {}} style={{ backgroundColor: P.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, maxHeight: '90%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line, marginBottom: 6 }} />
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 1 }}>
                <Ink size={22} weight="black" tight accessibilityRole="header">
                  {traduire("Mangé aujourd’hui")}</Ink>
                <Ink size={12.5} weight="medium" color={P.muted}>
                  {mentionSource(resume)}
                </Ink>
              </View>
              <Press onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} hitSlop={8}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: P.line2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={18} color={P.ink} width={2.6} />
                </View>
              </Press>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Case label={traduire("Calories")} valeur={j?.kcal ?? null} unite="kcal" />
              <Case label={traduire("Protéines")} valeur={j?.proteines ?? null} unite="g" />
              <Case label={traduire("Glucides")} valeur={j?.glucides ?? null} unite="g" />
              <Case label={traduire("Lipides")} valeur={j?.lipides ?? null} unite="g" />
            </View>
            <Ink size={12.5} weight="medium" color={P.ink2} style={{ lineHeight: 18 }}>
              {traduire("Ta journée peut être incomplète : ton app écrit au fil de tes saisies.")}</Ink>

            <View style={{ padding: 14, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, gap: 8 }}>
              <Ink size={15} weight="black" tight>
                {traduire("Tes 7 derniers jours")}</Ink>
              <Barres jours={resume.jours} />
              {m && ligneMange(m) ? (
                <Ink size={12.5} weight="medium" color={P.ink2} style={{ lineHeight: 18 }}>
                  {traduire("En moyenne {0} par jour, sur {1} avant aujourd’hui.", ligneMange(m), m.jours === 1 ? '1 jour noté' : `${m.jours} jours notés`)}
                </Ink>
              ) : null}
            </View>

            {notes.map((n) => (
              <Ink key={n} size={12.5} weight="medium" color={P.ink2} style={{ lineHeight: 18 }}>
                {n}
              </Ink>
            ))}

            <View style={{ gap: 4 }}>
              <Ink size={13.5} weight="extraBold">
                {traduire("D’où viennent ces chiffres")}</Ink>
              <Ink size={13} weight="medium" color={P.ink2} style={{ lineHeight: 19 }}>
                {aideActivation(resume.fournisseur)}
              </Ink>
              <Ink size={12} weight="medium" color={P.muted} style={{ lineHeight: 17 }}>
                {traduire("Tu peux cacher cette ligne dans Ton accueil.")}</Ink>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
