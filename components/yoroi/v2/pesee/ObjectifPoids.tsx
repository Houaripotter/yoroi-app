/**
 * « Ton objectif » (18 octobre 2026, Houari : « pouvoir changer facilement la date de début, le poids objectif et
 * la date du cap »). Trois lignes, Début, Objectif, Date du cap, chacune avec « Changer », et la feuille qui les
 * change : le calendrier de l'app (DatePickerSheet) et la regle du poids de l'onboarding (Ruler et Pas).
 * Les valeurs viennent de la source unique (lib/v2/pesee/etatObjectif.ts) ; les changements vont la ou ton objectif
 * vit deja (lib/v2/pesee/changerObjectif.ts) et tout se recalcule aussitot.
 * Garde-fous : debut jamais dans le futur, date du cap apres aujourd'hui, objectif different de ton poids actuel ;
 * un objectif au-dessus de ton debut devient une prise de masse et les textes suivent.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { DatePickerSheet } from '@/components/yoroi/v2/DateChips';
import { Ruler } from '@/components/yoroi/v2/onboarding/Ruler';
import { PAS_KG, Pas } from '@/components/yoroi/v2/onboarding/Pas';
import { logger } from '@/lib/security/logger';
import type { EtatObjectif } from '@/lib/v2/pesee/etatObjectif';
import { kg1, kgCourt, sensPourObjectif, texteDateCap, texteDebut, texteObjectif, validerObjectif } from '@/lib/v2/pesee/etatObjectif';
import { enregistrerDateCap, enregistrerDebut, enregistrerObjectif } from '@/lib/v2/pesee/changerObjectif';
import { poidsAuDebut } from '@/lib/v2/pesee/debutObjectif';
import { jourCourt } from '@/lib/v2/pesee/ligneDirectrice';
import { plusJours } from '@/lib/v2/pesee/predictions';
import { traduire } from '@/lib/i18n/tr';

export type QuoiObjectif = 'debut' | 'objectif' | 'date';
type PeseeJour = { date: string; value: number; trend?: number };

/** Une ligne : libelle, valeur, « Changer » */
function Ligne({ libelle, valeur, onPress, a11y, bord }: { libelle: string; valeur: string; onPress: () => void; a11y: string; bord: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: pressed ? c.fillSoft : 'transparent', borderTopWidth: bord ? 1 : 0, borderColor: c.border })}
    >
      <View style={{ flexShrink: 1, gap: 1 }}>
        <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>
          {libelle}
        </Ink>
        <Ink size={15} weight="extraBold" numberOfLines={1}>
          {valeur}
        </Ink>
      </View>
      <Ink size={13.5} weight="extraBold" color={c.accent} numberOfLines={1}>
        {traduire("Changer")}</Ink>
    </Pressable>
  );
}

/** La carte « Ton objectif » : Début, Objectif, Date du cap */
export function CarteObjectif({ etat, onChanger, style }: { etat: EtatObjectif; onChanger: (q: QuoiObjectif) => void; style?: object }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const debut = texteDebut(etat) ?? traduire('pas encore choisi');
  const objectif = texteObjectif(etat) ?? traduire('pas encore fixé');
  const date = texteDateCap(etat);
  const dateTxt = date ? `${date}${etat.dateCapChoisie ? '' : traduire(', prévue à ton rythme sain')}` : traduire('à choisir');
  return (
    <View style={[{ borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }, style]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 }}>
        <Ink size={14} weight="black" numberOfLines={1}>
          {traduire("Ton objectif")}</Ink>
      </View>
      <Ligne libelle={traduire("Début")} valeur={debut} onPress={() => onChanger('debut')} a11y={traduire("Début de ton objectif : {0}. Changer", debut)} bord={false} />
      <Ligne libelle={traduire("Objectif")} valeur={objectif} onPress={() => onChanger('objectif')} a11y={traduire("Ton objectif : {0}. Changer", objectif)} bord />
      <Ligne libelle={traduire("Date du cap")} valeur={dateTxt} onPress={() => onChanger('date')} a11y={traduire("Date du cap : {0}. Changer", dateTxt)} bord />
    </View>
  );
}

