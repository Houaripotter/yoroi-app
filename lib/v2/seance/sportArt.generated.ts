/**
 * Fichier ecrit par genSportVisuals.py, ne pas modifier a la main.
 * Table des illustrations de sport presentes sur le disque (require statiques pour Metro).
 */
import type { ImageSourcePropType } from 'react-native';

export type ArtSet = { h: ImageSourcePropType[]; f: ImageSourcePropType[] };

export const SPORT_ART: Record<string, ArtSet> = {
  aikido: {
    h: [require('@/assets/avatars/app/sports/aikido/aikido_h_1.webp'), require('@/assets/avatars/app/sports/aikido/aikido_h_2.webp'), require('@/assets/avatars/app/sports/aikido/aikido_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/aikido/aikido_f_1.webp'), require('@/assets/avatars/app/sports/aikido/aikido_f_2.webp'), require('@/assets/avatars/app/sports/aikido/aikido_f_3.webp')],
  },
  aviron: {
    h: [require('@/assets/avatars/app/sports/aviron/aviron_h_1.webp'), require('@/assets/avatars/app/sports/aviron/aviron_h_2.webp'), require('@/assets/avatars/app/sports/aviron/aviron_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/aviron/aviron_f_1.webp'), require('@/assets/avatars/app/sports/aviron/aviron_f_2.webp'), require('@/assets/avatars/app/sports/aviron/aviron_f_3.webp')],
  },
  badminton: {
    h: [require('@/assets/avatars/app/sports/badminton/badminton_h_1.webp'), require('@/assets/avatars/app/sports/badminton/badminton_h_2.webp'), require('@/assets/avatars/app/sports/badminton/badminton_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/badminton/badminton_f_1.webp'), require('@/assets/avatars/app/sports/badminton/badminton_f_2.webp'), require('@/assets/avatars/app/sports/badminton/badminton_f_3.webp')],
  },
  basketball: {
    h: [require('@/assets/avatars/app/sports/basketball/basketball_h_1.webp'), require('@/assets/avatars/app/sports/basketball/basketball_h_2.webp'), require('@/assets/avatars/app/sports/basketball/basketball_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/basketball/basketball_f_1.webp'), require('@/assets/avatars/app/sports/basketball/basketball_f_2.webp'), require('@/assets/avatars/app/sports/basketball/basketball_f_3.webp')],
  },
  boxe: {
    h: [require('@/assets/avatars/app/sports/boxe/boxe_h_1.webp'), require('@/assets/avatars/app/sports/boxe/boxe_h_2.webp'), require('@/assets/avatars/app/sports/boxe/boxe_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/boxe/boxe_f_1.webp'), require('@/assets/avatars/app/sports/boxe/boxe_f_2.webp'), require('@/assets/avatars/app/sports/boxe/boxe_f_3.webp')],
  },
  boxe_francaise: {
    h: [require('@/assets/avatars/app/sports/boxe_francaise/boxe_francaise_h_1.webp'), require('@/assets/avatars/app/sports/boxe_francaise/boxe_francaise_h_2.webp'), require('@/assets/avatars/app/sports/boxe_francaise/boxe_francaise_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/boxe_francaise/boxe_francaise_f_1.webp'), require('@/assets/avatars/app/sports/boxe_francaise/boxe_francaise_f_2.webp'), require('@/assets/avatars/app/sports/boxe_francaise/boxe_francaise_f_3.webp')],
  },
  capoeira: {
    h: [require('@/assets/avatars/app/sports/capoeira/capoeira_h_1.webp'), require('@/assets/avatars/app/sports/capoeira/capoeira_h_2.webp'), require('@/assets/avatars/app/sports/capoeira/capoeira_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/capoeira/capoeira_f_1.webp'), require('@/assets/avatars/app/sports/capoeira/capoeira_f_2.webp'), require('@/assets/avatars/app/sports/capoeira/capoeira_f_3.webp')],
  },
  course: {
    h: [require('@/assets/avatars/app/sports/course/course_h_1.webp'), require('@/assets/avatars/app/sports/course/course_h_2.webp'), require('@/assets/avatars/app/sports/course/course_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/course/course_f_1.webp'), require('@/assets/avatars/app/sports/course/course_f_2.webp'), require('@/assets/avatars/app/sports/course/course_f_3.webp')],
  },
  crosstraining: {
    h: [require('@/assets/avatars/app/sports/crosstraining/crosstraining_h_1.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_h_2.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/crosstraining/crosstraining_f_1.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_f_2.webp'), require('@/assets/avatars/app/sports/crosstraining/crosstraining_f_3.webp')],
  },
  danse: {
    h: [require('@/assets/avatars/app/sports/danse/danse_h_1.webp'), require('@/assets/avatars/app/sports/danse/danse_h_2.webp'), require('@/assets/avatars/app/sports/danse/danse_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/danse/danse_f_1.webp'), require('@/assets/avatars/app/sports/danse/danse_f_2.webp'), require('@/assets/avatars/app/sports/danse/danse_f_3.webp')],
  },
  escalade: {
    h: [require('@/assets/avatars/app/sports/escalade/escalade_h_1.webp'), require('@/assets/avatars/app/sports/escalade/escalade_h_2.webp'), require('@/assets/avatars/app/sports/escalade/escalade_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/escalade/escalade_f_1.webp'), require('@/assets/avatars/app/sports/escalade/escalade_f_2.webp'), require('@/assets/avatars/app/sports/escalade/escalade_f_3.webp')],
  },
  fitness: {
    h: [require('@/assets/avatars/app/sports/fitness/fitness_h_1.webp'), require('@/assets/avatars/app/sports/fitness/fitness_h_2.webp'), require('@/assets/avatars/app/sports/fitness/fitness_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/fitness/fitness_f_1.webp'), require('@/assets/avatars/app/sports/fitness/fitness_f_2.webp'), require('@/assets/avatars/app/sports/fitness/fitness_f_3.webp')],
  },
  football: {
    h: [require('@/assets/avatars/app/sports/football/football_h_1.webp'), require('@/assets/avatars/app/sports/football/football_h_2.webp'), require('@/assets/avatars/app/sports/football/football_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/football/football_f_1.webp'), require('@/assets/avatars/app/sports/football/football_f_2.webp'), require('@/assets/avatars/app/sports/football/football_f_3.webp')],
  },
  golf: {
    h: [require('@/assets/avatars/app/sports/golf/golf_h_1.webp'), require('@/assets/avatars/app/sports/golf/golf_h_2.webp'), require('@/assets/avatars/app/sports/golf/golf_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/golf/golf_f_1.webp'), require('@/assets/avatars/app/sports/golf/golf_f_2.webp'), require('@/assets/avatars/app/sports/golf/golf_f_3.webp')],
  },
  grappling: {
    h: [require('@/assets/avatars/app/sports/grappling/grappling_h_1.webp'), require('@/assets/avatars/app/sports/grappling/grappling_h_2.webp'), require('@/assets/avatars/app/sports/grappling/grappling_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/grappling/grappling_f_1.webp'), require('@/assets/avatars/app/sports/grappling/grappling_f_2.webp'), require('@/assets/avatars/app/sports/grappling/grappling_f_3.webp')],
  },
  halterophilie: {
    h: [require('@/assets/avatars/app/sports/halterophilie/halterophilie_h_1.webp'), require('@/assets/avatars/app/sports/halterophilie/halterophilie_h_2.webp'), require('@/assets/avatars/app/sports/halterophilie/halterophilie_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/halterophilie/halterophilie_f_1.webp'), require('@/assets/avatars/app/sports/halterophilie/halterophilie_f_2.webp'), require('@/assets/avatars/app/sports/halterophilie/halterophilie_f_3.webp')],
  },
  handball: {
    h: [require('@/assets/avatars/app/sports/handball/handball_h_1.webp'), require('@/assets/avatars/app/sports/handball/handball_h_2.webp'), require('@/assets/avatars/app/sports/handball/handball_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/handball/handball_f_1.webp'), require('@/assets/avatars/app/sports/handball/handball_f_2.webp'), require('@/assets/avatars/app/sports/handball/handball_f_3.webp')],
  },
  hyrox: {
    h: [require('@/assets/avatars/app/sports/hyrox/hyrox_h_1.webp'), require('@/assets/avatars/app/sports/hyrox/hyrox_h_2.webp'), require('@/assets/avatars/app/sports/hyrox/hyrox_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/hyrox/hyrox_f_1.webp'), require('@/assets/avatars/app/sports/hyrox/hyrox_f_2.webp'), require('@/assets/avatars/app/sports/hyrox/hyrox_f_3.webp')],
  },
  jjb: {
    h: [require('@/assets/avatars/app/sports/jjb/jjb_h_1.webp'), require('@/assets/avatars/app/sports/jjb/jjb_h_2.webp'), require('@/assets/avatars/app/sports/jjb/jjb_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/jjb/jjb_f_1.webp'), require('@/assets/avatars/app/sports/jjb/jjb_f_2.webp'), require('@/assets/avatars/app/sports/jjb/jjb_f_3.webp')],
  },
  judo: {
    h: [require('@/assets/avatars/app/sports/judo/judo_h_1.webp'), require('@/assets/avatars/app/sports/judo/judo_h_2.webp'), require('@/assets/avatars/app/sports/judo/judo_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/judo/judo_f_1.webp'), require('@/assets/avatars/app/sports/judo/judo_f_2.webp'), require('@/assets/avatars/app/sports/judo/judo_f_3.webp')],
  },
  karate: {
    h: [require('@/assets/avatars/app/sports/karate/karate_h_1.webp'), require('@/assets/avatars/app/sports/karate/karate_h_2.webp'), require('@/assets/avatars/app/sports/karate/karate_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/karate/karate_f_1.webp'), require('@/assets/avatars/app/sports/karate/karate_f_2.webp'), require('@/assets/avatars/app/sports/karate/karate_f_3.webp')],
  },
  kayak: {
    h: [require('@/assets/avatars/app/sports/kayak/kayak_h_1.webp'), require('@/assets/avatars/app/sports/kayak/kayak_h_2.webp'), require('@/assets/avatars/app/sports/kayak/kayak_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/kayak/kayak_f_1.webp'), require('@/assets/avatars/app/sports/kayak/kayak_f_2.webp'), require('@/assets/avatars/app/sports/kayak/kayak_f_3.webp')],
  },
  kickboxing: {
    h: [require('@/assets/avatars/app/sports/kickboxing/kickboxing_h_1.webp'), require('@/assets/avatars/app/sports/kickboxing/kickboxing_h_2.webp'), require('@/assets/avatars/app/sports/kickboxing/kickboxing_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/kickboxing/kickboxing_f_1.webp'), require('@/assets/avatars/app/sports/kickboxing/kickboxing_f_2.webp'), require('@/assets/avatars/app/sports/kickboxing/kickboxing_f_3.webp')],
  },
  krav_maga: {
    h: [require('@/assets/avatars/app/sports/krav_maga/krav_maga_h_1.webp'), require('@/assets/avatars/app/sports/krav_maga/krav_maga_h_2.webp'), require('@/assets/avatars/app/sports/krav_maga/krav_maga_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/krav_maga/krav_maga_f_1.webp'), require('@/assets/avatars/app/sports/krav_maga/krav_maga_f_2.webp'), require('@/assets/avatars/app/sports/krav_maga/krav_maga_f_3.webp')],
  },
  kung_fu: {
    h: [require('@/assets/avatars/app/sports/kung_fu/kung_fu_h_1.webp'), require('@/assets/avatars/app/sports/kung_fu/kung_fu_h_2.webp'), require('@/assets/avatars/app/sports/kung_fu/kung_fu_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/kung_fu/kung_fu_f_1.webp'), require('@/assets/avatars/app/sports/kung_fu/kung_fu_f_2.webp'), require('@/assets/avatars/app/sports/kung_fu/kung_fu_f_3.webp')],
  },
  lutte: {
    h: [require('@/assets/avatars/app/sports/lutte/lutte_h_1.webp'), require('@/assets/avatars/app/sports/lutte/lutte_h_2.webp'), require('@/assets/avatars/app/sports/lutte/lutte_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/lutte/lutte_f_1.webp'), require('@/assets/avatars/app/sports/lutte/lutte_f_2.webp'), require('@/assets/avatars/app/sports/lutte/lutte_f_3.webp')],
  },
  marche: {
    h: [require('@/assets/avatars/app/sports/marche/marche_h_1.webp'), require('@/assets/avatars/app/sports/marche/marche_h_2.webp'), require('@/assets/avatars/app/sports/marche/marche_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/marche/marche_f_1.webp'), require('@/assets/avatars/app/sports/marche/marche_f_2.webp'), require('@/assets/avatars/app/sports/marche/marche_f_3.webp')],
  },
  mma: {
    h: [require('@/assets/avatars/app/sports/mma/mma_h_1.webp'), require('@/assets/avatars/app/sports/mma/mma_h_2.webp'), require('@/assets/avatars/app/sports/mma/mma_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/mma/mma_f_1.webp'), require('@/assets/avatars/app/sports/mma/mma_f_2.webp'), require('@/assets/avatars/app/sports/mma/mma_f_3.webp')],
  },
  muay_thai: {
    h: [require('@/assets/avatars/app/sports/muay_thai/muay_thai_h_1.webp'), require('@/assets/avatars/app/sports/muay_thai/muay_thai_h_2.webp'), require('@/assets/avatars/app/sports/muay_thai/muay_thai_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/muay_thai/muay_thai_f_1.webp'), require('@/assets/avatars/app/sports/muay_thai/muay_thai_f_2.webp'), require('@/assets/avatars/app/sports/muay_thai/muay_thai_f_3.webp')],
  },
  musculation: {
    h: [require('@/assets/avatars/app/sports/musculation/musculation_h_1.webp'), require('@/assets/avatars/app/sports/musculation/musculation_h_2.webp'), require('@/assets/avatars/app/sports/musculation/musculation_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/musculation/musculation_f_1.webp'), require('@/assets/avatars/app/sports/musculation/musculation_f_2.webp'), require('@/assets/avatars/app/sports/musculation/musculation_f_3.webp')],
  },
  natation: {
    h: [require('@/assets/avatars/app/sports/natation/natation_h_1.webp'), require('@/assets/avatars/app/sports/natation/natation_h_2.webp'), require('@/assets/avatars/app/sports/natation/natation_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/natation/natation_f_1.webp'), require('@/assets/avatars/app/sports/natation/natation_f_2.webp'), require('@/assets/avatars/app/sports/natation/natation_f_3.webp')],
  },
  padel: {
    h: [require('@/assets/avatars/app/sports/padel/padel_h_1.webp'), require('@/assets/avatars/app/sports/padel/padel_h_2.webp'), require('@/assets/avatars/app/sports/padel/padel_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/padel/padel_f_1.webp'), require('@/assets/avatars/app/sports/padel/padel_f_2.webp'), require('@/assets/avatars/app/sports/padel/padel_f_3.webp')],
  },
  pilates: {
    h: [require('@/assets/avatars/app/sports/pilates/pilates_h_1.webp'), require('@/assets/avatars/app/sports/pilates/pilates_h_2.webp'), require('@/assets/avatars/app/sports/pilates/pilates_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/pilates/pilates_f_1.webp'), require('@/assets/avatars/app/sports/pilates/pilates_f_2.webp'), require('@/assets/avatars/app/sports/pilates/pilates_f_3.webp')],
  },
  rameur: {
    h: [require('@/assets/avatars/app/sports/rameur/rameur_h_1.webp'), require('@/assets/avatars/app/sports/rameur/rameur_h_2.webp'), require('@/assets/avatars/app/sports/rameur/rameur_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/rameur/rameur_f_1.webp'), require('@/assets/avatars/app/sports/rameur/rameur_f_2.webp'), require('@/assets/avatars/app/sports/rameur/rameur_f_3.webp')],
  },
  randonnee: {
    h: [require('@/assets/avatars/app/sports/randonnee/randonnee_h_1.webp'), require('@/assets/avatars/app/sports/randonnee/randonnee_h_2.webp'), require('@/assets/avatars/app/sports/randonnee/randonnee_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/randonnee/randonnee_f_1.webp'), require('@/assets/avatars/app/sports/randonnee/randonnee_f_2.webp'), require('@/assets/avatars/app/sports/randonnee/randonnee_f_3.webp')],
  },
  rugby: {
    h: [require('@/assets/avatars/app/sports/rugby/rugby_h_1.webp'), require('@/assets/avatars/app/sports/rugby/rugby_h_2.webp'), require('@/assets/avatars/app/sports/rugby/rugby_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/rugby/rugby_f_1.webp'), require('@/assets/avatars/app/sports/rugby/rugby_f_2.webp'), require('@/assets/avatars/app/sports/rugby/rugby_f_3.webp')],
  },
  sambo: {
    h: [require('@/assets/avatars/app/sports/sambo/sambo_h_1.webp'), require('@/assets/avatars/app/sports/sambo/sambo_h_2.webp'), require('@/assets/avatars/app/sports/sambo/sambo_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/sambo/sambo_f_1.webp'), require('@/assets/avatars/app/sports/sambo/sambo_f_2.webp'), require('@/assets/avatars/app/sports/sambo/sambo_f_3.webp')],
  },
  ski: {
    h: [require('@/assets/avatars/app/sports/ski/ski_h_1.webp'), require('@/assets/avatars/app/sports/ski/ski_h_2.webp'), require('@/assets/avatars/app/sports/ski/ski_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/ski/ski_f_1.webp'), require('@/assets/avatars/app/sports/ski/ski_f_2.webp'), require('@/assets/avatars/app/sports/ski/ski_f_3.webp')],
  },
  spinning: {
    h: [require('@/assets/avatars/app/sports/spinning/spinning_h_1.webp'), require('@/assets/avatars/app/sports/spinning/spinning_h_2.webp'), require('@/assets/avatars/app/sports/spinning/spinning_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/spinning/spinning_f_1.webp'), require('@/assets/avatars/app/sports/spinning/spinning_f_2.webp'), require('@/assets/avatars/app/sports/spinning/spinning_f_3.webp')],
  },
  street_workout: {
    h: [require('@/assets/avatars/app/sports/street_workout/street_workout_h_1.webp'), require('@/assets/avatars/app/sports/street_workout/street_workout_h_2.webp'), require('@/assets/avatars/app/sports/street_workout/street_workout_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/street_workout/street_workout_f_1.webp'), require('@/assets/avatars/app/sports/street_workout/street_workout_f_2.webp'), require('@/assets/avatars/app/sports/street_workout/street_workout_f_3.webp')],
  },
  sumo: {
    h: [require('@/assets/avatars/app/sports/sumo/sumo_h_1.webp'), require('@/assets/avatars/app/sports/sumo/sumo_h_2.webp'), require('@/assets/avatars/app/sports/sumo/sumo_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/sumo/sumo_f_1.webp'), require('@/assets/avatars/app/sports/sumo/sumo_f_2.webp'), require('@/assets/avatars/app/sports/sumo/sumo_f_3.webp')],
  },
  surf: {
    h: [require('@/assets/avatars/app/sports/surf/surf_h_1.webp'), require('@/assets/avatars/app/sports/surf/surf_h_2.webp'), require('@/assets/avatars/app/sports/surf/surf_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/surf/surf_f_1.webp'), require('@/assets/avatars/app/sports/surf/surf_f_2.webp'), require('@/assets/avatars/app/sports/surf/surf_f_3.webp')],
  },
  taekwondo: {
    h: [require('@/assets/avatars/app/sports/taekwondo/taekwondo_h_1.webp'), require('@/assets/avatars/app/sports/taekwondo/taekwondo_h_2.webp'), require('@/assets/avatars/app/sports/taekwondo/taekwondo_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/taekwondo/taekwondo_f_1.webp'), require('@/assets/avatars/app/sports/taekwondo/taekwondo_f_2.webp'), require('@/assets/avatars/app/sports/taekwondo/taekwondo_f_3.webp')],
  },
  tennis: {
    h: [require('@/assets/avatars/app/sports/tennis/tennis_h_1.webp'), require('@/assets/avatars/app/sports/tennis/tennis_h_2.webp'), require('@/assets/avatars/app/sports/tennis/tennis_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/tennis/tennis_f_1.webp'), require('@/assets/avatars/app/sports/tennis/tennis_f_2.webp'), require('@/assets/avatars/app/sports/tennis/tennis_f_3.webp')],
  },
  trail: {
    h: [require('@/assets/avatars/app/sports/trail/trail_h_1.webp'), require('@/assets/avatars/app/sports/trail/trail_h_2.webp'), require('@/assets/avatars/app/sports/trail/trail_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/trail/trail_f_1.webp'), require('@/assets/avatars/app/sports/trail/trail_f_2.webp'), require('@/assets/avatars/app/sports/trail/trail_f_3.webp')],
  },
  velo: {
    h: [require('@/assets/avatars/app/sports/velo/velo_h_1.webp'), require('@/assets/avatars/app/sports/velo/velo_h_2.webp'), require('@/assets/avatars/app/sports/velo/velo_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/velo/velo_f_1.webp'), require('@/assets/avatars/app/sports/velo/velo_f_2.webp'), require('@/assets/avatars/app/sports/velo/velo_f_3.webp')],
  },
  volleyball: {
    h: [require('@/assets/avatars/app/sports/volleyball/volleyball_h_1.webp'), require('@/assets/avatars/app/sports/volleyball/volleyball_h_2.webp'), require('@/assets/avatars/app/sports/volleyball/volleyball_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/volleyball/volleyball_f_1.webp'), require('@/assets/avatars/app/sports/volleyball/volleyball_f_2.webp'), require('@/assets/avatars/app/sports/volleyball/volleyball_f_3.webp')],
  },
  vtt: {
    h: [require('@/assets/avatars/app/sports/vtt/vtt_h_1.webp'), require('@/assets/avatars/app/sports/vtt/vtt_h_2.webp'), require('@/assets/avatars/app/sports/vtt/vtt_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/vtt/vtt_f_1.webp'), require('@/assets/avatars/app/sports/vtt/vtt_f_2.webp'), require('@/assets/avatars/app/sports/vtt/vtt_f_3.webp')],
  },
  yoga: {
    h: [require('@/assets/avatars/app/sports/yoga/yoga_h_1.webp'), require('@/assets/avatars/app/sports/yoga/yoga_h_2.webp'), require('@/assets/avatars/app/sports/yoga/yoga_h_3.webp')],
    f: [require('@/assets/avatars/app/sports/yoga/yoga_f_1.webp'), require('@/assets/avatars/app/sports/yoga/yoga_f_2.webp'), require('@/assets/avatars/app/sports/yoga/yoga_f_3.webp')],
  },
};

