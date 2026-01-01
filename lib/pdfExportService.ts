// ============================================
// YOROI - SERVICE D'EXPORT PDF
// ============================================
// Génère un rapport PDF professionnel pour médecin/diététicien

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';
import { getAllMeasurements, getUserSettings } from './storage';
import { getMeasurements, getTrainings } from './database';
import logger from '@/lib/security/logger';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface PDFReportData {
  // Profil
  userName?: string;
  height?: number;
  age?: number;
  gender?: 'male' | 'female';
  // Objectifs
  weightGoal?: number;
  targetDate?: string;
  // Mesures
  weights: Array<{
    date: string;
    weight: number;
    bodyFat?: number;
    muscle?: number;
    water?: number;
    bmi?: number;
  }>;
  // Mensurations
  measurements: Array<{
    date: string;
    waist?: number;
    hips?: number;
    chest?: number;
    left_arm?: number;
    right_arm?: number;
    left_thigh?: number;
    right_thigh?: number;
  }>;
  // Entrainements
  trainings: Array<{
    date: string;
    sport: string;
    duration_minutes: number;
  }>;
}

// ═══════════════════════════════════════════════
// COLLECTE DES DONNÉES
// ═══════════════════════════════════════════════

const collectReportData = async (): Promise<PDFReportData> => {
  const userSettings = await getUserSettings();
  const weights = await getAllMeasurements();
  const measurements = await getMeasurements();
  const trainings = await getTrainings();

  return {
    userName: userSettings.username || 'Utilisateur',
    height: userSettings.height,
    weightGoal: userSettings.weight_goal,
    targetDate: userSettings.target_date,
    gender: userSettings.gender as 'male' | 'female' | undefined,
    weights: weights.map((w: any) => ({
      date: w.date,
      weight: w.weight,
      bodyFat: w.body_fat || w.bodyFat,
      muscle: w.muscle_mass || w.muscle,
      water: w.water,
      bmi: w.bmi,
    })),
    measurements: measurements.map((m: any) => ({
      date: m.date,
      waist: m.waist,
      hips: m.hips,
      chest: m.chest,
      left_arm: m.left_arm,
      right_arm: m.right_arm,
      left_thigh: m.left_thigh,
      right_thigh: m.right_thigh,
    })),
    trainings: trainings.map((t: any) => ({
      date: t.date,
      sport: t.sport,
      duration_minutes: t.duration_minutes,
    })),
  };
};

// ═══════════════════════════════════════════════
// CALCULS STATISTIQUES
// ═══════════════════════════════════════════════

const calculateStats = (data: PDFReportData) => {
  const weights = data.weights;
  if (weights.length === 0) {
    return null;
  }

  // Trier par date
  const sorted = [...weights].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Calculer les statistiques
  const weightChange = last.weight - first.weight;
  const bodyFatChange = (last.bodyFat && first.bodyFat)
    ? last.bodyFat - first.bodyFat
    : null;
  const muscleChange = (last.muscle && first.muscle)
    ? last.muscle - first.muscle
    : null;

  // Durée du suivi
  const startDate = new Date(first.date);
  const endDate = new Date(last.date);
  const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.round(daysDiff / 7);

  // Moyenne hebdomadaire de perte
  const weeklyAvg = weeksDiff > 0 ? weightChange / weeksDiff : 0;

  // IMC actuel
  const currentBMI = data.height
    ? last.weight / Math.pow(data.height / 100, 2)
    : null;

  // Mensurations
  const sortedMeasurements = [...data.measurements].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const firstMeasure = sortedMeasurements[0];
  const lastMeasure = sortedMeasurements[sortedMeasurements.length - 1];

  const waistChange = (lastMeasure?.waist && firstMeasure?.waist)
    ? lastMeasure.waist - firstMeasure.waist
    : null;

  // Entrainements
  const totalTrainings = data.trainings.length;
  const totalMinutes = data.trainings.reduce((sum, t) => sum + t.duration_minutes, 0);
  const avgPerWeek = weeksDiff > 0 ? totalTrainings / weeksDiff : totalTrainings;

  return {
    startWeight: first.weight,
    endWeight: last.weight,
    weightChange,
    bodyFatStart: first.bodyFat,
    bodyFatEnd: last.bodyFat,
    bodyFatChange,
    muscleStart: first.muscle,
    muscleEnd: last.muscle,
    muscleChange,
    startDate: first.date,
    endDate: last.date,
    daysDiff,
    weeksDiff,
    weeklyAvg,
    currentBMI,
    waistStart: firstMeasure?.waist,
    waistEnd: lastMeasure?.waist,
    waistChange,
    totalTrainings,
    totalMinutes,
    avgTrainingsPerWeek: avgPerWeek,
    measurementCount: weights.length,
  };
};

