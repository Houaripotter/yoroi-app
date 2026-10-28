/**
 * « Mes séances » à la fin d'une séance et dans son détail (25 octobre 2026).
 * Selon le cas, une seule carte :
 * 1. séance lancée depuis Mes séances, exercices changés : « Mettre à jour » ta séance enregistrée ;
 * 2. séance lancée depuis Mes séances, rien de changé : rappel discret « Dans Mes séances » ;
 * 3. mêmes exercices qu'une séance déjà enregistrée : rappel discret ;
 * 4. sinon : « Enregistrer cette séance », avec un nom proposé (les deux muscles les plus travaillés).
 * Rien pour une séance sans exercices (combat, cardio).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { illustration } from '@/components/yoroi/v2/stickers';
import { useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { NomSeanceSheet } from '@/components/yoroi/v2/seance/NomSeance';
import { getTrainingById } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { chargerMesSeances, creerMaSeance, differencesExos, exosDepuisSeance, fusionnerExos, memesExos, modifierMaSeance, nomParDefaut, seanceIdentique } from '@/lib/v2/seance/mesSeances';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import type { ExoSeance, MaSeance } from '@/lib/v2/seance/mesSeances';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

type Etat =
  | { cas: 'rien' }
  | { cas: 'changee'; seance: MaSeance }
  | { cas: 'dedans'; seance: MaSeance }
  | { cas: 'nouvelle' }
  | { cas: 'enregistree'; nom: string }
  | { cas: 'ajour'; nom: string };

export function EnregistrerSeance({ trainingId, maSeanceId, marge = 22 }: { trainingId: number; maSeanceId?: string; marge?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ cas: 'rien' });
  const [exos, setExos] = useState<ExoSeance[]>([]);
  const [sport, setSport] = useState('musculation');
  const [noms, setNoms] = useState<string[]>([]);
  const [nommer, setNommer] = useState(false);
  // un seul enregistrement, meme avec deux appuis rapproches
  const enCours = useRef(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const [t, liste] = await Promise.all([getTrainingById(trainingId), chargerMesSeances()]);
        const e = exosDepuisSeance(t?.exercises);
        if (!vivant || !t || e.length === 0) return;
        setExos(e);
        setSport(String(t.sport || 'musculation').split(',')[0].trim() || 'musculation');
        setNoms(liste.map((s) => s.nom));
        const origine = maSeanceId ? liste.find((s) => s.id === maSeanceId) : undefined;
        if (origine) setEtat(memesExos(origine.exos, e) ? { cas: 'dedans', seance: origine } : { cas: 'changee', seance: origine });
        else {
          const meme = seanceIdentique(liste, e);
          setEtat(meme ? { cas: 'dedans', seance: meme } : { cas: 'nouvelle' });
        }
      } catch (err) {
        logger.warn('Mes séances indisponibles', err);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [trainingId, maSeanceId]);

  const voir = () => router.push('/mes-seances' as any);
  const enregistrer = async (nom: string) => {
    if (enCours.current) return;
    enCours.current = true;
    setNommer(false);
    try {
      const s = await creerMaSeance(nom, sport, exos);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setEtat({ cas: 'enregistree', nom: s.nom });
    } catch (err) {
      enCours.current = false;
      logger.warn('Séance non enregistrée dans Mes séances', err);
    }
  };
  const mettreAJour = async (s: MaSeance) => {
    if (enCours.current) return;
    enCours.current = true;
    try {
      await modifierMaSeance(s.id, { exos: fusionnerExos(s.exos, exos) });
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setEtat({ cas: 'ajour', nom: s.nom });
    } catch (err) {
      enCours.current = false;
      logger.warn('Séance non mise à jour', err);
    }
  };

  // la feuille du nom reste montee quoi qu'il arrive : la demonter pendant sa fermeture bloque l'ecran sur iPhone
  const feuille = (
    <NomSeanceSheet
      visible={nommer}
      titre={traduire('Nomme ta séance')}
      nomInitial={nomParDefaut(exos, noms)}
      action={traduire('Enregistrer dans Mes séances')}
      onClose={() => setNommer(false)}
      onValider={enregistrer}
    />
  );

  if (etat.cas === 'rien') return null;

  // les rappels discrets : une ligne, et le lien vers la liste
  if (etat.cas === 'dedans' || etat.cas === 'enregistree' || etat.cas === 'ajour') {
    const texte =
      etat.cas === 'dedans'
        ? traduire('Dans Mes séances : {0}', etat.seance.nom)
        : etat.cas === 'enregistree'
          ? traduire('Enregistrée dans Mes séances : {0}', etat.nom)
          : traduire('{0} est à jour', etat.nom);
    return (
      <>
      <Pressable
        onPress={voir}
        accessibilityRole="button"
        accessibilityLabel={`${texte}. ${traduire('Voir Mes séances')}`}
        style={({ pressed }) => ({ marginHorizontal: marge, marginTop: 14, minHeight: 56, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.successTint })}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={17} color={c.onAccent} strokeWidth={2.8} />
        </View>
        <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{texte}</Ink>
        <Ink size={13} weight="extraBold" color={c.accent}>{traduire('Voir')}</Ink>
      </Pressable>
      {feuille}
      </>
    );
  }

  const changee = etat.cas === 'changee' ? etat.seance : null;
  const nbSeries = exos.reduce((n, e) => n + e.series, 0);
  // ce qui a change, dit clairement : « Nouveau : Leg Extension. Pas fait : Dips Banc. »
  const diff = changee ? differencesExos(changee.exos, exos) : null;
  const lignesDiff = diff
    ? [
        diff.ajoutes.length ? traduire('Nouveau : {0}.', diff.ajoutes.map((n) => traduire(nomFr(n))).join(', ')) : '',
        diff.retires.length ? traduire('Pas fait : {0}.', diff.retires.map((n) => traduire(nomFr(n))).join(', ')) : '',
        !diff.ajoutes.length && !diff.retires.length ? traduire('L’ordre des exercices a changé.') : '',
      ].filter(Boolean).join(' ')
    : '';
  // meme forme que le rappel (un element, puis la feuille) : la feuille garde sa place et n'est jamais demontee
  return (
    <>
    <View style={{ ...carteBlanche(c.surface, c.divider), marginHorizontal: marge, marginTop: 18, borderRadius: 22, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Image source={illustration(changee ? 'refresh' : 'carnet')} style={{ width: 48, height: 48 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={17} weight="black" tight>{changee ? traduire('Tu as changé {0}', changee.nom) : traduire('À refaire en un appui')}</Ink>
          <Ink size={13} color={c.textSecondary}>
            {changee
              ? `${lignesDiff} ${traduire('Garder ces exercices pour la prochaine fois ?')}`
              : traduirePluriel(exos.length, exos.length > 1, '{0} exercice, {1} séries. Garde ta séance dans Mes séances, avec un nom à toi.', '{0} exercices, {1} séries. Garde ta séance dans Mes séances, avec un nom à toi.', exos.length, nbSeries)}
          </Ink>
        </View>
      </View>
      {changee ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => setEtat({ cas: 'dedans', seance: changee })} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
            <Ink size={14} weight="extraBold">{traduire('Garder comme avant')}</Ink>
          </Pressable>
          <BoutonPrincipal onPress={() => mettreAJour(changee)} label={traduire('Mettre à jour')} hauteur={50} tailleTexte={14} compact style={{ flex: 1 }} />
        </View>
      ) : (
        <BoutonPrincipal onPress={() => setNommer(true)} label={traduire('Enregistrer cette séance')} hauteur={54} rayon={20} tailleTexte={15} icone={(col) => <Icon name="bookmark" size={18} color={col} />} />
      )}
    </View>
    {feuille}
    </>
  );
}
