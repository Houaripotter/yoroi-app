import { track } from '@/utils/telemetry';
import { printToFileAsync, printAsync } from 'expo-print';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { getAllMeasurements } from './storage';
import { getMeasurements, getProfile, Measurement } from './database';
import logger from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

// ============================================
// EXPORT PDF - YOROI
// ============================================
// Genere un PDF recapitulatif pour medecin/dieteticien

export type ExportPeriod = '30j' | '90j' | 'tout';

interface WeightData {
  date: string;
  weight: number;
  bodyFat?: number;
  muscle?: number;
  water?: number;
}

// Couleurs du theme
const COLORS = {
  gold: '#D4AF37',
  background: '#0D0D0D',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// Generer le HTML pour le PDF
const generatePDFHTML = async (period: ExportPeriod): Promise<string> => {
  // Charger les données
  const profile = await getProfile();
  const allWeights = await getAllMeasurements();
  const allMeasurements = await getMeasurements();

  // Filtrer par periode
  const now = new Date();
  const days = period === '30j' ? 30 : period === '90j' ? 90 : 365;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const weights: WeightData[] = allWeights
    .filter(w => period === 'tout' || new Date(w.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const measurements: Measurement[] = allMeasurements
    .filter(m => period === 'tout' || new Date(m.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculs
  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];
  const weightDelta = lastWeight && firstWeight ? lastWeight.weight - firstWeight.weight : 0;

  // Calculer IMC si taille disponible
  const heightM = profile?.height_cm ? profile.height_cm / 100 : null;
  const firstIMC = firstWeight && heightM ? firstWeight.weight / (heightM * heightM) : null;
  const lastIMC = lastWeight && heightM ? lastWeight.weight / (heightM * heightM) : null;

  // Premiere et derniere mensuration
  const firstMeasurement = measurements[0];
  const lastMeasurement = measurements[measurements.length - 1];

  const dateStr = format(now, 'dd MMMM yyyy', { locale: fr });
  const periodLabel = period === '30j' ? traduire('30 derniers jours') : period === '90j' ? traduire('90 derniers jours') : traduire('Toutes les données');

  return traduire("\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <style>\n    * {\n      margin: 0;\n      padding: 0;\n      box-sizing: border-box;\n    }\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n      background: #FFFFFF;\n      color: #1F2937;\n      padding: 40px;\n      font-size: 14px;\n      line-height: 1.5;\n    }\n    .header {\n      text-align: center;\n      margin-bottom: 40px;\n      padding-bottom: 20px;\n      border-bottom: 3px solid {0};\n    }\n    .logo {\n      font-size: 32px;\n      font-weight: 800;\n      color: {1};\n      margin-bottom: 8px;\n    }\n    .subtitle {\n      color: #6B7280;\n      font-size: 14px;\n    }\n    .meta {\n      display: flex;\n      justify-content: space-between;\n      margin-top: 16px;\n      font-size: 12px;\n      color: #6B7280;\n    }\n    h2 {\n      color: {2};\n      font-size: 18px;\n      margin: 30px 0 16px 0;\n      padding-bottom: 8px;\n      border-bottom: 2px solid #E5E7EB;\n    }\n    .card {\n      background: #F9FAFB;\n      border-radius: 12px;\n      padding: 20px;\n      margin-bottom: 20px;\n    }\n    .stats-grid {\n      display: flex;\n      gap: 16px;\n      flex-wrap: wrap;\n    }\n    .stat-item {\n      flex: 1;\n      min-width: 120px;\n      text-align: center;\n      padding: 16px;\n      background: white;\n      border-radius: 8px;\n      border: 1px solid #E5E7EB;\n    }\n    .stat-value {\n      font-size: 28px;\n      font-weight: 700;\n      color: #1F2937;\n    }\n    .stat-value.success { color: {3}; }\n    .stat-value.danger { color: {4}; }\n    .stat-value.gold { color: {5}; }\n    .stat-label {\n      font-size: 12px;\n      color: #6B7280;\n      margin-top: 4px;\n      text-transform: uppercase;\n    }\n    table {\n      width: 100%;\n      border-collapse: collapse;\n      margin-top: 16px;\n      font-size: 13px;\n    }\n    th, td {\n      padding: 10px 12px;\n      text-align: left;\n      border-bottom: 1px solid #E5E7EB;\n    }\n    th {\n      background: #F3F4F6;\n      font-weight: 600;\n      color: #374151;\n    }\n    tr:nth-child(even) {\n      background: #F9FAFB;\n    }\n    .footer {\n      margin-top: 40px;\n      padding-top: 20px;\n      border-top: 2px solid #E5E7EB;\n      text-align: center;\n      font-size: 11px;\n      color: #9CA3AF;\n    }\n    .measurement-row {\n      display: flex;\n      justify-content: space-between;\n      padding: 12px 0;\n      border-bottom: 1px solid #E5E7EB;\n    }\n    .measurement-label {\n      color: #374151;\n    }\n    .measurement-values {\n      display: flex;\n      gap: 20px;\n    }\n    .measurement-value {\n      text-align: right;\n    }\n    .delta {\n      font-size: 12px;\n      margin-left: 8px;\n    }\n    .delta.positive { color: {6}; }\n    .delta.negative { color: {7}; }\n    .page-break {\n      page-break-before: always;\n    }\n    @media print {\n      body { padding: 20px; }\n      .page-break { page-break-before: always; }\n    }\n  </style>\n</head>\n<body>\n  <!-- HEADER -->\n  <div class=\"header\">\n    <div class=\"logo\">YOROI</div>\n    <div class=\"subtitle\">Rapport de suivi - {8}</div>\n    <div class=\"meta\">\n      <span>Genere le {9}</span>\n      <span>{10}</span>\n    </div>\n  </div>\n\n  <!-- RÉSUMÉ POIDS -->\n  <h2>Résumé du poids</h2>\n  <div class=\"card\">\n    <div class=\"stats-grid\">\n      <div class=\"stat-item\">\n        <div class=\"stat-value\">{11}</div>\n        <div class=\"stat-label\">Poids initial (kg)</div>\n      </div>\n      <div class=\"stat-item\">\n        <div class=\"stat-value gold\">{12}</div>\n        <div class=\"stat-label\">Poids actuel (kg)</div>\n      </div>\n      <div class=\"stat-item\">\n        <div class=\"stat-value {13}\">{14}{15}</div>\n        <div class=\"stat-label\">Evolution (kg)</div>\n      </div>\n      {16}\n    </div>\n  </div>\n\n  {17}\n\n  {18}\n\n  <!-- FOOTER -->\n  <div class=\"footer\">\n    <p>Document genere par <strong>YOROI</strong> - Application de suivi fitness</p>\n    <p style=\"margin-top: 4px;\">Ce rapport est fourni a titre informatif. Consultez un professionnel de santé pour toute decision medicale.</p>\n  </div>\n</body>\n</html>\n", COLORS.gold, COLORS.gold, COLORS.gold, COLORS.success, COLORS.danger, COLORS.gold, COLORS.danger, COLORS.success, profile?.name || 'Athlète', dateStr, periodLabel, firstWeight ? firstWeight.weight.toFixed(1) : '--', lastWeight ? lastWeight.weight.toFixed(1) : '--', weightDelta < 0 ? 'success' : weightDelta > 0 ? 'danger' : '', weightDelta > 0 ? '+' : '', weightDelta.toFixed(1), heightM ? `
      <div class="stat-item">
        <div class="stat-value">${lastIMC ? lastIMC.toFixed(1) : '--'}</div>
        <div class="stat-label">IMC actuel</div>
      </div>
      ` : '', weights.length > 0 ? `
  <!-- HISTORIQUE POIDS -->
  <h2>Historique des pesees (${weights.length} entrees)</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Poids (kg)</th>
        <th>Graisse (%)</th>
        <th>Muscle (%)</th>
        <th>Eau (%)</th>
      </tr>
    </thead>
    <tbody>
      ${weights.slice(-20).reverse().map(w => `
      <tr>
        <td>${format(new Date(w.date), 'dd/MM/yyyy')}</td>
        <td><strong>${w.weight.toFixed(1)}</strong></td>
        <td>${w.bodyFat ? w.bodyFat.toFixed(1) : '-'}</td>
        <td>${w.muscle ? w.muscle.toFixed(1) : '-'}</td>
        <td>${w.water ? w.water.toFixed(1) : '-'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ${weights.length > 20 ? `<p style="font-size: 11px; color: #9CA3AF; margin-top: 8px;">Affichage des 20 dernieres entrees sur ${weights.length}</p>` : ''}
  ` : '', measurements.length > 0 ? `
  <!-- MENSURATIONS -->
  <div class="page-break"></div>
  <h2>Mensurations (${measurements.length} entrees)</h2>
  <div class="card">
    ${lastMeasurement ? `
    <div class="measurement-row" style="border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 12px;">
      <span style="font-weight: 600;">Mesure</span>
      <div class="measurement-values">
        <span style="width: 80px; font-weight: 600;">Debut</span>
        <span style="width: 80px; font-weight: 600;">Actuel</span>
        <span style="width: 60px; font-weight: 600;">Delta</span>
      </div>
    </div>
    ${generateMeasurementRow('Tour de taille', firstMeasurement?.waist, lastMeasurement.waist)}
    ${generateMeasurementRow('Tour de hanches', firstMeasurement?.hips, lastMeasurement.hips)}
    ${generateMeasurementRow('Tour de poitrine', firstMeasurement?.chest, lastMeasurement.chest)}
    ${generateMeasurementRow('Epaules', firstMeasurement?.shoulders, lastMeasurement.shoulders)}
    ${generateMeasurementRow('Cou', firstMeasurement?.neck, lastMeasurement.neck)}
    ${generateMeasurementRow('Bras gauche', firstMeasurement?.left_arm, lastMeasurement.left_arm)}
    ${generateMeasurementRow('Bras droit', firstMeasurement?.right_arm, lastMeasurement.right_arm)}
    ${generateMeasurementRow(traduire('Avant-bras gauche'), firstMeasurement?.left_forearm, lastMeasurement.left_forearm)}
    ${generateMeasurementRow(traduire('Avant-bras droit'), firstMeasurement?.right_forearm, lastMeasurement.right_forearm)}
    ${generateMeasurementRow('Cuisse gauche', firstMeasurement?.left_thigh, lastMeasurement.left_thigh)}
    ${generateMeasurementRow('Cuisse droite', firstMeasurement?.right_thigh, lastMeasurement.right_thigh)}
    ${generateMeasurementRow('Mollet gauche', firstMeasurement?.left_calf, lastMeasurement.left_calf)}
    ${generateMeasurementRow('Mollet droit', firstMeasurement?.right_calf, lastMeasurement.right_calf)}
    ` : ''}
  </div>
  ` : '');
};

// Helper pour generer une ligne de mensuration
const generateMeasurementRow = (label: string, first?: number, last?: number): string => {
  if (!last && !first) return '';

  const delta = first && last ? last - first : 0;
  const deltaClass = delta < 0 ? 'negative' : delta > 0 ? 'positive' : '';

  return `
    <div class="measurement-row">
      <span class="measurement-label">${label}</span>
      <div class="measurement-values">
        <span class="measurement-value" style="width: 80px;">${first ? first.toFixed(0) + ' cm' : '-'}</span>
        <span class="measurement-value" style="width: 80px;"><strong>${last ? last.toFixed(0) + ' cm' : '-'}</strong></span>
        <span class="measurement-value delta ${deltaClass}" style="width: 60px;">${delta !== 0 ? (delta > 0 ? '+' : '') + delta.toFixed(0) + ' cm' : '-'}</span>
      </div>
    </div>
  `;
};

// Fonction principale d'export
export const generateProgressPDF = async (period: ExportPeriod = '30j'): Promise<void> => {
  try {
    track('sauvegarde_exportee', { type: 'pdf' });
    // Generer le HTML
    const html = await generatePDFHTML(period);

    // Generer le PDF
    const { uri } = await printToFileAsync({
      html,
      base64: false,
    });

    // Partager le PDF
    if (await isAvailableAsync()) {
      await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: traduire('Exporter mon rapport Yoroi'),
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Le partage n\'est pas disponible sur cet appareil');
    }
  } catch (error) {
    logger.error('Erreur export PDF:', error);
    throw error;
  }
};

// Previsualiser le PDF
export const previewPDF = async (period: ExportPeriod = '30j'): Promise<void> => {
  try {
    const html = await generatePDFHTML(period);
    await printAsync({ html });
  } catch (error) {
    logger.error('Erreur preview PDF:', error);
    throw error;
  }
};

export default {
  generateProgressPDF,
  previewPDF,
};
