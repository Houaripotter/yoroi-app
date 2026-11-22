/**
 * onboarding-neuf/Mesures.tsx
 *
 * Les questions propres a YOROI (plan B4) : ton poids, ta taille, ton cap, tes jours. Une question par ecran,
 * dans l'habillage du nouvel onboarding. Les briques sont celles de l'app : la regle (Ruler), les boutons de pas
 * (Pas), la recompense de la premiere pesee (RewardPanel), l'estimation d'arrivee honnete
 * (lib/v2/pesee/estimation.ts), les sept ronds des jours (JoursRonds) et ta semaine en couleurs.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ruler } from '@/components/yoroi/v2/onboarding/Ruler';
import { PAS_CM, PAS_KG, Pas } from '@/components/yoroi/v2/onboarding/Pas';
import { RewardPanel } from '@/components/yoroi/v2/onboarding/Poids';
import { bmi } from '@/components/yoroi/v2/onboarding/Taille';
import { arriveeVue, insecable } from '@/components/yoroi/v2/onboarding/Cap';
import { JoursRonds } from '@/components/yoroi/v2/onboarding/JoursRonds';
import { SemaineCouleurs } from '@/components/yoroi/v2/onboarding/SemaineCouleurs';
import { joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import { kg } from '@/components/yoroi/v2/onboarding/ui';
import { estimerArrivee, PAS_UNE_PROMESSE } from '@/lib/v2/pesee/estimation';
import type { Reward } from '@/lib/v2/onboarding/draft';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Apparait, Txt, type Nav } from './kit';
import { Question } from './Questions';
import { FONT, useNuit } from './theme';

const MIN = 30;
const MAX = 250;
const borneKg = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));
const SANS_CONTOUR = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** Le grand chiffre et son unite */
function Grand({ valeur, unite }: { valeur: string; unite: string }) {
  const T = useNuit();
  return (
    <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
      <Txt style={[st.grand, { color: T.ink }]} numberOfLines={1}>{valeur}</Txt>
      <Txt style={[st.unite, { color: T.sub }]}>{unite}</Txt>
    </View>
  );
}

/* ----------------------------------------------------------------- poids */
export function Poids({ nav, value, onChange, origine, libelleSante, santeDispo, nomSante, onSante, lecture, notice, enregistrement, recompense, univers = 'japon', onValider }: {
  nav: Nav;
  value: number;
  onChange: (v: number) => void;
  origine: 'manual' | 'health';
  /** « Pesée du 8 octobre, ... » quand la valeur vient de la sante */
  libelleSante: string | null;
  santeDispo: boolean;
  nomSante: string;
  onSante: () => void;
  lecture: boolean;
  notice: string | null;
  enregistrement: boolean;
  /** la premiere pesee est enregistree : ce que l'armure a vraiment credite */
  recompense: Reward | null;
  univers?: ChoixUnivers;
  /** « Continuer » : la vraie premiere pesee est enregistree (saveOnboardingWeighIn), puis on avance */
  onValider: () => void;
}) {
  const T = useNuit();
  const [texte, setTexte] = useState<string | null>(null);
  const fin = () => {
    if (texte == null) return;
    const v = parseFloat(texte.replace(',', '.'));
    setTexte(null);
    if (Number.isFinite(v) && v >= MIN && v <= MAX) onChange(borneKg(v));
  };
  if (recompense) {
    return (
      <Question nav={nav} titre={traduire('Première pesée, c’est noté')} mot={traduire('Première pesée')} sous={traduire('{0} kg, le point de départ de ta courbe.', kg(value))} onBouton={nav.onNext}>
        <RewardPanel reward={recompense} univers={univers} />
      </Question>
    );
  }
  return (
    <Question
      nav={nav}
      titre={traduire('Tu pèses combien aujourd’hui ?')}
      mot={traduire('combien')}
      oeil={traduire('Ton poids reste sur ton téléphone. Il ne part jamais.')}
      onBouton={onValider}
      chargement={enregistrement}
    >
      <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
        <TextInput
          value={texte ?? kg(value)}
          onFocus={() => setTexte(kg(value))}
          onChangeText={setTexte}
          onEndEditing={fin}
          onSubmitEditing={fin}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={5}
          accessibilityLabel={traduire('Ton poids en kilos, touche pour le taper')}
          style={[st.grand, { color: T.ink, minWidth: 200, textAlign: 'center', paddingVertical: 0 }, SANS_CONTOUR]}
        />
        <Txt style={[st.unite, { color: T.sub }]}>{traduire('kilos')}</Txt>
        {libelleSante && origine === 'health' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Ionicons name="heart" size={14} color={T.acc} />
            <Txt style={[st.petit, { color: T.acc }]}>{libelleSante}</Txt>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 18 }}>
        <Ruler value={value} onChange={(v) => onChange(v)} hardMin={MIN} hardMax={MAX} label={traduire('Règle de poids, fais glisser pour régler')} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Pas value={value} onChange={(v) => onChange(v)} pas={PAS_KG} clamp={borneKg} />
      </View>
      {santeDispo && origine !== 'health' ? (
        <Apparait rang={2}>
          <Pressable
            onPress={lecture ? undefined : onSante}
            accessibilityRole="button"
            style={({ pressed }) => [st.sante, { borderColor: T.line, backgroundColor: pressed ? T.line : T.card }]}
          >
            {lecture ? <ActivityIndicator color={T.acc} /> : <Ionicons name="heart" size={18} color={T.acc} />}
            <Txt style={[st.santeTxt, { color: T.acc }]}>{lecture ? traduire('Lecture en cours') : traduire('Reprendre ma dernière pesée')}</Txt>
          </Pressable>
          <Txt style={[st.petit, { color: T.sub, marginTop: 8, textAlign: 'center' }]}>{traduire('Depuis {0}. Rien ne quitte ton téléphone.', nomSante)}</Txt>
        </Apparait>
      ) : null}
      {notice ? <Txt style={[st.petit, { color: T.sub, marginTop: 10, textAlign: 'center' }]}>{notice}</Txt> : null}
    </Question>
  );
}

