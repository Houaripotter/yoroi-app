/**
 * Garder son programme dans la durée (28 octobre 2026). Houari : « Je veux garder le programme que j'ai choisi ou
 * modifié pour tout le temps, sur plusieurs mois, que ça devienne une habitude. »
 *  - ChoixDuree : 8 semaines, 12 semaines ou « Sans fin » (la semaine se répète, « semaine 14 », jamais « sur 8 »).
 *  - GarderMonProgramme : ton programme et ta semaine (A et B comprises) deviennent un programme à toi dans
 *    « Mes programmes », modifiable ensuite, jamais écrasé (suivi.ts, garderCommeMonProgramme).
 *  - PointRegularite : à la fin de chaque cycle, une carte qui ne bloque rien, avec tes vraies données (semaines
 *    avec au moins une séance, séances faites, gain moyen des charges) : « Continuer » ou « Changer quelque chose ».
 *    La semaine plus légère n'est rappelée que si YOROI la propose déjà (suivi.ts, proposerSemaineLegere, Bell 2025).
 */
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { nomDuProgramme } from '@/lib/v2/programmes/heroJour';
import { DUREES } from '@/lib/v2/programmes/semaineLibre';
import { garderCommeMonProgramme, marquerPointVu, peutGarder, pointDeRegularite, proposerSemaineLegere } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const libelleDuree = (d: number) => (d === 0 ? traduire('Sans fin') : traduire('{0} semaines', d));

/** 8 semaines, 12 semaines, Sans fin */
export function ChoixDuree({ valeur, onChange, titre }: { valeur: number | undefined; onChange: (d: number) => void; titre?: boolean }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ gap: 8 }}>
      {titre !== false ? <Ink size={14} weight="black" color={pal.texte}>{traduire('Combien de temps ?')}</Ink> : null}
      <View style={{ flexDirection: 'row', gap: 6, padding: 4, borderRadius: 18, backgroundColor: pal.page }}>
        {DUREES.map((d) => {
          const on = valeur === d;
          return (
            <Pressable
              key={d}
              onPress={() => { tap(); onChange(d); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pal.carte : pressed ? pal.teinte : 'transparent', borderWidth: 2, borderColor: on ? pal.indigo : 'transparent' })}
            >
              <Ink size={13} weight="extraBold" color={on ? pal.indigo : pal.texte2}>{libelleDuree(d)}</Ink>
            </Pressable>
          );
        })}
      </View>
      {valeur === 0 ? (
        <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{traduire('Sans fin : ta semaine se répète, tes charges continuent de progresser.')}</Ink>
      ) : null}
    </View>
  );
}

/** « Garder comme mon programme » : un nom, une durée, et il rejoint « Mes programmes » */
export function GarderMonProgramme({ programme: p, actif, onGarde }: { programme: Programme; actif: ProgrammeActif | null; onGarde?: (id: string) => void }) {
  const pal = usePaletteProgramme();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState('');
  const [duree, setDuree] = useState<number | undefined>(actif?.duree ?? 0);
  const [occupe, setOccupe] = useState(false);
  const [fait, setFait] = useState(false);
  if (!peutGarder(actif, p)) return null;
  const garder = async () => {
    if (occupe) return;
    setOccupe(true);
    try {
      const a = await garderCommeMonProgramme(nom.trim() || nomDuProgramme(traduire(p.titre)), duree);
      if (a) {
        setFait(true);
        onGarde?.(a.id);
      }
    } finally {
      setOccupe(false);
    }
  };
  return (
    <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 18, gap: 14 }}>
      <Pressable
        onPress={() => { tap(); setOuvert((x) => !x); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: pal.vertTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={18} color={pal.vert} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={16} weight="black" color={pal.texte}>{traduire('Garder comme mon programme')}</Ink>
          <Ink size={12} weight="bold" color={pal.texte2}>{traduire('Il reste dans Mes programmes, tu le modifies quand tu veux.')}</Ink>
        </View>
        <Icon name="chevron" size={16} color={pal.texte3} />
      </Pressable>
      {fait ? (
        <Ink size={13} weight="bold" color={pal.vert} style={{ lineHeight: 18 }}>{traduire('C’est ton programme. Tes séances faites et tes charges restent.')}</Ink>
      ) : ouvert ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 18, backgroundColor: pal.page }}>
            <Icon name="edit" size={16} color={pal.texte2} />
            <TextInput
              value={nom}
              onChangeText={(t) => setNom(t.slice(0, 40))}
              placeholder={nomDuProgramme(traduire(p.titre))}
              placeholderTextColor={pal.texte3}
              accessibilityLabel={traduire('Nom du programme')}
              returnKeyType="done"
              style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: '700', color: pal.texte }}
            />
          </View>
          <ChoixDuree valeur={duree} onChange={setDuree} />
          <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{traduire('Ta semaine, tes semaines A et B et tes exercices changés sont gardés. Ton historique et tes charges continuent.')}</Ink>
          <BoutonPrincipal label={traduire('Garder')} onPress={() => void garder()} loading={occupe} haptique="none" />
        </View>
      ) : null}
    </View>
  );
}

/** La carte de régularité, à la fin de chaque cycle : rien n'est bloqué */
export function PointRegularite({ programme: p, actif, gain, onChanger, aujourdhui }: { programme: Programme; actif: ProgrammeActif | null; gain?: number | null; onChanger?: () => void; aujourdhui?: Date }) {
  const pal = usePaletteProgramme();
  const [vu, setVu] = useState(false);
  if (!actif || actif.id !== p.id || vu) return null;
  const pt = pointDeRegularite(actif, p, aujourdhui);
  if (!pt) return null;
  const continuer = () => {
    tap();
    setVu(true);
    void marquerPointVu(pt.cycle);
  };
  return (
    <View style={{ backgroundColor: pal.vertTint, borderRadius: 24, padding: 18, gap: 10 }}>
      <Ink size={20} weight="black" tight color={pal.texte} accessibilityRole="header">
        {traduirePluriel(pt.semaines, pt.semaines > 1, '{0} semaine de régularité', '{0} semaines de régularité', pt.semaines)}
      </Ink>
      <Ink size={13} weight="bold" color={pal.texte2}>
        {traduirePluriel(pt.faites, pt.faites > 1, '{0} séance faite depuis le début', '{0} séances faites depuis le début', pt.faites)}
      </Ink>
      {gain != null && gain > 0 ? <Ink size={13} weight="bold" color={pal.vert}>{traduire('+{0} % sur tes charges en moyenne', gain)}</Ink> : null}
      {proposerSemaineLegere(actif, aujourdhui) ? (
        <Ink size={12} weight="bold" color={pal.texte2} style={{ lineHeight: 17 }}>{traduire('Toutes les 4 à 8 semaines, ou si la fatigue s’accumule, fais une semaine plus légère : moitié moins de séries, même charge.')}</Ink>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Pressable
          onPress={continuer}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.anneau : pal.indigo })}
        >
          <Ink size={14} weight="extraBold" color="#FFFFFF">{traduire('Continuer')}</Ink>
        </Pressable>
        <Pressable
          onPress={() => { continuer(); onChanger?.(); }}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.teinte : pal.carte })}
        >
          <Ink size={14} weight="extraBold" color={pal.texte}>{traduire('Changer quelque chose')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}