// ═══════════════════════════════════════════════
// GÉNÉRATION HTML DU RAPPORT
// ═══════════════════════════════════════════════

const generateHTMLReport = (data: PDFReportData): string => {
  const stats = calculateStats(data);
  const today = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Formater le changement avec signe
  const formatChange = (value: number | null, unit: string = '') => {
    if (value === null || value === undefined) return '-';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}${unit}`;
  };

  // Couleur selon le changement (pour poids, moins = mieux)
  const getWeightColor = (value: number | null) => {
    if (value === null) return '#666';
    return value < 0 ? '#10B981' : value > 0 ? '#EF4444' : '#666';
  };

  // Générer le tableau des 10 dernières pesées
  const recentWeights = [...data.weights]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const weightsTableRows = recentWeights.map(w => `
    <tr>
      <td>${new Date(w.date).toLocaleDateString('fr-FR')}</td>
      <td><strong>${w.weight.toFixed(1)} kg</strong></td>
      <td>${w.bodyFat ? w.bodyFat.toFixed(1) + '%' : '-'}</td>
      <td>${w.muscle ? w.muscle.toFixed(1) + '%' : '-'}</td>
      <td>${w.water ? w.water.toFixed(1) + '%' : '-'}</td>
    </tr>
  `).join('');

  // Générer le tableau des mensurations
  const recentMeasurements = [...data.measurements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const measurementsTableRows = recentMeasurements.map(m => `
    <tr>
      <td>${new Date(m.date).toLocaleDateString('fr-FR')}</td>
      <td>${m.waist ? m.waist + ' cm' : '-'}</td>
      <td>${m.hips ? m.hips + ' cm' : '-'}</td>
      <td>${m.chest ? m.chest + ' cm' : '-'}</td>
      <td>${m.left_arm ? m.left_arm + ' cm' : '-'}</td>
      <td>${m.left_thigh ? m.left_thigh + ' cm' : '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rapport de Suivi - Yoroi</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #1F2937;
          padding: 40px;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #D4AF37;
        }
        .logo {
          font-size: 32px;
          font-weight: 900;
          color: #D4AF37;
          letter-spacing: 4px;
        }
        .logo-subtitle {
          font-size: 10px;
          color: #666;
          letter-spacing: 2px;
        }
        .report-info {
          text-align: right;
        }
        .report-title {
          font-size: 14px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 4px;
        }
        .report-date {
          font-size: 11px;
          color: #666;
        }

        /* Sections */
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #1F2937;
          padding: 8px 12px;
          background: linear-gradient(90deg, #D4AF37 0%, #F5E6B8 100%);
          border-radius: 4px;
          margin-bottom: 15px;
        }

        /* Patient Info */
        .patient-info {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          background: #F9FAFB;
          padding: 15px;
          border-radius: 8px;
        }
        .info-item {
          text-align: center;
        }
        .info-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 700;
          color: #1F2937;
          margin-top: 4px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .stat-card {
          background: #F9FAFB;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          border-left: 4px solid #D4AF37;
        }
        .stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 800;
          color: #1F2937;
          margin: 8px 0 4px;
        }
        .stat-change {
          font-size: 12px;
          font-weight: 600;
        }
        .stat-change.positive { color: #10B981; }
        .stat-change.negative { color: #EF4444; }
        .stat-change.neutral { color: #666; }

        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th {
          background: #1F2937;
          color: #fff;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
        }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #E5E7EB;
        }
        tr:nth-child(even) {
          background: #F9FAFB;
        }

        /* Summary Box */
        .summary-box {
          background: linear-gradient(135deg, #1F2937 0%, #374151 100%);
          color: #fff;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .summary-title {
          font-size: 14px;
          font-weight: 700;
          color: #D4AF37;
          margin-bottom: 10px;
        }
        .summary-text {
          font-size: 12px;
          line-height: 1.8;
        }
        .summary-highlight {
          color: #D4AF37;
          font-weight: 700;
        }

        /* Footer */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          font-size: 10px;
          color: #666;
        }
        .footer-disclaimer {
          font-style: italic;
          margin-bottom: 10px;
        }

        /* Page break for print */
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <div>
          <div class="logo">YOROI</div>
          <div class="logo-subtitle">SUIVI SANTÉ & PERFORMANCE</div>
        </div>
        <div class="report-info">
          <div class="report-title">Rapport de Suivi Médical</div>
          <div class="report-date">Généré le ${today}</div>
        </div>
      </div>

      <!-- PATIENT INFO -->
      <div class="section">
        <div class="section-title">INFORMATIONS PATIENT</div>
        <div class="patient-info">
          <div class="info-item">
            <div class="info-label">Nom</div>
            <div class="info-value">${data.userName || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Taille</div>
            <div class="info-value">${data.height ? data.height + ' cm' : '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Objectif</div>
            <div class="info-value">${data.weightGoal ? data.weightGoal + ' kg' : '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Période de suivi</div>
            <div class="info-value">${stats ? stats.weeksDiff + ' sem.' : '-'}</div>
          </div>
        </div>
      </div>

      <!-- RÉSUMÉ DE L'ÉVOLUTION -->
      ${stats ? `
      <div class="section">
        <div class="section-title">ÉVOLUTION GLOBALE</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Poids Initial</div>
            <div class="stat-value">${stats.startWeight.toFixed(1)}</div>
            <div class="stat-change neutral">kg</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Poids Actuel</div>
            <div class="stat-value">${stats.endWeight.toFixed(1)}</div>
            <div class="stat-change neutral">kg</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Évolution</div>
            <div class="stat-value" style="color: ${getWeightColor(stats.weightChange)}">${formatChange(stats.weightChange)}</div>
            <div class="stat-change ${stats.weightChange < 0 ? 'positive' : 'negative'}">kg</div>
          </div>
          ${stats.bodyFatChange !== null ? `
          <div class="stat-card">
            <div class="stat-label">Masse Grasse</div>
            <div class="stat-value">${stats.bodyFatEnd?.toFixed(1) || '-'}</div>
            <div class="stat-change ${stats.bodyFatChange < 0 ? 'positive' : 'negative'}">${formatChange(stats.bodyFatChange, '%')}</div>
          </div>
          ` : ''}
          ${stats.muscleChange !== null ? `
          <div class="stat-card">
            <div class="stat-label">Masse Musculaire</div>
            <div class="stat-value">${stats.muscleEnd?.toFixed(1) || '-'}</div>
            <div class="stat-change ${stats.muscleChange > 0 ? 'positive' : 'negative'}">${formatChange(stats.muscleChange, '%')}</div>
          </div>
          ` : ''}
          ${stats.currentBMI ? `
          <div class="stat-card">
            <div class="stat-label">IMC Actuel</div>
            <div class="stat-value">${stats.currentBMI.toFixed(1)}</div>
            <div class="stat-change neutral">${stats.currentBMI < 18.5 ? 'Insuffisant' : stats.currentBMI < 25 ? 'Normal' : stats.currentBMI < 30 ? 'Surpoids' : 'Obésité'}</div>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <!-- HISTORIQUE DES PESÉES -->
      <div class="section">
        <div class="section-title">HISTORIQUE DES PESÉES (10 dernières)</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Poids</th>
              <th>Masse Grasse</th>
              <th>Muscle</th>
              <th>Hydratation</th>
            </tr>
          </thead>
          <tbody>
            ${weightsTableRows || '<tr><td colspan="5" style="text-align:center">Aucune donnée</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- MENSURATIONS -->
      ${data.measurements.length > 0 ? `
      <div class="section">
        <div class="section-title">MENSURATIONS (5 dernières)</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Tour de taille</th>
              <th>Hanches</th>
              <th>Poitrine</th>
              <th>Bras</th>
              <th>Cuisse</th>
            </tr>
          </thead>
          <tbody>
            ${measurementsTableRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- ACTIVITÉ PHYSIQUE -->
      ${stats && stats.totalTrainings > 0 ? `
      <div class="section">
        <div class="section-title">ACTIVITÉ PHYSIQUE</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Séances</div>
            <div class="stat-value">${stats.totalTrainings}</div>
            <div class="stat-change neutral">entraînements</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Temps Total</div>
            <div class="stat-value">${Math.round(stats.totalMinutes / 60)}</div>
            <div class="stat-change neutral">heures</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Moyenne</div>
            <div class="stat-value">${stats.avgTrainingsPerWeek.toFixed(1)}</div>
            <div class="stat-change neutral">séances/sem.</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- RÉSUMÉ -->
      ${stats ? `
      <div class="summary-box">
        <div class="summary-title">SYNTHÈSE</div>
        <div class="summary-text">
          Sur une période de <span class="summary-highlight">${stats.weeksDiff} semaines</span>
          (${stats.daysDiff} jours, du ${new Date(stats.startDate).toLocaleDateString('fr-FR')}
          au ${new Date(stats.endDate).toLocaleDateString('fr-FR')}),
          le patient a enregistré <span class="summary-highlight">${stats.measurementCount} pesées</span>.
          <br><br>
          ${stats.weightChange < 0
            ? `Une perte de poids de <span class="summary-highlight">${Math.abs(stats.weightChange).toFixed(1)} kg</span> a été observée,
               soit une moyenne de <span class="summary-highlight">${Math.abs(stats.weeklyAvg).toFixed(2)} kg/semaine</span>.`
            : stats.weightChange > 0
            ? `Une prise de poids de <span class="summary-highlight">${stats.weightChange.toFixed(1)} kg</span> a été observée.`
            : `Le poids est resté stable sur la période.`
          }
          ${stats.bodyFatChange !== null && stats.bodyFatChange < 0
            ? `<br>La masse grasse a diminué de <span class="summary-highlight">${Math.abs(stats.bodyFatChange).toFixed(1)}%</span>.`
            : ''
          }
          ${stats.muscleChange !== null && stats.muscleChange > 0
            ? `<br>La masse musculaire a augmenté de <span class="summary-highlight">${stats.muscleChange.toFixed(1)}%</span>.`
            : ''
          }
          ${stats.waistChange !== null && stats.waistChange < 0
            ? `<br>Le tour de taille a diminué de <span class="summary-highlight">${Math.abs(stats.waistChange).toFixed(1)} cm</span>.`
            : ''
          }
          ${stats.totalTrainings > 0
            ? `<br><br>Activité physique : <span class="summary-highlight">${stats.totalTrainings} séances</span>
               (${Math.round(stats.totalMinutes / 60)}h au total, ~${stats.avgTrainingsPerWeek.toFixed(1)} séances/semaine).`
            : ''
          }
        </div>
      </div>
      ` : ''}

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-disclaimer">
          Ce document est généré automatiquement à partir des données saisies par l'utilisateur.
          Il ne constitue pas un avis médical et doit être interprété par un professionnel de santé.
        </div>
        <div>
          Généré par <strong>Yoroi</strong> - Application de suivi santé et performance
          <br>
          ${today}
        </div>
      </div>
    </body>
    </html>
  `;
};

// ═══════════════════════════════════════════════
// EXPORT PDF
// ═══════════════════════════════════════════════

/**
 * Génère et partage un rapport PDF professionnel
 */
export const exportToPDF = async (): Promise<boolean> => {
  try {
    // 1. Collecter les données
    const data = await collectReportData();

    if (data.weights.length === 0) {
      Alert.alert(
        'Aucune donnée',
        'Vous devez avoir au moins une pesée pour générer un rapport.',
      );
      return false;
    }

    // 2. Générer le HTML
    const html = generateHTMLReport(data);

    // 3. Créer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // 4. Renommer le fichier avec une extension .pdf
    const pdfName = `Yoroi_Rapport_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfPath = `${FileSystem.documentDirectory}${pdfName}`;

    await FileSystem.moveAsync({
      from: uri,
      to: pdfPath,
    });

    // 5. Partager le PDF
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager le rapport Yoroi',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Succès', `PDF créé : ${pdfPath}`);
    }

    return true;
  } catch (error) {
    logger.error('Erreur export PDF:', error);
    Alert.alert('Erreur', "Impossible de générer le rapport PDF.");
    return false;
  }
};

/**
 * Prévisualise le rapport avant export
 */
export const previewPDFReport = async (): Promise<void> => {
  try {
    const data = await collectReportData();

    if (data.weights.length === 0) {
      Alert.alert(
        'Aucune donnée',
        'Vous devez avoir au moins une pesée pour générer un rapport.',
      );
      return;
    }

    const html = generateHTMLReport(data);

    await Print.printAsync({
      html,
    });
  } catch (error) {
    logger.error('Erreur prévisualisation PDF:', error);
    Alert.alert('Erreur', "Impossible de prévisualiser le rapport.");
  }
};

export default {
  exportToPDF,
  previewPDFReport,
};
