/**
 * « Ajoute d'autres machines d'un coup » (18 novembre 2026), a la fin de la reprise d'une autre app et dans Mes
 * machines (app/mes-machines.tsx). Une liste de noms, un par ligne, collee, tapee ou dictee avec le micro du clavier ;
 * ou la reponse de ton IA a qui tu as envoye tes captures de routines (consigne a copier, YOROI n'envoie rien).
 * Chaque nom devient une de tes machines ; le muscle est devine, sinon tu le choisis d'une pastille. Doublons ignores.
 * Calculs : lib/v2/seances/listeMachines.ts.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Glass } from '@/components/yoroi/v2/seances/ui';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { niceGroup } from '@/lib/v2/seance/format';
import { plierHevy } from '@/lib/v2/import/nomsHevy';
import { MUSCLES_CHOIX } from '@/lib/v2/import/repriseHevy';
import { CONSIGNE_IA_MACHINES, preparerListe } from '@/lib/v2/seances/listeMachines';
import type { ListePreparee } from '@/lib/v2/seances/listeMachines';
import { ajouterMachinesPerso, chargerMachinesPerso, machinesEnMemoire } from '@/lib/v2/seances/machinesPerso';
import { logger } from '@/lib/security/logger';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const BLANC = '#FFFFFF';
let NOMS: Map<string, string> | null = null;
/** le nom exact de la bibliotheque, ecrit en francais ou en anglais */
export function nomBibliotheque(nom: string): string | null {
  if (!NOMS) {
    NOMS = new Map();
    for (const e of EXERCISE_LIBRARY) {
      NOMS.set(plierHevy(e.name), e.name);
      const fr = nomFr(e.name);
      if (fr && !NOMS.has(plierHevy(fr))) NOMS.set(plierHevy(fr), e.name);
    }
  }
  return NOMS.get(plierHevy(nom)) ?? null;
}

export function AjoutListe({ texteDepart = '', onAjoute }: { texteDepart?: string; onAjoute?: (n: number) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [texte, setTexte] = useState(texteDepart);
  const [muscles, setMuscles] = useState<Record<string, string>>({});
  const [machines, setMachines] = useState(machinesEnMemoire());
  const [occupe, setOccupe] = useState(false);
  const [bilan, setBilan] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  useEffect(() => {
    chargerMachinesPerso().then(setMachines, () => {});
  }, []);
  const liste: ListePreparee = useMemo(() => preparerListe(texte, machines, nomBibliotheque), [texte, machines]);
  const muscleDe = (n: { nom: string; muscle: string | null }) => muscles[n.nom] ?? n.muscle;
  const prets = liste.nouveaux.filter((n) => muscleDe(n));

  const ajouter = async () => {
    if (!prets.length || occupe) return;
    setOccupe(true);
    try {
      const r = await ajouterMachinesPerso(prets.map((n) => ({ nom: n.nom, muscle: muscleDe(n) })));
      setMachines(r.liste);
      setTexte('');
      setMuscles({});
      const morceaux = [traduirePluriel(r.ajoutees.length, r.ajoutees.length > 1, '{0} machine ajoutée', '{0} machines ajoutées', r.ajoutees.length)];
      if (r.sansPlace.length) morceaux.push(traduire('{0} sans place : tu as déjà {1} machines', r.sansPlace.length, r.liste.length));
      setBilan(morceaux.join('. '));
      onAjoute?.(r.ajoutees.length);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      logger.warn('[AjoutListe] machines non ajoutees', e);
      setBilan(traduire('Enregistrement impossible. Réessaie dans un instant.'));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Glass style={{ gap: 10, padding: 18 }}>
      <Ink size={18} weight="black" tight>{traduire('Ajoute d’autres machines d’un coup')}</Ink>
      <Ink size={13} color={c.textSecondary} style={{ lineHeight: 18 }}>{traduire('Les exercices que tu as créés dans ton ancienne app, ou qui sont seulement dans tes routines, ne sont pas dans l’export des séances. Écris les ici, un par ligne. Tu peux aussi dicter avec le micro du clavier.')}</Ink>
      <TextInput
        value={texte}
        onChangeText={(t) => { setTexte(t); setBilan(null); }}
        multiline
        placeholder={traduire('Presse convergente\nPoulie vis à vis de ma salle\nVélo assis')}
        placeholderTextColor={c.textMuted}
        style={{ minHeight: 120, maxHeight: 260, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, padding: 14, color: c.ink, fontSize: 15, textAlignVertical: 'top' }}
        accessibilityLabel={traduire('Tes machines, une par ligne')}
      />
      <Pressable onPress={() => { void Clipboard.setStringAsync(traduire(CONSIGNE_IA_MACHINES)).then(() => setCopie(true), () => {}); }} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
        <Ink size={13} weight="extraBold" color={c.accent}>{copie ? traduire('Consigne copiée : envoie la à ton IA avec tes captures, puis colle sa réponse ici') : traduire('Tu as des captures de tes routines ? Copie la consigne pour ton IA')}</Ink>
      </Pressable>
      {liste.deja.length || liste.dansYoroi.length ? (
        <Ink size={12} color={c.textMuted}>
          {[liste.deja.length ? traduirePluriel(liste.deja.length, liste.deja.length > 1, '{0} déjà dans tes machines', '{0} déjà dans tes machines', liste.deja.length) : '', liste.dansYoroi.length ? traduirePluriel(liste.dansYoroi.length, liste.dansYoroi.length > 1, '{0} déjà dans YOROI : {1}', '{0} déjà dans YOROI : {1}', liste.dansYoroi.length, liste.dansYoroi.slice(0, 4).join(', ')) : ''].filter(Boolean).join('. ')}
        </Ink>
      ) : null}
      {liste.nouveaux.map((n) => {
        const m = muscleDe(n);
        return (
          <View key={n.nom} style={{ gap: 6, paddingTop: 8, borderTopWidth: 1, borderColor: c.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{n.nom}</Ink>
              {m ? <Ink size={12} weight="bold" color={c.accent}>{niceGroup(m)}</Ink> : <Ink size={12} weight="bold" color={c.textMuted}>{traduire('Quel muscle ?')}</Ink>}
            </View>
            {!n.muscle ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {MUSCLES_CHOIX.map((g) => {
                  const on = m === g;
                  return (
                    <Pressable key={g} onPress={() => setMuscles((v) => ({ ...v, [n.nom]: g }))} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? c.accent : c.fillSubtle }}>
                      <Ink size={12} weight="extraBold" color={on ? BLANC : c.textSecondary}>{niceGroup(g)}</Ink>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        );
      })}
      {bilan ? <Ink size={14} weight="bold" color={c.accent}>{bilan}</Ink> : null}
      {liste.nouveaux.length ? (
        occupe ? <ActivityIndicator color={c.accent} /> : (
          <BigButton
            label={prets.length === liste.nouveaux.length
              ? traduirePluriel(prets.length, prets.length > 1, 'Ajouter {0} machine', 'Ajouter {0} machines', prets.length)
              : traduire('Ajouter {0} machines, {1} attendent leur muscle', prets.length, liste.nouveaux.length - prets.length)}
            icon="plus"
            onPress={() => void ajouter()}
          />
        )
      ) : null}
    </Glass>
  );
}

export default AjoutListe;