/* ---------------------------------------------------------------- taille */
export function Taille({ nav, value, poids, genre, onChange, onPasser }: { nav: Nav; value: number | null; poids: number; genre: 'h' | 'f'; onChange: (v: number) => void; onPasser: () => void }) {
  const T = useNuit();
  const vue = value ?? (genre === 'f' ? 165 : 175);
  const imc = bmi(poids, value);
  const borne = (v: number) => Math.min(230, Math.max(120, Math.round(v)));
  return (
    <Question
      nav={nav}
      titre={traduire('Et ta taille ?')}
      mot={traduire('taille')}
      lienBas={traduire('Passer')}
      onLienBas={onPasser}
      onBouton={() => {
        if (value == null) onChange(vue);
        nav.onNext();
      }}
    >
      <Grand valeur={String(vue)} unite={traduire('centimètres')} />
      <View style={{ marginTop: 18 }}>
        <Ruler value={vue} onChange={(v) => onChange(borne(v))} step={1} tick={10} span={40} hardMin={120} hardMax={230} label={traduire('Règle de taille, fais glisser pour régler')} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Pas value={vue} onChange={(v) => onChange(borne(v))} pas={PAS_CM} clamp={borne} />
      </View>
      <View style={[st.encart, { backgroundColor: T.card, borderColor: T.line }]}>
        <Txt style={[st.encartTxt, { color: T.ink }]}>
          {imc ? traduire('Ton IMC aujourd’hui : **{0}**. Un repère parmi d’autres, ta composition compte aussi.', kg(imc)).replace(/\*\*/g, '') : traduire('Pour ton IMC et pour estimer ta date d’arrivée.')}
        </Txt>
      </View>
    </Question>
  );
}

