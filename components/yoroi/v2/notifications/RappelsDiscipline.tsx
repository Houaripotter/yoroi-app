/**
 * Tes rappels de discipline (14 octobre 2026) : le meme reglage a l'ecran 7 de l'onboarding,
 * dans « Nouveautes de la 3.0 » et en haut de Reglages, Rappels (app/notifications.tsx).
 * Rien n'est allume par defaut. La permission du systeme n'est demandee qu'au moment ou un rappel s'allume,
 * avec un mot d'explication avant (lib/v2/notifications/rappels.ts). Refusee : un message et le lien vers Reglages.
 * Ce composant ne programme rien : il rend le choix, l'appelant l'applique (appliquerChoixRappels).
 */
import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { ChoiceChips, SWITCH_OFF, TimeField, sayTime } from './parts';
import { FREQUENCE_LABEL } from '@/lib/v2/notifications/discipline';
import type { ChoixRappels, FrequencePesee } from '@/lib/v2/notifications/discipline';
import { ouvrirReglagesSysteme, permissionPourRappels } from '@/lib/v2/notifications/rappels';
import type { EcranPermission } from '@/lib/v2/notifications/permission';
import { traduire } from '@/lib/i18n/tr';

const NB = ' ';
const JOURS = [
  { j: 0, court: 'L', nom: traduire('lundi') },
  { j: 1, court: 'M', nom: traduire('mardi') },
  { j: 2, court: 'M', nom: traduire('mercredi') },
  { j: 3, court: 'J', nom: traduire('jeudi') },
  { j: 4, court: 'V', nom: traduire('vendredi') },
  { j: 5, court: 'S', nom: traduire('samedi') },
  { j: 6, court: 'D', nom: traduire('dimanche') },
];

const hap = () => selectionAsync().catch(() => {});

