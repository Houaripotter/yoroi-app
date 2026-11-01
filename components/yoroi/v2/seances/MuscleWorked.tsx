/**
 * Muscles travailles d'une seance (detail d'une seance).
 * 31 octobre 2026 (Houari : « corrige le partout dans l'app ») : la carte rouge de la semaine (MusclesSemaine,
 * face et dos, liste par groupe avec les series, legende Leger a 10 series et plus) remplace l'ancienne silhouette
 * grise (archivee dans _archive_ancien_design_2026-10-09/muscles_silhouette_2026-10-31/).
 * Les muscles viennent de chaque exercice reellement fait (lib/v2/seances/musclesExercices.ts), plus jamais du type
 * de seance : un « Lower » avec des mollets et un crunch allume les mollets et les abdos.
 * « Ajuster » garde sa fonction : tu ajoutes des muscles a la seance (enregistres dans training.muscles, comme
 * avant). Ceux de tes exercices restent comptes. Seance sans series (combat, course) : les muscles de son sport.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { updateTraining } from '@/lib/database';
import type { Training } from '@/lib/database';
import { ALL_MUSCLES, musclesOf } from '@/lib/v2/seances/muscles';
import type { MuscleId } from '@/lib/v2/seances/muscles';
import { CompteurMuscles, musclePrecis } from '@/lib/v2/seances/musclesExercices';
import type { MusclePrecis } from '@/lib/v2/seances/musclesExercices';
import { exercisesOf } from '@/lib/v2/trainingWeek';
import { MusclesSemaine } from './MusclesSemaine';
import { Chip, tap } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Props = {
  sport: string;
  customMuscles?: string;
  /** les exercices de la seance (tableau ou texte JSON, comme training.exercises) */
  exercises?: Training['exercises'];
  trainingId?: number;
  onMusclesUpdated?: (muscles: string) => void;
};

const lire = (s: string | undefined | null): string[] => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export function MuscleWorked({ sport, customMuscles, exercises, trainingId, onMusclesUpdated }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // ce qui est enregistre : ids des puces ou ids de la seance en direct (abdos, jambes...), lus par musclePrecis
  const [choisis, setChoisis] = useState<string[]>(() => lire(customMuscles));
  const [editing, setEditing] = useState(false);
  const [largeur, setLargeur] = useState(0);

  const { bilan, depuisExos } = useMemo(() => {
    const exos = exercisesOf({ exercises } as Training);
    const seuls = new CompteurMuscles();
    seuls.exercices(exos);
    const deExos = seuls.bilan();
    const c2 = new CompteurMuscles();
    const avec = c2.exercices(exos);
    const manuels = choisis.map(musclePrecis).filter((m): m is MusclePrecis => !!m);
    if (avec) {
      // un muscle ajoute a la main dont le groupe est deja compte par les exercices n'allume rien de plus
      const comptes = new Set(deExos.loads.filter((l) => l.sets > 0).map((l) => l.name));
      c2.choisir(manuels.filter((m) => !comptes.has(m.groupe)));
    } else if (manuels.length) {
      c2.choisir(manuels);
    } else {
      // seance sans series : les muscles de son sport, comme avant
      const ids = new Set<string>(musclesOf(sport));
      c2.choisir(ALL_MUSCLES.filter((m) => ids.has(m.id)).map((m) => musclePrecis(m.id)).filter((m): m is MusclePrecis => !!m));
    }
    return { bilan: c2.bilan(), depuisExos: new Set<MuscleId>(deExos.ids) };
  }, [exercises, choisis, sport]);

  const idsManuels = useMemo(() => new Set(choisis.map((x) => musclePrecis(x)?.id).filter(Boolean) as MuscleId[]), [choisis]);

  const toggle = (id: MuscleId) => {
    if (depuisExos.has(id)) return;
    const next = idsManuels.has(id) ? choisis.filter((x) => musclePrecis(x)?.id !== id) : [...choisis, id];
    setChoisis(next);
    const str = next.join(',');
    onMusclesUpdated?.(str);
    if (trainingId) updateTraining(trainingId, { muscles: str }).catch(() => {});
  };

  const n = bilan.nombre;

  return (
    <View
      onLayout={(e) => setLargeur(Math.round(e.nativeEvent.layout.width))}
      style={{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, padding: 16, gap: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={17} weight="black" tight>{traduire('Muscles travaillés')}</Ink>
          <Ink size={12} color={c.textSecondary}>{n ? traduirePluriel(n, n > 1, '{0} muscle sollicité', '{0} muscles sollicités', n) : traduire('aucun muscle choisi')}</Ink>
        </View>
        <Pressable
          onPress={() => { tap(); setEditing((v) => !v); }}
          accessibilityRole="button"
          accessibilityLabel={editing ? traduire('Terminer le réglage des muscles') : traduire('Ajuster les muscles travaillés')}
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: editing ? c.ink : P.white, borderWidth: editing ? 0 : 1, borderColor: c.border }}
        >
          <Ink size={13} weight="extraBold" color={editing ? P.paper : c.ink}>{editing ? traduire('Terminé') : 'Ajuster'}</Ink>
        </Pressable>
      </View>

      {largeur > 0 ? (
        n > 0 ? (
          <MusclesSemaine loads={bilan.loads} zones={bilan.zones} largeur={largeur - 32} />
        ) : (
          <Ink size={13} color={c.textMuted}>{traduire('Touche Ajuster pour choisir les muscles de ta séance.')}</Ink>
        )
      ) : null}

      {editing ? (
        <View style={{ gap: 8 }}>
          {depuisExos.size ? <Ink size={12} color={c.textSecondary}>{traduire('Les muscles de tes exercices sont toujours comptés.')}</Ink> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ALL_MUSCLES.map((m) => (
              <Chip key={m.id} label={traduire(m.label)} on={depuisExos.has(m.id) || idsManuels.has(m.id)} onPress={() => toggle(m.id)} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
