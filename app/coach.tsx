/**
 * « Ton coach » (26 octobre 2026). Houari : « franchement, il est où le coach ? Tout ce que tu as fait, je ne vois
 * pas où c'est. » Un seul écran, ouvert depuis la pastille « Coach » de l'accueil (Raccourcis.tsx), qui rassemble :
 *  1. la grande carte indigo : sans programme, le questionnaire (4 questions, app/programmes/index.tsx, ?quiz=1) ;
 *     avec un programme, la séance du jour et le mot du coach (coach.ts), « Commencer » (lancer.ts, routeDuJour),
 *     la fin de séance abdos et cardio (FinDeSeance.tsx) et le lien vers le programme ;
 *  2. « Pas envie de programme aujourd'hui ? » : les séances toutes faites (app/programmes/zones.tsx) ;
 *  3. « Tes questions » : poids de départ, séries et répétitions (charge.ts), date d'objectif (app/objectif.tsx),
 *     changer de programme.
 * Rien de nouveau n'est affirmé ici : les textes et les études viennent des fichiers cités.
 * Sans aucune donnée (pas de programme, pas de profil), l'écran marche : la carte propose le questionnaire.
 */
import React, { useCallback, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { BlocReglages, CarteIllustree, EnTeteRond, HeroJour, LigneReglage, SemaineRonds, TuilesStats, musclesDuJour, nomCourt, rondsDeLaSemaine, salutation, tuileCharge, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { FeuilleFinDeSeance, texteFin } from '@/components/yoroi/v2/programmes/FinDeSeance';
import { getProfile, getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { gainMoyen, progresDesCharges } from '@/lib/v2/programmes/progres';
import { jourPourToi } from '@/lib/v2/programmes/perso';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import { COMMENT_CHOISIR, SOURCES_COMMENT_CHOISIR } from '@/lib/v2/programmes/charge';
import { aDesJoursMarche, aDesJoursMuscu } from '@/lib/v2/programmes/finSeance';
import { resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { messageCoach } from '@/lib/v2/programmes/coach';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, enregistrerFin, faitsCetteSemaine, joursDuProgramme, prochainJour, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

// 26 octobre 2026 : les couleurs viennent du thème (c.darkCard, c.onDark), comme « Note ta séance » (app/ajouter.tsx)
// la même illustration que la pastille de l'accueil (corps, zones en rouge)
const CORPS_ZONES: ImageSourcePropType = require('@/assets/avatars/app/ornements/zones_corps.webp');

type Question = { cle: string; titre: string; sous: string; icone: IconName; action: () => void };

export default function CoachScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [femme, setFemme] = useState(false);
  const [poidsOuvert, setPoidsOuvert] = useState(false);
  const [seriesOuvert, setSeriesOuvert] = useState(false);
  const [finOuverte, setFinOuverte] = useState(false);
  // 26 octobre 2026, maquette D aux couleurs de E : ton prénom, tes séances (tuile « Charge »)
  const [nom, setNom] = useState('');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const pal = usePaletteProgramme();

  // relu à chaque retour sur l'écran (après une séance, la carte du jour est à jour) et à chaque changement
  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      const charger = () => {
        chargerProgrammeActif()
          .then((a) => { if (vivant) setActif(a); })
          .catch(() => { if (vivant) setActif(null); });
      };
      charger();
      getProfile().then((pr) => { if (vivant) { setFemme(pr?.avatar_gender === 'femme'); setNom(pr?.name ?? ''); } }).catch(() => {});
      getTrainings().then((t) => { if (vivant) setTrainings(t ?? []); }).catch(() => {});
      const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, charger);
      return () => {
        vivant = false;
        sub.remove();
      };
    }, []),
  );

  const suite = actif ? prochainJour(actif) : null;
  const p = suite?.programme ?? null;
  const jour = suite?.jour ?? null;
  const semaine = actif ? semaineDuProgramme(actif) : 1;
  const jours = actif && p ? joursDuProgramme(actif, p) : [];
  const message = actif && p && jour
    ? messageCoach({ programme: p, actif, jours, prochaineSeance: traduire(jour.titre), femme })
    : null;
  // la séance avec tes changements et tes modules (perso.ts), comme sur la page du programme
  const jourVu = actif && jour ? jourPourToi(jour, null, [], null, actif.remplacements) : null;
  const finPossible = !!p && (aDesJoursMuscu(p) || aDesJoursMarche(p));
  const BLANC = c.onDark;
  const img = sportImage(p ? sportDuProgramme(p) : 'musculation', femme, 1);

  const ouvrirQuiz = () => {
    tap();
    router.push({ pathname: '/programmes' as any, params: { quiz: '1' } });
  };
  const commencer = () => {
    if (!p || !jour) return;
    tap();
    const r = routeDuJour(p, jour, semaine);
    router.push({ pathname: r.pathname as any, params: r.params });
  };

  const questions: Question[] = [
    { cle: 'poids', titre: traduire('Quel poids je prends ?'), sous: traduire('Tu débutes ? Quelle charge prendre, en quatre étapes.'), icone: 'scale', action: () => { tap(); setPoidsOuvert(true); } },
    { cle: 'series', titre: traduire('Combien de séries et de répétitions ?'), sous: traduire('Lourd, moyen ou léger : ce que ça veut dire pour toi.'), icone: 'dumbbell', action: () => { tap(); setSeriesOuvert(true); } },
    { cle: 'objectif', titre: traduire('Quand j’atteindrai mon objectif ?'), sous: traduire('YOROI estime la date d’après tes séances'), icone: 'target', action: () => { tap(); router.push('/objectif' as any); } },
    actif
      ? { cle: 'changer', titre: traduire('Changer de programme'), sous: traduire('4 questions, même si tu n’y connais rien'), icone: 'repeat', action: ouvrirQuiz }
      : { cle: 'tous', titre: traduire('Voir tous les programmes'), sous: traduire('PPL, Upper Lower, Full body : prouvés par des études'), icone: 'list', action: () => { tap(); router.push('/programmes' as any); } },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: pal.page }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: insets.bottom + 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* 26 octobre 2026 : maquette D aux couleurs de E (Habillage.tsx) */}
        <EnTeteRond salut={salutation(nom)} titre={traduire('Ton coach')} repli="/(tabs)" />

        {/* 1. LA GRANDE CARTE : sans programme, le questionnaire ; avec, la séance du jour */}
        {!p || !jour || !message ? (
          <CarteIllustree
            onPress={ouvrirQuiz}
            label={`${traduire('Je te trouve ton programme')}, ${traduire('4 questions, même si tu n’y connais rien')}`}
            surtitre={traduire('PROUVÉ PAR DES ÉTUDES')}
            titre={traduire('Je te trouve ton programme')}
            texte={traduire('4 questions, même si tu n’y connais rien')}
            image={img}
            puces={['PPL', 'Upper Lower', 'Full body'].map((t) => ({ t }))}
            style={{ minHeight: 190 }}
          />
        ) : (
          <>
            <HeroJour
              pastille={
                message.etat === 'rattrape'
                  ? traduire('On rattrape aujourd’hui')
                  : message.etat === 'repos'
                    ? traduire('Jour de repos')
                    : message.etat === 'fait'
                      ? traduire('Séance faite')
                      : traduire('Aujourd’hui')
              }
              nom={nomCourt(traduire(jour.titre))}
              muscles={musclesDuJour(traduire(jour.titre), jourVu?.exos ?? jour.exos)}
              infos={
                jourVu && jourVu.exos.length && !jourVu.rounds && !jourVu.cardio
                  ? `${traduirePluriel(jourVu.exos.length, jourVu.exos.length > 1, '{0} exercice', '{0} exercices', jourVu.exos.length)} · ${traduire('{0} min', p.dureeMin)}`
                  : resumeDuJour(jour, semaine)
              }
              texte={message.texte}
              image={img}
              bouton={
                message.seanceDuJour
                  ? { label: traduire('Commencer'), onPress: commencer, accessibilityLabel: `${traduire('Commencer')}, ${traduire(jour.titre)}` }
                  : { label: traduire('Faire maintenant'), discret: true, onPress: commencer, accessibilityLabel: traduire('Faire la prochaine séance maintenant') }
              }
            >
              {finPossible ? (
                <Pressable
                  onPress={() => { tap(); setFinOuverte(true); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${traduire('Abdos et cardio en fin de séance : {0}', texteFin(actif?.fin))}. ${traduire('Choisir')}`}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 16, backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' })}
                >
                  <Icon name="flame" size={18} color={BLANC} />
                  <Ink size={13} weight="bold" color={BLANC} style={{ flex: 1 }}>{traduire('Abdos et cardio en fin de séance : {0}', texteFin(actif?.fin))}</Ink>
                  <Icon name="chevron" size={16} color={BLANC} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => { tap(); router.push({ pathname: '/programmes/[id]' as any, params: { id: p.id } }); }}
                accessibilityRole="link"
                style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
              >
                <Ink size={14} weight="extraBold" color={BLANC}>{traduire('Voir mon programme')}</Ink>
                <Icon name="chevron" size={15} color={BLANC} />
              </Pressable>
            </HeroJour>

            {actif ? (
              <TuilesStats
                tuiles={[
                  { label: traduire('Semaine'), valeur: String(semaine), sur: String(p.semaines) },
                  { label: traduire('Séances'), valeur: String(faitsCetteSemaine(actif)), sur: String(jours.length), accessibilityLabel: traduire('{0} séances sur {1} cette semaine', faitsCetteSemaine(actif), jours.length) },
                  tuileCharge(gainMoyen(progresDesCharges(p, trainings, actif.debut)), pal, () => router.push({ pathname: '/programmes/[id]' as any, params: { id: p.id } })),
                ]}
              />
            ) : null}

            {actif ? <SemaineRonds ronds={rondsDeLaSemaine(p, actif, jours)} /> : null}
          </>
        )}

        {/* 2. PAS ENVIE DE PROGRAMME : les séances toutes faites, par zone du corps */}
        <Pressable
          onPress={() => { tap(); router.push('/programmes/zones' as any); }}
          accessibilityRole="button"
          accessibilityLabel={`${traduire('Pas envie de programme aujourd’hui ?')} ${traduire('Une séance toute faite, un appui et c’est parti')}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 112, paddingVertical: 16, paddingLeft: 18, paddingRight: 12, borderRadius: 24, backgroundColor: pressed ? c.fillSubtle : c.accentTint, borderWidth: 1.5, borderColor: c.accent, overflow: 'hidden' })}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Ink size={18} weight="black" tight>{traduire('Pas envie de programme aujourd’hui ?')}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Une séance toute faite, un appui et c’est parti')}</Ink>
          </View>
          <Image source={CORPS_ZONES} style={{ width: 72, height: 72 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Icon name="chevron" size={18} color={c.accent} />
        </Pressable>

        {/* 3. TES QUESTIONS : chaque réponse s'ouvre dans l'app */}
        <Ink size={20} weight="black" tight accessibilityRole="header" style={{ marginTop: 8 }}>{traduire('Tes questions')}</Ink>
        <BlocReglages>
          {questions.map((q) => (
            <LigneReglage key={q.cle} titre={q.titre} sous={q.sous} icone={q.icone} onPress={q.action} plein />
          ))}
        </BlocReglages>
      </ScrollView>

      <FeuillePoidsDeDepart visible={poidsOuvert} onClose={() => setPoidsOuvert(false)} />

      {/* séries et répétitions : le même texte et les mêmes études que « Comment choisir ta charge » */}
      <Sheet visible={seriesOuvert} onClose={() => setSeriesOuvert(false)} title={traduire('Combien de séries et de répétitions ?')}>
        <View style={{ gap: 14, paddingHorizontal: 4 }}>
          <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire('Ton programme te donne les séries et la fourchette de répétitions de chaque exercice. Voici comment choisir ta charge.')}</Ink>
          {COMMENT_CHOISIR.map((x) => (
            <View key={x.titre} style={{ gap: 3 }}>
              <Ink size={15} weight="black" tight>{traduire(x.titre)}</Ink>
              <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire(x.texte)}</Ink>
            </View>
          ))}
          <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <Ink size={12} weight="extraBold" color={c.textMuted}>{traduire('LES ÉTUDES')}</Ink>
            {SOURCES_COMMENT_CHOISIR.map((id) => {
              const s = sourceParId(id);
              if (!s) return null;
              return (
                <Pressable key={id} onPress={() => { tap(); void safeOpenURL(s.lien); }} accessibilityRole="link" style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Ink size={12} weight="extraBold" color={c.accent}>{`${s.auteurs}, ${s.annee}`}</Ink>
                  <Ink size={12} color={c.textSecondary}>{traduire(s.apport)}</Ink>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>

      {p ? (
        <FeuilleFinDeSeance
          visible={finOuverte}
          programme={p}
          valeur={actif?.fin}
          bouton={traduire('Valider')}
          onClose={() => setFinOuverte(false)}
          onValider={(f) => {
            setFinOuverte(false);
            void enregistrerFin(f);
          }}
        />
      ) : null}
    </View>
  );
}