function Ligne({ icon, titre, sous, on, onToggle, children }: { icon: IconName; titre: string; sous: string; on: boolean; onToggle: (v: boolean) => void; children?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border, paddingHorizontal: 14, paddingVertical: 10, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: on ? c.accentTint : c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={19} color={on ? c.accent : c.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={15} weight="extraBold">{titre}</Ink>
          <Ink size={12.5} color={c.textSecondary} style={{ lineHeight: 17 }}>{sous}</Ink>
        </View>
        <Switch
          value={on}
          onValueChange={(v) => {
            hap();
            onToggle(v);
          }}
          trackColor={{ false: SWITCH_OFF, true: c.accent }}
          thumbColor="#FFFFFF"
          {...({ activeThumbColor: '#FFFFFF' } as object)}
          ios_backgroundColor={SWITCH_OFF}
          accessibilityLabel={titre}
        />
      </View>
      {on && children ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: 12, paddingBottom: 4 }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Jours({ value, auto, autoTexte, onChange }: { value: number[]; auto: boolean; autoTexte?: string; onChange: (v: number[]) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const set = new Set(auto && autoTexte ? [] : value);
  return (
    <View style={{ gap: 8 }}>
      <Ink size={13} weight="bold" color={c.textSecondary}>{auto && autoTexte ? autoTexte : traduire('Les jours de tes séances')}</Ink>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {JOURS.map((d) => {
          const on = set.has(d.j);
          return (
            <Pressable
              key={d.j}
              onPress={() => {
                hap();
                const base = [...set];
                const next = on ? base.filter((x) => x !== d.j) : [...base, d.j];
                // au moins un jour
                if (next.length) onChange(next.sort((a, b) => a - b));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={traduire(d.nom)}
              style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.accent : pressed ? c.fillSoft : c.background, borderWidth: on ? 0 : 1, borderColor: c.border })}
            >
              <Ink size={15} weight="black" color={on ? c.onAccent : c.textSecondary}>{traduire(d.court)}</Ink>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RappelsDiscipline({
  value,
  onChange,
  ecran,
  apercu = false,
  joursAutoTexte,
}: {
  value: ChoixRappels;
  onChange: (c: ChoixRappels) => void;
  ecran: EcranPermission;
  /** apercu du Studio ou rendu web : rien n'est demande au systeme */
  apercu?: boolean;
  /** onboarding : tant que les jours ne sont pas touches, ce sont les jours d'entrainement choisis plus loin */
  joursAutoTexte?: string;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [refuse, setRefuse] = useState(false);
  const [busy, setBusy] = useState(false);

  /** allume ou eteint un rappel ; la permission n'est demandee qu'a l'allumage */
  const basculer = async (on: boolean, next: ChoixRappels) => {
    if (busy) return;
    if (on && !apercu) {
      setBusy(true);
      try {
        const r = await permissionPourRappels(ecran);
        if (r === 'refuse') {
          setRefuse(true);
          return;
        }
        if (r === 'plus_tard') return;
        setRefuse(false);
      } finally {
        setBusy(false);
      }
    }
    onChange(next);
  };

  const v = value;
  return (
    <View style={{ gap: 10 }}>
      {refuse ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ borderRadius: 18, backgroundColor: c.goldTint, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="lock" size={20} color={c.goldDeep} />
            <Ink size={13.5} weight="bold" style={{ flex: 1, lineHeight: 19 }}>
              {traduire("Les notifications de YOROI sont coupées sur ton téléphone. Pour recevoir tes rappels, autorise-les dans Réglages{0}: tu pourras revenir ici ensuite.", NB)}
            </Ink>
          </View>
          <Pressable onPress={ouvrirReglagesSysteme} accessibilityRole="link" style={({ pressed }) => ({ minHeight: 44, borderRadius: 14, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}>
            <Ink size={14.5} weight="extraBold" color={c.onAccent}>{traduire("Ouvrir les Réglages")}</Ink>
          </Pressable>
        </Animated.View>
      ) : null}

      <Ligne
        icon="dumbbell"
        titre={traduire("Rappel de séance")}
        sous={v.seance.actif ? traduire("{0}, jamais un jour où ta séance est déjà notée", sayTime(v.seance.heure)) : traduire('Les jours que tu choisis, à ton heure')}
        on={v.seance.actif}
        onToggle={(on) => void basculer(on, { ...v, seance: { ...v.seance, actif: on } })}
      >
        <Jours
          value={v.seance.jours}
          auto={v.seance.joursAuto}
          autoTexte={joursAutoTexte}
          onChange={(jours) => onChange({ ...v, seance: { ...v.seance, jours, joursAuto: false } })}
        />
        <TimeField label={traduire("Heure du rappel")} value={v.seance.heure} onChange={(heure) => onChange({ ...v, seance: { ...v.seance, heure } })} />
      </Ligne>

      <Ligne
        icon="scale"
        titre={traduire("Rappel de pesée")}
        sous={v.pesee.actif ? traduire("{0}, seulement si ta pesée manque", FREQUENCE_LABEL[v.pesee.frequence]) : traduire('Le matin, seulement si ta pesée n’est pas notée')}
        on={v.pesee.actif}
        onToggle={(on) => void basculer(on, { ...v, pesee: { ...v.pesee, actif: on } })}
      >
        <ChoiceChips<FrequencePesee>
          label={traduire("Combien de matins par semaine")}
          value={v.pesee.frequence}
          options={[
            { value: 'chaque_jour', label: traduire('Tous') },
            { value: 'trois', label: traduire('3 matins') },
            { value: 'une', label: traduire('1 matin') },
          ]}
          onChange={(frequence) => onChange({ ...v, pesee: { ...v.pesee, frequence } })}
        />
      </Ligne>

      <Ligne
        icon="drop"
        titre={traduire("Boire de l’eau")}
        sous={traduire("Quelques rappels de 9{0}h à 19{1}h", NB, NB)}
        on={v.eau.actif}
        onToggle={(on) => void basculer(on, { ...v, eau: { actif: on } })}
      />

      <Ligne
        icon="calendar"
        titre={traduire("Bilan du dimanche")}
        sous={traduire("Ta semaine en un coup d’œil, le dimanche à 19{0}h", NB)}
        on={v.bilan.actif}
        onToggle={(on) => void basculer(on, { ...v, bilan: { actif: on } })}
      />
    </View>
  );
}

export default RappelsDiscipline;