/* ------------------------------------------------------------------- cap */
export function Cap({ nav, depart, cible, sens, taille, onChange }: {
  nav: Nav;
  depart: number;
  cible: number;
  /** le sens de l'objectif borne la regle (perdre : en dessous du poids du jour, prendre : au dessus) */
  sens: string;
  taille: number | null;
  onChange: (v: number) => void;
}) {
  const T = useNuit();
  const baisse = sens === 'baisse' || sens === 'recompo';
  const hausse = sens === 'hausse';
  const bas = hausse ? Math.min(250, Math.round((depart + 0.1) * 10) / 10) : 30;
  const haut = baisse ? Math.max(30, Math.round((depart - 0.1) * 10) / 10) : 250;
  const borne = (x: number) => Math.min(haut, Math.max(bas, Math.round(x * 10) / 10));
  const e = estimerArrivee({ start: depart, target: cible, sessions: null, heightCm: taille ?? null, recompo: sens === 'recompo' && cible < depart });
  const v = arriveeVue(e, depart, cible);
  const ok = e.kind === 'ok';
  return (
    <Question nav={nav} titre={traduire('Tu veux arriver à combien ?')} mot={traduire('combien')}>
      <Grand valeur={kg(cible)} unite={traduire('kilos visés')} />
      <View style={{ marginTop: 18 }}>
        <Ruler value={cible} onChange={(x) => onChange(borne(x))} hardMin={bas} hardMax={haut} label={traduire('Règle du poids visé, fais glisser pour régler')} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Pas value={cible} onChange={(x) => onChange(borne(x))} pas={PAS_KG} clamp={borne} />
      </View>
      <View style={[st.encart, { backgroundColor: T.card, borderColor: T.line }]}>
        {ok ? (
          <>
            <Txt style={[st.encartPetit, { color: T.sub }]}>{traduire('Arrivée estimée')}</Txt>
            <Txt style={[st.arrivee, { color: T.orFonce }]}>{insecable(v.titre.charAt(0).toUpperCase() + v.titre.slice(1))}</Txt>
          </>
        ) : (
          <Txt style={[st.encartTxt, { color: T.ink, fontFamily: FONT.titreBold }]}>{v.titre}</Txt>
        )}
        {v.texte ? <Txt style={[st.encartTxt, { color: T.sub, marginTop: 6 }]}>{`${v.texte} ${PAS_UNE_PROMESSE}`}</Txt> : null}
        {v.cap != null ? (
          <Pressable onPress={() => onChange(v.cap as number)} style={[st.viser, { backgroundColor: T.mute }]} accessibilityRole="button">
            <Txt style={[st.viserTxt, { color: T.acc }]}>{traduire('Viser {0} kg pour commencer', kg(v.cap))}</Txt>
          </Pressable>
        ) : null}
      </View>
    </Question>
  );
}

/* ----------------------------------------------------------------- jours */
export function Jours({ nav, value, sports, onToggle }: { nav: Nav; value: number[]; sports: string[]; onToggle: (j: number) => void }) {
  const T = useNuit();
  const n = value.length;
  return (
    <Question nav={nav} titre={traduire('Tu t’entraînes quels jours ?')} mot={traduire('quels jours')} sous={traduire('Touche les jours où tu peux t’entraîner. Le nombre de séances suit tout seul.')} actif={n > 0}>
      <JoursRonds value={value} onToggle={onToggle} a11y={(nom) => traduire('{0} : {1}', traduire('Entraînement'), nom)} />
      <View style={[st.encart, { backgroundColor: T.card, borderColor: T.line, marginTop: 22, gap: 12 }]}>
        <View>
          <Txt style={[st.semaine, { color: T.ink }]}>
            {n ? traduirePluriel(n, n > 1, 'Ta semaine : {0} séance', 'Ta semaine : {0} séances', n) : traduire('Ta semaine d’entraînement')}
          </Txt>
          <Txt style={[st.encartTxt, { color: T.sub }]}>{n ? joursTexte(value).replace(/^./, (x) => x.toUpperCase()) : traduire('Aucun jour imposé : c’est toi qui sais quand tu peux.')}</Txt>
        </View>
        <SemaineCouleurs days={value} sports={sports} size={34} />
      </View>
    </Question>
  );
}

const st = StyleSheet.create({
  grand: { fontFamily: FONT.titre, fontSize: 80, lineHeight: 88, letterSpacing: -3, fontVariant: ['tabular-nums'] },
  unite: { fontFamily: FONT.texteSemi, fontSize: 16 },
  petit: { fontFamily: FONT.texteMedium, fontSize: 13, lineHeight: 18 },
  sante: { marginTop: 20, minHeight: 50, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  santeTxt: { fontFamily: FONT.titreBold, fontSize: 15 },
  encart: { marginTop: 18, borderRadius: 16, borderWidth: 1, padding: 14 },
  encartTxt: { fontFamily: FONT.texte, fontSize: 13.5, lineHeight: 19 },
  encartPetit: { fontFamily: FONT.texteSemi, fontSize: 12.5 },
  arrivee: { fontFamily: FONT.titre, fontSize: 21, lineHeight: 26, letterSpacing: -0.4, marginTop: 2 },
  viser: { alignSelf: 'flex-start', marginTop: 10, minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12 },
  viserTxt: { fontFamily: FONT.titreBold, fontSize: 14 },
  semaine: { fontFamily: FONT.titre, fontSize: 20, lineHeight: 25, letterSpacing: -0.4, marginBottom: 2 },
});
