// Script pour ajouter des données de composition de test
import { addWeight } from '../lib/database';

export async function addTestCompositionData() {
  const today = new Date();

  // Ajouter 10 entrées avec composition corporelle
  const promises = [];
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    promises.push(
      addWeight({
        weight: 80 - i * 0.2, // Poids qui diminue
        fat_percent: 22 - i * 0.3, // Graisse qui diminue
        muscle_percent: 38 + i * 0.2, // Muscle qui augmente
        water_percent: 55 + i * 0.1, // Eau qui augmente
        bone_mass: 3.0 + (i * 0.01), // Masse osseuse stable
        visceral_fat: 8 - i * 0.1, // Graisse viscérale qui diminue (bon!)
        bmr: 1650 + i * 5, // BMR qui augmente
        metabolic_age: 35 - i * 0.3, // Âge métabolique qui diminue
        date: date.toISOString().split('T')[0],
      })
    );
  }

  await Promise.all(promises);
  console.log('✅ 10 entrées de composition corporelle ajoutées!');
}

// Exécuter si appelé directement
if (require.main === module) {
  addTestCompositionData()
    .then(() => {
      console.log('Terminé!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}
