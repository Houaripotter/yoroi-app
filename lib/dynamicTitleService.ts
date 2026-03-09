// ============================================
// YOROI - TITRES DYNAMIQUES
// Un titre qui change selon les habitudes du guerrier
// ============================================

interface DynamicTitle {
  title: string;
  titleJp: string;
}

export function getDynamicTitle(
  streak: number,
  trainingsCount: number,
  weightsCount: number,
): DynamicTitle {
  // Streak prime sur tout le reste
  if (streak >= 100) return { title: 'Inebanlable', titleJp: '不屈の魂' };
  if (streak >= 60)  return { title: 'Force de la nature', titleJp: '自然の力' };
  if (streak >= 30)  return { title: 'Legendaire', titleJp: '伝説の戦士' };
  if (streak >= 14)  return { title: 'Implacable', titleJp: '容赦なき者' };
  if (streak >= 7)   return { title: 'Sur les rails', titleJp: '軌道に乗る' };

  // Volume d'entraînement
  if (trainingsCount >= 200) return { title: 'Veteran du dojo', titleJp: '道場の古兵' };
  if (trainingsCount >= 100) return { title: 'Guerrier confirme', titleJp: '確かな戦士' };
  if (trainingsCount >= 50)  return { title: 'En progression', titleJp: '進歩中' };
  if (trainingsCount >= 20)  return { title: 'Discipline', titleJp: '規律ある者' };
  if (trainingsCount >= 5)   return { title: 'En chemin', titleJp: '道の途中' };

  // Pesees
  if (weightsCount >= 50) return { title: 'Roi de la pesee', titleJp: '計量の王' };
  if (weightsCount >= 20) return { title: 'Rigoureux', titleJp: '厳格なる者' };
  if (weightsCount >= 5)  return { title: 'Consciencieux', titleJp: '誠実な者' };

  // Debutant
  return { title: 'En route pour la gloire', titleJp: '栄光への道' };
}
