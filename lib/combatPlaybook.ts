// ============================================
// YOROI — Bibliothèque de game plans
// Inspirée des pratiques JJB/IBJJF modernes
// (aucun nom mentionné — juste les plans)
// ============================================

export interface PlaybookEntry {
  id: string;
  text: string;
  description?: string;
  tags?: string[];
  sports: string[];
}

export interface PlaybookCategory {
  id: string;
  label: string;
  emoji: string;
  entries: PlaybookEntry[];
}

// ============================================
// 🎯 GAME PLANS
// ============================================

export const PLAYBOOK_GAMEPLAN: PlaybookCategory[] = [
  // ════════════════════════════════════════
  // 🎬 PETITES PHASES — à assembler (tap → tap → tap)
  // Exemple : "Tire la garde" + "Lasso" + "Sweep" + "Mount" + "Étranglement"
  // ════════════════════════════════════════

  {
    id: 'phase-start',
    label: '🎬 Ouvertures',
    emoji: '🎬',
    entries: [
      { id: 'o-pull-closed', text: 'Tire la garde fermée', sports: ['jjb', 'grappling'] },
      { id: 'o-pull-open', text: 'Tire en garde ouverte', sports: ['jjb', 'grappling'] },
      { id: 'o-pull-half', text: 'Tire en demi-garde', sports: ['jjb', 'grappling'] },
      { id: 'o-pull-butter', text: 'Tire en butterfly', sports: ['jjb', 'grappling'] },
      { id: 'o-sit', text: 'Assis → sit-up guard', sports: ['jjb', 'grappling'] },
      { id: 'o-td-single', text: 'Single leg', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'o-td-double', text: 'Double leg', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'o-ankle', text: 'Ankle pick', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'o-armdrag', text: 'Arm drag', sports: ['jjb', 'grappling'] },
      { id: 'o-duck', text: 'Duck under', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'o-osoto', text: 'O-soto-gari', sports: ['jjb', 'judo'] },
      { id: 'o-uchimata', text: 'Uchi-mata', sports: ['jjb', 'judo'] },
      { id: 'o-seoi', text: 'Seoi-nage', sports: ['jjb', 'judo'] },
      { id: 'o-tomoe', text: 'Tomoe-nage', sports: ['jjb', 'judo', 'grappling'] },
      { id: 'o-bodylock', text: 'Body lock debout', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'o-clinch', text: 'Clinch', sports: ['mma', 'muaythai'] },
      { id: 'o-jab', text: 'Jab setup', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'o-distance', text: 'Gérer la distance', sports: ['mma', 'boxe', 'kickboxing', 'muaythai'] },
    ],
  },

  {
    id: 'phase-guard',
    label: '🛡️ Gardes / positions',
    emoji: '🛡️',
    entries: [
      { id: 'gp-closed', text: 'Garde fermée', sports: ['jjb', 'grappling'] },
      { id: 'gp-open', text: 'Garde ouverte', sports: ['jjb', 'grappling'] },
      { id: 'gp-lasso', text: 'Prise en lasso', sports: ['jjb'] },
      { id: 'gp-spider', text: 'Spider guard', sports: ['jjb'] },
      { id: 'gp-lasso-spider', text: 'Lasso spider', sports: ['jjb'] },
      { id: 'gp-dlr', text: 'De la Riva', sports: ['jjb'] },
      { id: 'gp-rdlr', text: 'Reverse De la Riva', sports: ['jjb'] },
      { id: 'gp-butter', text: 'Butterfly guard', sports: ['jjb', 'grappling'] },
      { id: 'gp-xg', text: 'X-guard', sports: ['jjb', 'grappling'] },
      { id: 'gp-slx', text: 'Single leg X', sports: ['jjb', 'grappling'] },
      { id: 'gp-half', text: 'Demi-garde', sports: ['jjb', 'grappling'] },
      { id: 'gp-deep', text: 'Deep half', sports: ['jjb', 'grappling'] },
      { id: 'gp-worm', text: 'Worm guard', sports: ['jjb'] },
      { id: 'gp-rubber', text: 'Rubber guard', sports: ['jjb', 'grappling'] },
      { id: 'gp-collar', text: 'Collar sleeve', sports: ['jjb'] },
      { id: 'gp-50', text: '50/50', sports: ['jjb', 'grappling'] },
      { id: 'gp-turtle', text: 'Turtle', sports: ['jjb', 'grappling'] },
      { id: 'gp-knee-shield', text: 'Knee shield', sports: ['jjb', 'grappling'] },
      { id: 'gp-z-guard', text: 'Z-guard', sports: ['jjb', 'grappling'] },
      { id: 'gp-ashi', text: 'Ashi garami', sports: ['grappling'] },
      { id: 'gp-saddle', text: 'Saddle (inside sankaku)', sports: ['grappling'] },
    ],
  },

  {
    id: 'phase-action',
    label: '🚪 Actions / transitions',
    emoji: '🚪',
    entries: [
      { id: 'a-sweep', text: 'Sweep', sports: ['jjb', 'grappling'] },
      { id: 'a-scissor', text: 'Scissor sweep', sports: ['jjb', 'grappling'] },
      { id: 'a-pendulum', text: 'Pendulum sweep', sports: ['jjb', 'grappling'] },
      { id: 'a-flower', text: 'Flower sweep', sports: ['jjb', 'grappling'] },
      { id: 'a-hipbump', text: 'Hip bump sweep', sports: ['jjb', 'grappling'] },
      { id: 'a-elevator', text: 'Elevator sweep', sports: ['jjb', 'grappling'] },
      { id: 'a-berim', text: 'Berimbolo', sports: ['jjb'] },
      { id: 'a-kd', text: 'Kiss-of-the-dragon', sports: ['jjb'] },
      { id: 'a-invert', text: 'Invertida', sports: ['jjb'] },
      { id: 'a-kneecut', text: 'Knee cut pass', sports: ['jjb', 'grappling'] },
      { id: 'a-toreando', text: 'Toreando pass', sports: ['jjb', 'grappling'] },
      { id: 'a-overunder', text: 'Over-under pass', sports: ['jjb', 'grappling'] },
      { id: 'a-legdrag', text: 'Leg drag', sports: ['jjb', 'grappling'] },
      { id: 'a-stack', text: 'Stack pass', sports: ['jjb', 'grappling'] },
      { id: 'a-smash', text: 'Smash pass', sports: ['jjb', 'grappling'] },
      { id: 'a-hq', text: 'Headquarters', sports: ['jjb', 'grappling'] },
      { id: 'a-bodylock-pass', text: 'Body lock pass', sports: ['jjb', 'grappling'] },
      { id: 'a-bull', text: 'Bull fighter pass', sports: ['jjb', 'grappling'] },
      { id: 'a-long', text: 'Long step pass', sports: ['jjb', 'grappling'] },
      { id: 'a-dogfight', text: 'Dogfight', sports: ['jjb', 'grappling'] },
      { id: 'a-techstand', text: 'Technical stand-up', sports: ['jjb', 'grappling'] },
      { id: 'a-backtake', text: 'Back take', sports: ['jjb', 'grappling'] },
      { id: 'a-crab', text: 'Crab ride', sports: ['jjb'] },
      { id: 'a-granby', text: 'Granby roll', sports: ['jjb', 'grappling'] },
      { id: 'a-hipescape', text: 'Hip escape', sports: ['jjb', 'grappling'] },
    ],
  },

  {
    id: 'phase-position-top',
    label: '📍 Positions top',
    emoji: '📍',
    entries: [
      { id: 'pt-mount', text: 'Mount', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'pt-highmount', text: 'High mount', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'pt-side', text: 'Side control', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'pt-kesa', text: 'Kesa gatame', sports: ['jjb', 'grappling'] },
      { id: 'pt-north', text: 'North-south', sports: ['jjb', 'grappling'] },
      { id: 'pt-kob', text: 'Knee on belly', sports: ['jjb', 'grappling'] },
      { id: 'pt-back', text: 'Back control', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'pt-bodytri', text: 'Body triangle', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'pt-cross', text: 'Crucifix', sports: ['jjb', 'grappling'] },
    ],
  },

  {
    id: 'phase-finish',
    label: '🏆 Finitions',
    emoji: '🏆',
    entries: [
      { id: 'f-cross', text: 'Cross collar choke', sports: ['jjb'] },
      { id: 'f-ezequiel', text: 'Ezekiel choke', sports: ['jjb'] },
      { id: 'f-bread', text: 'Bread cutter choke', sports: ['jjb'] },
      { id: 'f-bow', text: 'Bow and arrow', sports: ['jjb'] },
      { id: 'f-loop', text: 'Loop choke', sports: ['jjb'] },
      { id: 'f-baseball', text: 'Baseball bat choke', sports: ['jjb'] },
      { id: 'f-paper', text: 'Paper cutter choke', sports: ['jjb'] },
      { id: 'f-brabo', text: 'Brabo choke', sports: ['jjb'] },
      { id: 'f-clock', text: 'Clock choke', sports: ['jjb'] },
      { id: 'f-rnc', text: 'RNC', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-tri', text: 'Triangle', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-armtri', text: 'Arm triangle', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-reartri', text: 'Rear triangle', sports: ['jjb', 'grappling'] },
      { id: 'f-armbar', text: 'Armbar', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-kimura', text: 'Kimura', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-americana', text: 'Americana', sports: ['jjb', 'grappling'] },
      { id: 'f-omo', text: 'Omoplata', sports: ['jjb', 'grappling'] },
      { id: 'f-guil', text: 'Guillotine', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-guil-arm', text: 'Guillotine arm-in', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-marc', text: 'High elbow guillotine (Marcelotine)', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'f-darce', text: "D'Arce choke", sports: ['jjb', 'grappling'] },
      { id: 'f-ana', text: 'Anaconda', sports: ['jjb', 'grappling'] },
      { id: 'f-peru', text: 'Peruvian necktie', sports: ['jjb', 'grappling'] },
      { id: 'f-ns', text: 'North-south choke', sports: ['jjb', 'grappling'] },
      { id: 'f-heel', text: 'Heel hook', sports: ['grappling'] },
      { id: 'f-straight', text: 'Straight ankle lock', sports: ['grappling'] },
      { id: 'f-kneebar', text: 'Kneebar', sports: ['grappling'] },
      { id: 'f-toe', text: 'Toehold', sports: ['grappling'] },
      { id: 'f-etrang', text: 'Étranglement (général)', sports: ['jjb', 'grappling'] },
      { id: 'f-soum', text: 'Soumission', sports: ['jjb', 'grappling', 'mma'] },
    ],
  },

  {
    id: 'phase-strike',
    label: '👊 Striking (petites phases)',
    emoji: '👊',
    entries: [
      { id: 'ps-jab', text: 'Jab', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-cross', text: 'Cross', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-hook', text: 'Hook', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-upp', text: 'Uppercut', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-overhand', text: 'Overhand', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-body', text: 'Body shot', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-12', text: '1-2 (jab-cross)', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-123', text: '1-2-3 (jab-cross-hook)', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'ps-low', text: 'Low kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'ps-calf', text: 'Calf kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'ps-mid', text: 'Middle kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'ps-high', text: 'High kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'ps-teep', text: 'Teep', sports: ['muaythai', 'mma'] },
      { id: 'ps-knee', text: 'Knee', sports: ['muaythai', 'mma'] },
      { id: 'ps-elbow', text: 'Coude', sports: ['muaythai', 'mma'] },
      { id: 'ps-spin', text: 'Spinning attack', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'ps-slip', text: 'Slip + counter', sports: ['boxe', 'mma'] },
      { id: 'ps-roll', text: 'Shoulder roll', sports: ['boxe'] },
      { id: 'ps-pivot', text: 'Pivot out', sports: ['boxe', 'mma'] },
      { id: 'ps-check', text: 'Check kick', sports: ['kickboxing', 'muaythai', 'mma'] },
    ],
  },

  // ─────────────────────────────────
  {
    id: 'jjb-classic',
    label: 'JJB Gi classique',
    emoji: '🥋',
    entries: [
      { id: 'g-closed-cross', text: 'Garde fermée → casser la posture → cross collar choke', sports: ['jjb'] },
      { id: 'g-closed-tri', text: 'Garde fermée → setup triangle', sports: ['jjb', 'grappling'] },
      { id: 'g-closed-armbar', text: 'Garde fermée → armbar depuis grip + pivot', sports: ['jjb', 'grappling'] },
      { id: 'g-closed-omo', text: 'Garde fermée → omoplata', sports: ['jjb', 'grappling'] },
      { id: 'g-closed-hip', text: 'Garde fermée → hip bump sweep', sports: ['jjb', 'grappling'] },
      { id: 'g-closed-sci', text: 'Garde fermée → scissor sweep', sports: ['jjb', 'grappling'] },
      { id: 'g-closed-pend', text: 'Garde fermée → pendulum sweep → mount', sports: ['jjb', 'grappling'] },
      { id: 'g-closed-fl', text: 'Garde fermée → flower sweep', sports: ['jjb', 'grappling'] },
      { id: 'g-ezekiel', text: 'Mount → ezekiel choke', sports: ['jjb'] },
      { id: 'g-mount-arm', text: 'Mount → armbar depuis high mount', sports: ['jjb', 'grappling'] },
      { id: 'g-mount-cross', text: 'Mount → cross collar choke', sports: ['jjb'] },
      { id: 'g-mount-bread', text: 'Mount → bread cutter choke', sports: ['jjb'] },
      { id: 'g-side-arm', text: 'Side control → kimura ou americana', sports: ['jjb', 'grappling'] },
      { id: 'g-side-bh', text: 'Side control → baseball bat choke', sports: ['jjb'] },
      { id: 'g-side-paper', text: 'Side control → paper cutter choke', sports: ['jjb'] },
      { id: 'g-side-brabo', text: 'Side control → brabo choke', sports: ['jjb'] },
    ],
  },

  {
    id: 'jjb-modern-gi',
    label: 'JJB Gi moderne (IBJJF)',
    emoji: '⚡',
    entries: [
      { id: 'g-dlr-bm', text: 'De la Riva → berimbolo → prendre le dos', sports: ['jjb'] },
      { id: 'g-dlr-kd', text: 'De la Riva → kiss-of-the-dragon → back take', sports: ['jjb'] },
      { id: 'g-dlr-inv', text: 'De la Riva → invertida → leg drag', sports: ['jjb'] },
      { id: 'g-rdlr', text: 'Reverse De la Riva → back take', sports: ['jjb'] },
      { id: 'g-spider-tri', text: 'Spider guard → lasso sweep ou triangle', sports: ['jjb'] },
      { id: 'g-spider-omo', text: 'Spider guard → omoplata', sports: ['jjb'] },
      { id: 'g-lasso', text: 'Lasso → balloon sweep → mount', sports: ['jjb'] },
      { id: 'g-worm', text: 'Worm guard → leg drag', sports: ['jjb'] },
      { id: 'g-crab', text: 'Crab ride → back control', sports: ['jjb'] },
      { id: 'g-berim-rev', text: 'Reverse berimbolo', sports: ['jjb'] },
      { id: 'g-half-dog', text: 'Demi-garde profonde → dogfight → sweep', sports: ['jjb', 'grappling'] },
      { id: 'g-half-ot', text: 'Demi-garde → old school sweep', sports: ['jjb', 'grappling'] },
      { id: 'g-half-undr', text: 'Demi-garde → underhook deep → back take', sports: ['jjb', 'grappling'] },
      { id: 'g-deep-half', text: 'Deep half → sweep → mount', sports: ['jjb', 'grappling'] },
      { id: 'g-50-sweep', text: '50/50 → sweep', sports: ['jjb', 'grappling'] },
      { id: 'g-collar', text: 'Collar sleeve → triangle / armbar', sports: ['jjb'] },
      { id: 'g-bow', text: 'Back control → bow and arrow choke', sports: ['jjb'] },
      { id: 'g-loop', text: 'Loop choke depuis la garde', sports: ['jjb'] },
      { id: 'g-clock', text: 'Clock choke depuis turtle', sports: ['jjb'] },
    ],
  },

  {
    id: 'passing',
    label: 'Passages de garde',
    emoji: '🚪',
    entries: [
      { id: 'p-kc', text: 'Knee cut pass → side control → mount', sports: ['jjb', 'grappling'] },
      { id: 'p-ou', text: 'Over-under pass → mount pressure', sports: ['jjb', 'grappling'] },
      { id: 'p-tor', text: 'Toreando pass → side control', sports: ['jjb', 'grappling'] },
      { id: 'p-ld', text: 'Leg drag pass → back control', sports: ['jjb', 'grappling'] },
      { id: 'p-stack', text: 'Stack pass → side control', sports: ['jjb', 'grappling'] },
      { id: 'p-smash', text: 'Smash pass pressure → mount', sports: ['jjb', 'grappling'] },
      { id: 'p-hq', text: 'Headquarters → passage latéral', sports: ['jjb', 'grappling'] },
      { id: 'p-fl', text: 'Folding pass', sports: ['jjb', 'grappling'] },
      { id: 'p-long', text: 'Long step pass', sports: ['jjb', 'grappling'] },
      { id: 'p-bodylock', text: 'Body lock pass → pin ou back take', sports: ['jjb', 'grappling'] },
      { id: 'p-bull', text: 'Bull fighter pass', sports: ['jjb', 'grappling'] },
      { id: 'p-xpass', text: 'X-pass (knee-on-belly cut)', sports: ['jjb', 'grappling'] },
    ],
  },

  {
    id: 'jjb-nogi',
    label: 'Grappling No-Gi',
    emoji: '💪',
    entries: [
      { id: 'ng-butterfly', text: 'Butterfly guard → elevator sweep', sports: ['jjb', 'grappling'] },
      { id: 'ng-butterfly-h', text: 'Butterfly → hook sweep → top', sports: ['jjb', 'grappling'] },
      { id: 'ng-xguard', text: 'X-guard → technical stand-up → single leg', sports: ['jjb', 'grappling'] },
      { id: 'ng-slx', text: 'Single leg X → sweep → top', sports: ['jjb', 'grappling'] },
      { id: 'ng-bodylock', text: 'Body lock pass → mount → back', sports: ['jjb', 'grappling'] },
      { id: 'ng-fl', text: 'Front headlock → guillotine ou back take', sports: ['jjb', 'grappling'] },
      { id: 'ng-ad', text: 'Arm drag → dos → RNC', sports: ['jjb', 'grappling'] },
      { id: 'ng-ns', text: 'North-south choke depuis side', sports: ['jjb', 'grappling'] },
      { id: 'ng-darce', text: 'D\'Arce choke depuis front headlock', sports: ['jjb', 'grappling'] },
      { id: 'ng-ana', text: 'Anaconda choke depuis front headlock', sports: ['jjb', 'grappling'] },
      { id: 'ng-peru', text: 'Peruvian necktie', sports: ['jjb', 'grappling'] },
      { id: 'ng-guil-arm', text: 'High elbow guillotine (arm-in)', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'ng-rnc-body', text: 'RNC depuis back avec body triangle', sports: ['jjb', 'grappling'] },
    ],
  },

  {
    id: 'leg-locks',
    label: 'Leg lock game',
    emoji: '🦵',
    entries: [
      { id: 'll-ashi', text: 'Ashi garami → straight ankle lock', sports: ['grappling'] },
      { id: 'll-heel', text: 'Ashi → heel hook (inside ou outside)', sports: ['grappling'] },
      { id: 'll-saddle', text: 'Saddle (inside sankaku) → heel hook', sports: ['grappling'] },
      { id: 'll-50', text: '50/50 → heel hook', sports: ['grappling'] },
      { id: 'll-knee', text: 'Knee bar depuis ashi', sports: ['grappling'] },
      { id: 'll-toe', text: 'Toehold depuis mount ou side', sports: ['grappling'] },
      { id: 'll-entry-bl', text: 'Body lock threat → transition vers leg entanglement', sports: ['grappling'] },
      { id: 'll-single', text: 'Single leg X → heel hook', sports: ['grappling'] },
      { id: 'll-chain', text: 'Heel hook chain (side to side)', sports: ['grappling'] },
    ],
  },

  {
    id: 'takedowns',
    label: 'Takedowns / entrées',
    emoji: '🤼',
    entries: [
      { id: 't-single', text: 'Single leg → finition à la cheville', sports: ['jjb', 'grappling', 'mma'] },
      { id: 't-double', text: 'Double leg → top control', sports: ['jjb', 'grappling', 'mma'] },
      { id: 't-armdrag', text: 'Arm drag → back take', sports: ['jjb', 'grappling'] },
      { id: 't-ankle', text: 'Ankle pick', sports: ['jjb', 'grappling'] },
      { id: 't-blast', text: 'Blast double leg', sports: ['grappling', 'mma'] },
      { id: 't-bodylock', text: 'Body lock → trip', sports: ['jjb', 'grappling'] },
      { id: 't-duck', text: 'Duck under → back take', sports: ['grappling', 'mma'] },
      { id: 't-osoto', text: 'O-soto-gari (grand fauchage)', sports: ['jjb', 'judo'] },
      { id: 't-uchi', text: 'Uchi-mata', sports: ['jjb', 'judo'] },
      { id: 't-seoi', text: 'Seoi-nage', sports: ['jjb', 'judo'] },
      { id: 't-tomoe', text: 'Tomoe-nage (sacrifice)', sports: ['jjb', 'judo', 'grappling'] },
      { id: 't-trip', text: 'Foot sweep / trip', sports: ['jjb', 'grappling'] },
    ],
  },

  {
    id: 'mma',
    label: 'MMA',
    emoji: '🥊',
    entries: [
      { id: 'm-td-pressure', text: 'Takedown pressure → top control → ground and pound → RNC', sports: ['mma'] },
      { id: 'm-setup-td', text: 'Jab setup → takedown timing → top control', sports: ['mma'] },
      { id: 'm-clinch-knee', text: 'Clinch → knees → trip takedown', sports: ['mma'] },
      { id: 'm-cage', text: 'Cage pressure → dirty boxing → takedown', sports: ['mma'] },
      { id: 'm-gnp', text: 'Top position → ground and pound → soumission', sports: ['mma'] },
      { id: 'm-kimura', text: 'Kimura trap system depuis demi-garde', sports: ['mma', 'jjb'] },
      { id: 'm-back', text: 'Prendre le dos → RNC ou strikes', sports: ['mma'] },
      { id: 'm-lowkick', text: 'Low kicks + combinaisons → casser la mobilité', sports: ['mma'] },
      { id: 'm-overhand', text: 'Overhand right sur l\'entrée adverse', sports: ['mma'] },
      { id: 'm-cageescape', text: 'Stand-up contre le grillage', sports: ['mma'] },
      { id: 'm-sprawl', text: 'Sprawl & brawl : éviter le sol, frapper debout', sports: ['mma'] },
      { id: 'm-counter', text: 'Counter strikes → sprawl → retour debout', sports: ['mma'] },
      { id: 'm-oblique', text: 'Teep + oblique kicks pour la distance', sports: ['mma'] },
      { id: 'm-guil', text: 'Guillotine sur entrée adverse', sports: ['mma'] },
    ],
  },

  {
    id: 'boxe',
    label: 'Boxe anglaise',
    emoji: '🥊',
    entries: [
      { id: 'b-jab', text: 'Jab dominance → cross straight', sports: ['boxe', 'mma'] },
      { id: 'b-12', text: 'Combinaison 1-2 (jab-cross)', sports: ['boxe', 'mma'] },
      { id: 'b-123', text: 'Combinaison 1-2-3 (jab-cross-hook)', sports: ['boxe', 'mma'] },
      { id: 'b-body', text: 'Attaquer le corps → remonter tête', sports: ['boxe', 'mma'] },
      { id: 'b-slip', text: 'Slip + counter left hook', sports: ['boxe', 'mma'] },
      { id: 'b-roll', text: 'Shoulder roll → counter right straight', sports: ['boxe'] },
      { id: 'b-upp', text: 'Uppercut dans le trou de la garde', sports: ['boxe', 'mma'] },
      { id: 'b-peek', text: 'Peek-a-boo → head movement → hooks', sports: ['boxe'] },
      { id: 'b-pivot', text: 'Pivot + jab pour sortir des angles', sports: ['boxe', 'mma'] },
      { id: 'b-check', text: 'Check hook sur l\'avancée', sports: ['boxe', 'mma'] },
      { id: 'b-pressure', text: 'Pression constante, couper le ring', sports: ['boxe', 'mma'] },
      { id: 'b-out', text: 'Out-boxing : distance + jab + esquive', sports: ['boxe', 'mma'] },
      { id: 'b-philly', text: 'Philly shell défense + counter', sports: ['boxe'] },
      { id: 'b-weave', text: 'Bob and weave → counter uppercut', sports: ['boxe', 'mma'] },
    ],
  },

  {
    id: 'striking',
    label: 'Kickboxing / Muay Thai',
    emoji: '🦵',
    entries: [
      { id: 's-lowkick', text: 'Low kicks sur la jambe arrière', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 's-teep', text: 'Teep pour casser l\'avancée', sports: ['muaythai', 'mma'] },
      { id: 's-clinch', text: 'Clinch → knees → elbows', sports: ['muaythai', 'mma'] },
      { id: 's-roundhouse', text: 'Roundhouse sur la cuisse avant', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 's-midkick', text: 'Middle kick au foie', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 's-highkick', text: 'High kick setup avec low kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 's-elbow', text: 'Coudes en clinch', sports: ['muaythai'] },
      { id: 's-knee', text: 'Genoux en clinch', sports: ['muaythai'] },
      { id: 's-femur', text: 'Muay Femur : timing + counter', sports: ['muaythai'] },
      { id: 's-walk', text: 'Walk-forward pressure (Muay Mat)', sports: ['muaythai'] },
      { id: 's-sweep', text: 'Sweep sur kick adverse', sports: ['muaythai'] },
      { id: 's-spin', text: 'Spinning back kick / elbow', sports: ['kickboxing', 'muaythai', 'mma'] },
    ],
  },

  {
    id: 'tactics',
    label: 'Tactiques génériques',
    emoji: '🎯',
    entries: [
      { id: 't-wait', text: 'Attendre l\'attaque → counter', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 't-pressure', text: 'Pression constante, couper l\'espace', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 't-distance', text: 'Garder la distance, éviter le clinch', sports: ['mma', 'boxe', 'kickboxing', 'muaythai'] },
      { id: 't-clinch', text: 'Forcer le clinch → knees/elbows', sports: ['mma', 'muaythai'] },
      { id: 't-feints', text: 'Feintes pour forcer des réactions', sports: ['mma', 'boxe', 'kickboxing', 'muaythai'] },
      { id: 't-tdd', text: 'Priorité à la défense de takedown', sports: ['mma'] },
      { id: 't-wrestle', text: 'Takedown early → top control', sports: ['mma'] },
      { id: 't-patience', text: 'Patience, timing, ne pas forcer', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 't-vary', text: 'Varier les attaques (pas prévisible)', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 't-cardio', text: 'Jouer sur le cardio long terme', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 't-breath', text: 'Respiration + calme sous pression', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 't-chain', text: 'Enchaînements de soumissions (submission chain)', sports: ['jjb', 'grappling'] },
    ],
  },
];

// ============================================
// ✅ CE QUI A MARCHÉ — petites phases à assembler
// ============================================

export const PLAYBOOK_WORKED: PlaybookCategory[] = [
  {
    id: 'w-phases-jjb',
    label: 'Phases JJB',
    emoji: '✅',
    entries: [
      { id: 'w-pull', text: 'Tirage de garde', sports: ['jjb', 'grappling'] },
      { id: 'w-closed', text: 'Garde fermée', sports: ['jjb', 'grappling'] },
      { id: 'w-lasso', text: 'Lasso', sports: ['jjb'] },
      { id: 'w-spider', text: 'Spider guard', sports: ['jjb'] },
      { id: 'w-dlr', text: 'De la Riva', sports: ['jjb'] },
      { id: 'w-half', text: 'Demi-garde', sports: ['jjb', 'grappling'] },
      { id: 'w-deep', text: 'Deep half', sports: ['jjb', 'grappling'] },
      { id: 'w-butter', text: 'Butterfly', sports: ['jjb', 'grappling'] },
      { id: 'w-xg', text: 'X-guard', sports: ['jjb', 'grappling'] },
      { id: 'w-sweep', text: 'Sweep', sports: ['jjb', 'grappling'] },
      { id: 'w-berim', text: 'Berimbolo', sports: ['jjb'] },
      { id: 'w-passage', text: 'Passage de garde', sports: ['jjb', 'grappling'] },
      { id: 'w-kneecut', text: 'Knee cut', sports: ['jjb', 'grappling'] },
      { id: 'w-toreando', text: 'Toreando', sports: ['jjb', 'grappling'] },
      { id: 'w-legdrag', text: 'Leg drag', sports: ['jjb', 'grappling'] },
      { id: 'w-bodylock', text: 'Body lock pass', sports: ['jjb', 'grappling'] },
      { id: 'w-mount', text: 'Mount', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-side', text: 'Side control', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-back', text: 'Back take', sports: ['jjb', 'grappling'] },
      { id: 'w-armdrag', text: 'Arm drag', sports: ['jjb', 'grappling'] },
      { id: 'w-hipescape', text: 'Hip escape', sports: ['jjb', 'grappling'] },
      { id: 'w-techstand', text: 'Technical stand-up', sports: ['jjb', 'grappling'] },
      { id: 'w-scramble', text: 'Scramble', sports: ['jjb', 'grappling', 'mma'] },
    ],
  },
  {
    id: 'w-finish',
    label: 'Finitions',
    emoji: '🏆',
    entries: [
      { id: 'w-cross', text: 'Cross collar choke', sports: ['jjb'] },
      { id: 'w-bow', text: 'Bow and arrow', sports: ['jjb'] },
      { id: 'w-ezeq', text: 'Ezekiel', sports: ['jjb'] },
      { id: 'w-rnc', text: 'RNC', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-tri', text: 'Triangle', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-armbar', text: 'Armbar', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-kimura', text: 'Kimura', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-omo', text: 'Omoplata', sports: ['jjb', 'grappling'] },
      { id: 'w-guil', text: 'Guillotine', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-darce', text: "D'Arce", sports: ['jjb', 'grappling'] },
      { id: 'w-heel', text: 'Heel hook', sports: ['grappling'] },
      { id: 'w-etrang', text: 'Étranglement', sports: ['jjb', 'grappling'] },
      { id: 'w-soum', text: 'Soumission', sports: ['jjb', 'grappling', 'mma'] },
    ],
  },
  {
    id: 'w-strike',
    label: 'Striking',
    emoji: '👊',
    entries: [
      { id: 'w-jab', text: 'Jab', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'w-cross-strike', text: 'Cross', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'w-hook', text: 'Hook', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'w-upp', text: 'Uppercut', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'w-12', text: '1-2 (jab-cross)', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'w-123', text: '1-2-3', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'w-body', text: 'Body shot', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'w-low', text: 'Low kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'w-mid', text: 'Middle kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'w-teep', text: 'Teep', sports: ['muaythai', 'mma'] },
      { id: 'w-knee', text: 'Knee clinch', sports: ['muaythai', 'mma'] },
      { id: 'w-counter-hook', text: 'Counter hook', sports: ['boxe', 'mma'] },
      { id: 'w-counter-cross', text: 'Counter straight', sports: ['boxe', 'mma', 'kickboxing'] },
    ],
  },
  {
    id: 'w-general',
    label: 'Général',
    emoji: '💪',
    entries: [
      { id: 'w-timing', text: 'Bon timing', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'w-distance', text: 'Gestion distance', sports: ['mma', 'boxe', 'kickboxing', 'muaythai'] },
      { id: 'w-pressure', text: 'Pression', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'w-patience', text: 'Patience', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'w-cardio', text: 'Cardio', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'w-feints', text: 'Feintes', sports: ['mma', 'boxe', 'kickboxing', 'muaythai'] },
      { id: 'w-mental', text: 'Mental solide', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'w-explo', text: 'Explosivité', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'w-adapt', text: 'Adaptation en temps réel', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
    ],
  },
];

// ============================================
// ❌ CE QUI N'A PAS MARCHÉ — petites phases
// ============================================

export const PLAYBOOK_DIDNT_WORK: PlaybookCategory[] = [
  {
    id: 'dw-phases',
    label: 'Phases qui ont raté',
    emoji: '❌',
    entries: [
      { id: 'dw-pull', text: 'Tirage de garde raté', sports: ['jjb', 'grappling'] },
      { id: 'dw-closed', text: 'Garde fermée pas tenue', sports: ['jjb', 'grappling'] },
      { id: 'dw-lasso', text: 'Lasso pas efficace', sports: ['jjb'] },
      { id: 'dw-spider', text: 'Spider guard cassée', sports: ['jjb'] },
      { id: 'dw-dlr', text: 'DLR ratée', sports: ['jjb'] },
      { id: 'dw-half', text: 'Demi-garde trop plate', sports: ['jjb', 'grappling'] },
      { id: 'dw-sweep', text: 'Sweep raté', sports: ['jjb', 'grappling'] },
      { id: 'dw-berim', text: 'Berimbolo raté', sports: ['jjb'] },
      { id: 'dw-passage', text: 'Passage de garde raté', sports: ['jjb', 'grappling'] },
      { id: 'dw-kneecut', text: 'Knee cut bloqué', sports: ['jjb', 'grappling'] },
      { id: 'dw-toreando', text: 'Toreando bloqué', sports: ['jjb', 'grappling'] },
      { id: 'dw-legdrag', text: 'Leg drag raté', sports: ['jjb', 'grappling'] },
      { id: 'dw-backtake', text: 'Back take échoué', sports: ['jjb', 'grappling'] },
      { id: 'dw-mount', text: 'Mount perdue', sports: ['jjb', 'grappling'] },
      { id: 'dw-side', text: 'Side control perdu', sports: ['jjb', 'grappling'] },
      { id: 'dw-hipescape', text: 'Hip escape trop lent', sports: ['jjb', 'grappling'] },
      { id: 'dw-td', text: 'Takedown défendu', sports: ['jjb', 'grappling', 'mma'] },
    ],
  },
  {
    id: 'dw-finish',
    label: 'Finitions ratées',
    emoji: '🚫',
    entries: [
      { id: 'dw-tri', text: 'Triangle raté', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'dw-armbar', text: 'Armbar raté', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'dw-kimura', text: 'Kimura ratée', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'dw-omo', text: 'Omoplata ratée', sports: ['jjb', 'grappling'] },
      { id: 'dw-rnc', text: 'RNC défendue', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'dw-cross', text: 'Cross collar défendu', sports: ['jjb'] },
      { id: 'dw-bow', text: 'Bow and arrow raté', sports: ['jjb'] },
      { id: 'dw-guil', text: 'Guillotine ratée', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'dw-darce', text: "D'Arce raté", sports: ['jjb', 'grappling'] },
      { id: 'dw-heel', text: 'Heel hook raté', sports: ['grappling'] },
      { id: 'dw-etrang', text: 'Étranglement raté', sports: ['jjb', 'grappling'] },
      { id: 'dw-soum', text: 'Soumission pas finie', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'dw-grip', text: 'Mauvais grip', sports: ['jjb', 'grappling'] },
      { id: 'dw-angle', text: 'Angle pas bon', sports: ['jjb', 'grappling'] },
      { id: 'dw-tension', text: 'Pas assez de tension', sports: ['jjb', 'grappling'] },
    ],
  },
  {
    id: 'dw-strike',
    label: 'Striking raté',
    emoji: '👊',
    entries: [
      { id: 'dw-jab', text: 'Jab prévisible', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'dw-cross-strike', text: 'Cross raté', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'dw-hook', text: 'Hook raté', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'dw-low', text: 'Low kick bloqué', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'dw-teep', text: 'Teep bloqué', sports: ['muaythai', 'mma'] },
      { id: 'dw-combo', text: 'Combo trop courte', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'dw-setup', text: 'Setup trop direct', sports: ['mma', 'boxe', 'kickboxing', 'muaythai'] },
      { id: 'dw-angle2', text: "Pas d'angle — face à face", sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'dw-head', text: 'Pas de head movement', sports: ['boxe', 'mma', 'kickboxing'] },
    ],
  },
  {
    id: 'dw-mental',
    label: 'Mental / rythme',
    emoji: '🧠',
    entries: [
      { id: 'dw-hesit', text: 'Trop d\'hésitation', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'dw-panic', text: 'Panique sous pression', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'dw-relax', text: 'Trop relax', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'dw-static', text: 'Trop statique', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'dw-hisgame', text: "J'ai joué son jeu", sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'dw-tired', text: 'Cardio court', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'dw-anticip', text: 'Anticipation mentale', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
    ],
  },
];

// ============================================
// ⚠️ CONTRÉ PAR — petites phases
// ============================================

export const PLAYBOOK_COUNTERED: PlaybookCategory[] = [
  {
    id: 'c-grap',
    label: 'Grappling',
    emoji: '🛡️',
    entries: [
      { id: 'c-sprawl', text: 'Sprawl sur mon takedown', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'c-under', text: 'Underhook qui a tué mon passage', sports: ['jjb', 'grappling'] },
      { id: 'c-frame', text: 'Frames bien posés', sports: ['jjb', 'grappling'] },
      { id: 'c-guil', text: 'Guillotine sur mon entrée', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'c-berim', text: 'Berimbolo sur mon toreando', sports: ['jjb'] },
      { id: 'c-hipescape', text: 'Hip escape parfait', sports: ['jjb', 'grappling'] },
      { id: 'c-kimura', text: 'Kimura trap sur mon passage', sports: ['jjb', 'grappling'] },
      { id: 'c-heel', text: 'Heel hook sur mon ashi', sports: ['grappling'] },
      { id: 'c-scramble', text: 'Scramble mieux géré', sports: ['jjb', 'grappling'] },
      { id: 'c-granby', text: 'Granby roll', sports: ['jjb', 'grappling'] },
      { id: 'c-tri', text: 'Triangle sur mon passage', sports: ['jjb', 'grappling'] },
      { id: 'c-cswp', text: 'Counter sweep', sports: ['jjb', 'grappling'] },
      { id: 'c-omo', text: 'Omoplata contre mon passage', sports: ['jjb', 'grappling'] },
      { id: 'c-arm', text: 'Armbar contre ma posture', sports: ['jjb', 'grappling'] },
      { id: 'c-tdd', text: 'Takedown defense', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'c-stuff', text: 'Takedown stuffé', sports: ['mma', 'grappling'] },
      { id: 'c-fh', text: 'Front headlock sur mon single', sports: ['jjb', 'grappling', 'mma'] },
    ],
  },
  {
    id: 'c-strike',
    label: 'Striking',
    emoji: '👊',
    entries: [
      { id: 'c-str', text: 'Counter straight sur mon jab', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'c-check', text: 'Check kick sur mon low kick', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'c-teep', text: 'Teep qui casse mon rythme', sports: ['muaythai', 'mma'] },
      { id: 'c-slip', text: 'Slip + counter hook', sports: ['boxe', 'mma'] },
      { id: 'c-bloc', text: 'Bloc + counter sur ma combo', sports: ['boxe', 'mma', 'kickboxing', 'muaythai'] },
      { id: 'c-pivot', text: 'Pivot out-of-range', sports: ['boxe', 'mma', 'kickboxing', 'muaythai'] },
      { id: 'c-clinch', text: 'Clinch qui a annulé mon striking', sports: ['mma', 'muaythai'] },
      { id: 'c-spin', text: 'Spinning counter', sports: ['kickboxing', 'muaythai', 'mma'] },
      { id: 'c-overhand', text: 'Overhand sur mon entrée', sports: ['boxe', 'mma'] },
    ],
  },
];

// ============================================
// 🚀 OBJECTIF PROCHAIN ROUND — petites phases
// ============================================

export const PLAYBOOK_IMPROVEMENT: PlaybookCategory[] = [
  {
    id: 'i-drill',
    label: 'Travailler',
    emoji: '⚔️',
    entries: [
      { id: 'i-pull', text: 'Travailler mon tirage de garde', sports: ['jjb', 'grappling'] },
      { id: 'i-lasso', text: 'Travailler le lasso', sports: ['jjb'] },
      { id: 'i-spider', text: 'Travailler le spider guard', sports: ['jjb'] },
      { id: 'i-dlr', text: 'Travailler la DLR', sports: ['jjb'] },
      { id: 'i-half', text: 'Travailler la demi-garde', sports: ['jjb', 'grappling'] },
      { id: 'i-xg', text: 'Travailler la X-guard', sports: ['jjb', 'grappling'] },
      { id: 'i-berim', text: 'Travailler le berimbolo', sports: ['jjb'] },
      { id: 'i-sweep', text: 'Travailler mes sweeps', sports: ['jjb', 'grappling'] },
      { id: 'i-passage', text: 'Plus de passes de garde', sports: ['jjb', 'grappling'] },
      { id: 'i-kneecut', text: 'Travailler le knee cut', sports: ['jjb', 'grappling'] },
      { id: 'i-toreando', text: 'Travailler le toreando', sports: ['jjb', 'grappling'] },
      { id: 'i-legdrag', text: 'Travailler le leg drag', sports: ['jjb', 'grappling'] },
      { id: 'i-back', text: 'Prendre le dos plus tôt', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'i-mount', text: 'Stabiliser la mount', sports: ['jjb', 'grappling'] },
      { id: 'i-armdrag', text: 'Travailler arm drag', sports: ['jjb', 'grappling'] },
      { id: 'i-heel', text: 'Drill heel hook', sports: ['grappling'] },
      { id: 'i-50', text: 'Drill 50/50', sports: ['grappling'] },
      { id: 'i-finish', text: 'Finir mes soumissions', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'i-chain', text: 'Enchaîner les soumissions', sports: ['jjb', 'grappling'] },
      { id: 'i-initiative', text: 'Plus d\'initiative debout', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'i-combo', text: 'Enchaîner les combos', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'i-body', text: 'Attaquer le corps', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'i-td-strike', text: 'Setup takedown avec frappes', sports: ['mma'] },
      { id: 'i-teep', text: 'Plus de teep', sports: ['muaythai', 'mma'] },
      { id: 'i-knee', text: 'Clinch + knees', sports: ['muaythai', 'mma'] },
    ],
  },
  {
    id: 'i-defense',
    label: 'À défendre',
    emoji: '🛡️',
    entries: [
      { id: 'i-def-tri', text: 'Défendre le triangle', sports: ['jjb', 'mma', 'grappling'] },
      { id: 'i-def-rnc', text: 'Défendre le RNC', sports: ['jjb', 'mma', 'grappling'] },
      { id: 'i-def-arm', text: "Défendre l'armbar", sports: ['jjb', 'mma', 'grappling'] },
      { id: 'i-def-kimura', text: 'Défendre la kimura', sports: ['jjb', 'mma', 'grappling'] },
      { id: 'i-def-guil', text: 'Défendre la guillotine', sports: ['jjb', 'grappling', 'mma'] },
      { id: 'i-def-heel', text: 'Défendre le heel hook', sports: ['grappling'] },
      { id: 'i-def-td', text: 'Mieux sprawler', sports: ['mma', 'grappling'] },
      { id: 'i-def-pass', text: 'Défendre le passage', sports: ['jjb', 'grappling'] },
      { id: 'i-def-back', text: 'Protéger le dos', sports: ['jjb', 'grappling'] },
      { id: 'i-def-berim', text: 'Défendre le berimbolo', sports: ['jjb'] },
      { id: 'i-def-guard-high', text: 'Garde plus haute', sports: ['boxe', 'mma', 'kickboxing'] },
      { id: 'i-def-head', text: 'Head movement actif', sports: ['boxe', 'mma'] },
      { id: 'i-def-check', text: 'Check les low kicks', sports: ['kickboxing', 'muaythai', 'mma'] },
    ],
  },
  {
    id: 'i-general',
    label: 'Général',
    emoji: '🎯',
    entries: [
      { id: 'i-calm', text: 'Rester calme', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'i-cardio', text: 'Bosser le cardio', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'i-patience', text: 'Être patient', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'i-vary', text: 'Varier mes attaques', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'i-breath', text: 'Respiration', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'i-feint', text: 'Plus de feintes', sports: ['mma', 'boxe', 'kickboxing', 'muaythai'] },
      { id: 'i-drill100', text: 'Drill 100x cette semaine', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
      { id: 'i-mental', text: 'Mental plus solide', sports: ['jjb', 'mma', 'boxe', 'kickboxing', 'muaythai', 'grappling'] },
    ],
  },
];

// ============================================
// HELPER : filtre par sport
// ============================================
export function filterBySport(categories: PlaybookCategory[], sportId: string): PlaybookCategory[] {
  const sid = sportId.toLowerCase();
  return categories
    .map(cat => ({
      ...cat,
      entries: cat.entries.filter(e => e.sports.includes(sid)),
    }))
    .filter(cat => cat.entries.length > 0);
}

// ============================================
// Mapping champ → bibliothèque correspondante
// ============================================
export const PLAYBOOK_BY_FIELD: Record<string, PlaybookCategory[]> = {
  gamePlan: PLAYBOOK_GAMEPLAN,
  whatWorked: PLAYBOOK_WORKED,
  whatDidntWork: PLAYBOOK_DIDNT_WORK,
  counteredBy: PLAYBOOK_COUNTERED,
  improvement: PLAYBOOK_IMPROVEMENT,
};

export const FIELD_LABELS: Record<string, { title: string; emoji: string; color: string }> = {
  gamePlan: { title: 'Game plans', emoji: '🎯', color: '#3B82F6' },
  whatWorked: { title: 'Ce qui a marché', emoji: '✅', color: '#22C55E' },
  whatDidntWork: { title: "Ce qui n'a pas marché", emoji: '❌', color: '#EF4444' },
  counteredBy: { title: 'Contré par', emoji: '⚠️', color: '#F59E0B' },
  improvement: { title: 'Objectif prochain', emoji: '🚀', color: '#8B5CF6' },
};

// ============================================
// Storage templates perso (AsyncStorage)
// ============================================
export const CUSTOM_STORAGE_KEY = (fieldKey: string) => `@yoroi_playbook_custom_${fieldKey}`;

export interface CustomTemplate {
  id: string;
  text: string;
  createdAt: string;
}