export const SPORT_ICONS: Record<string, ImageSourcePropType> = {
  air: require('@/assets/avatars/app/sports/_icones_centre/air.webp'),
  arc: require('@/assets/avatars/app/sports/_icones_centre/arc.webp'),
  ballon: require('@/assets/avatars/app/sports/_icones_centre/ballon.webp'),
  boule: require('@/assets/avatars/app/sports/_icones_centre/boule.webp'),
  cardio: require('@/assets/avatars/app/sports/_icones_centre/cardio.webp'),
  cible: require('@/assets/avatars/app/sports/_icones_centre/cible.webp'),
  danse: require('@/assets/avatars/app/sports/_icones_centre/danse.webp'),
  disque: require('@/assets/avatars/app/sports/_icones_centre/disque.webp'),
  echecs: require('@/assets/avatars/app/sports/_icones_centre/echecs.webp'),
  escrime: require('@/assets/avatars/app/sports/_icones_centre/escrime.webp'),
  football: require('@/assets/avatars/app/sports/_icones_centre/football.webp'),
  golf: require('@/assets/avatars/app/sports/_icones_centre/golf.webp'),
  halteres: require('@/assets/avatars/app/sports/_icones_centre/halteres.webp'),
  jeu: require('@/assets/avatars/app/sports/_icones_centre/jeu.webp'),
  marche: require('@/assets/avatars/app/sports/_icones_centre/marche.webp'),
  medaille: require('@/assets/avatars/app/sports/_icones_centre/medaille.webp'),
  montagne: require('@/assets/avatars/app/sports/_icones_centre/montagne.webp'),
  nage: require('@/assets/avatars/app/sports/_icones_centre/nage.webp'),
  nature: require('@/assets/avatars/app/sports/_icones_centre/nature.webp'),
  neige: require('@/assets/avatars/app/sports/_icones_centre/neige.webp'),
  pagaie: require('@/assets/avatars/app/sports/_icones_centre/pagaie.webp'),
  peche: require('@/assets/avatars/app/sports/_icones_centre/peche.webp'),
  poing: require('@/assets/avatars/app/sports/_icones_centre/poing.webp'),
  raquette: require('@/assets/avatars/app/sports/_icones_centre/raquette.webp'),
  souffle: require('@/assets/avatars/app/sports/_icones_centre/souffle.webp'),
  trophee: require('@/assets/avatars/app/sports/_icones_centre/trophee.webp'),
  velo: require('@/assets/avatars/app/sports/_icones_centre/velo.webp'),
  vitesse: require('@/assets/avatars/app/sports/_icones_centre/vitesse.webp'),
  voile: require('@/assets/avatars/app/sports/_icones_centre/voile.webp'),
  volley: require('@/assets/avatars/app/sports/_icones_centre/volley.webp'),
};
