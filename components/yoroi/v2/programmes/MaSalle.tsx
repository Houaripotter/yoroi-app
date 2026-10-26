/**
 * Ma salle (26 octobre 2026, retour utilisateur : « qu'il te fasse sa liste de machines avec lesquelles il bosse
 * et toi tu lui fais un programme »). Tu coches ton materiel, puis les machines precises de ta salle.
 * Chaque programme s'adapte tout seul : un exercice que ta salle ne permet pas est remplace par le plus proche
 * (lib/v2/programmes/materiel.ts). Enregistre sur le telephone avec « Mon matériel » (lib/v2/programmes/suivi.ts).
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Chip, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { EQUIPEMENTS, TOUT_LE_MATERIEL } from '@/lib/v2/programmes/materiel';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { GROUPES, MACHINES } from '@/lib/v2/seance/machines';
import { machineArt } from '@/lib/v2/seance/machinesArt';
import { chargerMachines, chargerMateriel, enregistrerSalle } from '@/lib/v2/programmes/suivi';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function MaSalle({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [liste, setListe] = useState<Equipement[]>(TOUT_LE_MATERIEL);
  const [machines, setMachines] = useState<string[]>([]);
  useEffect(() => {
    if (!visible) return;
    chargerMateriel().then((m) => setListe(m ?? [...TOUT_LE_MATERIEL])).catch(() => {});
    chargerMachines().then((m) => setMachines(m ?? [])).catch(() => {});
  }, [visible]);

  const basculer = (id: Equipement) => setListe((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const basculerMachine = (id: string) => setMachines((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const avecMachines = liste.includes('machines');

  const valider = () => {
    tap();
    // sans « Machines guidées », le detail des machines ne sert plus
    void enregistrerSalle(liste, avecMachines && machines.length ? machines : null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Ma salle')}>
      <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
        {traduire('Coche ce que tu as, chez toi ou à ta salle. Chaque exercice que tu ne peux pas faire est remplacé par le plus proche, pour le même muscle.')}
      </Ink>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4 }}>
        <Chip label={traduire('Salle complète')} on={liste.length === TOUT_LE_MATERIEL.length && !machines.length} onPress={() => { setListe([...TOUT_LE_MATERIEL]); setMachines([]); }} />
        <Chip label={traduire('Rien du tout')} on={liste.length === 0} onPress={() => { setListe([]); setMachines([]); }} />
      </View>
      <View style={{ gap: 6 }}>
        {EQUIPEMENTS.map((e) => (
          <Case key={e.id} on={liste.includes(e.id)} titre={traduire(e.label)} detail={traduire(e.detail)} onPress={() => basculer(e.id)} />
        ))}
      </View>

      {avecMachines ? (
        <View style={{ gap: 8, marginTop: 6 }}>
          <Ink size={17} weight="black" tight style={{ paddingHorizontal: 4 }}>{traduire('Les machines de ta salle')}</Ink>
          <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
            {machines.length
              ? traduirePluriel(machines.length, machines.length > 1, '{0} machine cochée. Un exercice sur une machine que tu n’as pas est remplacé.', '{0} machines cochées. Un exercice sur une machine que tu n’as pas est remplacé.', machines.length)
              : traduire('Facultatif. Sans rien cocher ici, YOROI compte que ta salle a toutes les machines.')}
          </Ink>
          {GROUPES.map((g) => {
            const dans = MACHINES.filter((m) => m.groupe === g.id);
            if (!dans.length) return null;
            return (
              <View key={g.id} style={{ gap: 6 }}>
                <Ink size={12} weight="extraBold" color={c.textMuted} style={{ paddingHorizontal: 4, marginTop: 4 }}>{traduire(g.label).toUpperCase()}</Ink>
                {dans.map((m) => (
                  <Case key={m.id} on={machines.includes(m.id)} titre={traduire(m.nom)} detail={m.muscles.slice(0, 3).map((x) => traduire(x)).join(', ')} image={machineArt(m.id)} onPress={() => basculerMachine(m.id)} />
                ))}
              </View>
            );
          })}
        </View>
      ) : null}

      <BigButton label={traduire('Enregistrer')} onPress={valider} />
    </Sheet>
  );
}

function Case({ on, titre, detail, image, onPress }: { on: boolean; titre: string; detail: string; image?: React.ComponentProps<typeof Image>['source']; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={titre}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: image ? 6 : 0, borderRadius: 16, backgroundColor: pressed ? c.fillSubtle : on ? c.accentTint : 'transparent', borderWidth: 1, borderColor: on ? c.accent : c.divider })}
    >
      <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: on ? c.accent : c.textMuted, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Icon name="check" size={14} color={c.onAccent} /> : null}
      </View>
      {image ? <Image source={image} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
      <View style={{ flex: 1 }}>
        <Ink size={15} weight="extraBold">{titre}</Ink>
        {detail ? <Ink size={12} color={c.textSecondary} numberOfLines={1}>{detail}</Ink> : null}
      </View>
    </Pressable>
  );
}