function Bouton({ libelle, onPress, plein = true }: { libelle: string; onPress: () => void; plein?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ height: plein ? 56 : 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: plein ? (pressed ? c.accentPressed : c.accent) : 'transparent' })}
    >
      <Ink size={plein ? 16 : 14} weight={plein ? 'extraBold' : 'bold'} color={plein ? c.onAccent : c.textSecondary}>
        {libelle}
      </Ink>
    </Pressable>
  );
}

/**
 * La feuille : quoi = la ligne a changer (null : les trois lignes). Debut : le calendrier (jamais dans le futur),
 * puis ton poids de ce jour a la regle (prerempli avec ta pesee). Objectif : la regle. Date du cap : le calendrier
 * (apres aujourd'hui).
 */
export function FeuilleObjectif({ visible, quoi: quoiInitial, onClose, etat, series, today, cle }: { visible: boolean; quoi: QuoiObjectif | null; onClose: () => void; etat: EtatObjectif; series: PeseeJour[]; today: string; cle: string | null }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [quoi, setQuoi] = useState<QuoiObjectif | null>(quoiInitial);
  const [calendrier, setCalendrier] = useState(false);
  const [dateDebut, setDateDebut] = useState(etat.debut?.date ?? today);
  const [poidsDebut, setPoidsDebut] = useState(etat.debut?.poids ?? etat.actuel?.poids ?? 80);
  const [cap, setCap] = useState(etat.cap ?? etat.actuel?.poids ?? 80);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // le calendrier appelle onPick puis onClose : apres un choix, onClose ne ferme pas la feuille
  const pris = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setQuoi(quoiInitial);
    setCalendrier(quoiInitial === 'debut' || quoiInitial === 'date');
    setDateDebut(etat.debut?.date ?? today);
    setPoidsDebut(etat.debut?.poids ?? etat.actuel?.poids ?? 80);
    setCap(etat.cap ?? etat.actuel?.poids ?? 80);
    setErreur(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, quoiInitial]);

  const fermer = () => {
    setErreur(null);
    onClose();
  };
  const choisir = (q: QuoiObjectif) => {
    setQuoi(q);
    setErreur(null);
    setCalendrier(q === 'debut' || q === 'date');
  };
  const enregistrer = async (f: () => Promise<{ ok: true } | { ok: false; raison: string }>) => {
    if (envoi) return;
    setEnvoi(true);
    try {
      const r = await f();
      if (r.ok) fermer();
      else setErreur(r.raison);
    } catch (err) {
      logger.error('Objectif de poids impossible a enregistrer', err);
      setErreur(traduire('Ton objectif n’a pas pu être enregistré.'));
    } finally {
      setEnvoi(false);
    }
  };

  const clamp = (x: number) => Math.min(250, Math.max(30, Math.round(x * 10) / 10));
  const actuel = etat.actuel?.poids ?? null;
  const debutRef = quoi === 'objectif' ? etat.debut?.poids ?? actuel : null;
  const sensCap = debutRef != null ? sensPourObjectif(cap, debutRef) : null;
  const erreurCap = quoi === 'objectif' ? validerObjectif(cap, actuel) : null;
  const ecartCap = debutRef != null ? Math.abs(cap - debutRef) : null;

  const titre = quoi === 'debut' ? traduire('Début de ton objectif') : quoi === 'objectif' ? traduire('Ton poids objectif') : quoi === 'date' ? traduire('Ta date du cap') : traduire('Ton objectif');
  const demain = plusJours(today, 1);

  return (
    <Sheet visible={visible} onClose={fermer} title={titre} scroll>
      {quoi === null ? (
        <CarteObjectif etat={etat} onChanger={choisir} />
      ) : quoi === 'debut' ? (
        <View style={{ gap: 12 }}>
          {calendrier ? (
            <DatePickerSheet
              inline
              visible
              value={dateDebut}
              maxDate={today}
              title={traduire("Début de ton objectif")}
              onClose={() => setCalendrier(false)}
              onPick={(iso) => {
                setDateDebut(iso);
                const p = poidsAuDebut(series, iso);
                if (p != null) setPoidsDebut(p);
                setCalendrier(false);
              }}
            />
          ) : (
            <>
              <Pressable onPress={() => setCalendrier(true)} accessibilityRole="button" accessibilityLabel={traduire("Date de début : le {0}. Changer la date", jourCourt(dateDebut))} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                <View style={{ gap: 1 }}>
                  <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire("Date de début")}</Ink>
                  <Ink size={15} weight="extraBold">{traduire("le {0}", jourCourt(dateDebut))}</Ink>
                </View>
                <Ink size={13.5} weight="extraBold" color={c.accent}>{traduire("Changer")}</Ink>
              </Pressable>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire("Ton poids ce jour-là")}</Ink>
                <Ink size={34} weight="black" tight>{`${kg1(poidsDebut)} kg`}</Ink>
              </View>
              <Ruler value={poidsDebut} onChange={(v) => setPoidsDebut(clamp(v))} hardMin={30} hardMax={250} label={traduire("Règle du poids de début, fais glisser pour régler")} />
              <Pas value={poidsDebut} onChange={setPoidsDebut} pas={PAS_KG} clamp={clamp} />
              <Ink size={12.5} weight="medium" color={c.textSecondary}>
                {traduire("Proposé d’après ta pesée de ce jour, ou la plus proche. Ta courbe, ton rythme prévu et ton chemin repartent de ce point.")}</Ink>
              {erreur ? <Ink size={13} weight="bold" color={c.danger}>{erreur}</Ink> : null}
              <Bouton libelle={envoi ? 'Enregistrement…' : traduire('Enregistrer')} onPress={() => enregistrer(() => enregistrerDebut(dateDebut, poidsDebut, series, today))} />
              <Bouton libelle={traduire("Annuler")} plein={false} onPress={fermer} />
            </>
          )}
        </View>
      ) : quoi === 'objectif' ? (
        <View style={{ gap: 12 }}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Ink size={34} weight="black" tight>{`${kgCourt(cap)} kg`}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary} style={{ textAlign: 'center' }}>
              {erreurCap ?? (ecartCap == null || sensCap === 'maintain' ? traduire('Maintien de ton poids') : (sensCap === 'lose' ? traduire("Perte de {0} kg depuis ton début", kgCourt(ecartCap)) : traduire("Prise de masse de {0} kg depuis ton début", kgCourt(ecartCap))))}
            </Ink>
          </View>
          <Ruler value={cap} onChange={(v) => setCap(clamp(v))} hardMin={30} hardMax={250} label={traduire("Règle du poids objectif, fais glisser pour régler")} />
          <Pas value={cap} onChange={setCap} pas={PAS_KG} clamp={clamp} />
          {actuel != null ? (
            <Ink size={12.5} weight="medium" color={c.textSecondary}>
              {traduire("Ton poids actuel : {0} kg. Au-dessus de ton début, c’est une prise de masse ; en dessous, une perte.", kg1(actuel))}
            </Ink>
          ) : null}
          {erreur ? <Ink size={13} weight="bold" color={c.danger}>{erreur}</Ink> : null}
          <Bouton libelle={envoi ? 'Enregistrement…' : traduire('Enregistrer')} onPress={() => (erreurCap ? setErreur(erreurCap) : enregistrer(() => enregistrerObjectif(cap, actuel, etat.debut?.poids ?? null)))} />
          <Bouton libelle={traduire("Annuler")} plein={false} onPress={fermer} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Ink size={13} weight="medium" color={c.textSecondary}>
            {traduire("Le jour où tu veux arriver à ton cap. Ton rythme prévu va de ton début jusqu’à ce jour, et ton torii s’y pose.")}</Ink>
          <DatePickerSheet
            inline
            visible
            value={etat.dateCap && etat.dateCap > today ? etat.dateCap : plusJours(today, 60)}
            minDate={demain}
            maxDate={null}
            title={traduire("Ta date du cap")}
            onClose={() => {
              if (pris.current) {
                pris.current = false;
                return;
              }
              fermer();
            }}
            onPick={(iso) => {
              pris.current = true;
              enregistrer(() => enregistrerDateCap(iso, cle, today));
            }}
          />
          {erreur ? <Ink size={13} weight="bold" color={c.danger}>{erreur}</Ink> : null}
        </View>
      )}
    </Sheet>
  );
}
