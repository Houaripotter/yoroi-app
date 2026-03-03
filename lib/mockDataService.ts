import { subDays } from 'date-fns';

// ============================================
// MOCK DATA SERVICE - Version "Creator Mode" pour Screenshots parfaits
// ============================================

export const getMockWeights = (days = 30) => {
  // On génère 20 points de pesée pour que ce soit dense et beau
  return Array.from({ length: 20 }, (_, i) => {
    const date = subDays(new Date(), i * 1.5);
    const progress = (20 - i) / 20;
    
    // Courbe descendante de 85.8kg à 76.2kg
    const baseWeight = 76.2 + (i * 0.5); 
    
    // Variations marquées pour que la ligne ne soit pas droite
    // On utilise des multiplicateurs plus forts
    const variation = Math.sin(i * 0.9) * 1.2 + (i % 3 === 0 ? 0.5 : -0.3);
    
    return {
      id: i,
      weight: Number((baseWeight + variation).toFixed(1)),
      fat_percent: Number((24.5 - (progress * 6.5) + (Math.sin(i) * 0.8)).toFixed(1)),
      muscle_percent: Number((37.5 + (progress * 4.2) + (Math.cos(i) * 0.5)).toFixed(1)),
      water_percent: Number((53.5 + Math.random() * 3).toFixed(1)),
      bone_mass: 3.2,
      visceral_fat: i < 10 ? 8 : 11,
      metabolic_age: i < 8 ? 21 : 27,
      bmr: 1860,
      date: date.toISOString(),
    };
  });
};

export const getMockMeasurements = (days = 60) => {
  const count = 12;
  return Array.from({ length: count }, (_, i) => {
    const date = subDays(new Date(), i * 5);
    return {
      id: i,
      waist: Number((94.2 - (i * 0.8) + Math.sin(i)).toFixed(1)),
      chest: Number((100.5 + (i * 0.3)).toFixed(1)),
      left_arm: Number((33.2 + (i * 0.2)).toFixed(1)),
      right_arm: Number((33.5 + (i * 0.2)).toFixed(1)),
      left_thigh: Number((58.5 - (i * 0.4)).toFixed(1)),
      date: date.toISOString(),
    };
  });
};

export const getMockTrainings = (days = 30) => {
  const trainings = [];
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), i);
    const day = date.getDay();
    if ([1, 2, 4, 5, 6].includes(day)) {
      trainings.push({
        id: i,
        sport: i % 2 === 0 ? 'JJB' : 'Musculation',
        date: date.toISOString(),
        duration_minutes: 90,
        intensity: 8 + (i % 3),
      });
    }
  }
  return trainings;
};
